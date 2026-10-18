/* ==========================================================================
   NEXORA AUTO — app.js
   Estrutura do painel: rotas (#/ordens, #/ordens/id, ...), menu lateral
   montado conforme o perfil, navegação de toque no celular, pesquisa
   global, botão "Nova OS", notificações e alertas, menu do usuário com a
   troca de perfil (simulação), ajuda e restauração dos dados.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const C = () => NX.componentes;
  const { el, icone, $, $$ } = U;
  NX.telas = NX.telas || {};

  /* ---------- Preferências (só neste navegador) ---------- */
  const CHAVE_PREF = "nexora-auto:preferencias";
  const PADRAO = { densidade: "confortavel", menuRecolhido: false, porPagina: 20, avisoDemoFechado: false, valoresCompactos: false };
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
  const DETALHES = { ordens: "ordem", orcamentos: "orcamento", clientes: "cliente", veiculos: "veiculo", estoque: "peca" };
  const montadas = new Set();
  let vistaAtual = null;
  let menuAtual = null;
  let chaveAtual = null;

  function criarVistas() {
    const ids = [...NX.SECOES.map((s) => s.id), ...Object.values(DETALHES), "sem-acesso"];
    U.trocar($("#vistas"), ...ids.map((id) => el("section", { class: "vista", id: `vista-${id}`, "data-vista": id, "aria-labelledby": `titulo-${id}`, hidden: true })));
  }
  function lerRota() {
    const [caminho, consulta] = location.hash.replace(/^#\/?/, "").split("?");
    const partes = caminho.split("/");
    const params = Object.fromEntries(new URLSearchParams(consulta || ""));
    if (DETALHES[partes[0]] && partes[1]) return { vista: DETALHES[partes[0]], menu: partes[0], id: decodeURIComponent(partes[1]), params };
    if (NX.SECOES.some((s) => s.id === partes[0])) return { vista: partes[0], menu: partes[0], params };
    return null;
  }

  function irPara(inicial) {
    let rota = lerRota();
    if (!rota) {
      history.replaceState(null, "", "#/painel");
      rota = lerRota();
    }
    const permitido = O.podeVer(rota.menu);
    const vista = permitido ? rota.vista : "sem-acesso";
    const chave = `${vista}:${rota.menu}:${rota.id || ""}`;
    const mudou = chave !== chaveAtual;
    vistaAtual = vista;
    menuAtual = rota.menu;
    chaveAtual = chave;
    const tela = NX.telas[vista];
    if (permitido) {
      if (tela.abrir) tela.abrir(rota.id);
      if (tela.aoEntrar) tela.aoEntrar(rota.params || {});
    } else tela.secao = rota.menu;
    if (Object.keys(rota.params || {}).length) history.replaceState(null, "", `#/${rota.menu}${rota.id ? `/${rota.id}` : ""}`);

    $$(".vista").forEach((v) => { v.hidden = v.dataset.vista !== vista; });
    $$(".menu__link, .nav-inferior a").forEach((a) => {
      if (a.dataset.rota === rota.menu) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    fecharMenuCelular();
    if (tela.abrir || vista === "sem-acesso") montadas.delete(vista);
    renderizar();
    const titulo = (tela.tituloDinamico && tela.tituloDinamico()) || tela.titulo;
    document.title = `${titulo} · NEXORA AUTO (demonstração)`;
    if (!inicial && mudou) {
      const secao = $(`#vista-${vista}`);
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

  NX.telas["sem-acesso"] = {
    titulo: "Sem acesso", secao: "painel",
    montar(secao) { this.el = secao; },
    atualizar() { U.trocar(this.el, C().cabecalho({ id: "sem-acesso", titulo: (NX.SECOES.find((s) => s.id === this.secao) || {}).nome || "Sem acesso" }), C().semAcesso(this.secao)); },
  };

  /* ---------- Menu lateral (conforme o perfil) ---------- */
  let assinaturaMenu = "";
  function montarMenu() {
    const visiveis = NX.SECOES.filter((s) => O.podeVer(s.id));
    const assinatura = visiveis.map((s) => s.id).join(",");
    if (assinatura !== assinaturaMenu) {
      assinaturaMenu = assinatura;
      const grupos = [...new Set(visiveis.map((s) => s.grupo))];
      U.trocar($("#menu"), ...grupos.flatMap((g) => [
        el("p", { class: "menu__grupo", "aria-hidden": "true", texto: g }),
        el("ul", {}, ...visiveis.filter((s) => s.grupo === g).map((s) => el("li", {}, el("a", { class: "menu__link", href: `#/${s.id}`, "data-rota": s.id, "data-dica": s.nome, title: document.body.classList.contains("menu-recolhido") ? s.nome : null },
          icone(s.icone, 18), el("span", { class: "menu__texto", texto: s.nome }), el("span", { class: `menu__conta${["orcamentos", "estoque"].includes(s.id) ? " menu__conta--alerta" : ""}`, id: `conta-${s.id}` }))))),
      ]));
      if (menuAtual) { const a = $(`.menu__link[data-rota="${menuAtual}"]`); if (a) a.setAttribute("aria-current", "page"); }
    }
    const contar = (id, n, titulo) => { const c = $(`#conta-${id}`); if (!c) return; c.textContent = n ? String(n) : ""; c.title = n ? titulo : ""; };
    const d = L.dados;
    const abertas = d.ordens.filter((os) => O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status)).length;
    contar("ordens", abertas, `${abertas} ordens em andamento`);
    const orc = d.orcamentos.filter((o) => O.statusOrc(o) === "aguardando_aprovacao").length;
    contar("orcamentos", orc, `${orc} orçamentos aguardando aprovação`);
    const hoje = d.agenda.filter((a) => a.data === U.hoje() && a.status !== "cancelado").length;
    contar("agenda", hoje, `${hoje} compromissos hoje`);
    const baixo = d.pecas.filter((p) => ["baixo", "zerado"].includes(O.situacaoPeca(p))).length;
    contar("estoque", baixo, `${baixo} peças com estoque baixo ou zerado`);
    const naoLidas = d.notificacoes.filter((n) => !n.lida).length;
    contar("notificacoes", naoLidas, `${naoLidas} notificações não lidas`);
  }

  /* ---------- Moldura: oficina, perfil, contadores ---------- */
  function atualizarMoldura() {
    const d = L.dados;
    const of = d.oficina;
    $("#empresa-nome").textContent = of.nome;
    $("#empresa-sub").textContent = d.demo && d.demo.historico !== undefined && of.razaoSocial.includes("fictícia") ? "Oficina fictícia" : (of.horarioTexto || "Oficina");
    U.trocar($("#empresa-avatar"), of.logo ? el("img", { src: of.logo, alt: "" }) : U.iniciais(of.nome));
    const p = O.perfilAtual();
    $("#avatar-topo").textContent = U.iniciais(d.perfil.nome);
    $("#topo-nome").textContent = d.perfil.nome;
    $("#topo-cargo").textContent = p.nome;
    $("#perfil-nome").textContent = d.perfil.nome;
    $("#perfil-cargo").textContent = `${p.nome} · ${p.descricao}`;
    U.trocar($("#lista-perfis"), ...NX.PERFIS.map((x) => el("button", { class: "suspenso__item perfil-opcao", type: "button", role: "menuitemradio", "aria-checked": String(x.id === p.id), "data-perfil": x.id, onclick: () => trocarPerfil(x.id) },
      el("span", { class: "perfil-opcao__marca", "aria-hidden": "true" }, x.id === p.id ? icone("check", 14) : null),
      el("span", { class: "perfil-opcao__texto" }, el("b", { texto: x.nome }), el("small", { texto: x.usuario })))));
    const podeAbrir = O.pode("os_abrir");
    $("#btn-novo").hidden = !podeAbrir;
    $("#nav-novo").hidden = !podeAbrir;
    $("#nav-inferior").classList.toggle("nav-inferior--quatro", !podeAbrir);
    $("#menu-config").hidden = !O.podeVer("configuracoes");
    $("#menu-restaurar").hidden = !O.pode("config");
    montarMenu();
    desenharNotificacoes();
  }

  async function trocarPerfil(id) {
    if (id === O.papel()) { fecharSuspensos(null); return; }
    const r = L.trocarPerfil(id);
    if (!r.ok) { U.aviso(r.erro, "erro"); return; }
    fecharSuspensos(null);
    montadas.clear();
    irPara(false);
    U.aviso(`Agora você está vendo o sistema como ${O.perfilAtual().nome} (${L.dados.perfil.nome}).`, "info");
  }
  NX.trocarPerfil = trocarPerfil;
  NX.abrirPerfis = () => { const b = $("#btn-usuario"); if ($("#menu-usuario").hidden) b.click(); const atual = $('#lista-perfis [aria-checked="true"]'); if (atual) atual.focus(); };

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
          const primeiro = menu.querySelector('[aria-checked="true"], [role="menuitem"], .notificacao, button:not(:disabled), a');
          if (primeiro) primeiro.focus();
        }
      });
      menu.addEventListener("keydown", (e) => {
        const itens = $$('[role="menuitem"]:not([hidden]), [role="menuitemradio"], .notificacao, #notif-marcar:not(:disabled), #notif-ver-todas', menu).filter((x) => x.offsetParent !== null);
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
      if (ids.length) O.marcarNotificacoesLidas(ids);
      const chaves = O.alertas().filter((a) => !a.visto).map((a) => a.chave);
      if (chaves.length) O.marcarAlertasVistos(chaves);
      U.aviso("Notificações marcadas como lidas.");
      $("#btn-notif").focus();
    });
    const novo = () => NX.form.novaOS();
    $("#btn-novo").addEventListener("click", novo);
    $("#nav-novo").addEventListener("click", novo);
    $$("[data-acao]").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.acao === "ajuda") $("#dlg-ajuda").showModal();
      if (b.dataset.acao === "restaurar") NX.restaurarDados();
    }));
  }

  /* ---------- Notificações e alertas (sino) ---------- */
  const ICONE_ALERTA = { estoque: "package", previsao: "clock", pronto: "car-front", orcamento: "hourglass" };
  function desenharNotificacoes() {
    const d = L.dados;
    const alertas = O.alertas().filter((a) => !a.visto && (a.tipo !== "estoque" || O.podeVer("estoque")) && (a.tipo !== "orcamento" || O.podeVer("orcamentos")));
    const naoLidas = d.notificacoes.filter((n) => !n.lida);
    const total = naoLidas.length + alertas.length;
    const conta = $("#notif-conta");
    conta.hidden = total === 0;
    conta.textContent = total > 9 ? "9+" : String(total);
    $("#btn-notif").setAttribute("aria-label", total ? `Notificações, ${total} novas` : "Notificações");
    $("#notif-marcar").disabled = total === 0;
    const itemAlerta = (a) => el("li", {}, el("button", { class: `notificacao notificacao--${a.tipo} is-nova`, type: "button", onclick: () => { O.marcarAlertasVistos([a.chave]); fecharSuspensos(null); NX.ir(a.rota); } },
      el("span", { class: "notificacao__icone" }, icone(ICONE_ALERTA[a.tipo] || "bell", 16)),
      el("span", { class: "notificacao__texto" }, el("b", { texto: a.titulo }), el("span", { texto: a.texto }))));
    const itemNotif = (n) => {
      const t = NX.TIPOS_NOTIFICACAO[n.tipo] || { nome: "Aviso", icone: "bell" };
      const rota = n.osId ? `ordens/${n.osId}` : n.orcId ? `orcamentos/${n.orcId}` : "notificacoes";
      return el("li", {}, el("button", { class: `notificacao notificacao--${n.tipo}${n.lida ? " is-vista" : " is-nova"}`, type: "button", onclick: () => { if (!n.lida) O.marcarNotificacoesLidas([n.id]); fecharSuspensos(null); NX.ir(rota); } },
        el("span", { class: "notificacao__icone" }, icone(t.icone, 16)),
        el("span", { class: "notificacao__texto" }, el("b", { texto: t.nome }), el("span", { texto: n.texto }), el("span", { texto: U.dataHoraCurta(n.em) })),
        n.lida ? null : el("span", { class: "vh", texto: "(não lida)" })));
    };
    const blocos = [];
    if (alertas.length) blocos.push(el("li", { class: "notificacoes__grupo", texto: "Precisa de atenção" }), ...alertas.slice(0, 4).map(itemAlerta));
    const recentes = [...naoLidas, ...d.notificacoes.filter((n) => n.lida)].slice(0, 6);
    if (recentes.length) blocos.push(el("li", { class: "notificacoes__grupo", texto: "Atividade recente" }), ...recentes.map(itemNotif));
    U.trocar($("#lista-notif"), ...(blocos.length ? blocos : [el("li", { class: "notificacoes__vazio", texto: "Nenhuma notificação por enquanto." })]));
  }

  /* ---------- Pesquisa global ---------- */
  function prepararBusca() {
    const campo = $("#busca-global");
    const caixa = $("#busca-resultados");
    const telaPequena = window.matchMedia("(max-width: 1279px)");
    const ajustarTexto = () => { campo.placeholder = telaPequena.matches ? "Pesquisar" : "Placa, cliente, telefone, nº da OS ou do orçamento, peça"; };
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
      const placaQ = L.limparPlaca(q);
      const grupos = [];
      if (O.podeVer("ordens")) grupos.push(["Ordens de serviço", d.ordens.filter((os) => U.contem(os.numero, q) || (dig.length >= 2 && os.numero.replace(/\D/g, "").includes(dig) && /^os/i.test(q)) || (placaQ.length >= 3 && (L.veiculo(os.veiculoId) || {}).placa.includes(placaQ))).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm)).slice(0, 5)
        .map((os) => ({ titulo: `${os.numero} · ${C().textoVeiculo(os.veiculoId)}`, sub: `${C().nomeDoCliente(os.clienteId)} · ${O.nomeStatus(os.status)}`, icone: "clipboard-list", abrir: () => NX.ir(`ordens/${os.id}`) }))]);
      if (O.podeVer("veiculos")) grupos.push(["Veículos", d.veiculos.filter((v) => (placaQ.length >= 2 && v.placa.includes(placaQ)) || U.contem(`${v.marca} ${v.modelo}`, q)).slice(0, 5)
        .map((v) => ({ titulo: `${L.mostrarPlaca(v.placa)} · ${v.marca} ${v.modelo}`, sub: `${C().nomeDoCliente(v.clienteId)} · ${U.numero(v.km)} km`, icone: "car", abrir: () => NX.ir(`veiculos/${v.id}`) }))]);
      if (O.podeVer("clientes")) grupos.push(["Clientes", d.clientes.filter((c) => U.contem(c.nome, q) || (dig.length >= 3 && c.telefone.includes(dig)) || (dig.length >= 3 && c.documento && c.documento.includes(dig)) || (q.includes("@") && U.contem(c.email, q))).slice(0, 5)
        .map((c) => ({ titulo: c.nome, sub: `${U.mascaraTelefone(c.telefone)} · ${L.veiculosDoCliente(c.id).length} veículo(s)`, icone: "user", abrir: () => NX.ir(`clientes/${c.id}`) }))]);
      if (O.podeVer("orcamentos")) grupos.push(["Orçamentos", d.orcamentos.filter((o) => U.contem(o.numero, q)).slice(0, 4)
        .map((o) => ({ titulo: `${O.rotuloOrc(o)} · ${C().nomeDoCliente(o.clienteId)}`, sub: `${U.moeda(O.totaisOrc(o).total)} · ${(NX.STATUS_ORC.find((s) => s.id === O.statusOrc(o)) || {}).nome}`, icone: "file-text", abrir: () => NX.ir(`orcamentos/${o.id}`) }))]);
      if (O.podeVer("pecas")) grupos.push(["Peças", d.pecas.filter((p) => U.contem(p.nome, q) || U.contem(p.sku, q)).slice(0, 4)
        .map((p) => ({ titulo: `${p.sku} · ${p.nome}`, sub: `Saldo ${O.saldo(p.id)} · disponível ${O.disponivel(p.id)}${p.status === "ativo" ? "" : " · inativa"}`, icone: "package", abrir: () => NX.ir(O.podeVer("estoque") ? `estoque/${p.id}` : "pecas") }))]);
      if (O.podeVer("servicos")) grupos.push(["Serviços", d.servicos.filter((s) => U.contem(s.nome, q) || U.contem(s.codigo, q)).slice(0, 3)
        .map((s) => ({ titulo: `${s.codigo} · ${s.nome}`, sub: `${U.moeda(s.preco)} · ${s.tempo} min${s.status === "ativo" ? "" : " · inativo"}`, icone: "wrench", abrir: () => NX.ir("servicos") }))]);
      const comResultado = grupos.filter(([, lista]) => lista.length);
      itens = [];
      const filhos = comResultado.map(([titulo, lista]) => el("div", { class: "busca__grupo", role: "group", "aria-label": titulo },
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
    $("#menu").addEventListener("click", (e) => { if (e.target.closest(".menu__link")) fecharMenuCelular(false); });
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
    if (!O.pode("config")) { U.aviso(O.negar("config").erro, "erro"); return; }
    const ok = await U.confirmar({
      titulo: "Restaurar os dados de exemplo?",
      texto: "Todas as alterações feitas nesta demonstração serão perdidas: ordens, orçamentos, clientes, veículos, estoque, agenda, recebimentos, despesas e configurações voltam ao estado inicial (um histórico de exemplo novo é montado a partir de hoje). Esta ação não pode ser desfeita.",
      rotulo: "Restaurar dados", perigo: true,
      exigirCiencia: "Entendo que as alterações feitas nesta demonstração serão perdidas.",
    });
    if (!ok) return;
    ["dlg-detalhe", "dlg-form"].forEach((id) => { const dl = $(`#${id}`); if (dl.open) dl.close(); });
    Object.values(NX.telas).forEach((t) => { if (t.reiniciar) t.reiniciar(); });
    L.restaurar();
    montadas.clear();
    irPara(false);
    U.aviso("Dados de exemplo restaurados.");
  };
  function prepararAjuda() {
    $("#btn-ajuda").addEventListener("click", () => $("#dlg-ajuda").showModal());
    $$("[data-ajuda]").forEach((b) => b.addEventListener("click", () => {
      $("#dlg-ajuda").close();
      const acao = b.dataset.ajuda;
      if (acao === "nova-os") setTimeout(() => (O.pode("os_abrir") ? NX.form.novaOS() : U.aviso(O.negar("os_abrir").erro, "erro")), 30);
      if (acao === "aprovacao") NX.ir("orcamentos?status=aguardando_aprovacao");
      if (acao === "perfis") setTimeout(() => NX.abrirPerfis(), 30);
    }));
  }

  /* ---------- Início ---------- */
  function iniciar() {
    criarVistas();
    try {
      L.carregar();
    } catch (erro) {
      $("#carregando").hidden = true;
      $("#erro-carga").hidden = false;
      $("#erro-carga-texto").textContent = `Algo deu errado ao ler os dados salvos neste navegador (${erro.message}). Restaurar os dados de exemplo resolve.`;
      $("#erro-carga-restaurar").addEventListener("click", () => { try { localStorage.removeItem("nexora-auto:dados"); } catch (e) { /* ignora */ } location.reload(); });
      return;
    }
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
    if (NX.ultimoErroDemo) U.aviso("O histórico de exemplo não pôde ser montado; o sistema abriu só com os cadastros.", "erro");
    // O relógio anda: a cada minuto a tela é refeita (previsões vencidas, agenda, orçamentos que vencem)
    let minuto = U.agora();
    setInterval(() => {
      if (U.agora() === minuto) return;
      minuto = U.agora();
      if (!$("dialog[open]") && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("input, textarea, select"))) renderizar();
    }, 15000);
  }
  document.addEventListener("DOMContentLoaded", iniciar);
})();
