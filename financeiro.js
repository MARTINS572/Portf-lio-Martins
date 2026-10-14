/* ==========================================================================
   NEXORA BOOKING — Tela: Financeiro
   Receita REGISTRADA (pagamentos lançados à mão) separada do faturamento
   PREVISTO (reservas marcadas). O sistema não cobra nem processa
   pagamentos: concluir um atendimento não marca como pago.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const M = NX.metricas;
  const { el, icone } = U;
  const C = () => NX.componentes;
  const G = () => NX.graficos;

  const estado = { periodo: { id: "mes" }, aba: "receber", pagina: 1 };
  let p = null;

  function aoEntrar(params) {
    if (params.de && params.ate && U.dataValida(params.de) && U.dataValida(params.ate)) estado.periodo = { id: "personalizado", de: params.de, ate: params.ate };
    if (params.aba && ["receber", "pagamentos"].includes(params.aba)) estado.aba = params.aba;
  }
  function montar(secao) {
    const grafico = C().cartaoGrafico({ titulo: "Registrado × previsto", sub: "", legenda: C().legenda([["", "Receita registrada"], ["chave--2", "Faturamento previsto"]]) });
    const formas = C().cartaoGrafico({ titulo: "Formas de pagamento", sub: "Pagamentos registrados no período" });
    p = { grafico, formas, periodo: el("div"), resumo: el("div"), abas: el("div", { class: "chips", role: "group", "aria-label": "Lista" }), lista: el("div"), porProf: el("div"), porServico: el("div") };
    U.trocar(secao, 
      C().cabecalho({ id: "financeiro", titulo: "Financeiro", sub: "Controle do que foi recebido no balcão e do que está previsto na agenda.", acoes: [C().botao("Exportar pagamentos (CSV)", "btn--linha", exportar, "download")] }),
      el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("shield-check", 16), el("span", {}, el("b", { texto: "Nenhum pagamento real é processado. " }), "Os valores recebidos são registrados manualmente na reserva (Pix, dinheiro ou cartão na maquininha do estabelecimento). Não há cobrança, link de pagamento nem integração bancária.")),
      p.periodo, p.resumo,
      el("div", { class: "painel-grade" }, grafico.cartao, formas.cartao),
      el("div", { class: "painel-grade painel-grade--financeiro" },
        el("article", { class: "cartao cartao--tabela" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Desempenho por profissional" }), el("p", { class: "cartao__sub", texto: "Atendimentos, cancelamentos e valores no período" }))), p.porProf),
        el("article", { class: "cartao cartao--tabela" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Serviços realizados" }), el("p", { class: "cartao__sub", texto: "Atendimentos concluídos no período, pelo preço registrado" }))), p.porServico)),
      p.abas, p.lista);
  }

  function desenhar() {
    const { de, ate } = C().intervaloDe(estado.periodo);
    U.trocar(p.periodo, C().seletorPeriodo(estado.periodo, () => { estado.pagina = 1; atualizar(); }, { ids: ["7d", "30d", "mes", "mes-anterior", "90d", "personalizado"], nome: "fin" }), el("p", { class: "periodo-descricao", texto: `Período: ${C().descreverPeriodo({ de, ate })}. Previsto conta reservas com data no período (exceto canceladas e faltas).` }));
    const r = M.resumo(de, ate);
    U.trocar(p.resumo, el("div", { class: "faixa-resumo" },
      el("div", {}, el("span", { texto: "Receita registrada" }), el("b", { texto: U.moeda(r.receita) }), el("small", { class: "suave", texto: U.plural(r.pagos, "pagamento", "pagamentos") })),
      el("div", {}, el("span", { texto: "Faturamento previsto" }), el("b", { texto: U.moeda(r.previsto) }), el("small", { class: "suave", texto: "reservas do período" })),
      el("div", {}, el("span", { texto: "A receber no período" }), el("b", { texto: U.moeda(r.aReceber) }), el("small", { class: "suave", texto: U.plural(r.aReceberQtd, "concluído sem pagamento", "concluídos sem pagamento") })),
      el("div", {}, el("span", { texto: "Ticket médio" }), el("b", { texto: U.moeda(r.ticket) }), el("small", { class: "suave", texto: `${U.moeda(r.valorCancelado)} em reservas canceladas` }))));

    const s = M.serie(de, ate);
    p.grafico.definirSub(`Por ${s.tipo === "dia" ? "dia" : s.tipo === "semana" ? "semana" : "mês"}`);
    G().colunas(p.grafico.cartao, { rotulos: s.pontos.map((x) => x.rotulo), series: [{ nome: "registrada", valores: s.pontos.map((x) => x.receita) }, { nome: "prevista", valores: s.pontos.map((x) => x.previsto) }], formatar: U.moeda, detalheRotulo: (i) => (s.pontos[i].inicio === s.pontos[i].fim ? U.dataCompleta(s.pontos[i].inicio) : `${U.dataCurta(s.pontos[i].inicio)} a ${U.dataCurta(s.pontos[i].fim)}`) });
    G().tabela(p.grafico.cartao, ["Período", "Registrada", "Prevista"], s.pontos.map((x) => [x.inicio === x.fim ? U.dataCompleta(x.inicio) : `${U.dataCurta(x.inicio)} a ${U.dataCurta(x.fim)}`, U.moeda(x.receita), U.moeda(x.previsto)]));
    // Desempenho por profissional e serviços realizados (atendimentos com data no período)
    const des = M.desempenho(de, ate);
    const soma = (f) => des.reduce((t, x) => t + f(x), 0);
    const tabelaResumo = (cab, linhas, rodape) => el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
      el("thead", {}, el("tr", {}, ...cab.map((c, i) => el("th", { scope: "col", class: i ? "num" : "", texto: c })))),
      el("tbody", {}, ...linhas.map((l) => el("tr", {}, ...l.map((c, i) => C().td(i ? cab[i] : "", c, i ? "num" : "principal-celula"))))),
      rodape ? el("tfoot", {}, el("tr", {}, ...rodape.map((c, i) => el(i ? "td" : "th", { scope: i ? null : "row", class: i ? "num" : "", "data-rotulo": i ? cab[i] : null, texto: c })))) : null));
    U.trocar(p.porProf, des.length ? tabelaResumo(["Profissional", "Concluídos", "Cancel. e faltas", "Recebido", "Previsto", "A receber"],
      des.map((x) => [C().nomeProf(x.profissional.id), U.numero(x.por.concluido), U.numero(x.por.cancelado + x.por.nao_compareceu), U.moeda(x.receita), U.moeda(x.previsto), U.moeda(x.aReceber)]),
      ["Total", U.numero(soma((x) => x.por.concluido)), U.numero(soma((x) => x.por.cancelado + x.por.nao_compareceu)), U.moeda(soma((x) => x.receita)), U.moeda(soma((x) => x.previsto)), U.moeda(soma((x) => x.aReceber))]) : C().vazio({ icone: "users", titulo: "Sem atendimentos no período" }));
    const mapa = new Map();
    L.dados.agendamentos.forEach((a) => {
      if (a.status !== "concluido" || !M.noPeriodo(a.data, de, ate)) return;
      const x = mapa.get(a.servicoId) || { nome: a.servicoNome, qtd: 0, valor: 0 };
      x.qtd += 1; x.valor = U.arredondar(x.valor + a.preco);
      mapa.set(a.servicoId, x);
    });
    const servs = [...mapa.values()].sort((x, y) => y.qtd - x.qtd || x.nome.localeCompare(y.nome, "pt-BR"));
    U.trocar(p.porServico, servs.length ? tabelaResumo(["Serviço", "Concluídos", "Valor dos atendimentos"], servs.map((x) => [x.nome, U.numero(x.qtd), U.moeda(x.valor)]),
      ["Total", U.numero(servs.reduce((t, x) => t + x.qtd, 0)), U.moeda(servs.reduce((t, x) => t + x.valor, 0))]) : C().vazio({ icone: "scissors", titulo: "Nenhum atendimento concluído no período" }));

    const fp = M.formasPagamento(de, ate);
    G().barras(p.formas.cartao, { itens: fp.map((f) => ({ rotulo: f.forma, valor: f.valor, sub: U.plural(f.quantidade, "pagamento", "pagamentos") })), formatar: U.moeda, vazio: "Nenhum pagamento registrado no período." });
    G().tabela(p.formas.cartao, ["Forma", "Pagamentos", "Valor"], fp.map((f) => [f.forma, U.numero(f.quantidade), U.moeda(f.valor)]));

    // Listas
    const aReceber = L.dados.agendamentos.filter((a) => a.status === "concluido" && !a.pagamento).sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio));
    const pagos = L.dados.agendamentos.filter((a) => a.pagamento && M.noPeriodo(a.pagamento.em.slice(0, 10), de, ate)).sort((a, b) => b.pagamento.em.localeCompare(a.pagamento.em));
    U.trocar(p.abas, 
      el("button", { class: "chip", type: "button", "aria-pressed": String(estado.aba === "receber"), "data-foco": "fin-receber", onclick: () => { estado.aba = "receber"; estado.pagina = 1; atualizar(); } }, "A receber (todos)", el("span", { class: "chip__n", texto: U.numero(aReceber.length) })),
      el("button", { class: "chip", type: "button", "aria-pressed": String(estado.aba === "pagamentos"), "data-foco": "fin-pagos", onclick: () => { estado.aba = "pagamentos"; estado.pagina = 1; atualizar(); } }, "Pagamentos do período", el("span", { class: "chip__n", texto: U.numero(pagos.length) })));
    const lista = estado.aba === "receber" ? aReceber : pagos;
    if (!lista.length) {
      U.trocar(p.lista, el("div", { class: "cartao" }, C().vazio({ icone: "wallet", titulo: estado.aba === "receber" ? "Nada a receber" : "Nenhum pagamento no período", texto: estado.aba === "receber" ? "Todos os atendimentos concluídos têm pagamento registrado." : "Mude o período para ver outros pagamentos." })));
      return;
    }
    const pag = C().paginar(lista, estado.pagina, NX.preferencias.porPagina);
    estado.pagina = pag.pagina;
    const tabela = el("table", { class: "tabela tabela--cartoes" },
      el("thead", {}, el("tr", {}, ...(estado.aba === "receber" ? ["Atendimento", "Cliente", "Serviço", "Profissional", "Valor", ""] : ["Pago em", "Cliente", "Serviço", "Forma", "Valor", ""]).map((t, i) => el("th", { scope: "col", class: i === 4 ? "num" : "" }, t || el("span", { class: "vh", texto: "Ações" }))))),
      el("tbody", {}, ...pag.itens.map((a) => el("tr", {},
        C().td(estado.aba === "receber" ? "Atendimento" : "Pago em", el("span", {}, el("b", { texto: estado.aba === "receber" ? U.dataCurta(a.data) : U.dataCompleta(a.pagamento.em) }), el("span", { class: "sub", texto: estado.aba === "receber" ? `${a.inicio} · ${U.relativo(a.data)}` : a.codigo }))),
        C().td("", C().nomeCliente(a.clienteId), "principal-celula"),
        C().td("Serviço", a.servicoNome),
        estado.aba === "receber" ? C().td("Profissional", C().nomeProf(a.profissionalId, { curto: true })) : C().td("Forma", a.pagamento.forma),
        C().td("Valor", el("span", {}, U.moeda(estado.aba === "receber" ? a.preco : a.pagamento.valor), estado.aba === "pagamentos" && a.pagamento.valor !== a.preco ? el("span", { class: "sub", texto: `preço ${U.moeda(a.preco)}` }) : null), "num"),
        C().td("", estado.aba === "receber"
          ? el("button", { class: "btn btn--linha btn--pequeno", type: "button", "data-foco": `pagar-${a.id}`, onclick: () => NX.reservas.pagamento(a.id) }, icone("circle-dollar-sign", 15), "Registrar")
          : el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": `Abrir reserva ${a.codigo}`, onclick: () => NX.reservas.detalhe(a.id) }, icone("panel-right-open", 16)), "acoes-linha")))));
    U.trocar(p.lista, el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: estado.aba === "receber" ? `${U.plural(lista.length, "atendimento", "atendimentos")} · ${U.moeda(lista.reduce((t, a) => t + a.preco, 0))} a receber` : `${U.plural(lista.length, "pagamento", "pagamentos")} · ${U.moeda(lista.reduce((t, a) => t + a.pagamento.valor, 0))}` }),
      el("div", { class: "tabela-rolagem" }, tabela),
      C().paginacao(pag, { porPagina: NX.preferencias.porPagina, nome: "financeiro", aoMudar: (n) => { estado.pagina = n; atualizar(); }, aoMudarTamanho: (n) => NX.salvarPreferencias({ porPagina: n }) })));
  }
  const atualizar = C().comFoco(desenhar);

  function exportar() {
    const { de, ate } = C().intervaloDe(estado.periodo);
    const pagos = L.dados.agendamentos.filter((a) => a.pagamento && M.noPeriodo(a.pagamento.em.slice(0, 10), de, ate)).sort((a, b) => a.pagamento.em.localeCompare(b.pagamento.em));
    if (!pagos.length) { U.aviso("Nenhum pagamento registrado no período.", "info"); return; }
    U.baixarCSV(U.nomeArquivo("pagamentos"), ["Data do pagamento", "Código", "Data do atendimento", "Cliente", "Serviço", "Profissional", "Preço registrado", "Valor recebido", "Forma", "Observação", "Registrado por"],
      pagos.map((a) => [U.dataCompleta(a.pagamento.em), a.codigo, U.dataCompleta(a.data), C().nomeDoCliente(a.clienteId), a.servicoNome, C().nomeDoProf(a.profissionalId), a.preco, a.pagamento.valor, a.pagamento.forma, a.pagamento.observacao, a.pagamento.por]));
  }

  NX.telas.financeiro = { titulo: "Financeiro", montar, atualizar, aoEntrar };
})();
