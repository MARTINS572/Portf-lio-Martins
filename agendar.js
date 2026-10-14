/* ==========================================================================
   Agenda de Estúdio — agendar.js
   O AGENDAMENTO NO SITE, em 7 etapas: serviço → profissional → data →
   horário → dados → revisão → confirmação. E a janela "Minha reserva",
   onde a cliente consulta ou cancela informando o código e o telefone.

   Regras importantes:
   • os horários vêm do motor (motor.js) e são recalculados sempre que o
     serviço, a profissional, a data ou a agenda mudam (inclusive por
     outra aba);
   • a confirmação só aparece DEPOIS que a loja (loja.js) gravou e leu de
     volta a reserva. Se o horário foi ocupado no meio do caminho, a
     cliente volta para a escolha de horário com um aviso;
   • nenhuma mensagem é enviada sozinha: o botão do WhatsApp só abre o
     aplicativo com o texto pronto, e quem envia é a cliente.

   Uso:
     const agenda = AE.agendar.montar(document.querySelector("#reserva"), {
       loja, avatar: (prof) => elemento, privacidade: "privacidade.html" });
     agenda.iniciar({ servicoId: "s3" });   // chega com o serviço escolhido
   ========================================================================== */
window.AE = window.AE || {};

(function () {
  "use strict";
  const U = AE.util;
  const M = AE.motor;
  const { el, icone } = U;

  const PASSOS = ["Serviço", "Profissional", "Data", "Horário", "Seus dados", "Revisão", "Confirmação"];
  const QUALQUER = "qualquer";

  /* ---------- Textos usados também pelo painel ---------- */
  function mensagemWhatsapp(d, r) {
    return [
      `Olá, ${d.negocio.nomeCurto || d.negocio.nome}! Fiz ${r.status === "pendente" ? "uma solicitação de reserva" : "uma reserva"} pelo site.`,
      `Código: ${r.codigo}`,
      `Serviço: ${r.servicoNome}`,
      `Profissional: ${r.profissionalNome}`,
      `Data: ${U.dataBR(r.data)} (${U.nomeDia(r.data)}), às ${r.inicio}`,
      `Nome: ${r.cliente.nome}`,
    ].join("\n");
  }
  async function copiarTexto(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) {
      const area = el("textarea", { style: { position: "fixed", opacity: "0" } });
      area.value = texto;
      document.body.append(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      area.remove();
      return ok;
    }
  }
  function blocoWhatsapp(d, r) {
    const numero = d.negocio.whatsapp;
    const texto = mensagemWhatsapp(d, r);
    const copiar = el("button", { type: "button", class: "ae-btn ae-btn--linha", onclick: async () => { U.aviso((await copiarTexto(texto)) ? "Mensagem copiada." : "Não foi possível copiar. Selecione o texto e copie manualmente."); } }, icone("copy", 16), "Copiar mensagem");
    return el("div", { class: "ae-whats" },
      numero
        ? el("a", { class: "ae-btn ae-btn--whats", href: U.linkWhatsapp(numero, texto), target: "_blank", rel: "noopener" }, icone("message-circle", 18), "Abrir no WhatsApp")
        : el("p", { class: "ae-nota" }, icone("info", 16), el("span", { texto: "O WhatsApp do estúdio ainda não foi configurado. Ele é definido no painel, em Configurações." })),
      copiar,
      el("details", { class: "ae-whats__texto" }, el("summary", { texto: "Ver a mensagem pronta" }), el("pre", { texto })),
      numero ? el("p", { class: "ae-nota ae-nota--fina", texto: "O WhatsApp abre com o texto pronto. Nada é enviado sem você tocar em enviar." }) : null);
  }
  const rotuloStatus = (s) => el("span", { class: `ae-status ae-status--${s}` }, el("span", { class: "ae-status__ponto", "aria-hidden": "true" }), M.STATUS[s].nome);

  /* ======================================================================
     AGENDAMENTO
     ====================================================================== */
  function montar(raiz, { loja, avatar, privacidade = "privacidade.html", ajudaObservacao = "Se quiser, conte algo que ajude no atendimento." } = {}) {
    const d = () => loja.dados;
    const estadoInicial = () => ({
      passo: 1, servicoId: null, profissionalId: null, data: null, inicio: null, mes: null,
      cliente: { nome: "", telefone: "", email: "", observacao: "", consentimento: false },
      erros: {}, enviando: false, resultado: null, alerta: "", falha: "",
    });
    let est = estadoInicial();
    let focoDia = null;

    const servico = () => M.servico(d(), est.servicoId);
    const profissional = () => (est.profissionalId && est.profissionalId !== QUALQUER ? M.profissional(d(), est.profissionalId) : null);
    const elegiveis = () => (servico() ? M.habilitadas(d(), servico()) : []);
    const completo = (n) => {
      if (n === 1) return !!servico() && servico().ativo;
      if (n === 2) return completo(1) && (est.profissionalId === QUALQUER ? elegiveis().length > 0 : elegiveis().some((p) => p.id === est.profissionalId));
      if (n === 3) return completo(2) && !!est.data && M.resumoDia(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, data: est.data }).estado === "livre";
      if (n === 4) return completo(3) && !!est.inicio && M.horarios(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, data: est.data }).some((h) => h.inicio === est.inicio);
      if (n === 5) return completo(4) && !Object.keys(loja.validarCliente(est.cliente, { exigirConsentimento: true }).erros).length;
      if (n === 6) return completo(5);
      return false;
    };
    const podeIr = (n) => n === 1 || completo(n - 1);

    function irPara(n) {
      if (est.resultado && n < 7) est.resultado = null;
      est.passo = n;
      est.alerta = "";
      est.falha = "";
      render(true);
    }

    /* ---------- Cabeçalho com as etapas ---------- */
    function etapas() {
      return el("ol", { class: "ae-passos", "aria-label": "Etapas da reserva" },
        PASSOS.map((nome, i) => {
          const n = i + 1;
          const atual = n === est.passo;
          const feito = n < est.passo || (est.resultado && n < 7);
          const clicavel = !est.resultado && !atual && n < 7 && podeIr(n) && n <= est.passo + 1 && completo(n - 1);
          const conteudo = [el("span", { class: "ae-passos__num", "aria-hidden": "true" }, feito && !atual ? icone("check", 14) : String(n)), el("span", { class: "ae-passos__nome", texto: nome })];
          return el("li", { class: `ae-passos__item${atual ? " is-atual" : ""}${feito ? " is-feito" : ""}`, "aria-current": atual ? "step" : null },
            clicavel ? el("button", { type: "button", class: "ae-passos__btn", onclick: () => irPara(n), "aria-label": `Etapa ${n}: ${nome}${feito ? " (concluída)" : ""}` }, conteudo)
              : el("span", { class: "ae-passos__btn", "aria-label": `Etapa ${n}: ${nome}${feito ? " (concluída)" : ""}${atual ? " (atual)" : ""}` }, conteudo));
        }));
    }
    const progresso = () => el("p", { class: "ae-progresso" }, el("span", { texto: `Etapa ${est.passo} de 7` }), el("b", { texto: PASSOS[est.passo - 1] }),
      el("span", { class: "ae-progresso__barra", "aria-hidden": "true" }, el("span", { style: { width: `${(est.passo / 7) * 100}%` } })));

    /* ---------- Resumo lateral ---------- */
    function resumo() {
      const s = servico();
      const p = profissional();
      const linha = (rotulo, valor) => el("div", {}, el("dt", { texto: rotulo }), el("dd", { texto: valor || "—" }));
      return el("aside", { class: "ae-resumo", "aria-label": "Resumo da sua escolha" },
        el("p", { class: "ae-resumo__titulo", texto: "Sua escolha" }),
        el("dl", {},
          linha("Serviço", s ? s.nome : ""),
          linha("Profissional", est.profissionalId === QUALQUER ? "Qualquer profissional disponível" : p ? p.nome : ""),
          linha("Data", est.data ? U.dataLonga(est.data) : ""),
          linha("Horário", est.inicio ? `${est.inicio} às ${U.hhmm(U.minutos(est.inicio) + s.duracao)}` : ""),
          linha("Duração", s ? U.duracao(s.duracao) : ""),
          linha("Valor", s ? U.moeda(s.preco) : "")),
        s ? el("p", { class: "ae-nota ae-nota--fina", texto: "Valores de demonstração. O estúdio confirma o preço final no atendimento." }) : null);
    }

    /* ---------- Etapa 1: serviço ---------- */
    function passoServico() {
      const ativos = d().servicos.filter((s) => s.ativo);
      if (!ativos.length) return el("p", { class: "ae-vazio", texto: "Nenhum serviço está disponível para reserva agora." });
      // Filtro por categoria: a lista fica curta no celular
      const cats = d().categorias.filter((c) => ativos.some((s) => s.categoria === c));
      if (!est.cat1 || (est.cat1 !== "todas" && !cats.includes(est.cat1))) est.cat1 = servico() && cats.includes(servico().categoria) ? servico().categoria : cats.length > 1 ? cats[0] : "todas";
      const filtro = cats.length > 1 ? el("div", { class: "ae-chips ae-filtros", role: "group", "aria-label": "Mostrar serviços da categoria" },
        [...cats, "todas"].map((c) => el("button", { type: "button", class: `ae-filtro${est.cat1 === c ? " is-sel" : ""}`, "aria-pressed": est.cat1 === c ? "true" : "false",
          onclick: () => { est.cat1 = c; render(false, ".ae-filtro.is-sel"); } },
        c === "todas" ? `Todas (${ativos.length})` : `${c} (${ativos.filter((s) => s.categoria === c).length})`))) : null;
      return el("div", { class: "ae-grupos" }, filtro, d().categorias.filter((cat) => est.cat1 === "todas" || cat === est.cat1).map((cat) => {
        const lista = ativos.filter((s) => s.categoria === cat);
        if (!lista.length) return null;
        return el("fieldset", { class: "ae-grupo" }, el("legend", { texto: cat }),
          el("div", { class: "ae-opcoes" }, lista.map((s) => opcao({
            nome: "ae-servico", valor: s.id, marcado: est.servicoId === s.id,
            titulo: s.nome, detalhe: `${U.duracao(s.duracao)} · ${U.moeda(s.preco)}`, texto: s.descricao, extra: s.regras,
            aoEscolher: () => {
              if (est.servicoId !== s.id) {
                est.servicoId = s.id;
                const hab = M.habilitadas(d(), s);
                if (est.preferida && hab.some((p) => p.id === est.preferida)) est.profissionalId = est.preferida;
                else if (est.profissionalId !== QUALQUER && !hab.some((p) => p.id === est.profissionalId)) est.profissionalId = null;
                est.data = null; est.inicio = null;
              }
              render(false);
            },
          }))));
      }));
    }
    // Uma opção de escolha (rádio de verdade, estilizado)
    function opcao({ nome, valor, marcado, titulo, detalhe, texto, extra, visual, aoEscolher }) {
      const id = `${nome}-${valor}`;
      const entrada = el("input", { type: "radio", name: nome, id, value: valor, class: "ae-opcao__radio", onchange: aoEscolher });
      entrada.checked = !!marcado;
      return el("div", { class: `ae-opcao${marcado ? " is-marcada" : ""}` }, entrada,
        el("label", { for: id, class: "ae-opcao__rotulo" },
          visual || null,
          el("span", { class: "ae-opcao__corpo" },
            el("span", { class: "ae-opcao__topo" }, el("span", { class: "ae-opcao__titulo", texto: titulo }), detalhe ? el("span", { class: "ae-opcao__detalhe", texto: detalhe }) : null),
            texto ? el("span", { class: "ae-opcao__texto", texto }) : null,
            extra ? el("span", { class: "ae-opcao__extra", texto: extra }) : null),
          el("span", { class: "ae-opcao__marca", "aria-hidden": "true" }, icone("check", 16))));
    }

    /* ---------- Etapa 2: profissional ---------- */
    function passoProfissional() {
      const s = servico();
      const lista = elegiveis();
      if (!lista.length) return el("p", { class: "ae-vazio", texto: AE.t("{Nenhuma} profissional está atendendo este serviço agora. Escolha outro serviço.") });
      const opcoes = [];
      if (lista.length > 1) opcoes.push(opcao({ nome: "ae-prof", valor: QUALQUER, marcado: est.profissionalId === QUALQUER, titulo: "Qualquer profissional disponível",
        texto: AE.t("Mostramos todos os horários livres. Ao confirmar, a reserva fica com {uma} profissional que faz este serviço e está livre nesse horário."),
        visual: el("span", { class: "ae-avatar ae-avatar--qualquer", "aria-hidden": "true" }, icone("users", 20)),
        aoEscolher: () => escolherProf(QUALQUER) }));
      lista.forEach((p) => opcoes.push(opcao({ nome: "ae-prof", valor: p.id, marcado: est.profissionalId === p.id, titulo: p.nome, detalhe: p.especialidades, texto: p.descricao,
        visual: avatar ? avatar(p) : el("span", { class: "ae-avatar", "aria-hidden": "true", texto: p.nome.split(" ").map((x) => x[0]).slice(0, 2).join("") }),
        aoEscolher: () => escolherProf(p.id) })));
      return el("fieldset", { class: "ae-grupo" }, el("legend", { class: "ae-oculto", texto: `Profissionais que fazem ${s.nome}` }), el("div", { class: "ae-opcoes ae-opcoes--prof" }, opcoes));
    }
    function escolherProf(id) {
      if (est.profissionalId !== id) {
        est.profissionalId = id;
        est.inicio = null;
        if (est.data && M.resumoDia(d(), { servicoId: est.servicoId, profissionalId: id, data: est.data }).estado !== "livre") est.data = null;
      }
      render(false);
    }

    /* ---------- Etapa 3: data ---------- */
    const ROTULOS_DIA = { livre: "com horários", lotado: "sem horários livres", fechado: "fechado", passado: "já passou", fora: "agenda ainda não aberta" };
    function passoData() {
      const hj = U.hoje();
      const limite = U.somarDias(hj, Number(d().regras.diasFuturos) || 60);
      if (!est.mes) {
        const primeira = M.proximasDatas(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, limite: 1 })[0];
        est.mes = U.inicioDoMes(est.data || (primeira ? primeira.data : hj));
      }
      const mes = est.mes;
      const podeVoltar = mes > U.inicioDoMes(hj);
      const podeAvancar = U.somarMeses(mes, 1) <= U.inicioDoMes(limite);
      const deslocamento = U.diaDaSemana(mes);
      const total = U.diasNoMes(mes);
      const celulas = [];
      for (let i = 0; i < deslocamento; i += 1) celulas.push(el("span", { class: "ae-cal__vazio", "aria-hidden": "true" }));
      for (let dia = 1; dia <= total; dia += 1) {
        const data = `${mes.slice(0, 8)}${U.dd(dia)}`;
        const r = M.resumoDia(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, data });
        const sel = est.data === data;
        const livre = r.estado === "livre";
        celulas.push(el("button", {
          type: "button", class: `ae-cal__dia is-${r.estado}${sel ? " is-sel" : ""}${data === hj ? " is-hoje" : ""}`,
          "data-data": data, tabindex: "-1", "aria-pressed": sel ? "true" : "false", "aria-disabled": livre ? null : "true",
          "aria-label": `${U.dataLonga(data)}${data === hj ? " (hoje)" : ""}: ${livre ? U.plural(r.total, "horário livre", "horários livres") : ROTULOS_DIA[r.estado] || "indisponível"}${sel ? ", selecionada" : ""}`,
          onclick: () => {
            if (!livre) {
              est.alerta = r.estado === "lotado" ? "Esse dia não tem horários livres para essa escolha." : r.estado === "passado" ? "Essa data já passou."
                : r.estado === "fora" ? M.mensagem("muito_distante") : M.MENSAGENS[r.motivo] ? M.mensagem(r.motivo) : "Esse dia não está disponível.";
              focoDia = data;
              render(false, `[data-data="${data}"]`);
              return;
            }
            escolherData(data);
          },
        }, el("span", { class: "ae-cal__num", texto: String(dia) }), livre ? el("span", { class: "ae-cal__qtd", "aria-hidden": "true", texto: String(r.total) }) : null));
      }
      // dia que recebe o foco do teclado: o selecionado, o pedido ou o primeiro livre
      const alvo = focoDia && focoDia.startsWith(mes.slice(0, 7)) ? focoDia : est.data && est.data.startsWith(mes.slice(0, 7)) ? est.data : null;
      const grade = el("div", { class: "ae-cal__grade", role: "group", "aria-label": `Dias de ${U.mesAno(mes)}`, onkeydown: teclaCalendario }, celulas);
      const focavel = grade.querySelector(alvo ? `[data-data="${alvo}"]` : ".ae-cal__dia.is-livre") || grade.querySelector(".ae-cal__dia");
      if (focavel) focavel.tabIndex = 0;
      const sugestoes = M.proximasDatas(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, limite: 4 });
      return el("div", { class: "ae-cal" },
        sugestoes.length ? el("div", { class: "ae-sugestoes" }, el("p", { class: "ae-sugestoes__titulo", texto: "Próximas datas com horário" }),
          el("div", { class: "ae-chips" }, sugestoes.map((x) => el("button", { type: "button", class: `ae-chip${est.data === x.data ? " is-sel" : ""}`, "aria-pressed": est.data === x.data ? "true" : "false", onclick: () => escolherData(x.data) },
            el("b", { texto: U.quando(x.data) === U.dataLonga(x.data) ? `${U.DIAS_CURTOS[U.diaDaSemana(x.data)]}, ${U.dataCurta(x.data)}` : `${U.quando(x.data)}, ${U.dataCurta(x.data)}` }), el("span", { texto: U.plural(x.total, "horário", "horários") })))))
          : el("p", { class: "ae-vazio", texto: AE.t("Não há datas livres nos próximos dias para essa escolha. Tente outr{s} profissional ou outro serviço.") }),
        el("div", { class: "ae-cal__topo" },
          el("button", { type: "button", class: "ae-icone-btn", "aria-label": "Mês anterior", disabled: !podeVoltar, onclick: () => { est.mes = U.somarMeses(mes, -1); focoDia = null; render(false, ".ae-cal__topo button"); } }, icone("chevron-left", 20)),
          el("h4", { class: "ae-cal__mes", "aria-live": "polite", texto: U.mesAno(mes) }),
          el("button", { type: "button", class: "ae-icone-btn", "aria-label": "Próximo mês", disabled: !podeAvancar, onclick: () => { est.mes = U.somarMeses(mes, 1); focoDia = null; render(false, ".ae-cal__topo button:last-child"); } }, icone("chevron-right", 20))),
        el("div", { class: "ae-cal__semana", "aria-hidden": "true" }, U.DIAS_CURTOS.map((x) => el("span", { texto: x }))),
        grade,
        el("ul", { class: "ae-cal__legenda", "aria-label": "Legenda" },
          el("li", {}, el("span", { class: "ae-cal__amostra is-livre" }, "12"), "Com horários (o número indica quantos)"),
          el("li", {}, el("span", { class: "ae-cal__amostra is-lotado" }, "12"), "Sem horários livres"),
          el("li", {}, el("span", { class: "ae-cal__amostra is-fechado" }, "12"), "Fechado ou indisponível"),
          el("li", {}, el("span", { class: "ae-cal__amostra is-sel" }, "12"), "Data escolhida")),
        el("p", { class: "ae-nota ae-nota--fina", texto: `Reservas pelo site a partir de ${U.duracao(Number(d().regras.antecedenciaMin) || 0)} de antecedência e até ${U.plural(Number(d().regras.diasFuturos), "dia", "dias")} à frente. Use as setas do teclado para andar pelos dias.` }));
    }
    function escolherData(data) {
      if (est.data !== data) { est.data = data; est.inicio = null; }
      est.mes = U.inicioDoMes(data);
      focoDia = data;
      est.alerta = "";
      render(false, `[data-data="${data}"]`);
    }
    function teclaCalendario(e) {
      const atual = e.target.closest(".ae-cal__dia");
      if (!atual) return;
      const data = atual.dataset.data;
      const mov = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      let alvo = null;
      if (mov) alvo = U.somarDias(data, mov);
      else if (e.key === "Home") alvo = U.somarDias(data, -U.diaDaSemana(data));
      else if (e.key === "End") alvo = U.somarDias(data, 6 - U.diaDaSemana(data));
      else if (e.key === "PageUp") alvo = U.somarMeses(data, -1);
      else if (e.key === "PageDown") alvo = U.somarMeses(data, 1);
      if (!alvo) return;
      e.preventDefault();
      const hj = U.hoje();
      const limite = U.somarDias(hj, Number(d().regras.diasFuturos) || 60);
      if (alvo < U.inicioDoMes(hj) || U.inicioDoMes(alvo) > U.inicioDoMes(limite)) return;
      focoDia = alvo;
      if (!alvo.startsWith(est.mes.slice(0, 7))) { est.mes = U.inicioDoMes(alvo); render(false, `[data-data="${alvo}"]`); return; }
      raiz.querySelectorAll(".ae-cal__dia").forEach((b) => { b.tabIndex = b.dataset.data === alvo ? 0 : -1; });
      const btn = raiz.querySelector(`[data-data="${alvo}"]`);
      if (btn) btn.focus();
    }

    /* ---------- Etapa 4: horário ---------- */
    function passoHorario() {
      const lista = M.horarios(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, data: est.data });
      if (!lista.length) {
        const outras = M.proximasDatas(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, desde: U.somarDias(est.data, 1), limite: 3 });
        const comQualquer = est.profissionalId !== QUALQUER && M.horarios(d(), { servicoId: est.servicoId, profissionalId: QUALQUER, data: est.data }).length;
        return el("div", { class: "ae-vazio" },
          el("p", { texto: `Não sobrou horário livre em ${U.dataLonga(est.data)} para essa escolha.` }),
          outras.length ? el("div", { class: "ae-chips" }, outras.map((x) => el("button", { type: "button", class: "ae-chip", onclick: () => { escolherData(x.data); irPara(4); } }, el("b", { texto: `${U.DIAS_CURTOS[U.diaDaSemana(x.data)]}, ${U.dataCurta(x.data)}` }), el("span", { texto: U.plural(x.total, "horário", "horários") })))) : null,
          comQualquer ? el("button", { type: "button", class: "ae-btn ae-btn--linha", onclick: () => { est.profissionalId = QUALQUER; irPara(4); } }, "Ver horários com qualquer profissional") : null);
      }
      const periodos = [["Manhã", 0, 720], ["Tarde", 720, 1080], ["Noite", 1080, 1440]];
      const s = servico();
      return el("div", { class: "ae-horarios" },
        el("p", { class: "ae-horarios__dica", texto: `${U.dataLonga(est.data)} · ${s.nome} (${U.duracao(s.duracao)}). O horário mostrado é o início do atendimento.` }),
        periodos.map(([nome, a, b]) => {
          const itens = lista.filter((h) => U.minutos(h.inicio) >= a && U.minutos(h.inicio) < b);
          if (!itens.length) return null;
          return el("fieldset", { class: "ae-grupo" }, el("legend", { texto: nome }),
            el("div", { class: "ae-horarios__lista" }, itens.map((h) => {
              const sel = est.inicio === h.inicio;
              return el("button", { type: "button", class: `ae-hora${sel ? " is-sel" : ""}`, "aria-pressed": sel ? "true" : "false",
                "aria-label": `${h.inicio}, termina às ${U.hhmm(U.minutos(h.inicio) + s.duracao)}${sel ? ", selecionado" : ""}`,
                onclick: () => { est.inicio = h.inicio; est.alerta = ""; render(false, `.ae-hora[aria-label^="${h.inicio}"]`); } },
              sel ? icone("check", 14) : null, h.inicio);
            })));
        }));
    }

    /* ---------- Etapa 5: dados ---------- */
    function campo({ nome, rotulo, tipo = "text", obrigatorio, ajuda, auto, max, modo, area }) {
      const id = `ae-${nome}`;
      const erro = est.erros[nome];
      const descr = [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean).join(" ") || null;
      const atributos = { id, name: nome, class: "ae-campo__entrada", autocomplete: auto || null, maxlength: max || null, inputmode: modo || null, required: obrigatorio || null, "aria-invalid": erro ? "true" : null, "aria-describedby": descr,
        oninput: (e) => {
          let v = e.target.value;
          if (nome === "telefone") { v = U.mascararTelefone(v); e.target.value = v; }
          est.cliente[nome] = v;
          if (est.erros[nome]) { delete est.erros[nome]; e.target.removeAttribute("aria-invalid"); const m = raiz.querySelector(`#${id}-erro`); if (m) m.remove(); }
        } };
      const entrada = area ? el("textarea", { ...atributos, rows: 3 }) : el("input", { ...atributos, type: tipo });
      entrada.value = est.cliente[nome] || "";
      return el("div", { class: `ae-campo${erro ? " tem-erro" : ""}` },
        el("label", { for: id, class: "ae-campo__rotulo" }, rotulo, obrigatorio ? el("span", { class: "ae-obrig", texto: " (obrigatório)" }) : el("span", { class: "ae-opcional", texto: " (opcional)" })),
        entrada,
        ajuda ? el("p", { id: `${id}-ajuda`, class: "ae-campo__ajuda", texto: ajuda }) : null,
        erro ? el("p", { id: `${id}-erro`, class: "ae-campo__erro" }, icone("circle-alert", 14), erro) : null);
    }
    function passoDados() {
      const erroConsent = est.erros.consentimento;
      const consent = el("input", { type: "checkbox", id: "ae-consentimento", class: "ae-check__caixa", "aria-invalid": erroConsent ? "true" : null, "aria-describedby": erroConsent ? "ae-consentimento-erro" : null,
        onchange: (e) => { est.cliente.consentimento = e.target.checked; if (est.erros.consentimento) { delete est.erros.consentimento; render(false, "#ae-consentimento"); } } });
      consent.checked = !!est.cliente.consentimento;
      return el("div", { class: "ae-form" },
        el("p", { class: "ae-nota", texto: "Pedimos só o necessário para marcar e, se precisar, falar com você sobre este horário." }),
        el("div", { class: "ae-form__grade" },
          campo({ nome: "nome", rotulo: "Nome", obrigatorio: true, auto: "name", max: 80 }),
          campo({ nome: "telefone", rotulo: "Celular ou telefone", tipo: "tel", obrigatorio: true, auto: "tel-national", modo: "tel", max: 16, ajuda: "Com DDD. É ele que, junto com o código, permite consultar ou cancelar a reserva." }),
          campo({ nome: "email", rotulo: "E-mail", tipo: "email", auto: "email", max: 120 }),
          campo({ nome: "observacao", rotulo: "Observação", area: true, max: 300, ajuda: ajudaObservacao })),
        el("div", { class: `ae-check${erroConsent ? " tem-erro" : ""}` }, consent,
          el("label", { for: "ae-consentimento" }, "Concordo com o uso destes dados para marcar e gerenciar este atendimento, como explicado na ",
            el("a", { href: privacidade, target: "_blank", rel: "noopener", texto: "política de privacidade" }), ".")),
        erroConsent ? el("p", { id: "ae-consentimento-erro", class: "ae-campo__erro" }, icone("circle-alert", 14), erroConsent) : null);
    }

    /* ---------- Etapa 6: revisão ---------- */
    function passoRevisao() {
      const s = servico();
      const p = profissional();
      const fim = U.hhmm(U.minutos(est.inicio) + s.duracao);
      const item = (rotulo, valor, passo) => el("div", { class: "ae-revisao__item" },
        el("dt", { texto: rotulo }), el("dd", { texto: valor }),
        passo ? el("dd", {}, el("button", { type: "button", class: "ae-link", onclick: () => irPara(passo), "aria-label": `Alterar ${rotulo.toLowerCase()}` }, "Alterar")) : null);
      const c = est.cliente;
      return el("div", { class: "ae-revisao" },
        el("dl", {},
          item("Serviço", s.nome, 1),
          item("Profissional", p ? p.nome : AE.t("Qualquer profissional disponível (definid{s} ao confirmar)"), 2),
          item("Data", U.dataLonga(est.data), 3),
          item("Horário", `${est.inicio} às ${fim}`, 4),
          item("Duração", U.duracao(s.duracao)),
          item("Valor", `${U.moeda(s.preco)} (valor de demonstração)`),
          item("Nome", U.limpar(c.nome, 80), 5),
          item("Contato", [U.formatarTelefone(c.telefone), U.limpar(c.email, 120)].filter(Boolean).join(" · "), 5),
          c.observacao.trim() ? item("Observação", U.limparLongo(c.observacao, 300), 5) : null),
        el("p", { class: "ae-nota" }, icone("info", 16), el("span", { texto: d().regras.aprovacao === "automatica"
          ? "Ao confirmar, a reserva é gravada e o horário fica reservado para você."
          : "Ao confirmar, enviamos a solicitação. O horário fica guardado e o estúdio confirma em seguida." })),
        el("p", { class: "ae-nota ae-nota--fina", texto: "Demonstração: a reserva fica salva só neste navegador. Não há servidor nem envio de mensagens." }));
    }
    async function confirmar() {
      if (est.enviando) return;
      if (!completo(5)) { est.falha = "Alguma informação mudou. Revise as etapas anteriores."; render(false); return; }
      est.enviando = true;
      est.falha = "";
      render(false, ".ae-btn--principal");
      const r = await loja.reservar({ servicoId: est.servicoId, profissionalId: est.profissionalId, data: est.data, inicio: est.inicio, ...est.cliente }, { contexto: "site" });
      est.enviando = false;
      if (r && r.ok) {
        est.resultado = r.reserva;
        est.passo = 7;
        render(true);
        return;
      }
      if (r && r.codigo === "dados") { est.erros = r.erros || {}; est.passo = 5; est.alerta = "Confira os campos destacados."; render(true); return; }
      if (r && ["ocupado", "antecedencia", "passado", "fora_do_expediente", "bloqueado", "folga", "folga_semanal", "fechado", "muito_distante"].includes(r.codigo)) {
        est.inicio = null;
        est.passo = M.horarios(d(), { servicoId: est.servicoId, profissionalId: est.profissionalId, data: est.data }).length ? 4 : 3;
        if (est.passo === 3) est.data = null;
        est.alerta = `${r.erro} Sua reserva não foi feita. Escolha outro horário — seus dados continuam preenchidos.`;
        render(true);
        return;
      }
      if (r && ["servico_inativo", "servico_inexistente", "profissional_inativo", "nao_habilitado", "profissional_inexistente"].includes(r.codigo)) {
        est.alerta = `${r.erro} Sua reserva não foi feita.`;
        est.passo = r.codigo.startsWith("servico") ? 1 : 2;
        render(true);
        return;
      }
      est.falha = `A reserva NÃO foi concluída. ${(r && r.erro) || "Tente de novo em instantes."}`;
      render(false, ".ae-falha");
    }

    /* ---------- Etapa 7: confirmação ---------- */
    function passoConfirmacao() {
      const r = est.resultado;
      const pendente = r.status === "pendente";
      return el("div", { class: "ae-final" },
        el("div", { class: "ae-final__selo" }, icone(pendente ? "clock" : "circle-check", 28),
          el("div", {},
            el("p", { class: "ae-final__titulo", texto: pendente ? "Solicitação recebida — aguardando confirmação" : "Reserva confirmada" }),
            el("p", { texto: pendente ? "O horário fica guardado para você enquanto o estúdio confirma." : "Seu horário está reservado." }))),
        el("div", { class: "ae-final__codigo" }, el("span", { texto: "Código da reserva" }), el("strong", { texto: r.codigo }), el("span", { class: "ae-nota ae-nota--fina", texto: "Guarde este código: com ele e o seu telefone você consulta ou cancela." })),
        el("dl", { class: "ae-final__dados" },
          ...[["Serviço", r.servicoNome], ["Profissional", r.profissionalNome], ["Data", U.dataLonga(r.data)], ["Horário", `${r.inicio} às ${r.fim}`], ["Valor", U.moeda(r.preco)], ["Situação", null]]
            .map(([a, b]) => el("div", {}, el("dt", { texto: a }), el("dd", {}, b === null ? rotuloStatus(r.status) : b)))),
        el("div", { class: "ae-final__orienta" },
          el("p", {}, "Para consultar ou cancelar, use ", el("button", { type: "button", class: "ae-link", onclick: () => abrirMinhaReserva({ loja, codigo: r.codigo, telefone: r.cliente.telefone, privacidade }) }, "Minha reserva"),
            ` com o código e o telefone informado. ${d().regras.cancelamentoHoras ? `O cancelamento pelo site vai até ${U.plural(Number(d().regras.cancelamentoHoras), "hora", "horas")} antes do horário.` : ""}`),
          el("p", { class: "ae-nota ae-nota--fina", texto: d().regras.politicaCancelamento })),
        blocoWhatsapp(d(), r),
        el("p", { class: "ae-nota ae-nota--fina", texto: "Demonstração: esta reserva ficou salva só neste navegador. Nenhum e-mail ou mensagem foi enviado." }));
    }

    /* ---------- Botões de avançar e voltar ---------- */
    function acoes() {
      if (est.passo === 7) return el("div", { class: "ae-acoes" }, el("button", { type: "button", class: "ae-btn ae-btn--linha", onclick: () => { est = estadoInicial(); render(true); } }, "Fazer outra reserva"));
      const voltar = est.passo > 1 ? el("button", { type: "button", class: "ae-btn ae-btn--texto", disabled: est.enviando, onclick: () => irPara(est.passo - 1) }, icone("arrow-left", 16), "Voltar") : el("span");
      if (est.passo === 6) {
        return el("div", { class: "ae-acoes" }, voltar,
          el("button", { type: "button", class: "ae-btn ae-btn--principal", disabled: est.enviando, "aria-busy": est.enviando ? "true" : null, onclick: confirmar },
            est.enviando ? el("span", { class: "ae-girando", "aria-hidden": "true" }) : null, est.enviando ? "Reservando…" : d().regras.aprovacao === "automatica" ? "Confirmar reserva" : "Enviar solicitação"));
      }
      const proximo = el("button", { type: "button", class: "ae-btn ae-btn--principal", onclick: avancar }, "Continuar", icone("arrow-right", 16));
      return el("div", { class: "ae-acoes" }, voltar, proximo);
    }
    const FALTA = { 1: "Escolha um serviço para continuar.", 2: AE.t("Escolha {uma} profissional (ou qualquer {uma} disponível)."), 3: "Escolha uma data com horários livres.", 4: "Escolha um horário." };
    function avancar() {
      if (est.passo === 5) {
        const { erros } = loja.validarCliente(est.cliente, { exigirConsentimento: true });
        est.erros = erros;
        if (Object.keys(erros).length) {
          est.alerta = "Confira os campos destacados.";
          render(false);
          const primeiro = raiz.querySelector("[aria-invalid='true']");
          if (primeiro) primeiro.focus();
          return;
        }
        irPara(6);
        return;
      }
      if (!completo(est.passo)) { est.alerta = FALTA[est.passo]; render(false, ".ae-alerta"); return; }
      irPara(est.passo + 1);
    }

    /* ---------- Desenho ---------- */
    const TITULOS = { 1: "Qual serviço você quer?", 2: "Com quem?", 3: "Escolha a data", 4: "Escolha o horário", 5: "Seus dados", 6: "Confira antes de confirmar", 7: "Pronto" };
    function conteudo() {
      if (est.passo === 1) return passoServico();
      if (est.passo === 2) return passoProfissional();
      if (est.passo === 3) return passoData();
      if (est.passo === 4) return passoHorario();
      if (est.passo === 5) return passoDados();
      if (est.passo === 6) return passoRevisao();
      return passoConfirmacao();
    }
    function render(focarTitulo, seletorFoco) {
      // Se a agenda mudou (outra aba, painel) e a escolha deixou de valer, volta para a etapa certa
      if (!est.resultado && est.passo > 1) {
        for (let n = 1; n < est.passo && n <= 4; n += 1) {
          if (!completo(n)) {
            const motivo = n === 1 ? "O serviço escolhido não está mais disponível." : n === 2 ? AE.t("{A} profissional escolhid{s} não está mais disponível para este serviço.") : n === 3 ? "A data escolhida não tem mais horários livres." : "O horário escolhido acabou de ser ocupado.";
            if (n <= 3) est.inicio = null;
            if (n <= 2) est.data = null;
            est.passo = n;
            est.alerta = `${motivo} Escolha de novo.`;
            break;
          }
        }
      }
      const ativo = document.activeElement;
      const tinhaFoco = raiz.contains(ativo);
      const tituloId = "ae-titulo-etapa";
      U.trocar(raiz,
        el("div", { class: "ae-agendar" },
          etapas(),
          progresso(),
          el("div", { class: `ae-corpo${est.passo < 6 ? "" : " ae-corpo--unica"}` },
            el("section", { class: "ae-etapa", "aria-labelledby": tituloId },
              el("h3", { id: tituloId, class: "ae-etapa__titulo", tabindex: "-1", texto: TITULOS[est.passo] }),
              est.alerta ? el("p", { class: "ae-alerta", role: "alert" }, icone("triangle-alert", 16), el("span", { texto: est.alerta })) : null,
              conteudo(),
              est.falha ? el("p", { class: "ae-falha", role: "alert", tabindex: "-1" }, icone("circle-x", 18), el("span", { texto: est.falha })) : null,
              acoes()),
            est.passo < 6 ? resumo() : null)));
      if (focarTitulo) {
        const t = raiz.querySelector(`#${tituloId}`);
        if (t) {
          t.focus({ preventScroll: true });
          const topo = raiz.getBoundingClientRect().top;
          if (topo < 0 || topo > window.innerHeight * 0.6) raiz.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        }
      } else if (seletorFoco) {
        const alvo = raiz.querySelector(seletorFoco);
        if (alvo) alvo.focus({ preventScroll: true });
      } else if (tinhaFoco && ativo && ativo.id) {
        const mesmo = raiz.querySelector(`#${CSS.escape(ativo.id)}`);
        if (mesmo) mesmo.focus({ preventScroll: true });
      }
    }

    // Mudanças vindas de outra aba ou do painel: redesenha sem roubar o foco de quem está digitando
    loja.ouvir(() => {
      if (est.passo === 5 && raiz.contains(document.activeElement)) return;
      if (est.enviando) return;
      render(false);
    });
    render(false);

    return {
      // Começa de novo; com servicoId, pula para a escolha da profissional.
      // Com profissionalId, essa profissional já vem marcada quando fizer o serviço.
      iniciar({ servicoId, profissionalId } = {}) {
        est = estadoInicial();
        const p = profissionalId ? M.profissional(d(), profissionalId) : null;
        if (p && p.ativo) { est.preferida = p.id; est.profissionalId = p.id; }
        const s = servicoId ? M.servico(d(), servicoId) : null;
        if (s && s.ativo) {
          est.servicoId = s.id;
          if (est.profissionalId && !M.habilitadas(d(), s).some((x) => x.id === est.profissionalId)) est.profissionalId = null;
          est.passo = 2;
        }
        render(true);
      },
    };
  }

  /* ======================================================================
     MINHA RESERVA — consulta e cancelamento pela cliente
     ====================================================================== */
  let dialogo = null;
  function abrirMinhaReserva({ loja, codigo = "", telefone = "", privacidade = "privacidade.html" }) {
    if (!dialogo) {
      dialogo = el("dialog", { class: "ae-dialogo", "aria-labelledby": "ae-mr-titulo" });
      dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
      document.body.append(dialogo);
    }
    const d = () => loja.dados;
    let reserva = null;
    let confirmando = false;
    let erro = "";
    let msg = "";
    let ocupado = false;
    const valores = { codigo, telefone: telefone ? U.mascararTelefone(telefone) : "" };

    function desenhar(focar) {
      const fechar = el("button", { type: "button", class: "ae-icone-btn ae-dialogo__fechar", "aria-label": "Fechar", onclick: () => dialogo.close() }, icone("x", 20));
      const cabeca = el("div", { class: "ae-dialogo__cabeca" }, el("h2", { id: "ae-mr-titulo", texto: "Minha reserva" }), fechar);
      let corpo;
      if (!reserva) {
        const cod = el("input", { id: "ae-mr-codigo", class: "ae-campo__entrada ae-campo__entrada--codigo", autocomplete: "off", maxlength: 8, required: true, "aria-describedby": "ae-mr-codigo-ajuda", oninput: (e) => { valores.codigo = e.target.value.toUpperCase(); e.target.value = valores.codigo; } });
        cod.value = valores.codigo;
        const tel = el("input", { id: "ae-mr-tel", type: "tel", inputmode: "tel", class: "ae-campo__entrada", autocomplete: "tel-national", maxlength: 16, required: true, oninput: (e) => { e.target.value = U.mascararTelefone(e.target.value); valores.telefone = e.target.value; } });
        tel.value = valores.telefone;
        corpo = el("form", { class: "ae-form", novalidate: true, onsubmit: (e) => {
          e.preventDefault();
          const r = loja.consultar(valores.codigo, valores.telefone);
          if (!r.ok) { erro = r.erro; desenhar("#ae-mr-codigo"); return; }
          reserva = r.reserva; erro = ""; desenhar(".ae-dialogo h3");
        } },
          el("p", { class: "ae-nota", texto: "Informe o código que apareceu ao reservar e o telefone usado na reserva." }),
          el("div", { class: "ae-campo" }, el("label", { for: "ae-mr-codigo", class: "ae-campo__rotulo", texto: "Código da reserva" }), cod, el("p", { id: "ae-mr-codigo-ajuda", class: "ae-campo__ajuda", texto: "6 letras e números, por exemplo K7MQ2X." })),
          el("div", { class: "ae-campo" }, el("label", { for: "ae-mr-tel", class: "ae-campo__rotulo", texto: "Telefone" }), tel),
          erro ? el("p", { class: "ae-campo__erro", role: "alert" }, icone("circle-alert", 14), erro) : null,
          el("div", { class: "ae-acoes" }, el("span"), el("button", { type: "submit", class: "ae-btn ae-btn--principal" }, "Ver reserva")),
          el("p", { class: "ae-nota ae-nota--fina", texto: "Demonstração: só aparecem reservas feitas neste navegador. Num site publicado com servidor, a consulta funcionaria de qualquer aparelho." }));
      } else {
        const r = d().reservas.find((x) => x.id === reserva.id) || reserva;
        const pode = loja.podeCancelarPeloSite(d(), r);
        corpo = el("div", { class: "ae-mr" },
          el("h3", { tabindex: "-1", class: "ae-mr__titulo" }, r.servicoNome, " ", rotuloStatus(r.status)),
          el("dl", { class: "ae-final__dados" },
            [["Código", r.codigo], ["Profissional", r.profissionalNome], ["Data", U.dataLonga(r.data)], ["Horário", `${r.inicio} às ${r.fim}`], ["Valor", U.moeda(r.preco)], ["Nome", r.cliente.nome]]
              .map(([a, b]) => el("div", {}, el("dt", { texto: a }), el("dd", { texto: b })))),
          msg ? el("p", { class: "ae-sucesso", role: "status" }, icone("circle-check", 16), msg) : null,
          erro ? el("p", { class: "ae-falha", role: "alert" }, icone("circle-x", 16), el("span", { texto: erro })) : null,
          !pode.ok && ["pendente", "confirmado"].includes(r.status) ? el("p", { class: "ae-nota" }, icone("info", 16), el("span", { texto: pode.erro })) : null,
          pode.ok && !confirmando ? el("div", { class: "ae-acoes" }, el("span"), el("button", { type: "button", class: "ae-btn ae-btn--perigo", onclick: () => { confirmando = true; erro = ""; desenhar(".ae-mr__confirma button"); } }, "Cancelar esta reserva")) : null,
          pode.ok && confirmando ? el("div", { class: "ae-mr__confirma", role: "group", "aria-label": "Confirmar cancelamento" },
            el("p", { texto: `Cancelar ${r.servicoNome} em ${U.dataLonga(r.data)}, às ${r.inicio}? O horário volta a ficar livre para outras clientes.` }),
            el("div", { class: "ae-acoes" },
              el("button", { type: "button", class: "ae-btn ae-btn--texto", disabled: ocupado, onclick: () => { confirmando = false; desenhar(".ae-btn--perigo"); } }, "Manter reserva"),
              el("button", { type: "button", class: "ae-btn ae-btn--perigo", disabled: ocupado, "aria-busy": ocupado ? "true" : null, onclick: async () => {
                ocupado = true; desenhar();
                const res = await loja.cancelarPeloCliente(r.codigo, r.cliente.telefone);
                ocupado = false; confirmando = false;
                if (res.ok) { msg = "Reserva cancelada. O horário foi liberado."; erro = ""; }
                else { erro = `O cancelamento não foi concluído. ${res.erro || ""}`; }
                desenhar(".ae-mr__titulo");
              } }, ocupado ? "Cancelando…" : "Sim, cancelar"))) : null,
          d().negocio.whatsapp ? el("a", { class: "ae-btn ae-btn--linha", href: U.linkWhatsapp(d().negocio.whatsapp, mensagemWhatsapp(d(), r)), target: "_blank", rel: "noopener" }, icone("message-circle", 16), "Falar com o estúdio") : null,
          el("button", { type: "button", class: "ae-link", onclick: () => { reserva = null; msg = ""; erro = ""; desenhar("#ae-mr-codigo"); } }, "Consultar outra reserva"));
      }
      U.trocar(dialogo, el("div", { class: "ae-dialogo__caixa" }, cabeca, corpo));
      if (focar) { const alvo = dialogo.querySelector(focar); if (alvo) alvo.focus(); }
    }
    desenhar();
    if (!dialogo.open) dialogo.showModal();
    const primeiro = dialogo.querySelector(valores.codigo ? "#ae-mr-tel" : "#ae-mr-codigo");
    if (codigo && telefone) { const r = loja.consultar(codigo, telefone); if (r.ok) { reserva = r.reserva; desenhar(".ae-mr__titulo"); return; } }
    if (primeiro) primeiro.focus();
  }

  AE.agendar = { montar, mensagemWhatsapp, blocoWhatsapp, rotuloStatus, copiarTexto };
  AE.minhaReserva = { abrir: abrirMinhaReserva };
})();
