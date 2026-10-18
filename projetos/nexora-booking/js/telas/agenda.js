/* ==========================================================================
   NEXORA BOOKING — Tela: Agenda
   Visões de dia (uma coluna por profissional), semana, mês e lista.
   A grade mostra o expediente, as pausas, as folgas e os bloqueios
   calculados pelo motor de regras; clicar num espaço livre abre um novo
   agendamento já com a data, a hora e o profissional preenchidos.
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

  const inicial = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const VISOES = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["lista", "Lista"]];
  const estado = { data: null, visao: null, profissionalId: "", servicoId: "", status: "", mostrarCancelados: null };
  let p = null;
  let ultimaChave = "";

  function aoEntrar(params) {
    if (params.data && U.dataValida(params.data)) estado.data = params.data;
    if (params.visao && VISOES.some(([v]) => v === params.visao)) estado.visao = params.visao;
    if (params.profissional !== undefined) estado.profissionalId = L.profissional(params.profissional) ? params.profissional : "";
  }

  function montar(secao) {
    p = { barra: el("div", { class: "agenda-barra" }), filtros: el("div", { class: "agenda-filtros" }), legenda: el("ul", { class: "agenda-legenda", "aria-label": "Legenda" }), legendaCaixa: null, quadro: el("div", { class: "agenda-quadro" }), resumo: el("p", { class: "contagem", "aria-live": "polite" }) };
    U.trocar(secao, 
      C().cabecalho({ id: "agenda", titulo: "Agenda", sub: " ", acoes: [
        C().botao("Bloquear horário", "btn--linha", () => NX.form.bloqueio({ data: estado.data >= U.hoje() ? estado.data : U.hoje(), profissionalId: estado.profissionalId }), "calendar-off"),
        C().botao("Novo agendamento", "btn--primario", () => NX.reservas.novo({ data: estado.data, profissionalId: estado.profissionalId || undefined, servicoId: estado.servicoId || undefined }), "plus"),
      ] }),
      p.barra, p.filtros, (p.legendaCaixa = el("details", { class: "agenda-legenda-caixa", open: !window.matchMedia("(max-width: 720px)").matches }, el("summary", { texto: "Legenda" }), p.legenda)), p.resumo, p.quadro);
  }

  /* ---------- Filtros ---------- */
  function passaFiltro(a) {
    if (estado.profissionalId && a.profissionalId !== estado.profissionalId) return false;
    if (estado.servicoId && a.servicoId !== estado.servicoId) return false;
    if (estado.status) return a.status === estado.status;
    return a.status !== "cancelado" || estado.mostrarCancelados;
  }
  const reservasDoDia = (data, pid) => L.dados.agendamentos.filter((a) => a.data === data && (!pid || a.profissionalId === pid) && passaFiltro(a)).sort((a, b) => a.inicio.localeCompare(b.inicio));

  // Distribui reservas que se sobrepõem lado a lado (ex.: uma cancelada e a nova no mesmo horário)
  function emFaixas(lista) {
    const pos = new Map();
    let grupo = [];
    let fimGrupo = -1;
    let faixas = [];
    const fechar = () => { grupo.forEach((a) => { pos.get(a.id).total = faixas.length; }); grupo = []; faixas = []; };
    lista.forEach((a) => {
      const ini = U.minutos(a.inicio);
      const fim = U.minutos(a.fim);
      if (ini >= fimGrupo) { fechar(); fimGrupo = -1; }
      let f = faixas.findIndex((x) => x <= ini);
      if (f < 0) { f = faixas.length; faixas.push(fim); } else faixas[f] = fim;
      pos.set(a.id, { faixa: f, total: 1 });
      grupo.push(a);
      fimGrupo = Math.max(fimGrupo, fim);
    });
    fechar();
    return pos;
  }

  /* ---------- Bloco de reserva na grade ---------- */
  // pos: { faixa, total } dentro da coluna; raia: { indice, total } quando a coluna é dividida por profissional
  function evento(a, { topo, px, pos, raia, mini }) {
    const c = L.cliente(a.clienteId);
    const altura = Math.max(22, (U.minutos(a.fim) - U.minutos(a.inicio)) * px - 2);
    const curto = altura < 44;
    const medio = !curto && altura < 62;
    const larguraRaia = raia ? 100 / raia.total : 100;
    const largura = larguraRaia / pos.total;
    const esquerda = (raia ? raia.indice * larguraRaia : 0) + pos.faixa * largura;
    const vao = mini ? 1 : 3;
    const nomeCli = c ? c.nome : "Cliente removido";
    const st = NX.STATUS.find((x) => x.id === a.status);
    return el("button", {
      class: `evento evento--${a.status}${mini ? " evento--mini" : curto ? " evento--curto" : medio ? " evento--medio" : ""} ${C().corProf(a.profissionalId)}`, type: "button", "data-foco": `ev-${a.id}`,
      style: { top: `${topo + 1}px`, height: `${altura}px`, left: `calc(${esquerda}% + ${vao}px)`, width: `calc(${largura}% - ${vao * 2}px)` },
      "aria-label": `${a.inicio} a ${a.fim}: ${nomeCli}, ${a.servicoNome} com ${C().nomeDoProf(a.profissionalId)}. ${st.nome}. Abrir detalhes.`,
      title: `${a.inicio}–${a.fim} · ${nomeCli} · ${a.servicoNome} · ${st.nome}`,
      onclick: (e) => { e.stopPropagation(); NX.reservas.detalhe(a.id); },
    },
    mini ? el("span", { class: "evento__linha evento__linha--topo" }, el("span", { class: "hora", texto: a.inicio })) : null,
    mini ? null : el("span", { class: "evento__linha evento__linha--topo" }, el("span", { class: `evento__status evento__status--${a.status}` }, icone(st.icone, 12)), el("b", { texto: nomeCli }), curto ? el("span", { class: "hora", texto: a.inicio }) : null),
    mini ? null : el("span", { class: "evento__linha" }, el("span", { class: "hora", texto: `${a.inicio}–${a.fim}` })),
    mini ? null : el("span", { class: "evento__linha" }, el("span", { texto: a.servicoNome })));
  }

  /* ---------- Grade de horas (dia e semana) ---------- */
  function grade({ colunas, inicioMin, fimMin, cabecalhos, conteudo, aoClicar }) {
    const pequeno = window.matchMedia("(max-width: 720px)").matches;
    const hora = pequeno ? 56 : 64;
    const px = hora / 60;
    const g = el("div", { class: "grade-agenda", style: { "--colunas": String(colunas.length), "--hora": `${hora}px`, "--min-col": colunas.length > 3 ? (pequeno ? "120px" : "128px") : (pequeno ? "150px" : "170px") } });
    g.append(el("div", { class: "grade-agenda__canto", "aria-hidden": "true", texto: U.fusoAtual() === "America/Sao_Paulo" ? "BRT" : "" }));
    colunas.forEach((col, i) => g.append(cabecalhos(col, i)));
    const horas = el("div", { class: "grade-agenda__horas", "aria-hidden": "true" });
    for (let m = inicioMin; m < fimMin; m += 60) horas.append(el("div", { class: "grade-agenda__hora" }, el("span", { texto: U.hhmm(m) })));
    g.append(horas);
    const altura = ((fimMin - inicioMin) / 60) * hora;
    const passo = L.dados.estabelecimento.regras.intervaloGrade || 15;
    colunas.forEach((col, i) => {
      const coluna = el("div", { class: "grade-agenda__coluna", style: { height: `${altura}px` } });
      conteudo(coluna, col, { px, inicioMin, fimMin });
      if (aoClicar && col.clicavel) {
        const fantasma = el("div", { class: "selecao-vaga", hidden: true, "aria-hidden": "true" });
        coluna.append(fantasma);
        const minutoDe = (e) => {
          const r = coluna.getBoundingClientRect();
          const m = inicioMin + Math.floor(((e.clientY - r.top) / px) / passo) * passo;
          return Math.max(inicioMin, Math.min(fimMin - passo, m));
        };
        coluna.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse" || e.target.closest(".evento")) { fantasma.hidden = true; return; }
          const m = minutoDe(e);
          fantasma.hidden = false;
          fantasma.style.top = `${(m - inicioMin) * px}px`;
          fantasma.style.height = `${Math.max(20, passo * px)}px`;
          U.trocar(fantasma, icone("plus", 12), U.hhmm(m));
        });
        coluna.addEventListener("pointerleave", () => { fantasma.hidden = true; });
        coluna.addEventListener("click", (e) => { if (!e.target.closest(".evento")) aoClicar(col, U.hhmm(minutoDe(e))); });
      } else coluna.classList.add("is-sem-acesso");
      // Horário atual: o que já passou fica levemente sombreado
      if (col.data === U.hoje()) {
        const agora = U.minutos(U.agora().slice(11));
        if (agora > inicioMin) coluna.prepend(el("div", { class: "faixa-passado", style: { height: `${(Math.min(agora, fimMin) - inicioMin) * px}px` } }));
        if (agora >= inicioMin && agora <= fimMin) coluna.append(el("div", { class: "linha-agora", style: { top: `${(agora - inicioMin) * px}px` }, title: `Agora: ${U.hhmm(agora)}` }));
      } else if (col.data < U.hoje()) coluna.prepend(el("div", { class: "faixa-passado", style: { height: "100%" } }));
      g.append(coluna);
    });
    return { g, px, hora };
  }
  // Faixas sombreadas fora das janelas de trabalho
  function sombrear(coluna, janelas, { inicioMin, fimMin, px }) {
    let cursor = inicioMin;
    [...janelas].sort((a, b) => a[0] - b[0]).forEach(([a, b]) => {
      if (a > cursor) coluna.append(el("div", { class: "faixa-fora", style: { top: `${(cursor - inicioMin) * px}px`, height: `${(Math.min(a, fimMin) - cursor) * px}px` } }));
      cursor = Math.max(cursor, b);
    });
    if (cursor < fimMin) coluna.append(el("div", { class: "faixa-fora", style: { top: `${(cursor - inicioMin) * px}px`, height: `${(fimMin - cursor) * px}px` } }));
  }
  function desenharBloqueios(coluna, bloqueios, { inicioMin, fimMin, px }) {
    bloqueios.forEach((b) => {
      const ini = Math.max(inicioMin, b.diaInteiro ? inicioMin : U.minutos(b.inicio));
      const fim = Math.min(fimMin, b.diaInteiro ? fimMin : U.minutos(b.fim));
      if (fim <= ini) return;
      coluna.append(el("div", { class: "faixa-bloqueio", style: { top: `${(ini - inicioMin) * px}px`, height: `${(fim - ini) * px}px` }, title: `Bloqueado: ${b.motivo}` }, icone("lock", 12), el("span", { texto: `${b.diaInteiro ? "Dia inteiro" : `${b.inicio}–${b.fim}`} · ${b.motivo}` })));
    });
  }
  const MOTIVO_COLUNA = { folga: "Folga", folga_semanal: "Não trabalha neste dia", sem_jornada: "Sem jornada neste dia", feriado: "Feriado", fechado: "Fechado" };

  function intervaloHoras(datas, profs) {
    const d = L.dados;
    let ini = Infinity;
    let fim = -Infinity;
    datas.forEach((data) => {
      const h = d.estabelecimento.horarios[U.diaDaSemana(data)];
      if (h) { ini = Math.min(ini, U.minutos(h.abre)); fim = Math.max(fim, U.minutos(h.fecha)); }
      d.agendamentos.forEach((a) => {
        if (a.data !== data || (profs && !profs.includes(a.profissionalId)) || !passaFiltro(a)) return;
        ini = Math.min(ini, U.minutos(a.inicio)); fim = Math.max(fim, U.minutos(a.fim));
      });
    });
    if (!Number.isFinite(ini)) return null;
    return { inicioMin: Math.floor(ini / 60) * 60, fimMin: Math.min(1440, Math.ceil(fim / 60) * 60) };
  }

  function clicarVaga(col, inicio) {
    const data = col.data;
    if (`${data}T${inicio}` <= U.agora()) { U.aviso("Esse horário já passou. Escolha um horário futuro.", "info"); return; }
    NX.reservas.novo({ data, inicio, profissionalId: col.profissionalId || estado.profissionalId || undefined, servicoId: estado.servicoId || undefined });
  }

  /* ---------- Visão: dia ---------- */
  function visaoDia() {
    const d = L.dados;
    const data = estado.data;
    const feriado = d.feriados.find((f) => f.data === data);
    let profs = d.profissionais.filter((x) => (estado.profissionalId ? x.id === estado.profissionalId : x.status === "ativo" || reservasDoDia(data, x.id).length));
    if (estado.servicoId && !estado.profissionalId) profs = profs.filter((x) => x.servicos.includes(estado.servicoId) || reservasDoDia(data, x.id).length);
    const faixa = intervaloHoras([data], profs.map((x) => x.id));
    const lista = reservasDoDia(data).filter((a) => profs.some((x) => x.id === a.profissionalId));
    if (!faixa || !profs.length) {
      return { conteudo: C().vazio({ icone: "calendar-x", titulo: feriado ? `Feriado: ${feriado.nome}` : !profs.length ? "Nenhum profissional para mostrar" : "O estabelecimento não abre neste dia", texto: feriado ? "Ninguém recebe reservas nesta data." : !profs.length ? "Confira os filtros de profissional e serviço." : "Os dias de funcionamento ficam em Disponibilidade e horários.", acao: el("a", { class: "btn btn--linha btn--pequeno", href: "#/disponibilidade" }, icone("clock", 16), "Ver horários") }), lista };
    }
    const colunas = profs.map((x) => ({ data, profissionalId: x.id, prof: x, clicavel: x.status === "ativo" && !feriado }));
    const { g } = grade({
      colunas, ...faixa,
      cabecalhos: (col) => {
        const qtd = reservasDoDia(data, col.profissionalId).filter((a) => a.status !== "cancelado").length;
        return el("div", { class: `grade-agenda__cab ${C().corProf(col.profissionalId)}` }, C().avatarProf(col.prof, "p"),
          el("span", {}, el("b", { texto: col.prof.nome + (col.prof.status === "ativo" ? "" : " (inativo)") }), el("small", { texto: `${U.plural(qtd, "reserva", "reservas")}` })));
      },
      conteudo: (coluna, col, ctx) => {
        const dia = R.janelasDoDia(d, col.prof, data);
        sombrear(coluna, dia.janelas, ctx);
        if (!dia.janelas.length) coluna.append(el("div", { class: "faixa-folga" }, el("span", { texto: dia.motivo === "feriado" ? `Feriado: ${dia.detalhe}` : MOTIVO_COLUNA[dia.motivo] || "Sem atendimento" })));
        desenharBloqueios(coluna, d.bloqueios.filter((b) => b.data === data && (!b.profissionalId || b.profissionalId === col.profissionalId)), ctx);
        const doProf = lista.filter((a) => a.profissionalId === col.profissionalId);
        const pos = emFaixas(doProf);
        doProf.forEach((a) => coluna.append(evento(a, { topo: (U.minutos(a.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(a.id) })));
      },
      aoClicar: (col, inicio) => clicarVaga(col, inicio),
    });
    return { conteudo: el("div", { class: "agenda-rolagem", "data-rolagem": "grade" }, g), lista, faixa, feriado };
  }

  /* ---------- Visão: semana ---------- */
  const inicioSemana = (data) => U.somarDias(data, -((U.diaDaSemana(data) + 6) % 7));    // segunda-feira
  function visaoSemana() {
    const d = L.dados;
    const ini = inicioSemana(estado.data);
    const datas = Array.from({ length: 7 }, (_, i) => U.somarDias(ini, i));
    const pid = estado.profissionalId;
    const faixa = intervaloHoras(datas, pid ? [pid] : null) || { inicioMin: 9 * 60, fimMin: 18 * 60 };
    const prof = pid ? L.profissional(pid) : null;
    const lista = datas.flatMap((data) => reservasDoDia(data, pid));
    const raias = pid ? [] : d.profissionais.filter((x) => x.status === "ativo" || lista.some((a) => a.profissionalId === x.id && a.status !== "cancelado"));
    const colunas = datas.map((data) => ({ data, profissionalId: pid || null, clicavel: !d.feriados.some((f) => f.data === data) && !!d.estabelecimento.horarios[U.diaDaSemana(data)] && (!prof || prof.status === "ativo") }));
    const { g } = grade({
      colunas, ...faixa,
      cabecalhos: (col) => {
        const qtd = reservasDoDia(col.data, pid).filter((a) => a.status !== "cancelado").length;
        return el("button", { class: `grade-agenda__cab grade-agenda__cab--dia${col.data === U.hoje() ? " is-hoje" : ""}`, type: "button", title: "Abrir o dia", "data-foco": `sem-${col.data}`, onclick: () => { estado.data = col.data; estado.visao = "dia"; atualizar(); },
          style: { border: 0, borderLeft: "1px solid var(--borda)", borderBottom: "1px solid var(--borda)", font: "inherit", color: "inherit", cursor: "pointer" } },
        el("span", {}, el("small", { texto: NX.DIAS_CURTOS[U.diaDaSemana(col.data)] }), el("b", { texto: String(Number(col.data.slice(8))) }), el("small", { texto: qtd ? U.plural(qtd, "reserva", "reservas") : "—" })));
      },
      conteudo: (coluna, col, ctx) => {
        const feriado = d.feriados.find((f) => f.data === col.data);
        const h = d.estabelecimento.horarios[U.diaDaSemana(col.data)];
        let janelas = feriado || !h ? [] : [[U.minutos(h.abre), U.minutos(h.fecha)]];
        if (prof) janelas = R.janelasDoDia(d, prof, col.data).janelas;
        sombrear(coluna, janelas, ctx);
        if (feriado || !h) coluna.append(el("div", { class: "faixa-folga" }, el("span", { texto: feriado ? `Feriado: ${feriado.nome}` : "Fechado" })));
        else if (prof && !janelas.length) coluna.append(el("div", { class: "faixa-folga" }, el("span", { texto: MOTIVO_COLUNA[R.janelasDoDia(d, prof, col.data).motivo] || "Sem atendimento" })));
        desenharBloqueios(coluna, d.bloqueios.filter((b) => b.data === col.data && (!b.profissionalId || b.profissionalId === pid)), ctx);
        const doDia = lista.filter((a) => a.data === col.data);
        if (pid) {
          const pos = emFaixas(doDia);
          doDia.forEach((a) => coluna.append(evento(a, { topo: (U.minutos(a.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(a.id) })));
        } else {
          // Todos os profissionais: cada um tem a sua raia (sempre na mesma posição e com a sua cor)
          raias.forEach((x, indice) => {
            const doProf = doDia.filter((a) => a.profissionalId === x.id);
            const pos = emFaixas(doProf);
            doProf.forEach((a) => coluna.append(evento(a, { topo: (U.minutos(a.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(a.id), raia: { indice, total: raias.length }, mini: true })));
          });
        }
      },
      aoClicar: (col, inicio) => clicarVaga(col, inicio),
    });
    const legendaRaias = pid ? null : el("div", { class: "raias-legenda" }, el("span", { class: "suave", texto: "Cada dia é dividido por profissional:" }), ...raias.map((x, i) => el("span", { class: `nome-prof prof prof--${x.cor ?? 0}` }, C().avatarProf(x, "p"), `${i + 1}. ${x.nome.split(" ")[0]}`)), el("span", { class: "suave", texto: "Escolha um profissional no filtro para ver nomes e serviços." }));
    return { conteudo: el("div", {}, legendaRaias, el("div", { class: "agenda-rolagem", "data-rolagem": "grade" }, g)), lista, faixa };
  }

  /* ---------- Visão: mês ---------- */
  function visaoMes() {
    const d = L.dados;
    const primeiro = U.inicioDoMes(estado.data);
    const ultimo = U.fimDoMes(estado.data);
    const ini = inicioSemana(primeiro);
    const fim = U.somarDias(inicioSemana(ultimo), 6);
    const grade = el("div", { class: "mes", role: "grid", "aria-label": `Calendário de ${U.mesAno(estado.data)}` });
    ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].forEach((t) => grade.append(el("div", { class: "mes__cab", role: "columnheader", texto: t })));
    const lista = [];
    for (let data = ini; data <= fim; data = U.somarDias(data, 1)) {
      const doDia = reservasDoDia(data, estado.profissionalId);
      if (data >= primeiro && data <= ultimo) lista.push(...doDia);
      const ativas = doDia.filter((a) => a.status !== "cancelado");
      const pend = ativas.filter((a) => a.status === "pendente").length;
      const feriado = d.feriados.find((f) => f.data === data);
      const fechado = feriado || !d.estabelecimento.horarios[U.diaDaSemana(data)];
      const oc = fechado ? { taxa: 0 } : R.ocupacao(d, { de: data, ate: data, profissionalId: estado.profissionalId || undefined });
      grade.append(el("button", {
        class: `mes__dia${data < primeiro || data > ultimo ? " is-fora-mes" : ""}${data === U.hoje() ? " is-hoje" : ""}${fechado ? " is-fechado" : ""}`, type: "button", role: "gridcell", "data-foco": `mes-${data}`,
        "aria-label": `${U.dataLonga(data)}: ${feriado ? `feriado, ${feriado.nome}` : fechado ? "fechado" : `${U.plural(ativas.length, "reserva", "reservas")}${pend ? `, ${pend} pendentes` : ""}, ocupação ${U.percentual(oc.taxa)}`}. Abrir o dia.`,
        onclick: () => { estado.data = data; estado.visao = "dia"; atualizar(); },
      },
      el("span", { class: "mes__num", texto: String(Number(data.slice(8))) }),
      feriado ? el("span", { class: "mes__nota", texto: feriado.nome }) : fechado ? el("span", { class: "mes__nota", texto: "Fechado" }) : null,
      ativas.length ? el("span", { class: "mes__total" }, icone("calendar-check", 13), U.numero(ativas.length)) : null,
      !fechado ? el("span", { class: "mes__barra", title: `Ocupação ${U.percentual(oc.taxa)}` }, el("i", { style: { width: `${Math.round(Math.min(1, oc.taxa) * 100)}%` } })) : null,
      pend ? el("span", { class: "mes__status" }, el("span", {}, icone("hourglass", 12), `${pend} pend.`)) : null));
    }
    return { conteudo: grade, lista };
  }

  /* ---------- Visão: lista ---------- */
  function visaoLista() {
    const d = L.dados;
    const datas = Array.from({ length: 7 }, (_, i) => U.somarDias(estado.data, i));
    const lista = [];
    const caixa = el("div", { class: "agenda-lista" }, ...datas.map((data) => {
      const doDia = reservasDoDia(data, estado.profissionalId);
      lista.push(...doDia);
      const feriado = d.feriados.find((f) => f.data === data);
      const fechado = !d.estabelecimento.horarios[U.diaDaSemana(data)];
      return el("section", { class: "agenda-lista__dia", "aria-label": U.dataLonga(data) },
        el("h3", {}, inicial(U.dataLonga(data)), el("small", { texto: feriado ? `Feriado: ${feriado.nome}` : fechado ? "Fechado" : U.plural(doDia.filter((a) => a.status !== "cancelado").length, "reserva", "reservas") })),
        doDia.length ? el("ul", { class: "reservas" }, ...doDia.map((a) => el("li", {}, C().linhaReserva(a)))) : el("p", { class: "vazio-pequeno", texto: feriado || fechado ? "Sem atendimento." : "Nenhuma reserva com estes filtros." }));
    }));
    return { conteudo: caixa, lista };
  }

  /* ---------- Atualizar ---------- */
  function rotuloPeriodo() {
    if (estado.visao === "dia") return { titulo: inicial(U.dataLonga(estado.data)), sub: `${U.relativo(estado.data)} · ${U.dataCompleta(estado.data)}` };
    if (estado.visao === "semana") { const ini = inicioSemana(estado.data); const fim = U.somarDias(ini, 6); return { titulo: `${U.dataCurta(ini)} a ${U.dataCurta(fim)}`, sub: `semana de segunda a domingo · ${ini.slice(0, 4)}` }; }
    if (estado.visao === "mes") return { titulo: inicial(U.mesAno(estado.data)), sub: "clique num dia para abrir" };
    return { titulo: `${U.dataCurta(estado.data)} a ${U.dataCurta(U.somarDias(estado.data, 6))}`, sub: "próximos 7 dias a partir da data escolhida" };
  }
  function mover(n) {
    if (estado.visao === "mes") estado.data = U.somarMeses(estado.data, n);
    else estado.data = U.somarDias(estado.data, n * (estado.visao === "dia" ? 1 : 7));
    atualizar();
  }

  function desenhar() {
    const d = L.dados;
    if (!estado.data) estado.data = U.hoje();
    if (!estado.visao) estado.visao = d.estabelecimento.agenda.visaoInicial || "dia";
    if (estado.mostrarCancelados === null) estado.mostrarCancelados = !!d.estabelecimento.agenda.mostrarCancelados;
    if (estado.profissionalId && !L.profissional(estado.profissionalId)) estado.profissionalId = "";
    U.$("#titulo-agenda").parentElement.querySelector(".pagina__sub").textContent = `Horários no fuso do estabelecimento (${(NX.FUSOS.find(([id]) => id === d.estabelecimento.fuso) || [, d.estabelecimento.fuso])[1].split(" (")[0]}). Agora: ${U.agora().slice(11)}.`;

    // Barra de navegação
    const r = rotuloPeriodo();
    const inData = el("input", { type: "date", class: "seletor", style: { paddingRight: "10px", backgroundImage: "none" }, "aria-label": "Ir para a data", value: estado.data, "data-foco": "agenda-data" });
    inData.addEventListener("change", () => { if (U.dataValida(inData.value)) { estado.data = inData.value; atualizar(); } });
    const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Visão da agenda" }, ...VISOES.map(([v, t]) => el("button", { type: "button", "aria-pressed": String(estado.visao === v), "data-foco": `visao-${v}`, texto: t, onclick: () => { estado.visao = v; atualizar(); } })));
    U.trocar(p.barra, 
      el("div", { class: "agenda-nav" },
        el("button", { class: "icone-btn", type: "button", "aria-label": `${estado.visao === "mes" ? "Mês" : estado.visao === "dia" ? "Dia" : "Semana"} anterior`, "data-foco": "agenda-ant", onclick: () => mover(-1) }, icone("chevron-left", 18)),
        C().botao("Hoje", "btn--linha", () => { estado.data = U.hoje(); atualizar(); }, null, { "data-foco": "agenda-hoje", disabled: estado.data === U.hoje() && estado.visao !== "mes" }),
        el("button", { class: "icone-btn", type: "button", "aria-label": `Próximo ${estado.visao === "mes" ? "mês" : estado.visao === "dia" ? "dia" : "período"}`, "data-foco": "agenda-prox", onclick: () => mover(1) }, icone("chevron-right", 18)),
        inData),
      el("div", { class: "agenda-data", "aria-live": "polite" }, el("b", { texto: r.titulo }), el("span", { texto: r.sub })),
      seg);

    // Filtros
    const chipCancel = el("button", { class: "chip", type: "button", "aria-pressed": String(!!estado.mostrarCancelados), "data-foco": "agenda-cancelados", disabled: estado.status === "cancelado", onclick: () => { estado.mostrarCancelados = !estado.mostrarCancelados; atualizar(); } }, icone(estado.mostrarCancelados ? "eye" : "eye-off", 14), "Mostrar canceladas");
    U.trocar(p.filtros, 
      C().seletor(C().opcoesProfissionais({ todos: "Todos os profissionais", incluirInativos: true }), estado.profissionalId, (v) => { estado.profissionalId = v; atualizar(); }, { rotulo: "Filtrar por profissional", foco: "agenda-prof" }),
      C().seletor(C().opcoesServicos({ todos: "Todos os serviços", incluirInativos: true }), estado.servicoId, (v) => { estado.servicoId = v; atualizar(); }, { rotulo: "Filtrar por serviço", foco: "agenda-servico" }),
      C().seletor([{ valor: "", rotulo: "Todos os status" }, ...NX.STATUS.map((s) => ({ valor: s.id, rotulo: s.nome }))], estado.status, (v) => { estado.status = v; atualizar(); }, { rotulo: "Filtrar por status", foco: "agenda-status" }),
      chipCancel,
      (estado.profissionalId || estado.servicoId || estado.status) ? el("button", { class: "link-btn", type: "button", "data-foco": "agenda-limpar", onclick: () => { estado.profissionalId = ""; estado.servicoId = ""; estado.status = ""; atualizar(); } }, icone("x", 14), "Limpar filtros") : null);

    U.trocar(p.legenda, 
      ...NX.STATUS.filter((s) => s.id !== "cancelado" || estado.mostrarCancelados || estado.status === "cancelado").map((s) => el("li", {}, el("span", { class: `evento__status evento__status--${s.id}` }, icone(s.icone, 13)), s.nome)),
      el("li", {}, el("i", { class: "amostra amostra--pendente" }), "Borda tracejada = pendente"),
      el("li", {}, el("i", { class: "amostra amostra--fora" }), "Fora do expediente"),
      el("li", {}, el("i", { class: "amostra amostra--bloqueio" }), "Bloqueio"));

    // Conteúdo
    const chave = `${estado.visao}|${estado.data}|${estado.profissionalId}`;
    const rolagemAntiga = p.quadro.querySelector("[data-rolagem]");
    const antes = rolagemAntiga ? { top: rolagemAntiga.scrollTop, left: rolagemAntiga.scrollLeft } : null;
    const v = { dia: visaoDia, semana: visaoSemana, mes: visaoMes, lista: visaoLista }[estado.visao]();
    U.trocar(p.quadro, v.conteudo);
    const ativas = v.lista.filter((a) => a.status !== "cancelado");
    const canc = v.lista.filter((a) => a.status === "cancelado").length;
    const pend = ativas.filter((a) => a.status === "pendente").length;
    p.resumo.textContent = `${U.plural(ativas.length, "reserva", "reservas")}${pend ? ` · ${U.plural(pend, "pendente", "pendentes")}` : ""}${canc ? ` · ${U.plural(canc, "cancelada", "canceladas")} (horário liberado)` : ""}${v.feriado && estado.visao === "dia" ? `. Feriado (${v.feriado.nome}): sem atendimento neste dia.` : estado.visao === "dia" || estado.visao === "semana" ? ". Clique num espaço livre para agendar." : ""}`;

    // Rolagem: mantém a posição ao atualizar; ao mudar de dia, vai para perto de agora (ou do início do expediente)
    const rol = p.quadro.querySelector("[data-rolagem]");
    if (rol) {
      if (chave === ultimaChave && antes) { rol.scrollTop = antes.top; rol.scrollLeft = antes.left; }
      else if (v.faixa) {
        const hora = parseFloat(rol.querySelector(".grade-agenda").style.getPropertyValue("--hora")) || 64;
        const agoraMin = U.minutos(U.agora().slice(11));
        const temHoje = estado.visao === "dia" ? estado.data === U.hoje() : U.diasEntre(inicioSemana(estado.data), U.hoje()) >= 0 && U.diasEntre(inicioSemana(estado.data), U.hoje()) < 7;
        const alvo = temHoje && agoraMin < v.faixa.fimMin ? Math.max(v.faixa.inicioMin, agoraMin - 60) : v.faixa.inicioMin;
        rol.scrollTop = ((alvo - v.faixa.inicioMin) / 60) * hora;
      }
    }
    ultimaChave = chave;
  }

  const atualizar = C().comFoco(desenhar);

  NX.telas.agenda = { titulo: "Agenda", montar, atualizar, aoEntrar, estado };
})();
