/* ==========================================================================
   NEXORA CRM — Tela: Leads
   Pesquisa por nome/empresa, filtros por status e origem, ordenação por
   nome, data ou valor, e detalhes em janela.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const filtro = { busca: "", status: "", origem: "", ordem: "data", direcao: "desc" };
  let partes = null;

  const ORDENS = [
    { valor: "data:desc", rotulo: "Mais recentes" }, { valor: "data:asc", rotulo: "Mais antigos" },
    { valor: "nome:asc", rotulo: "Nome (A–Z)" }, { valor: "nome:desc", rotulo: "Nome (Z–A)" },
    { valor: "valor:desc", rotulo: "Maior valor" }, { valor: "valor:asc", rotulo: "Menor valor" },
  ];

  function filtrados() {
    const lista = L.dados.leads.filter((l) =>
      (!filtro.busca || U.contem(l.nome, filtro.busca) || U.contem(l.empresa, filtro.busca)) &&
      (!filtro.status || l.status === filtro.status) &&
      (!filtro.origem || l.origem === filtro.origem));
    const fator = filtro.direcao === "asc" ? 1 : -1;
    const comparar = {
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      data: (a, b) => a.primeiroContato.localeCompare(b.primeiroContato) || a.nome.localeCompare(b.nome, "pt-BR"),
      valor: (a, b) => a.valor - b.valor,
    }[filtro.ordem];
    return lista.sort((a, b) => comparar(a, b) * fator);
  }

  function cabecalhoOrdenavel(rotulo, campo, classe = "") {
    const ativo = filtro.ordem === campo;
    const th = el("th", { scope: "col", class: classe, "aria-sort": ativo ? (filtro.direcao === "asc" ? "ascending" : "descending") : "none" });
    th.append(el("button", { class: "ordenar", type: "button", onclick: () => {
      filtro.direcao = filtro.ordem === campo ? (filtro.direcao === "asc" ? "desc" : "asc") : (campo === "nome" ? "asc" : "desc");
      filtro.ordem = campo;
      partes.ordem.value = `${filtro.ordem}:${filtro.direcao}`;
      atualizar();
    } }, rotulo, icone(ativo ? (filtro.direcao === "asc" ? "chevron-down" : "chevron-down") : "arrow-up-down", 14)));
    if (ativo) th.querySelector(".ic").classList.toggle("ic--cima", filtro.direcao === "asc");
    return th;
  }

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Pesquisar por nome ou empresa", "aria-label": "Pesquisar leads por nome ou empresa", value: filtro.busca, "data-foco": "leads-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value.trim(); atualizar(); });
    const origem = el("select", { "aria-label": "Filtrar por origem" }, el("option", { value: "", texto: "Todas as origens" }), ...NX.ORIGENS.map((o) => el("option", { value: o, texto: o })));
    origem.addEventListener("change", () => { filtro.origem = origem.value; atualizar(); });
    const ordem = el("select", { "aria-label": "Ordenar leads" }, ...ORDENS.map((o) => el("option", { value: o.valor, texto: o.rotulo })));
    ordem.value = `${filtro.ordem}:${filtro.direcao}`;
    ordem.addEventListener("change", () => { [filtro.ordem, filtro.direcao] = ordem.value.split(":"); atualizar(); });
    const limpar = el("button", { class: "link-btn", type: "button", texto: "Limpar filtros", onclick: () => {
      Object.assign(filtro, { busca: "", status: "", origem: "" });
      busca.value = ""; origem.value = "";
      atualizar();
      busca.focus();
    } });

    partes = {
      busca, origem, ordem, limpar,
      status: el("div", { class: "chips", role: "group", "aria-label": "Filtrar por status" }),
      contagem: el("p", { class: "contagem", "aria-live": "polite" }),
      corpo: el("tbody"),
      cabeca: el("tr"),
      vazio: el("div", { class: "vazio", hidden: true }, icone("search", 22), el("p", { texto: "Nenhum lead encontrado com esses filtros." }), el("button", { class: "btn btn--linha btn--pequeno", type: "button", texto: "Limpar filtros", onclick: () => limpar.click() })),
    };

    secao.replaceChildren(
      C().cabecalho({
        id: "leads", titulo: "Leads", sub: "Potenciais clientes, do primeiro contato até a conversão",
        acoes: [
          C().botao("Exportar CSV", "btn--linha", exportar, "download"),
          C().botao("Novo lead", "btn--primario", () => NX.form.lead(), "plus"),
        ],
      }),
      partes.status,
      el("div", { class: "barra-filtros" },
        el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca),
        origem, ordem, limpar),
      el("div", { class: "cartao cartao--tabela" },
        partes.contagem,
        el("div", { class: "tabela-rolagem" },
          el("table", { class: "tabela tabela--leads" }, el("caption", { class: "vh", texto: "Lista de leads" }), el("thead", {}, partes.cabeca), partes.corpo)),
        partes.vazio),
    );
  }

  function atualizar() {
    const todos = L.dados.leads;
    // Chips de status com contagem
    partes.status.replaceChildren(...["", ...NX.STATUS_LEAD].map((s) => el("button", {
      class: "chip", type: "button", "aria-pressed": String(filtro.status === s),
      onclick: () => { filtro.status = s; atualizar(); }, "data-foco": `leads-status-${s || "todos"}`,
    }, s || "Todos", el("span", { class: "chip__n", texto: String(s ? todos.filter((l) => l.status === s).length : todos.length) }))));

    partes.cabeca.replaceChildren(
      cabecalhoOrdenavel("Lead", "nome"),
      el("th", { scope: "col", texto: "Empresa" }),
      el("th", { scope: "col", texto: "Origem" }),
      el("th", { scope: "col", texto: "Interesse" }),
      cabecalhoOrdenavel("Valor", "valor", "num"),
      el("th", { scope: "col", texto: "Responsável" }),
      cabecalhoOrdenavel("1º contato", "data"),
      el("th", { scope: "col", texto: "Status" }),
      el("th", { scope: "col" }, el("span", { class: "vh", texto: "Ações" })),
    );

    const lista = filtrados();
    partes.contagem.textContent = lista.length === todos.length ? `${U.plural(todos.length, "lead", "leads")}` : `${U.plural(lista.length, "lead encontrado", "leads encontrados")} de ${todos.length}`;
    partes.vazio.hidden = lista.length > 0;
    partes.corpo.replaceChildren(...lista.map((l) => {
      const tr = el("tr", { class: "linha-clicavel", onclick: (e) => { if (!e.target.closest("button, a")) NX.detalhe.lead(l.id); } },
        el("td", { "data-rotulo": "Lead" }, el("button", { class: "nome-btn", type: "button", onclick: () => NX.detalhe.lead(l.id), "data-foco": `lead-${l.id}` }, el("b", { texto: l.nome }), el("span", { class: "mono suave", texto: l.email }))),
        el("td", { "data-rotulo": "Empresa", texto: l.empresa }),
        el("td", { "data-rotulo": "Origem", texto: l.origem }),
        el("td", { "data-rotulo": "Interesse", texto: l.interesse }),
        el("td", { class: "num", "data-rotulo": "Valor", texto: U.moeda(l.valor) }),
        el("td", { "data-rotulo": "Responsável" }, C().pessoaComAvatar(l.responsavelId)),
        el("td", { "data-rotulo": "1º contato", class: "nowrap", texto: U.dataCompleta(l.primeiroContato) }),
        el("td", { "data-rotulo": "Status" }, C().pilulaStatusLead(l.status)),
        el("td", { class: "acoes-linha" },
          el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar ${l.nome}`, title: "Editar", onclick: () => NX.form.lead(l.id) }, icone("pencil", 16)),
          el("button", { class: "icone-btn icone-btn--sutil icone-btn--p icone-btn--perigo", type: "button", "aria-label": `Excluir ${l.nome}`, title: "Excluir", onclick: () => NX.acoes.excluirLead(l.id) }, icone("trash", 16))),
      );
      return tr;
    }));
  }

  function exportar() {
    const lista = filtrados();
    U.baixarCSV("nexora-leads.csv",
      ["Nome", "Empresa", "E-mail", "Telefone", "Origem", "Interesse", "Valor estimado (R$)", "Responsável", "Primeiro contato", "Status", "Observações"],
      lista.map((l) => [l.nome, l.empresa, l.email, l.telefone, l.origem, l.interesse, l.valor, L.membro(l.responsavelId).nome, U.dataCompleta(l.primeiroContato), l.status, l.observacoes]));
  }

  NX.telas.leads = { titulo: "Leads", montar, atualizar, filtro };
})();
