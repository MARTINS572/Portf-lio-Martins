/* ==========================================================================
   NEXORA BOOKING — reservas.js
   Janelas das reservas no painel:
   • novo(pre)       → novo agendamento (horários livres calculados na hora)
   • reagendar(id)   → mesmo formulário, conferindo tudo de novo
   • detalhe(id)     → ficha da reserva com as ações permitidas no status
   • cancelar, pagamento, mensagem ao cliente e arquivo de calendário
   Os horários exibidos vêm SEMPRE de NX.regras.horarios (o mesmo motor da
   página pública) e a gravação passa por NX.agenda, que confere de novo.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const A = NX.agenda;
  const C = () => NX.componentes;
  const { el, icone, $ } = U;

  const linhaFicha = (rotulo, valor, inteira) => el("div", { class: `ficha__linha${inteira ? " ficha__linha--inteira" : ""}` }, el("dt", { texto: rotulo }), el("dd", {}, valor || el("span", { class: "suave", texto: "—" })));
  const novoToken = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  /* ======================================================================
     FORMULÁRIO: NOVO AGENDAMENTO E REAGENDAMENTO
     ====================================================================== */
  function abrirFormulario({ modo, reserva, pre = {} }) {
    const d = L.dados;
    const dlg = $("#dlg-reserva");
    const form = $("#form-reserva");
    const reag = modo === "reagendar";
    const token = novoToken();
    const estado = {
      clienteModo: "existente",
      clienteId: reag ? reserva.clienteId : (pre.clienteId || null),
      servicoId: reag ? reserva.servicoId : (pre.servicoId || ""),
      profissionalId: reag ? reserva.profissionalId : (pre.profissionalId || "qualquer"),
      data: reag ? reserva.data : (pre.data && pre.data >= U.hoje() ? pre.data : U.hoje()),
      inicio: reag ? null : (pre.inicio || null),
      pedidoInicio: reag ? null : (pre.inicio || null),
      status: "confirmado",
    };
    if (!reag && estado.servicoId && (L.servico(estado.servicoId) || {}).status !== "ativo") estado.servicoId = "";
    // Clicou num espaço da agenda de um profissional: sugere o primeiro serviço que ele faz
    if (!reag && !estado.servicoId && pre.profissionalId) {
      const p = L.profissional(pre.profissionalId);
      const s = p && d.servicos.find((x) => x.status === "ativo" && p.servicos.includes(x.id));
      if (s) estado.servicoId = s.id;
    }

    $("#reserva-rotulo").textContent = reag ? `Reserva ${reserva.codigo}` : "Agenda";
    $("#reserva-titulo").textContent = reag ? "Reagendar" : "Novo agendamento";
    $("#reserva-salvar").textContent = reag ? "Salvar novo horário" : "Agendar";
    $("#reserva-erro").textContent = "";

    const erroDe = (nome) => el("p", { class: "campo__erro", id: `r-${nome}-erro`, role: "alert" });
    const erros = { cliente: erroDe("cliente"), servico: erroDe("servico"), profissional: erroDe("profissional"), data: erroDe("data"), inicio: erroDe("inicio"), observacoes: erroDe("observacoes") };

    /* ---------- 1. Cliente ---------- */
    const blocoCliente = el("div", { class: "bloco-form" });
    const busca = el("input", { id: "r-cliente-busca", type: "search", autocomplete: "off", placeholder: "Nome ou telefone", role: "combobox", "aria-expanded": "false", "aria-controls": "r-sugestoes", "aria-autocomplete": "list", "aria-describedby": "r-cliente-erro" });
    const sugestoes = el("div", { class: "cliente-sugestoes", id: "r-sugestoes", role: "listbox", "aria-label": "Clientes encontrados", hidden: true });
    const novoNome = el("input", { id: "r-novo-nome", type: "text", maxlength: 80, autocomplete: "off" });
    const novoTel = el("input", { id: "r-novo-telefone", type: "tel", inputmode: "tel", maxlength: 16, autocomplete: "off", placeholder: "(00) 00000-0000" });
    const novoEmail = el("input", { id: "r-novo-email", type: "email", maxlength: 120, autocomplete: "off" });
    novoTel.addEventListener("input", () => { novoTel.value = U.mascaraTelefone(novoTel.value); avisoTelefone(); });
    const avisoTel = el("p", { class: "campo__ajuda", hidden: true });
    function avisoTelefone() {
      const existente = L.clientePorTelefone(novoTel.value);
      avisoTel.hidden = !existente;
      U.trocar(avisoTel, ...(existente ? [`Este telefone já é de ${existente.nome}. `, el("button", { class: "link-btn", type: "button", texto: "Usar este cadastro", onclick: () => { estado.clienteModo = "existente"; estado.clienteId = existente.id; desenharCliente(); } })] : []));
    }
    const erroNovo = { nome: el("p", { class: "campo__erro" }), telefone: el("p", { class: "campo__erro" }), email: el("p", { class: "campo__erro" }) };

    function desenharCliente() {
      erros.cliente.textContent = "";
      const titulo = el("p", { class: "bloco-form__titulo" }, el("span", { class: "n", texto: "1" }), "Cliente");
      if (reag) {
        const c = L.cliente(reserva.clienteId);
        U.trocar(blocoCliente, titulo, el("div", { class: "cliente-escolhido" }, el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c ? c.nome : "?") }), el("span", {}, el("b", { texto: c ? c.nome : "Cliente removido" }), el("small", { texto: `${reserva.servicoNome} · ${reserva.duracao} min · preço registrado ${U.moeda(reserva.preco)}` }))));
        return;
      }
      const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Tipo de cliente" },
        el("button", { type: "button", "aria-pressed": String(estado.clienteModo === "existente"), texto: "Cliente cadastrado", onclick: () => { estado.clienteModo = "existente"; desenharCliente(); busca.focus(); } }),
        el("button", { type: "button", "aria-pressed": String(estado.clienteModo === "novo"), texto: "Novo cliente", onclick: () => { estado.clienteModo = "novo"; estado.clienteId = null; desenharCliente(); novoNome.focus(); } }));
      let corpo;
      if (estado.clienteModo === "existente" && estado.clienteId) {
        const c = L.cliente(estado.clienteId);
        const r = NX.metricas.resumoClientes().get(c.id) || {};
        corpo = el("div", { class: "cliente-escolhido" },
          el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c.nome) }),
          el("span", {}, el("b", { texto: c.nome }), el("small", { texto: `${U.mascaraTelefone(c.telefone)} · ${U.plural(r.atendimentos || 0, "atendimento", "atendimentos")}${r.ultimaVisita ? ` · última visita ${U.dataCurta(r.ultimaVisita)}` : ""}` }),
            c.observacoes ? el("small", { class: "nota-cliente" }, icone("triangle-alert", 12), ` ${c.observacoes}`) : null),
          el("button", { class: "btn btn--fantasma btn--pequeno", type: "button", texto: "Trocar", onclick: () => { estado.clienteId = null; desenharCliente(); busca.focus(); } }));
      } else if (estado.clienteModo === "existente") {
        corpo = el("div", { class: "campo cliente-escolha" }, el("label", { for: "r-cliente-busca" }, "Buscar cliente", el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" })), busca, sugestoes);
      } else {
        const campo = (id, rotulo, ctrl, erro, obrig) => el("div", { class: "campo" }, el("label", { for: id }, rotulo, obrig ? el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" }) : el("span", { class: "campo__opc", texto: " (opcional)" })), ctrl, erro);
        corpo = el("div", { class: "campos" },
          campo("r-novo-nome", "Nome", novoNome, erroNovo.nome, true),
          campo("r-novo-telefone", "Telefone (WhatsApp)", novoTel, erroNovo.telefone, true),
          campo("r-novo-email", "E-mail", novoEmail, erroNovo.email, false),
          el("div", { class: "campo--inteira" }, avisoTel));
      }
      U.trocar(blocoCliente, titulo, seg, corpo, erros.cliente);
    }
    // Busca de clientes (nome ou telefone)
    let itens = [];
    let ativo = -1;
    const fecharSug = () => { sugestoes.hidden = true; busca.setAttribute("aria-expanded", "false"); busca.removeAttribute("aria-activedescendant"); ativo = -1; };
    const marcar = (i) => { ativo = i; itens.forEach((x, k) => x.setAttribute("aria-selected", String(k === i))); if (itens[i]) { busca.setAttribute("aria-activedescendant", itens[i].id); itens[i].scrollIntoView({ block: "nearest" }); } };
    const escolher = (c) => { estado.clienteId = c.id; busca.value = ""; fecharSug(); desenharCliente(); $("#r-servico").focus(); };
    busca.addEventListener("input", () => {
      const q = busca.value.trim();
      if (q.length < 2) { fecharSug(); return; }
      const dig = U.digitos(q);
      const achados = L.dados.clientes.filter((c) => U.contem(c.nome, q) || (dig.length >= 3 && c.telefone.includes(dig))).slice(0, 8);
      itens = achados.map((c, i) => {
        const b = el("button", { class: "cliente-sugestao", type: "button", role: "option", id: `r-sug-${i}`, "aria-selected": "false", tabindex: "-1", onclick: () => escolher(c) },
          el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c.nome) }), el("span", {}, el("b", { texto: c.nome }), el("small", { texto: U.mascaraTelefone(c.telefone) })));
        b.addEventListener("pointerdown", (e) => e.preventDefault());
        return b;
      });
      U.trocar(sugestoes, ...(itens.length ? itens : [el("p", { class: "busca__vazio" }, `Nenhum cliente com "${q}". `, el("button", { class: "link-btn", type: "button", texto: "Cadastrar novo", onclick: () => {
        estado.clienteModo = "novo"; desenharCliente();
        if (dig.length >= 8) novoTel.value = U.mascaraTelefone(dig); else novoNome.value = q;
        avisoTelefone(); novoNome.focus();
      } }))]));
      sugestoes.hidden = false;
      busca.setAttribute("aria-expanded", "true");
      marcar(itens.length ? 0 : -1);
    });
    busca.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && itens.length) { e.preventDefault(); marcar((ativo + 1) % itens.length); }
      else if (e.key === "ArrowUp" && itens.length) { e.preventDefault(); marcar((ativo - 1 + itens.length) % itens.length); }
      else if (e.key === "Enter") { e.preventDefault(); if (itens[ativo]) itens[ativo].click(); }
      else if (e.key === "Escape" && !sugestoes.hidden) { e.preventDefault(); e.stopPropagation(); fecharSug(); }
    });
    busca.addEventListener("blur", () => setTimeout(fecharSug, 150));

    /* ---------- 2. Serviço e profissional ---------- */
    const selServico = el("select", { id: "r-servico", "aria-describedby": "r-servico-erro r-servico-resumo", disabled: reag });
    selServico.append(el("option", { value: "", texto: "Escolha o serviço" }));
    const grupos = new Map();
    d.servicos.filter((s) => s.status === "ativo" || (reag && s.id === reserva.servicoId)).forEach((s) => {
      if (!grupos.has(s.categoria)) { const g = el("optgroup", { label: s.categoria }); grupos.set(s.categoria, g); selServico.append(g); }
      grupos.get(s.categoria).append(el("option", { value: s.id, texto: `${s.nome} · ${s.duracao} min · ${U.moeda(s.preco)}${s.status === "ativo" ? "" : " (inativo)"}` }));
    });
    selServico.value = estado.servicoId || "";
    const resumoServico = el("p", { class: "resumo-servico", id: "r-servico-resumo" });
    const selProf = el("select", { id: "r-profissional", "aria-describedby": "r-profissional-erro" });

    function desenharProfissionais() {
      const sid = estado.servicoId;
      const habilitados = d.profissionais.filter((p) => p.status === "ativo" && (!sid || p.servicos.includes(sid)));
      U.trocar(selProf, el("option", { value: "qualquer", texto: "Qualquer profissional disponível" }), ...habilitados.map((p) => el("option", { value: p.id, texto: p.nome })));
      if (estado.profissionalId !== "qualquer" && !habilitados.some((p) => p.id === estado.profissionalId)) {
        const atual = L.profissional(estado.profissionalId);
        if (atual && sid) erros.profissional.textContent = atual.status !== "ativo" ? `${atual.nome} está inativo e não recebe reservas.` : `${atual.nome} não realiza este serviço. Mostrando os horários de quem realiza.`;
        estado.profissionalId = "qualquer";
      } else erros.profissional.textContent = "";
      selProf.value = estado.profissionalId;
      const s = L.servico(sid);
      U.trocar(resumoServico, ...(s ? [el("span", {}, icone("clock", 13), " Duração ", el("b", { texto: `${reag ? reserva.duracao : s.duracao} min` })), el("span", {}, icone("tag", 13), " Preço ", el("b", { texto: U.moeda(reag ? reserva.preco : s.preco) })), s.descricao ? el("span", { texto: s.descricao }) : null] : []));
    }
    selServico.addEventListener("change", () => { estado.servicoId = selServico.value; erros.servico.textContent = ""; estado.inicio = null; desenharProfissionais(); desenharHorarios(); });
    selProf.addEventListener("change", () => { estado.profissionalId = selProf.value; erros.profissional.textContent = ""; estado.inicio = null; desenharHorarios(); });

    /* ---------- 3. Data e horário ---------- */
    const inData = el("input", { id: "r-data", type: "date", min: U.hoje(), max: U.somarDias(U.hoje(), 366), value: estado.data, "aria-describedby": "r-data-erro r-data-desc" });
    const descData = el("p", { class: "campo__ajuda", id: "r-data-desc" });
    const caixaHorarios = el("div", { id: "r-horarios" });
    inData.addEventListener("change", () => {
      if (!U.dataValida(inData.value)) { erros.data.textContent = "Informe uma data válida."; return; }
      if (inData.value < U.hoje()) { erros.data.textContent = "Não é possível agendar em data que já passou."; return; }
      erros.data.textContent = "";
      estado.data = inData.value; estado.inicio = null; desenharHorarios();
    });
    function desenharHorarios() {
      erros.inicio.textContent = "";
      descData.textContent = U.dataValida(estado.data) ? `${U.dataLonga(estado.data)} · horário de ${U.fusoAtual() === "America/Sao_Paulo" ? "Brasília" : U.fusoAtual()}` : "";
      if (!estado.servicoId) { U.trocar(caixaHorarios, el("p", { class: "horarios-vazio" }, icone("info", 16), el("span", { texto: "Escolha o serviço para ver os horários livres." }))); return; }
      const r = R.horarios(L.dados, { servicoId: estado.servicoId, profissionalId: estado.profissionalId, data: estado.data, contexto: "painel", ignorarId: reag ? reserva.id : undefined });
      const slots = r.slots.filter((s) => !(reag && s.inicio === reserva.inicio && estado.data === reserva.data && (estado.profissionalId === reserva.profissionalId || estado.profissionalId === "qualquer") && s.profissionais.length === 1 && s.profissionais[0] === reserva.profissionalId));
      if (estado.pedidoInicio) {
        if (!slots.some((s) => s.inicio === estado.pedidoInicio)) erros.inicio.textContent = `O horário ${estado.pedidoInicio} não está livre para este serviço e profissional (a duração não cabe, há outra reserva ou é fora do expediente). Escolha outro.`;
        else estado.inicio = estado.pedidoInicio;
        estado.pedidoInicio = null;
      }
      if (!slots.length) {
        const prox = proximoDia();
        U.trocar(caixaHorarios, el("p", { class: "horarios-vazio" }, icone("calendar-x", 16), el("span", {},
          R.MOTIVO_DIA[r.motivo] || "Nenhum horário livre neste dia.",
          prox ? [" Próximo dia com horário: ", el("button", { class: "link-btn", type: "button", texto: `${U.dataLonga(prox)}`, onclick: () => { estado.data = prox; inData.value = prox; desenharHorarios(); const b = caixaHorarios.querySelector(".horario"); if (b) b.focus(); } })] : " Não há horários livres nos próximos 30 dias.")));
        return;
      }
      const grade = el("div", { class: "horarios", role: "group", "aria-label": `Horários livres em ${U.dataLonga(estado.data)}` });
      slots.forEach((s) => {
        const nomes = s.profissionais.map((pid) => L.profissional(pid).nome.split(" ")[0]).join(", ");
        grade.append(el("button", { class: "horario", type: "button", "aria-pressed": String(estado.inicio === s.inicio), title: `${s.inicio}–${s.fim} · ${nomes}`, "aria-label": `${s.inicio} até ${s.fim}${estado.profissionalId === "qualquer" ? `, com ${nomes}` : ""}`, texto: s.inicio, onclick: (e) => {
          estado.inicio = s.inicio; erros.inicio.textContent = "";
          grade.querySelectorAll(".horario").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
        } }));
      });
      U.trocar(caixaHorarios, el("p", { class: "campo__ajuda", texto: `${U.plural(slots.length, "horário livre", "horários livres")}. O fim já considera a duração do serviço.` }), grade);
    }
    function proximoDia() {
      for (let i = 1; i <= 30; i += 1) {
        const data = U.somarDias(estado.data, i);
        if (R.horarios(L.dados, { servicoId: estado.servicoId, profissionalId: estado.profissionalId, data, contexto: "painel", ignorarId: reag ? reserva.id : undefined }).slots.length) return data;
      }
      return null;
    }

    /* ---------- 4. Status e observações ---------- */
    const segStatus = el("div", { class: "segmentado", role: "group", "aria-label": "Status inicial" },
      ...[["confirmado", "Confirmado"], ["pendente", "Pendente (aguardando confirmação)"]].map(([v, t]) => el("button", { type: "button", "aria-pressed": String(estado.status === v), texto: t, onclick: (e) => {
        estado.status = v;
        segStatus.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
      } })));
    const obs = el("textarea", { id: "r-observacoes", rows: 2, maxlength: 300, placeholder: "Ex.: cliente prefere a navalha; trazer referência", "aria-describedby": "r-observacoes-erro" });
    if (reag) obs.disabled = true;

    const campo = (id, rotulo, ctrl, extra = [], obrig = true) => el("div", { class: "campo" }, el("label", { for: id }, rotulo, obrig ? el("span", { class: "campo__obrig", "aria-hidden": "true", texto: " *" }) : el("span", { class: "campo__opc", texto: " (opcional)" })), ctrl, ...extra);
    const corpo = el("div", { class: "passos-reserva" },
      blocoCliente,
      el("div", { class: "bloco-form" },
        el("p", { class: "bloco-form__titulo" }, el("span", { class: "n", texto: "2" }), reag ? "Profissional" : "Serviço e profissional"),
        el("div", { class: "campos" },
          reag ? null : campo("r-servico", "Serviço", selServico, [erros.servico]),
          campo("r-profissional", "Profissional", selProf, [erros.profissional])),
        resumoServico),
      el("div", { class: "bloco-form" },
        el("p", { class: "bloco-form__titulo" }, el("span", { class: "n", texto: "3" }), reag ? "Nova data e horário" : "Data e horário"),
        el("div", { class: "campos" }, campo("r-data", "Data", inData, [descData, erros.data])),
        caixaHorarios, erros.inicio),
      reag ? el("p", { class: "nota-info" }, icone("info", 16), el("span", {}, "O horário atual (", el("b", { texto: `${U.dataCurta(reserva.data)} às ${reserva.inicio}` }), ") fica livre assim que o novo for salvo. Todas as regras são conferidas de novo.")) : el("div", { class: "bloco-form" },
        el("p", { class: "bloco-form__titulo" }, el("span", { class: "n", texto: "4" }), "Status e observações"),
        segStatus,
        campo("r-observacoes", "Observações", obs, [erros.observacoes], false)));
    U.trocar($("#reserva-corpo"), corpo);
    desenharCliente();
    desenharProfissionais();
    desenharHorarios();

    /* ---------- Salvar ---------- */
    let enviando = false;
    form.onsubmit = (e) => {
      e.preventDefault();
      if (enviando) return;
      Object.values(erros).forEach((p) => { p.textContent = ""; });
      Object.values(erroNovo).forEach((p) => { p.textContent = ""; });
      $("#reserva-erro").textContent = "";
      const faltas = [];
      if (!reag && estado.clienteModo === "existente" && !estado.clienteId) { erros.cliente.textContent = "Busque e escolha o cliente, ou cadastre um novo."; faltas.push(busca); }
      if (!reag && !estado.servicoId) { erros.servico.textContent = "Escolha o serviço."; faltas.push(selServico); }
      if (!estado.inicio) { erros.inicio.textContent = "Escolha um dos horários livres."; faltas.push(caixaHorarios.querySelector(".horario") || inData); }
      if (faltas.length) { $("#reserva-erro").textContent = "Confira os campos destacados."; faltas[0].focus(); return; }
      enviando = true;
      $("#reserva-salvar").disabled = true;
      let r;
      try {
        r = reag
          ? A.reagendar(reserva.id, { data: estado.data, inicio: estado.inicio, profissionalId: estado.profissionalId })
          : A.criar({
            clienteId: estado.clienteModo === "existente" ? estado.clienteId : null,
            cliente: estado.clienteModo === "novo" ? { nome: novoNome.value, telefone: novoTel.value, email: novoEmail.value } : null,
            servicoId: estado.servicoId, profissionalId: estado.profissionalId, data: estado.data, inicio: estado.inicio,
            observacoes: obs.value, origem: "painel", status: estado.status, token,
          });
      } finally { enviando = false; $("#reserva-salvar").disabled = false; }
      if (r.ok) {
        dlg.close();
        const a = r.agendamento;
        U.aviso(reag ? `Reserva ${a.codigo} reagendada para ${U.dataCurta(a.data)} às ${a.inicio} com ${L.profissional(a.profissionalId).nome}.` : `Agendamento ${a.codigo} criado: ${C().nomeDoCliente(a.clienteId).split(" ")[0]}, ${U.dataCurta(a.data)} às ${a.inicio} com ${L.profissional(a.profissionalId).nome}.`);
        if (reag && $("#dlg-detalhe").open) detalhe(a.id);
        return;
      }
      const e2 = r.erros || {};
      if (e2.cliente_nome) erroNovo.nome.textContent = e2.cliente_nome;
      if (e2.cliente_telefone) erroNovo.telefone.textContent = e2.cliente_telefone;
      if (e2.cliente_email) erroNovo.email.textContent = e2.cliente_email;
      if (e2.clienteId) erros.cliente.textContent = e2.clienteId;
      if (e2.servicoId) erros.servico.textContent = e2.servicoId;
      if (e2.profissionalId) erros.profissional.textContent = e2.profissionalId;
      if (e2.data) erros.data.textContent = e2.data;
      if (e2.observacoes) erros.observacoes.textContent = e2.observacoes;
      $("#reserva-erro").textContent = r.erro || "Confira os campos destacados.";
      if (e2.inicio || ["conflito", "bloqueio", "passado", "fora_expediente", "indisponivel"].includes(r.codigo)) {
        // Alguém ocupou o horário (outra aba, por exemplo): atualiza a grade e mantém o resto preenchido
        estado.inicio = null;
        desenharHorarios();
        erros.inicio.textContent = e2.inicio || r.erro;
      }
      const alvo = [[e2.cliente_nome, novoNome], [e2.cliente_telefone, novoTel], [e2.cliente_email, novoEmail], [e2.servicoId, selServico], [e2.profissionalId, selProf], [e2.data, inData], [e2.observacoes, obs]].find(([m]) => m);
      (alvo ? alvo[1] : (caixaHorarios.querySelector(".horario") || inData)).focus();
    };
    if (!dlg.open) dlg.showModal();
    if (reag) selProf.focus();
    else if (estado.clienteId) selServico.focus();
    else busca.focus();
  }
  const novo = (pre = {}) => abrirFormulario({ modo: "novo", pre });
  function reagendar(id) {
    const a = L.agendamento(id);
    if (!a) { U.aviso("Reserva não encontrada.", "erro"); return; }
    if (!A.acoesPermitidas(a).includes("reagendar")) { const r = A.reagendar(id, {}); U.aviso(r.erro || "Esta reserva não pode ser reagendada.", "erro"); return; }
    abrirFormulario({ modo: "reagendar", reserva: a });
  }

  /* ======================================================================
     DETALHES DA RESERVA
     ====================================================================== */
  let detalheId = null;
  const ACOES = {
    confirmar: { rotulo: "Confirmar", icone: "circle-check", classe: "btn--primario" },
    iniciar: { rotulo: "Iniciar atendimento", icone: "play", classe: "btn--primario" },
    concluir: { rotulo: "Concluir", icone: "check-check", classe: "btn--primario" },
    nao_compareceu: { rotulo: "Não compareceu", icone: "user-x", classe: "btn--linha" },
    reagendar: { rotulo: "Reagendar", icone: "calendar-sync", classe: "btn--linha" },
    cancelar: { rotulo: "Cancelar reserva", icone: "circle-x", classe: "btn--perigo" },
    pagamento: { rotulo: "Registrar pagamento", icone: "circle-dollar-sign", classe: "btn--primario" },
  };

  function executar(acao, id) {
    const a = L.agendamento(id);
    if (!a) return;
    const ok = (r, msg) => { if (r.ok) { U.aviso(msg); detalhe(id); } else U.aviso(r.erro || "Não foi possível concluir a ação.", "erro"); };
    if (acao === "confirmar") ok(A.confirmar(id), `Reserva ${a.codigo} confirmada.`);
    if (acao === "iniciar") ok(A.iniciar(id), "Atendimento iniciado.");
    if (acao === "concluir") ok(A.concluir(id), "Atendimento concluído. O pagamento ainda não foi registrado.");
    if (acao === "nao_compareceu") {
      U.confirmar({ titulo: "Marcar que o cliente não compareceu?", texto: `${C().nomeDoCliente(a.clienteId)} · ${U.dataCurta(a.data)} às ${a.inicio}. A reserva sai do faturamento previsto e entra na taxa de faltas.`, rotulo: "Marcar falta", perigo: true })
        .then((sim) => { if (sim) ok(A.naoCompareceu(id), "Falta registrada."); });
    }
    if (acao === "reagendar") reagendar(id);
    if (acao === "cancelar") formCancelar(id);
    if (acao === "pagamento") formPagamento(id);
  }

  function formCancelar(id) {
    const a = L.agendamento(id);
    U.formulario({
      titulo: "Cancelar reserva",
      descricao: el("span", {}, `${C().nomeDoCliente(a.clienteId)} · ${a.servicoNome} · ${U.dataLonga(a.data)} às ${a.inicio}. O horário fica livre na hora para outra reserva.`),
      rotuloSalvar: "Cancelar reserva",
      campos: [
        { nome: "motivo", rotulo: "Motivo", tipo: "select", obrigatorio: true, vazio: "Escolha o motivo", opcoes: NX.MOTIVOS_CANCELAMENTO, largura: "inteira" },
        { nome: "detalhe", rotulo: "Detalhes", tipo: "textarea", max: 300, largura: "inteira", placeholder: "Ex.: cliente avisou pelo telefone" },
      ],
      aoSalvar: (v) => {
        const r = A.cancelar(id, { motivo: v.motivo, detalhe: v.detalhe, por: "estabelecimento" });
        if (r.ok) { U.aviso(`Reserva ${a.codigo} cancelada. O horário das ${a.inicio} foi liberado.`); if ($("#dlg-detalhe").open) detalhe(id); }
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }

  function formPagamento(id) {
    const a = L.agendamento(id);
    U.formulario({
      titulo: "Registrar pagamento",
      descricao: el("span", {}, "Só registra o que foi recebido no balcão. ", el("b", { texto: "Nenhuma cobrança é feita e nenhum dinheiro é movimentado por este sistema." })),
      rotuloSalvar: "Registrar",
      campos: [
        { nome: "valor", rotulo: "Valor recebido (R$)", tipo: "dinheiro", obrigatorio: true, valor: U.decimal(a.preco), ajuda: `Preço registrado na reserva: ${U.moeda(a.preco)}.` },
        { nome: "forma", rotulo: "Forma", tipo: "select", obrigatorio: true, vazio: "Escolha", opcoes: NX.FORMAS_PAGAMENTO },
        { nome: "data", rotulo: "Data do pagamento", tipo: "date", obrigatorio: true, valor: U.hoje() < a.data ? a.data : U.hoje(), min: a.data, max: U.hoje() },
        { nome: "observacao", rotulo: "Observação", tipo: "text", max: 120, placeholder: "Ex.: desconto de cliente frequente" },
      ],
      aoSalvar: (v) => {
        const r = A.registrarPagamento(id, v);
        if (r.ok) { U.aviso(`Pagamento de ${U.moeda(U.lerValor(v.valor))} registrado.`); if ($("#dlg-detalhe").open) detalhe(id); }
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
  }
  function formRemoverPagamento(id) {
    U.formulario({
      titulo: "Desfazer registro de pagamento",
      descricao: el("span", { texto: "O atendimento volta para \"a receber\". A alteração fica no histórico da reserva." }),
      rotuloSalvar: "Desfazer registro",
      campos: [{ nome: "motivo", rotulo: "Por que o registro está sendo desfeito?", tipo: "textarea", obrigatorio: true, max: 200, largura: "inteira" }],
      aoSalvar: (v) => {
        const r = A.removerPagamento(id, v.motivo);
        if (r.ok) { U.aviso("Registro de pagamento desfeito."); if ($("#dlg-detalhe").open) detalhe(id); }
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
    $("#form-salvar").className = "btn btn--perigo-cheio";
  }
  function formObservacoes(id) {
    const a = L.agendamento(id);
    U.formulario({
      titulo: "Observações da reserva",
      campos: [{ nome: "observacoes", rotulo: "Observações", tipo: "textarea", max: 300, valor: a.observacoes, largura: "inteira" }],
      aoSalvar: (v) => {
        const r = A.editarObservacoes(id, v.observacoes);
        if (r.ok) { U.aviso("Observações salvas."); if ($("#dlg-detalhe").open) detalhe(id); }
        return r.ok ? r : { ok: false, erros: r.erros || {}, erro: r.erro };
      },
    });
  }

  /* ---------- Mensagem para o cliente (texto pronto; nada é enviado sozinho) ---------- */
  const TIPOS_MSG = [["novo", "Recebemos a solicitação"], ["confirmado", "Confirmação"], ["lembrete", "Lembrete"], ["reagendado", "Reagendamento"], ["cancelado", "Cancelamento"]];
  function tipoSugerido(a) {
    if (a.status === "cancelado") return "cancelado";
    if (a.status === "pendente") return "novo";
    if (a.data === U.hoje() && a.status === "confirmado") return "lembrete";
    if (a.reagendamentos) return "reagendado";
    return "confirmado";
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch (e) {
      const t = el("textarea", { style: { position: "fixed", opacity: "0" } });
      t.value = texto;
      ($("dialog[open]") || document.body).append(t);
      t.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (erro) { ok = false; }
      t.remove();
      return ok;
    }
  }
  function blocoMensagem(a) {
    const c = L.cliente(a.clienteId);
    let tipo = tipoSugerido(a);
    const previa = el("p", { class: "mensagem-previa", id: "msg-previa", "aria-live": "polite" });
    const links = el("div", { class: "acoes-reserva" });
    const sel = el("select", { class: "seletor", "aria-label": "Tipo de mensagem", "data-foco": "msg-tipo" }, ...TIPOS_MSG.map(([v, t]) => el("option", { value: v, texto: t })));
    sel.value = tipo;
    const desenhar = () => {
      const texto = A.mensagem(a, tipo);
      previa.textContent = texto;
      const zap = A.linkWhatsapp(a, tipo);
      U.trocar(links, 
        C().botao("Copiar texto", "btn--linha btn--pequeno", async () => { const ok = await copiar(texto); U.aviso(ok ? "Mensagem copiada. Cole no WhatsApp ou no e-mail." : "Não foi possível copiar. Selecione o texto e copie manualmente.", ok ? "ok" : "erro"); }, "copy", { "data-foco": "msg-copiar" }),
        zap ? el("a", { class: "btn btn--linha btn--pequeno", href: zap, target: "_blank", rel: "noopener" }, icone("message-circle", 16), "Abrir no WhatsApp") : null,
        c && c.email && !c.ficticio ? el("a", { class: "btn btn--linha btn--pequeno", href: `mailto:${c.email}?subject=${encodeURIComponent(`${L.dados.estabelecimento.nome} — reserva ${a.codigo}`)}&body=${encodeURIComponent(texto)}` }, icone("mail", 16), "Abrir no e-mail") : null);
    };
    sel.addEventListener("change", () => { tipo = sel.value; desenhar(); });
    desenhar();
    return el("section", { class: "secao-detalhe" },
      el("h3", { texto: "Mensagem para o cliente" }),
      el("div", { class: "barra-filtros" }, sel),
      previa, links,
      c && c.ficticio ? el("p", { class: "nota-info" }, icone("info", 16), el("span", {}, "Cliente fictício da demonstração: os botões de WhatsApp e e-mail ficam ocultos para não abrir conversa com um número ou endereço de verdade. Em clientes cadastrados por você eles aparecem.")) : el("p", { class: "campo__ajuda", texto: "O sistema não envia mensagens sozinho: o botão abre o WhatsApp ou o e-mail com o texto pronto, e você decide se envia." }));
  }

  function baixarCalendario(a) {
    const blob = new Blob([A.arquivoCalendario(a)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: `reserva-${a.codigo}.ics` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    U.aviso(`Arquivo reserva-${a.codigo}.ics gerado (abre na agenda do celular ou do computador).`);
  }

  const ICONES_HIST = { criado: "calendar-plus", confirmado: "circle-check", iniciado: "play", concluido: "check-check", nao_compareceu: "user-x", cancelado: "circle-x", reagendado: "calendar-sync", pagamento: "circle-dollar-sign", pagamento_removido: "undo-2", editado: "pencil" };
  function detalhe(id) {
    const a = L.agendamento(id);
    if (!a) { U.aviso("Reserva não encontrada.", "erro"); return; }
    detalheId = id;
    const dlg = $("#dlg-detalhe");
    const c = L.cliente(a.clienteId);
    const p = L.profissional(a.profissionalId);
    const s = L.servico(a.servicoId);
    const acoes = A.acoesPermitidas(a);
    const fechar = () => dlg.close();
    $("#detalhe-tipo").textContent = `Reserva ${a.codigo}`;
    $("#detalhe-titulo").textContent = c ? c.nome : "Cliente removido";

    const motivoBloqueio = [];
    if (a.status === "confirmado" && !acoes.includes("iniciar") && !acoes.includes("concluir")) motivoBloqueio.push(a.data === U.hoje() ? "O atendimento pode ser iniciado a partir de 1 hora antes do horário." : "O atendimento poderá ser iniciado no dia da reserva.");
    if (["pendente", "confirmado"].includes(a.status) && !acoes.includes("reagendar")) motivoBloqueio.push("O horário já começou: conclua, marque falta ou cancele.");

    const corpo = [
      el("div", { class: "reserva-topo" },
        C().pilulaStatus(a.status), C().pilulaPagamento(a),
        C().pilula(a.origem === "pagina" ? "Pela página online" : "Pelo painel", "origem", a.origem === "pagina" ? "globe" : "monitor"),
        a.reagendamentos ? C().pilula(`Reagendada ${a.reagendamentos}×`, "neutra", "calendar-sync") : null),
      el("div", { class: `reserva-quando ${C().corProf(a.profissionalId)}` },
        el("span", { class: "reserva-quando__data", "aria-hidden": "true" }, el("b", { texto: a.data.slice(8, 10) }), el("small", { texto: U.dataCurta(a.data).split(" ")[1] || "" })),
        el("span", { class: "reserva-quando__hora", texto: `${a.inicio} – ${a.fim}` }),
        el("span", { class: "reserva-quando__sub", texto: `${U.dataLonga(a.data).replace(/^./, (x) => x.toUpperCase())} · ${U.relativo(a.data)}` })),
      el("div", { class: "acoes-reserva" },
        ...acoes.filter((x) => ACOES[x]).map((x) => C().botao(ACOES[x].rotulo, `${ACOES[x].classe} btn--pequeno`, () => executar(x, id), ACOES[x].icone, { "data-foco": `acao-${x}` })),
        acoes.includes("remover_pagamento") ? C().botao("Desfazer pagamento", "btn--fantasma btn--pequeno", () => formRemoverPagamento(id), "undo-2") : null),
      motivoBloqueio.length ? el("p", { class: "campo__ajuda", texto: motivoBloqueio.join(" ") }) : null,
      el("dl", { class: "ficha" },
        linhaFicha("Cliente", c ? el("a", { class: "link-texto", href: `#/clientes/${c.id}`, onclick: fechar, texto: c.nome }) : null),
        linhaFicha("Telefone", c ? el("span", { class: "mono", texto: U.mascaraTelefone(c.telefone) }) : null),
        linhaFicha("Serviço", `${a.servicoNome}${s && s.status !== "ativo" ? " (serviço inativo)" : ""}`),
        linhaFicha("Profissional", C().nomeProf(a.profissionalId)),
        linhaFicha("Duração", `${a.duracao} min`),
        linhaFicha("Preço registrado", el("span", {}, U.moeda(a.preco), s && s.preco !== a.preco ? el("span", { class: "suave", texto: ` (preço atual do serviço: ${U.moeda(s.preco)})` }) : null)),
        linhaFicha("Criada em", U.dataHora(a.criadoEm)),
        linhaFicha("Atualizada em", U.dataHora(a.atualizadoEm)),
        a.cancelamento ? linhaFicha("Cancelamento", `${a.cancelamento.motivo}${a.cancelamento.detalhe ? ` — ${a.cancelamento.detalhe}` : ""} (${a.cancelamento.por === "cliente" ? "pelo cliente" : "pelo estabelecimento"}, ${U.dataHora(a.cancelamento.em)})`, true) : null,
        linhaFicha("Observações", el("span", {}, a.observacoes || el("span", { class: "suave", texto: "Nenhuma" }), " ", el("button", { class: "link-btn", type: "button", texto: "Editar", "data-foco": "editar-obs", onclick: () => formObservacoes(id) })), true),
        c && c.observacoes ? linhaFicha("Nota do cadastro do cliente", el("span", {}, icone("triangle-alert", 13), ` ${c.observacoes}`), true) : null),
      a.status === "concluido" ? el("section", { class: "secao-detalhe" }, el("h3", { texto: "Pagamento" }),
        el("div", { class: "pagamento-caixa" }, a.pagamento
          ? el("span", {}, el("b", { texto: `${U.moeda(a.pagamento.valor)} · ${a.pagamento.forma}` }), el("small", { texto: `Registrado em ${U.dataCompleta(a.pagamento.em)} por ${a.pagamento.por}${a.pagamento.observacao ? ` · ${a.pagamento.observacao}` : ""}` }))
          : el("span", {}, el("b", { texto: `A receber: ${U.moeda(a.preco)}` }), el("small", { texto: "Concluir o atendimento não marca como pago. Registre quando receber." })))) : null,
      blocoMensagem(a),
      el("section", { class: "secao-detalhe" }, el("h3", { texto: "Histórico" }),
        el("ol", { class: "linha-tempo" }, ...[...a.historico].reverse().map((h) => el("li", {},
          el("span", { class: "linha-tempo__icone" }, icone(ICONES_HIST[h.acao] || "dot", 14)),
          el("div", {}, el("span", { texto: h.texto }), el("span", { class: "suave", texto: `${U.dataHora(h.em)} · ${h.por === "cliente" ? "cliente" : h.por}` })))))),
    ];
    U.trocar($("#detalhe-corpo"), ...corpo.filter(Boolean));
    U.trocar($("#detalhe-botoes"), 
      C().botao("Baixar para a agenda (.ics)", "btn--fantasma", () => baixarCalendario(a), "calendar-arrow-down"),
      el("span", { class: "janela__espaco" }),
      C().botao("Ver na agenda", "btn--linha", () => { fechar(); NX.ir(`agenda?data=${a.data}&visao=dia`); }, "calendar-days"),
      C().botao("Fechar", "btn--linha", fechar));
    if (!dlg.open) { dlg.showModal(); }
    const foco = $("#detalhe-corpo .acoes-reserva .btn") || $("#detalhe-botoes .btn--linha");
    if (foco && (!document.activeElement || !dlg.contains(document.activeElement) || !document.activeElement.isConnected)) foco.focus();
  }
  // Se os dados mudarem (outra aba, por exemplo) com a ficha aberta, ela se atualiza
  L.aoMudar(() => {
    const dlg = $("#dlg-detalhe");
    if (dlg && dlg.open && detalheId && !$("#dlg-form").open && !$("#dlg-reserva").open && !$("#dlg-confirmar").open) {
      if (L.agendamento(detalheId)) detalhe(detalheId); else dlg.close();
    }
  });

  NX.reservas = { novo, reagendar, detalhe, cancelar: formCancelar, pagamento: formPagamento, baixarCalendario, copiar, linhaFicha };
})();
