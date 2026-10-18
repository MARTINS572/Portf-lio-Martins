/* ==========================================================================
   NEXORA AUTO — Telas: Orçamentos (lista) e Orçamento (detalhe)
   O cálculo é sempre o mesmo da ordem de serviço. Aprovado não muda: para
   mudar, cria-se uma revisão. A aprovação é um registro interno (quem,
   como, quando), não uma assinatura digital.
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

  /* ======================================================================
     LISTA
     ====================================================================== */
  const PADRAO = () => ({ status: "", busca: "", origem: "", pagina: 1, ordem: "emitidoEm", direcao: "desc" });
  const estado = PADRAO();
  let p = null;

  function montarLista(secao) {
    const busca = C().campoBusca({ placeholder: "Número, cliente ou placa", rotulo: "Buscar orçamentos", foco: "orc-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizarLista(); } });
    p = { busca, chips: el("div"), filtros: el("div", { class: "barra-filtros" }), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "orcamentos", titulo: "Orçamentos", sub: "Dos gerados nas ordens de serviço e dos avulsos (pedidos por telefone, por exemplo). Orçamentos vencem sozinhos ao passar da validade.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botaoSe("orc_criar", "Novo orçamento", "btn--primario", () => NX.form.editorOrcamento(null), "plus"),
      ] }),
      p.chips, p.filtros, p.tabela);
  }
  function filtrados() {
    const q = estado.busca.trim();
    const placaQ = L.limparPlaca(q);
    return L.dados.orcamentos.filter((o) => (!estado.status || O.statusOrc(o) === estado.status)
      && (!estado.origem || (estado.origem === "os" ? !!o.osId : !o.osId))
      && (!q || U.contem(o.numero, q) || U.contem(C().nomeDoCliente(o.clienteId), q) || (placaQ.length >= 2 && (L.veiculo(o.veiculoId) || { placa: "" }).placa.includes(placaQ))));
  }
  const CHAVES = { emitidoEm: (o) => `${o.emitidoEm}${o.criadoEm}`, numero: (o) => `${o.numero}${String(o.revisao).padStart(2, "0")}`, validade: (o) => o.validade, total: (o) => O.totaisOrc(o).total, cliente: (o) => C().nomeDoCliente(o.clienteId) };

  function desenharLista() {
    const todos = L.dados.orcamentos;
    U.trocar(p.chips, C().chips([{ valor: "", rotulo: "Todos", n: todos.length }, ...NX.STATUS_ORC.map((s) => ({ valor: s.id, rotulo: s.nome, n: todos.filter((o) => O.statusOrc(o) === s.id).length }))], estado.status, (v) => { estado.status = v; estado.pagina = 1; atualizarLista(); }, { rotulo: "Situação", nome: "orc-st" }));
    U.trocar(p.filtros, p.busca.caixa, C().seletor([{ valor: "", rotulo: "Com e sem OS" }, { valor: "os", rotulo: "Gerados numa OS" }, { valor: "avulso", rotulo: "Avulsos" }], estado.origem, (v) => { estado.origem = v; estado.pagina = 1; atualizarLista(); }, { rotulo: "Origem", foco: "orc-origem" }));
    const lista = C().ordenar(filtrados(), estado, CHAVES);
    const { res, nav } = C().blocoPaginado(estado, lista, "orcamentos", atualizarLista);
    const valor = lista.reduce((t, o) => t + O.totaisOrc(o).total, 0);
    const titulo = el("p", { class: "contagem", texto: `${U.plural(res.total, "orçamento", "orçamentos")} · ${U.moeda(valor)}` });
    if (!res.total) { U.trocar(p.tabela, titulo, C().vazio({ icone: "file-text", titulo: "Nenhum orçamento encontrado", texto: "Ajuste os filtros ou crie um orçamento." })); return; }
    const hoje = U.hoje();
    const th = (r, c, cl) => C().thOrdenavel(r, c, estado, atualizarLista, cl);
    U.trocar(p.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga tabela--clicavel" },
      el("caption", { class: "vh", texto: "Orçamentos" }),
      el("thead", {}, el("tr", {}, th("Orçamento", "numero"), th("Cliente", "cliente"), el("th", { scope: "col", texto: "Veículo" }), th("Emitido", "emitidoEm"), th("Validade", "validade"), th("Total", "total", "num"), el("th", { scope: "col", texto: "Situação" }), el("th", { scope: "col", texto: "Origem" }))),
      el("tbody", {}, ...res.itens.map((o) => {
        const st = O.statusOrc(o);
        const dias = U.diasEntre(hoje, o.validade);
        const os = o.osId ? L.ordem(o.osId) : null;
        return el("tr", { class: "linha-clicavel", tabindex: "0", "data-foco": `linha-orc-${o.id}`, onclick: (e) => { if (!e.target.closest("a, button")) NX.ir(`orcamentos/${o.id}`); }, onkeydown: (e) => { if (e.key === "Enter") NX.ir(`orcamentos/${o.id}`); } },
          C().td("", el("a", { class: "link-texto mono", href: `#/orcamentos/${o.id}`, texto: O.rotuloOrc(o) }), "principal-celula"),
          C().td("Cliente", el("span", {}, C().nomeDoCliente(o.clienteId), " ", C().pilulaExemplo(o))),
          C().td("Veículo", C().textoVeiculo(o.veiculoId)),
          C().td("Emitido", U.dataCompleta(o.emitidoEm)),
          C().td("Validade", el("span", { class: st === "aguardando_aprovacao" && dias <= 2 ? "texto-alerta" : "" }, U.dataCompleta(o.validade), st === "aguardando_aprovacao" ? el("small", { class: "sub", texto: dias === 0 ? "vence hoje" : `vence em ${U.plural(dias, "dia", "dias")}` }) : null)),
          C().td("Total", el("b", { texto: U.moeda(O.totaisOrc(o).total) }), "num"),
          C().td("Situação", C().pilulaOrc(o)),
          C().td("Origem", os ? el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero }) : el("span", { class: "suave", texto: "Avulso" })));
      })))), nav);
  }
  function exportar() {
    const linhas = C().ordenar(filtrados(), estado, CHAVES).map((o) => {
      const t = O.totaisOrc(o);
      return [O.rotuloOrc(o), C().nomeDoCliente(o.clienteId), C().textoVeiculo(o.veiculoId), U.dataCompleta(o.emitidoEm), U.dataCompleta(o.validade), t.subtotal, t.desconto, t.total, (NX.STATUS_ORC.find((s) => s.id === O.statusOrc(o)) || {}).nome, o.osId ? (L.ordem(o.osId) || {}).numero : "Avulso", o.aprovacao ? `${o.aprovacao.por} (${o.aprovacao.canal})` : "", o.recusa ? o.recusa.motivo : ""];
    });
    U.baixarCSV(U.nomeArquivo("orcamentos"), ["Orçamento", "Cliente", "Veículo", "Emitido", "Validade", "Subtotal", "Desconto", "Total", "Situação", "Origem", "Aprovado por", "Motivo da recusa"], linhas);
  }
  const atualizarLista = C().comFoco(desenharLista);
  NX.telas.orcamentos = {
    titulo: "Orçamentos", montar: montarLista, atualizar: atualizarLista,
    aoEntrar(params) { if (params.status !== undefined) { estado.status = NX.STATUS_ORC.some((s) => s.id === params.status) ? params.status : ""; estado.pagina = 1; } },
    reiniciar: () => Object.assign(estado, PADRAO()),
  };

  /* ======================================================================
     DETALHE
     ====================================================================== */
  let orcId = null;
  let secao = null;

  function acoes(o) {
    const st = O.statusOrc(o);
    const os = o.osId ? L.ordem(o.osId) : null;
    const b = [];
    if (st === "rascunho" && O.pode("orc_criar")) {
      b.push(C().botao("Editar itens", "btn--linha", () => NX.form.editorOrcamento(o.id), "pencil"));
      b.push(C().botao("Enviar para aprovação", "btn--primario", () => { const r = O.enviarOrcamento(o.id); U.aviso(r.ok ? "Orçamento enviado para aprovação." : r.erro, r.ok ? "ok" : "erro"); }, "send"));
    }
    if (st === "aguardando_aprovacao" && O.pode("orc_aprovar")) {
      b.push(C().botao("Registrar aprovação", "btn--primario", () => NX.form.aprovar(o), "thumbs-up"));
      b.push(C().botao("Registrar recusa", "btn--linha", () => NX.form.recusar(o), "thumbs-down"));
    }
    if (st === "aprovado" && !os && O.pode("os_abrir")) b.push(C().botao("Abrir OS a partir deste orçamento", "btn--primario", () => NX.form.novaOS({ orcamentoId: o.id }), "clipboard-plus"));
    if (["aprovado", "recusado", "expirado"].includes(st) && O.pode("orc_criar")) {
      const ultima = L.dados.orcamentos.filter((x) => x.numero === o.numero).sort((a, x) => x.revisao - a.revisao)[0];
      const bloqueada = (os && ["aguardando_retirada", "concluida", "entregue", "cancelada"].includes(os.status)) || (ultima.id !== o.id && ["rascunho", "aguardando_aprovacao"].includes(ultima.status));
      if (!bloqueada) b.push(C().botao(st === "expirado" ? "Criar revisão com nova validade" : "Criar revisão", "btn--linha", async () => {
        const r = O.revisarOrcamento(o.id);
        if (!r.ok) { U.aviso(r.erro, "erro"); return; }
        U.aviso(`Revisão ${r.orcamento.revisao} criada como rascunho.`);
        NX.ir(`orcamentos/${r.orcamento.id}`);
      }, "file-pen-line"));
    }
    if (["rascunho", "aguardando_aprovacao"].includes(o.status) && O.pode("orc_criar")) b.push(C().botao("Cancelar orçamento", "btn--perigo", () => NX.form.cancelarOrc(o), "circle-x"));
    return b;
  }

  function desenharDetalhe() {
    const o = L.orcamento(orcId);
    if (!o) {
      U.trocar(secao, C().cabecalho({ id: "orcamento", titulo: "Orçamento não encontrado", antes: C().voltar("orcamentos", "Orçamentos") }), C().vazio({ icone: "search-x", titulo: "Este orçamento não existe", acao: el("a", { class: "btn btn--linha", href: "#/orcamentos" }, "Ver orçamentos") }));
      return;
    }
    const st = O.statusOrc(o);
    const os = o.osId ? L.ordem(o.osId) : null;
    const t = O.totaisOrc(o);
    const tipoNome = { servico: "Serviço", peca: "Peça", mao: "Mão de obra" };
    const revisoes = L.dados.orcamentos.filter((x) => x.numero === o.numero).sort((a, b) => b.revisao - a.revisao);
    const podeMsg = O.podeVer("clientes") && st === "aguardando_aprovacao";
    const linhaFicha = (k, v) => el("div", { class: "ficha__linha" }, el("dt", { texto: k }), el("dd", {}, v));
    const blocoRegistro = (titulo, ic, tom, texto) => el("div", { class: `registro registro--${tom}` }, icone(ic, 18), el("div", {}, el("b", { texto: titulo }), el("p", { texto })));
    const dias = U.diasEntre(U.hoje(), o.validade);
    U.trocar(secao,
      C().cabecalho({
        id: "orcamento", titulo: `Orçamento ${O.rotuloOrc(o)}`, antes: C().voltar("orcamentos", "Orçamentos"),
        sub: `${C().nomeDoCliente(o.clienteId)} · ${C().textoVeiculo(o.veiculoId)}`,
        etiquetas: [C().pilulaOrc(o), os ? el("a", { class: "pilula pilula--neutra", href: `#/ordens/${os.id}` }, icone("clipboard-list", 13), os.numero) : C().pilula("Avulso", "neutra"), C().pilulaExemplo(o)],
        acoes: [podeMsg ? C().botao("Mensagem ao cliente", "btn--linha", () => C().mensagemCliente({ titulo: "Orçamento para aprovação", texto: O.mensagem("orcamento", { orc: o }), clienteId: o.clienteId }), "message-circle") : null, C().botao("Imprimir / PDF", "btn--linha", () => NX.documentos.imprimirOrcamento(o), "printer")],
      }),
      acoes(o).length ? el("div", { class: "barra-acoes" }, ...acoes(o)) : null,
      st === "expirado" ? el("p", { class: "nota-alerta nota-alerta--bloco" }, icone("calendar-x", 16), `Venceu em ${U.dataCompleta(o.validade)} sem resposta do cliente. Para aprovar, crie uma revisão com nova validade.`) : null,
      st === "aguardando_aprovacao" ? el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("hourglass", 16), el("span", { texto: `Aguardando o cliente. ${dias === 0 ? "Vence hoje" : `Vence em ${U.plural(dias, "dia", "dias")}`} (${U.dataCompleta(o.validade)}). Enquanto isso, nenhuma peça é reservada.` })) : null,
      el("div", { class: "detalhe-grade detalhe-grade--lado" },
        el("div", { class: "detalhe-grade__principal" },
          el("section", { class: "cartao", "aria-labelledby": "titulo-orc-itens" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", id: "titulo-orc-itens", texto: "Itens" }),
            el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
              el("caption", { class: "vh", texto: "Itens do orçamento" }),
              el("thead", {}, el("tr", {}, ...["Item", "Tipo", "Qtd.", "Unitário", "Total"].map((c, i) => el("th", { scope: "col", class: i >= 2 ? "num" : "", texto: c })))),
              el("tbody", {}, ...o.itens.map((i) => el("tr", {},
                C().td("", el("b", { texto: i.descricao }), "principal-celula"), C().td("Tipo", tipoNome[i.tipo]),
                C().td("Qtd.", i.tipo === "mao" ? `${U.decimal(i.quantidade)} h` : String(i.quantidade), "num"), C().td("Unitário", U.moeda(i.unitario), "num"), C().td("Total", el("b", { texto: U.moeda(O.valorItem(i)) }), "num")))))),
            el("dl", { class: "totais" },
              el("dt", { texto: "Serviços e mão de obra" }), el("dd", { texto: U.moeda(t.maoDeObra) }),
              el("dt", { texto: "Peças" }), el("dd", { texto: U.moeda(t.pecas) }),
              el("dt", { texto: "Subtotal" }), el("dd", { texto: U.moeda(t.subtotal) }),
              t.desconto ? el("dt", { texto: `Desconto${o.descontoAutorizadoPor ? ` (autorizado por ${o.descontoAutorizadoPor})` : ""}` }) : null, t.desconto ? el("dd", { texto: `− ${U.moeda(t.desconto)}` }) : null,
              el("dt", { class: "totais__total", texto: "Total" }), el("dd", { class: "totais__total", texto: U.moeda(t.total) }))),
          o.aprovacao ? blocoRegistro("Aprovação registrada", "thumbs-up", "ok", `${o.aprovacao.por} aprovou por ${o.aprovacao.canal} em ${U.dataHora(o.aprovacao.em)} (registrado por ${o.aprovacao.registradoPor}). Valor aprovado: ${U.moeda(o.aprovacao.total)}.${o.aprovacao.observacao ? ` ${o.aprovacao.observacao}` : ""} Registro interno, sem assinatura digital.`) : null,
          o.recusa ? blocoRegistro("Recusado pelo cliente", "thumbs-down", "perigo", `${U.dataHora(o.recusa.em)} · ${o.recusa.motivo} (registrado por ${o.recusa.por})`) : null,
          o.cancelamento ? blocoRegistro("Cancelado", "circle-x", "fim", `${U.dataHora(o.cancelamento.em)} · ${o.cancelamento.motivo} (${o.cancelamento.por})`) : null,
          el("section", { class: "cartao", "aria-labelledby": "titulo-orc-hist" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", id: "titulo-orc-hist", texto: "Histórico" }),
            el("ol", { class: "linha-tempo" }, ...[...o.historico].reverse().map((h) => el("li", {}, el("span", { class: "linha-tempo__icone" }, icone({ criado: "file-plus", enviado: "send", aprovado: "thumbs-up", recusado: "thumbs-down", cancelado: "circle-x", substituido: "replace", editado: "pencil" }[h.acao] || "dot", 14)), el("div", {}, el("span", { texto: h.texto }), el("span", { class: "suave", texto: `${U.dataHora(h.em)} · ${h.por}` }))))))),
        el("div", { class: "detalhe-grade__lado" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Dados" }),
            el("div", { class: "pilha" }, C().nomeCliente(o.clienteId), C().nomeVeiculo(o.veiculoId)),
            el("dl", { class: "ficha ficha--coluna" },
              linhaFicha("Emitido em", U.dataCompleta(o.emitidoEm)),
              linhaFicha("Validade", `${U.dataCompleta(o.validade)}${st === "aguardando_aprovacao" ? ` (${dias === 0 ? "vence hoje" : `${U.plural(dias, "dia", "dias")}`})` : ""}`),
              o.observacoes ? linhaFicha("Observações", o.observacoes) : null,
              linhaFicha("Ordem de serviço", os ? el("a", { class: "link-texto", href: `#/ordens/${os.id}`, texto: `${os.numero} · ${O.nomeStatus(os.status)}` }) : "Avulso (sem OS)"))),
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Revisões" }),
            el("ul", { class: "lista-simples" }, ...revisoes.map((x) => el("li", { class: x.id === o.id ? "is-atual" : "" },
              el("span", { class: "mono", texto: `rev. ${x.revisao}` }),
              el("span", { class: "lista-simples__texto" }, x.id === o.id ? el("b", { texto: "Este orçamento" }) : el("a", { class: "link-texto", href: `#/orcamentos/${x.id}`, texto: O.rotuloOrc(x) }), el("span", { class: "suave", texto: U.dataCompleta(x.emitidoEm) })),
              el("span", { class: "lista-simples__fim" }, el("b", { texto: U.moeda(O.totaisOrc(x).total) }), C().pilulaOrc(x)))))))));
  }
  NX.telas.orcamento = {
    titulo: "Orçamento",
    tituloDinamico: () => { const o = L.orcamento(orcId); return o ? `Orçamento ${O.rotuloOrc(o)}` : "Orçamento"; },
    abrir(id) { orcId = id; },
    montar(s) { secao = s; },
    atualizar: C().comFoco(desenharDetalhe),
  };
})();
