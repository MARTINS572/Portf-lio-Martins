/* ==========================================================================
   NEXORA STOCK — Tela: Configurações
   Tema, preferências de exibição, empresa e perfil da demonstração,
   informações e limites da demonstração, conferência dos saldos e
   restauração dos dados originais (com confirmação explícita).
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
  let p = null;

  function grupoOpcoes(legenda, nome, opcoes, atual, aoMudar) {
    return el("fieldset", { class: "opcoes" }, el("legend", { texto: legenda }),
      el("div", { class: "opcoes__lista" }, ...opcoes.map(([valor, rotulo, nomeIcone]) => {
        const id = `cfg-${nome}-${valor}`;
        const input = el("input", { type: "radio", name: `cfg-${nome}`, id, value: valor, checked: String(atual) === String(valor), "data-foco": id });
        input.addEventListener("change", () => aoMudar(valor));
        return el("div", { class: "opcao" }, input, el("label", { for: id }, nomeIcone ? icone(nomeIcone, 16) : null, rotulo));
      })));
  }

  function montar(secao) {
    p = { aparencia: el("div"), form: el("form", { class: "cartao config", novalidate: true }), sobre: el("div"), perigo: el("div") };
    p.form.addEventListener("submit", salvarPerfil);
    secao.replaceChildren(
      C().cabecalho({ id: "configuracoes", titulo: "Configurações", sub: "Preferências desta demonstração, salvas só neste navegador" }),
      el("div", { class: "config-grade" },
        el("div", { class: "config-coluna" }, p.aparencia, p.sobre),
        el("div", { class: "config-coluna" }, p.form, p.perigo)));
  }

  function atualizar() {
    const pref = NX.preferencias;
    const tema = Comum.temaSalvo ? Comum.temaSalvo() : null;
    p.aparencia.replaceChildren(el("section", { class: "cartao config" },
      el("h2", { class: "cartao__titulo", texto: "Aparência e exibição" }),
      grupoOpcoes("Tema", "tema", [["light", "Claro", "sun"], ["dark", "Escuro", "moon"], ["sistema", "Seguir o sistema", "monitor"]], tema || "sistema", (v) => {
        Comum.definirTema(v === "sistema" ? null : v);
        U.aviso(v === "sistema" ? "O tema vai seguir o seu sistema." : `Tema ${v === "light" ? "claro" : "escuro"} aplicado e salvo.`);
        atualizar();
      }),
      grupoOpcoes("Densidade das tabelas", "densidade", [["confortavel", "Confortável"], ["compacta", "Compacta"]], pref.densidade, (v) => NX.salvarPreferencias({ densidade: v }, "Densidade atualizada.")),
      grupoOpcoes("Valores em reais", "valores", [["false", "Completos (R$ 12.500,00)"], ["true", "Compactos (R$ 12,5 mil)"]], String(pref.valoresCompactos), (v) => NX.salvarPreferencias({ valoresCompactos: v === "true" }, "Formato dos valores atualizado.")),
      grupoOpcoes("Itens por página nas listas", "pagina", [["10", "10"], ["20", "20"], ["50", "50"]], String(pref.porPagina), (v) => NX.salvarPreferencias({ porPagina: Number(v) }, "Itens por página atualizados.")),
      (() => {
        const sel = el("select", { class: "seletor", id: "cfg-inicial", "data-foco": "cfg-inicial" }, ...[["painel", "Dashboard"], ["produtos", "Produtos"], ["movimentacoes", "Movimentações"], ["pedidos", "Pedidos de compra"]].map(([v, t]) => el("option", { value: v, texto: t })));
        sel.value = pref.paginaInicial;
        sel.addEventListener("change", () => NX.salvarPreferencias({ paginaInicial: sel.value }, "Página inicial atualizada."));
        return el("div", { class: "campo" }, el("label", { for: "cfg-inicial", texto: "Página inicial ao abrir o sistema" }), sel);
      })()));

    const d = L.dados;
    if (!p.form.dataset.montado) {
      const campo = (id, rotulo, valor, extra = {}) => el("div", { class: "campo" }, el("label", { for: id }, rotulo, extra.opcional ? el("span", { class: "campo__opc", texto: " (opcional)" }) : null), el("input", { id, type: extra.tipo || "text", value: valor, maxlength: extra.max || 60, autocomplete: "off", "aria-describedby": `${id}-erro` }), el("p", { class: "campo__erro", id: `${id}-erro` }));
      p.form.replaceChildren(
        el("h2", { class: "cartao__titulo", texto: "Empresa e perfil (demonstração)" }),
        el("p", { class: "cartao__sub", texto: "Não existe login: este perfil é só um nome de exemplo, usado como responsável padrão nas operações." }),
        el("div", { class: "campos" }, campo("cfg-empresa", "Nome da empresa", d.empresa, { max: 50 }), campo("cfg-nome", "Seu nome", d.perfil.nome), campo("cfg-cargo", "Cargo", d.perfil.cargo, { opcional: true }), campo("cfg-email", "E-mail", d.perfil.email, { tipo: "email", max: 90, opcional: true })),
        el("div", { class: "config__botoes" }, el("button", { class: "btn btn--primario", type: "submit", texto: "Salvar alterações" })));
      p.form.dataset.montado = "1";
    }

    const tamanho = L.tamanhoSalvo();
    const ativos = d.produtos.filter((x) => x.status === "ativo").length;
    p.sobre.replaceChildren(el("section", { class: "cartao config" },
      el("h2", { class: "cartao__titulo", texto: "Sobre esta demonstração" }),
      el("div", { class: "numeros", style: { marginTop: 0 } },
        el("div", {}, el("span", { texto: "Produtos" }), el("b", { texto: `${U.numero(ativos)} ativos · ${U.numero(d.produtos.length - ativos)} arquivados` })),
        el("div", {}, el("span", { texto: "Movimentações" }), el("b", { texto: U.numero(d.movimentos.length) })),
        el("div", {}, el("span", { texto: "Fornecedores e categorias" }), el("b", { texto: `${U.numero(d.fornecedores.length)} · ${U.numero(d.categorias.length)}` })),
        el("div", {}, el("span", { texto: "Espaço usado no navegador" }), el("b", { texto: tamanho ? `${U.decimal(tamanho / 1024)} KB` : "não foi possível medir" }))),
      el("ul", { class: "lista-limites" },
        ...[
          ["hard-drive", "Os dados ficam só neste navegador (localStorage). Outra pessoa ou outro aparelho vê os dados originais."],
          ["lock-open", "Não há login, senhas, permissões nem servidor. O \"responsável\" de cada operação é escolhido no formulário."],
          ["bell", "Os alertas aparecem só dentro do sistema. Nada é enviado por e-mail ou celular."],
          ["wallet", "O valor do estoque é uma estimativa (saldo × preço de custo), não o valor contábil."],
          ["database", "Para uso real com uma equipe seria preciso servidor, banco de dados, login e cópias de segurança."],
        ].map(([ic, t]) => el("li", {}, icone(ic, 16), el("span", { texto: t })))),
      el("div", { class: "config__botoes" },
        C().botao("Conferir saldos com o histórico", "btn--linha", () => {
          const r = E.conferirIntegridade();
          if (r.ok) U.aviso(`Tudo confere: o saldo de cada produto bate com as ${U.numero(r.movimentos)} movimentações e com os recebimentos dos pedidos.`);
          else U.aviso(`Encontradas ${r.problemas.length} divergências. Primeira: ${r.problemas[0]}`, "erro");
        }, "list-checks"),
        NX.preferencias.avisoDemoFechado ? C().botao("Mostrar aviso da demonstração", "btn--fantasma", () => { NX.salvarPreferencias({ avisoDemoFechado: false }); NX.ir("painel"); }, "info") : null)));

    p.perigo.replaceChildren(el("section", { class: "cartao config zona-perigo" },
      el("h2", { class: "cartao__titulo", texto: "Restaurar dados originais" }),
      el("p", { class: "cartao__sub", texto: "Apaga tudo o que foi feito nesta demonstração (produtos, movimentações, pedidos, fornecedores e categorias) e volta aos dados fictícios iniciais. As preferências de aparência são mantidas." }),
      el("div", { class: "config__botoes" }, C().botao("Restaurar dados originais…", "btn--perigo", () => NX.restaurarDados(), "rotate-ccw"))));
  }

  function salvarPerfil(e) {
    e.preventDefault();
    const val = (id) => p.form.querySelector(`#${id}`).value.trim();
    const r = L.salvarConfiguracoes({ empresa: val("cfg-empresa"), nome: val("cfg-nome"), cargo: val("cfg-cargo"), email: val("cfg-email") });
    const mapa = { empresa: "cfg-empresa", nome: "cfg-nome", email: "cfg-email" };
    Object.entries(mapa).forEach(([campo, id]) => {
      const msg = (r.erros || {})[campo] || "";
      p.form.querySelector(`#${id}-erro`).textContent = msg;
      p.form.querySelector(`#${id}`).setAttribute("aria-invalid", String(!!msg));
    });
    if (r.ok) U.aviso("Empresa e perfil atualizados.");
    else { U.aviso("Confira os campos destacados.", "erro"); const alvo = p.form.querySelector('[aria-invalid="true"]'); if (alvo) alvo.focus(); }
  }

  NX.telas.configuracoes = { titulo: "Configurações", montar, atualizar, aoSairDados: () => { if (p) delete p.form.dataset.montado; } };
})();
