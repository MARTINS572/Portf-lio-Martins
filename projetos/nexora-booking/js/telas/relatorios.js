/* ==========================================================================
   NEXORA BOOKING — Tela: Relatórios
   Seis relatórios calculados das reservas, cada um com gráfico, tabela e
   exportação em CSV (abre no Excel).
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const M = NX.metricas;
  const R = NX.regras;
  const { el } = U;
  const C = () => NX.componentes;
  const G = () => NX.graficos;

  const RELATORIOS = [
    ["atendimentos", "Atendimentos por período"], ["servicos", "Serviços"], ["profissionais", "Profissionais"],
    ["ocupacao", "Ocupação por dia da semana"], ["cancelamentos", "Cancelamentos e faltas"], ["clientes", "Clientes"],
  ];
  const estado = { relatorio: "atendimentos", periodo: { id: "30d" }, profissionalId: "" };
  let p = null;
  let atual = null;     // { cabecalho, linhas, nome } do relatório na tela (para o CSV)

  function aoEntrar(params) {
    if (params.relatorio && RELATORIOS.some(([r]) => r === params.relatorio)) estado.relatorio = params.relatorio;
    if (params.de && params.ate && U.dataValida(params.de) && U.dataValida(params.ate)) estado.periodo = { id: "personalizado", de: params.de, ate: params.ate };
  }
  function montar(secao) {
    p = { escolha: el("div", { class: "relatorio-escolha", role: "group", "aria-label": "Relatório" }), filtros: el("div"), corpo: el("div") };
    U.trocar(secao, 
      C().cabecalho({ id: "relatorios", titulo: "Relatórios", sub: "Calculados a partir das reservas guardadas. Canceladas não contam como ocupação.", acoes: [C().botao("Exportar CSV", "btn--linha", exportar, "download")] }),
      p.escolha, p.filtros, p.corpo);
  }

  const resumoFaixa = (itens) => el("div", { class: "faixa-resumo" }, ...itens.map(([t, v]) => el("div", {}, el("span", { texto: t }), el("b", { texto: v }))));
  const tabelaSimples = (cab, linhas, numDesde = 1) => el("div", { class: "cartao cartao--tabela", style: { marginTop: "16px" } }, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
    el("thead", {}, el("tr", {}, ...cab.map((c, i) => el("th", { scope: "col", class: i >= numDesde ? "num" : "", texto: c })))),
    el("tbody", {}, ...linhas.map((l) => el("tr", {}, ...l.map((c, i) => C().td(i === 0 ? "" : cab[i], c, i === 0 ? "principal-celula" : i >= numDesde ? "num" : ""))))))));
  const h = (min) => `${U.decimal(min / 60).replace(",00", "")} h`;

  function desenhar() {
    const { de, ate } = C().intervaloDe(estado.periodo);
    const pid = estado.profissionalId || undefined;
    U.trocar(p.escolha, ...RELATORIOS.map(([id, t]) => el("button", { class: "chip", type: "button", "aria-pressed": String(estado.relatorio === id), "data-foco": `rel-${id}`, onclick: () => { estado.relatorio = id; atualizar(); }, texto: t })));
    const usaProf = ["atendimentos", "servicos", "ocupacao"].includes(estado.relatorio);
    U.trocar(p.filtros, 
      C().seletorPeriodo(estado.periodo, atualizar, { ids: ["7d", "30d", "90d", "mes", "mes-anterior", "personalizado"], nome: "rel" }),
      el("div", { class: "barra-filtros" }, usaProf ? C().seletor(C().opcoesProfissionais({ todos: "Todos os profissionais", incluirInativos: true }), estado.profissionalId, (v) => { estado.profissionalId = v; atualizar(); }, { rotulo: "Profissional", foco: "rel-prof" }) : null),
      el("p", { class: "periodo-descricao", texto: `Período: ${C().descreverPeriodo({ de, ate })}${usaProf && pid ? ` · ${C().nomeDoProf(pid)}` : ""}` }));

    const r = M.resumo(de, ate, { profissionalId: pid });
    let corpo = [];
    if (estado.relatorio === "atendimentos") {
      const s = M.serie(de, ate, { profissionalId: pid });
      const g = C().cartaoGrafico({ titulo: "Reservas por período", sub: `Por ${s.tipo}`, legenda: C().legenda([["", "Atendidas ou marcadas"], ["chave--2", "Canceladas e faltas"]]) });
      const rot = (x) => (x.inicio === x.fim ? U.dataCompleta(x.inicio) : `${U.dataCurta(x.inicio)} a ${U.dataCurta(x.fim)}`);
      atual = { nome: "atendimentos", cabecalho: ["Período", "Reservas válidas", "Concluídas", "Canceladas", "Faltas", "Receita registrada", "Previsto"], linhas: s.pontos.map((x) => [rot(x), x.validos, x.concluidos, x.cancelados, x.faltas, x.receita, x.previsto]) };
      corpo = [resumoFaixa([["Reservas (sem canceladas)", U.numero(r.total - r.por.cancelado)], ["Concluídas", U.numero(r.por.concluido)], ["Cancelamentos + faltas", `${U.numero(r.por.cancelado + r.por.nao_compareceu)} (${U.percentual(r.taxaCancelamento)})`], ["Receita registrada", U.moeda(r.receita)]]), g.cartao,
        tabelaSimples(atual.cabecalho, atual.linhas.map((l) => [l[0], U.numero(l[1]), U.numero(l[2]), U.numero(l[3]), U.numero(l[4]), U.moeda(l[5]), U.moeda(l[6])]))];
      requestAnimationFrame(() => { G().colunas(g.cartao, { rotulos: s.pontos.map((x) => x.rotulo), series: [{ nome: "válidas", valores: s.pontos.map((x) => x.validos) }, { nome: "canceladas e faltas", valores: s.pontos.map((x) => x.perdidos) }], detalheRotulo: (i) => rot(s.pontos[i]) }); G().tabela(g.cartao, ["Período", "Válidas", "Canceladas e faltas"], s.pontos.map((x) => [rot(x), U.numero(x.validos), U.numero(x.perdidos)])); });
    }
    if (estado.relatorio === "servicos") {
      const lista = M.servicosMaisProcurados(de, ate, { profissionalId: pid });
      const g = C().cartaoGrafico({ titulo: "Reservas por serviço", sub: "Sem canceladas" });
      atual = { nome: "servicos", cabecalho: ["Serviço", "Reservas", "Concluídas", "Valor previsto"], linhas: lista.map((x) => [x.nome, x.reservas, x.concluidos, x.previsto]) };
      corpo = [g.cartao, tabelaSimples(atual.cabecalho, atual.linhas.map((l) => [l[0], U.numero(l[1]), U.numero(l[2]), U.moeda(l[3])]))];
      requestAnimationFrame(() => { G().barras(g.cartao, { itens: lista.map((x) => ({ rotulo: x.nome, valor: x.reservas, sub: `${x.concluidos} concluídas` })), vazio: "Nenhuma reserva no período." }); G().tabela(g.cartao, ["Serviço", "Reservas"], lista.map((x) => [x.nome, U.numero(x.reservas)])); });
    }
    if (estado.relatorio === "profissionais") {
      const lista = M.desempenho(de, ate);
      const g = C().cartaoGrafico({ titulo: "Ocupação por profissional", sub: "Minutos reservados ÷ minutos de trabalho" });
      atual = { nome: "profissionais", cabecalho: ["Profissional", "Reservas", "Concluídas", "Canceladas", "Faltas", "Taxa de perda", "Ocupação", "Receita registrada"], linhas: lista.map((x) => [x.profissional.nome + (x.profissional.status === "ativo" ? "" : " (inativo)"), x.total - x.por.cancelado, x.por.concluido, x.por.cancelado, x.por.nao_compareceu, x.taxaCancelamento, x.ocupacao, x.receita]) };
      corpo = [g.cartao, tabelaSimples(atual.cabecalho, atual.linhas.map((l) => [l[0], U.numero(l[1]), U.numero(l[2]), U.numero(l[3]), U.numero(l[4]), U.percentual(l[5]), U.percentual(l[6]), U.moeda(l[7])]))];
      requestAnimationFrame(() => { G().barras(g.cartao, { itens: lista.map((x) => ({ rotulo: x.profissional.nome, valor: Math.round(x.ocupacao * 1000) / 10, sub: `${x.por.concluido} concluídas` })), formatar: (v) => `${U.numero(v)}%` }); G().tabela(g.cartao, ["Profissional", "Ocupação"], lista.map((x) => [x.profissional.nome, U.percentual(x.ocupacao)])); });
    }
    if (estado.relatorio === "ocupacao") {
      const lista = estado.profissionalId ? NX.DIAS_CURTOS.map((nome, dow) => ({ dow, nome, disponivel: 0, reservado: 0 })) : M.ocupacaoPorDiaSemana(de, ate);
      if (estado.profissionalId) {
        for (let c = de; c <= ate; c = U.somarDias(c, 1)) { const o = R.ocupacao(L.dados, { de: c, ate: c, profissionalId: pid }); const x = lista[U.diaDaSemana(c)]; x.disponivel += o.disponivel; x.reservado += o.reservado; }
        lista.forEach((x) => { x.taxa = x.disponivel ? x.reservado / x.disponivel : 0; });
      }
      const ordem = [1, 2, 3, 4, 5, 6, 0].map((dow) => lista[dow]);
      const g = C().cartaoGrafico({ titulo: "Ocupação por dia da semana", sub: "Ajuda a decidir horários e folgas" });
      atual = { nome: "ocupacao", cabecalho: ["Dia", "Horas de trabalho", "Horas reservadas", "Ocupação"], linhas: ordem.map((x) => [NX.DIAS[x.dow], U.arredondar(x.disponivel / 60), U.arredondar(x.reservado / 60), x.taxa]) };
      corpo = [resumoFaixa([["Ocupação geral", U.percentual(r.ocupacao)], ["Horas reservadas", h(r.minutosReservados)], ["Horas de trabalho", h(r.minutosDisponiveis)], ["Horas livres", h(Math.max(0, r.minutosDisponiveis - r.minutosReservados))]]), g.cartao,
        tabelaSimples(atual.cabecalho, ordem.map((x) => [NX.DIAS[x.dow], h(x.disponivel), h(x.reservado), U.percentual(x.taxa)]))];
      requestAnimationFrame(() => { G().barras(g.cartao, { itens: ordem.filter((x) => x.disponivel).map((x) => ({ rotulo: NX.DIAS[x.dow], valor: Math.round(x.taxa * 1000) / 10, sub: `${h(x.reservado)} de ${h(x.disponivel)}` })), formatar: (v) => `${U.numero(v)}%`, vazio: "Sem horas de trabalho no período." }); G().tabela(g.cartao, ["Dia", "Ocupação"], ordem.map((x) => [NX.DIAS[x.dow], U.percentual(x.taxa)])); });
    }
    if (estado.relatorio === "cancelamentos") {
      const c = M.cancelamentos(de, ate);
      const g = C().cartaoGrafico({ titulo: "Motivos", sub: "Cancelamentos e faltas pela data do atendimento" });
      atual = { nome: "cancelamentos", cabecalho: ["Código", "Data", "Início", "Cliente", "Serviço", "Profissional", "Status", "Motivo", "Por", "Valor"], linhas: c.lista.sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio)).map((a) => [a.codigo, U.dataCompleta(a.data), a.inicio, C().nomeDoCliente(a.clienteId), a.servicoNome, C().nomeDoProf(a.profissionalId), NX.agenda.nomeStatus(a.status), a.status === "nao_compareceu" ? "Não compareceu" : a.cancelamento ? a.cancelamento.motivo : "", a.cancelamento ? (a.cancelamento.por === "cliente" ? "Cliente" : "Estabelecimento") : "", a.preco]) };
      corpo = [resumoFaixa([["Cancelamentos", U.numero(r.por.cancelado)], ["Faltas", U.numero(r.por.nao_compareceu)], ["Taxa sobre encerradas", U.percentual(r.taxaCancelamento)], ["Valor de reservas canceladas", U.moeda(r.valorCancelado)]]), g.cartao,
        tabelaSimples(["Motivo", "Quantidade"], c.motivos.map((x) => [x.motivo, U.numero(x.quantidade)]))];
      requestAnimationFrame(() => { G().barras(g.cartao, { itens: c.motivos.map((x) => ({ rotulo: x.motivo, valor: x.quantidade })), vazio: "Nenhum cancelamento ou falta no período." }); G().tabela(g.cartao, ["Motivo", "Quantidade"], c.motivos.map((x) => [x.motivo, U.numero(x.quantidade)])); });
    }
    if (estado.relatorio === "clientes") {
      const c = M.clientesPeriodo(de, ate);
      atual = { nome: "clientes", cabecalho: ["Cliente", "Telefone", "Reservas no período", "Atendimentos concluídos", "Valor pago registrado"], linhas: c.ranking.map((x) => [x.cliente.nome, U.mascaraTelefone(x.cliente.telefone), x.reservas, x.atendimentos, x.valor]) };
      corpo = [resumoFaixa([["Clientes atendidos ou marcados", U.numero(c.atendidos)], ["Primeira reserva no período", U.numero(c.novos)], ["Já tinham reservado antes", U.numero(c.recorrentes)], ["Taxa de retorno", U.percentual(c.atendidos ? c.recorrentes / c.atendidos : 0)]]),
        el("h2", { class: "cartao__titulo", style: { marginTop: "18px" }, texto: "Clientes que mais vieram no período" }),
        tabelaSimples(["Cliente", "Reservas", "Concluídos", "Pago (registrado)"], c.ranking.slice(0, 20).map((x) => [el("a", { class: "link-texto", href: `#/clientes/${x.cliente.id}`, texto: x.cliente.nome }), U.numero(x.reservas), U.numero(x.atendimentos), U.moeda(x.valor)]))];
    }
    U.trocar(p.corpo, ...corpo);
  }
  const atualizar = C().comFoco(desenhar);

  function exportar() {
    if (!atual || !atual.linhas.length) { U.aviso("Nada para exportar neste relatório.", "info"); return; }
    const linhas = atual.linhas.map((l) => l.map((v, i) => (typeof v === "number" && /Ocupação|Taxa/.test(atual.cabecalho[i]) ? U.percentual(v) : v)));
    U.baixarCSV(U.nomeArquivo(`relatorio-${atual.nome}`), atual.cabecalho, linhas);
  }

  NX.telas.relatorios = { titulo: "Relatórios", montar, atualizar, aoEntrar };
})();
