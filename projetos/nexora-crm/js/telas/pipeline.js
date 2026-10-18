/* ==========================================================================
   NEXORA CRM — Tela: Pipeline de vendas (quadro Kanban)
   • Arrastar e soltar com mouse (cartão inteiro) ou toque (pela alça).
   • Alternativa para teclado e celular: botão "Mover" em cada cartão.
   • Venda perdida pede o motivo; venda concluída registra o ganho.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;
  const DIAS_FECHADOS = 30;   // colunas de ganho/perda mostram os últimos 30 dias

  const filtro = { busca: "", responsavel: "" };
  let partes = null;
  let arrastou = false;

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Filtrar por cliente, empresa ou serviço", "aria-label": "Filtrar oportunidades", "data-foco": "pipeline-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value.trim(); atualizar(); });
    const resp = el("select", { "aria-label": "Filtrar por responsável" }, el("option", { value: "", texto: "Toda a equipe" }));
    resp.addEventListener("change", () => { filtro.responsavel = resp.value; atualizar(); });
    partes = {
      busca, resp,
      resumo: el("div", { class: "resumo-pipeline" }),
      quadro: el("div", { class: "quadro", role: "list", "aria-label": "Etapas do pipeline" }),
    };
    secao.replaceChildren(
      C().cabecalho({
        id: "pipeline", titulo: "Pipeline de vendas",
        sub: "Arraste os cartões entre as etapas. No celular, use a alça ou o botão Mover.",
        acoes: [C().botao("Nova oportunidade", "btn--primario", () => NX.form.negocio(), "plus")],
      }),
      partes.resumo,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca), resp),
      partes.quadro,
    );
    prepararArrastar(partes.quadro);
  }

  function visiveis() {
    const hoje = U.hoje();
    return L.dados.negocios.filter((n) =>
      (!filtro.responsavel || n.responsavelId === filtro.responsavel) &&
      (!filtro.busca || U.contem(n.contato, filtro.busca) || U.contem(n.empresa, filtro.busca) || U.contem(n.titulo, filtro.busca)) &&
      (L.aberto(n) || (n.fechadoEm && U.diasEntre(n.fechadoEm, hoje) <= DIAS_FECHADOS)));
  }

  function atualizar() {
    const d = L.dados;
    // opções de responsável (a equipe pode ter mudado de nome)
    const atual = partes.resp.value;
    partes.resp.replaceChildren(el("option", { value: "", texto: "Toda a equipe" }), ...d.equipe.map((u) => el("option", { value: u.id, texto: u.nome })));
    partes.resp.value = atual;

    const k = L.indicadores();
    const hoje = U.hoje();
    const iniMes = U.inicioDoMes(hoje);
    const perdidasMes = d.negocios.filter((n) => n.etapa === "perdido" && n.fechadoEm >= iniMes);
    partes.resumo.replaceChildren(
      el("div", {}, el("span", { texto: "Em aberto" }), el("b", { texto: U.moeda(k.valorAberto) }), el("small", { texto: U.plural(k.negociacoes, "negociação", "negociações") })),
      el("div", {}, el("span", { texto: "Ganho no mês" }), el("b", { texto: U.moeda(k.valorGanhoMes) }), el("small", { texto: U.plural(k.vendasMes, "venda", "vendas") })),
      el("div", {}, el("span", { texto: "Perdido no mês" }), el("b", { texto: U.moeda(perdidasMes.reduce((t, n) => t + n.valor, 0)) }), el("small", { texto: U.plural(perdidasMes.length, "oportunidade", "oportunidades") })),
      el("div", {}, el("span", { texto: "Conversão (6 meses)" }), el("b", { texto: U.percentual(k.conversao) }), el("small", { texto: `${k.ganhos6m} de ${k.fechados6m} fechadas` })),
    );

    const lista = visiveis();
    const rolagem = partes.quadro.scrollLeft;
    partes.quadro.replaceChildren(...NX.ETAPAS.map((etapa, i) => {
      const cartoes = lista.filter((n) => n.etapa === etapa.id)
        .sort((a, b) => (b.fechadoEm || b.ultimaInteracao).localeCompare(a.fechadoEm || a.ultimaInteracao) || b.valor - a.valor);
      const total = cartoes.reduce((t, n) => t + n.valor, 0);
      const fechada = etapa.id === "ganho" || etapa.id === "perdido";
      return el("section", { class: `coluna coluna--${etapa.id}`, "data-etapa": etapa.id, role: "listitem", "aria-label": `${etapa.nome}: ${U.plural(cartoes.length, "oportunidade", "oportunidades")}, ${U.moeda(total, { compacto: false })}` },
        el("header", { class: "coluna__cabeca" },
          el("div", { class: "coluna__titulo" }, el("span", { class: "coluna__ponto", style: { "--etapa": fechada ? null : `var(--etapa-${i + 1})` } }), el("h2", { texto: etapa.nome }), el("span", { class: "coluna__n", texto: String(cartoes.length) })),
          el("p", { class: "coluna__total" }, U.moeda(total), fechada ? el("span", { class: "suave", texto: ` · ${DIAS_FECHADOS} dias` }) : null)),
        el("ul", { class: "coluna__lista" }, ...cartoes.map(cartao)),
        cartoes.length ? null : el("p", { class: "coluna__vazia", texto: fechada ? "Nada nos últimos 30 dias" : "Solte um cartão aqui" }));
    }));
    partes.quadro.scrollLeft = rolagem;
  }

  function cartao(n) {
    const dias = U.diasEntre(n.ultimaInteracao, U.hoje());
    const parado = L.aberto(n) && dias >= 14;
    const mover = el("button", { class: "cartao-negocio__mover", type: "button", "aria-haspopup": "menu", "aria-label": `Mover ${n.titulo} de ${n.empresa}`, "data-foco": `mover-${n.id}` }, icone("move", 15), el("span", { texto: "Mover" }));
    mover.addEventListener("click", (e) => { e.stopPropagation(); abrirMenuMover(mover, n.id); });
    const item = el("li", { class: `cartao-negocio${parado ? " cartao-negocio--parado" : ""}`, "data-id": n.id },
      el("button", { class: "cartao-negocio__alca", type: "button", tabindex: "-1", "aria-hidden": "true", title: "Segure para arrastar" }, icone("grip-vertical", 16)),
      el("button", { class: "cartao-negocio__corpo", type: "button", "aria-label": `${n.titulo}, ${n.contato}, ${n.empresa}, ${U.moeda(n.valor, { compacto: false })}, responsável ${L.membro(n.responsavelId).nome}, última interação ${U.relativo(n.ultimaInteracao)}. Abrir detalhes`, "data-foco": `negocio-${n.id}`,
        onclick: () => { if (!arrastou) NX.detalhe.negocio(n.id); } },
        el("span", { class: "cartao-negocio__servico", texto: n.titulo }),
        el("span", { class: "cartao-negocio__nome", texto: n.contato }),
        el("span", { class: "cartao-negocio__empresa", texto: n.empresa }),
        el("span", { class: "cartao-negocio__valor", texto: U.moeda(n.valor, { compacto: false }) })),
      el("div", { class: "cartao-negocio__rodape" },
        C().avatar(n.responsavelId),
        el("span", { class: `cartao-negocio__data${parado ? " is-parado" : ""}`, title: `Última interação: ${U.dataCompleta(n.ultimaInteracao)}` }, icone(parado ? "alarm-clock" : "clock", 13), U.relativo(n.ultimaInteracao)),
        n.motivoPerda ? el("span", { class: "cartao-negocio__motivo", texto: n.motivoPerda }) : null,
        mover));
    return item;
  }

  /* ---------- Menu "Mover para" ---------- */
  let menuAberto = null;
  function fecharMenu(devolverFoco) {
    if (!menuAberto) return;
    const { menu, botao } = menuAberto;
    menu.remove();
    document.removeEventListener("pointerdown", foraDoMenu, true);
    menuAberto = null;
    if (devolverFoco && botao.isConnected) botao.focus();
  }
  function foraDoMenu(e) { if (menuAberto && !menuAberto.menu.contains(e.target) && e.target !== menuAberto.botao) fecharMenu(false); }
  function abrirMenuMover(botao, id) {
    fecharMenu(false);
    const n = L.negocio(id);
    const itens = NX.ETAPAS.filter((e) => e.id !== n.etapa).map((e) => el("button", { class: "suspenso__item", type: "button", role: "menuitem", tabindex: "-1", "data-etapa": e.id,
      onclick: async () => { fecharMenu(false); await NX.acoes.mover(id, e.id); } }, icone(e.id === "ganho" ? "trophy" : e.id === "perdido" ? "circle-x" : "arrow-right", 15), e.nome));
    const menu = el("div", { class: "suspenso suspenso--mover", role: "menu", "aria-label": "Mover para a etapa" }, el("p", { class: "suspenso__titulo", texto: "Mover para" }), ...itens);
    document.body.append(menu);
    const r = botao.getBoundingClientRect();
    const alto = menu.offsetHeight;
    menu.style.left = `${Math.min(window.innerWidth - menu.offsetWidth - 8, Math.max(8, r.right - menu.offsetWidth))}px`;
    menu.style.top = `${r.bottom + 6 + alto > window.innerHeight ? Math.max(8, r.top - alto - 6) : r.bottom + 6}px`;
    menuAberto = { menu, botao };
    itens[0].focus();
    menu.addEventListener("keydown", (e) => {
      const i = itens.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); itens[(i + 1) % itens.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
      else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); fecharMenu(true); }
    });
    setTimeout(() => document.addEventListener("pointerdown", foraDoMenu, true));
  }
  window.addEventListener("resize", () => fecharMenu(false));
  window.addEventListener("hashchange", () => fecharMenu(false));

  /* ---------- Arrastar e soltar (pointer events: mouse e toque) ---------- */
  function prepararArrastar(quadro) {
    let estado = null;

    quadro.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const item = e.target.closest(".cartao-negocio");
      if (!item || e.target.closest(".cartao-negocio__mover")) return;
      const pelaAlca = !!e.target.closest(".cartao-negocio__alca");
      if (e.pointerType !== "mouse" && !pelaAlca) return;   // no toque, só pela alça (para não travar a rolagem)
      estado = { item, id: item.dataset.id, x: e.clientX, y: e.clientY, ativo: false, pointerId: e.pointerId };
      arrastou = false;
    });

    document.addEventListener("pointermove", (e) => {
      if (!estado || e.pointerId !== estado.pointerId) return;
      const dx = e.clientX - estado.x;
      const dy = e.clientY - estado.y;
      if (!estado.ativo) {
        if (Math.hypot(dx, dy) < 6) return;
        iniciar(e);
      }
      e.preventDefault();
      estado.fantasma.style.transform = `translate(${e.clientX - estado.offX}px, ${e.clientY - estado.offY}px) rotate(2deg)`;
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      const coluna = alvo && alvo.closest(".coluna");
      quadro.querySelectorAll(".coluna.is-alvo").forEach((c) => c !== coluna && c.classList.remove("is-alvo"));
      if (coluna && coluna.dataset.etapa !== estado.origem) coluna.classList.add("is-alvo");
      estado.coluna = coluna && coluna.dataset.etapa !== estado.origem ? coluna : null;
      // rolagem automática do quadro nas bordas
      const r = quadro.getBoundingClientRect();
      if (e.clientX > r.right - 60) quadro.scrollLeft += 14;
      else if (e.clientX < r.left + 60) quadro.scrollLeft -= 14;
    }, { passive: false });

    function iniciar(e) {
      const r = estado.item.getBoundingClientRect();
      estado.ativo = true;
      arrastou = true;
      estado.origem = L.negocio(estado.id).etapa;
      estado.offX = e.clientX - r.left;
      estado.offY = e.clientY - r.top;
      const fantasma = estado.item.cloneNode(true);
      fantasma.classList.add("cartao-negocio--fantasma");
      fantasma.style.width = `${r.width}px`;
      fantasma.setAttribute("aria-hidden", "true");
      document.body.append(fantasma);
      estado.fantasma = fantasma;
      estado.item.classList.add("is-origem");
      document.body.classList.add("arrastando");
      try { estado.item.setPointerCapture(estado.pointerId); } catch (err) { /* sem problema */ }
    }

    async function terminar(cancelar) {
      if (!estado) return;
      const s = estado;
      estado = null;
      if (!s.ativo) return;
      s.fantasma.remove();
      s.item.classList.remove("is-origem");
      document.body.classList.remove("arrastando");
      quadro.querySelectorAll(".coluna.is-alvo").forEach((c) => c.classList.remove("is-alvo"));
      setTimeout(() => { arrastou = false; }, 0);
      if (!cancelar && s.coluna) await NX.acoes.mover(s.id, s.coluna.dataset.etapa);
    }
    document.addEventListener("pointerup", (e) => { if (estado && e.pointerId === estado.pointerId) terminar(false); });
    document.addEventListener("pointercancel", () => terminar(true));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && estado && estado.ativo) terminar(true); });
  }

  NX.telas.pipeline = { titulo: "Pipeline de vendas", montar, atualizar, filtro };
})();
