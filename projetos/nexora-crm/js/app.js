/* ==========================================================================
   NEXORA CRM — app.js
   Estrutura do sistema: rotas (#/leads, #/clientes/id...), menu lateral,
   pesquisa global, botão "Novo", notificações, menu do usuário, ajuda,
   preferências e tela de boas-vindas.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone, $, $$ } = U;

  /* ---------- Preferências (só neste navegador) ---------- */
  const CHAVE_PREF = "nexora-crm:preferencias";
  const CHAVE_BV = "nexora-crm:boas-vindas";
  const PADRAO = { densidade: "confortavel", valoresCompactos: false, menuRecolhido: false, paginaInicial: "visao-geral" };
  NX.preferencias = (() => {
    try { return { ...PADRAO, ...JSON.parse(Comum.armazenamento.ler(CHAVE_PREF) || "{}") }; } catch (e) { return { ...PADRAO }; }
  })();
  NX.salvarPreferencias = (mudancas, mensagem) => {
    Object.assign(NX.preferencias, mudancas);
    Comum.armazenamento.salvar(CHAVE_PREF, JSON.stringify(NX.preferencias));
    aplicarPreferencias();
    renderizar();
    if (mensagem) U.aviso(mensagem);
  };
  function aplicarPreferencias() {
    document.body.classList.toggle("densidade-compacta", NX.preferencias.densidade === "compacta");
    if (window.innerWidth >= 1024) definirRecolhido(NX.preferencias.menuRecolhido, false);
  }

  /* ---------- Rotas ---------- */
  const ROTAS = ["visao-geral", "leads", "clientes", "pipeline", "tarefas", "relatorios", "configuracoes"];
  const montadas = new Set();
  let vistaAtual = null;

  function lerRota() {
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    if (partes[0] === "clientes" && partes[1]) return { vista: "cliente", menu: "clientes", id: decodeURIComponent(partes[1]) };
    if (ROTAS.includes(partes[0])) return { vista: partes[0], menu: partes[0] };
    return null;
  }

  function irPara(inicial) {
    let rota = lerRota();
    if (!rota) {
      const destino = NX.preferencias.paginaInicial || "visao-geral";
      history.replaceState(null, "", `#/${destino}`);
      rota = lerRota();
    }
    const mudou = rota.vista !== vistaAtual || rota.vista === "cliente";
    vistaAtual = rota.vista;
    if (rota.vista === "cliente") NX.telas.cliente.abrir(rota.id);

    $$(".vista").forEach((v) => { v.hidden = v.dataset.vista !== rota.vista; });
    $$(".menu__link").forEach((a) => {
      if (a.dataset.rota === rota.menu) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    fecharMenuCelular();
    renderizar();
    const tela = NX.telas[rota.vista];
    const titulo = rota.vista === "cliente" && L.cliente(rota.id) ? L.cliente(rota.id).empresa : tela.titulo;
    document.title = `${titulo} · NEXORA CRM (demonstração)`;
    if (!inicial && mudou) {
      const secao = $(`#vista-${rota.vista}`);
      if (!Comum.reduzirMovimento()) { secao.classList.remove("entrando"); void secao.offsetWidth; secao.classList.add("entrando"); }
      window.scrollTo({ top: 0, behavior: "instant" });
      const h1 = secao.querySelector("h1");
      if (h1 && !$("dialog[open]")) h1.focus({ preventScroll: true });
    }
  }

  // Redesenha a tela atual (e devolve o foco ao mesmo controle, se ele for recriado)
  function renderizar() {
    if (!vistaAtual) return;
    const tela = NX.telas[vistaAtual];
    const secao = $(`#vista-${vistaAtual}`);
    const foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : null;
    if (!montadas.has(vistaAtual) || vistaAtual === "cliente") { tela.montar(secao); montadas.add(vistaAtual); }
    tela.atualizar();
    atualizarMoldura();
    if (foco && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
      const alvo = document.querySelector(`[data-foco="${CSS.escape(foco)}"]`);
      if (alvo) alvo.focus({ preventScroll: true });
    }
  }

  /* ---------- Moldura: nome da empresa, perfil, contadores, notificações ---------- */
  function atualizarMoldura() {
    const d = L.dados;
    $("#empresa-nome").textContent = d.empresa;
    $("#empresa-avatar").textContent = U.iniciais(d.empresa);
    $("#avatar-topo").textContent = U.iniciais(d.perfil.nome);
    $("#perfil-nome").textContent = d.perfil.nome;
    $("#perfil-cargo").textContent = d.perfil.cargo;
    $("#perfil-email").textContent = d.perfil.email;
    const novos = d.leads.filter((l) => l.status === "Novo").length;
    const contaLeads = $("#conta-leads");
    contaLeads.textContent = novos ? String(novos) : "";
    contaLeads.title = novos ? `${novos} leads novos` : "";
    const hoje = U.hoje();
    const atrasadas = d.tarefas.filter((t) => !t.concluida && t.prazo < hoje).length;
    const contaTarefas = $("#conta-tarefas");
    contaTarefas.textContent = atrasadas ? String(atrasadas) : "";
    contaTarefas.title = atrasadas ? `${atrasadas} tarefas atrasadas` : "";
    desenharNotificacoes();
  }

  /* ---------- Menus suspensos (Novo, notificações, usuário) ---------- */
  const SUSPENSOS = [["#btn-novo", "#menu-novo"], ["#btn-notificacoes", "#painel-notificacoes"], ["#btn-usuario", "#menu-usuario"]];
  function fecharSuspensos(exceto, devolverFoco) {
    SUSPENSOS.forEach(([b, m]) => {
      const botao = $(b);
      const menu = $(m);
      if (menu === exceto || menu.hidden) return;
      menu.hidden = true;
      botao.setAttribute("aria-expanded", "false");
      if (devolverFoco) botao.focus();
    });
  }
  function prepararSuspensos() {
    SUSPENSOS.forEach(([b, m]) => {
      const botao = $(b);
      const menu = $(m);
      botao.addEventListener("click", (e) => {
        e.stopPropagation();
        const abrir = menu.hidden;
        fecharSuspensos(menu);
        menu.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
        if (abrir) {
          if (m === "#painel-notificacoes") desenharNotificacoes();
          const primeiro = menu.querySelector('[role="menuitem"], button, a');
          if (primeiro) primeiro.focus();
        }
      });
      menu.addEventListener("keydown", (e) => {
        const itens = $$('[role="menuitem"], .notificacao, #notif-ler-todas', menu).filter((x) => !x.disabled);
        const i = itens.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); itens[(i + 1) % itens.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); fecharSuspensos(null, false); botao.focus(); }
      });
      menu.addEventListener("click", (e) => { if (e.target.closest('[role="menuitem"]')) fecharSuspensos(null, false); });
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".suspenso-caixa")) fecharSuspensos(null, false);
    });

    $("#notif-ler-todas").addEventListener("click", () => {
      L.marcarNotificacoesLidas(L.notificacoes().map((n) => n.id));
      U.aviso("Lembretes marcados como lidos.");
      $("#btn-notificacoes").focus();
    });

    $$("[data-novo]").forEach((b) => b.addEventListener("click", () => {
      const tipo = b.dataset.novo;
      ({ lead: () => NX.form.lead(), cliente: () => NX.form.cliente(), negocio: () => NX.form.negocio(), tarefa: () => NX.form.tarefa() })[tipo]();
    }));
    $$("[data-acao]").forEach((b) => b.addEventListener("click", () => {
      const acao = b.dataset.acao;
      if (acao === "ajuda") $("#dlg-ajuda").showModal();
      if (acao === "boas-vindas") NX.mostrarBoasVindas();
      if (acao === "restaurar") NX.restaurarDados();
    }));
  }

  /* ---------- Notificações (lembretes calculados) ---------- */
  function desenharNotificacoes() {
    const lista = L.notificacoes();
    const naoLidas = lista.filter((n) => !n.lida).length;
    const conta = $("#notif-conta");
    conta.hidden = naoLidas === 0;
    conta.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
    $("#btn-notificacoes").setAttribute("aria-label", naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações");
    $("#notif-ler-todas").disabled = naoLidas === 0;
    const ICONES = { atrasada: "triangle-alert", hoje: "calendar-clock", parado: "alarm-clock" };
    $("#lista-notificacoes").replaceChildren(...(lista.length ? lista.slice(0, 12).map((n) => el("li", {},
      el("button", { class: `notificacao notificacao--${n.tipo}${n.lida ? "" : " is-nova"}`, type: "button",
        onclick: () => {
          L.marcarNotificacoesLidas([n.id]);
          fecharSuspensos(null, false);
          if (n.ref.tipo === "tarefa") NX.form.tarefa({ id: n.ref.id });
          else NX.detalhe.negocio(n.ref.id);
        } },
        el("span", { class: "notificacao__icone" }, icone(ICONES[n.tipo], 16)),
        el("span", { class: "notificacao__texto" }, el("b", { texto: n.titulo }), el("span", { texto: n.texto })),
        n.lida ? null : el("span", { class: "vh", texto: "(não lida)" })))) : [el("li", { class: "notificacoes__vazio", texto: "Nenhum lembrete agora." })]));
  }

  /* ---------- Pesquisa global ---------- */
  function prepararBusca() {
    const campo = $("#busca-global");
    const caixa = $("#busca-resultados");
    // Texto de ajuda mais curto em telas pequenas
    const telaPequena = window.matchMedia("(max-width: 720px)");
    const ajustarTexto = () => { campo.placeholder = telaPequena.matches ? "Pesquisar" : "Pesquisar leads, clientes, oportunidades e tarefas"; };
    telaPequena.addEventListener("change", ajustarTexto);
    ajustarTexto();
    let itens = [];
    let ativo = -1;

    const fechar = () => { caixa.hidden = true; campo.setAttribute("aria-expanded", "false"); campo.removeAttribute("aria-activedescendant"); ativo = -1; };
    const marcar = (i) => {
      ativo = i;
      itens.forEach((it, k) => it.el.setAttribute("aria-selected", String(k === i)));
      if (itens[i]) { campo.setAttribute("aria-activedescendant", itens[i].el.id); itens[i].el.scrollIntoView({ block: "nearest" }); }
    };
    const abrirItem = (it) => { fechar(); campo.value = ""; campo.blur(); it.abrir(); };

    function pesquisar() {
      const q = campo.value.trim();
      if (q.length < 2) { fechar(); return; }
      const d = L.dados;
      const grupos = [
        ["Leads", d.leads.filter((l) => U.contem(l.nome, q) || U.contem(l.empresa, q) || U.contem(l.email, q)).slice(0, 5).map((l) => ({ titulo: l.nome, sub: `${l.empresa} · ${l.status}`, icone: "user-plus", abrir: () => NX.detalhe.lead(l.id) }))],
        ["Clientes", d.clientes.filter((c) => U.contem(c.nome, q) || U.contem(c.empresa, q) || U.contem(c.email, q)).slice(0, 5).map((c) => ({ titulo: c.empresa, sub: `${c.nome} · ${c.categoria}`, icone: "building", abrir: () => NX.ir(`clientes/${c.id}`) }))],
        ["Oportunidades", d.negocios.filter((n) => U.contem(n.titulo, q) || U.contem(n.empresa, q) || U.contem(n.contato, q)).slice(0, 5).map((n) => ({ titulo: `${n.titulo} · ${n.empresa}`, sub: `${L.etapa(n.etapa).nome} · ${U.moeda(n.valor)}`, icone: "handshake", abrir: () => NX.detalhe.negocio(n.id) }))],
        ["Tarefas", d.tarefas.filter((t) => U.contem(t.titulo, q) || U.contem(L.nomeDoVinculo(t.vinculo), q)).slice(0, 5).map((t) => ({ titulo: t.titulo, sub: `${L.nomeDoVinculo(t.vinculo)} · ${t.concluida ? "concluída" : U.relativo(t.prazo)}`, icone: "list-checks", abrir: () => NX.form.tarefa({ id: t.id }) }))],
      ].filter(([, lista]) => lista.length);
      itens = [];
      const filhos = grupos.map(([titulo, lista]) => el("div", { class: "busca__grupo", role: "group", "aria-label": titulo },
        el("p", { class: "busca__titulo", "aria-hidden": "true", texto: titulo }),
        ...lista.map((r) => {
          const item = el("div", { class: "busca__item", role: "option", id: `busca-op-${itens.length}`, "aria-selected": "false" },
            icone(r.icone, 16), el("span", {}, el("b", { texto: r.titulo }), el("span", { texto: r.sub })));
          const registro = { ...r, el: item };
          item.addEventListener("pointerdown", (e) => e.preventDefault());
          item.addEventListener("click", () => abrirItem(registro));
          itens.push(registro);
          return item;
        })));
      caixa.replaceChildren(...(filhos.length ? filhos : [el("p", { class: "busca__vazio", texto: `Nada encontrado para "${q}".` })]));
      caixa.hidden = false;
      campo.setAttribute("aria-expanded", "true");
      marcar(itens.length ? 0 : -1);
    }

    let espera;
    campo.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(pesquisar, 120); });
    campo.addEventListener("focus", () => { if (campo.value.trim().length >= 2) pesquisar(); });
    campo.addEventListener("blur", () => setTimeout(fechar, 120));
    campo.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && itens.length) { e.preventDefault(); marcar((ativo + 1) % itens.length); }
      else if (e.key === "ArrowUp" && itens.length) { e.preventDefault(); marcar((ativo - 1 + itens.length) % itens.length); }
      else if (e.key === "Enter" && itens[ativo]) { e.preventDefault(); abrirItem(itens[ativo]); }
      else if (e.key === "Escape") { campo.value = ""; fechar(); }
    });
    // Atalhos: "/" ou Ctrl+K para pesquisar
    document.addEventListener("keydown", (e) => {
      const digitando = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if (((e.key === "/" && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !$("dialog[open]") && $("#boas-vindas").hidden) {
        e.preventDefault();
        campo.focus();
      }
    });
  }

  /* ---------- Menu lateral ---------- */
  function definirRecolhido(recolhido) {
    document.body.classList.toggle("menu-recolhido", recolhido);
    const b = $("#recolher-menu");
    b.setAttribute("aria-expanded", String(!recolhido));
    b.setAttribute("aria-label", recolhido ? "Expandir menu lateral" : "Recolher menu lateral");
    b.querySelector("use").setAttribute("href", recolhido ? "#i-panel-left" : "#i-panel-left-close");
    $$(".menu__link").forEach((a) => { if (recolhido) a.setAttribute("title", a.dataset.dica); else a.removeAttribute("title"); });
  }
  function abrirMenuCelular() {
    document.body.classList.add("menu-aberto");
    $("#fundo-menu").hidden = false;
    $("#abrir-menu").setAttribute("aria-expanded", "true");
    $(".menu__link[aria-current]") ? $(".menu__link[aria-current]").focus() : $(".menu__link").focus();
  }
  function fecharMenuCelular(devolverFoco) {
    if (!document.body.classList.contains("menu-aberto")) return;
    document.body.classList.remove("menu-aberto");
    $("#fundo-menu").hidden = true;
    $("#abrir-menu").setAttribute("aria-expanded", "false");
    if (devolverFoco) $("#abrir-menu").focus();
  }
  function prepararMenu() {
    $("#recolher-menu").addEventListener("click", () => {
      const recolher = !document.body.classList.contains("menu-recolhido");
      definirRecolhido(recolher);
      NX.preferencias.menuRecolhido = recolher;
      Comum.armazenamento.salvar(CHAVE_PREF, JSON.stringify(NX.preferencias));
    });
    $("#abrir-menu").addEventListener("click", abrirMenuCelular);
    $("#fechar-menu").addEventListener("click", () => fecharMenuCelular(true));
    $("#fundo-menu").addEventListener("click", () => fecharMenuCelular(true));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-aberto")) fecharMenuCelular(true);
      if (e.key === "Escape") fecharSuspensos(null, false);
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (m) => {
      fecharMenuCelular(false);
      definirRecolhido(m.matches ? NX.preferencias.menuRecolhido : false);
    });
  }

  /* ---------- Boas-vindas, ajuda e restaurar ---------- */
  NX.mostrarBoasVindas = () => {
    fecharSuspensos(null, false);
    $$("dialog[open]").forEach((d) => d.close());
    const bv = $("#boas-vindas");
    bv.hidden = false;
    $("#app").inert = true;
    $("#bv-explorar").focus();
  };
  function fecharBoasVindas() {
    $("#boas-vindas").hidden = true;
    $("#app").inert = false;
    Comum.armazenamento.salvar(CHAVE_BV, "vista");
    const h1 = $(`#vista-${vistaAtual} h1`);
    if (h1) h1.focus({ preventScroll: true });
    lembreteInicial();
  }
  // Lembrete único ao entrar: tarefas atrasadas
  function lembreteInicial() {
    try { if (sessionStorage.getItem("nexora-crm:lembrete")) return; sessionStorage.setItem("nexora-crm:lembrete", "1"); } catch (e) { /* segue */ }
    const atrasadas = L.dados.tarefas.filter((t) => !t.concluida && t.prazo < U.hoje()).length;
    if (atrasadas) setTimeout(() => U.aviso(`Lembrete: você tem ${U.plural(atrasadas, "tarefa atrasada", "tarefas atrasadas")}.`, "info"), 600);
  }

  NX.restaurarDados = async () => {
    fecharSuspensos(null, false);
    const ok = await U.confirmar({ titulo: "Restaurar dados da demonstração?", texto: "Todos os leads, clientes, oportunidades e tarefas voltam ao estado original. O que você cadastrou ou mudou será apagado deste navegador.", rotulo: "Restaurar", perigo: true });
    if (!ok) return;
    L.restaurar();
    U.aviso("Dados da demonstração restaurados.");
  };

  function prepararAjuda() {
    $("#btn-ajuda").addEventListener("click", () => $("#dlg-ajuda").showModal());
    $$("[data-ajuda]").forEach((b) => b.addEventListener("click", () => {
      $("#dlg-ajuda").close();
      const acao = b.dataset.ajuda;
      if (acao === "lead") { NX.ir("leads"); setTimeout(() => NX.form.lead(), 50); }
      if (acao === "pipeline") NX.ir("pipeline");
      if (acao === "tarefa") { NX.ir("tarefas"); setTimeout(() => NX.form.tarefa(), 50); }
      if (acao === "relatorios") NX.ir("relatorios");
    }));
  }

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    aplicarPreferencias();
    prepararMenu();
    prepararSuspensos();
    prepararBusca();
    prepararAjuda();
    $("#bv-explorar").addEventListener("click", fecharBoasVindas);
    $("#boas-vindas").addEventListener("keydown", (e) => { if (e.key === "Escape") fecharBoasVindas(); });

    L.aoMudar(renderizar);
    window.addEventListener("hashchange", () => irPara(false));
    irPara(true);

    if (Comum.armazenamento.ler(CHAVE_BV) !== "vista") NX.mostrarBoasVindas();
    else lembreteInicial();
    if (!L.persistente) U.aviso("Este navegador não permite salvar: as mudanças somem ao recarregar.", "erro");
  });
})();
