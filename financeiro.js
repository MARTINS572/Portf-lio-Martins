/* ==========================================================================
   NEXORA AUTO — Tela: Financeiro
   Orçamento aprovado, serviço executado, valor faturado e valor recebido
   são números diferentes e aparecem separados. Encerrar a ordem fatura;
   o pagamento é registrado à parte. Nenhum pagamento é processado aqui.
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
  const G = () => NX.graficos;

  const PADRAO = () => ({ periodo: { id: "30d" }, aba: "ordens", situacao: "", despStatus: "", despCat: "", pagina: 1 });
  const estado = PADRAO();
  let p = null;
  const ABAS = [["ordens", "Situação das ordens"], ["recebimentos", "Recebimentos"], ["despesas", "Despesas"]];

  function montar(secao) {
    const grafico = C().cartaoGrafico({ titulo: "Recebido e despesas pagas", sub: "", legenda: C().legenda([["", "Recebido"], ["chave--2", "Despesas pagas"]]) });
    p = { grafico, periodo: el("div", { style: { minWidth: "0", maxWidth: "100%" } }), texto: el("p", { class: "periodo-descricao" }), resumo: el("div"), resumo2: el("div"), abas: el("div"), filtros: el("div", { class: "barra-filtros" }), conteudo: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "financeiro", titulo: "Financeiro", sub: "Valores calculados a partir das ordens, dos recebimentos e das despesas registrados. Nenhum pagamento é cobrado ou processado pelo sistema.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botaoSe("despesas", "Nova despesa", "btn--primario", () => NX.form.despesa(null), "plus"),
      ] }),
      el("div", { class: "barra-periodo" }, p.periodo), p.texto, p.resumo, p.resumo2,
      el("div", { class: "painel-grade painel-grade--financeiro" }, grafico.cartao),
      p.abas, p.filtros, p.conteudo);
  }

  function faixa(itens) {
    return el("div", { class: "faixa-resumo" }, ...itens.map(([rotulo, valor, sub, classe]) => el("div", {}, el("span", { texto: rotulo }), el("b", { class: classe || "", texto: valor }), sub ? el("small", { class: "suave", texto: sub }) : null)));
  }

  function desenhar() {
    const intervalo = C().intervaloDe(estado.periodo);
    const { de, ate } = intervalo;
    U.trocar(p.periodo, C().seletorPeriodo(estado.periodo, () => { estado.pagina = 1; atualizar(); }, { ids: ["hoje", "7d", "30d", "90d", "mes", "mes-anterior", "personalizado"], nome: "fin" }));
    p.texto.textContent = `Período: ${C().descreverPeriodo(intervalo)}.`;
    const r = O.resumoFinanceiro(de, ate);
    const caixa = U.arredondar(r.recebido - r.despesasPagas);
    U.trocar(p.resumo, faixa([
      ["Orçamentos aprovados", U.moeda(r.aprovado), U.plural(r.aprovadosQtd, "aprovação", "aprovações")],
      ["Serviços executados", U.moeda(r.executado), U.plural(r.executadasQtd, "ordem finalizada", "ordens finalizadas")],
      ["Faturado", U.moeda(r.faturado), U.plural(r.faturadasQtd, "ordem encerrada", "ordens encerradas")],
      ["Recebido", U.moeda(r.recebido), U.plural(r.recebimentosQtd, "pagamento registrado", "pagamentos registrados"), "positivo"],
    ]));
    U.trocar(p.resumo2, faixa([
      ["Despesas pagas", U.moeda(r.despesasPagas), r.despesasAPagar ? `${U.moeda(r.despesasAPagar)} a pagar no período` : "Nenhuma a pagar no período"],
      ["Caixa do período", U.moeda(caixa), "recebido − despesas pagas", caixa < 0 ? "negativo" : ""],
      ["A receber (em aberto)", U.moeda(r.aReceberTotal), "ordens faturadas ainda não pagas", r.aReceberTotal > 0 ? "texto-alerta" : ""],
      ["A faturar", U.moeda(r.aFaturar), `serviços prontos · peças aplicadas a custo: ${U.moeda(r.custoPecas)}`],
    ]));

    const { lista: baldes, unidade } = C().baldes(intervalo);
    const ordens = L.dados.ordens;
    const rec = baldes.map((b) => U.arredondar(ordens.reduce((t, os) => t + os.recebimentos.filter((x) => !x.estorno && O.noPeriodo(x.data, b.de, b.ate)).reduce((a, x) => a + x.valor, 0), 0)));
    const desp = baldes.map((b) => U.arredondar(L.dados.despesas.filter((x) => x.status === "pago" && O.noPeriodo(x.pagoEm, b.de, b.ate)).reduce((t, x) => t + x.valor, 0)));
    p.grafico.definirSub(`Por ${unidade} · data do pagamento`);
    G().colunas(p.grafico.cartao, { rotulos: baldes.map((b) => b.rotulo), series: [{ nome: "recebido", valores: rec }, { nome: "despesas pagas", valores: desp }], formatar: U.moeda, detalheRotulo: (i) => (baldes[i].de === baldes[i].ate ? U.dataCompleta(baldes[i].de) : `${U.dataCurta(baldes[i].de)} a ${U.dataCurta(baldes[i].ate)}`) });
    G().tabela(p.grafico.cartao, ["Período", "Recebido", "Despesas pagas"], baldes.map((b, i) => [b.de === b.ate ? U.dataCompleta(b.de) : `${U.dataCurta(b.de)} a ${U.dataCurta(b.ate)}`, U.moeda(rec[i]), U.moeda(desp[i])]));

    U.trocar(p.abas, el("div", { class: "segmentado segmentado--abas", role: "group", "aria-label": "Detalhamento" }, ...ABAS.map(([id, nome]) => el("button", { type: "button", "aria-pressed": String(estado.aba === id), "data-foco": `fin-aba-${id}`, texto: nome, onclick: () => { estado.aba = id; estado.pagina = 1; atualizar(); } }))));
    if (estado.aba === "ordens") abaOrdens(de, ate);
    else if (estado.aba === "recebimentos") abaRecebimentos(de, ate);
    else abaDespesas(de, ate);
  }

  /* ---------- Situação das ordens ---------- */
  const relevantes = (de, ate) => L.dados.ordens.filter((os) => os.status !== "cancelada" && (O.noPeriodo(os.finalizadaEm, de, ate) || (os.faturamento && O.noPeriodo(os.faturamento.em, de, ate)) || os.recebimentos.some((x) => O.noPeriodo(x.data, de, ate)) || O.aReceber(os) > 0 || O.situacaoFinanceira(os) === "a_faturar"));
  function ordensRelevantes(de, ate) {
    return relevantes(de, ate)
      .filter((os) => !estado.situacao || O.situacaoFinanceira(os) === estado.situacao)
      .sort((a, b) => ({ a_faturar: 0, a_receber: 1, parcial: 1, pago: 2 }[O.situacaoFinanceira(a)] ?? 3) - ({ a_faturar: 0, a_receber: 1, parcial: 1, pago: 2 }[O.situacaoFinanceira(b)] ?? 3) || (b.finalizadaEm || "").localeCompare(a.finalizadaEm || ""));
  }
  function abaOrdens(de, ate) {
    const base = relevantes(de, ate);
    U.trocar(p.filtros, C().chips([["", "Todas"], ["a_faturar", "A faturar"], ["a_receber", "A receber"], ["parcial", "Recebido em parte"], ["pago", "Recebidas"]].map(([v, r]) => ({ valor: v, rotulo: r, n: v ? base.filter((os) => O.situacaoFinanceira(os) === v).length : base.length })), estado.situacao, (v) => { estado.situacao = v; estado.pagina = 1; atualizar(); }, { rotulo: "Situação financeira", nome: "fin-sit" }));
    const lista = ordensRelevantes(de, ate);
    const { res, nav } = C().blocoPaginado(estado, lista, "financeiro", atualizar);
    const titulo = el("p", { class: "contagem", texto: `${U.plural(res.total, "ordem", "ordens")} · inclui todas as que ainda têm valor em aberto, de qualquer data` });
    if (!res.total) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "receipt", titulo: "Nenhuma ordem nesta situação" })); return; }
    U.trocar(p.conteudo, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Situação financeira das ordens" }),
      el("thead", {}, el("tr", {}, ...["OS", "Cliente", "Aprovado", "Executado", "Faturado", "Recebido", "Em aberto", "Situação", ""].map((c) => el("th", { scope: "col", class: ["Aprovado", "Executado", "Faturado", "Recebido", "Em aberto"].includes(c) ? "num" : "", texto: c })))),
      el("tbody", {}, ...res.itens.map((os) => {
        const orc = O.orcamentoAprovado(os);
        const sit = O.situacaoFinanceira(os);
        return el("tr", {},
          C().td("", el("span", {}, el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero }), el("small", { class: "sub", texto: `${C().textoVeiculo(os.veiculoId)} · ${O.nomeStatus(os.status)}` })), "principal-celula"),
          C().td("Cliente", C().nomeDoCliente(os.clienteId)),
          C().td("Aprovado", orc ? U.moeda(O.totaisOrc(orc).total) : "—", "num"),
          C().td("Executado", os.finalizadaEm ? U.moeda(O.totaisOS(os).total) : "—", "num"),
          C().td("Faturado", os.faturamento ? U.moeda(os.faturamento.valor) : "—", "num"),
          C().td("Recebido", U.moeda(O.recebido(os)), "num"),
          C().td("Em aberto", el("b", { class: O.aReceber(os) > 0 ? "texto-alerta" : "", texto: os.faturamento ? U.moeda(O.aReceber(os)) : "—" }), "num"),
          C().td("Situação", C().pilulaFin(os)),
          C().td("", sit === "a_faturar" && O.pode("os_encerrar") ? C().botao("Encerrar e faturar", "btn--linha btn--pequeno", () => NX.form.mudarStatus(os, "concluida"), "receipt")
            : ["a_receber", "parcial"].includes(sit) && O.pode("recebimento") ? C().botao("Registrar recebimento", "btn--primario btn--pequeno", () => NX.form.recebimento(os), "circle-dollar-sign") : null, "acoes-linha"));
      })))), nav);
  }

  /* ---------- Recebimentos ---------- */
  function recebimentos(de, ate) {
    return L.dados.ordens.flatMap((os) => os.recebimentos.filter((x) => O.noPeriodo(x.data, de, ate)).map((x) => ({ ...x, os }))).sort((a, b) => b.data.localeCompare(a.data) || b.em.localeCompare(a.em));
  }
  function abaRecebimentos(de, ate) {
    U.trocar(p.filtros);
    const lista = recebimentos(de, ate);
    const validos = lista.filter((x) => !x.estorno);
    const porForma = NX.FORMAS_PAGAMENTO.map((f) => [f, validos.filter((x) => x.forma === f).reduce((t, x) => t + x.valor, 0)]).filter(([, v]) => v > 0);
    const { res, nav } = C().blocoPaginado(estado, lista, "recebimentos", atualizar);
    const titulo = el("p", { class: "contagem", texto: `${U.plural(validos.length, "recebimento", "recebimentos")} · ${U.moeda(validos.reduce((t, x) => t + x.valor, 0))}${porForma.length ? ` · ${porForma.map(([f, v]) => `${f}: ${U.moeda(v)}`).join(" · ")}` : ""}` });
    if (!res.total) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "circle-dollar-sign", titulo: "Nenhum recebimento no período", texto: "Os recebimentos são registrados na ordem de serviço depois de faturada." })); return; }
    U.trocar(p.conteudo, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Recebimentos" }),
      el("thead", {}, el("tr", {}, ...["Data", "OS", "Cliente", "Forma", "Valor", "Registrado por", "Situação"].map((c) => el("th", { scope: "col", class: c === "Valor" ? "num" : "", texto: c })))),
      el("tbody", {}, ...res.itens.map((x) => el("tr", { class: x.estorno ? "is-inativo" : "" },
        C().td("Data", U.dataCompleta(x.data)),
        C().td("", el("a", { class: "link-texto mono", href: `#/ordens/${x.os.id}`, texto: x.os.numero }), "principal-celula"),
        C().td("Cliente", C().nomeDoCliente(x.os.clienteId)),
        C().td("Forma", x.forma),
        C().td("Valor", el("b", { texto: U.moeda(x.valor) }), "num"),
        C().td("Registrado por", `${x.por} · ${U.dataHoraCurta(x.em)}`),
        C().td("Situação", x.estorno ? C().pilulaTom(`Desfeito: ${x.estorno.motivo}`, "fim") : C().pilulaTom("Válido", "ok"))))))), nav);
  }

  /* ---------- Despesas ---------- */
  function despesas(de, ate) {
    return L.dados.despesas.filter((x) => O.noPeriodo(x.data, de, ate) && (!estado.despStatus || x.status === estado.despStatus) && (!estado.despCat || x.categoria === estado.despCat)).sort((a, b) => b.data.localeCompare(a.data));
  }
  function abaDespesas(de, ate) {
    U.trocar(p.filtros,
      C().seletor([{ valor: "", rotulo: "Todas as situações" }, { valor: "a_pagar", rotulo: "A pagar" }, { valor: "pago", rotulo: "Pagas" }, { valor: "cancelada", rotulo: "Canceladas" }], estado.despStatus, (v) => { estado.despStatus = v; estado.pagina = 1; atualizar(); }, { rotulo: "Situação da despesa", foco: "desp-status" }),
      C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...NX.CATEGORIAS_DESPESA.map((c) => ({ valor: c, rotulo: c }))], estado.despCat, (v) => { estado.despCat = v; estado.pagina = 1; atualizar(); }, { rotulo: "Categoria", foco: "desp-cat" }));
    const lista = despesas(de, ate);
    const { res, nav } = C().blocoPaginado(estado, lista, "despesas", atualizar);
    const ativas = lista.filter((x) => x.status !== "cancelada");
    const titulo = el("p", { class: "contagem", texto: `${U.plural(lista.length, "despesa", "despesas")} · ${U.moeda(ativas.reduce((t, x) => t + x.valor, 0))} (sem as canceladas) · data = vencimento ou competência` });
    if (!res.total) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "wallet", titulo: "Nenhuma despesa no período", acao: O.pode("despesas") ? C().botao("Nova despesa", "btn--primario btn--pequeno", () => NX.form.despesa(null), "plus") : null })); return; }
    const pode = O.pode("despesas");
    U.trocar(p.conteudo, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Despesas" }),
      el("thead", {}, el("tr", {}, ...["Data", "Despesa", "Categoria", "Fornecedor", "Valor", "Situação", pode ? "" : null].filter((x) => x !== null).map((c) => el("th", { scope: "col", class: c === "Valor" ? "num" : "", texto: c })))),
      el("tbody", {}, ...res.itens.map((x) => el("tr", { class: x.status === "cancelada" ? "is-inativo" : "" },
        C().td("Data", U.dataCompleta(x.data)),
        C().td("", el("span", {}, el("b", { texto: x.descricao }), " ", C().pilulaExemplo(x), x.observacao ? el("small", { class: "sub", texto: x.observacao }) : null), "principal-celula"),
        C().td("Categoria", x.categoria),
        C().td("Fornecedor", x.fornecedorId ? (L.fornecedor(x.fornecedorId) || {}).nome : "—"),
        C().td("Valor", el("b", { texto: U.moeda(x.valor) }), "num"),
        C().td("Situação", x.status === "pago" ? C().pilulaTom(`Paga em ${U.dataCurta(x.pagoEm)}`, "ok") : x.status === "a_pagar" ? C().pilulaTom(x.data < U.hoje() ? "Vencida" : "A pagar", x.data < U.hoje() ? "perigo" : "atencao") : C().pilulaTom("Cancelada", "fim", null, x.cancelamento ? x.cancelamento.motivo : "")),
        pode ? C().td("", x.status === "cancelada" ? null : el("span", { class: "acoes-linha__botoes" },
          x.status === "a_pagar" ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", title: "Marcar como paga", "aria-label": `Marcar ${x.descricao} como paga`, onclick: () => NX.form.pagarDespesa(x) }, icone("check", 15)) : null,
          el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", title: "Editar", "aria-label": `Editar ${x.descricao}`, onclick: () => NX.form.despesa(x.id) }, icone("pencil", 15)),
          el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo icone-btn--p", type: "button", title: "Cancelar", "aria-label": `Cancelar ${x.descricao}`, onclick: () => NX.form.cancelarDespesa(x) }, icone("circle-x", 15))), "acoes-linha") : null))))), nav);
  }

  function exportar() {
    const { de, ate } = C().intervaloDe(estado.periodo);
    if (estado.aba === "ordens") {
      U.baixarCSV(U.nomeArquivo("financeiro-ordens"), ["OS", "Cliente", "Status", "Aprovado", "Executado", "Faturado", "Recebido", "Em aberto", "Situação"], ordensRelevantes(de, ate).map((os) => { const orc = O.orcamentoAprovado(os); return [os.numero, C().nomeDoCliente(os.clienteId), O.nomeStatus(os.status), orc ? O.totaisOrc(orc).total : "", os.finalizadaEm ? O.totaisOS(os).total : "", os.faturamento ? os.faturamento.valor : "", O.recebido(os), O.aReceber(os), NX.SITUACOES_FINANCEIRAS.find((s) => s.id === O.situacaoFinanceira(os)).nome]; }));
    } else if (estado.aba === "recebimentos") {
      U.baixarCSV(U.nomeArquivo("recebimentos"), ["Data", "OS", "Cliente", "Forma", "Valor", "Registrado por", "Desfeito"], recebimentos(de, ate).map((x) => [U.dataCompleta(x.data), x.os.numero, C().nomeDoCliente(x.os.clienteId), x.forma, x.valor, x.por, x.estorno ? x.estorno.motivo : ""]));
    } else {
      U.baixarCSV(U.nomeArquivo("despesas"), ["Data", "Descrição", "Categoria", "Fornecedor", "Valor", "Situação", "Pago em"], despesas(de, ate).map((x) => [U.dataCompleta(x.data), x.descricao, x.categoria, x.fornecedorId ? (L.fornecedor(x.fornecedorId) || {}).nome : "", x.valor, { pago: "Paga", a_pagar: "A pagar", cancelada: "Cancelada" }[x.status], x.pagoEm ? U.dataCompleta(x.pagoEm) : ""]));
    }
  }

  function aoEntrar(params) {
    if (params.aba === "receber") { estado.aba = "ordens"; estado.situacao = "a_receber"; }
    else if (params.aba && ABAS.some(([id]) => id === params.aba)) estado.aba = params.aba;
    if (params.de && params.ate && U.dataValida(params.de) && U.dataValida(params.ate)) Object.assign(estado.periodo, { id: "personalizado", de: params.de, ate: params.ate });
    estado.pagina = 1;
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.financeiro = { titulo: "Financeiro", montar, atualizar, aoEntrar, reiniciar: () => Object.assign(estado, PADRAO()) };
})();
