/* ==========================================================================
   NEXORA BOOKING — loja.js
   Guarda os dados e os CADASTROS (clientes, serviços, profissionais,
   expediente, feriados, bloqueios e configurações). As regras de horário
   ficam em regras.js e as ações sobre reservas em agenda.js.

   DEMONSTRAÇÃO LOCAL: tudo fica no localStorage deste navegador, e o painel
   e a página pública leem o mesmo armazenamento. Não há servidor, banco de
   dados, login nem sincronização entre aparelhos. Antes de gravar uma
   reserva, os dados são relidos do armazenamento (sincronizar) para pegar
   mudanças feitas em outra aba, mas isso NÃO substitui uma trava real no
   servidor: num sistema de produção a conferência de conflito precisa
   acontecer de novo no banco de dados, dentro de uma transação.

   Os dados já carregam o id do estabelecimento ("est1") para que, no
   futuro, cada empresa tenha os seus registros separados no servidor.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const CHAVE = "nexora-booking:dados";
  const VERSAO = 1;
  const FUSO_PADRAO = "America/Sao_Paulo";
  const ouvintes = new Set();
  let dados = null;
  let persistente = true;
  let versao = 0;

  /* ---------- Carregar, salvar, sincronizar ---------- */
  function lerArmazenado() {
    try {
      const texto = localStorage.getItem(CHAVE);
      const lido = texto ? JSON.parse(texto) : null;
      return lido && lido.versao === VERSAO && Array.isArray(lido.agendamentos) && lido.estabelecimento ? lido : null;
    } catch (e) { persistente = false; return null; }
  }
  function carregar() {
    const lido = lerArmazenado();
    if (lido) { dados = lido; U.definirFuso(dados.estabelecimento.fuso || FUSO_PADRAO); versao += 1; return; }
    U.definirFuso(FUSO_PADRAO);
    dados = NX.criarDadosDemo();
    versao += 1;
    gravar();
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); persistente = true; return true; } catch (e) { persistente = false; return false; }
  }
  function salvar(avisar = true) {
    dados.revisao = (dados.revisao || 0) + 1;
    versao += 1;
    const ok = gravar();
    if (avisar) ouvintes.forEach((fn) => fn());
    return ok;
  }
  // Relê o armazenamento: se outra aba gravou algo mais novo, passa a usar esses dados
  function sincronizar() {
    const lido = lerArmazenado();
    if (lido && (lido.revisao || 0) > (dados.revisao || 0)) {
      dados = lido;
      U.definirFuso(dados.estabelecimento.fuso || FUSO_PADRAO);
      versao += 1;
      return true;
    }
    return false;
  }
  function restaurar() {
    U.definirFuso(FUSO_PADRAO);
    const revisaoAtual = dados ? dados.revisao || 0 : 0;
    dados = NX.criarDadosDemo();
    dados.revisao = revisaoAtual;
    salvar();
  }
  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      if (e.key !== CHAVE || !e.newValue) return;
      try { dados = JSON.parse(e.newValue); U.definirFuso(dados.estabelecimento.fuso || FUSO_PADRAO); versao += 1; ouvintes.forEach((fn) => fn()); } catch (erro) { /* ignora */ }
    });
  }
  const tamanhoSalvo = () => { try { return (localStorage.getItem(CHAVE) || "").length; } catch (e) { return 0; } };
  const novoId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  /* ---------- Consultas ---------- */
  const cliente = (id) => dados.clientes.find((x) => x.id === id);
  const servico = (id) => dados.servicos.find((x) => x.id === id);
  const profissional = (id) => dados.profissionais.find((x) => x.id === id);
  const agendamento = (id) => dados.agendamentos.find((x) => x.id === id);
  const porCodigo = (codigo) => dados.agendamentos.find((x) => x.codigo === String(codigo || "").trim().toUpperCase());
  const igual = (a, b) => U.semAcento(a).replace(/\s+/g, " ").trim() === U.semAcento(b).replace(/\s+/g, " ").trim();
  const clientePorTelefone = (tel) => { const n = U.digitos(tel); return n ? dados.clientes.find((c) => c.telefone === n) : null; };
  const categorias = () => [...new Set(dados.servicos.map((s) => s.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const textoMudou = (v, max) => String(v || "").trim().slice(0, max);

  /* ---------- Clientes ---------- */
  // publico: na página de agendamento não se informa que um e-mail já existe (não expõe outros clientes)
  function validarCliente(v, id, { publico } = {}) {
    const erros = {};
    const nome = String(v.nome || "").trim().replace(/\s+/g, " ");
    if (nome.length < 3) erros.nome = "Informe o nome (pelo menos 3 letras).";
    else if (nome.length > 80) erros.nome = "Use no máximo 80 caracteres.";
    const tel = U.digitos(v.telefone);
    if (!U.telefoneValido(tel)) erros.telefone = "Informe o telefone com DDD, como (11) 91234-5678.";
    else {
      const outro = dados.clientes.find((c) => c.id !== id && c.telefone === tel);
      if (outro) erros.telefone = `Este telefone já é de ${outro.nome}.`;
    }
    const email = String(v.email || "").trim().toLowerCase();
    if (email && !U.emailValido(email)) erros.email = "Digite um e-mail válido ou deixe em branco.";
    else if (email && !publico && dados.clientes.some((c) => c.id !== id && c.email === email)) erros.email = "Este e-mail já está em outro cliente.";
    if (String(v.observacoes || "").length > 500) erros.observacoes = "Use no máximo 500 caracteres.";
    return { erros, limpo: { nome, telefone: tel, email, observacoes: textoMudou(v.observacoes, 500) } };
  }
  function salvarCliente(v, id, { silencioso } = {}) {
    const { erros, limpo } = validarCliente(v, id);
    if (Object.keys(erros).length) return { ok: false, erros };
    if (id) {
      Object.assign(cliente(id), limpo);
      if (!silencioso) salvar();
      return { ok: true, id };
    }
    const novo = { id: novoId("c"), ...limpo, criadoEm: U.agora(), origem: v.origem || "painel", ficticio: false };
    dados.clientes.push(novo);
    if (!silencioso) salvar();
    return { ok: true, id: novo.id };
  }

  // Só exclui quem não tem nenhuma reserva (quem tem histórico fica, para não apagar a agenda)
  function removerCliente(id) {
    const c = cliente(id);
    if (!c) return { ok: false, erro: "Cliente não encontrado." };
    if (dados.agendamentos.some((a) => a.clienteId === id)) return { ok: false, erro: "Este cliente tem reservas no histórico e não pode ser excluído." };
    dados.clientes = dados.clientes.filter((x) => x.id !== id);
    salvar();
    return { ok: true };
  }

  /* ---------- Serviços ---------- */
  function salvarServico(v, id) {
    const erros = {};
    const nome = String(v.nome || "").trim();
    if (nome.length < 3) erros.nome = "Informe o nome do serviço.";
    else if (nome.length > 60) erros.nome = "Use no máximo 60 caracteres.";
    else if (dados.servicos.some((s) => s.id !== id && igual(s.nome, nome))) erros.nome = "Já existe um serviço com este nome.";
    const categoria = String(v.categoria || "").trim();
    if (categoria.length < 2) erros.categoria = "Informe a categoria (ex.: Cabelo).";
    else if (categoria.length > 30) erros.categoria = "Use no máximo 30 caracteres.";
    const preco = U.lerValor(v.preco);
    if (!String(v.preco || "").trim()) erros.preco = "Informe o preço.";
    else if (!Number.isFinite(preco) || preco < 0) erros.preco = "Digite um valor válido, como 55,00.";
    else if (preco > 100000) erros.preco = "Valor alto demais para esta demonstração.";
    const duracao = U.lerInteiro(v.duracao);
    if (!Number.isFinite(duracao) || duracao < 5 || duracao > 480) erros.duracao = "Informe a duração em minutos (de 5 a 480).";
    else if (duracao % 5 !== 0) erros.duracao = "Use múltiplos de 5 minutos.";
    if (String(v.descricao || "").length > 300) erros.descricao = "Use no máximo 300 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, categoria, preco: U.arredondar(preco), duracao, descricao: textoMudou(v.descricao, 300), atualizadoEm: U.agora() };
    if (v.imagem !== undefined) limpo.imagem = v.imagem;
    if (id) { Object.assign(servico(id), limpo); salvar(); return { ok: true, id }; }
    const novo = { id: novoId("s"), ...limpo, imagem: v.imagem || null, status: "ativo", criadoEm: U.agora() };
    dados.servicos.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarServico(id) {
    const s = servico(id);
    if (!s) return { ok: false, erro: "Serviço não encontrado." };
    s.status = s.status === "ativo" ? "inativo" : "ativo";
    s.atualizadoEm = U.agora();
    salvar();
    return { ok: true, status: s.status };
  }

  /* ---------- Profissionais ---------- */
  // jornada: { 0..6: { trabalha, inicio, fim, pausaInicio, pausaFim } }
  function validarJornada(jornada, erros) {
    const limpa = {};
    let algum = false;
    for (let dow = 0; dow < 7; dow += 1) {
      const j = jornada[dow] || {};
      if (!j.trabalha) { limpa[dow] = null; continue; }
      algum = true;
      const campo = `jornada${dow}`;
      if (!U.horaValida(j.inicio) || !U.horaValida(j.fim) || j.inicio >= j.fim) { erros[campo] = `${NX.DIAS[dow]}: o início precisa ser antes do fim.`; continue; }
      if (U.minutos(j.fim) - U.minutos(j.inicio) < 30) { erros[campo] = `${NX.DIAS[dow]}: a jornada precisa ter pelo menos 30 minutos.`; continue; }
      let pausa = null;
      if (j.pausaInicio || j.pausaFim) {
        if (!U.horaValida(j.pausaInicio) || !U.horaValida(j.pausaFim) || j.pausaInicio >= j.pausaFim) { erros[campo] = `${NX.DIAS[dow]}: confira o intervalo (início antes do fim).`; continue; }
        if (j.pausaInicio <= j.inicio || j.pausaFim >= j.fim) { erros[campo] = `${NX.DIAS[dow]}: o intervalo precisa ficar dentro da jornada.`; continue; }
        pausa = { inicio: j.pausaInicio, fim: j.pausaFim };
      }
      limpa[dow] = { inicio: j.inicio, fim: j.fim, pausa };
    }
    if (!algum) erros.jornada = "Marque pelo menos um dia de trabalho.";
    return limpa;
  }
  function salvarProfissional(v, id) {
    const erros = {};
    const nome = String(v.nome || "").trim().replace(/\s+/g, " ");
    if (nome.length < 3) erros.nome = "Informe o nome do profissional.";
    else if (dados.profissionais.some((p) => p.id !== id && igual(p.nome, nome))) erros.nome = "Já existe um profissional com este nome.";
    const especialidades = String(v.especialidades || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
    if (!especialidades.length) erros.especialidades = "Informe pelo menos uma especialidade (separe por vírgula).";
    const servicos = (v.servicos || []).filter((sid) => servico(sid));
    if (!servicos.length) erros.servicos = "Marque os serviços que este profissional realiza.";
    const jornada = validarJornada(v.jornada || {}, erros);
    const folgas = [...new Set((v.folgas || []).filter(U.dataValida))].sort();
    if (Object.keys(erros).length) return { ok: false, erros };
    const limpo = { nome, especialidades, servicos, jornada, folgas };
    if (v.foto !== undefined) limpo.foto = v.foto;
    if (id) { Object.assign(profissional(id), limpo); salvar(); return { ok: true, id }; }
    const usadas = dados.profissionais.map((p) => p.cor);
    let cor = 0;
    while (usadas.includes(cor) && cor < 5) cor += 1;
    const novo = { id: novoId("p"), ...limpo, foto: v.foto || null, cor, status: "ativo", criadoEm: U.agora() };
    dados.profissionais.push(novo);
    salvar();
    return { ok: true, id: novo.id };
  }
  function alternarProfissional(id) {
    const p = profissional(id);
    if (!p) return { ok: false, erro: "Profissional não encontrado." };
    p.status = p.status === "ativo" ? "inativo" : "ativo";
    salvar();
    return { ok: true, status: p.status };
  }

  /* ---------- Expediente, feriados, bloqueios e regras ---------- */
  function salvarHorarios(horarios) {
    const erros = {};
    const limpo = {};
    let aberto = false;
    for (let dow = 0; dow < 7; dow += 1) {
      const h = horarios[dow] || {};
      if (!h.abre && !h.fecha && !h.aberto) { limpo[dow] = null; continue; }
      if (!h.aberto) { limpo[dow] = null; continue; }
      aberto = true;
      if (!U.horaValida(h.abre) || !U.horaValida(h.fecha) || h.abre >= h.fecha) { erros[`dia${dow}`] = `${NX.DIAS[dow]}: a abertura precisa ser antes do fechamento.`; continue; }
      let pausa = null;
      if (h.pausaInicio || h.pausaFim) {
        if (!U.horaValida(h.pausaInicio) || !U.horaValida(h.pausaFim) || h.pausaInicio >= h.pausaFim || h.pausaInicio <= h.abre || h.pausaFim >= h.fecha) { erros[`dia${dow}`] = `${NX.DIAS[dow]}: o intervalo precisa ficar entre a abertura e o fechamento.`; continue; }
        pausa = { inicio: h.pausaInicio, fim: h.pausaFim };
      }
      limpo[dow] = { abre: h.abre, fecha: h.fecha, pausa };
    }
    if (!aberto) erros.geral = "Deixe pelo menos um dia aberto.";
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.estabelecimento.horarios = limpo;
    salvar();
    return { ok: true };
  }
  function adicionarFeriado(v) {
    const erros = {};
    if (!U.dataValida(v.data)) erros.data = "Informe a data.";
    else if (dados.feriados.some((f) => f.data === v.data)) erros.data = "Já existe um feriado nesta data.";
    const nome = String(v.nome || "").trim();
    if (nome.length < 3) erros.nome = "Informe o nome do feriado.";
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.feriados.push({ id: novoId("fe"), data: v.data, nome: nome.slice(0, 60) });
    dados.feriados.sort((a, b) => a.data.localeCompare(b.data));
    salvar();
    return { ok: true };
  }
  function removerFeriado(id) { dados.feriados = dados.feriados.filter((f) => f.id !== id); salvar(); return { ok: true }; }
  function validarBloqueio(v) {
    const erros = {};
    if (v.profissionalId && !profissional(v.profissionalId)) erros.profissionalId = "Profissional não encontrado.";
    if (!U.dataValida(v.data)) erros.data = "Informe a data.";
    else if (v.data < U.hoje()) erros.data = "Não é possível bloquear uma data que já passou.";
    const diaInteiro = !!v.diaInteiro;
    if (!diaInteiro) {
      if (!U.horaValida(v.inicio) || !U.horaValida(v.fim) || v.inicio >= v.fim) erros.inicio = "Informe o início e o fim (início antes do fim).";
    }
    const motivo = String(v.motivo || "").trim();
    if (motivo.length < 3) erros.motivo = "Informe o motivo do bloqueio.";
    return { erros, limpo: { profissionalId: v.profissionalId || null, data: v.data, diaInteiro, inicio: diaInteiro ? "00:00" : v.inicio, fim: diaInteiro ? "23:59" : v.fim, motivo: motivo.slice(0, 80) } };
  }
  function adicionarBloqueio(v) {
    const { erros, limpo } = validarBloqueio(v);
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.bloqueios.push({ id: novoId("b"), ...limpo });
    dados.bloqueios.sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
    salvar();
    return { ok: true };
  }
  function removerBloqueio(id) { dados.bloqueios = dados.bloqueios.filter((b) => b.id !== id); salvar(); return { ok: true }; }

  const LIMITES = {
    intervaloGrade: [5, 60, "O intervalo da grade"], antecedenciaMinima: [0, 10080, "A antecedência mínima"], diasFuturos: [1, 365, "O limite de dias"],
    cancelamentoHoras: [0, 720, "O prazo de cancelamento"], reagendamentoHoras: [0, 720, "O prazo de reagendamento"], reagendamentosMax: [0, 10, "O limite de reagendamentos"],
  };
  function salvarRegras(v) {
    const erros = {};
    const limpo = { ...dados.estabelecimento.regras };
    Object.entries(LIMITES).forEach(([campo, [min, max, rotulo]]) => {
      if (v[campo] === undefined) return;
      const n = U.lerInteiro(v[campo]);
      if (!Number.isFinite(n) || n < min || n > max) erros[campo] = `${rotulo} deve ficar entre ${min} e ${max}.`;
      else limpo[campo] = n;
    });
    if (limpo.intervaloGrade && ![5, 10, 15, 20, 30, 60].includes(limpo.intervaloGrade)) erros.intervaloGrade = "Use 5, 10, 15, 20, 30 ou 60 minutos.";
    if (v.confirmacaoAutomatica !== undefined) limpo.confirmacaoAutomatica = !!v.confirmacaoAutomatica;
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.estabelecimento.regras = limpo;
    salvar();
    return { ok: true };
  }
  function salvarFuso(tz) {
    if (!NX.FUSOS.some(([id]) => id === tz)) return { ok: false, erro: "Fuso horário não suportado." };
    dados.estabelecimento.fuso = tz;
    U.definirFuso(tz);
    salvar();
    return { ok: true };
  }

  /* ---------- Estabelecimento, página pública, mensagens e perfil ---------- */
  function salvarEstabelecimento(v) {
    const erros = {};
    const nome = String(v.nome || "").trim();
    if (nome.length < 2) erros.nome = "Informe o nome comercial.";
    else if (nome.length > 60) erros.nome = "Use no máximo 60 caracteres.";
    if (String(v.descricao || "").length > 200) erros.descricao = "Use no máximo 200 caracteres.";
    if (v.telefone && !U.telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD, como (11) 3333-4444, ou deixe em branco.";
    const zap = U.digitos(v.whatsapp);
    if (zap && !/^55\d{10,11}$/.test(zap)) erros.whatsapp = "Use 55 + DDD + número, só números (ex.: 5511912345678), ou deixe em branco.";
    if (String(v.endereco || "").length > 120) erros.endereco = "Use no máximo 120 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const telefone = v.telefone ? U.mascaraTelefone(v.telefone) : "";
    // O telefone de exemplo é fictício: ao trocar por um número de verdade, ele passa a virar link de ligação
    if (telefone !== dados.estabelecimento.telefone) dados.estabelecimento.telefoneFicticio = false;
    Object.assign(dados.estabelecimento, { nome, descricao: textoMudou(v.descricao, 200), telefone, whatsapp: zap, endereco: textoMudou(v.endereco, 120) });
    if (v.logo !== undefined) dados.estabelecimento.logo = v.logo;
    salvar();
    return { ok: true };
  }
  function salvarPagina(v) {
    const p = dados.estabelecimento.pagina;
    if (v.cor !== undefined) { if (!NX.CORES_PAGINA.some((c) => c.id === v.cor)) return { ok: false, erro: "Cor inválida." }; p.cor = v.cor; }
    if (v.boasVindas !== undefined) {
      const t = String(v.boasVindas || "").trim();
      if (t.length > 200) return { ok: false, erros: { boasVindas: "Use no máximo 200 caracteres." } };
      p.boasVindas = t;
    }
    ["mostrarPrecos", "mostrarEndereco", "permitirEscolherProfissional"].forEach((k) => { if (v[k] !== undefined) p[k] = !!v[k]; });
    salvar();
    return { ok: true };
  }
  function salvarAgendaPrefs(v) {
    const a = dados.estabelecimento.agenda;
    if (v.visaoInicial && ["dia", "semana", "mes", "lista"].includes(v.visaoInicial)) a.visaoInicial = v.visaoInicial;
    if (v.mostrarCancelados !== undefined) a.mostrarCancelados = !!v.mostrarCancelados;
    salvar();
    return { ok: true };
  }
  function salvarMensagens(v) {
    const erros = {};
    const m = { ...dados.estabelecimento.mensagens };
    Object.keys(NX.MODELOS_PADRAO).forEach((k) => {
      if (v[k] === undefined) return;
      const t = String(v[k] || "").trim();
      if (t.length < 10) erros[k] = "Escreva a mensagem (pelo menos 10 caracteres).";
      else if (t.length > 500) erros[k] = "Use no máximo 500 caracteres.";
      else m[k] = t;
    });
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.estabelecimento.mensagens = m;
    salvar();
    return { ok: true };
  }
  function salvarPerfil(v) {
    const nome = String(v.nome || "").trim();
    if (nome.length < 3) return { ok: false, erros: { perfilNome: "Informe seu nome." } };
    dados.perfil = { ...dados.perfil, nome, cargo: textoMudou(v.cargo, 40) };
    salvar();
    return { ok: true };
  }

  NX.loja = {
    carregar, salvar, sincronizar, restaurar, tamanhoSalvo, novoId,
    aoMudar: (fn) => ouvintes.add(fn),
    get dados() { return dados; },
    get persistente() { return persistente; },
    versao: () => versao,
    cliente, servico, profissional, agendamento, porCodigo, clientePorTelefone, categorias,
    validarCliente, salvarCliente, removerCliente, salvarServico, alternarServico, salvarProfissional, alternarProfissional,
    salvarHorarios, adicionarFeriado, removerFeriado, validarBloqueio, adicionarBloqueio, removerBloqueio, salvarRegras, salvarFuso,
    salvarEstabelecimento, salvarPagina, salvarAgendaPrefs, salvarMensagens, salvarPerfil,
  };
})();
