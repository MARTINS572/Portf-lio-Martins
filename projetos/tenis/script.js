/* ==========================================================================
   SOLADO — script.js (loja demonstrativa)
   --------------------------------------------------------------------------
   Tema, menu e animações: assets/js/comum.js
   Aqui: produtos, filtros, ordenação, detalhes e carrinho.
   O carrinho fica salvo neste navegador (localStorage). Não há pagamento.
   ========================================================================== */


/* ------------------------------------------------------------------------
   CONFIGURAÇÕES E PRODUTOS — EDITE AQUI
   ------------------------------------------------------------------------ */
const CONFIG = {
  usarFotos: false,               // true depois de colocar a foto do hero em assets/images/tenis/
  quantidadeMaxima: 5,            // por item
  chaveCarrinho: "solado:carrinho",
};

// Faixas de preço do filtro
const FAIXAS = [
  { id: "todas", nome: "Todos", min: 0, max: Infinity },
  { id: "ate400", nome: "Até R$ 400", min: 0, max: 400 },
  { id: "400a600", nome: "R$ 400 a R$ 600", min: 400, max: 600 },
  { id: "acima600", nome: "Acima de R$ 600", min: 600, max: Infinity },
];

// Produtos fictícios. "novidade": quanto maior, mais recente.
// "modelo": "baixo" ou "alto" (desenho usado). "cores": cabedal, sola e detalhe.
const PRODUTOS = [
  { id: "runner-vao-01", nome: "Runner Vão 01", categoria: "Corrida", preco: 549.9, novidade: 12, modelo: "baixo", cores: ["#F4F4F2", "#FFFFFF", "#C6FF3D"], tamanhos: [37, 38, 39, 40, 41, 42, 43, 44], descricao: "Corrida de rua com cabedal em malha e entressola macia para treinos diários.", materiais: ["Malha respirável", "Entressola EVA", "Borracha"] },
  { id: "asfalto-3", nome: "Asfalto 3", categoria: "Corrida", preco: 599.9, novidade: 11, modelo: "baixo", cores: ["#C6FF3D", "#111111", "#111111"], tamanhos: [38, 39, 40, 41, 42, 43], descricao: "Cabedal verde-limão e solado escuro para quem quer ser visto no treino.", materiais: ["Malha técnica", "Entressola EVA", "Borracha"] },
  { id: "quadra-alta-breu", nome: "Quadra Alta Breu", categoria: "Basquete", preco: 699.9, novidade: 10, modelo: "alto", cores: ["#111111", "#1C1C1C", "#C6FF3D"], tamanhos: [39, 40, 41, 42, 43, 44], descricao: "Cano alto todo preto com recorte verde-limão no calcanhar.", materiais: ["Couro sintético", "Cano acolchoado", "Borracha"] },
  { id: "runner-vao-01-noite", nome: "Runner Vão 01 Noite", categoria: "Corrida", preco: 549.9, novidade: 9, modelo: "baixo", cores: ["#1A1A1A", "#2A2A2A", "#C6FF3D"], tamanhos: [36, 37, 38, 39, 40, 41, 42], descricao: "A versão escura do Runner Vão 01, com o mesmo conforto.", materiais: ["Malha respirável", "Entressola EVA", "Borracha"] },
  { id: "garoa", nome: "Garoa", categoria: "Casual", preco: 459.9, novidade: 8, modelo: "baixo", cores: ["#9AA3AD", "#E8E8E8", "#2F5BFF"], tamanhos: [35, 36, 37, 38, 39, 40, 41], descricao: "Cinza frio com detalhe em azul elétrico, para o dia a dia na cidade.", materiais: ["Camurça sintética", "Palmilha macia", "Borracha"] },
  { id: "quadra-alta", nome: "Quadra Alta", categoria: "Basquete", preco: 699.9, novidade: 7, modelo: "alto", cores: ["#FFFFFF", "#FFFFFF", "#2F5BFF"], tamanhos: [38, 39, 40, 41, 42, 43, 44], descricao: "Cano alto branco com recorte em azul elétrico e solado firme.", materiais: ["Couro sintético", "Cano acolchoado", "Borracha"] },
  { id: "pista-leve", nome: "Pista Leve", categoria: "Corrida", preco: 429.9, novidade: 6, modelo: "baixo", cores: ["#D9DDE3", "#FFFFFF", "#2F5BFF"], tamanhos: [36, 37, 38, 39, 40, 41, 42, 43], descricao: "Leve e ventilado, pensado para corridas curtas e caminhadas.", materiais: ["Malha leve", "Entressola EVA"] },
  { id: "concreto-low-carvao", nome: "Concreto Low Carvão", categoria: "Casual", preco: 389.9, novidade: 5, modelo: "baixo", cores: ["#3A3A3A", "#F5F1E8", "#C6FF3D"], tamanhos: [37, 38, 39, 40, 41, 42, 43], descricao: "Cano baixo em grafite com sola creme e um toque de verde-limão.", materiais: ["Lona", "Palmilha macia", "Borracha"] },
  { id: "rampa-pro", nome: "Rampa Pro", categoria: "Skate", preco: 349.9, novidade: 4, modelo: "baixo", cores: ["#8A8A80", "#C8A97E", "#111111"], tamanhos: [37, 38, 39, 40, 41, 42, 43, 44], descricao: "Skate com camurça resistente e sola de borracha em tom natural.", materiais: ["Camurça", "Sola vulcanizada"] },
  { id: "concreto-low", nome: "Concreto Low", categoria: "Casual", preco: 389.9, novidade: 3, modelo: "baixo", cores: ["#E8E2D6", "#F5F1E8", "#8A8A80"], tamanhos: [35, 36, 37, 38, 39, 40, 41, 42], descricao: "O básico em tom areia, fácil de combinar com tudo.", materiais: ["Lona", "Palmilha macia", "Borracha"] },
  { id: "rampa-pro-areia", nome: "Rampa Pro Areia", categoria: "Skate", preco: 349.9, novidade: 2, modelo: "baixo", cores: ["#D9CBB4", "#C8A97E", "#111111"], tamanhos: [38, 39, 40, 41, 42], descricao: "A versão clara do Rampa Pro, com a mesma sola vulcanizada.", materiais: ["Camurça", "Sola vulcanizada"] },
  { id: "meio-fio", nome: "Meio-fio", categoria: "Casual", preco: 299.9, novidade: 1, modelo: "baixo", cores: ["#FFFFFF", "#FFFFFF", "#111111"], tamanhos: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43], descricao: "Branco total com detalhe preto. Simples e direto.", materiais: ["Couro sintético", "Borracha"] },
];

const TODOS_TAMANHOS = [...new Set(PRODUTOS.flatMap((p) => p.tamanhos))].sort((a, b) => a - b);
const CATEGORIAS = [...new Set(PRODUTOS.map((p) => p.categoria))];
const NOVOS = [...PRODUTOS].sort((a, b) => b.novidade - a.novidade).slice(0, 3).map((p) => p.id);


/* ------------------------------------------------------------------------
   UTILITÁRIOS
   ------------------------------------------------------------------------ */
const moeda = (v) => Comum.moeda(v);
const produtoPorId = (id) => PRODUTOS.find((p) => p.id === id);
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
};

// Desenho do tênis com as cores do produto
function desenhoTenis(produto, classe) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", produto.modelo === "alto" ? "0 0 240 132" : "0 0 240 112");
  svg.setAttribute("aria-hidden", "true");
  if (classe) svg.setAttribute("class", classe);
  svg.style.setProperty("--cabedal", produto.cores[0]);
  svg.style.setProperty("--sola", produto.cores[1]);
  svg.style.setProperty("--detalhe", produto.cores[2]);
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", produto.modelo === "alto" ? "#tenis-alto" : "#tenis-baixo");
  svg.append(use);
  return svg;
}


/* ------------------------------------------------------------------------
   LANÇAMENTOS
   ------------------------------------------------------------------------ */
function montarLancamentos() {
  const caixa = document.getElementById("lancamentos-lista");
  NOVOS.map(produtoPorId).forEach((p) => {
    const botao = criar("button", "destaque");
    botao.type = "button";
    botao.setAttribute("aria-label", `${p.nome}, ${moeda(p.preco)}. Ver detalhes`);
    botao.setAttribute("data-reveal", "");
    botao.append(criar("span", "destaque__novo", "Novo"), desenhoTenis(p, "destaque__tenis"));
    const info = criar("span", "destaque__info");
    info.append(criar("span", "destaque__nome", p.nome), criar("span", "destaque__preco", moeda(p.preco)));
    botao.append(info);
    botao.addEventListener("click", () => abrirProduto(p.id));
    caixa.append(botao);
  });
}


/* ------------------------------------------------------------------------
   FILTROS E ORDENAÇÃO
   ------------------------------------------------------------------------ */
const filtros = { categorias: new Set(), tamanhos: new Set(), faixa: "todas", ordem: "novidades" };

function escolha({ tipo, nome, valor, id, texto, marcado }) {
  const div = criar("div", "escolha");
  const input = document.createElement("input");
  Object.assign(input, { type: tipo, name: nome, value: valor, id, checked: !!marcado });
  const label = criar("label", "", texto);
  label.htmlFor = id;
  div.append(input, label);
  return div;
}

function montarFiltros() {
  const cat = document.getElementById("filtro-categorias");
  CATEGORIAS.forEach((c) => cat.append(escolha({ tipo: "checkbox", nome: "categoria", valor: c, id: `fc-${c}`, texto: c })));
  cat.addEventListener("change", (e) => {
    e.target.checked ? filtros.categorias.add(e.target.value) : filtros.categorias.delete(e.target.value);
    aplicarFiltros();
  });

  const tam = document.getElementById("filtro-tamanhos");
  TODOS_TAMANHOS.forEach((t) => tam.append(escolha({ tipo: "checkbox", nome: "tamanho", valor: t, id: `ft-${t}`, texto: t })));
  tam.addEventListener("change", (e) => {
    const n = Number(e.target.value);
    e.target.checked ? filtros.tamanhos.add(n) : filtros.tamanhos.delete(n);
    aplicarFiltros();
  });

  const preco = document.getElementById("filtro-precos");
  FAIXAS.forEach((f, i) => preco.append(escolha({ tipo: "radio", nome: "faixa", valor: f.id, id: `fp-${f.id}`, texto: f.nome, marcado: i === 0 })));
  preco.addEventListener("change", (e) => { filtros.faixa = e.target.value; aplicarFiltros(); });

  document.getElementById("ordenar").addEventListener("change", (e) => { filtros.ordem = e.target.value; aplicarFiltros(); });

  const limpar = () => {
    filtros.categorias.clear();
    filtros.tamanhos.clear();
    filtros.faixa = "todas";
    document.querySelectorAll("#filtros input[type=checkbox]").forEach((i) => { i.checked = false; });
    document.getElementById("fp-todas").checked = true;
    aplicarFiltros();
  };
  document.getElementById("limpar-filtros").addEventListener("click", limpar);
  document.getElementById("limpar-vazio").addEventListener("click", limpar);

  // Painel de filtros no celular
  const painel = document.getElementById("filtros");
  const botaoAbrir = document.getElementById("abrir-filtros");
  let fundo = null;
  const fechar = () => {
    painel.classList.remove("is-open");
    botaoAbrir.setAttribute("aria-expanded", "false");
    if (fundo) { fundo.remove(); fundo = null; }
    document.removeEventListener("keydown", aoTeclar);
  };
  const aoTeclar = (e) => { if (e.key === "Escape") { fechar(); botaoAbrir.focus(); } };
  botaoAbrir.addEventListener("click", () => {
    painel.classList.add("is-open");
    botaoAbrir.setAttribute("aria-expanded", "true");
    fundo = criar("div", "fundo-escuro");
    fundo.addEventListener("click", fechar);
    document.body.append(fundo);
    document.addEventListener("keydown", aoTeclar);
    painel.querySelector("input").focus();
  });
  document.getElementById("fechar-filtros").addEventListener("click", () => { fechar(); botaoAbrir.focus(); });
  document.getElementById("ver-resultados").addEventListener("click", () => {
    fechar();
    document.getElementById("contagem").scrollIntoView({ block: "start" });
  });
}

function aplicarFiltros() {
  const faixa = FAIXAS.find((f) => f.id === filtros.faixa);
  let lista = PRODUTOS.filter((p) =>
    (!filtros.categorias.size || filtros.categorias.has(p.categoria)) &&
    (!filtros.tamanhos.size || p.tamanhos.some((t) => filtros.tamanhos.has(t))) &&
    p.preco >= faixa.min && p.preco < faixa.max);

  if (filtros.ordem === "menor") lista.sort((a, b) => a.preco - b.preco || b.novidade - a.novidade);
  else if (filtros.ordem === "maior") lista.sort((a, b) => b.preco - a.preco || b.novidade - a.novidade);
  else lista.sort((a, b) => b.novidade - a.novidade);

  const ativos = filtros.categorias.size + filtros.tamanhos.size + (filtros.faixa !== "todas" ? 1 : 0);
  const marcador = document.getElementById("filtros-ativos");
  marcador.hidden = ativos === 0;
  marcador.textContent = ativos;

  document.getElementById("contagem").textContent = `${lista.length} tênis ${lista.length === 1 ? "encontrado" : "encontrados"}`;
  document.getElementById("vazio").hidden = lista.length > 0;
  desenharGrade(lista);
}

function desenharGrade(lista) {
  const grade = document.getElementById("grade");
  grade.replaceChildren(...lista.map((p, i) => {
    const li = criar("li", "cartao entrar");
    li.style.animationDelay = `${Math.min(i, 8) * 40}ms`;
    const botao = criar("button", "cartao__botao");
    botao.type = "button";
    botao.setAttribute("aria-label", `${p.nome}, ${p.categoria}, ${moeda(p.preco)}. Ver detalhes`);
    const foto = criar("span", "cartao__foto");
    if (NOVOS.includes(p.id)) foto.append(criar("span", "cartao__selo", "Novo"));
    foto.append(desenhoTenis(p, "cartao__tenis"));
    const info = criar("span", "cartao__info");
    const cores = criar("span", "cartao__cores");
    p.cores.forEach((c) => { const s = criar("span"); s.style.setProperty("--c", c); cores.append(s); });
    info.append(criar("span", "cartao__categoria", p.categoria), criar("span", "cartao__nome", p.nome), criar("span", "cartao__preco", moeda(p.preco)), cores);
    botao.append(foto, info);
    botao.addEventListener("click", () => abrirProduto(p.id));
    li.append(botao);
    return li;
  }));
}


/* ------------------------------------------------------------------------
   DETALHES DO PRODUTO
   ------------------------------------------------------------------------ */
const selecao = { produto: null, tamanho: null, quantidade: 1 };

function abrirProduto(id) {
  const p = produtoPorId(id);
  if (!p) return;
  Object.assign(selecao, { produto: p, tamanho: null, quantidade: 1 });

  document.getElementById("produto-visual").replaceChildren(desenhoTenis(p));
  document.getElementById("produto-categoria").textContent = `${p.categoria}${NOVOS.includes(p.id) ? " · Lançamento" : ""}`;
  document.getElementById("produto-nome").textContent = p.nome;
  document.getElementById("produto-preco").textContent = moeda(p.preco);
  document.getElementById("produto-descricao").textContent = p.descricao;
  document.getElementById("produto-materiais").replaceChildren(...p.materiais.map((m) => criar("li", "", m)));
  document.getElementById("produto-tamanho-escolhido").textContent = "";
  document.getElementById("produto-erro").textContent = "";

  // Todos os tamanhos aparecem; os que não existem para o modelo ficam riscados
  const tamanhos = document.getElementById("produto-tamanhos");
  tamanhos.replaceChildren(...TODOS_TAMANHOS.map((t) => {
    const item = escolha({ tipo: "radio", nome: "tamanho-produto", valor: t, id: `pt-${t}`, texto: t });
    const input = item.querySelector("input");
    if (!p.tamanhos.includes(t)) {
      input.disabled = true;
      item.querySelector("label").setAttribute("aria-label", `${t}, indisponível`);
    }
    return item;
  }));
  atualizarQuantidade();
  const adicionar = document.getElementById("adicionar");
  adicionar.classList.remove("is-ok");
  adicionar.textContent = "Adicionar ao carrinho";
  Comum.abrirDialogo(document.getElementById("produto"));
}

function atualizarQuantidade() {
  document.getElementById("qtd-valor").textContent = selecao.quantidade;
  document.getElementById("qtd-menos").disabled = selecao.quantidade <= 1;
  document.getElementById("qtd-mais").disabled = selecao.quantidade >= CONFIG.quantidadeMaxima;
}

function prepararProduto() {
  document.getElementById("produto-tamanhos").addEventListener("change", (e) => {
    selecao.tamanho = Number(e.target.value);
    document.getElementById("produto-tamanho-escolhido").textContent = `· ${selecao.tamanho}`;
    document.getElementById("produto-erro").textContent = "";
  });
  document.getElementById("qtd-menos").addEventListener("click", () => { selecao.quantidade = Math.max(1, selecao.quantidade - 1); atualizarQuantidade(); });
  document.getElementById("qtd-mais").addEventListener("click", () => { selecao.quantidade = Math.min(CONFIG.quantidadeMaxima, selecao.quantidade + 1); atualizarQuantidade(); });
  document.getElementById("adicionar").addEventListener("click", () => {
    if (!selecao.tamanho) {
      document.getElementById("produto-erro").textContent = "Escolha um tamanho.";
      document.querySelector("#produto-tamanhos input:not(:disabled)").focus();
      return;
    }
    adicionarAoCarrinho(selecao.produto.id, selecao.tamanho, selecao.quantidade);
    const botao = document.getElementById("adicionar");
    botao.classList.add("is-ok");
    botao.textContent = "Adicionado ao carrinho";
    Comum.aviso(`${selecao.produto.nome} (${selecao.tamanho}) foi para o carrinho.`);
  });
  document.querySelectorAll("[data-abrir-produto]").forEach((b) => b.addEventListener("click", () => abrirProduto(b.dataset.abrirProduto)));
}


/* ------------------------------------------------------------------------
   CARRINHO (salvo neste navegador)
   Cada item: { id, tamanho, quantidade }
   ------------------------------------------------------------------------ */
let carrinho = lerCarrinho();

function lerCarrinho() {
  try {
    const itens = JSON.parse(Comum.armazenamento.ler(CONFIG.chaveCarrinho) || "[]");
    // ignora itens de produtos que não existem mais
    return Array.isArray(itens) ? itens.filter((i) => produtoPorId(i.id) && produtoPorId(i.id).tamanhos.includes(i.tamanho)) : [];
  } catch (e) { return []; }
}
function salvarCarrinho() {
  Comum.armazenamento.salvar(CONFIG.chaveCarrinho, JSON.stringify(carrinho));
  desenharCarrinho();
}

function adicionarAoCarrinho(id, tamanho, quantidade) {
  const existente = carrinho.find((i) => i.id === id && i.tamanho === tamanho);
  if (existente) existente.quantidade = Math.min(CONFIG.quantidadeMaxima, existente.quantidade + quantidade);
  else carrinho.push({ id, tamanho, quantidade });
  salvarCarrinho();
  const botao = document.getElementById("abrir-carrinho");
  botao.classList.remove("pular-contador"); void botao.offsetWidth; botao.classList.add("pular-contador");
}

function totais() {
  return carrinho.reduce((t, i) => {
    t.itens += i.quantidade;
    t.subtotal += produtoPorId(i.id).preco * i.quantidade;
    return t;
  }, { itens: 0, subtotal: 0 });
}

function desenharCarrinho() {
  const { itens, subtotal } = totais();
  const contador = document.getElementById("contador-carrinho");
  contador.textContent = itens;
  document.getElementById("abrir-carrinho").setAttribute("aria-label", `Abrir carrinho, ${itens} ${itens === 1 ? "item" : "itens"}`);
  document.getElementById("carrinho-itens").textContent = itens;
  // Arredonda para evitar diferenças de centavos em somas com decimais
  document.getElementById("carrinho-subtotal").textContent = moeda(Math.round(subtotal * 100) / 100);
  document.getElementById("carrinho-vazio").hidden = carrinho.length > 0;
  document.getElementById("carrinho-rodape").hidden = carrinho.length === 0;

  const lista = document.getElementById("carrinho-lista");
  lista.replaceChildren(...carrinho.map((item, indice) => {
    const p = produtoPorId(item.id);
    const li = criar("li", "linha");
    const foto = criar("span", "linha__foto");
    foto.append(desenhoTenis(p));
    const acoes = criar("div", "linha__acoes");
    const qtd = criar("div", "quantidade");
    qtd.setAttribute("role", "group");
    qtd.setAttribute("aria-label", `Quantidade de ${p.nome}`);
    const menos = criar("button", "", "−"); menos.type = "button"; menos.setAttribute("aria-label", "Diminuir"); menos.disabled = item.quantidade <= 1;
    const valor = criar("output", "", item.quantidade);
    const mais = criar("button", "", "+"); mais.type = "button"; mais.setAttribute("aria-label", "Aumentar"); mais.disabled = item.quantidade >= CONFIG.quantidadeMaxima;
    menos.addEventListener("click", () => { item.quantidade -= 1; salvarCarrinho(); focarLinha(indice, 0); });
    mais.addEventListener("click", () => { item.quantidade += 1; salvarCarrinho(); focarLinha(indice, 1); });
    qtd.append(menos, valor, mais);
    acoes.append(qtd, criar("span", "linha__total", moeda(Math.round(p.preco * item.quantidade * 100) / 100)));
    const remover = criar("button", "linha__remover", "Remover");
    remover.type = "button";
    remover.setAttribute("aria-label", `Remover ${p.nome}, tamanho ${item.tamanho}`);
    remover.addEventListener("click", () => {
      li.classList.add("saindo");
      const depois = () => { carrinho.splice(carrinho.indexOf(item), 1); salvarCarrinho(); document.querySelector("#carrinho [data-fechar]").focus(); };
      Comum.reduzirMovimento() ? depois() : setTimeout(depois, 280);
    });
    li.append(foto, criar("p", "linha__nome", p.nome), criar("p", "linha__detalhe", `Tamanho ${item.tamanho} · ${moeda(p.preco)} cada`), acoes, remover);
    return li;
  }));
}

// Depois de redesenhar, devolve o foco ao botão clicado (para quem usa teclado)
function focarLinha(indice, botao) {
  const linha = document.querySelectorAll("#carrinho-lista .linha")[indice];
  if (!linha) return;
  const alvos = linha.querySelectorAll(".quantidade button");
  const alvo = alvos[botao].disabled ? alvos[1 - botao] : alvos[botao];
  alvo.focus();
}

function prepararCarrinho() {
  document.getElementById("abrir-carrinho").addEventListener("click", () => Comum.abrirDialogo(document.getElementById("carrinho")));
  document.getElementById("finalizar").addEventListener("click", () => {
    const { itens, subtotal } = totais();
    const linhas = carrinho.map((i) => {
      const p = produtoPorId(i.id);
      return `${i.quantidade}x ${p.nome} (tam. ${i.tamanho}) — ${moeda(Math.round(p.preco * i.quantidade * 100) / 100)}`;
    });
    document.getElementById("janela-pedido-resumo").textContent = `Pedido SOLADO (demonstração)\n\n${linhas.join("\n")}\n\nItens: ${itens}\nSubtotal: ${moeda(Math.round(subtotal * 100) / 100)}`;
    document.getElementById("carrinho").close();
    Comum.abrirDialogo(document.getElementById("janela-pedido"));
  });
  // Se o carrinho mudar em outra aba, atualiza esta
  window.addEventListener("storage", (e) => { if (e.key === CONFIG.chaveCarrinho) { carrinho = lerCarrinho(); desenharCarrinho(); } });
  desenharCarrinho();
}


/* ------------------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  montarLancamentos();
  montarFiltros();
  aplicarFiltros();
  prepararProduto();
  prepararCarrinho();
  Comum.carregarFotos(CONFIG.usarFotos, "../../assets/images/");
});
