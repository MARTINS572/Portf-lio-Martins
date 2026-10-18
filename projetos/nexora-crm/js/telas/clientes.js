/* ==========================================================================
   NEXORA CRM — Telas: Clientes (lista) e Ficha do cliente
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;

  /* ========================= LISTA ========================= */
  const filtro = { busca: "", categoria: "", status: "", ordem: "empresa:asc" };
  let partes = null;

  function filtrados() {
    const lista = L.dados.clientes.filter((c) =>
      (!filtro.busca || U.contem(c.nome, filtro.busca) || U.contem(c.empresa, filtro.busca) || U.contem(c.email, filtro.busca)) &&
      (!filtro.categoria || c.categoria === filtro.categoria) &&
      (!filtro.status || c.status === filtro.status));
    const [campo, dir] = filtro.ordem.split(":");
    const fator = dir === "asc" ? 1 : -1;
    const valor = new Map(lista.map((c) => [c.id, L.valorDoCliente(c.id).ganho]));
    const cmp = {
      empresa: (a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"),
      cadastro: (a, b) => a.cadastro.localeCompare(b.cadastro),
      valor: (a, b) => valor.get(a.id) - valor.get(b.id),
    }[campo];
    return lista.sort((a, b) => cmp(a, b) * fator);
  }

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Pesquisar por empresa, contato ou e-mail", "aria-label": "Pesquisar clientes", "data-foco": "clientes-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value.trim(); atualizar(); });
    const categoria = el("select", { "aria-label": "Filtrar por categoria" }, el("option", { value: "", texto: "Todas as categorias" }), ...NX.CATEGORIAS.map((c) => el("option", { value: c, texto: c })));
    categoria.addEventListener("change", () => { filtro.categoria = categoria.value; atualizar(); });
    const status = el("select", { "aria-label": "Filtrar por status" }, el("option", { value: "", texto: "Todos os status" }), ...NX.STATUS_CLIENTE.map((c) => el("option", { value: c, texto: c })));
    status.addEventListener("change", () => { filtro.status = status.value; atualizar(); });
    const ordem = el("select", { "aria-label": "Ordenar clientes" },
      el("option", { value: "empresa:asc", texto: "Empresa (A–Z)" }), el("option", { value: "cadastro:desc", texto: "Cadastro mais recente" }),
      el("option", { value: "cadastro:asc", texto: "Cadastro mais antigo" }), el("option", { value: "valor:desc", texto: "Maior valor em negócios" }));
    ordem.addEventListener("change", () => { filtro.ordem = ordem.value; atualizar(); });
    partes = {
      busca, categoria, status, ordem,
      resumo: el("div", { class: "resumo-linha" }),
      contagem: el("p", { class: "contagem", "aria-live": "polite" }),
      corpo: el("tbody"),
      vazio: el("div", { class: "vazio", hidden: true }, icone("search", 22), el("p", { texto: "Nenhum cliente encontrado com esses filtros." })),
    };
    secao.replaceChildren(
      C().cabecalho({
        id: "clientes", titulo: "Clientes", sub: "Empresas atendidas e o relacionamento com cada uma",
        acoes: [C().botao("Exportar CSV", "btn--linha", exportar, "download"), C().botao("Novo cliente", "btn--primario", () => NX.form.cliente(), "plus")],
      }),
      partes.resumo,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca), categoria, status, ordem),
      el("div", { class: "cartao cartao--tabela" },
        partes.contagem,
        el("div", { class: "tabela-rolagem" },
          el("table", { class: "tabela tabela--clientes" },
            el("caption", { class: "vh", texto: "Lista de clientes" }),
            el("thead", {}, el("tr", {},
              ...["Cliente", "Categoria", "Telefone", "E-mail", "Cadastro", "Status"].map((t) => el("th", { scope: "col", texto: t })),
              el("th", { scope: "col", class: "num", texto: "Negócios ganhos" }))),
            partes.corpo)),
        partes.vazio),
    );
  }

  function atualizar() {
    const todos = L.dados.clientes;
    const ativos = todos.filter((c) => c.status === "Ativo").length;
    const total = todos.reduce((t, c) => t + L.valorDoCliente(c.id).ganho, 0);
    partes.resumo.replaceChildren(
      el("p", {}, el("b", { texto: U.numero(todos.length) }), " clientes"),
      el("p", {}, el("b", { texto: U.numero(ativos) }), " ativos"),
      el("p", {}, el("b", { texto: U.moeda(total) }), " em negócios ganhos"),
    );
    const lista = filtrados();
    partes.contagem.textContent = lista.length === todos.length ? U.plural(todos.length, "cliente", "clientes") : `${U.plural(lista.length, "cliente encontrado", "clientes encontrados")} de ${todos.length}`;
    partes.vazio.hidden = lista.length > 0;
    partes.corpo.replaceChildren(...lista.map((c) => {
      const v = L.valorDoCliente(c.id);
      return el("tr", { class: "linha-clicavel", onclick: (e) => { if (!e.target.closest("a, button")) NX.ir(`clientes/${c.id}`); } },
        el("td", { "data-rotulo": "Cliente" }, el("a", { class: "nome-btn", href: `#/clientes/${c.id}` },
          el("span", { class: "avatar avatar--empresa", "aria-hidden": "true", texto: U.iniciais(c.empresa) }),
          el("span", {}, el("b", { texto: c.empresa }), el("span", { class: "suave", texto: c.nome })))),
        el("td", { "data-rotulo": "Categoria", texto: c.categoria }),
        el("td", { "data-rotulo": "Telefone", class: "mono nowrap", texto: c.telefone }),
        el("td", { "data-rotulo": "E-mail", class: "mono", texto: c.email }),
        el("td", { "data-rotulo": "Cadastro", class: "nowrap", texto: U.dataCompleta(c.cadastro) }),
        el("td", { "data-rotulo": "Status" }, el("span", { class: `pilula pilula--${c.status === "Ativo" ? "verde" : "cinza"}`, texto: c.status })),
        el("td", { "data-rotulo": "Negócios ganhos", class: "num" }, el("b", { texto: U.moeda(v.ganho) }), v.aberto ? el("span", { class: "suave", texto: `+ ${U.moeda(v.aberto)} em aberto` }) : null));
    }));
  }

  function exportar() {
    U.baixarCSV("nexora-clientes.csv",
      ["Empresa", "Contato", "Telefone", "E-mail", "Categoria", "Cadastro", "Status", "Negócios ganhos (R$)", "Em negociação (R$)"],
      filtrados().map((c) => { const v = L.valorDoCliente(c.id); return [c.empresa, c.nome, c.telefone, c.email, c.categoria, U.dataCompleta(c.cadastro), c.status, v.ganho, v.aberto]; }));
  }

  NX.telas.clientes = { titulo: "Clientes", montar, atualizar };

  /* ========================= FICHA ========================= */
  let fichaId = null;
  let aba = "historico";

  function abrir(id) { fichaId = id; }

  function montarFicha() { /* montada a cada atualização */ }

  function atualizarFicha(secao) {
    const c = L.cliente(fichaId);
    if (!c) {
      secao.replaceChildren(C().cabecalho({ id: "cliente", titulo: "Cliente não encontrado", sub: "Ele pode ter sido removido ou os dados foram restaurados." }), el("a", { class: "btn btn--linha", href: "#/clientes", texto: "Voltar para clientes" }));
      return;
    }
    const v = L.valorDoCliente(c.id);
    const negocios = L.dados.negocios.filter((n) => n.clienteId === c.id).sort((a, b) => (b.fechadoEm || b.ultimaInteracao).localeCompare(a.fechadoEm || a.ultimaInteracao));
    const tarefas = L.dados.tarefas.filter((t) => t.vinculo.tipo === "cliente" && t.vinculo.id === c.id).sort((a, b) => Number(a.concluida) - Number(b.concluida) || a.prazo.localeCompare(b.prazo));
    const lead = c.leadId ? L.lead(c.leadId) : null;

    const voltar = el("a", { class: "voltar", href: "#/clientes" }, icone("arrow-left", 16), "Clientes");
    const cabeca = C().cabecalho({
      id: "cliente", titulo: c.empresa, antes: voltar,
      sub: `${c.nome} · ${c.categoria} · cliente desde ${U.dataCompleta(c.cadastro)}`,
      acoes: [
        C().botao("Registrar contato", "btn--linha", () => NX.form.contato(c.id), "phone"),
        C().botao("Adicionar observação", "btn--linha", () => NX.form.observacao(c.id), "sticky-note"),
        C().botao("Nova oportunidade", "btn--linha", () => NX.form.negocio({ vinculo: `cliente:${c.id}` }), "handshake"),
        C().botao("Editar", "btn--primario", () => NX.form.cliente(c.id), "pencil"),
      ],
    });

    const dados = el("article", { class: "cartao ficha-cliente" },
      el("div", { class: "ficha-cliente__topo" },
        el("span", { class: "avatar avatar--g avatar--empresa", "aria-hidden": "true", texto: U.iniciais(c.empresa) }),
        el("div", {}, el("b", { texto: c.nome }), el("span", { class: `pilula pilula--${c.status === "Ativo" ? "verde" : "cinza"}`, texto: c.status }))),
      el("dl", { class: "ficha ficha--coluna" },
        el("div", { class: "ficha__linha" }, el("dt", { texto: "E-mail" }), el("dd", { class: "mono", texto: c.email })),
        el("div", { class: "ficha__linha" }, el("dt", { texto: "Telefone" }), el("dd", { class: "mono", texto: c.telefone })),
        el("div", { class: "ficha__linha" }, el("dt", { texto: "Categoria" }), el("dd", { texto: c.categoria })),
        el("div", { class: "ficha__linha" }, el("dt", { texto: "Responsável" }), el("dd", {}, C().pessoaComAvatar(c.responsavelId))),
        el("div", { class: "ficha__linha" }, el("dt", { texto: "Origem" }), el("dd", { texto: lead ? `${lead.origem} (lead de ${U.dataCompleta(lead.primeiroContato)})` : "Cadastro direto" }))));

    const numeros = el("div", { class: "numeros-cliente" },
      el("div", {}, el("span", { texto: "Negócios ganhos" }), el("b", { texto: U.moeda(v.ganho, { compacto: false }) })),
      el("div", {}, el("span", { texto: "Em negociação" }), el("b", { texto: U.moeda(v.aberto, { compacto: false }) })),
      el("div", {}, el("span", { texto: "Oportunidades" }), el("b", { texto: U.numero(v.quantidade) })),
      el("div", {}, el("span", { texto: "Tarefas pendentes" }), el("b", { texto: U.numero(tarefas.filter((t) => !t.concluida).length) })));

    // Abas
    const ABAS = [
      { id: "historico", rotulo: "Histórico de contatos", n: c.contatos.length },
      { id: "negocios", rotulo: "Negociações", n: negocios.length },
      { id: "tarefas", rotulo: "Tarefas", n: tarefas.length },
      { id: "observacoes", rotulo: "Observações", n: c.observacoes.length },
    ];
    const lista = el("div", { class: "abas", role: "tablist", "aria-label": "Informações do cliente" });
    const paineis = el("div");
    const escolher = (idAba, focar) => { aba = idAba; desenharAbas(focar); };
    function desenharAbas(focar) {
      lista.replaceChildren(...ABAS.map((a, i) => {
        const b = el("button", { class: "aba", type: "button", role: "tab", id: `aba-${a.id}`, "aria-controls": `painel-${a.id}`, "aria-selected": String(a.id === aba), tabindex: a.id === aba ? "0" : "-1", "data-foco": `aba-${a.id}` }, a.rotulo, el("span", { class: "aba__n", texto: String(a.n) }));
        b.addEventListener("click", () => escolher(a.id, true));
        b.addEventListener("keydown", (e) => {
          const prox = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ABAS.length - 1 }[e.key];
          if (prox === undefined) return;
          e.preventDefault();
          escolher(ABAS[(prox + ABAS.length) % ABAS.length].id, true);
        });
        return b;
      }));
      paineis.replaceChildren(el("div", { class: "aba-painel", role: "tabpanel", id: `painel-${aba}`, "aria-labelledby": `aba-${aba}`, tabindex: "0" }, ...conteudoDaAba()));
      if (focar) lista.querySelector('[aria-selected="true"]').focus();
    }
    function conteudoDaAba() {
      if (aba === "historico") {
        return [
          el("div", { class: "aba-painel__topo" }, el("p", { class: "suave", texto: "Ligações, e-mails, reuniões e mensagens registradas." }), C().botao("Registrar contato", "btn--linha btn--pequeno", () => NX.form.contato(c.id), "plus")),
          c.contatos.length ? el("ol", { class: "linha-tempo" }, ...c.contatos.map((h) => el("li", {},
            el("span", { class: "linha-tempo__icone" }, icone({ "Ligação": "phone", "E-mail": "mail", "Reunião": "users", "WhatsApp": "message-square", "Visita": "building" }[h.tipo] || "circle-dot", 14)),
            el("div", {}, el("p", {}, el("b", { texto: h.tipo }), el("span", { class: "suave", texto: ` · ${U.dataCompleta(h.data)} · ${L.membro(h.autorId).nome}` })), el("p", { texto: h.resumo }))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum contato registrado." }),
        ];
      }
      if (aba === "negocios") {
        return [
          el("div", { class: "aba-painel__topo" }, el("p", { class: "suave", texto: "Oportunidades abertas, ganhas e perdidas com este cliente." }), C().botao("Nova oportunidade", "btn--linha btn--pequeno", () => NX.form.negocio({ vinculo: `cliente:${c.id}` }), "plus")),
          negocios.length ? el("ul", { class: "relacionados__lista" }, ...negocios.map((n) => el("li", {},
            el("button", { class: "relacionado", type: "button", onclick: () => NX.detalhe.negocio(n.id) },
              el("span", {}, el("b", { texto: n.titulo }), el("span", { class: "suave", texto: n.fechadoEm ? ` · ${n.etapa === "ganho" ? "concluída" : "perdida"} em ${U.dataCompleta(n.fechadoEm)}` : ` · última interação ${U.relativo(n.ultimaInteracao)}` })),
              C().pilulaEtapa(n.etapa), el("b", { class: "mono", texto: U.moeda(n.valor) }))))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma oportunidade." }),
        ];
      }
      if (aba === "tarefas") {
        return [
          el("div", { class: "aba-painel__topo" }, el("p", { class: "suave", texto: "Follow-ups ligados a este cliente." }), C().botao("Nova tarefa", "btn--linha btn--pequeno", () => NX.form.tarefa({ vinculo: `cliente:${c.id}` }), "plus")),
          tarefas.length ? el("ul", { class: "mini-tarefas" }, ...tarefas.map((t) => NX.telas.tarefas.linhaCompacta(t, { semVinculo: true }))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma tarefa." }),
        ];
      }
      return [
        el("div", { class: "aba-painel__topo" }, el("p", { class: "suave", texto: "Anotações internas da equipe." }), C().botao("Adicionar observação", "btn--linha btn--pequeno", () => NX.form.observacao(c.id), "plus")),
        c.observacoes.length ? el("ul", { class: "notas" }, ...c.observacoes.map((o) => el("li", { class: "nota" }, el("p", { texto: o.texto }), el("span", { class: "suave", texto: `${L.membro(o.autorId).nome} · ${U.dataCompleta(o.data)}` })))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma observação." }),
      ];
    }
    desenharAbas(false);

    secao.replaceChildren(cabeca, el("div", { class: "cliente-grade" }, el("div", { class: "cliente-grade__lado" }, dados, numeros), el("article", { class: "cartao cartao--abas" }, lista, paineis)));
  }

  NX.telas.cliente = { titulo: "Cliente", abrir, montar: montarFicha, atualizar: () => atualizarFicha(document.getElementById("vista-cliente")), get id() { return fichaId; } };
})();
