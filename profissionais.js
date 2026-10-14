/* ==========================================================================
   NEXORA BOOKING — Tela: Profissionais
   Cartões com foto ou iniciais, especialidades, serviços que realiza,
   jornada da semana, folgas e números do mês. Profissional inativo não
   recebe reservas, mas o histórico dele continua.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const M = NX.metricas;
  const R = NX.regras;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const estado = { status: "ativo" };
  let p = null;

  function montar(secao) {
    p = { chips: el("div", { class: "chips", role: "group", "aria-label": "Status" }), corpo: el("div") };
    U.trocar(secao, 
      C().cabecalho({ id: "profissionais", titulo: "Profissionais", sub: "Cada profissional só recebe reservas dos serviços marcados e dentro da própria jornada.", acoes: [C().botao("Novo profissional", "btn--primario", () => NX.form.profissional(), "user-plus")] }),
      p.chips, p.corpo);
  }

  function desenhar() {
    const d = L.dados;
    const hoje = U.hoje();
    const de30 = U.somarDias(hoje, -29);
    const conta = (st) => d.profissionais.filter((x) => !st || x.status === st).length;
    U.trocar(p.chips, ...[["ativo", "Ativos"], ["inativo", "Inativos"], ["", "Todos"]].map(([v, t]) => el("button", { class: "chip", type: "button", "aria-pressed": String(estado.status === v), "data-foco": `prof-${v || "todos"}`, onclick: () => { estado.status = v; atualizar(); } }, t, el("span", { class: "chip__n", texto: String(conta(v)) }))));
    const lista = d.profissionais.filter((x) => !estado.status || x.status === estado.status);
    if (!lista.length) {
      U.trocar(p.corpo, el("div", { class: "cartao" }, C().vazio({ icone: "contact", titulo: estado.status === "inativo" ? "Nenhum profissional inativo" : "Nenhum profissional", acao: C().botao("Novo profissional", "btn--linha btn--pequeno", () => NX.form.profissional(), "user-plus") })));
      return;
    }
    U.trocar(p.corpo, el("div", { class: "cartoes-grade" }, ...lista.map((x) => {
      const r = M.resumo(de30, hoje, { profissionalId: x.id });
      const hojeLista = d.agendamentos.filter((a) => a.profissionalId === x.id && a.data === hoje && a.status !== "cancelado");
      const futuras = R.afetados(d, (a) => a.profissionalId === x.id).length;
      const folgas = (x.folgas || []).filter((f) => f >= hoje).slice(0, 4);
      const bloqueios = d.bloqueios.filter((b) => b.profissionalId === x.id && b.data >= hoje).slice(0, 3);
      return el("article", { class: `prof-cartao prof prof--${x.cor ?? 0}${x.status === "ativo" ? "" : " is-inativo"}` },
        el("div", { class: "prof-cartao__topo" }, C().avatarProf(x, "g"),
          el("div", {}, el("h3", { texto: x.nome }), el("span", { class: "suave", texto: x.especialidades.join(" · ") })),
          C().pilula(x.status === "ativo" ? "Ativo" : "Inativo", x.status, x.status === "ativo" ? "circle-check" : "circle-pause")),
        el("div", { class: "jornada-resumo", "aria-label": "Jornada da semana" }, ...[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const j = x.jornada[dow];
          return el("span", { class: j ? "is-trabalha" : "", title: j ? `${NX.DIAS[dow]}: ${j.inicio}–${j.fim}${j.pausa ? `, intervalo ${j.pausa.inicio}–${j.pausa.fim}` : ""}` : `${NX.DIAS[dow]}: folga` },
            el("b", { texto: NX.DIAS_CURTOS[dow] }), j ? `${j.inicio.slice(0, 2)}–${j.fim.slice(0, 2)}h` : "folga");
        })),
        el("div", { class: "numeros" },
          el("div", {}, el("span", { texto: "Hoje" }), el("b", { texto: U.plural(hojeLista.length, "reserva", "reservas") })),
          el("div", {}, el("span", { texto: "Reservas futuras" }), el("b", { texto: U.numero(futuras) })),
          el("div", {}, el("span", { texto: "Concluídos (30 dias)" }), el("b", { texto: U.numero(r.por.concluido) })),
          el("div", {}, el("span", { texto: "Ocupação (30 dias)" }), el("b", { texto: U.percentual(r.ocupacao) }))),
        el("div", {}, el("p", { class: "rotulo", style: { marginBottom: "6px" }, texto: "Serviços" }),
          el("div", { class: "etiquetas" }, ...x.servicos.map((sid) => { const s = L.servico(sid); return s ? el("span", { class: "etiqueta", title: s.status === "ativo" ? "" : "Serviço inativo", texto: `${s.nome}${s.status === "ativo" ? "" : " (inativo)"}` }) : null; }))),
        folgas.length || bloqueios.length ? el("p", { class: "suave", style: { fontSize: "0.82rem" } }, icone("calendar-off", 13), " ",
          [folgas.length ? `Folgas: ${folgas.map((f) => U.dataCurta(f)).join(", ")}` : "", bloqueios.length ? `Bloqueios: ${bloqueios.map((b) => `${U.dataCurta(b.data)} ${b.diaInteiro ? "dia inteiro" : `${b.inicio}–${b.fim}`}`).join(", ")}` : ""].filter(Boolean).join(" · ")) : null,
        el("div", { class: "cartao-acoes" },
          el("a", { class: "btn btn--linha btn--pequeno", href: `#/agenda?profissional=${x.id}&visao=semana` }, icone("calendar-days", 15), "Agenda"),
          C().botao("Editar", "btn--linha btn--pequeno", () => NX.form.profissional({ id: x.id }), "pencil"),
          x.status === "ativo" ? C().botao("Bloquear horário", "btn--fantasma btn--pequeno", () => NX.form.bloqueio({ profissionalId: x.id }), "calendar-off") : null,
          C().botao(x.status === "ativo" ? "Inativar" : "Ativar", "btn--fantasma btn--pequeno", () => NX.acoes.alternarProfissional(x.id), x.status === "ativo" ? "circle-pause" : "circle-play")));
    })));
  }
  const atualizar = C().comFoco(desenhar);

  NX.telas.profissionais = { titulo: "Profissionais", montar, atualizar };
})();
