/* ==========================================================================
   NEXORA BOOKING — metricas.js
   Indicadores do dashboard, do financeiro e dos relatórios. Tudo é calculado
   a partir das reservas guardadas (nada de número fixo).

   Termos usados
   • Receita registrada: pagamentos lançados manualmente (pela data do
     pagamento). O sistema não processa cobranças.
   • Faturamento previsto: soma do preço guardado nas reservas do período que
     não foram canceladas nem viraram falta.
   • A receber: atendimentos concluídos ainda sem pagamento registrado.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const d = () => L.dados;

  let cache = { chave: "" , memo: new Map() };
  function memo(nome, calcular) {
    const chave = `${L.versao()}|${U.agora()}`;
    if (cache.chave !== chave) cache = { chave, memo: new Map() };
    if (!cache.memo.has(nome)) cache.memo.set(nome, calcular());
    return cache.memo.get(nome);
  }
  const noPeriodo = (data, de, ate) => data >= de && data <= ate;
  const PREVISTOS = ["pendente", "confirmado", "em_atendimento", "concluido"];

  function resumo(de, ate, { profissionalId } = {}) {
    return memo(`resumo:${de}:${ate}:${profissionalId || ""}`, () => {
      const lista = d().agendamentos.filter((a) => noPeriodo(a.data, de, ate) && (!profissionalId || a.profissionalId === profissionalId));
      const por = Object.fromEntries(NX.STATUS.map((s) => [s.id, 0]));
      lista.forEach((a) => { por[a.status] += 1; });
      const pagamentos = d().agendamentos.filter((a) => a.pagamento && noPeriodo(a.pagamento.em.slice(0, 10), de, ate) && (!profissionalId || a.profissionalId === profissionalId));
      const receita = pagamentos.reduce((t, a) => t + a.pagamento.valor, 0);
      const previsto = lista.filter((a) => PREVISTOS.includes(a.status)).reduce((t, a) => t + a.preco, 0);
      const aReceber = lista.filter((a) => a.status === "concluido" && !a.pagamento);
      const encerrados = por.concluido + por.cancelado + por.nao_compareceu;
      const oc = R.ocupacao(d(), { de, ate, profissionalId });
      return {
        total: lista.length, por, receita: U.arredondar(receita), pagos: pagamentos.length, previsto: U.arredondar(previsto),
        aReceber: U.arredondar(aReceber.reduce((t, a) => t + a.preco, 0)), aReceberQtd: aReceber.length,
        ticket: pagamentos.length ? U.arredondar(receita / pagamentos.length) : 0,
        valorCancelado: U.arredondar(lista.filter((a) => a.status === "cancelado").reduce((t, a) => t + a.preco, 0)),
        taxaCancelamento: encerrados ? (por.cancelado + por.nao_compareceu) / encerrados : 0,
        ocupacao: oc.taxa, minutosReservados: oc.reservado, minutosDisponiveis: oc.disponivel,
      };
    });
  }

  // Blocos de tempo para os gráficos (dia, semana ou mês, conforme o período)
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function blocos(de, ate) {
    const n = U.diasEntre(de, ate) + 1;
    const tipo = n <= 31 ? "dia" : n <= 120 ? "semana" : "mes";
    const lista = [];
    if (tipo === "dia") for (let c = de; c <= ate; c = U.somarDias(c, 1)) lista.push({ inicio: c, fim: c, rotulo: U.dataCurta(c) });
    else if (tipo === "semana") for (let fim = ate; fim >= de; fim = U.somarDias(fim, -7)) { const ini = U.somarDias(fim, -6) < de ? de : U.somarDias(fim, -6); lista.unshift({ inicio: ini, fim, rotulo: U.dataCurta(ini) }); }
    else for (let c = U.inicioDoMes(de); c <= ate; c = U.somarMeses(c, 1)) lista.push({ inicio: c < de ? de : c, fim: U.fimDoMes(c) > ate ? ate : U.fimDoMes(c), rotulo: `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}` });
    return { tipo, lista };
  }
  function serie(de, ate, { profissionalId } = {}) {
    return memo(`serie:${de}:${ate}:${profissionalId || ""}`, () => {
      const { tipo, lista } = blocos(de, ate);
      return { tipo, pontos: lista.map((b) => {
        const r = resumo(b.inicio, b.fim, { profissionalId });
        return { ...b, concluidos: r.por.concluido, perdidos: r.por.cancelado + r.por.nao_compareceu, cancelados: r.por.cancelado, faltas: r.por.nao_compareceu, validos: r.total - r.por.cancelado - r.por.nao_compareceu, agendados: r.total - r.por.cancelado, receita: r.receita, previsto: r.previsto };
      }) };
    });
  }

  function servicosMaisProcurados(de, ate, { profissionalId } = {}) {
    return memo(`servicos:${de}:${ate}:${profissionalId || ""}`, () => {
      const mapa = new Map();
      d().agendamentos.forEach((a) => {
        if (!noPeriodo(a.data, de, ate) || a.status === "cancelado" || (profissionalId && a.profissionalId !== profissionalId)) return;
        const r = mapa.get(a.servicoId) || { servicoId: a.servicoId, nome: a.servicoNome, reservas: 0, concluidos: 0, previsto: 0 };
        r.reservas += 1;
        if (a.status === "concluido") r.concluidos += 1;
        if (a.status !== "nao_compareceu") r.previsto += a.preco;
        r.nome = (L.servico(a.servicoId) || { nome: a.servicoNome }).nome;
        mapa.set(a.servicoId, r);
      });
      return [...mapa.values()].sort((x, y) => y.reservas - x.reservas || x.nome.localeCompare(y.nome, "pt-BR"));
    });
  }

  function desempenho(de, ate) {
    return memo(`desempenho:${de}:${ate}`, () => d().profissionais.map((p) => {
      const r = resumo(de, ate, { profissionalId: p.id });
      return { profissional: p, ...r };
    }).filter((x) => x.profissional.status === "ativo" || x.total > 0));
  }

  function formasPagamento(de, ate) {
    const mapa = new Map(NX.FORMAS_PAGAMENTO.map((f) => [f, { forma: f, quantidade: 0, valor: 0 }]));
    d().agendamentos.forEach((a) => {
      if (!a.pagamento || !noPeriodo(a.pagamento.em.slice(0, 10), de, ate)) return;
      const r = mapa.get(a.pagamento.forma);
      if (!r) return;
      r.quantidade += 1;
      r.valor = U.arredondar(r.valor + a.pagamento.valor);
    });
    return [...mapa.values()];
  }

  function cancelamentos(de, ate) {
    const lista = d().agendamentos.filter((a) => noPeriodo(a.data, de, ate) && ["cancelado", "nao_compareceu"].includes(a.status));
    const motivos = new Map();
    lista.forEach((a) => {
      const m = a.status === "nao_compareceu" ? "Não compareceu" : a.cancelamento ? a.cancelamento.motivo : "Sem motivo";
      motivos.set(m, (motivos.get(m) || 0) + 1);
    });
    return { lista, motivos: [...motivos.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade })).sort((a, b) => b.quantidade - a.quantidade) };
  }

  function clientesPeriodo(de, ate) {
    return memo(`clientes:${de}:${ate}`, () => {
      const primeira = new Map();
      d().agendamentos.filter((a) => a.status !== "cancelado").forEach((a) => {
        const p = primeira.get(a.clienteId);
        if (!p || a.data < p) primeira.set(a.clienteId, a.data);
      });
      const noP = d().agendamentos.filter((a) => noPeriodo(a.data, de, ate) && a.status !== "cancelado");
      const ids = [...new Set(noP.map((a) => a.clienteId))];
      const novos = ids.filter((id) => noPeriodo(primeira.get(id), de, ate));
      const ranking = ids.map((id) => {
        const doCli = noP.filter((a) => a.clienteId === id);
        return { cliente: L.cliente(id), atendimentos: doCli.filter((a) => a.status === "concluido").length, reservas: doCli.length, valor: U.arredondar(doCli.filter((a) => a.pagamento).reduce((t, a) => t + a.pagamento.valor, 0)) };
      }).filter((x) => x.cliente).sort((a, b) => b.atendimentos - a.atendimentos || b.valor - a.valor);
      return { atendidos: ids.length, novos: novos.length, recorrentes: ids.length - novos.length, ranking };
    });
  }

  function ocupacaoPorDiaSemana(de, ate) {
    const res = NX.DIAS_CURTOS.map((nome, dow) => ({ dow, nome, disponivel: 0, reservado: 0 }));
    for (let c = de; c <= ate; c = U.somarDias(c, 1)) {
      const o = R.ocupacao(d(), { de: c, ate: c });
      const x = res[U.diaDaSemana(c)];
      x.disponivel += o.disponivel;
      x.reservado += o.reservado;
    }
    return res.map((x) => ({ ...x, taxa: x.disponivel ? x.reservado / x.disponivel : 0 }));
  }

  /* ---------- Cliente ---------- */
  function cliente(id) {
    const lista = d().agendamentos.filter((a) => a.clienteId === id).sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio));
    const agora = U.agora();
    const concluidos = lista.filter((a) => a.status === "concluido");
    const proximo = [...lista].reverse().find((a) => ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > agora) || null;
    return {
      lista, atendimentos: concluidos.length, ultimaVisita: concluidos.length ? concluidos[0].data : null, proximo,
      faltas: lista.filter((a) => a.status === "nao_compareceu").length, cancelamentos: lista.filter((a) => a.status === "cancelado").length,
      totalPago: U.arredondar(lista.filter((a) => a.pagamento).reduce((t, a) => t + a.pagamento.valor, 0)),
    };
  }
  function resumoClientes() {
    return memo("resumoClientes", () => {
      const mapa = new Map(d().clientes.map((c) => [c.id, { atendimentos: 0, ultimaVisita: null, proximo: null, reservas: 0 }]));
      const agora = U.agora();
      d().agendamentos.forEach((a) => {
        const r = mapa.get(a.clienteId);
        if (!r) return;
        r.reservas += 1;
        if (a.status === "concluido") { r.atendimentos += 1; if (!r.ultimaVisita || a.data > r.ultimaVisita) r.ultimaVisita = a.data; }
        if (["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > agora && (!r.proximo || a.data + a.inicio < r.proximo.data + r.proximo.inicio)) r.proximo = a;
      });
      return mapa;
    });
  }

  NX.metricas = { resumo, blocos, serie, servicosMaisProcurados, desempenho, formasPagamento, cancelamentos, clientesPeriodo, ocupacaoPorDiaSemana, cliente, resumoClientes, noPeriodo };
})();
