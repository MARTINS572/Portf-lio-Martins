/* ==========================================================================
   NEXORA BOOKING — util.js
   Funções pequenas usadas por todas as telas: criar elementos, formatar
   datas e horas (no fuso do estabelecimento), valores, validações,
   mensagens, janelas de confirmação, formulários e CSV.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";

  /* ---------- Elementos ---------- */
  // el("div", { class: "x", onclick: fn, "aria-label": "..." }, filho1, "texto", ...)
  function el(tag, atributos, ...filhos) {
    const e = document.createElement(tag);
    Object.entries(atributos || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "dataset") Object.assign(e.dataset, v);
      else if (k === "style" && typeof v === "object") Object.entries(v).forEach(([prop, val]) => { if (val == null) return; if (prop.startsWith("--")) e.style.setProperty(prop, val); else e.style[prop] = val; });
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (k === "texto") e.textContent = v;
      else if (k === "value") e.value = v;
      else if (v === true) e.setAttribute(k, "");
      else e.setAttribute(k, v);
    });
    filhos.flat().forEach((f) => {
      if (f == null || f === false) return;
      e.append(f instanceof Node ? f : document.createTextNode(String(f)));
    });
    return e;
  }

  // Ícone Lucide do sprite do index.html
  function icone(nome, tamanho = 18) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ic");
    svg.setAttribute("width", tamanho);
    svg.setAttribute("height", tamanho);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", `#i-${nome}`);
    svg.append(use);
    return svg;
  }

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  // Troca o conteúdo ignorando null/false (igual ao el())
  const trocar = (alvo, ...filhos) => { alvo.replaceChildren(...filhos.flat().filter((f) => f != null && f !== false)); return alvo; };
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  /* ---------- Datas ----------
     Dia: "AAAA-MM-DD". Hora: "HH:MM". Momento: "AAAA-MM-DDTHH:MM".
     Tudo é guardado como "hora de parede" do ESTABELECIMENTO. O relógio
     ("hoje" e "agora") é lido no fuso do estabelecimento (definirFuso), e
     não no fuso de quem abre a página: assim um cliente em outro estado vê
     os mesmos horários e nada se desloca. Comparar textos = comparar datas. */
  const dd = (n) => String(n).padStart(2, "0");
  const chave = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  // Meio-dia evita problemas em fusos que mudam de horário à meia-noite
  const deChave = (c) => { const [a, m, d] = String(c).slice(0, 10).split("-").map(Number); return new Date(a, m - 1, d, 12); };
  let fuso = null;
  let formatadorFuso = null;
  function definirFuso(tz) {
    try { formatadorFuso = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); fuso = tz; }
    catch (e) { formatadorFuso = null; fuso = null; }
  }
  function partesAgora() {
    const d = new Date();
    if (!formatadorFuso) return { data: chave(d), h: d.getHours(), m: d.getMinutes() };
    const p = Object.fromEntries(formatadorFuso.formatToParts(d).map((x) => [x.type, x.value]));
    return { data: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour) % 24, m: Number(p.minute) };
  }
  const hoje = () => partesAgora().data;
  const agora = () => { const p = partesAgora(); return `${p.data}T${dd(p.h)}:${dd(p.m)}`; };
  const fusoAtual = () => fuso;
  // Horas ↔ minutos do dia
  const minutos = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };
  const hhmm = (min) => `${dd(Math.floor(min / 60))}:${dd(min % 60)}`;
  const horaValida = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || "");
  const somarDias = (c, n) => { const d = deChave(c); d.setDate(d.getDate() + n); return chave(d); };
  const diasEntre = (a, b) => Math.round((deChave(b) - deChave(a)) / 86400000);
  const inicioDoMes = (c) => `${String(c).slice(0, 7)}-01`;
  const fimDoMes = (c) => { const d = deChave(inicioDoMes(c)); d.setMonth(d.getMonth() + 1); d.setDate(0); return chave(d); };
  const somarMeses = (c, n) => { const d = deChave(inicioDoMes(c)); d.setMonth(d.getMonth() + n); return chave(d); };
  const dataValida = (c) => /^\d{4}-\d{2}-\d{2}$/.test(c || "") && !Number.isNaN(deChave(c).getTime()) && chave(deChave(c)) === c;
  const momentoValido = (m) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(m || "") && dataValida(m.slice(0, 10)) && Number(m.slice(11, 13)) < 24 && Number(m.slice(14, 16)) < 60;
  const diaDaSemana = (c) => deChave(c).getDay(); // 0 = domingo

  const fmtCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  const fmtCompleta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtLonga = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const fmtMesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const limpar = (t) => t.replace(/\./g, "").replace(" de ", " ");
  const dataCurta = (c) => limpar(fmtCurta.format(deChave(c)));            // "12 out"
  const dataCompleta = (c) => fmtCompleta.format(deChave(c));             // "12/10/2026"
  const dataLonga = (c) => fmtLonga.format(deChave(c));                   // "segunda-feira, 12 de outubro"
  const mesAno = (c) => fmtMesAno.format(deChave(c));                     // "outubro de 2026"
  const hora = (m) => String(m || "").slice(11, 16);                      // "14:32"
  const dataHora = (m) => `${dataCompleta(m)} ${hora(m)}`;                // "12/10/2026 14:32"
  function dataHoraCurta(m) {                                             // "hoje, 14:32" / "12 out, 14:32"
    const n = diasEntre(hoje(), m);
    const dia = n === 0 ? "hoje" : n === -1 ? "ontem" : dataCurta(m);
    return `${dia}, ${hora(m)}`;
  }
  function relativo(c) {
    const n = diasEntre(hoje(), c);
    if (n === 0) return "hoje";
    if (n === 1) return "amanhã";
    if (n === -1) return "ontem";
    if (n < 0) return `há ${-n} dias`;
    return `em ${n} dias`;
  }

  /* ---------- Números ---------- */
  const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatoMoedaInteira = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const formatoNumero = new Intl.NumberFormat("pt-BR");
  const formatoDecimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatoPercentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

  // Respeita a preferência "valores compactos" (R$ 12,5 mil)
  function moeda(v, { compacto } = {}) {
    const usarCompacto = compacto ?? (NX.preferencias && NX.preferencias.valoresCompactos);
    if (usarCompacto && Math.abs(v) >= 1000) return moedaCompacta(v);
    return formatoMoeda.format(v || 0);
  }
  function moedaCompacta(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return `R$ ${formatoNumero.format(Math.round(v / 1e5) / 10)} mi`;
    if (a >= 1e3) return `R$ ${formatoNumero.format(Math.round(v / 100) / 10)} mil`;
    return formatoMoedaInteira.format(v);
  }
  const numero = (v) => formatoNumero.format(v || 0);
  const decimal = (v) => formatoDecimal.format(v || 0);
  const percentual = (v) => formatoPercentual.format(Number.isFinite(v) ? v : 0);
  const plural = (n, um, varios) => `${numero(n)} ${Math.abs(n) === 1 ? um : varios}`;
  const unidades = (n) => `${numero(n)} un.`;
  const comSinal = (n) => (n > 0 ? `+${numero(n)}` : n < 0 ? `−${numero(-n)}` : "0");
  const arredondar = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

  /* ---------- Texto ---------- */
  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).filter((p) => p && /[\p{L}\d]/u.test(p[0])).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
  const contem = (texto, busca) => semAcento(texto).includes(semAcento(busca));

  function mascaraTelefone(valor) {
    const n = String(valor).replace(/\D/g, "").slice(0, 11);
    if (n.length > 10) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length > 6) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return n;
  }
  function mascaraCnpj(valor) {
    const n = String(valor).replace(/\D/g, "").slice(0, 14);
    return n.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  /* ---------- Validações ---------- */
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");
  const telefoneValido = (v) => { const n = String(v || "").replace(/\D/g, ""); return n.length === 10 || n.length === 11; };
  // Código de barras GTIN (EAN-8, UPC-12, EAN-13, GTIN-14): confere o dígito verificador
  function gtinValido(v) {
    const n = String(v || "");
    if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(n)) return false;
    const digitos = n.split("").map(Number);
    const dv = digitos.pop();
    const soma = digitos.reverse().reduce((t, d, i) => t + d * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - (soma % 10)) % 10 === dv;
  }
  // CNPJ: 14 dígitos e os dois dígitos verificadores
  function cnpjValido(v) {
    const n = String(v || "").replace(/\D/g, "");
    if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
    const calc = (base) => {
      const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const r = base.split("").reduce((t, d, i) => t + Number(d) * pesos[i], 0) % 11;
      return r < 2 ? 0 : 11 - r;
    };
    const d1 = calc(n.slice(0, 12));
    const d2 = calc(n.slice(0, 12) + d1);
    return n.endsWith(`${d1}${d2}`);
  }
  // Valor em reais: aceita "12.500,50", "12500.5", "R$ 89,90"
  function lerValor(v) {
    const t = String(v ?? "").trim().replace(/\s|R\$/g, "");
    if (!t) return NaN;
    let normal = t;
    if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");
    if (!/^-?\d+(\.\d+)?$/.test(normal)) return NaN;
    return Number(normal);
  }
  // Quantidade inteira (sem vírgula, sem sinal)
  function lerInteiro(v) {
    const t = String(v ?? "").trim().replace(/\./g, "");
    return /^\d{1,7}$/.test(t) ? Number(t) : NaN;
  }

  /* ---------- Avisos (toast) ---------- */
  let temporizador;
  function aviso(texto, tipo = "ok") {
    let caixa = $(".nx-aviso");
    if (!caixa) {
      caixa = el("div", { class: "nx-aviso", role: "status", "aria-live": "polite" });
      document.body.append(caixa);
    }
    const nomeIcone = { ok: "circle-check", erro: "triangle-alert", info: "info" }[tipo] || "info";
    caixa.className = `nx-aviso nx-aviso--${tipo}`;
    caixa.setAttribute("role", tipo === "erro" ? "alert" : "status");
    caixa.replaceChildren(icone(nomeIcone, 18), el("span", { texto }));
    caixa.hidden = false;
    // Se houver uma janela aberta, o aviso vai para dentro dela (fica por cima do fundo escuro)
    const janela = $$("dialog[open]").pop();
    (janela || document.body).append(caixa);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { caixa.hidden = true; }, tipo === "erro" ? 6500 : 4500);
  }

  /* ---------- Janela de confirmação ----------
     exigirCiencia: texto de uma caixa que precisa ser marcada antes de confirmar */
  function confirmar({ titulo, texto, rotulo = "Confirmar", perigo = false, exigirCiencia }) {
    return new Promise((resolver) => {
      const dlg = $("#dlg-confirmar");
      $("#confirmar-titulo", dlg).textContent = titulo;
      $("#confirmar-texto", dlg).textContent = texto;
      const ok = $("#confirmar-ok", dlg);
      ok.textContent = rotulo;
      ok.className = `btn ${perigo ? "btn--perigo-cheio" : "btn--primario"}`;
      const ciencia = $("#confirmar-ciencia", dlg);
      const caixa = $("#confirmar-ciencia-caixa", dlg);
      ciencia.checked = false;
      caixa.hidden = !exigirCiencia;
      $("#confirmar-ciencia-texto", dlg).textContent = exigirCiencia || "";
      ok.disabled = !!exigirCiencia;
      const aoMarcar = () => { ok.disabled = !ciencia.checked; };
      const fechar = (resultado) => {
        dlg.removeEventListener("close", aoFechar);
        ok.removeEventListener("click", aoOk);
        ciencia.removeEventListener("change", aoMarcar);
        if (dlg.open) dlg.close();
        resolver(resultado);
      };
      const aoOk = () => { if (!exigirCiencia || ciencia.checked) fechar(true); };
      const aoFechar = () => fechar(false);
      ok.addEventListener("click", aoOk);
      ciencia.addEventListener("change", aoMarcar);
      dlg.addEventListener("close", aoFechar);
      dlg.showModal();
      (exigirCiencia ? ciencia : perigo ? $("[data-fechar]", dlg) : ok).focus();
    });
  }

  /* ---------- Formulário genérico em janela ----------
     campos: [{ nome, rotulo, tipo, opcoes, obrigatorio, valor, largura, ajuda, min, max, passo,
                vazio, somenteLeitura, aoMudar(valor, form), placeholder, maiusculas, mascara }]
     tipo: text | email | tel | number | inteiro | dinheiro | date | datetime-local | select | textarea | checkbox
     opcoes (select): ["A","B"] ou [{ valor, rotulo, grupo, desativado }]
     aoSalvar(valores, form) → { ok: true } ou { ok: false, erros: { campo: "mensagem" }, erro: "geral" }
     Os valores digitados ficam na janela quando há erro (nada se perde). */
  function formulario({ titulo, descricao, campos, rotuloSalvar = "Salvar", aoSalvar, extra, largura }) {
    const dlg = $("#dlg-form");
    dlg.classList.toggle("janela--larga", largura === "larga");
    const form = $("#form-generico", dlg);
    form.reset();
    $("#form-titulo", dlg).textContent = titulo;
    const desc = $("#form-descricao", dlg);
    desc.replaceChildren(...(descricao ? [descricao] : []));
    desc.hidden = !descricao;
    const salvar = $("#form-salvar", dlg);
    salvar.textContent = rotuloSalvar;
    salvar.disabled = false;
    $("#form-erro", dlg).textContent = "";

    const grade = $("#form-campos", dlg);
    grade.replaceChildren(...campos.map((c) => {
      const id = `f-${c.nome}`;
      let controle;
      if (c.tipo === "select") {
        controle = el("select", { id, name: c.nome });
        const grupos = new Map();
        (c.vazio != null ? [{ valor: "", rotulo: c.vazio }] : []).concat(c.opcoes.map((o) => (typeof o === "string" ? { valor: o, rotulo: o } : o))).forEach((o) => {
          const op = el("option", { value: o.valor, texto: o.rotulo, disabled: !!o.desativado });
          if (String(o.valor) === String(c.valor ?? "")) op.selected = true;
          if (o.grupo) {
            if (!grupos.has(o.grupo)) { const g = el("optgroup", { label: o.grupo }); grupos.set(o.grupo, g); controle.append(g); }
            grupos.get(o.grupo).append(op);
          } else controle.append(op);
        });
      } else if (c.tipo === "textarea") {
        controle = el("textarea", { id, name: c.nome, rows: c.linhas || 3, maxlength: c.max || 500, placeholder: c.placeholder });
        controle.value = c.valor ?? "";
      } else if (c.tipo === "checkbox") {
        controle = el("input", { id, name: c.nome, type: "checkbox" });
        controle.checked = !!c.valor;
      } else {
        const tipoHtml = { inteiro: "text", dinheiro: "text" }[c.tipo] || c.tipo || "text";
        controle = el("input", {
          id, name: c.nome, type: tipoHtml, autocomplete: c.autocomplete || "off",
          min: c.min, max: ["number", "date", "datetime-local", "time"].includes(c.tipo) ? c.max : null, step: c.passo,
          maxlength: ["text", "email", "tel", "inteiro", "dinheiro"].includes(c.tipo || "text") ? (c.max && !["number"].includes(c.tipo) ? c.max : c.tipo === "inteiro" ? 9 : c.tipo === "dinheiro" ? 14 : 120) : null,
          inputmode: c.tipo === "tel" ? "tel" : c.tipo === "inteiro" ? "numeric" : c.tipo === "dinheiro" ? "decimal" : null,
          placeholder: c.placeholder, readonly: !!c.somenteLeitura,
        });
        controle.value = c.valor ?? "";
        if (c.tipo === "tel") controle.addEventListener("input", () => { controle.value = mascaraTelefone(controle.value); });
        if (c.mascara === "cnpj") controle.addEventListener("input", () => { controle.value = mascaraCnpj(controle.value); });
        if (c.maiusculas) controle.addEventListener("input", () => { const p = controle.selectionStart; controle.value = controle.value.toUpperCase(); controle.setSelectionRange(p, p); });
      }
      if (c.obrigatorio) controle.setAttribute("aria-required", "true");
      if (c.aoMudar) controle.addEventListener(c.tipo === "select" || c.tipo === "checkbox" ? "change" : "input", () => c.aoMudar(c.tipo === "checkbox" ? controle.checked : controle.value, form));
      const erro = el("p", { class: "campo__erro", id: `${id}-erro` });
      controle.setAttribute("aria-describedby", `${id}-erro ${id}-ajuda`);
      const ajuda = el("p", { class: "campo__ajuda", id: `${id}-ajuda` });
      if (c.ajuda instanceof Node) ajuda.append(c.ajuda); else if (c.ajuda) ajuda.textContent = c.ajuda;
      ajuda.hidden = !c.ajuda;
      if (c.tipo === "checkbox") {
        return el("div", { class: `campo campo--caixa${c.largura === "inteira" ? " campo--inteira" : ""}`, "data-campo": c.nome },
          el("label", { class: "caixa-marcar", for: id }, controle, el("span", { texto: c.rotulo })), ajuda, erro);
      }
      return el("div", { class: `campo${c.largura === "inteira" ? " campo--inteira" : ""}`, "data-campo": c.nome },
        el("label", { for: id }, c.rotulo, c.obrigatorio ? el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" }) : (c.somenteLeitura ? null : el("span", { class: "campo__opc", texto: " (opcional)" }))),
        controle, ajuda, erro);
    }));
    const caixaExtra = $("#form-extra", dlg);
    caixaExtra.replaceChildren(...(extra ? [extra] : []));

    let enviando = false;
    const aoEnviar = (evento) => {
      evento.preventDefault();
      if (enviando) return;                     // impede envio duplo (dois cliques rápidos)
      const valores = {};
      campos.forEach((c) => {
        const ctrl = form.elements[c.nome];
        valores[c.nome] = c.tipo === "checkbox" ? ctrl.checked : (typeof ctrl.value === "string" ? ctrl.value.trim() : ctrl.value);
      });
      const erros = {};
      campos.forEach((c) => {
        if (c.obrigatorio && c.tipo !== "checkbox" && !valores[c.nome]) erros[c.nome] = "Preencha este campo.";
      });
      enviando = true;
      let resultado;
      try { resultado = Object.keys(erros).length ? { ok: false, erros } : aoSalvar(valores, form); }
      finally { enviando = false; }
      campos.forEach((c) => {
        const msg = (resultado.erros || {})[c.nome] || "";
        $(`#f-${c.nome}-erro`, dlg).textContent = msg;
        form.elements[c.nome].setAttribute("aria-invalid", String(!!msg));
      });
      $("#form-erro", dlg).textContent = resultado.ok ? "" : (resultado.erro || "Confira os campos destacados.");
      if (resultado.ok) {
        dlg.close();
      } else {
        const primeiro = campos.find((c) => (resultado.erros || {})[c.nome]);
        if (primeiro) form.elements[primeiro.nome].focus();
      }
    };
    form.onsubmit = aoEnviar;
    if (!dlg.open) dlg.showModal();
    const primeiroCampo = form.querySelector("input:not([readonly]):not([type=checkbox]), select, textarea");
    if (primeiroCampo) primeiroCampo.focus();
    return { dlg, form, ajuda: (nome, conteudo) => { const p = $(`#f-${nome}-ajuda`, dlg); if (!p) return; p.replaceChildren(...[].concat(conteudo || []).map((x) => (x instanceof Node ? x : document.createTextNode(String(x))))); p.hidden = !conteudo; } };
  }

  /* ---------- CSV (separado por ponto e vírgula, abre direto no Excel em português) ---------- */
  function textoCSV(cabecalho, linhas) {
    const celula = (v) => {
      const t = v == null ? "" : typeof v === "number" ? String(arredondar(v)).replace(".", ",") : String(v);
      return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    return [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  }
  function baixarCSV(nomeArquivo, cabecalho, linhas) {
    const blob = new Blob(["﻿" + textoCSV(cabecalho, linhas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: nomeArquivo });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso(`Arquivo ${nomeArquivo} gerado com ${plural(linhas.length, "linha", "linhas")}.`);
  }
  const nomeArquivo = (base) => `nexora-booking-${base}-${hoje()}.csv`;
  const digitos = (v) => String(v || "").replace(/\D/g, "");

  NX.util = {
    el, icone, $, $$, trocar,
    hoje, agora, chave, deChave, definirFuso, fusoAtual, minutos, hhmm, horaValida, somarDias, diasEntre, inicioDoMes, fimDoMes, somarMeses, dataValida, momentoValido, diaDaSemana,
    dataCurta, dataCompleta, dataLonga, mesAno, hora, dataHora, dataHoraCurta, relativo,
    moeda, moedaCompacta, numero, decimal, percentual, plural, unidades, comSinal, arredondar,
    semAcento, iniciais, contem, mascaraTelefone, mascaraCnpj,
    emailValido, telefoneValido, gtinValido, cnpjValido, lerValor, lerInteiro,
    aviso, confirmar, formulario,
    textoCSV, baixarCSV, nomeArquivo, digitos,
  };
})();
