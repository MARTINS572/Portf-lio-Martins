/* ==========================================================================
   NEXORA AUTO — oficina.js
   TODAS AS REGRAS DO NEGÓCIO, NUM LUGAR SÓ. As telas só chamam estas
   funções e mostram o resultado, para que todas mostrem os mesmos números.

   Ordem de serviço (OS)
     aguardando avaliação → em diagnóstico → aguardando orçamento →
     aguardando aprovação do cliente → aprovada (ou aguardando peças) →
     em execução → aguardando retirada (serviço pronto) → concluída
     (ordem encerrada e faturada) → entregue.   Cancelada: antes do
     serviço ficar pronto.
   Peças
     • Colocar uma peça no orçamento NÃO mexe no estoque.
     • Quando o cliente aprova, a peça é RESERVADA (disponível = saldo −
       reservado). Se não há quantidade, a OS fica "aguardando peças" e a
       reserva acontece sozinha quando a peça entrar no estoque.
     • A BAIXA (saída do estoque) acontece uma única vez, quando o serviço é
       finalizado. Cada item guarda a movimentação que gerou: não há baixa
       nem cobrança em dobro.
   Orçamento
     • Aprovado não muda: incluir itens cria uma revisão, que precisa de
       nova aprovação. A aprovação é um registro interno (quem, como,
       quando), não uma assinatura digital.
   Financeiro
     • Orçamento aprovado, serviço executado, valor faturado e valor
       recebido são números diferentes. Encerrar a OS fatura; o pagamento é
       registrado à parte (nada é cobrado pelo sistema).
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const d = () => L.dados;

  /* ======================================================================
     PERFIS (simulação no navegador; não é segurança)
     ====================================================================== */
  const papel = () => (d().perfil && d().perfil.papel) || "admin";
  const perfilAtual = () => NX.PERFIS.find((p) => p.id === papel()) || NX.PERFIS[0];
  const pode = (acao) => { const p = perfilAtual(); return p.acoes === "*" || p.acoes.includes(acao); };
  const podeVer = (secao) => { const p = perfilAtual(); return p.secoes === "*" || p.secoes.includes(secao); };
  const negar = (acao) => ({ ok: false, codigo: "sem_permissao", erro: `O perfil ${perfilAtual().nome} não pode ${NX.ACOES[acao] || "fazer isto"}. Troque de perfil no menu do usuário.` });

  /* ======================================================================
     CÁLCULOS (orçamento e OS usam a mesma função)
     ====================================================================== */
  const valorItem = (i) => U.arredondar(i.quantidade * i.unitario);
  function totais(itens, desconto = 0) {
    const t = { servicos: 0, pecas: 0, mao: 0 };
    (itens || []).forEach((i) => { t[i.tipo === "peca" ? "pecas" : i.tipo === "mao" ? "mao" : "servicos"] += valorItem(i); });
    Object.keys(t).forEach((k) => { t[k] = U.arredondar(t[k]); });
    const subtotal = U.arredondar(t.servicos + t.pecas + t.mao);
    const desc = U.arredondar(Math.min(desconto || 0, subtotal));
    return { ...t, maoDeObra: U.arredondar(t.servicos + t.mao), subtotal, desconto: desc, total: U.arredondar(subtotal - desc) };
  }
  const totaisOS = (os) => totais(os.itens, os.desconto);
  const totaisOrc = (o) => totais(o.itens, o.desconto);
  // Desconto até o limite da configuração; acima disso, só o administrador autoriza
  function validarDesconto(subtotal, valor, erros) {
    const t = String(valor ?? "").trim();
    if (!t) return { desconto: 0, autorizado: null };
    const v = U.lerValor(t);
    if (!Number.isFinite(v) || v < 0) { erros.desconto = "Digite um valor válido, como 50,00 (ou deixe em branco)."; return {}; }
    if (v > subtotal) { erros.desconto = "O desconto não pode ser maior que o subtotal."; return {}; }
    const limite = U.arredondar(subtotal * d().oficina.orcamento.descontoMax / 100);
    if (v > limite + 0.001 && papel() !== "admin") { erros.desconto = `Desconto acima do limite de ${d().oficina.orcamento.descontoMax}% (${U.moeda(limite)}). Só o administrador pode autorizar.`; return {}; }
    return { desconto: U.arredondar(v), autorizado: v > limite + 0.001 ? L.quem() : null };
  }

  /* ======================================================================
     ESTOQUE
     ====================================================================== */
  let cache = { versao: -1 };
  function preparar() {
    if (cache.versao === L.versao()) return cache;
    const saldos = new Map();
    const reservas = new Map();
    d().movimentos.forEach((m) => saldos.set(m.pecaId, (saldos.get(m.pecaId) || 0) + m.quantidade));
    d().ordens.forEach((os) => os.itens.forEach((i) => { if (i.tipo === "peca" && i.estado === "reservada") reservas.set(i.refId, (reservas.get(i.refId) || 0) + i.quantidade); }));
    cache = { versao: L.versao(), saldos, reservas, memo: new Map() };
    return cache;
  }
  const memo = (chave, fn) => { const c = preparar(); if (!c.memo.has(chave)) c.memo.set(chave, fn()); return c.memo.get(chave); };
  const saldo = (pid) => preparar().saldos.get(pid) || 0;
  const reservado = (pid) => preparar().reservas.get(pid) || 0;
  const disponivel = (pid) => saldo(pid) - reservado(pid);
  function situacaoPeca(p) {
    if (!p) return "normal";
    if (p.status !== "ativo") return "inativo";
    const s = saldo(p.id);
    if (s <= 0) return "zerado";
    if (s <= p.minimo) return "baixo";
    return "normal";
  }
  const movimentosDaPeca = (pid) => d().movimentos.filter((m) => m.pecaId === pid).sort((a, b) => b.numero - a.numero);

  // Único lugar que cria movimentações. Nunca deixa o saldo negativo.
  function lancarMovimento(m) {
    const anterior = saldo(m.pecaId);
    const apos = anterior + m.quantidade;
    if (apos < 0) throw new Error("Saldo negativo bloqueado");
    d().sequencias.movimento = (d().sequencias.movimento || 0) + 1;
    const reg = { id: L.novoId("m"), numero: d().sequencias.movimento, data: U.agora(), por: L.quem(), documento: "", observacao: "", custoUnitario: null, fornecedorId: null, osId: null, osItemId: null, ...m, saldoAnterior: anterior, saldoApos: apos };
    d().movimentos.push(reg);
    cache.versao = -1;
    return reg;
  }
  function validarPecaMovel(pid, erros) {
    const p = L.peca(pid);
    if (!p) { erros.pecaId = "Escolha a peça."; return null; }
    if (p.status !== "ativo") { erros.pecaId = "Esta peça está desativada. Reative-a para movimentar o estoque."; return null; }
    return p;
  }
  function registrarEntrada(v) {
    if (!pode("estoque_mov")) return negar("estoque_mov");
    const erros = {};
    const p = validarPecaMovel(v.pecaId, erros);
    const q = L.inteiro(v.quantidade, erros, "quantidade", { min: 1, max: 100000, rotulo: "a quantidade" });
    let custo = p ? p.custo : null;
    if (String(v.custoUnitario ?? "").trim()) custo = L.dinheiro(v.custoUnitario, erros, "custoUnitario");
    const forn = v.fornecedorId ? L.fornecedor(v.fornecedorId) : null;
    if (v.fornecedorId && !forn) erros.fornecedorId = "Fornecedor não encontrado.";
    const obs = String(v.observacao || "").trim();
    if (!forn && obs.length < 5) erros.observacao = "Sem fornecedor, explique a origem da entrada (ex.: devolução de cliente).";
    if (Object.keys(erros).length) return { ok: false, erros };
    const mov = lancarMovimento({ pecaId: p.id, tipo: "entrada", quantidade: q, motivo: forn ? "Compra / entrada de mercadoria" : "Outra origem", custoUnitario: U.arredondar(custo), fornecedorId: forn ? forn.id : null, documento: L.texto(v.documento, 40), observacao: obs });
    let desp = null;
    if (v.lancarDespesa && forn) {
      desp = { id: L.novoId("d"), data: U.hoje(), descricao: `Compra: ${q} × ${p.nome}`, categoria: "Compra de peças", valor: U.arredondar(q * custo), status: "a_pagar", pagoEm: null, fornecedorId: forn.id, movimentoId: mov.id, criadoEm: U.agora(), por: L.quem() };
      d().despesas.push(desp);
      mov.despesaId = desp.id;
    }
    const liberadas = reservarPendentes();
    L.salvar();
    return { ok: true, movimento: mov, despesa: desp, liberadas };
  }
  function registrarSaida(v) {
    if (!pode("estoque_mov")) return negar("estoque_mov");
    const erros = {};
    const p = validarPecaMovel(v.pecaId, erros);
    const q = L.inteiro(v.quantidade, erros, "quantidade", { min: 1, max: 100000, rotulo: "a quantidade" });
    if (!NX.MOTIVOS_SAIDA.includes(v.motivo)) erros.motivo = "Escolha o motivo da saída.";
    const obs = String(v.observacao || "").trim();
    if (obs.length < 5) erros.observacao = "Explique a saída (obrigatório).";
    if (p && q) {
      const disp = disponivel(p.id);
      const res = reservado(p.id);
      if (q > disp) erros.quantidade = disp <= 0 ? (res ? `Todo o saldo (${saldo(p.id)}) está reservado para ordens de serviço aprovadas.` : "Esta peça está sem estoque.") : `Disponível para saída: ${disp} un.${res ? ` (${res} reservadas para ordens de serviço)` : ""}. A saída deixaria o estoque negativo ou tiraria peça reservada.`;
    }
    if (Object.keys(erros).length) return { ok: false, erros, erro: erros.quantidade ? "Saída não registrada: quantidade maior que o disponível." : undefined };
    const mov = lancarMovimento({ pecaId: p.id, tipo: "saida", quantidade: -q, motivo: v.motivo, documento: L.texto(v.documento, 40), observacao: obs });
    L.salvar();
    return { ok: true, movimento: mov };
  }
  function registrarAjuste(v) {
    if (!pode("estoque_ajuste")) return negar("estoque_ajuste");
    const erros = {};
    const p = validarPecaMovel(v.pecaId, erros);
    const contada = L.inteiro(v.contada, erros, "contada", { min: 0, max: 100000, rotulo: "a quantidade contada (pode ser 0)" });
    if (!NX.MOTIVOS_AJUSTE.includes(v.motivo)) erros.motivo = "Escolha o motivo do ajuste.";
    const obs = String(v.observacao || "").trim();
    if (obs.length < 5) erros.observacao = "Descreva a contagem (obrigatório para ajustes).";
    if (p && contada != null && contada === saldo(p.id)) erros.contada = `A contagem é igual ao saldo registrado (${contada}). Não há diferença para ajustar.`;
    if (Object.keys(erros).length) return { ok: false, erros };
    const mov = lancarMovimento({ pecaId: p.id, tipo: "ajuste", quantidade: contada - saldo(p.id), contada, motivo: v.motivo, observacao: obs });
    const aviso = contada < reservado(p.id) ? `Atenção: a contagem (${contada}) ficou abaixo do que está reservado para ordens de serviço (${reservado(p.id)}).` : "";
    const liberadas = reservarPendentes();
    L.salvar();
    return { ok: true, movimento: mov, aviso, liberadas };
  }
  // Ordens aguardando peças: reserva o que chegou (as mais antigas primeiro)
  function reservarPendentes() {
    const liberadas = [];
    d().ordens.filter((os) => os.status === "aguardando_pecas").sort((a, b) => a.abertaEm.localeCompare(b.abertaEm)).forEach((os) => {
      os.itens.forEach((i) => {
        if (i.tipo !== "peca" || i.estado !== "falta") return;
        if (disponivel(i.refId) >= i.quantidade) { i.estado = "reservada"; cache.versao = -1; }
      });
      if (!os.itens.some((i) => i.tipo === "peca" && i.estado === "falta")) {
        os.status = os.retomarStatus || "aprovada";
        os.retomarStatus = null;
        historico(os, "pecas", "Peças disponíveis e reservadas: a ordem pode seguir");
        notificar("pecas", { osId: os.id, texto: `${os.numero}: peças chegaram e foram reservadas.` });
        liberadas.push(os.numero);
      }
    });
    return liberadas;
  }

  /* ======================================================================
     ORDENS DE SERVIÇO
     ====================================================================== */
  const ABERTAS = ["aguardando_avaliacao", "em_diagnostico", "aguardando_orcamento", "aguardando_aprovacao", "aguardando_pecas", "aprovada", "em_execucao", "aguardando_retirada", "concluida"];
  const NA_OFICINA = ABERTAS;                                          // veículo dentro da oficina
  const PRONTAS = ["aguardando_retirada", "concluida"];
  const EDITA_ITENS = ["aguardando_avaliacao", "em_diagnostico", "aguardando_orcamento"];
  const PODE_CANCELAR = ["aguardando_avaliacao", "em_diagnostico", "aguardando_orcamento", "aguardando_aprovacao", "aguardando_pecas", "aprovada", "em_execucao"];
  const nomeStatus = (s) => (NX.STATUS_OS.find((x) => x.id === s) || {}).nome || s;
  function historico(os, acao, texto) {
    const em = U.agora();
    os.historico.push({ em, acao, texto, por: L.quem() });
    os.atualizadoEm = em;
  }
  function notificar(tipo, { osId = null, orcId = null, texto }) {
    d().notificacoes.unshift({ id: L.novoId("n"), tipo, osId, orcId, texto, em: U.agora(), lida: false });
    d().notificacoes = d().notificacoes.slice(0, 200);
  }
  const itensEditaveis = (os) => EDITA_ITENS.includes(os.status) && !os.orcamentoId;
  const orcamentoAprovado = (os) => (os.orcamentoId ? L.orcamento(os.orcamentoId) : null);
  const orcamentoPendente = (os) => d().orcamentos.find((o) => o.osId === os.id && ["rascunho", "aguardando_aprovacao"].includes(o.status) && statusOrc(o) !== "expirado") || null;
  const osAbertaDoVeiculo = (vid, ignorar) => d().ordens.find((os) => os.veiculoId === vid && os.id !== ignorar && ABERTAS.includes(os.status));

  function abrirOS(v) {
    if (!pode("os_abrir")) return negar("os_abrir");
    L.sincronizar();
    const erros = {};
    const cli = L.cliente(v.clienteId);
    const vei = L.veiculo(v.veiculoId);
    if (!cli) erros.clienteId = "Escolha o cliente.";
    if (!vei) erros.veiculoId = "Escolha o veículo.";
    else if (cli && vei.clienteId !== cli.id) erros.veiculoId = "Este veículo está cadastrado para outro cliente. Se mudou de dono, atualize o cadastro do veículo antes.";
    else { const outra = osAbertaDoVeiculo(vei.id); if (outra) erros.veiculoId = `Este veículo já tem a ${outra.numero} aberta (${nomeStatus(outra.status)}).`; }
    const km = L.inteiro(v.kmEntrada, erros, "kmEntrada", { min: 0, max: 2000000, rotulo: "a quilometragem de entrada" });
    if (vei && km != null && km < vei.km && String(v.justificativaKm || "").trim().length < 5) erros.kmEntrada = `Menor que a última registrada (${U.numero(vei.km)} km). Confira o painel ou explique o motivo no campo abaixo.`;
    const relato = String(v.relato || "").trim();
    if (relato.length < 5) erros.relato = "Descreva o que o cliente relatou (pelo menos 5 letras).";
    if (v.previsao && (!U.momentoValido(v.previsao) || v.previsao <= U.agora())) erros.previsao = "A previsão precisa ser uma data e hora futuras.";
    const tec = v.tecnicoId ? L.membro(v.tecnicoId) : null;
    if (v.tecnicoId && (!tec || !tec.tecnico || tec.status !== "ativo")) erros.tecnicoId = "Escolha um técnico ativo.";
    const orc = v.orcamentoId ? L.orcamento(v.orcamentoId) : null;
    if (v.orcamentoId && (!orc || orc.status !== "aprovado" || orc.osId)) erros.geral = "Este orçamento não está aprovado ou já tem ordem de serviço.";
    if (Object.keys(erros).length) return { ok: false, erros, erro: erros.geral };
    const r = L.registrarKm(vei.id, km, { origem: "Entrada na oficina", justificativa: v.justificativaKm, salvarAgora: false });
    d().sequencias.os = (d().sequencias.os || 0) + 1;
    const agora = U.agora();
    const os = {
      id: L.novoId("o"), numero: `OS-${String(d().sequencias.os).padStart(4, "0")}`, oficinaId: d().oficina.id,
      clienteId: cli.id, veiculoId: vei.id, abertaEm: agora, kmEntrada: km, relato, diagnostico: "", tecnicoId: tec ? tec.id : null,
      previsao: v.previsao || null, status: "aguardando_avaliacao", itens: [], desconto: 0, orcamentoId: null, observacoes: L.texto(v.observacoes, 400),
      historico: [{ em: agora, acao: "aberta", texto: `Ordem aberta${r.inconsistente ? " (quilometragem menor que a anterior, justificada)" : ""}`, por: L.quem() }],
      finalizadaEm: null, concluidaEm: null, entregueEm: null, kmSaida: null, retiradoPor: "", faturamento: null, recebimentos: [], cancelamento: null, retomarStatus: null, atualizadoEm: agora,
    };
    d().ordens.push(os);
    notificar("nova_os", { osId: os.id, texto: `${os.numero} aberta: ${L.mostrarPlaca(vei.placa)} · ${cli.nome}` });
    if (orc) { orc.osId = os.id; aplicarOrcamento(os, orc); historico(os, "orcamento", `Aberta a partir do orçamento ${rotuloOrc(orc)}, já aprovado`); }
    L.salvar();
    return { ok: true, os };
  }

  function editarOS(id, v) {
    const os = L.ordem(id);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    if (!pode("os_editar")) return negar("os_editar");
    if (["entregue", "cancelada"].includes(os.status)) return { ok: false, erro: "Ordem entregue ou cancelada não pode ser alterada." };
    const erros = {};
    const mudou = [];
    const travadoTecnico = ["aguardando_retirada", "concluida"].includes(os.status);
    if (v.diagnostico !== undefined && v.diagnostico !== os.diagnostico) {
      if (travadoTecnico) erros.diagnostico = "O serviço já foi finalizado: o diagnóstico não pode mais mudar.";
      else if (String(v.diagnostico).length > 1500) erros.diagnostico = "Use no máximo 1.500 caracteres.";
      else mudou.push(["diagnostico", String(v.diagnostico).trim(), "Diagnóstico registrado"]);
    }
    if (v.relato !== undefined && String(v.relato).trim() !== os.relato) {
      if (String(v.relato).trim().length < 5) erros.relato = "Descreva o relato (pelo menos 5 letras).";
      else mudou.push(["relato", String(v.relato).trim(), "Relato do cliente alterado"]);
    }
    if (v.tecnicoId !== undefined && (v.tecnicoId || null) !== os.tecnicoId) {
      const t = v.tecnicoId ? L.membro(v.tecnicoId) : null;
      if (v.tecnicoId && (!t || !t.tecnico || t.status !== "ativo")) erros.tecnicoId = "Escolha um técnico ativo.";
      else if (travadoTecnico) erros.tecnicoId = "O serviço já foi finalizado.";
      else mudou.push(["tecnicoId", t ? t.id : null, t ? `Técnico responsável: ${t.nome}` : "Técnico removido"]);
    }
    if (v.previsao !== undefined && (v.previsao || null) !== os.previsao) {
      if (v.previsao && (!U.momentoValido(v.previsao) || v.previsao <= U.agora())) erros.previsao = "A previsão precisa ser uma data e hora futuras.";
      else mudou.push(["previsao", v.previsao || null, v.previsao ? `Previsão de conclusão: ${U.dataHora(v.previsao)}` : "Previsão removida"]);
    }
    if (v.observacoes !== undefined && String(v.observacoes).trim() !== os.observacoes) {
      if (String(v.observacoes).length > 600) erros.observacoes = "Use no máximo 600 caracteres.";
      else mudou.push(["observacoes", String(v.observacoes).trim(), "Observações atualizadas"]);
    }
    if (Object.keys(erros).length) return { ok: false, erros };
    if (!mudou.length) return { ok: true, nada: true };
    mudou.forEach(([k, val, txt]) => { os[k] = val; historico(os, "editada", txt); });
    L.salvar();
    return { ok: true, os };
  }

  // Item: { tipo: servico | peca | mao, refId, descricao, quantidade, unitario }
  function validarItem(v, erros) {
    const tipo = ["servico", "peca", "mao"].includes(v.tipo) ? v.tipo : null;
    if (!tipo) { erros.tipo = "Escolha o tipo do item."; return null; }
    let descricao = "";
    let unitario = null;
    let quantidade;
    if (tipo === "servico") {
      const s = L.servico(v.refId);
      if (!s) { erros.refId = "Escolha o serviço."; return null; }
      if (s.status !== "ativo") { erros.refId = "Este serviço está desativado e não entra em novos orçamentos."; return null; }
      descricao = `${s.codigo} · ${s.nome}`;
      unitario = s.preco;
      quantidade = L.inteiro(v.quantidade || "1", erros, "quantidade", { min: 1, max: 50, rotulo: "a quantidade" });
    } else if (tipo === "peca") {
      const p = L.peca(v.refId);
      if (!p) { erros.refId = "Escolha a peça."; return null; }
      if (p.status !== "ativo") { erros.refId = "Esta peça está desativada."; return null; }
      descricao = `${p.sku} · ${p.nome}`;
      unitario = p.preco;
      quantidade = L.inteiro(v.quantidade, erros, "quantidade", { min: 1, max: 500, rotulo: "a quantidade" });
    } else {
      descricao = L.texto(v.descricao, 80);
      if (descricao.length < 3) erros.descricao = "Descreva a mão de obra (ex.: Mão de obra adicional — vazamento).";
      unitario = d().oficina.orcamento.valorHora;
      const horas = U.lerValor(v.quantidade);
      if (!Number.isFinite(horas) || horas <= 0 || horas > 40 || Math.round(horas * 4) !== horas * 4) erros.quantidade = "Informe as horas em múltiplos de 0,25 (ex.: 1,5).";
      quantidade = horas;
    }
    if (String(v.unitario ?? "").trim() !== "" && U.lerValor(v.unitario) !== unitario) {
      if (!pode("precos")) erros.unitario = "Seu perfil usa o preço de referência do cadastro.";
      else unitario = L.dinheiro(v.unitario, erros, "unitario", { rotulo: "o valor unitário" });
    }
    if (Object.keys(erros).length) return null;
    return { id: L.novoId("i"), tipo, refId: tipo === "mao" ? null : v.refId, descricao, quantidade, unitario: U.arredondar(unitario), ...(tipo === "peca" ? { estado: "prevista", movimentoId: null } : {}) };
  }
  function adicionarItem(osId, v) {
    const os = L.ordem(osId);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    if (!pode("os_itens")) return negar("os_itens");
    if (!itensEditaveis(os)) return { ok: false, codigo: "itens_travados", erro: os.orcamentoId ? "Os itens já foram aprovados pelo cliente. Para incluir algo, crie uma revisão do orçamento (precisa de nova aprovação)." : "Nesta etapa os itens não podem mais ser alterados." };
    const erros = {};
    const item = validarItem(v, erros);
    if (!item) return { ok: false, erros };
    os.itens.push(item);
    historico(os, "item", `Item incluído: ${item.descricao} (${item.tipo === "mao" ? `${U.decimal(item.quantidade)} h` : `${item.quantidade}×`} ${U.moeda(item.unitario)})`);
    L.salvar();
    return { ok: true, item };
  }
  function removerItem(osId, itemId) {
    const os = L.ordem(osId);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    if (!pode("os_itens")) return negar("os_itens");
    if (!itensEditaveis(os)) return { ok: false, erro: "Os itens desta ordem não podem mais ser alterados." };
    const item = os.itens.find((i) => i.id === itemId);
    if (!item) return { ok: false, erro: "Item não encontrado." };
    os.itens = os.itens.filter((i) => i.id !== itemId);
    historico(os, "item", `Item removido: ${item.descricao}`);
    L.salvar();
    return { ok: true };
  }

  /* ---------- Status ---------- */
  const TRANSICOES = {
    aguardando_avaliacao: ["em_diagnostico", "cancelada"],
    em_diagnostico: ["aguardando_orcamento", "cancelada"],
    aguardando_orcamento: ["em_diagnostico", "cancelada"],
    aguardando_aprovacao: ["cancelada"],
    aguardando_pecas: ["cancelada"],
    aprovada: ["em_execucao", "cancelada"],
    em_execucao: ["aguardando_retirada", "cancelada"],
    aguardando_retirada: ["concluida"],
    concluida: ["entregue"],
    entregue: [],
    cancelada: [],
  };
  // O que impede cada passo (lista vazia = pode)
  function pendencias(os, novo) {
    const p = [];
    if (novo === "aguardando_orcamento" && String(os.diagnostico || "").trim().length < 10) p.push("Registre o diagnóstico técnico (pelo menos 10 letras).");
    if (novo === "em_execucao" && !os.tecnicoId) p.push("Designe o técnico responsável.");
    if (novo === "aguardando_retirada") {
      if (String(os.diagnostico || "").trim().length < 10) p.push("Registre o diagnóstico técnico.");
      if (!os.tecnicoId) p.push("Designe o técnico responsável.");
      if (!os.orcamentoId) p.push("A ordem precisa de um orçamento aprovado.");
      if (!os.itens.some((i) => i.tipo !== "peca")) p.push("Inclua pelo menos um serviço ou mão de obra.");
      if (os.itens.some((i) => i.tipo === "peca" && i.estado !== "reservada" && i.estado !== "baixada")) p.push("Há peças sem reserva (aguardando estoque).");
      if (orcamentoPendente(os)) p.push("Há uma revisão do orçamento aguardando o cliente.");
      os.itens.filter((i) => i.tipo === "peca" && i.estado === "reservada").forEach((i) => { if (saldo(i.refId) < i.quantidade) p.push(`Saldo físico insuficiente de ${i.descricao} (confira o inventário).`); });
    }
    if (novo === "concluida" && !os.finalizadaEm) p.push("Finalize o serviço antes de encerrar.");
    return p;
  }
  const proximos = (os) => (TRANSICOES[os.status] || []).map((s) => ({ status: s, pendencias: pendencias(os, s) }));
  const ACAO_STATUS = { cancelada: "os_cancelar", concluida: "os_encerrar", entregue: "os_entregar" };

  function mudarStatus(osId, novo, extras = {}) {
    L.sincronizar();
    const os = L.ordem(osId);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    const acao = ACAO_STATUS[novo] || "os_status";
    if (!pode(acao)) return negar(acao);
    if (!(TRANSICOES[os.status] || []).includes(novo)) return { ok: false, erro: `Não é possível passar de "${nomeStatus(os.status)}" para "${nomeStatus(novo)}".` };
    const pend = pendencias(os, novo);
    if (pend.length) return { ok: false, codigo: "pendencias", pendencias: pend, erro: `Antes: ${pend.join(" ")}` };
    const antes = os.status;
    const agora = U.agora();
    if (novo === "cancelada") {
      const motivo = String(extras.motivo || "").trim();
      if (motivo.length < 5) return { ok: false, erros: { motivo: "Explique o motivo do cancelamento." } };
      os.itens.forEach((i) => { if (i.tipo === "peca" && ["reservada", "falta", "prevista"].includes(i.estado)) i.estado = "liberada"; });
      d().orcamentos.forEach((o) => { if (o.osId === os.id && ["rascunho", "aguardando_aprovacao"].includes(o.status)) { o.status = "cancelado"; o.historico.push({ em: agora, acao: "cancelado", texto: `Cancelado junto com a ${os.numero}`, por: L.quem() }); } });
      os.cancelamento = { em: agora, motivo, por: L.quem() };
      os.status = "cancelada";
      cache.versao = -1;
      historico(os, "cancelada", `Ordem cancelada: ${motivo}. Peças reservadas foram liberadas.`);
    } else if (novo === "aguardando_retirada") {
      // Baixa das peças: uma única vez, no fim do serviço
      os.itens.forEach((i) => {
        if (i.tipo !== "peca" || i.estado !== "reservada") return;
        const mov = lancarMovimento({ pecaId: i.refId, tipo: "saida_os", quantidade: -i.quantidade, motivo: `Aplicada na ${os.numero}`, osId: os.id, osItemId: i.id, custoUnitario: (L.peca(i.refId) || {}).custo || 0 });
        i.estado = "baixada";
        i.movimentoId = mov.id;
      });
      os.finalizadaEm = agora;
      os.status = novo;
      cache.versao = -1;
      historico(os, "status", "Serviço finalizado: peças baixadas do estoque e veículo aguardando retirada");
      notificar("pronto", { osId: os.id, texto: `${os.numero}: ${L.mostrarPlaca(L.veiculo(os.veiculoId).placa)} pronto para retirada.` });
    } else if (novo === "concluida") {
      if (os.faturamento) return { ok: false, erro: "Esta ordem já foi encerrada e faturada." };
      os.faturamento = { em: agora, valor: totaisOS(os).total, por: L.quem() };
      os.concluidaEm = agora;
      os.status = novo;
      historico(os, "status", `Ordem encerrada e faturada: ${U.moeda(os.faturamento.valor)} a receber (pagamento registrado à parte)`);
    } else if (novo === "entregue") {
      const quemRetirou = L.texto(extras.retiradoPor, 60);
      if (quemRetirou.length < 3) return { ok: false, erros: { retiradoPor: "Informe quem retirou o veículo." } };
      const erros = {};
      const kmSaida = String(extras.kmSaida ?? "").trim() ? L.inteiro(extras.kmSaida, erros, "kmSaida", { min: 0, max: 2000000 }) : null;
      if (kmSaida != null && kmSaida < os.kmEntrada) erros.kmSaida = `Menor que a de entrada (${U.numero(os.kmEntrada)} km).`;
      if (Object.keys(erros).length) return { ok: false, erros };
      if (kmSaida != null) L.registrarKm(os.veiculoId, kmSaida, { origem: `Saída da ${os.numero}`, salvarAgora: false });
      Object.assign(os, { entregueEm: agora, kmSaida, retiradoPor: quemRetirou, status: novo });
      historico(os, "status", `Veículo entregue a ${quemRetirou}${kmSaida != null ? ` com ${U.numero(kmSaida)} km` : ""}`);
    } else {
      os.status = novo;
      historico(os, "status", `Status: ${nomeStatus(antes)} → ${nomeStatus(novo)}`);
    }
    if (novo !== "aguardando_retirada" && novo !== "cancelada") notificar("status", { osId: os.id, texto: `${os.numero}: ${nomeStatus(novo)}` });
    if (novo === "cancelada") notificar("status", { osId: os.id, texto: `${os.numero} cancelada` });
    L.salvar();
    return { ok: true, os };
  }

  /* ======================================================================
     ORÇAMENTOS
     ====================================================================== */
  const statusOrc = (o) => (o.status === "aguardando_aprovacao" && o.validade < U.hoje() ? "expirado" : o.status);
  const rotuloOrc = (o) => `${o.numero}${o.revisao > 1 ? ` rev. ${o.revisao}` : ""}`;
  // Todo item precisa de id próprio: é por ele que a baixa de estoque, os relatórios
  // e a remoção encontram o item certo (o editor de orçamento monta itens sem id).
  const copiarItens = (itens) => itens.map((i) => ({ ...i, id: i.id || L.novoId("i"), ...(i.tipo === "peca" ? { estado: "prevista", movimentoId: null } : {}) }));
  function novoOrcamento({ clienteId, veiculoId, osId = null, itens, desconto = 0, descontoAutorizadoPor = null, observacoes = "", validadeDias, enviar, origem = null }) {
    const agora = U.agora();
    let numero;
    let revisao = 1;
    if (origem) { numero = origem.numero; revisao = Math.max(...d().orcamentos.filter((o) => o.numero === origem.numero).map((o) => o.revisao)) + 1; }
    else { d().sequencias.orc = (d().sequencias.orc || 0) + 1; numero = `ORC-${String(d().sequencias.orc).padStart(4, "0")}`; }
    const dias = validadeDias || d().oficina.orcamento.validadeDias;
    const o = {
      id: L.novoId("q"), numero, revisao, origemId: origem ? origem.id : null, osId, clienteId, veiculoId, oficinaId: d().oficina.id,
      emitidoEm: U.hoje(), validade: U.somarDias(U.hoje(), dias), itens: copiarItens(itens), desconto, descontoAutorizadoPor, observacoes,
      status: enviar ? "aguardando_aprovacao" : "rascunho", aprovacao: null, recusa: null, cancelamento: null, criadoEm: agora, atualizadoEm: agora,
      historico: [{ em: agora, acao: "criado", texto: origem ? `Revisão ${revisao} criada a partir de ${rotuloOrc(origem)}` : "Orçamento criado", por: L.quem() }],
    };
    if (enviar) o.historico.push({ em: agora, acao: "enviado", texto: "Enviado para aprovação do cliente", por: L.quem() });
    d().orcamentos.push(o);
    return o;
  }
  function gerarOrcamento(osId, v = {}) {
    const os = L.ordem(osId);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    if (!pode("orc_criar")) return negar("orc_criar");
    if (os.orcamentoId) return { ok: false, erro: "Esta ordem já tem orçamento aprovado. Para mudar os itens, crie uma revisão." };
    if (!["em_diagnostico", "aguardando_orcamento"].includes(os.status)) return { ok: false, erro: "Gere o orçamento depois do diagnóstico (status Em diagnóstico ou Aguardando orçamento)." };
    if (orcamentoPendente(os)) return { ok: false, erro: "Já existe um orçamento desta ordem aguardando o cliente." };
    if (!os.itens.length) return { ok: false, erro: "Inclua os serviços e peças antes de gerar o orçamento." };
    if (String(os.diagnostico || "").trim().length < 10) return { ok: false, erro: "Registre o diagnóstico antes de gerar o orçamento." };
    const erros = {};
    const sub = totais(os.itens).subtotal;
    const desc = validarDesconto(sub, v.desconto, erros);
    const dias = String(v.validadeDias ?? "").trim() ? L.inteiro(v.validadeDias, erros, "validadeDias", { min: 1, max: 90, rotulo: "a validade" }) : null;
    if (Object.keys(erros).length) return { ok: false, erros };
    const o = novoOrcamento({ clienteId: os.clienteId, veiculoId: os.veiculoId, osId: os.id, itens: os.itens, desconto: desc.desconto, descontoAutorizadoPor: desc.autorizado, observacoes: L.texto(v.observacoes, 400), validadeDias: dias, enviar: v.enviar !== false });
    if (o.status === "aguardando_aprovacao") os.status = "aguardando_aprovacao";
    else if (os.status === "em_diagnostico") os.status = "aguardando_orcamento";
    historico(os, "orcamento", `Orçamento ${rotuloOrc(o)} ${o.status === "rascunho" ? "criado (rascunho)" : "enviado para aprovação"}: ${U.moeda(totaisOrc(o).total)}`);
    if (o.status === "aguardando_aprovacao") notificar("orcamento", { osId: os.id, orcId: o.id, texto: `${rotuloOrc(o)} aguardando aprovação: ${U.moeda(totaisOrc(o).total)}` });
    L.salvar();
    return { ok: true, orcamento: o };
  }
  // Orçamento avulso (sem ordem de serviço), por exemplo pedido por telefone
  function salvarOrcamento(v, id) {
    if (!pode("orc_criar")) return negar("orc_criar");
    const erros = {};
    const atual = id ? L.orcamento(id) : null;
    if (atual && atual.status !== "rascunho") return { ok: false, erro: "Só rascunhos podem ser editados. Orçamentos enviados ou aprovados não mudam: crie uma revisão." };
    const cli = L.cliente(v.clienteId);
    const vei = L.veiculo(v.veiculoId);
    if (!atual) {
      if (!cli) erros.clienteId = "Escolha o cliente.";
      if (!vei) erros.veiculoId = "Escolha o veículo.";
      else if (cli && vei.clienteId !== cli.id) erros.veiculoId = "Este veículo é de outro cliente.";
    }
    const itens = (v.itens || []).map((i) => ({ ...i }));
    if (!itens.length) erros.itens = "Inclua pelo menos um serviço, peça ou mão de obra.";
    itens.forEach((i) => {
      if (i.tipo === "servico") { const s = L.servico(i.refId); if (!s || (s.status !== "ativo" && !(atual && atual.itens.some((x) => x.refId === i.refId)))) erros.itens = "Há um serviço desativado na lista."; }
      if (i.tipo === "peca") { const p = L.peca(i.refId); if (!p || p.status !== "ativo") erros.itens = "Há uma peça desativada na lista."; }
      if (!(i.quantidade > 0) || !(i.unitario >= 0)) erros.itens = "Confira quantidades e valores dos itens.";
    });
    const sub = totais(itens).subtotal;
    const desc = validarDesconto(sub, v.desconto, erros);
    const dias = String(v.validadeDias ?? "").trim() ? L.inteiro(v.validadeDias, erros, "validadeDias", { min: 1, max: 90, rotulo: "a validade" }) : null;
    if (Object.keys(erros).length) return { ok: false, erros, erro: erros.itens };
    if (atual) {
      Object.assign(atual, { itens: copiarItens(itens), desconto: desc.desconto, descontoAutorizadoPor: desc.autorizado, observacoes: L.texto(v.observacoes, 400), atualizadoEm: U.agora() });
      if (dias) atual.validade = U.somarDias(atual.emitidoEm, dias);
      atual.historico.push({ em: U.agora(), acao: "editado", texto: `Rascunho alterado: ${U.moeda(totaisOrc(atual).total)}`, por: L.quem() });
      if (v.enviar) return enviarOrcamento(atual.id);
      L.salvar();
      return { ok: true, orcamento: atual };
    }
    const o = novoOrcamento({ clienteId: cli.id, veiculoId: vei.id, itens, desconto: desc.desconto, descontoAutorizadoPor: desc.autorizado, observacoes: L.texto(v.observacoes, 400), validadeDias: dias, enviar: !!v.enviar });
    if (o.status === "aguardando_aprovacao") notificar("orcamento", { orcId: o.id, texto: `${rotuloOrc(o)} aguardando aprovação: ${U.moeda(totaisOrc(o).total)}` });
    L.salvar();
    return { ok: true, orcamento: o };
  }
  function enviarOrcamento(id) {
    const o = L.orcamento(id);
    if (!o) return { ok: false, erro: "Orçamento não encontrado." };
    if (!pode("orc_criar")) return negar("orc_criar");
    if (o.status !== "rascunho") return { ok: false, erro: "Só rascunhos podem ser enviados." };
    if (!o.itens.length) return { ok: false, erro: "O orçamento está vazio." };
    o.status = "aguardando_aprovacao";
    if (o.validade < U.hoje()) o.validade = U.somarDias(U.hoje(), d().oficina.orcamento.validadeDias);
    o.historico.push({ em: U.agora(), acao: "enviado", texto: "Enviado para aprovação do cliente", por: L.quem() });
    const os = o.osId ? L.ordem(o.osId) : null;
    if (os && !os.orcamentoId && os.status === "aguardando_orcamento") { os.status = "aguardando_aprovacao"; historico(os, "orcamento", `${rotuloOrc(o)} enviado para aprovação`); }
    notificar("orcamento", { osId: o.osId, orcId: o.id, texto: `${rotuloOrc(o)} aguardando aprovação: ${U.moeda(totaisOrc(o).total)}` });
    L.salvar();
    return { ok: true, orcamento: o };
  }
  // Aplica o orçamento aprovado à OS: itens, desconto e reserva das peças
  function aplicarOrcamento(os, o) {
    os.itens.forEach((i) => { if (i.tipo === "peca" && ["reservada", "falta"].includes(i.estado)) i.estado = "liberada"; });
    cache.versao = -1;
    const anterior = os.orcamentoId && os.orcamentoId !== o.id ? L.orcamento(os.orcamentoId) : null;
    if (anterior && anterior.status === "aprovado") {
      anterior.status = "cancelado";
      anterior.cancelamento = { em: U.agora(), motivo: `Substituído pela revisão ${o.revisao}`, por: L.quem() };
      anterior.historico.push({ em: U.agora(), acao: "substituido", texto: `Substituído por ${rotuloOrc(o)}`, por: L.quem() });
    }
    os.itens = copiarItens(o.itens);
    os.desconto = o.desconto;
    os.orcamentoId = o.id;
    let falta = false;
    os.itens.forEach((i) => {
      if (i.tipo !== "peca") return;
      if (disponivel(i.refId) >= i.quantidade) { i.estado = "reservada"; cache.versao = -1; }
      else { i.estado = "falta"; falta = true; }
    });
    if (falta) {
      if (os.status !== "aguardando_pecas") os.retomarStatus = os.status === "em_execucao" ? "em_execucao" : "aprovada";
      os.status = "aguardando_pecas";
    } else if (["aguardando_aprovacao", "aguardando_pecas", "aguardando_orcamento", "em_diagnostico", "aguardando_avaliacao"].includes(os.status)) os.status = "aprovada";
    historico(os, "aprovado", `Orçamento ${rotuloOrc(o)} aprovado: ${U.moeda(totaisOrc(o).total)}. ${falta ? "Há peças em falta: ordem aguardando peças." : "Peças reservadas no estoque."}`);
  }
  function aprovarOrcamento(id, v = {}) {
    L.sincronizar();
    const o = L.orcamento(id);
    if (!o) return { ok: false, erro: "Orçamento não encontrado." };
    if (!pode("orc_aprovar")) return negar("orc_aprovar");
    if (o.status === "aprovado") return { ok: false, codigo: "ja_aprovado", erro: "Este orçamento já foi aprovado." };
    const st = statusOrc(o);
    if (st === "expirado") return { ok: false, erro: `Este orçamento venceu em ${U.dataCompleta(o.validade)}. Crie uma revisão com nova validade.` };
    if (st !== "aguardando_aprovacao") return { ok: false, erro: "Só orçamentos aguardando aprovação podem ser aprovados." };
    const erros = {};
    const por = L.texto(v.por, 60);
    if (por.length < 3) erros.por = "Informe quem aprovou (nome do cliente ou responsável).";
    if (!NX.CANAIS_APROVACAO.includes(v.canal)) erros.canal = "Escolha como a aprovação foi feita.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const agora = U.agora();
    o.status = "aprovado";
    o.aprovacao = { em: agora, por, canal: v.canal, observacao: L.texto(v.observacao, 200), registradoPor: L.quem(), total: totaisOrc(o).total };
    o.atualizadoEm = agora;
    o.historico.push({ em: agora, acao: "aprovado", texto: `Aprovação registrada: ${por} (${v.canal}). Registro interno, sem assinatura digital.`, por: L.quem() });
    const os = o.osId ? L.ordem(o.osId) : null;
    if (os) aplicarOrcamento(os, o);
    notificar("status", { osId: o.osId, orcId: o.id, texto: `${rotuloOrc(o)} aprovado por ${por}` });
    L.salvar();
    return { ok: true, orcamento: o, os };
  }
  function recusarOrcamento(id, v = {}) {
    const o = L.orcamento(id);
    if (!o) return { ok: false, erro: "Orçamento não encontrado." };
    if (!pode("orc_aprovar")) return negar("orc_aprovar");
    if (statusOrc(o) !== "aguardando_aprovacao") return { ok: false, erro: "Só orçamentos aguardando aprovação podem ser recusados." };
    const motivo = String(v.motivo || "").trim();
    if (motivo.length < 3) return { ok: false, erros: { motivo: "Informe o motivo da recusa." } };
    const agora = U.agora();
    o.status = "recusado";
    o.recusa = { em: agora, motivo: motivo.slice(0, 200), por: L.quem() };
    o.historico.push({ em: agora, acao: "recusado", texto: `Recusado pelo cliente: ${motivo}`, por: L.quem() });
    const os = o.osId ? L.ordem(o.osId) : null;
    if (os) {
      if (!os.orcamentoId && os.status === "aguardando_aprovacao") os.status = "aguardando_orcamento";
      historico(os, "recusado", `Orçamento ${rotuloOrc(o)} recusado: ${motivo}${os.orcamentoId ? ". Os itens já aprovados continuam valendo." : ""}`);
    }
    notificar("status", { osId: o.osId, orcId: o.id, texto: `${rotuloOrc(o)} recusado` });
    L.salvar();
    return { ok: true, orcamento: o };
  }
  function cancelarOrcamento(id, v = {}) {
    const o = L.orcamento(id);
    if (!o) return { ok: false, erro: "Orçamento não encontrado." };
    if (!pode("orc_criar")) return negar("orc_criar");
    if (!["rascunho", "aguardando_aprovacao"].includes(o.status)) return { ok: false, erro: "Só rascunhos e orçamentos aguardando aprovação podem ser cancelados." };
    const motivo = String(v.motivo || "").trim();
    if (motivo.length < 3) return { ok: false, erros: { motivo: "Informe o motivo." } };
    o.status = "cancelado";
    o.cancelamento = { em: U.agora(), motivo, por: L.quem() };
    o.historico.push({ em: U.agora(), acao: "cancelado", texto: `Cancelado: ${motivo}`, por: L.quem() });
    const os = o.osId ? L.ordem(o.osId) : null;
    if (os && !os.orcamentoId && os.status === "aguardando_aprovacao") os.status = "aguardando_orcamento";
    L.salvar();
    return { ok: true };
  }
  // Revisão: nova versão (rascunho) a partir de um orçamento aprovado, recusado ou vencido
  function revisarOrcamento(id) {
    const o = L.orcamento(id);
    if (!o) return { ok: false, erro: "Orçamento não encontrado." };
    if (!pode("orc_criar")) return negar("orc_criar");
    const st = statusOrc(o);
    if (!["aprovado", "recusado", "expirado"].includes(st)) return { ok: false, erro: "Revisões partem de um orçamento aprovado, recusado ou vencido." };
    const os = o.osId ? L.ordem(o.osId) : null;
    if (os && ["aguardando_retirada", "concluida", "entregue", "cancelada"].includes(os.status)) return { ok: false, erro: `A ${os.numero} já está ${nomeStatus(os.status).toLowerCase()}: não cabe revisão.` };
    if (os && orcamentoPendente(os)) return { ok: false, erro: "Já existe uma revisão desta ordem em andamento." };
    const ultima = d().orcamentos.filter((x) => x.numero === o.numero).sort((a, b) => b.revisao - a.revisao)[0];
    if (ultima.id !== o.id && ["rascunho", "aguardando_aprovacao"].includes(ultima.status)) return { ok: false, erro: `Já existe a revisão ${ultima.revisao} em andamento.` };
    if (st === "expirado") { o.status = "cancelado"; o.cancelamento = { em: U.agora(), motivo: "Vencido; substituído por revisão", por: L.quem() }; }
    const nova = novoOrcamento({ clienteId: o.clienteId, veiculoId: o.veiculoId, osId: o.osId, itens: o.itens, desconto: o.desconto, observacoes: o.observacoes, enviar: false, origem: o });
    if (os) historico(os, "orcamento", `Revisão ${nova.revisao} do orçamento criada (rascunho)`);
    L.salvar();
    return { ok: true, orcamento: nova };
  }

  /* ======================================================================
     RECEBIMENTOS (registro manual; nada é cobrado)
     ====================================================================== */
  const recebido = (os) => U.arredondar(os.recebimentos.filter((r) => !r.estorno).reduce((t, r) => t + r.valor, 0));
  const aReceber = (os) => (os.faturamento ? U.arredondar(os.faturamento.valor - recebido(os)) : 0);
  function situacaoFinanceira(os) {
    if (os.status === "cancelada") return "cancelada";
    if (!os.faturamento) return os.finalizadaEm ? "a_faturar" : "em_aberto";
    const r = recebido(os);
    if (r <= 0) return "a_receber";
    if (r + 0.001 < os.faturamento.valor) return "parcial";
    return "pago";
  }
  const tokens = new Set();
  function registrarRecebimento(osId, v) {
    if (!pode("recebimento")) return negar("recebimento");
    L.sincronizar();
    const os = L.ordem(osId);
    if (!os) return { ok: false, erro: "Ordem não encontrada." };
    if (v.token && (tokens.has(v.token) || os.recebimentos.some((r) => r.token === v.token))) return { ok: false, duplicado: true, erro: "Este recebimento já foi registrado. Nada foi lançado de novo." };
    if (!os.faturamento) return { ok: false, erro: "Encerre a ordem (faturar) antes de registrar o pagamento." };
    const erros = {};
    const valor = L.dinheiro(v.valor, erros, "valor", { rotulo: "o valor recebido" });
    const falta = aReceber(os);
    if (valor != null && valor <= 0) erros.valor = "O valor precisa ser maior que zero.";
    else if (valor != null && valor > falta + 0.001) erros.valor = falta <= 0 ? "Esta ordem já está paga." : `Maior que o valor em aberto (${U.moeda(falta)}).`;
    if (!NX.FORMAS_PAGAMENTO.includes(v.forma)) erros.forma = "Escolha a forma de pagamento.";
    if (!U.dataValida(v.data)) erros.data = "Informe a data.";
    else if (v.data > U.hoje()) erros.data = "A data não pode estar no futuro.";
    else if (v.data < os.faturamento.em.slice(0, 10)) erros.data = "A data não pode ser anterior ao faturamento.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const rec = { id: L.novoId("r"), valor, forma: v.forma, data: v.data, observacao: L.texto(v.observacao, 120), por: L.quem(), em: U.agora(), token: v.token || null, estorno: null };
    os.recebimentos.push(rec);
    if (v.token) tokens.add(v.token);
    historico(os, "recebimento", `Recebimento registrado: ${U.moeda(valor)} (${v.forma})${aReceber(os) > 0 ? `. Falta ${U.moeda(aReceber(os))}.` : ". Ordem quitada."}`);
    L.salvar();
    return { ok: true, recebimento: rec };
  }
  function estornarRecebimento(osId, recId, motivo) {
    if (!pode("recebimento")) return negar("recebimento");
    const os = L.ordem(osId);
    const rec = os && os.recebimentos.find((r) => r.id === recId);
    if (!rec || rec.estorno) return { ok: false, erro: "Recebimento não encontrado." };
    if (String(motivo || "").trim().length < 5) return { ok: false, erros: { motivo: "Explique por que o registro está sendo desfeito." } };
    rec.estorno = { em: U.agora(), motivo: String(motivo).trim().slice(0, 200), por: L.quem() };
    historico(os, "recebimento", `Recebimento de ${U.moeda(rec.valor)} desfeito: ${rec.estorno.motivo}`);
    L.salvar();
    return { ok: true };
  }

  /* ======================================================================
     DESPESAS
     ====================================================================== */
  function salvarDespesa(v, id) {
    if (!pode("despesas")) return negar("despesas");
    const erros = {};
    const descricao = L.texto(v.descricao, 80);
    if (descricao.length < 3) erros.descricao = "Descreva a despesa.";
    if (!NX.CATEGORIAS_DESPESA.includes(v.categoria)) erros.categoria = "Escolha a categoria.";
    const valor = L.dinheiro(v.valor, erros, "valor", { rotulo: "o valor" });
    if (valor === 0) erros.valor = "O valor precisa ser maior que zero.";
    if (!U.dataValida(v.data)) erros.data = "Informe a data.";
    if (v.pago && (!U.dataValida(v.pagoEm) || v.pagoEm > U.hoje())) erros.pagoEm = "Informe a data do pagamento (hoje ou antes).";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { descricao, categoria: v.categoria, valor, data: v.data, status: v.pago ? "pago" : "a_pagar", pagoEm: v.pago ? v.pagoEm : null, fornecedorId: v.fornecedorId || null, observacao: L.texto(v.observacao, 200) };
    if (id) { const x = L.despesa(id); if (x.status === "cancelada") return { ok: false, erro: "Despesa cancelada não pode ser alterada." }; Object.assign(x, limpo); L.salvar(); return { ok: true, id }; }
    const nova = { id: L.novoId("d"), ...limpo, movimentoId: null, criadoEm: U.agora(), por: L.quem() };
    d().despesas.push(nova);
    L.salvar();
    return { ok: true, id: nova.id };
  }
  function pagarDespesa(id, data) {
    if (!pode("despesas")) return negar("despesas");
    const x = L.despesa(id);
    if (!x || x.status !== "a_pagar") return { ok: false, erro: "Só despesas a pagar podem ser marcadas como pagas." };
    if (!U.dataValida(data) || data > U.hoje()) return { ok: false, erros: { data: "Informe a data do pagamento (hoje ou antes)." } };
    Object.assign(x, { status: "pago", pagoEm: data });
    L.salvar();
    return { ok: true };
  }
  function cancelarDespesa(id, motivo) {
    if (!pode("despesas")) return negar("despesas");
    const x = L.despesa(id);
    if (!x || x.status === "cancelada") return { ok: false, erro: "Despesa não encontrada." };
    if (String(motivo || "").trim().length < 5) return { ok: false, erros: { motivo: "Explique o cancelamento." } };
    Object.assign(x, { status: "cancelada", cancelamento: { em: U.agora(), motivo: String(motivo).trim(), por: L.quem() } });
    L.salvar();
    return { ok: true };
  }

  /* ======================================================================
     AGENDA (técnicos e boxes são recursos limitados)
     ====================================================================== */
  const sobrepoe = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
  function conflitos(c, ignorarId) {
    return d().agenda.filter((x) => x.id !== ignorarId && x.status !== "cancelado" && x.data === c.data && sobrepoe(c.inicio, c.fim, x.inicio, x.fim)
      && ((c.tecnicoId && x.tecnicoId === c.tecnicoId) || (c.box && x.box === c.box)));
  }
  function salvarCompromisso(v, id) {
    if (!pode("agenda")) return negar("agenda");
    L.sincronizar();
    const erros = {};
    const atual = id ? L.compromisso(id) : null;
    const tipo = NX.TIPOS_AGENDA.find((t) => t.id === v.tipo);
    if (!tipo) erros.tipo = "Escolha o tipo.";
    if (!U.dataValida(v.data)) erros.data = "Informe a data.";
    if (!U.horaValida(v.inicio) || !U.horaValida(v.fim) || v.inicio >= v.fim) erros.inicio = "Informe início e fim (início antes do fim).";
    if (!erros.data && !erros.inicio) {
      const h = d().oficina.horarios[U.diaDaSemana(v.data)];
      if (!h) erros.data = `A oficina não abre ${NX.DIAS[U.diaDaSemana(v.data)].toLowerCase()}.`;
      else if (v.inicio < h.abre || v.fim > h.fecha) erros.inicio = `Fora do horário de funcionamento (${h.abre}–${h.fecha}).`;
      if (!atual && `${v.data}T${v.inicio}` <= U.agora()) erros.data = "Não é possível agendar em horário que já passou.";
    }
    const tec = v.tecnicoId ? L.membro(v.tecnicoId) : null;
    if (v.tecnicoId && (!tec || !tec.tecnico || tec.status !== "ativo")) erros.tecnicoId = "Escolha um técnico ativo.";
    const box = v.box ? Number(v.box) : null;
    if (box && (box < 1 || box > d().oficina.boxes)) erros.box = "Box inválido.";
    const cli = v.clienteId ? L.cliente(v.clienteId) : null;
    const vei = v.veiculoId ? L.veiculo(v.veiculoId) : null;
    if (v.clienteId && !cli) erros.clienteId = "Cliente não encontrado.";
    if (vei && cli && vei.clienteId !== cli.id) erros.veiculoId = "Este veículo é de outro cliente.";
    const os = v.osId ? L.ordem(v.osId) : null;
    if (v.osId && !os) erros.osId = "Ordem não encontrada.";
    if (tipo && tipo.recurso === "tecnico" && !v.tecnicoId) erros.tecnicoId = "Escolha o técnico que ficará indisponível.";
    else if (tipo && tipo.recurso === "obrigatorio" && !v.tecnicoId && !box) erros.tecnicoId = "Escolha o técnico ou o box (são eles que não podem estar ocupados duas vezes).";
    if (Object.keys(erros).length) return { ok: false, erros };
    const c = { tipo: v.tipo, data: v.data, inicio: v.inicio, fim: v.fim, tecnicoId: tec ? tec.id : null, box, clienteId: cli ? cli.id : (os ? os.clienteId : null), veiculoId: vei ? vei.id : (os ? os.veiculoId : null), osId: os ? os.id : null, observacoes: L.texto(v.observacoes, 200) };
    const choque = conflitos(c, id);
    if (choque.length) {
      const x = choque[0];
      const recurso = c.tecnicoId && x.tecnicoId === c.tecnicoId ? (L.membro(c.tecnicoId) || {}).nome : `Box ${c.box}`;
      return { ok: false, codigo: "conflito", erros: { inicio: `${recurso} já está ocupado das ${x.inicio} às ${x.fim} (${(NX.TIPOS_AGENDA.find((t) => t.id === x.tipo) || {}).nome}).` }, erro: "Conflito de horário: escolha outro horário, técnico ou box." };
    }
    if (atual) { Object.assign(atual, c, { atualizadoEm: U.agora() }); L.salvar(); return { ok: true, compromisso: atual }; }
    const novo = { id: L.novoId("g"), ...c, status: "marcado", criadoEm: U.agora(), por: L.quem() };
    d().agenda.push(novo);
    L.salvar();
    return { ok: true, compromisso: novo };
  }
  function mudarCompromisso(id, status, motivo) {
    if (!pode("agenda")) return negar("agenda");
    const c = L.compromisso(id);
    if (!c || c.status !== "marcado") return { ok: false, erro: "Compromisso não encontrado ou já encerrado." };
    if (!["realizado", "nao_compareceu", "cancelado"].includes(status)) return { ok: false, erro: "Situação inválida." };
    if (status !== "cancelado" && `${c.data}T${c.inicio}` > U.agora()) return { ok: false, erro: "Este horário ainda não chegou." };
    if (status === "cancelado" && String(motivo || "").trim().length < 3) return { ok: false, erros: { motivo: "Informe o motivo." } };
    c.status = status;
    c.situacaoEm = U.agora();
    c.situacaoPor = L.quem();
    if (status === "cancelado") c.cancelamento = { em: U.agora(), motivo: String(motivo).trim(), por: L.quem() };
    L.salvar();
    return { ok: true };
  }
  // Previsões de conclusão (das ordens abertas): aparecem na agenda, mas não ocupam técnico nem box
  const previsoes = (de, ate) => d().ordens.filter((os) => os.previsao && ABERTAS.includes(os.status) && !PRONTAS.includes(os.status) && os.previsao.slice(0, 10) >= de && os.previsao.slice(0, 10) <= ate);

  /* ======================================================================
     ALERTAS CALCULADOS (o que pede atenção agora)
     ====================================================================== */
  function alertas() {
    const vistos = new Set(d().alertasVistos || []);
    const agora = U.agora();
    const limite = (() => { const dt = U.somarDias(agora.slice(0, 10), 1); return `${dt}T${agora.slice(11)}`; })();
    const lista = [];
    d().pecas.forEach((p) => {
      const s = situacaoPeca(p);
      if (s === "baixo" || s === "zerado") lista.push({ chave: `estoque:${p.id}:${saldo(p.id)}`, tipo: "estoque", titulo: s === "zerado" ? `Sem estoque: ${p.nome}` : `Estoque baixo: ${p.nome}`, texto: `Saldo ${saldo(p.id)} · mínimo ${p.minimo}${reservado(p.id) ? ` · ${reservado(p.id)} reservadas` : ""}`, rota: `estoque/${p.id}` });
    });
    d().ordens.forEach((os) => {
      const v = L.veiculo(os.veiculoId);
      if (os.previsao && ABERTAS.includes(os.status) && !PRONTAS.includes(os.status) && os.previsao <= limite) lista.push({ chave: `previsao:${os.id}:${os.previsao}`, tipo: "previsao", titulo: os.previsao < agora ? `Previsão vencida: ${os.numero}` : `Previsão próxima: ${os.numero}`, texto: `${L.mostrarPlaca(v.placa)} · ${U.dataHoraCurta(os.previsao)} · ${nomeStatus(os.status)}`, rota: `ordens/${os.id}` });
      if (PRONTAS.includes(os.status)) lista.push({ chave: `pronto:${os.id}`, tipo: "pronto", titulo: `Pronto para retirada: ${os.numero}`, texto: `${L.mostrarPlaca(v.placa)} · ${(L.cliente(os.clienteId) || {}).nome}`, rota: `ordens/${os.id}` });
    });
    d().orcamentos.forEach((o) => {
      if (statusOrc(o) === "aguardando_aprovacao") lista.push({ chave: `orc:${o.id}`, tipo: "orcamento", titulo: `Aguardando aprovação: ${rotuloOrc(o)}`, texto: `${(L.cliente(o.clienteId) || {}).nome} · ${U.moeda(totaisOrc(o).total)} · vence ${U.dataCurta(o.validade)}`, rota: `orcamentos/${o.id}` });
    });
    const ordem = { previsao: 0, pronto: 1, orcamento: 2, estoque: 3 };
    return lista.map((a) => ({ ...a, visto: vistos.has(a.chave) })).sort((a, b) => a.visto - b.visto || ordem[a.tipo] - ordem[b.tipo]);
  }
  function marcarAlertasVistos(chaves) {
    const s = new Set(d().alertasVistos || []);
    chaves.forEach((c) => s.add(c));
    d().alertasVistos = [...s].slice(-500);
    L.salvar();
  }
  function marcarNotificacoesLidas(ids) {
    const s = new Set(ids);
    d().notificacoes.forEach((n) => { if (s.has(n.id)) n.lida = true; });
    L.salvar();
  }

  /* ======================================================================
     MENSAGENS PARA O CLIENTE (texto pronto; nada é enviado sozinho)
     ====================================================================== */
  function mensagem(tipo, { os, orc }) {
    const of = d().oficina;
    const ref = os || orc;
    const c = L.cliente(ref.clienteId) || { nome: "cliente" };
    const v = L.veiculo(ref.veiculoId) || { placa: "", modelo: "" };
    const nome = c.nome.split(" ")[0];
    const carro = `${v.modelo} ${L.mostrarPlaca(v.placa)}`.trim();
    if (tipo === "orcamento") return `Olá, ${nome}! Segue o orçamento ${rotuloOrc(orc)} do ${carro}: total ${U.moeda(totaisOrc(orc).total)}, válido até ${U.dataCompleta(orc.validade)}. Responda esta mensagem para aprovar ou tirar dúvidas. ${of.nome}`;
    if (tipo === "pronto") return `Olá, ${nome}! O ${carro} está pronto para retirada (${os.numero}). Total: ${U.moeda(totaisOS(os).total)}. Horário: ${of.horarioTexto || "consulte a oficina"}. ${of.nome}`;
    if (tipo === "status") return `Olá, ${nome}! Atualização da ${os.numero} (${carro}): ${nomeStatus(os.status)}.${os.previsao ? ` Previsão: ${U.dataHora(os.previsao)}.` : ""} ${of.nome}`;
    return `Olá, ${nome}! ${of.nome}`;
  }
  function linkWhatsapp(clienteId, texto) {
    const c = L.cliente(clienteId);
    if (!c || c.ficticio) return null;           // nunca para clientes de exemplo: o número poderia existir
    return `https://wa.me/55${c.telefone}?text=${encodeURIComponent(texto)}`;
  }

  /* ======================================================================
     CONFERÊNCIA GERAL (usada nos testes e em Configurações)
     ====================================================================== */
  function conferir() {
    const problemas = [];
    const saldos = new Map();
    [...d().movimentos].sort((a, b) => a.numero - b.numero).forEach((m) => {
      const s = (saldos.get(m.pecaId) || 0) + m.quantidade;
      if (s < 0) problemas.push(`Saldo negativo em ${m.pecaId} na movimentação ${m.numero}`);
      saldos.set(m.pecaId, s);
    });
    const baixas = new Set();
    d().movimentos.filter((m) => m.tipo === "saida_os").forEach((m) => { if (baixas.has(m.osItemId)) problemas.push(`Baixa duplicada do item ${m.osItemId}`); baixas.add(m.osItemId); });
    d().movimentos.filter((m) => m.tipo === "saida_os" && !m.osItemId).forEach((m) => problemas.push(`Baixa ${m.numero} sem item de OS`));
    d().orcamentos.forEach((o) => { const ids = new Set(); o.itens.forEach((i) => { if (!i.id || ids.has(i.id)) problemas.push(`${o.numero}: item sem identificador próprio`); ids.add(i.id); }); });
    d().ordens.forEach((os) => {
      const ids = new Set();
      os.itens.forEach((i) => {
        if (!i.id || ids.has(i.id)) problemas.push(`${os.numero}: item sem identificador próprio`);
        ids.add(i.id);
        if (i.tipo === "peca" && i.estado === "baixada" && !d().movimentos.some((m) => m.id === i.movimentoId && m.osItemId === i.id)) problemas.push(`${os.numero}: item baixado sem movimentação`);
        if (i.tipo === "peca" && i.estado === "reservada" && !["aprovada", "em_execucao", "aguardando_pecas", "aguardando_aprovacao"].includes(os.status)) problemas.push(`${os.numero}: reserva em status ${os.status}`);
      });
      if (os.faturamento && recebido(os) > os.faturamento.valor + 0.001) problemas.push(`${os.numero}: recebido maior que o faturado`);
      if (["aguardando_retirada", "concluida", "entregue"].includes(os.status) && os.itens.some((i) => i.tipo === "peca" && i.estado !== "baixada")) problemas.push(`${os.numero}: finalizada com peça sem baixa`);
      const v = L.veiculo(os.veiculoId);
      if (!v || !L.cliente(os.clienteId)) problemas.push(`${os.numero}: cliente ou veículo inexistente`);
    });
    L.dados.pecas.forEach((p) => { if (reservado(p.id) > saldo(p.id)) problemas.push(`${p.sku}: reservado (${reservado(p.id)}) maior que o saldo (${saldo(p.id)})`); });
    // Vínculos: nada pode apontar para cliente ou veículo que não existe (por exemplo, depois de uma exclusão)
    d().veiculos.forEach((v) => {
      if (!L.cliente(v.clienteId)) problemas.push(`Veículo ${v.placa}: cliente inexistente`);
      (v.historicoDono || []).forEach((h) => { if (!L.cliente(h.clienteId)) problemas.push(`Veículo ${v.placa}: antigo responsável inexistente`); });
    });
    d().orcamentos.forEach((o) => { if (!L.cliente(o.clienteId) || !L.veiculo(o.veiculoId)) problemas.push(`${o.numero}: cliente ou veículo inexistente`); });
    d().agenda.forEach((c) => {
      if (c.clienteId && !L.cliente(c.clienteId)) problemas.push(`Agenda ${c.id}: cliente inexistente`);
      if (c.veiculoId && !L.veiculo(c.veiculoId)) problemas.push(`Agenda ${c.id}: veículo inexistente`);
    });
    const ag = d().agenda.filter((c) => c.status !== "cancelado");
    ag.forEach((c, i) => ag.slice(i + 1).forEach((x) => { if (x.data === c.data && sobrepoe(c.inicio, c.fim, x.inicio, x.fim) && ((c.tecnicoId && c.tecnicoId === x.tecnicoId) || (c.box && c.box === x.box))) problemas.push(`Agenda: conflito ${c.id} × ${x.id} em ${c.data}`); }));
    return { ok: !problemas.length, problemas };
  }

  /* ======================================================================
     INDICADORES (dashboard, financeiro e relatórios)
     ====================================================================== */
  const noPeriodo = (dt, de, ate) => !!dt && dt.slice(0, 10) >= de && dt.slice(0, 10) <= ate;
  function resumoFinanceiro(de, ate) {
    return memo(`fin:${de}:${ate}`, () => {
      const ordens = d().ordens;
      const aprovados = d().orcamentos.filter((o) => o.aprovacao && noPeriodo(o.aprovacao.em, de, ate));
      const executadas = ordens.filter((os) => noPeriodo(os.finalizadaEm, de, ate));
      const faturadas = ordens.filter((os) => os.faturamento && noPeriodo(os.faturamento.em, de, ate));
      const recebimentos = ordens.flatMap((os) => os.recebimentos.filter((r) => !r.estorno && noPeriodo(r.data, de, ate)).map((r) => ({ ...r, os })));
      const despesas = d().despesas.filter((x) => x.status !== "cancelada" && noPeriodo(x.data, de, ate));
      const custoPecas = d().movimentos.filter((m) => m.tipo === "saida_os" && noPeriodo(m.data, de, ate)).reduce((t, m) => t + -m.quantidade * (m.custoUnitario || 0), 0);
      const soma = (lista, f) => U.arredondar(lista.reduce((t, x) => t + f(x), 0));
      const exec = executadas.map((os) => totaisOS(os));
      return {
        aprovado: soma(aprovados, (o) => o.aprovacao.total), aprovadosQtd: aprovados.length,
        executado: soma(exec, (t) => t.total), executadasQtd: executadas.length,
        maoDeObra: soma(exec, (t) => t.maoDeObra), pecas: soma(exec, (t) => t.pecas),
        faturado: soma(faturadas, (os) => os.faturamento.valor), faturadasQtd: faturadas.length,
        recebido: soma(recebimentos, (r) => r.valor), recebimentosQtd: recebimentos.length,
        despesasPagas: soma(despesas.filter((x) => x.status === "pago"), (x) => x.valor), despesasAPagar: soma(despesas.filter((x) => x.status === "a_pagar"), (x) => x.valor),
        custoPecas: U.arredondar(custoPecas),
        aReceberTotal: soma(ordens.filter((os) => os.faturamento && os.status !== "cancelada"), (os) => aReceber(os)),
        aFaturar: soma(ordens.filter((os) => os.finalizadaEm && !os.faturamento && os.status !== "cancelada"), (os) => totaisOS(os).total),
      };
    });
  }

  NX.oficina = {
    papel, perfilAtual, pode, podeVer, negar,
    valorItem, totais, totaisOS, totaisOrc, validarDesconto,
    saldo, reservado, disponivel, situacaoPeca, movimentosDaPeca, lancarMovimento, registrarEntrada, registrarSaida, registrarAjuste, reservarPendentes,
    ABERTAS, NA_OFICINA, PRONTAS, EDITA_ITENS, PODE_CANCELAR, TRANSICOES, nomeStatus, itensEditaveis, orcamentoAprovado, orcamentoPendente, osAbertaDoVeiculo,
    abrirOS, editarOS, adicionarItem, removerItem, validarItem, pendencias, proximos, mudarStatus,
    statusOrc, rotuloOrc, gerarOrcamento, salvarOrcamento, enviarOrcamento, aprovarOrcamento, recusarOrcamento, cancelarOrcamento, revisarOrcamento,
    recebido, aReceber, situacaoFinanceira, registrarRecebimento, estornarRecebimento,
    salvarDespesa, pagarDespesa, cancelarDespesa,
    conflitos, salvarCompromisso, mudarCompromisso, previsoes,
    alertas, marcarAlertasVistos, marcarNotificacoesLidas, notificar, mensagem, linkWhatsapp,
    conferir, noPeriodo, resumoFinanceiro, memo,
  };
})();
