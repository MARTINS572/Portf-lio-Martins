/* ==========================================================================
   NEXORA CRM — Tela: Configurações
   Tema, preferências de visualização, perfil demonstrativo, nome da
   empresa, meta mensal e restauração dos dados de demonstração.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;
  let partes = null;

  function grupoOpcoes({ nome, legenda, opcoes, valor, aoMudar, ajuda }) {
    const fs = el("fieldset", { class: "opcoes" }, el("legend", { texto: legenda }));
    const caixa = el("div", { class: "opcoes__lista" });
    opcoes.forEach(([v, rotulo, nomeIcone]) => {
      const id = `${nome}-${v}`;
      const input = el("input", { type: "radio", name: nome, id, value: v, "data-foco": id });
      input.checked = v === valor;
      input.addEventListener("change", () => aoMudar(v));
      caixa.append(el("div", { class: "opcao" }, input, el("label", { for: id }, nomeIcone ? icone(nomeIcone, 16) : null, rotulo)));
    });
    fs.append(caixa);
    if (ajuda) fs.append(el("p", { class: "campo__ajuda", texto: ajuda }));
    return fs;
  }

  function campo(id, rotulo, tipo, valor, extra = {}) {
    const input = el("input", { id, name: id, type: tipo, ...extra });
    input.value = valor;
    return el("div", { class: "campo" }, el("label", { for: id, texto: rotulo }), input, el("p", { class: "campo__erro", id: `${id}-erro` }));
  }

  function montar(secao) {
    partes = { aparencia: el("div"), form: el("form", { class: "cartao config", novalidate: true }), dados: el("div") };
    partes.form.addEventListener("submit", salvarPerfil);
    secao.replaceChildren(
      C().cabecalho({ id: "configuracoes", titulo: "Configurações", sub: "Preferências desta demonstração, salvas só neste navegador" }),
      el("div", { class: "config-grade" }, partes.aparencia, el("div", { class: "config-coluna" }, partes.form, partes.dados)),
    );
  }

  function atualizar() {
    const p = NX.preferencias;
    const d = L.dados;
    const tema = Comum.temaSalvo() || "auto";

    partes.aparencia.replaceChildren(el("section", { class: "cartao config" },
      el("h2", { class: "cartao__titulo", texto: "Aparência e visualização" }),
      grupoOpcoes({ nome: "tema", legenda: "Tema", valor: tema, opcoes: [["light", "Claro", "sun"], ["dark", "Escuro", "moon"], ["auto", "Automático", "monitor"]],
        ajuda: "Automático acompanha o tema do seu aparelho.", aoMudar: (v) => { Comum.definirTema(v === "auto" ? null : v); U.aviso("Tema atualizado."); } }),
      grupoOpcoes({ nome: "densidade", legenda: "Densidade das tabelas", valor: p.densidade, opcoes: [["confortavel", "Confortável"], ["compacta", "Compacta"]],
        aoMudar: (v) => NX.salvarPreferencias({ densidade: v }, "Densidade atualizada.") }),
      grupoOpcoes({ nome: "valores", legenda: "Formato dos valores", valor: p.valoresCompactos ? "compacto" : "completo", opcoes: [["completo", "R$ 12.500,00"], ["compacto", "R$ 12,5 mil"]],
        ajuda: "Vale para cartões e tabelas. Os detalhes sempre mostram o valor completo.",
        aoMudar: (v) => NX.salvarPreferencias({ valoresCompactos: v === "compacto" }, "Formato dos valores atualizado.") }),
      grupoOpcoes({ nome: "menu", legenda: "Menu lateral (no computador)", valor: p.menuRecolhido ? "recolhido" : "expandido", opcoes: [["expandido", "Expandido"], ["recolhido", "Só ícones"]],
        aoMudar: (v) => NX.salvarPreferencias({ menuRecolhido: v === "recolhido" }, "Menu lateral atualizado.") }),
      el("div", { class: "campo" },
        el("label", { for: "pagina-inicial", texto: "Página inicial" }),
        (() => {
          const s = el("select", { id: "pagina-inicial", "data-foco": "pagina-inicial" }, ...[["visao-geral", "Visão geral"], ["pipeline", "Pipeline de vendas"], ["tarefas", "Tarefas"], ["leads", "Leads"]].map(([v, t]) => el("option", { value: v, texto: t })));
          s.value = p.paginaInicial;
          s.addEventListener("change", () => NX.salvarPreferencias({ paginaInicial: s.value }, "Página inicial atualizada."));
          return s;
        })()),
    ));

    partes.form.replaceChildren(
      el("h2", { class: "cartao__titulo", texto: "Perfil e empresa" }),
      el("p", { class: "cartao__sub", texto: "Não há login nesta demonstração: estes dados só personalizam as telas." }),
      el("div", { class: "campos" },
        campo("cfg-nome", "Seu nome", "text", d.perfil.nome, { autocomplete: "name", maxlength: 60 }),
        campo("cfg-cargo", "Cargo", "text", d.perfil.cargo, { maxlength: 60 }),
        campo("cfg-email", "E-mail", "email", d.perfil.email, { maxlength: 80 }),
        campo("cfg-empresa", "Nome da empresa", "text", d.empresa, { maxlength: 50 }),
        campo("cfg-meta", "Meta comercial mensal (R$)", "text", String(d.metaMensal).replace(".", ","), { inputmode: "decimal" })),
      el("div", { class: "config__botoes" }, el("button", { class: "btn btn--primario", type: "submit", texto: "Salvar alterações" })),
    );

    const k = { leads: d.leads.length, clientes: d.clientes.length, negocios: d.negocios.length, tarefas: d.tarefas.length };
    partes.dados.replaceChildren(el("section", { class: "cartao config" },
      el("h2", { class: "cartao__titulo", texto: "Dados da demonstração" }),
      el("p", { class: "cartao__sub", texto: `Hoje há ${U.plural(k.leads, "lead", "leads")}, ${U.plural(k.clientes, "cliente", "clientes")}, ${U.plural(k.negocios, "oportunidade", "oportunidades")} e ${U.plural(k.tarefas, "tarefa", "tarefas")} salvos neste navegador.` }),
      L.persistente ? null : el("p", { class: "alerta-texto" }, icone("triangle-alert", 16), "Este navegador não permite salvar: as mudanças somem ao recarregar."),
      el("div", { class: "config__botoes" },
        C().botao("Restaurar dados originais", "btn--perigo", () => NX.restaurarDados(), "rotate-ccw"),
        C().botao("Mostrar boas-vindas", "btn--linha", () => NX.mostrarBoasVindas(), "house")),
    ));
  }

  function salvarPerfil(e) {
    e.preventDefault();
    const val = (id) => partes.form.querySelector(`#${id}`).value.trim();
    const r = L.salvarConfiguracoes({ nome: val("cfg-nome"), cargo: val("cfg-cargo"), email: val("cfg-email"), empresa: val("cfg-empresa"), metaMensal: val("cfg-meta") });
    const mapa = { nome: "cfg-nome", email: "cfg-email", empresa: "cfg-empresa", metaMensal: "cfg-meta" };
    Object.entries(mapa).forEach(([chave, id]) => {
      const msg = (r.erros || {})[chave] || "";
      const erro = partes.form.querySelector(`#${id}-erro`);
      if (erro) erro.textContent = msg;
      const input = partes.form.querySelector(`#${id}`);
      if (input) input.setAttribute("aria-invalid", String(!!msg));
    });
    if (r.ok) U.aviso("Perfil e empresa atualizados.");
    else { U.aviso("Confira os campos destacados.", "erro"); const primeiro = partes.form.querySelector('[aria-invalid="true"]'); if (primeiro) primeiro.focus(); }
  }

  NX.telas.configuracoes = { titulo: "Configurações", montar, atualizar };
})();
