/* ==========================================================================
   NEXORA STOCK — Tela: Produtos
   Pesquisa (nome, SKU, código de barras), filtros (categoria, fornecedor,
   situação), ordenação, paginação, seleção em lote e exportação CSV.
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

  const filtro = { busca: "", categoriaId: "", fornecedorId: "", situacao: "ativos", ordem: "nome", direcao: "asc", pagina: 1 };
  const selecionados = new Set();
  let p = null;

  const SITUACOES = [
    { id: "ativos", rotulo: "Ativos", teste: (x) => x.status === "ativo" },
    { id: "normal", rotulo: "Estoque normal", teste: (x) => E.situacao(x) === "normal" },
    { id: "baixo", rotulo: "Estoque baixo", teste: (x) => E.situacao(x) === "baixo" },
    { id: "zerado", rotulo: "Sem estoque", teste: (x) => E.situacao(x) === "zerado" },
    { id: "reposicao", rotulo: "Reposição", teste: (x) => ["baixo", "zerado"].includes(E.situacao(x)) },
    { id: "arquivado", rotulo: "Arquivados", teste: (x) => x.status === "arquivado" },
    { id: "todos", rotulo: "Todos", teste: () => true },
  ];
  const ORDENS = [
    ["nome:asc", "Nome (A–Z)"], ["nome:desc", "Nome (Z–A)"], ["preco:desc", "Maior preço de venda"], ["preco:asc", "Menor preço de venda"],
    ["quantidade:desc", "Maior quantidade"], ["quantidade:asc", "Menor quantidade"], ["valor:desc", "Maior valor total"], ["valor:asc", "Menor valor total"],
  ];

  function filtrados({ semSituacao } = {}) {
    const q = filtro.busca.trim();
    const digitos = q.replace(/\D/g, "");
    const sit = SITUACOES.find((s) => s.id === filtro.situacao) || SITUACOES[0];
    const lista = L.dados.produtos.filter((x) =>
      (!q || U.contem(x.nome, q) || U.contem(x.sku, q) || (digitos.length >= 3 && x.codigoBarras.includes(digitos))) &&
      (!filtro.categoriaId || x.categoriaId === filtro.categoriaId) &&
      (!filtro.fornecedorId || x.fornecedorId === filtro.fornecedorId) &&
      (semSituacao || sit.teste(x)));
    const fator = filtro.direcao === "asc" ? 1 : -1;
    const valor = {
      nome: (x) => x.nome, preco: (x) => x.preco, quantidade: (x) => E.saldo(x.id), valor: (x) => E.valorDoProduto(x),
    }[filtro.ordem];
    return lista.sort((a, b) => {
      const va = valor(a), vb = valor(b);
      const c = typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb;
      return c * fator || a.nome.localeCompare(b.nome, "pt-BR");
    });
  }

  function aoEntrar(params) {
    if (params.situacao && SITUACOES.some((s) => s.id === params.situacao)) { filtro.situacao = params.situacao; filtro.pagina = 1; }
    if (params.categoria) { filtro.categoriaId = params.categoria; filtro.situacao = "ativos"; filtro.pagina = 1; }
    if (params.fornecedor) { filtro.fornecedorId = params.fornecedor; filtro.pagina = 1; }
  }

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Nome, SKU ou código de barras", "aria-label": "Pesquisar produtos por nome, SKU ou código de barras", value: filtro.busca, "data-foco": "produtos-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value; filtro.pagina = 1; atualizar(); });
    const cat = el("select", { class: "seletor", "aria-label": "Filtrar por categoria", "data-foco": "produtos-cat" });
    cat.addEventListener("change", () => { filtro.categoriaId = cat.value; filtro.pagina = 1; atualizar(); });
    const forn = el("select", { class: "seletor", "aria-label": "Filtrar por fornecedor", "data-foco": "produtos-forn" });
    forn.addEventListener("change", () => { filtro.fornecedorId = forn.value; filtro.pagina = 1; atualizar(); });
    const ordem = el("select", { class: "seletor", "aria-label": "Ordenar produtos", "data-foco": "produtos-ordem" }, ...ORDENS.map(([v, t]) => el("option", { value: v, texto: t })));
    ordem.addEventListener("change", () => { [filtro.ordem, filtro.direcao] = ordem.value.split(":"); atualizar(); });
    const limpar = el("button", { class: "link-btn", type: "button", texto: "Limpar filtros", "data-foco": "produtos-limpar", onclick: () => {
      Object.assign(filtro, { busca: "", categoriaId: "", fornecedorId: "", situacao: "ativos", pagina: 1 });
      busca.value = "";
      atualizar();
      busca.focus();
    } });
    p = { busca, cat, forn, ordem, limpar, chips: el("div", { class: "chips", role: "group", "aria-label": "Situação do estoque" }), lote: el("div"), conteudo: el("div") };
    secao.replaceChildren(
      C().cabecalho({ id: "produtos", titulo: "Produtos", sub: "Cadastro, saldo e situação de cada item", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Adicionar produto", "btn--primario", () => NX.form.produto(), "plus"),
      ] }),
      p.chips,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca), cat, forn, ordem, limpar),
      p.lote,
      p.conteudo,
    );
  }

  function exportar(lista) {
    const itens = Array.isArray(lista) ? lista : filtrados();
    if (!itens.length) { U.aviso("Nada para exportar com estes filtros.", "info"); return; }
    U.baixarCSV(U.nomeArquivo("produtos"), ["SKU", "Código de barras", "Produto", "Categoria", "Fornecedor principal", "Custo (R$)", "Preço de venda (R$)", "Quantidade", "Estoque mínimo", "Valor total pelo custo (R$)", "Situação", "Localização", "Cadastro"],
      itens.map((x) => [x.sku, x.codigoBarras, x.nome, L.nomeCategoria(x.categoriaId), L.nomeFornecedor(x.fornecedorId), x.custo, x.preco, E.saldo(x.id), x.minimo, E.valorDoProduto(x), E.nomeSituacao(E.situacao(x)), x.localizacao, U.dataCompleta(x.criadoEm)]));
  }

  function linha(x) {
    const marcado = selecionados.has(x.id);
    const caixa = el("input", { type: "checkbox", "aria-label": `Selecionar ${x.nome}`, checked: marcado, "data-foco": `sel-${x.id}` });
    caixa.addEventListener("change", () => { if (caixa.checked) selecionados.add(x.id); else selecionados.delete(x.id); atualizar(); });
    const ativo = x.status === "ativo";
    return el("tr", { class: `com-marcar${marcado ? " is-selecionado" : ""}` },
      el("td", { class: "col-marcar", "data-rotulo": "" }, caixa),
      C().td("Produto", el("a", { class: "nome-btn", href: `#/produtos/${x.id}` }, C().miniatura(x),
        el("span", {}, el("b", { texto: x.nome }), el("span", { class: "suave" }, el("span", { class: "mono", texto: x.sku }), ` · ${L.nomeCategoria(x.categoriaId)}`))), "principal-celula"),
      C().td("Custo", U.moeda(x.custo), "num"),
      C().td("Venda", U.moeda(x.preco), "num"),
      C().td("Quantidade", C().saldoCelula(x), "num"),
      C().td("Valor total", U.moeda(E.valorDoProduto(x)), "num"),
      C().td("Situação", C().pilulaSituacao(x, { curto: true })),
      el("td", { class: "acoes-linha", "data-rotulo": "" },
        ativo ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Registrar entrada de ${x.nome}`, title: "Registrar entrada", onclick: () => NX.form.entrada({ produtoId: x.id }) }, icone("arrow-down-to-line", 16)) : null,
        ativo ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Registrar saída de ${x.nome}`, title: "Registrar saída", onclick: () => NX.form.saida({ produtoId: x.id }) }, icone("arrow-up-from-line", 16)) : null,
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar ${x.nome}`, title: "Editar", onclick: () => NX.form.produto({ id: x.id }) }, icone("pencil", 16))));
  }

  function atualizar() {
    const d = L.dados;
    // Opções dos filtros (as listas podem ter mudado)
    p.cat.replaceChildren(el("option", { value: "", texto: "Todas as categorias" }), ...d.categorias.map((c) => el("option", { value: c.id, texto: c.status === "ativa" ? c.nome : `${c.nome} (arquivada)` })));
    p.cat.value = filtro.categoriaId;
    p.forn.replaceChildren(el("option", { value: "", texto: "Todos os fornecedores" }), ...[...d.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((f) => el("option", { value: f.id, texto: f.status === "ativo" ? f.nome : `${f.nome} (inativo)` })));
    p.forn.value = filtro.fornecedorId;
    p.ordem.value = `${filtro.ordem}:${filtro.direcao}`;
    if (p.busca.value !== filtro.busca) p.busca.value = filtro.busca;

    const base = filtrados({ semSituacao: true });
    p.chips.replaceChildren(...SITUACOES.map((s) => el("button", { class: "chip", type: "button", "aria-pressed": String(filtro.situacao === s.id), "data-foco": `chip-${s.id}`, onclick: () => { filtro.situacao = s.id; filtro.pagina = 1; atualizar(); } },
      s.rotulo, el("span", { class: "chip__n", texto: U.numero(base.filter(s.teste).length) }))));

    // Seleção em lote
    [...selecionados].forEach((id) => { if (!L.produto(id)) selecionados.delete(id); });
    if (selecionados.size) {
      const lista = [...selecionados].map(L.produto);
      const ativos = lista.filter((x) => x.status === "ativo");
      const arquivados = lista.filter((x) => x.status === "arquivado");
      p.lote.replaceChildren(el("div", { class: "lote", role: "region", "aria-label": "Ações em lote" },
        el("span", {}, el("b", { texto: U.plural(selecionados.size, "produto selecionado", "produtos selecionados") })),
        el("div", { class: "lote__acoes" },
          C().botao("Exportar CSV", "btn--linha btn--pequeno", () => exportar(lista), "download"),
          ativos.length ? C().botao("Criar pedido", "btn--linha btn--pequeno", () => NX.pedidos.reposicao(ativos), "clipboard-list") : null,
          ativos.length ? C().botao(`Arquivar (${ativos.length})`, "btn--linha btn--pequeno", async () => {
            const ok = await U.confirmar({ titulo: `Arquivar ${U.plural(ativos.length, "produto", "produtos")}?`, texto: "Os produtos saem das listas de reposição e dos alertas e não aceitam novas movimentações. O histórico e o saldo continuam guardados. Você pode reativar depois.", rotulo: "Arquivar" });
            if (!ok) return;
            const r = L.arquivarProdutos(ativos.map((x) => x.id));
            selecionados.clear();
            U.aviso(`${U.plural(r.feitos, "produto arquivado", "produtos arquivados")}.`);
          }, "archive") : null,
          arquivados.length ? C().botao(`Reativar (${arquivados.length})`, "btn--linha btn--pequeno", () => {
            const r = L.reativarProdutos(arquivados.map((x) => x.id));
            selecionados.clear();
            if (r.feitos) U.aviso(`${U.plural(r.feitos, "produto reativado", "produtos reativados")}.`);
            if (r.erro) U.aviso(r.erro, "erro");
          }, "archive-restore") : null,
          C().botao("Limpar seleção", "btn--fantasma btn--pequeno", () => { selecionados.clear(); atualizar(); }, "x"))));
    } else p.lote.replaceChildren();

    const lista = filtrados();
    const pref = NX.preferencias.porPagina;
    const pag = C().paginar(lista, filtro.pagina, pref);
    filtro.pagina = pag.pagina;
    if (!lista.length) {
      const temFiltro = filtro.busca || filtro.categoriaId || filtro.fornecedorId || filtro.situacao !== "ativos";
      p.conteudo.replaceChildren(el("div", { class: "cartao" }, C().vazio({
        icone: "search", titulo: temFiltro ? "Nenhum produto encontrado" : "Nenhum produto cadastrado",
        texto: temFiltro ? "Tente outro termo ou limpe os filtros." : "Cadastre o primeiro produto para começar.",
        acao: temFiltro ? C().botao("Limpar filtros", "btn--linha", () => p.limpar.click(), "x") : C().botao("Adicionar produto", "btn--primario", () => NX.form.produto(), "plus"),
      })));
      return;
    }
    const todosPagina = pag.itens.every((x) => selecionados.has(x.id));
    const algunsPagina = pag.itens.some((x) => selecionados.has(x.id));
    const marcarTodos = el("input", { type: "checkbox", "aria-label": "Selecionar todos desta página", checked: todosPagina, "data-foco": "sel-todos" });
    marcarTodos.indeterminate = algunsPagina && !todosPagina;
    marcarTodos.addEventListener("change", () => { pag.itens.forEach((x) => (marcarTodos.checked ? selecionados.add(x.id) : selecionados.delete(x.id))); atualizar(); });
    const th = (rotulo, campo, classe) => C().thOrdenavel(rotulo, campo, filtro, atualizar, classe);
    p.conteudo.replaceChildren(el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", "aria-live": "polite", texto: `${U.plural(lista.length, "produto", "produtos")}${selecionados.size ? ` · ${U.numero(selecionados.size)} selecionados` : ""}` }),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes tabela--larga tabela--produtos" },
        el("thead", {}, el("tr", {},
          el("th", { scope: "col", class: "col-marcar" }, marcarTodos),
          th("Produto e categoria", "nome"), el("th", { scope: "col", class: "num", texto: "Custo" }),
          th("Venda", "preco", "num"), th("Quantidade", "quantidade", "num"), th("Valor total", "valor", "num"),
          el("th", { scope: "col", texto: "Situação" }), el("th", { scope: "col" }, el("span", { class: "vh", texto: "Ações" })))),
        el("tbody", {}, ...pag.itens.map(linha)))),
      C().paginacao(pag, { porPagina: pref, nome: "produtos", aoMudar: (n) => { filtro.pagina = n; atualizar(); }, aoMudarTamanho: (n) => { filtro.pagina = 1; NX.salvarPreferencias({ porPagina: n }); } })));
  }

  NX.telas.produtos = { titulo: "Produtos", montar, atualizar, aoEntrar };
})();
