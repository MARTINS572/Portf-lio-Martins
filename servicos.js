/* ==========================================================================
   NEXORA BOOKING — Tela: Serviços
   Cartões com preço, duração, categoria, quem realiza e quantas reservas
   tem no mês. Serviço inativo não recebe reservas novas, mas continua no
   histórico e nos relatórios.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const estado = { status: "ativo", categoria: "", busca: "" };
  let p = null;

  function aoEntrar(params) { if (params.status !== undefined) estado.status = ["ativo", "inativo", ""].includes(params.status) ? params.status : "ativo"; }
  function montar(secao) {
    const busca = C().campoBusca({ placeholder: "Buscar serviço", rotulo: "Buscar serviço", foco: "srv-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; atualizar(); } });
    p = { busca, chips: el("div", { class: "chips", role: "group", "aria-label": "Status" }), seletores: el("div", { style: { display: "contents" } }), corpo: el("div") };
    p.filtros = el("div", {}, p.chips, el("div", { class: "barra-filtros" }, busca.caixa, p.seletores));
    U.trocar(secao, 
      C().cabecalho({ id: "servicos", titulo: "Serviços", sub: "Preço e duração usados nas novas reservas. Reservas já feitas guardam os valores da época.", acoes: [C().botao("Novo serviço", "btn--primario", () => NX.form.servico(), "plus")] }),
      p.filtros, p.corpo);
  }

  function desenhar() {
    const d = L.dados;
    const conta = (st) => d.servicos.filter((s) => !st || s.status === st).length;
    U.trocar(p.chips, ...[["ativo", "Ativos"], ["inativo", "Inativos"], ["", "Todos"]].map(([v, t]) => el("button", { class: "chip", type: "button", "aria-pressed": String(estado.status === v), "data-foco": `srv-${v || "todos"}`, onclick: () => { estado.status = v; atualizar(); } }, t, el("span", { class: "chip__n", texto: String(conta(v)) }))));
    U.trocar(p.seletores, C().seletor([{ valor: "", rotulo: "Todas as categorias" }, ...L.categorias().map((c) => ({ valor: c, rotulo: c }))], estado.categoria, (v) => { estado.categoria = v; atualizar(); }, { rotulo: "Categoria", foco: "srv-cat" }));

    const ini = U.inicioDoMes(U.hoje());
    const fim = U.fimDoMes(U.hoje());
    const lista = d.servicos.filter((s) => (!estado.status || s.status === estado.status) && (!estado.categoria || s.categoria === estado.categoria) && (!estado.busca.trim() || U.contem(s.nome, estado.busca) || U.contem(s.categoria, estado.busca)))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
    if (!lista.length) {
      U.trocar(p.corpo, el("div", { class: "cartao" }, C().vazio({ icone: "scissors", titulo: "Nenhum serviço encontrado", texto: estado.status === "inativo" ? "Nenhum serviço desativado." : "Mude a busca ou os filtros.", acao: C().botao("Novo serviço", "btn--linha btn--pequeno", () => NX.form.servico(), "plus") })));
      return;
    }
    U.trocar(p.corpo, el("div", { class: "cartoes-grade" }, ...lista.map((s) => {
      const profs = d.profissionais.filter((x) => x.servicos.includes(s.id) && x.status === "ativo");
      const noMes = d.agendamentos.filter((a) => a.servicoId === s.id && a.data >= ini && a.data <= fim && a.status !== "cancelado").length;
      return el("article", { class: `servico-cartao${s.status === "ativo" ? "" : " is-inativo"}` },
        el("div", { class: "servico-cartao__topo" }, C().miniaturaServico(s),
          el("div", {}, el("h3", { texto: s.nome }), el("span", { class: "suave", texto: s.categoria })),
          C().pilula(s.status === "ativo" ? "Ativo" : "Inativo", s.status, s.status === "ativo" ? "circle-check" : "circle-pause")),
        s.descricao ? el("p", { texto: s.descricao }) : null,
        el("div", { class: "servico-cartao__numeros" },
          el("span", {}, icone("tag", 15), el("b", { texto: U.moeda(s.preco) })),
          el("span", {}, icone("clock", 15), el("b", { texto: `${s.duracao} min` })),
          el("span", {}, icone("calendar-check", 15), el("b", { texto: U.numero(noMes) }), " no mês")),
        el("div", {}, el("p", { class: "rotulo", style: { marginBottom: "6px" }, texto: "Quem realiza" }),
          profs.length ? el("div", { class: "etiquetas" }, ...profs.map((x) => el("span", { class: "etiqueta" }, C().nomeProf(x.id, { curto: true })))) : el("p", { class: "alerta-texto" }, icone("triangle-alert", 15), "Nenhum profissional ativo: não aparece para reservas.")),
        el("div", { class: "cartao-acoes" },
          C().botao("Editar", "btn--linha btn--pequeno", () => NX.form.servico({ id: s.id }), "pencil"),
          C().botao(s.status === "ativo" ? "Desativar" : "Ativar", "btn--fantasma btn--pequeno", () => NX.acoes.alternarServico(s.id), s.status === "ativo" ? "circle-pause" : "circle-play"),
          el("a", { class: "btn btn--fantasma btn--pequeno", href: `#/agendamentos?servico=${s.id}&periodo=futuros&status=ativos` }, icone("list", 15), "Reservas")));
    })));
  }

  const atualizar = C().comFoco(desenhar);

  NX.telas.servicos = { titulo: "Serviços", montar, atualizar, aoEntrar };
})();
