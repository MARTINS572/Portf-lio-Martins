/* ==========================================================================
   NEXORA AUTO — Telas: Serviços e mão de obra, Produtos e peças, Fornecedores
   Itens desativados saem dos novos orçamentos, mas continuam no histórico
   das ordens antigas. O saldo das peças vem só das movimentações.
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

  async function alternar(nome, ativo, fn, textoDesativar) {
    if (ativo && !(await U.confirmar({ titulo: `Desativar ${nome}?`, texto: textoDesativar, rotulo: "Desativar", perigo: true }))) return;
    const r = fn();
    U.aviso(r.ok ? (r.status === "ativo" ? `${nome} reativado.` : `${nome} desativado.`) : r.erro, r.ok ? "ok" : "erro");
  }
  const acoesLinha = (acao, editar, alternarFn, ativo, nome) => (O.pode(acao) ? C().td("", el("span", { class: "acoes-linha__botoes" },
    el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar ${nome}`, title: "Editar", onclick: editar }, icone("pencil", 15)),
    el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `${ativo ? "Desativar" : "Reativar"} ${nome}`, title: ativo ? "Desativar" : "Reativar", onclick: alternarFn }, icone(ativo ? "power-off" : "power", 15))), "acoes-linha") : null);

  /* ======================================================================
     SERVIÇOS
     ====================================================================== */
  const estS = { status: "ativo", categoria: "", busca: "" };
  let pS = null;
  const realizados = (sid) => L.dados.ordens.filter((os) => os.finalizadaEm).reduce((t, os) => t + os.itens.filter((i) => i.tipo === "servico" && i.refId === sid).reduce((a, i) => a + i.quantidade, 0), 0);
  function montarServicos(secao) {
    const busca = C().campoBusca({ placeholder: "Nome ou código", rotulo: "Buscar serviços", foco: "serv-busca", valor: estS.busca, aoMudar: (v) => { estS.busca = v; atualizarServicos(); } });
    pS = { busca, filtros: el("div", { class: "barra-filtros" }), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "servicos", titulo: "Serviços e mão de obra", sub: `Catálogo usado nos orçamentos. Mão de obra avulsa é cobrada por hora (${U.moeda(L.dados.oficina.orcamento.valorHora)}, em Configurações). Serviços desativados não entram em novos orçamentos, mas continuam no histórico.`, acoes: [
        C().botaoSe("catalogo", "Novo serviço", "btn--primario", () => NX.form.servico(null), "plus"),
      ] }),
      pS.filtros, pS.tabela);
  }
  function desenharServicos() {
    const d = L.dados;
    U.$("#titulo-servicos").parentElement.querySelector(".pagina__sub").textContent = `Catálogo usado nos orçamentos. Mão de obra avulsa é cobrada por hora (${U.moeda(d.oficina.orcamento.valorHora)}, em Configurações). Serviços desativados não entram em novos orçamentos, mas continuam no histórico.`;
    U.trocar(pS.filtros, pS.busca.caixa,
      C().seletor([{ valor: "ativo", rotulo: "Ativos" }, { valor: "inativo", rotulo: "Inativos" }, { valor: "", rotulo: "Todos" }], estS.status, (v) => { estS.status = v; atualizarServicos(); }, { rotulo: "Situação", foco: "serv-status" }),
      C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...d.oficina.categoriasServico.map((c) => ({ valor: c, rotulo: c }))], estS.categoria, (v) => { estS.categoria = v; atualizarServicos(); }, { rotulo: "Categoria", foco: "serv-cat" }));
    const lista = d.servicos.filter((s) => (!estS.status || s.status === estS.status) && (!estS.categoria || s.categoria === estS.categoria) && (!estS.busca || U.contem(s.nome, estS.busca) || U.contem(s.codigo, estS.busca))).sort((a, b) => a.codigo.localeCompare(b.codigo));
    const titulo = el("p", { class: "contagem", texto: `${U.plural(lista.length, "serviço", "serviços")} · ${U.plural(d.servicos.filter((s) => s.status !== "ativo").length, "inativo", "inativos")} no total` });
    if (!lista.length) { U.trocar(pS.tabela, titulo, C().vazio({ icone: "wrench", titulo: "Nenhum serviço encontrado" })); return; }
    U.trocar(pS.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Serviços" }),
      el("thead", {}, el("tr", {}, ...["Código", "Serviço", "Categoria", "Preço", "Tempo", "Realizados", "Situação", O.pode("catalogo") ? "" : null].filter((x) => x !== null).map((c) => el("th", { scope: "col", class: ["Preço", "Tempo", "Realizados"].includes(c) ? "num" : "", texto: c })))),
      el("tbody", {}, ...lista.map((s) => el("tr", { class: s.status !== "ativo" ? "is-inativo" : "" },
        C().td("Código", el("span", { class: "codigo", texto: s.codigo })),
        C().td("", el("span", {}, el("b", { texto: s.nome }), " ", C().pilulaExemplo(s), s.descricao ? el("small", { class: "sub", texto: s.descricao }) : null), "principal-celula"),
        C().td("Categoria", s.categoria),
        C().td("Preço", el("b", { texto: U.moeda(s.preco) }), "num"),
        C().td("Tempo", `${s.tempo} min`, "num"),
        C().td("Realizados", U.numero(realizados(s.id)), "num"),
        C().td("Situação", C().pilulaAtivo(s.status)),
        acoesLinha("catalogo", () => NX.form.servico(s.id), () => alternar(s.nome, s.status === "ativo", () => L.alternarServico(s.id), "Ele não poderá entrar em novos orçamentos. As ordens e orçamentos antigos continuam com ele."), s.status === "ativo", s.nome)))))));
  }
  const atualizarServicos = C().comFoco(desenharServicos);
  NX.telas.servicos = { titulo: "Serviços e mão de obra", montar: montarServicos, atualizar: atualizarServicos };

  /* ======================================================================
     PRODUTOS E PEÇAS
     ====================================================================== */
  const estP = { status: "ativo", categoria: "", situacao: "", busca: "", pagina: 1, ordem: "sku", direcao: "asc" };
  let pP = null;
  function montarPecas(secao) {
    const busca = C().campoBusca({ placeholder: "Nome, código (SKU) ou fabricante", rotulo: "Buscar peças", foco: "pec-busca", valor: estP.busca, aoMudar: (v) => { estP.busca = v; estP.pagina = 1; atualizarPecas(); } });
    pP = { busca, filtros: el("div", { class: "barra-filtros" }), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "pecas", titulo: "Produtos e peças", sub: "Cadastro das peças. O saldo vem das movimentações de estoque; disponível = saldo − reservado para ordens aprovadas.", acoes: [
        O.podeVer("estoque") ? el("a", { class: "btn btn--linha", href: "#/estoque" }, icone("warehouse", 16), "Ir para o estoque") : null,
        C().botaoSe("catalogo", "Nova peça", "btn--primario", () => NX.form.peca(null), "plus"),
      ] }),
      pP.filtros, pP.tabela);
  }
  const CHAVES_P = { sku: (x) => x.sku, nome: (x) => x.nome, saldo: (x) => O.saldo(x.id), preco: (x) => x.preco, margem: (x) => (x.preco ? (x.preco - x.custo) / x.preco : 0) };
  function desenharPecas() {
    const d = L.dados;
    const verCusto = O.podeVer("financeiro") || O.pode("catalogo");
    U.trocar(pP.filtros, pP.busca.caixa,
      C().seletor([{ valor: "ativo", rotulo: "Ativas" }, { valor: "inativo", rotulo: "Inativas" }, { valor: "", rotulo: "Todas" }], estP.status, (v) => { estP.status = v; estP.pagina = 1; atualizarPecas(); }, { rotulo: "Situação do cadastro", foco: "pec-status" }),
      C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...d.oficina.categoriasPeca.map((c) => ({ valor: c, rotulo: c }))], estP.categoria, (v) => { estP.categoria = v; estP.pagina = 1; atualizarPecas(); }, { rotulo: "Categoria", foco: "pec-cat" }),
      C().seletor([{ valor: "", rotulo: "Qualquer estoque" }, { valor: "baixo", rotulo: "Baixo ou zerado" }, { valor: "normal", rotulo: "Normal" }], estP.situacao, (v) => { estP.situacao = v; estP.pagina = 1; atualizarPecas(); }, { rotulo: "Nível de estoque", foco: "pec-sit" }));
    const lista = C().ordenar(d.pecas.filter((x) => (!estP.status || x.status === estP.status) && (!estP.categoria || x.categoria === estP.categoria)
      && (!estP.situacao || (estP.situacao === "baixo" ? ["baixo", "zerado"].includes(O.situacaoPeca(x)) : O.situacaoPeca(x) === "normal"))
      && (!estP.busca || U.contem(x.nome, estP.busca) || U.contem(x.sku, estP.busca) || U.contem(x.fabricante, estP.busca))), estP, CHAVES_P);
    const { res, nav } = C().blocoPaginado(estP, lista, "pecas", atualizarPecas);
    const titulo = el("p", { class: "contagem", texto: U.plural(res.total, "peça", "peças") });
    if (!res.total) { U.trocar(pP.tabela, titulo, C().vazio({ icone: "package", titulo: "Nenhuma peça encontrada" })); return; }
    const th = (r, c, cl) => C().thOrdenavel(r, c, estP, atualizarPecas, cl);
    U.trocar(pP.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Produtos e peças" }),
      el("thead", {}, el("tr", {}, th("SKU", "sku"), th("Peça", "nome"), el("th", { scope: "col", texto: "Fornecedor" }), th("Saldo", "saldo", "num"), el("th", { scope: "col", texto: "Estoque" }), verCusto ? el("th", { scope: "col", class: "num", texto: "Custo" }) : null, th("Preço", "preco", "num"), verCusto ? th("Margem", "margem", "num") : null, el("th", { scope: "col", texto: "Local" }), O.pode("catalogo") ? el("th", { scope: "col" }) : null)),
      el("tbody", {}, ...res.itens.map((x) => el("tr", { class: x.status !== "ativo" ? "is-inativo" : "" },
        C().td("SKU", O.podeVer("estoque") ? el("a", { class: "codigo link-texto", href: `#/estoque/${x.id}`, texto: x.sku }) : el("span", { class: "codigo", texto: x.sku })),
        C().td("", el("span", {}, el("b", { texto: x.nome }), " ", C().pilulaExemplo(x), el("small", { class: "sub", texto: `${x.categoria}${x.fabricante ? ` · ${x.fabricante}` : ""}` })), "principal-celula"),
        C().td("Fornecedor", x.fornecedorId ? (L.fornecedor(x.fornecedorId) || {}).nome : el("span", { class: "suave", texto: "—" })),
        C().td("Saldo", el("span", {}, el("b", { texto: U.numero(O.saldo(x.id)) }), el("small", { class: "sub", texto: `mín. ${x.minimo}${O.reservado(x.id) ? ` · ${O.reservado(x.id)} reserv.` : ""}` })), "num"),
        C().td("Estoque", C().pilulaSituacaoPeca(x)),
        verCusto ? C().td("Custo", U.moeda(x.custo), "num") : null,
        C().td("Preço", el("b", { texto: U.moeda(x.preco) }), "num"),
        verCusto ? C().td("Margem", U.percentual(x.preco ? (x.preco - x.custo) / x.preco : 0), "num") : null,
        C().td("Local", x.local || "—"),
        acoesLinha("catalogo", () => NX.form.peca(x.id), () => alternar(x.nome, x.status === "ativo", () => L.alternarPeca(x.id), O.saldo(x.id) ? `Ainda há ${O.saldo(x.id)} em estoque. Peça desativada não entra em novos orçamentos nem recebe movimentações até ser reativada.` : "Peça desativada não entra em novos orçamentos nem recebe movimentações até ser reativada."), x.status === "ativo", x.nome)))))), nav);
  }
  const atualizarPecas = C().comFoco(desenharPecas);
  NX.telas.pecas = { titulo: "Produtos e peças", montar: montarPecas, atualizar: atualizarPecas };

  /* ======================================================================
     FORNECEDORES
     ====================================================================== */
  const estF = { status: "ativo", busca: "" };
  let pF = null;
  function montarFornecedores(secao) {
    const busca = C().campoBusca({ placeholder: "Nome, contato ou produto", rotulo: "Buscar fornecedores", foco: "forn-busca", valor: estF.busca, aoMudar: (v) => { estF.busca = v; atualizarFornecedores(); } });
    pF = { busca, filtros: el("div", { class: "barra-filtros" }), lista: el("div") };
    U.trocar(secao,
      C().cabecalho({ id: "fornecedores", titulo: "Fornecedores", sub: "As compras mostradas aqui vêm das entradas de estoque registradas. O sistema não faz pedidos nem pagamentos.", acoes: [
        C().botaoSe("catalogo", "Novo fornecedor", "btn--primario", () => NX.form.fornecedor(null), "plus"),
      ] }),
      pF.filtros, pF.lista);
  }
  function desenharFornecedores() {
    const d = L.dados;
    U.trocar(pF.filtros, pF.busca.caixa, C().seletor([{ valor: "ativo", rotulo: "Ativos" }, { valor: "inativo", rotulo: "Inativos" }, { valor: "", rotulo: "Todos" }], estF.status, (v) => { estF.status = v; atualizarFornecedores(); }, { rotulo: "Situação", foco: "forn-status" }));
    const lista = d.fornecedores.filter((f) => (!estF.status || f.status === estF.status) && (!estF.busca || U.contem(f.nome, estF.busca) || U.contem(f.contato, estF.busca) || U.contem(f.produtos, estF.busca)));
    if (!lista.length) { U.trocar(pF.lista, C().vazio({ icone: "truck", titulo: "Nenhum fornecedor encontrado" })); return; }
    const verValores = O.podeVer("financeiro") || O.pode("catalogo");
    U.trocar(pF.lista, el("div", { class: "cartoes-grade" }, ...lista.map((f) => {
      const entradas = d.movimentos.filter((m) => m.tipo === "entrada" && m.fornecedorId === f.id);
      const valor = entradas.reduce((t, m) => t + m.quantidade * (m.custoUnitario || 0), 0);
      const ultima = entradas.reduce((m, x) => (x.data > m ? x.data : m), "");
      const pecas = d.pecas.filter((x) => x.fornecedorId === f.id);
      return el("article", { class: `prof-cartao${f.status !== "ativo" ? " is-inativo" : ""}` },
        el("div", { class: "prof-cartao__topo" }, el("span", { class: "alerta-icone" }, icone("truck", 18)),
          el("div", {}, el("h3", { texto: f.nome }), el("span", { class: "suave", texto: `${f.contato} · ${U.mascaraTelefone(f.telefone)}` }), f.email ? el("span", { class: "suave", texto: f.email }) : null),
          el("div", { class: "pilha pilha--fim" }, C().pilulaAtivo(f.status), C().pilulaExemplo(f))),
        el("p", { class: "suave", texto: f.produtos || "Produtos não informados" }),
        el("div", { class: "servico-cartao__numeros" },
          el("span", {}, icone("package", 14), el("b", { texto: U.numero(pecas.length) }), " peças cadastradas"),
          el("span", {}, icone("arrow-down-to-line", 14), el("b", { texto: U.numero(entradas.length) }), " entradas registradas"),
          verValores ? el("span", {}, icone("receipt", 14), el("b", { texto: U.moeda(valor) }), " em compras") : null),
        el("p", { class: "suave", texto: ultima ? `Última entrada: ${U.dataCompleta(ultima)}` : "Nenhuma entrada registrada ainda." }),
        f.cnpj ? el("p", { class: "suave", texto: `CNPJ ${U.mascaraCnpj(f.cnpj)}` }) : null,
        f.observacoes ? el("p", { class: "suave", texto: f.observacoes }) : null,
        O.pode("catalogo") ? el("div", { class: "cartao-acoes" },
          C().botao("Editar", "btn--linha btn--pequeno", () => NX.form.fornecedor(f.id), "pencil"),
          C().botao(f.status === "ativo" ? "Desativar" : "Reativar", "btn--fantasma btn--pequeno", () => alternar(f.nome, f.status === "ativo", () => L.alternarFornecedor(f.id), "Ele deixa de aparecer nas novas entradas de estoque. O histórico de compras continua."), f.status === "ativo" ? "power-off" : "power")) : null);
    })));
  }
  const atualizarFornecedores = C().comFoco(desenharFornecedores);
  NX.telas.fornecedores = { titulo: "Fornecedores", montar: montarFornecedores, atualizar: atualizarFornecedores };
})();
