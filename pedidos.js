/* ==========================================================================
   NEXORA STOCK — Telas: Pedidos de compra e página do pedido
   Estados: rascunho → pendente de envio → enviado → parcialmente recebido →
   recebido (ou cancelado). Só o recebimento confirmado mexe no estoque.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
  const { el, icone } = U;
  const C = () => NX.componentes;

  /* ---------- Lista ---------- */
  const filtro = { status: "todos", busca: "", fornecedorId: "", periodo: { id: "tudo" }, pagina: 1 };
  let p = null;
  const GRUPOS = [
    { id: "todos", rotulo: "Todos", teste: () => true },
    { id: "abertos", rotulo: "Em aberto", teste: E.pedidoAberto },
    { id: "atrasados", rotulo: "Atrasados", teste: E.pedidoAtrasado },
    ...NX.STATUS_PEDIDO.map((s) => ({ id: s.id, rotulo: s.nome, teste: (pc) => pc.status === s.id })),
  ];

  function filtrados({ semStatus } = {}) {
    const { de, ate } = C().intervaloDe(filtro.periodo);
    const q = filtro.busca.trim();
    const grupo = GRUPOS.find((g) => g.id === filtro.status) || GRUPOS[0];
    return L.dados.pedidos.filter((pc) => {
      const dia = pc.criadoEm.slice(0, 10);
      if (dia < de || dia > ate) return false;
      if (filtro.fornecedorId && pc.fornecedorId !== filtro.fornecedorId) return false;
      if (q && !(U.contem(pc.numero, q) || U.contem(L.nomeFornecedor(pc.fornecedorId), q) || pc.itens.some((it) => U.contem(L.produto(it.produtoId)?.nome, q)))) return false;
      return semStatus || grupo.teste(pc);
    }).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  function aoEntrar(params) {
    if (params.status && GRUPOS.some((g) => g.id === params.status)) { filtro.status = params.status; filtro.pagina = 1; }
    if (params.fornecedor) { filtro.fornecedorId = params.fornecedor; filtro.pagina = 1; }
  }

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Número, fornecedor ou produto", "aria-label": "Pesquisar pedidos", value: filtro.busca, "data-foco": "pc-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value; filtro.pagina = 1; atualizar(); });
    const forn = el("select", { class: "seletor", "aria-label": "Filtrar por fornecedor", "data-foco": "pc-forn" });
    forn.addEventListener("change", () => { filtro.fornecedorId = forn.value; filtro.pagina = 1; atualizar(); });
    p = { busca, forn, chips: el("div", { class: "chips", role: "group", "aria-label": "Status do pedido" }), periodo: el("div"), conteudo: el("div") };
    secao.replaceChildren(
      C().cabecalho({ id: "pedidos", titulo: "Pedidos de compra", sub: "Reposição de mercadorias. O estoque só muda quando o recebimento é confirmado.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Novo pedido", "btn--primario", () => NX.pedidos.form(), "plus"),
      ] }),
      p.chips, p.periodo,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca), forn),
      p.conteudo);
  }

  function exportar() {
    const lista = filtrados();
    if (!lista.length) { U.aviso("Nenhum pedido com estes filtros.", "info"); return; }
    const linhas = [];
    lista.forEach((pc) => pc.itens.forEach((it) => {
      const prod = L.produto(it.produtoId) || {};
      linhas.push([pc.numero, L.nomeFornecedor(pc.fornecedorId), E.statusPedido(pc.status).nome, E.pedidoAtrasado(pc) ? "Sim" : "Não", U.dataHora(pc.criadoEm), pc.enviadoEm ? U.dataHora(pc.enviadoEm) : "", U.dataCompleta(pc.previsao),
        prod.sku, prod.nome, it.quantidade, it.recebido, pc.status === "cancelado" ? 0 : it.quantidade - it.recebido, it.custo, U.arredondar(it.quantidade * it.custo)]);
    }));
    U.baixarCSV(U.nomeArquivo("pedidos-de-compra"), ["Pedido", "Fornecedor", "Status", "Atrasado", "Criado em", "Enviado em", "Previsão", "SKU", "Produto", "Quantidade", "Recebido", "Pendente", "Custo unitário (R$)", "Subtotal (R$)"], linhas);
  }

  function atualizar() {
    p.forn.replaceChildren(el("option", { value: "", texto: "Todos os fornecedores" }), ...[...L.dados.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((f) => el("option", { value: f.id, texto: f.nome })));
    p.forn.value = filtro.fornecedorId;
    if (p.busca.value !== filtro.busca) p.busca.value = filtro.busca;
    p.periodo.replaceChildren(C().seletorPeriodo(filtro.periodo, () => { filtro.pagina = 1; atualizar(); }, { ids: ["30d", "90d", "mes", "mes-anterior", "tudo", "personalizado"], nome: "pc-periodo" }));
    const base = filtrados({ semStatus: true });
    p.chips.replaceChildren(...GRUPOS.map((g) => el("button", { class: "chip", type: "button", "aria-pressed": String(filtro.status === g.id), "data-foco": `pc-chip-${g.id}`, onclick: () => { filtro.status = g.id; filtro.pagina = 1; atualizar(); } },
      g.rotulo, el("span", { class: "chip__n", texto: U.numero(base.filter(g.teste).length) }))));
    const lista = filtrados();
    const pref = NX.preferencias.porPagina;
    const pag = C().paginar(lista, filtro.pagina, pref);
    filtro.pagina = pag.pagina;
    if (!lista.length) {
      p.conteudo.replaceChildren(el("div", { class: "cartao" }, C().vazio({ icone: "clipboard-list", titulo: "Nenhum pedido encontrado", texto: "Mude o status, o período ou o fornecedor.", acao: C().botao("Novo pedido", "btn--primario", () => NX.pedidos.form(), "plus") })));
      return;
    }
    p.conteudo.replaceChildren(el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: `${U.plural(lista.length, "pedido", "pedidos")} · ${C().descreverPeriodo(C().intervaloDe(filtro.periodo))}` }),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes tabela--larga" },
        el("thead", {}, el("tr", {}, ...["Pedido", "Fornecedor", "Criado em", "Previsão", "Total", "Recebimento", "Status", ""].map((t, i) => el("th", { scope: "col", class: i === 4 ? "num" : "" }, t || el("span", { class: "vh", texto: "Ações" }))))),
        el("tbody", {}, ...pag.itens.map((pc) => {
          const t = E.totaisPedido(pc);
          const fracao = t.pedidoUn ? t.recebidoUn / t.pedidoUn : 0;
          return el("tr", {},
            C().td("Pedido", el("a", { class: "nome-btn", href: `#/pedidos/${pc.id}` }, el("span", {}, el("b", { class: "mono", texto: pc.numero }), el("span", { class: "suave", texto: U.plural(pc.itens.length, "item", "itens") }))), "principal-celula"),
            C().td("Fornecedor", el("a", { class: "link-texto", href: `#/fornecedores/${pc.fornecedorId}`, texto: L.nomeFornecedor(pc.fornecedorId) }), "inteira"),
            C().td("Criado em", U.dataCompleta(pc.criadoEm)),
            C().td("Previsão", el("span", { class: E.pedidoAtrasado(pc) ? "negativo" : "", texto: U.dataCompleta(pc.previsao) })),
            C().td("Total", U.moeda(t.total), "num"),
            C().td("Recebimento", el("span", { class: "linha-mov", style: { minWidth: "110px" } }, el("span", { class: `progresso${fracao >= 1 ? " progresso--ok" : ""}`, "aria-hidden": "true" }, el("i", { class: "progresso__barra", style: { width: `${Math.round(fracao * 100)}%` } })), el("span", { class: "sub", texto: `${U.numero(t.recebidoUn)} de ${U.numero(t.pedidoUn)} un.` }))),
            C().td("Status", C().pilulaPedido(pc)),
            el("td", { class: "acoes-linha", "data-rotulo": "" },
              ["enviado", "parcial"].includes(pc.status) ? C().botao("Receber", "btn--linha btn--pequeno", () => NX.pedidos.receber(pc.id), "package-check", { "aria-label": `Registrar recebimento do ${pc.numero}` }) : null));
        })))),
      C().paginacao(pag, { porPagina: pref, nome: "pedidos", aoMudar: (n) => { filtro.pagina = n; atualizar(); }, aoMudarTamanho: (n) => { filtro.pagina = 1; NX.salvarPreferencias({ porPagina: n }); } })));
  }

  NX.telas.pedidos = { titulo: "Pedidos de compra", montar, atualizar, aoEntrar };

  /* ---------- Página do pedido ---------- */
  let idAtual = null;
  let partes = null;
  let secaoPc = null;

  function montarPedido(secao) {
    secaoPc = secao;
    if (!L.pedido(idAtual)) {
      partes = null;
      secao.replaceChildren(C().voltar("pedidos", "Pedidos de compra"), el("div", { class: "cartao" }, C().vazio({ icone: "clipboard-list", titulo: "Pedido não encontrado", texto: "Ele pode ter sido um rascunho excluído ou os dados foram restaurados.", acao: el("a", { class: "btn btn--linha", href: "#/pedidos" }, "Ver pedidos") })));
      return;
    }
    partes = { cabeca: el("div"), corpo: el("div") };
    secao.replaceChildren(partes.cabeca, partes.corpo);
  }

  function atualizarPedido() {
    if (!partes) return;
    const pc = L.pedido(idAtual);
    if (!pc) { montarPedido(secaoPc); return; }
    const t = E.totaisPedido(pc);
    const forn = L.fornecedor(pc.fornecedorId);
    const atrasado = E.pedidoAtrasado(pc);
    const acoes = {
      rascunho: [C().botao("Excluir rascunho", "btn--fantasma", () => NX.pedidos.excluirRascunho(pc.id), "trash"), C().botao("Editar", "btn--linha", () => NX.pedidos.form({ id: pc.id }), "pencil"), C().botao("Concluir rascunho", "btn--primario", () => NX.pedidos.mudarStatus(pc.id, "concluir"), "check")],
      pendente: [C().botao("Cancelar pedido", "btn--fantasma", () => NX.pedidos.cancelar(pc.id), "ban"), C().botao("Editar", "btn--linha", () => NX.pedidos.form({ id: pc.id }), "pencil"), C().botao("Marcar como enviado", "btn--primario", () => NX.pedidos.mudarStatus(pc.id, "enviar"), "send")],
      enviado: [C().botao("Cancelar pedido", "btn--fantasma", () => NX.pedidos.cancelar(pc.id), "ban"), C().botao("Registrar recebimento", "btn--primario", () => NX.pedidos.receber(pc.id), "package-check")],
      parcial: [C().botao("Cancelar saldo pendente", "btn--fantasma", () => NX.pedidos.cancelar(pc.id), "ban"), C().botao("Registrar recebimento", "btn--primario", () => NX.pedidos.receber(pc.id), "package-check")],
      recebido: forn && forn.status === "ativo" ? [C().botao("Repetir pedido", "btn--linha", () => NX.pedidos.form({ fornecedorId: pc.fornecedorId, itensIniciais: pc.itens.filter((it) => L.produto(it.produtoId)?.status === "ativo").map((it) => ({ produtoId: it.produtoId, quantidade: it.quantidade })) }), "copy")] : [],
      cancelado: forn && forn.status === "ativo" ? [C().botao("Refazer pedido", "btn--linha", () => NX.pedidos.form({ fornecedorId: pc.fornecedorId, itensIniciais: pc.itens.filter((it) => L.produto(it.produtoId)?.status === "ativo").map((it) => ({ produtoId: it.produtoId, quantidade: it.quantidade - it.recebido })).filter((it) => it.quantidade > 0) }), "copy")] : [],
    }[pc.status];
    partes.cabeca.replaceChildren(C().cabecalho({
      id: "pedido", titulo: `Pedido ${pc.numero}`, antes: C().voltar("pedidos", "Pedidos de compra"),
      etiquetas: [C().pilulaPedido(pc), el("a", { class: "link-texto", href: `#/fornecedores/${pc.fornecedorId}`, texto: L.nomeFornecedor(pc.fornecedorId) })],
      acoes,
    }));

    const etapa = {
      rascunho: "Rascunho: ainda não foi enviado. Conclua quando estiver pronto.",
      pendente: "Pronto para enviar. Depois de mandar ao fornecedor, marque como enviado.",
      enviado: atrasado ? `A previsão (${U.dataCompleta(pc.previsao)}) já passou. Cobre o fornecedor ou registre o recebimento quando chegar.` : "Aguardando a mercadoria. Registre o recebimento quando chegar; dá para receber só uma parte.",
      parcial: "Parte da mercadoria já entrou no estoque. O restante continua pendente.",
      recebido: "Pedido concluído: tudo foi recebido e lançado no estoque.",
      cancelado: t.recebidoUn ? "Cancelado depois de receber uma parte. O que chegou continua no estoque." : "Pedido cancelado. Nada foi lançado no estoque.",
    }[pc.status];

    const linhaTempo = [
      { icone: "file-text", titulo: "Pedido criado", sub: `${U.dataHora(pc.criadoEm)} · ${L.membro(pc.responsavelId).nome}`, data: pc.criadoEm },
      pc.enviadoEm ? { icone: "send", titulo: "Enviado ao fornecedor", sub: U.dataHora(pc.enviadoEm), data: pc.enviadoEm } : null,
      ...pc.recebimentos.map((r) => ({
        icone: "package-check", titulo: `Recebimento de ${U.unidades(r.itens.reduce((s, x) => s + x.quantidade, 0))}`,
        sub: `${U.dataHora(r.data)} · ${r.documento} · conferido por ${L.membro(r.responsavelId).nome}`, data: r.data,
        extra: el("span", { class: "suave", texto: r.itens.map((x) => `${U.numero(x.quantidade)} × ${L.produto(x.produtoId)?.nome}`).join(" · ") }),
        acao: el("a", { class: "link-btn", href: `#/movimentacoes?busca=${encodeURIComponent(r.documento)}`, texto: "Ver no histórico" }),
      })),
      pc.canceladoEm ? { icone: "ban", titulo: "Cancelado", sub: `${U.dataHora(pc.canceladoEm)} · ${pc.motivoCancelamento}`, data: pc.canceladoEm } : null,
    ].filter(Boolean).sort((a, b) => a.data.localeCompare(b.data));

    partes.corpo.replaceChildren(
      el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone(atrasado ? "clock" : "info", 16), el("span", { texto: etapa })),
      el("div", { class: "resumo-pedido" },
        el("div", {}, el("span", { texto: "Total do pedido" }), el("b", { texto: U.moeda(t.total) })),
        el("div", {}, el("span", { texto: "Recebido" }), el("b", { texto: `${U.numero(t.recebidoUn)} de ${U.numero(t.pedidoUn)} un.` })),
        el("div", {}, el("span", { texto: pc.status === "cancelado" ? "Pendente" : "A receber" }), el("b", { texto: pc.status === "cancelado" ? "—" : `${U.numero(t.pendenteUn)} un. · ${U.moeda(t.pendenteValor)}` })),
        el("div", {}, el("span", { texto: "Previsão de entrega" }), el("b", { class: atrasado ? "negativo" : "", texto: `${U.dataCompleta(pc.previsao)}${atrasado ? " (atrasado)" : ""}` }))),
      el("div", { class: "produto-grade produto-grade--pedido" },
        el("div", { class: "produto-grade__principal" },
          el("article", { class: "cartao cartao--tabela" },
            el("div", { class: "cartao__cabeca" }, el("h2", { class: "cartao__titulo", texto: "Itens do pedido" })),
            el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
              el("thead", {}, el("tr", {}, ...["Produto", "Pedido", "Recebido", "Pendente", "Custo unit.", "Subtotal"].map((x, i) => el("th", { scope: "col", class: i ? "num" : "", texto: x })))),
              el("tbody", {}, ...pc.itens.map((it) => {
                const prod = L.produto(it.produtoId);
                const pend = pc.status === "cancelado" ? 0 : it.quantidade - it.recebido;
                return el("tr", {},
                  C().td("Produto", prod ? C().nomeProduto(prod) : "Produto removido", "principal-celula"),
                  C().td("Pedido", U.numero(it.quantidade), "num"),
                  C().td("Recebido", el("span", { class: it.recebido >= it.quantidade ? "positivo" : "", texto: U.numero(it.recebido) }), "num"),
                  C().td("Pendente", pend ? el("b", { texto: U.numero(pend) }) : el("span", { class: "suave", texto: "0" }), "num"),
                  C().td("Custo unit.", U.moeda(it.custo), "num"),
                  C().td("Subtotal", U.moeda(it.quantidade * it.custo), "num"));
              })),
              el("tfoot", {}, el("tr", {}, el("td", { colspan: "5", texto: "Total" }), el("td", { class: "num", texto: U.moeda(t.total) })))))),
          pc.observacoes ? el("article", { class: "cartao" }, el("h2", { class: "cartao__titulo", texto: "Observações" }), el("p", { style: { marginTop: "8px", color: "var(--texto-2)" }, texto: pc.observacoes })) : null),
        el("article", { class: "cartao" },
          el("h2", { class: "cartao__titulo", style: { marginBottom: "14px" }, texto: "Linha do tempo" }),
          el("ol", { class: "linha-tempo" }, ...linhaTempo.map((x) => el("li", {},
            el("span", { class: "linha-tempo__icone" }, icone(x.icone, 15)),
            el("div", {}, el("b", { texto: x.titulo }), el("span", { class: "suave", texto: x.sub }), x.extra || null, x.acao || null)))))),
    );
  }

  NX.telas.pedido = { titulo: "Pedido de compra", montar: montarPedido, atualizar: atualizarPedido, abrir: (id) => { idAtual = id; }, tituloDinamico: () => (L.pedido(idAtual) || {}).numero };
})();
