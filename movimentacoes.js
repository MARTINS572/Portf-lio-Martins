/* ==========================================================================
   NEXORA STOCK — Tela: Movimentações
   Histórico de tudo o que mexeu no estoque, criado automaticamente pelas
   operações. Filtros por período, produto, categoria, tipo e responsável,
   pesquisa, paginação e CSV do resultado filtrado.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const E = NX.estoque;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const filtro = { periodo: { id: "30d" }, busca: "", produtoId: "", categoriaId: "", tipo: "", responsavelId: "", pagina: 1 };
  let p = null;

  const intervalo = () => C().intervaloDe(filtro.periodo);

  function filtrados() {
    const { de, ate } = intervalo();
    const q = filtro.busca.trim();
    return E.movimentosOrdenados().filter((m) => {
      if (!E.noPeriodo(m, de, ate)) return false;
      if (filtro.produtoId && m.produtoId !== filtro.produtoId) return false;
      if (filtro.tipo && m.tipo !== filtro.tipo) return false;
      if (filtro.responsavelId && m.responsavelId !== filtro.responsavelId) return false;
      const prod = L.produto(m.produtoId);
      if (filtro.categoriaId && (!prod || prod.categoriaId !== filtro.categoriaId)) return false;
      if (q && !(U.contem(prod?.nome, q) || U.contem(prod?.sku, q) || U.contem(m.documento, q) || U.contem(m.motivo, q) || String(m.numero) === q.replace(/\D/g, ""))) return false;
      return true;
    }).reverse();
  }

  function aoEntrar(params) {
    if (params.produto || params.busca || params.tipo) Object.assign(filtro, { produtoId: "", categoriaId: "", tipo: "", responsavelId: "", busca: "", pagina: 1, periodo: { id: "tudo" } });
    if (params.produto) filtro.produtoId = params.produto;
    if (params.tipo) filtro.tipo = params.tipo;
    if (params.busca) filtro.busca = params.busca;
  }

  function montar(secao) {
    const busca = el("input", { type: "search", class: "campo-busca", placeholder: "Produto, SKU, documento ou nº", "aria-label": "Pesquisar movimentações", value: filtro.busca, "data-foco": "mov-busca" });
    busca.addEventListener("input", () => { filtro.busca = busca.value; filtro.pagina = 1; atualizar(); });
    const sel = (rotulo, chave, foco) => {
      const s = el("select", { class: "seletor", "aria-label": rotulo, "data-foco": foco });
      s.addEventListener("change", () => { filtro[chave] = s.value; filtro.pagina = 1; atualizar(); });
      return s;
    };
    p = {
      busca, periodo: el("div"),
      produto: sel("Filtrar por produto", "produtoId", "mov-produto"),
      categoria: sel("Filtrar por categoria", "categoriaId", "mov-categoria"),
      tipo: sel("Filtrar por tipo", "tipo", "mov-tipo"),
      responsavel: sel("Filtrar por responsável", "responsavelId", "mov-resp"),
      resumo: el("p", { class: "mov-resumo", "aria-live": "polite" }), conteudo: el("div"),
    };
    const limpar = el("button", { class: "link-btn", type: "button", texto: "Limpar filtros", "data-foco": "mov-limpar", onclick: () => {
      Object.assign(filtro, { busca: "", produtoId: "", categoriaId: "", tipo: "", responsavelId: "", pagina: 1, periodo: { id: "30d" } });
      busca.value = "";
      atualizar();
    } });
    secao.replaceChildren(
      C().cabecalho({ id: "movimentacoes", titulo: "Movimentações", sub: "Histórico de entradas, saídas, ajustes e estornos. Nada é apagado.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Ajuste", "btn--linha", () => NX.form.ajuste(), "sliders-horizontal", { "aria-label": "Ajuste de inventário" }),
        C().botao("Saída", "btn--linha", () => NX.form.saida(), "arrow-up-from-line", { "aria-label": "Registrar saída" }),
        C().botao("Entrada", "btn--primario", () => NX.form.entrada(), "arrow-down-to-line", { "aria-label": "Registrar entrada" }),
      ] }),
      p.periodo,
      el("div", { class: "barra-filtros" }, el("div", { class: "barra-filtros__busca" }, icone("search", 16), busca), p.produto, p.categoria, p.tipo, p.responsavel, limpar),
      p.resumo, p.conteudo);
  }

  function exportar() {
    const lista = filtrados();
    if (!lista.length) { U.aviso("Nenhuma movimentação com estes filtros.", "info"); return; }
    U.baixarCSV(U.nomeArquivo("movimentacoes"), ["Nº", "Data e hora", "SKU", "Produto", "Categoria", "Tipo", "Quantidade", "Saldo anterior", "Saldo após", "Custo unitário (R$)", "Fornecedor", "Motivo", "Documento", "Responsável", "Observação", "Pedido", "Estorno"],
      lista.map((m) => {
        const prod = L.produto(m.produtoId) || {};
        const pc = m.pedidoId ? L.pedido(m.pedidoId) : null;
        const est = m.estornoDe ? `Estorna nº ${L.movimento(m.estornoDe)?.numero}` : m.estornadoPor ? `Estornada pelo nº ${L.movimento(m.estornadoPor)?.numero}` : "";
        return [m.numero, U.dataHora(m.data), prod.sku, prod.nome, L.nomeCategoria(prod.categoriaId), m.tipo === "estorno" ? `Estorno de ${m.tipoOriginal === "entrada" ? "entrada" : "saída"}` : NX.TIPOS_MOV.find((t) => t.id === m.tipo).nome,
          m.quantidade, m.saldoAnterior, m.saldoApos, m.custoUnitario ?? "", m.fornecedorId ? L.nomeFornecedor(m.fornecedorId) : "", m.motivo, m.documento, L.membro(m.responsavelId).nome, m.observacao, pc ? pc.numero : "", est];
      }));
  }

  function atualizar() {
    const d = L.dados;
    p.periodo.replaceChildren(C().seletorPeriodo(filtro.periodo, () => { filtro.pagina = 1; atualizar(); }, { nome: "mov-periodo", ids: ["7d", "30d", "90d", "mes", "mes-anterior", "tudo", "personalizado"] }));
    const opcoes = (s, vazio, itens, valor) => { s.replaceChildren(el("option", { value: "", texto: vazio }), ...itens); s.value = valor; if (s.value !== valor) s.value = ""; };
    opcoes(p.produto, "Todos os produtos", [...d.produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((x) => el("option", { value: x.id, texto: `${x.nome}${x.status === "arquivado" ? " (arquivado)" : ""}` })), filtro.produtoId);
    opcoes(p.categoria, "Todas as categorias", d.categorias.map((c) => el("option", { value: c.id, texto: c.nome })), filtro.categoriaId);
    opcoes(p.tipo, "Todos os tipos", NX.TIPOS_MOV.map((t) => el("option", { value: t.id, texto: t.nome })), filtro.tipo);
    opcoes(p.responsavel, "Todos os responsáveis", d.equipe.map((u) => el("option", { value: u.id, texto: u.nome })), filtro.responsavelId);
    if (p.busca.value !== filtro.busca) p.busca.value = filtro.busca;

    const lista = filtrados();
    let ent = 0, sai = 0, aj = 0;
    lista.forEach((m) => { const c = E.classe(m); if (c === "entrada") ent += m.quantidade; else if (c === "saida") sai -= m.quantidade; else aj += m.quantidade; });
    const { de, ate } = intervalo();
    p.resumo.replaceChildren(
      el("span", {}, el("b", { texto: U.numero(lista.length) }), ` ${lista.length === 1 ? "movimentação" : "movimentações"} · ${C().descreverPeriodo({ de, ate })}`),
      el("span", {}, "Entradas ", el("b", { class: "positivo", texto: `+${U.numero(ent)}` })),
      el("span", {}, "Saídas ", el("b", { class: "negativo", texto: `−${U.numero(sai)}` })),
      el("span", {}, "Ajustes ", el("b", { texto: U.comSinal(aj) })));

    const pref = NX.preferencias.porPagina;
    const pag = C().paginar(lista, filtro.pagina, pref);
    filtro.pagina = pag.pagina;
    if (!lista.length) {
      p.conteudo.replaceChildren(el("div", { class: "cartao" }, C().vazio({ icone: "arrow-left-right", titulo: "Nenhuma movimentação encontrada", texto: "Mude o período ou limpe os filtros. Toda entrada, saída, ajuste, estorno e recebimento aparece aqui automaticamente." })));
      return;
    }
    p.conteudo.replaceChildren(el("div", { class: "cartao cartao--tabela" },
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes tabela--larga tabela--mov" },
        el("thead", {}, el("tr", {}, ...["Data e hora", "Produto", "Tipo", "Quantidade", "Saldo após", "Motivo e documento", "Responsável"].map((t, i) => el("th", { scope: "col", class: [3, 4].includes(i) ? "num" : "", texto: t })))),
        el("tbody", {}, ...pag.itens.map((m) => {
          const prod = L.produto(m.produtoId);
          return el("tr", { class: "linha-clicavel", tabindex: "0", "aria-label": `Movimentação nº ${m.numero}: abrir detalhes`, onclick: () => NX.detalhe.movimento(m.id), onkeydown: (e) => { if (e.key === "Enter") NX.detalhe.movimento(m.id); } },
            C().td("Data e hora", el("span", { class: "linha-mov", style: { minWidth: "0" } }, el("span", { class: "nowrap", texto: U.dataHora(m.data) }), el("span", { class: "sub mono", texto: `nº ${m.numero}` }))),
            C().td("Produto", el("span", { class: "linha-mov" }, el("b", { texto: prod ? prod.nome : "Produto removido" }), el("span", { class: "sub mono", texto: prod ? prod.sku : "" })), "principal-celula"),
            C().td("Tipo", el("span", {}, C().tipoMovimento(m), m.estornadoPor ? el("span", { class: "marca-estorno" }, "estornada") : null)),
            C().td("Quantidade", C().quantidade(m.quantidade), "num"),
            C().td("Saldo após", el("span", { class: "mono", texto: U.numero(m.saldoApos) }), "num"),
            C().td("Motivo", el("span", { class: "linha-mov" }, el("span", { class: "celula-texto", texto: m.motivo }), m.documento ? el("span", { class: "sub mono", texto: m.documento }) : null), "inteira"),
            C().td("Responsável", el("span", { class: "pessoa", title: L.membro(m.responsavelId).nome }, C().avatar(m.responsavelId), el("span", { texto: L.membro(m.responsavelId).nome.split(" ")[0] }))));
        })))),
      C().paginacao(pag, { porPagina: pref, nome: "movimentacoes", aoMudar: (n) => { filtro.pagina = n; atualizar(); }, aoMudarTamanho: (n) => { filtro.pagina = 1; NX.salvarPreferencias({ porPagina: n }); } })));
  }

  NX.telas.movimentacoes = { titulo: "Movimentações", montar, atualizar, aoEntrar };
})();
