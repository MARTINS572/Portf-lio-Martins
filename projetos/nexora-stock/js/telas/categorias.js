/* ==========================================================================
   NEXORA STOCK — Tela: Categorias
   Criar, editar, arquivar e reativar. Arquivar uma categoria com produtos
   pede uma decisão antes (mover os produtos ou mantê-los ligados).
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

  let status = "ativa";
  let p = null;

  function montar(secao) {
    p = { chips: el("div", { class: "chips", role: "group", "aria-label": "Situação da categoria" }), conteudo: el("div") };
    secao.replaceChildren(
      C().cabecalho({ id: "categorias", titulo: "Categorias", sub: "Organização dos produtos por tipo", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Nova categoria", "btn--primario", () => NX.form.categoria(), "plus"),
      ] }),
      p.chips, p.conteudo);
  }

  const linhas = () => {
    const resumo = new Map(E.porCategoria().map((x) => [x.categoria.id, x]));
    return L.dados.categorias.filter((c) => status === "todas" || c.status === status).map((c) => {
      const r = resumo.get(c.id) || { produtos: 0, unidades: 0, valor: 0, baixo: 0 };
      return { c, ...r, total: L.produtosDaCategoria(c.id).length };
    }).sort((a, b) => a.c.nome.localeCompare(b.c.nome, "pt-BR"));
  };

  function exportar() {
    const lista = linhas();
    U.baixarCSV(U.nomeArquivo("categorias"), ["Identificador", "Categoria", "Descrição", "Status", "Produtos ativos", "Produtos ligados (todos)", "Unidades", "Valor pelo custo (R$)", "Em reposição"],
      lista.map((x) => [x.c.codigo, x.c.nome, x.c.descricao, x.c.status === "ativa" ? "Ativa" : "Arquivada", x.produtos, x.total, x.unidades, x.valor, x.baixo]));
  }

  function atualizar() {
    const todas = L.dados.categorias;
    p.chips.replaceChildren(...[["ativa", "Ativas"], ["arquivada", "Arquivadas"], ["todas", "Todas"]].map(([id, rotulo]) => el("button", { class: "chip", type: "button", "aria-pressed": String(status === id), "data-foco": `cat-chip-${id}`, onclick: () => { status = id; atualizar(); } },
      rotulo, el("span", { class: "chip__n", texto: U.numero(id === "todas" ? todas.length : todas.filter((c) => c.status === id).length) }))));
    const lista = linhas();
    if (!lista.length) {
      p.conteudo.replaceChildren(el("div", { class: "cartao" }, C().vazio({ icone: "tags", titulo: status === "arquivada" ? "Nenhuma categoria arquivada" : "Nenhuma categoria", acao: status === "arquivada" ? null : C().botao("Nova categoria", "btn--primario", () => NX.form.categoria(), "plus") })));
      return;
    }
    p.conteudo.replaceChildren(el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: U.plural(lista.length, "categoria", "categorias") }),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
        el("thead", {}, el("tr", {}, ...["Categoria", "Identificador", "Produtos ativos", "Unidades", "Valor em estoque", "Em reposição", "Status", ""].map((t, i) => el("th", { scope: "col", class: [2, 3, 4, 5].includes(i) ? "num" : "" }, t || el("span", { class: "vh", texto: "Ações" }))))),
        el("tbody", {}, ...lista.map((x) => el("tr", {},
          C().td("Categoria", el("span", { class: "linha-mov" }, el("b", { texto: x.c.nome }), x.c.descricao ? el("span", { class: "sub celula-texto", texto: x.c.descricao }) : null), "principal-celula"),
          C().td("Identificador", el("span", { class: "mono", texto: x.c.codigo })),
          C().td("Produtos ativos", el("a", { class: "link-texto", href: `#/produtos?categoria=${x.c.id}`, texto: U.numero(x.produtos), title: `Ver os produtos de ${x.c.nome}` }), "num"),
          C().td("Unidades", U.numero(x.unidades), "num"),
          C().td("Valor em estoque", U.moeda(x.valor), "num"),
          C().td("Em reposição", x.baixo ? el("span", { class: "pilula pilula--baixo" }, icone("triangle-alert", 13), U.numero(x.baixo)) : el("span", { class: "suave", texto: "0" }), "num"),
          C().td("Status", C().pilulaSimples(x.c.status === "ativa" ? "Ativa" : "Arquivada", x.c.status)),
          el("td", { class: "acoes-linha", "data-rotulo": "" },
            el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar ${x.c.nome}`, title: "Editar", onclick: () => NX.form.categoria({ id: x.c.id }) }, icone("pencil", 16)),
            x.c.status === "ativa"
              ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Arquivar ${x.c.nome}`, title: "Arquivar", onclick: () => NX.acoes.arquivarCategoria(x.c.id) }, icone("archive", 16))
              : el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Reativar ${x.c.nome}`, title: "Reativar", onclick: () => { const r = L.reativarCategoria(x.c.id); U.aviso(r.ok ? "Categoria reativada." : r.erro, r.ok ? "ok" : "erro"); } }, icone("archive-restore", 16))))))))));
  }

  NX.telas.categorias = { titulo: "Categorias", montar, atualizar };
})();
