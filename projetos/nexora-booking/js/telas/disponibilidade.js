/* ==========================================================================
   NEXORA BOOKING — Tela: Disponibilidade e horários
   Tudo o que decide se um horário está livre: fuso do estabelecimento,
   expediente da semana, regras de agendamento, feriados e bloqueios.
   Essas regras ficam num lugar só (regras.js) e valem igual para o painel
   e para a página pública. O simulador no fim mostra o que o cliente vê.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const { el, icone } = U;
  const C = () => NX.componentes;
  const E = () => NX.editores;

  const sim = { servicoId: "", profissionalId: "qualquer", data: null };
  let mostrarPassados = false;
  let avisoExpediente = "";
  let p = null;

  function montar(secao) {
    p = { corpo: el("div") };
    U.trocar(secao, 
      C().cabecalho({ id: "disponibilidade", titulo: "Disponibilidade e horários", sub: "Estas regras valem ao mesmo tempo para o painel e para a página de agendamento.", acoes: [
        C().botao("Adicionar feriado", "btn--linha", () => NX.form.feriado(), "calendar-x"),
        C().botao("Bloquear horário", "btn--primario", () => NX.form.bloqueio(), "calendar-off"),
      ] }),
      p.corpo);
  }

  const cartao = (titulo, sub, ...filhos) => el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: titulo }), sub ? el("p", { class: "cartao__sub", texto: sub }) : null)), ...filhos);
  function campo(id, rotulo, controle, { ajuda, erroId } = {}) {
    controle.id = id;
    const erro = el("p", { class: "campo__erro", id: erroId || `${id}-erro`, role: "alert" });
    controle.setAttribute("aria-describedby", `${erro.id}${ajuda ? ` ${id}-ajuda` : ""}`);
    return { caixa: el("div", { class: "campo" }, el("label", { for: id, texto: rotulo }), controle, ajuda ? el("p", { class: "campo__ajuda", id: `${id}-ajuda`, texto: ajuda }) : null, erro), erro, controle };
  }
  const entradaNumero = (valor, min, max) => el("input", { type: "number", inputmode: "numeric", min, max, step: 1, value: String(valor) });

  function desenhar() {
    const d = L.dados;
    const est = d.estabelecimento;
    const regras = est.regras;

    /* ---------- Fuso ---------- */
    const selFuso = el("select", {}, ...NX.FUSOS.map(([id, t]) => el("option", { value: id, texto: t })));
    selFuso.value = est.fuso;
    const cFuso = campo("disp-fuso", "Fuso horário do estabelecimento", selFuso, { ajuda: "Os horários da agenda são sempre os do estabelecimento. Quem abre a página de outro estado vê os mesmos horários, sem conversão." });
    const fusoCartao = cartao("Fuso horário", `Agora no estabelecimento: ${U.dataCompleta(U.hoje())}, ${U.agora().slice(11)}`, cFuso.caixa,
      el("div", { class: "config__botoes", style: { marginTop: "12px" } }, C().botao("Salvar fuso", "btn--linha btn--pequeno", async () => {
        if (selFuso.value === est.fuso) { U.aviso("O fuso já é este.", "info"); return; }
        const ok = await U.confirmar({ titulo: "Mudar o fuso horário?", texto: "As reservas continuam nos mesmos horários de parede (ex.: 14:00 continua 14:00). Muda o que é considerado \"agora\" para bloquear horários que já passaram.", rotulo: "Mudar fuso" });
        if (!ok) return;
        const r = L.salvarFuso(selFuso.value);
        U.aviso(r.ok ? "Fuso horário atualizado." : r.erro, r.ok ? "ok" : "erro");
      }, "globe", { "data-foco": "disp-salvar-fuso" })));

    /* ---------- Expediente ---------- */
    const semana = E().editorSemana(Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((dow) => {
      const h = est.horarios[dow];
      return [dow, h ? { marcado: true, inicio: h.abre, fim: h.fecha, pausaInicio: h.pausa ? h.pausa.inicio : "", pausaFim: h.pausa ? h.pausa.fim : "" } : { marcado: false }];
    })), { rotuloMarcar: "Aberto", rotuloDesmarcado: "Fechado", nome: "expediente" });
    const msgExp = el("p", { class: "janela__erro", role: "alert" });
    const salvarExpediente = () => {
      const v = semana.valor();
      const entrada = Object.fromEntries(Object.entries(v).map(([dow, x]) => [dow, { aberto: x.marcado, abre: x.inicio, fecha: x.fim, pausaInicio: x.pausaInicio, pausaFim: x.pausaFim }]));
      semana.erros({}, "dia");
      msgExp.textContent = "";
      const valido = Object.values(v).every((x) => !x.marcado || (U.horaValida(x.inicio) && U.horaValida(x.fim) && x.inicio < x.fim));
      if (valido) {
        const horariosSim = Object.fromEntries(Object.entries(v).map(([dow, x]) => [dow, x.marcado ? { abre: x.inicio, fecha: x.fim, pausa: x.pausaInicio && x.pausaFim ? { inicio: x.pausaInicio, fim: x.pausaFim } : null } : null]));
        const simulado = { ...d, estabelecimento: { ...est, horarios: horariosSim } };
        const fora = E().reservasForaDaRegra(simulado, () => true);
        const chave = fora.map((a) => a.id).join(",");
        if (fora.length && avisoExpediente !== chave) {
          avisoExpediente = chave;
          msgExp.textContent = `Atenção: ${U.plural(fora.length, "reserva futura fica", "reservas futuras ficam")} fora do novo expediente: ${E().listaAfetadas(fora)}. Elas não são canceladas. Clique em Salvar expediente de novo para confirmar e depois reagende-as.`;
          return;
        }
      }
      const r = L.salvarHorarios(entrada);
      if (!r.ok) { const alvo = semana.erros(r.erros, "dia"); msgExp.textContent = r.erros.geral || "Confira os dias destacados."; if (alvo) alvo.focus(); return; }
      avisoExpediente = "";
      U.aviso("Expediente salvo. A agenda e a página de agendamento já usam os novos horários.");
    };
    const expCartao = cartao("Expediente do estabelecimento", "Dias e horários de funcionamento. A jornada de cada profissional precisa caber aqui.", semana.caixa, msgExp,
      el("div", { class: "config__botoes", style: { marginTop: "12px" } }, C().botao("Salvar expediente", "btn--primario btn--pequeno", salvarExpediente, "save", { "data-foco": "disp-salvar-exp" })));

    /* ---------- Regras ---------- */
    const selGrade = el("select", {}, ...[5, 10, 15, 20, 30, 60].map((n) => el("option", { value: String(n), texto: `De ${n} em ${n} minutos` })));
    selGrade.value = String(regras.intervaloGrade);
    const campos = {
      intervaloGrade: campo("r-grade", "Horários oferecidos", selGrade, { ajuda: "Ex.: de 15 em 15 min, os horários começam às 09:00, 09:15, 09:30…" }),
      antecedenciaMinima: campo("r-antecedencia", "Antecedência mínima (minutos)", entradaNumero(regras.antecedenciaMinima, 0, 10080), { ajuda: "Na página do cliente. 120 = só aceita reservas com 2 horas de antecedência." }),
      diasFuturos: campo("r-dias", "Limite de dias à frente", entradaNumero(regras.diasFuturos, 1, 365), { ajuda: "Na página do cliente: até quantos dias à frente dá para reservar." }),
      cancelamentoHoras: campo("r-cancel", "Cancelamento pelo cliente até (horas antes)", entradaNumero(regras.cancelamentoHoras, 0, 720)),
      reagendamentoHoras: campo("r-reag", "Reagendamento pelo cliente até (horas antes)", entradaNumero(regras.reagendamentoHoras, 0, 720)),
      reagendamentosMax: campo("r-reag-max", "Reagendamentos por reserva (pelo cliente)", entradaNumero(regras.reagendamentosMax, 0, 10)),
    };
    const auto = el("input", { type: "checkbox", id: "r-auto" });
    auto.checked = !!regras.confirmacaoAutomatica;
    const regrasCartao = cartao("Regras de agendamento", "Valem para novas reservas. A política de cancelamento aparece para o cliente na página.",
      el("div", { class: "campos" }, ...Object.values(campos).map((c) => c.caixa)),
      el("div", { class: "campo campo--caixa", style: { marginTop: "12px" } }, el("label", { class: "caixa-marcar", for: "r-auto" }, auto, el("span", {}, el("b", { texto: "Confirmar automaticamente " }), "as reservas feitas pela página (sem marcar, elas chegam como pendentes)"))),
      el("div", { class: "config__botoes", style: { marginTop: "14px" } }, C().botao("Salvar regras", "btn--primario btn--pequeno", () => {
        const v = Object.fromEntries(Object.entries(campos).map(([k, c]) => [k, c.controle.value]));
        v.confirmacaoAutomatica = auto.checked;
        Object.values(campos).forEach((c) => { c.erro.textContent = ""; c.controle.setAttribute("aria-invalid", "false"); });
        const r = L.salvarRegras(v);
        if (!r.ok) {
          Object.entries(r.erros || {}).forEach(([k, m]) => { if (campos[k]) { campos[k].erro.textContent = m; campos[k].controle.setAttribute("aria-invalid", "true"); } });
          const primeiro = Object.keys(r.erros || {}).find((k) => campos[k]);
          if (primeiro) campos[primeiro].controle.focus();
          return;
        }
        U.aviso("Regras salvas. Valem para o painel e para a página de agendamento.");
      }, "save", { "data-foco": "disp-salvar-regras" })));

    /* ---------- Feriados ---------- */
    const hoje = U.hoje();
    const feriados = d.feriados.filter((f) => mostrarPassados || f.data >= hoje);
    const remover = async (titulo, texto, fn, msg) => { const ok = await U.confirmar({ titulo, texto, rotulo: "Remover", perigo: true }); if (ok) { fn(); U.aviso(msg); } };
    const ferCartao = cartao("Feriados e dias fechados", "Nesses dias ninguém recebe reservas.",
      feriados.length ? el("ul", { class: "lista-itens" }, ...feriados.map((f) => el("li", {},
        el("span", { class: "lista-itens__data", texto: U.dataCompleta(f.data) }),
        el("span", { class: "lista-itens__texto" }, el("b", { texto: f.nome }), el("small", { texto: `${NX.DIAS[U.diaDaSemana(f.data)]}${f.data < hoje ? " · já passou" : ` · ${U.relativo(f.data)}`}` })),
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo", type: "button", "aria-label": `Remover feriado ${f.nome} de ${U.dataCompleta(f.data)}`, title: "Remover", onclick: () => remover(`Remover ${f.nome}?`, `${U.dataCompleta(f.data)} volta a seguir o expediente normal e passa a aceitar reservas.`, () => L.removerFeriado(f.id), "Feriado removido.") }, icone("trash", 16))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum feriado cadastrado a partir de hoje." }),
      el("div", { class: "config__botoes", style: { marginTop: "10px" } },
        C().botao("Adicionar feriado", "btn--linha btn--pequeno", () => NX.form.feriado(), "plus"),
        el("button", { class: "link-btn", type: "button", "data-foco": "disp-passados", onclick: () => { mostrarPassados = !mostrarPassados; atualizar(); }, texto: mostrarPassados ? "Esconder os que já passaram" : "Mostrar os que já passaram" })),
      el("p", { class: "campo__ajuda", style: { marginTop: "8px" }, texto: "Os feriados nacionais de exemplo seguem o calendário oficial. Feriados estaduais e municipais precisam ser adicionados." }));

    /* ---------- Bloqueios ---------- */
    const bloqueios = d.bloqueios.filter((b) => b.data >= hoje);
    const bloqCartao = cartao("Bloqueios de agenda", "Períodos sem atendimento de um profissional ou do estabelecimento todo.",
      bloqueios.length ? el("ul", { class: "lista-itens" }, ...bloqueios.map((b) => el("li", {},
        el("span", { class: "lista-itens__data", texto: U.dataCompleta(b.data) }),
        el("span", { class: "lista-itens__texto" }, el("b", { texto: b.motivo }), el("small", { texto: `${b.diaInteiro ? "Dia inteiro" : `${b.inicio}–${b.fim}`} · ${b.profissionalId ? C().nomeDoProf(b.profissionalId) : "Todos os profissionais"}` })),
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo", type: "button", "aria-label": `Remover bloqueio ${b.motivo} de ${U.dataCompleta(b.data)}`, title: "Remover", onclick: () => remover("Remover este bloqueio?", "O período volta a ficar disponível para reservas.", () => L.removerBloqueio(b.id), "Bloqueio removido. O horário voltou a ficar livre.") }, icone("trash", 16))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum bloqueio a partir de hoje." }),
      el("div", { class: "config__botoes", style: { marginTop: "10px" } }, C().botao("Bloquear horário", "btn--linha btn--pequeno", () => NX.form.bloqueio(), "plus")));

    /* ---------- Folgas ---------- */
    const folgas = d.profissionais.filter((x) => x.status === "ativo").flatMap((x) => (x.folgas || []).filter((f) => f >= hoje).map((f) => ({ x, f }))).sort((a, b) => a.f.localeCompare(b.f));
    const folgaCartao = cartao("Folgas dos profissionais", "Dias da semana sem jornada e folgas avulsas são editados no cadastro de cada profissional.",
      el("ul", { class: "lista-itens" }, ...d.profissionais.filter((x) => x.status === "ativo").map((x) => el("li", {},
        C().nomeProf(x.id),
        el("span", { class: "lista-itens__texto" }, el("small", { texto: `Não trabalha: ${[0, 1, 2, 3, 4, 5, 6].filter((dow) => !x.jornada[dow]).map((dow) => NX.DIAS_CURTOS[dow]).join(", ") || "trabalha todos os dias"}` }),
          el("small", { texto: folgas.filter((y) => y.x.id === x.id).length ? `Folgas avulsas: ${folgas.filter((y) => y.x.id === x.id).map((y) => U.dataCurta(y.f)).join(", ")}` : "Sem folgas avulsas marcadas" })),
        el("button", { class: "link-btn", type: "button", texto: "Editar", "aria-label": `Editar jornada de ${x.nome}`, onclick: () => NX.form.profissional({ id: x.id }) })))));

    /* ---------- Simulador (o que o cliente vê) ---------- */
    if (!sim.data || sim.data < hoje) sim.data = hoje;
    const ativos = d.servicos.filter((s) => s.status === "ativo");
    if (!ativos.some((s) => s.id === sim.servicoId)) sim.servicoId = ativos.length ? ativos[0].id : "";
    const habilitados = d.profissionais.filter((x) => x.status === "ativo" && x.servicos.includes(sim.servicoId));
    if (sim.profissionalId !== "qualquer" && !habilitados.some((x) => x.id === sim.profissionalId)) sim.profissionalId = "qualquer";
    const res = sim.servicoId ? R.horarios(d, { servicoId: sim.servicoId, profissionalId: sim.profissionalId, data: sim.data, contexto: "pagina" }) : { slots: [], motivo: "servico_inexistente" };
    const inSim = el("input", { type: "date", class: "seletor", style: { paddingRight: "10px", backgroundImage: "none" }, "aria-label": "Data para conferir", value: sim.data, min: hoje, "data-foco": "sim-data" });
    inSim.addEventListener("change", () => { if (U.dataValida(inSim.value) && inSim.value >= hoje) { sim.data = inSim.value; atualizar(); } });
    const simCartao = cartao("Conferir horários como o cliente vê", "Usa as mesmas regras da página de agendamento, incluindo antecedência mínima e limite de dias.",
      el("div", { class: "barra-filtros" },
        C().seletor(ativos.map((s) => ({ valor: s.id, rotulo: `${s.nome} (${s.duracao} min)`, grupo: s.categoria })), sim.servicoId, (v) => { sim.servicoId = v; atualizar(); }, { rotulo: "Serviço", foco: "sim-servico" }),
        C().seletor([{ valor: "qualquer", rotulo: "Qualquer profissional" }, ...habilitados.map((x) => ({ valor: x.id, rotulo: x.nome }))], sim.profissionalId, (v) => { sim.profissionalId = v; atualizar(); }, { rotulo: "Profissional", foco: "sim-prof" }),
        inSim),
      res.slots.length
        ? el("div", {}, el("p", { class: "campo__ajuda", style: { margin: "4px 0 8px" }, texto: `${U.plural(res.slots.length, "horário disponível", "horários disponíveis")} em ${U.dataLonga(sim.data)}:` }),
          el("div", { class: "etiquetas" }, ...res.slots.map((s) => el("span", { class: "etiqueta mono", title: `${s.inicio}–${s.fim}`, texto: s.inicio }))))
        : el("p", { class: "horarios-vazio" }, icone("calendar-x", 16), el("span", { texto: R.MOTIVO_DIA[res.motivo] || "Nenhum horário disponível." })));

    U.trocar(p.corpo, el("div", { class: "config-coluna" }, expCartao,
      el("div", { class: "config-grade" },
        el("div", { class: "config-coluna" }, regrasCartao, ferCartao, folgaCartao),
        el("div", { class: "config-coluna" }, simCartao, bloqCartao, fusoCartao))));
  }
  const atualizar = C().comFoco(desenhar);

  NX.telas.disponibilidade = { titulo: "Disponibilidade e horários", montar, atualizar };
})();
