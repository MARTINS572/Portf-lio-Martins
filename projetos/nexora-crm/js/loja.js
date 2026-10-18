/* ==========================================================================
   NEXORA CRM — loja.js
   Guarda os dados do CRM e todas as regras de negócio: cadastrar, editar,
   excluir, mover oportunidades, converter leads e calcular os indicadores.
   As telas só leem daqui e chamam estas funções.

   DEMONSTRAÇÃO LOCAL: os dados ficam no localStorage deste navegador.
   Não existe servidor, login nem sincronização. Para virar um sistema real,
   as funções carregar() e salvar() precisariam conversar com uma API.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const CHAVE = "nexora-crm:dados";
  const VERSAO = 1;
  const ouvintes = new Set();
  let dados = null;
  let persistente = true;

  /* ---------- Carregar, salvar e restaurar ---------- */
  function carregar() {
    try {
      const texto = localStorage.getItem(CHAVE);
      const lido = texto ? JSON.parse(texto) : null;
      if (lido && lido.versao === VERSAO && Array.isArray(lido.leads)) { dados = lido; return; }
    } catch (e) { persistente = false; }
    dados = NX.criarDadosDemo();
    salvar(false);
  }
  function salvar(avisar = true) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); persistente = true; } catch (e) { persistente = false; }
    if (avisar) ouvintes.forEach((fn) => fn());
  }
  function restaurar() {
    dados = NX.criarDadosDemo();
    salvar();
  }
  // Mudanças feitas em outra aba aparecem nesta
  window.addEventListener("storage", (e) => {
    if (e.key !== CHAVE || !e.newValue) return;
    try { dados = JSON.parse(e.newValue); ouvintes.forEach((fn) => fn()); } catch (erro) { /* ignora */ }
  });

  const novoId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const agora = () => { const d = new Date(); return `${U.chave(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  function registrar(tipo, texto, ref) {
    dados.atividades.unshift({ id: novoId("a"), data: agora(), tipo, texto, autorId: dados.perfil.id, ref });
    dados.atividades = dados.atividades.slice(0, 80);
  }

  /* ---------- Consultas ---------- */
  const lead = (id) => dados.leads.find((x) => x.id === id);
  const cliente = (id) => dados.clientes.find((x) => x.id === id);
  const negocio = (id) => dados.negocios.find((x) => x.id === id);
  const tarefa = (id) => dados.tarefas.find((x) => x.id === id);
  const membro = (id) => dados.equipe.find((x) => x.id === id) || { id, nome: "Sem responsável", cargo: "" };
  const etapa = (id) => NX.ETAPAS.find((e) => e.id === id);
  const aberto = (n) => NX.ETAPAS_ABERTAS.includes(n.etapa);

  function nomeDoVinculo(v) {
    if (!v) return "";
    const alvo = v.tipo === "cliente" ? cliente(v.id) : lead(v.id);
    return alvo ? `${alvo.nome} · ${alvo.empresa}` : "Registro removido";
  }
  function valorDoCliente(id) {
    const lista = dados.negocios.filter((n) => n.clienteId === id);
    return {
      ganho: lista.filter((n) => n.etapa === "ganho").reduce((t, n) => t + n.valor, 0),
      aberto: lista.filter(aberto).reduce((t, n) => t + n.valor, 0),
      quantidade: lista.length,
    };
  }
  function situacaoDaTarefa(t) {
    if (t.concluida) return "concluida";
    const d = U.diasEntre(U.hoje(), t.prazo);
    if (d < 0) return "atrasada";
    if (d === 0) return "hoje";
    return "pendente";
  }

  /* ---------- Validações ---------- */
  function validarPessoa(v, { exigeEmpresa = true } = {}) {
    const erros = {};
    if (!v.nome || v.nome.length < 3) erros.nome = "Informe o nome completo.";
    if (exigeEmpresa && (!v.empresa || v.empresa.length < 2)) erros.empresa = "Informe a empresa.";
    if (!U.emailValido(v.email)) erros.email = "E-mail inválido. Exemplo: nome@empresa.com.br";
    if (!U.telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD, 10 ou 11 números.";
    return erros;
  }

  /* ---------- Leads ---------- */
  function salvarLead(v) {
    const erros = validarPessoa(v);
    const valor = U.lerValor(v.valor);
    if (!(valor > 0)) erros.valor = "Informe um valor maior que zero.";
    if (!U.dataValida(v.primeiroContato)) erros.primeiroContato = "Data inválida.";
    else if (v.primeiroContato > U.hoje()) erros.primeiroContato = "A data não pode estar no futuro.";
    if (!NX.ORIGENS.includes(v.origem)) erros.origem = "Escolha a origem.";
    if (!NX.STATUS_LEAD.includes(v.status)) erros.status = "Escolha o status.";
    if (Object.keys(erros).length) return { ok: false, erros };

    const campos = {
      nome: v.nome, empresa: v.empresa, email: v.email.toLowerCase(), telefone: U.mascaraTelefone(v.telefone),
      origem: v.origem, interesse: v.interesse, valor, responsavelId: v.responsavelId,
      primeiroContato: v.primeiroContato, status: v.status, observacoes: v.observacoes || "",
    };
    let registro;
    if (v.id) {
      registro = lead(v.id);
      if (!registro) return { ok: false, erro: "Lead não encontrado." };
      Object.assign(registro, campos);
      // Mantém os cartões do pipeline em dia com o lead
      dados.negocios.filter((n) => n.leadId === v.id).forEach((n) => { n.contato = registro.nome; n.empresa = registro.empresa; });
      registrar("lead", `Lead atualizado: ${registro.nome}`, { tipo: "lead", id: registro.id });
    } else {
      registro = { id: novoId("l"), clienteId: null, ...campos };
      dados.leads.unshift(registro);
      registrar("lead", `Novo lead: ${registro.nome} (${registro.empresa}) via ${registro.origem}`, { tipo: "lead", id: registro.id });
    }
    salvar();
    return { ok: true, registro };
  }

  function excluirLead(id) {
    const l = lead(id);
    if (!l) return { ok: false, erro: "Lead não encontrado." };
    const abertos = dados.negocios.filter((n) => n.leadId === id && aberto(n)).length;
    dados.leads = dados.leads.filter((x) => x.id !== id);
    // Oportunidades abertas do lead saem do pipeline; tarefas ligadas a ele também
    dados.negocios = dados.negocios.filter((n) => !(n.leadId === id && aberto(n)));
    dados.tarefas = dados.tarefas.filter((t) => !(t.vinculo && t.vinculo.tipo === "lead" && t.vinculo.id === id));
    registrar("excluido", `Lead excluído: ${l.nome} (${l.empresa})`, null);
    salvar();
    return { ok: true, removidosDoPipeline: abertos };
  }

  function converterLead(id) {
    const l = lead(id);
    if (!l) return { ok: false, erro: "Lead não encontrado." };
    if (l.clienteId && cliente(l.clienteId)) return { ok: true, cliente: cliente(l.clienteId), jaEra: true };
    const c = {
      id: novoId("c"), nome: l.nome, empresa: l.empresa, telefone: l.telefone, email: l.email,
      categoria: "Serviços", cadastro: U.hoje(), status: "Ativo", responsavelId: l.responsavelId, leadId: l.id,
      contatos: [], observacoes: l.observacoes ? [{ id: novoId("o"), data: U.hoje(), texto: `Do lead: ${l.observacoes}`, autorId: dados.perfil.id }] : [],
    };
    dados.clientes.unshift(c);
    l.status = "Convertido";
    l.clienteId = c.id;
    // Negócios do lead passam a pertencer ao cliente; tarefas também
    dados.negocios.filter((n) => n.leadId === id).forEach((n) => { n.clienteId = c.id; n.leadId = null; });
    dados.tarefas.filter((t) => t.vinculo && t.vinculo.tipo === "lead" && t.vinculo.id === id).forEach((t) => { t.vinculo = { tipo: "cliente", id: c.id }; });
    registrar("cliente", `${l.nome} (${l.empresa}) virou cliente`, { tipo: "cliente", id: c.id });
    salvar();
    return { ok: true, cliente: c };
  }

  /* ---------- Clientes ---------- */
  function salvarCliente(v) {
    const erros = validarPessoa(v);
    if (!NX.CATEGORIAS.includes(v.categoria)) erros.categoria = "Escolha a categoria.";
    if (!NX.STATUS_CLIENTE.includes(v.status)) erros.status = "Escolha o status.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const campos = { nome: v.nome, empresa: v.empresa, telefone: U.mascaraTelefone(v.telefone), email: v.email.toLowerCase(), categoria: v.categoria, status: v.status, responsavelId: v.responsavelId };
    let registro;
    if (v.id) {
      registro = cliente(v.id);
      if (!registro) return { ok: false, erro: "Cliente não encontrado." };
      Object.assign(registro, campos);
      dados.negocios.filter((n) => n.clienteId === v.id).forEach((n) => { n.contato = registro.nome; n.empresa = registro.empresa; });
      registrar("cliente", `Cadastro atualizado: ${registro.empresa}`, { tipo: "cliente", id: registro.id });
    } else {
      registro = { id: novoId("c"), cadastro: U.hoje(), leadId: null, contatos: [], observacoes: [], ...campos };
      dados.clientes.unshift(registro);
      registrar("cliente", `Novo cliente: ${registro.empresa}`, { tipo: "cliente", id: registro.id });
    }
    salvar();
    return { ok: true, registro };
  }

  function adicionarObservacao(clienteId, texto) {
    const c = cliente(clienteId);
    if (!c) return { ok: false, erro: "Cliente não encontrado." };
    if (!texto || texto.trim().length < 3) return { ok: false, erros: { texto: "Escreva a observação (pelo menos 3 caracteres)." } };
    c.observacoes.unshift({ id: novoId("o"), data: U.hoje(), texto: texto.trim(), autorId: dados.perfil.id });
    registrar("nota", `Observação em ${c.empresa}`, { tipo: "cliente", id: c.id });
    salvar();
    return { ok: true };
  }

  function registrarContato(clienteId, v) {
    const c = cliente(clienteId);
    if (!c) return { ok: false, erro: "Cliente não encontrado." };
    const erros = {};
    if (!NX.TIPOS_CONTATO.includes(v.tipo)) erros.tipo = "Escolha o tipo de contato.";
    if (!U.dataValida(v.data)) erros.data = "Data inválida.";
    else if (v.data > U.hoje()) erros.data = "O contato não pode estar no futuro.";
    if (!v.resumo || v.resumo.length < 3) erros.resumo = "Descreva o contato.";
    if (Object.keys(erros).length) return { ok: false, erros };
    c.contatos.unshift({ id: novoId("h"), data: v.data, tipo: v.tipo, resumo: v.resumo, autorId: dados.perfil.id });
    c.contatos.sort((a, b) => b.data.localeCompare(a.data));
    // O contato conta como interação nas oportunidades abertas do cliente
    dados.negocios.filter((n) => n.clienteId === clienteId && aberto(n) && n.ultimaInteracao < v.data).forEach((n) => { n.ultimaInteracao = v.data; });
    registrar("contato", `${v.tipo} com ${c.nome} (${c.empresa})`, { tipo: "cliente", id: c.id });
    salvar();
    return { ok: true };
  }

  /* ---------- Oportunidades (pipeline) ---------- */
  function salvarNegocio(v) {
    const erros = {};
    if (!v.titulo || v.titulo.length < 3) erros.titulo = "Informe o serviço ou título.";
    const valor = U.lerValor(v.valor);
    if (!(valor > 0)) erros.valor = "Informe um valor maior que zero.";
    const [tipo, idAlvo] = String(v.vinculo || "").split(":");
    const alvo = tipo === "cliente" ? cliente(idAlvo) : tipo === "lead" ? lead(idAlvo) : null;
    if (!alvo) erros.vinculo = "Escolha o cliente ou lead.";
    if (!NX.ETAPAS_ABERTAS.includes(v.etapa) && !v.id) erros.etapa = "Escolha a etapa.";
    if (v.etapa === "perdido" && !v.motivo) {
      const atual = v.id && negocio(v.id);
      if (!atual || atual.etapa !== "perdido") erros.motivo = "Informe o motivo da perda.";
    }
    if (Object.keys(erros).length) return { ok: false, erros };

    const campos = {
      titulo: v.titulo, valor, responsavelId: v.responsavelId,
      clienteId: tipo === "cliente" ? alvo.id : null, leadId: tipo === "lead" ? alvo.id : null,
      contato: alvo.nome, empresa: alvo.empresa,
    };
    let registro;
    if (v.id) {
      registro = negocio(v.id);
      if (!registro) return { ok: false, erro: "Oportunidade não encontrada." };
      Object.assign(registro, campos, { ultimaInteracao: U.hoje() });
      if (v.etapa && v.etapa !== registro.etapa) {
        const r = moverNegocio(v.id, v.etapa, { motivo: v.motivo, silencioso: true });
        if (!r.ok) return r;
      }
      registrar("movido", `Oportunidade atualizada: ${registro.titulo} (${registro.empresa})`, { tipo: "negocio", id: registro.id });
    } else {
      registro = { id: novoId("n"), ...campos, etapa: v.etapa, criadoEm: U.hoje(), ultimaInteracao: U.hoje(), fechadoEm: null, motivoPerda: null };
      dados.negocios.unshift(registro);
      if (tipo === "lead" && alvo.status === "Novo") alvo.status = "Em contato";
      registrar("negocio", `Nova oportunidade: ${registro.titulo} para ${registro.empresa}`, { tipo: "negocio", id: registro.id });
    }
    salvar();
    return { ok: true, registro };
  }

  /* Move entre etapas. Venda concluída registra o ganho (e converte o lead
     em cliente); venda perdida exige o motivo. */
  function moverNegocio(id, destino, { motivo, detalhe, silencioso } = {}) {
    const n = negocio(id);
    if (!n) return { ok: false, erro: "Oportunidade não encontrada." };
    if (!etapa(destino)) return { ok: false, erro: "Etapa inválida." };
    if (destino === n.etapa) return { ok: true, n, semMudanca: true };
    if (destino === "perdido" && !motivo) return { ok: false, erro: "Informe o motivo da perda.", precisaMotivo: true };
    const origem = n.etapa;
    n.etapa = destino;
    n.ultimaInteracao = U.hoje();
    let convertido = null;
    if (destino === "ganho") {
      n.fechadoEm = U.hoje();
      n.motivoPerda = null;
      n.motivoDetalhe = null;
      if (n.leadId) {
        const r = converterLead(n.leadId);
        if (r.ok) convertido = r.cliente;
      } else if (n.clienteId) {
        const c = cliente(n.clienteId);
        if (c) c.status = "Ativo";
      }
      registrar("ganho", `Venda concluída: ${n.titulo} para ${n.empresa} (${U.moeda(n.valor, { compacto: false })})`, { tipo: "negocio", id: n.id });
    } else if (destino === "perdido") {
      n.fechadoEm = U.hoje();
      n.motivoPerda = motivo;
      n.motivoDetalhe = detalhe || null;
      registrar("perdido", `Venda perdida: ${n.titulo} para ${n.empresa} (${motivo}${detalhe ? `: ${detalhe}` : ""})`, { tipo: "negocio", id: n.id });
    } else {
      // Reaberta: volta a contar como em andamento
      n.fechadoEm = null;
      n.motivoPerda = null;
      n.motivoDetalhe = null;
      if (!silencioso) registrar("movido", `${n.empresa}: ${etapa(origem).nome} → ${etapa(destino).nome}`, { tipo: "negocio", id: n.id });
    }
    salvar();
    return { ok: true, n, convertido };
  }

  function excluirNegocio(id) {
    const n = negocio(id);
    if (!n) return { ok: false, erro: "Oportunidade não encontrada." };
    dados.negocios = dados.negocios.filter((x) => x.id !== id);
    registrar("excluido", `Oportunidade excluída: ${n.titulo} (${n.empresa})`, null);
    salvar();
    return { ok: true };
  }

  /* ---------- Tarefas ---------- */
  function salvarTarefa(v) {
    const erros = {};
    if (!v.titulo || v.titulo.length < 3) erros.titulo = "Informe o título da tarefa.";
    if (!U.dataValida(v.prazo)) erros.prazo = "Informe o prazo.";
    if (!NX.PRIORIDADES.includes(v.prioridade)) erros.prioridade = "Escolha a prioridade.";
    const [tipo, idAlvo] = String(v.vinculo || "").split(":");
    const alvo = tipo === "cliente" ? cliente(idAlvo) : tipo === "lead" ? lead(idAlvo) : null;
    if (!alvo) erros.vinculo = "Escolha o lead ou cliente.";
    if (!v.id && U.dataValida(v.prazo) && v.prazo < U.hoje()) erros.prazo = "Uma tarefa nova não pode começar atrasada.";
    if (Object.keys(erros).length) return { ok: false, erros };
    const campos = { titulo: v.titulo, descricao: v.descricao || "", prazo: v.prazo, prioridade: v.prioridade, responsavelId: v.responsavelId, vinculo: { tipo, id: alvo.id } };
    let registro;
    if (v.id) {
      registro = tarefa(v.id);
      if (!registro) return { ok: false, erro: "Tarefa não encontrada." };
      Object.assign(registro, campos);
    } else {
      registro = { id: novoId("t"), concluida: false, concluidaEm: null, criadaEm: U.hoje(), ...campos };
      dados.tarefas.unshift(registro);
      registrar("tarefa", `Nova tarefa: ${registro.titulo} (${alvo.empresa})`, { tipo: "tarefa", id: registro.id });
    }
    salvar();
    return { ok: true, registro };
  }

  function concluirTarefa(id, concluida) {
    const t = tarefa(id);
    if (!t) return { ok: false, erro: "Tarefa não encontrada." };
    t.concluida = concluida;
    t.concluidaEm = concluida ? U.hoje() : null;
    if (concluida) registrar("tarefa", `Tarefa concluída: ${t.titulo}`, { tipo: "tarefa", id: t.id });
    salvar();
    return { ok: true, t };
  }

  function excluirTarefa(id) {
    const t = tarefa(id);
    if (!t) return { ok: false, erro: "Tarefa não encontrada." };
    dados.tarefas = dados.tarefas.filter((x) => x.id !== id);
    salvar();
    return { ok: true };
  }

  /* ---------- Configurações ---------- */
  function salvarConfiguracoes(v) {
    const erros = {};
    if (!v.empresa || v.empresa.length < 2) erros.empresa = "Informe o nome da empresa.";
    const meta = U.lerValor(v.metaMensal);
    if (!(meta > 0)) erros.metaMensal = "Informe uma meta maior que zero.";
    if (!v.nome || v.nome.length < 3) erros.nome = "Informe seu nome.";
    if (!U.emailValido(v.email)) erros.email = "E-mail inválido.";
    if (Object.keys(erros).length) return { ok: false, erros };
    dados.empresa = v.empresa;
    dados.metaMensal = meta;
    Object.assign(dados.perfil, { nome: v.nome, cargo: v.cargo, email: v.email });
    const eu = dados.equipe.find((u) => u.id === dados.perfil.id);
    if (eu) Object.assign(eu, { nome: v.nome, cargo: v.cargo });
    salvar();
    return { ok: true };
  }

  function marcarNotificacoesLidas(ids) {
    dados.notificacoesLidas = [...new Set([...dados.notificacoesLidas, ...ids])].slice(-300);
    salvar();
  }

  /* ---------- Indicadores ----------
     Todos são calculados a partir dos registros, a cada mudança. */
  const noPeriodo = (data, de, ate) => data && data.slice(0, 10) >= de && data.slice(0, 10) <= ate;

  function indicadores() {
    const hoje = U.hoje();
    const iniMes = U.inicioDoMes(hoje);
    const ganhosMes = dados.negocios.filter((n) => n.etapa === "ganho" && noPeriodo(n.fechadoEm, iniMes, hoje));
    const abertos = dados.negocios.filter(aberto);
    const de6m = U.somarMeses(iniMes, -5);
    const fechados6m = dados.negocios.filter((n) => (n.etapa === "ganho" || n.etapa === "perdido") && noPeriodo(n.fechadoEm, de6m, hoje));
    const ganhos6m = fechados6m.filter((n) => n.etapa === "ganho").length;
    const valorGanhoMes = ganhosMes.reduce((t, n) => t + n.valor, 0);
    const leadsMes = dados.leads.filter((l) => noPeriodo(l.primeiroContato, iniMes, hoje)).length;
    return {
      totalLeads: dados.leads.length,
      leadsMes,
      leadsAbertos: dados.leads.filter((l) => ["Novo", "Em contato", "Qualificado"].includes(l.status)).length,
      clientesAtivos: dados.clientes.filter((c) => c.status === "Ativo").length,
      clientesTotal: dados.clientes.length,
      negociacoes: abertos.length,
      valorAberto: abertos.reduce((t, n) => t + n.valor, 0),
      vendasMes: ganhosMes.length,
      valorGanhoMes,
      conversao: fechados6m.length ? ganhos6m / fechados6m.length : 0,
      fechados6m: fechados6m.length,
      ganhos6m,
      meta: dados.metaMensal,
      progressoMeta: dados.metaMensal ? valorGanhoMes / dados.metaMensal : 0,
    };
  }

  // Vendas ganhas por mês (últimos n meses, incluindo o atual)
  function vendasPorMes(n = 6) {
    const iniMes = U.inicioDoMes(U.hoje());
    return Array.from({ length: n }, (_, i) => {
      const ini = U.somarMeses(iniMes, i - (n - 1));
      const fim = U.fimDoMes(ini);
      const lista = dados.negocios.filter((x) => x.etapa === "ganho" && noPeriodo(x.fechadoEm, ini, fim));
      return { inicio: ini, rotulo: U.nomeDoMes(ini), valor: lista.reduce((t, x) => t + x.valor, 0), quantidade: lista.length, atual: i === n - 1 };
    });
  }

  function leadsPorOrigem(de, ate) {
    const lista = dados.leads.filter((l) => !de || noPeriodo(l.primeiroContato, de, ate));
    return NX.ORIGENS.map((o) => ({ rotulo: o, valor: lista.filter((l) => l.origem === o).length })).sort((a, b) => b.valor - a.valor);
  }

  function distribuicaoPorEtapa() {
    return NX.ETAPAS_ABERTAS.map((id) => {
      const lista = dados.negocios.filter((n) => n.etapa === id);
      return { id, rotulo: etapa(id).nome, valor: lista.length, total: lista.reduce((t, n) => t + n.valor, 0) };
    });
  }

  function desempenho(de, ate) {
    return dados.equipe.map((u) => {
      const meus = dados.negocios.filter((n) => n.responsavelId === u.id);
      const ganhos = meus.filter((n) => n.etapa === "ganho" && noPeriodo(n.fechadoEm, de, ate));
      const perdidos = meus.filter((n) => n.etapa === "perdido" && noPeriodo(n.fechadoEm, de, ate));
      const fechados = ganhos.length + perdidos.length;
      return {
        id: u.id, rotulo: u.nome, cargo: u.cargo,
        valor: ganhos.reduce((t, n) => t + n.valor, 0),
        ganhos: ganhos.length, perdidos: perdidos.length,
        conversao: fechados ? ganhos.length / fechados : null,
        abertos: meus.filter(aberto).length,
        valorAberto: meus.filter(aberto).reduce((t, n) => t + n.valor, 0),
        tarefasConcluidas: dados.tarefas.filter((t) => t.responsavelId === u.id && t.concluida && noPeriodo(t.concluidaEm, de, ate)).length,
      };
    });
  }

  // Relatório completo de um período [de, ate]
  function relatorio(de, ate) {
    const fechados = dados.negocios.filter((n) => (n.etapa === "ganho" || n.etapa === "perdido") && noPeriodo(n.fechadoEm, de, ate));
    const ganhos = fechados.filter((n) => n.etapa === "ganho");
    const perdidos = fechados.filter((n) => n.etapa === "perdido");
    const leads = dados.leads.filter((l) => noPeriodo(l.primeiroContato, de, ate));
    const convertidos = leads.filter((l) => l.status === "Convertido").length;
    const dias = U.diasEntre(de, ate) + 1;

    // Agrupa por semana (períodos curtos) ou por mês
    const grupos = [];
    if (dias <= 62) {
      let ini = de;
      while (ini <= ate) {
        const fim = U.somarDias(ini, 6) > ate ? ate : U.somarDias(ini, 6);
        grupos.push({ ini, fim, rotulo: U.dataCurta(ini) });
        ini = U.somarDias(fim, 1);
      }
    } else {
      let ini = U.inicioDoMes(de);
      while (ini <= ate) {
        const fim = U.fimDoMes(ini);
        grupos.push({ ini: ini < de ? de : ini, fim: fim > ate ? ate : fim, rotulo: U.nomeDoMes(ini) });
        ini = U.somarMeses(ini, 1);
      }
    }
    const serie = grupos.map((g) => {
      const g1 = ganhos.filter((n) => noPeriodo(n.fechadoEm, g.ini, g.fim));
      const p1 = perdidos.filter((n) => noPeriodo(n.fechadoEm, g.ini, g.fim));
      return { ...g, valor: g1.reduce((t, n) => t + n.valor, 0), ganhos: g1.length, perdidos: p1.length };
    });
    const motivos = NX.MOTIVOS_PERDA.map((m) => ({ rotulo: m, valor: perdidos.filter((n) => n.motivoPerda === m).length })).filter((m) => m.valor).sort((a, b) => b.valor - a.valor);
    const valorGanho = ganhos.reduce((t, n) => t + n.valor, 0);
    return {
      de, ate, porSemana: dias <= 62, serie,
      ganhos, perdidos, fechados,
      valorGanho,
      valorPerdido: perdidos.reduce((t, n) => t + n.valor, 0),
      ticketMedio: ganhos.length ? valorGanho / ganhos.length : 0,
      conversaoOportunidades: fechados.length ? ganhos.length / fechados.length : null,
      leadsNoPeriodo: leads.length,
      leadsConvertidos: convertidos,
      conversaoLeads: leads.length ? convertidos / leads.length : null,
      origens: leadsPorOrigem(de, ate),
      motivos,
      desempenho: desempenho(de, ate),
    };
  }

  /* Lembretes da central de notificações (calculados, não inventados) */
  function notificacoes() {
    const hoje = U.hoje();
    const lista = [];
    dados.tarefas.filter((t) => !t.concluida && t.prazo <= hoje).forEach((t) => {
      const atrasada = t.prazo < hoje;
      lista.push({ id: `t:${t.id}:${t.prazo}`, tipo: atrasada ? "atrasada" : "hoje", titulo: atrasada ? `Tarefa atrasada (${U.relativo(t.prazo)})` : "Tarefa para hoje", texto: `${t.titulo} · ${nomeDoVinculo(t.vinculo)}`, ref: { tipo: "tarefa", id: t.id }, ordem: t.prazo });
    });
    dados.negocios.filter((n) => aberto(n) && U.diasEntre(n.ultimaInteracao, hoje) >= 14).forEach((n) => {
      lista.push({ id: `n:${n.id}:${n.ultimaInteracao}`, tipo: "parado", titulo: `Sem interação há ${U.diasEntre(n.ultimaInteracao, hoje)} dias`, texto: `${n.titulo} · ${n.empresa}`, ref: { tipo: "negocio", id: n.id }, ordem: n.ultimaInteracao });
    });
    const lidas = new Set(dados.notificacoesLidas);
    const peso = { atrasada: 0, hoje: 1, parado: 2 };
    return lista.sort((a, b) => peso[a.tipo] - peso[b.tipo] || a.ordem.localeCompare(b.ordem)).map((x) => ({ ...x, lida: lidas.has(x.id) }));
  }

  carregar();

  NX.loja = {
    get dados() { return dados; },
    get persistente() { return persistente; },
    aoMudar(fn) { ouvintes.add(fn); },
    restaurar,
    lead, cliente, negocio, tarefa, membro, etapa, aberto, nomeDoVinculo, valorDoCliente, situacaoDaTarefa,
    salvarLead, excluirLead, converterLead,
    salvarCliente, adicionarObservacao, registrarContato,
    salvarNegocio, moverNegocio, excluirNegocio,
    salvarTarefa, concluirTarefa, excluirTarefa,
    salvarConfiguracoes, marcarNotificacoesLidas,
    indicadores, vendasPorMes, leadsPorOrigem, distribuicaoPorEtapa, desempenho, relatorio, notificacoes,
  };
})();
