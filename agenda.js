/* ==========================================================================
   NEXORA AUTO — Tela: Agenda da oficina
   Visões de dia (uma coluna por técnico), semana, mês e lista. Técnicos e boxes
   são recursos limitados: a regra não deixa marcar dois compromissos no
   mesmo horário. Previsões de conclusão das ordens aparecem com outro
   desenho (tracejado, com bandeira), porque não ocupam técnico nem box.
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

  const inicial = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const VISOES = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["lista", "Lista"]];
  // status: "" = tudo menos os cancelados · "todos" = inclui cancelados · ou uma situação específica
  const PADRAO = () => ({ data: null, visao: null, tecnico: "", tipo: "", status: "" });
  const estado = PADRAO();
  let p = null;
  let ultimaChave = "";
  const SEM = "__sem";
  const tipoDe = (id) => NX.TIPOS_AGENDA.find((t) => t.id === id) || { nome: id, icone: "calendar" };

  function aoEntrar(params) {
    if (params.data && U.dataValida(params.data)) estado.data = params.data;
    if (params.visao && VISOES.some(([v]) => v === params.visao)) estado.visao = params.visao;
    if (params.tecnico !== undefined) estado.tecnico = L.membro(params.tecnico) ? params.tecnico : "";
  }

  function montar(secao) {
    p = { barra: el("div", { class: "agenda-barra" }), filtros: el("div", { class: "agenda-filtros" }), legenda: el("ul", { class: "agenda-legenda", "aria-label": "Legenda" }), quadro: el("div", { class: "agenda-quadro" }), resumo: el("p", { class: "contagem", "aria-live": "polite" }) };
    U.trocar(secao,
      C().cabecalho({ id: "agenda", titulo: "Agenda da oficina", sub: " ", acoes: [
        C().botaoSe("agenda", "Agendar", "btn--primario", () => NX.form.compromisso(null, { data: estado.data >= U.hoje() ? estado.data : U.hoje(), tecnicoId: estado.tecnico }), "calendar-plus"),
      ] }),
      p.barra, p.filtros, el("details", { class: "agenda-legenda-caixa", open: !window.matchMedia("(max-width: 720px)").matches }, el("summary", { texto: "Legenda" }), p.legenda), p.resumo, p.quadro);
  }

  /* ---------- Dados ---------- */
  const passaStatus = (c) => (estado.status === "todos" ? true : estado.status ? c.status === estado.status : c.status !== "cancelado");
  const passa = (c) => passaStatus(c) && (!estado.tipo || c.tipo === estado.tipo) && (!estado.tecnico || c.tecnicoId === estado.tecnico);
  const doDia = (data) => L.dados.agenda.filter((c) => c.data === data && passa(c)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const previsoesDoDia = (data) => (estado.tipo || (estado.status && estado.status !== "todos") ? [] : O.previsoes(data, data).filter((os) => !estado.tecnico || os.tecnicoId === estado.tecnico)).sort((a, b) => a.previsao.localeCompare(b.previsao));
  const corDe = (tid) => { const m = tid ? L.membro(tid) : null; return m ? `prof prof--${m.cor ?? 0}` : "prof prof--sem"; };
  function titulo(c) {
    if (c.tipo === "indisponivel") return c.observacoes || "Indisponível";
    if (c.veiculoId) { const v = L.veiculo(c.veiculoId); return v ? `${L.mostrarPlaca(v.placa)} · ${v.modelo}` : "Veículo"; }
    if (c.clienteId) return C().nomeDoCliente(c.clienteId);
    return c.observacoes || tipoDe(c.tipo).nome;
  }

  // Compromissos que se sobrepõem na mesma coluna ficam lado a lado
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

  function evento(c, { topo, px, pos, raia, mini }) {
    const t = tipoDe(c.tipo);
    const altura = Math.max(22, (U.minutos(c.fim) - U.minutos(c.inicio)) * px - 2);
    const curto = altura < 44;
    const larguraRaia = raia ? 100 / raia.total : 100;
    const largura = larguraRaia / pos.total;
    const esquerda = (raia ? raia.indice * larguraRaia : 0) + pos.faixa * largura;
    const vao = mini ? 1 : 3;
    const tit = titulo(c);
    const recursos = [c.tecnicoId ? C().nomeDoTecnico(c.tecnicoId).split(" ")[0] : null, c.box ? `Box ${c.box}` : null].filter(Boolean).join(" · ");
    const st = NX.STATUS_AGENDA.find((s) => s.id === c.status);
    return el("button", {
      class: `evento evento--${c.status} evento--tipo-${c.tipo}${mini ? " evento--mini" : curto ? " evento--curto" : ""} ${corDe(c.tecnicoId)}`, type: "button", "data-foco": `ev-${c.id}`,
      style: { top: `${topo + 1}px`, height: `${altura}px`, left: `calc(${esquerda}% + ${vao}px)`, width: `calc(${largura}% - ${vao * 2}px)` },
      "aria-label": `${c.inicio} a ${c.fim}: ${t.nome}, ${tit}${recursos ? `, ${recursos}` : ""}. ${st.nome}. Abrir detalhes.`,
      title: `${c.inicio}–${c.fim} · ${t.nome} · ${tit}${recursos ? ` · ${recursos}` : ""} · ${st.nome}`,
      onclick: (e) => { e.stopPropagation(); detalhe(c.id); },
    },
    mini ? el("span", { class: "evento__linha evento__linha--topo" }, icone(t.icone, 11), el("span", { class: "hora", texto: c.inicio })) : null,
    mini ? null : el("span", { class: "evento__linha evento__linha--topo" }, icone(t.icone, 12), el("b", { texto: tit }), curto ? el("span", { class: "hora", texto: c.inicio }) : null),
    mini ? null : el("span", { class: "evento__linha" }, el("span", { class: "hora", texto: `${c.inicio}–${c.fim}` }), el("span", { texto: ` · ${t.nome}` })),
    mini || curto ? null : el("span", { class: "evento__linha" }, el("span", { texto: [recursos, st.id !== "marcado" ? st.nome : null].filter(Boolean).join(" · ") || "Sem técnico nem box" })));
  }
  function marcadorPrevisao(os, { px, inicioMin, fimMin }) {
    const m = Math.min(fimMin - 10, Math.max(inicioMin, U.minutos(os.previsao.slice(11))));
    const v = L.veiculo(os.veiculoId);
    return el("a", { class: "previsao-marca", href: `#/ordens/${os.id}`, style: { top: `${(m - inicioMin) * px}px` }, title: `Previsão de conclusão da ${os.numero} às ${os.previsao.slice(11)} (não ocupa técnico nem box)`, "aria-label": `Previsão de conclusão: ${os.numero}, ${v ? L.mostrarPlaca(v.placa) : ""}, às ${os.previsao.slice(11)}. Abrir ordem.`, onclick: (e) => e.stopPropagation() },
      icone("flag", 11), el("span", { texto: `${os.previsao.slice(11)} ${os.numero}` }));
  }

  /* ---------- Grade de horas ---------- */
  function grade({ colunas, inicioMin, fimMin, cabecalhos, conteudo, aoClicar }) {
    const pequeno = window.matchMedia("(max-width: 720px)").matches;
    const hora = pequeno ? 56 : 64;
    const px = hora / 60;
    const g = el("div", { class: "grade-agenda", style: { "--colunas": String(colunas.length), "--hora": `${hora}px`, "--min-col": colunas.length > 3 ? (pequeno ? "128px" : "136px") : (pequeno ? "150px" : "170px") } });
    g.append(el("div", { class: "grade-agenda__canto", "aria-hidden": "true", texto: "BRT" }));
    colunas.forEach((col, i) => g.append(cabecalhos(col, i)));
    const horas = el("div", { class: "grade-agenda__horas", "aria-hidden": "true" });
    for (let m = inicioMin; m < fimMin; m += 60) horas.append(el("div", { class: "grade-agenda__hora" }, el("span", { texto: U.hhmm(m) })));
    g.append(horas);
    const altura = ((fimMin - inicioMin) / 60) * hora;
    const passo = 30;
    colunas.forEach((col) => {
      const coluna = el("div", { class: "grade-agenda__coluna", style: { height: `${altura}px` } });
      conteudo(coluna, col, { px, inicioMin, fimMin });
      if (aoClicar && col.clicavel && O.pode("agenda")) {
        const fantasma = el("div", { class: "selecao-vaga", hidden: true, "aria-hidden": "true" });
        coluna.append(fantasma);
        const minutoDe = (e) => {
          const r = coluna.getBoundingClientRect();
          const m = inicioMin + Math.floor(((e.clientY - r.top) / px) / passo) * passo;
          return Math.max(inicioMin, Math.min(fimMin - passo, m));
        };
        coluna.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse" || e.target.closest(".evento, .previsao-marca")) { fantasma.hidden = true; return; }
          const m = minutoDe(e);
          fantasma.hidden = false;
          fantasma.style.top = `${(m - inicioMin) * px}px`;
          fantasma.style.height = `${Math.max(20, passo * px)}px`;
          U.trocar(fantasma, icone("plus", 12), U.hhmm(m));
        });
        coluna.addEventListener("pointerleave", () => { fantasma.hidden = true; });
        coluna.addEventListener("click", (e) => { if (!e.target.closest(".evento, .previsao-marca")) aoClicar(col, U.hhmm(minutoDe(e))); });
      } else coluna.classList.add("is-sem-acesso");
      if (col.data === U.hoje()) {
        const agora = U.minutos(U.agora().slice(11));
        if (agora > inicioMin) coluna.prepend(el("div", { class: "faixa-passado", style: { height: `${(Math.min(agora, fimMin) - inicioMin) * px}px` } }));
        if (agora >= inicioMin && agora <= fimMin) coluna.append(el("div", { class: "linha-agora", style: { top: `${(agora - inicioMin) * px}px` }, title: `Agora: ${U.hhmm(agora)}` }));
      } else if (col.data < U.hoje()) coluna.prepend(el("div", { class: "faixa-passado", style: { height: "100%" } }));
      g.append(coluna);
    });
    return { g, px, hora };
  }
  function sombrear(coluna, h, { inicioMin, fimMin, px }) {
    if (!h) { coluna.append(el("div", { class: "faixa-folga" }, el("span", { texto: "Oficina fechada" }))); return; }
    const a = U.minutos(h.abre);
    const b = U.minutos(h.fecha);
    if (a > inicioMin) coluna.append(el("div", { class: "faixa-fora", style: { top: "0px", height: `${(a - inicioMin) * px}px` } }));
    if (b < fimMin) coluna.append(el("div", { class: "faixa-fora", style: { top: `${(b - inicioMin) * px}px`, height: `${(fimMin - b) * px}px` } }));
  }
  function intervaloHoras(datas) {
    let ini = Infinity;
    let fim = -Infinity;
    datas.forEach((data) => {
      const h = L.dados.oficina.horarios[U.diaDaSemana(data)];
      if (h) { ini = Math.min(ini, U.minutos(h.abre)); fim = Math.max(fim, U.minutos(h.fecha)); }
      doDia(data).forEach((c) => { ini = Math.min(ini, U.minutos(c.inicio)); fim = Math.max(fim, U.minutos(c.fim)); });
    });
    if (!Number.isFinite(ini)) return null;
    return { inicioMin: Math.floor(ini / 60) * 60, fimMin: Math.min(1440, Math.ceil(fim / 60) * 60) };
  }
  function clicarVaga(col, inicio) {
    if (`${col.data}T${inicio}` <= U.agora()) { U.aviso("Esse horário já passou. Escolha um horário futuro.", "info"); return; }
    const fim = U.hhmm(Math.min(U.minutos(inicio) + 60, 1439));
    NX.form.compromisso(null, { data: col.data, inicio, fim, tecnicoId: col.tecnicoId && col.tecnicoId !== SEM ? col.tecnicoId : estado.tecnico || "", tipo: col.tecnicoId && col.tecnicoId !== SEM ? "servico" : "recepcao" });
  }
  // Tempo livre do técnico no dia (expediente menos compromissos, sem contar previsões)
  function livre(tid, data) {
    const h = L.dados.oficina.horarios[U.diaDaSemana(data)];
    if (!h) return 0;
    const a = U.minutos(h.abre);
    const b = U.minutos(h.fecha);
    const ocupado = L.dados.agenda.filter((c) => c.data === data && c.tecnicoId === tid && c.status !== "cancelado").map((c) => [Math.max(a, U.minutos(c.inicio)), Math.min(b, U.minutos(c.fim))]).filter(([x, y]) => y > x).sort((x, y) => x[0] - y[0]);
    let total = 0;
    let cursor = a;
    ocupado.forEach(([x, y]) => { if (y > cursor) { total += y - Math.max(x, cursor); cursor = Math.max(cursor, y); } });
    return Math.max(0, b - a - total);
  }
  const horasTexto = (min) => (min % 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min / 60}h`);

  /* ---------- Visão: dia ---------- */
  function visaoDia() {
    const d = L.dados;
    const data = estado.data;
    const h = d.oficina.horarios[U.diaDaSemana(data)];
    const lista = doDia(data);
    const prevs = previsoesDoDia(data);
    const tecs = d.equipe.filter((m) => m.tecnico && (estado.tecnico ? m.id === estado.tecnico : m.status === "ativo" || lista.some((c) => c.tecnicoId === m.id)));
    const semTec = lista.filter((c) => !c.tecnicoId);
    const colunas = [...tecs.map((m) => ({ data, tecnicoId: m.id, m, clicavel: m.status === "ativo" && !!h })), ...(!estado.tecnico ? [{ data, tecnicoId: SEM, clicavel: !!h }] : [])];
    const faixa = intervaloHoras([data]);
    if (!faixa) return { conteudo: C().vazio({ icone: "calendar-x", titulo: "A oficina não abre neste dia", texto: "Os dias e horários de funcionamento ficam em Configurações.", acao: O.podeVer("configuracoes") ? el("a", { class: "btn btn--linha btn--pequeno", href: "#/configuracoes" }, icone("clock", 16), "Ver horários") : null }), lista, prevs };
    const { g } = grade({
      colunas, ...faixa,
      cabecalhos: (col) => {
        if (col.tecnicoId === SEM) return el("div", { class: "grade-agenda__cab prof prof--sem" }, el("span", { class: "avatar-prof avatar-prof--p prof prof--sem", "aria-hidden": "true" }, icone("car-front", 12)), el("span", {}, el("b", { texto: "Sem técnico" }), el("small", { texto: "Recepção, entregas e boxes" })));
        const min = livre(col.tecnicoId, data);
        return el("div", { class: `grade-agenda__cab ${corDe(col.tecnicoId)}` }, C().avatarProf(col.m, "p"),
          el("span", {}, el("b", { texto: col.m.nome + (col.m.status === "ativo" ? "" : " (inativo)") }), el("small", { texto: h ? `Livre: ${horasTexto(min)}` : "Fechado" })));
      },
      conteudo: (coluna, col, ctx) => {
        sombrear(coluna, h, ctx);
        const daColuna = col.tecnicoId === SEM ? semTec : lista.filter((c) => c.tecnicoId === col.tecnicoId);
        daColuna.filter((c) => c.tipo === "indisponivel").forEach((c) => {
          const ini = Math.max(ctx.inicioMin, U.minutos(c.inicio));
          const fim = Math.min(ctx.fimMin, U.minutos(c.fim));
          coluna.append(el("button", { class: "faixa-bloqueio faixa-bloqueio--botao", type: "button", style: { top: `${(ini - ctx.inicioMin) * ctx.px}px`, height: `${(fim - ini) * ctx.px}px` }, title: `Indisponível: ${c.observacoes}`, "aria-label": `${c.inicio} a ${c.fim}: técnico indisponível, ${c.observacoes}. Abrir detalhes.`, onclick: (e) => { e.stopPropagation(); detalhe(c.id); } }, icone("user-x", 12), el("span", { texto: `${c.inicio}–${c.fim} · ${c.observacoes || "Indisponível"}` })));
        });
        const eventos = daColuna.filter((c) => c.tipo !== "indisponivel");
        const pos = emFaixas(eventos);
        eventos.forEach((c) => coluna.append(evento(c, { topo: (U.minutos(c.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(c.id) })));
        const prevCol = col.tecnicoId === SEM ? prevs.filter((os) => !os.tecnicoId || !tecs.some((m) => m.id === os.tecnicoId)) : prevs.filter((os) => os.tecnicoId === col.tecnicoId);
        prevCol.forEach((os) => coluna.append(marcadorPrevisao(os, ctx)));
      },
      aoClicar: clicarVaga,
    });
    return { conteudo: el("div", { class: "agenda-rolagem", "data-rolagem": "grade" }, g), lista, prevs, faixa };
  }

  /* ---------- Visão: semana ---------- */
  const inicioSemana = (data) => U.somarDias(data, -((U.diaDaSemana(data) + 6) % 7));
  function visaoSemana() {
    const d = L.dados;
    const ini = inicioSemana(estado.data);
    const datas = Array.from({ length: 7 }, (_, i) => U.somarDias(ini, i));
    const faixa = intervaloHoras(datas) || { inicioMin: 8 * 60, fimMin: 18 * 60 };
    const lista = datas.flatMap(doDia);
    const prevs = datas.flatMap(previsoesDoDia);
    const tid = estado.tecnico;
    const raias = tid ? [] : [...d.equipe.filter((m) => m.tecnico && (m.status === "ativo" || lista.some((c) => c.tecnicoId === m.id))), { id: SEM, nome: "Sem técnico", cor: "sem" }];
    const colunas = datas.map((data) => ({ data, tecnicoId: tid || null, clicavel: !!d.oficina.horarios[U.diaDaSemana(data)] }));
    const { g } = grade({
      colunas, ...faixa,
      cabecalhos: (col) => {
        const qtd = doDia(col.data).filter((c) => c.status !== "cancelado" && c.tipo !== "indisponivel").length;
        return el("button", { class: `grade-agenda__cab grade-agenda__cab--dia${col.data === U.hoje() ? " is-hoje" : ""}`, type: "button", title: "Abrir o dia", "data-foco": `sem-${col.data}`, onclick: () => { estado.data = col.data; estado.visao = "dia"; atualizar(); } },
          el("span", {}, el("small", { texto: NX.DIAS_CURTOS[U.diaDaSemana(col.data)] }), el("b", { texto: String(Number(col.data.slice(8))) }), el("small", { texto: qtd ? U.plural(qtd, "compromisso", "compromissos") : "—" })));
      },
      conteudo: (coluna, col, ctx) => {
        sombrear(coluna, d.oficina.horarios[U.diaDaSemana(col.data)], ctx);
        const doD = lista.filter((c) => c.data === col.data);
        if (tid) {
          const ev = doD;
          const pos = emFaixas(ev);
          ev.forEach((c) => coluna.append(evento(c, { topo: (U.minutos(c.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(c.id) })));
        } else {
          raias.forEach((m, indice) => {
            const ev = doD.filter((c) => (m.id === SEM ? !c.tecnicoId : c.tecnicoId === m.id));
            const pos = emFaixas(ev);
            ev.forEach((c) => coluna.append(evento(c, { topo: (U.minutos(c.inicio) - ctx.inicioMin) * ctx.px, px: ctx.px, pos: pos.get(c.id), raia: { indice, total: raias.length }, mini: true })));
          });
        }
        prevs.filter((os) => os.previsao.slice(0, 10) === col.data).forEach((os) => coluna.append(marcadorPrevisao(os, ctx)));
      },
      aoClicar: clicarVaga,
    });
    const legendaRaias = tid ? null : el("div", { class: "raias-legenda" }, el("span", { class: "suave", texto: "Cada dia é dividido por técnico:" }), ...raias.map((m, i) => el("span", { class: `nome-prof prof prof--${m.cor ?? 0}` }, m.id === SEM ? el("span", { class: "avatar-prof avatar-prof--p prof prof--sem", "aria-hidden": "true", texto: "–" }) : C().avatarProf(m, "p"), `${i + 1}. ${m.nome.split(" ")[0]}`)), el("span", { class: "suave", texto: "Escolha um técnico no filtro para ver os detalhes." }));
    return { conteudo: el("div", {}, legendaRaias, el("div", { class: "agenda-rolagem", "data-rolagem": "grade" }, g)), lista, prevs, faixa };
  }

  /* ---------- Visão: mês ----------
     Cada dia mostra até três compromissos, as previsões de conclusão e as
     horas livres dos técnicos ativos (de hoje em diante). Tocar no dia abre a
     visão do dia, onde dá para agendar. */
  function visaoMes() {
    const d = L.dados;
    const ini = U.inicioDoMes(estado.data);
    const fim = U.fimDoMes(estado.data);
    const primeiro = inicioSemana(ini);
    const ultimo = U.somarDias(inicioSemana(fim), 6);
    const datas = Array.from({ length: U.diasEntre(primeiro, ultimo) + 1 }, (_, i) => U.somarDias(primeiro, i));
    const doMes = datas.filter((x) => x >= ini && x <= fim);
    const lista = doMes.flatMap(doDia);
    const prevs = doMes.flatMap(previsoesDoDia);
    const tecs = d.equipe.filter((m) => m.tecnico && m.status === "ativo" && (!estado.tecnico || m.id === estado.tecnico));
    const cab = el("div", { class: "mes__cab", "aria-hidden": "true" }, ...[1, 2, 3, 4, 5, 6, 0].map((dow) => el("span", { texto: NX.DIAS_CURTOS[dow] })));
    const grade = el("div", { class: "mes__grade" }, ...datas.map((data) => {
      const fora = data < ini || data > fim;
      const h = d.oficina.horarios[U.diaDaSemana(data)];
      const doD = doDia(data);
      const ativos = doD.filter((c) => c.status !== "cancelado" && c.tipo !== "indisponivel");
      const pv = previsoesDoDia(data);
      const livreMin = h && data >= U.hoje() && tecs.length ? tecs.reduce((t, m) => t + livre(m.id, data), 0) : null;
      const mostrar = doD.slice(0, 3);
      const resto = doD.length - mostrar.length;
      const desc = [inicial(U.dataLonga(data)), !h ? "oficina fechada" : U.plural(ativos.length, "compromisso", "compromissos"), pv.length ? U.plural(pv.length, "previsão de conclusão", "previsões de conclusão") : null, livreMin != null ? `${horasTexto(livreMin)} livres na equipe` : null].filter(Boolean).join(", ");
      return el("button", {
        type: "button", "data-foco": `mes-${data}`, "aria-label": `${desc}. Abrir o dia.`,
        class: `mes__dia${fora ? " is-fora" : ""}${data === U.hoje() ? " is-hoje" : ""}${!h ? " is-fechado" : ""}${data < U.hoje() ? " is-passado" : ""}`,
        onclick: () => { estado.data = data; estado.visao = "dia"; atualizar(); },
      },
      el("span", { class: "mes__topo" }, el("span", { class: "mes__num", texto: String(Number(data.slice(8))) }), ativos.length ? el("span", { class: "mes__qtd", "aria-hidden": "true", texto: String(ativos.length) }) : null),
      !h ? el("span", { class: "mes__fechado", texto: "Fechada" }) : null,
      mostrar.length ? el("span", { class: "mes__itens" },
        ...mostrar.map((c) => el("span", { class: `mes__item mes__item--${c.status} ${corDe(c.tecnicoId)}` }, icone(tipoDe(c.tipo).icone, 11), el("span", { texto: `${c.inicio} ${titulo(c)}` }))),
        resto > 0 ? el("span", { class: "mes__mais", texto: `+${resto} ${resto === 1 ? "outro" : "outros"}` }) : null) : null,
      (pv.length || livreMin != null) ? el("span", { class: "mes__rodape" },
        pv.length ? el("span", { class: "mes__prev", title: "Previsões de conclusão" }, icone("flag", 11), String(pv.length)) : el("span"),
        livreMin != null ? el("span", { class: "mes__livre", texto: `${horasTexto(livreMin)} livres` }) : null) : null);
    }));
    return { conteudo: el("div", { class: "mes" }, cab, grade), lista, prevs };
  }

  /* ---------- Visão: lista ---------- */
  function visaoLista() {
    const d = L.dados;
    const datas = Array.from({ length: 14 }, (_, i) => U.somarDias(estado.data, i));
    const lista = [];
    const prevs = [];
    const caixa = el("div", { class: "agenda-lista" }, ...datas.map((data) => {
      const doD = doDia(data);
      const pv = previsoesDoDia(data);
      lista.push(...doD);
      prevs.push(...pv);
      const fechado = !d.oficina.horarios[U.diaDaSemana(data)];
      const itens = [...doD.map((c) => ({ h: c.inicio, c })), ...pv.map((os) => ({ h: os.previsao.slice(11), os }))].sort((a, b) => a.h.localeCompare(b.h));
      if (!itens.length && fechado) return null;
      return el("section", { class: "agenda-lista__dia", "aria-label": U.dataLonga(data) },
        el("h3", {}, inicial(U.dataLonga(data)), el("small", { texto: fechado ? "Oficina fechada" : `${U.plural(doD.filter((c) => c.status !== "cancelado").length, "compromisso", "compromissos")}${pv.length ? ` · ${U.plural(pv.length, "previsão", "previsões")}` : ""}` })),
        itens.length ? el("ul", { class: "reservas" }, ...itens.map((x) => el("li", {}, x.c ? linhaCompromisso(x.c) : linhaPrevisao(x.os)))) : el("p", { class: "vazio-pequeno", texto: "Nada marcado." }));
    }).filter(Boolean));
    return { conteudo: caixa, lista, prevs };
  }
  function linhaCompromisso(c) {
    const t = tipoDe(c.tipo);
    return el("button", { class: `reserva-linha ${corDe(c.tecnicoId)}${c.status === "cancelado" ? " is-cancelada" : ""}`, type: "button", "data-foco": `lin-${c.id}`, onclick: () => detalhe(c.id) },
      el("span", { class: "reserva-linha__hora" }, el("b", { texto: c.inicio }), el("small", { texto: `até ${c.fim}` })),
      el("span", { class: "reserva-linha__texto" }, el("b", {}, icone(t.icone, 13), ` ${titulo(c)}`), el("small", { texto: [t.nome, c.box ? `Box ${c.box}` : null, c.osId ? (L.ordem(c.osId) || {}).numero : null].filter(Boolean).join(" · ") })),
      el("span", { class: "reserva-linha__prof" }, C().nomeTecnico(c.tecnicoId, { curto: true, vazio: "Sem técnico" })),
      C().pilulaAgenda(c.status));
  }
  function linhaPrevisao(os) {
    return el("a", { class: "reserva-linha reserva-linha--previsao", href: `#/ordens/${os.id}` },
      el("span", { class: "reserva-linha__hora" }, el("b", { texto: os.previsao.slice(11) }), el("small", { texto: "previsão" })),
      el("span", { class: "reserva-linha__texto" }, el("b", {}, icone("flag", 13), ` Previsão de conclusão · ${os.numero}`), el("small", { texto: `${C().textoVeiculo(os.veiculoId)} · ${O.nomeStatus(os.status)} · não ocupa técnico nem box` })),
      el("span", { class: "reserva-linha__prof" }, C().nomeTecnico(os.tecnicoId, { curto: true })),
      C().pilulaOS(os.status, { curto: true }));
  }

  /* ---------- Detalhe de um compromisso ---------- */
  function detalhe(id) {
    const c = L.compromisso(id);
    if (!c) return;
    const t = tipoDe(c.tipo);
    const os = c.osId ? L.ordem(c.osId) : null;
    const pode = O.pode("agenda");
    const comecou = `${c.data}T${c.inicio}` <= U.agora();
    const linha = (k, v) => (v ? el("div", { class: "ficha__linha" }, el("dt", { texto: k }), el("dd", {}, v)) : null);
    const botoes = [];
    const fecharE = (fn) => () => { j.fechar(); setTimeout(fn, 30); };
    if (pode && c.status === "marcado") {
      if (comecou && c.tipo !== "indisponivel") {
        botoes.push(C().botao("Realizado", "btn--primario", () => { const r = O.mudarCompromisso(c.id, "realizado"); if (r.ok) { j.fechar(); U.aviso("Marcado como realizado."); } else j.erro(r.erro); }, "check"));
        if (["recepcao", "avaliacao", "entrega"].includes(c.tipo)) botoes.push(C().botao("Não compareceu", "btn--linha", () => { const r = O.mudarCompromisso(c.id, "nao_compareceu"); if (r.ok) { j.fechar(); U.aviso("Registrado: cliente não compareceu."); } else j.erro(r.erro); }, "user-x"));
      }
      botoes.push(C().botao("Editar", "btn--linha", fecharE(() => NX.form.compromisso(c.id)), "pencil"));
      botoes.push(C().botao("Cancelar", "btn--perigo", fecharE(() => U.formulario({
        titulo: "Cancelar compromisso?", descricao: `${t.nome} de ${U.dataCompleta(c.data)}, ${c.inicio}–${c.fim}. O horário fica livre e o registro continua na agenda como cancelado.`,
        campos: [{ nome: "motivo", rotulo: "Motivo", obrigatorio: true, largura: "inteira", max: 200 }], rotuloSalvar: "Cancelar compromisso",
        aoSalvar: (v) => { const r = O.mudarCompromisso(c.id, "cancelado", v.motivo); if (r.ok) U.aviso("Compromisso cancelado."); return r; },
      })), "circle-x"));
    }
    if (c.tipo === "recepcao" && c.veiculoId && !os && !O.osAbertaDoVeiculo(c.veiculoId) && O.pode("os_abrir")) botoes.push(C().botao("Abrir OS", "btn--primario", fecharE(() => NX.form.novaOS({ veiculoId: c.veiculoId })), "clipboard-plus"));
    const j = C().janela({
      tipo: t.nome, titulo: `${inicial(U.dataLonga(c.data))}, ${c.inicio}–${c.fim}`,
      corpo: el("div", {},
        el("div", { class: "pagina__etiquetas", style: { marginBottom: "12px" } }, C().pilulaAgenda(c.status), C().pilulaExemplo(c)),
        el("dl", { class: "ficha" },
          linha("Técnico", c.tecnicoId ? C().nomeTecnico(c.tecnicoId) : null),
          linha("Box", c.box ? `Box ${c.box}` : null),
          linha("Cliente", c.clienteId ? C().nomeCliente(c.clienteId) : null),
          linha("Veículo", c.veiculoId ? C().nomeVeiculo(c.veiculoId) : null),
          linha("Ordem de serviço", os ? el("a", { class: "link-texto", href: `#/ordens/${os.id}`, onclick: () => j.fechar(), texto: `${os.numero} · ${O.nomeStatus(os.status)}` }) : null),
          linha("Observações", c.observacoes || null),
          linha("Registro", `Marcado por ${c.por} em ${U.dataHora(c.criadoEm)}${c.situacaoEm ? ` · ${(NX.STATUS_AGENDA.find((s) => s.id === c.status) || {}).nome} em ${U.dataHora(c.situacaoEm)} por ${c.situacaoPor}` : ""}`),
          c.cancelamento ? linha("Cancelamento", c.cancelamento.motivo) : null),
        c.status === "marcado" && comecou && c.tipo !== "indisponivel" ? el("p", { class: "nota-alerta" }, icone("clock", 14), "Este horário já começou. Registre se foi realizado ou se o cliente não compareceu.") : null),
      botoes,
    });
  }

  /* ---------- Atualizar ---------- */
  function rotuloPeriodo() {
    if (estado.visao === "dia") return { titulo: inicial(U.dataLonga(estado.data)), sub: `${U.relativo(estado.data)} · ${U.dataCompleta(estado.data)}` };
    if (estado.visao === "semana") { const ini = inicioSemana(estado.data); const fim = U.somarDias(ini, 6); return { titulo: `${U.dataCurta(ini)} a ${U.dataCurta(fim)}`, sub: `semana de segunda a domingo · ${ini.slice(0, 4)}` }; }
    if (estado.visao === "mes") return { titulo: inicial(U.mesAno(estado.data)), sub: "toque num dia para ver os horários e agendar" };
    return { titulo: `${U.dataCurta(estado.data)} a ${U.dataCurta(U.somarDias(estado.data, 13))}`, sub: "14 dias a partir da data escolhida" };
  }
  function mover(n) {
    estado.data = estado.visao === "mes" ? U.somarMeses(estado.data, n) : U.somarDias(estado.data, n * (estado.visao === "dia" ? 1 : estado.visao === "semana" ? 7 : 14));
    atualizar();
  }
  const rotuloMover = (n) => ({ dia: ["Dia anterior", "Próximo dia"], semana: ["Semana anterior", "Próxima semana"], mes: ["Mês anterior", "Próximo mês"], lista: ["Período anterior", "Próximo período"] }[estado.visao][n < 0 ? 0 : 1]);

  function desenhar() {
    if (!estado.data) estado.data = U.hoje();
    if (!estado.visao) estado.visao = window.matchMedia("(max-width: 720px)").matches ? "lista" : "dia";
    if (estado.tecnico && !L.membro(estado.tecnico)) estado.tecnico = "";
    U.$("#titulo-agenda").parentElement.querySelector(".pagina__sub").textContent = `Técnicos e boxes (${L.dados.oficina.boxes}) não podem ser ocupados duas vezes no mesmo horário. Agora: ${U.agora().slice(11)}.`;

    const r = rotuloPeriodo();
    const inData = el("input", { type: "date", class: "seletor seletor--data", "aria-label": "Ir para a data", value: estado.data, "data-foco": "agenda-data" });
    inData.addEventListener("change", () => { if (U.dataValida(inData.value)) { estado.data = inData.value; atualizar(); } });
    U.trocar(p.barra,
      el("div", { class: "agenda-nav" },
        el("button", { class: "icone-btn", type: "button", "aria-label": rotuloMover(-1), "data-foco": "agenda-ant", onclick: () => mover(-1) }, icone("chevron-left", 18)),
        C().botao("Hoje", "btn--linha", () => { estado.data = U.hoje(); atualizar(); }, null, { "data-foco": "agenda-hoje", disabled: estado.data === U.hoje() }),
        el("button", { class: "icone-btn", type: "button", "aria-label": rotuloMover(1), "data-foco": "agenda-prox", onclick: () => mover(1) }, icone("chevron-right", 18)),
        inData),
      el("div", { class: "agenda-data", "aria-live": "polite" }, el("b", { texto: r.titulo }), el("span", { texto: r.sub })),
      el("div", { class: "segmentado", role: "group", "aria-label": "Visão da agenda" }, ...VISOES.map(([v, t]) => el("button", { type: "button", "aria-pressed": String(estado.visao === v), "data-foco": `visao-${v}`, texto: t, onclick: () => { estado.visao = v; atualizar(); } }))));

    U.trocar(p.filtros,
      C().seletor(C().opcoesTecnicos({ todos: "Todos os técnicos", incluirInativos: true }), estado.tecnico, (v) => { estado.tecnico = v; atualizar(); }, { rotulo: "Filtrar por técnico", foco: "agenda-tec" }),
      C().seletor([{ valor: "", rotulo: "Todos os tipos" }, ...NX.TIPOS_AGENDA.map((t) => ({ valor: t.id, rotulo: t.nome }))], estado.tipo, (v) => { estado.tipo = v; atualizar(); }, { rotulo: "Filtrar por tipo", foco: "agenda-tipo" }),
      C().seletor([{ valor: "", rotulo: "Sem os cancelados" }, { valor: "todos", rotulo: "Todas as situações" }, ...NX.STATUS_AGENDA.map((x) => ({ valor: x.id, rotulo: `Só: ${x.nome.toLowerCase()}` }))], estado.status, (v) => { estado.status = v; atualizar(); }, { rotulo: "Filtrar por situação", foco: "agenda-status" }),
      (estado.tecnico || estado.tipo || estado.status) ? el("button", { class: "link-btn", type: "button", "data-foco": "agenda-limpar", onclick: () => { estado.tecnico = ""; estado.tipo = ""; estado.status = ""; atualizar(); } }, icone("x", 14), "Limpar filtros") : null);

    U.trocar(p.legenda,
      ...NX.TIPOS_AGENDA.filter((t) => t.id !== "indisponivel").map((t) => el("li", {}, icone(t.icone, 13), t.nome)),
      el("li", {}, el("i", { class: "amostra amostra--indisponivel" }), "Técnico indisponível"),
      el("li", {}, el("i", { class: "amostra amostra--previsao" }), "Previsão de conclusão (não ocupa técnico nem box)"),
      el("li", {}, el("i", { class: "amostra amostra--fora" }), "Fora do expediente"));

    const chave = `${estado.visao}|${estado.data}|${estado.tecnico}`;
    const rolagemAntiga = p.quadro.querySelector("[data-rolagem]");
    const antes = rolagemAntiga ? { top: rolagemAntiga.scrollTop, left: rolagemAntiga.scrollLeft } : null;
    const v = { dia: visaoDia, semana: visaoSemana, mes: visaoMes, lista: visaoLista }[estado.visao]();
    U.trocar(p.quadro, v.conteudo);
    const ativos = v.lista.filter((c) => c.status !== "cancelado" && c.tipo !== "indisponivel");
    const pend = v.lista.filter((c) => c.status === "marcado" && c.tipo !== "indisponivel" && `${c.data}T${c.fim}` < U.agora()).length;
    p.resumo.textContent = `${U.plural(ativos.length, "compromisso", "compromissos")} · ${U.plural(v.prevs.length, "previsão de conclusão", "previsões de conclusão")}${pend ? ` · ${pend} já passaram sem registro de realizado` : ""}${(["dia", "semana"].includes(estado.visao) && O.pode("agenda")) ? ". Clique num espaço livre para agendar." : ""}`;

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
  NX.telas.agenda = { titulo: "Agenda da oficina", montar, atualizar, aoEntrar, estado, detalhe, reiniciar: () => Object.assign(estado, PADRAO()) };
})();
