/* ==========================================================================
   Agenda de Estúdio — util.js
   Funções de apoio usadas pelo site, pelo agendamento e pelo painel:
   datas e horas no fuso do estabelecimento, dinheiro, telefone, e-mail,
   códigos de reserva e um construtor simples de elementos da página.

   Por que o fuso importa: "hoje" e "agora" são lidos no fuso configurado
   no painel (padrão: America/Sao_Paulo), e não no relógio de quem abre o
   site. Assim, quem está em outro estado não vê horários que já passaram
   para o estabelecimento.
   ========================================================================== */
window.AE = window.AE || {};

(function () {
  "use strict";

  const dd = (n) => String(n).padStart(2, "0");

  /* ---------- Fuso, hoje e agora ---------- */
  let fuso = "America/Sao_Paulo";
  let formatador = null;
  function definirFuso(tz) {
    try {
      formatador = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      fuso = tz;
      return true;
    } catch (e) {
      return false;
    }
  }
  definirFuso(fuso);
  function partesAgora() {
    const p = Object.fromEntries(formatador.formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { data: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
  }
  const hoje = () => partesAgora().data;
  const agoraMin = () => partesAgora().min;
  const agora = () => { const p = partesAgora(); return `${p.data}T${hhmm(p.min)}`; };
  const momentoISO = () => new Date().toISOString();

  /* ---------- Datas no formato "AAAA-MM-DD" (sem depender do fuso de quem abre) ---------- */
  const dataValida = (k) => /^\d{4}-\d{2}-\d{2}$/.test(String(k || "")) && paraChave(deChave(k)) === k;
  function deChave(k) {
    const [a, m, d] = String(k).split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d, 12));
  }
  const paraChave = (dt) => `${dt.getUTCFullYear()}-${dd(dt.getUTCMonth() + 1)}-${dd(dt.getUTCDate())}`;
  const somarDias = (k, n) => { const d = deChave(k); d.setUTCDate(d.getUTCDate() + n); return paraChave(d); };
  const diasEntre = (a, b) => Math.round((deChave(b) - deChave(a)) / 86400000);
  const diaDaSemana = (k) => deChave(k).getUTCDay();
  const inicioDoMes = (k) => `${k.slice(0, 7)}-01`;
  function somarMeses(k, n) {
    const d = deChave(inicioDoMes(k));
    d.setUTCMonth(d.getUTCMonth() + n);
    return paraChave(d);
  }
  const diasNoMes = (k) => { const d = deChave(inicioDoMes(k)); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.getUTCDate(); };
  function inicioDaSemana(k) { return somarDias(k, -diaDaSemana(k)); }

  /* ---------- Horas ---------- */
  const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ""));
  const minutos = (h) => { const [a, b] = String(h).split(":").map(Number); return a * 60 + b; };
  const hhmm = (m) => `${dd(Math.floor(m / 60))}:${dd(m % 60)}`;

  /* ---------- Textos de data ---------- */
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const nomeDia = (k) => DIAS[diaDaSemana(k)];
  const dataLonga = (k) => { const d = deChave(k); return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
  const dataMedia = (k) => { const d = deChave(k); return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
  const dataCurta = (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  const dataBR = (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
  const mesAno = (k) => { const d = deChave(k); return `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
  function quando(k) {
    const dif = diasEntre(hoje(), k);
    if (dif === 0) return "hoje";
    if (dif === 1) return "amanhã";
    if (dif === -1) return "ontem";
    return dataLonga(k);
  }
  function momentoBR(iso) {
    try {
      return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", " às");
    } catch (e) { return String(iso || ""); }
  }
  function duracao(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  /* ---------- Horário de funcionamento em texto ----------
     { 2: [["09:00","19:00"]], ... } → [{ dias: "Terça a sexta", horas: "9h às 19h" }, ...]
     A semana começa na segunda, como se costuma escrever no Brasil. */
  const horaCurta = (h) => { const [a, b] = h.split(":"); return `${Number(a)}h${b === "00" ? "" : b}`; };
  function resumoHorarios(horarios) {
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const texto = (dia) => ((horarios || {})[dia] || []).map(([a, b]) => `${horaCurta(a)} às ${horaCurta(b)}`).join(" e ");
    const grupos = [];
    ordem.forEach((dia) => {
      const t = texto(dia);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.t === t && ordem.indexOf(ultimo.fim) === ordem.indexOf(dia) - 1) ultimo.fim = dia;
      else grupos.push({ inicio: dia, fim: dia, t });
    });
    return grupos.map((g) => {
      const n = ordem.indexOf(g.fim) - ordem.indexOf(g.inicio);
      const dias = n === 0 ? NOMES[g.inicio] : n === 1 ? `${NOMES[g.inicio]} e ${NOMES[g.fim].toLowerCase()}` : `${NOMES[g.inicio]} a ${NOMES[g.fim].toLowerCase()}`;
      return { dias, horas: g.t || "Fechado", fechado: !g.t };
    });
  }

  /* ---------- Dinheiro ---------- */
  const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const moeda = (v) => formatoMoeda.format(Number(v) || 0).replace(/ /g, " ");
  function lerValor(texto) {
    const s = String(texto ?? "").trim().replace(/\s|R\$/g, "");
    if (!s) return NaN;
    const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    return /^\d+(\.\d{1,2})?$/.test(normal) ? Number(normal) : NaN;
  }
  const valorEditavel = (v) => (Number(v) || 0).toFixed(2).replace(".", ",");

  /* ---------- Telefone e e-mail ---------- */
  const soDigitos = (s) => String(s || "").replace(/\D/g, "");
  function telefoneValido(s) {
    let d = soDigitos(s);
    if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
    if (d.length !== 10 && d.length !== 11) return false;
    const ddd = Number(d.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (d.length === 11 && d[2] !== "9") return false;
    return !/^(\d)\1+$/.test(d.slice(2));
  }
  function normalizarTelefone(s) {
    let d = soDigitos(s);
    if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
    return d;
  }
  function formatarTelefone(s) {
    const d = normalizarTelefone(s);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return String(s || "");
  }
  // Máscara enquanto a pessoa digita: só organiza, não inventa dígitos
  function mascararTelefone(s) {
    const d = soDigitos(s).slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
  // Número de WhatsApp comercial: só dígitos, com 55 + DDD + número
  function whatsappComercial(s) {
    let d = soDigitos(s);
    if (d.length === 10 || d.length === 11) d = "55" + d;
    return /^55\d{10,11}$/.test(d) && telefoneValido(d) ? d : "";
  }
  const linkWhatsapp = (numero, mensagem) => `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

  /* ---------- Identificadores ---------- */
  let contador = 0;
  const novoId = (p) => { contador += 1; return `${p}${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`; };
  // Código da reserva: 6 caracteres sorteados (sem letras confundíveis como O/0 e I/1).
  // Não é sequencial: conhecer um código não ajuda a adivinhar outro.
  const ALFABETO = "ACDEFGHJKMNPQRTUVWXY34679";
  function codigoReserva() {
    const n = new Uint32Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(n);
    else for (let i = 0; i < 6; i += 1) n[i] = Math.floor(Math.random() * 1e9);
    return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join("");
  }
  const normalizarCodigo = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  /* ---------- Texto ---------- */
  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const limpar = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const limparLongo = (s, max) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  /* ---------- Elementos da página ----------
     el("button", { class: "x", onclick: fn, texto: "Salvar" }, filho1, filho2)
     Texto sempre entra como texto (nunca como HTML). */
  function el(tag, atributos, ...filhos) {
    const no = tag === "svg" || tag === "use" ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    Object.entries(atributos || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "texto") no.textContent = v;
      else if (k === "class") no.setAttribute("class", v);
      else if (k === "style" && typeof v === "object") Object.entries(v).forEach(([prop, val]) => { if (prop.startsWith("--")) no.style.setProperty(prop, val); else no.style[prop] = val; });
      else if (k === "dataset") Object.assign(no.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") no.addEventListener(k.slice(2), v);
      else if (v === true) no.setAttribute(k, "");
      else no.setAttribute(k, v);
    });
    filhos.flat(Infinity).forEach((f) => {
      if (f === null || f === undefined || f === false) return;
      no.append(f instanceof Node ? f : document.createTextNode(String(f)));
    });
    return no;
  }
  function icone(nome, tamanho = 18) {
    const svg = el("svg", { width: tamanho, height: tamanho, "aria-hidden": "true", focusable: "false", class: "ae-icone" });
    svg.append(el("use", { href: `#i-${nome}` }));
    return svg;
  }
  const trocar = (alvo, ...filhos) => { if (alvo) alvo.replaceChildren(...filhos.flat(Infinity).filter((f) => f !== null && f !== undefined && f !== false)); };

  /* ---------- Aviso rápido acessível ---------- */
  let temporizador;
  function aviso(texto, tipo = "info") {
    let caixa = document.querySelector(".ae-aviso");
    if (!caixa) {
      caixa = el("div", { class: "ae-aviso", role: "status", "aria-live": "polite" });
      document.body.append(caixa);
    }
    caixa.dataset.tipo = tipo;
    caixa.hidden = false;
    caixa.textContent = texto;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { caixa.hidden = true; }, 6000);
  }

  /* ---------- Gerador de números previsível (para montar os exemplos) ---------- */
  function sorteio(semente) {
    let s = semente >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  /* ---------- Termos de cada marca ----------
     Os textos usam marcadores como "{A} profissional" ou "{ca} cliente".
     Cada marca define o gênero no seu dados.js (AE.termos); o padrão é feminino.
       prof: {a} {A} {s} (sufixo) {uma} {nenhuma} {Nenhuma} {Todasas} {cada} {Nova} {ela} {dela}
       cliente: {ca} {cA} {cs} {cdela} {ccada} */
  AE.termos = AE.termos || {
    a: "a", A: "A", s: "a", uma: "uma", nenhuma: "nenhuma", Nenhuma: "Nenhuma", Todasas: "Todas as", cada: "cada uma", Nova: "Nova", ela: "ela", dela: "dela",
    ca: "a", cA: "A", cs: "a", cdela: "dela", ccada: "cada uma",
  };
  AE.t = (texto) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(AE.termos, k) ? AE.termos[k] : m));

  AE.util = {
    dd, definirFuso, fusoAtual: () => fuso, hoje, agoraMin, agora, momentoISO,
    dataValida, deChave, paraChave, somarDias, diasEntre, diaDaSemana, inicioDoMes, somarMeses, diasNoMes, inicioDaSemana,
    horaValida, minutos, hhmm, DIAS, DIAS_CURTOS, MESES, nomeDia, dataLonga, dataMedia, dataCurta, dataBR, mesAno, quando, momentoBR, duracao, horaCurta, resumoHorarios,
    moeda, lerValor, valorEditavel,
    soDigitos, telefoneValido, normalizarTelefone, formatarTelefone, mascararTelefone, emailValido, whatsappComercial, linkWhatsapp,
    novoId, codigoReserva, normalizarCodigo,
    semAcento, limpar, limparLongo, plural,
    el, icone, trocar, aviso, sorteio,
  };
})();
