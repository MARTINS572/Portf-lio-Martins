/* ==========================================================================
   NEXORA AUTO — Tela: Relatórios
   Nove relatórios calculados dos registros, com filtros, exportação em CSV
   (abre no Excel em português) e versão para imprimir ou salvar em PDF.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const PADRAO = () => ({ relatorio: "os", periodo: { id: "30d" }, status: "", tecnico: "", categoria: "", tipo: "", situacao: "", pagina: 1 });
  const estado = PADRAO();
  let p = null;
  const somar = (lista, f) => U.arredondar(lista.reduce((t, x) => t + f(x), 0));
  const veic = (vid) => { const v = L.veiculo(vid); return v ? [L.mostrarPlaca(v.placa), `${v.marca} ${v.modelo}`] : ["", ""]; };

  // tipos: t = texto, m = moeda, n = número, h = horas
  const RELATORIOS = [
    {
      id: "os", nome: "Ordens por período", icone: "clipboard-list", descricao: "Ordens abertas no período, com situação e valores.", filtros: ["status", "tecnico"],
      gerar(de, ate) {
        const lista = L.dados.ordens.filter((os) => O.noPeriodo(os.abertaEm, de, ate) && (!estado.status || os.status === estado.status) && (!estado.tecnico || os.tecnicoId === estado.tecnico)).sort((a, b) => a.abertaEm.localeCompare(b.abertaEm));
        return {
          cabecalho: ["OS", "Aberta em", "Cliente", "Placa", "Veículo", "Técnico", "Status", "Total", "Finalizada em"], tipos: "tttttttmt".split(""),
          linhas: lista.map((os) => [os.numero, U.dataHora(os.abertaEm), C().nomeDoCliente(os.clienteId), ...veic(os.veiculoId), C().nomeDoTecnico(os.tecnicoId), O.nomeStatus(os.status), O.totaisOS(os).total, os.finalizadaEm ? U.dataHora(os.finalizadaEm) : ""]),
          resumo: [["Ordens abertas", U.numero(lista.length)], ["Finalizadas", U.numero(lista.filter((os) => os.finalizadaEm).length)], ["Canceladas", U.numero(lista.filter((os) => os.status === "cancelada").length)], ["Valor total", U.moeda(somar(lista.filter((os) => os.status !== "cancelada"), (os) => O.totaisOS(os).total))]],
        };
      },
    },
    {
      id: "veiculos", nome: "Veículos atendidos", icone: "car", descricao: "Veículos que tiveram ordem aberta ou finalizada no período.", filtros: [],
      gerar(de, ate) {
        const mapa = new Map();
        L.dados.ordens.filter((os) => os.status !== "cancelada" && (O.noPeriodo(os.abertaEm, de, ate) || O.noPeriodo(os.finalizadaEm, de, ate))).forEach((os) => {
          const x = mapa.get(os.veiculoId) || { vid: os.veiculoId, ordens: [], executado: 0 };
          x.ordens.push(os);
          if (O.noPeriodo(os.finalizadaEm, de, ate)) x.executado += O.totaisOS(os).total;
          mapa.set(os.veiculoId, x);
        });
        const lista = [...mapa.values()].sort((a, b) => b.executado - a.executado);
        return {
          cabecalho: ["Placa", "Veículo", "Cliente", "Ordens no período", "Km mais recente", "Executado no período"], tipos: ["t", "t", "t", "n", "n", "m"],
          linhas: lista.map((x) => { const v = L.veiculo(x.vid) || {}; return [...veic(x.vid), C().nomeDoCliente(v.clienteId), x.ordens.length, v.km || 0, U.arredondar(x.executado)]; }),
          resumo: [["Veículos", U.numero(lista.length)], ["Ordens", U.numero(lista.reduce((t, x) => t + x.ordens.length, 0))], ["Executado", U.moeda(somar(lista, (x) => x.executado))]],
        };
      },
    },
    {
      id: "servicos", nome: "Serviços mais realizados", icone: "wrench", descricao: "Serviços do catálogo nas ordens finalizadas no período.", filtros: ["categoria"],
      gerar(de, ate) {
        const mapa = new Map();
        L.dados.ordens.filter((os) => O.noPeriodo(os.finalizadaEm, de, ate)).forEach((os) => os.itens.filter((i) => i.tipo === "servico").forEach((i) => {
          const s = L.servico(i.refId) || { nome: i.descricao, categoria: "—", codigo: "" };
          if (estado.categoria && s.categoria !== estado.categoria) return;
          const x = mapa.get(i.refId) || { s, qtd: 0, valor: 0 };
          x.qtd += i.quantidade; x.valor += O.valorItem(i);
          mapa.set(i.refId, x);
        }));
        const lista = [...mapa.values()].sort((a, b) => b.qtd - a.qtd || b.valor - a.valor);
        return {
          cabecalho: ["Código", "Serviço", "Categoria", "Vezes", "Valor total", "Valor médio"], tipos: ["t", "t", "t", "n", "m", "m"],
          linhas: lista.map((x) => [x.s.codigo, x.s.nome, x.s.categoria, x.qtd, U.arredondar(x.valor), U.arredondar(x.valor / x.qtd)]),
          resumo: [["Serviços realizados", U.numero(lista.reduce((t, x) => t + x.qtd, 0))], ["Tipos diferentes", U.numero(lista.length)], ["Valor", U.moeda(somar(lista, (x) => x.valor))]],
        };
      },
    },
    {
      id: "pecas", nome: "Peças mais utilizadas", icone: "package", descricao: "Peças baixadas do estoque em ordens de serviço no período (custo × valor cobrado).", filtros: ["categoria_peca"],
      gerar(de, ate) {
        const mapa = new Map();
        L.dados.movimentos.filter((m) => m.tipo === "saida_os" && O.noPeriodo(m.data, de, ate)).forEach((m) => {
          const pc = L.peca(m.pecaId) || { sku: m.pecaId, nome: m.pecaId, categoria: "—" };
          if (estado.categoria && pc.categoria !== estado.categoria) return;
          const os = L.ordem(m.osId);
          const item = os ? os.itens.find((i) => i.id === m.osItemId) : null;
          const x = mapa.get(m.pecaId) || { pc, qtd: 0, custo: 0, receita: 0 };
          x.qtd += -m.quantidade; x.custo += -m.quantidade * (m.custoUnitario || 0); x.receita += item ? O.valorItem(item) : 0;
          mapa.set(m.pecaId, x);
        });
        const lista = [...mapa.values()].sort((a, b) => b.qtd - a.qtd);
        return {
          cabecalho: ["SKU", "Peça", "Categoria", "Quantidade", "Custo", "Valor cobrado", "Margem"], tipos: ["t", "t", "t", "n", "m", "m", "m"],
          linhas: lista.map((x) => [x.pc.sku, x.pc.nome, x.pc.categoria, x.qtd, U.arredondar(x.custo), U.arredondar(x.receita), U.arredondar(x.receita - x.custo)]),
          resumo: [["Unidades aplicadas", U.numero(lista.reduce((t, x) => t + x.qtd, 0))], ["Custo", U.moeda(somar(lista, (x) => x.custo))], ["Valor cobrado", U.moeda(somar(lista, (x) => x.receita))]],
        };
      },
    },
    {
      id: "estoque", nome: "Movimentações de estoque", icone: "arrow-left-right", descricao: "Todas as entradas, saídas, ajustes e baixas de OS no período.", filtros: ["tipo"],
      gerar(de, ate) {
        const lista = L.dados.movimentos.filter((m) => O.noPeriodo(m.data, de, ate) && (!estado.tipo || m.tipo === estado.tipo)).sort((a, b) => a.numero - b.numero);
        const nome = (t) => (NX.TIPOS_MOVIMENTO.find((x) => x.id === t) || {}).nome;
        return {
          cabecalho: ["Nº", "Data", "SKU", "Peça", "Tipo", "Quantidade", "Saldo antes", "Saldo depois", "Motivo / OS", "Documento", "Por"], tipos: ["n", "t", "t", "t", "t", "n", "n", "n", "t", "t", "t"],
          linhas: lista.map((m) => { const pc = L.peca(m.pecaId) || {}; return [m.numero, U.dataHora(m.data), pc.sku, pc.nome, nome(m.tipo), m.quantidade, m.saldoAnterior, m.saldoApos, m.osId ? (L.ordem(m.osId) || {}).numero : m.motivo, m.documento, m.por]; }),
          resumo: [["Movimentações", U.numero(lista.length)], ["Unidades que entraram", U.numero(lista.filter((m) => m.quantidade > 0).reduce((t, m) => t + m.quantidade, 0))], ["Unidades que saíram", U.numero(lista.filter((m) => m.quantidade < 0).reduce((t, m) => t - m.quantidade, 0))]],
        };
      },
    },
    {
      id: "orcamentos", nome: "Orçamentos aprovados e recusados", icone: "file-text", descricao: "Orçamentos respondidos (ou vencidos) no período.", filtros: ["situacao"],
      gerar(de, ate) {
        const decisao = (o) => (o.aprovacao ? o.aprovacao.em : o.recusa ? o.recusa.em : O.statusOrc(o) === "expirado" ? `${o.validade}T23:59` : null);
        const lista = L.dados.orcamentos.filter((o) => { const dt = decisao(o); return dt && O.noPeriodo(dt, de, ate) && (!estado.situacao || (estado.situacao === "aprovado" ? !!o.aprovacao : estado.situacao === "recusado" ? !!o.recusa : O.statusOrc(o) === "expirado")); }).sort((a, b) => decisao(a).localeCompare(decisao(b)));
        const aprov = lista.filter((o) => o.aprovacao);
        return {
          cabecalho: ["Orçamento", "Cliente", "Placa", "Emitido", "Respondido em", "Resultado", "Total", "Quem / motivo"], tipos: ["t", "t", "t", "t", "t", "t", "m", "t"],
          linhas: lista.map((o) => [O.rotuloOrc(o), C().nomeDoCliente(o.clienteId), veic(o.veiculoId)[0], U.dataCompleta(o.emitidoEm), o.aprovacao || o.recusa ? U.dataHora(decisao(o)) : `venceu ${U.dataCompleta(o.validade)}`, o.aprovacao ? (o.status === "cancelado" ? "Aprovado (depois substituído)" : "Aprovado") : o.recusa ? "Recusado" : "Expirado", O.totaisOrc(o).total, o.aprovacao ? `${o.aprovacao.por} (${o.aprovacao.canal})` : o.recusa ? o.recusa.motivo : "Sem resposta"]),
          resumo: [["Aprovados", `${aprov.length} · ${U.moeda(somar(aprov, (o) => O.totaisOrc(o).total))}`], ["Recusados", U.numero(lista.filter((o) => o.recusa).length)], ["Vencidos sem resposta", U.numero(lista.filter((o) => !o.aprovacao && !o.recusa).length)], ["Taxa de aprovação", lista.length ? U.percentual(aprov.length / lista.length) : "—"]],
        };
      },
    },
    {
      id: "faturamento", nome: "Faturamento", icone: "receipt", descricao: "Ordens encerradas (faturadas) no período e quanto já foi recebido delas.", filtros: [],
      gerar(de, ate) {
        const lista = L.dados.ordens.filter((os) => os.faturamento && O.noPeriodo(os.faturamento.em, de, ate)).sort((a, b) => a.faturamento.em.localeCompare(b.faturamento.em));
        const fat = somar(lista, (os) => os.faturamento.valor);
        return {
          cabecalho: ["OS", "Cliente", "Faturado em", "Serviços e mão de obra", "Peças", "Desconto", "Faturado", "Recebido", "Em aberto", "Situação"], tipos: ["t", "t", "t", "m", "m", "m", "m", "m", "m", "t"],
          linhas: lista.map((os) => { const t = O.totaisOS(os); return [os.numero, C().nomeDoCliente(os.clienteId), U.dataHora(os.faturamento.em), t.maoDeObra, t.pecas, t.desconto, os.faturamento.valor, O.recebido(os), O.aReceber(os), NX.SITUACOES_FINANCEIRAS.find((s) => s.id === O.situacaoFinanceira(os)).nome]; }),
          resumo: [["Faturado", U.moeda(fat)], ["Ordens", U.numero(lista.length)], ["Valor médio por ordem", lista.length ? U.moeda(fat / lista.length) : "—"], ["Ainda em aberto", U.moeda(somar(lista, (os) => O.aReceber(os)))]],
        };
      },
    },
    {
      id: "despesas", nome: "Despesas", icone: "wallet", descricao: "Despesas com data no período (vencimento ou competência).", filtros: ["categoria_despesa", "situacao_despesa"],
      gerar(de, ate) {
        const lista = L.dados.despesas.filter((x) => O.noPeriodo(x.data, de, ate) && (!estado.categoria || x.categoria === estado.categoria) && (!estado.situacao || x.status === estado.situacao)).sort((a, b) => a.data.localeCompare(b.data));
        const ativas = lista.filter((x) => x.status !== "cancelada");
        const porCat = NX.CATEGORIAS_DESPESA.map((c) => [c, somar(ativas.filter((x) => x.categoria === c), (x) => x.valor)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        return {
          cabecalho: ["Data", "Descrição", "Categoria", "Fornecedor", "Valor", "Situação", "Pago em"], tipos: ["t", "t", "t", "t", "m", "t", "t"],
          linhas: lista.map((x) => [U.dataCompleta(x.data), x.descricao, x.categoria, x.fornecedorId ? (L.fornecedor(x.fornecedorId) || {}).nome : "", x.valor, { pago: "Paga", a_pagar: "A pagar", cancelada: "Cancelada" }[x.status], x.pagoEm ? U.dataCompleta(x.pagoEm) : ""]),
          resumo: [["Total (sem canceladas)", U.moeda(somar(ativas, (x) => x.valor))], ["Pagas", U.moeda(somar(ativas.filter((x) => x.status === "pago"), (x) => x.valor))], ["A pagar", U.moeda(somar(ativas.filter((x) => x.status === "a_pagar"), (x) => x.valor))], ...porCat.slice(0, 3).map(([c, v]) => [c, U.moeda(v)])],
        };
      },
    },
    {
      id: "tecnicos", nome: "Serviços por técnico", icone: "hard-hat", descricao: "O que cada técnico finalizou no período, segundo as ordens registradas (contagem, não avaliação).", filtros: [],
      gerar(de, ate) {
        const finalizadas = L.dados.ordens.filter((os) => O.noPeriodo(os.finalizadaEm, de, ate));
        const lista = L.dados.equipe.filter((m) => m.tecnico).map((m) => {
          const minhas = finalizadas.filter((os) => os.tecnicoId === m.id);
          const servicos = minhas.reduce((t, os) => t + os.itens.filter((i) => i.tipo === "servico").reduce((a, i) => a + i.quantidade, 0), 0);
          const horasMao = minhas.reduce((t, os) => t + os.itens.filter((i) => i.tipo === "mao").reduce((a, i) => a + i.quantidade, 0), 0);
          const horasCat = minhas.reduce((t, os) => t + os.itens.filter((i) => i.tipo === "servico").reduce((a, i) => a + ((L.servico(i.refId) || {}).tempo || 0) * i.quantidade / 60, 0), 0);
          return { m, ordens: minhas.length, servicos, horasMao, horasCat, valor: somar(minhas, (os) => O.totaisOS(os).maoDeObra) };
        }).filter((x) => x.ordens || x.m.status === "ativo").sort((a, b) => b.ordens - a.ordens);
        return {
          cabecalho: ["Técnico", "Função", "Ordens finalizadas", "Serviços", "Horas de catálogo", "Horas avulsas", "Serviços e mão de obra (R$)"], tipos: ["t", "t", "n", "n", "h", "h", "m"],
          linhas: lista.map((x) => [`${x.m.nome}${x.m.status === "ativo" ? "" : " (inativo)"}`, (NX.FUNCOES.find((f) => f.id === x.m.funcao) || {}).nome, x.ordens, x.servicos, U.arredondar(x.horasCat), U.arredondar(x.horasMao), x.valor]),
          resumo: [["Ordens finalizadas", U.numero(finalizadas.length)], ["Sem técnico", U.numero(finalizadas.filter((os) => !os.tecnicoId).length)]],
        };
      },
    },
  ];
  const formatar = (v, t) => (v === "" || v == null ? "—" : t === "m" ? U.moeda(v) : t === "n" ? U.numero(v) : t === "h" ? `${U.decimal(v).replace(/,00$/, "")} h` : String(v));

  function montar(secao) {
    p = { escolha: el("div", { class: "relatorio-escolha" }), periodo: el("div", { style: { minWidth: "0", maxWidth: "100%" } }), texto: el("p", { class: "periodo-descricao" }), filtros: el("div", { class: "barra-filtros" }), resumo: el("div"), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "relatorios", titulo: "Relatórios", sub: "Escolha o relatório e o período. A exportação em CSV e a impressão usam exatamente os filtros da tela.", acoes: [
        C().botao("Imprimir / PDF", "btn--linha", imprimir, "printer"),
        C().botao("Exportar CSV", "btn--primario", exportar, "download"),
      ] }),
      p.escolha, el("div", { class: "barra-periodo" }, p.periodo), p.texto, p.filtros, p.resumo, p.tabela);
  }
  const atual = () => RELATORIOS.find((r) => r.id === estado.relatorio) || RELATORIOS[0];
  function dados() { const { de, ate } = C().intervaloDe(estado.periodo); return atual().gerar(de, ate); }

  function desenhar() {
    const r = atual();
    U.trocar(p.escolha, ...RELATORIOS.map((x) => el("button", { class: "chip", type: "button", "aria-pressed": String(x.id === r.id), "data-foco": `rel-${x.id}`, onclick: () => { Object.assign(estado, { relatorio: x.id, status: "", tecnico: "", categoria: "", tipo: "", situacao: "", pagina: 1 }); atualizar(); } }, icone(x.icone, 14), x.nome)));
    const intervalo = C().intervaloDe(estado.periodo);
    U.trocar(p.periodo, C().seletorPeriodo(estado.periodo, () => { estado.pagina = 1; atualizar(); }, { ids: ["hoje", "7d", "30d", "90d", "mes", "mes-anterior", "personalizado"], nome: "rel" }));
    p.texto.textContent = `${r.descricao} Período: ${C().descreverPeriodo(intervalo)}.`;
    const mudar = (campo) => (v) => { estado[campo] = v; estado.pagina = 1; atualizar(); };
    const filtros = {
      status: () => C().seletor([{ valor: "", rotulo: "Todos os status" }, ...NX.STATUS_OS.map((s) => ({ valor: s.id, rotulo: s.nome }))], estado.status, mudar("status"), { rotulo: "Status", foco: "rel-status" }),
      tecnico: () => C().seletor(C().opcoesTecnicos({ todos: "Todos os técnicos", incluirInativos: true }), estado.tecnico, mudar("tecnico"), { rotulo: "Técnico", foco: "rel-tec" }),
      categoria: () => C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...L.dados.oficina.categoriasServico.map((c) => ({ valor: c, rotulo: c }))], estado.categoria, mudar("categoria"), { rotulo: "Categoria", foco: "rel-cat" }),
      categoria_peca: () => C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...L.dados.oficina.categoriasPeca.map((c) => ({ valor: c, rotulo: c }))], estado.categoria, mudar("categoria"), { rotulo: "Categoria", foco: "rel-catp" }),
      categoria_despesa: () => C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...NX.CATEGORIAS_DESPESA.map((c) => ({ valor: c, rotulo: c }))], estado.categoria, mudar("categoria"), { rotulo: "Categoria", foco: "rel-catd" }),
      tipo: () => C().seletor([{ valor: "", rotulo: "Todos os tipos" }, ...NX.TIPOS_MOVIMENTO.map((t) => ({ valor: t.id, rotulo: t.nome }))], estado.tipo, mudar("tipo"), { rotulo: "Tipo", foco: "rel-tipo" }),
      situacao: () => C().seletor([{ valor: "", rotulo: "Aprovados, recusados e vencidos" }, { valor: "aprovado", rotulo: "Só aprovados" }, { valor: "recusado", rotulo: "Só recusados" }, { valor: "expirado", rotulo: "Só vencidos" }], estado.situacao, mudar("situacao"), { rotulo: "Resultado", foco: "rel-sit" }),
      situacao_despesa: () => C().seletor([{ valor: "", rotulo: "Todas as situações" }, { valor: "pago", rotulo: "Pagas" }, { valor: "a_pagar", rotulo: "A pagar" }, { valor: "cancelada", rotulo: "Canceladas" }], estado.situacao, mudar("situacao"), { rotulo: "Situação", foco: "rel-sitd" }),
    };
    U.trocar(p.filtros, ...r.filtros.map((f) => filtros[f]()));
    p.filtros.hidden = !r.filtros.length;
    const res = dados();
    U.trocar(p.resumo, res.resumo.length ? el("div", { class: "faixa-resumo faixa-resumo--auto" }, ...res.resumo.map(([k, v]) => el("div", {}, el("span", { texto: k }), el("b", { texto: v })))) : null);
    const { res: pag, nav } = C().blocoPaginado(estado, res.linhas, "relatorio", atualizar);
    const titulo = el("p", { class: "contagem", texto: `${U.plural(res.linhas.length, "linha", "linhas")} · ${r.nome}` });
    if (!res.linhas.length) { U.trocar(p.tabela, titulo, C().vazio({ icone: "chart-column", titulo: "Nada neste período", texto: "Mude o período ou os filtros." })); return; }
    U.trocar(p.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: r.nome }),
      el("thead", {}, el("tr", {}, ...res.cabecalho.map((c, i) => el("th", { scope: "col", class: res.tipos[i] !== "t" ? "num" : "", texto: c })))),
      el("tbody", {}, ...pag.itens.map((linha) => el("tr", {}, ...linha.map((v, i) => C().td(i === 0 ? "" : res.cabecalho[i], i === 0 ? el("b", { texto: formatar(v, res.tipos[i]) }) : formatar(v, res.tipos[i]), `${res.tipos[i] !== "t" ? "num" : ""}${i === 0 ? " principal-celula" : ""}`))))))), nav);
  }
  function exportar() {
    const res = dados();
    U.baixarCSV(U.nomeArquivo(`relatorio-${estado.relatorio}`), res.cabecalho, res.linhas);
  }
  function imprimir() {
    const r = atual();
    const res = dados();
    NX.documentos.imprimirRelatorio({ titulo: r.nome, sub: `${r.descricao} Período: ${C().descreverPeriodo(C().intervaloDe(estado.periodo))}.`, cabecalho: res.cabecalho, linhas: res.linhas.map((l) => l.map((v, i) => (res.tipos[i] === "t" ? v : formatar(v, res.tipos[i])))), resumo: res.resumo });
  }
  function aoEntrar(params) {
    if (params.relatorio && RELATORIOS.some((r) => r.id === params.relatorio)) { estado.relatorio = params.relatorio; estado.pagina = 1; }
    if (params.de && params.ate && U.dataValida(params.de) && U.dataValida(params.ate)) Object.assign(estado.periodo, { id: "personalizado", de: params.de, ate: params.ate });
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.relatorios = { titulo: "Relatórios", montar, atualizar, aoEntrar, RELATORIOS, reiniciar: () => Object.assign(estado, PADRAO()) };
})();
