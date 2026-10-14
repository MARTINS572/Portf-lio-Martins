/* ==========================================================================
   NEXORA STOCK — app.js
   Estrutura do sistema: rotas (#/produtos, #/pedidos/id, ...), menu
   lateral, pesquisa global, botão "Adicionar produto", ações rápidas,
   alertas, menu do usuário, ajuda, preferências e restauração.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
  const { el, icone, $, $$ } = U;

  /* ---------- Preferências (só neste navegador) ---------- */
  const CHAVE_PREF = "nexora-stock:preferencias";
  const PADRAO = { densidade: "confortavel", valoresCompactos: false, menuRecolhido: false, paginaInicial: "painel", porPagina: 20, avisoDemoFechado: false };
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
  const ROTAS = ["painel", "produtos", "categorias", "movimentacoes", "fornecedores", "pedidos", "relatorios", "configuracoes"];
  const DETALHES = { produtos: "produto", fornecedores: "fornecedor", pedidos: "pedido" };
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
      history.replaceState(null, "", `#/${NX.preferencias.paginaInicial || "painel"}`);
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
    $$(".menu__link").forEach((a) => {
      if (a.dataset.rota === rota.menu) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    fecharMenuCelular();
    if (tela.abrir) montadas.delete(rota.vista);      // páginas de detalhe sempre remontam
    renderizar();
    const titulo = (tela.tituloDinamico && tela.tituloDinamico()) || tela.titulo;
    document.title = `${titulo} · NEXORA STOCK (demonstração)`;
    if (!inicial && mudou) {
      const secao = $(`#vista-${rota.vista}`);
      if (!Comum.reduzirMovimento()) {
        secao.classList.remove("entrando"); void secao.offsetWidth; secao.classList.add("entrando");
        clearTimeout(secao._fimEntrada);
        secao._fimEntrada = setTimeout(() => secao.classList.remove("entrando"), 700);   // atualizações seguintes não animam de novo
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

  /* ---------- Moldura: empresa, perfil, contadores, alertas ---------- */
  function atualizarMoldura() {
    const d = L.dados;
    $("#empresa-nome").textContent = d.empresa;
    $("#empresa-avatar").textContent = U.iniciais(d.empresa);
    $("#avatar-topo").textContent = U.iniciais(d.perfil.nome);
    $("#perfil-nome").textContent = d.perfil.nome;
    $("#perfil-cargo").textContent = d.perfil.cargo || "Perfil da demonstração";
    const repor = d.produtos.filter((p) => p.status === "ativo" && ["baixo", "zerado"].includes(E.situacao(p))).length;
    const contaRepor = $("#conta-reposicao");
    contaRepor.textContent = repor ? String(repor) : "";
    contaRepor.title = repor ? `${repor} produtos precisam de reposição` : "";
    const receber = d.pedidos.filter((pc) => ["enviado", "parcial"].includes(pc.status)).length;
    const contaPc = $("#conta-pedidos");
    contaPc.textContent = receber ? String(receber) : "";
    contaPc.title = receber ? `${receber} pedidos aguardando recebimento` : "";
    desenharAlertas();
  }

  /* ---------- Menus suspensos ---------- */
  const SUSPENSOS = [["#btn-acoes", "#menu-acoes"], ["#btn-alertas", "#painel-alertas"], ["#btn-usuario", "#menu-usuario"]];
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
          if (m === "#painel-alertas") desenharAlertas();
          const primeiro = menu.querySelector('[role="menuitem"], .notificacao, button:not(:disabled), a');
          if (primeiro) primeiro.focus();
        }
      });
      menu.addEventListener("keydown", (e) => {
        const itens = $$('[role="menuitem"], .notificacao, #alertas-ver-todos', menu).filter((x) => !x.disabled);
        const i = itens.indexOf(document.activeElement);
        if (e.key === "ArrowDown" && itens.length) { e.preventDefault(); itens[(i + 1) % itens.length].focus(); }
        else if (e.key === "ArrowUp" && itens.length) { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); fecharSuspensos(null); botao.focus(); }
      });
      menu.addEventListener("click", (e) => { if (e.target.closest('[role="menuitem"]')) fecharSuspensos(null); });
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".suspenso-caixa")) fecharSuspensos(null); });

    $("#alertas-ver-todos").addEventListener("click", () => {
      E.marcarAlertasVistos(E.alertas().map((a) => a.chave));
      U.aviso("Alertas marcados como vistos. Eles voltam se o problema reaparecer.");
      $("#btn-alertas").focus();
    });
    $("#btn-adicionar-produto").addEventListener("click", () => NX.form.produto());
    $$("[data-acao-rapida]").forEach((b) => b.addEventListener("click", () => {
      ({ entrada: () => NX.form.entrada(), saida: () => NX.form.saida(), ajuste: () => NX.form.ajuste(), pedido: () => NX.pedidos.form(), fornecedor: () => NX.form.fornecedor(), categoria: () => NX.form.categoria() })[b.dataset.acaoRapida]();
    }));
    $$("[data-acao]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.acao === "ajuda") $("#dlg-ajuda").showModal();
      if (b.dataset.acao === "restaurar") NX.restaurarDados();
    }));
  }

  /* ---------- Alertas internos ---------- */
  function desenharAlertas() {
    const lista = E.alertas();
    const novos = lista.filter((a) => !a.visto).length;
    const conta = $("#alertas-conta");
    conta.hidden = novos === 0;
    conta.textContent = novos > 9 ? "9+" : String(novos);
    $("#btn-alertas").setAttribute("aria-label", novos ? `Alertas, ${novos} não vistos` : "Alertas");
    $("#alertas-ver-todos").disabled = novos === 0;
    const ICONES = { atrasado: "clock", zerado: "package-x", baixo: "triangle-alert", receber: "truck" };
    $("#lista-alertas").replaceChildren(...(lista.length ? lista.map((a) => el("li", {},
      el("button", { class: `notificacao notificacao--${a.tipo}${a.visto ? " is-vista" : " is-nova"}`, type: "button",
        onclick: () => { E.marcarAlertasVistos([a.chave]); fecharSuspensos(null); NX.ir(a.rota); } },
        el("span", { class: "notificacao__icone" }, icone(ICONES[a.tipo], 16)),
        el("span", { class: "notificacao__texto" }, el("b", { texto: a.titulo }), el("span", { texto: a.texto })),
        a.visto ? null : el("span", { class: "vh", texto: "(não visto)" })))) : [el("li", { class: "notificacoes__vazio", texto: "Nenhum alerta agora. Tudo em ordem." })]));
  }

  /* ---------- Pesquisa global ---------- */
  function prepararBusca() {
    const campo = $("#busca-global");
    const caixa = $("#busca-resultados");
    const telaPequena = window.matchMedia("(max-width: 1279px)");
    const ajustarTexto = () => { campo.placeholder = telaPequena.matches ? "Pesquisar" : "Produto, SKU, fornecedor ou pedido"; };
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
      const digitos = q.replace(/\D/g, "");
      const grupos = [
        ["Produtos", d.produtos.filter((p) => U.contem(p.nome, q) || U.contem(p.sku, q) || (digitos.length >= 4 && p.codigoBarras.includes(digitos))).slice(0, 6).map((p) => ({ titulo: p.nome, sub: `${p.sku} · saldo ${U.numero(E.saldo(p.id))} · ${E.nomeSituacao(E.situacao(p))}`, icone: "package", abrir: () => NX.ir(`produtos/${p.id}`) }))],
        ["Fornecedores", d.fornecedores.filter((f) => U.contem(f.nome, q) || U.contem(f.contato, q) || (f.cnpj && digitos.length >= 4 && f.cnpj.replace(/\D/g, "").includes(digitos))).slice(0, 4).map((f) => ({ titulo: f.nome, sub: `${f.contato} · ${f.status === "ativo" ? "ativo" : "inativo"}`, icone: "truck", abrir: () => NX.ir(`fornecedores/${f.id}`) }))],
        ["Pedidos de compra", d.pedidos.filter((pc) => U.contem(pc.numero, q) || (digitos.length >= 2 && pc.numero.replace(/\D/g, "").endsWith(digitos))).slice(0, 4).map((pc) => ({ titulo: `${pc.numero} · ${L.nomeFornecedor(pc.fornecedorId)}`, sub: `${E.statusPedido(pc.status).nome} · ${U.moeda(E.totaisPedido(pc).total)}`, icone: "clipboard-list", abrir: () => NX.ir(`pedidos/${pc.id}`) }))],
        ["Categorias", d.categorias.filter((c) => U.contem(c.nome, q) || U.contem(c.codigo, q)).slice(0, 3).map((c) => ({ titulo: c.nome, sub: `${c.codigo} · ${c.status === "ativa" ? "ativa" : "arquivada"}`, icone: "tags", abrir: () => NX.ir(`produtos?categoria=${c.id}`) }))],
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
    document.addEventListener("keydown", (e) => {
      const digitando = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
      if (((e.key === "/" && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) && !$("dialog[open]")) {
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
    ($(".menu__link[aria-current]") || $(".menu__link")).focus();
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
      texto: "Todas as alterações feitas nesta demonstração serão perdidas: produtos cadastrados, entradas, saídas, ajustes, pedidos, fornecedores e categorias voltam ao estado inicial. Esta ação não pode ser desfeita.",
      rotulo: "Restaurar dados", perigo: true,
      exigirCiencia: "Entendo que as alterações feitas nesta demonstração serão perdidas.",
    });
    if (!ok) return;
    if (NX.telas.configuracoes.aoSairDados) NX.telas.configuracoes.aoSairDados();
    L.restaurar();
    U.aviso("Dados originais restaurados.");
  };
  function prepararAjuda() {
    $("#btn-ajuda").addEventListener("click", () => $("#dlg-ajuda").showModal());
    $$("[data-ajuda]").forEach((b) => b.addEventListener("click", () => {
      $("#dlg-ajuda").close();
      const acao = b.dataset.ajuda;
      if (acao === "produto") setTimeout(() => NX.form.produto(), 30);
      if (acao === "saida") setTimeout(() => NX.form.saida(), 30);
      if (acao === "pedidos") NX.ir("pedidos?status=abertos");
      if (acao === "relatorios") NX.ir("relatorios");
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
    // Mudou o dia com a página aberta (ex.: virou meia-noite): recalcula atrasos e períodos
    let dia = U.hoje();
    setInterval(() => { if (U.hoje() !== dia) { dia = U.hoje(); renderizar(); } }, 60000);
  });
})();
