/* ==========================================================================
   VIOLET STUDIO — arte.js
   Ilustrações feitas em código: pontas de unha (tips) com formato, cor e
   acabamento. São usadas no topo da página, na galeria e nos serviços.
   Elas existem para a demonstração funcionar sem fotos; para uma cliente
   real, troque por fotos dos trabalhos dela (veja usarFotos em site.js).
   ========================================================================== */
window.VioletArte = (function () {
  "use strict";
  let seq = 0;
  const uid = (p) => `${p}${(seq += 1)}`;

  // Formatos em uma caixa de 40 × 64 (ponta para cima, cutícula embaixo)
  const BASE = "L37 56 Q37 62 31 62.6 Q20 64.4 9 62.6 Q3 62 3 56";
  const FORMAS = {
    amendoada: `M20 1 C30 1 37 14 37 28 ${BASE} L3 28 C3 14 10 1 20 1 Z`,
    oval: `M20 2 C31 2 37 9 37 20 ${BASE} L3 20 C3 9 9 2 20 2 Z`,
    quadrada: `M6 2 L34 2 Q37 2 37 5 ${BASE} L3 5 Q3 2 6 2 Z`,
    bailarina: `M12.5 1 L27.5 1 Q29 1 29.4 2.4 L37 32 ${BASE} L3 32 L10.6 2.4 Q11 1 12.5 1 Z`,
    stiletto: `M20 0 C23 9 37 22 37 34 ${BASE} L3 34 C3 22 17 9 20 0 Z`,
  };

  /* Uma ponta de unha.
     forma: amendoada | oval | quadrada | bailarina | stiletto
     base: cor; desenho: liso | francesa | meia-lua | linha | pontos | ponto | constelacao | geometrico | cromado | pedraria
     cor2: cor do detalhe */
  function unha({ forma = "amendoada", base = "#7950C8", desenho = "liso", cor2 = "#FFFFFF" } = {}) {
    const corte = uid("vc");
    const brilho = uid("vb");
    const grad = uid("vg");
    const caminho = FORMAS[forma] || FORMAS.amendoada;
    let detalhe = "";
    let preenchimento = base;
    if (desenho === "francesa") detalhe = `<path d="M0 0 H40 V${forma === "quadrada" ? 13 : 17} Q20 ${forma === "quadrada" ? 7 : 8} 0 ${forma === "quadrada" ? 13 : 17} Z" fill="${cor2}"/>`;
    if (desenho === "meia-lua") detalhe = `<path d="M3 64 V54 Q20 40 37 54 V64 Z" fill="${cor2}"/>`;
    if (desenho === "linha") detalhe = `<path d="M24 6 C16 22 26 36 17 58" stroke="${cor2}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    if (desenho === "pontos") detalhe = [[14, 20], [25, 30], [16, 42], [26, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${cor2}"/>`).join("");
    if (desenho === "ponto") detalhe = `<circle cx="20" cy="52" r="3.2" fill="${cor2}"/>`;
    if (desenho === "constelacao") detalhe = [[13, 16, 0.9], [26, 22, 1.4], [18, 31, 0.7], [29, 38, 0.9], [11, 44, 1.2], [22, 51, 0.8], [30, 12, 0.6]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor2}"/>`).join("") + `<path d="M21 9 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 z" fill="${cor2}"/>`;
    if (desenho === "geometrico") detalhe = `<path d="M0 30 L40 18 V40 L0 52 Z" fill="${cor2}"/><path d="M0 30 L40 18" stroke="#111014" stroke-width=".9"/><path d="M0 52 L40 40" stroke="#111014" stroke-width=".9"/>`;
    if (desenho === "cromado") {
      preenchimento = `url(#${grad})`;
      detalhe = "";
    }
    if (desenho === "pedraria") detalhe = `<circle cx="20" cy="50" r="4" fill="${cor2}"/><circle cx="18.6" cy="48.6" r="1.4" fill="#fff" opacity=".9"/><circle cx="20" cy="50" r="4" fill="none" stroke="#111014" stroke-opacity=".25" stroke-width=".6"/>`;
    const defs = `<defs>
      <clipPath id="${corte}"><path d="${caminho}"/></clipPath>
      <linearGradient id="${brilho}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      ${desenho === "cromado" ? `<linearGradient id="${grad}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${cor2}"/><stop offset=".35" stop-color="${base}"/><stop offset=".55" stop-color="#F7F6F9"/><stop offset=".75" stop-color="${base}"/><stop offset="1" stop-color="#51318C"/></linearGradient>` : ""}
    </defs>`;
    return `${defs}<g clip-path="url(#${corte})"><path d="${caminho}" fill="${preenchimento}"/>${detalhe}
      <path d="M7 10 C6 24 6.5 40 8 54" stroke="url(#${brilho})" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <path d="M3 60 Q20 66 37 60" stroke="#000" stroke-opacity=".12" stroke-width="3" fill="none"/></g>
      <path d="${caminho}" fill="none" stroke="#111014" stroke-opacity=".28" stroke-width=".7"/>`;
  }

  // Uma fileira de pontas, de pé, com leve inclinação (para galeria e serviços)
  function fileira(pontas, { fundo = "#F7F6F9", largura = 400, altura = 300, escala = 2.2, superficie = null } = {}) {
    const n = pontas.length;
    const w = 40 * escala;
    const vao = Math.min(w * 0.38, (largura - n * w) / (n + 1));
    const total = n * w + (n - 1) * vao;
    const x0 = (largura - total) / 2;
    const y = altura * 0.5 - (64 * escala) / 2 + altura * 0.04;
    const giros = [-7, 4, -2, 6, -4, 3];
    const itens = pontas.map((p, i) => {
      const x = x0 + i * (w + vao);
      const g = giros[i % giros.length] * (p.giro ?? 1);
      return `<g transform="translate(${x.toFixed(1)} ${(y + (i % 2 ? altura * 0.035 : 0)).toFixed(1)}) rotate(${g} ${w / 2} ${64 * escala}) scale(${escala})">${unha(p)}</g>`;
    }).join("");
    const sombra = `<ellipse cx="${largura / 2}" cy="${y + 64 * escala + 10}" rx="${total / 2 + 10}" ry="9" fill="#000" opacity=".08"/>`;
    const ret = fundo === "tema" ? `<rect width="${largura}" height="${altura}" style="fill: var(--arte-fundo, #F7F6F9)"/>` : `<rect width="${largura}" height="${altura}" fill="${fundo}"/>`;
    return `<svg viewBox="0 0 ${largura} ${altura}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      ${ret}${superficie || ""}${sombra}${itens}</svg>`;
  }

  /* O leque do topo da página: mostruário de pontas presas num aro, como os
     que os estúdios usam para a cliente escolher cor e acabamento. */
  function leque() {
    const pontas = [
      { forma: "amendoada", base: "#D9C9F5", desenho: "liso", nome: "Gel lilás" },
      { forma: "oval", base: "#F3E9E2", desenho: "francesa", cor2: "#FFFFFF", nome: "Francesinha" },
      { forma: "bailarina", base: "#51318C", desenho: "cromado", cor2: "#D9C9F5", nome: "Cromado violeta" },
      { forma: "quadrada", base: "#FFFFFF", desenho: "ponto", cor2: "#111014", nome: "Ponto e espaço" },
      { forma: "stiletto", base: "#7950C8", desenho: "linha", cor2: "#FFFFFF", nome: "Linha única" },
      { forma: "amendoada", base: "#3A3046", desenho: "constelacao", cor2: "#E9E4F2", nome: "Constelação" },
    ];
    const cx = 210, cy = 505, esc = 2.75, haste = 70;
    const w = 40 * esc, h = 64 * esc;
    const itens = pontas.map((p, i) => {
      const ang = -38 + i * 18.5;
      // cada ponta presa ao aro por uma haste; o leque abre em arco, como os mostruários de estúdio
      return `<g transform="rotate(${ang} ${cx} ${cy})"><g class="leque__ponta" style="--i:${i}">
        <line x1="${cx}" y1="${cy - 24}" x2="${cx}" y2="${cy - haste}" stroke="#C9C3D3" stroke-width="3" stroke-linecap="round"/>
        <g transform="translate(${cx - w / 2} ${cy - haste - h + 8}) scale(${esc})">${unha(p)}<circle cx="20" cy="59" r="1.6" fill="#111014" opacity=".45"/></g>
      </g></g>`;
    }).join("");
    return { svg: `<svg viewBox="0 214 470 330" role="img" aria-labelledby="leque-titulo" focusable="false">
      <title id="leque-titulo">Ilustração: mostruário em leque com seis pontas de unha — constelação, cromado violeta, francesinha, gel lilás, ponto e espaço, linha única.</title>
      ${itens}
      <circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="#C9C3D3" stroke-width="5"/>
      <circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.5" stroke-dasharray="18 150"/>
      </svg>`, pontas };
  }

  /* ---------- Composições da galeria ---------- */
  const tom = { preto: "#111014", grafite: "#211D27", roxo: "#7950C8", escuro: "#51318C", lilas: "#D9C9F5", gelo: "#F7F6F9", nude: "#EADFD8", leite: "#F4EFEC" };
  const GALERIA = {
    linha: () => fileira([{ forma: "amendoada", base: tom.nude, desenho: "linha", cor2: tom.grafite }, { forma: "amendoada", base: tom.nude, desenho: "linha", cor2: tom.grafite, giro: -1 }, { forma: "amendoada", base: tom.nude, desenho: "liso" }], { fundo: tom.lilas, altura: 420 }),
    "francesa-invertida": () => fileira([1, 2, 3, 4].map(() => ({ forma: "oval", base: "#F1EEF6", desenho: "meia-lua", cor2: tom.roxo })), { fundo: "#FFFFFF" }),
    constelacao: () => fileira([1, 2, 3, 4, 5].map(() => ({ forma: "amendoada", base: tom.preto, desenho: "constelacao", cor2: "#E9E4F2" })), { fundo: tom.grafite, largura: 640, escala: 2 }),
    violeta: () => fileira([1, 2, 3].map(() => ({ forma: "bailarina", base: tom.escuro, desenho: "cromado", cor2: tom.roxo })), { fundo: "#E6E3EA" }),
    formatos: () => fileira([{ forma: "quadrada", base: tom.roxo }, { forma: "oval", base: tom.roxo }, { forma: "amendoada", base: tom.roxo }, { forma: "bailarina", base: tom.roxo }, { forma: "stiletto", base: tom.roxo }], { fundo: tom.gelo, largura: 640, escala: 1.9 }),
    geometrico: () => fileira([1, 2, 3].map(() => ({ forma: "quadrada", base: "#FFFFFF", desenho: "geometrico", cor2: tom.lilas })), { fundo: tom.preto }),
    francesa: () => fileira([1, 2, 3, 4].map(() => ({ forma: "amendoada", base: tom.leite, desenho: "francesa", cor2: "#FFFFFF" })), { fundo: tom.escuro, altura: 420 }),
    cromado: () => fileira([1, 2, 3].map(() => ({ forma: "oval", base: tom.lilas, desenho: "cromado", cor2: "#FFFFFF" })), { fundo: tom.preto }),
    ponto: () => fileira([1, 2, 3, 4, 5].map(() => ({ forma: "quadrada", base: tom.gelo, desenho: "ponto", cor2: tom.preto })), { fundo: "#D8D3DF", escala: 1.8 }),
    pedraria: () => fileira([1, 2, 3, 4].map((i) => ({ forma: "amendoada", base: tom.lilas, desenho: i === 2 ? "pedraria" : "liso", cor2: "#B9A6E6" })), { fundo: "#FFFFFF", largura: 640, escala: 2.2 }),
  };

  /* ---------- Serviços: uma ponta só, com o acabamento do serviço ---------- */
  const SERVICOS = {
    tradicional: { forma: "oval", base: tom.nude, desenho: "liso" },
    esmalte: { forma: "oval", base: tom.roxo, desenho: "liso" },
    gel: { forma: "amendoada", base: tom.escuro, desenho: "cromado", cor2: tom.roxo },
    arte: { forma: "amendoada", base: tom.preto, desenho: "constelacao", cor2: tom.lilas },
    francesinha: { forma: "amendoada", base: tom.leite, desenho: "francesa", cor2: "#FFFFFF" },
    pes: { forma: "quadrada", base: tom.lilas, desenho: "liso" },
    combo: { forma: "quadrada", base: tom.roxo, desenho: "ponto", cor2: "#FFFFFF" },
    alongamento: { forma: "stiletto", base: tom.lilas, desenho: "liso" },
    remocao: { forma: "oval", base: "#E6E3EA", desenho: "liso" },
    decoracao: { forma: "amendoada", base: tom.lilas, desenho: "pedraria", cor2: "#B9A6E6" },
  };
  function servico(chave, { fundo = "tema" } = {}) {
    return fileira([SERVICOS[chave] || SERVICOS.esmalte], { fundo, largura: 200, altura: 200, escala: 2.1 });
  }

  const fundoDe = (svg) => (svg.match(/<rect [^>]*fill="(#[0-9A-Fa-f]{6})"/) || [])[1] || tom.gelo;
  function galeria(chave) {
    const svg = (GALERIA[chave] || GALERIA.formatos)();
    return { svg, fundo: fundoDe(svg) };
  }
  return { unha, fileira, leque, galeria, servico, FORMAS };
})();
