/* ==========================================================================
   Agenda de Estúdio — painel.js
   O PAINEL DO ESTÚDIO: visão geral, agenda (dia, semana, mês e lista),
   serviços, equipe (jornadas, pausas, folgas e bloqueios), clientes,
   depoimentos e configurações.

   ATENÇÃO — DEMONSTRAÇÃO SEM LOGIN: este painel roda só no navegador e
   não tem senha. Ele mostra como a gestão funcionaria; num site publicado
   para uma empresa real, o painel precisa de login, de um servidor que
   confira cada operação e de um banco de dados.

   Todas as alterações passam pela loja (loja.js), que confere as regras
   e só confirma depois de gravar.
   ========================================================================== */
window.AE = window.AE || {};

(function () {
  "use strict";
  const U = AE.util;
  const M = AE.motor;
  const { el, icone, trocar } = U;
  const POR = "Estúdio (painel)";

  function iniciar({ loja, marca }) {
    loja.carregar();
    const d = () => loja.dados;
    const raiz = document.querySelector("[data-painel]");
    const dlg = document.getElementById("pn-janela");
    const est = {
      rota: "visao",
      agenda: { visao: window.matchMedia("(max-width: 700px)").matches ? "lista" : "dia", data: U.hoje(), prof: "", status: "ativas", busca: "", de: U.hoje(), ate: U.somarDias(U.hoje(), 30), pagina: 1 },
      clientes: { busca: "", pagina: 1 },
      servicos: { categoria: "", status: "" },
    };

    /* ======================================================================
       PEÇAS REUTILIZADAS
       ====================================================================== */
    const ROTAS = { visao: "Visão geral", agenda: "Agenda", servicos: "Serviços", equipe: "Equipe", clientes: "Clientes", depoimentos: "Depoimentos", configuracoes: "Configurações" };
    const cabeca = (titulo, sub, ...acoes) => el("div", { class: "pn-cabeca" },
      el("div", {}, el("h1", { class: "pn-titulo", texto: titulo }), sub ? el("p", { class: "pn-sub", texto: sub }) : null),
      acoes.filter(Boolean).length ? el("div", { class: "pn-cabeca__acoes" }, acoes) : null);
    const botao = (texto, onclick, { classe = "btn--linha", ic, rotulo, desativado } = {}) => el("button", { type: "button", class: `btn btn--pequeno ${classe}`, onclick, "aria-label": rotulo || null, disabled: desativado || null }, ic ? icone(ic, 16) : null, texto);
    const status = (s) => AE.agendar.rotuloStatus(s);
    const vazio = (texto, ...acoes) => el("div", { class: "pn-vazio" }, icone("calendar-x", 22), el("p", { texto }), acoes.length ? el("div", { class: "pn-vazio__acoes" }, acoes) : null);
    const bloco = (titulo, conteudo, extra) => el("section", { class: "pn-bloco" }, el("div", { class: "pn-bloco__cabeca" }, el("h2", { texto: titulo }), extra || null), conteudo);
    const porDataHora = (a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio);
    const iniciais = (n) => n.split(" ").filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
    const avatar = (p) => (marca.avatar ? marca.avatar(p) : el("span", { class: "ae-avatar", "aria-hidden": "true", texto: iniciais(p.nome) }));
    const cliente = (id) => d().clientes.find((c) => c.id === id) || null;
    const exemplo = (texto = "Exemplo") => el("span", { class: "pn-etiqueta", texto });
    function avisoResultado(r, sucesso) {
      if (r && r.ok) { U.aviso(sucesso); return true; }
      U.aviso((r && r.erro) || "Não foi possível concluir. Nada foi alterado.", "erro");
      return false;
    }
    function listaAfetadas(lista) {
      return el("ul", { class: "pn-afetadas" }, lista.map((x) => el("li", {},
        el("button", { type: "button", class: "pn-link", onclick: () => abrirReserva(x.id) }, `${U.dataBR(x.data)} às ${x.inicio}`),
        ` — ${x.cliente}, ${x.servico} com ${x.profissional} (código ${x.codigo})`)));
    }

    /* ---------- Janela ---------- */
    let voltarFoco = null;
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { const f = voltarFoco; voltarFoco = null; if (f && document.contains(f)) f.focus(); });
    function abrirJanela(titulo, corpo, { largura = "m" } = {}) {
      if (!dlg.open) voltarFoco = document.activeElement;
      dlg.className = `pn-janela pn-janela--${largura}`;
      trocar(dlg, el("div", { class: "pn-janela__caixa" },
        el("div", { class: "pn-janela__cabeca" }, el("h2", { id: "pn-janela-titulo", texto: titulo }),
          el("button", { type: "button", class: "icone-btn", "aria-label": "Fechar", onclick: () => dlg.close() }, icone("x", 20))),
        el("div", { class: "pn-janela__corpo" }, corpo)));
      if (!dlg.open) dlg.showModal();
      const foco = dlg.querySelector(".pn-janela__corpo [data-foco]") || dlg.querySelector(".pn-janela__corpo input:not([type=hidden]), .pn-janela__corpo select, .pn-janela__corpo textarea, .pn-janela__corpo button");
      if (foco) foco.focus();
    }
    const fecharJanela = () => { if (dlg.open) dlg.close(); };
    function confirmar({ titulo, texto, botaoTexto, perigo, motivo }) {
      return new Promise((resolver) => {
        let respondeu = false;
        const campoMotivo = motivo ? el("textarea", { id: "pn-motivo", class: "pn-entrada", rows: 2, maxlength: 120 }) : null;
        const responder = (v) => { respondeu = true; fecharJanela(); resolver(v ? { ok: true, motivo: campoMotivo ? campoMotivo.value : "" } : null); };
        abrirJanela(titulo, el("div", { class: "pn-confirma" },
          el("p", { texto }),
          campoMotivo ? el("div", { class: "pn-campo" }, el("label", { for: "pn-motivo", class: "pn-campo__rotulo", texto: `${motivo} (opcional)` }), campoMotivo) : null,
          el("div", { class: "pn-form__acoes" },
            el("button", { type: "button", class: "btn btn--linha btn--pequeno", "data-foco": true, onclick: () => responder(false) }, "Voltar"),
            el("button", { type: "button", class: `btn btn--pequeno ${perigo ? "btn--perigo" : "btn--principal"}`, onclick: () => responder(true) }, botaoTexto))), { largura: "p" });
        dlg.addEventListener("close", () => { if (!respondeu) resolver(null); }, { once: true });
      });
    }

    /* ======================================================================
       FORMULÁRIOS
       campos: [{ nome, rotulo, tipo, opcoes, ajuda, obrigatorio, max, largura: "meia", aoMudar }]
       tipos: texto, email, tel, numero, dinheiro, data, hora, area, select, checkbox, caixas, imagem, custom
       ====================================================================== */
    let seqCampo = 0;
    function campo(c, valor, api) {
      seqCampo += 1;
      const id = `pn-c${seqCampo}-${c.nome}`;
      const ajudaId = c.ajuda ? `${id}-ajuda` : null;
      const rotulo = (para) => el(para ? "label" : "span", { class: "pn-campo__rotulo", for: para || null }, c.rotulo, c.obrigatorio ? el("span", { class: "pn-obrig", texto: " *", "aria-hidden": "true" }) : null);
      const aoMudar = () => { if (c.aoMudar) c.aoMudar(api); };
      let no, ler, definir = () => {}, atualizar = () => {};
      if (c.tipo === "custom") {
        const r = c.render(valor, api);
        no = el("div", { class: `pn-campo${c.largura === "inteira" ? " pn-campo--inteira" : ""}`, "data-campo": c.nome }, c.rotulo ? el("p", { class: "pn-campo__rotulo", texto: c.rotulo }) : null, r.no, c.ajuda ? el("p", { id: ajudaId, class: "pn-campo__ajuda", texto: c.ajuda }) : null);
        return { no, ler: r.ler, definir: () => {}, atualizar: r.atualizar || (() => {}) };
      }
      if (c.tipo === "checkbox") {
        const cx = el("input", { type: "checkbox", id, class: "pn-caixa", onchange: aoMudar, "aria-describedby": ajudaId });
        cx.checked = !!valor;
        no = el("div", { class: "pn-campo pn-campo--check", "data-campo": c.nome }, el("div", { class: "pn-check" }, cx, el("label", { for: id, texto: c.rotulo })), c.ajuda ? el("p", { id: ajudaId, class: "pn-campo__ajuda", texto: c.ajuda }) : null);
        return { no, ler: () => cx.checked, definir: (v) => { cx.checked = !!v; }, atualizar };
      }
      if (c.tipo === "caixas") {
        const opcoes = typeof c.opcoes === "function" ? c.opcoes(api) : c.opcoes;
        const marcados = new Set(valor || []);
        const caixas = opcoes.map((o) => {
          const cid = `${id}-${o.valor}`;
          const cx = el("input", { type: "checkbox", id: cid, value: o.valor, class: "pn-caixa", onchange: aoMudar });
          cx.checked = marcados.has(o.valor);
          return el("div", { class: "pn-check" }, cx, el("label", { for: cid }, o.rotulo, o.nota ? el("span", { class: "pn-nota-inline", texto: ` ${o.nota}` }) : null));
        });
        no = el("fieldset", { class: `pn-campo pn-campo--grupo${c.largura === "inteira" ? " pn-campo--inteira" : ""}`, "data-campo": c.nome, "aria-describedby": ajudaId },
          el("legend", { class: "pn-campo__rotulo", texto: c.rotulo }), el("div", { class: "pn-caixas" }, caixas), c.ajuda ? el("p", { id: ajudaId, class: "pn-campo__ajuda", texto: c.ajuda }) : null);
        return { no, ler: () => [...no.querySelectorAll("input:checked")].map((x) => x.value), definir, atualizar };
      }
      if (c.tipo === "imagem") {
        let atual = valor || "";
        let novo;
        const previa = el("div", { class: "pn-logo-previa" });
        const desenhar = () => trocar(previa, (novo !== undefined ? novo : atual) ? el("img", { src: novo !== undefined ? novo : atual, alt: "Prévia do logotipo" }) : el("span", { texto: "Sem imagem: o site usa o nome em texto." }));
        desenhar();
        const arquivo = el("input", { type: "file", id, accept: "image/png,image/jpeg,image/svg+xml,image/webp", class: "pn-arquivo", "aria-describedby": ajudaId,
          onchange: () => {
            const f = arquivo.files[0];
            if (!f) return;
            if (f.size > 200 * 1024) { U.aviso("A imagem passa de 200 KB. Use uma versão menor.", "erro"); arquivo.value = ""; return; }
            const leitor = new FileReader();
            leitor.onload = () => { novo = String(leitor.result); desenhar(); };
            leitor.readAsDataURL(f);
          } });
        no = el("div", { class: "pn-campo pn-campo--inteira", "data-campo": c.nome }, rotulo(id), el("div", { class: "pn-logo" }, previa, el("div", { class: "pn-logo__acoes" }, arquivo,
          el("button", { type: "button", class: "btn btn--linha btn--pequeno", onclick: () => { novo = ""; arquivo.value = ""; desenhar(); } }, "Remover imagem"))),
        c.ajuda ? el("p", { id: ajudaId, class: "pn-campo__ajuda", texto: c.ajuda }) : null);
        return { no, ler: () => novo, definir, atualizar };
      }
      let entrada;
      if (c.tipo === "select") {
        entrada = el("select", { id, class: "pn-entrada", onchange: aoMudar, "aria-describedby": ajudaId });
        atualizar = () => {
          const atualV = entrada.value || valor;
          const opcoes = typeof c.opcoes === "function" ? c.opcoes(api) : c.opcoes;
          trocar(entrada, opcoes.length ? opcoes.map((o) => el("option", { value: o.valor, disabled: o.desativada || null, texto: o.rotulo })) : el("option", { value: "", texto: c.semOpcoes || "Nenhuma opção" }));
          if (opcoes.some((o) => String(o.valor) === String(atualV) && !o.desativada)) entrada.value = atualV;
          entrada.disabled = !opcoes.length;
        };
        atualizar();
        definir = (v) => { entrada.value = v; };
      } else if (c.tipo === "area") {
        entrada = el("textarea", { id, class: "pn-entrada", rows: c.linhas || 3, maxlength: c.max || null, "aria-describedby": ajudaId });
        entrada.value = valor ?? "";
      } else {
        const tipos = { texto: "text", email: "email", tel: "tel", numero: "number", dinheiro: "text", data: "date", hora: "time" };
        entrada = el("input", { id, type: tipos[c.tipo] || "text", class: "pn-entrada", maxlength: c.max || null, min: c.min ?? null, max: c.tipo === "numero" || c.tipo === "data" ? c.maximo ?? null : null, step: c.passo || null,
          inputmode: c.tipo === "dinheiro" ? "decimal" : c.tipo === "tel" ? "tel" : null, autocomplete: c.auto || "off", "aria-describedby": ajudaId, onchange: aoMudar });
        entrada.value = c.tipo === "dinheiro" ? (valor === "" || valor === undefined ? "" : U.valorEditavel(valor)) : c.tipo === "tel" && valor ? U.mascararTelefone(valor) : valor ?? "";
        if (c.tipo === "tel") entrada.addEventListener("input", () => { entrada.value = U.mascararTelefone(entrada.value); });
      }
      ler = () => (c.tipo === "numero" ? (entrada.value === "" ? "" : Number(entrada.value)) : entrada.value);
      no = el("div", { class: `pn-campo${c.largura === "meia" ? " pn-campo--meia" : ""}${c.largura === "inteira" || c.tipo === "area" ? " pn-campo--inteira" : ""}`, "data-campo": c.nome },
        rotulo(id), entrada, c.ajuda ? el("p", { id: ajudaId, class: "pn-campo__ajuda", texto: c.ajuda }) : null);
      return { no, ler, definir, atualizar };
    }
    function formulario({ campos, valores = {}, enviar, rotuloEnviar = "Salvar", aoConcluir, cancelar = true, antes, depois }) {
      const mapa = {};
      const api = { ler: (n) => (mapa[n] ? mapa[n].ler() : undefined), atualizar: (n) => { if (mapa[n]) mapa[n].atualizar(); }, definir: (n, v) => { if (mapa[n]) mapa[n].definir(v); } };
      const form = el("form", { class: "pn-form", novalidate: true });
      const grade = el("div", { class: "pn-form__grade" });
      campos.filter(Boolean).forEach((c) => { const f = campo(c, valores[c.nome], api); mapa[c.nome] = f; grade.append(f.no); });
      const geral = el("div", { class: "pn-form__geral" });
      const enviarBtn = el("button", { type: "submit", class: "btn btn--principal btn--pequeno" }, rotuloEnviar);
      form.append(antes || "", grade, depois || "", geral, el("div", { class: "pn-form__acoes" },
        cancelar ? el("button", { type: "button", class: "btn btn--linha btn--pequeno", onclick: fecharJanela }, "Cancelar") : el("span"), enviarBtn));
      let enviando = false;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (enviando) return;
        const v = {};
        Object.entries(mapa).forEach(([k, f]) => { v[k] = f.ler(); });
        enviando = true;
        enviarBtn.disabled = true;
        enviarBtn.setAttribute("aria-busy", "true");
        const textoOriginal = enviarBtn.textContent;
        enviarBtn.textContent = "Salvando…";
        let r;
        try { r = await enviar(v); } catch (erro) { console.error(erro); r = { ok: false, erro: "Algo deu errado. Nada foi alterado." }; }
        enviando = false;
        enviarBtn.disabled = false;
        enviarBtn.removeAttribute("aria-busy");
        enviarBtn.textContent = textoOriginal;
        form.querySelectorAll(".pn-campo__erro").forEach((x) => x.remove());
        form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
        trocar(geral);
        if (r && r.ok) { if (aoConcluir) aoConcluir(r, v); return; }
        const erros = (r && r.erros) || {};
        const soltos = [];
        Object.entries(erros).forEach(([k, msg]) => {
          const alvo = form.querySelector(`[data-campo="${k}"]`);
          if (!alvo) { soltos.push(msg); return; }
          const eid = `pn-erro-${k}-${(seqCampo += 1)}`;
          alvo.append(el("p", { class: "pn-campo__erro", id: eid }, icone("circle-alert", 14), msg));
          const inp = alvo.matches("fieldset") ? alvo : alvo.querySelector("input, select, textarea");
          if (inp) { inp.setAttribute("aria-invalid", "true"); inp.setAttribute("aria-describedby", [inp.getAttribute("aria-describedby"), eid].filter(Boolean).join(" ")); }
        });
        geral.append(el("div", { class: "pn-erro", role: "alert", tabindex: "-1" }, icone("circle-x", 18),
          el("div", {}, el("p", { texto: (r && r.erro) || "Não foi possível salvar. Nada foi alterado." }), soltos.map((m) => el("p", { texto: m })), r && r.reservas ? listaAfetadas(r.reservas) : null)));
        const primeiro = form.querySelector("[aria-invalid='true']");
        (primeiro && primeiro.matches("input, select, textarea") ? primeiro : geral.querySelector(".pn-erro")).focus();
      });
      return { form, api };
    }

    /* ======================================================================
       RESERVA: detalhes e ações
       ====================================================================== */
    function abrirReserva(id) {
      const r = d().reservas.find((x) => x.id === id);
      if (!r) { U.aviso("Reserva não encontrada.", "erro"); return; }
      const c = cliente(r.clienteId);
      const acao = async (novo, rotulo, sucesso, { perigo, motivo } = {}) => {
        let extra = {};
        if (perigo) {
          const ok = await confirmar({ titulo: rotulo, texto: `${rotulo}: ${r.servicoNome} de ${r.cliente.nome}, ${U.dataLonga(r.data)} às ${r.inicio}?${novo === "cancelado" ? " O horário volta a ficar livre." : ""}`, botaoTexto: rotulo, perigo: true, motivo });
          if (!ok) { abrirReserva(id); return; }
          extra = { motivo: ok.motivo };
        }
        const res = await loja.mudarStatus(r.id, novo, { por: POR, ...extra });
        avisoResultado(res, sucesso);
        abrirReserva(id);
      };
      const podeConfirmar = M.podeMudar(r, "confirmado").ok;
      const podeConcluir = M.podeMudar(r, "concluido").ok;
      const podeFalta = M.podeMudar(r, "nao_compareceu").ok;
      const podeCancelar = M.podeMudar(r, "cancelado").ok;
      const podeReagendar = ["pendente", "confirmado"].includes(r.status);
      const linhas = [
        ["Código", r.codigo], ["Serviço", r.servicoNome], ["Profissional", `${r.profissionalNome}${r.escolhaQualquer ? AE.t(" (escolhid{s} pelo sistema: “qualquer profissional”)") : ""}`],
        ["Data", U.dataLonga(r.data)], ["Horário", `${r.inicio} às ${r.fim} (${U.duracao(r.duracao)})`], ["Valor registrado", U.moeda(r.preco)],
        ["Cliente", r.cliente.nome], ["Telefone", U.formatarTelefone(r.cliente.telefone)], r.cliente.email ? ["E-mail", r.cliente.email] : null,
        r.observacao ? ["Observação", r.observacao] : null,
        ["Origem", r.origem === "site" ? "Site (cliente)" : "Painel (estúdio)"], ["Criada em", U.momentoBR(r.criadaEm)],
        r.consentimentoEm ? ["Consentimento", `Aceito no site em ${U.momentoBR(r.consentimentoEm)}`] : null,
      ].filter(Boolean);
      const whats = !r.ficticia && ["pendente", "confirmado"].includes(r.status)
        ? el("a", { class: "btn btn--linha btn--pequeno", target: "_blank", rel: "noopener", href: U.linkWhatsapp(`55${r.cliente.telefone}`, `Olá, ${r.cliente.nome.split(" ")[0]}! Aqui é do ${d().negocio.nomeCurto || d().negocio.nome}. Sua reserva de ${r.servicoNome} em ${U.dataBR(r.data)} às ${r.inicio} está ${r.status === "confirmado" ? "confirmada" : "recebida e em análise"}. Código: ${r.codigo}.`) }, icone("message-circle", 16), AE.t("Mensagem para {ca} cliente"))
        : r.ficticia ? el("p", { class: "pn-nota", texto: "Reserva de exemplo: o contato pelo WhatsApp fica desligado." }) : null;
      abrirJanela(`Reserva ${r.codigo}`, el("div", { class: "pn-reserva" },
        el("div", { class: "pn-reserva__topo" }, status(r.status), r.ficticia ? exemplo() : null),
        el("dl", { class: "pn-dl" }, linhas.map(([a, b]) => el("div", {}, el("dt", { texto: a }), el("dd", { texto: b })))),
        el("div", { class: "pn-reserva__acoes" },
          podeConfirmar ? botao("Confirmar", () => acao("confirmado", "Confirmar", "Reserva confirmada."), { classe: "btn--principal", ic: "check" }) : null,
          podeConcluir ? botao("Marcar como concluída", () => acao("concluido", "Concluir", "Atendimento marcado como concluído."), { ic: "circle-check" }) : null,
          podeFalta ? botao("Não compareceu", () => acao("nao_compareceu", "Marcar falta", "Falta registrada.", { perigo: true }), { ic: "user-x" }) : null,
          podeReagendar ? botao("Reagendar", () => reagendar(r.id), { ic: "calendar-clock" }) : null,
          podeCancelar ? botao("Cancelar reserva", () => acao("cancelado", "Cancelar reserva", "Reserva cancelada. O horário foi liberado.", { perigo: true, motivo: "Motivo do cancelamento" }), { classe: "btn--perigo-linha", ic: "circle-x" }) : null,
          whats,
          c ? botao("Ver cliente", () => abrirCliente(c.id), { ic: "user" }) : null),
        !podeConcluir && r.status === "confirmado" && !M.comecou(r) ? el("p", { class: "pn-nota", texto: "“Concluída” e “não compareceu” ficam disponíveis depois do horário de início." }) : null,
        el("section", { class: "pn-historico" }, el("h3", { texto: "Histórico" }),
          el("ol", {}, (r.historico || []).slice().reverse().map((h) => el("li", {}, el("span", { class: "pn-historico__quando", texto: U.momentoBR(h.em) }), el("span", { texto: h.texto }), el("span", { class: "pn-historico__por", texto: h.por })))))), { largura: "g" });
    }

    // Opções de horário para um serviço/profissional/data (usado em nova reserva e reagendamento)
    function opcoesHorario({ servicoId, profissionalId, data, ignorarId, duracao }) {
      if (!servicoId || !profissionalId || !U.dataValida(data)) return [];
      return M.horarios(d(), { servicoId, profissionalId, data, contexto: "painel", ignorarId, duracao }).map((h) => ({ valor: h.inicio, rotulo: `${h.inicio} às ${U.hhmm(U.minutos(h.inicio) + (duracao || M.servico(d(), servicoId).duracao))}${profissionalId === "qualquer" ? ` (${h.profissionais.length} livre${h.profissionais.length > 1 ? "s" : ""})` : ""}` }));
    }

    function reagendar(id) {
      const r = d().reservas.find((x) => x.id === id);
      const s = M.servico(d(), r.servicoId);
      const { form } = formulario({
        valores: { profissionalId: r.profissionalId, data: r.data },
        campos: [
          { nome: "profissionalId", rotulo: "Profissional", tipo: "select", opcoes: () => (s ? M.habilitadas(d(), s) : []).map((p) => ({ valor: p.id, rotulo: p.nome })), aoMudar: (api) => api.atualizar("inicio") },
          { nome: "data", rotulo: "Data", tipo: "data", min: U.hoje(), aoMudar: (api) => api.atualizar("inicio") },
          { nome: "inicio", rotulo: "Novo horário", tipo: "select", semOpcoes: "Sem horário livre nesse dia", largura: "inteira",
            opcoes: (api) => opcoesHorario({ servicoId: r.servicoId, profissionalId: api.ler("profissionalId"), data: api.ler("data"), ignorarId: r.id, duracao: r.duracao }),
            ajuda: `Duração considerada: ${U.duracao(r.duracao)} (a registrada na reserva). Só aparecem horários livres de verdade.` },
        ],
        rotuloEnviar: "Reagendar",
        enviar: (v) => (v.inicio ? loja.reagendar(r.id, v, { por: POR }) : Promise.resolve({ ok: false, erros: { inicio: "Escolha um horário livre." } })),
        aoConcluir: () => { U.aviso("Reserva reagendada."); abrirReserva(r.id); },
      });
      abrirJanela(`Reagendar ${r.codigo}`, el("div", {}, el("p", { class: "pn-nota", texto: `${r.servicoNome} de ${r.cliente.nome}. Hoje marcada para ${U.dataLonga(r.data)} às ${r.inicio}.` }), form));
    }

    function novaReserva(pre = {}) {
      const ativos = d().servicos.filter((s) => s.ativo);
      if (!ativos.length) { U.aviso("Cadastre ou ative um serviço antes.", "erro"); return; }
      const { form } = formulario({
        valores: { servicoId: pre.servicoId || ativos[0].id, profissionalId: pre.profissionalId || "qualquer", data: pre.data || U.hoje(), inicio: pre.inicio || "", status: "confirmado" },
        campos: [
          { nome: "servicoId", rotulo: "Serviço", tipo: "select", obrigatorio: true, opcoes: ativos.map((s) => ({ valor: s.id, rotulo: `${s.nome} · ${U.duracao(s.duracao)} · ${U.moeda(s.preco)}` })), aoMudar: (api) => { api.atualizar("profissionalId"); api.atualizar("inicio"); }, largura: "inteira" },
          { nome: "profissionalId", rotulo: "Profissional", tipo: "select", obrigatorio: true, opcoes: (api) => { const s = M.servico(d(), api.ler("servicoId")); const hab = s ? M.habilitadas(d(), s) : []; return (hab.length > 1 ? [{ valor: "qualquer", rotulo: "Qualquer profissional livre" }] : []).concat(hab.map((p) => ({ valor: p.id, rotulo: p.nome }))); }, aoMudar: (api) => api.atualizar("inicio") },
          { nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true, min: U.hoje(), aoMudar: (api) => api.atualizar("inicio") },
          { nome: "inicio", rotulo: "Horário", tipo: "select", obrigatorio: true, semOpcoes: "Sem horário livre nesse dia", largura: "inteira", opcoes: (api) => opcoesHorario({ servicoId: api.ler("servicoId"), profissionalId: api.ler("profissionalId"), data: api.ler("data") }) },
          { nome: "nome", rotulo: AE.t("Nome d{ca} cliente"), tipo: "texto", obrigatorio: true, max: 80, auto: "off" },
          { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, max: 16, ajuda: AE.t("Com DDD. Se já houver cadastro com esse número, a reserva entra no histórico {cdela}.") },
          { nome: "email", rotulo: "E-mail", tipo: "email", max: 120 },
          { nome: "status", rotulo: "Situação", tipo: "select", opcoes: [{ valor: "confirmado", rotulo: "Confirmada" }, { valor: "pendente", rotulo: "Pendente (confirmar depois)" }] },
          { nome: "observacao", rotulo: "Observação", tipo: "area", max: 300 },
        ],
        rotuloEnviar: "Criar reserva",
        enviar: (v) => (v.inicio ? loja.reservar(v, { contexto: "painel", por: POR }) : Promise.resolve({ ok: false, erros: { inicio: "Escolha um horário livre." } })),
        aoConcluir: (r) => { U.aviso(`Reserva ${r.reserva.codigo} criada.`); abrirReserva(r.reserva.id); },
      });
      abrirJanela("Nova reserva", el("div", {}, el("p", { class: "pn-nota", texto: "Pelo painel dá para marcar em cima da hora (sem a antecedência mínima do site), mas nunca no passado nem em cima de outro horário." }), form), { largura: "g" });
    }

    function novoBloqueio(pre = {}) {
      const { form } = formulario({
        valores: { profissionalId: pre.profissionalId || "", data: pre.data || U.hoje(), inicio: pre.inicio || "", fim: pre.fim || "" },
        campos: [
          { nome: "profissionalId", rotulo: "Para quem", tipo: "select", opcoes: [{ valor: "", rotulo: "Todo o estúdio" }, ...d().profissionais.filter((p) => p.ativo).map((p) => ({ valor: p.id, rotulo: p.nome }))], largura: "inteira" },
          { nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true, min: U.hoje() },
          { nome: "inicio", rotulo: "Início", tipo: "hora", obrigatorio: true, largura: "meia" },
          { nome: "fim", rotulo: "Fim", tipo: "hora", obrigatorio: true, largura: "meia" },
          { nome: "motivo", rotulo: "Motivo", tipo: "texto", obrigatorio: true, max: 80, ajuda: "Aparece só no painel. Exemplo: reunião, manutenção, compromisso." },
        ],
        rotuloEnviar: "Bloquear",
        enviar: (v) => loja.salvarBloqueio(v, { por: POR }),
        aoConcluir: () => { U.aviso("Horário bloqueado: ele não aparece mais para reservas."); fecharJanela(); },
      });
      abrirJanela("Bloquear horário", el("div", {}, el("p", { class: "pn-nota", texto: "Se já houver reserva nesse intervalo, o bloqueio é recusado e a lista mostra quais reagendar ou cancelar antes." }), form));
    }

    /* ======================================================================
       VISÃO GERAL
       ====================================================================== */
    function linhaReserva(r, { mostrarData, acoes = true } = {}) {
      const confirmarBtn = acoes && r.status === "pendente" && M.futura(r) ? botao("Confirmar", async () => avisoResultado(await loja.mudarStatus(r.id, "confirmado", { por: POR }), "Reserva confirmada."), { classe: "btn--principal", rotulo: `Confirmar reserva de ${r.cliente.nome}` }) : null;
      return el("li", { class: `pn-linha pn-linha--${r.status}` },
        el("span", { class: "pn-linha__hora" }, mostrarData ? el("span", { class: "pn-linha__data", texto: U.dataCurta(r.data) }) : null, r.inicio),
        el("span", { class: "pn-linha__corpo" }, el("b", { texto: r.cliente.nome }), el("span", { texto: `${r.servicoNome} · ${r.profissionalNome}` })),
        el("span", { class: "pn-linha__status" }, status(r.status)),
        el("span", { class: "pn-linha__acoes" }, confirmarBtn, botao("Abrir", () => abrirReserva(r.id), { rotulo: `Abrir reserva de ${r.cliente.nome} às ${r.inicio}` })));
    }
    function barras(itens, { formato = (v) => String(v), maximo } = {}) {
      const max = maximo || Math.max(1, ...itens.map((i) => i.valor));
      return el("ul", { class: "pn-barras" }, itens.map((i) => el("li", {},
        el("span", { class: "pn-barras__rotulo", texto: i.rotulo }),
        el("span", { class: "pn-barras__trilho", "aria-hidden": "true" }, el("span", { class: "pn-barras__barra", style: { width: `${Math.max(2, (i.valor / max) * 100)}%` } })),
        el("span", { class: "pn-barras__valor", texto: formato(i.valor) }))));
    }
    function verVisao() {
      const hj = U.hoje();
      const R = d().reservas;
      const hoje = R.filter((r) => r.data === hj && r.status !== "cancelado").sort(porDataHora);
      const pendentes = R.filter((r) => r.status === "pendente" && M.futura(r)).sort(porDataHora);
      const semDesfecho = R.filter((r) => ["pendente", "confirmado"].includes(r.status) && M.comecou(r) && U.diasEntre(r.data, hj) * 1440 + U.agoraMin() >= U.minutos(r.fim)).sort(porDataHora);
      const proximos7 = R.filter((r) => ["confirmado", "pendente"].includes(r.status) && r.data > hj && r.data <= U.somarDias(hj, 7));
      const de30 = U.somarDias(hj, -30);
      const cancel30 = R.filter((r) => r.status === "cancelado" && r.data >= de30 && r.data <= hj).length;
      const ocupSemana = M.ocupacao(d(), { de: hj, ate: U.somarDias(hj, 6) });
      const contagem = new Map();
      R.filter((r) => M.ocupa(r) && r.data >= de30 && r.data <= hj).forEach((r) => contagem.set(r.servicoNome, (contagem.get(r.servicoNome) || 0) + 1));
      const top = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([rotulo, valor]) => ({ rotulo, valor }));
      const ocupProf = d().profissionais.filter((p) => p.ativo).map((p) => ({ rotulo: p.nome, valor: M.ocupacao(d(), { de: hj, ate: U.somarDias(hj, 6), profissionalId: p.id }).pct }));
      const pct = (v) => `${Math.round(v * 100)}%`;
      const numero = (valor, rotulo, nota, alvo) => el(alvo ? "a" : "div", { class: "pn-numero", href: alvo || null }, el("strong", { texto: String(valor) }), el("span", { texto: rotulo }), nota ? el("small", { texto: nota }) : null);
      return el("div", {},
        cabeca("Visão geral", `${U.dataLonga(hj)} · dados calculados a partir das reservas gravadas neste navegador`, botao("Nova reserva", () => novaReserva(), { classe: "btn--principal", ic: "plus" })),
        el("div", { class: "pn-numeros" },
          numero(hoje.filter((r) => M.ocupa(r)).length, "atendimentos hoje", `${hoje.filter((r) => r.status === "concluido").length} concluídos`, "#/agenda"),
          numero(pendentes.length, "pendentes de confirmação", pendentes.length ? "confirme ou recuse" : "nada esperando", pendentes.length ? "#/visao-pendentes" : null),
          numero(proximos7.length, "reservas nos próximos 7 dias", `${proximos7.filter((r) => r.status === "confirmado").length} confirmadas`),
          numero(cancel30, "cancelamentos em 30 dias", "liberaram horário na agenda"),
          numero(pct(ocupSemana.pct), "da agenda ocupada", "próximos 7 dias, sobre o horário aberto")),
        el("div", { class: "pn-colunas" },
          bloco(`Hoje, ${U.dataCurta(hj)}`, hoje.length ? el("ul", { class: "pn-lista" }, hoje.map((r) => linhaReserva(r))) : vazio("Nenhum atendimento marcado para hoje.", botao("Nova reserva", () => novaReserva(), { ic: "plus" })), botao("Ver o dia", () => irAgenda("dia", hj))),
          bloco("Pendentes de confirmação", pendentes.length ? el("ul", { class: "pn-lista", id: "visao-pendentes" }, pendentes.slice(0, 8).map((r) => linhaReserva(r, { mostrarData: true }))) : vazio("Nenhuma solicitação esperando confirmação."),
            pendentes.length > 8 ? botao(`Ver todas (${pendentes.length})`, () => { est.agenda.status = "pendente"; irAgenda("lista"); }) : null)),
        semDesfecho.length ? bloco("Precisam de desfecho", el("div", {}, el("p", { class: "pn-nota", texto: "Horários que já passaram e continuam como pendentes ou confirmados. Marque se o atendimento aconteceu." }),
          el("ul", { class: "pn-lista" }, semDesfecho.slice(-8).reverse().map((r) => linhaReserva(r, { mostrarData: true, acoes: false })))),
          semDesfecho.length > 8 ? botao(`Ver todas (${semDesfecho.length})`, () => { est.agenda.status = "ativas"; est.agenda.de = U.somarDias(hj, -60); est.agenda.ate = hj; irAgenda("lista"); }) : null) : null,
        el("div", { class: "pn-colunas" },
          bloco("Serviços mais reservados", top.length ? el("div", {}, el("p", { class: "pn-nota", texto: "Últimos 30 dias, sem contar cancelamentos." }), barras(top, { formato: (v) => U.plural(v, "reserva", "reservas") })) : vazio("Ainda não há reservas nos últimos 30 dias.")),
          bloco("Ocupação por profissional", ocupProf.length ? el("div", {}, el("p", { class: "pn-nota", texto: AE.t("Próximos 7 dias: tempo reservado sobre o tempo de agenda aberta de {cada}.") }), barras(ocupProf, { formato: pct, maximo: 1 })) : vazio(AE.t("{Nenhuma} profissional ativ{s}.")))));
    }

    /* ======================================================================
       AGENDA
       ====================================================================== */
    function irAgenda(visao, data) {
      est.agenda.visao = visao;
      if (data) est.agenda.data = data;
      est.agenda.pagina = 1;
      if (location.hash !== "#/agenda") location.hash = "#/agenda"; else desenhar(true);
    }
    function verAgenda() {
      const a = est.agenda;
      const visoes = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["lista", "Lista"]];
      const passo = { dia: 1, semana: 7, mes: 0 };
      const mover = (n) => { a.data = a.visao === "mes" ? U.somarMeses(a.data, n) : U.somarDias(a.data, n * passo[a.visao]); desenhar(false, ".pn-agenda__nav button"); };
      const titulo = a.visao === "dia" ? U.dataLonga(a.data) : a.visao === "semana" ? `Semana de ${U.dataCurta(U.inicioDaSemana(a.data))} a ${U.dataCurta(U.somarDias(U.inicioDaSemana(a.data), 6))}` : a.visao === "mes" ? U.mesAno(a.data) : "Lista de reservas";
      const profs = d().profissionais.filter((p) => p.ativo || d().reservas.some((r) => r.profissionalId === p.id));
      const barra = el("div", { class: "pn-agenda__barra" },
        el("div", { class: "pn-segmentos", role: "group", "aria-label": "Forma de ver a agenda" }, visoes.map(([v, nome]) => el("button", { type: "button", class: "pn-segmento", "aria-pressed": a.visao === v ? "true" : "false", onclick: () => { a.visao = v; a.pagina = 1; desenhar(false, ".pn-segmento[aria-pressed='true']"); } }, nome))),
        a.visao !== "lista" ? el("div", { class: "pn-agenda__nav" },
          el("button", { type: "button", class: "icone-btn", "aria-label": "Anterior", onclick: () => mover(-1) }, icone("chevron-left", 20)),
          el("button", { type: "button", class: "btn btn--linha btn--pequeno", onclick: () => { a.data = U.hoje(); desenhar(); } }, "Hoje"),
          el("button", { type: "button", class: "icone-btn", "aria-label": "Próximo", onclick: () => mover(1) }, icone("chevron-right", 20)),
          el("label", { class: "pn-oculto", for: "pn-ir-data", texto: "Ir para a data" }),
          el("input", { type: "date", id: "pn-ir-data", class: "pn-entrada pn-entrada--curta", value: a.data, onchange: (e) => { if (U.dataValida(e.target.value)) { a.data = e.target.value; desenhar(false, "#pn-ir-data"); } } })) : null,
        el("div", { class: "pn-agenda__filtro" },
          el("label", { for: "pn-filtro-prof", class: "pn-oculto", texto: "Profissional" }),
          el("select", { id: "pn-filtro-prof", class: "pn-entrada", onchange: (e) => { a.prof = e.target.value; a.pagina = 1; desenhar(false, "#pn-filtro-prof"); } },
            el("option", { value: "", texto: AE.t("{Todasas} profissionais") }), profs.map((p) => { const o = el("option", { value: p.id, texto: p.nome }); if (a.prof === p.id) o.selected = true; return o; }))));
      let corpo;
      if (a.visao === "dia") corpo = agendaDia();
      else if (a.visao === "semana") corpo = agendaSemana();
      else if (a.visao === "mes") corpo = agendaMes();
      else corpo = agendaLista();
      return el("div", {},
        cabeca("Agenda", titulo, botao("Bloquear horário", () => novoBloqueio({ data: a.visao === "lista" ? U.hoje() : a.data < U.hoje() ? U.hoje() : a.data }), { ic: "ban" }), botao("Nova reserva", () => novaReserva({ data: a.data < U.hoje() ? U.hoje() : a.data }), { classe: "btn--principal", ic: "plus" })),
        barra, corpo);
    }

    function agendaDia() {
      const data = est.agenda.data;
      const dow = U.diaDaSemana(data);
      const profs = d().profissionais.filter((p) => (est.agenda.prof ? p.id === est.agenda.prof : p.ativo || d().reservas.some((r) => r.profissionalId === p.id && r.data === data)));
      const negocio = (d().horarios[dow] || []).map(([x, y]) => [U.minutos(x), U.minutos(y)]);
      const doDia = d().reservas.filter((r) => r.data === data && r.status !== "cancelado");
      let ini = negocio.length ? Math.min(...negocio.map((x) => x[0])) : 540;
      let fim = negocio.length ? Math.max(...negocio.map((x) => x[1])) : 1080;
      doDia.forEach((r) => { ini = Math.min(ini, U.minutos(r.inicio)); fim = Math.max(fim, U.minutos(r.fim)); });
      ini = Math.floor(ini / 60) * 60;
      fim = Math.ceil(fim / 60) * 60;
      const px = 1.25;
      const altura = (fim - ini) * px;
      const y = (m) => `${(m - ini) * px}px`;
      const horas = [];
      for (let m = ini; m <= fim; m += 60) horas.push(el("span", { class: "pn-dia__hora", style: { top: y(m) }, texto: U.hhmm(m) }));
      const agoraLinha = data === U.hoje() && U.agoraMin() >= ini && U.agoraMin() <= fim ? el("span", { class: "pn-dia__agora", style: { top: y(U.agoraMin()) }, "aria-hidden": "true" }) : null;
      const canceladas = d().reservas.filter((r) => r.data === data && r.status === "cancelado" && (!est.agenda.prof || r.profissionalId === est.agenda.prof)).length;
      const colunas = profs.map((p) => {
        const { janelas, motivo, detalhe } = M.janelasDoDia(d(), p, data);
        // Fora da jornada (cinza listrado), pausas e bloqueios (com rótulo)
        const fora = [];
        let cursor = ini;
        janelas.forEach(([a, b]) => { if (a > cursor) fora.push([cursor, a]); cursor = Math.max(cursor, b); });
        if (cursor < fim) fora.push([cursor, fim]);
        const rotulosFora = [];
        (p.pausas || []).filter((x) => x.dias.includes(dow)).forEach((x) => rotulosFora.push([U.minutos(x.inicio), U.minutos(x.fim), "Pausa"]));
        d().bloqueios.filter((b) => b.data === data && (!b.profissionalId || b.profissionalId === p.id)).forEach((b) => rotulosFora.push([U.minutos(b.inicio), U.minutos(b.fim), `Bloqueio: ${b.motivo}`, b]));
        const eventos = doDia.filter((r) => r.profissionalId === p.id).sort(porDataHora);
        return el("div", { class: "pn-dia__coluna", role: "group", "aria-label": `Agenda de ${p.nome}` },
          el("div", { class: "pn-dia__cabeca" }, avatar(p), el("span", {}, el("b", { texto: p.nome }), el("small", { texto: janelas.length ? `${U.plural(eventos.filter(M.ocupa).length, "atendimento", "atendimentos")}` : motivo === "folga" ? `Folga${detalhe ? `: ${detalhe}` : ""}` : motivo === "folga_semanal" ? "Não trabalha neste dia" : motivo === "fechado" ? "Estúdio fechado" : "Indisponível" }))),
          el("div", { class: "pn-dia__trilho", style: { height: `${altura}px` },
            onclick: (e) => {
              if (e.target !== e.currentTarget) return;
              const m = Math.floor((e.offsetY / px + ini) / 15) * 15;
              if (data < U.hoje()) return;
              novaReserva({ data, profissionalId: p.id, inicio: U.hhmm(m), servicoId: d().servicos.find((s) => s.ativo && s.profissionais.includes(p.id))?.id });
            } },
          fora.map(([a, b]) => el("span", { class: "pn-dia__fora", style: { top: y(a), height: `${(b - a) * px}px` }, "aria-hidden": "true" })),
          rotulosFora.map(([a, b, texto, bloq]) => bloq
            ? el("button", { type: "button", class: "pn-dia__bloqueio", style: { top: y(a), height: `${Math.max(18, (b - a) * px)}px` }, "aria-label": `${texto}, das ${U.hhmm(a)} às ${U.hhmm(b)}. Abrir para remover.`, onclick: () => verBloqueio(bloq) }, el("span", { texto: texto }))
            : el("span", { class: "pn-dia__pausa", style: { top: y(a), height: `${(b - a) * px}px` } }, el("span", { texto: `${texto} ${U.hhmm(a)}–${U.hhmm(b)}` }))),
          eventos.map((r) => el("button", { type: "button", class: `pn-evento pn-evento--${r.status}${r.duracao * px < 64 ? " pn-evento--curto" : ""}`, style: { top: y(U.minutos(r.inicio)), height: `${Math.max(22, r.duracao * px - 2)}px` },
            "aria-label": `${r.inicio} às ${r.fim}: ${r.cliente.nome}, ${r.servicoNome}, ${M.STATUS[r.status].nome}. Abrir.`, onclick: () => abrirReserva(r.id) },
          el("span", { class: "pn-evento__hora", texto: `${r.inicio}–${r.fim}` }), el("b", { texto: r.cliente.nome }), el("span", { texto: r.servicoNome }), el("span", { class: "pn-evento__status", texto: M.STATUS[r.status].nome }))),
          agoraLinha ? agoraLinha.cloneNode() : null));
      });
      return el("div", { class: "pn-dia" },
        !negocio.length ? el("p", { class: "pn-nota", texto: "O estúdio não abre neste dia da semana." }) : null,
        el("p", { class: "pn-nota", texto: `Toque num espaço livre para marcar ali. ${canceladas ? `${U.plural(canceladas, "reserva cancelada não aparece", "reservas canceladas não aparecem")} na grade (veja na lista).` : ""}` }),
        el("div", { class: "pn-dia__rolagem" },
          el("div", { class: "pn-dia__grade", style: { "--colunas": String(Math.max(1, profs.length)) } },
            el("div", { class: "pn-dia__eixo" }, el("div", { class: "pn-dia__cabeca pn-dia__cabeca--vazia" }), el("div", { class: "pn-dia__eixo-trilho", style: { height: `${altura}px` } }, horas)),
            colunas)),
        legendaStatus());
    }
    const legendaStatus = () => el("ul", { class: "pn-legenda", "aria-label": "Legenda" }, ["pendente", "confirmado", "concluido", "nao_compareceu"].map((s) => el("li", {}, el("span", { class: `pn-legenda__cor pn-evento--${s}` }), M.STATUS[s].nome)),
      el("li", {}, el("span", { class: "pn-legenda__cor pn-dia__fora-amostra" }), "Fora da jornada"), el("li", {}, el("span", { class: "pn-legenda__cor pn-dia__bloqueio-amostra" }), "Bloqueio"));

    function verBloqueio(b) {
      const p = b.profissionalId ? M.profissional(d(), b.profissionalId) : null;
      abrirJanela("Bloqueio de agenda", el("div", { class: "pn-reserva" },
        el("dl", { class: "pn-dl" }, [["Para", p ? p.nome : "Todo o estúdio"], ["Data", U.dataLonga(b.data)], ["Horário", `${b.inicio} às ${b.fim}`], ["Motivo", b.motivo], ["Criado por", b.por || "—"]].map(([x, z]) => el("div", {}, el("dt", { texto: x }), el("dd", { texto: z })))),
        el("div", { class: "pn-reserva__acoes" }, botao("Remover bloqueio", async () => {
          const ok = await confirmar({ titulo: "Remover bloqueio", texto: `Liberar ${b.inicio} às ${b.fim} de ${U.dataLonga(b.data)} para reservas?`, botaoTexto: "Remover", perigo: true });
          if (!ok) { verBloqueio(b); return; }
          avisoResultado(await loja.removerBloqueio(b.id), "Bloqueio removido. O horário voltou para a agenda.");
        }, { classe: "btn--perigo-linha", ic: "trash" }))), { largura: "p" });
    }

    function agendaSemana() {
      const inicio = U.inicioDaSemana(est.agenda.data);
      const dias = Array.from({ length: 7 }, (_, i) => U.somarDias(inicio, i));
      return el("div", { class: "pn-semana" }, dias.map((data) => {
        const lista = d().reservas.filter((r) => r.data === data && r.status !== "cancelado" && (!est.agenda.prof || r.profissionalId === est.agenda.prof)).sort(porDataHora);
        const aberto = (d().horarios[U.diaDaSemana(data)] || []).length;
        return el("section", { class: `pn-semana__dia${data === U.hoje() ? " is-hoje" : ""}`, "aria-label": U.dataLonga(data) },
          el("button", { type: "button", class: "pn-semana__cabeca", onclick: () => { est.agenda.data = data; est.agenda.visao = "dia"; desenhar(true); }, "aria-label": `Abrir ${U.dataLonga(data)} na visão de dia` },
            el("span", { texto: U.DIAS_CURTOS[U.diaDaSemana(data)] }), el("b", { texto: U.dataCurta(data) }), el("small", { texto: aberto ? U.plural(lista.filter(M.ocupa).length, "reserva", "reservas") : "fechado" })),
          lista.length ? el("ul", {}, lista.map((r) => el("li", {}, el("button", { type: "button", class: `pn-cartao pn-evento--${r.status}`, onclick: () => abrirReserva(r.id), "aria-label": `${r.inicio}: ${r.cliente.nome}, ${r.servicoNome} com ${r.profissionalNome}, ${M.STATUS[r.status].nome}` },
            el("span", { class: "pn-cartao__hora", texto: r.inicio }), el("b", { texto: r.cliente.nome }), el("span", { texto: `${r.servicoNome} · ${r.profissionalNome.split(" ")[0]}` })))))
            : el("p", { class: "pn-semana__vazio", texto: aberto ? "Sem reservas" : "—" }));
      }));
    }

    function agendaMes() {
      const mes = U.inicioDoMes(est.agenda.data);
      const total = U.diasNoMes(mes);
      const cel = [];
      for (let i = 0; i < U.diaDaSemana(mes); i += 1) cel.push(el("span", { class: "pn-mes__vazio", "aria-hidden": "true" }));
      for (let n = 1; n <= total; n += 1) {
        const data = `${mes.slice(0, 8)}${U.dd(n)}`;
        const lista = d().reservas.filter((r) => r.data === data && (!est.agenda.prof || r.profissionalId === est.agenda.prof));
        const ativas = lista.filter(M.ocupa).length;
        const pend = lista.filter((r) => r.status === "pendente").length;
        const fechado = !(d().horarios[U.diaDaSemana(data)] || []).length;
        cel.push(el("button", { type: "button", class: `pn-mes__dia${data === U.hoje() ? " is-hoje" : ""}${fechado ? " is-fechado" : ""}`, onclick: () => { est.agenda.data = data; est.agenda.visao = "dia"; desenhar(true); },
          "aria-label": `${U.dataLonga(data)}: ${fechado ? "fechado" : U.plural(ativas, "reserva", "reservas")}${pend ? `, ${pend} pendente${pend > 1 ? "s" : ""}` : ""}. Abrir o dia.` },
        el("span", { class: "pn-mes__num", texto: String(n) }),
        ativas ? el("span", { class: "pn-mes__qtd", "data-curto": String(ativas), texto: U.plural(ativas, "reserva", "reservas") }) : null,
        pend ? el("span", { class: "pn-mes__pend", texto: `${pend} pend.` }) : null));
      }
      return el("div", { class: "pn-mes" }, el("div", { class: "pn-mes__semana", "aria-hidden": "true" }, U.DIAS_CURTOS.map((x) => el("span", { texto: x }))), el("div", { class: "pn-mes__grade" }, cel));
    }

    function agendaLista() {
      const a = est.agenda;
      const termo = U.semAcento(a.busca);
      const lista = d().reservas.filter((r) => r.data >= a.de && r.data <= a.ate
        && (!a.prof || r.profissionalId === a.prof)
        && (a.status === "todas" || (a.status === "ativas" ? r.status !== "cancelado" : r.status === a.status))
        && (!termo || U.semAcento(`${r.codigo} ${r.cliente.nome} ${r.cliente.telefone} ${r.servicoNome}`).includes(termo))).sort(porDataHora);
      const porPagina = 25;
      const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
      a.pagina = Math.min(a.pagina, paginas);
      const pagina = lista.slice((a.pagina - 1) * porPagina, a.pagina * porPagina);
      const filtro = (id, rotulo, entrada) => el("div", { class: "pn-campo pn-campo--filtro" }, el("label", { for: id, class: "pn-campo__rotulo", texto: rotulo }), entrada);
      const opcoes = [["ativas", "Todas menos canceladas"], ["todas", "Todas"], ...Object.entries(M.STATUS).map(([k, v]) => [k, v.nome])];
      return el("div", {},
        el("div", { class: "pn-filtros" },
          filtro("pn-l-de", "De", el("input", { type: "date", id: "pn-l-de", class: "pn-entrada", value: a.de, onchange: (e) => { if (U.dataValida(e.target.value)) { a.de = e.target.value; a.pagina = 1; desenhar(false, "#pn-l-de"); } } })),
          filtro("pn-l-ate", "Até", el("input", { type: "date", id: "pn-l-ate", class: "pn-entrada", value: a.ate, onchange: (e) => { if (U.dataValida(e.target.value)) { a.ate = e.target.value; a.pagina = 1; desenhar(false, "#pn-l-ate"); } } })),
          filtro("pn-l-status", "Situação", el("select", { id: "pn-l-status", class: "pn-entrada", onchange: (e) => { a.status = e.target.value; a.pagina = 1; desenhar(false, "#pn-l-status"); } }, opcoes.map(([v, t]) => { const o = el("option", { value: v, texto: t }); if (a.status === v) o.selected = true; return o; }))),
          filtro("pn-l-busca", "Buscar", el("input", { type: "search", id: "pn-l-busca", class: "pn-entrada", placeholder: "Nome, telefone ou código", value: a.busca, oninput: (e) => { a.busca = e.target.value; a.pagina = 1; atrasar(() => desenhar(false, "#pn-l-busca")); } }))),
        el("p", { class: "pn-nota", "aria-live": "polite", texto: `${U.plural(lista.length, "reserva encontrada", "reservas encontradas")} entre ${U.dataBR(a.de)} e ${U.dataBR(a.ate)}.` }),
        pagina.length ? el("div", { class: "pn-tabela-rolagem" }, el("table", { class: "pn-tabela" },
          el("caption", { class: "pn-oculto", texto: "Reservas" }),
          el("thead", {}, el("tr", {}, ["Data", "Horário", "Cliente", "Serviço", "Profissional", "Valor", "Situação", ""].map((t) => el("th", { scope: "col", texto: t })))),
          el("tbody", {}, pagina.map((r) => el("tr", {},
            el("td", { "data-rotulo": "Data", texto: `${U.DIAS_CURTOS[U.diaDaSemana(r.data)]}, ${U.dataBR(r.data)}` }),
            el("td", { "data-rotulo": "Horário", texto: `${r.inicio}–${r.fim}` }),
            el("td", { "data-rotulo": "Cliente" }, el("span", {}, r.cliente.nome, r.ficticia ? " " : null, r.ficticia ? exemplo() : null)),
            el("td", { "data-rotulo": "Serviço", texto: r.servicoNome }),
            el("td", { "data-rotulo": "Profissional", texto: r.profissionalNome }),
            el("td", { "data-rotulo": "Valor", texto: U.moeda(r.preco) }),
            el("td", { "data-rotulo": "Situação" }, status(r.status)),
            el("td", {}, botao("Abrir", () => abrirReserva(r.id), { rotulo: `Abrir reserva ${r.codigo} de ${r.cliente.nome}` }))))))) : vazio("Nenhuma reserva com esses filtros."),
        paginacao(a.pagina, paginas, (n) => { a.pagina = n; desenhar(false, ".pn-paginas [aria-current='page']"); }));
    }
    let temporizador;
    const atrasar = (fn) => { clearTimeout(temporizador); temporizador = setTimeout(fn, 250); };
    function paginacao(atual, total, ir) {
      if (total <= 1) return null;
      return el("nav", { class: "pn-paginas", "aria-label": "Páginas" },
        el("button", { type: "button", class: "btn btn--linha btn--pequeno", disabled: atual === 1 || null, onclick: () => ir(atual - 1) }, "Anterior"),
        el("span", { "aria-current": "page", tabindex: "-1", texto: `Página ${atual} de ${total}` }),
        el("button", { type: "button", class: "btn btn--linha btn--pequeno", disabled: atual === total || null, onclick: () => ir(atual + 1) }, "Próxima"));
    }

    /* ======================================================================
       SERVIÇOS
       ====================================================================== */
    function formServico(id) {
      const s = id ? M.servico(d(), id) : null;
      const { form } = formulario({
        valores: s ? { ...s } : { categoria: d().categorias[0], duracao: 30, ativo: true, profissionais: [], preco: "", arte: (marca.artesServico || [])[0]?.valor },
        campos: [
          { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, max: 60 },
          { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: d().categorias.map((c) => ({ valor: c, rotulo: c })) },
          { nome: "descricao", rotulo: "Descrição", tipo: "area", obrigatorio: true, max: 280, ajuda: "Aparece no catálogo e na reserva. Até 280 caracteres." },
          { nome: "preco", rotulo: "Preço (R$)", tipo: "dinheiro", obrigatorio: true, largura: "meia", ajuda: "Novas reservas usam este valor; as já feitas guardam o preço da época." },
          { nome: "duracao", rotulo: "Duração (minutos)", tipo: "numero", obrigatorio: true, min: 10, maximo: 480, passo: 5, largura: "meia", ajuda: "Define quanto tempo o horário ocupa na agenda." },
          { nome: "profissionais", rotulo: "Quem faz este serviço", tipo: "caixas", largura: "inteira", opcoes: d().profissionais.map((p) => ({ valor: p.id, rotulo: p.nome, nota: p.ativo ? "" : AE.t("(inativ{s})") })) },
          { nome: "regras", rotulo: "Regra ou observação", tipo: "area", max: 200, ajuda: "Opcional. Ex.: “Para gel aplicado há até 21 dias.”" },
          marca.artesServico ? { nome: "arte", rotulo: "Ilustração", tipo: "select", opcoes: marca.artesServico } : null,
          { nome: "ativo", rotulo: "Disponível para novas reservas", tipo: "checkbox", ajuda: "Desativado, o serviço some do site e não aceita novas reservas. As reservas já feitas continuam valendo." },
        ],
        enviar: (v) => loja.salvarServico(v, id, { por: POR }),
        aoConcluir: () => { U.aviso(id ? "Serviço salvo. O site já mostra a mudança." : "Serviço criado."); fecharJanela(); },
      });
      abrirJanela(id ? `Editar: ${s.nome}` : "Novo serviço", form, { largura: "g" });
    }
    function verServicos() {
      const f = est.servicos;
      const lista = d().servicos.filter((s) => (!f.categoria || s.categoria === f.categoria) && (!f.status || (f.status === "ativo" ? s.ativo : !s.ativo)));
      return el("div", {},
        cabeca("Serviços", "Preços, durações e quem faz cada serviço. O site e a agenda leem daqui.", botao("Novo serviço", () => formServico(null), { classe: "btn--principal", ic: "plus" })),
        el("div", { class: "pn-filtros" },
          el("div", { class: "pn-campo pn-campo--filtro" }, el("label", { for: "pn-s-cat", class: "pn-campo__rotulo", texto: "Categoria" }),
            el("select", { id: "pn-s-cat", class: "pn-entrada", onchange: (e) => { f.categoria = e.target.value; desenhar(false, "#pn-s-cat"); } }, [["", "Todas"], ...d().categorias.map((c) => [c, c])].map(([v, t]) => { const o = el("option", { value: v, texto: t }); if (f.categoria === v) o.selected = true; return o; }))),
          el("div", { class: "pn-campo pn-campo--filtro" }, el("label", { for: "pn-s-st", class: "pn-campo__rotulo", texto: "Situação" }),
            el("select", { id: "pn-s-st", class: "pn-entrada", onchange: (e) => { f.status = e.target.value; desenhar(false, "#pn-s-st"); } }, [["", "Todos"], ["ativo", "Ativos"], ["inativo", "Desativados"]].map(([v, t]) => { const o = el("option", { value: v, texto: t }); if (f.status === v) o.selected = true; return o; })))),
        lista.length ? el("ul", { class: "pn-itens" }, lista.map((s) => el("li", { class: `pn-item${s.ativo ? "" : " is-inativo"}` },
          el("div", { class: "pn-item__corpo" },
            el("h2", { class: "pn-item__titulo" }, s.nome, s.ativo ? null : el("span", { class: "pn-etiqueta", texto: "Desativado" })),
            el("p", { class: "pn-item__meta", texto: `${s.categoria} · ${U.duracao(s.duracao)} · ${U.moeda(s.preco)}` }),
            el("p", { class: "pn-item__texto", texto: `Quem faz: ${s.profissionais.map((pid) => (M.profissional(d(), pid) || {}).nome).filter(Boolean).join(", ") || "ninguém habilitado"}` })),
          el("div", { class: "pn-item__acoes" },
            botao("Editar", () => formServico(s.id), { ic: "pencil", rotulo: `Editar ${s.nome}` }),
            botao(s.ativo ? "Desativar" : "Ativar", async () => avisoResultado(await loja.alternarServico(s.id), s.ativo ? `${s.nome} desativado: saiu do site e da agenda.` : `${s.nome} ativado.`), { rotulo: `${s.ativo ? "Desativar" : "Ativar"} ${s.nome}` }))))) : vazio("Nenhum serviço com esses filtros."));
    }

    /* ======================================================================
       EQUIPE
       ====================================================================== */
    function editorJornada(valor) {
      const linhas = [1, 2, 3, 4, 5, 6, 0].map((dia) => {
        const atual = (valor || {})[dia] || [];
        const [a, b] = atual[0] || ["09:00", "18:00"];
        const trabalha = el("input", { type: "checkbox", id: `pn-j-${dia}`, class: "pn-caixa" });
        trabalha.checked = atual.length > 0;
        const ini = el("input", { type: "time", class: "pn-entrada pn-entrada--hora", value: a, "aria-label": `Início em ${U.DIAS[dia]}` });
        const fim = el("input", { type: "time", class: "pn-entrada pn-entrada--hora", value: b, "aria-label": `Fim em ${U.DIAS[dia]}` });
        const sinc = () => { ini.disabled = !trabalha.checked; fim.disabled = !trabalha.checked; };
        trabalha.addEventListener("change", sinc);
        sinc();
        const fechado = !(d().horarios[dia] || []).length;
        return { dia, no: el("div", { class: "pn-jornada__linha" }, el("div", { class: "pn-check" }, trabalha, el("label", { for: `pn-j-${dia}`, texto: U.DIAS[dia] })), ini, el("span", { "aria-hidden": "true", texto: "às" }), fim, fechado ? el("small", { class: "pn-nota-inline", texto: "estúdio fechado" }) : null), ler: () => (trabalha.checked ? [[ini.value, fim.value]] : []) };
      });
      return { no: el("div", { class: "pn-jornada" }, linhas.map((l) => l.no)), ler: () => Object.fromEntries(linhas.map((l) => [l.dia, l.ler()])) };
    }
    function editorPausas(valor) {
      const caixa = el("div", { class: "pn-pausas" });
      const linhas = [];
      const adicionar = (p = { dias: [1, 2, 3, 4, 5], inicio: "12:00", fim: "13:00" }) => {
        const n = (seqCampo += 1);
        const dias = [1, 2, 3, 4, 5, 6, 0].map((dia) => { const cx = el("input", { type: "checkbox", id: `pn-p${n}-${dia}`, value: dia, class: "pn-caixa" }); cx.checked = p.dias.includes(dia); return el("span", { class: "pn-dia-caixa" }, cx, el("label", { for: `pn-p${n}-${dia}`, texto: U.DIAS_CURTOS[dia] })); });
        const ini = el("input", { type: "time", class: "pn-entrada pn-entrada--hora", value: p.inicio, "aria-label": "Início da pausa" });
        const fim = el("input", { type: "time", class: "pn-entrada pn-entrada--hora", value: p.fim, "aria-label": "Fim da pausa" });
        const linha = { no: null, ler: () => ({ dias: [...linha.no.querySelectorAll("input[type=checkbox]:checked")].map((x) => Number(x.value)), inicio: ini.value, fim: fim.value }) };
        linha.no = el("fieldset", { class: "pn-pausa" }, el("legend", { class: "pn-oculto", texto: "Pausa" }), el("div", { class: "pn-pausa__dias" }, dias), el("div", { class: "pn-pausa__horas" }, ini, el("span", { texto: "às" }), fim,
          el("button", { type: "button", class: "icone-btn", "aria-label": "Remover esta pausa", onclick: () => { linhas.splice(linhas.indexOf(linha), 1); linha.no.remove(); } }, icone("trash", 16))));
        linhas.push(linha);
        caixa.append(linha.no);
      };
      (valor || []).forEach((p) => adicionar(p));
      return { no: el("div", {}, caixa, el("button", { type: "button", class: "btn btn--linha btn--pequeno", onclick: () => adicionar() }, icone("plus", 16), "Adicionar pausa")), ler: () => linhas.map((l) => l.ler()) };
    }
    function formProfissional(id) {
      const p = id ? M.profissional(d(), id) : null;
      const servicosDela = p ? d().servicos.filter((s) => s.profissionais.includes(p.id)).map((s) => s.id) : [];
      const { form } = formulario({
        valores: p ? { ...p, servicos: servicosDela } : { ativo: true, jornada: { 2: [["09:00", "18:00"]], 3: [["09:00", "18:00"]], 4: [["09:00", "18:00"]], 5: [["09:00", "18:00"]], 6: [["09:00", "16:00"]] }, pausas: [], servicos: [], arte: (marca.artesProfissional || [])[0]?.valor },
        campos: [
          { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, max: 60 },
          { nome: "especialidades", rotulo: "Especialidades", tipo: "texto", obrigatorio: true, max: 120 },
          { nome: "descricao", rotulo: "Apresentação curta", tipo: "area", max: 280, ajuda: "Sem inventar certificados ou anos de experiência: só o que for verdade." },
          marca.artesProfissional ? { nome: "arte", rotulo: "Cor do avatar", tipo: "select", opcoes: marca.artesProfissional } : null,
          { nome: "servicos", rotulo: "Serviços que faz", tipo: "caixas", largura: "inteira", opcoes: d().servicos.map((s) => ({ valor: s.id, rotulo: s.nome, nota: s.ativo ? "" : "(desativado)" })) },
          { nome: "jornada", rotulo: "Jornada (por dia da semana)", tipo: "custom", largura: "inteira", render: (v) => editorJornada(v), ajuda: AE.t("A agenda usa o trecho em que o estúdio está aberto E {a} profissional trabalha.") },
          { nome: "pausas", rotulo: "Pausas", tipo: "custom", largura: "inteira", render: (v) => editorPausas(v), ajuda: "Ex.: almoço. Nenhum horário que encoste na pausa é oferecido." },
          { nome: "ativo", rotulo: "Atendendo (aparece no site e na agenda)", tipo: "checkbox" },
        ],
        enviar: (v) => loja.salvarProfissional(v, id, { por: POR }),
        aoConcluir: () => { U.aviso(id ? "Cadastro salvo. Os horários livres já foram recalculados." : AE.t("Profissional cadastrad{s}.")); fecharJanela(); },
      });
      abrirJanela(id ? `Editar: ${p.nome}` : AE.t("{Nova} profissional"), el("div", {}, el("p", { class: "pn-nota", texto: "Se a mudança deixar alguma reserva futura fora da agenda, o painel não salva e mostra quais reservas reagendar antes." }), form), { largura: "g" });
    }
    function verFolgas(id) {
      const p = M.profissional(d(), id);
      const futuras = (p.folgas || []).filter((f) => f.data >= U.hoje());
      const { form } = formulario({
        valores: { data: U.somarDias(U.hoje(), 1) },
        campos: [{ nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true, min: U.hoje(), largura: "meia" }, { nome: "motivo", rotulo: "Motivo (opcional)", tipo: "texto", max: 60, largura: "meia" }],
        rotuloEnviar: "Adicionar folga",
        cancelar: false,
        enviar: (v) => loja.adicionarFolga(id, v),
        aoConcluir: () => { U.aviso(AE.t("Folga cadastrada: esse dia saiu da agenda {dela}.")); verFolgas(id); },
      });
      abrirJanela(`Folgas de ${p.nome}`, el("div", { class: "pn-folgas" },
        futuras.length ? el("ul", { class: "pn-lista" }, futuras.map((f) => el("li", { class: "pn-linha" },
          el("span", { class: "pn-linha__corpo" }, el("b", { texto: U.dataLonga(f.data) }), el("span", { texto: f.motivo })),
          el("span", { class: "pn-linha__acoes" }, botao("Remover", async () => { avisoResultado(await loja.removerFolga(id, f.id), "Folga removida."); verFolgas(id); }, { rotulo: `Remover folga de ${U.dataLonga(f.data)}` })))))
          : el("p", { class: "pn-nota", texto: "Nenhuma folga cadastrada daqui para a frente." }),
        el("h3", { texto: "Nova folga" }), form));
    }
    function verEquipe() {
      const bloqueios = d().bloqueios.filter((b) => b.data >= U.hoje()).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
      return el("div", {},
        cabeca("Equipe", "Jornadas, pausas, folgas e serviços de cada profissional.", botao(AE.t("{Nova} profissional"), () => formProfissional(null), { classe: "btn--principal", ic: "plus" })),
        el("ul", { class: "pn-equipe" }, d().profissionais.map((p) => {
          const servs = d().servicos.filter((s) => s.profissionais.includes(p.id));
          const jornada = U.resumoHorarios(p.jornada).filter((g) => !g.fechado).map((g) => `${g.dias}: ${g.horas}`).join(" · ") || "Sem jornada";
          const folgas = (p.folgas || []).filter((f) => f.data >= U.hoje());
          return el("li", { class: `pn-pessoa${p.ativo ? "" : " is-inativo"}` },
            el("div", { class: "pn-pessoa__topo" }, avatar(p), el("div", {}, el("h2", { texto: p.nome }), el("p", { class: "pn-item__meta", texto: p.especialidades })), p.ativo ? null : el("span", { class: "pn-etiqueta", texto: AE.t("Inativ{s}") })),
            el("dl", { class: "pn-dl pn-dl--compacta" },
              el("div", {}, el("dt", { texto: "Jornada" }), el("dd", { texto: jornada })),
              el("div", {}, el("dt", { texto: "Pausas" }), el("dd", { texto: (p.pausas || []).map((x) => `${x.inicio}–${x.fim} (${x.dias.map((n) => U.DIAS_CURTOS[n]).join(", ")})`).join(" · ") || "Nenhuma" })),
              el("div", {}, el("dt", { texto: "Próximas folgas" }), el("dd", { texto: folgas.slice(0, 3).map((f) => U.dataBR(f.data)).join(", ") || "Nenhuma" })),
              el("div", {}, el("dt", { texto: "Serviços" }), el("dd", { texto: servs.map((s) => s.nome).join(", ") || "Nenhum" }))),
            el("div", { class: "pn-item__acoes" },
              botao("Editar", () => formProfissional(p.id), { ic: "pencil", rotulo: `Editar ${p.nome}` }),
              botao("Folgas", () => verFolgas(p.id), { ic: "calendar-off", rotulo: `Folgas de ${p.nome}` }),
              botao(p.ativo ? "Desativar" : "Ativar", async () => avisoResultado(await loja.alternarProfissional(p.id), p.ativo ? AE.t(`${p.nome} desativad{s}.`) : AE.t(`${p.nome} ativad{s}.`)), { rotulo: `${p.ativo ? "Desativar" : "Ativar"} ${p.nome}` })));
        })),
        bloco("Bloqueios de agenda", bloqueios.length ? el("ul", { class: "pn-lista" }, bloqueios.map((b) => el("li", { class: "pn-linha" },
          el("span", { class: "pn-linha__hora" }, el("span", { class: "pn-linha__data", texto: U.dataCurta(b.data) }), b.inicio),
          el("span", { class: "pn-linha__corpo" }, el("b", { texto: b.motivo }), el("span", { texto: `${b.inicio}–${b.fim} · ${b.profissionalId ? (M.profissional(d(), b.profissionalId) || {}).nome : "Todo o estúdio"}` })),
          el("span", { class: "pn-linha__acoes" }, botao("Abrir", () => verBloqueio(b), { rotulo: `Abrir bloqueio ${b.motivo}` }))))) : vazio("Nenhum bloqueio daqui para a frente."),
        botao("Bloquear horário", () => novoBloqueio(), { ic: "ban" })));
    }

    /* ======================================================================
       CLIENTES
       ====================================================================== */
    function abrirCliente(id) {
      const c = cliente(id);
      if (!c) return;
      const hist = d().reservas.filter((r) => r.clienteId === id).sort(porDataHora).reverse();
      const { form } = formulario({
        valores: c,
        campos: [
          { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, max: 80 },
          { nome: "telefone", rotulo: "Telefone", tipo: "tel", obrigatorio: true, max: 16 },
          { nome: "email", rotulo: "E-mail", tipo: "email", max: 120 },
          { nome: "observacoes", rotulo: "Observações internas", tipo: "area", max: 300, ajuda: "Visível só no painel. Evite dados de saúde que não sejam necessários para o atendimento." },
        ],
        rotuloEnviar: "Salvar correção",
        enviar: (v) => loja.salvarCliente(v, id),
        aoConcluir: () => { U.aviso(AE.t("Cadastro corrigido. As próximas reservas {cdela} também foram atualizadas.")); abrirCliente(id); },
      });
      abrirJanela(c.nome, el("div", { class: "pn-cliente" },
        c.ficticio ? el("p", { class: "pn-nota" }, exemplo("Cliente de exemplo"), " Nome e telefone inventados.") : null,
        el("section", {}, el("h3", { texto: `Histórico (${hist.length})` }),
          hist.length ? el("ul", { class: "pn-lista" }, hist.slice(0, 30).map((r) => linhaReserva(r, { mostrarData: true, acoes: false }))) : el("p", { class: "pn-nota", texto: "Sem reservas." })),
        el("section", {}, el("h3", { texto: "Corrigir dados" }), form)), { largura: "g" });
    }
    function verClientes() {
      const f = est.clientes;
      const termo = U.semAcento(f.busca);
      const hj = U.hoje();
      const linhas = d().clientes.map((c) => {
        const rs = d().reservas.filter((r) => r.clienteId === c.id);
        const passadas = rs.filter((r) => r.status === "concluido").sort(porDataHora);
        const prox = rs.filter((r) => ["pendente", "confirmado"].includes(r.status) && M.futura(r)).sort(porDataHora)[0];
        return { c, total: rs.length, ultima: passadas.length ? passadas[passadas.length - 1].data : null, prox };
      }).filter((x) => !termo || U.semAcento(`${x.c.nome} ${x.c.telefone} ${x.c.email}`).includes(termo))
        .sort((a, b) => a.c.nome.localeCompare(b.c.nome, "pt-BR"));
      const porPagina = 20;
      const paginas = Math.max(1, Math.ceil(linhas.length / porPagina));
      f.pagina = Math.min(f.pagina, paginas);
      const pagina = linhas.slice((f.pagina - 1) * porPagina, f.pagina * porPagina);
      return el("div", {},
        cabeca("Clientes", AE.t("Quem já reservou, com o histórico de {ccada}. Os cadastros nascem das reservas.")),
        el("div", { class: "pn-filtros" }, el("div", { class: "pn-campo pn-campo--filtro pn-campo--largo" }, el("label", { for: "pn-c-busca", class: "pn-campo__rotulo", texto: "Buscar" }),
          el("input", { type: "search", id: "pn-c-busca", class: "pn-entrada", placeholder: "Nome, telefone ou e-mail", value: f.busca, oninput: (e) => { f.busca = e.target.value; f.pagina = 1; atrasar(() => desenhar(false, "#pn-c-busca")); } }))),
        el("p", { class: "pn-nota", "aria-live": "polite", texto: U.plural(linhas.length, "cadastro", "cadastros") }),
        pagina.length ? el("div", { class: "pn-tabela-rolagem" }, el("table", { class: "pn-tabela" },
          el("caption", { class: "pn-oculto", texto: "Clientes" }),
          el("thead", {}, el("tr", {}, ["Nome", "Telefone", "Reservas", "Última visita", "Próxima", ""].map((t) => el("th", { scope: "col", texto: t })))),
          el("tbody", {}, pagina.map((x) => el("tr", {},
            el("td", { "data-rotulo": "Nome" }, el("span", {}, x.c.nome, x.c.ficticio ? " " : null, x.c.ficticio ? exemplo() : null)),
            el("td", { "data-rotulo": "Telefone", texto: U.formatarTelefone(x.c.telefone) }),
            el("td", { "data-rotulo": "Reservas", texto: String(x.total) }),
            el("td", { "data-rotulo": "Última visita", texto: x.ultima ? U.dataBR(x.ultima) : "—" }),
            el("td", { "data-rotulo": "Próxima", texto: x.prox ? `${U.dataBR(x.prox.data)} ${x.prox.inicio}` : "—" }),
            el("td", {}, botao("Abrir", () => abrirCliente(x.c.id), { rotulo: `Abrir cadastro de ${x.c.nome}` }))))))) : vazio(termo ? "Ninguém encontrado com essa busca." : "Ainda não há clientes. Eles aparecem aqui a partir da primeira reserva."),
        paginacao(f.pagina, paginas, (n) => { f.pagina = n; desenhar(false, ".pn-paginas [aria-current='page']"); }),
        el("p", { class: "pn-nota", texto: `Num sistema real, esta lista ficaria protegida por login e só a equipe autorizada veria os contatos. Hoje é ${U.dataBR(hj)}.` }));
    }

    /* ======================================================================
       DEPOIMENTOS
       ====================================================================== */
    function formDepoimento(id) {
      const x = id ? d().depoimentos.find((y) => y.id === id) : null;
      const { form } = formulario({
        valores: x || { ativo: true, ficticio: false, autorizado: false },
        campos: [
          { nome: "texto", rotulo: "Depoimento", tipo: "area", obrigatorio: true, max: 400, linhas: 4 },
          { nome: "autor", rotulo: "Como identificar quem escreveu", tipo: "texto", obrigatorio: true, max: 60, largura: "meia", ajuda: "Ex.: “Ana P.”, com a forma que a pessoa autorizou." },
          { nome: "contexto", rotulo: "Serviço ou contexto", tipo: "texto", max: 60, largura: "meia" },
          { nome: "autorizado", rotulo: "Tenho autorização de quem escreveu para publicar", tipo: "checkbox" },
          { nome: "ficticio", rotulo: "É um texto fictício de demonstração", tipo: "checkbox", ajuda: "Fictícios aparecem no site com a etiqueta “Fictício” e o aviso de conteúdo ilustrativo." },
          { nome: "ativo", rotulo: "Mostrar no site", tipo: "checkbox" },
        ],
        enviar: (v) => loja.salvarDepoimento(v, id),
        aoConcluir: () => { U.aviso("Depoimento salvo."); fecharJanela(); },
      });
      abrirJanela(id ? "Editar depoimento" : "Novo depoimento", form, { largura: "g" });
    }
    function verDepoimentos() {
      return el("div", {},
        cabeca("Depoimentos", "Só publique depoimentos reais com autorização. Os fictícios ficam identificados no site.", botao("Novo depoimento", () => formDepoimento(null), { classe: "btn--principal", ic: "plus" })),
        d().depoimentos.length ? el("ul", { class: "pn-itens" }, d().depoimentos.map((x) => el("li", { class: `pn-item${x.ativo ? "" : " is-inativo"}` },
          el("div", { class: "pn-item__corpo" },
            el("blockquote", { class: "pn-citacao", texto: x.texto }),
            el("p", { class: "pn-item__meta" }, `${x.autor}${x.contexto ? ` · ${x.contexto}` : ""} `, el("span", { class: "pn-etiqueta", texto: x.ficticio ? "Fictício" : "Real, com autorização" }), " ", el("span", { class: "pn-etiqueta", texto: x.ativo ? "No site" : "Oculto" }))),
          el("div", { class: "pn-item__acoes" },
            botao("Editar", () => formDepoimento(x.id), { ic: "pencil", rotulo: `Editar depoimento de ${x.autor}` }),
            botao(x.ativo ? "Ocultar" : "Mostrar", async () => avisoResultado(await loja.alternarDepoimento(x.id), x.ativo ? "Depoimento oculto do site." : "Depoimento visível no site."), { rotulo: `${x.ativo ? "Ocultar" : "Mostrar"} depoimento de ${x.autor}` }),
            botao("Excluir", async () => {
              const ok = await confirmar({ titulo: "Excluir depoimento", texto: `Excluir o depoimento de ${x.autor}? Não dá para desfazer.`, botaoTexto: "Excluir", perigo: true });
              if (ok) avisoResultado(await loja.removerDepoimento(x.id), "Depoimento excluído.");
            }, { classe: "btn--perigo-linha", rotulo: `Excluir depoimento de ${x.autor}` }))))) : vazio("Nenhum depoimento cadastrado. Sem depoimentos, a seção some do site.", botao("Novo depoimento", () => formDepoimento(null), { ic: "plus" })));
    }

    /* ======================================================================
       CONFIGURAÇÕES
       ====================================================================== */
    function verConfiguracoes() {
      const n = d().negocio;
      const e = n.endereco || {};
      const estudio = formulario({
        cancelar: false,
        valores: { ...n, rua: e.rua, numero: e.numero, complemento_end: e.complemento, bairro: e.bairro, cidade: e.cidade, uf: e.uf, cep: e.cep, whatsapp: n.whatsapp ? n.whatsapp.slice(2) : "" },
        campos: [
          { nome: "nome", rotulo: "Nome do estúdio", tipo: "texto", obrigatorio: true, max: 60, ajuda: "Aparece no site, no rodapé e nas mensagens." },
          { nome: "nomeCurto", rotulo: "Nome curto (logotipo em texto)", tipo: "texto", max: 30, largura: "meia" },
          { nome: "complemento", rotulo: "Complemento do logotipo", tipo: "texto", max: 40, largura: "meia" },
          { nome: "logo", rotulo: "Logotipo em imagem (opcional)", tipo: "imagem", ajuda: "PNG, JPG, SVG ou WebP de até 200 KB. Sem imagem, o site mostra o nome em texto." },
          { nome: "whatsapp", rotulo: "WhatsApp comercial", tipo: "tel", max: 16, largura: "meia", ajuda: "Com DDD. Vazio: o site mostra que ainda não foi configurado." },
          { nome: "telefone", rotulo: "Telefone", tipo: "tel", max: 16, largura: "meia" },
          { nome: "email", rotulo: "E-mail", tipo: "email", max: 120, largura: "meia" },
          { nome: "instagram", rotulo: "Instagram (endereço completo)", tipo: "texto", max: 120, largura: "meia" },
          { nome: "rua", rotulo: "Rua", tipo: "texto", max: 80, largura: "meia" },
          { nome: "numero", rotulo: "Número", tipo: "texto", max: 10, largura: "meia" },
          { nome: "complemento_end", rotulo: "Complemento", tipo: "texto", max: 40, largura: "meia" },
          { nome: "bairro", rotulo: "Bairro", tipo: "texto", max: 50, largura: "meia" },
          { nome: "cidade", rotulo: "Cidade", tipo: "texto", max: 50, largura: "meia" },
          { nome: "uf", rotulo: "UF", tipo: "texto", max: 2, largura: "meia" },
          { nome: "cep", rotulo: "CEP", tipo: "texto", max: 9, largura: "meia" },
          { nome: "enderecoConfirmado", rotulo: "Endereço confirmado: mostrar mapa no site", tipo: "checkbox", ajuda: "Marque só com o endereço real conferido. Sem isso, o site mostra o endereço e o botão de rota, mas não o mapa." },
          { nome: "razaoSocial", rotulo: "Razão social", tipo: "texto", max: 100, largura: "meia" },
          { nome: "cnpj", rotulo: "CNPJ", tipo: "texto", max: 18, largura: "meia" },
          { nome: "fuso", rotulo: "Fuso horário", tipo: "select", opcoes: loja.FUSOS.map((f) => ({ valor: f, rotulo: f.replace("America/", "").replace("_", " ") })), largura: "meia", ajuda: "“Hoje” e “agora” da agenda seguem este fuso." },
          { nome: "temaPadrao", rotulo: "Tema do site para quem não escolheu", tipo: "select", opcoes: [{ valor: "sistema", rotulo: "Seguir o aparelho" }, { valor: "claro", rotulo: "Claro" }, { valor: "escuro", rotulo: "Escuro" }], largura: "meia" },
        ],
        enviar: (v) => loja.salvarNegocio({ ...v, complementoEndereco: v.complemento_end }),
        aoConcluir: () => U.aviso("Dados do estúdio salvos. O site já mostra as mudanças."),
      });
      const horas = formulario({
        cancelar: false,
        valores: { horarios: d().horarios },
        campos: [{ nome: "horarios", rotulo: "", tipo: "custom", largura: "inteira", render: (v) => editorJornada(v) }],
        enviar: (v) => loja.salvarHorarios(v.horarios),
        aoConcluir: () => U.aviso("Horário de funcionamento salvo."),
      });
      const r = d().regras;
      const regras = formulario({
        cancelar: false,
        valores: r,
        campos: [
          { nome: "aprovacao", rotulo: "Reservas feitas pelo site", tipo: "select", opcoes: [{ valor: "manual", rotulo: "Ficam pendentes até o estúdio confirmar" }, { valor: "automatica", rotulo: "São confirmadas automaticamente" }], largura: "inteira" },
          { nome: "antecedenciaMin", rotulo: "Antecedência mínima", tipo: "select", largura: "meia", opcoes: [0, 30, 60, 120, 180, 240, 720, 1440, 2880].map((m) => ({ valor: m, rotulo: m ? U.duracao(m).replace("1440 min", "24 h") : "Sem antecedência" })) },
          { nome: "diasFuturos", rotulo: "Agenda aberta até (dias à frente)", tipo: "numero", min: 1, maximo: 180, largura: "meia" },
          { nome: "intervaloEntre", rotulo: "Intervalo entre atendimentos (min)", tipo: "numero", min: 0, maximo: 60, passo: 5, largura: "meia", ajuda: AE.t("Tempo livre obrigatório entre um atendimento e o próximo d{a} mesm{s} profissional.") },
          { nome: "passo", rotulo: "Horários oferecidos a cada", tipo: "select", largura: "meia", opcoes: [5, 10, 15, 20, 30, 60].map((m) => ({ valor: m, rotulo: `${m} min` })) },
          { nome: "cancelamentoHoras", rotulo: "Cancelamento pelo site até (horas antes)", tipo: "numero", min: 0, maximo: 72, largura: "meia" },
          { nome: "politicaCancelamento", rotulo: AE.t("Política de cancelamento (texto para {ca} cliente)"), tipo: "area", max: 400 },
        ],
        enviar: (v) => loja.salvarRegras({ ...v, antecedenciaMin: Number(v.antecedenciaMin), passo: Number(v.passo) }),
        aoConcluir: () => U.aviso("Regras de reserva salvas. Os horários do site já seguem as novas regras."),
      });
      const resultadoConferencia = el("div", { "aria-live": "polite" });
      const kb = (() => { try { return Math.max(1, Math.round((localStorage.getItem(loja.chave) || "").length / 1024)); } catch (erro) { return 0; } })();
      return el("div", {},
        cabeca("Configurações", "Tudo o que muda o site e a agenda fica aqui."),
        bloco("Estúdio e contatos", estudio.form),
        bloco("Horário de funcionamento", el("div", {}, el("p", { class: "pn-nota", texto: "Dias desmarcados aparecem como fechados no site. Se a mudança deixar reservas fora do horário, ela não é salva." }), horas.form)),
        bloco("Regras de reserva", regras.form),
        bloco("Dados desta demonstração", el("div", { class: "pn-dados" },
          el("p", { class: "pn-nota", texto: `Os dados ficam no armazenamento deste navegador (cerca de ${kb} KB). Não há servidor nem cópia automática.` }),
          el("div", { class: "pn-item__acoes" },
            botao("Conferir a agenda", () => {
              const c = AE.exemplos.conferirAgenda(d());
              trocar(resultadoConferencia, c.ok ? el("p", { class: "ae-sucesso" }, icone("circle-check", 16), AE.t("Nenhum conflito: {nenhuma} profissional tem dois atendimentos ao mesmo tempo.")) : el("div", { class: "pn-erro" }, icone("circle-x", 16), el("div", {}, c.problemas.map((p) => el("p", { texto: p })))));
            }, { ic: "shield-check" }),
            botao("Baixar cópia (JSON)", () => {
              const blob = new Blob([loja.exportar()], { type: "application/json" });
              const a = el("a", { href: URL.createObjectURL(blob), download: `${U.semAcento(d().negocio.nome).replace(/[^a-z0-9]+/g, "-")}-dados-${U.hoje()}.json` });
              document.body.append(a); a.click(); a.remove();
              U.aviso("Cópia dos dados baixada.");
            }, { ic: "download" }),
            botao("Apagar reservas de exemplo", async () => {
              const ok = await confirmar({ titulo: "Apagar reservas de exemplo", texto: "As reservas e clientes de exemplo saem; serviços, equipe e configurações ficam. Útil para ver o painel vazio.", botaoTexto: "Apagar exemplos", perigo: true });
              if (ok) avisoResultado(await loja.limparExemplos(), "Reservas de exemplo apagadas.");
            }, { classe: "btn--perigo-linha", ic: "eraser" }),
            botao("Restaurar dados de exemplo", async () => {
              const ok = await confirmar({ titulo: "Restaurar dados de exemplo", texto: "Tudo o que foi alterado neste navegador (reservas, serviços, equipe e configurações) volta ao início da demonstração.", botaoTexto: "Restaurar", perigo: true });
              if (ok) avisoResultado(await loja.restaurar(), "Dados de exemplo restaurados.");
            }, { classe: "btn--perigo-linha", ic: "rotate-ccw" })),
          resultadoConferencia)));
    }

    /* ======================================================================
       NAVEGAÇÃO
       ====================================================================== */
    const VISTAS = { visao: verVisao, agenda: verAgenda, servicos: verServicos, equipe: verEquipe, clientes: verClientes, depoimentos: verDepoimentos, configuracoes: verConfiguracoes };
    function rotaAtual() {
      const h = location.hash.replace(/^#\/?/, "");
      if (h === "visao-pendentes") return "visao";
      return VISTAS[h] ? h : "visao";
    }
    function desenhar(focarTitulo, seletorFoco) {
      est.rota = rotaAtual();
      const ativo = document.activeElement;
      const idAtivo = ativo && raiz.contains(ativo) && ativo.id ? ativo.id : null;
      const rolagem = window.scrollY;
      trocar(raiz, VISTAS[est.rota]());
      document.querySelectorAll("[data-rota]").forEach((a) => { if (a.dataset.rota === est.rota) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      document.title = `${ROTAS[est.rota]} · Painel · ${d().negocio.nome}`;
      const aba = document.querySelector("[data-rota][aria-current]");
      const menuRolagem = document.getElementById("pn-menu");
      if (aba && menuRolagem && window.matchMedia("(max-width: 959px)").matches) {
        // só rola o menu para o lado (a página fica onde está)
        menuRolagem.scrollLeft += aba.getBoundingClientRect().left - menuRolagem.getBoundingClientRect().left - (menuRolagem.clientWidth - aba.offsetWidth) / 2;
      }
      document.querySelectorAll("[data-nome-estudio]").forEach((x) => { x.textContent = d().negocio.nome; });
      if (focarTitulo) { const t = raiz.querySelector(".pn-titulo"); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } window.scrollTo(0, 0); return; }
      window.scrollTo(0, rolagem);
      const alvo = (seletorFoco && raiz.querySelector(seletorFoco)) || (idAtivo && document.getElementById(idAtivo));
      if (alvo) alvo.focus({ preventScroll: true });
    }
    window.addEventListener("hashchange", () => {
      desenhar(location.hash !== "#/visao-pendentes");
      if (location.hash === "#/visao-pendentes") { const l = document.getElementById("visao-pendentes"); if (l) l.scrollIntoView(); }
      const menu = document.getElementById("pn-menu");
      if (menu) menu.classList.remove("is-open");
    });
    loja.ouvir(() => {
      desenhar(false);
      // Se a janela mostra uma reserva, ela continua aberta (cada ação já a redesenha)
    });
    desenhar(false);
    return { desenhar, abrirReserva, novaReserva };
  }

  AE.painel = { iniciar };
})();
