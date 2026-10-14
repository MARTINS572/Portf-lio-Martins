/* ==========================================================================
   NEXORA AUTO — Tela: Equipe técnica
   Pessoas, funções, especialidades e o que cada técnico fez segundo as
   ordens registradas. Os números são contagens dos registros; não são
   avaliações de produtividade.
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
  const periodo = { id: "30d" };
  let p = null;

  function montar(secao) {
    p = { periodo: el("div", { style: { minWidth: "0", maxWidth: "100%" } }), texto: el("p", { class: "periodo-descricao" }), lista: el("div") };
    U.trocar(secao,
      C().cabecalho({ id: "equipe", titulo: "Equipe técnica", sub: "Os números vêm das ordens de serviço registradas no período. Eles mostram o que foi feito, não avaliam o desempenho de ninguém.", acoes: [
        C().botaoSe("equipe", "Nova pessoa", "btn--primario", () => NX.form.membro(null), "user-plus"),
      ] }),
      el("div", { class: "barra-periodo" }, p.periodo), p.texto, p.lista);
  }

  async function alternar(m) {
    const ativo = m.status === "ativo";
    const abertas = L.dados.ordens.filter((os) => os.tecnicoId === m.id && O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status));
    if (ativo && !(await U.confirmar({ titulo: `Desativar ${m.nome}?`, texto: `${abertas.length ? `Ainda há ${U.plural(abertas.length, "ordem", "ordens")} em andamento com ${m.nome.split(" ")[0]} (${abertas.map((x) => x.numero).join(", ")}). ` : ""}A pessoa deixa de aparecer para novas ordens e na agenda. O histórico continua.`, rotulo: "Desativar", perigo: true }))) return;
    const r = L.alternarMembro(m.id);
    U.aviso(r.ok ? (r.status === "ativo" ? "Pessoa reativada." : "Pessoa desativada.") : r.erro, r.ok ? "ok" : "erro");
  }

  function desenhar() {
    const d = L.dados;
    const intervalo = C().intervaloDe(periodo);
    const { de, ate } = intervalo;
    U.trocar(p.periodo, C().seletorPeriodo(periodo, atualizar, { ids: ["7d", "30d", "90d", "mes", "mes-anterior", "personalizado"], nome: "equipe" }));
    p.texto.textContent = `Período: ${C().descreverPeriodo(intervalo)}.`;
    const pessoas = [...d.equipe].sort((a, b) => (a.status === b.status ? 0 : a.status === "ativo" ? -1 : 1) || Number(b.tecnico) - Number(a.tecnico) || a.nome.localeCompare(b.nome));
    U.trocar(p.lista, el("div", { class: "cartoes-grade" }, ...pessoas.map((m) => {
      const funcao = (NX.FUNCOES.find((f) => f.id === m.funcao) || {}).nome;
      const minhas = d.ordens.filter((os) => os.tecnicoId === m.id);
      const andamento = minhas.filter((os) => O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status));
      const finalizadas = minhas.filter((os) => O.noPeriodo(os.finalizadaEm, de, ate));
      const servicos = finalizadas.reduce((t, os) => t + os.itens.filter((i) => i.tipo === "servico").reduce((a, i) => a + i.quantidade, 0), 0);
      const minutos = finalizadas.reduce((t, os) => t + os.itens.reduce((a, i) => a + (i.tipo === "mao" ? i.quantidade * 60 : i.tipo === "servico" ? ((L.servico(i.refId) || {}).tempo || 0) * i.quantidade : 0), 0), 0);
      const proximos = d.agenda.filter((a) => a.tecnicoId === m.id && a.status === "marcado" && a.data >= U.hoje()).sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`));
      return el("article", { class: `prof-cartao prof prof--${m.cor ?? 0}${m.status !== "ativo" ? " is-inativo" : ""}` },
        el("div", { class: "prof-cartao__topo" }, C().avatarProf(m, "g"),
          el("div", {}, el("h3", { texto: m.nome }), el("span", { class: "suave", texto: funcao }), el("span", { class: "suave", texto: m.especialidade })),
          el("div", { class: "pilha pilha--fim" }, C().pilulaAtivo(m.status), C().pilulaExemplo(m))),
        m.tecnico ? el("div", { class: "etiquetas" }, ...m.categorias.map((c) => el("span", { class: "etiqueta", texto: c }))) : el("p", { class: "suave", texto: "Não é técnico: não recebe ordens nem aparece na agenda de técnicos." }),
        m.tecnico ? el("div", { class: "numeros" },
          el("div", {}, el("span", { texto: "Em andamento agora" }), el("b", { texto: U.numero(andamento.length) })),
          el("div", {}, el("span", { texto: "Ordens finalizadas" }), el("b", { texto: U.numero(finalizadas.length) })),
          el("div", {}, el("span", { texto: "Serviços realizados" }), el("b", { texto: U.numero(servicos) })),
          el("div", {}, el("span", { texto: "Horas de catálogo" }), el("b", { texto: `${U.decimal(minutos / 60).replace(/,00$/, "")} h` }))) : null,
        m.tecnico && proximos.length ? el("p", { class: "suave" }, icone("calendar-days", 13), ` Próximo na agenda: ${U.dataCurta(proximos[0].data)} ${proximos[0].inicio} · ${(NX.TIPOS_AGENDA.find((t) => t.id === proximos[0].tipo) || {}).nome}`) : null,
        m.contato ? el("p", { class: "suave", texto: `Contato: ${U.mascaraTelefone(m.contato)}` }) : null,
        el("div", { class: "cartao-acoes" },
          m.tecnico ? el("a", { class: "btn btn--linha btn--pequeno", href: `#/ordens?tecnico=${m.id}&status=todas` }, icone("clipboard-list", 15), "Ordens") : null,
          m.tecnico && O.podeVer("agenda") ? el("a", { class: "btn btn--linha btn--pequeno", href: `#/agenda?tecnico=${m.id}&visao=semana` }, icone("calendar-days", 15), "Agenda") : null,
          O.pode("equipe") ? C().botao("Editar", "btn--linha btn--pequeno", () => NX.form.membro(m.id), "pencil") : null,
          O.pode("equipe") ? C().botao(m.status === "ativo" ? "Desativar" : "Reativar", "btn--fantasma btn--pequeno", () => alternar(m), m.status === "ativo" ? "power-off" : "power") : null));
    })));
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.equipe = { titulo: "Equipe técnica", montar, atualizar };
})();
