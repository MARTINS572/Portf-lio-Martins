/* BLACK COPPER — liga o painel compartilhado (assets/agenda-estudio/painel.js)
   aos dados e ao jeito desta marca: avatares e ilustrações dos serviços. */
(function () {
  "use strict";
  const { el } = AE.util;
  const loja = AE.loja.criar({ chave: BLACKCOPPER.CHAVE, semente: BLACKCOPPER.semente });
  const iniciais = (nome) => nome.split(" ").filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  AE.painel.iniciar({
    loja,
    marca: {
      avatar: (p) => el("span", { class: `avatar avatar--${p.arte || "a"}`, "aria-hidden": "true" }, el("span", { texto: iniciais(p.nome) })),
      artesProfissional: [{ valor: "a", rotulo: "Preto com cobre" }, { valor: "b", rotulo: "Cobre" }, { valor: "c", rotulo: "Creme" }],
      artesServico: [
        { valor: "tesoura", rotulo: "Tesoura e pente" }, { valor: "degrade", rotulo: "Perfil com degradê" }, { valor: "pente", rotulo: "Pente" },
        { valor: "navalha", rotulo: "Navalha" }, { valor: "ferramentas", rotulo: "Bancada" }, { valor: "maquina", rotulo: "Máquina" }, { valor: "pincel", rotulo: "Pincel de barba" },
      ],
    },
  });
})();
