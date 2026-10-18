/* VIOLET STUDIO — liga o painel compartilhado (assets/agenda-estudio/painel.js)
   aos dados e ao jeito desta marca: avatares e ilustrações dos serviços. */
(function () {
  "use strict";
  const { el } = AE.util;
  const loja = AE.loja.criar({ chave: VIOLET.CHAVE, semente: VIOLET.semente });
  const iniciais = (nome) => nome.split(" ").filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  AE.painel.iniciar({
    loja,
    marca: {
      avatar: (p) => el("span", { class: `avatar avatar--${p.arte || "a"}`, "aria-hidden": "true" }, el("span", { texto: iniciais(p.nome) })),
      artesProfissional: [{ valor: "a", rotulo: "Roxo" }, { valor: "b", rotulo: "Preto" }, { valor: "c", rotulo: "Lilás" }],
      artesServico: [
        { valor: "tradicional", rotulo: "Unha nude" }, { valor: "esmalte", rotulo: "Esmalte roxo" }, { valor: "gel", rotulo: "Gel cromado" },
        { valor: "arte", rotulo: "Nail art (constelação)" }, { valor: "francesinha", rotulo: "Francesinha" }, { valor: "pes", rotulo: "Pés (lilás)" },
        { valor: "combo", rotulo: "Mãos e pés" }, { valor: "alongamento", rotulo: "Alongamento" }, { valor: "remocao", rotulo: "Remoção" }, { valor: "decoracao", rotulo: "Pedraria" },
      ],
    },
  });
})();
