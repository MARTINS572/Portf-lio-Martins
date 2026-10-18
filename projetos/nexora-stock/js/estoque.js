/* ==========================================================================
   NEXORA STOCK — estoque.js
   TODAS as regras de estoque ficam aqui, num lugar só. As telas apenas
   chamam estas funções e mostram o resultado.

   Regras principais
   • O saldo de um produto é a soma das suas movimentações (entradas menos
     saídas, mais ou menos ajustes). Não existe "editar quantidade".
   • Estoque baixo: saldo menor ou igual ao mínimo. Sem estoque: saldo zero.
   • Nenhuma saída pode deixar o saldo negativo.
   • Ajuste de inventário registra a diferença (com motivo e observação),
     sem apagar nada do histórico.
   • Movimentação confirmada nunca é apagada: para corrigir, faz-se um estorno
     (nova movimentação ao contrário, ligada à original) ou um ajuste.
   • Pedido de compra só mexe no estoque quando o recebimento é confirmado.
     Recebimento parcial soma só o que chegou; o mesmo recebimento não pode
     ser lançado duas vezes.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const d = () => L.dados;

  /* ---------- Saldos (calculados do histórico, com cache) ---------- */
  const ordemMov = (a, b) => a.data.localeCompare(b.data) || a.numero - b.numero;
  let cache = { versao: -1 };
  function preparar() {
    if (cache.versao === L.versao()) return cache;
    const saldos = new Map();
    const ultimo = new Map();
    const porProduto = new Map();
    const ordenados = [...d().movimentos].sort(ordemMov);
    ordenados.forEach((m) => {
      saldos.set(m.produtoId, (saldos.get(m.produtoId) || 0) + m.quantidade);
      ultimo.set(m.produtoId, m);
      if (!porProduto.has(m.produtoId)) porProduto.set(m.produtoId, []);
      porProduto.get(m.produtoId).push(m);
    });
    cache = { versao: L.versao(), saldos, ultimo, porProduto, ordenados, memo: new Map() };
    return cache;
  }
  // Guarda resultados de cálculos até a próxima alteração dos dados
  function memo(chave, calcular) {
    const c = preparar();
    if (!c.memo.has(chave)) c.memo.set(chave, calcular());
    return c.memo.get(chave);
  }
  const saldo = (pid) => preparar().saldos.get(pid) || 0;
  const ultimaMovimentacao = (pid) => preparar().ultimo.get(pid) || null;
  const movimentosDoProduto = (pid) => preparar().porProduto.get(pid) || [];
  const movimentosOrdenados = () => preparar().ordenados;

  function situacao(p) {
    if (!p) return "normal";
    if (p.status === "arquivado") return "arquivado";
    const s = saldo(p.id);
    if (s <= 0) return "zerado";
    if (s <= p.minimo) return "baixo";
    return "normal";
  }
  const nomeSituacao = (id) => (NX.SITUACOES.find((s) => s.id === id) || {}).nome || id;
  const valorDoProduto = (p) => U.arredondar(saldo(p.id) * p.custo);
  // Classe da movimentação para os totais: estorno conta junto do tipo que ele desfaz
  const classe = (m) => (m.tipo === "estorno" ? m.tipoOriginal : m.tipo);

  /* ---------- Lançamento interno (único lugar que cria movimentações) ---------- */
  function lancar(m) {
    const dados = d();
    const anterior = saldo(m.produtoId);
    const apos = anterior + m.quantidade;
    if (apos < 0) throw new Error("Saldo negativo bloqueado");
    dados.sequencias.movimento += 1;
    const registro = {
      id: L.novoId("m"), numero: dados.sequencias.movimento, registradoEm: U.agora(),
      custoUnitario: null, fornecedorId: null, documento: "", observacao: "", ...m,
      saldoAnterior: anterior, saldoApos: apos,
    };
    dados.movimentos.push(registro);
    // atualiza o cache sem recalcular tudo
    const c = preparar();
    c.saldos.set(m.produtoId, apos);
    c.versao = -1;
    return registro;
  }

  /* ---------- Validações comuns ---------- */
  function validarProdutoMovel(pid, erros, campo = "produtoId") {
    const p = L.produto(pid);
    if (!p) { erros[campo] = "Escolha o produto."; return null; }
    if (p.status === "arquivado") { erros[campo] = "Este produto está arquivado. Reative-o para movimentar o estoque."; return null; }
    return p;
  }
  function validarQuantidade(v, erros, campo = "quantidade") {
    const q = U.lerInteiro(v);
    if (String(v ?? "").trim() === "") erros[campo] = "Informe a quantidade.";
    else if (!Number.isFinite(q)) erros[campo] = "Use um número inteiro, sem vírgula.";
    else if (q <= 0) erros[campo] = "A quantidade precisa ser maior que zero.";
    else if (q > 1000000) erros[campo] = "Quantidade alta demais para um lançamento.";
    return q;
  }
  // Data e hora: não pode estar no futuro, nem antes da última movimentação do produto
  function validarData(m, produtos, erros, campo = "data") {
    if (!U.momentoValido(m)) { erros[campo] = "Informe data e hora válidas."; return; }
    if (m > U.agora()) { erros[campo] = "A data não pode estar no futuro."; return; }
    for (const p of produtos) {
      if (!p) continue;
      const ult = ultimaMovimentacao(p.id);
      if (ult && m < ult.data) { erros[campo] = `${produtos.length > 1 ? `${p.nome}: ` : ""}a data não pode ser anterior à última movimentação deste produto (${U.dataHora(ult.data)}).`; return; }
      if (m.slice(0, 10) < p.criadoEm) { erros[campo] = `A data não pode ser anterior ao cadastro do produto (${U.dataCompleta(p.criadoEm)}).`; return; }
    }
  }
  const responsavelValido = (id) => d().equipe.some((u) => u.id === id);

  /* ---------- Entrada ---------- */
  function registrarEntrada(v) {
    const erros = {};
    const p = validarProdutoMovel(v.produtoId, erros);
    const q = validarQuantidade(v.quantidade, erros);
    let custo = p ? p.custo : null;
    if (String(v.custoUnitario ?? "").trim() !== "") {
      custo = U.lerValor(v.custoUnitario);
      if (!Number.isFinite(custo) || custo < 0) erros.custoUnitario = "Digite um valor válido, como 12,90 (ou deixe em branco para usar o custo cadastrado).";
      else if (custo > 1e6) erros.custoUnitario = "Valor alto demais para esta demonstração.";
    }
    let forn = null;
    if (v.fornecedorId) {
      forn = L.fornecedor(v.fornecedorId);
      if (!forn) erros.fornecedorId = "Fornecedor não encontrado.";
      else if (forn.status !== "ativo") erros.fornecedorId = "Este fornecedor está inativo.";
    }
    const obs = String(v.observacao || "").trim();
    if (!v.fornecedorId && obs.length < 5) erros.observacao = "Sem fornecedor, explique a origem da entrada (ex.: devolução de cliente).";
    if (String(v.documento || "").length > 40) erros.documento = "Use no máximo 40 caracteres.";
    if (!responsavelValido(v.responsavelId)) erros.responsavelId = "Escolha quem está registrando.";
    if (p) validarData(v.data, [p], erros);
    if (Object.keys(erros).length) return { ok: false, erros };

    const custoFinal = U.arredondar(custo);
    const mudarCusto = !!v.atualizarCusto && custoFinal !== p.custo && custoFinal > 0;
    const registro = lancar({
      produtoId: p.id, tipo: "entrada", quantidade: q, data: v.data, custoUnitario: custoFinal, fornecedorId: forn ? forn.id : null,
      motivo: forn ? "Entrada avulsa (sem pedido de compra)" : "Devolução ou outra origem", documento: String(v.documento || "").trim(),
      observacao: obs, responsavelId: v.responsavelId, origem: "manual", ...(mudarCusto ? { custoAnteriorProduto: p.custo } : {}),
    });
    if (mudarCusto) p.custo = custoFinal;
    L.salvar();
    return { ok: true, movimento: registro };
  }

  /* ---------- Saída ---------- */
  function registrarSaida(v) {
    const erros = {};
    const p = validarProdutoMovel(v.produtoId, erros);
    const q = validarQuantidade(v.quantidade, erros);
    if (!NX.MOTIVOS_SAIDA.includes(v.motivo)) erros.motivo = "Escolha o motivo da saída.";
    const obs = String(v.observacao || "").trim();
    if (v.motivo && v.motivo !== "Venda" && obs.length < 5) erros.observacao = "Explique o que aconteceu (obrigatório para saídas que não são venda).";
    if (String(v.documento || "").length > 40) erros.documento = "Use no máximo 40 caracteres.";
    if (!responsavelValido(v.responsavelId)) erros.responsavelId = "Escolha quem está registrando.";
    if (p && Number.isFinite(q) && q > 0) {
      const s = saldo(p.id);
      if (q > s) erros.quantidade = s === 0 ? "Este produto está sem estoque. Não é possível registrar a saída." : `Saldo disponível: ${U.unidades(s)} A saída deixaria o estoque negativo.`;
    }
    if (p) validarData(v.data, [p], erros);
    if (Object.keys(erros).length) return { ok: false, erros, erro: erros.quantidade && erros.quantidade.startsWith("Saldo") ? "Saída não registrada: quantidade maior que o saldo." : undefined };
    const registro = lancar({
      produtoId: p.id, tipo: "saida", quantidade: -q, data: v.data, motivo: v.motivo, documento: String(v.documento || "").trim(),
      observacao: obs, responsavelId: v.responsavelId, origem: "manual",
    });
    L.salvar();
    return { ok: true, movimento: registro };
  }

  /* ---------- Ajuste de inventário ---------- */
  function registrarAjuste(v) {
    const erros = {};
    const p = validarProdutoMovel(v.produtoId, erros);
    const t = String(v.contada ?? "").trim();
    const contada = U.lerInteiro(t);
    if (t === "") erros.contada = "Informe a quantidade contada (pode ser 0).";
    else if (!Number.isFinite(contada)) erros.contada = "Use um número inteiro, sem vírgula.";
    if (!NX.MOTIVOS_AJUSTE.includes(v.motivo)) erros.motivo = "Escolha o motivo do ajuste.";
    const obs = String(v.observacao || "").trim();
    if (obs.length < 5) erros.observacao = "Descreva a contagem ou a correção (obrigatório para ajustes).";
    if (!responsavelValido(v.responsavelId)) erros.responsavelId = "Escolha quem fez a contagem.";
    if (p && Number.isFinite(contada) && contada === saldo(p.id)) erros.contada = `A contagem é igual ao saldo registrado (${U.unidades(contada)}). Não há diferença para ajustar.`;
    if (p) validarData(v.data, [p], erros);
    if (Object.keys(erros).length) return { ok: false, erros };
    const registro = lancar({
      produtoId: p.id, tipo: "ajuste", quantidade: contada - saldo(p.id), contada, data: v.data, motivo: v.motivo,
      documento: String(v.documento || "").trim(), observacao: obs, responsavelId: v.responsavelId, origem: "manual",
    });
    L.salvar();
    return { ok: true, movimento: registro };
  }

  /* ---------- Estorno (desfaz uma entrada ou saída sem apagar) ---------- */
  function podeEstornar(m) {
    if (!m) return { pode: false, motivo: "Movimentação não encontrada." };
    if (m.tipo === "estorno") return { pode: false, motivo: "Um estorno não pode ser estornado. Se precisar, registre um ajuste de inventário." };
    if (m.tipo === "ajuste") return { pode: false, motivo: "Ajustes não são estornados: registre um novo ajuste com a contagem correta." };
    if (m.estornadoPor) return { pode: false, motivo: "Esta movimentação já foi estornada." };
    if (m.origem === "pedido") return { pode: false, motivo: "Recebimentos de pedido não são estornados aqui. Se a mercadoria voltou ao fornecedor, registre uma saída ou um ajuste explicando o motivo." };
    const p = L.produto(m.produtoId);
    if (!p || p.status === "arquivado") return { pode: false, motivo: "O produto está arquivado. Reative-o para estornar." };
    if (m.tipo === "entrada" && saldo(p.id) < m.quantidade) return { pode: false, motivo: `O saldo atual (${U.unidades(saldo(p.id))}) é menor que a entrada (${U.unidades(m.quantidade)}). Estornar deixaria o estoque negativo; use um ajuste de inventário.` };
    return { pode: true };
  }
  function estornar(movId, { motivo, responsavelId }) {
    const m = L.movimento(movId);
    const pode = podeEstornar(m);
    if (!pode.pode) return { ok: false, erro: pode.motivo };
    const erros = {};
    const texto = String(motivo || "").trim();
    if (texto.length < 5) erros.motivo = "Explique por que esta movimentação está sendo estornada.";
    if (!responsavelValido(responsavelId)) erros.responsavelId = "Escolha quem está estornando.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const registro = lancar({
      produtoId: m.produtoId, tipo: "estorno", tipoOriginal: m.tipo, quantidade: -m.quantidade, data: U.agora(),
      motivo: texto, documento: `Estorno da mov. nº ${m.numero}`, responsavelId, origem: "estorno", estornoDe: m.id,
      custoUnitario: m.custoUnitario, fornecedorId: m.fornecedorId,
    });
    m.estornadoPor = registro.id;
    L.salvar();
    return { ok: true, movimento: registro };
  }

  /* ---------- Pedidos de compra ---------- */
  const statusPedido = (id) => NX.STATUS_PEDIDO.find((s) => s.id === id) || { id, nome: id, icone: "circle" };
  const ABERTOS = ["pendente", "enviado", "parcial"];
  const pedidoAberto = (pc) => ABERTOS.includes(pc.status);
  const pedidoAtrasado = (pc) => (pc.status === "enviado" || pc.status === "parcial") && pc.previsao < U.hoje();
  function totaisPedido(pc) {
    let total = 0, recebidoValor = 0, pendenteUn = 0, pendenteValor = 0, pedidoUn = 0, recebidoUn = 0;
    pc.itens.forEach((it) => {
      total += it.quantidade * it.custo;
      recebidoValor += it.recebido * it.custo;
      pedidoUn += it.quantidade;
      recebidoUn += it.recebido;
      const pend = pc.status === "cancelado" ? 0 : Math.max(0, it.quantidade - it.recebido);
      pendenteUn += pend;
      pendenteValor += pend * it.custo;
    });
    return { total: U.arredondar(total), recebidoValor: U.arredondar(recebidoValor), pendenteUn, pendenteValor: U.arredondar(pendenteValor), pedidoUn, recebidoUn };
  }
  // Pedidos ainda não concluídos que têm o produto com quantidade a receber
  function pedidosComProduto(pid) {
    return d().pedidos.filter((pc) => ["rascunho", "pendente", "enviado", "parcial"].includes(pc.status) && pc.itens.some((it) => it.produtoId === pid && it.recebido < it.quantidade));
  }

  function validarPedido(v, id) {
    const erros = {};
    const itensErros = [];
    const atual = id ? L.pedido(id) : null;
    const forn = L.fornecedor(v.fornecedorId);
    if (!forn) erros.fornecedorId = "Escolha o fornecedor.";
    else if (forn.status !== "ativo") erros.fornecedorId = "Este fornecedor está inativo. Escolha outro.";
    if (!U.dataValida(v.previsao)) erros.previsao = "Informe a previsão de entrega.";
    else if (v.previsao < U.hoje()) erros.previsao = "A previsão de entrega não pode estar no passado.";
    if (String(v.observacoes || "").length > 500) erros.observacoes = "Use no máximo 500 caracteres.";
    const itens = [];
    const vistos = new Set();
    (v.itens || []).forEach((it, i) => {
      const e = {};
      const p = L.produto(it.produtoId);
      if (!p) e.produtoId = "Escolha o produto.";
      else if (p.status === "arquivado") e.produtoId = "Produto arquivado.";
      else if (vistos.has(p.id)) e.produtoId = "Produto repetido no pedido: junte as quantidades em uma linha.";
      const q = U.lerInteiro(it.quantidade);
      if (!Number.isFinite(q) || q <= 0) e.quantidade = "Quantidade inteira maior que zero.";
      else if (q > 100000) e.quantidade = "Quantidade alta demais.";
      const c = U.lerValor(it.custo);
      if (!Number.isFinite(c) || c < 0) e.custo = "Custo inválido.";
      if (p) vistos.add(p.id);
      itensErros[i] = e;
      if (!Object.keys(e).length) itens.push({ produtoId: p.id, quantidade: q, custo: U.arredondar(c), recebido: 0 });
    });
    if (!(v.itens || []).length) erros.itens = "Adicione pelo menos um produto ao pedido.";
    else if (itensErros.some((e) => Object.keys(e).length)) erros.itens = "Confira os itens destacados.";
    if (atual && !["rascunho", "pendente"].includes(atual.status)) erros.geral = "Só é possível editar pedidos em rascunho ou pendentes de envio.";
    return { erros, itensErros, itens, forn };
  }

  // status: "rascunho" (salvar rascunho) ou "pendente" (pronto para enviar)
  function salvarPedido(v, id, status = "rascunho") {
    const { erros, itensErros, itens } = validarPedido(v, id);
    if (Object.keys(erros).length) return { ok: false, erros, itensErros, erro: erros.geral || erros.itens };
    const dados = d();
    if (id) {
      const pc = L.pedido(id);
      Object.assign(pc, { fornecedorId: v.fornecedorId, previsao: v.previsao, observacoes: String(v.observacoes || "").trim(), itens, status: status === "pendente" ? "pendente" : pc.status });
      L.salvar();
      return { ok: true, id };
    }
    dados.sequencias.pedido += 1;
    const pc = {
      id: L.novoId("pc"), numero: `PC-${String(dados.sequencias.pedido).padStart(4, "0")}`, fornecedorId: v.fornecedorId, status,
      criadoEm: U.agora(), enviadoEm: null, previsao: v.previsao, observacoes: String(v.observacoes || "").trim(), responsavelId: dados.perfil.id,
      itens, recebimentos: [],
    };
    dados.pedidos.push(pc);
    L.salvar();
    return { ok: true, id: pc.id, numero: pc.numero };
  }
  function concluirRascunho(id) {
    const pc = L.pedido(id);
    if (!pc || pc.status !== "rascunho") return { ok: false, erro: "Só rascunhos podem ser concluídos." };
    if (pc.previsao < U.hoje()) return { ok: false, erro: "A previsão de entrega já passou. Edite o pedido e atualize a data." };
    const forn = L.fornecedor(pc.fornecedorId);
    if (!forn || forn.status !== "ativo") return { ok: false, erro: "O fornecedor deste pedido está inativo. Edite o pedido e escolha outro." };
    pc.status = "pendente";
    L.salvar();
    return { ok: true };
  }
  function marcarEnviado(id) {
    const pc = L.pedido(id);
    if (!pc || pc.status !== "pendente") return { ok: false, erro: "Só pedidos pendentes de envio podem ser marcados como enviados." };
    if (pc.previsao < U.hoje()) return { ok: false, erro: "A previsão de entrega já passou. Edite o pedido e atualize a data antes de enviar." };
    pc.status = "enviado";
    pc.enviadoEm = U.agora();
    L.salvar();
    return { ok: true };
  }
  function excluirRascunho(id) {
    const pc = L.pedido(id);
    if (!pc || pc.status !== "rascunho") return { ok: false, erro: "Só rascunhos podem ser excluídos. Pedidos já enviados devem ser cancelados." };
    d().pedidos = d().pedidos.filter((x) => x.id !== id);
    L.salvar();
    return { ok: true };
  }
  function cancelarPedido(id, motivo) {
    const pc = L.pedido(id);
    if (!pc || !["rascunho", "pendente", "enviado", "parcial"].includes(pc.status)) return { ok: false, erro: "Este pedido não pode ser cancelado." };
    const texto = String(motivo || "").trim();
    if (texto.length < 5) return { ok: false, erros: { motivo: "Explique o motivo do cancelamento." } };
    pc.status = "cancelado";
    pc.canceladoEm = U.agora();
    pc.motivoCancelamento = texto;
    L.salvar();
    return { ok: true };
  }

  // Cada janela de recebimento gera uma "senha" (token). Se o mesmo token chegar
  // duas vezes (clique duplo, botão voltar, outra aba), nada é lançado de novo.
  const novoTokenRecebimento = () => L.novoId("rc");
  function registrarRecebimento(id, { token, quantidades, data, documento, responsavelId }) {
    const pc = L.pedido(id);
    if (!pc) return { ok: false, erro: "Pedido não encontrado." };
    if (!token) return { ok: false, erro: "Recebimento sem identificação. Abra a janela de recebimento de novo." };
    if (d().pedidos.some((x) => x.recebimentos.some((r) => r.id === token))) return { ok: false, duplicado: true, erro: "Este recebimento já foi registrado. Nada foi lançado de novo." };
    if (!["enviado", "parcial"].includes(pc.status)) return { ok: false, erro: pc.status === "recebido" ? "Este pedido já foi recebido por completo." : "Só pedidos enviados podem ser recebidos. Marque o pedido como enviado primeiro." };
    const erros = {};
    const itensErros = {};
    const lancamentos = [];
    pc.itens.forEach((it) => {
      const t = String((quantidades || {})[it.produtoId] ?? "").trim();
      if (t === "" || t === "0") return;
      const q = U.lerInteiro(t);
      const pendente = it.quantidade - it.recebido;
      const p = L.produto(it.produtoId);
      if (!Number.isFinite(q)) itensErros[it.produtoId] = "Use um número inteiro.";
      else if (q > pendente) itensErros[it.produtoId] = `Máximo a receber: ${U.unidades(pendente)}`;
      else if (!p || p.status === "arquivado") itensErros[it.produtoId] = "Produto arquivado: reative para receber.";
      else lancamentos.push({ it, q, p });
    });
    if (Object.keys(itensErros).length) erros.itens = "Confira as quantidades destacadas.";
    else if (!lancamentos.length) erros.itens = "Informe a quantidade recebida de pelo menos um item.";
    if (!responsavelValido(responsavelId)) erros.responsavelId = "Escolha quem conferiu a mercadoria.";
    if (String(documento || "").length > 40) erros.documento = "Use no máximo 40 caracteres.";
    validarData(data, lancamentos.map((l) => l.p), erros);
    if (!erros.data && pc.enviadoEm && data < pc.enviadoEm) erros.data = `O recebimento não pode ser anterior ao envio do pedido (${U.dataHora(pc.enviadoEm)}).`;
    if (Object.keys(erros).length) return { ok: false, erros, itensErros, erro: erros.itens };

    const doc = String(documento || "").trim() || pc.numero;
    const rec = { id: token, data, documento: doc, responsavelId, itens: [], movimentos: [] };
    lancamentos.forEach(({ it, q, p }) => {
      const m = lancar({
        produtoId: p.id, tipo: "entrada", quantidade: q, data, custoUnitario: it.custo, fornecedorId: pc.fornecedorId,
        motivo: "Recebimento de pedido de compra", documento: doc, observacao: "", responsavelId, origem: "pedido", pedidoId: pc.id, recebimentoId: token,
      });
      it.recebido += q;
      rec.itens.push({ produtoId: p.id, quantidade: q });
      rec.movimentos.push(m.id);
    });
    pc.recebimentos.push(rec);
    pc.status = pc.itens.every((it) => it.recebido >= it.quantidade) ? "recebido" : "parcial";
    if (pc.status === "recebido") pc.concluidoEm = data;
    L.salvar();
    return { ok: true, status: pc.status, unidades: rec.itens.reduce((t, x) => t + x.quantidade, 0) };
  }

  /* ---------- Alertas internos ---------- */
  const PESO = { atrasado: 0, zerado: 1, baixo: 2, receber: 3 };
  function alertasAtivos() {
    return memo("alertas", () => {
      const lista = [];
      d().produtos.filter((p) => p.status === "ativo").forEach((p) => {
        const s = situacao(p);
        if (s !== "zerado" && s !== "baixo") return;
        const pcs = pedidosComProduto(p.id).filter((pc) => pc.status !== "rascunho");
        const emPedido = pcs.length ? `em ${pcs.map((pc) => pc.numero).join(", ")}` : "sem pedido em aberto";
        lista.push({
          chave: `${s}:${p.id}`, tipo: s, titulo: `${s === "zerado" ? "Sem estoque" : "Estoque baixo"}: ${p.nome}`,
          texto: s === "zerado" ? `Mínimo ${U.unidades(p.minimo)} · ${emPedido}` : `${U.unidades(saldo(p.id))} (mínimo ${p.minimo}) · ${emPedido}`,
          rota: `produtos/${p.id}`, ordem: p.nome,
        });
      });
      d().pedidos.filter((pc) => pc.status === "enviado" || pc.status === "parcial").forEach((pc) => {
        const forn = L.nomeFornecedor(pc.fornecedorId);
        const t = totaisPedido(pc);
        if (pedidoAtrasado(pc)) lista.push({ chave: `atrasado:${pc.id}:${pc.previsao}`, tipo: "atrasado", titulo: `Pedido atrasado: ${pc.numero}`, texto: `Previsto para ${U.dataCompleta(pc.previsao)} · ${forn}`, rota: `pedidos/${pc.id}`, ordem: pc.previsao });
        else lista.push({ chave: `receber:${pc.id}`, tipo: "receber", titulo: `Recebimento pendente: ${pc.numero}`, texto: `${U.unidades(t.pendenteUn)} a receber · previsão ${U.dataCompleta(pc.previsao)}`, rota: `pedidos/${pc.id}`, ordem: pc.previsao });
      });
      return lista.sort((a, b) => PESO[a.tipo] - PESO[b.tipo] || String(a.ordem).localeCompare(String(b.ordem), "pt-BR"));
    });
  }
  function alertas() {
    const vistos = new Set(d().alertasVistos || []);
    return alertasAtivos().map((a) => ({ ...a, visto: vistos.has(a.chave) }));
  }
  function marcarAlertasVistos(chaves) {
    const set = new Set(d().alertasVistos || []);
    chaves.forEach((c) => set.add(c));
    d().alertasVistos = [...set];
    L.salvar();
  }
  // Remove marcas de "visto" de alertas que já não existem (se o problema voltar, o alerta volta a aparecer)
  function limparAlertasVistos() {
    const dados = d();
    if (!dados || !dados.alertasVistos || !dados.alertasVistos.length) return;
    cache.versao = -1;
    const ativos = new Set(alertasAtivos().map((a) => a.chave));
    dados.alertasVistos = dados.alertasVistos.filter((c) => ativos.has(c));
  }

  /* ---------- Indicadores e séries (sempre calculados do histórico) ---------- */
  const noPeriodo = (m, de, ate) => { const dia = m.data.slice(0, 10); return dia >= de && dia <= ate; };
  function totaisMovimento(de, ate, filtro = () => true) {
    let entradas = 0, saidas = 0, ajustes = 0, valorEntradas = 0, valorSaidas = 0, ajustesValor = 0, qtdAjustes = 0;
    movimentosOrdenados().forEach((m) => {
      if (!noPeriodo(m, de, ate) || !filtro(m)) return;
      const p = L.produto(m.produtoId);
      const custo = p ? p.custo : 0;
      const c = classe(m);
      if (c === "entrada") { entradas += m.quantidade; valorEntradas += m.quantidade * (m.custoUnitario ?? custo); }
      else if (c === "saida") { saidas += -m.quantidade; valorSaidas += -m.quantidade * custo; }
      else if (c === "ajuste") { ajustes += m.quantidade; ajustesValor += m.quantidade * custo; qtdAjustes += 1; }
    });
    return { entradas, saidas, ajustes, qtdAjustes, valorEntradas: U.arredondar(valorEntradas), valorSaidas: U.arredondar(valorSaidas), ajustesValor: U.arredondar(ajustesValor) };
  }

  function indicadores(de, ate) {
    return memo(`ind:${de}:${ate}`, () => {
      const ativos = d().produtos.filter((p) => p.status === "ativo");
      let unidades = 0, valor = 0, baixo = 0, zerado = 0;
      d().produtos.forEach((p) => { unidades += saldo(p.id); valor += saldo(p.id) * p.custo; });
      ativos.forEach((p) => { const s = situacao(p); if (s === "baixo") baixo += 1; if (s === "zerado") zerado += 1; });
      const abertos = d().pedidos.filter(pedidoAberto);
      return {
        produtosAtivos: ativos.length, arquivados: d().produtos.length - ativos.length, unidades, valor: U.arredondar(valor), baixo, zerado,
        movimento: totaisMovimento(de, ate),
        pedidosPendentes: abertos.length, pedidosAtrasados: abertos.filter(pedidoAtrasado).length,
        valorPendente: U.arredondar(abertos.reduce((t, pc) => t + totaisPedido(pc).pendenteValor, 0)),
        rascunhos: d().pedidos.filter((pc) => pc.status === "rascunho").length,
      };
    });
  }

  // Divide o período em blocos (dia, semana ou mês) para os gráficos
  function blocos(de, ate, tipo) {
    const lista = [];
    if (tipo === "dia") {
      for (let c = de; c <= ate; c = U.somarDias(c, 1)) lista.push({ inicio: c, fim: c, rotulo: U.dataCurta(c) });
    } else if (tipo === "semana") {
      // semanas que terminam no último dia do período, de 7 em 7 dias para trás
      for (let fim = ate; fim >= de; fim = U.somarDias(fim, -7)) {
        const inicio = U.somarDias(fim, -6) < de ? de : U.somarDias(fim, -6);
        lista.unshift({ inicio, fim, rotulo: U.dataCurta(inicio) });
      }
    } else {
      for (let c = U.inicioDoMes(de); c <= ate; c = U.somarMeses(c, 1)) {
        const inicio = c < de ? de : c;
        const fim = U.fimDoMes(c) > ate ? ate : U.fimDoMes(c);
        lista.push({ inicio, fim, rotulo: `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(2, 4)}` });
      }
    }
    return lista;
  }
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const agrupamentoPara = (de, ate) => { const n = U.diasEntre(de, ate) + 1; return n <= 14 ? "dia" : n <= 120 ? "semana" : "mes"; };

  function serieMovimentos(de, ate, { categoriaId, agrupamento } = {}) {
    const tipo = agrupamento || agrupamentoPara(de, ate);
    return memo(`serie:${de}:${ate}:${categoriaId || ""}:${tipo}`, () => {
      const filtro = categoriaId ? (m) => (L.produto(m.produtoId) || {}).categoriaId === categoriaId : () => true;
      return blocos(de, ate, tipo).map((b) => ({ ...b, ...totaisMovimento(b.inicio, b.fim, filtro) }));
    });
  }

  function porCategoria() {
    return memo("porCategoria", () => d().categorias.map((c) => {
      const lista = d().produtos.filter((p) => p.categoriaId === c.id && p.status === "ativo");
      return {
        categoria: c, produtos: lista.length,
        unidades: lista.reduce((t, p) => t + saldo(p.id), 0),
        valor: U.arredondar(lista.reduce((t, p) => t + valorDoProduto(p), 0)),
        baixo: lista.filter((p) => ["baixo", "zerado"].includes(situacao(p))).length,
      };
    }).filter((x) => x.produtos > 0 || x.categoria.status === "ativa"));
  }

  function maisMovimentados(de, ate, { categoriaId, limite = 10 } = {}) {
    return memo(`mais:${de}:${ate}:${categoriaId || ""}:${limite}`, () => {
      const mapa = new Map();
      movimentosOrdenados().forEach((m) => {
        if (!noPeriodo(m, de, ate)) return;
        const p = L.produto(m.produtoId);
        if (!p || (categoriaId && p.categoriaId !== categoriaId)) return;
        const c = classe(m);
        if (c !== "entrada" && c !== "saida") return;
        const reg = mapa.get(p.id) || { produto: p, entradas: 0, saidas: 0, movimentos: 0 };
        if (c === "entrada") reg.entradas += m.quantidade; else reg.saidas += -m.quantidade;
        reg.movimentos += 1;
        mapa.set(p.id, reg);
      });
      return [...mapa.values()].map((r) => ({ ...r, total: r.entradas + r.saidas })).filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total || a.produto.nome.localeCompare(b.produto.nome, "pt-BR")).slice(0, limite);
    });
  }

  function semMovimentacao(de, ate, { categoriaId } = {}) {
    const comMov = new Set(movimentosOrdenados().filter((m) => noPeriodo(m, de, ate)).map((m) => m.produtoId));
    return d().produtos.filter((p) => p.status === "ativo" && !comMov.has(p.id) && (!categoriaId || p.categoriaId === categoriaId) && p.criadoEm <= ate)
      .map((p) => ({ produto: p, saldo: saldo(p.id), ultima: (ultimaMovimentacao(p.id) || {}).data || null }))
      .sort((a, b) => String(a.ultima).localeCompare(String(b.ultima)));
  }

  // Valor do estoque ao fim de cada ponto: parte do valor de hoje e "desfaz" as movimentações para trás.
  // Usa o custo cadastrado de cada produto (estimativa operacional, não valor contábil).
  function evolucaoValor(de, ate) {
    return memo(`evol:${de}:${ate}`, () => {
      const n = U.diasEntre(de, ate);
      const passo = n <= 14 ? 1 : n <= 45 ? 3 : 7;
      const pontos = [];
      for (let c = ate; c >= de; c = U.somarDias(c, -passo)) pontos.unshift(c);
      if (pontos[0] !== de && pontos.length < 20) pontos.unshift(de);
      const custo = new Map(d().produtos.map((p) => [p.id, p.custo]));
      let valor = d().produtos.reduce((t, p) => t + saldo(p.id) * p.custo, 0);
      const desc = [...movimentosOrdenados()].reverse();
      let i = 0;
      const res = [];
      for (let k = pontos.length - 1; k >= 0; k -= 1) {
        const limite = `${pontos[k]}T23:59`;
        while (i < desc.length && desc[i].data > limite) { valor -= desc[i].quantidade * (custo.get(desc[i].produtoId) || 0); i += 1; }
        res.unshift({ data: pontos[k], valor: U.arredondar(valor) });
      }
      return res;
    });
  }

  // Saldo de um produto ao fim de cada dia do período (para o gráfico da página do produto)
  function saldoNoTempo(pid, de, ate) {
    const movs = movimentosDoProduto(pid);
    const res = [];
    let s = 0;
    let i = 0;
    for (let c = de; c <= ate; c = U.somarDias(c, 1)) {
      const limite = `${c}T23:59`;
      while (i < movs.length && movs[i].data <= limite) { s = movs[i].saldoApos ?? s + movs[i].quantidade; i += 1; }
      res.push({ data: c, saldo: s });
    }
    return res;
  }

  // Confere se o saldo de cada produto bate com o histórico, movimento a movimento
  function conferirIntegridade() {
    const problemas = [];
    d().produtos.forEach((p) => {
      let s = 0;
      movimentosDoProduto(p.id).forEach((m) => {
        if (m.saldoAnterior !== s) problemas.push(`${p.nome}: mov. nº ${m.numero} começa em ${m.saldoAnterior}, esperado ${s}`);
        s += m.quantidade;
        if (m.saldoApos !== s) problemas.push(`${p.nome}: mov. nº ${m.numero} termina em ${m.saldoApos}, esperado ${s}`);
        if (s < 0) problemas.push(`${p.nome}: saldo negativo após mov. nº ${m.numero}`);
      });
    });
    d().pedidos.forEach((pc) => {
      pc.itens.forEach((it) => {
        const recebido = pc.recebimentos.reduce((t, r) => t + r.itens.filter((x) => x.produtoId === it.produtoId).reduce((a, x) => a + x.quantidade, 0), 0);
        if (recebido !== it.recebido) problemas.push(`${pc.numero}: recebido de ${L.produto(it.produtoId)?.nome} não confere`);
        if (it.recebido > it.quantidade) problemas.push(`${pc.numero}: recebeu mais do que o pedido`);
      });
    });
    return { ok: problemas.length === 0, problemas, movimentos: d().movimentos.length };
  }

  NX.estoque = {
    saldo, situacao, nomeSituacao, valorDoProduto, ultimaMovimentacao, movimentosDoProduto, movimentosOrdenados, classe,
    lancar, registrarEntrada, registrarSaida, registrarAjuste, podeEstornar, estornar,
    statusPedido, pedidoAberto, pedidoAtrasado, totaisPedido, pedidosComProduto, validarPedido, salvarPedido, concluirRascunho, marcarEnviado,
    excluirRascunho, cancelarPedido, novoTokenRecebimento, registrarRecebimento,
    alertas, marcarAlertasVistos, limparAlertasVistos,
    totaisMovimento, indicadores, blocos, agrupamentoPara, serieMovimentos, porCategoria, maisMovimentados, semMovimentacao, evolucaoValor, saldoNoTempo,
    conferirIntegridade, noPeriodo,
  };
})();
