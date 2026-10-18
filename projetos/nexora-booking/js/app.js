/* ==========================================================================
   NEXORA BOOKING — app.js
   Estrutura do painel: rotas (#/agenda, #/clientes/id, ...), menu lateral,
   navegação de toque no celular, pesquisa global, botão "Novo
   agendamento", notificações internas, menu do usuário, ajuda,
   preferências e restauração dos dados.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const A = NX.agenda;
  const { el, icone, $, $$ } = U;

  /* ---------- Preferências (só neste navegador) ---------- */
  const CHAVE_PREF = "nexora-booking:preferencias";
  const PADRAO = { densidade: "confortavel", menuRecolhido: false, porPagina: 20, avisoDemoFechado: false };
  NX.preferencias = (() => {
    try { return { ...PADRAO, ...JSON.parse(Comum.armazenamento.ler(CHAVE_PREF) || "{}") }; } catch (e) { return { ...PADRAO }; }
  })();
  if (![10, 20, 50].includes(NX.preferencias.porPagina)) NX.preferencias.porPagina = 20;
  NX.salvarPreferencias = (mudancas, mensagem) => {
    Object.assign(NX.preferencias, mudancas);
    Comum.armazenamento.salvar(CHAVE_PREF, JSON.stringify(NX.preferencias));
    aplicarPreferencias();
    renderizar();
    if (mensagem) U.aviso(mensagem);
  };
  function aplicarPreferencias() {
    document.body.classList.toggle("densidade-compacta", NX.preferencias.densidade === "compacta");
    if (window.innerWidth >= 1024) definirRecolhido(NX.preferencias.menuRecolhido);
  }

  /* ---------- Rotas ---------- */
  const ROTAS = ["painel", "agenda", "agendamentos", "clientes", "servicos", "profissionais", "disponibilidade", "financeiro", "relatorios", "notificacoes", "configuracoes"];
  const DETALHES = { clientes: "cliente" };
  const montadas = new Set();
  let vistaAtual = null;
  let chaveAtual = null;

  function lerRota() {
    const [caminho, consulta] = location.hash.replace(/^#\/?/, "").split("?");
    const partes = caminho.split("/");
    const params = Object.fromEntries(new URLSearchParams(consulta || ""));
    if (DETALHES[partes[0]] && partes[1]) return { vista: DETALHES[partes[0]], menu: partes[0], id: decodeURIComponent(partes[1]), params };
    if (ROTAS.includes(partes[0])) return { vista: partes[0], menu: partes[0], params };
    return null;
  }

  function irPara(inicial) {
    let rota = lerRota();
    if (!rota) {
      history.replaceState(null, "", "#/painel");
      rota = lerRota();
    }
    const chave = `${rota.vista}:${rota.id || ""}`;
    const mudou = chave !== chaveAtual;
    vistaAtual = rota.vista;
    chaveAtual = chave;
    const tela = NX.telas[rota.vista];
    if (tela.abrir) tela.abrir(rota.id);
    if (tela.aoEntrar) tela.aoEntrar(rota.params || {});
    if (Object.keys(rota.params || {}).length) history.replaceState(null, "", `#/${rota.menu}${rota.id ? `/${rota.id}` : ""}`);

    $$(".vista").forEach((v) => { v.hidden = v.dataset.vista !== rota.vista; });
    $$(".menu__link, .nav-inferior a").forEach((a) => {
      if (a.dataset.rota === rota.menu) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    fecharMenuCelular();
    if (tela.abrir) montadas.delete(rota.vista);
    renderizar();
    const titulo = (tela.tituloDinamico && tela.tituloDinamico()) || tela.titulo;
    document.title = `${titulo} · NEXORA BOOKING (demonstração)`;
    if (!inicial && mudou) {
      const secao = $(`#vista-${rota.vista}`);
      if (!Comum.reduzirMovimento()) {
        secao.classList.remove("entrando"); void secao.offsetWidth; secao.classList.add("entrando");
        clearTimeout(secao._fimEntrada);
        secao._fimEntrada = setTimeout(() => secao.classList.remove("entrando"), 700);
      }
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
    const ativo = document.activeElement;
    const foco = ativo && ativo.dataset ? ativo.dataset.foco : null;
    const rolagem = window.scrollY;
    if (!montadas.has(vistaAtual)) { tela.montar(secao); montadas.add(vistaAtual); }
    tela.atualizar();
    atualizarMoldura();
    if (foco && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
      const alvo = document.querySelector(`[data-foco="${CSS.escape(foco)}"]`);
      if (alvo) { alvo.focus({ preventScroll: true }); window.scrollTo({ top: rolagem, behavior: "instant" }); }
    }
  }
  NX.renderizar = renderizar;

  /* ---------- Moldura: estabelecimento, perfil, contadores ---------- */
  function atualizarMoldura() {
    const d = L.dados;
    const est = d.estabelecimento;
    $("#empresa-nome").textContent = est.nome;
    U.trocar($("#empresa-avatar"), est.logo ? el("img", { src: est.logo, alt: "" }) : U.iniciais(est.nome));
    $("#avatar-topo").textContent = U.iniciais(d.perfil.nome);
    $("#perfil-nome").textContent = d.perfil.nome;
    $("#perfil-cargo").textContent = d.perfil.cargo || "Perfil da demonstração";
    const agora = U.agora();
    const hoje = d.agendamentos.filter((a) => a.data === U.hoje() && ["pendente", "confirmado", "em_atendimento"].includes(a.status)).length;
    const contaHoje = $("#conta-hoje");
    contaHoje.textContent = hoje ? String(hoje) : "";
    contaHoje.title = hoje ? `${hoje} reservas ativas hoje` : "";
    const pend = d.agendamentos.filter((a) => a.status === "pendente" && `${a.data}T${a.inicio}` > agora).length;
    const contaPend = $("#conta-pendentes");
    contaPend.textContent = pend ? String(pend) : "";
    contaPend.title = pend ? `${pend} reservas aguardando confirmação` : "";
    const naoLidas = d.notificacoes.filter((n) => !n.lida).length;
    $("#conta-notif").textContent = naoLidas ? String(naoLidas) : "";
    desenharNotificacoes();
  }

  /* ---------- Menus suspensos ---------- */
  const SUSPENSOS = [["#btn-notif", "#painel-notif"], ["#btn-usuario", "#menu-usuario"]];
  function fecharSuspensos(exceto) {
    SUSPENSOS.forEach(([b, m]) => {
      const menu = $(m);
      if (menu === exceto || menu.hidden) return;
      menu.hidden = true;
      $(b).setAttribute("aria-expanded", "false");
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
          if (m === "#painel-notif") desenharNotificacoes();
          const primeiro = menu.querySelector('[role="menuitem"], .notificacao, button:not(:disabled), a');
          if (primeiro) primeiro.focus();
        }
      });
      menu.addEventListener("keydown", (e) => {
        const itens = $$('[role="menuitem"], .notificacao, #notif-marcar:not(:disabled), #notif-ver-todas', menu);
        const i = itens.indexOf(document.activeElement);
        if (e.key === "ArrowDown" && itens.length) { e.preventDefault(); itens[(i + 1) % itens.length].focus(); }
        else if (e.key === "ArrowUp" && itens.length) { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); fecharSuspensos(null); botao.focus(); }
      });
      menu.addEventListener("click", (e) => { if (e.target.closest('[role="menuitem"], #notif-ver-todas')) fecharSuspensos(null); });
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".suspenso-caixa")) fecharSuspensos(null); });

    $("#notif-marcar").addEventListener("click", () => {
      const ids = L.dados.notificacoes.filter((n) => !n.lida).map((n) => n.id);
      A.marcarLidas(ids);
      U.aviso("Notificações marcadas como lidas.");
      $("#btn-notif").focus();
    });
    const novo = () => NX.reservas.novo();
    $("#btn-novo").addEventListener("click", novo);
    $("#nav-novo").addEventListener("click", novo);
    $$("[data-acao]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.acao === "ajuda") $("#dlg-ajuda").showModal();
      if (b.dataset.acao === "restaurar") NX.restaurarDados();
    }));
  }

  /* ---------- Notificações internas (sino) ---------- */
  function desenharNotificacoes() {
    const d = L.dados;
    const naoLidas = d.notificacoes.filter((n) => !n.lida).length;
    const conta = $("#notif-conta");
    conta.hidden = naoLidas === 0;
    conta.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
    $("#btn-notif").setAttribute("aria-label", naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações");
    $("#notif-marcar").disabled = naoLidas === 0;
    const lista = d.notificacoes.slice(0, 8);
    U.trocar($("#lista-notif"), ...(lista.length ? lista.map((n) => {
      const x = NX.notificacoes.descrever(n);
      return el("li", {}, el("button", { class: `notificacao notificacao--${n.tipo}${n.lida ? " is-vista" : " is-nova"}`, type: "button",
        onclick: () => { if (!n.lida) A.marcarLidas([n.id]); fecharSuspensos(null); if (x.agendamento) NX.reservas.detalhe(n.agendamentoId); } },
        el("span", { class: "notificacao__icone" }, icone(x.icone, 16)),
        el("span", { class: "notificacao__texto" }, el("b", { texto: x.titulo }), el("span", { texto: x.texto }), el("span", { texto: U.dataHoraCurta(n.em) })),
        n.lida ? null : el("span", { class: "vh", texto: "(não lida)" })));
    }) : [el("li", { class: "notificacoes__vazio", texto: "Nenhuma notificação por enquanto." })]));
  }

  /* ---------- Pesquisa global ---------- */
  function prepararBusca() {
    const campo = $("#busca-global");
    const caixa = $("#busca-resultados");
    const telaPequena = window.matchMedia("(max-width: 1279px)");
    const ajustarTexto = () => { campo.placeholder = telaPequena.matches ? "Pesquisar" : "Cliente, telefone, código da reserva ou serviço"; };
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
      const dig = U.digitos(q);
      const agora = U.agora();
      const resumo = NX.metricas.resumoClientes();
      const grupos = [
        ["Reservas", d.agendamentos.filter((a) => U.contem(a.codigo, q) || (q.length >= 5 && /^nxb/i.test(q) && a.codigo.includes(q.toUpperCase()))).slice(0, 4).map((a) => ({ titulo: `${a.codigo} · ${NX.componentes.nomeDoCliente(a.clienteId)}`, sub: `${U.dataCurta(a.data)} às ${a.inicio} · ${a.servicoNome} · ${A.nomeStatus(a.status)}`, icone: "calendar-check", abrir: () => NX.reservas.detalhe(a.id) }))],
        ["Clientes", d.clientes.filter((c) => U.contem(c.nome, q) || (dig.length >= 3 && c.telefone.includes(dig)) || (q.includes("@") && U.contem(c.email, q))).slice(0, 6).map((c) => {
          const r = resumo.get(c.id) || {};
          return { titulo: c.nome, sub: `${U.mascaraTelefone(c.telefone)}${r.proximo && `${r.proximo.data}T${r.proximo.inicio}` > agora ? ` · próxima: ${U.dataCurta(r.proximo.data)} ${r.proximo.inicio}` : ""}`, icone: "user", abrir: () => NX.ir(`clientes/${c.id}`) };
        })],
        ["Serviços", d.servicos.filter((s) => U.contem(s.nome, q) || U.contem(s.categoria, q)).slice(0, 4).map((s) => ({ titulo: s.nome, sub: `${s.duracao} min · ${U.moeda(s.preco)}${s.status === "ativo" ? "" : " · inativo"}`, icone: "scissors", abrir: () => NX.ir(`servicos?status=${s.status === "ativo" ? "ativo" : "inativo"}`) }))],
        ["Profissionais", d.profissionais.filter((p) => U.contem(p.nome, q)).slice(0, 3).map((p) => ({ titulo: p.nome, sub: `${p.especialidades.join(", ")}${p.status === "ativo" ? "" : " · inativo"}`, icone: "contact", abrir: () => NX.ir(`agenda?profissional=${p.id}&visao=semana`) }))],
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
      U.trocar(caixa, ...(filhos.length ? filhos : [el("p", { class: "busca__vazio", texto: `Nada encontrado para "${q}".` })]));
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
    document.addEventListener("keydown", (e) => {
      const digitando = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if (((e.key === "/" && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !$("dialog[open]")) {
        e.preventDefault();
        campo.focus();
      }
    });
  }

  /* ---------- Menu lateral e navegação do celular ---------- */
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
    $("#nav-menu").setAttribute("aria-expanded", "true");
    ($(".menu__link[aria-current]") || $(".menu__link")).focus();
  }
  function fecharMenuCelular(devolverFoco) {
    if (!document.body.classList.contains("menu-aberto")) return;
    document.body.classList.remove("menu-aberto");
    $("#fundo-menu").hidden = true;
    $("#abrir-menu").setAttribute("aria-expanded", "false");
    $("#nav-menu").setAttribute("aria-expanded", "false");
    if (devolverFoco) (devolverFoco instanceof HTMLElement ? devolverFoco : $("#abrir-menu")).focus();
  }
  function prepararMenu() {
    $("#recolher-menu").addEventListener("click", () => {
      const recolher = !document.body.classList.contains("menu-recolhido");
      definirRecolhido(recolher);
      NX.preferencias.menuRecolhido = recolher;
      Comum.armazenamento.salvar(CHAVE_PREF, JSON.stringify(NX.preferencias));
    });
    $("#abrir-menu").addEventListener("click", abrirMenuCelular);
    $("#nav-menu").addEventListener("click", abrirMenuCelular);
    $("#fechar-menu").addEventListener("click", () => fecharMenuCelular(true));
    $("#fundo-menu").addEventListener("click", () => fecharMenuCelular(true));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-aberto")) fecharMenuCelular(true);
      if (e.key === "Escape") fecharSuspensos(null);
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (m) => {
      fecharMenuCelular(false);
      definirRecolhido(m.matches ? NX.preferencias.menuRecolhido : false);
    });
  }

  /* ---------- Restaurar e ajuda ---------- */
  NX.restaurarDados = async () => {
    fecharSuspensos(null);
    const ok = await U.confirmar({
      titulo: "Restaurar os dados originais?",
      texto: "Todas as alterações feitas nesta demonstração serão perdidas: reservas criadas, cancelamentos, pagamentos registrados, clientes, serviços, profissionais, horários e configurações voltam ao estado inicial. Esta ação não pode ser desfeita.",
      rotulo: "Restaurar dados", perigo: true,
      exigirCiencia: "Entendo que as alterações feitas nesta demonstração serão perdidas.",
    });
    if (!ok) return;
    ["dlg-detalhe", "dlg-reserva", "dlg-form"].forEach((id) => { const d = $(`#${id}`); if (d.open) d.close(); });
    Object.assign(NX.telas.agenda.estado, { data: null, visao: null, profissionalId: "", servicoId: "", status: "", mostrarCancelados: null });
    L.restaurar();
    U.aviso("Dados originais restaurados.");
  };
  function prepararAjuda() {
    $("#btn-ajuda").addEventListener("click", () => $("#dlg-ajuda").showModal());
    $$("[data-ajuda]").forEach((b) => b.addEventListener("click", () => {
      $("#dlg-ajuda").close();
      const acao = b.dataset.ajuda;
      if (acao === "novo") setTimeout(() => NX.reservas.novo(), 30);
      if (acao === "pendentes") NX.ir("agendamentos?status=pendente&periodo=futuros");
      if (acao === "disponibilidade") NX.ir("disponibilidade");
    }));
  }

  /* ---------- Início ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    L.carregar();
    aplicarPreferencias();
    prepararMenu();
    prepararSuspensos();
    prepararBusca();
    prepararAjuda();
    L.aoMudar(renderizar);
    window.addEventListener("hashchange", () => irPara(false));
    irPara(true);
    $("#carregando").hidden = true;
    if (!L.persistente) U.aviso("Este navegador não permite salvar: as mudanças somem ao recarregar.", "erro");
    // O relógio anda: a cada minuto a tela é refeita (linha do "agora", horários que passaram, lembretes)
    let minuto = U.agora();
    setInterval(() => {
      if (U.agora() === minuto) return;
      minuto = U.agora();
      if (!$("dialog[open]") && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("input, textarea, select"))) renderizar();
    }, 15000);
  });
})();
