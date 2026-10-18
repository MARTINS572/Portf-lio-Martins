/* ==========================================================================
   NEXORA STOCK — formularios.js
   Janelas de cadastro e de movimentação: produto (com foto opcional),
   categoria, fornecedor, entrada, saída, ajuste de inventário, estorno e
   detalhes de uma movimentação. Toda regra é conferida em estoque.js/loja.js;
   aqui só montamos os campos e mostramos os erros ao lado de cada um.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
  const { el, icone, $ } = U;
  const C = () => NX.componentes;

  /* ---------- Opções de listas ---------- */
  const opcoesProdutos = (incluir) => L.dados.categorias.flatMap((c) => L.dados.produtos
    .filter((p) => p.categoriaId === c.id && (p.status === "ativo" || p.id === incluir))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => ({ valor: p.id, rotulo: `${p.nome} · ${p.sku}`, grupo: c.nome })));
  const opcoesCategorias = (incluir) => L.dados.categorias.filter((c) => c.status === "ativa" || c.id === incluir).map((c) => ({ valor: c.id, rotulo: c.status === "ativa" ? c.nome : `${c.nome} (arquivada)` }));
  const opcoesFornecedores = (incluir) => L.dados.fornecedores.filter((f) => f.status === "ativo" || f.id === incluir).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((f) => ({ valor: f.id, rotulo: f.status === "ativo" ? f.nome : `${f.nome} (inativo)` }));
  const opcoesEquipe = () => L.dados.equipe.map((u) => ({ valor: u.id, rotulo: `${u.nome} · ${u.cargo}` }));
  const valorDinheiro = (v) => (v == null || v === "" ? "" : U.decimal(v));

  /* ---------- Produto ---------- */
  function sugerirSku(categoriaId) {
    const cat = L.categoria(categoriaId);
    if (!cat) return "";
    const numeros = L.dados.produtos.map((p) => p.sku.match(new RegExp(`^${cat.codigo}-(\\d+)$`))).filter(Boolean).map((m) => Number(m[1]));
    let n = (numeros.length ? Math.max(...numeros) : 1000) + 10;
    while (L.dados.produtos.some((p) => p.sku === `${cat.codigo}-${n}`)) n += 1;
    return `${cat.codigo}-${n}`;
  }

  // Foto opcional: reduzida no próprio navegador (até 320 px) para caber no armazenamento local
  function campoImagem(inicial) {
    let imagem = inicial || null;
    let processando = false;
    const previa = el("span", { class: "miniatura" });
    const entrada = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", id: "f-imagem", "aria-describedby": "f-imagem-status" });
    const status = el("span", { id: "f-imagem-status", "aria-live": "polite" });
    const remover = el("button", { class: "btn btn--fantasma btn--pequeno", type: "button", texto: "Remover foto" });
    const escolher = el("label", { class: "btn btn--linha btn--pequeno", for: "f-imagem", tabindex: "0", role: "button" }, icone("image-plus", 15), "Escolher foto");
    escolher.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); entrada.click(); } });
    const caixa = el("div", { class: "imagem-campo" }, previa,
      el("div", { class: "imagem-campo__texto" },
        el("b", { texto: "Foto do produto (opcional)" }),
        status,
        el("div", { class: "imagem-campo__botoes" }, escolher, remover)),
      entrada);
    const desenhar = () => {
      previa.replaceChildren(imagem ? el("img", { src: imagem, alt: "Prévia da foto" }) : icone("image", 26));
      remover.hidden = !imagem;
      if (!processando) status.textContent = imagem ? "Foto pronta. Ela é salva só neste navegador." : "JPG, PNG ou WebP de até 8 MB. A foto é reduzida antes de salvar.";
    };
    remover.addEventListener("click", () => { imagem = null; entrada.value = ""; desenhar(); });
    entrada.addEventListener("change", () => {
      const arq = entrada.files && entrada.files[0];
      if (!arq) return;
      if (!/^image\/(png|jpeg|webp)$/.test(arq.type)) { status.textContent = "Formato não aceito. Use JPG, PNG ou WebP."; entrada.value = ""; return; }
      if (arq.size > 8 * 1024 * 1024) { status.textContent = "Arquivo maior que 8 MB. Escolha uma foto menor."; entrada.value = ""; return; }
      processando = true;
      caixa.classList.add("is-processando");
      status.textContent = "Processando a foto…";
      $("#form-salvar").disabled = true;
      const leitor = new FileReader();
      const terminar = (msg) => { processando = false; caixa.classList.remove("is-processando"); $("#form-salvar").disabled = false; desenhar(); if (msg) status.textContent = msg; };
      leitor.onerror = () => terminar("Não foi possível ler o arquivo.");
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => terminar("Não foi possível abrir a imagem.");
        img.onload = () => {
          const lado = 320;
          const escala = Math.min(1, lado / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          imagem = canvas.toDataURL("image/jpeg", 0.82);
          terminar();
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arq);
    });
    desenhar();
    return { caixa, valor: () => imagem, ocupado: () => processando };
  }

  function dicaMargem(custo, preco) {
    const c = U.lerValor(custo);
    const p = U.lerValor(preco);
    if (!Number.isFinite(c) || !Number.isFinite(p) || c <= 0 || p <= 0) return "";
    const margem = (p - c) / p;
    return el("span", { class: `dica-margem${p < c ? " negativa" : ""}`, texto: p < c ? `Atenção: preço de venda abaixo do custo (${U.moeda(p - c)} por unidade).` : `Margem sobre o preço: ${U.percentual(margem)} (${U.moeda(p - c)} por unidade).` });
  }

  function formProduto({ id } = {}) {
    const p = id ? L.produto(id) : null;
    const imagem = campoImagem(p ? p.imagem : null);
    const campos = [
      { nome: "nome", rotulo: "Nome do produto", obrigatorio: true, valor: p?.nome, largura: "inteira", max: 90, placeholder: "Ex.: Furadeira de impacto 650 W" },
      { nome: "categoriaId", rotulo: "Categoria", tipo: "select", obrigatorio: true, vazio: "Escolha…", opcoes: opcoesCategorias(p?.categoriaId), valor: p?.categoriaId,
        aoMudar: (v, form) => { if (!p && !form.elements.sku.dataset.digitado) form.elements.sku.value = sugerirSku(v); } },
      { nome: "sku", rotulo: "Código interno (SKU)", obrigatorio: true, valor: p?.sku, max: 20, maiusculas: true, placeholder: "Ex.: FER-1090", ajuda: p ? "" : "Sugerido pela categoria. Não pode se repetir." },
      { nome: "codigoBarras", rotulo: "Código de barras", tipo: "inteiro", valor: p?.codigoBarras, max: 14, placeholder: "8, 12, 13 ou 14 números" },
      { nome: "fornecedorId", rotulo: "Fornecedor principal", tipo: "select", obrigatorio: true, vazio: "Escolha…", opcoes: opcoesFornecedores(p?.fornecedorId), valor: p?.fornecedorId },
      { nome: "custo", rotulo: "Preço de custo (R$)", tipo: "dinheiro", obrigatorio: true, valor: valorDinheiro(p?.custo), placeholder: "0,00",
        aoMudar: (v, form) => resultado.ajuda("preco", dicaMargem(v, form.elements.preco.value)) },
      { nome: "preco", rotulo: "Preço de venda (R$)", tipo: "dinheiro", obrigatorio: true, valor: valorDinheiro(p?.preco), placeholder: "0,00",
        aoMudar: (v, form) => resultado.ajuda("preco", dicaMargem(form.elements.custo.value, v)) },
      p ? { nome: "saldoAtual", rotulo: "Quantidade disponível", somenteLeitura: true, valor: U.unidades(E.saldo(p.id)), ajuda: "Para mudar, registre uma entrada, saída ou ajuste." }
        : { nome: "quantidadeInicial", rotulo: "Quantidade inicial", tipo: "inteiro", valor: "0", ajuda: "Vira uma entrada \"Saldo inicial do cadastro\" no histórico." },
      { nome: "minimo", rotulo: "Estoque mínimo", tipo: "inteiro", obrigatorio: true, valor: p ? String(p.minimo) : "", placeholder: "Ex.: 5", ajuda: "Com o saldo igual ou abaixo disso, o produto entra em reposição." },
      { nome: "localizacao", rotulo: "Localização física", obrigatorio: true, valor: p?.localizacao, max: 60, placeholder: "Ex.: Corredor A · Prateleira 2" },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea", valor: p?.descricao, largura: "inteira", linhas: 2, max: 500 },
    ];
    const resultado = U.formulario({
      titulo: p ? "Editar produto" : "Adicionar produto",
      descricao: p ? el("span", {}, "Código ", el("b", { class: "mono", texto: p.sku }), ` · cadastrado em ${U.dataCompleta(p.criadoEm)}`) : null,
      campos, extra: imagem.caixa, largura: "larga",
      rotuloSalvar: p ? "Salvar alterações" : "Cadastrar produto",
      aoSalvar: (v) => {
        if (imagem.ocupado()) return { ok: false, erro: "Espere a foto terminar de processar." };
        const r = L.salvarProduto({ ...v, imagem: imagem.valor(), responsavelId: L.dados.perfil.id }, id);
        if (r.ok) {
          if (!L.persistente) U.aviso("Salvo nesta aba, mas o navegador não deixou gravar (armazenamento cheio ou bloqueado).", "erro");
          else U.aviso(p ? "Produto atualizado." : "Produto cadastrado.");
          if (!p) NX.ir(`produtos/${r.id}`);
        }
        return r;
      },
    });
    const sku = resultado.form.elements.sku;
    sku.addEventListener("input", () => { sku.dataset.digitado = sku.value ? "1" : ""; });
    if (p) resultado.ajuda("preco", dicaMargem(p.custo, p.preco));
  }

  async function arquivarProduto(id) {
    const p = L.produto(id);
    const s = E.saldo(id);
    const pcs = E.pedidosComProduto(id);
    const ok = await U.confirmar({
      titulo: `Arquivar ${p.nome}?`,
      texto: `O produto sai das listas de reposição e dos alertas, e não aceita novas movimentações. O histórico continua guardado.${s > 0 ? ` O saldo de ${U.unidades(s)} continua contando no estoque.` : ""}${pcs.length ? ` Atenção: ele está em ${pcs.map((x) => x.numero).join(", ")}.` : ""}`,
      rotulo: "Arquivar",
    });
    if (!ok) return;
    L.arquivarProdutos([id]);
    U.aviso("Produto arquivado. Você pode reativá-lo quando quiser.");
  }
  function reativarProduto(id) {
    const r = L.reativarProdutos([id]);
    if (r.feitos) U.aviso("Produto reativado.");
    else U.aviso(r.erro || "Não foi possível reativar.", "erro");
  }

  /* ---------- Categoria ---------- */
  function formCategoria({ id } = {}) {
    const c = id ? L.categoria(id) : null;
    U.formulario({
      titulo: c ? "Editar categoria" : "Nova categoria",
      campos: [
        { nome: "nome", rotulo: "Nome", obrigatorio: true, valor: c?.nome, max: 40, placeholder: "Ex.: Iluminação",
          aoMudar: (v, form) => { if (!c && !form.elements.codigo.dataset.digitado) form.elements.codigo.value = U.semAcento(v).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase(); } },
        { nome: "codigo", rotulo: "Identificador", obrigatorio: true, valor: c?.codigo, max: 5, maiusculas: true, placeholder: "Ex.: ILU", ajuda: "De 2 a 5 letras. Usado no começo do código dos produtos." },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", valor: c?.descricao, largura: "inteira", linhas: 2, max: 200 },
      ],
      rotuloSalvar: c ? "Salvar alterações" : "Criar categoria",
      aoSalvar: (v) => {
        const r = L.salvarCategoria(v, id);
        if (r.ok) U.aviso(c ? "Categoria atualizada." : "Categoria criada.");
        return r;
      },
    });
    const cod = $("#f-codigo");
    cod.addEventListener("input", () => { cod.dataset.digitado = cod.value ? "1" : ""; });
  }

  async function arquivarCategoria(id) {
    const c = L.categoria(id);
    const r = L.arquivarCategoria(id);
    if (r.ok) { U.aviso(`Categoria "${c.nome}" arquivada.`); return; }
    if (!r.precisaAcao) { U.aviso(r.erro || "Não foi possível arquivar.", "erro"); return; }
    const destinos = L.dados.categorias.filter((x) => x.status === "ativa" && x.id !== id).map((x) => ({ valor: x.id, rotulo: x.nome }));
    const res = U.formulario({
      titulo: `Arquivar "${c.nome}"`,
      descricao: el("span", {}, `Esta categoria tem ${U.plural(r.quantidade, "produto ligado", "produtos ligados")} (${U.plural(r.ativos, "ativo", "ativos")}). Nenhum produto será excluído: escolha o que fazer com eles antes de continuar.`),
      campos: [
        { nome: "acao", rotulo: "O que fazer com os produtos?", tipo: "select", obrigatorio: true, largura: "inteira", valor: destinos.length ? "mover" : "manter",
          opcoes: [{ valor: "mover", rotulo: "Mover para outra categoria", desativado: !destinos.length }, { valor: "manter", rotulo: "Manter nesta categoria arquivada" }],
          aoMudar: (v) => { $('[data-campo="destinoId"]').hidden = v !== "mover"; } },
        { nome: "destinoId", rotulo: "Mover para", tipo: "select", vazio: "Escolha…", opcoes: destinos, largura: "inteira" },
      ],
      rotuloSalvar: "Arquivar categoria",
      aoSalvar: (v) => {
        if (v.acao === "mover" && !v.destinoId) return { ok: false, erros: { destinoId: "Escolha a categoria que vai receber os produtos." } };
        const r2 = L.arquivarCategoria(id, { acao: v.acao, destinoId: v.destinoId });
        if (r2.ok) U.aviso(v.acao === "mover" ? `${U.plural(r2.movidos, "produto movido", "produtos movidos")} e categoria arquivada.` : "Categoria arquivada. Os produtos continuam ligados a ela.");
        return r2;
      },
    });
    $('[data-campo="destinoId"]', res.dlg).hidden = !destinos.length;
  }

  /* ---------- Fornecedor ---------- */
  function formFornecedor({ id } = {}) {
    const f = id ? L.fornecedor(id) : null;
    U.formulario({
      titulo: f ? "Editar fornecedor" : "Novo fornecedor",
      campos: [
        { nome: "nome", rotulo: "Nome ou razão social", obrigatorio: true, valor: f?.nome, largura: "inteira", max: 90 },
        { nome: "contato", rotulo: "Nome do contato", obrigatorio: true, valor: f?.contato, max: 60 },
        { nome: "cnpj", rotulo: "CNPJ", valor: f?.cnpj, mascara: "cnpj", max: 18, placeholder: "00.000.000/0000-00", ajuda: "Opcional. Se preenchido, os dígitos são conferidos." },
        { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, valor: f?.telefone, max: 16, placeholder: "(11) 91234-5678" },
        { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true, valor: f?.email, max: 90, placeholder: "compras@empresa.com.br" },
        { nome: "prazoEntrega", rotulo: "Prazo de entrega (dias)", tipo: "inteiro", valor: f?.prazoEntrega ?? "", max: 3, ajuda: "Usado para sugerir a previsão nos pedidos." },
        { nome: "endereco", rotulo: "Endereço", valor: f?.endereco, max: 120 },
        { nome: "observacoes", rotulo: "Observações", tipo: "textarea", valor: f?.observacoes, largura: "inteira", linhas: 2, max: 500 },
      ],
      rotuloSalvar: f ? "Salvar alterações" : "Cadastrar fornecedor",
      aoSalvar: (v) => {
        const r = L.salvarFornecedor(v, id);
        if (r.ok) { U.aviso(f ? "Fornecedor atualizado." : "Fornecedor cadastrado."); if (!f) NX.ir(`fornecedores/${r.id}`); }
        return r;
      },
    });
  }
  async function alternarFornecedor(id) {
    const f = L.fornecedor(id);
    if (f.status === "ativo") {
      const abertos = L.dados.pedidos.filter((pc) => pc.fornecedorId === id && E.pedidoAberto(pc)).length;
      const ok = await U.confirmar({ titulo: `Inativar ${f.nome}?`, texto: `Fornecedores inativos não aparecem em novos pedidos nem em novas entradas. O histórico continua.${abertos ? ` Há ${U.plural(abertos, "pedido em aberto", "pedidos em aberto")} com ele, que continuam valendo.` : ""}`, rotulo: "Inativar" });
      if (!ok) return;
    }
    const r = L.alternarFornecedor(id);
    U.aviso(r.status === "ativo" ? "Fornecedor reativado." : "Fornecedor inativado.");
  }

  /* ---------- Movimentações ---------- */
  const campoResponsavel = () => ({ nome: "responsavelId", rotulo: "Responsável", tipo: "select", obrigatorio: true, opcoes: opcoesEquipe(), valor: L.dados.perfil.id, ajuda: "Sem login nesta demonstração: escolha quem está registrando." });
  const campoData = () => ({ nome: "data", rotulo: "Data e hora", tipo: "datetime-local", obrigatorio: true, valor: U.agora(), max: U.agora() });
  function textoSaldo(pid) {
    const p = L.produto(pid);
    if (!p) return "";
    const s = E.saldo(pid);
    return el("span", {}, "Saldo atual: ", el("b", { texto: U.unidades(s) }), ` · mínimo ${U.numero(p.minimo)} · ${p.localizacao}`);
  }
  const depoisDeRegistrar = (r, texto) => {
    if (!r.ok) { if (r.erro) U.aviso(r.erro, "erro"); return; }
    const p = L.produto(r.movimento.produtoId);
    U.aviso(`${texto} ${p.nome}: saldo agora ${U.unidades(r.movimento.saldoApos)}`);
  };

  function formEntrada({ produtoId } = {}) {
    const p = produtoId ? L.produto(produtoId) : null;
    const fornPadrao = (prod) => (prod && L.fornecedor(prod.fornecedorId)?.status === "ativo" ? prod.fornecedorId : "");
    const res = U.formulario({
      titulo: "Registrar entrada",
      descricao: "Mercadoria que chegou sem pedido de compra (para pedidos, use \"Registrar recebimento\" no pedido).",
      campos: [
        { nome: "produtoId", rotulo: "Produto", tipo: "select", obrigatorio: true, largura: "inteira", vazio: "Escolha o produto…", opcoes: opcoesProdutos(), valor: produtoId, ajuda: p ? textoSaldo(p.id) : "",
          aoMudar: (v, form) => {
            const prod = L.produto(v);
            res.ajuda("produtoId", prod ? textoSaldo(v) : "");
            form.elements.custoUnitario.placeholder = prod ? U.decimal(prod.custo) : "0,00";
            res.ajuda("custoUnitario", prod ? `Em branco, usa o custo cadastrado (${U.moeda(prod.custo)}).` : "");
            form.elements.fornecedorId.value = fornPadrao(prod);
          } },
        { nome: "quantidade", rotulo: "Quantidade", tipo: "inteiro", obrigatorio: true, placeholder: "Ex.: 12" },
        { nome: "custoUnitario", rotulo: "Custo unitário (R$)", tipo: "dinheiro", placeholder: p ? U.decimal(p.custo) : "0,00", ajuda: p ? `Em branco, usa o custo cadastrado (${U.moeda(p.custo)}).` : "" },
        { nome: "fornecedorId", rotulo: "Fornecedor", tipo: "select", vazio: "Sem fornecedor (devolução ou outra origem)", opcoes: opcoesFornecedores(), valor: fornPadrao(p) },
        { nome: "documento", rotulo: "Documento de referência", max: 40, placeholder: "Ex.: NF 12345" },
        campoData(),
        campoResponsavel(),
        { nome: "observacao", rotulo: "Observação", tipo: "textarea", largura: "inteira", linhas: 2, max: 300, ajuda: "Obrigatória quando não há fornecedor." },
        { nome: "atualizarCusto", rotulo: "Atualizar o preço de custo do produto com este valor", tipo: "checkbox", largura: "inteira" },
      ],
      rotuloSalvar: "Registrar entrada",
      aoSalvar: (v) => { const r = E.registrarEntrada(v); depoisDeRegistrar(r, "Entrada registrada."); return r; },
    });
  }

  function formSaida({ produtoId } = {}) {
    const p = produtoId ? L.produto(produtoId) : null;
    const res = U.formulario({
      titulo: "Registrar saída",
      descricao: "A saída não pode ser maior que o saldo disponível.",
      campos: [
        { nome: "produtoId", rotulo: "Produto", tipo: "select", obrigatorio: true, largura: "inteira", vazio: "Escolha o produto…", opcoes: opcoesProdutos(), valor: produtoId, ajuda: p ? textoSaldo(p.id) : "",
          aoMudar: (v) => res.ajuda("produtoId", L.produto(v) ? textoSaldo(v) : "") },
        { nome: "quantidade", rotulo: "Quantidade", tipo: "inteiro", obrigatorio: true, placeholder: "Ex.: 2" },
        { nome: "motivo", rotulo: "Motivo da saída", tipo: "select", obrigatorio: true, opcoes: NX.MOTIVOS_SAIDA, valor: "Venda",
          aoMudar: (v) => res.ajuda("observacao", v === "Venda" ? "" : "Obrigatória para este motivo: explique o que aconteceu.") },
        { nome: "documento", rotulo: "Documento de referência", max: 40, placeholder: "Ex.: Cupom 4512" },
        campoData(),
        campoResponsavel(),
        { nome: "observacao", rotulo: "Observação", tipo: "textarea", largura: "inteira", linhas: 2, max: 300 },
      ],
      rotuloSalvar: "Registrar saída",
      aoSalvar: (v) => { const r = E.registrarSaida(v); depoisDeRegistrar(r, "Saída registrada."); return r; },
    });
  }

  function formAjuste({ produtoId } = {}) {
    const p = produtoId ? L.produto(produtoId) : null;
    const res = U.formulario({
      titulo: "Ajuste de inventário",
      descricao: "Use quando a contagem física não bate com o sistema. A diferença fica registrada com motivo e observação; o histórico anterior não é alterado.",
      campos: [
        { nome: "produtoId", rotulo: "Produto", tipo: "select", obrigatorio: true, largura: "inteira", vazio: "Escolha o produto…", opcoes: opcoesProdutos(), valor: produtoId,
          aoMudar: (v, form) => { form.elements.saldoAtual.value = L.produto(v) ? U.unidades(E.saldo(v)) : ""; calcular(form); } },
        { nome: "saldoAtual", rotulo: "Saldo no sistema", somenteLeitura: true, valor: p ? U.unidades(E.saldo(p.id)) : "" },
        { nome: "contada", rotulo: "Quantidade contada", tipo: "inteiro", obrigatorio: true, placeholder: "Ex.: 18", aoMudar: (v, form) => calcular(form) },
        { nome: "motivo", rotulo: "Motivo", tipo: "select", obrigatorio: true, opcoes: NX.MOTIVOS_AJUSTE, valor: "Contagem de inventário" },
        { nome: "documento", rotulo: "Documento de referência", max: 40, placeholder: "Ex.: Inventário 10/2026" },
        campoData(),
        campoResponsavel(),
        { nome: "observacao", rotulo: "Observação", tipo: "textarea", obrigatorio: true, largura: "inteira", linhas: 2, max: 300, placeholder: "Ex.: Contagem do corredor B; 2 unidades encontradas avariadas." },
      ],
      rotuloSalvar: "Registrar ajuste",
      aoSalvar: (v) => { const r = E.registrarAjuste(v); depoisDeRegistrar(r, "Ajuste registrado."); return r; },
    });
    function calcular(form) {
      const pid = form.elements.produtoId.value;
      const q = U.lerInteiro(form.elements.contada.value);
      if (!L.produto(pid) || !Number.isFinite(q)) { res.ajuda("contada", ""); return; }
      const dif = q - E.saldo(pid);
      res.ajuda("contada", dif === 0 ? "Igual ao sistema: não há o que ajustar." : el("span", {}, "Diferença: ", el("b", { class: dif > 0 ? "positivo" : "negativo", texto: `${U.comSinal(dif)} un.` })));
    }
  }

  function formEstorno(movId) {
    const m = L.movimento(movId);
    const pode = E.podeEstornar(m);
    if (!pode.pode) { U.aviso(pode.motivo, "erro"); return; }
    const p = L.produto(m.produtoId);
    U.formulario({
      titulo: `Estornar movimentação nº ${m.numero}`,
      descricao: el("span", {}, `Será lançada uma ${m.tipo === "entrada" ? "saída" : "entrada"} de `, el("b", { texto: U.unidades(Math.abs(m.quantidade)) }), ` de ${p.nome}, ligada a esta movimentação. Nada é apagado: as duas ficam no histórico.`),
      campos: [
        { nome: "motivo", rotulo: "Motivo do estorno", tipo: "textarea", obrigatorio: true, largura: "inteira", linhas: 2, max: 300, placeholder: "Ex.: Venda lançada em duplicidade." },
        campoResponsavel(),
      ],
      rotuloSalvar: "Confirmar estorno",
      aoSalvar: (v) => {
        const r = E.estornar(movId, v);
        if (r.ok) U.aviso(`Estorno registrado. Saldo de ${p.nome}: ${U.unidades(r.movimento.saldoApos)}`);
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
  }

  /* ---------- Detalhes de uma movimentação ---------- */
  function abrirDetalhe({ tipo, titulo, corpo, botoes }) {
    const dlg = $("#dlg-detalhe");
    $("#detalhe-tipo").textContent = tipo;
    $("#detalhe-titulo").textContent = titulo;
    $("#detalhe-corpo").replaceChildren(...corpo);
    $("#detalhe-botoes").replaceChildren(...botoes);
    if (!dlg.open) dlg.showModal();
    const foco = $("#detalhe-botoes .btn--primario") || $("#detalhe-botoes .btn");
    if (foco) foco.focus();
  }
  const fecharDetalhe = () => { const d = $("#dlg-detalhe"); if (d.open) d.close(); };
  const linhaFicha = (rotulo, valor, inteira) => el("div", { class: `ficha__linha${inteira ? " ficha__linha--inteira" : ""}` }, el("dt", { texto: rotulo }), el("dd", {}, valor || el("span", { class: "suave", texto: "—" })));

  function detalheMovimento(id) {
    const m = L.movimento(id);
    if (!m) { U.aviso("Movimentação não encontrada.", "erro"); return; }
    const p = L.produto(m.produtoId);
    const pc = m.pedidoId ? L.pedido(m.pedidoId) : null;
    const original = m.estornoDe ? L.movimento(m.estornoDe) : null;
    const estorno = m.estornadoPor ? L.movimento(m.estornadoPor) : null;
    const pode = E.podeEstornar(m);
    const corpo = [
      el("div", { class: "detalhe-mov" },
        el("div", { class: "detalhe-mov__saldo" },
          C().tipoMovimento(m), C().quantidade(m.quantidade),
          el("span", { texto: "saldo" }), el("b", { texto: U.numero(m.saldoAnterior) }), icone("arrow-right", 14), el("b", { texto: U.numero(m.saldoApos) }),
          m.estornadoPor ? el("span", { class: "marca-estorno" }, icone("undo-2", 12), "estornada") : null),
        el("dl", { class: "ficha" },
          linhaFicha("Produto", el("a", { class: "link-texto", href: `#/produtos/${p.id}`, onclick: fecharDetalhe, texto: `${p.nome} · ${p.sku}` }), true),
          linhaFicha("Data e hora", U.dataHora(m.data)),
          linhaFicha("Registrado em", U.dataHora(m.registradoEm || m.data)),
          linhaFicha("Responsável", C().pessoa(m.responsavelId)),
          linhaFicha("Motivo", m.motivo),
          linhaFicha("Documento", m.documento),
          m.fornecedorId ? linhaFicha("Fornecedor", el("a", { class: "link-texto", href: `#/fornecedores/${m.fornecedorId}`, onclick: fecharDetalhe, texto: L.nomeFornecedor(m.fornecedorId) })) : null,
          m.custoUnitario != null && m.tipo !== "saida" ? linhaFicha("Custo unitário", U.moeda(m.custoUnitario)) : null,
          m.custoAnteriorProduto != null ? linhaFicha("Custo do produto", `${U.moeda(m.custoAnteriorProduto)} → ${U.moeda(m.custoUnitario)}`) : null,
          m.tipo === "ajuste" ? linhaFicha("Contagem", `${U.unidades(m.contada)} contadas; sistema tinha ${U.unidades(m.saldoAnterior)}`) : null,
          pc ? linhaFicha("Pedido de compra", el("a", { class: "link-texto", href: `#/pedidos/${pc.id}`, onclick: fecharDetalhe, texto: pc.numero })) : null,
          original ? linhaFicha("Estorna", el("button", { class: "link-texto", type: "button", onclick: () => detalheMovimento(original.id), texto: `Movimentação nº ${original.numero} (${U.dataHora(original.data)})` })) : null,
          estorno ? linhaFicha("Estornada por", el("button", { class: "link-texto", type: "button", onclick: () => detalheMovimento(estorno.id), texto: `Movimentação nº ${estorno.numero} (${U.dataHora(estorno.data)})` })) : null,
          linhaFicha("Observação", m.observacao, true)),
        !pode.pode && ["entrada", "saida"].includes(m.tipo) && !m.estornadoPor ? el("p", { class: "nota-info" }, icone("info", 16), el("span", { texto: pode.motivo })) : null),
    ];
    const botoes = [
      pode.pode ? C().botao("Estornar", "btn--perigo", () => { fecharDetalhe(); formEstorno(id); }, "undo-2") : null,
      el("span", { class: "janela__espaco" }),
      C().botao("Fechar", "btn--linha", fecharDetalhe),
      C().botao("Ver produto", "btn--primario", () => { fecharDetalhe(); NX.ir(`produtos/${p.id}`); }, "package"),
    ].filter(Boolean);
    abrirDetalhe({ tipo: `Movimentação nº ${m.numero}`, titulo: p.nome, corpo, botoes });
  }

  NX.form = {
    produto: formProduto, categoria: formCategoria, fornecedor: formFornecedor,
    entrada: formEntrada, saida: formSaida, ajuste: formAjuste, estorno: formEstorno,
  };
  NX.acoes = { arquivarProduto, reativarProduto, arquivarCategoria, alternarFornecedor };
  NX.detalhe = { movimento: detalheMovimento, fechar: fecharDetalhe, linhaFicha };
  NX.opcoes = { produtos: opcoesProdutos, fornecedores: opcoesFornecedores, equipe: opcoesEquipe };
})();
