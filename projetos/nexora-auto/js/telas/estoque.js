/* ==========================================================================
   NEXORA AUTO — Telas: Estoque e Peça (detalhe)
   Saldo = soma das movimentações (entradas, saídas, ajustes e baixas de
   OS). Disponível = saldo − reservado para ordens aprovadas. Toda
   movimentação guarda saldo antes e depois, motivo, documento e quem fez;
   nenhuma deixa o saldo negativo.
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

  const PADRAO = () => ({ aba: "saldos", situacao: "", busca: "", tipo: "", peca: "", de: "", ate: "", pagina: 1, paginaMov: 1 });
  const estado = PADRAO();
  let p = null;
  const nomeTipo = (t) => (NX.TIPOS_MOVIMENTO.find((x) => x.id === t) || { nome: t }).nome;
  const iconeTipo = (t) => (NX.TIPOS_MOVIMENTO.find((x) => x.id === t) || { icone: "dot" }).icone;

  function origem(m) {
    const partes = [];
    if (m.osId) { const os = L.ordem(m.osId); partes.push(os ? el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero }) : "OS removida"); }
    else partes.push(m.motivo);
    if (m.fornecedorId) partes.push(` · ${(L.fornecedor(m.fornecedorId) || {}).nome || "fornecedor"}`);
    if (m.documento) partes.push(` · ${m.documento}`);
    return el("span", {}, ...partes, m.observacao ? el("small", { class: "sub", texto: m.observacao }) : null);
  }
  function linhaMov(m, { mostrarPeca = true } = {}) {
    const pc = L.peca(m.pecaId);
    return el("tr", {},
      C().td("Nº", el("span", { class: "codigo", texto: `#${m.numero}` })),
      C().td("Data", el("span", { class: "nowrap", texto: U.dataHora(m.data) })),
      mostrarPeca ? C().td("", el("span", {}, el("b", { texto: pc ? pc.nome : m.pecaId }), el("small", { class: "sub", texto: pc ? pc.sku : "" })), "principal-celula") : null,
      C().td("Tipo", el("span", { class: `mov-tipo mov-tipo--${m.tipo}` }, icone(iconeTipo(m.tipo), 13), nomeTipo(m.tipo))),
      C().td("Quantidade", el("b", { class: m.quantidade > 0 ? "positivo" : "negativo", texto: U.comSinal(m.quantidade) }), "num"),
      C().td("Saldo", el("span", { class: "nowrap mono", texto: `${m.saldoAnterior} → ${m.saldoApos}` }), "num"),
      C().td("Origem / motivo", origem(m), "inteira"),
      C().td("Por", m.por));
  }

  function montar(secao) {
    const busca = C().campoBusca({ placeholder: "Peça ou código", rotulo: "Buscar no estoque", foco: "est-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; estado.paginaMov = 1; atualizar(); } });
    p = { busca, atalhos: el("div", { class: "atalhos" }), resumo: el("div"), abas: el("div"), filtros: el("div", { class: "barra-filtros" }), conteudo: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "estoque", titulo: "Estoque", sub: "Colocar peça no orçamento não mexe no estoque; a aprovação reserva; a baixa acontece uma única vez, quando o serviço é finalizado. Não há saldo negativo.", acoes: [C().botao("Exportar movimentações", "btn--linha", exportar, "download")] }),
      p.atalhos, p.resumo, p.abas, p.filtros, p.conteudo);
  }

  function desenhar() {
    const d = L.dados;
    const verCusto = O.podeVer("financeiro") || O.pode("catalogo");
    U.trocar(p.atalhos,
      O.pode("estoque_mov") ? el("button", { class: "atalho atalho--entrada", type: "button", onclick: () => NX.form.movimento("entrada") }, el("span", { class: "atalho__icone" }, icone("arrow-down-to-line", 18)), el("span", {}, "Entrada", el("small", { texto: "Compra ou devolução" }))) : null,
      O.pode("estoque_mov") ? el("button", { class: "atalho atalho--saida", type: "button", onclick: () => NX.form.movimento("saida") }, el("span", { class: "atalho__icone" }, icone("arrow-up-from-line", 18)), el("span", {}, "Saída avulsa", el("small", { texto: "Fora de ordem de serviço" }))) : null,
      O.pode("estoque_ajuste") ? el("button", { class: "atalho atalho--ajuste", type: "button", onclick: () => NX.form.movimento("ajuste") }, el("span", { class: "atalho__icone" }, icone("scale", 18)), el("span", {}, "Ajuste de inventário", el("small", { texto: "Contagem física" }))) : null,
      O.pode("catalogo") ? el("button", { class: "atalho", type: "button", onclick: () => NX.form.peca(null) }, el("span", { class: "atalho__icone" }, icone("package-plus", 18)), el("span", {}, "Nova peça", el("small", { texto: "Cadastro" }))) : null);
    p.atalhos.hidden = !p.atalhos.children.length;

    const ativas = d.pecas.filter((x) => x.status === "ativo");
    const valor = ativas.reduce((t, x) => t + O.saldo(x.id) * x.custo, 0);
    const reservadas = ativas.reduce((t, x) => t + O.reservado(x.id), 0);
    const baixo = ativas.filter((x) => O.situacaoPeca(x) === "baixo").length;
    const zerado = ativas.filter((x) => O.situacaoPeca(x) === "zerado").length;
    U.trocar(p.resumo, el("div", { class: "faixa-resumo" },
      el("div", {}, el("span", { texto: "Peças ativas" }), el("b", { texto: U.numero(ativas.length) })),
      verCusto ? el("div", {}, el("span", { texto: "Valor em estoque (custo)" }), el("b", { texto: U.moeda(valor) })) : el("div", {}, el("span", { texto: "Unidades em estoque" }), el("b", { texto: U.numero(ativas.reduce((t, x) => t + O.saldo(x.id), 0)) })),
      el("div", {}, el("span", { texto: "Reservadas para OS" }), el("b", { texto: U.unidades(reservadas) })),
      el("div", {}, el("span", { texto: "Estoque baixo / sem estoque" }), el("b", { class: baixo + zerado ? "texto-alerta" : "", texto: `${baixo} / ${zerado}` }))));

    U.trocar(p.abas, el("div", { class: "segmentado segmentado--abas", role: "group", "aria-label": "Visão do estoque" },
      ...[["saldos", "Saldos"], ["movimentos", "Movimentações"], ["reservas", "Reservas e faltas"]].map(([id, nome]) => el("button", { type: "button", "aria-pressed": String(estado.aba === id), "data-foco": `est-aba-${id}`, texto: nome, onclick: () => { estado.aba = id; atualizar(); } }))));

    if (estado.aba === "saldos") desenharSaldos(verCusto);
    else if (estado.aba === "movimentos") desenharMovimentos();
    else desenharReservas();
  }

  function desenharSaldos(verCusto) {
    const d = L.dados;
    U.trocar(p.filtros, p.busca.caixa, C().seletor([{ valor: "", rotulo: "Todas as situações" }, { valor: "baixo", rotulo: "Baixo ou sem estoque" }, { valor: "normal", rotulo: "Normal" }, { valor: "inativo", rotulo: "Inativas" }], estado.situacao, (v) => { estado.situacao = v; estado.pagina = 1; atualizar(); }, { rotulo: "Situação", foco: "est-sit" }));
    const lista = d.pecas.filter((x) => {
      const s = O.situacaoPeca(x);
      if (estado.situacao === "baixo" && !["baixo", "zerado"].includes(s)) return false;
      if (estado.situacao === "normal" && s !== "normal") return false;
      if (estado.situacao === "inativo" && s !== "inativo") return false;
      if (!estado.situacao && s === "inativo") return false;
      return !estado.busca || U.contem(x.nome, estado.busca) || U.contem(x.sku, estado.busca);
    }).sort((a, b) => ({ zerado: 0, baixo: 1, normal: 2, inativo: 3 }[O.situacaoPeca(a)] - { zerado: 0, baixo: 1, normal: 2, inativo: 3 }[O.situacaoPeca(b)]) || a.sku.localeCompare(b.sku));
    const { res, nav } = C().blocoPaginado(estado, lista, "saldos", atualizar);
    const titulo = el("p", { class: "contagem", texto: U.plural(res.total, "peça", "peças") });
    if (!res.total) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "package", titulo: "Nenhuma peça nesta situação" })); return; }
    const podeMov = O.pode("estoque_mov");
    U.trocar(p.conteudo, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Saldos do estoque" }),
      el("thead", {}, el("tr", {}, ...["Peça", "Saldo", "Reservado", "Disponível", "Mínimo", "Nível", "Situação", verCusto ? "Valor (custo)" : null, ""].filter((x) => x !== null).map((c) => el("th", { scope: "col", class: ["Saldo", "Reservado", "Disponível", "Mínimo", "Valor (custo)"].includes(c) ? "num" : "", texto: c })))),
      el("tbody", {}, ...res.itens.map((x) => {
        const s = O.saldo(x.id);
        const nivel = Math.min(1, x.minimo ? s / (x.minimo * 2) : s > 0 ? 1 : 0);
        return el("tr", { class: x.status !== "ativo" ? "is-inativo" : "" },
          C().td("", el("span", {}, el("a", { class: "link-texto", href: `#/estoque/${x.id}` }, el("b", { texto: x.nome })), el("small", { class: "sub", texto: `${x.sku} · ${x.local || "sem local"}` })), "principal-celula"),
          C().td("Saldo", el("b", { texto: U.numero(s) }), "num"),
          C().td("Reservado", O.reservado(x.id) ? U.numero(O.reservado(x.id)) : el("span", { class: "suave", texto: "0" }), "num"),
          C().td("Disponível", el("b", { class: O.disponivel(x.id) <= 0 ? "negativo" : "", texto: U.numero(O.disponivel(x.id)) }), "num"),
          C().td("Mínimo", U.numero(x.minimo), "num"),
          C().td("Nível", el("span", { class: `progresso progresso--${O.situacaoPeca(x)}`, role: "img", "aria-label": `Saldo ${s} para mínimo ${x.minimo}` }, el("span", { class: "progresso__barra", style: { width: `${Math.round(nivel * 100)}%` } }))),
          C().td("Situação", C().pilulaSituacaoPeca(x)),
          verCusto ? C().td("Valor (custo)", U.moeda(s * x.custo), "num") : null,
          C().td("", podeMov && x.status === "ativo" ? el("span", { class: "acoes-linha__botoes" },
            el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", title: "Entrada", "aria-label": `Entrada de ${x.nome}`, onclick: () => NX.form.movimento("entrada", x.id) }, icone("arrow-down-to-line", 15)),
            el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", title: "Saída avulsa", "aria-label": `Saída de ${x.nome}`, onclick: () => NX.form.movimento("saida", x.id) }, icone("arrow-up-from-line", 15)),
            O.pode("estoque_ajuste") ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", title: "Ajuste", "aria-label": `Ajuste de ${x.nome}`, onclick: () => NX.form.movimento("ajuste", x.id) }, icone("scale", 15)) : null) : null, "acoes-linha"));
      })))), nav);
  }

  function movimentosFiltrados() {
    return L.dados.movimentos.filter((m) => (!estado.tipo || m.tipo === estado.tipo) && (!estado.peca || m.pecaId === estado.peca)
      && (!estado.de || m.data.slice(0, 10) >= estado.de) && (!estado.ate || m.data.slice(0, 10) <= estado.ate)
      && (!estado.busca || (() => { const pc = L.peca(m.pecaId); return pc && (U.contem(pc.nome, estado.busca) || U.contem(pc.sku, estado.busca)); })())).sort((a, b) => b.numero - a.numero);
  }
  function desenharMovimentos() {
    U.trocar(p.filtros, p.busca.caixa,
      C().seletor([{ valor: "", rotulo: "Todos os tipos" }, ...NX.TIPOS_MOVIMENTO.map((t) => ({ valor: t.id, rotulo: t.nome }))], estado.tipo, (v) => { estado.tipo = v; estado.paginaMov = 1; atualizar(); }, { rotulo: "Tipo de movimentação", foco: "est-tipo" }),
      el("label", { class: "filtro-data" }, "De", el("input", { type: "date", value: estado.de, "data-foco": "est-de", onchange: (e) => { estado.de = e.target.value; estado.paginaMov = 1; atualizar(); } })),
      el("label", { class: "filtro-data" }, "até", el("input", { type: "date", value: estado.ate, "data-foco": "est-ate", onchange: (e) => { estado.ate = e.target.value; estado.paginaMov = 1; atualizar(); } })));
    const lista = movimentosFiltrados();
    const est = { pagina: estado.paginaMov };
    const { res, nav } = C().blocoPaginado(est, lista, "movimentos", () => { estado.paginaMov = est.pagina; atualizar(); });
    estado.paginaMov = res.pagina;
    const entradas = lista.filter((m) => m.quantidade > 0).reduce((t, m) => t + m.quantidade, 0);
    const saidas = lista.filter((m) => m.quantidade < 0).reduce((t, m) => t - m.quantidade, 0);
    const titulo = el("p", { class: "contagem", texto: `${U.plural(res.total, "movimentação", "movimentações")} · ${U.numero(entradas)} unidades entraram · ${U.numero(saidas)} saíram` });
    if (!res.total) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "arrow-left-right", titulo: "Nenhuma movimentação com estes filtros" })); return; }
    U.trocar(p.conteudo, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Movimentações de estoque" }),
      el("thead", {}, el("tr", {}, ...["Nº", "Data", "Peça", "Tipo", "Quantidade", "Saldo", "Origem / motivo", "Por"].map((c) => el("th", { scope: "col", class: ["Quantidade", "Saldo"].includes(c) ? "num" : "", texto: c })))),
      el("tbody", {}, ...res.itens.map((m) => linhaMov(m))))), nav);
  }

  function desenharReservas() {
    U.trocar(p.filtros);
    const linhas = [];
    L.dados.ordens.forEach((os) => os.itens.forEach((i) => { if (i.tipo === "peca" && ["reservada", "falta"].includes(i.estado)) linhas.push({ os, i }); }));
    linhas.sort((a, b) => (a.i.estado === "falta" ? -1 : 0) - (b.i.estado === "falta" ? -1 : 0) || a.os.abertaEm.localeCompare(b.os.abertaEm));
    const titulo = el("p", { class: "contagem", texto: `${U.plural(linhas.filter((x) => x.i.estado === "reservada").length, "item reservado", "itens reservados")} · ${U.plural(linhas.filter((x) => x.i.estado === "falta").length, "item em falta", "itens em falta")}` });
    if (!linhas.length) { U.trocar(p.conteudo, titulo, C().vazio({ icone: "package-check", titulo: "Nenhuma peça reservada ou em falta", texto: "As reservas aparecem quando um orçamento é aprovado." })); return; }
    U.trocar(p.conteudo, titulo, el("p", { class: "nota-info nota-info--dentro" }, icone("info", 16), el("span", { texto: "Reservada: separada para a ordem, ainda no estoque. Em falta: a ordem aguarda a entrada da peça; a reserva acontece sozinha quando ela entrar (as ordens mais antigas primeiro)." })),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
        el("caption", { class: "vh", texto: "Reservas e faltas" }),
        el("thead", {}, el("tr", {}, ...["Peça", "Quantidade", "Situação", "Ordem", "Status da ordem", "Disponível agora"].map((c) => el("th", { scope: "col", class: ["Quantidade", "Disponível agora"].includes(c) ? "num" : "", texto: c })))),
        el("tbody", {}, ...linhas.map(({ os, i }) => el("tr", {},
          C().td("", el("span", {}, el("a", { class: "link-texto", href: `#/estoque/${i.refId}` }, el("b", { texto: i.descricao }))), "principal-celula"),
          C().td("Quantidade", U.numero(i.quantidade), "num"),
          C().td("Situação", C().pilulaPeca(i.estado)),
          C().td("Ordem", el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero })),
          C().td("Status da ordem", C().pilulaOS(os.status, { curto: true })),
          C().td("Disponível agora", U.numero(O.disponivel(i.refId)), "num")))))));
  }

  function exportar() {
    const linhas = movimentosFiltrados().map((m) => { const pc = L.peca(m.pecaId) || {}; const os = m.osId ? L.ordem(m.osId) : null; return [m.numero, U.dataHora(m.data), pc.sku, pc.nome, nomeTipo(m.tipo), m.quantidade, m.saldoAnterior, m.saldoApos, m.motivo, os ? os.numero : "", m.fornecedorId ? (L.fornecedor(m.fornecedorId) || {}).nome : "", m.documento, m.custoUnitario ?? "", m.observacao, m.por]; });
    U.baixarCSV(U.nomeArquivo("movimentacoes-estoque"), ["Nº", "Data", "SKU", "Peça", "Tipo", "Quantidade", "Saldo antes", "Saldo depois", "Motivo", "OS", "Fornecedor", "Documento", "Custo unitário", "Observação", "Por"], linhas);
  }

  function aoEntrar(params) {
    if (params.situacao !== undefined) { estado.aba = "saldos"; estado.situacao = params.situacao; estado.pagina = 1; }
    if (params.aba) estado.aba = ["saldos", "movimentos", "reservas"].includes(params.aba) ? params.aba : "saldos";
    if (params.tipo !== undefined) estado.tipo = params.tipo;
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.estoque = { titulo: "Estoque", montar, atualizar, aoEntrar, reiniciar: () => Object.assign(estado, PADRAO()) };

  /* ---------- Peça (detalhe) ---------- */
  let pecaId = null;
  let secao = null;
  function desenharPeca() {
    const x = L.peca(pecaId);
    if (!x) { U.trocar(secao, C().cabecalho({ id: "peca", titulo: "Peça não encontrada", antes: C().voltar("estoque", "Estoque") }), C().vazio({ icone: "search-x", titulo: "Esta peça não existe" })); return; }
    const verCusto = O.podeVer("financeiro") || O.pode("catalogo");
    const movs = O.movimentosDaPeca(x.id);
    const reservas = [];
    L.dados.ordens.forEach((os) => os.itens.forEach((i) => { if (i.tipo === "peca" && i.refId === x.id && ["reservada", "falta"].includes(i.estado)) reservas.push({ os, i }); }));
    const ativo = x.status === "ativo";
    U.trocar(secao,
      C().cabecalho({
        id: "peca", titulo: x.nome, antes: C().voltar("estoque", "Estoque"), sub: `${x.sku} · ${x.categoria}${x.fabricante ? ` · ${x.fabricante}` : ""}${x.local ? ` · ${x.local}` : ""}`,
        etiquetas: [C().pilulaSituacaoPeca(x), C().pilulaExemplo(x)],
        acoes: [
          ativo && O.pode("estoque_mov") ? C().botao("Entrada", "btn--linha", () => NX.form.movimento("entrada", x.id), "arrow-down-to-line") : null,
          ativo && O.pode("estoque_mov") ? C().botao("Saída avulsa", "btn--linha", () => NX.form.movimento("saida", x.id), "arrow-up-from-line") : null,
          ativo && O.pode("estoque_ajuste") ? C().botao("Ajuste", "btn--linha", () => NX.form.movimento("ajuste", x.id), "scale") : null,
          C().botaoSe("catalogo", "Editar cadastro", "btn--linha", () => NX.form.peca(x.id), "pencil"),
        ],
      }),
      !ativo ? el("p", { class: "nota-alerta nota-alerta--bloco" }, icone("power-off", 16), "Peça desativada: não entra em novos orçamentos nem recebe movimentações até ser reativada.") : null,
      el("div", { class: "faixa-resumo" },
        el("div", {}, el("span", { texto: "Saldo" }), el("b", { texto: U.unidades(O.saldo(x.id)) })),
        el("div", {}, el("span", { texto: "Reservado para OS" }), el("b", { texto: U.unidades(O.reservado(x.id)) })),
        el("div", {}, el("span", { texto: "Disponível" }), el("b", { class: O.disponivel(x.id) <= 0 ? "negativo" : "", texto: U.unidades(O.disponivel(x.id)) })),
        el("div", {}, el("span", { texto: verCusto ? "Custo · preço" : "Preço de venda" }), el("b", { texto: verCusto ? `${U.moeda(x.custo)} · ${U.moeda(x.preco)}` : U.moeda(x.preco) }))),
      el("div", { class: "detalhe-grade detalhe-grade--lado" },
        el("div", { class: "detalhe-grade__principal" },
          el("section", { class: "cartao cartao--tabela" },
            el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Movimentações" }), el("p", { class: "cartao__sub", texto: `${U.plural(movs.length, "registro", "registros")} · mínimo ${x.minimo}` }))),
            movs.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
              el("caption", { class: "vh", texto: `Movimentações de ${x.nome}` }),
              el("thead", {}, el("tr", {}, ...["Nº", "Data", "Tipo", "Quantidade", "Saldo", "Origem / motivo", "Por"].map((c) => el("th", { scope: "col", class: ["Quantidade", "Saldo"].includes(c) ? "num" : "", texto: c })))),
              el("tbody", {}, ...movs.map((m) => linhaMov(m, { mostrarPeca: false }))))) : el("p", { class: "vazio-pequeno", style: { padding: "0 16px 12px" }, texto: "Nenhuma movimentação ainda." }))),
        el("div", { class: "detalhe-grade__lado" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Reservas e faltas" }),
            reservas.length ? el("ul", { class: "lista-simples" }, ...reservas.map(({ os, i }) => el("li", {},
              el("span", { class: "mono", texto: `${i.quantidade}×` }),
              el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/ordens/${os.id}`, texto: os.numero }), el("span", { class: "suave", texto: `${C().textoVeiculo(os.veiculoId)} · ${O.nomeStatus(os.status)}` })),
              C().pilulaPeca(i.estado)))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma ordem reservou esta peça." })),
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Cadastro" }),
            el("dl", { class: "ficha ficha--coluna" },
              el("div", { class: "ficha__linha" }, el("dt", { texto: "Fornecedor principal" }), el("dd", { texto: x.fornecedorId ? (L.fornecedor(x.fornecedorId) || {}).nome : "Não informado" })),
              verCusto ? el("div", { class: "ficha__linha" }, el("dt", { texto: "Margem" }), el("dd", { texto: `${U.percentual(x.preco ? (x.preco - x.custo) / x.preco : 0)} (${U.moeda(x.preco - x.custo)} por unidade)` })) : null),
            el("h3", { class: "subtitulo-form", texto: "Histórico do cadastro" }),
            el("ul", { class: "lista-itens" }, ...[...x.historico].reverse().map((h) => el("li", {}, el("span", { class: "lista-itens__texto" }, el("span", { texto: h.texto }), el("small", { texto: `${U.dataHora(h.em)} · ${h.por}` })))))))));
  }
  NX.telas.peca = {
    titulo: "Peça",
    tituloDinamico: () => (L.peca(pecaId) || { nome: "Peça" }).nome,
    abrir(id) { pecaId = id; }, montar(s) { secao = s; }, atualizar: C().comFoco(desenharPeca),
  };
})();
