/* ==========================================================================
   BLACK COPPER — arte.js
   Ilustrações feitas em código, em traço creme e cobre: ferramentas,
   cadeira, espelho, pomadas, a escala do degradê e perfis de corte e barba.
   Existem para a demonstração funcionar sem fotos; para uma barbearia real,
   troque por fotos dos trabalhos da equipe (veja usarFotos em site.js).
   ========================================================================== */
window.CopperArte = (function () {
  "use strict";
  let seq = 0;
  const uid = (p) => `${p}${(seq += 1)}`;
  const C = { preto: "#111111", grafite: "#202020", grafite2: "#2A2A2A", creme: "#F2E8D8", creme2: "#E3D5BF", cobre: "#B8734F", cobreClaro: "#D29A76", cinza: "#8C857B", pele: "#E8D9C4" };

  /* ---------- Peças ---------- */
  // Tesoura apontando para a direita (caixa 0..124 × 0..44)
  const tesoura = (aberta = 4) => `
    <circle cx="13" cy="11" r="9" fill="none" stroke="${C.cobre}" stroke-width="3"/>
    <circle cx="13" cy="33" r="9" fill="none" stroke="${C.cobre}" stroke-width="3"/>
    <path d="M21 14 L42 21 M21 30 L42 23" stroke="${C.cobre}" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 20.5 L124 ${22 - aberta} L44 25 Z" fill="${C.creme}"/>
    <path d="M40 23.5 L124 ${22 + aberta} L44 19 Z" fill="${C.creme2}"/>
    <circle cx="42" cy="22" r="2.6" fill="${C.cobreClaro}"/>`;
  // Navalha aberta (caixa 0..200 × 0..50)
  const navalha = () => `
    <rect x="0" y="27" width="112" height="13" rx="6.5" fill="${C.cobre}"/>
    <path d="M8 33.5 H104" stroke="${C.cobreClaro}" stroke-width="1.2" opacity=".7"/>
    <circle cx="106" cy="33.5" r="3" fill="${C.creme}"/>
    <path d="M104 27 L188 12 Q199 10 199 21 L199 30 Q199 33 196 33.4 L110 41 Z" fill="${C.creme}"/>
    <path d="M110 30 L196 18" stroke="${C.cinza}" stroke-width="1.2" opacity=".55"/>`;
  // Pente (caixa 0..170 × 0..40)
  const pente = () => {
    let dentes = "";
    for (let i = 0; i < 34; i += 1) { const x = 6 + i * 4.7; dentes += `<path d="M${x.toFixed(1)} 14 V${i < 17 ? 38 : 32}" stroke="${C.creme}" stroke-width="2.2" stroke-linecap="round"/>`; }
    return `<rect x="0" y="4" width="166" height="12" rx="4" fill="${C.creme}"/>${dentes}`;
  };
  // Máquina em pé (caixa 0..70 × 0..170)
  const maquina = () => `
    <rect x="6" y="20" width="58" height="146" rx="24" fill="${C.grafite2}" stroke="${C.cobre}" stroke-width="2"/>
    <rect x="18" y="64" width="34" height="58" rx="10" fill="${C.cobre}" opacity=".9"/>
    <path d="M24 74 H46 M24 82 H46 M24 90 H46 M24 98 H46 M24 106 H46 M24 114 H46" stroke="${C.grafite}" stroke-width="1.5" opacity=".6"/>
    <rect x="4" y="6" width="62" height="18" rx="3" fill="${C.creme}"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${(8 + i * 4.6).toFixed(1)} 0 V8" stroke="${C.creme}" stroke-width="2"/>`).join("")}
    <circle cx="35" cy="142" r="6" fill="none" stroke="${C.cobreClaro}" stroke-width="2"/>`;
  // Pente de altura (guarda) com número
  const guarda = (n) => `
    <path d="M2 4 H46 V30 Q46 44 32 44 H16 Q2 44 2 30 Z" fill="none" stroke="${C.creme}" stroke-width="2"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${(7 + i * 5).toFixed(1)} 4 V${24 + (i % 2) * 4}" stroke="${C.creme}" stroke-width="1.4" opacity=".7"/>`).join("")}
    <text x="24" y="62" text-anchor="middle" font-family="Instrument Sans, system-ui, sans-serif" font-weight="600" font-size="15" fill="${C.cobreClaro}">${n}</text>`;
  // Pincel de barba (caixa 0..70 × 0..130)
  const pincel = () => {
    const g = uid("cbp");
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.creme}"/><stop offset=".7" stop-color="${C.creme2}"/><stop offset="1" stop-color="${C.cinza}"/></linearGradient></defs>
      <path d="M8 58 C2 30 18 4 35 4 C52 4 68 30 62 58 Z" fill="url(#${g})"/>
      <path d="M14 58 H56 L52 74 H18 Z" fill="${C.creme}"/>
      <path d="M18 74 C14 90 16 112 22 126 H48 C54 112 56 90 52 74 Z" fill="${C.cobre}"/>
      <path d="M24 82 C22 96 23 110 26 120" stroke="${C.cobreClaro}" stroke-width="2" fill="none" opacity=".8"/>`;
  };
  // Lata de pomada vista de cima (raio 48)
  const pomada = (aberta) => `
    <circle cx="0" cy="0" r="48" fill="${aberta ? C.creme2 : C.cobre}" stroke="${C.creme}" stroke-width="3"/>
    ${aberta ? `<path d="M-30 -8 C-18 -22 4 -26 22 -14 C30 -8 26 6 14 10 C-2 16 -22 12 -30 -8 Z" fill="${C.creme}" opacity=".9"/><path d="M-18 4 C-6 10 10 8 20 0" stroke="${C.cinza}" stroke-width="2" fill="none" opacity=".5"/>`
    : `<circle cx="0" cy="0" r="38" fill="none" stroke="${C.cobreClaro}" stroke-width="1.5"/><path d="M-20 -6 H20 M-14 6 H14" stroke="${C.preto}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`}`;
  // Cadeira de barbeiro, de lado (caixa 0..190 × 0..230)
  const cadeira = () => `
    <path d="M52 214 H140" stroke="${C.cobre}" stroke-width="8" stroke-linecap="round"/>
    <rect x="88" y="160" width="16" height="54" rx="4" fill="${C.cobre}"/>
    <path d="M40 120 H150 Q164 120 164 134 V150 Q164 162 150 162 H52 Q40 162 40 150 Z" fill="${C.creme}"/>
    <path d="M40 132 L22 40 Q20 28 32 26 L48 24 Q58 24 60 34 L70 120 Z" fill="${C.creme}"/>
    <rect x="24" y="2" width="40" height="22" rx="10" fill="${C.creme2}"/>
    <path d="M70 104 H150" stroke="${C.cobre}" stroke-width="6" stroke-linecap="round"/>
    <path d="M150 104 V120" stroke="${C.cobre}" stroke-width="5"/>
    <path d="M164 150 L186 196 H170" stroke="${C.cobreClaro}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M56 140 H148" stroke="${C.creme2}" stroke-width="2"/>`;
  // Espelho redondo com luz (caixa 0..200 × 0..220)
  const espelho = () => {
    const g = uid("cbe");
    return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A3A3A"/><stop offset=".55" stop-color="${C.grafite}"/><stop offset="1" stop-color="#1A1A1A"/></linearGradient></defs>
      <circle cx="100" cy="92" r="84" fill="none" stroke="${C.cobre}" stroke-width="8"/>
      <circle cx="100" cy="92" r="76" fill="url(#${g})"/>
      <path d="M52 56 L118 30 M48 84 L136 48" stroke="${C.creme}" stroke-width="3" opacity=".22" stroke-linecap="round"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${(100 + Math.cos(a) * 96).toFixed(1)}" cy="${(92 + Math.sin(a) * 96).toFixed(1)}" r="4" fill="${C.creme}"/>`; }).join("")}
      <path d="M20 210 H180" stroke="${C.creme2}" stroke-width="5" stroke-linecap="round"/>`;
  };
  // Perfil de cabeça (caixa 0..200 × 0..240), olhando para a direita
  const CABECA = "M78 240 C80 222 84 206 82 196 C66 186 56 164 56 136 C56 86 88 54 126 54 C158 54 178 76 182 104 C183 114 182 120 186 128 L196 146 C198 150 194 152 190 152 C192 156 190 160 186 160 C190 164 188 168 184 168 C186 176 182 184 172 186 C162 190 150 190 140 198 C134 210 132 224 134 240 Z";
  const CABELO = "M57 142 C54 92 84 50 126 48 C160 47 184 70 186 102 C172 92 152 86 130 88 C114 90 106 100 104 114 C103 122 98 128 92 132 C82 136 70 139 57 142 Z";
  function perfil({ barba = false, fundo = C.cobre } = {}) {
    const g = uid("cbg");
    const corte = uid("cbc");
    return `<defs>
        <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${C.preto}"/><stop offset=".5" stop-color="${C.preto}"/><stop offset=".78" stop-color="${C.preto}" stop-opacity=".55"/><stop offset="1" stop-color="${C.preto}" stop-opacity="0"/>
        </linearGradient>
        <clipPath id="${corte}"><path d="${CABECA}"/></clipPath>
      </defs>
      <path d="${CABECA}" fill="${C.pele}"/>
      <g clip-path="url(#${corte})">
        <path d="${CABELO}" fill="url(#${g})"/>
        <path d="M58 140 C64 160 72 176 84 190 L74 196 C64 182 58 162 58 140 Z" fill="${C.preto}" opacity="${barba ? 0.75 : 0.18}"/>
        ${barba ? `<path d="M100 146 C104 168 116 186 134 194 C150 199 164 192 174 186 C180 182 185 176 186 169 C178 171 170 169 164 165 C150 166 130 160 116 146 C110 140 104 140 100 146 Z" fill="${C.preto}"/>
          <path d="M170 157 C176 155 184 155 190 153 C189 159 183 162 176 162 Z" fill="${C.preto}"/>` : ""}
      </g>
      <ellipse cx="104" cy="126" rx="7" ry="11" fill="${C.creme2}" stroke="${C.cinza}" stroke-width="1.5"/>
      <path d="${CABECA}" fill="none" stroke="${C.preto}" stroke-opacity=".25" stroke-width="1.5"/>
      <path d="M150 112 L160 112" stroke="${C.preto}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
  }
  // A escala do degradê: faixas de densidade, do zero ao pente 3
  function escala() {
    const faixas = [["3", 0.95], ["2", 0.7], ["1", 0.42], ["0", 0.12]];
    let pontos = "";
    const s = (n) => { let x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
    faixas.forEach(([, dens], i) => {
      const y0 = 40 + i * 54;
      for (let k = 0; k < 220; k += 1) {
        if (s(k + i * 300) > dens) continue;
        const x = 70 + s(k * 7 + i) * 200, y = y0 + s(k * 3 + i * 11) * 50;
        pontos += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(1.5 + s(k) * 2).toFixed(1)} ${(-4 - s(k + 1) * 5).toFixed(1)}" stroke="${C.preto}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
    });
    return `<rect x="66" y="36" width="210" height="222" rx="10" fill="${C.pele}"/>${pontos}
      ${faixas.map(([n], i) => `<path d="M286 ${66 + i * 54} H300" stroke="${C.cobre}" stroke-width="2"/><text x="308" y="${71 + i * 54}" font-family="Instrument Sans, system-ui, sans-serif" font-size="15" font-weight="600" fill="${C.preto}">${n === "0" ? "zero" : `pente ${n}`}</text>`).join("")}`;
  }

  /* ---------- Composições ---------- */
  const quadro = (fundo, conteudo, w = 400, h = 300) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><rect width="${w}" height="${h}" fill="${fundo}"/>${conteudo}</svg>`;
  const COMP = {
    ferramentas: () => quadro(C.grafite, `
      <g transform="translate(40 92) rotate(-16) scale(1.45)">${navalha()}</g>
      <g transform="translate(250 120) rotate(14) scale(1.7)">${tesoura(5)}</g>
      <g transform="translate(70 238) rotate(-5) scale(1.35)">${pente()}</g>
      <g transform="translate(520 96) scale(.8)">${pomada(true)}</g>
      <g transform="translate(560 212) scale(.62)">${pomada(false)}</g>`, 640, 300),
    navalha: () => quadro(C.grafite, `<g transform="translate(62 170) rotate(-14) scale(1.35)">${navalha()}</g><path d="M40 250 H360" stroke="${C.creme}" stroke-width="10" opacity=".08" stroke-linecap="round"/>`),
    tesoura: () => quadro(C.creme, `<g transform="translate(80 92) rotate(-10) scale(1.9)" >${tesoura(6).replace(new RegExp(C.creme, "g"), C.grafite2).replace(new RegExp(C.creme2, "g"), "#3B3B3B")}</g><g transform="translate(110 230) rotate(4) scale(1.1)">${pente().replace(new RegExp(C.creme, "g"), C.cobre)}</g>`),
    pente: () => quadro(C.grafite, `<g transform="translate(60 120) rotate(-8) scale(1.7)">${pente()}</g>`),
    maquina: () => quadro(C.preto, `<g transform="translate(110 70) rotate(-12)">${maquina()}</g>
      ${["1", "2", "3"].map((n, i) => `<g transform="translate(${290 + i * 72} 110)">${guarda(n)}</g>`).join("")}`, 560, 300),
    pincel: () => quadro(C.grafite, `<g transform="translate(160 70) rotate(8) scale(1.2)">${pincel()}</g><ellipse cx="290" cy="220" rx="56" ry="18" fill="${C.creme2}" opacity=".9"/><path d="M234 220 V250 Q290 274 346 250 V220" fill="${C.cobre}"/>`),
    pomada: () => quadro(C.grafite, `<g transform="translate(150 150)">${pomada(true)}</g><g transform="translate(270 140) scale(.86)">${pomada(false)}</g><g transform="translate(400 160) scale(.7)">${pomada(false)}</g><g transform="translate(500 150)">${pomada(true)}</g>`, 640, 300),
    cadeira: () => quadro(C.grafite, `<g transform="translate(110 46)">${cadeira()}</g>`),
    espelho: () => quadro(C.preto, `<g transform="translate(100 36) scale(1)">${espelho()}</g>`),
    "perfil-degrade": () => quadro(C.cobre, `<g transform="translate(80 40) scale(1.15)">${perfil()}</g>`, 400, 340),
    "perfil-barba": () => quadro(C.creme, `<g transform="translate(80 40) scale(1.15)">${perfil({ barba: true })}</g>`, 400, 340),
    escala: () => quadro(C.creme, escala(), 400, 300),
    degrade: () => quadro(C.cobre, `<g transform="translate(110 20) scale(.95)">${perfil()}</g>`, 400, 300),
  };
  const fundoDe = (svg) => (svg.match(/<rect width="\d+" height="\d+" fill="(#[0-9A-Fa-f]{6})"/) || [])[1] || C.grafite;
  function desenho(chave) {
    const svg = (COMP[chave] || COMP.ferramentas)();
    return { svg, fundo: fundoDe(svg) };
  }

  /* ---------- Topo: bancada vista de cima, em grande ---------- */
  function topo() {
    return `<svg viewBox="0 0 520 600" role="img" aria-labelledby="bc-topo-titulo" focusable="false">
      <title id="bc-topo-titulo">Ilustração: bancada de barbeiro vista de cima, com navalha, tesoura, pente, máquina e uma lata de pomada.</title>
      <g transform="translate(36 120) rotate(-24) scale(1.6)">${navalha()}</g>
      <g transform="translate(150 250) rotate(18) scale(2.1)">${tesoura(6)}</g>
      <g transform="translate(40 470) rotate(-8) scale(1.6)">${pente()}</g>
      <g transform="translate(400 300) rotate(10) scale(1.05)">${maquina()}</g>
      <g transform="translate(410 120) scale(.9)">${pomada(true)}</g>
    </svg>`;
  }

  // Serviço: uma peça só, pequena
  const SERVICO = { tesoura: "tesoura", degrade: "degrade", pente: "pente", navalha: "navalha", ferramentas: "ferramentas", maquina: "maquina", pincel: "pincel" };
  const servico = (chave) => desenho(SERVICO[chave] || "ferramentas");

  return { desenho, topo, servico, CORES: C };
})();
