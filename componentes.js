/* ==========================================================================
   NEXORA AUTO — componentes.js
   Peças de interface reaproveitadas pelas telas: cabeçalho de página,
   cartão de gráfico, etiquetas de status, placa, nomes com link, tabelas,
   paginação, filtros, seletor de período, estado vazio e a janela de
   mensagem para o cliente (texto pronto; nada é enviado sozinho).
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const { el, icone, $ } = U;

  NX.ir = (rota) => { if (location.hash !== `#/${rota}`) location.hash = `#/${rota}`; else window.dispatchEvent(new HashChangeEvent("hashchange")); };

  function botao(rotulo, classe, aoClicar, nomeIcone, extra = {}) {
    return el("button", { class: `btn ${classe}`, type: "button", onclick: aoClicar, ...extra }, nomeIcone ? icone(nomeIcone, 16) : null, el("span", { texto: rotulo }));
  }
  // Botão que só aparece se o perfil pode fazer a ação
  const botaoSe = (acao, ...args) => (O.pode(acao) ? botao(...args) : null);

  function cabecalho({ id, titulo, sub, acoes = [], antes, etiquetas }) {
    return el("header", { class: "pagina__cabeca" },
      el("div", { class: "pagina__titulos" },
        antes || null,
        el("h1", { class: "pagina__titulo", id: `titulo-${id}`, tabindex: "-1", texto: titulo }),
        sub ? el("p", { class: "pagina__sub", texto: sub }) : null,
        etiquetas ? el("div", { class: "pagina__etiquetas" }, ...etiquetas.filter(Boolean)) : null),
      acoes.filter(Boolean).length ? el("div", { class: "pagina__acoes" }, ...acoes.filter(Boolean)) : null);
  }
  const voltar = (rota, rotulo) => el("a", { class: "voltar", href: `#/${rota}` }, icone("arrow-left", 15), rotulo);

  // Cartão de gráfico com botão para alternar entre gráfico e tabela
  function cartaoGrafico({ titulo, sub, classe = "", acoes = [], legenda }) {
    const area = el("div", { class: "grafico__area" });
    const tabela = el("div", { class: "grafico__tabela", hidden: true });
    const alternar = el("button", { class: "link-btn grafico__alternar", type: "button", "aria-pressed": "false" }, icone("table", 15), el("span", { texto: "Tabela" }));
    alternar.addEventListener("click", () => {
      const ver = alternar.getAttribute("aria-pressed") !== "true";
      alternar.setAttribute("aria-pressed", String(ver));
      alternar.querySelector("span").textContent = ver ? "Gráfico" : "Tabela";
      tabela.hidden = !ver;
      area.hidden = ver;
    });
    const cartao = el("article", { class: `cartao grafico ${classe}` },
      el("div", { class: "cartao__cabeca" },
        el("div", {}, el("h2", { class: "cartao__titulo", texto: titulo }), el("p", { class: "cartao__sub", texto: sub || "" })),
        el("div", { class: "cartao__acoes" }, ...acoes, alternar)),
      legenda || null, area, tabela);
    return { cartao, area, tabela, definirSub(t) { cartao.querySelector(".cartao__sub").textContent = t; } };
  }
  const legenda = (itens) => el("ul", { class: "legenda" }, ...itens.map(([classe, texto]) => el("li", {}, el("i", { class: `chave ${classe}` }), texto)));

  /* ---------- Etiquetas ---------- */
  const pilula = (texto, classe, nomeIcone, titulo) => el("span", { class: `pilula pilula--${classe}`, title: titulo || null }, nomeIcone ? icone(nomeIcone, 13) : null, texto);
  const pilulaTom = (texto, tom, nomeIcone, titulo) => pilula(texto, `tom-${tom}`, nomeIcone, titulo);
  function pilulaOS(status, { curto } = {}) {
    const s = NX.STATUS_OS.find((x) => x.id === status) || { nome: status, tom: "neutro", icone: "circle" };
    return pilulaTom(curto ? s.curto : s.nome, s.tom, s.icone, s.nome);
  }
  function pilulaOrc(o) {
    const st = O.statusOrc(o);
    const s = NX.STATUS_ORC.find((x) => x.id === st) || { nome: st, tom: "neutro", icone: "circle" };
    return pilulaTom(s.nome, s.tom, s.icone);
  }
  function pilulaFin(os) {
    const sit = O.situacaoFinanceira(os);
    const s = NX.SITUACOES_FINANCEIRAS.find((x) => x.id === sit);
    return pilulaTom(s.nome, s.tom, { pago: "circle-dollar-sign", a_receber: "clock", parcial: "clock", a_faturar: "receipt" }[sit] || null);
  }
  function pilulaAgenda(status) {
    const s = NX.STATUS_AGENDA.find((x) => x.id === status) || { nome: status, tom: "neutro" };
    return pilulaTom(s.nome, s.tom);
  }
  const pilulaExemplo = (reg) => (reg && reg.ficticio ? el("span", { class: "selo-exemplo", title: "Registro de exemplo (fictício)" }, "Exemplo") : null);
  const ESTADOS_PECA = {
    prevista: ["No orçamento", "neutro", "Ainda não mexe no estoque"],
    reservada: ["Reservada", "info", "Separada no estoque para esta ordem (ainda não saiu)"],
    falta: ["Em falta", "atencao", "Sem quantidade disponível: a ordem aguarda a entrada da peça"],
    baixada: ["Baixada", "ok", "Saiu do estoque uma única vez, na finalização do serviço"],
    liberada: ["Liberada", "fim", "A reserva foi desfeita (ordem cancelada ou orçamento substituído)"],
  };
  const pilulaPeca = (estado) => { const e = ESTADOS_PECA[estado] || [estado, "neutro"]; return pilulaTom(e[0], e[1], null, e[2]); };
  function pilulaSituacaoPeca(p) {
    const s = O.situacaoPeca(p);
    return { normal: pilulaTom("Normal", "ok"), baixo: pilulaTom("Estoque baixo", "atencao", "triangle-alert"), zerado: pilulaTom("Sem estoque", "perigo", "circle-alert"), inativo: pilulaTom("Inativa", "fim") }[s];
  }
  const pilulaAtivo = (status) => (status === "ativo" ? pilula("Ativo", "ativo") : pilula("Inativo", "inativo"));

  /* ---------- Placa, veículo, cliente e técnico ---------- */
  const placa = (p) => el("span", { class: "placa", title: "Placa (identifica o veículo; não comprova quem é o dono)" }, L.mostrarPlaca(p || ""));
  function nomeVeiculo(vid, { link = true, sub } = {}) {
    const v = L.veiculo(vid);
    if (!v) return el("span", { class: "suave", texto: "Veículo removido" });
    const corpo = [placa(v.placa), el("span", { class: "veiculo__texto" }, el("b", { texto: `${v.marca} ${v.modelo}` }), el("span", { class: "suave", texto: sub || `${v.anoFab}/${v.anoModelo} · ${v.cor || "cor não informada"}` }))];
    return link && O.podeVer("veiculos") ? el("a", { class: "veiculo", href: `#/veiculos/${v.id}` }, ...corpo) : el("span", { class: "veiculo" }, ...corpo);
  }
  function nomeCliente(cid, { link = true, sub } = {}) {
    const c = L.cliente(cid);
    if (!c) return el("span", { class: "suave", texto: "Cliente removido" });
    const podeContato = O.podeVer("clientes");
    const corpo = [el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c.nome) }), el("span", {}, el("b", { texto: c.nome }), el("span", { class: "suave", texto: sub || (podeContato ? U.mascaraTelefone(c.telefone) : c.tipo === "pj" ? "Empresa" : "Pessoa física") }))];
    return link && podeContato ? el("a", { class: "nome-btn", href: `#/clientes/${c.id}` }, ...corpo) : el("span", { class: "nome-btn" }, ...corpo);
  }
  const nomeDoCliente = (cid) => (L.cliente(cid) || { nome: "Cliente removido" }).nome;
  const textoVeiculo = (vid) => { const v = L.veiculo(vid); return v ? `${L.mostrarPlaca(v.placa)} · ${v.marca} ${v.modelo}` : "Veículo removido"; };
  function avatarProf(m, tamanho = "") {
    if (!m) return el("span", { class: "avatar-prof prof", "aria-hidden": "true", texto: "?" });
    return el("span", { class: `avatar-prof prof prof--${m.cor ?? 0}${tamanho ? ` avatar-prof--${tamanho}` : ""}${m.status !== "ativo" ? " is-inativo" : ""}`, "aria-hidden": "true", texto: U.iniciais(m.nome) });
  }
  function nomeTecnico(tid, { curto, vazio = "Sem técnico" } = {}) {
    const m = tid ? L.membro(tid) : null;
    if (!m) return el("span", { class: "suave", texto: vazio });
    return el("span", { class: `nome-prof prof prof--${m.cor ?? 0}` }, avatarProf(m, "p"), el("span", { texto: curto ? m.nome.split(" ")[0] : m.nome }), m.status !== "ativo" ? el("small", { class: "suave", texto: "(inativo)" }) : null);
  }
  const nomeDoTecnico = (tid) => (tid && L.membro(tid) ? L.membro(tid).nome : "—");

  // Linha compacta de OS (painel, ficha do cliente e do veículo)
  function linhaOS(os, { mostrarCliente = true } = {}) {
    const v = L.veiculo(os.veiculoId);
    const atrasada = os.previsao && O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status) && os.previsao < U.agora();
    return el("a", { class: "os-linha", href: `#/ordens/${os.id}`, "data-foco": `os-${os.id}` },
      el("span", { class: "os-linha__num mono", texto: os.numero }),
      el("span", { class: "os-linha__texto" },
        el("b", {}, v ? placa(v.placa) : null, ` ${v ? `${v.marca} ${v.modelo}` : ""}`),
        el("small", { texto: [mostrarCliente ? nomeDoCliente(os.clienteId) : null, os.previsao && O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status) ? `${atrasada ? "previsão vencida" : "previsão"} ${U.dataHoraCurta(os.previsao)}` : U.dataCurta(os.abertaEm)].filter(Boolean).join(" · ") })),
      pilulaOS(os.status, { curto: true }));
  }

  /* ---------- Estado vazio e "sem acesso" ---------- */
  function vazio({ icone: nomeIcone = "inbox", titulo, texto, acao }) {
    return el("div", { class: "vazio" },
      el("span", { class: "vazio__icone" }, icone(nomeIcone, 22)),
      el("p", { class: "vazio__titulo", texto: titulo }),
      texto ? el("p", { texto }) : null,
      acao || null);
  }
  function semAcesso(secao) {
    const s = NX.SECOES.find((x) => x.id === secao) || { nome: "esta área" };
    const quem = NX.PERFIS.filter((p) => p.secoes === "*" || p.secoes.includes(secao)).map((p) => p.nome).join(", ");
    return el("div", { class: "cartao sem-acesso" }, vazio({
      icone: "lock", titulo: `O perfil ${O.perfilAtual().nome} não acessa "${s.nome}"`,
      texto: `Quem pode: ${quem}. Os perfis desta demonstração são uma simulação no navegador para mostrar as permissões; num sistema publicado, isso seria controlado por login no servidor.`,
      acao: botao("Trocar de perfil", "btn--linha", () => NX.abrirPerfis && NX.abrirPerfis(), "user-cog"),
    }));
  }

  /* ---------- Paginação ---------- */
  function paginar(lista, pagina, porPagina) {
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const atual = Math.min(Math.max(1, pagina), paginas);
    return { itens: lista.slice((atual - 1) * porPagina, atual * porPagina), pagina: atual, paginas, total: lista.length, inicio: lista.length ? (atual - 1) * porPagina + 1 : 0, fim: Math.min(atual * porPagina, lista.length) };
  }
  function paginacao(res, { aoMudar, porPagina, aoMudarTamanho, nome = "itens" }) {
    if (!res.total) return null;
    const tamanho = el("select", { class: "seletor", "aria-label": "Itens por página", "data-foco": `pag-tamanho-${nome}` }, ...[10, 20, 50].map((n) => el("option", { value: String(n), texto: `${n} por página` })));
    tamanho.value = String(porPagina);
    tamanho.addEventListener("change", () => aoMudarTamanho(Number(tamanho.value)));
    const ir = (p) => () => aoMudar(p);
    return el("nav", { class: "paginacao", "aria-label": `Paginação de ${nome}` },
      el("span", { texto: `${U.numero(res.inicio)}–${U.numero(res.fim)} de ${U.numero(res.total)}` }),
      el("div", { class: "paginacao__botoes" },
        el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": "Primeira página", disabled: res.pagina === 1, onclick: ir(1), "data-foco": `pag-primeira-${nome}` }, icone("chevrons-left", 16)),
        el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": "Página anterior", disabled: res.pagina === 1, onclick: ir(res.pagina - 1), "data-foco": `pag-anterior-${nome}` }, icone("chevron-left", 16)),
        el("span", { class: "paginacao__atual", "aria-live": "polite", texto: `Página ${res.pagina} de ${res.paginas}` }),
        el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": "Próxima página", disabled: res.pagina === res.paginas, onclick: ir(res.pagina + 1), "data-foco": `pag-proxima-${nome}` }, icone("chevron-right", 16)),
        el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": "Última página", disabled: res.pagina === res.paginas, onclick: ir(res.paginas), "data-foco": `pag-ultima-${nome}` }, icone("chevrons-right", 16))),
      tamanho);
  }
  // Tabela paginada com estado guardado na tela (pagina)
  function blocoPaginado(estado, lista, nome, desenhar) {
    const porPagina = NX.preferencias.porPagina;
    const res = paginar(lista, estado.pagina || 1, porPagina);
    estado.pagina = res.pagina;
    return { res, nav: paginacao(res, { nome, porPagina, aoMudar: (p) => { estado.pagina = p; desenhar(); }, aoMudarTamanho: (n) => { estado.pagina = 1; NX.salvarPreferencias({ porPagina: n }); } }) };
  }

  /* ---------- Cabeçalho de coluna que ordena ---------- */
  function thOrdenavel(rotulo, campo, estado, aoMudar, classe = "") {
    const ativo = estado.ordem === campo;
    const th = el("th", { scope: "col", class: classe, "aria-sort": ativo ? (estado.direcao === "asc" ? "ascending" : "descending") : "none" });
    const b = el("button", { class: "ordenar", type: "button", "data-foco": `ordem-${campo}`, onclick: () => {
      estado.direcao = ativo ? (estado.direcao === "asc" ? "desc" : "asc") : (["nome", "placa", "sku", "codigo"].includes(campo) ? "asc" : "desc");
      estado.ordem = campo;
      aoMudar();
    } }, rotulo, icone(ativo ? "chevron-down" : "arrow-up-down", 14));
    if (ativo && estado.direcao === "asc") b.querySelector(".ic").classList.add("ic--cima");
    th.append(b);
    return th;
  }
  function ordenar(lista, estado, chaves) {
    const f = chaves[estado.ordem];
    if (!f) return lista;
    const dir = estado.direcao === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => { const x = f(a); const y = f(b); return (typeof x === "string" ? x.localeCompare(y, "pt-BR") : x - y) * dir; });
  }

  /* ---------- Seletor de período ---------- */
  const PERIODOS = [
    { id: "hoje", rotulo: "Hoje" }, { id: "7d", rotulo: "7 dias" }, { id: "30d", rotulo: "30 dias" }, { id: "90d", rotulo: "90 dias" },
    { id: "mes", rotulo: "Este mês" }, { id: "mes-anterior", rotulo: "Mês anterior" }, { id: "tudo", rotulo: "Tudo" }, { id: "personalizado", rotulo: "Personalizado" },
  ];
  const PADRAO_IDS = ["7d", "30d", "90d", "mes", "mes-anterior", "personalizado"];
  function intervalo(periodo) {
    const hoje = U.hoje();
    if (periodo.id === "hoje") return { de: hoje, ate: hoje };
    if (periodo.id === "7d") return { de: U.somarDias(hoje, -6), ate: hoje };
    if (periodo.id === "30d") return { de: U.somarDias(hoje, -29), ate: hoje };
    if (periodo.id === "90d") return { de: U.somarDias(hoje, -89), ate: hoje };
    if (periodo.id === "mes") return { de: U.inicioDoMes(hoje), ate: U.fimDoMes(hoje) };
    if (periodo.id === "mes-anterior") { const ini = U.somarMeses(hoje, -1); return { de: ini, ate: U.fimDoMes(ini) }; }
    if (periodo.id === "tudo") return { de: "2000-01-01", ate: U.somarDias(hoje, 400), tudo: true };
    return { de: periodo.de, ate: periodo.ate };
  }
  const descreverPeriodo = ({ de, ate, tudo }) => (tudo ? "todo o período" : de === ate ? U.dataCompleta(de) : `${U.dataCompleta(de)} a ${U.dataCompleta(ate)}`);
  function seletorPeriodo(estado, aoMudar, { ids = PADRAO_IDS, nome = "periodo" } = {}) {
    const caixa = el("div", { class: "barra-periodo" });
    const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Período" });
    const limite = U.somarDias(U.hoje(), 366);
    const de = el("input", { type: "date", "aria-label": "Data inicial", value: estado.de || U.somarDias(U.hoje(), -29), max: limite, "data-foco": `${nome}-de` });
    const ate = el("input", { type: "date", "aria-label": "Data final", value: estado.ate || U.hoje(), max: limite, "data-foco": `${nome}-ate` });
    const erro = el("p", { class: "campo__erro", role: "alert" });
    const pers = el("div", { class: "periodo-personalizado", hidden: estado.id !== "personalizado" }, "De", de, "até", ate, erro);
    const aplicar = () => {
      erro.textContent = "";
      if (!U.dataValida(de.value) || !U.dataValida(ate.value)) { erro.textContent = "Informe as duas datas."; return; }
      if (de.value > ate.value) { erro.textContent = "A data inicial precisa ser anterior à final."; return; }
      if (U.diasEntre(de.value, ate.value) > 730) { erro.textContent = "Escolha um período de até 2 anos."; return; }
      Object.assign(estado, { de: de.value, ate: ate.value });
      aoMudar();
    };
    de.addEventListener("change", aplicar);
    ate.addEventListener("change", aplicar);
    PERIODOS.filter((p) => ids.includes(p.id)).forEach((p) => {
      seg.append(el("button", { type: "button", "aria-pressed": String(estado.id === p.id), "data-foco": `${nome}-${p.id}`, texto: p.rotulo, onclick: () => {
        estado.id = p.id;
        if (p.id !== "personalizado") { const r = intervalo(p); estado.de = r.de; estado.ate = r.ate; }
        else { estado.de = de.value; estado.ate = ate.value; }
        aoMudar();
      } }));
    });
    caixa.append(seg, pers);
    return caixa;
  }
  const intervaloDe = (estado) => (estado.id === "personalizado" && estado.de && estado.ate ? { de: estado.de, ate: estado.ate } : intervalo(PERIODOS.find((x) => x.id === estado.id) || PERIODOS[2]));
  // Divide o período em dias, semanas ou meses (para os gráficos)
  function baldes({ de, ate, tudo }) {
    let ini = de;
    if (tudo) ini = U.somarDias(U.hoje(), -179);
    const fim = ate > U.hoje() ? U.hoje() : ate;
    const dias = U.diasEntre(ini, fim) + 1;
    const lista = [];
    if (dias <= 31) for (let d = ini; d <= fim; d = U.somarDias(d, 1)) lista.push({ de: d, ate: d, rotulo: U.dataCurta(d) });
    else if (dias <= 120) {
      for (let d = ini; d <= fim; d = U.somarDias(d, 7)) { const a = U.somarDias(d, 6) > fim ? fim : U.somarDias(d, 6); lista.push({ de: d, ate: a, rotulo: U.dataCurta(d), longo: `${U.dataCurta(d)} a ${U.dataCurta(a)}` }); }
    } else for (let m = U.inicioDoMes(ini); m <= fim; m = U.somarMeses(m, 1)) lista.push({ de: m < ini ? ini : m, ate: U.fimDoMes(m) > fim ? fim : U.fimDoMes(m), rotulo: `${U.mesAno(m).slice(0, 3)}/${m.slice(2, 4)}`, longo: U.mesAno(m) });
    return { lista, unidade: dias <= 31 ? "dia" : dias <= 120 ? "semana" : "mês" };
  }

  // Célula de tabela com rótulo (vira cartão no celular)
  const td = (rotulo, conteudo, classe = "") => el("td", { "data-rotulo": rotulo, class: classe }, conteudo);

  /* ---------- Seletores ---------- */
  function seletor(opcoes, valor, aoMudar, { rotulo, foco } = {}) {
    const s = el("select", { class: "seletor", "aria-label": rotulo, "data-foco": foco });
    const grupos = new Map();
    opcoes.forEach((o) => {
      const op = el("option", { value: o.valor, texto: o.rotulo });
      if (o.grupo) {
        if (!grupos.has(o.grupo)) { const g = el("optgroup", { label: o.grupo }); grupos.set(o.grupo, g); s.append(g); }
        grupos.get(o.grupo).append(op);
      } else s.append(op);
    });
    s.value = valor ?? "";
    s.addEventListener("change", () => aoMudar(s.value));
    return s;
  }
  const opcoesTecnicos = ({ todos, incluirInativos } = {}) => [
    ...(todos ? [{ valor: "", rotulo: todos }] : []),
    ...L.dados.equipe.filter((m) => m.tecnico && (incluirInativos || m.status === "ativo")).map((m) => ({ valor: m.id, rotulo: m.status === "ativo" ? m.nome : `${m.nome} (inativo)` })),
  ];
  const opcoesClientes = () => [...L.dados.clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => ({ valor: c.id, rotulo: `${c.nome} · ${U.mascaraTelefone(c.telefone)}` }));
  const opcoesVeiculos = (cid) => L.dados.veiculos.filter((v) => !cid || v.clienteId === cid).map((v) => ({ valor: v.id, rotulo: `${L.mostrarPlaca(v.placa)} · ${v.marca} ${v.modelo}` }));
  const opcoesServicos = () => L.dados.servicos.filter((s) => s.status === "ativo").map((s) => ({ valor: s.id, rotulo: `${s.codigo} · ${s.nome} — ${U.moeda(s.preco)}`, grupo: s.categoria }));
  const opcoesPecas = () => L.dados.pecas.filter((p) => p.status === "ativo").map((p) => ({ valor: p.id, rotulo: `${p.sku} · ${p.nome} — ${U.moeda(p.preco)} (disp. ${O.disponivel(p.id)})`, grupo: p.categoria }));

  // Chips de filtro com contagem
  function chips(opcoes, valor, aoMudar, { rotulo = "Filtro", nome = "chip" } = {}) {
    return el("div", { class: "chips", role: "group", "aria-label": rotulo }, ...opcoes.map((o) => el("button", { class: "chip", type: "button", "aria-pressed": String(o.valor === valor), "data-foco": `${nome}-${o.valor || "todos"}`, onclick: () => aoMudar(o.valor) },
      o.icone ? icone(o.icone, 14) : null, o.rotulo, o.n != null ? el("span", { class: "chip__n", texto: U.numero(o.n) }) : null)));
  }

  // Redesenha mantendo o foco no mesmo controle (os filtros são recriados a cada mudança)
  function comFoco(fn) {
    return (...args) => {
      const ativo = document.activeElement;
      const foco = ativo && ativo.dataset ? ativo.dataset.foco : null;
      const r = fn(...args);
      if (foco && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
        const alvo = document.querySelector(`[data-foco="${CSS.escape(foco)}"]`);
        if (alvo) alvo.focus({ preventScroll: true });
      }
      return r;
    };
  }
  // Campo de busca criado uma vez só (não é recriado enquanto a pessoa digita)
  function campoBusca({ placeholder, rotulo, foco, valor, aoMudar }) {
    const i = el("input", { class: "campo-busca", type: "search", placeholder, "aria-label": rotulo, value: valor || "", "data-foco": foco });
    let espera;
    i.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(() => aoMudar(i.value), 180); });
    return { caixa: el("div", { class: "barra-filtros__busca" }, icone("search", 16), i), input: i };
  }

  /* ---------- Janela livre ---------- */
  function janela({ tipo = "", titulo, corpo, botoes = [], larga = false }) {
    const dlg = $("#dlg-detalhe");
    dlg.classList.toggle("janela--larga", !!larga);
    $("#detalhe-tipo").textContent = tipo;
    $("#detalhe-titulo").textContent = titulo;
    $("#detalhe-erro").textContent = "";
    U.trocar($("#detalhe-corpo"), corpo);
    U.trocar($("#detalhe-botoes"), ...botoes);
    if (!dlg.open) dlg.showModal();
    return { dlg, erro: (t) => { $("#detalhe-erro").textContent = t || ""; }, fechar: () => dlg.close() };
  }

  /* ---------- Mensagem para o cliente (texto pronto) ---------- */
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) {
      const t = el("textarea", { style: { position: "fixed", opacity: "0" } });
      t.value = texto; document.body.append(t); t.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (erro) { ok = false; }
      t.remove();
      return ok;
    }
  }
  function mensagemCliente({ titulo, texto, clienteId }) {
    const c = L.cliente(clienteId);
    const link = O.linkWhatsapp(clienteId, texto);
    const area = el("textarea", { class: "mensagem-editar", rows: 6, "aria-label": "Texto da mensagem" });
    area.value = texto;
    const nota = c && c.ficticio
      ? el("p", { class: "nota-info" }, icone("info", 16), el("span", {}, "Este é um cliente de ", el("b", { texto: "exemplo" }), ": o telefone é fictício, então o botão do WhatsApp fica desligado. Com um cliente real, o botão abre o WhatsApp com o texto pronto e ", el("b", { texto: "você decide se envia" }), "."))
      : el("p", { class: "nota-info" }, icone("info", 16), el("span", {}, "O sistema não envia nada sozinho: o botão abre o WhatsApp com o texto pronto e o envio é feito por você."));
    const j = janela({
      tipo: "Mensagem para o cliente", titulo, corpo: el("div", { class: "mensagem-caixa" }, c ? el("p", { class: "suave", texto: `Para: ${c.nome} · ${U.mascaraTelefone(c.telefone)}` }) : null, area, nota),
      botoes: [
        botao("Copiar texto", "btn--linha", async () => { U.aviso((await copiar(area.value)) ? "Texto copiado." : "Não foi possível copiar. Selecione o texto e copie manualmente.", "info"); }, "copy"),
        link ? el("a", { class: "btn btn--primario", href: O.linkWhatsapp(clienteId, area.value), target: "_blank", rel: "noopener", onclick: (e) => { e.currentTarget.href = O.linkWhatsapp(clienteId, area.value); } }, icone("message-circle", 16), "Abrir no WhatsApp")
          : el("button", { class: "btn btn--primario", type: "button", disabled: true, title: "Desligado para clientes de exemplo" }, icone("message-circle", 16), "Abrir no WhatsApp"),
      ],
    });
    area.focus();
    return j;
  }

  NX.componentes = {
    botao, botaoSe, cabecalho, voltar, cartaoGrafico, legenda,
    pilula, pilulaTom, pilulaOS, pilulaOrc, pilulaFin, pilulaAgenda, pilulaExemplo, pilulaPeca, pilulaSituacaoPeca, pilulaAtivo, ESTADOS_PECA,
    placa, nomeVeiculo, nomeCliente, nomeDoCliente, textoVeiculo, avatarProf, nomeTecnico, nomeDoTecnico, linhaOS,
    vazio, semAcesso, paginar, paginacao, blocoPaginado, thOrdenavel, ordenar,
    PERIODOS, intervalo, intervaloDe, descreverPeriodo, seletorPeriodo, baldes, td,
    seletor, opcoesTecnicos, opcoesClientes, opcoesVeiculos, opcoesServicos, opcoesPecas, chips, comFoco, campoBusca,
    janela, copiar, mensagemCliente,
  };
})();
