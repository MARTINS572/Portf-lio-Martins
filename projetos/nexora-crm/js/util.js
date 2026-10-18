/* ==========================================================================
   NEXORA CRM — util.js
   Funções pequenas usadas por todas as telas: criar elementos, formatar
   datas e valores, mensagens, janelas de confirmação, formulários e CSV.
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
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  /* ---------- Datas (sempre "AAAA-MM-DD", no fuso do navegador) ---------- */
  const dd = (n) => String(n).padStart(2, "0");
  const chave = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  const deChave = (c) => { const [a, m, d] = String(c).slice(0, 10).split("-").map(Number); return new Date(a, m - 1, d); };
  const hoje = () => chave(new Date());
  const somarDias = (c, n) => { const d = deChave(c); d.setDate(d.getDate() + n); return chave(d); };
  const diasEntre = (a, b) => Math.round((deChave(b) - deChave(a)) / 86400000);
  const inicioDoMes = (c) => `${String(c).slice(0, 7)}-01`;
  const fimDoMes = (c) => { const d = deChave(inicioDoMes(c)); d.setMonth(d.getMonth() + 1); d.setDate(0); return chave(d); };
  const somarMeses = (c, n) => { const d = deChave(inicioDoMes(c)); d.setMonth(d.getMonth() + n); return chave(d); };
  const dataValida = (c) => /^\d{4}-\d{2}-\d{2}$/.test(c || "") && !Number.isNaN(deChave(c).getTime());

  const fmtCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  const fmtCompleta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtLonga = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const fmtMesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const limpar = (t) => t.replace(/\./g, "").replace(" de ", " ");
  const dataCurta = (c) => limpar(fmtCurta.format(deChave(c)));            // "12 out"
  const dataCompleta = (c) => fmtCompleta.format(deChave(c));             // "12/10/2026"
  const dataLonga = (c) => fmtLonga.format(deChave(c));                   // "segunda-feira, 12 de outubro"
  const nomeDoMes = (c) => fmtMes.format(deChave(c)).replace(".", "");    // "out"
  const mesAno = (c) => fmtMesAno.format(deChave(c));                     // "outubro de 2026"

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
  const percentual = (v) => formatoPercentual.format(Number.isFinite(v) ? v : 0);
  const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;

  /* ---------- Texto ---------- */
  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  const contem = (texto, busca) => semAcento(texto).includes(semAcento(busca));

  function mascaraTelefone(valor) {
    const n = String(valor).replace(/\D/g, "").slice(0, 11);
    if (n.length > 10) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length > 6) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return n;
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
    caixa.replaceChildren(icone(nomeIcone, 18), el("span", { texto }));
    caixa.hidden = false;
    // Se houver uma janela aberta, o aviso vai para dentro dela (fica por cima do fundo escuro)
    const janela = $$("dialog[open]").pop();
    (janela || document.body).append(caixa);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { caixa.hidden = true; }, 4500);
  }

  /* ---------- Janela de confirmação ---------- */
  function confirmar({ titulo, texto, rotulo = "Confirmar", perigo = false }) {
    return new Promise((resolver) => {
      const dlg = $("#dlg-confirmar");
      $("#confirmar-titulo", dlg).textContent = titulo;
      $("#confirmar-texto", dlg).textContent = texto;
      const ok = $("#confirmar-ok", dlg);
      ok.textContent = rotulo;
      ok.className = `btn ${perigo ? "btn--perigo" : "btn--primario"}`;
      const fechar = (resultado) => {
        dlg.removeEventListener("close", aoFechar);
        ok.removeEventListener("click", aoOk);
        if (dlg.open) dlg.close();
        resolver(resultado);
      };
      const aoOk = () => fechar(true);
      const aoFechar = () => fechar(false);
      ok.addEventListener("click", aoOk);
      dlg.addEventListener("close", aoFechar);
      dlg.showModal();
      ok.focus();
    });
  }

  /* ---------- Formulário genérico em janela ----------
     campos: [{ nome, rotulo, tipo, opcoes, obrigatorio, valor, largura, ajuda, min, max, passo }]
     tipo: text | email | tel | number | date | select | textarea
     opcoes (select): ["A","B"] ou [{ valor, rotulo, grupo }]
     aoSalvar(valores) → { ok: true } ou { ok: false, erros: { campo: "mensagem" }, erro: "geral" } */
  function formulario({ titulo, descricao, campos, rotuloSalvar = "Salvar", aoSalvar, extra }) {
    const dlg = $("#dlg-form");
    const form = $("#form-generico", dlg);
    $("#form-titulo", dlg).textContent = titulo;
    const desc = $("#form-descricao", dlg);
    desc.textContent = descricao || "";
    desc.hidden = !descricao;
    $("#form-salvar", dlg).textContent = rotuloSalvar;
    $("#form-erro", dlg).textContent = "";

    const grade = $("#form-campos", dlg);
    grade.replaceChildren(...campos.map((c) => {
      const id = `f-${c.nome}`;
      let controle;
      if (c.tipo === "select") {
        controle = el("select", { id, name: c.nome });
        const grupos = new Map();
        (c.vazio ? [{ valor: "", rotulo: c.vazio }] : []).concat(c.opcoes.map((o) => (typeof o === "string" ? { valor: o, rotulo: o } : o))).forEach((o) => {
          const op = el("option", { value: o.valor, texto: o.rotulo });
          if (String(o.valor) === String(c.valor ?? "")) op.selected = true;
          if (o.grupo) {
            if (!grupos.has(o.grupo)) { const g = el("optgroup", { label: o.grupo }); grupos.set(o.grupo, g); controle.append(g); }
            grupos.get(o.grupo).append(op);
          } else controle.append(op);
        });
      } else if (c.tipo === "textarea") {
        controle = el("textarea", { id, name: c.nome, rows: c.linhas || 3, maxlength: c.max || 500 });
        controle.value = c.valor ?? "";
      } else {
        controle = el("input", { id, name: c.nome, type: c.tipo || "text", autocomplete: c.autocomplete || "off", min: c.min, max: c.tipo === "number" || c.tipo === "date" ? c.max : null, step: c.passo, maxlength: c.tipo === "text" || c.tipo === "email" ? (c.max || 120) : null, inputmode: c.tipo === "tel" ? "tel" : c.tipo === "number" ? "decimal" : null, placeholder: c.placeholder });
        controle.value = c.valor ?? "";
        if (c.tipo === "tel") controle.addEventListener("input", () => { controle.value = mascaraTelefone(controle.value); });
      }
      if (c.obrigatorio) controle.setAttribute("aria-required", "true");
      const erro = el("p", { class: "campo__erro", id: `${id}-erro` });
      controle.setAttribute("aria-describedby", `${id}-erro${c.ajuda ? ` ${id}-ajuda` : ""}`);
      return el("div", { class: `campo${c.largura === "inteira" ? " campo--inteira" : ""}` },
        el("label", { for: id }, c.rotulo, c.obrigatorio ? el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" }) : el("span", { class: "campo__opc", texto: " (opcional)" })),
        controle,
        c.ajuda ? el("p", { class: "campo__ajuda", id: `${id}-ajuda`, texto: c.ajuda }) : null,
        erro);
    }));
    const caixaExtra = $("#form-extra", dlg);
    caixaExtra.replaceChildren(...(extra ? [extra] : []));

    const aoEnviar = (evento) => {
      evento.preventDefault();
      const valores = {};
      campos.forEach((c) => {
        const v = form.elements[c.nome].value;
        valores[c.nome] = typeof v === "string" ? v.trim() : v;
      });
      // Obrigatórios primeiro, aqui mesmo
      const erros = {};
      campos.forEach((c) => {
        if (c.obrigatorio && !valores[c.nome]) erros[c.nome] = "Preencha este campo.";
      });
      const resultado = Object.keys(erros).length ? { ok: false, erros } : aoSalvar(valores);
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
    dlg.showModal();
    const primeiroCampo = form.querySelector("input, select, textarea");
    if (primeiroCampo) primeiroCampo.focus();
    return dlg;
  }

  /* ---------- Validações ---------- */
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");
  const telefoneValido = (v) => { const n = String(v || "").replace(/\D/g, ""); return n.length === 10 || n.length === 11; };
  function lerValor(v) {
    // aceita "12.500,50", "12500.5" ou "12500"
    const t = String(v || "").trim().replace(/\s|R\$/g, "");
    let normal = t;
    if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");          // 12.500,50
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");         // 80.000
    const n = Number(normal);
    return Number.isFinite(n) ? n : NaN;
  }

  /* ---------- CSV (separado por ponto e vírgula, abre direto no Excel) ---------- */
  function baixarCSV(nomeArquivo, cabecalho, linhas) {
    const celula = (v) => {
      const t = v == null ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const texto = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: nomeArquivo });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso(`Arquivo ${nomeArquivo} gerado com ${plural(linhas.length, "linha", "linhas")}.`);
  }

  NX.util = {
    el, icone, $, $$,
    hoje, chave, deChave, somarDias, diasEntre, inicioDoMes, fimDoMes, somarMeses, dataValida,
    dataCurta, dataCompleta, dataLonga, nomeDoMes, mesAno, relativo,
    moeda, moedaCompacta, numero, percentual, plural,
    semAcento, iniciais, contem, mascaraTelefone,
    aviso, confirmar, formulario,
    emailValido, telefoneValido, lerValor,
    baixarCSV,
  };
})();
