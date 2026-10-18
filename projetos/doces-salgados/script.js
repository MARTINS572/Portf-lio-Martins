/* ==========================================================================
   PONTO DOCES & SALGADOS — script.js (projeto demonstrativo)
   --------------------------------------------------------------------------
   Tema, menu e animações: assets/js/comum.js
   Aqui: cardápio, quantidades, comanda (resumo), data desejada e o envio
   da encomenda pelo WhatsApp. Os itens escolhidos ficam salvos neste
   navegador (localStorage). Nada é enviado sem a pessoa tocar em enviar
   dentro do WhatsApp, e a encomenda só vale depois da resposta da loja.
   ========================================================================== */


/* ------------------------------------------------------------------------
   CONFIGURAÇÕES — EDITE AQUI
   ------------------------------------------------------------------------ */
const CONFIG = {
  // WhatsApp da confeitaria, só números: 55 + DDD + número.
  // Vazio = demonstração (mostra a mensagem em vez de abrir a conversa).
  whatsapp: "",
  usarFotos: false,                 // true depois de colocar assets/images/doces/hero.jpg
  antecedenciaDias: 2,              // prazo mínimo entre hoje e a data desejada
  diasDeProducao: [2, 3, 4, 5, 6],  // 0 = domingo ... 6 = sábado (aqui: terça a sábado)
  maximoPorItem: 1000,
  chaveEncomenda: "ponto:encomenda",
};

const CATEGORIAS = { doces: "Doces", salgados: "Salgados", caixas: "Caixas para eventos" };

/* Produtos fictícios.
   minimo: menor quantidade aceita · passo: de quanto em quanto aumenta
   unidade: como o preço é cobrado · desenho: id do símbolo no index.html */
const PRODUTOS = [
  // DOCES
  { id: "brigadeiro", categoria: "doces", nome: "Brigadeiro tradicional", preco: 2.5, unidade: "unidade", minimo: 25, passo: 25, desenho: "brigadeiro",
    texto: "Chocolate meio amargo e granulado de chocolate, enrolado no dia da entrega.",
    tamanho: "Cerca de 15 g", contem: "Leite", conservacao: "Temperatura ambiente, até 2 dias" },
  { id: "beijinho", categoria: "doces", nome: "Beijinho", preco: 2.5, unidade: "unidade", minimo: 25, passo: 25, desenho: "beijinho",
    texto: "Leite condensado e coco ralado, finalizado com um cravo.",
    tamanho: "Cerca de 15 g", contem: "Leite e coco", conservacao: "Temperatura ambiente, até 2 dias" },
  { id: "pistache", categoria: "doces", nome: "Brigadeiro de pistache", preco: 3.2, unidade: "unidade", minimo: 25, passo: 25, desenho: "pistache",
    texto: "Creme de pistache por dentro e pistache picado por fora.",
    tamanho: "Cerca de 15 g", contem: "Leite e castanhas (pistache)", conservacao: "Geladeira, até 3 dias" },
  { id: "brownie", categoria: "doces", nome: "Brownie de chocolate", preco: 8, unidade: "unidade", minimo: 6, passo: 6, desenho: "brownie",
    texto: "Casquinha crocante e miolo úmido. Vendido em caixas de 6.",
    tamanho: "Pedaço de 6 × 6 cm", contem: "Leite, ovos e glúten", conservacao: "Temperatura ambiente, até 4 dias" },
  { id: "cupcake", categoria: "doces", nome: "Cupcake de baunilha", preco: 7.5, unidade: "unidade", minimo: 6, passo: 6, desenho: "cupcake",
    texto: "Massa de baunilha, cobertura de cream cheese e uma framboesa no topo.",
    tamanho: "Forminha nº 0", contem: "Leite, ovos e glúten", conservacao: "Geladeira, até 2 dias" },
  { id: "bolo-cenoura", categoria: "doces", nome: "Bolo de cenoura com cobertura de chocolate", preco: 85, unidade: "bolo", minimo: 1, passo: 1, desenho: "bolo",
    texto: "Massa fofinha e cobertura de chocolate meio amargo que endurece por cima.",
    tamanho: "1,5 kg, cerca de 15 fatias", contem: "Leite, ovos e glúten", conservacao: "Temperatura ambiente, até 3 dias" },

  // SALGADOS
  { id: "coxinha", categoria: "salgados", nome: "Coxinha de frango (mini)", preco: 1.1, unidade: "unidade", minimo: 25, passo: 25, desenho: "coxinha",
    texto: "Frango desfiado e temperado, massa de batata e casquinha crocante.",
    tamanho: "Cerca de 20 g", contem: "Leite e glúten", conservacao: "Consumir no dia; aquecer no forno" },
  { id: "bolinha-queijo", categoria: "salgados", nome: "Bolinha de queijo (mini)", preco: 1.1, unidade: "unidade", minimo: 25, passo: 25, desenho: "bolinha",
    texto: "Massa leve recheada com queijo muçarela que derrete por dentro.",
    tamanho: "Cerca de 20 g", contem: "Leite e glúten", conservacao: "Consumir no dia; aquecer no forno" },
  { id: "kibe", categoria: "salgados", nome: "Kibe (mini)", preco: 1.2, unidade: "unidade", minimo: 25, passo: 25, desenho: "kibe",
    texto: "Carne moída, trigo para kibe e hortelã fresca.",
    tamanho: "Cerca de 20 g", contem: "Glúten", conservacao: "Consumir no dia; aquecer no forno" },
  { id: "esfiha", categoria: "salgados", nome: "Esfiha de carne (mini)", preco: 1.8, unidade: "unidade", minimo: 25, passo: 25, desenho: "esfiha",
    texto: "Massa macia aberta, com carne temperada, tomate e cebola.",
    tamanho: "Cerca de 30 g", contem: "Leite e glúten", conservacao: "Consumir no dia; aquecer no forno" },
  { id: "empada", categoria: "salgados", nome: "Empada de palmito", preco: 2.8, unidade: "unidade", minimo: 12, passo: 12, desenho: "empada",
    texto: "Massa amanteigada que desmancha e recheio cremoso de palmito.",
    tamanho: "Cerca de 35 g", contem: "Leite, ovos e glúten", conservacao: "Geladeira, até 2 dias" },
  { id: "pao-queijo", categoria: "salgados", nome: "Pão de queijo (mini)", preco: 0.9, unidade: "unidade", minimo: 25, passo: 25, desenho: "paodequeijo",
    texto: "Polvilho e queijo meia cura, assado perto da hora da retirada.",
    tamanho: "Cerca de 15 g", contem: "Leite e ovos (sem glúten na receita)", conservacao: "Consumir no dia" },

  // CAIXAS PARA EVENTOS
  { id: "caixa-doce", categoria: "caixas", nome: "Caixa Doce 50", preco: 119, unidade: "caixa", minimo: 1, passo: 1, desenho: "caixa", cores: ["#3B2418", "#F4ECDF"],
    texto: "25 brigadeiros e 25 beijinhos em forminhas, prontos para servir.",
    tamanho: "50 docinhos · serve cerca de 15 pessoas", contem: "Leite e coco", conservacao: "Temperatura ambiente, até 2 dias" },
  { id: "caixa-salgados", categoria: "caixas", nome: "Caixa Salgados 100", preco: 120, unidade: "caixa", minimo: 1, passo: 1, desenho: "caixa", cores: ["#C9782F", "#E3A35C"],
    texto: "25 coxinhas, 25 bolinhas de queijo, 25 kibes e 25 esfihas, todos mini.",
    tamanho: "100 salgados · serve cerca de 12 pessoas", contem: "Leite e glúten", conservacao: "Consumir no dia; aquecer no forno" },
  { id: "caixa-festa", categoria: "caixas", nome: "Caixa Festa 200", preco: 239, unidade: "caixa", minimo: 1, passo: 1, desenho: "caixa", cores: ["#3B2418", "#C9782F"],
    texto: "100 docinhos (brigadeiro, beijinho e pistache) e 100 salgados sortidos, em bandejas separadas.",
    tamanho: "200 itens · serve cerca de 25 pessoas", contem: "Leite, ovos, coco, castanhas e glúten", conservacao: "Salgados no dia; doces até 2 dias" },
];


/* ------------------------------------------------------------------------
   UTILITÁRIOS
   ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const produto = (id) => PRODUTOS.find((p) => p.id === id);
const centavos = (valor) => Math.round(valor * 100);
const moeda = (emCentavos) => Comum.moeda(emCentavos / 100);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
};

function desenho(p) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (p.cores) { svg.style.setProperty("--a", p.cores[0]); svg.style.setProperty("--b", p.cores[1]); }
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", `#i-${p.desenho}`);
  svg.append(use);
  return svg;
}

function regraDeVenda(p) {
  if (p.passo > 1) return `Múltiplos de ${p.passo}`;
  return `Por ${p.unidade}`;
}

function animar(el, classe) {
  if (!el || Comum.reduzirMovimento()) return;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  el.addEventListener("animationend", () => el.classList.remove(classe), { once: true });
}


/* ------------------------------------------------------------------------
   ENCOMENDA (salva neste navegador)  { idDoProduto: quantidade }
   ------------------------------------------------------------------------ */
let encomenda = lerEncomenda();

function lerEncomenda() {
  try {
    const dados = JSON.parse(Comum.armazenamento.ler(CONFIG.chaveEncomenda) || "{}");
    const limpa = {};
    Object.entries(dados || {}).forEach(([id, qtd]) => {
      const p = produto(id);
      if (p && Number.isInteger(qtd) && qtd >= p.minimo && qtd <= CONFIG.maximoPorItem && qtd % p.passo === 0) limpa[id] = qtd;
    });
    return limpa;
  } catch (e) { return {}; }
}

function salvarEncomenda() {
  Comum.armazenamento.salvar(CONFIG.chaveEncomenda, JSON.stringify(encomenda));
}

/* Ajusta um número digitado às regras do produto (mínimo, múltiplos e limite) */
function ajustarQuantidade(p, valor) {
  let n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n <= 0) return { qtd: 0, aviso: "" };
  let aviso = "";
  if (n < p.minimo) {
    n = p.minimo;
    aviso = `O pedido mínimo é ${p.minimo}. Ajustamos para ${p.minimo}.`;
  } else if (n % p.passo !== 0) {
    n = Math.ceil(n / p.passo) * p.passo;
    aviso = `Vendido em múltiplos de ${p.passo}. Ajustamos para ${n}.`;
  }
  if (n > CONFIG.maximoPorItem) {
    n = Math.floor(CONFIG.maximoPorItem / p.passo) * p.passo;
    aviso = `Para mais de ${CONFIG.maximoPorItem}, combine direto pelo WhatsApp. Ajustamos para ${n}.`;
  }
  return { qtd: n, aviso };
}

function definirQuantidade(id, qtd, aviso = "") {
  const antes = encomenda[id] || 0;
  if (qtd > 0) encomenda[id] = qtd;
  else delete encomenda[id];
  salvarEncomenda();
  atualizarTudo(id, aviso);
  if (!antes && qtd) animar($("contador-cabecalho"), "pulo");
}

function somar(id, direcao) {
  const p = produto(id);
  const atual = encomenda[id] || 0;
  let nova;
  if (direcao > 0) nova = atual === 0 ? p.minimo : atual + p.passo;
  else nova = atual - p.passo < p.minimo ? 0 : atual - p.passo;
  if (nova > CONFIG.maximoPorItem) {
    atualizarTudo(id, `Para mais de ${CONFIG.maximoPorItem}, combine direto pelo WhatsApp.`);
    return;
  }
  definirQuantidade(id, nova);
}

function totais() {
  return Object.entries(encomenda).reduce((t, [id, qtd]) => {
    t.produtos += 1;
    t.unidades += qtd;
    t.centavos += centavos(produto(id).preco) * qtd;
    return t;
  }, { produtos: 0, unidades: 0, centavos: 0 });
}


/* ------------------------------------------------------------------------
   SELETOR DE QUANTIDADE (cardápio e janela de detalhes usam o mesmo)
   ------------------------------------------------------------------------ */
function seletor(p, prefixo) {
  const caixa = criar("div", "qtd");
  caixa.setAttribute("role", "group");
  caixa.setAttribute("aria-label", `Quantidade de ${p.nome}`);

  const menos = criar("button", "", "−");
  menos.type = "button";
  menos.dataset.acao = "menos";
  menos.dataset.id = p.id;
  menos.setAttribute("aria-label", `Diminuir ${p.nome}`);

  const campo = document.createElement("input");
  Object.assign(campo, { type: "number", inputMode: "numeric", min: 0, step: p.passo, id: `${prefixo}-${p.id}` });
  campo.dataset.qtdDe = p.id;
  campo.setAttribute("aria-label", `Quantidade de ${p.nome}`);

  const mais = criar("button", "", "+");
  mais.type = "button";
  mais.dataset.acao = "mais";
  mais.dataset.id = p.id;
  mais.setAttribute("aria-label", `Aumentar ${p.nome}`);

  caixa.append(menos, campo, mais);
  return caixa;
}

function prepararSeletores() {
  document.addEventListener("click", (e) => {
    const botao = e.target.closest(".qtd button[data-acao]");
    if (!botao) return;
    somar(botao.dataset.id, botao.dataset.acao === "mais" ? 1 : -1);
  });
  document.addEventListener("change", (e) => {
    const campo = e.target.closest("input[data-qtd-de]");
    if (!campo) return;
    const p = produto(campo.dataset.qtdDe);
    const { qtd, aviso } = ajustarQuantidade(p, campo.value);
    definirQuantidade(p.id, qtd, aviso);
  });
  // Enter no campo aplica o valor sem enviar o formulário
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input[data-qtd-de]")) { e.preventDefault(); e.target.blur(); e.target.focus(); }
  });
}


/* ------------------------------------------------------------------------
   CARDÁPIO
   ------------------------------------------------------------------------ */
function montarCardapio() {
  document.querySelectorAll(".itens").forEach((lista) => {
    const itens = PRODUTOS.filter((p) => p.categoria === lista.dataset.categoria);
    lista.replaceChildren(...itens.map((p) => {
      const li = criar("li", "item");
      li.dataset.item = p.id;

      const arte = criar("div", "item__arte");
      arte.append(desenho(p));

      const topo = criar("div", "item__topo");
      const pontos = criar("span", "item__pontos");
      pontos.setAttribute("aria-hidden", "true");
      topo.append(criar("h3", "item__nome", p.nome), pontos, criar("span", "item__preco", `${moeda(centavos(p.preco))}${p.unidade === "unidade" ? " un." : ""}`));

      const rodape = criar("div", "item__rodape");
      const regra = criar("p", "item__regra", `${regraDeVenda(p)} · mínimo ${p.minimo}`);
      const detalhes = criar("button", "link-botao", "Detalhes");
      detalhes.type = "button";
      detalhes.dataset.detalhes = p.id;
      detalhes.setAttribute("aria-label", `Detalhes de ${p.nome}`);
      regra.append(detalhes);
      rodape.append(regra, seletor(p, "c"));

      const aviso = criar("p", "item__aviso");
      aviso.id = `aviso-${p.id}`;
      aviso.setAttribute("aria-live", "polite");

      li.append(arte, topo, criar("p", "item__texto", p.texto), rodape, aviso);
      return li;
    }));
  });
}

function prepararAbas() {
  const abas = [...document.querySelectorAll('[role="tab"]')];
  const escolher = (aba, focar) => {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute("aria-selected", String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      const painel = $(a.getAttribute("aria-controls"));
      if (painel.hidden === ativa) {
        painel.hidden = !ativa;
        if (ativa) animar(painel, "entrar");
      }
    });
    if (focar) aba.focus();
  };
  abas.forEach((aba, i) => {
    aba.addEventListener("click", () => escolher(aba));
    aba.addEventListener("keydown", (e) => {
      const ir = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
      if (ir === undefined) return;
      e.preventDefault();
      escolher(abas[(ir + abas.length) % abas.length], true);
    });
  });
}


/* ------------------------------------------------------------------------
   DESTAQUES E DETALHES DO PRODUTO
   ------------------------------------------------------------------------ */
function prepararDestaques() {
  document.addEventListener("click", (e) => {
    const adicionar = e.target.closest("[data-adicionar]");
    if (adicionar) {
      const p = produto(adicionar.dataset.adicionar);
      somar(p.id, 1);
      Comum.aviso(`${p.nome}: ${encomenda[p.id]} na encomenda.`);
      return;
    }
    const detalhes = e.target.closest("[data-detalhes]");
    if (detalhes) abrirDetalhes(detalhes.dataset.detalhes);
  });
}

function abrirDetalhes(id) {
  const p = produto(id);
  if (!p) return;
  $("produto-arte").replaceChildren(desenho(p));
  $("produto-categoria").textContent = CATEGORIAS[p.categoria];
  $("produto-nome").textContent = p.nome;
  $("produto-texto").textContent = p.texto;
  $("produto-ficha").replaceChildren(...[
    ["Tamanho", p.tamanho],
    ["Vendido", p.passo > 1 ? `Em múltiplos de ${p.passo} (mínimo ${p.minimo})` : `Por ${p.unidade}`],
    ["Contém", p.contem],
    ["Conservação", p.conservacao],
  ].map(([t, v]) => {
    const div = criar("div");
    div.append(criar("dt", "", t), criar("dd", "", v));
    return div;
  }));
  const preco = $("produto-preco");
  preco.replaceChildren(moeda(centavos(p.preco)), " ", criar("span", "", `por ${p.unidade}`));
  const aviso = criar("p", "item__aviso");
  aviso.id = "aviso-janela";
  aviso.setAttribute("aria-live", "polite");
  $("produto-compra").replaceChildren(seletor(p, "j"), criar("span", "produto__subtotal"), aviso);
  $("janela-produto").dataset.produto = p.id;
  atualizarSeletores(p.id);
  Comum.abrirDialogo($("janela-produto"));
}


/* ------------------------------------------------------------------------
   ATUALIZAÇÃO DA TELA
   ------------------------------------------------------------------------ */
function atualizarSeletores(id, aviso = "") {
  const qtd = encomenda[id] || 0;
  document.querySelectorAll(`input[data-qtd-de="${id}"]`).forEach((campo) => { campo.value = qtd; });
  document.querySelectorAll(`.qtd button[data-id="${id}"][data-acao="menos"]`).forEach((b) => { b.disabled = qtd === 0; });
  const item = document.querySelector(`.item[data-item="${id}"]`);
  if (item) item.classList.toggle("tem-qtd", qtd > 0);
  const avisoItem = $(`aviso-${id}`);
  if (avisoItem) avisoItem.textContent = aviso;
  const janela = $("janela-produto");
  if (janela.dataset.produto === id) {
    $("aviso-janela").textContent = aviso;
    const p = produto(id);
    janela.querySelector(".produto__subtotal").textContent = qtd ? `Subtotal: ${moeda(centavos(p.preco) * qtd)}` : "";
  }
}

function atualizarTudo(id, aviso) {
  if (id) atualizarSeletores(id, aviso);
  desenharComanda();
}

function desenharComanda() {
  const { produtos, unidades, centavos: total } = totais();
  const lista = $("comanda-lista");
  const anteriores = new Set([...lista.children].map((li) => li.dataset.id));

  lista.replaceChildren(...Object.entries(encomenda).map(([id, qtd]) => {
    const p = produto(id);
    const li = criar("li", anteriores.has(id) ? "linha" : "linha entrar");
    li.dataset.id = id;
    const remover = criar("button", "linha__remover", "Remover");
    remover.type = "button";
    remover.setAttribute("aria-label", `Remover ${p.nome} da encomenda`);
    remover.addEventListener("click", () => {
      definirQuantidade(id, 0);
      Comum.aviso(`${p.nome} saiu da encomenda.`);
      (lista.querySelector(".linha__remover") || $("comanda-titulo")).focus();
    });
    li.append(
      criar("span", "linha__nome", p.nome),
      criar("span", "linha__valor", moeda(centavos(p.preco) * qtd)),
      criar("span", "linha__conta", `${qtd} × ${moeda(centavos(p.preco))}`),
      remover,
    );
    return li;
  }));

  const vazia = produtos === 0;
  $("comanda-vazia").hidden = !vazia;
  $("comanda-totais").hidden = vazia;
  $("total-itens").textContent = `${plural(produtos, "produto", "produtos")} · ${plural(unidades, "unidade", "unidades")}`;
  const totalEl = $("total-valor");
  const novoTotal = moeda(total);
  if (totalEl.textContent !== novoTotal) { totalEl.textContent = novoTotal; animar(totalEl, "mudou"); }
  if (!vazia) $("erro-itens").textContent = "";

  $("contador-cabecalho").textContent = produtos;
  document.querySelector(".cabecalho__pedido").setAttribute("aria-label", `Encomenda, ${plural(produtos, "produto", "produtos")}`);
  $("barra-pedido").hidden = vazia;
  document.body.classList.toggle("tem-barra", !vazia);
  $("barra-pedido-itens").textContent = plural(produtos, "produto", "produtos");
  $("barra-pedido-total").textContent = novoTotal;
}


/* ------------------------------------------------------------------------
   DATA DESEJADA
   ------------------------------------------------------------------------ */
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const chaveData = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lerData = (texto) => {
  const [a, m, d] = String(texto).split("-").map(Number);
  return a && m && d ? new Date(a, m - 1, d) : null;
};
const dataBonita = (d) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

function primeiraDataPossivel() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + CONFIG.antecedenciaDias);
  while (!CONFIG.diasDeProducao.includes(d.getDay())) d.setDate(d.getDate() + 1);
  return d;
}

function erroDaData(valor) {
  if (!valor) return "Escolha a data desejada.";
  const escolhida = lerData(valor);
  if (!escolhida || Number.isNaN(escolhida.getTime())) return "Data inválida.";
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() + CONFIG.antecedenciaDias);
  if (escolhida < limite) {
    const primeira = primeiraDataPossivel();
    return `Precisamos de ${CONFIG.antecedenciaDias} dias de antecedência. A primeira data disponível é ${primeira.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}.`;
  }
  if (!CONFIG.diasDeProducao.includes(escolhida.getDay())) {
    return `Não produzimos encomendas para ${DIAS[escolhida.getDay()]}. Escolha de terça a sábado.`;
  }
  return "";
}


/* ------------------------------------------------------------------------
   FORMULÁRIO E ENVIO
   ------------------------------------------------------------------------ */
function prepararFormulario() {
  const form = $("form-encomenda");
  const data = $("f-data");
  data.min = chaveData(primeiraDataPossivel());

  const regras = [
    { campo: data, erro: $("f-data-erro"), testar: () => erroDaData(data.value) },
    { campo: $("f-nome"), erro: $("f-nome-erro"), testar: () => ($("f-nome").value.trim().length >= 2 ? "" : "Escreva seu nome.") },
    { campo: $("f-endereco"), erro: $("f-endereco-erro"), testar: () => (!entregaEscolhida() || $("f-endereco").value.trim().length >= 5 ? "" : "Informe o bairro e o endereço para a entrega.") },
  ];
  const validar = (regra) => {
    const msg = regra.testar();
    regra.erro.textContent = msg;
    regra.campo.setAttribute("aria-invalid", String(!!msg));
    return !msg;
  };
  regras.forEach((regra) => {
    regra.campo.addEventListener("change", () => validar(regra));
    regra.campo.addEventListener("input", () => { if (regra.campo.getAttribute("aria-invalid") === "true") validar(regra); });
  });

  // Entrega: mostra o campo de endereço
  form.querySelectorAll('input[name="entrega"]').forEach((r) => r.addEventListener("change", () => {
    $("campo-endereco").hidden = !entregaEscolhida();
    if (!entregaEscolhida()) validar(regras[2]);
  }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("comanda-status");
    status.classList.remove("is-ok", "is-erro");

    if (!totais().produtos) {
      $("erro-itens").textContent = "Adicione pelo menos um item do cardápio.";
      $("cardapio-titulo").focus();
      $("cardapio").scrollIntoView({ behavior: Comum.reduzirMovimento() ? "auto" : "smooth", block: "start" });
      return;
    }
    const invalidas = regras.filter((r) => !validar(r));
    if (invalidas.length) {
      invalidas[0].campo.focus();
      return;
    }

    const mensagem = montarMensagem();
    if (Comum.whatsappValido(CONFIG.whatsapp)) {
      const link = Comum.linkWhatsapp(CONFIG.whatsapp, mensagem);
      const janela = window.open(link, "_blank");
      status.classList.add("is-ok");
      if (janela) {
        janela.opener = null;
        status.replaceChildren(criar("b", "", "O WhatsApp abriu com o seu pedido."), " Toque em enviar por lá. A encomenda só fica confirmada quando a Ponto responder.");
      } else {
        const a = criar("a", "", "Abrir conversa no WhatsApp");
        Object.assign(a, { href: link, target: "_blank", rel: "noopener" });
        status.replaceChildren("Seu pedido está pronto. ", a, ". A encomenda só fica confirmada quando a Ponto responder.");
      }
    } else {
      $("janela-demo-mensagem").textContent = mensagem;
      Comum.abrirDialogo($("janela-demo"));
    }
  });
}

function entregaEscolhida() {
  return document.querySelector('input[name="entrega"]:checked').value === "entrega";
}

function montarMensagem() {
  const { centavos: total } = totais();
  const linhas = Object.entries(encomenda).map(([id, qtd]) => {
    const p = produto(id);
    return `• ${qtd} × ${p.nome} — ${moeda(centavos(p.preco) * qtd)}`;
  });
  const obs = $("f-obs").value.trim();
  return [
    "Olá, Ponto! Gostaria de solicitar esta encomenda:",
    "",
    ...linhas,
    `Total estimado: ${moeda(total)}`,
    "",
    `Data desejada: ${dataBonita(lerData($("f-data").value))}, período da ${$("f-periodo").value}`,
    entregaEscolhida() ? `Entrega em: ${$("f-endereco").value.trim()}` : "Vou retirar no local.",
    `Nome: ${$("f-nome").value.trim()}`,
    obs ? `Observações: ${obs}` : null,
    "",
    "Fico no aguardo da confirmação.",
  ].filter((l) => l !== null).join("\n");
}


/* ------------------------------------------------------------------------
   BARRA DO CELULAR (some quando a comanda está na tela)
   ------------------------------------------------------------------------ */
function prepararBarra() {
  if (!("IntersectionObserver" in window)) return;
  const barra = $("barra-pedido");
  new IntersectionObserver(([entrada]) => {
    barra.classList.toggle("escondida", entrada.isIntersecting);
  }, { threshold: 0.05 }).observe($("encomenda"));
}


/* ------------------------------------------------------------------------
   COMANDA PRESA NA TELA (computador)
   Se a comanda for mais alta que a tela, ela fica presa pela base, para o
   botão de enviar continuar visível enquanto a pessoa rola o cardápio.
   ------------------------------------------------------------------------ */
function prepararComandaFixa() {
  const comanda = $("encomenda");
  const ajustar = () => {
    const topo = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cabecalho")) || 68) + 20;
    const valor = Math.min(topo, window.innerHeight - comanda.offsetHeight - 20);
    comanda.style.setProperty("--topo-comanda", `${Math.round(valor)}px`);
  };
  if ("ResizeObserver" in window) new ResizeObserver(ajustar).observe(comanda);
  window.addEventListener("resize", ajustar);
  ajustar();
}


/* ------------------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  montarCardapio();
  prepararAbas();
  prepararSeletores();
  prepararDestaques();
  prepararFormulario();
  prepararBarra();
  prepararComandaFixa();
  PRODUTOS.forEach((p) => atualizarSeletores(p.id));
  desenharComanda();
  // Se a encomenda mudar em outra aba, atualiza esta
  window.addEventListener("storage", (e) => {
    if (e.key !== CONFIG.chaveEncomenda) return;
    encomenda = lerEncomenda();
    PRODUTOS.forEach((p) => atualizarSeletores(p.id));
    desenharComanda();
  });
  Comum.carregarFotos(CONFIG.usarFotos, "../../assets/images/");
});
