/* ==========================================================================
   NEXORA BOOKING — componentes.js
   Peças de interface reaproveitadas pelas telas: cabeçalho de página,
   cartão de gráfico, etiquetas de status, avatar e cor do profissional,
   linha de reserva, paginação, estado vazio e seletor de período.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;

  NX.ir = (rota) => { if (location.hash !== `#/${rota}`) location.hash = `#/${rota}`; else window.dispatchEvent(new HashChangeEvent("hashchange")); };

  function botao(rotulo, classe, aoClicar, nomeIcone, extra = {}) {
    return el("button", { class: `btn ${classe}`, type: "button", onclick: aoClicar, ...extra }, nomeIcone ? icone(nomeIcone, 16) : null, el("span", { texto: rotulo }));
  }

  function cabecalho({ id, titulo, sub, acoes = [], antes, etiquetas }) {
    return el("header", { class: "pagina__cabeca" },
      el("div", { class: "pagina__titulos" },
        antes || null,
        el("h1", { class: "pagina__titulo", id: `titulo-${id}`, tabindex: "-1", texto: titulo }),
        sub ? el("p", { class: "pagina__sub", texto: sub }) : null,
        etiquetas ? el("div", { class: "pagina__etiquetas" }, ...etiquetas) : null),
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

  /* ---------- Status e etiquetas ---------- */
  const CURTO = { em_atendimento: "Atendendo", nao_compareceu: "Faltou" };
  function pilulaStatus(status, { curto } = {}) {
    const s = NX.STATUS.find((x) => x.id === status) || { nome: status, icone: "circle" };
    return el("span", { class: `pilula pilula--${status}`, title: s.nome }, icone(s.icone, 13), curto && CURTO[status] ? CURTO[status] : s.nome);
  }
  const pilula = (texto, classe, nomeIcone) => el("span", { class: `pilula pilula--${classe}` }, nomeIcone ? icone(nomeIcone, 13) : null, texto);
  const pilulaPagamento = (a) => (a.status !== "concluido" ? null : a.pagamento ? pilula("Pago", "pago", "circle-dollar-sign") : pilula("A receber", "areceber", "clock"));
  const iconeStatus = (status) => icone((NX.STATUS.find((x) => x.id === status) || {}).icone || "circle", 14);

  /* ---------- Profissionais e clientes ---------- */
  function avatarProf(p, tamanho = "") {
    if (!p) return el("span", { class: "avatar-prof prof", "aria-hidden": "true", texto: "?" });
    const a = el("span", { class: `avatar-prof prof prof--${p.cor ?? 0}${tamanho ? ` avatar-prof--${tamanho}` : ""}${p.status !== "ativo" ? " is-inativo" : ""}`, "aria-hidden": "true" });
    if (p.foto) a.append(el("img", { src: p.foto, alt: "" })); else a.textContent = U.iniciais(p.nome);
    return a;
  }
  function nomeProf(pid, { curto } = {}) {
    const p = L.profissional(pid);
    if (!p) return el("span", { class: "suave", texto: "Profissional removido" });
    return el("span", { class: `nome-prof prof prof--${p.cor ?? 0}` }, avatarProf(p, "p"), el("span", { texto: curto ? p.nome.split(" ")[0] : p.nome }), p.status !== "ativo" ? el("small", { class: "suave", texto: "(inativo)" }) : null);
  }
  const corProf = (pid) => { const p = L.profissional(pid); return `prof prof--${p ? p.cor ?? 0 : 0}`; };
  function nomeCliente(cid, { link = true, sub } = {}) {
    const c = L.cliente(cid);
    if (!c) return el("span", { class: "suave", texto: "Cliente removido" });
    const corpo = [el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c.nome) }), el("span", {}, el("b", { texto: c.nome }), el("span", { class: "suave", texto: sub || U.mascaraTelefone(c.telefone) }))];
    return link ? el("a", { class: "nome-btn", href: `#/clientes/${c.id}` }, ...corpo) : el("span", { class: "nome-btn" }, ...corpo);
  }
  const nomeDoCliente = (cid) => (L.cliente(cid) || { nome: "Cliente removido" }).nome;
  const nomeDoProf = (pid) => (L.profissional(pid) || { nome: "—" }).nome;

  // Linha de reserva (lista do dia, próximos atendimentos)
  function linhaReserva(a, { mostrarData = false } = {}) {
    const linha = el("button", { class: `reserva-linha ${corProf(a.profissionalId)}${a.status === "cancelado" ? " is-cancelada" : ""}`, type: "button", "data-foco": `reserva-${a.id}`, onclick: () => NX.reservas.detalhe(a.id), "aria-label": `${a.inicio} a ${a.fim}, ${nomeDoCliente(a.clienteId)}, ${a.servicoNome}, ${nomeDoProf(a.profissionalId)}, ${NX.agenda.nomeStatus(a.status)}. Abrir detalhes.` },
      el("span", { class: "reserva-linha__hora" }, el("b", { texto: a.inicio }), el("small", { texto: mostrarData ? U.dataCurta(a.data) : `até ${a.fim}` })),
      el("span", { class: "reserva-linha__texto" }, el("b", { texto: nomeDoCliente(a.clienteId) }), el("small", { texto: `${a.servicoNome} · ${a.duracao} min · ${U.moeda(a.preco)}` })),
      el("span", { class: "reserva-linha__prof" }, nomeProf(a.profissionalId, { curto: true })),
      pilulaStatus(a.status, { curto: true }));
    return linha;
  }

  // Miniatura do serviço: foto enviada pelo usuário ou ícone da categoria (nenhuma imagem é inventada)
  const ICONE_CATEGORIA = { cabelo: "scissors", barba: "brush", combos: "sparkles", unhas: "hand", sobrancelha: "eye" };
  function miniaturaServico(s, grande = false) {
    const caixa = el("span", { class: `miniatura${grande ? " miniatura--g" : ""}`, "aria-hidden": grande ? null : "true" });
    if (s.imagem) caixa.append(el("img", { src: s.imagem, alt: grande ? `Foto de ${s.nome}` : "", loading: "lazy" }));
    else caixa.append(icone(ICONE_CATEGORIA[U.semAcento(s.categoria)] || "sparkles", grande ? 40 : 20));
    return caixa;
  }

  /* ---------- Estado vazio ---------- */
  function vazio({ icone: nomeIcone = "inbox", titulo, texto, acao }) {
    return el("div", { class: "vazio" },
      el("span", { class: "vazio__icone" }, icone(nomeIcone, 22)),
      el("p", { class: "vazio__titulo", texto: titulo }),
      texto ? el("p", { texto }) : null,
      acao || null);
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

  /* ---------- Cabeçalho de coluna que ordena ---------- */
  function thOrdenavel(rotulo, campo, estado, aoMudar, classe = "") {
    const ativo = estado.ordem === campo;
    const th = el("th", { scope: "col", class: classe, "aria-sort": ativo ? (estado.direcao === "asc" ? "ascending" : "descending") : "none" });
    const b = el("button", { class: "ordenar", type: "button", "data-foco": `ordem-${campo}`, onclick: () => {
      estado.direcao = ativo ? (estado.direcao === "asc" ? "desc" : "asc") : (campo === "nome" ? "asc" : "desc");
      estado.ordem = campo;
      aoMudar();
    } }, rotulo, icone(ativo ? "chevron-down" : "arrow-up-down", 14));
    if (ativo && estado.direcao === "asc") b.querySelector(".ic").classList.add("ic--cima");
    th.append(b);
    return th;
  }

  /* ---------- Seletor de período ----------
     Períodos passados (7, 30, 90 dias...) e também os próximos dias, porque
     uma agenda tem reservas futuras. */
  const PERIODOS = [
    { id: "hoje", rotulo: "Hoje" }, { id: "7d", rotulo: "7 dias" }, { id: "30d", rotulo: "30 dias" }, { id: "90d", rotulo: "90 dias" },
    { id: "mes", rotulo: "Este mês" }, { id: "mes-anterior", rotulo: "Mês anterior" }, { id: "proximos7", rotulo: "Próximos 7 dias" }, { id: "futuros", rotulo: "Futuros" },
    { id: "tudo", rotulo: "Tudo" }, { id: "personalizado", rotulo: "Personalizado" },
  ];
  const PADRAO_IDS = ["hoje", "7d", "30d", "mes", "mes-anterior", "personalizado"];
  function intervalo(periodo) {
    const hoje = U.hoje();
    if (periodo.id === "hoje") return { de: hoje, ate: hoje };
    if (periodo.id === "7d") return { de: U.somarDias(hoje, -6), ate: hoje };
    if (periodo.id === "30d") return { de: U.somarDias(hoje, -29), ate: hoje };
    if (periodo.id === "90d") return { de: U.somarDias(hoje, -89), ate: hoje };
    if (periodo.id === "mes") return { de: U.inicioDoMes(hoje), ate: U.fimDoMes(hoje) };
    if (periodo.id === "mes-anterior") { const ini = U.somarMeses(hoje, -1); return { de: ini, ate: U.fimDoMes(ini) }; }
    if (periodo.id === "proximos7") return { de: hoje, ate: U.somarDias(hoje, 6) };
    if (periodo.id === "futuros") return { de: hoje, ate: U.somarDias(hoje, 366) };
    if (periodo.id === "tudo") return { de: "2000-01-01", ate: U.somarDias(hoje, 400), tudo: true };
    return { de: periodo.de, ate: periodo.ate };
  }
  const descreverPeriodo = ({ de, ate, tudo }) => (tudo ? "todo o período" : de === ate ? U.dataCompleta(de) : `${U.dataCompleta(de)} a ${U.dataCompleta(ate)}`);
  function seletorPeriodo(estado, aoMudar, { ids = PADRAO_IDS, nome = "periodo", futuro = true } = {}) {
    const caixa = el("div", { class: "barra-periodo" });
    const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Período" });
    const limite = futuro ? U.somarDias(U.hoje(), 366) : U.hoje();
    const de = el("input", { type: "date", "aria-label": "Data inicial", value: estado.de || U.somarDias(U.hoje(), -29), max: limite, "data-foco": `${nome}-de` });
    const ate = el("input", { type: "date", "aria-label": "Data final", value: estado.ate || U.hoje(), max: limite, "data-foco": `${nome}-ate` });
    const erro = el("p", { class: "campo__erro", role: "alert" });
    const pers = el("div", { class: "periodo-personalizado", hidden: estado.id !== "personalizado" }, "De", de, "até", ate, erro);
    const aplicar = () => {
      erro.textContent = "";
      if (!U.dataValida(de.value) || !U.dataValida(ate.value)) { erro.textContent = "Informe as duas datas."; return; }
      if (de.value > ate.value) { erro.textContent = "A data inicial precisa ser anterior à final."; return; }
      if (ate.value > limite) { erro.textContent = "A data final está longe demais."; return; }
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

  // Célula de tabela com rótulo (vira cartão no celular)
  const td = (rotulo, conteudo, classe = "") => el("td", { "data-rotulo": rotulo, class: classe }, conteudo);

  // Opções de select
  const opcoesProfissionais = ({ todos, incluirInativos } = {}) => [
    ...(todos ? [{ valor: "", rotulo: todos }] : []),
    ...L.dados.profissionais.filter((p) => incluirInativos || p.status === "ativo").map((p) => ({ valor: p.id, rotulo: p.status === "ativo" ? p.nome : `${p.nome} (inativo)` })),
  ];
  const opcoesServicos = ({ todos, incluirInativos } = {}) => [
    ...(todos ? [{ valor: "", rotulo: todos }] : []),
    ...L.dados.servicos.filter((s) => incluirInativos || s.status === "ativo").map((s) => ({ valor: s.id, rotulo: `${s.nome}${s.status === "ativo" ? "" : " (inativo)"}`, grupo: s.categoria })),
  ];
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

  NX.componentes = {
    comFoco, campoBusca,
    botao, cabecalho, voltar, cartaoGrafico, legenda, pilulaStatus, pilula, pilulaPagamento, iconeStatus,
    avatarProf, nomeProf, corProf, nomeCliente, nomeDoCliente, nomeDoProf, linhaReserva, miniaturaServico,
    vazio, paginar, paginacao, thOrdenavel, PERIODOS, intervalo, intervaloDe, descreverPeriodo, seletorPeriodo, td,
    opcoesProfissionais, opcoesServicos, seletor,
  };
})();
