/* ==========================================================================
   AVESSO — script.js (catálogo demonstrativo)
   --------------------------------------------------------------------------
   Tema, menu e animações: assets/js/comum.js
   Aqui: peças, filtros, página de produto, sacola e as "rotas" da página.

   Rotas (tudo na mesma página, usando o # do endereço):
     #/                      catálogo
     #/categoria/Camisetas   catálogo já filtrado
     #/produto/av-01         página da peça
     #/sacola                sacola
   A sacola fica salva neste navegador (localStorage). Não há pagamento.
   ========================================================================== */


/* ------------------------------------------------------------------------
   CONFIGURAÇÕES E PEÇAS — EDITE AQUI
   ------------------------------------------------------------------------ */
const CONFIG = {
  usarFotos: false,            // true depois de colocar assets/images/moda/hero.jpg
  quantidadeMaxima: 5,         // por peça (mesma cor e tamanho)
  chaveSacola: "avesso:sacola",
};

const CATEGORIAS = ["Camisetas", "Calças", "Moletons", "Acessórios"];

// Ordem em que os tamanhos aparecem no filtro
const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "38", "40", "42", "44", "46", "Único"];

// Cores usadas nas peças (nome → cor do desenho)
const COR = {
  "Preto": "#141414",
  "Off-white": "#EFEBE3",
  "Areia": "#D9CBB4",
  "Grafite": "#3A3A3A",
  "Ferrugem": "#A4542F",
  "Cinza": "#8A8A85",
  "Cru": "#E8E0CF",
};

const ADULTO = ["PP", "P", "M", "G", "GG"];
const SEM_PP = ["P", "M", "G", "GG"];
const NUMERACAO = ["38", "40", "42", "44", "46"];

// Peças fictícias. "desenho" escolhe a ilustração; "variante" liga ou
// desliga detalhes do desenho (bolso cargo, capuz, zíper).
const PECAS = [
  { id: "av-01", nome: "Camiseta Avesso", categoria: "Camisetas", preco: 129, desenho: "camiseta", cores: ["Preto", "Off-white", "Areia"], tamanhos: ADULTO,
    descricao: "Malha pesada, gola reforçada e costuras com acabamento por dentro. A peça que deu nome à marca.",
    composicao: "100% algodão · 240 g/m²", modelagem: "Regular", cuidados: "Lavar do avesso, em água fria" },
  { id: "av-02", nome: "Camiseta Costura Aparente", categoria: "Camisetas", preco: 149, desenho: "camiseta", cores: ["Grafite", "Off-white"], tamanhos: SEM_PP,
    descricao: "As costuras ficam do lado de fora, de propósito. Tecido encorpado com toque seco.",
    composicao: "100% algodão · 220 g/m²", modelagem: "Regular", cuidados: "Lavar do avesso, em água fria" },
  { id: "av-03", nome: "Camiseta Oversized", categoria: "Camisetas", preco: 159, desenho: "camiseta", cores: ["Ferrugem", "Preto"], tamanhos: SEM_PP,
    descricao: "Corte amplo, ombro caído e barra reta. Fica solta sem parecer grande demais.",
    composicao: "100% algodão · 260 g/m²", modelagem: "Ampla", cuidados: "Não usar secadora" },
  { id: "av-04", nome: "Calça Cargo Concreto", categoria: "Calças", preco: 289, desenho: "calca", cores: ["Cinza", "Preto"], tamanhos: NUMERACAO,
    descricao: "Sarja pesada com bolsos laterais e barra com ajuste. Feita para o uso de todo dia.",
    composicao: "98% algodão, 2% elastano", modelagem: "Reta com bolsos cargo", cuidados: "Lavar do avesso, em água fria" },
  { id: "av-05", nome: "Calça Reta Sarja", categoria: "Calças", preco: 259, desenho: "calca", variante: { "--cargo": 0 }, cores: ["Areia", "Preto"], tamanhos: NUMERACAO,
    descricao: "Corte reto e limpo, sem bolsos externos. Combina com tudo da coleção.",
    composicao: "100% algodão", modelagem: "Reta", cuidados: "Passar do avesso" },
  { id: "av-06", nome: "Bermuda Avesso", categoria: "Calças", preco: 179, desenho: "bermuda", cores: ["Grafite", "Areia"], tamanhos: NUMERACAO,
    descricao: "A mesma sarja da calça reta, no comprimento acima do joelho.",
    composicao: "100% algodão", modelagem: "Reta", cuidados: "Lavar em água fria" },
  { id: "av-07", nome: "Moletom Capuz Avesso", categoria: "Moletons", preco: 329, desenho: "moletom", cores: ["Off-white", "Preto", "Ferrugem"], tamanhos: ADULTO,
    descricao: "Moletom flanelado por dentro, capuz forrado e bolso canguru.",
    composicao: "80% algodão, 20% poliéster · 380 g/m²", modelagem: "Regular", cuidados: "Lavar do avesso, sem secadora" },
  { id: "av-08", nome: "Moletom Gola Careca", categoria: "Moletons", preco: 279, desenho: "moletom", variante: { "--capuz": 0 }, cores: ["Areia", "Grafite"], tamanhos: SEM_PP,
    descricao: "Gola careca com ribana larga. Mais leve que o modelo com capuz.",
    composicao: "80% algodão, 20% poliéster · 320 g/m²", modelagem: "Regular", cuidados: "Lavar do avesso, sem secadora" },
  { id: "av-09", nome: "Moletom Meio-zíper", categoria: "Moletons", preco: 349, desenho: "moletom", variante: { "--capuz": 0, "--ziper": 1 }, cores: ["Preto", "Cinza"], tamanhos: SEM_PP,
    descricao: "Gola alta com zíper até o peito, para fechar nos dias frios.",
    composicao: "80% algodão, 20% poliéster · 380 g/m²", modelagem: "Regular", cuidados: "Fechar o zíper antes de lavar" },
  { id: "av-10", nome: "Boné Seis Gomos", categoria: "Acessórios", preco: 99, desenho: "bone", cores: ["Preto", "Areia"], tamanhos: ["Único"],
    descricao: "Aba curva e fecho ajustável atrás. Bordado discreto na frente.",
    composicao: "100% algodão", modelagem: "Ajustável", cuidados: "Lavar à mão" },
  { id: "av-11", nome: "Ecobag Lona Crua", categoria: "Acessórios", preco: 79, desenho: "bolsa", cores: ["Cru"], tamanhos: ["Único"],
    descricao: "Lona grossa e alças longas, cabe um notebook e a compra da semana.",
    composicao: "100% algodão (lona)", modelagem: "40 × 42 cm", cuidados: "Lavar à mão" },
  { id: "av-12", nome: "Meia Cano Alto (par)", categoria: "Acessórios", preco: 39, desenho: "meia", cores: ["Off-white", "Preto"], tamanhos: ["Único"],
    descricao: "Cano alto com listras em azul e punho reforçado.",
    composicao: "75% algodão, 23% poliamida, 2% elastano", modelagem: "Tamanho único (38 a 43)", cuidados: "Lavar do avesso" },
];

// Peça usada para ilustrar cada categoria
const CAPA_CATEGORIA = {
  "Camisetas": ["av-01", "Off-white"],
  "Calças": ["av-04", "Cinza"],
  "Moletons": ["av-07", "Ferrugem"],
  "Acessórios": ["av-10", "Preto"],
};

// Tamanho de cada desenho (proporção do quadro e escala)
const DESENHOS = {
  camiseta: { viewBox: "0 0 220 200", escala: 1 },
  moletom: { viewBox: "0 0 220 210", escala: 1 },
  calca: { viewBox: "0 0 200 260", escala: 0.74 },
  bermuda: { viewBox: "0 0 200 170", escala: 0.86 },
  bone: { viewBox: "0 0 200 140", escala: 0.94 },
  bolsa: { viewBox: "0 0 200 230", escala: 0.78 },
  meia: { viewBox: "0 0 140 230", escala: 0.52 },
};


/* ------------------------------------------------------------------------
   UTILITÁRIOS
   ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const moeda = (v) => Comum.moeda(Math.round(v * 100) / 100);
const pecaPorId = (id) => PECAS.find((p) => p.id === id);
const ref = (p) => p.id.toUpperCase();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
};

// Contorno claro em peças escuras, para os detalhes continuarem visíveis
function contornoPara(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luz = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luz < 0.3 ? "#5E5B55" : "#141414";
}

function desenho(peca, nomeCor, classe) {
  const ns = "http://www.w3.org/2000/svg";
  const info = DESENHOS[peca.desenho];
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", info.viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (classe) svg.setAttribute("class", classe);
  pintar(svg, peca, nomeCor);
  svg.style.setProperty("--escala", info.escala);
  Object.entries(peca.variante || {}).forEach(([k, v]) => svg.style.setProperty(k, v));
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", `#peca-${peca.desenho}`);
  svg.append(use);
  return svg;
}

function pintar(svg, peca, nomeCor) {
  const hex = COR[peca.cores.includes(nomeCor) ? nomeCor : peca.cores[0]];
  svg.style.setProperty("--peca", hex);
  svg.style.setProperty("--contorno", contornoPara(hex));
}

function animar(el, classe) {
  if (Comum.reduzirMovimento()) return;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  el.addEventListener("animationend", () => el.classList.remove(classe), { once: true });
}


/* ------------------------------------------------------------------------
   CATEGORIAS (blocos no início)
   ------------------------------------------------------------------------ */
function montarCategorias() {
  $("categorias").replaceChildren(...CATEGORIAS.map((c) => {
    const [id, cor] = CAPA_CATEGORIA[c];
    const total = PECAS.filter((p) => p.categoria === c).length;
    const a = criar("a", "categoria");
    a.href = `#/categoria/${c}`;
    a.setAttribute("data-reveal", "");
    a.append(desenho(pecaPorId(id), cor), criar("span", "categoria__nome", c), criar("span", "categoria__n", plural(total, "peça", "peças")));
    return a;
  }));
}


/* ------------------------------------------------------------------------
   FILTROS DO CATÁLOGO
   ------------------------------------------------------------------------ */
const PRECO_MAX = Number($("preco-max").max);
const filtros = { categoria: "Tudo", tamanhos: new Set(), precoMax: PRECO_MAX };

function opcaoTamanho({ nome, valor, id, tipo = "checkbox" }) {
  const div = criar("div", "tam");
  const input = document.createElement("input");
  Object.assign(input, { type: tipo, name: nome, value: valor, id });
  const label = criar("label", "", valor);
  label.htmlFor = id;
  div.append(input, label);
  return div;
}

function montarFiltros() {
  // Categorias (botões que ficam "pressionados")
  const abas = $("abas-categoria");
  ["Tudo", ...CATEGORIAS].forEach((c) => {
    const b = criar("button", "aba", c);
    b.type = "button";
    b.dataset.categoria = c;
    b.setAttribute("aria-pressed", String(c === filtros.categoria));
    b.setAttribute("aria-controls", "grade");
    abas.append(b);
  });
  abas.addEventListener("click", (e) => {
    const b = e.target.closest(".aba");
    if (!b) return;
    escolherCategoria(b.dataset.categoria, { atualizarEndereco: true });
  });

  // Tamanhos: todos os que existem nas peças, na ordem certa
  const existentes = new Set(PECAS.flatMap((p) => p.tamanhos));
  const tamanhos = ORDEM_TAMANHOS.filter((t) => existentes.has(t));
  $("filtro-tamanhos").replaceChildren(...tamanhos.map((t) => opcaoTamanho({ nome: "filtro-tamanho", valor: t, id: `ft-${t}` })));
  $("filtro-tamanhos").addEventListener("change", (e) => {
    e.target.checked ? filtros.tamanhos.add(e.target.value) : filtros.tamanhos.delete(e.target.value);
    aplicarFiltros();
  });

  // Preço máximo
  const faixa = $("preco-max");
  faixa.value = filtros.precoMax;
  const mostrarPreco = () => {
    $("preco-valor").textContent = moeda(Number(faixa.value));
    faixa.setAttribute("aria-valuetext", moeda(Number(faixa.value)));
  };
  faixa.addEventListener("input", () => { filtros.precoMax = Number(faixa.value); mostrarPreco(); aplicarFiltros(); });
  mostrarPreco();

  const limpar = () => {
    filtros.tamanhos.clear();
    filtros.precoMax = PRECO_MAX;
    faixa.value = PRECO_MAX;
    mostrarPreco();
    document.querySelectorAll("#filtro-tamanhos input").forEach((i) => { i.checked = false; });
    escolherCategoria("Tudo", { atualizarEndereco: true });
  };
  $("limpar").addEventListener("click", limpar);
  $("limpar-vazio").addEventListener("click", () => { limpar(); $("catalogo-titulo").focus({ preventScroll: true }); });
}

function escolherCategoria(categoria, { atualizarEndereco = false } = {}) {
  filtros.categoria = categoria === "Tudo" || CATEGORIAS.includes(categoria) ? categoria : "Tudo";
  document.querySelectorAll("#abas-categoria .aba").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.categoria === filtros.categoria)));
  if (atualizarEndereco) {
    // Troca o endereço sem criar um passo novo no "voltar" do navegador
    const novo = filtros.categoria === "Tudo" ? "#/" : `#/categoria/${filtros.categoria}`;
    history.replaceState(null, "", novo);
    estado.hash = novo;
  }
  marcarMenu(filtros.categoria);
  aplicarFiltros();
}

function aplicarFiltros() {
  const lista = PECAS.filter((p) =>
    (filtros.categoria === "Tudo" || p.categoria === filtros.categoria) &&
    (!filtros.tamanhos.size || p.tamanhos.some((t) => filtros.tamanhos.has(t))) &&
    p.preco <= filtros.precoMax);

  $("contagem").textContent = plural(lista.length, "peça", "peças");
  $("vazio").hidden = lista.length > 0;
  $("grade").replaceChildren(...lista.map((p, i) => cartao(p, i)));
}

function cartao(p, i = 0) {
  const li = criar("li", "peca-card entrar");
  li.style.animationDelay = `${Math.min(i, 8) * 40}ms`;
  const a = criar("a");
  a.href = `#/produto/${p.id}`;
  const foto = criar("span", "peca-card__foto");
  foto.append(desenho(p, p.cores[0]), criar("span", "peca-card__ref", ref(p)));
  const info = criar("span", "peca-card__info");
  const cores = criar("span", "peca-card__cores");
  cores.setAttribute("aria-hidden", "true");
  p.cores.forEach((c) => { const s = criar("span"); s.style.setProperty("--c", COR[c]); s.title = c; cores.append(s); });
  info.append(
    criar("span", "peca-card__nome", p.nome),
    criar("span", "peca-card__preco", moeda(p.preco)),
    cores,
    criar("span", "vh", ` · ${plural(p.cores.length, "cor", "cores")}: ${p.cores.join(", ")}`),
  );
  a.append(foto, info);
  li.append(a);
  return li;
}


/* ------------------------------------------------------------------------
   PÁGINA DA PEÇA
   ------------------------------------------------------------------------ */
const selecao = { peca: null, cor: null, tamanho: null };

function montarProduto(id) {
  const p = pecaPorId(id);
  if (!p) return false;
  Object.assign(selecao, { peca: p, cor: p.cores[0], tamanho: p.tamanhos.length === 1 ? p.tamanhos[0] : null });

  $("produto-ref").textContent = `${p.categoria} · ${ref(p)}`;
  $("produto-nome").textContent = p.nome;
  $("produto-preco").textContent = moeda(p.preco);
  $("produto-descricao").textContent = p.descricao;
  $("produto-erro").textContent = "";
  $("produto-qtd").value = "1";
  textoAdicionar();

  // Desenho grande + etiqueta
  $("produto-foto").replaceChildren(desenho(p, selecao.cor), criar("span", "produto__etiqueta", `${ref(p)} · ${p.composicao.split(" · ")[0]}`));

  // Miniaturas: a mesma peça em cada cor (atalho para o mouse;
  // quem usa teclado ou leitor de tela escolhe pelas bolinhas de cor)
  const minis = $("produto-miniaturas");
  minis.hidden = p.cores.length < 2;
  minis.replaceChildren(...p.cores.map((c) => {
    const m = criar("div", "miniatura");
    m.dataset.cor = c;
    m.append(desenho(p, c));
    return m;
  }));

  // Cores
  $("produto-cores").replaceChildren(...p.cores.map((c, i) => {
    const div = criar("div", "cor");
    const input = document.createElement("input");
    Object.assign(input, { type: "radio", name: "produto-cor", value: c, id: `pc-${i}`, checked: c === selecao.cor });
    const label = criar("label");
    label.htmlFor = input.id;
    label.title = c;
    label.style.setProperty("--c", COR[c]);
    label.append(criar("span", "vh", c));
    div.append(input, label);
    return div;
  }));

  // Tamanhos
  $("produto-tamanhos").replaceChildren(...p.tamanhos.map((t) => {
    const item = opcaoTamanho({ nome: "produto-tamanho", valor: t, id: `pt-${t}`, tipo: "radio" });
    item.querySelector("input").checked = t === selecao.tamanho;
    return item;
  }));

  // Ficha técnica
  $("produto-ficha").replaceChildren(...[
    ["Referência", ref(p)],
    ["Composição", p.composicao],
    ["Modelagem", p.modelagem],
    ["Cuidados", p.cuidados],
  ].map(([titulo, valor]) => {
    const div = criar("div");
    div.append(criar("dt", "", titulo), criar("dd", "", valor));
    return div;
  }));

  // "Combina com": uma peça de cada uma das outras categorias
  const outras = CATEGORIAS.filter((c) => c !== p.categoria).map((c) => PECAS.find((x) => x.categoria === c));
  $("relacionados").replaceChildren(...outras.map((x, i) => cartao(x, i)));

  mostrarCor();
  document.title = `${p.nome} · AVESSO (demonstrativo)`;
  marcarMenu(p.categoria);
  return true;
}

function mostrarCor() {
  const p = selecao.peca;
  $("produto-cor-nome").textContent = selecao.cor;
  const principal = $("produto-foto").querySelector("svg");
  if (principal) pintar(principal, p, selecao.cor);
  document.querySelectorAll("#produto-miniaturas .miniatura").forEach((m) => m.classList.toggle("is-ativa", m.dataset.cor === selecao.cor));
  const radio = document.querySelector(`#produto-cores input[value="${CSS.escape(selecao.cor)}"]`);
  if (radio) radio.checked = true;
}

function textoAdicionar(texto = "Adicionar à sacola") {
  $("adicionar").textContent = texto;
}

function prepararProduto() {
  $("produto-cores").addEventListener("change", (e) => {
    selecao.cor = e.target.value;
    mostrarCor();
    textoAdicionar();
  });
  $("produto-miniaturas").addEventListener("click", (e) => {
    const m = e.target.closest(".miniatura");
    if (!m) return;
    selecao.cor = m.dataset.cor;
    mostrarCor();
    textoAdicionar();
  });
  $("produto-tamanhos").addEventListener("change", (e) => {
    selecao.tamanho = e.target.value;
    $("produto-erro").textContent = "";
    textoAdicionar();
  });
  $("produto-qtd").addEventListener("change", () => textoAdicionar());

  $("adicionar").addEventListener("click", () => {
    const p = selecao.peca;
    if (!selecao.tamanho) {
      $("produto-erro").textContent = "Escolha um tamanho para continuar.";
      $("produto-tamanhos").querySelector("input").focus();
      return;
    }
    const pedida = Number($("produto-qtd").value) || 1;
    const resultado = adicionarNaSacola(p.id, selecao.cor, selecao.tamanho, pedida);
    if (resultado.adicionadas === 0) {
      $("produto-erro").textContent = `Esta peça já está na sacola com ${CONFIG.quantidadeMaxima} unidades, o limite desta demonstração.`;
      return;
    }
    $("produto-erro").textContent = resultado.adicionadas < pedida
      ? `Só foi possível adicionar ${resultado.adicionadas}: o limite é ${CONFIG.quantidadeMaxima} unidades por peça.`
      : "";
    textoAdicionar("Adicionado à sacola ✓");
    Comum.aviso(`${p.nome} (${selecao.cor}, ${selecao.tamanho}) foi para a sacola.`);
  });
}


/* ------------------------------------------------------------------------
   SACOLA (salva neste navegador)
   Cada item: { id, cor, tamanho, quantidade }
   ------------------------------------------------------------------------ */
let sacola = lerSacola();

function itemValido(i) {
  const p = i && pecaPorId(i.id);
  return !!p && p.cores.includes(i.cor) && p.tamanhos.includes(i.tamanho) &&
    Number.isInteger(i.quantidade) && i.quantidade >= 1 && i.quantidade <= CONFIG.quantidadeMaxima;
}

function lerSacola() {
  try {
    const itens = JSON.parse(Comum.armazenamento.ler(CONFIG.chaveSacola) || "[]");
    return Array.isArray(itens) ? itens.filter(itemValido) : [];
  } catch (e) { return []; }
}

function salvarSacola() {
  Comum.armazenamento.salvar(CONFIG.chaveSacola, JSON.stringify(sacola));
  desenharSacola();
}

function adicionarNaSacola(id, cor, tamanho, quantidade) {
  let item = sacola.find((i) => i.id === id && i.cor === cor && i.tamanho === tamanho);
  const antes = item ? item.quantidade : 0;
  const depois = Math.min(CONFIG.quantidadeMaxima, antes + quantidade);
  if (depois === antes) return { adicionadas: 0 };
  if (item) item.quantidade = depois;
  else sacola.push({ id, cor, tamanho, quantidade: depois });
  salvarSacola();
  animar($("link-sacola"), "pulo");
  return { adicionadas: depois - antes };
}

function totais() {
  return sacola.reduce((t, i) => {
    t.pecas += i.quantidade;
    t.subtotal += pecaPorId(i.id).preco * i.quantidade;
    return t;
  }, { pecas: 0, subtotal: 0 });
}

function desenharSacola() {
  const { pecas, subtotal } = totais();
  $("contador-sacola").textContent = pecas;
  $("link-sacola").setAttribute("aria-label", `Sacola, ${plural(pecas, "peça", "peças")}`);
  $("resumo-pecas").textContent = pecas;
  $("resumo-subtotal").textContent = moeda(subtotal);
  $("sacola-vazia").hidden = sacola.length > 0;
  $("sacola-lista").hidden = sacola.length === 0;
  $("resumo").hidden = sacola.length === 0;

  $("sacola-lista").replaceChildren(...sacola.map((item, indice) => {
    const p = pecaPorId(item.id);
    const li = criar("li", "item");
    const foto = criar("div", "item__foto");
    foto.append(desenho(p, item.cor));

    const nome = criar("a", "item__nome", p.nome);
    nome.href = `#/produto/${p.id}`;

    const acoes = criar("div", "item__acoes");
    const label = criar("label", "", "Qtd.");
    const select = document.createElement("select");
    select.id = `qtd-${indice}`;
    label.htmlFor = select.id;
    for (let n = 1; n <= CONFIG.quantidadeMaxima; n++) {
      const op = criar("option", "", n);
      op.value = n;
      select.append(op);
    }
    select.value = item.quantidade;
    select.setAttribute("aria-label", `Quantidade de ${p.nome}, ${item.cor}, ${item.tamanho}`);
    select.addEventListener("change", () => {
      item.quantidade = Number(select.value);
      salvarSacola();
      const mesmo = $(`qtd-${indice}`);
      if (mesmo) mesmo.focus();
    });
    label.append(select);

    const remover = criar("button", "link-botao", "Remover");
    remover.type = "button";
    remover.setAttribute("aria-label", `Remover ${p.nome}, ${item.cor}, tamanho ${item.tamanho}`);
    remover.addEventListener("click", () => {
      const depois = () => {
        sacola.splice(sacola.indexOf(item), 1);
        salvarSacola();
        // Foco vai para a próxima peça (ou para o título, se a sacola esvaziou)
        const proximo = $(`qtd-${Math.min(indice, sacola.length - 1)}`);
        (proximo || $("sacola-titulo")).focus();
        Comum.aviso(`${p.nome} saiu da sacola.`);
      };
      if (Comum.reduzirMovimento()) return depois();
      li.classList.add("saindo");
      setTimeout(depois, 280);
    });
    acoes.append(label, remover);

    li.append(
      foto,
      nome,
      criar("p", "item__preco", moeda(p.preco * item.quantidade)),
      criar("p", "item__det", `${item.cor} · ${item.tamanho} · ${moeda(p.preco)} cada`),
      acoes,
    );
    return li;
  }));
}

function prepararSacola() {
  $("finalizar").addEventListener("click", () => {
    const { pecas, subtotal } = totais();
    const linhas = sacola.map((i) => {
      const p = pecaPorId(i.id);
      return `${i.quantidade}x ${p.nome} (${i.cor}, ${i.tamanho}) — ${moeda(p.preco * i.quantidade)}`;
    });
    $("janela-pedido-resumo").textContent =
      `Pedido AVESSO (demonstração)\n\n${linhas.join("\n")}\n\nPeças: ${pecas}\nSubtotal: ${moeda(subtotal)}\nFrete: a combinar`;
    Comum.abrirDialogo($("janela-pedido"));
  });
  // Se a sacola mudar em outra aba, atualiza esta
  window.addEventListener("storage", (e) => {
    if (e.key === CONFIG.chaveSacola) { sacola = lerSacola(); desenharSacola(); }
  });
  desenharSacola();
}


/* ------------------------------------------------------------------------
   ROTAS: qual "página" mostrar conforme o endereço
   ------------------------------------------------------------------------ */
const VISTAS = { catalogo: $("vista-catalogo"), produto: $("vista-produto"), sacola: $("vista-sacola") };
const estado = {
  vista: null,
  hash: "",
  rotaCatalogo: "#/",     // por onde a pessoa saiu do catálogo
  rolagemCatalogo: 0,     // e em que altura estava
  irAoTopo: false,
};

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function hashAtual() {
  try { return decodeURIComponent(location.hash || ""); } catch (e) { return location.hash || ""; }
}

function marcarMenu(categoria) {
  document.querySelectorAll(".nav__link").forEach((a) => {
    const ativo = decodeURIComponent(a.getAttribute("href")) === `#/categoria/${categoria}`;
    a.classList.toggle("is-active", ativo);
    if (ativo) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
}

function trocarVista(nome, inicial) {
  const anterior = estado.vista;
  if (anterior === "catalogo" && nome !== "catalogo") {
    estado.rolagemCatalogo = window.scrollY;
    estado.rotaCatalogo = ehRotaDeCatalogo(estado.hash) ? estado.hash || "#/" : "#/";
  }
  Object.entries(VISTAS).forEach(([n, el]) => { el.hidden = n !== nome; });
  estado.vista = nome;
  if (!inicial && anterior !== nome) animar(VISTAS[nome], "trocando");
  return anterior;
}

function ehRotaDeCatalogo(hash) {
  return !hash.startsWith("#/produto/") && hash !== "#/sacola";
}

function rolar(y, suave) {
  window.scrollTo({ top: y, behavior: suave && !Comum.reduzirMovimento() ? "smooth" : "instant" });
}

function rota({ inicial = false, mesmoEndereco = false } = {}) {
  const hash = hashAtual();
  const deOutraVista = !!estado.vista && estado.vista !== "catalogo";

  // Página da peça
  if (hash.startsWith("#/produto/")) {
    const id = hash.slice("#/produto/".length);
    if (montarProduto(id)) {
      trocarVista("produto", inicial);
      estado.hash = hash;
      rolar(0);
      if (!inicial) $("produto-nome").focus({ preventScroll: true });
      return;
    }
    // Peça que não existe: volta ao catálogo
    history.replaceState(null, "", "#/");
    Comum.aviso("Essa peça não existe no catálogo.");
    return rota({ inicial });
  }

  // Sacola
  if (hash === "#/sacola") {
    trocarVista("sacola", inicial);
    estado.hash = hash;
    document.title = "Sacola · AVESSO (demonstrativo)";
    marcarMenu(null);
    rolar(0);
    if (!inicial) $("sacola-titulo").focus({ preventScroll: true });
    return;
  }

  // Âncora comum (#catalogo, #conteudo...). Se ela já está visível, o
  // navegador cuida da rolagem; se está no catálogo escondido, mostra o catálogo.
  const ehRota = hash === "" || hash.startsWith("#/");
  let alvo = null;
  if (!ehRota) {
    alvo = document.getElementById(hash.slice(1));
    const vistaDoAlvo = alvo && alvo.closest(".vista");
    if (alvo && !inicial && !(vistaDoAlvo && vistaDoAlvo.hidden)) return;
  }

  // Daqui para baixo, é sempre o catálogo
  document.title = "AVESSO · Projeto demonstrativo";
  const restaurar = !inicial && !estado.irAoTopo && deOutraVista && hash === estado.rotaCatalogo;
  estado.irAoTopo = false;
  trocarVista("catalogo", inicial);
  estado.hash = hash;

  if (hash.startsWith("#/categoria/")) escolherCategoria(hash.slice("#/categoria/".length));
  else if (ehRota) escolherCategoria("Tudo");

  if (restaurar) {
    rolar(estado.rolagemCatalogo);
  } else if (hash.startsWith("#/categoria/")) {
    rolar($("catalogo").getBoundingClientRect().top + window.scrollY - 64, !inicial && !deOutraVista);
    if (!inicial) $("catalogo-titulo").focus({ preventScroll: true });
  } else if (ehRota) {
    if (!inicial) rolar(0, mesmoEndereco);
  } else if (alvo) {
    alvo.scrollIntoView({ block: "start", behavior: inicial || deOutraVista || Comum.reduzirMovimento() ? "instant" : "smooth" });
  }
}

function prepararRotas() {
  window.addEventListener("hashchange", () => rota());

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = decodeURIComponent(a.getAttribute("href"));

    // "Voltar": retorna ao catálogo no mesmo ponto em que a pessoa estava
    if (a.hasAttribute("data-voltar")) {
      e.preventDefault();
      location.hash = estado.rotaCatalogo || "#/";
      return;
    }
    if (a.classList.contains("logo")) estado.irAoTopo = true;

    // Clique num link para o endereço atual: o navegador não avisa, então
    // a rota é refeita aqui (ex.: clicar em "Camisetas" estando em Camisetas)
    if (href.startsWith("#/") && href === hashAtual()) {
      e.preventDefault();
      rota({ mesmoEndereco: true });
    }
  });
}


/* ------------------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  montarCategorias();
  montarFiltros();
  prepararProduto();
  prepararSacola();
  prepararRotas();
  rota({ inicial: true });
  Comum.carregarFotos(CONFIG.usarFotos, "../../assets/images/");
});
