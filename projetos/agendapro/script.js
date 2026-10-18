/* ==========================================================================
   AGENDAPRO — script.js (sistema de agendamento demonstrativo)
   --------------------------------------------------------------------------
   Tema e janelas: assets/js/comum.js
   Regras de agenda (conflitos, expediente, bloqueios, passado):
     assets/js/agenda-motor.js
   Aqui: as telas do sistema (painel, agenda, reservas, página do cliente,
   serviços, expediente e bloqueios).

   MODO DEMONSTRAÇÃO LOCAL: tudo fica salvo no localStorage deste navegador.
   Não há sincronização entre aparelhos, login nem envio de notificações.
   Para usar de verdade, o motor precisa ser ligado a um servidor (veja o
   comentário no início de agenda-motor.js).
   ========================================================================== */


/* ------------------------------------------------------------------------
   CONFIGURAÇÕES E DADOS INICIAIS — EDITE AQUI
   ------------------------------------------------------------------------ */
const CONFIG = {
  chave: "agendapro-demo",     // nome do espaço no localStorage
  statusDoCliente: "pendente", // reservas feitas pela página do cliente
  diasNaAgendaDoCliente: 60,   // até quantos dias à frente o cliente pode reservar
  pxPorMinuto: 1.1,            // altura da agenda (1,1 px por minuto)
};

const SERVICOS = [
  { id: "corte-m", nome: "Corte masculino", duracao: 40, preco: 60 },
  { id: "corte-f", nome: "Corte feminino", duracao: 60, preco: 90 },
  { id: "barba", nome: "Barba", duracao: 30, preco: 40 },
  { id: "combo", nome: "Corte + barba", duracao: 70, preco: 90 },
  { id: "escova", nome: "Escova", duracao: 45, preco: 55 },
  { id: "pe-mao", nome: "Pé e mão", duracao: 75, preco: 70 },
  { id: "gel", nome: "Esmaltação em gel", duracao: 60, preco: 85 },
  { id: "alongamento", nome: "Alongamento em gel", duracao: 120, preco: 180 },
];

const PROFISSIONAIS = [
  { id: "rafa", nome: "Rafa", especialidade: "Cabelo e barba", servicos: ["corte-m", "corte-f", "barba", "combo"] },
  { id: "lia", nome: "Lia", especialidade: "Cabelo", servicos: ["corte-m", "corte-f", "escova"] },
  { id: "bruna", nome: "Bruna", especialidade: "Unhas", servicos: ["pe-mao", "gel", "alongamento"] },
];

// 0 = domingo ... 6 = sábado. Dia ausente = fechado.
const EXPEDIENTE = {
  1: [["09:00", "12:00"], ["13:00", "19:00"]],
  2: [["09:00", "12:00"], ["13:00", "19:00"]],
  3: [["09:00", "12:00"], ["13:00", "19:00"]],
  4: [["09:00", "12:00"], ["13:00", "19:00"]],
  5: [["09:00", "12:00"], ["13:00", "19:00"]],
  6: [["09:00", "15:00"]],
};

/* Reservas de exemplo, criadas em volta da data de hoje.
   Ficam marcadas como "exemplo" e usam nomes genéricos e telefones com DDD 00. */
const NOMES_EXEMPLO = ["Marina", "Paulo", "Renata", "Diego", "Camila", "Júlio", "Bianca", "Otávio", "Lívia", "Sérgio", "Tânia", "Vítor", "Helena", "Caio"];
const PADROES = [
  [{ p: "rafa", s: "corte-m", h: "09:00" }, { p: "bruna", s: "pe-mao", h: "09:00" }, { p: "lia", s: "corte-f", h: "09:30" }, { p: "rafa", s: "combo", h: "10:00" }, { p: "bruna", s: "alongamento", h: "13:00" }, { p: "rafa", s: "barba", h: "14:00" }, { p: "lia", s: "escova", h: "15:00" }],
  [{ p: "rafa", s: "combo", h: "09:30" }, { p: "lia", s: "escova", h: "10:00" }, { p: "bruna", s: "gel", h: "10:30" }, { p: "rafa", s: "corte-m", h: "13:30" }, { p: "lia", s: "corte-f", h: "14:00" }, { p: "bruna", s: "pe-mao", h: "15:30" }, { p: "rafa", s: "corte-m", h: "16:00" }],
  [{ p: "lia", s: "corte-f", h: "09:00" }, { p: "bruna", s: "alongamento", h: "09:30" }, { p: "rafa", s: "barba", h: "11:00" }, { p: "lia", s: "corte-f", h: "13:00" }, { p: "bruna", s: "gel", h: "14:00" }, { p: "rafa", s: "corte-m", h: "15:00" }, { p: "lia", s: "escova", h: "17:00" }],
];

function criarExemplos(base, { hoje, somarDias, diaDaSemana, paraMinutos, paraHora }) {
  let n = 0;
  let bloqueioFeito = false;
  for (let d = -4; d <= 9; d++) {
    const data = somarDias(hoje, d);
    const dia = diaDaSemana(data);
    const periodos = base.expediente[dia] || [];
    if (!periodos.length) continue;
    const padrao = PADROES[(d + 30) % PADROES.length];
    padrao.forEach((item, i) => {
      const sv = base.servicos.find((s) => s.id === item.s);
      const inicio = paraMinutos(item.h);
      const fim = inicio + sv.duracao;
      if (!periodos.some(([a, f]) => inicio >= paraMinutos(a) && fim <= paraMinutos(f))) return;
      let status = "confirmado";
      if (d > 0 && i === padrao.length - 1) status = "pendente";
      if ((d === 2 && i === 0) || (d === -2 && i === 1)) status = "cancelado";
      base.reservas.push({
        servicoId: sv.id, servicoNome: sv.nome, preco: sv.preco, duracao: sv.duracao,
        profissionalId: item.p, data, inicio: item.h, fim: paraHora(fim),
        cliente: { nome: NOMES_EXEMPLO[n % NOMES_EXEMPLO.length], contato: `(00) 90000-${String(n + 1).padStart(4, "0")}` },
        observacao: "", status, origem: i % 3 === 0 ? "site" : "painel", criadoEm: new Date().toISOString(),
      });
      n++;
    });
    // Um bloqueio de exemplo no primeiro dia útil depois de hoje
    if (!bloqueioFeito && d >= 1 && dia >= 1 && dia <= 5) {
      base.bloqueios.push({ profissionalId: "bruna", data, inicio: "17:00", fim: "19:00", motivo: "Curso (exemplo)" });
      bloqueioFeito = true;
    }
  }
}

const { util } = AgendaMotor;
const agenda = AgendaMotor.criar({
  chave: CONFIG.chave,
  servicos: SERVICOS,
  profissionais: PROFISSIONAIS,
  expediente: EXPEDIENTE,
  intervalo: 30,
  exemplos: criarExemplos,
});


/* ------------------------------------------------------------------------
   UTILITÁRIOS
   ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
};
const moeda = (v) => (v == null ? "—" : Comum.moeda(v));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const duracaoTexto = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`);
const fmtLonga = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fmtCurta = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const fmtDiaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
const dataLonga = (chave) => fmtLonga.format(util.dataDeChave(chave));
const dataCurta = (chave) => fmtCurta.format(util.dataDeChave(chave)).replace(".,", ",");
const nomeProfissional = (id) => (agenda.profissional(id) || { nome: "—" }).nome;
const agoraEmMinutos = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const STATUS_TEXTO = { confirmado: "Confirmado", pendente: "Pendente", cancelado: "Cancelado" };

function selo(status) {
  return criar("span", `status status--${status}`, STATUS_TEXTO[status] || status);
}
function seloExemplo() {
  const s = criar("span", "exemplo", "exemplo");
  s.title = "Reserva criada automaticamente para a demonstração";
  return s;
}
function opcaoSelect(valor, texto, selecionada) {
  const o = criar("option", "", texto);
  o.value = valor;
  if (selecionada) o.selected = true;
  return o;
}
function mascaraTelefone(campo) {
  campo.addEventListener("input", () => {
    const n = campo.value.replace(/\D/g, "").slice(0, 11);
    campo.value = n.length > 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
      : n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
      : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n;
  });
}
function animar(el, classe) {
  if (!el || Comum.reduzirMovimento()) return;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  el.addEventListener("animationend", () => el.classList.remove(classe), { once: true });
}
function proximoDiaAberto(desde) {
  for (let i = 0; i < 14; i++) {
    const d = util.somarDias(desde, i);
    if (agenda.expedienteDo(d).length) return d;
  }
  return desde;
}
function inicioDaSemana(chave) {
  return util.somarDias(chave, -((util.diaDaSemana(chave) + 6) % 7));   // segunda-feira
}

/* Janela "Tem certeza?" reaproveitada por várias ações */
let acaoConfirmada = null;
function confirmar(titulo, texto, rotulo, acao) {
  $("jc-titulo").textContent = titulo;
  $("jc-texto").textContent = texto;
  $("jc-ok").textContent = rotulo;
  acaoConfirmada = acao;
  Comum.abrirDialogo($("janela-confirmar"));
}


/* ------------------------------------------------------------------------
   ROTAS (#/painel, #/agenda ...)
   ------------------------------------------------------------------------ */
const VISTAS = {
  painel: { titulo: "Painel", sub: () => dataLonga(util.hoje()), render: () => renderPainel() },
  agenda: { titulo: "Agenda", sub: () => "Visualização por dia e por semana", render: () => renderAgenda() },
  reservas: { titulo: "Reservas", sub: () => "Lista com filtros por data, serviço e status", render: () => renderReservas() },
  reservar: { titulo: "Página do cliente", sub: () => "Como o cliente faz uma reserva pelo site", render: () => renderClienteAoMudar() },
  servicos: { titulo: "Serviços", sub: () => "Durações, preços e quem faz cada serviço", render: () => renderServicos() },
  expediente: { titulo: "Expediente", sub: () => "Dias e horários de funcionamento", render: () => renderExpediente() },
  bloqueios: { titulo: "Bloqueios", sub: () => "Horários indisponíveis para reserva", render: () => renderBloqueios() },
};
let vistaAtual = null;

function rota(inicial = false) {
  let nome = location.hash.replace(/^#\/?/, "");
  if (!VISTAS[nome]) {
    nome = "painel";
    history.replaceState(null, "", "#/painel");
  }
  const mudou = nome !== vistaAtual;
  vistaAtual = nome;
  document.querySelectorAll(".vista").forEach((v) => { v.hidden = v.dataset.vista !== nome; });
  document.querySelectorAll(".menu__link").forEach((a) => {
    if (a.dataset.rota === nome) {
      a.setAttribute("aria-current", "page");
      // No celular o menu rola para o lado: mantém a seção atual à vista
      if (window.innerWidth < 1024) a.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else a.removeAttribute("aria-current");
  });
  const v = VISTAS[nome];
  $("titulo-pagina").textContent = v.titulo;
  $("subtitulo-pagina").textContent = v.sub();
  document.title = `${v.titulo} · AgendaPro (demonstração)`;
  if (nome === "reservar" && mudou) iniciarCliente();
  v.render();
  if (!inicial && mudou) {
    animar($(`vista-${nome}`), "trocando");
    window.scrollTo({ top: 0, behavior: "instant" });
    $("titulo-pagina").focus({ preventScroll: true });
  }
}

// Mantém a tela atual em dia quando os dados mudam (aqui ou em outra aba)
agenda.aoMudar(() => {
  if (!vistaAtual || vistaAtual === "expediente") return;   // expediente atualiza linha a linha
  VISTAS[vistaAtual].render();
});


/* ------------------------------------------------------------------------
   PAINEL
   ------------------------------------------------------------------------ */
function contarLivres(data) {
  return agenda.profissionais.map((p) => ({ p, horas: agenda.horariosDisponiveis({ data, duracao: 30, profissionalId: p.id }).map((h) => h.hora) }));
}

function renderPainel() {
  const hoje = util.hoje();
  const ativas = (r) => r.status !== "cancelado";
  const deHoje = agenda.listar({ data: hoje }).filter(ativas);
  const aberto = agenda.expedienteDo(hoje).length > 0;
  $("m-hoje").textContent = deHoje.length;
  $("m-hoje-nota").textContent = !aberto && !deHoje.length ? "Fechado hoje"
    : `${deHoje.filter((r) => r.status === "confirmado").length} confirmadas · ${deHoje.filter((r) => r.status === "pendente").length} pendentes`;

  const semana = agenda.listar({ de: hoje, ate: util.somarDias(hoje, 6) }).filter(ativas);
  $("m-semana").textContent = semana.length;
  $("m-semana-nota").textContent = `${moeda(semana.reduce((t, r) => t + (r.preco || 0), 0))} em serviços previstos`;

  $("m-pendentes").textContent = agenda.listar({ de: hoje, status: "pendente" }).length;

  // Horários livres: hoje, se ainda houver; senão, o próximo dia com vaga
  let diaLivre = null;
  let livres = [];
  for (let i = 0; i < 14; i++) {
    const d = util.somarDias(hoje, i);
    const lista = contarLivres(d);
    if (lista.some((x) => x.horas.length)) { diaLivre = d; livres = lista; break; }
  }
  const total = livres.reduce((t, x) => t + x.horas.length, 0);
  $("m-livres").textContent = total;
  $("m-livres-nota").textContent = diaLivre ? `de 30 min, ${diaLivre === hoje ? "hoje" : dataCurta(diaLivre)}` : "Sem vagas nas próximas 2 semanas";
  $("livres-data").textContent = diaLivre ? `${dataLonga(diaLivre)} · horários de início livres (30 min)` : "Nenhum horário livre nas próximas 2 semanas.";
  $("livres").replaceChildren(...livres.map(({ p, horas }) => {
    const bloco = criar("div", "livre");
    const nome = criar("p", "livre__nome", p.nome);
    nome.append(criar("span", "", plural(horas.length, "horário", "horários")));
    const chips = criar("div", "livre__horas");
    horas.slice(0, 8).forEach((h) => {
      const b = criar("button", "chip-hora", h);
      b.type = "button";
      b.setAttribute("aria-label", `Agendar com ${p.nome} às ${h}`);
      b.addEventListener("click", () => abrirNovo({ data: diaLivre, hora: h, profissionalId: p.id }));
      chips.append(b);
    });
    if (horas.length > 8) chips.append(criar("span", "livre__mais", `+${horas.length - 8}`));
    if (!horas.length) chips.append(criar("span", "livre__mais", "Sem horários neste dia"));
    bloco.append(nome, chips);
    return bloco;
  }));

  // Próximos agendamentos (a partir de agora)
  const agora = agoraEmMinutos();
  const proximos = agenda.listar({ de: hoje }).filter((r) => ativas(r) && (r.data > hoje || util.paraMinutos(r.inicio) >= agora)).slice(0, 6);
  $("proximos-vazio").hidden = proximos.length > 0;
  $("proximos").replaceChildren(...proximos.map((r) => {
    const li = criar("li");
    const b = criar("button", "proximo");
    b.type = "button";
    b.setAttribute("aria-label", `${r.data === hoje ? "Hoje" : dataCurta(r.data)}, ${r.inicio}, ${r.cliente.nome}, ${r.servicoNome} com ${nomeProfissional(r.profissionalId)}, ${STATUS_TEXTO[r.status]}. Abrir`);
    const quando = criar("span", "proximo__quando");
    quando.append(criar("b", "", r.inicio), criar("span", "", r.data === hoje ? "hoje" : dataCurta(r.data)));
    const cliente = criar("span", "proximo__cliente", r.cliente.nome);
    if (r.exemplo) cliente.append(seloExemplo());
    b.append(quando, cliente, selo(r.status), criar("span", "proximo__det", `${r.servicoNome} · ${nomeProfissional(r.profissionalId)} · ${duracaoTexto(r.duracao)}`));
    b.addEventListener("click", () => abrirReserva(r.id));
    li.append(b);
    return li;
  }));
}


/* ------------------------------------------------------------------------
   AGENDA (dia e semana)
   ------------------------------------------------------------------------ */
const ag = { modo: "dia", data: proximoDiaAberto(util.hoje()), profissional: "", canceladas: false, destacar: null };

function limitesDaGrade() {
  let inicio = Infinity;
  let fim = -Infinity;
  Object.values(agenda.expediente).forEach((periodos) => periodos.forEach(([a, f]) => {
    inicio = Math.min(inicio, util.paraMinutos(a));
    fim = Math.max(fim, util.paraMinutos(f));
  }));
  if (!Number.isFinite(inicio)) { inicio = 8 * 60; fim = 18 * 60; }
  return { inicio: Math.floor(inicio / 60) * 60, fim: Math.ceil(fim / 60) * 60 };
}

/* Distribui itens que se sobrepõem lado a lado (faixas) */
function distribuirFaixas(itens) {
  itens.sort((a, b) => a.ini - b.ini || b.fim - a.fim);
  let grupo = [];
  let fimDoGrupo = -1;
  const fechar = () => {
    const faixas = [];
    grupo.forEach((it) => {
      let i = faixas.findIndex((f) => f <= it.ini);
      if (i < 0) i = faixas.length;
      faixas[i] = it.fim;
      it.faixa = i;
    });
    grupo.forEach((it) => { it.faixas = faixas.length; });
  };
  itens.forEach((it) => {
    if (grupo.length && it.ini >= fimDoGrupo) { fechar(); grupo = []; fimDoGrupo = -1; }
    grupo.push(it);
    fimDoGrupo = Math.max(fimDoGrupo, it.fim);
  });
  if (grupo.length) fechar();
  return itens;
}

function renderAgenda() {
  const px = CONFIG.pxPorMinuto;
  const { inicio, fim } = limitesDaGrade();
  const hoje = util.hoje();
  const agora = agoraEmMinutos();

  // Colunas: profissionais (dia) ou dias da semana (semana)
  const profs = agenda.profissionais.filter((p) => !ag.profissional || p.id === ag.profissional);
  let colunas;
  if (ag.modo === "dia") {
    colunas = profs.map((p) => ({ data: ag.data, profissionalId: p.id, titulo: p.nome, sub: p.especialidade }));
    $("ag-titulo").textContent = dataLonga(ag.data);
  } else {
    const seg = inicioDaSemana(ag.data);
    colunas = Array.from({ length: 7 }, (_, i) => {
      const d = util.somarDias(seg, i);
      return { data: d, profissionalId: ag.profissional || null, titulo: fmtCurta.format(util.dataDeChave(d)).split(",")[0].replace(".", ""), sub: d.slice(8, 10) + "/" + d.slice(5, 7) };
    });
    const dom = util.somarDias(seg, 6);
    $("ag-titulo").textContent = `${fmtDiaMes.format(util.dataDeChave(seg))} a ${fmtDiaMes.format(util.dataDeChave(dom))}`;
  }

  const cal = criar("div", "cal");
  cal.style.setProperty("--colunas", colunas.length);
  cal.style.setProperty("--coluna-min", ag.modo === "dia" ? "160px" : "118px");
  const caixa = $("calendario");
  caixa.style.setProperty("--px", `${px}px`);
  caixa.style.setProperty("--altura", `${(fim - inicio) * px}px`);

  // Cabeçalho
  cal.append(criar("div", "cal__canto"));
  colunas.forEach((c) => {
    const cab = criar("div", `cal__cabeca${c.data === hoje && ag.modo === "semana" ? " is-hoje" : ""}`);
    cab.append(criar("b", "", c.titulo), criar("span", "", c.sub));
    cal.append(cab);
  });

  // Coluna das horas
  const horas = criar("div", "cal__horas");
  horas.setAttribute("aria-hidden", "true");
  for (let m = inicio; m < fim; m += 60) {
    const h = criar("span", `cal__hora${m === inicio ? " cal__hora--primeira" : ""}`, util.paraHora(m));
    h.style.top = `${(m - inicio) * px}px`;
    horas.append(h);
  }
  cal.append(horas);

  // Colunas com reservas, bloqueios e períodos fechados
  colunas.forEach((c) => {
    const col = criar("div", `cal__coluna${c.data === hoje ? " is-hoje" : ""}`);
    col.dataset.data = c.data;
    if (c.profissionalId) col.dataset.profissional = c.profissionalId;
    const periodos = agenda.expedienteDo(c.data).map(([a, f]) => [util.paraMinutos(a), util.paraMinutos(f)]).sort((a, b) => a[0] - b[0]);

    // Fora do expediente (sombreado)
    if (!periodos.length) {
      const f = criar("div", "cal__fechado cal__fechado--dia", "Fechado");
      f.style.top = "0";
      f.style.height = "100%";
      col.append(f);
    } else {
      let cursor = inicio;
      [...periodos, [fim, fim]].forEach(([a, f]) => {
        if (a > cursor) {
          const s = criar("div", "cal__fechado");
          s.style.top = `${(cursor - inicio) * px}px`;
          s.style.height = `${(a - cursor) * px}px`;
          col.append(s);
        }
        cursor = Math.max(cursor, f);
      });
    }

    // Reservas e bloqueios do dia (com faixas para sobreposições)
    const reservas = agenda.listar({ data: c.data, profissionalId: c.profissionalId || undefined })
      .filter((r) => ag.canceladas || r.status !== "cancelado")
      .map((r) => ({ tipo: "reserva", r, ini: util.paraMinutos(r.inicio), fim: util.paraMinutos(r.fim) }));
    const bloqueios = agenda.bloqueios
      .filter((b) => b.data === c.data && (!c.profissionalId || !b.profissionalId || b.profissionalId === c.profissionalId))
      .map((b) => ({ tipo: "bloqueio", b, ini: util.paraMinutos(b.inicio), fim: util.paraMinutos(b.fim) }));

    // Semana com todos os profissionais: uma faixa fixa para cada um (fica mais fácil de ler).
    // Nos outros casos, as sobreposições são distribuídas lado a lado.
    const porProfissional = ag.modo === "semana" && !c.profissionalId;
    const itens = [...reservas, ...bloqueios];
    if (porProfissional) {
      const ids = agenda.profissionais.map((p) => p.id);
      itens.forEach((it) => {
        const quem = it.tipo === "reserva" ? it.r.profissionalId : it.b.profissionalId;
        const i = ids.indexOf(quem);
        it.faixa = i < 0 ? 0 : i;
        it.faixas = i < 0 ? 1 : ids.length;
      });
    } else {
      distribuirFaixas(itens);
    }
    itens.forEach((it) => {
      const topo = Math.max(0, (it.ini - inicio) * px);
      const altura = Math.max(22, (it.fim - it.ini) * px - 2);
      let el;
      if (it.tipo === "reserva") {
        const r = it.r;
        el = criar("button", `ev ev--${r.status}`);
        el.type = "button";
        el.dataset.reserva = r.id;
        const quem = ag.modo === "semana" && !c.profissionalId ? ` · ${nomeProfissional(r.profissionalId)}` : "";
        el.append(criar("span", "hora", `${r.inicio}–${r.fim}`), criar("b", "", r.cliente.nome), criar("span", "", `${r.servicoNome}${quem}`));
        el.setAttribute("aria-label", `${r.inicio} às ${r.fim}, ${r.cliente.nome}, ${r.servicoNome} com ${nomeProfissional(r.profissionalId)}, ${STATUS_TEXTO[r.status]}${r.exemplo ? ", reserva de exemplo" : ""}. Abrir`);
        el.addEventListener("click", (e) => { e.stopPropagation(); abrirReserva(r.id); });
        if (r.id === ag.destacar) el.classList.add("is-nova");
      } else {
        const b = it.b;
        el = criar("div", "ev ev--bloqueio");
        const quem = b.profissionalId ? nomeProfissional(b.profissionalId) : "Todos";
        el.append(criar("span", "hora", `${b.inicio}–${b.fim}`), criar("b", "", "Bloqueado"), criar("span", "", `${quem}${b.motivo ? ` · ${b.motivo}` : ""}`));
        el.title = `Bloqueado: ${b.motivo || "sem motivo"} (${quem})`;
      }
      el.style.top = `${topo}px`;
      el.style.height = `${altura}px`;
      if (altura < 58) el.classList.add("ev--curto");
      if (porProfissional) el.classList.add("ev--compacto");
      el.style.setProperty("--faixa", it.faixa);
      el.style.setProperty("--faixas", it.faixas);
      col.append(el);
    });

    // Linha do horário atual
    if (c.data === hoje && agora >= inicio && agora <= fim) {
      const linha = criar("div", "cal__agora");
      linha.style.top = `${(agora - inicio) * px}px`;
      linha.setAttribute("aria-hidden", "true");
      col.append(linha);
    }

    // Clique num espaço livre: novo agendamento naquele horário
    col.addEventListener("click", (e) => {
      if (e.target !== col) return;
      if (c.data < hoje) { Comum.aviso("Não é possível agendar em datas que já passaram."); return; }
      const minuto = inicio + Math.floor(e.offsetY / px / 30) * 30;
      if (!periodos.some(([a, f]) => minuto >= a && minuto < f)) {
        Comum.aviso("Este horário está fora do expediente.");
        return;
      }
      abrirNovo({ data: c.data, hora: util.paraHora(minuto), profissionalId: col.dataset.profissional || ag.profissional || "" });
    });
    cal.append(col);
  });

  caixa.replaceChildren(cal);
  ag.destacar = null;
}

function prepararAgenda() {
  const sel = $("ag-profissional");
  agenda.profissionais.forEach((p) => sel.append(opcaoSelect(p.id, p.nome)));
  sel.addEventListener("change", () => { ag.profissional = sel.value; renderAgenda(); });
  $("ag-canceladas").addEventListener("change", (e) => { ag.canceladas = e.target.checked; renderAgenda(); });
  document.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
    ag.modo = b.dataset.modo;
    document.querySelectorAll("[data-modo]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderAgenda();
  }));
  const andar = (sentido) => { ag.data = util.somarDias(ag.data, sentido * (ag.modo === "dia" ? 1 : 7)); renderAgenda(); };
  $("ag-anterior").addEventListener("click", () => andar(-1));
  $("ag-proximo").addEventListener("click", () => andar(1));
  $("ag-hoje").addEventListener("click", () => { ag.data = util.hoje(); renderAgenda(); });
}


/* ------------------------------------------------------------------------
   RESERVAS (lista com filtros)
   ------------------------------------------------------------------------ */
function prepararReservas() {
  const sv = $("fl-servico");
  agenda.todosServicos.forEach((s) => sv.append(opcaoSelect(s.id, s.nome)));
  const pf = $("fl-profissional");
  agenda.profissionais.forEach((p) => pf.append(opcaoSelect(p.id, p.nome)));
  const form = $("filtros");
  form.addEventListener("input", renderReservas);
  form.addEventListener("change", renderReservas);
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("reset", () => setTimeout(renderReservas));
}

function atualizarOpcoesDeServico() {
  // Novos serviços cadastrados aparecem no filtro
  const sv = $("fl-servico");
  const atual = sv.value;
  sv.replaceChildren(opcaoSelect("", "Todos"), ...agenda.todosServicos.map((s) => opcaoSelect(s.id, s.nome, s.id === atual)));
}

function renderReservas() {
  atualizarOpcoesDeServico();
  const hoje = util.hoje();
  const data = $("fl-data").value;
  const periodo = $("fl-periodo").value;
  $("fl-periodo").disabled = !!data;
  let lista = agenda.listar({
    data: data || undefined,
    servicoId: $("fl-servico").value || undefined,
    profissionalId: $("fl-profissional").value || undefined,
    status: $("fl-status").value || undefined,
  });
  if (!data && periodo === "futuras") lista = lista.filter((r) => r.data >= hoje);
  if (!data && periodo === "passadas") lista = lista.filter((r) => r.data < hoje).reverse();

  $("fl-contagem").textContent = plural(lista.length, "reserva encontrada", "reservas encontradas");
  $("lista-vazia").hidden = lista.length > 0;
  $("lista-reservas").replaceChildren(...lista.map((r) => {
    const tr = criar("tr", r.status === "cancelado" ? "is-cancelada" : "");
    const td = (col, ...conteudo) => { const c = criar("td"); c.dataset.col = col; c.append(...conteudo); return c; };
    const cliente = criar("div", "cel-cliente");
    const nome = criar("b", "", r.cliente.nome);
    if (r.exemplo) nome.append(seloExemplo());
    cliente.append(nome, criar("span", "", r.cliente.contato));

    const acoes = criar("div", "acoes");
    const botao = (texto, classe, rotulo, fn) => {
      const b = criar("button", `acao ${classe}`, texto);
      b.type = "button";
      b.setAttribute("aria-label", rotulo);
      b.addEventListener("click", fn);
      acoes.append(b);
    };
    const descricao = `${r.cliente.nome}, ${dataCurta(r.data)} às ${r.inicio}`;
    botao("Editar", "", `Editar reserva de ${descricao}`, () => abrirReserva(r.id));
    if (r.status === "pendente") botao("Confirmar", "acao--ok", `Confirmar reserva de ${descricao}`, () => mudarStatus(r, "confirmado"));
    if (r.status !== "cancelado") botao("Cancelar", "acao--perigo", `Cancelar reserva de ${descricao}`, () => pedirCancelamento(r));

    tr.append(
      td("data", r.data === hoje ? "Hoje" : dataCurta(r.data)),
      td("hora", criar("span", "hora", `${r.inicio}–${r.fim}`)),
      td("cliente", cliente),
      td("servico", r.servicoNome),
      td("profissional", nomeProfissional(r.profissionalId)),
      td("status", selo(r.status)),
      td("acoes", acoes),
    );
    return tr;
  }));
}

function mudarStatus(r, status) {
  const res = agenda.atualizar(r.id, { status });
  Comum.aviso(res.ok ? `Reserva de ${r.cliente.nome} ${status === "confirmado" ? "confirmada" : "atualizada"}.` : res.erro);
}

function pedirCancelamento(r, depois) {
  confirmar(
    "Cancelar reserva?",
    `${r.cliente.nome} · ${r.servicoNome} · ${dataCurta(r.data)} às ${r.inicio}. O horário volta a ficar livre para outras reservas.`,
    "Cancelar reserva",
    () => {
      const res = agenda.cancelar(r.id);
      Comum.aviso(res.ok ? `Reserva de ${r.cliente.nome} cancelada.` : res.erro);
      if (res.ok && depois) depois();
    },
  );
}


/* ------------------------------------------------------------------------
   JANELA: NOVO AGENDAMENTO / EDITAR
   ------------------------------------------------------------------------ */
let editandoId = null;
let horaPreferida = "";

function abrirNovo({ data, hora, profissionalId } = {}) {
  editandoId = null;
  $("form-reserva").reset();
  $("jr-titulo").textContent = "Novo agendamento";
  $("jr-salvar").textContent = "Agendar";
  $("jr-cancelar-reserva").hidden = true;
  $("jr-exemplo").hidden = true;
  $("jr-erro").textContent = "";
  $("jr-status").value = "confirmado";
  const servicos = agenda.servicos.filter((s) => !profissionalId || agenda.profissionaisPara(s.id).some((p) => p.id === profissionalId));
  preencherServicos(servicos[0] ? servicos[0].id : (agenda.servicos[0] || {}).id);
  preencherProfissionais(profissionalId || "");
  const hoje = util.hoje();
  $("jr-data").min = hoje;
  $("jr-data").value = data && data >= hoje ? data : proximoDiaAberto(hoje);
  horaPreferida = hora || "";
  preencherHorarios();
  Comum.abrirDialogo($("janela-reserva"));
  $("jr-servico").focus();
}

function abrirReserva(id) {
  const r = agenda.listar({ ids: [id] })[0];
  if (!r) return;
  editandoId = id;
  $("form-reserva").reset();
  $("jr-titulo").textContent = "Editar agendamento";
  $("jr-salvar").textContent = "Salvar alterações";
  $("jr-cancelar-reserva").hidden = r.status === "cancelado";
  $("jr-exemplo").hidden = !r.exemplo;
  $("jr-erro").textContent = "";
  preencherServicos(r.servicoId, r);
  preencherProfissionais(r.profissionalId, r);
  $("jr-data").removeAttribute("min");
  $("jr-data").value = r.data;
  horaPreferida = r.inicio;
  preencherHorarios(r);
  $("jr-nome").value = r.cliente.nome;
  $("jr-telefone").value = r.cliente.contato;
  $("jr-status").value = r.status;
  $("jr-obs").value = r.observacao || "";
  Comum.abrirDialogo($("janela-reserva"));
}

function reservaEditada() {
  return editandoId ? agenda.listar({ ids: [editandoId] })[0] : null;
}

function preencherServicos(selecionado, reserva) {
  const lista = [...agenda.servicos];
  // Na edição, o serviço atual aparece mesmo se estiver inativo
  if (reserva && reserva.servicoId && !lista.some((s) => s.id === reserva.servicoId)) {
    const s = agenda.servico(reserva.servicoId);
    if (s) lista.push(s);
  }
  $("jr-servico").replaceChildren(...lista.map((s) => opcaoSelect(s.id, `${s.nome} · ${duracaoTexto(s.duracao)} · ${moeda(s.preco)}`, s.id === selecionado)));
}

function preencherProfissionais(selecionado, reserva) {
  const sel = $("jr-profissional");
  const servicoId = $("jr-servico").value;
  const profs = agenda.profissionaisPara(servicoId);
  const opcoes = [];
  if (!reserva) opcoes.push(opcaoSelect("", "Primeiro disponível"));
  profs.forEach((p) => opcoes.push(opcaoSelect(p.id, p.nome, p.id === selecionado)));
  sel.replaceChildren(...opcoes);
  if (selecionado && !profs.some((p) => p.id === selecionado)) sel.value = reserva ? (profs[0] || {}).id || "" : "";
}

function preencherHorarios(reservaOriginal) {
  const r = reservaOriginal || reservaEditada();
  const servicoId = $("jr-servico").value;
  const profissionalId = $("jr-profissional").value;
  const data = $("jr-data").value;
  const sel = $("jr-horario");
  const sv = agenda.servico(servicoId);
  let horas = data && sv ? agenda.horariosDisponiveis({ data, servicoId, profissionalId: profissionalId || null, ignorarReservaId: r ? r.id : undefined }).map((h) => h.hora) : [];

  // Reserva antiga (no passado): mantém o horário atual como opção
  if (r && data === r.data && profissionalId === r.profissionalId && servicoId === r.servicoId && !horas.includes(r.inicio)) {
    horas = [r.inicio, ...horas].sort();
  }
  if (!horas.length) {
    sel.replaceChildren(opcaoSelect("", data ? "Nenhum horário livre neste dia" : "Escolha a data"));
  } else {
    sel.replaceChildren(...horas.map((h) => opcaoSelect(h, `${h} às ${util.paraHora(util.paraMinutos(h) + sv.duracao)}`, h === horaPreferida)));
  }

  const info = [];
  if (sv) info.push(`${sv.nome}: ${duracaoTexto(sv.duracao)} · ${moeda(sv.preco)}.`);
  if (horaPreferida && horas.length && !horas.includes(horaPreferida)) info.push(`O horário ${horaPreferida} não está livre para este serviço; escolha outro.`);
  if (data && !agenda.expedienteDo(data).length) info.push("O estabelecimento não abre neste dia.");
  $("jr-info").textContent = info.join(" ");
}

function prepararJanelaReserva() {
  mascaraTelefone($("jr-telefone"));
  $("jr-servico").addEventListener("change", () => {
    preencherProfissionais($("jr-profissional").value, reservaEditada());
    horaPreferida = $("jr-horario").value || horaPreferida;
    preencherHorarios();
  });
  $("jr-profissional").addEventListener("change", () => { horaPreferida = $("jr-horario").value || horaPreferida; preencherHorarios(); });
  $("jr-data").addEventListener("change", () => { horaPreferida = $("jr-horario").value || horaPreferida; preencherHorarios(); });
  $("jr-horario").addEventListener("change", () => { horaPreferida = $("jr-horario").value; preencherHorarios(); });

  $("form-reserva").addEventListener("submit", (e) => {
    e.preventDefault();
    const erro = $("jr-erro");
    erro.textContent = "";
    const dados = {
      servicoId: $("jr-servico").value,
      profissionalId: $("jr-profissional").value || null,
      data: $("jr-data").value,
      inicio: $("jr-horario").value,
      cliente: { nome: $("jr-nome").value, contato: $("jr-telefone").value },
      observacao: $("jr-obs").value,
      status: $("jr-status").value,
    };
    if (!dados.inicio) { erro.textContent = "Escolha um horário livre."; $("jr-horario").focus(); return; }
    const res = editandoId
      ? agenda.atualizar(editandoId, { ...dados, profissionalId: dados.profissionalId || reservaEditada().profissionalId })
      : agenda.reservar({ ...dados, origem: "painel" });
    if (!res.ok) {
      erro.textContent = res.erro;
      if (/nome/i.test(res.erro)) $("jr-nome").focus();
      else if (/telefone/i.test(res.erro)) $("jr-telefone").focus();
      else { horaPreferida = ""; preencherHorarios(); }
      return;
    }
    const r = res.reserva;
    ag.destacar = r.id;
    $("janela-reserva").close();
    Comum.aviso(`${editandoId ? "Agendamento atualizado" : "Agendamento criado"}: ${r.cliente.nome}, ${dataCurta(r.data)} às ${r.inicio} com ${nomeProfissional(r.profissionalId)}.`);
    if (vistaAtual === "agenda") { ag.data = r.data; ag.destacar = r.id; renderAgenda(); }
  });

  $("jr-cancelar-reserva").addEventListener("click", () => {
    const r = reservaEditada();
    if (r) pedirCancelamento(r, () => $("janela-reserva").close());
  });
  $("jc-ok").addEventListener("click", () => {
    $("janela-confirmar").close();
    const acao = acaoConfirmada;
    acaoConfirmada = null;
    if (acao) acao();
  });
}


/* ------------------------------------------------------------------------
   PÁGINA DO CLIENTE (assistente em 6 etapas)
   ------------------------------------------------------------------------ */
const escolha = { servico: "", profissional: "", data: "", horario: "" };
let etapaAtual = 1;
let mesVisivel = util.hoje().slice(0, 7);
let reservaConcluida = false;

function opcao({ tipo, nome, valor, id, partes, marcado, desativado, rotulo }) {
  const div = criar("div", "opcao");
  const input = document.createElement("input");
  Object.assign(input, { type: tipo, name: nome, value: valor, id, checked: !!marcado, disabled: !!desativado });
  const label = criar("label");
  label.htmlFor = id;
  label.append(...partes);
  if (rotulo) label.setAttribute("aria-label", rotulo);
  div.append(input, label);
  return div;
}
const servicoEscolhido = () => agenda.servico(escolha.servico);

function iniciarCliente() {
  // Depois de uma reserva concluída, quem volta para a página começa do zero
  if (reservaConcluida) {
    $("form-cliente").reset();
    Object.assign(escolha, { servico: "", profissional: "", data: "", horario: "" });
    etapaAtual = 1;
    reservaConcluida = false;
  }
  $("cl-confirmado").hidden = true;
  $("assistente").hidden = false;
  montarServicosCliente();
  irPara(etapaAtual);
}

function montarServicosCliente() {
  $("cl-servicos").replaceChildren(...agenda.servicos.map((s) => {
    const meta = criar("span", "opcao__meta");
    meta.append(criar("span", "", duracaoTexto(s.duracao)), criar("span", "", moeda(s.preco)));
    return opcao({ tipo: "radio", nome: "cl-servico", valor: s.id, id: `cs-${s.id}`, marcado: s.id === escolha.servico, partes: [criar("span", "opcao__nome", s.nome), meta] });
  }));
  if (escolha.servico && !agenda.servicos.some((s) => s.id === escolha.servico)) Object.assign(escolha, { servico: "", profissional: "", data: "", horario: "" });
}

function montarProfissionaisCliente() {
  const s = servicoEscolhido();
  $("cl-dica-profissional").textContent = `${s.nome} · ${duracaoTexto(s.duracao)} · ${moeda(s.preco)}`;
  const opcoes = [opcao({
    tipo: "radio", nome: "cl-profissional", valor: "", id: "cp-qualquer", marcado: escolha.profissional === "",
    partes: [criar("span", "retrato", "?"), criar("span", "opcao__nome", "Sem preferência"), criar("span", "opcao__meta", "Quem estiver livre")],
  })];
  agenda.profissionaisPara(s.id).forEach((p) => opcoes.push(opcao({
    tipo: "radio", nome: "cl-profissional", valor: p.id, id: `cp-${p.id}`, marcado: escolha.profissional === p.id,
    partes: [criar("span", "retrato", p.nome[0]), criar("span", "opcao__nome", p.nome), criar("span", "opcao__meta", p.especialidade || "")],
  })));
  opcoes.forEach((o) => { const r = o.querySelector(".retrato"); if (r) r.setAttribute("aria-hidden", "true"); });
  $("cl-profissionais").replaceChildren(...opcoes);
}

function montarCalendarioCliente() {
  const caixa = $("mes-dias");
  const [ano, mes] = mesVisivel.split("-").map(Number);
  const primeiro = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const hoje = util.hoje();
  const limite = util.somarDias(hoje, CONFIG.diasNaAgendaDoCliente);
  const s = servicoEscolhido();

  $("mes-titulo").textContent = primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("mes-anterior").disabled = mesVisivel <= hoje.slice(0, 7);
  $("mes-proximo").disabled = mesVisivel >= limite.slice(0, 7);

  const itens = [];
  for (let i = 0; i < primeiro.getDay(); i++) itens.push(criar("span"));
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const chave = `${mesVisivel}-${String(dia).padStart(2, "0")}`;
    const botao = criar("button", "dia-btn", dia);
    botao.type = "button";
    let rotulo = dataLonga(chave);
    const fechado = !agenda.expedienteDo(chave).length;
    if (chave < hoje || chave > limite || fechado) {
      botao.disabled = true;
      rotulo += chave < hoje ? ", já passou" : fechado ? ", fechado" : ", fora do período de reservas";
    } else {
      const livres = agenda.horariosDisponiveis({ data: chave, servicoId: s.id, profissionalId: escolha.profissional || null });
      if (livres.length) { botao.classList.add("tem-horario"); rotulo += `, ${plural(livres.length, "horário livre", "horários livres")}`; }
      else { botao.disabled = true; rotulo += ", sem horários livres"; }
    }
    if (chave === hoje) botao.classList.add("hoje");
    botao.setAttribute("aria-label", rotulo);
    botao.setAttribute("aria-pressed", String(chave === escolha.data));
    botao.addEventListener("click", () => {
      escolha.data = chave;
      escolha.horario = "";
      caixa.querySelectorAll(".dia-btn").forEach((b) => b.setAttribute("aria-pressed", String(b === botao)));
      $("cl-erro").textContent = "";
    });
    itens.push(botao);
  }
  caixa.replaceChildren(...itens);
}

function montarHorariosCliente() {
  const s = servicoEscolhido();
  const caixa = $("cl-horarios");
  $("cl-dica-horario").textContent = `${s.nome} · ${escolha.profissional ? nomeProfissional(escolha.profissional) : "sem preferência"} · ${dataLonga(escolha.data)}`;
  const livres = agenda.horariosDisponiveis({ data: escolha.data, servicoId: s.id, profissionalId: escolha.profissional || null });
  if (!livres.some((h) => h.hora === escolha.horario)) escolha.horario = "";
  if (!livres.length) {
    caixa.replaceChildren(criar("p", "horarios-vazio", "Não há mais horários livres neste dia. Volte e escolha outra data."));
    return;
  }
  const blocos = [];
  [["Manhã", (m) => m < 720], ["Tarde", (m) => m >= 720]].forEach(([titulo, filtro]) => {
    const doPeriodo = livres.filter((h) => filtro(util.paraMinutos(h.hora)));
    if (!doPeriodo.length) return;
    const bloco = criar("div", "periodo");
    const grade = criar("div", "periodo__grade");
    doPeriodo.forEach((h) => {
      const fim = util.paraHora(util.paraMinutos(h.hora) + s.duracao);
      grade.append(opcao({ tipo: "radio", nome: "cl-horario", valor: h.hora, id: `ch-${h.hora.replace(":", "")}`, marcado: h.hora === escolha.horario, partes: [h.hora], rotulo: `${h.hora} às ${fim}` }));
    });
    bloco.append(criar("p", "periodo__titulo", titulo), grade);
    blocos.push(bloco);
  });
  caixa.replaceChildren(...blocos);
}

function montarRevisaoCliente(dl, comAlterar, reserva) {
  const s = reserva ? { nome: reserva.servicoNome, preco: reserva.preco, duracao: reserva.duracao } : servicoEscolhido();
  const prof = reserva ? reserva.profissionalId : escolha.profissional;
  const data = reserva ? reserva.data : escolha.data;
  const inicio = reserva ? reserva.inicio : escolha.horario;
  const obs = reserva ? reserva.observacao : $("cl-obs").value.trim();
  const linhas = [
    ["Serviço", `${s.nome} · ${duracaoTexto(s.duracao)} · ${moeda(s.preco)}`, 1],
    ["Profissional", prof ? nomeProfissional(prof) : "Sem preferência (definido ao confirmar)", 2],
    ["Data", dataLonga(data), 3],
    ["Horário", `${inicio} às ${util.paraHora(util.paraMinutos(inicio) + s.duracao)}`, 4],
    ["Nome", reserva ? reserva.cliente.nome : $("cl-nome").value.trim(), 5],
    ["Telefone", reserva ? reserva.cliente.contato : $("cl-telefone").value.trim(), 5],
  ];
  if (obs) linhas.push(["Observação", obs, 5]);
  dl.replaceChildren(...linhas.map(([titulo, valor, etapa]) => {
    const div = criar("div");
    div.append(criar("dt", "", titulo), criar("dd", "", valor));
    if (comAlterar) {
      const b = criar("button", "revisao__editar", "Alterar");
      b.type = "button";
      b.setAttribute("aria-label", `Alterar ${titulo.toLowerCase()}`);
      b.addEventListener("click", () => irPara(etapa));
      div.append(b);
    }
    return div;
  }));
}

function validarEtapaCliente() {
  if (etapaAtual === 1 && !escolha.servico) return "Escolha um serviço para continuar.";
  if (etapaAtual === 3 && !escolha.data) return "Escolha um dia com horários livres.";
  if (etapaAtual === 4 && !escolha.horario) return "Escolha um horário.";
  if (etapaAtual === 5) {
    const nome = $("cl-nome");
    const tel = $("cl-telefone");
    nome.removeAttribute("aria-invalid");
    tel.removeAttribute("aria-invalid");
    if (nome.value.trim().length < 2) { nome.setAttribute("aria-invalid", "true"); nome.focus(); return "Escreva seu nome."; }
    const digitos = tel.value.replace(/\D/g, "");
    if (digitos.length < 10 || digitos.length > 11) { tel.setAttribute("aria-invalid", "true"); tel.focus(); return "Informe um telefone com DDD (10 ou 11 números)."; }
  }
  return "";
}

function irPara(numero, focar = true) {
  etapaAtual = numero;
  document.querySelectorAll("#form-cliente [data-etapa]").forEach((etapa) => {
    const ativa = Number(etapa.dataset.etapa) === numero;
    etapa.hidden = !ativa;
    if (ativa) animar(etapa, "etapa-entrar");
  });
  document.querySelectorAll("#etapas li").forEach((li, i) => {
    li.classList.toggle("is-feito", i + 1 < numero);
    if (i + 1 === numero) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
  $("cl-voltar").hidden = numero === 1;
  $("cl-avancar").textContent = numero === 5 ? "Revisar" : numero === 6 ? "Confirmar reserva" : "Continuar";
  $("cl-erro").textContent = "";
  if (numero === 2) montarProfissionaisCliente();
  if (numero === 3) montarCalendarioCliente();
  if (numero === 4) montarHorariosCliente();
  if (numero === 6) montarRevisaoCliente($("cl-revisao"), true);
  if (!focar || vistaAtual !== "reservar") return;
  const etapa = document.querySelector(`#form-cliente [data-etapa="${numero}"]`);
  const alvo = numero === 6 ? etapa.querySelector(".etapa__titulo") : etapa.querySelector("input:checked, input:not(:disabled), button.dia-btn:not(:disabled)");
  if (alvo && document.activeElement && document.activeElement !== document.body) alvo.focus({ preventScroll: true });
}

// Quando os dados mudam com a página do cliente aberta, atualiza só a etapa atual
function renderClienteAoMudar() {
  if ($("assistente").hidden) return;
  if (etapaAtual === 1) montarServicosCliente();
  if (etapaAtual === 3) montarCalendarioCliente();
  if (etapaAtual === 4) montarHorariosCliente();
}

function prepararCliente() {
  $("cl-servicos").addEventListener("change", (e) => {
    escolha.servico = e.target.value;
    Object.assign(escolha, { profissional: "", data: "", horario: "" });
    $("cl-erro").textContent = "";
  });
  $("cl-profissionais").addEventListener("change", (e) => {
    escolha.profissional = e.target.value;
    escolha.data = "";
    escolha.horario = "";
  });
  $("cl-horarios").addEventListener("change", (e) => { escolha.horario = e.target.value; $("cl-erro").textContent = ""; });
  const mudarMes = (delta) => {
    const [a, m] = mesVisivel.split("-").map(Number);
    const nova = new Date(a, m - 1 + delta, 1);
    mesVisivel = `${nova.getFullYear()}-${String(nova.getMonth() + 1).padStart(2, "0")}`;
    montarCalendarioCliente();
  };
  $("mes-anterior").addEventListener("click", () => mudarMes(-1));
  $("mes-proximo").addEventListener("click", () => mudarMes(1));
  mascaraTelefone($("cl-telefone"));
  $("cl-voltar").addEventListener("click", () => irPara(etapaAtual - 1));

  $("form-cliente").addEventListener("submit", (e) => {
    e.preventDefault();
    const problema = validarEtapaCliente();
    if (problema) { $("cl-erro").textContent = problema; return; }
    if (etapaAtual < 6) { irPara(etapaAtual + 1); return; }

    // Confirmar: o motor confere a disponibilidade de novo antes de gravar
    const res = agenda.reservar({
      servicoId: escolha.servico,
      profissionalId: escolha.profissional || null,
      data: escolha.data,
      inicio: escolha.horario,
      cliente: { nome: $("cl-nome").value, contato: $("cl-telefone").value },
      observacao: $("cl-obs").value,
      status: CONFIG.statusDoCliente,
      origem: "site",
    });
    if (!res.ok) {
      escolha.horario = "";
      irPara(4);
      $("cl-erro").textContent = res.erro;
      return;
    }
    const r = res.reserva;
    reservaConcluida = true;
    $("confirmado-codigo").textContent = `Código ${r.id.split("-")[1].toUpperCase()}`;
    montarRevisaoCliente($("cl-confirmado-dados"), false, r);
    $("assistente").hidden = true;
    const caixa = $("cl-confirmado");
    caixa.hidden = false;
    caixa.focus();
  });

  $("cl-recomecar").addEventListener("click", () => {
    reservaConcluida = false;
    $("form-cliente").reset();
    Object.assign(escolha, { servico: "", profissional: "", data: "", horario: "" });
    mesVisivel = util.hoje().slice(0, 7);
    $("cl-confirmado").hidden = true;
    $("assistente").hidden = false;
    montarServicosCliente();
    irPara(1);
    const primeiro = document.querySelector("#cl-servicos input");
    if (primeiro) primeiro.focus();
  });
}


/* ------------------------------------------------------------------------
   SERVIÇOS
   ------------------------------------------------------------------------ */
let servicoEditando = null;

function renderServicos() {
  $("lista-servicos").replaceChildren(...agenda.todosServicos.map((s) => {
    const tr = criar("tr");
    const td = (col, ...c) => { const x = criar("td"); x.dataset.col = col; x.append(...c); return x; };
    const ativo = s.ativo !== false;
    const profs = agenda.profissionaisPara(s.id).map((p) => p.nome);
    const acoes = criar("div", "acoes");
    const editar = criar("button", "acao", "Editar");
    editar.type = "button";
    editar.setAttribute("aria-label", `Editar ${s.nome}`);
    editar.addEventListener("click", () => abrirServico(s.id));
    const alternar = criar("button", `acao ${ativo ? "acao--perigo" : "acao--ok"}`, ativo ? "Desativar" : "Ativar");
    alternar.type = "button";
    alternar.setAttribute("aria-label", `${ativo ? "Desativar" : "Ativar"} ${s.nome}`);
    alternar.addEventListener("click", () => {
      const res = agenda.salvarServico({ ...s, ativo: !ativo });
      Comum.aviso(res.ok ? `${s.nome} ${ativo ? "desativado: não aparece mais para o cliente" : "ativado"}.` : res.erro);
    });
    acoes.append(editar, alternar);
    tr.append(
      td("nome", s.nome),
      td("duracao", criar("span", "hora", duracaoTexto(s.duracao))),
      td("preco", criar("span", "hora", moeda(s.preco))),
      td("profs", criar("span", "profs-lista", profs.length ? profs.join(", ") : "Ninguém (não pode ser reservado)")),
      td("situacao", criar("span", `status status--${ativo ? "ativo" : "inativo"}`, ativo ? "Ativo" : "Inativo")),
      td("acoes", acoes),
    );
    return tr;
  }));
}

function abrirServico(id) {
  servicoEditando = id || null;
  const s = id ? agenda.servico(id) : null;
  $("form-servico").reset();
  $("js-erro").textContent = "";
  $("js-titulo").textContent = s ? "Editar serviço" : "Novo serviço";
  $("js-nome").value = s ? s.nome : "";
  $("js-duracao").value = s ? s.duracao : 30;
  $("js-preco").value = s ? s.preco : "";
  $("js-ativo").checked = s ? s.ativo !== false : true;
  const quem = s ? agenda.profissionaisPara(s.id).map((p) => p.id) : [];
  $("js-profissionais").replaceChildren(...agenda.profissionais.map((p) => {
    const l = criar("label", "check");
    const c = document.createElement("input");
    Object.assign(c, { type: "checkbox", value: p.id, checked: quem.includes(p.id) });
    l.append(c, ` ${p.nome}`);
    return l;
  }));
  Comum.abrirDialogo($("janela-servico"));
  $("js-nome").focus();
}

function prepararServicos() {
  $("novo-servico").addEventListener("click", () => abrirServico());
  $("form-servico").addEventListener("submit", (e) => {
    e.preventDefault();
    const erro = $("js-erro");
    const ids = [...document.querySelectorAll("#js-profissionais input:checked")].map((c) => c.value);
    if (!ids.length) { erro.textContent = "Escolha pelo menos um profissional para este serviço."; return; }
    const res = agenda.salvarServico({
      id: servicoEditando || undefined,
      nome: $("js-nome").value,
      duracao: $("js-duracao").value,
      preco: String($("js-preco").value).replace(",", "."),
      ativo: $("js-ativo").checked,
    });
    if (!res.ok) { erro.textContent = res.erro; return; }
    agenda.definirProfissionaisDoServico(res.servico.id, ids);
    $("janela-servico").close();
    Comum.aviso(`Serviço "${res.servico.nome}" salvo.`);
  });
}


/* ------------------------------------------------------------------------
   EXPEDIENTE
   ------------------------------------------------------------------------ */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOME_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function linhaDoDia(dia) {
  const periodos = (agenda.expediente[dia] || []).map((p) => [...p]);
  const caixa = criar("div", "dia-exp");
  caixa.dataset.dia = dia;

  const nome = criar("div", "dia-exp__nome");
  const aberto = document.createElement("input");
  Object.assign(aberto, { type: "checkbox", checked: periodos.length > 0, id: `exp-aberto-${dia}` });
  const rotulo = criar("label", "check");
  rotulo.htmlFor = aberto.id;
  rotulo.append(aberto, " Aberto");
  nome.append(criar("b", "", NOME_DIA[dia]), rotulo);

  const lista = criar("div", "dia-exp__periodos");
  const erro = criar("p", "erro");
  erro.setAttribute("role", "alert");

  const desenhar = () => {
    if (!aberto.checked) {
      lista.replaceChildren(criar("p", "dia-exp__fechado", "Fechado. Nenhum horário aparece para o cliente."));
    } else {
      if (!periodos.length) periodos.push(["09:00", "18:00"]);
      const linhas = periodos.map((p, i) => {
        const linha = criar("div", "periodo-exp");
        const ini = document.createElement("input");
        const fim = document.createElement("input");
        Object.assign(ini, { type: "time", value: p[0], step: 900 });
        Object.assign(fim, { type: "time", value: p[1], step: 900 });
        ini.setAttribute("aria-label", `${NOME_DIA[dia]}, período ${i + 1}, abertura`);
        fim.setAttribute("aria-label", `${NOME_DIA[dia]}, período ${i + 1}, fechamento`);
        ini.addEventListener("change", () => { p[0] = ini.value; });
        fim.addEventListener("change", () => { p[1] = fim.value; });
        linha.append(ini, criar("span", "", "às"), fim);
        if (periodos.length > 1) {
          const rem = criar("button", "acao", "Remover");
          rem.type = "button";
          rem.setAttribute("aria-label", `Remover período ${i + 1} de ${NOME_DIA[dia]}`);
          rem.addEventListener("click", () => { periodos.splice(i, 1); desenhar(); });
          linha.append(rem);
        }
        return linha;
      });
      const acoes = criar("div", "dia-exp__acoes");
      if (periodos.length < 3) {
        const add = criar("button", "acao", "+ Período");
        add.type = "button";
        add.setAttribute("aria-label", `Adicionar período em ${NOME_DIA[dia]}`);
        add.addEventListener("click", () => {
          const ultimo = periodos[periodos.length - 1];
          const ini = Math.min(util.paraMinutos(ultimo[1]) + 60, 22 * 60);
          periodos.push([util.paraHora(ini), util.paraHora(Math.min(ini + 120, 23 * 60 + 45))]);
          desenhar();
        });
        acoes.append(add);
      }
      lista.replaceChildren(...linhas, acoes);
    }
    const salvar = criar("button", "btn btn--primario btn--pequeno", "Salvar");
    salvar.type = "button";
    salvar.setAttribute("aria-label", `Salvar expediente de ${NOME_DIA[dia]}`);
    salvar.addEventListener("click", () => {
      const res = agenda.definirExpediente(dia, aberto.checked ? periodos.filter((p) => p[0] && p[1]) : []);
      erro.textContent = res.ok ? "" : res.erro;
      if (res.ok) {
        Comum.aviso(`Expediente de ${NOME_DIA[dia].toLowerCase()} salvo.`);
        const nova = linhaDoDia(dia);
        caixa.replaceWith(nova);
        animar(nova, "salvo");
      }
    });
    lista.append(salvar);
  };
  aberto.addEventListener("change", desenhar);
  desenhar();
  caixa.append(nome, lista, erro);
  return caixa;
}

function renderExpediente() {
  $("expediente").replaceChildren(...ORDEM_DIAS.map(linhaDoDia));
}


/* ------------------------------------------------------------------------
   BLOQUEIOS
   ------------------------------------------------------------------------ */
function prepararBloqueios() {
  const sel = $("bl-profissional");
  agenda.profissionais.forEach((p) => sel.append(opcaoSelect(p.id, p.nome)));
  $("bl-data").min = util.hoje();
  $("bl-data").value = proximoDiaAberto(util.hoje());
  $("form-bloqueio").addEventListener("submit", (e) => {
    e.preventDefault();
    const erro = $("bl-erro");
    const data = $("bl-data").value;
    if (!data || data < util.hoje()) { erro.textContent = "Escolha uma data de hoje em diante."; $("bl-data").focus(); return; }
    const res = agenda.bloquear({ profissionalId: sel.value || null, data, inicio: $("bl-inicio").value, fim: $("bl-fim").value, motivo: $("bl-motivo").value });
    erro.textContent = res.ok ? "" : res.erro;
    if (!res.ok) return;
    $("bl-motivo").value = "";
    Comum.aviso(`Horário bloqueado: ${dataCurta(data)}, ${res.bloqueio.inicio} às ${res.bloqueio.fim}.`);
  });
}

function renderBloqueios() {
  const hoje = util.hoje();
  const lista = agenda.bloqueios.filter((b) => b.data >= hoje).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  $("bloqueios-vazio").hidden = lista.length > 0;
  $("lista-bloqueios").replaceChildren(...lista.map((b) => {
    const li = criar("li", "item-bloqueio");
    const quem = b.profissionalId ? nomeProfissional(b.profissionalId) : "Todos";
    const rem = criar("button", "acao acao--perigo", "Remover");
    rem.type = "button";
    rem.setAttribute("aria-label", `Remover bloqueio de ${dataCurta(b.data)}, ${b.inicio} às ${b.fim}`);
    rem.addEventListener("click", () => { agenda.desbloquear(b.id); Comum.aviso("Bloqueio removido. O horário voltou a ficar disponível."); });
    li.append(criar("b", "", `${dataCurta(b.data)} · ${b.inicio}–${b.fim}`), rem, criar("span", "", `${quem}${b.motivo ? ` · ${b.motivo}` : ""}`));
    return li;
  }));
}


/* ------------------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  prepararAgenda();
  prepararReservas();
  prepararJanelaReserva();
  prepararCliente();
  prepararServicos();
  prepararBloqueios();

  document.querySelectorAll("[data-novo]").forEach((b) => b.addEventListener("click", () => abrirNovo()));
  document.querySelectorAll("[data-restaurar]").forEach((b) => b.addEventListener("click", () => confirmar(
    "Restaurar dados de exemplo?",
    "Todas as reservas, serviços, horários e bloqueios deste navegador voltam ao estado inicial da demonstração.",
    "Restaurar",
    () => {
      agenda.resetar();
      if (vistaAtual === "expediente") renderExpediente();
      Comum.aviso("Dados de exemplo restaurados.");
    },
  )));
  // Links que já chegam com um filtro (ex.: "Ver pendentes")
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-filtro-status]");
    if (!link) return;
    $("filtros").reset();
    $("fl-status").value = link.dataset.filtroStatus;
  });

  window.addEventListener("hashchange", () => rota());
  rota(true);
  if (!agenda.persistente) Comum.aviso("Este navegador não permite salvar dados: as mudanças somem ao recarregar a página.");
});
