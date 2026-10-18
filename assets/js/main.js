/* =================================================================
   Martins | Criação de Sites — comportamento da página
   Sem dependências. Cada parte funciona de forma independente: se uma
   falhar, as demais continuam.
   ================================================================= */
(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};
  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Utilitários ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null && text !== "") node.textContent = String(text);
    return node;
  }

  function safe(fn, label) {
    try { fn(); } catch (err) {
      if (window.console && console.error) console.error("[site] Falha em " + label + ":", err);
    }
  }

  var HEX = /^#[0-9a-fA-F]{6}$/;
  function color(value, fallback) { return HEX.test(value || "") ? value : fallback; }

  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + alpha + ")";
  }

  // Aceita apenas http(s) ou caminhos do próprio site. Bloqueia javascript:, data: etc.
  function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      var url = new URL(value.trim(), window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* sem persistência */ }
  }

  /* ---------- WhatsApp ---------- */
  var wa = CONFIG.whatsapp || {};
  var waNumber = String(wa.number || "").replace(/\D/g, "");
  var waMessages = wa.messages || {};

  function waLink(message) {
    if (!waNumber) return null;
    var url = "https://wa.me/" + waNumber;
    return message ? url + "?text=" + encodeURIComponent(message) : url;
  }

  function initWhatsApp() {
    $$("[data-wa]").forEach(function (link) {
      var key = link.getAttribute("data-wa");
      var href = waLink(waMessages[key] || waMessages.hello || "");
      if (!href) return;
      link.setAttribute("href", href);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      if (link.hasAttribute("data-wa-label")) {
        link.setAttribute("aria-label", "Conversar no WhatsApp: " + (wa.display || waNumber) + " (abre em nova aba)");
      }
    });
    $$("[data-wa-display]").forEach(function (node) { node.textContent = wa.display || waNumber; });
  }

  /* ---------- Tema ---------- */
  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function applyTheme(theme, animate) {
    if (animate && !reduceMotion) {
      root.classList.add("theme-transition");
      window.setTimeout(function () { root.classList.remove("theme-transition"); }, 400);
    }
    root.setAttribute("data-theme", theme);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#FAFAF8" : "#0B0B0E");
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-label", theme === "light" ? "Ativar tema escuro" : "Ativar tema claro");
    });
  }

  function initTheme() {
    applyTheme(currentTheme(), false);
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = currentTheme() === "light" ? "dark" : "light";
        applyTheme(next, true);
        storageSet("martins-tema", next);
      });
    });
    // Acompanha o sistema enquanto o visitante não escolheu manualmente.
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onChange = function (e) {
        var saved = null;
        try { saved = window.localStorage.getItem("martins-tema"); } catch (err) { saved = null; }
        if (saved !== "light" && saved !== "dark") applyTheme(e.matches ? "light" : "dark", true);
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ---------- Menu mobile ---------- */
  function initMenu() {
    var toggle = $("[data-menu-toggle]");
    var menu = $("[data-menu]");
    if (!toggle || !menu) return;

    function focusables() {
      return [toggle].concat($$("a[href], button:not([disabled])", menu));
    }

    function open() {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Fechar menu");
      doc.body.classList.add("menu-open");
      var first = $("a", menu);
      if (first) first.focus();
    }

    function close(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
      doc.body.classList.remove("menu-open");
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (menu.hidden) open(); else close(true);
    });

    menu.addEventListener("click", function (e) {
      var link = e.target.closest("a");
      if (link) close(false);
    });

    doc.addEventListener("keydown", function (e) {
      if (menu.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(true); return; }
      if (e.key === "Tab") {
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var desktop = window.matchMedia("(min-width: 960px)");
    var onDesktop = function (e) { if (e.matches) close(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onDesktop);
    else if (desktop.addListener) desktop.addListener(onDesktop);
  }

  /* ---------- Navegação ativa ---------- */
  function initActiveNav() {
    var links = $$("[data-nav]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("data-nav")] = a; });
    var sections = Object.keys(map).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var active = map[entry.target.id];
        if (active) active.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---------- Projetos ---------- */
  var DEFAULT_COLORS = { bg: "#18181F", fg: "#F4F4F6", sub: "#83838D", accent: "#6D4AFF", onAccent: "#FFFFFF", block: "#23232B", line: "#34343E" };
  var VARIANTS = ["hero", "catalog", "calendar", "pipeline", "table"];
  var ARROW_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';

  function str(value, fallback) { return value === undefined || value === null || value === "" ? (fallback || "") : String(value); }
  function strList(value, max) { return Array.isArray(value) ? value.slice(0, max).map(String) : []; }

  function normalizeLinks(raw) {
    var list = Array.isArray(raw.links) ? raw.links : (raw.url ? [{ label: "Ver demonstração", url: raw.url }] : []);
    var links = list.slice(0, 3).map(function (l) {
      var url = l && safeUrl(l.url);
      return url ? { label: str(l.label, "Abrir demonstração"), url: url } : null;
    });
    // O primeiro link é a demonstração principal: se ele for inválido, o card não é publicado.
    if (!links[0]) return [];
    return links.filter(Boolean);
  }

  function normalizeProject(raw, index) {
    if (!raw || typeof raw !== "object" || !raw.name) return null;
    var mockup = raw.mockup || {};
    var c = mockup.colors || {};
    var links = normalizeLinks(raw);
    if (raw.status === "published" && !links.length && window.console) {
      console.warn("[site] Projeto \"" + raw.name + "\" está como publicado, mas sem link válido. Exibindo como \"Em preparação\".");
    }
    return {
      id: str(raw.id, "projeto-" + index),
      num: String(index + 1).padStart(2, "0"),
      name: String(raw.name),
      tagline: str(raw.tagline),
      preview: safeUrl(raw.preview),
      group: str(raw.group),
      category: str(raw.category),
      demo: raw.demo !== false,
      wantsPublish: raw.status === "published" && links.length > 0,
      links: links,
      problem: str(raw.problem),
      features: strList(raw.features, 6),
      note: str(raw.note),
      mockup: {
        variant: VARIANTS.indexOf(mockup.variant) >= 0 ? mockup.variant : "hero",
        kicker: str(mockup.kicker),
        headline: str(mockup.headline, raw.name),
        cta: str(mockup.cta, "Contato"),
        label: str(mockup.label),
        button: str(mockup.button),
        columns: strList(mockup.columns, 3),
        lanes: strList(mockup.lanes, 3),
        flag: str(mockup.flag)
      },
      colors: {
        bg: color(c.bg, DEFAULT_COLORS.bg),
        fg: color(c.fg, DEFAULT_COLORS.fg),
        sub: color(c.sub, DEFAULT_COLORS.sub),
        accent: color(c.accent, DEFAULT_COLORS.accent),
        onAccent: color(c.onAccent, DEFAULT_COLORS.onAccent),
        block: color(c.block, DEFAULT_COLORS.block),
        line: color(c.line, DEFAULT_COLORS.line)
      }
    };
  }

  /* Confere se a demonstração existe de verdade antes de mostrar o botão.
     Endereços do próprio site são testados com uma requisição HEAD; endereços
     externos não podem ser testados daqui e são exibidos como configurados. */
  var availability = {};
  function checkUrl(url) {
    if (availability[url]) return availability[url];
    var promise;
    var target = new URL(url, window.location.href);
    if (window.location.protocol === "file:" || target.origin !== window.location.origin || !window.fetch) {
      promise = Promise.resolve(true);
    } else {
      promise = window.fetch(target.href, { method: "HEAD", cache: "no-store" })
        .then(function (r) {
          // Alguns servidores não aceitam HEAD: nesse caso confere com GET.
          if (r.status === 405 || r.status === 501) {
            return window.fetch(target.href, { cache: "no-store" }).then(function (g) { return g.ok; });
          }
          return r.ok;
        })
        .catch(function () { return false; });
    }
    availability[url] = promise;
    return promise;
  }

  var checked = {};
  function checkProject(p) {
    if (!p.wantsPublish) return Promise.resolve([]);
    return Promise.all(p.links.map(function (l) { return checkUrl(l.url); }))
      .then(function (results) {
        // O primeiro link é o principal: sem ele, a demonstração conta como em preparação.
        var live = results[0] ? p.links.filter(function (l, i) { return results[i]; }) : [];
        checked[p.id] = live;
        return live;
      });
  }

  function append(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }

  function line(width) {
    var node = el("i", "mk-line");
    if (width) node.style.width = width;
    return node;
  }

  function buildHero(p) {
    var m = p.mockup;
    var body = el("div", "mk-body mk-hero");
    var copy = append(el("div", "mk-copy"),
      m.kicker ? el("span", "mk-kicker", m.kicker) : null,
      el("span", "mk-head", m.headline),
      line("88%"), line("62%"),
      el("span", "mk-pill", m.cta));
    var art = append(el("div", "mk-art"), el("i", "mk-arch"), el("i", "mk-sun"));
    return append(body, copy, art);
  }

  function buildCatalog(p) {
    var body = el("div", "mk-body mk-catalog");
    var pills = append(el("span", "mk-pills"), el("i"), el("i"), el("i"));
    var top = append(el("div", "mk-top"), el("span", "mk-head", p.mockup.headline), pills);
    var tiles = el("div", "mk-tiles");
    ["80%", "70%", "84%", "66%"].forEach(function (w) {
      append(tiles, append(el("div", "mk-tile"), el("i", "mk-img"), line(w), el("i", "mk-price")));
    });
    return append(body, top, tiles);
  }

  function slot(height, kind, marginTop) {
    var node = el("i", "mk-slot" + (kind ? " is-" + kind : ""));
    node.style.setProperty("--h", height + "px");
    if (marginTop) node.style.setProperty("--mt", marginTop + "px");
    return node;
  }

  var CAL_PLANS = [
    [[[28], [18, "strong"], [24]], [[34, null, 14], [16]], [[18], [30, "strong"], [14, "free"]], [[22, null, 24], [26]]],
    [[[20, "strong"], [30], [16]], [[16, null, 8], [24, "strong"], [18]], [[36], [14, "free"]], [[14], [20], [26, "strong"]]]
  ];

  function buildCalendar(p, index) {
    var m = p.mockup;
    var wrap = el("div", "mk-body mk-cal");
    var side = append(el("div", "mk-side"), el("span", "mk-head", m.headline), el("i", "mk-active"), line("80%"), line("64%"), line("72%"));
    var app = el("div", "mk-app");
    var top = append(el("div", "mk-top"), el("span", "mk-label", m.label || "Agenda · semana"), el("span", "mk-btn", m.button || "+ Horário"));
    var cols = el("div", "mk-cols");
    CAL_PLANS[index % CAL_PLANS.length].forEach(function (col) {
      var c = el("div", "mk-col");
      col.forEach(function (s) { c.appendChild(slot(s[0], s[1], s[2])); });
      cols.appendChild(c);
    });
    append(app, top, cols);
    return append(wrap, side, app);
  }

  function buildPipeline(p) {
    var m = p.mockup;
    var body = el("div", "mk-body mk-app");
    var top = append(el("div", "mk-top"), el("span", "mk-head", m.headline), el("i", "mk-search"));
    var cols = el("div", "mk-cols");
    cols.style.setProperty("--cols", "3");
    var names = m.lanes.length === 3 ? m.lanes : ["Novos", "Em contato", "Fechados"];
    [[3, -1], [2, 0], [1, -1]].forEach(function (lane, i) {
      var l = append(el("div", "mk-lane"), el("span", "mk-label", names[i]));
      for (var k = 0; k < lane[0]; k++) l.appendChild(el("i", "mk-card" + (k === lane[1] ? " is-active" : "")));
      cols.appendChild(l);
    });
    return append(body, top, cols);
  }

  function buildTable(p) {
    var m = p.mockup;
    var body = el("div", "mk-body mk-app");
    body.style.gap = "6px";
    var heads = m.columns.length === 3 ? m.columns : ["Produto", "Qtd.", "Status"];
    var top = append(el("div", "mk-top"), el("span", "mk-head", m.headline), el("span", "mk-btn", m.button || "+ Entrada"));
    var head = append(el("div", "mk-table-row is-head"), el("span", "mk-label", heads[0]), el("span", "mk-label", heads[1]), el("span", "mk-label", heads[2]));
    append(body, top, head);
    var flag = (m.flag || "Baixo").toUpperCase();
    [["78%", "50%", false], ["64%", "30%", true], ["84%", "56%", false], ["58%", "44%", false], ["72%", "24%", true]].forEach(function (r) {
      var name = line(); name.style.setProperty("--w", r[0]);
      var qty = el("i", "mk-line" + (r[2] ? " is-low" : "")); qty.style.setProperty("--w", r[1]);
      var tag = el("span", "mk-flag" + (r[2] ? " is-low" : ""), r[2] ? flag : "");
      body.appendChild(append(el("div", "mk-table-row"), name, qty, tag));
    });
    return body;
  }

  var BUILDERS = { hero: buildHero, catalog: buildCatalog, calendar: buildCalendar, pipeline: buildPipeline, table: buildTable };

  function statusNode(kind, text) {
    var node = append(el("span", "status status-" + kind), el("span", "status-dot"));
    node.appendChild(doc.createTextNode(text));
    return node;
  }

  function isExternal(url) {
    try { return new URL(url, window.location.href).origin !== window.location.origin; } catch (e) { return true; }
  }

  /* Demos do próprio site abrem na mesma aba (elas têm "Voltar ao portfólio");
     endereços de outros sites abrem em nova aba. */
  function demoLink(l, p, className) {
    var a = el("a", className, l.label);
    a.href = l.url;
    if (isExternal(l.url)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", l.label + ": " + p.name + " (abre em nova aba)");
    } else {
      a.setAttribute("aria-label", l.label + ": " + p.name);
    }
    return a;
  }

  function fillFooter(footer, p, state, live) {
    footer.textContent = "";
    footer.setAttribute("data-state", state);
    var card = footer.closest(".project-card");
    if (card) card.classList.toggle("is-live", state === "published");
    if (state === "published") {
      footer.appendChild(statusNode("published", "Demonstração no ar"));
      var actions = el("div", "project-links");
      (live || p.links).forEach(function (l, i) {
        var a = demoLink(l, p, i === 0 ? "btn btn-primary btn-sm project-open" : "link-arrow");
        a.insertAdjacentHTML("beforeend", ARROW_SVG);
        actions.appendChild(a);
      });
      footer.appendChild(actions);
      // A capa também abre a demo principal (fora da ordem do teclado: o botão já faz isso).
      var cover = card && card.querySelector(".project-cover");
      if (cover && !cover.getAttribute("href")) {
        cover.setAttribute("href", (live || p.links)[0].url);
        cover.setAttribute("tabindex", "-1");
      }
    } else if (state === "elsewhere") {
      append(footer, statusNode("published", "Demonstração pronta"), el("span", "project-soon", "Abre no site publicado"));
    } else if (state === "checking") {
      footer.appendChild(statusNode("checking", "Verificando demonstração…"));
    } else {
      append(footer, statusNode("preparing", "Em preparação"), el("span", "project-soon", "Link em breve"));
    }
  }

  function buildCard(p, index) {
    var card = el("article", "project-card");
    card.setAttribute("data-group", p.group);
    card.setAttribute("data-id", p.id);
    var c = p.colors;
    card.style.setProperty("--p-bg", c.bg);
    card.style.setProperty("--p-fg", c.fg);
    card.style.setProperty("--p-sub", c.sub);
    card.style.setProperty("--p-accent", c.accent);
    card.style.setProperty("--p-on-accent", c.onAccent);
    card.style.setProperty("--p-block", c.block);
    card.style.setProperty("--p-line", c.line);
    card.style.setProperty("--p-soft", hexToRgba(c.accent, 0.22));

    var media = el("div", "project-media");
    media.setAttribute("aria-hidden", "true");
    var cover = el("a", "project-cover");
    var mk = el("div", "mk" + (p.preview ? " mk-shot" : ""));
    mk.appendChild(append(el("div", "mk-bar"), el("i"), el("i"), el("i"), el("b")));
    if (p.preview) {
      var frame = el("div", "mk-frame");
      var img = el("img", "mk-img-shot");
      img.alt = "";
      img.width = 800;
      img.height = 500;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("load", function () { frame.classList.add("is-loaded"); });
      img.addEventListener("error", function () {
        // Sem a imagem, volta para a capa desenhada.
        frame.replaceWith(BUILDERS[p.mockup.variant](p, index));
      });
      img.src = p.preview;
      if (img.complete && img.naturalWidth) frame.classList.add("is-loaded");
      frame.appendChild(img);
      mk.appendChild(frame);
    } else {
      mk.appendChild(BUILDERS[p.mockup.variant](p, index));
    }
    cover.appendChild(mk);
    media.appendChild(cover);

    var body = el("div", "project-body");
    var meta = append(el("div", "project-meta"),
      el("span", "project-num", p.num),
      p.category ? el("span", "tag", p.category) : null,
      p.demo ? el("span", "tag tag-accent", "Demonstração") : null);
    var head = append(el("div", "project-head"),
      el("h3", "project-title", p.name),
      p.tagline ? el("p", "project-tagline", p.tagline) : null);
    var problem = p.problem ? el("p", "project-problem", p.problem) : null;

    var features = null;
    if (p.features.length) {
      features = el("ul", "feature-list");
      features.setAttribute("aria-label", "Funcionalidades");
      p.features.forEach(function (f) { features.appendChild(el("li", null, f)); });
    }
    var note = p.note ? el("p", "project-note", p.note) : null;
    var footer = el("div", "project-footer");
    footer.setAttribute("aria-live", "polite");

    append(body, meta, head, problem, features, note, footer);
    append(card, media, body);

    if (!p.wantsPublish) {
      fillFooter(footer, p, "preparing");
    } else if (CONFIG.previewOnly) {
      // Prévia sem as pastas das demos (ex.: artefato): não testa nem cria links quebrados.
      fillFooter(footer, p, "elsewhere");
    } else if (checked[p.id]) {
      fillFooter(footer, p, checked[p.id].length ? "published" : "preparing", checked[p.id]);
    } else {
      fillFooter(footer, p, "checking");
      checkProject(p).then(function (live) { fillFooter(footer, p, live.length ? "published" : "preparing", live); });
    }
    return card;
  }

  function initProjects() {
    var grid = $("[data-projects]");
    if (!grid) return;
    var empty = $("[data-empty]");
    var results = $("[data-results]");
    var buttons = $$("[data-filter]");
    var projects = (Array.isArray(CONFIG.projects) ? CONFIG.projects : []).map(normalizeProject).filter(Boolean);
    var current = "todos";

    $$("[data-count]").forEach(function (node) {
      var key = node.getAttribute("data-count");
      node.textContent = String(key === "todos" ? projects.length : projects.filter(function (p) { return p.group === key; }).length);
    });

    function render(filter) {
      var list = projects.filter(function (p) { return filter === "todos" || p.group === filter; });
      grid.textContent = "";
      var frag = doc.createDocumentFragment();
      list.forEach(function (p, i) {
        var card = buildCard(p, projects.indexOf(p));
        card.style.setProperty("--i", String(Math.min(i, 8)));
        frag.appendChild(card);
      });
      grid.appendChild(frag);
      grid.hidden = list.length === 0;
      if (empty) empty.hidden = list.length !== 0;
      if (results) results.textContent = list.length === 1 ? "1 projeto" : list.length + " projetos";
    }

    function select(filter) {
      if (filter === current) return;
      current = filter;
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-filter") === filter;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (reduceMotion) { render(filter); return; }
      grid.classList.add("is-switching");
      window.setTimeout(function () {
        render(filter);
        grid.classList.remove("is-switching");
      }, 160);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { select(b.getAttribute("data-filter")); });
    });
    var showAll = $("[data-show-all]");
    if (showAll) showAll.addEventListener("click", function () { select("todos"); });

    render(current);
  }

  /* ---------- Formulário → WhatsApp ---------- */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;
    var status = $("[data-form-status]", form);
    var attempted = false;

    var rules = {
      nome: function (v) {
        if (!v) return "Informe seu nome para continuar.";
        if (v.length < 2) return "Digite pelo menos 2 letras.";
        return "";
      },
      servico: function (v) { return v ? "" : "Escolha o tipo de projeto."; }
    };

    function setError(name, message) {
      var field = $('[data-field="' + name + '"]', form);
      var input = form.elements[name];
      var error = $("#f-" + name + "-erro", form);
      if (!field || !input) return;
      field.classList.toggle("is-invalid", !!message);
      if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      if (error) { error.textContent = message; error.hidden = !message; }
    }

    function validate() {
      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        var message = rules[name]((input.value || "").trim());
        setError(name, message);
        if (message && !firstInvalid) firstInvalid = input;
      });
      return firstInvalid;
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      var handler = function () { if (attempted) setError(name, rules[name]((input.value || "").trim())); };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });

    function showStatus(isError, text, href) {
      if (!status) return;
      status.textContent = "";
      status.classList.toggle("is-error", isError);
      status.appendChild(doc.createTextNode(text));
      if (href) {
        status.appendChild(doc.createTextNode(" "));
        var a = el("a", null, "Abrir o WhatsApp");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        status.appendChild(a);
      }
      status.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      attempted = true;
      var invalid = validate();
      if (invalid) {
        if (status) status.hidden = true;
        invalid.focus();
        return;
      }
      var get = function (n) { return (form.elements[n].value || "").trim(); };
      var parts = ["Olá, Martins! Vim pelo seu portfólio e gostaria de um orçamento.", "", "Nome: " + get("nome")];
      if (get("negocio")) parts.push("Negócio: " + get("negocio"));
      parts.push("Preciso de: " + get("servico"));
      if (get("mensagem")) parts.push("", get("mensagem"));
      var href = waLink(parts.join("\n"));
      if (!href) {
        showStatus(true, "Não foi possível montar o link do WhatsApp. Verifique o número em assets/js/config.js.");
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
      showStatus(false, "Mensagem pronta para você revisar e enviar no WhatsApp. Se a conversa não abriu em uma nova aba, use o link:", href);
    });
  }

  /* ---------- Entrada suave ao rolar ---------- */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    root.classList.add("reveal-ready");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (n) { observer.observe(n); });
    // Segurança: nada fica invisível se o observer não disparar (ex.: impressão).
    window.addEventListener("beforeprint", function () { items.forEach(function (n) { n.classList.add("is-visible"); }); });
  }

  /* ---------- Movimento: progresso, cabeçalho e profundidade ---------- */
  function initMotion() {
    var header = $("[data-header]");
    var bar = el("div", "scroll-progress");
    bar.setAttribute("aria-hidden", "true");
    doc.body.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty("--progress", ratio.toFixed(4));
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    // Profundidade na composição do topo: só com mouse e sem movimento reduzido.
    var comp = $(".composition");
    var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!comp || reduceMotion || !finePointer) return;
    var frame = null;
    comp.addEventListener("pointermove", function (e) {
      var r = comp.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(function () {
        comp.style.setProperty("--px", x.toFixed(3));
        comp.style.setProperty("--py", y.toFixed(3));
      });
    });
    comp.addEventListener("pointerleave", function () {
      comp.style.setProperty("--px", "0");
      comp.style.setProperty("--py", "0");
    });
  }

  /* ---------- Ano no rodapé ---------- */
  function initYear() {
    $$("[data-year]").forEach(function (n) { n.textContent = String(new Date().getFullYear()); });
  }

  function start() {
    safe(initWhatsApp, "WhatsApp");
    safe(initTheme, "tema");
    safe(initMenu, "menu");
    safe(initActiveNav, "navegação");
    safe(initProjects, "projetos");
    safe(initForm, "formulário");
    safe(initReveal, "animações");
    safe(initMotion, "movimento");
    safe(initYear, "rodapé");
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
  else start();
})();
