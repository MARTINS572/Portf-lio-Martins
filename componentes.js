/* ==========================================================================
   NEXORA STOCK — componentes.js
   Peças de interface reaproveitadas pelas telas: cabeçalho de página,
   cartão de gráfico, etiquetas de situação, tipo de movimentação,
   miniatura do produto, paginação, estado vazio e seletor de período.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
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

  /* ---------- Etiquetas ---------- */
  const CURTO = { normal: "Normal", baixo: "Baixo", zerado: "Sem estoque", arquivado: "Arquivado" };
  function pilulaSituacao(p, { curto } = {}) {
    const s = E.situacao(p);
    const info = NX.SITUACOES.find((x) => x.id === s);
    return el("span", { class: `pilula pilula--${s}`, title: info.nome }, icone(info.icone, 13), curto ? CURTO[s] : info.nome);
  }
  function pilulaPedido(pc) {
    const st = E.statusPedido(pc.status);
    const atrasado = E.pedidoAtrasado(pc);
    return el("span", { class: "pagina__etiquetas", style: { margin: 0 } },
      el("span", { class: `pilula pilula--${pc.status}` }, icone(st.icone, 13), st.nome),
      atrasado ? el("span", { class: "pilula pilula--atrasado" }, icone("clock", 13), "Atrasado") : null);
  }
  const pilulaSimples = (texto, classe, nomeIcone) => el("span", { class: `pilula pilula--${classe}` }, nomeIcone ? icone(nomeIcone, 13) : null, texto);

  function tipoMovimento(m) {
    const t = NX.TIPOS_MOV.find((x) => x.id === m.tipo);
    const rotulo = m.tipo === "estorno" ? `Estorno de ${m.tipoOriginal === "entrada" ? "entrada" : "saída"}` : t.nome;
    return el("span", { class: `tipo-mov tipo-mov--${m.tipo}` }, el("span", { class: "tipo-mov__icone" }, icone(t.icone, 14)), rotulo);
  }
  const quantidade = (q) => el("span", { class: `qtd ${q > 0 ? "qtd--mais" : q < 0 ? "qtd--menos" : ""}`, texto: U.comSinal(q) });

  function saldoCelula(p) {
    const s = E.saldo(p.id);
    const sit = E.situacao(p);
    const ref = Math.max(p.minimo * 2, 1);
    const largura = Math.min(1, s / ref);
    return el("span", { class: "saldo-celula" },
      el("b", { texto: U.numero(s) }),
      el("span", { class: `medidor medidor--${sit}`, "aria-hidden": "true" }, el("i", { style: { width: `${Math.round(largura * 100)}%` } })),
      el("small", { texto: `mín. ${U.numero(p.minimo)}` }));
  }

  function avatar(id, tamanho = "p") {
    const u = L.membro(id);
    return el("span", { class: `avatar avatar--${tamanho} avatar--${id}`, title: u.nome, "aria-hidden": "true", texto: U.iniciais(u.nome) });
  }
  const pessoa = (id) => el("span", { class: "pessoa" }, avatar(id), el("span", { texto: L.membro(id).nome }));

  // Miniatura: foto enviada pelo usuário ou ícone da categoria (nenhuma imagem é inventada)
  const ICONE_CATEGORIA = { FER: "hammer", ELE: "plug", HID: "droplet", PIN: "paint-roller", FIX: "wrench", JAR: "sprout" };
  function miniatura(p, grande = false) {
    const caixa = el("span", { class: `miniatura${grande ? " miniatura--g" : ""}`, "aria-hidden": grande ? null : "true" });
    if (p.imagem) caixa.append(el("img", { src: p.imagem, alt: grande ? `Foto de ${p.nome}` : "", loading: "lazy" }));
    else {
      const cat = L.categoria(p.categoriaId);
      caixa.append(icone((cat && ICONE_CATEGORIA[cat.codigo]) || "package", grande ? 40 : 18));
      if (grande) caixa.append(el("span", { class: "vh", texto: "Sem foto cadastrada" }));
    }
    return caixa;
  }
  function nomeProduto(p, { link = true } = {}) {
    const corpo = [miniatura(p), el("span", {}, el("b", { texto: p.nome }), el("span", { class: "suave mono", texto: p.sku }))];
    return link ? el("a", { class: "nome-btn", href: `#/produtos/${p.id}` }, ...corpo) : el("span", { class: "nome-btn" }, ...corpo);
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

  /* ---------- Seletor de período ---------- */
  const PERIODOS = [
    { id: "7d", rotulo: "7 dias" }, { id: "30d", rotulo: "30 dias" }, { id: "90d", rotulo: "90 dias" },
    { id: "mes", rotulo: "Este mês" }, { id: "mes-anterior", rotulo: "Mês anterior" }, { id: "tudo", rotulo: "Tudo" }, { id: "personalizado", rotulo: "Personalizado" },
  ];
  const PADRAO_IDS = ["7d", "30d", "90d", "mes", "mes-anterior", "personalizado"];
  function intervalo(periodo) {
    const hoje = U.hoje();
    if (periodo.id === "7d") return { de: U.somarDias(hoje, -6), ate: hoje };
    if (periodo.id === "30d") return { de: U.somarDias(hoje, -29), ate: hoje };
    if (periodo.id === "90d") return { de: U.somarDias(hoje, -89), ate: hoje };
    if (periodo.id === "mes") return { de: U.inicioDoMes(hoje), ate: hoje };
    if (periodo.id === "mes-anterior") { const ini = U.somarMeses(hoje, -1); return { de: ini, ate: U.fimDoMes(ini) }; }
    if (periodo.id === "tudo") return { de: "2000-01-01", ate: hoje, tudo: true };
    return { de: periodo.de, ate: periodo.ate };
  }
  const descreverPeriodo = ({ de, ate, tudo }) => (tudo ? "todo o período" : de === ate ? U.dataCompleta(de) : `${U.dataCompleta(de)} a ${U.dataCompleta(ate)}`);
  // estado: { id, de, ate }. Datas personalizadas só valem se forem válidas e em ordem.
  function seletorPeriodo(estado, aoMudar, { ids = PADRAO_IDS, nome = "periodo" } = {}) {
    const caixa = el("div", { class: "barra-periodo" });
    const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Período" });
    const de = el("input", { type: "date", "aria-label": "Data inicial", value: estado.de || U.somarDias(U.hoje(), -29), max: U.hoje(), "data-foco": `${nome}-de` });
    const ate = el("input", { type: "date", "aria-label": "Data final", value: estado.ate || U.hoje(), max: U.hoje(), "data-foco": `${nome}-ate` });
    const erro = el("p", { class: "campo__erro", role: "alert" });
    const pers = el("div", { class: "periodo-personalizado", hidden: estado.id !== "personalizado" }, "De", de, "até", ate, erro);
    const aplicar = () => {
      erro.textContent = "";
      if (!U.dataValida(de.value) || !U.dataValida(ate.value)) { erro.textContent = "Informe as duas datas."; return; }
      if (de.value > ate.value) { erro.textContent = "A data inicial precisa ser anterior à final."; return; }
      if (ate.value > U.hoje()) { erro.textContent = "A data final não pode estar no futuro."; return; }
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

  // Intervalo de um estado do seletor (personalizado guarda as datas; os outros são relativos a hoje)
  const intervaloDe = (estado) => (estado.id === "personalizado" && estado.de && estado.ate ? { de: estado.de, ate: estado.ate } : intervalo(PERIODOS.find((x) => x.id === estado.id) || PERIODOS[1]));

  // Célula de tabela com rótulo (vira cartão no celular)
  const td = (rotulo, conteudo, classe = "") => el("td", { "data-rotulo": rotulo, class: classe }, conteudo);

  NX.componentes = {
    botao, cabecalho, voltar, cartaoGrafico, legenda, pilulaSituacao, pilulaPedido, pilulaSimples, tipoMovimento, quantidade, saldoCelula,
    avatar, pessoa, miniatura, nomeProduto, vazio, paginar, paginacao, thOrdenavel, PERIODOS, intervalo, intervaloDe, descreverPeriodo, seletorPeriodo, td,
  };
})();
