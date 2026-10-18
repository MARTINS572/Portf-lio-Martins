/* ==========================================================================
   NEXORA STOCK — loja.js
   Guarda os dados e os CADASTROS: produtos, categorias, fornecedores,
   empresa e perfil. As regras de estoque (entradas, saídas, ajustes,
   pedidos, indicadores) ficam em estoque.js.

   DEMONSTRAÇÃO LOCAL: tudo fica no localStorage deste navegador. Não há
   servidor, banco de dados compartilhado, login nem sincronização. Para
   virar um sistema real, carregar() e salvar() precisariam conversar com uma
   API que valide tudo de novo no servidor, dentro de transações.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const CHAVE = "nexora-stock:dados";
  const VERSAO = 1;
  const ouvintes = new Set();
  let dados = null;
  let persistente = true;
  let versao = 0;          // muda a cada alteração (os cálculos usam para saber se precisam refazer)

  /* ---------- Carregar, salvar e restaurar ---------- */
  function carregar() {
    try {
      const texto = localStorage.getItem(CHAVE);
      const lido = texto ? JSON.parse(texto) : null;
      if (lido && lido.versao === VERSAO && Array.isArray(lido.produtos) && Array.isArray(lido.movimentos)) { dados = lido; versao += 1; return; }
    } catch (e) { persistente = false; }
    dados = NX.criarDadosDemo();
    versao += 1;
    gravar();
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); persistente = true; return true; } catch (e) { persistente = false; return false; }
  }
  function salvar(avisar = true) {
    versao += 1;
    if (NX.estoque) NX.estoque.limparAlertasVistos();
    const ok = gravar();
    if (avisar) ouvintes.forEach((fn) => fn());
    return ok;
  }
  function restaurar() {
    dados = NX.criarDadosDemo();
    salvar();
  }
  // Mudanças feitas em outra aba aparecem nesta
  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      if (e.key !== CHAVE || !e.newValue) return;
      try { dados = JSON.parse(e.newValue); versao += 1; ouvintes.forEach((fn) => fn()); } catch (erro) { /* ignora */ }
    });
  }
  function tamanhoSalvo() {
    try { return (localStorage.getItem(CHAVE) || "").length; } catch (e) { return 0; }
  }

  const novoId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  /* ---------- Consultas ---------- */
  const produto = (id) => dados.produtos.find((x) => x.id === id);
  const categoria = (id) => dados.categorias.find((x) => x.id === id);
  const fornecedor = (id) => dados.fornecedores.find((x) => x.id === id);
  const pedido = (id) => dados.pedidos.find((x) => x.id === id);
  const movimento = (id) => dados.movimentos.find((x) => x.id === id);
  const membro = (id) => dados.equipe.find((x) => x.id === id) || { id, nome: "Não informado", cargo: "" };
  const nomeCategoria = (id) => (categoria(id) || { nome: "Sem categoria" }).nome;
  const nomeFornecedor = (id) => (id ? (fornecedor(id) || { nome: "Fornecedor removido" }).nome : "Sem fornecedor");
  const igual = (a, b) => U.semAcento(a).replace(/\s+/g, " ").trim() === U.semAcento(b).replace(/\s+/g, " ").trim();

  /* ---------- Produtos ---------- */
  function validarProduto(v, id) {
    const erros = {};
    const atual = id ? produto(id) : null;
    const nome = String(v.nome || "").trim();
    if (nome.length < 3) erros.nome = "Informe o nome do produto (pelo menos 3 letras).";
    else if (nome.length > 90) erros.nome = "Use no máximo 90 caracteres.";

    const sku = String(v.sku || "").trim().toUpperCase();
    if (!sku) erros.sku = "Informe o código interno (SKU).";
    else if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(sku)) erros.sku = "Use de 3 a 20 letras, números ou hífen (ex.: FER-1020).";
    else {
      const repetido = dados.produtos.find((p) => p.id !== id && p.sku.toUpperCase() === sku);
      if (repetido) erros.sku = `Este código já é usado por "${repetido.nome}"${repetido.status === "arquivado" ? " (arquivado)" : ""}.`;
    }

    const barras = String(v.codigoBarras || "").replace(/\s/g, "");
    if (barras) {
      if (!/^\d+$/.test(barras)) erros.codigoBarras = "O código de barras tem só números.";
      else if (!U.gtinValido(barras)) erros.codigoBarras = "Código de barras inválido: confira os dígitos (8, 12, 13 ou 14 números com dígito verificador).";
      else {
        const repetido = dados.produtos.find((p) => p.id !== id && p.codigoBarras === barras);
        if (repetido) erros.codigoBarras = `Este código de barras já está em "${repetido.nome}".`;
      }
    }

    const cat = categoria(v.categoriaId);
    if (!cat) erros.categoriaId = "Escolha a categoria.";
    else if (cat.status !== "ativa" && !(atual && atual.categoriaId === cat.id)) erros.categoriaId = "Esta categoria está arquivada.";

    const forn = fornecedor(v.fornecedorId);
    if (!forn) erros.fornecedorId = "Escolha o fornecedor principal.";
    else if (forn.status !== "ativo" && !(atual && atual.fornecedorId === forn.id)) erros.fornecedorId = "Este fornecedor está inativo.";

    const custo = U.lerValor(v.custo);
    if (!String(v.custo || "").trim()) erros.custo = "Informe o preço de custo.";
    else if (!Number.isFinite(custo) || custo <= 0) erros.custo = "Digite um valor maior que zero, como 12,90.";
    else if (custo > 1e6) erros.custo = "Valor alto demais para esta demonstração.";
    const preco = U.lerValor(v.preco);
    if (!String(v.preco || "").trim()) erros.preco = "Informe o preço de venda.";
    else if (!Number.isFinite(preco) || preco <= 0) erros.preco = "Digite um valor maior que zero, como 24,90.";
    else if (preco > 1e6) erros.preco = "Valor alto demais para esta demonstração.";

    const minimo = U.lerInteiro(v.minimo);
    if (String(v.minimo ?? "").trim() === "") erros.minimo = "Informe o estoque mínimo (pode ser 0).";
    else if (!Number.isFinite(minimo)) erros.minimo = "Use um número inteiro, sem vírgula.";

    let inicial = 0;
    if (!id) {
      const t = String(v.quantidadeInicial ?? "").trim();
      inicial = t === "" ? 0 : U.lerInteiro(t);
      if (!Number.isFinite(inicial)) erros.quantidadeInicial = "Use um número inteiro, sem vírgula (pode ser 0).";
    }

    const local = String(v.localizacao || "").trim();
    if (!local) erros.localizacao = "Informe onde o produto fica (corredor, prateleira ou depósito).";
    else if (local.length > 60) erros.localizacao = "Use no máximo 60 caracteres.";
    if (String(v.descricao || "").length > 500) erros.descricao = "Use no máximo 500 caracteres.";

    return { erros, limpo: { nome, sku, codigoBarras: barras, categoriaId: v.categoriaId, fornecedorId: v.fornecedorId, custo: U.arredondar(custo), preco: U.arredondar(preco), minimo, localizacao: local, descricao: String(v.descricao || "").trim() }, inicial };
  }

  function salvarProduto(v, id) {
    const { erros, limpo, inicial } = validarProduto(v, id);
    if (Object.keys(erros).length) return { ok: false, erros };
    if (id) {
      const p = produto(id);
      if (!p) return { ok: false, erro: "Produto não encontrado." };
      Object.assign(p, limpo);
      if (v.imagem !== undefined) p.imagem = v.imagem;
      salvar();
      return { ok: true, id };
    }
    const novo = { id: novoId("p"), ...limpo, criadoEm: U.hoje(), status: "ativo", imagem: v.imagem || null };
    dados.produtos.push(novo);
    if (inicial > 0) {
      NX.estoque.lancar({
        produtoId: novo.id, tipo: "entrada", quantidade: inicial, data: U.agora(), custoUnitario: novo.custo, fornecedorId: null,
        motivo: "Saldo inicial do cadastro", documento: "", observacao: "", responsavelId: v.responsavelId || dados.perfil.id, origem: "cadastro",
      });
    }
    salvar();
    return { ok: true, id: novo.id };
  }

  function arquivarProdutos(ids) {
    let feitos = 0;
    ids.forEach((pid) => {
      const p = produto(pid);
      if (!p || p.status === "arquivado") return;
      p.status = "arquivado";
      p.arquivadoEm = U.agora();
      feitos += 1;
    });
    if (feitos) salvar();
    return { ok: true, feitos };
  }
  function reativarProdutos(ids) {
    let feitos = 0;
    const bloqueados = [];
    ids.forEach((pid) => {
      const p = produto(pid);
      if (!p || p.status === "ativo") return;
      const cat = categoria(p.categoriaId);
      if (cat && cat.status !== "ativa") { bloqueados.push(p); return; }
      p.status = "ativo";
      delete p.arquivadoEm;
      feitos += 1;
    });
    if (feitos) salvar();
    return { ok: bloqueados.length === 0, feitos, bloqueados, erro: bloqueados.length ? `${U.plural(bloqueados.length, "produto continua arquivado", "produtos continuam arquivados")} porque a categoria está arquivada. Reative a categoria ou mude o produto de categoria.` : "" };
  }

  /* ---------- Categorias ---------- */
  function salvarCategoria(v, id) {
    const erros = {};
    const nome = String(v.nome || "").trim();
    const codigo = String(v.codigo || "").trim().toUpperCase();
    if (nome.length < 3) erros.nome = "Informe o nome da categoria (pelo menos 3 letras).";
    else if (nome.length > 40) erros.nome = "Use no máximo 40 caracteres.";
    else if (dados.categorias.some((c) => c.id !== id && igual(c.nome, nome))) erros.nome = "Já existe uma categoria com este nome.";
    if (!codigo) erros.codigo = "Informe o identificador.";
    else if (!/^[A-Z]{2,5}$/.test(codigo)) erros.codigo = "Use de 2 a 5 letras, sem acento (ex.: FER).";
    else if (dados.categorias.some((c) => c.id !== id && c.codigo === codigo)) erros.codigo = "Este identificador já é usado por outra categoria.";
    if (String(v.descricao || "").length > 200) erros.descricao = "Use no máximo 200 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros };
    if (id) {
      Object.assign(categoria(id), { nome, codigo, descricao: String(v.descricao || "").trim() });
      salvar();
      return { ok: true, id };
    }
    const nova = { id: novoId("c"), nome, codigo, descricao: String(v.descricao || "").trim(), status: "ativa", criadaEm: U.hoje() };
    dados.categorias.push(nova);
    salvar();
    return { ok: true, id: nova.id };
  }
  const produtosDaCategoria = (id, { ativos } = {}) => dados.produtos.filter((p) => p.categoriaId === id && (!ativos || p.status === "ativo"));

  // acao: "mover" (com destinoId) ou "manter". Sem ação, avisa quantos produtos estão ligados.
  function arquivarCategoria(id, { acao, destinoId } = {}) {
    const c = categoria(id);
    if (!c) return { ok: false, erro: "Categoria não encontrada." };
    if (c.status === "arquivada") return { ok: false, erro: "A categoria já está arquivada." };
    const ligados = produtosDaCategoria(id);
    if (ligados.length && !acao) return { ok: false, precisaAcao: true, quantidade: ligados.length, ativos: ligados.filter((p) => p.status === "ativo").length };
    if (acao === "mover") {
      const destino = categoria(destinoId);
      if (!destino || destino.id === id) return { ok: false, erros: { destinoId: "Escolha outra categoria para receber os produtos." } };
      if (destino.status !== "ativa") return { ok: false, erros: { destinoId: "A categoria de destino está arquivada." } };
      ligados.forEach((p) => { p.categoriaId = destino.id; });
    }
    c.status = "arquivada";
    c.arquivadaEm = U.agora();
    salvar();
    return { ok: true, movidos: acao === "mover" ? ligados.length : 0 };
  }
  function reativarCategoria(id) {
    const c = categoria(id);
    if (!c || c.status === "ativa") return { ok: false, erro: "A categoria já está ativa." };
    c.status = "ativa";
    delete c.arquivadaEm;
    salvar();
    return { ok: true };
  }

  /* ---------- Fornecedores ---------- */
  function salvarFornecedor(v, id) {
    const erros = {};
    const nome = String(v.nome || "").trim();
    if (nome.length < 3) erros.nome = "Informe o nome ou a razão social (pelo menos 3 letras).";
    else if (nome.length > 90) erros.nome = "Use no máximo 90 caracteres.";
    else if (dados.fornecedores.some((f) => f.id !== id && igual(f.nome, nome))) erros.nome = "Já existe um fornecedor com este nome.";
    const contato = String(v.contato || "").trim();
    if (contato.length < 3) erros.contato = "Informe o nome da pessoa de contato.";
    const cnpj = String(v.cnpj || "").replace(/\D/g, "");
    if (cnpj) {
      if (!U.cnpjValido(cnpj)) erros.cnpj = "CNPJ inválido: confira os 14 números (o campo é opcional).";
      else if (dados.fornecedores.some((f) => f.id !== id && f.cnpj && f.cnpj.replace(/\D/g, "") === cnpj)) erros.cnpj = "Este CNPJ já está em outro fornecedor.";
    }
    if (!U.telefoneValido(v.telefone)) erros.telefone = "Informe o telefone com DDD, como (11) 91234-5678.";
    const email = String(v.email || "").trim().toLowerCase();
    if (!U.emailValido(email)) erros.email = "Digite um e-mail válido, como compras@empresa.com.br.";
    let prazo = null;
    if (String(v.prazoEntrega ?? "").trim() !== "") {
      prazo = U.lerInteiro(v.prazoEntrega);
      if (!Number.isFinite(prazo) || prazo > 120) erros.prazoEntrega = "Use um número de dias entre 0 e 120.";
    }
    if (String(v.endereco || "").length > 120) erros.endereco = "Use no máximo 120 caracteres.";
    if (String(v.observacoes || "").length > 500) erros.observacoes = "Use no máximo 500 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, contato, cnpj: cnpj ? U.mascaraCnpj(cnpj) : "", telefone: U.mascaraTelefone(v.telefone), email, endereco: String(v.endereco || "").trim(), observacoes: String(v.observacoes || "").trim(), prazoEntrega: prazo };
    if (id) {
      Object.assign(fornecedor(id), limpo);
      salvar();
      return { ok: true, id };
    }
    const novo = { id: novoId("f"), ...limpo, status: "ativo", criadoEm: U.hoje() };
    dados.fornecedores.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarFornecedor(id) {
    const f = fornecedor(id);
    if (!f) return { ok: false, erro: "Fornecedor não encontrado." };
    f.status = f.status === "ativo" ? "inativo" : "ativo";
    salvar();
    return { ok: true, status: f.status };
  }

  /* ---------- Empresa e perfil (demonstração) ---------- */
  function salvarConfiguracoes(v) {
    const erros = {};
    const empresa = String(v.empresa || "").trim();
    const nome = String(v.nome || "").trim();
    if (empresa.length < 2) erros.empresa = "Informe o nome da empresa.";
    else if (empresa.length > 50) erros.empresa = "Use no máximo 50 caracteres.";
    if (nome.length < 3) erros.nome = "Informe seu nome.";
    const email = String(v.email || "").trim();
    if (email && !U.emailValido(email)) erros.email = "Digite um e-mail válido ou deixe em branco.";
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.empresa = empresa;
    dados.perfil = { ...dados.perfil, nome, cargo: String(v.cargo || "").trim(), email };
    const eu = dados.equipe.find((u) => u.id === dados.perfil.id);
    if (eu) { eu.nome = nome; eu.cargo = dados.perfil.cargo; }
    salvar();
    return { ok: true };
  }

  NX.loja = {
    carregar, salvar, restaurar, tamanhoSalvo, novoId,
    aoMudar: (fn) => ouvintes.add(fn),
    get dados() { return dados; },
    get persistente() { return persistente; },
    versao: () => versao,
    produto, categoria, fornecedor, pedido, movimento, membro, nomeCategoria, nomeFornecedor,
    validarProduto, salvarProduto, arquivarProdutos, reativarProdutos,
    salvarCategoria, arquivarCategoria, reativarCategoria, produtosDaCategoria,
    salvarFornecedor, alternarFornecedor,
    salvarConfiguracoes,
  };
})();
