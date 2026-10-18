/* ==========================================================================
   NEXORA BOOKING — agenda.js
   AÇÕES SOBRE RESERVAS. Criar, confirmar, iniciar, concluir, marcar falta,
   cancelar, reagendar, registrar pagamento e gerar notificações e
   mensagens. Cada ação confere se é permitida no status atual; horários
   sempre passam pelo motor de regras.js.

   Ciclo de vida:
     pendente ─► confirmado ─► em atendimento ─► concluído
        │            │  └────────────────────────► concluído
        │            ├─► não compareceu (só depois do horário)
        └────────────┴─► cancelado (libera o horário)
   Preço, duração e nome do serviço ficam guardados NA RESERVA: se o serviço
   mudar depois, as reservas antigas não mudam.
   Concluir não marca como pago: o pagamento é registrado à parte.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const d = () => L.dados;
  const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const processados = new Set();      // senhas (tokens) já usadas nesta página: impede envio duplo

  const nomeStatus = (s) => (NX.STATUS.find((x) => x.id === s) || {}).nome || s;
  const quemFez = (por) => (por === "cliente" ? "cliente" : d().perfil.nome);

  function novoCodigo() {
    let c;
    do { c = `NXB-${Array.from({ length: 5 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join("")}`; } while (L.porCodigo(c));
    return c;
  }
  function registrar(a, acao, texto, por) {
    const em = U.agora();
    a.historico.push({ em, acao, texto, por: quemFez(por) });
    a.atualizadoEm = em;
  }
  function notificar(a, tipo, origem) {
    d().notificacoes.unshift({ id: L.novoId("n"), tipo, agendamentoId: a.id, em: U.agora(), lida: origem === "equipe", origem });
    d().notificacoes = d().notificacoes.slice(0, 200);
  }
  const comecou = (a) => `${a.data}T${a.inicio}` <= U.agora();
  const minutosAte = (a) => { const agora = U.agora(); return U.diasEntre(agora.slice(0, 10), a.data) * 1440 + U.minutos(a.inicio) - U.minutos(agora.slice(11)); };

  /* ---------- O que pode ser feito agora com uma reserva ---------- */
  function acoesPermitidas(a) {
    const lista = [];
    const ja = comecou(a);
    if (a.status === "pendente") lista.push("confirmar");
    if (a.status === "confirmado" && a.data === U.hoje() && minutosAte(a) <= 60) lista.push("iniciar");
    if ((a.status === "em_atendimento" || a.status === "confirmado") && ja) lista.push("concluir");
    if ((a.status === "pendente" || a.status === "confirmado") && ja) lista.push("nao_compareceu");
    if ((a.status === "pendente" || a.status === "confirmado") && !ja) lista.push("reagendar");
    if (a.status === "pendente" || a.status === "confirmado") lista.push("cancelar");
    if (a.status === "concluido" && !a.pagamento) lista.push("pagamento");
    if (a.status === "concluido" && a.pagamento) lista.push("remover_pagamento");
    return lista;
  }
  const naoPode = (a, acao) => ({ ok: false, erro: `Não é possível ${acao} uma reserva com status "${nomeStatus(a.status)}".` });

  /* ---------- Criar ---------- */
  // v: { clienteId | cliente: {nome, telefone, email}, servicoId, profissionalId ("qualquer" aceito), data, inicio, observacoes, origem, status, token }
  function criar(v) {
    if (v.token && processados.has(v.token)) return { ok: false, duplicado: true, erro: "Esta reserva já foi enviada. Nada foi criado de novo." };
    L.sincronizar();                                   // pega reservas feitas em outra aba antes de conferir
    const erros = {};
    const origem = v.origem === "pagina" ? "pagina" : "painel";
    let cli = v.clienteId ? L.cliente(v.clienteId) : null;
    let dadosCliente = null;
    if (!cli && v.cliente) {
      const existente = L.clientePorTelefone(v.cliente.telefone);
      if (existente) cli = existente;                  // mesmo telefone: usa o cadastro que já existe (evita duplicar)
      else {
        const val = L.validarCliente(v.cliente, null, { publico: origem === "pagina" });
        if (Object.keys(val.erros).length) Object.assign(erros, Object.fromEntries(Object.entries(val.erros).map(([k, m]) => [`cliente_${k}`, m])));
        else dadosCliente = val.limpo;
      }
    }
    if (!cli && !dadosCliente && !Object.keys(erros).length) erros.clienteId = "Escolha o cliente ou cadastre um novo.";
    let profissionalId = v.profissionalId;
    if (profissionalId === "qualquer") {
      const r = R.horarios(d(), { servicoId: v.servicoId, profissionalId: "qualquer", data: v.data, contexto: origem });
      const slot = r.slots.find((s) => s.inicio === v.inicio);
      if (!slot) return { ok: false, codigo: "indisponivel", erro: "Este horário não está mais disponível. Escolha outro.", erros: { inicio: "Horário indisponível." } };
      profissionalId = R.escolherProfissional(d(), slot, v.data);
    }
    const check = R.verificar(d(), { servicoId: v.servicoId, profissionalId, data: v.data, inicio: v.inicio, contexto: origem });
    if (!check.ok) erros[["servico_inexistente", "servico_inativo"].includes(check.codigo) ? "servicoId" : ["profissional_inexistente", "profissional_inativo", "nao_habilitado"].includes(check.codigo) ? "profissionalId" : ["data_invalida", "feriado", "fechado", "folga", "folga_semanal", "sem_jornada", "limite_futuro"].includes(check.codigo) ? "data" : "inicio"] = check.mensagem;
    if (String(v.observacoes || "").length > 300) erros.observacoes = "Use no máximo 300 caracteres.";
    if (Object.keys(erros).length) return { ok: false, erros, codigo: check.codigo, erro: check.ok ? "Confira os campos destacados." : check.mensagem };

    if (dadosCliente) {
      cli = { id: L.novoId("c"), ...dadosCliente, criadoEm: U.agora(), origem, ficticio: false };
      d().clientes.push(cli);
    }
    const s = check.servico;
    const status = origem === "pagina" ? (d().estabelecimento.regras.confirmacaoAutomatica ? "confirmado" : "pendente") : (v.status === "pendente" ? "pendente" : "confirmado");
    d().sequencias.agendamento = (d().sequencias.agendamento || 0) + 1;
    const agora = U.agora();
    const a = {
      id: L.novoId("a"), codigo: novoCodigo(), clienteId: cli.id, servicoId: s.id, servicoNome: s.nome, profissionalId,
      data: v.data, inicio: check.inicio, fim: check.fim, duracao: check.duracao, preco: s.preco, status,
      observacoes: String(v.observacoes || "").trim(), origem, criadoEm: agora, atualizadoEm: agora,
      historico: [{ em: agora, acao: "criado", texto: origem === "pagina" ? "Solicitado pela página de agendamento" : "Criado no painel", por: origem === "pagina" ? "cliente" : d().perfil.nome }],
      reagendamentos: 0, cancelamento: null, pagamento: null,
    };
    if (status === "confirmado" && origem === "pagina") a.historico.push({ em: agora, acao: "confirmado", texto: "Confirmado automaticamente (regra do estabelecimento)", por: "sistema" });
    d().agendamentos.push(a);
    notificar(a, "novo", origem === "pagina" ? "cliente" : "equipe");
    if (v.token) processados.add(v.token);
    L.salvar();
    return { ok: true, agendamento: a, clienteNovo: !!dadosCliente };
  }

  /* ---------- Mudanças de status ---------- */
  function mudar(id, acao, fn) {
    L.sincronizar();
    const a = L.agendamento(id);
    if (!a) return { ok: false, erro: "Reserva não encontrada." };
    if (!acoesPermitidas(a).includes(acao)) {
      const textos = { confirmar: "confirmar", iniciar: "iniciar", concluir: "concluir", nao_compareceu: "marcar falta em", cancelar: "cancelar", reagendar: "reagendar", pagamento: "registrar pagamento em", remover_pagamento: "desfazer o pagamento de" };
      if (acao === "iniciar" && a.status === "confirmado") return { ok: false, erro: "O atendimento só pode ser iniciado no dia, até 1 hora antes do horário marcado." };
      if ((acao === "concluir" || acao === "nao_compareceu") && !comecou(a)) return { ok: false, erro: "Só é possível depois do horário de início da reserva." };
      if (acao === "reagendar" && comecou(a)) return { ok: false, erro: "O horário desta reserva já começou: ela não pode ser reagendada. Conclua, marque falta ou cancele." };
      return naoPode(a, textos[acao] || acao);
    }
    const r = fn(a);
    if (r && r.ok === false) return r;
    L.salvar();
    return { ok: true, agendamento: a, ...(r || {}) };
  }
  const confirmar = (id) => mudar(id, "confirmar", (a) => { a.status = "confirmado"; registrar(a, "confirmado", "Reserva confirmada"); notificar(a, "confirmado", "equipe"); });
  const iniciar = (id) => mudar(id, "iniciar", (a) => { a.status = "em_atendimento"; registrar(a, "iniciado", "Atendimento iniciado"); });
  const concluir = (id) => mudar(id, "concluir", (a) => { a.status = "concluido"; registrar(a, "concluido", "Atendimento concluído (pagamento ainda não registrado)"); });
  const naoCompareceu = (id) => mudar(id, "nao_compareceu", (a) => { a.status = "nao_compareceu"; registrar(a, "nao_compareceu", "Cliente não compareceu"); });

  function cancelar(id, { motivo, detalhe, por = "estabelecimento" } = {}) {
    if (!NX.MOTIVOS_CANCELAMENTO.includes(motivo)) return { ok: false, erros: { motivo: "Escolha o motivo do cancelamento." } };
    return mudar(id, "cancelar", (a) => {
      a.status = "cancelado";
      a.cancelamento = { em: U.agora(), motivo, detalhe: String(detalhe || "").trim().slice(0, 300), por };
      registrar(a, "cancelado", `Cancelado: ${motivo}${a.cancelamento.detalhe ? ` (${a.cancelamento.detalhe})` : ""}. O horário foi liberado.`, por);
      notificar(a, "cancelado", por === "cliente" ? "cliente" : "equipe");
    });
  }

  // novo: { data, inicio, profissionalId, servicoId? }
  function reagendar(id, novo, { por = "estabelecimento", contexto = "painel" } = {}) {
    L.sincronizar();
    const a = L.agendamento(id);
    if (!a) return { ok: false, erro: "Reserva não encontrada." };
    if (!acoesPermitidas(a).includes("reagendar")) return mudar(id, "reagendar", () => ({ ok: false }));
    const servicoId = novo.servicoId || a.servicoId;
    let profissionalId = novo.profissionalId || a.profissionalId;
    if (profissionalId === "qualquer") {
      const r = R.horarios(d(), { servicoId, profissionalId: "qualquer", data: novo.data, contexto, ignorarId: a.id });
      const slot = r.slots.find((s) => s.inicio === novo.inicio);
      if (!slot) return { ok: false, codigo: "indisponivel", erro: "Este horário não está disponível.", erros: { inicio: "Horário indisponível." } };
      profissionalId = R.escolherProfissional(d(), slot, novo.data);
    }
    if (novo.data === a.data && novo.inicio === a.inicio && profissionalId === a.profissionalId && servicoId === a.servicoId) return { ok: false, erros: { inicio: "Escolha um horário diferente do atual." }, erro: "O novo horário é igual ao atual." };
    const check = R.verificar(d(), { servicoId, profissionalId, data: novo.data, inicio: novo.inicio, ignorarId: a.id, contexto });
    if (!check.ok) return { ok: false, codigo: check.codigo, erro: check.mensagem, erros: { [["data_invalida", "feriado", "fechado", "folga", "folga_semanal", "sem_jornada", "limite_futuro"].includes(check.codigo) ? "data" : ["profissional_inativo", "nao_habilitado", "profissional_inexistente"].includes(check.codigo) ? "profissionalId" : ["servico_inativo", "servico_inexistente"].includes(check.codigo) ? "servicoId" : "inicio"]: check.mensagem } };
    const antes = `${U.dataCurta(a.data)} às ${a.inicio}${profissionalId !== a.profissionalId ? ` com ${L.profissional(a.profissionalId).nome}` : ""}`;
    if (servicoId !== a.servicoId) {                    // trocou de serviço: guarda o preço e a duração do serviço novo
      const s = check.servico;
      Object.assign(a, { servicoId: s.id, servicoNome: s.nome, preco: s.preco, duracao: s.duracao });
    }
    Object.assign(a, { data: novo.data, inicio: check.inicio, fim: check.fim, profissionalId });
    a.reagendamentos = (a.reagendamentos || 0) + 1;
    if (por === "cliente" && !d().estabelecimento.regras.confirmacaoAutomatica && a.status === "confirmado") a.status = "pendente";
    registrar(a, "reagendado", `Reagendado de ${antes} para ${U.dataCurta(a.data)} às ${a.inicio} com ${L.profissional(a.profissionalId).nome}`, por);
    notificar(a, "reagendado", por === "cliente" ? "cliente" : "equipe");
    L.salvar();
    return { ok: true, agendamento: a };
  }

  function editarObservacoes(id, texto) {
    const a = L.agendamento(id);
    if (!a) return { ok: false, erro: "Reserva não encontrada." };
    const t = String(texto || "").trim();
    if (t.length > 300) return { ok: false, erros: { observacoes: "Use no máximo 300 caracteres." } };
    a.observacoes = t;
    registrar(a, "editado", "Observações atualizadas");
    L.salvar();
    return { ok: true };
  }

  /* ---------- Pagamentos (registro manual; nada é cobrado) ---------- */
  function registrarPagamento(id, { valor, forma, data, observacao }) {
    const a = L.agendamento(id);
    if (!a) return { ok: false, erro: "Reserva não encontrada." };
    const erros = {};
    const v = U.lerValor(valor);
    if (!Number.isFinite(v) || v <= 0) erros.valor = "Informe o valor recebido, como 55,00.";
    else if (v > 100000) erros.valor = "Valor alto demais para esta demonstração.";
    if (!NX.FORMAS_PAGAMENTO.includes(forma)) erros.forma = "Escolha a forma de pagamento.";
    if (!U.dataValida(data)) erros.data = "Informe a data do pagamento.";
    else if (data > U.hoje()) erros.data = "A data não pode estar no futuro.";
    else if (data < a.data) erros.data = "A data não pode ser anterior ao atendimento.";
    if (Object.keys(erros).length) return { ok: false, erros };
    return mudar(id, "pagamento", (x) => {
      x.pagamento = { valor: U.arredondar(v), forma, em: `${data}T${data === U.hoje() ? U.agora().slice(11) : "12:00"}`, por: d().perfil.nome, observacao: String(observacao || "").trim().slice(0, 120) };
      registrar(x, "pagamento", `Pagamento registrado: ${U.moeda(x.pagamento.valor)} (${forma})`);
    });
  }
  function removerPagamento(id, motivo) {
    const t = String(motivo || "").trim();
    if (t.length < 5) return { ok: false, erros: { motivo: "Explique por que o registro está sendo desfeito." } };
    return mudar(id, "remover_pagamento", (a) => {
      registrar(a, "pagamento_removido", `Registro de pagamento de ${U.moeda(a.pagamento.valor)} desfeito: ${t}`);
      a.pagamento = null;
    });
  }

  /* ---------- Página pública: consulta, cancelamento e reagendamento pelo cliente ---------- */
  // Só devolve a reserva se o código e o telefone baterem (não expõe nada de outros clientes)
  function consultar(codigo, telefone) {
    L.sincronizar();
    const a = L.porCodigo(codigo);
    const tel = U.digitos(telefone);
    if (!a || !tel) return { ok: false, erro: "Não encontramos uma reserva com este código e telefone." };
    const c = L.cliente(a.clienteId);
    if (!c || c.telefone !== tel) return { ok: false, erro: "Não encontramos uma reserva com este código e telefone." };
    return { ok: true, agendamento: a };
  }
  function politicaCliente(a) {
    const regras = d().estabelecimento.regras;
    const faltam = minutosAte(a);
    const ativa = ["pendente", "confirmado"].includes(a.status);
    const podeCancelar = ativa && faltam >= regras.cancelamentoHoras * 60;
    const podeReagendar = ativa && faltam >= regras.reagendamentoHoras * 60 && (a.reagendamentos || 0) < regras.reagendamentosMax;
    let motivoReagendar = "";
    if (ativa && !podeReagendar) motivoReagendar = (a.reagendamentos || 0) >= regras.reagendamentosMax ? `Esta reserva já foi reagendada ${a.reagendamentos} ${a.reagendamentos === 1 ? "vez" : "vezes"}, o limite permitido.` : `Reagendamentos pela página só até ${regras.reagendamentoHoras} h antes do horário.`;
    return { podeCancelar, podeReagendar, motivoCancelar: ativa && !podeCancelar ? `Cancelamentos pela página só até ${regras.cancelamentoHoras} h antes do horário. Fale com o estabelecimento.` : "", motivoReagendar };
  }
  function cancelarPeloCliente(codigo, telefone) {
    const c = consultar(codigo, telefone);
    if (!c.ok) return c;
    const pol = politicaCliente(c.agendamento);
    if (!pol.podeCancelar) return { ok: false, erro: pol.motivoCancelar || "Esta reserva não pode mais ser cancelada pela página." };
    return cancelar(c.agendamento.id, { motivo: "Pedido do cliente", detalhe: "Cancelado pelo cliente na página de agendamento.", por: "cliente" });
  }
  function reagendarPeloCliente(codigo, telefone, novo) {
    const c = consultar(codigo, telefone);
    if (!c.ok) return c;
    const pol = politicaCliente(c.agendamento);
    if (!pol.podeReagendar) return { ok: false, erro: pol.motivoReagendar || "Esta reserva não pode mais ser reagendada pela página." };
    return reagendar(c.agendamento.id, novo, { por: "cliente", contexto: "pagina" });
  }

  /* ---------- Notificações e mensagens ---------- */
  // Lembretes calculados: atendimentos confirmados que começam nas próximas 3 horas
  function lembretes() {
    const agora = U.agora();
    return d().agendamentos.filter((a) => a.status === "confirmado" && `${a.data}T${a.inicio}` > agora && minutosAte(a) <= 180)
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
  }
  function marcarLidas(ids) {
    const set = new Set(ids);
    d().notificacoes.forEach((n) => { if (set.has(n.id)) n.lida = true; });
    L.salvar();
  }
  function preencher(modelo, a) {
    const c = L.cliente(a.clienteId) || { nome: "cliente" };
    const p = L.profissional(a.profissionalId) || { nome: "" };
    const mapa = {
      cliente: c.nome.split(" ")[0], servico: a.servicoNome, profissional: p.nome.split(" ")[0], data: U.dataCompleta(a.data), hora: a.inicio,
      codigo: a.codigo, estabelecimento: d().estabelecimento.nome,
    };
    return modelo.replace(/\{(\w+)\}/g, (m, k) => (k in mapa ? mapa[k] : m)).trim();
  }
  const mensagem = (a, tipo) => preencher(d().estabelecimento.mensagens[tipo] || NX.MODELOS_PADRAO[tipo], a);
  // Link do WhatsApp para o cliente. Nunca para clientes fictícios (o número pode existir de verdade).
  function linkWhatsapp(a, tipo) {
    const c = L.cliente(a.clienteId);
    if (!c || c.ficticio) return null;
    return `https://wa.me/55${c.telefone}?text=${encodeURIComponent(mensagem(a, tipo))}`;
  }

  /* ---------- Arquivo de calendário (.ics) com o fuso do estabelecimento ---------- */
  function arquivoCalendario(a) {
    const est = d().estabelecimento;
    const p = L.profissional(a.profissionalId);
    const f = (data, hora) => `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
    const esc = (t) => String(t || "").replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEXORA BOOKING//demonstracao//PT-BR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${a.codigo}@nexora-booking.demo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=${est.fuso}:${f(a.data, a.inicio)}`, `DTEND;TZID=${est.fuso}:${f(a.data, a.fim)}`,
      `SUMMARY:${esc(`${a.servicoNome} — ${est.nome}`)}`,
      `DESCRIPTION:${esc(`Profissional: ${p ? p.nome : ""}. Código da reserva: ${a.codigo}. Status: ${nomeStatus(a.status)}.`)}`,
      est.endereco ? `LOCATION:${esc(est.endereco)}` : null,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
  }

  NX.agenda = {
    nomeStatus, acoesPermitidas, criar, confirmar, iniciar, concluir, naoCompareceu, cancelar, reagendar, editarObservacoes,
    registrarPagamento, removerPagamento, consultar, politicaCliente, cancelarPeloCliente, reagendarPeloCliente,
    lembretes, marcarLidas, mensagem, linkWhatsapp, arquivoCalendario, minutosAte,
  };
})();
