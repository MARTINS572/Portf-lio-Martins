/* ==========================================================================
   NEXORA STOCK — Telas: Fornecedores e página do fornecedor
   Cadastro, edição, pesquisa, ativar/inativar, produtos relacionados e
   histórico de pedidos de compra por período.
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
  const linhaFicha = (...a) => NX.detalhe.linhaFicha(...a);

  /* ---------- Lista ---------- */
  const filtro = { busca: "", status: "ativo" };
  let p = null;

  const resumo = (f) => {
    const pcs = L.dados.pedidos.filter((pc) => pc.fornecedorId === f.id);
    return {
      produtos: L.dados.produtos.filter((x) => x.fornecedorId === f.id && x.status === "ativo").length,
      abertos: pcs.filter(E.pedidoAberto).length,
      atrasados: pcs.filter(E.pedidoAtrasado).length,
      ultimo: pcs.reduce((u, pc) => (pc.criadoEm > u ? pc.criadoEm : u), ""),
      total: pcs.length,
    };
  };
  const filtrados = () => L.dados.fornecedores.filter((f) =>
    (filtro.status === "todos" || f.status === filtro.status) &&
    (!filtro.busca || [f.nome, f.contato, f.email, f.cnpj, f.telefone].some((v) => U.contem(v, filtro.busca)))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Nome, contato, e-mail ou CNPJ", "aria-label": "Pesquisar fornecedores", value: filtro.busca, "data-foco": "forn-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value; atualizar(); });
    p = { busca, chips: el("div", { class: "chips", role: "group", "aria-label": "Situação do fornecedor" }), conteudo: el("div") };
    secao.replaceChildren(
      C().cabecalho({ id: "fornecedores", titulo: "Fornecedores", sub: "Quem abastece a loja e o histórico de compras", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Novo fornecedor", "btn--primario", () => NX.form.fornecedor(), "plus"),
      ] }),
      p.chips,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca)),
      p.conteudo);
  }

  function exportar() {
    const lista = filtrados();
    U.baixarCSV(U.nomeArquivo("fornecedores"), ["Fornecedor", "Contato", "CNPJ", "Telefone", "E-mail", "Endereço", "Prazo de entrega (dias)", "Status", "Produtos ativos", "Pedidos em aberto", "Observações"],
      lista.map((f) => { const r = resumo(f); return [f.nome, f.contato, f.cnpj, f.telefone, f.email, f.endereco, f.prazoEntrega ?? "", f.status === "ativo" ? "Ativo" : "Inativo", r.produtos, r.abertos, f.observacoes]; }));
  }

  function atualizar() {
    const todos = L.dados.fornecedores;
    p.chips.replaceChildren(...[["ativo", "Ativos"], ["inativo", "Inativos"], ["todos", "Todos"]].map(([id, rotulo]) => el("button", { class: "chip", type: "button", "aria-pressed": String(filtro.status === id), "data-foco": `forn-chip-${id}`, onclick: () => { filtro.status = id; atualizar(); } },
      rotulo, el("span", { class: "chip__n", texto: U.numero(id === "todos" ? todos.length : todos.filter((f) => f.status === id).length) }))));
    const lista = filtrados();
    if (!lista.length) {
      p.conteudo.replaceChildren(el("div", { class: "cartao" }, C().vazio({ icone: "truck", titulo: "Nenhum fornecedor encontrado", texto: filtro.busca ? "Tente outro termo de pesquisa." : "" })));
      return;
    }
    p.conteudo.replaceChildren(el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: U.plural(lista.length, "fornecedor", "fornecedores") }),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
        el("thead", {}, el("tr", {}, ...["Fornecedor", "Telefone", "E-mail", "Produtos", "Pedidos em aberto", "Último pedido", "Status", ""].map((t, i) => el("th", { scope: "col", class: [3, 4].includes(i) ? "num" : "" }, t || el("span", { class: "vh", texto: "Ações" }))))),
        el("tbody", {}, ...lista.map((f) => {
          const r = resumo(f);
          return el("tr", {},
            C().td("Fornecedor", el("a", { class: "nome-btn", href: `#/fornecedores/${f.id}` }, el("span", {}, el("b", { texto: f.nome }), el("span", { class: "suave", texto: f.contato }))), "principal-celula"),
            C().td("Telefone", el("span", { class: "nowrap", texto: f.telefone })),
            C().td("E-mail", el("span", { class: "mono celula-texto", texto: f.email }), "inteira"),
            C().td("Produtos", el("a", { class: "link-texto", href: `#/produtos?fornecedor=${f.id}`, texto: U.numero(r.produtos) }), "num"),
            C().td("Pedidos em aberto", el("span", {}, U.numero(r.abertos), r.atrasados ? el("span", { class: "sub negativo", texto: `${r.atrasados} atrasado${r.atrasados > 1 ? "s" : ""}` }) : null), "num"),
            C().td("Último pedido", r.ultimo ? U.dataCompleta(r.ultimo) : el("span", { class: "suave", texto: "—" })),
            C().td("Status", C().pilulaSimples(f.status === "ativo" ? "Ativo" : "Inativo", f.status)),
            el("td", { class: "acoes-linha", "data-rotulo": "" },
              f.status === "ativo" ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Novo pedido para ${f.nome}`, title: "Novo pedido", onclick: () => NX.pedidos.form({ fornecedorId: f.id }) }, icone("clipboard-list", 16)) : null,
              el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar ${f.nome}`, title: "Editar", onclick: () => NX.form.fornecedor({ id: f.id }) }, icone("pencil", 16))));
        }))))));
  }

  NX.telas.fornecedores = { titulo: "Fornecedores", montar, atualizar };

  /* ---------- Página do fornecedor ---------- */
  let idAtual = null;
  let periodo = "90d";
  let partes = null;
  let secaoForn = null;
  const PERIODOS = [["30d", "30 dias", 30], ["90d", "90 dias", 90], ["12m", "12 meses", 365], ["todos", "Todos", null]];

  function montarFornecedor(secao) {
    secaoForn = secao;
    const f = L.fornecedor(idAtual);
    if (!f) {
      partes = null;
      secao.replaceChildren(C().voltar("fornecedores", "Fornecedores"), el("div", { class: "cartao" }, C().vazio({ icone: "truck", titulo: "Fornecedor não encontrado", acao: el("a", { class: "btn btn--linha", href: "#/fornecedores" }, "Ver fornecedores") })));
      return;
    }
    partes = { cabeca: el("div"), grade: el("div", { class: "produto-grade" }) };
    secao.replaceChildren(partes.cabeca, partes.grade);
  }

  function atualizarFornecedor() {
    if (!partes) return;
    const f = L.fornecedor(idAtual);
    if (!f) { montarFornecedor(secaoForn); return; }
    const ativo = f.status === "ativo";
    partes.cabeca.replaceChildren(C().cabecalho({
      id: "fornecedor", titulo: f.nome, antes: C().voltar("fornecedores", "Fornecedores"),
      etiquetas: [C().pilulaSimples(ativo ? "Ativo" : "Inativo", f.status), el("span", { class: "suave", texto: `Contato: ${f.contato}` })],
      acoes: [
        ativo ? C().botao("Novo pedido", "btn--primario", () => NX.pedidos.form({ fornecedorId: f.id }), "clipboard-list") : null,
        C().botao("Editar", "btn--linha", () => NX.form.fornecedor({ id: f.id }), "pencil"),
        C().botao(ativo ? "Inativar" : "Reativar", "btn--fantasma", () => NX.acoes.alternarFornecedor(f.id), ativo ? "ban" : "rotate-ccw"),
      ],
    }));

    const produtos = L.dados.produtos.filter((x) => x.fornecedorId === f.id).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const todosPcs = L.dados.pedidos.filter((pc) => pc.fornecedorId === f.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const dias = PERIODOS.find((x) => x[0] === periodo)[2];
    const desde = dias ? U.somarDias(U.hoje(), -(dias - 1)) : "";
    const pcs = todosPcs.filter((pc) => !desde || pc.criadoEm.slice(0, 10) >= desde);
    const recebidoPeriodo = pcs.reduce((t, pc) => t + E.totaisPedido(pc).recebidoValor, 0);
    const abertos = todosPcs.filter(E.pedidoAberto);

    const segPeriodo = el("div", { class: "segmentado", role: "group", "aria-label": "Período do histórico" }, ...PERIODOS.map(([id, rotulo]) => el("button", { type: "button", "aria-pressed": String(periodo === id), "data-foco": `forn-per-${id}`, texto: rotulo, onclick: () => { periodo = id; atualizarFornecedor(); } })));

    partes.grade.replaceChildren(
      el("div", { class: "produto-grade__lado" },
        el("article", { class: "cartao" },
          el("h2", { class: "cartao__titulo", texto: "Dados do fornecedor" }),
          el("dl", { class: "ficha ficha--coluna", style: { marginTop: "6px" } },
            linhaFicha("Contato", f.contato),
            linhaFicha("Telefone", f.telefone),
            linhaFicha("E-mail", el("span", { class: "mono", texto: f.email })),
            linhaFicha("CNPJ", f.cnpj || el("span", { class: "suave", texto: "Não informado" })),
            linhaFicha("Endereço", f.endereco || el("span", { class: "suave", texto: "Não informado" })),
            linhaFicha("Prazo de entrega", f.prazoEntrega != null ? U.plural(f.prazoEntrega, "dia", "dias") : null),
            linhaFicha("Cadastrado em", U.dataCompleta(f.criadoEm)),
            linhaFicha("Observações", f.observacoes))),
        el("article", { class: "cartao" },
          el("div", { class: "numeros", style: { marginTop: 0 } },
            el("div", {}, el("span", { texto: "Produtos ativos" }), el("b", { texto: U.numero(produtos.filter((x) => x.status === "ativo").length) })),
            el("div", {}, el("span", { texto: "Pedidos em aberto" }), el("b", { texto: U.numero(abertos.length) })),
            el("div", {}, el("span", { texto: "Pedidos no período" }), el("b", { texto: U.numero(pcs.length) })),
            el("div", {}, el("span", { texto: "Recebido no período" }), el("b", { texto: U.moeda(recebidoPeriodo, { compacto: recebidoPeriodo >= 100000 }) }))))),
      el("div", { class: "produto-grade__principal" },
        el("article", { class: "cartao cartao--tabela" },
          el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Produtos relacionados" }), el("p", { class: "cartao__sub", texto: "Produtos com este fornecedor como principal" }))),
          produtos.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
            el("thead", {}, el("tr", {}, ...["Produto", "Custo", "Quantidade", "Situação"].map((t, i) => el("th", { scope: "col", class: [1, 2].includes(i) ? "num" : "", texto: t })))),
            el("tbody", {}, ...produtos.map((x) => el("tr", {},
              C().td("Produto", C().nomeProduto(x), "principal-celula"),
              C().td("Custo", U.moeda(x.custo), "num"),
              C().td("Quantidade", C().saldoCelula(x), "num"),
              C().td("Situação", C().pilulaSituacao(x))))))) : el("p", { class: "vazio-pequeno", style: { padding: "0 16px 12px" }, texto: "Nenhum produto tem este fornecedor como principal." })),
        el("article", { class: "cartao cartao--tabela" },
          el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Histórico de pedidos de compra" }), el("p", { class: "cartao__sub", texto: dias ? `Criados desde ${U.dataCompleta(desde)}` : "Todos os pedidos" })), segPeriodo),
          pcs.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
            el("thead", {}, el("tr", {}, ...["Pedido", "Criado em", "Previsão", "Total", "Recebido", "Status"].map((t, i) => el("th", { scope: "col", class: [3, 4].includes(i) ? "num" : "", texto: t })))),
            el("tbody", {}, ...pcs.map((pc) => {
              const t = E.totaisPedido(pc);
              return el("tr", {},
                C().td("Pedido", el("a", { class: "link-texto mono", href: `#/pedidos/${pc.id}`, texto: pc.numero }), "principal-celula"),
                C().td("Criado em", U.dataCompleta(pc.criadoEm)),
                C().td("Previsão", U.dataCompleta(pc.previsao)),
                C().td("Total", U.moeda(t.total), "num"),
                C().td("Recebido", `${U.numero(t.recebidoUn)} de ${U.numero(t.pedidoUn)} un.`, "num"),
                C().td("Status", C().pilulaPedido(pc)));
            })))) : el("p", { class: "vazio-pequeno", style: { padding: "0 16px 12px" }, texto: "Nenhum pedido neste período." }))),
    );
  }

  NX.telas.fornecedor = { titulo: "Fornecedor", montar: montarFornecedor, atualizar: atualizarFornecedor, abrir: (id) => { idAtual = id; }, tituloDinamico: () => (L.fornecedor(idAtual) || {}).nome };
})();
