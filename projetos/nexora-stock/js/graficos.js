/* ==========================================================================
   NEXORA STOCK — graficos.js
   Gráficos em SVG/HTML feitos à mão (sem biblioteca), sempre desenhados a
   partir dos dados do estoque. Cada gráfico tem:
     • dica (tooltip) ao passar o mouse ou navegar com as setas do teclado;
     • uma tabela equivalente (botão "Tabela" no cartão);
     • cores da paleta validada para daltonismo (variáveis --serie-* no CSS).
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => v != null && e.setAttribute(k, v));
    return e;
  };

  /* Escala "bonita": 0, 20 mil, 40 mil… */
  function escala(maximo, partes = 4, inteiro = false) {
    if (!(maximo > 0)) return { max: partes, passo: 1 };
    const bruto = maximo / partes;
    const mag = 10 ** Math.floor(Math.log10(bruto));
    const n = bruto / mag;
    let passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    if (inteiro) passo = Math.max(1, Math.ceil(passo));
    return { max: passo * Math.ceil(maximo / passo), passo };
  }
  const eixoMoeda = (v) => (v === 0 ? "0" : U.moedaCompacta(v).replace("R$ ", ""));

  /* Dica compartilhada dentro do cartão do gráfico */
  function criarDica(caixa) {
    let dica = caixa.querySelector(".dica");
    if (!dica) { dica = U.el("div", { class: "dica", role: "presentation" }); caixa.append(dica); }
    dica.hidden = true;
    return {
      mostrar(x, y, valor, rotulo, linhas) {
        dica.replaceChildren(U.el("strong", { texto: valor }), U.el("span", { texto: rotulo }), ...(linhas || []));
        dica.hidden = false;
        const larg = caixa.clientWidth;
        const w = dica.offsetWidth;
        dica.style.left = `${Math.min(Math.max(8, x - w / 2), larg - w - 8)}px`;
        dica.style.top = `${Math.max(4, y - dica.offsetHeight - 12)}px`;
      },
      esconder() { dica.hidden = true; },
    };
  }

  /* Redesenha quando a caixa muda de largura */
  const observados = new WeakMap();
  function aoRedimensionar(caixa, desenhar) {
    if (!("ResizeObserver" in window)) return;
    let largura = caixa.clientWidth;
    const antigo = observados.get(caixa);
    if (antigo) antigo.disconnect();
    const ro = new ResizeObserver(() => {
      if (Math.abs(caixa.clientWidth - largura) > 4) { largura = caixa.clientWidth; desenhar(); }
    });
    ro.observe(caixa);
    observados.set(caixa, ro);
  }

  /* ---------- 1. Linha com área (evolução no tempo) ---------- */
  function area(caixa, { rotulos, valores, formatar = U.moeda, eixo = eixoMoeda, inteiro = false, referencia, nome = "Valor", detalhes }) {
    const desenhar = () => {
      const area = caixa.querySelector(".grafico__area") || caixa;
      area.querySelectorAll("svg.grafico__svg").forEach((s) => s.remove());
      const W = Math.max(280, area.clientWidth);
      const H = 236;
      const m = { t: 18, r: 18, b: 30, l: 52 };
      const iw = W - m.l - m.r;
      const ih = H - m.t - m.b;
      const { max, passo } = escala(Math.max(...valores, referencia ? referencia.valor : 0) * 1.08, 4, inteiro);
      const x = (i) => m.l + (valores.length === 1 ? iw / 2 : (i / (valores.length - 1)) * iw);
      const y = (v) => m.t + ih - (v / max) * ih;

      const svg = svgEl("svg", { class: "grafico__svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: "0", role: "img", "aria-label": `${nome}: ${rotulos.map((r, i) => `${r} ${formatar(valores[i])}`).join(", ")}. Use as setas para percorrer.` });
      // Grade e eixo Y
      for (let v = 0; v <= max + 0.001; v += passo) {
        svg.append(svgEl("line", { class: v === 0 ? "eixo" : "grade", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
        const t = svgEl("text", { class: "rotulo-eixo", x: m.l - 8, y: y(v) + 4, "text-anchor": "end" });
        t.textContent = eixo(v);
        svg.append(t);
      }
      // Eixo X (pula rótulos quando não cabem)
      const pulo = Math.max(1, Math.ceil((rotulos.length * 58) / iw));
      rotulos.forEach((r, i) => {
        if ((rotulos.length - 1 - i) % pulo !== 0) return;
        const t = svgEl("text", { class: "rotulo-eixo", x: x(i), y: H - 8, "text-anchor": i === 0 ? "start" : i === rotulos.length - 1 ? "end" : "middle" });
        t.textContent = r;
        svg.append(t);
      });
      // Linha de referência (meta)
      if (referencia) {
        svg.append(svgEl("line", { class: "referencia", x1: m.l, x2: W - m.r, y1: y(referencia.valor), y2: y(referencia.valor) }));
        const t = svgEl("text", { class: "rotulo-ref", x: m.l + 6, y: y(referencia.valor) - 6, "text-anchor": "start" });
        t.textContent = referencia.rotulo;
        svg.append(t);
      }
      // Área e linha
      const pontos = valores.map((v, i) => [x(i), y(v)]);
      const caminho = pontos.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ");
      svg.append(svgEl("path", { class: "serie-area", d: `${caminho} L${x(valores.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z` }));
      svg.append(svgEl("path", { class: "serie-linha", d: caminho }));
      // Muitos pontos: só a linha (o ponto aparece ao passar o mouse); poucos: marca cada ponto
      pontos.forEach(([a, b], i) => { if (valores.length <= 24 || i === valores.length - 1) svg.append(svgEl("circle", { class: `serie-ponto${i === valores.length - 1 ? " serie-ponto--fim" : ""}`, cx: a, cy: b, r: 4 })); });
      // Rótulo só no último ponto
      const ult = pontos[pontos.length - 1];
      const tf = svgEl("text", { class: "rotulo-valor", x: ult[0] - 6, y: ult[1] - 12, "text-anchor": "end" });
      tf.textContent = formatar(valores[valores.length - 1]);
      svg.append(tf);

      // Interação: linha vertical que segue o mouse + dica
      const cruz = svgEl("line", { class: "cruz", y1: m.t, y2: m.t + ih, visibility: "hidden" });
      const marca = svgEl("circle", { class: "serie-ponto serie-ponto--ativo", r: 5, visibility: "hidden" });
      svg.append(cruz, marca);
      const dica = criarDica(caixa);
      let ativo = -1;
      const mostrar = (i) => {
        ativo = i;
        const [a, b] = pontos[i];
        cruz.setAttribute("x1", a); cruz.setAttribute("x2", a); cruz.setAttribute("visibility", "visible");
        marca.setAttribute("cx", a); marca.setAttribute("cy", b); marca.setAttribute("visibility", "visible");
        const escalaX = svg.getBoundingClientRect().width / W || 1;
        const extra = detalhes ? detalhes(i).map((t) => U.el("span", { class: "dica__extra", texto: t })) : [];
        dica.mostrar(a * escalaX + (svg.getBoundingClientRect().left - caixa.getBoundingClientRect().left), b * escalaX + (svg.getBoundingClientRect().top - caixa.getBoundingClientRect().top), formatar(valores[i]), rotulos[i], extra);
      };
      const esconder = () => { ativo = -1; cruz.setAttribute("visibility", "hidden"); marca.setAttribute("visibility", "hidden"); dica.esconder(); };
      const alvo = svgEl("rect", { class: "alvo", x: m.l - 10, y: 0, width: iw + 20, height: H - m.b + 4 });
      svg.append(alvo);
      alvo.addEventListener("pointermove", (e) => {
        const r = svg.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        let melhor = 0;
        pontos.forEach(([a], i) => { if (Math.abs(a - px) < Math.abs(pontos[melhor][0] - px)) melhor = i; });
        if (melhor !== ativo) mostrar(melhor);
      });
      alvo.addEventListener("pointerleave", esconder);
      svg.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const prox = ativo < 0 ? valores.length - 1 : Math.min(valores.length - 1, Math.max(0, ativo + (e.key === "ArrowRight" ? 1 : -1)));
          mostrar(prox);
        } else if (e.key === "Escape") esconder();
      });
      svg.addEventListener("focus", () => mostrar(valores.length - 1));
      svg.addEventListener("blur", esconder);
      area.append(svg);
    };
    desenhar();
    aoRedimensionar(caixa.querySelector(".grafico__area") || caixa, desenhar);
  }

  /* ---------- 2. Barras horizontais (comparar categorias) ----------
     itens: [{ rotulo, valor, sub }], ordinal: true usa a escala de etapas */
  function barras(caixa, { itens, formatar = U.numero, ordinal = false, vazio = "Sem dados no período." }) {
    const area = caixa.querySelector(".grafico__area") || caixa;
    const max = Math.max(...itens.map((i) => i.valor), 0);
    if (!itens.length || max === 0) { area.replaceChildren(U.el("p", { class: "grafico__vazio", texto: vazio })); return; }
    const dica = criarDica(caixa);
    const lista = U.el("ul", { class: `barras${ordinal ? " barras--ordinal" : ""}` });
    itens.forEach((item, i) => {
      const proporcao = item.valor / max;
      const barra = U.el("span", { class: "barras__barra", style: { "--p": String(item.valor ? Math.max(0.015, proporcao) : 0), "--etapa": `var(--etapa-${i + 1})` } });
      const linha = U.el("li", { class: "barras__linha", tabindex: "0", "aria-label": `${item.rotulo}: ${formatar(item.valor)}${item.sub ? `, ${item.sub}` : ""}` },
        U.el("span", { class: "barras__rotulo", texto: item.rotulo }),
        U.el("span", { class: "barras__trilho" }, barra, U.el("span", { class: "barras__valor", texto: formatar(item.valor) })),
      );
      const mostrar = () => {
        const r = barra.getBoundingClientRect();
        const c = caixa.getBoundingClientRect();
        dica.mostrar(r.right - c.left, r.top - c.top, formatar(item.valor), item.rotulo, item.sub ? [U.el("span", { class: "dica__extra", texto: item.sub })] : []);
      };
      linha.addEventListener("pointerenter", mostrar);
      linha.addEventListener("focus", mostrar);
      linha.addEventListener("pointerleave", () => dica.esconder());
      linha.addEventListener("blur", () => dica.esconder());
      lista.append(linha);
    });
    area.replaceChildren(lista);
  }

  /* ---------- 3. Colunas agrupadas (duas séries, mesma unidade) ---------- */
  function colunas(caixa, { rotulos, series, formatar = U.numero, detalheRotulo }) {
    const desenhar = () => {
      const area = caixa.querySelector(".grafico__area") || caixa;
      area.querySelectorAll("svg.grafico__svg").forEach((s) => s.remove());
      const W = Math.max(280, area.clientWidth);
      const H = 220;
      const m = { t: 14, r: 12, b: 30, l: 34 };
      const iw = W - m.l - m.r;
      const ih = H - m.t - m.b;
      const { max, passo } = escala(Math.max(1, ...series.flatMap((s) => s.valores)), 4, true);
      const y = (v) => m.t + ih - (v / max) * ih;
      const faixa = iw / rotulos.length;
      const larg = Math.min(18, (faixa - 12) / series.length - 2);
      const svg = svgEl("svg", { class: "grafico__svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": rotulos.map((r, i) => `${r}: ${series.map((s) => `${s.nome} ${formatar(s.valores[i])}`).join(", ")}`).join("; ") });
      for (let v = 0; v <= max; v += passo) {
        svg.append(svgEl("line", { class: v === 0 ? "eixo" : "grade", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
        const t = svgEl("text", { class: "rotulo-eixo", x: m.l - 8, y: y(v) + 4, "text-anchor": "end" });
        t.textContent = U.numero(v);
        svg.append(t);
      }
      const dica = criarDica(caixa);
      rotulos.forEach((r, i) => {
        const cx = m.l + faixa * i + faixa / 2;
        const grupo = svgEl("g", { class: "coluna-grupo", tabindex: "0", "aria-label": `${r}: ${series.map((s) => `${s.nome} ${formatar(s.valores[i])}`).join(", ")}` });
        grupo.append(svgEl("rect", { class: "alvo", x: m.l + faixa * i, y: m.t, width: faixa, height: ih }));
        const total = series.length * larg + (series.length - 1) * 2;
        series.forEach((s, k) => {
          const v = s.valores[i];
          const x0 = cx - total / 2 + k * (larg + 2);
          const h = Math.max(v ? 2 : 0, y(0) - y(v));
          const raio = Math.min(4, h, larg / 2);
          // topo arredondado, base reta
          const d = `M${x0} ${y(0)} V${y(0) - h + raio} Q${x0} ${y(0) - h} ${x0 + raio} ${y(0) - h} H${x0 + larg - raio} Q${x0 + larg} ${y(0) - h} ${x0 + larg} ${y(0) - h + raio} V${y(0)} Z`;
          if (v) grupo.append(svgEl("path", { class: `col-barra col-barra--${k + 1}`, d }));
        });
        const pulo = Math.max(1, Math.ceil((rotulos.length * 44) / iw));
        if ((rotulos.length - 1 - i) % pulo === 0) {
          const t = svgEl("text", { class: "rotulo-eixo", x: cx, y: H - 8, "text-anchor": "middle" });
          t.textContent = r;
          grupo.append(t);
        }
        const mostrar = () => {
          const rs = svg.getBoundingClientRect();
          const c = caixa.getBoundingClientRect();
          const esc = rs.width / W || 1;
          const topo = y(Math.max(...series.map((s) => s.valores[i])));
          dica.mostrar(cx * esc + rs.left - c.left, topo * esc + rs.top - c.top, detalheRotulo ? detalheRotulo(i) : r, "", series.map((s) => U.el("span", { class: "dica__linha" }, U.el("i", { class: `chave chave--${series.indexOf(s) + 1}` }), U.el("b", { texto: formatar(s.valores[i]) }), ` ${s.nome}`)));
          grupo.classList.add("is-ativo");
        };
        const esconder = () => { dica.esconder(); grupo.classList.remove("is-ativo"); };
        grupo.addEventListener("pointerenter", mostrar);
        grupo.addEventListener("pointerleave", esconder);
        grupo.addEventListener("focus", mostrar);
        grupo.addEventListener("blur", esconder);
        svg.append(grupo);
      });
      area.append(svg);
    };
    desenhar();
    aoRedimensionar(caixa.querySelector(".grafico__area") || caixa, desenhar);
  }

  /* ---------- Tabela equivalente (acessibilidade e conferência) ---------- */
  function tabela(caixa, cabecalho, linhas) {
    const t = U.el("table", { class: "tabela tabela--grafico" },
      U.el("thead", {}, U.el("tr", {}, ...cabecalho.map((c, i) => U.el("th", { scope: "col", class: i ? "num" : "" , texto: c })))),
      U.el("tbody", {}, ...linhas.map((l) => U.el("tr", {}, ...l.map((c, i) => U.el(i ? "td" : "th", { scope: i ? null : "row", class: i ? "num" : "", texto: c }))))));
    const lugar = caixa.querySelector(".grafico__tabela");
    if (lugar) lugar.replaceChildren(t);
    return t;
  }

  NX.graficos = { area, barras, colunas, tabela, escala };
})();
