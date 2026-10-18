/* ==========================================================================
   NEXORA BOOKING — publico.js
   PÁGINA PÚBLICA DE AGENDAMENTO (o que o cliente vê).
   Fluxo: serviço → profissional → data → horário → nome → telefone →
   e-mail (opcional) → observações e aceite da política → revisão →
   confirmação com código. Também "Minha reserva" (código + telefone) para
   consultar, cancelar ou reagendar dentro da política.
   Usa o MESMO motor de regras e o mesmo armazenamento do painel: só
   aparecem horários realmente livres, e nada de outros clientes é exibido.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const R = NX.regras;
  const A = NX.agenda;
  const { el, icone, $ } = U;

  const PASSOS = ["Serviço", "Profissional", "Data e horário", "Seus dados", "Revisão"];
  const estado = { aba: "agendar", passo: 0, servicoId: "", profissionalId: "qualquer", data: "", inicio: "", nome: "", telefone: "", email: "", observacoes: "", aceite: false, token: "", resultado: null, enviando: false };
  const minha = { codigo: "", telefone: "", reserva: null, erro: "", reagendando: false, data: "", inicio: "", profissionalId: "", aviso: "" };
  const d = () => L.dados;
  const est = () => d().estabelecimento;
  const novoToken = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const inicial = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const nomeFuso = () => ((NX.FUSOS.find(([id]) => id === est().fuso) || [, est().fuso])[1] || "").split(" (")[0];
  const textoFuso = () => (est().fuso === "America/Sao_Paulo" ? "horário de Brasília" : `fuso local (${nomeFuso()})`);

  /* ---------- Disponibilidade (o mesmo motor do painel, no contexto "pagina") ---------- */
  const servicosDisponiveis = () => d().servicos.filter((s) => s.status === "ativo" && d().profissionais.some((p) => p.status === "ativo" && p.servicos.includes(s.id)));
  const profissionaisDo = (sid) => d().profissionais.filter((p) => p.status === "ativo" && p.servicos.includes(sid));
  const horariosDe = (data, { servicoId = estado.servicoId, profissionalId = estado.profissionalId, ignorarId } = {}) => R.horarios(d(), { servicoId, profissionalId, data, contexto: "pagina", ignorarId });
  function dias({ servicoId = estado.servicoId, profissionalId = estado.profissionalId, ignorarId } = {}) {
    const lista = [];
    for (let i = 0; i <= est().regras.diasFuturos; i += 1) {
      const data = U.somarDias(U.hoje(), i);
      const r = horariosDe(data, { servicoId, profissionalId, ignorarId });
      lista.push({ data, quantidade: r.slots.length, motivo: r.motivo });
    }
    return lista;
  }

  /* ---------- Cabeçalho do estabelecimento ---------- */
  function desenharTopo() {
    const e = est();
    const cor = NX.CORES_PAGINA.find((c) => c.id === e.pagina.cor) || NX.CORES_PAGINA[0];
    document.documentElement.style.setProperty("--marca", cor.cor);
    document.documentElement.style.setProperty("--marca-forte", cor.forte);
    document.title = `${e.nome} · Agendamento online (demonstração)`;
    const logo = $("#est-logo");
    U.trocar(logo, e.logo ? el("img", { src: e.logo, alt: `Logo de ${e.nome}` }) : el("span", { "aria-hidden": "true", texto: U.iniciais(e.nome) }));
    $("#est-nome").textContent = e.nome;
    $("#est-descricao").textContent = e.descricao || "";
    $("#est-descricao").hidden = !e.descricao;
    const info = [];
    if (e.pagina.mostrarEndereco && e.endereco) info.push(el("li", {}, icone("map-pin", 15), el("span", { texto: e.endereco })));
    if (e.telefone) info.push(el("li", {}, icone("phone", 15), e.telefoneFicticio ? el("span", { texto: `${e.telefone} (telefone fictício)` }) : el("a", { href: `tel:+55${U.digitos(e.telefone)}`, texto: e.telefone })));
    info.push(el("li", {}, icone("clock", 15), el("span", { texto: `Todos os horários em ${textoFuso()}` })));
    U.trocar($("#est-info"), info);
    const zap = $("#est-whatsapp");
    zap.hidden = !e.whatsapp;
    if (e.whatsapp) zap.href = `https://wa.me/${e.whatsapp}?text=${encodeURIComponent(`Olá! Vim pela página de agendamento de ${e.nome}.`)}`;
    U.trocar($("#expediente"), ...[1, 2, 3, 4, 5, 6, 0].map((dow) => { const h = e.horarios[dow]; return el("li", {}, el("span", { texto: NX.DIAS[dow] }), el("b", { texto: h ? `${h.abre}–${h.fecha}${h.pausa ? ` (pausa ${h.pausa.inicio}–${h.pausa.fim})` : ""}` : "Fechado" })); }));
  }

  /* ---------- Abas ---------- */
  function desenharAbas() {
    document.querySelectorAll("[data-aba]").forEach((b) => {
      const ativa = b.dataset.aba === estado.aba;
      b.setAttribute("aria-selected", String(ativa));
      b.tabIndex = ativa ? 0 : -1;
    });
    $("#painel-agendar").hidden = estado.aba !== "agendar";
    $("#painel-minha").hidden = estado.aba !== "minha";
  }
  function irAba(aba, focar) {
    estado.aba = aba;
    desenharAbas();
    if (aba === "agendar") desenharFluxo(focar); else desenharMinha(focar);
  }

  /* ======================================================================
     FLUXO DE AGENDAMENTO
     ====================================================================== */
  function progresso() {
    const passos = PASSOS.filter((_, i) => i !== 1 || est().pagina.permitirEscolherProfissional);
    const atual = estado.passo - (estado.passo > 1 && !est().pagina.permitirEscolherProfissional ? 1 : 0);
    return el("div", { class: "progresso-passos" },
      el("p", { class: "progresso-passos__texto", texto: estado.resultado ? "Pronto!" : `Etapa ${atual + 1} de ${passos.length}: ${passos[atual]}` }),
      el("ol", { class: "progresso-passos__barra", "aria-hidden": "true" }, ...passos.map((_, i) => el("li", { class: estado.resultado || i < atual ? "is-feito" : i === atual ? "is-atual" : "" }))));
  }
  const titulo = (texto, sub) => el("div", { class: "etapa__cabeca" }, el("h2", { class: "etapa__titulo", tabindex: "-1", texto }), sub ? el("p", { class: "etapa__sub", texto: sub }) : null);
  const voltar = (passo) => el("button", { class: "btn btn--fantasma", type: "button", onclick: () => { estado.passo = passo; desenharFluxo(true); } }, icone("arrow-left", 16), "Voltar");
  function resumoEscolha() {
    const s = L.servico(estado.servicoId);
    const p = estado.profissionalId !== "qualquer" ? L.profissional(estado.profissionalId) : null;
    const itens = [];
    if (s) itens.push(el("li", {}, icone("sparkles", 14), `${s.nome} · ${s.duracao} min${est().pagina.mostrarPrecos ? ` · ${U.moeda(s.preco)}` : ""}`));
    if (estado.passo > 1 && est().pagina.permitirEscolherProfissional) itens.push(el("li", {}, icone("user", 14), p ? p.nome : "Sem preferência de profissional"));
    if (estado.passo > 2 && estado.inicio) itens.push(el("li", {}, icone("calendar", 14), `${inicial(U.dataLonga(estado.data))} às ${estado.inicio}`));
    return itens.length ? el("ul", { class: "escolhas", "aria-label": "Suas escolhas" }, ...itens) : null;
  }

  function passoServico() {
    const lista = servicosDisponiveis();
    if (!lista.length) return [titulo("Escolha o serviço"), el("p", { class: "aviso-caixa", texto: "No momento não há serviços disponíveis para agendamento online. Entre em contato com o estabelecimento." })];
    const grupos = new Map();
    lista.forEach((s) => { if (!grupos.has(s.categoria)) grupos.set(s.categoria, []); grupos.get(s.categoria).push(s); });
    return [
      titulo("Escolha o serviço", est().pagina.boasVindas || null),
      ...[...grupos.entries()].map(([cat, itens]) => el("section", { class: "grupo", "aria-label": cat },
        el("h3", { class: "grupo__titulo", texto: cat }),
        el("div", { class: "opcoes-lista" }, ...itens.map((s) => el("button", {
          class: "opcao-cartao", type: "button", "aria-pressed": String(estado.servicoId === s.id), "data-servico": s.id,
          onclick: () => {
            if (estado.servicoId !== s.id) { estado.inicio = ""; estado.data = ""; }
            estado.servicoId = s.id;
            if (estado.profissionalId !== "qualquer" && !profissionaisDo(s.id).some((p) => p.id === estado.profissionalId)) estado.profissionalId = "qualquer";
            estado.passo = est().pagina.permitirEscolherProfissional ? 1 : 2;
            if (!est().pagina.permitirEscolherProfissional) estado.profissionalId = "qualquer";
            desenharFluxo(true);
          },
        },
        s.imagem ? el("img", { class: "opcao-cartao__foto", src: s.imagem, alt: "" }) : null,
        el("span", { class: "opcao-cartao__texto" }, el("b", { texto: s.nome }), s.descricao ? el("span", { texto: s.descricao }) : null),
        el("span", { class: "opcao-cartao__fim" }, el("span", { class: "duracao" }, icone("clock", 13), `${s.duracao} min`), est().pagina.mostrarPrecos ? el("b", { class: "preco", texto: U.moeda(s.preco) }) : null)))))),
    ];
  }

  function passoProfissional() {
    const s = L.servico(estado.servicoId);
    const lista = profissionaisDo(estado.servicoId);
    const opcao = (id, nome, sub, avatar) => el("button", { class: "opcao-cartao", type: "button", "aria-pressed": String(estado.profissionalId === id), "data-prof": id, onclick: () => {
      if (estado.profissionalId !== id) { estado.inicio = ""; estado.data = ""; }
      estado.profissionalId = id; estado.passo = 2; desenharFluxo(true);
    } }, avatar, el("span", { class: "opcao-cartao__texto" }, el("b", { texto: nome }), el("span", { texto: sub })), icone("chevron-right", 18));
    return [
      titulo("Com quem?", `Profissionais que fazem ${s ? s.nome.toLowerCase() : "este serviço"}.`),
      resumoEscolha(),
      el("div", { class: "opcoes-lista" },
        opcao("qualquer", "Sem preferência", "Mostra todos os horários livres; o sistema escolhe quem estiver disponível", el("span", { class: "avatar-pub avatar-pub--qualquer", "aria-hidden": "true" }, icone("users", 18))),
        ...lista.map((p) => opcao(p.id, p.nome, p.especialidades.join(" · "), el("span", { class: "avatar-pub", "aria-hidden": "true" }, p.foto ? el("img", { src: p.foto, alt: "" }) : U.iniciais(p.nome))))),
      el("div", { class: "etapa__botoes" }, voltar(0)),
    ];
  }

  // Faixa de dias + grade de horários (usada no agendamento e no reagendamento)
  function seletorHorario({ alvo, ignorarId, servicoId, profissionalId, aoEscolher, rotuloAtual }) {
    const lista = dias({ servicoId, profissionalId, ignorarId });
    if (!alvo.data || !lista.some((x) => x.data === alvo.data && x.quantidade)) {
      const primeiro = lista.find((x) => x.quantidade);
      alvo.data = primeiro ? primeiro.data : lista[0].data;
      alvo.inicio = "";
    }
    const MOTIVO_CURTO = { feriado: "Feriado", fechado: "Fechado", folga: "Sem atendimento", lotado: "Lotado", limite_futuro: "Indisponível", sem_profissional: "Indisponível" };
    const faixa = el("div", { class: "dias", role: "group", "aria-label": "Dias" }, ...lista.map((x) => el("button", {
      class: "dia", type: "button", "aria-pressed": String(alvo.data === x.data), disabled: !x.quantidade, "data-dia": x.data,
      "aria-label": `${U.dataLonga(x.data)}: ${x.quantidade ? U.plural(x.quantidade, "horário disponível", "horários disponíveis") : MOTIVO_CURTO[x.motivo] || "sem horários"}`,
      onclick: () => { alvo.data = x.data; alvo.inicio = ""; aoEscolher(false); },
    }, el("span", { class: "dia__semana", texto: x.data === U.hoje() ? "Hoje" : x.data === U.somarDias(U.hoje(), 1) ? "Amanhã" : NX.DIAS_CURTOS[U.diaDaSemana(x.data)] }),
    el("b", { class: "dia__num", texto: String(Number(x.data.slice(8))) }),
    el("span", { class: "dia__mes", texto: U.dataCurta(x.data).split(" ")[1] }),
    el("span", { class: "dia__qtd", texto: x.quantidade ? `${x.quantidade} hor.` : x.data === U.hoje() && x.motivo === "lotado" ? "Encerrado" : (MOTIVO_CURTO[x.motivo] || "—") }))));
    const r = horariosDe(alvo.data, { servicoId, profissionalId, ignorarId });
    const periodos = [["Manhã", (h) => h < "12:00"], ["Tarde", (h) => h >= "12:00" && h < "18:00"], ["Noite", (h) => h >= "18:00"]];
    const grade = r.slots.length ? el("div", { class: "turnos" }, ...periodos.map(([nome, f]) => {
      const slots = r.slots.filter((s) => f(s.inicio));
      if (!slots.length) return null;
      return el("div", { class: "turno" }, el("h3", { class: "turno__titulo", texto: nome }),
        el("div", { class: "horarios-pub", role: "group", "aria-label": `Horários da ${nome.toLowerCase()}` }, ...slots.map((s) => el("button", {
          class: "horario-pub", type: "button", "aria-pressed": String(alvo.inicio === s.inicio), "data-hora": s.inicio, "aria-label": `${s.inicio}, termina às ${s.fim}`,
          onclick: () => { alvo.inicio = s.inicio; aoEscolher(true); },
        }, s.inicio))));
    })) : el("p", { class: "aviso-caixa" }, icone("calendar-x", 16), el("span", { texto: lista.some((x) => x.quantidade) ? "Não há horários livres neste dia. Escolha outro dia acima." : `Não há horários livres nos próximos ${est().regras.diasFuturos} dias para esta escolha. ${est().pagina.permitirEscolherProfissional ? "Tente \"Sem preferência\" de profissional ou " : "Tente "}outro serviço, ou fale com o estabelecimento.` }));
    return el("div", { class: "seletor-horario" },
      el("div", { class: "dias-rolagem" }, faixa),
      el("p", { class: "dia-escolhido", "aria-live": "polite" }, el("b", { texto: inicial(U.dataLonga(alvo.data)) }), rotuloAtual || ` · ${textoFuso()}`),
      grade);
  }

  function passoHorario() {
    const regras = est().regras;
    return [
      titulo("Escolha a data e o horário", `Só aparecem horários livres, com ${regras.antecedenciaMinima >= 60 ? `${Math.round(regras.antecedenciaMinima / 60)} h` : `${regras.antecedenciaMinima} min`} de antecedência e até ${regras.diasFuturos} dias à frente.`),
      resumoEscolha(),
      seletorHorario({ alvo: estado, servicoId: estado.servicoId, profissionalId: estado.profissionalId, aoEscolher: (avancar) => { if (avancar) estado.passo = 3; desenharFluxo(avancar); if (!avancar) focarDia(); } }),
      el("div", { class: "etapa__botoes" }, voltar(est().pagina.permitirEscolherProfissional ? 1 : 0)),
    ];
  }
  const focarDia = () => { const b = document.querySelector('#painel-agendar .dia[aria-pressed="true"]'); if (b) b.focus(); };

  function campo(id, rotulo, controle, { obrigatorio, ajuda, erro } = {}) {
    controle.id = id;
    const pErro = el("p", { class: "campo-pub__erro", id: `${id}-erro`, role: "alert", texto: erro || "" });
    controle.setAttribute("aria-describedby", `${id}-erro${ajuda ? ` ${id}-ajuda` : ""}`);
    if (erro) controle.setAttribute("aria-invalid", "true");
    return el("div", { class: "campo-pub" }, el("label", { for: id }, rotulo, obrigatorio ? el("span", { class: "obrig", "aria-hidden": "true", texto: " *" }) : el("span", { class: "opc", texto: " (opcional)" })), controle, ajuda ? el("p", { class: "campo-pub__ajuda", id: `${id}-ajuda`, texto: ajuda }) : null, pErro);
  }
  let errosDados = {};
  function textoPolitica() {
    const r = est().regras;
    return `${r.confirmacaoAutomatica ? "Sua reserva é confirmada na hora." : "Sua reserva fica pendente até o estabelecimento confirmar."} Você pode cancelar até ${r.cancelamentoHoras} h antes e reagendar até ${r.reagendamentoHoras} h antes (no máximo ${U.plural(r.reagendamentosMax, "vez", "vezes")}) em "Minha reserva", com o código e o telefone.`;
  }
  function passoDados() {
    const nome = el("input", { type: "text", autocomplete: "name", maxlength: 80, value: estado.nome });
    const tel = el("input", { type: "tel", autocomplete: "tel-national", inputmode: "tel", maxlength: 16, placeholder: "(00) 00000-0000", value: estado.telefone });
    const email = el("input", { type: "email", autocomplete: "email", maxlength: 120, value: estado.email });
    const obs = el("textarea", { rows: 2, maxlength: 300, placeholder: "Algo que o profissional precisa saber" });
    obs.value = estado.observacoes;
    const aceite = el("input", { type: "checkbox", id: "p-aceite" });
    aceite.checked = estado.aceite;
    tel.addEventListener("input", () => { tel.value = U.mascaraTelefone(tel.value); });
    const guardar = () => Object.assign(estado, { nome: nome.value, telefone: tel.value, email: email.value, observacoes: obs.value, aceite: aceite.checked });
    [nome, tel, email, obs].forEach((x) => x.addEventListener("input", guardar));
    aceite.addEventListener("change", guardar);
    const form = el("form", { class: "form-pub", novalidate: true, onsubmit: (e) => {
      e.preventDefault();
      guardar();
      errosDados = {};
      const n = estado.nome.trim().replace(/\s+/g, " ");
      if (n.length < 3) errosDados.nome = "Digite seu nome (pelo menos 3 letras).";
      if (!U.telefoneValido(estado.telefone)) errosDados.telefone = "Digite o celular com DDD, como (11) 91234-5678.";
      if (estado.email.trim() && !U.emailValido(estado.email.trim())) errosDados.email = "Digite um e-mail válido ou deixe em branco.";
      if (!estado.aceite) errosDados.aceite = "Para continuar, marque que leu a política de agendamento.";
      if (Object.keys(errosDados).length) { desenharFluxo(false); const primeiro = { nome: "p-nome", telefone: "p-telefone", email: "p-email", aceite: "p-aceite" }[Object.keys(errosDados)[0]]; $(`#${primeiro}`).focus(); return; }
      estado.passo = 4;
      desenharFluxo(true);
    } },
    campo("p-nome", "Nome", nome, { obrigatorio: true, erro: errosDados.nome }),
    campo("p-telefone", "Celular (WhatsApp)", tel, { obrigatorio: true, ajuda: "Usado só para falar sobre esta reserva e para você consultá-la depois.", erro: errosDados.telefone }),
    campo("p-email", "E-mail", email, { erro: errosDados.email }),
    campo("p-observacoes", "Observações", obs),
    el("div", { class: "politica" }, el("p", {}, icone("info", 15), el("span", { texto: textoPolitica() })),
      el("label", { class: "marcar-pub", for: "p-aceite" }, aceite, el("span", { texto: "Li e concordo com a política de agendamento e cancelamento." })),
      el("p", { class: "campo-pub__erro", role: "alert", id: "p-aceite-erro", texto: errosDados.aceite || "" })),
    el("p", { class: "nota-dados", texto: "Pedimos só o necessário para o atendimento. Nesta demonstração, os dados ficam apenas neste navegador." }),
    el("div", { class: "etapa__botoes" }, voltar(2), el("button", { class: "btn btn--marca", type: "submit" }, "Continuar", icone("arrow-right", 16))));
    return [titulo("Seus dados", "Para o estabelecimento saber quem vem."), resumoEscolha(), form];
  }

  function passoRevisao() {
    const s = L.servico(estado.servicoId);
    const p = estado.profissionalId !== "qualquer" ? L.profissional(estado.profissionalId) : null;
    const v = estado.inicio ? R.verificar(d(), { servicoId: estado.servicoId, profissionalId: p ? p.id : (horariosDe(estado.data).slots.find((x) => x.inicio === estado.inicio) || { profissionais: [""] }).profissionais[0], data: estado.data, inicio: estado.inicio, contexto: "pagina" }) : { ok: false };
    const auto = est().regras.confirmacaoAutomatica;
    const linha = (rotulo, valor) => el("div", { class: "revisao__linha" }, el("dt", { texto: rotulo }), el("dd", { texto: valor }));
    return [
      titulo("Confira e confirme"),
      el("dl", { class: "revisao" },
        linha("Serviço", `${s ? s.nome : "—"} (${s ? s.duracao : "—"} min)`),
        est().pagina.mostrarPrecos && s ? linha("Valor", `${U.moeda(s.preco)} · pago no local`) : null,
        linha("Profissional", p ? p.nome : "Sem preferência (definido ao confirmar)"),
        linha("Data", inicial(U.dataLonga(estado.data))),
        linha("Horário", `${estado.inicio}${v.ok ? ` às ${v.fim}` : ""} (${textoFuso()})`),
        linha("Nome", estado.nome.trim()),
        linha("Celular", U.mascaraTelefone(estado.telefone)),
        estado.email.trim() ? linha("E-mail", estado.email.trim()) : null,
        estado.observacoes.trim() ? linha("Observações", estado.observacoes.trim()) : null),
      el("p", { class: "aviso-caixa aviso-caixa--info" }, icone("info", 16), el("span", { texto: auto ? "Ao confirmar, o horário fica reservado para você." : "Ao enviar, o horário fica reservado e a reserva aparece como pendente até o estabelecimento confirmar." })),
      el("p", { class: "campo-pub__erro", role: "alert", id: "p-erro-envio" }),
      el("div", { class: "etapa__botoes" }, voltar(3),
        el("button", { class: "btn btn--marca", type: "button", id: "p-confirmar", onclick: enviar }, icone("calendar-check", 16), auto ? "Confirmar agendamento" : "Enviar pedido de agendamento")),
      el("p", { class: "nota-dados", texto: "Nenhum pagamento é feito por esta página. Demonstração: nada é enviado por WhatsApp ou e-mail." }),
    ];
  }

  function enviar() {
    if (estado.enviando) return;
    estado.enviando = true;
    const botao = $("#p-confirmar");
    botao.disabled = true;
    if (!estado.token) estado.token = novoToken();
    const r = A.criar({
      cliente: { nome: estado.nome, telefone: estado.telefone, email: estado.email },
      servicoId: estado.servicoId, profissionalId: estado.profissionalId, data: estado.data, inicio: estado.inicio,
      observacoes: estado.observacoes, origem: "pagina", token: estado.token,
    });
    estado.enviando = false;
    if (r.ok) {
      estado.resultado = { codigo: r.agendamento.codigo, id: r.agendamento.id, nome: estado.nome.trim().split(" ")[0], telefone: estado.telefone };
      desenharFluxo(true);
      return;
    }
    botao.disabled = false;
    if (r.duplicado) { $("#p-erro-envio").textContent = r.erro; return; }
    const e = r.erros || {};
    if (e.cliente_nome || e.cliente_telefone || e.cliente_email) {
      errosDados = { nome: e.cliente_nome, telefone: e.cliente_telefone, email: e.cliente_email };
      estado.passo = 3; desenharFluxo(true); return;
    }
    // Horário ocupado enquanto a pessoa preenchia (outra aba, outra pessoa): volta para escolher de novo
    estado.inicio = "";
    estado.passo = 2;
    estado.token = "";
    desenharFluxo(true);
    U.aviso(`Este horário acabou de ficar indisponível. ${r.erro && !/agendamento neste horário/.test(r.erro) ? r.erro : "Escolha outro, por favor."}`, "erro");
  }

  function telaResultado() {
    const a = L.agendamento(estado.resultado.id);
    if (!a) return [titulo("Reserva não encontrada"), el("p", { texto: "Os dados desta demonstração foram restaurados." })];
    const p = L.profissional(a.profissionalId);
    const pendente = a.status === "pendente";
    return [
      el("div", { class: `resultado ${pendente ? "resultado--pendente" : "resultado--ok"}` },
        el("span", { class: "resultado__icone", "aria-hidden": "true" }, icone(pendente ? "hourglass" : "circle-check", 30)),
        el("h2", { class: "etapa__titulo", tabindex: "-1", texto: pendente ? `Pedido enviado, ${estado.resultado.nome}!` : `Agendado, ${estado.resultado.nome}!` }),
        el("p", { class: "resultado__status" }, el("span", { class: `selo-status selo-status--${a.status}` }, icone(pendente ? "hourglass" : "circle-check", 14), pendente ? "Aguardando confirmação" : "Confirmado"),
          pendente ? " O horário já está reservado para você. O estabelecimento confirma em seguida." : " Seu horário está garantido."),
        el("div", { class: "codigo-caixa" }, el("span", { texto: "Código da reserva" }), el("b", { class: "codigo-grande", texto: a.codigo }),
          el("button", { class: "btn btn--linha btn--p", type: "button", onclick: async () => { const ok = await copiar(a.codigo); U.aviso(ok ? "Código copiado." : "Anote o código: " + a.codigo, ok ? "ok" : "info"); } }, icone("copy", 15), "Copiar"))),
      el("dl", { class: "revisao" },
        el("div", { class: "revisao__linha" }, el("dt", { texto: "Serviço" }), el("dd", { texto: `${a.servicoNome} (${a.duracao} min)` })),
        el("div", { class: "revisao__linha" }, el("dt", { texto: "Profissional" }), el("dd", { texto: p ? p.nome : "—" })),
        el("div", { class: "revisao__linha" }, el("dt", { texto: "Quando" }), el("dd", { texto: `${inicial(U.dataLonga(a.data))}, ${a.inicio}–${a.fim}` }))),
      el("p", { class: "nota-dados", texto: "Guarde o código: com ele e o seu celular você consulta, cancela ou reagenda em \"Minha reserva\"." }),
      el("div", { class: "etapa__botoes etapa__botoes--coluna" },
        el("button", { class: "btn btn--marca", type: "button", onclick: () => baixarIcs(a) }, icone("calendar-arrow-down", 16), "Adicionar à minha agenda (.ics)"),
        el("button", { class: "btn btn--linha", type: "button", onclick: () => { Object.assign(minha, { codigo: a.codigo, telefone: estado.resultado.telefone, reserva: null, erro: "", reagendando: false, aviso: "" }); consultar(); irAba("minha", true); } }, icone("search", 16), "Ver minha reserva"),
        el("button", { class: "btn btn--fantasma", type: "button", onclick: recomecar }, icone("rotate-ccw", 16), "Fazer outro agendamento")),
    ];
  }
  function recomecar() {
    Object.assign(estado, { passo: 0, servicoId: "", profissionalId: "qualquer", data: "", inicio: "", observacoes: "", aceite: false, token: "", resultado: null });
    errosDados = {};
    desenharFluxo(true);
  }

  function desenharFluxo(focar) {
    const caixa = $("#fluxo");
    if (!estado.resultado) {
      // escolhas que deixaram de valer (serviço desativado no painel, por exemplo)
      if (estado.passo > 0 && !servicosDisponiveis().some((s) => s.id === estado.servicoId)) estado.passo = 0;
      if (estado.profissionalId !== "qualquer" && !profissionaisDo(estado.servicoId).some((p) => p.id === estado.profissionalId)) { estado.profissionalId = "qualquer"; if (estado.passo > 1) estado.passo = est().pagina.permitirEscolherProfissional ? 1 : 2; }
      if (estado.passo > 2 && !estado.inicio) estado.passo = 2;
    }
    const conteudo = estado.resultado ? telaResultado() : [passoServico, passoProfissional, passoHorario, passoDados, passoRevisao][estado.passo]();
    U.trocar(caixa, progresso(), el("div", { class: "etapa" }, ...conteudo));
    if (focar) {
      const h = caixa.querySelector(".etapa__titulo");
      if (h) { h.focus({ preventScroll: true }); const topo = caixa.getBoundingClientRect().top + window.scrollY - 12; if (window.scrollY > topo) window.scrollTo({ top: topo, behavior: "instant" }); }
    }
  }

  /* ======================================================================
     MINHA RESERVA (código + telefone)
     ====================================================================== */
  function consultar() {
    const r = A.consultar(minha.codigo, minha.telefone);
    minha.reserva = r.ok ? r.agendamento : null;
    minha.erro = r.ok ? "" : r.erro;
  }
  function desenharMinha(focar) {
    const caixa = $("#minha");
    const codigo = el("input", { type: "text", autocomplete: "off", maxlength: 9, placeholder: "NXB-XXXXX", value: minha.codigo, style: { textTransform: "uppercase" } });
    const tel = el("input", { type: "tel", inputmode: "tel", autocomplete: "tel-national", maxlength: 16, placeholder: "(00) 00000-0000", value: minha.telefone });
    tel.addEventListener("input", () => { tel.value = U.mascaraTelefone(tel.value); });
    const form = el("form", { class: "form-pub form-pub--linha", novalidate: true, onsubmit: (e) => {
      e.preventDefault();
      minha.codigo = codigo.value.trim().toUpperCase();
      minha.telefone = tel.value;
      minha.reagendando = false; minha.aviso = "";
      if (!/^NXB-[A-Z0-9]{5}$/.test(minha.codigo) || !U.telefoneValido(minha.telefone)) { minha.reserva = null; minha.erro = "Digite o código (NXB-XXXXX) e o celular usado na reserva."; }
      else consultar();
      desenharMinha(false);
      const alvo = $("#minha .reserva-pub") || $("#minha-erro");
      if (alvo) alvo.focus();
    } },
    campo("m-codigo", "Código da reserva", codigo, { obrigatorio: true }),
    campo("m-telefone", "Celular usado na reserva", tel, { obrigatorio: true }),
    el("div", { class: "etapa__botoes" }, el("button", { class: "btn btn--marca", type: "submit" }, icone("search", 16), "Consultar")));
    const corpo = [el("div", { class: "etapa__cabeca" }, el("h2", { class: "etapa__titulo", tabindex: "-1", texto: "Minha reserva" }), el("p", { class: "etapa__sub", texto: "Consulte, cancele ou reagende usando o código e o celular informados na reserva." })), form,
      el("p", { class: "campo-pub__erro", id: "minha-erro", role: "alert", tabindex: "-1", texto: minha.erro })];
    if (minha.aviso) corpo.push(el("p", { class: "aviso-caixa aviso-caixa--ok", role: "status" }, icone("circle-check", 16), el("span", { texto: minha.aviso })));
    if (minha.reserva) corpo.push(fichaReserva(minha.reserva));
    U.trocar(caixa, el("div", { class: "etapa" }, ...corpo));
    if (focar) { const h = caixa.querySelector(".etapa__titulo"); if (h) h.focus({ preventScroll: true }); }
  }

  const NOMES_STATUS = { pendente: "Aguardando confirmação", confirmado: "Confirmada", em_atendimento: "Em atendimento", concluido: "Concluída", cancelado: "Cancelada", nao_compareceu: "Não compareceu" };
  function fichaReserva(a) {
    const p = L.profissional(a.profissionalId);
    const pol = A.politicaCliente(a);
    const ativa = ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > U.agora();
    const partes = [
      el("div", { class: "reserva-pub__topo" }, el("span", { class: `selo-status selo-status--${a.status}` }, NOMES_STATUS[a.status]), el("span", { class: "codigo-pequeno", texto: a.codigo })),
      el("p", { class: "reserva-pub__quando", texto: `${inicial(U.dataLonga(a.data))}, ${a.inicio}–${a.fim}` }),
      el("p", { class: "reserva-pub__o-que", texto: `${a.servicoNome} com ${p ? p.nome : "—"}` }),
      a.status === "cancelado" ? el("p", { class: "nota-dados", texto: "Esta reserva foi cancelada e o horário foi liberado." }) : null,
    ];
    if (ativa && !minha.reagendando) {
      partes.push(el("p", { class: "nota-dados", texto: textoPolitica() }));
      partes.push(el("div", { class: "etapa__botoes etapa__botoes--coluna" },
        el("button", { class: "btn btn--linha", type: "button", onclick: () => baixarIcs(a) }, icone("calendar-arrow-down", 16), "Adicionar à agenda (.ics)"),
        pol.podeReagendar ? el("button", { class: "btn btn--linha", type: "button", id: "m-reagendar", onclick: () => { Object.assign(minha, { reagendando: true, data: a.data, inicio: "", profissionalId: est().pagina.permitirEscolherProfissional ? a.profissionalId : "qualquer", aviso: "" }); desenharMinha(false); const t = $("#minha .seletor-horario .dia[aria-pressed=\"true\"]"); if (t) t.focus(); } }, icone("calendar-sync", 16), "Reagendar") : null,
        pol.podeCancelar ? el("button", { class: "btn btn--perigo", type: "button", id: "m-cancelar", onclick: () => cancelarMinha(a) }, icone("circle-x", 16), "Cancelar reserva") : null),
        !pol.podeReagendar && pol.motivoReagendar ? el("p", { class: "nota-dados", texto: pol.motivoReagendar }) : null,
        !pol.podeCancelar && pol.motivoCancelar ? el("p", { class: "nota-dados", texto: pol.motivoCancelar }) : null);
    }
    if (ativa && minha.reagendando) {
      const profs = profissionaisDo(a.servicoId);
      const sel = el("select", { id: "m-prof", class: "select-pub" }, el("option", { value: "qualquer", texto: "Sem preferência" }), ...profs.map((x) => el("option", { value: x.id, texto: x.nome })));
      sel.value = profs.some((x) => x.id === minha.profissionalId) ? minha.profissionalId : "qualquer";
      sel.addEventListener("change", () => { minha.profissionalId = sel.value; minha.inicio = ""; desenharMinha(false); $("#m-prof").focus(); });
      partes.push(el("div", { class: "reagendar-pub" },
        el("h3", { class: "turno__titulo", texto: "Escolha o novo horário" }),
        est().pagina.permitirEscolherProfissional ? el("div", { class: "campo-pub" }, el("label", { for: "m-prof", texto: "Profissional" }), sel) : null,
        seletorHorario({ alvo: minha, ignorarId: a.id, servicoId: a.servicoId, profissionalId: est().pagina.permitirEscolherProfissional ? sel.value : "qualquer", rotuloAtual: ` · atual: ${U.dataCurta(a.data)} às ${a.inicio}`, aoEscolher: () => { desenharMinha(false); const b = $(`#minha .horario-pub[aria-pressed="true"]`) || $("#minha .dia[aria-pressed=\"true\"]"); if (b) b.focus(); } }),
        el("p", { class: "campo-pub__erro", role: "alert", id: "m-erro-reag" }),
        el("div", { class: "etapa__botoes" },
          el("button", { class: "btn btn--fantasma", type: "button", onclick: () => { minha.reagendando = false; desenharMinha(false); } }, "Desistir"),
          el("button", { class: "btn btn--marca", type: "button", id: "m-confirmar-reag", disabled: !minha.inicio, onclick: () => {
            const r = A.reagendarPeloCliente(minha.codigo, minha.telefone, { data: minha.data, inicio: minha.inicio, profissionalId: est().pagina.permitirEscolherProfissional ? sel.value : "qualquer" });
            if (!r.ok) { $("#m-erro-reag").textContent = r.erro || "Não foi possível reagendar."; minha.inicio = ""; return; }
            consultar();
            minha.reagendando = false;
            minha.aviso = `Reserva reagendada para ${U.dataCurta(r.agendamento.data)} às ${r.agendamento.inicio}.${r.agendamento.status === "pendente" ? " Ela fica pendente até o estabelecimento confirmar o novo horário." : ""}`;
            desenharMinha(false);
          } }, icone("calendar-check", 16), minha.inicio ? `Confirmar ${U.dataCurta(minha.data)} às ${minha.inicio}` : "Escolha um horário"))));
    }
    return el("article", { class: "reserva-pub", tabindex: "-1", "aria-label": "Sua reserva" }, ...partes);
  }
  async function cancelarMinha(a) {
    const ok = await U.confirmar({ titulo: "Cancelar esta reserva?", texto: `${a.servicoNome} em ${U.dataLonga(a.data)} às ${a.inicio}. O horário fica livre para outra pessoa.`, rotulo: "Cancelar reserva", perigo: true });
    if (!ok) return;
    const r = A.cancelarPeloCliente(minha.codigo, minha.telefone);
    if (!r.ok) { minha.erro = r.erro; desenharMinha(false); return; }
    consultar();
    minha.aviso = "Reserva cancelada. Se quiser, faça um novo agendamento.";
    desenharMinha(false);
  }

  /* ---------- Utilidades ---------- */
  async function copiar(texto) { try { await navigator.clipboard.writeText(texto); return true; } catch (e) { return false; } }
  function baixarIcs(a) {
    const blob = new Blob([A.arquivoCalendario(a)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: `reserva-${a.codigo}.ics` });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    U.aviso("Arquivo de agenda baixado. Abra-o para adicionar ao calendário.");
  }

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    L.carregar();
    desenharTopo();
    document.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => irAba(b.dataset.aba, false)));
    $(".abas-pub").addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const abas = [...document.querySelectorAll("[data-aba]")];
      const i = abas.findIndex((x) => x.dataset.aba === estado.aba);
      const prox = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length];
      irAba(prox.dataset.aba, false);
      prox.focus();
    });
    if (location.hash === "#minha-reserva") estado.aba = "minha";
    desenharAbas();
    desenharFluxo(false);
    desenharMinha(false);
    $("#carregando-pub").hidden = true;
    if (!L.persistente) U.aviso("Este navegador não permite salvar: a reserva não ficará guardada.", "erro");
    // Mudanças feitas no painel (outra aba) aparecem aqui: horários, serviços, cores
    L.aoMudar(() => {
      desenharTopo();
      if (estado.aba === "agendar" && !estado.resultado && estado.passo <= 2) desenharFluxo(false);
      if (estado.aba === "minha" && minha.reserva && !minha.reagendando) { consultar(); desenharMinha(false); }
    });
    // O relógio anda: horários que ficam em cima da hora somem da lista
    let minuto = U.agora();
    setInterval(() => {
      if (U.agora() === minuto) return;
      minuto = U.agora();
      if (estado.aba === "agendar" && estado.passo === 2 && !document.querySelector("dialog[open]")) desenharFluxo(false);
    }, 20000);
  });
})();
