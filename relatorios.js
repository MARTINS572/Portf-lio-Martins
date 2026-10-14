/* ==========================================================================
   NEXORA STOCK — Tela: Relatórios
   Nove relatórios calculados dos dados reais do sistema, com filtros de
   período e categoria e exportação CSV de cada um.
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
  const G = () => NX.graficos;

  const filtro = { periodo: { id: "30d" }, categoriaId: "", relatorio: "posicao" };
  let p = null;

  const ativos = () => L.dados.produtos.filter((x) => x.status === "ativo" && (!filtro.categoriaId || x.categoriaId === filtro.categoriaId)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const emPedido = (pid) => E.pedidosComProduto(pid).filter((pc) => pc.status !== "rascunho").map((pc) => pc.numero).join(", ");
  const filtroCategoria = () => (filtro.categoriaId ? (m) => (L.produto(m.produtoId) || {}).categoriaId === filtro.categoriaId : () => true);

  /* Cada relatório: colunas (rótulo e se é número), linhas para a tela e para o CSV */
  const RELATORIOS = [
    {
      id: "posicao", titulo: "Posição atual do estoque", periodo: false,
      descricao: "Saldo, mínimo e valor de cada produto ativo hoje.",
      colunas: [["SKU"], ["Produto"], ["Categoria"], ["Saldo", 1], ["Mínimo", 1], ["Custo (R$)", 1], ["Valor (R$)", 1], ["Situação"]],
      dados: () => ativos().map((x) => [x.sku, x.nome, L.nomeCategoria(x.categoriaId), E.saldo(x.id), x.minimo, x.custo, E.valorDoProduto(x), E.nomeSituacao(E.situacao(x))]),
      total: (ls) => ["Total", "", "", ls.reduce((t, l) => t + l[3], 0), "", "", U.arredondar(ls.reduce((t, l) => t + l[6], 0)), ""],
      formato: [null, null, null, "n", "n", "m", "m", null],
    },
    {
      id: "valor", titulo: "Valor do estoque por categoria", periodo: false,
      descricao: "Estimativa pelo preço de custo cadastrado (saldo × custo).",
      colunas: [["Categoria"], ["Produtos ativos", 1], ["Unidades", 1], ["Valor (R$)", 1], ["% do total", 1]],
      dados: () => {
        const lista = E.porCategoria().filter((c) => c.produtos > 0 && (!filtro.categoriaId || c.categoria.id === filtro.categoriaId));
        const soma = lista.reduce((t, c) => t + c.valor, 0) || 1;
        return lista.sort((a, b) => b.valor - a.valor).map((c) => [c.categoria.nome, c.produtos, c.unidades, c.valor, U.arredondar((c.valor / soma) * 100)]);
      },
      total: (ls) => ["Total", ls.reduce((t, l) => t + l[1], 0), ls.reduce((t, l) => t + l[2], 0), U.arredondar(ls.reduce((t, l) => t + l[3], 0)), 100],
      formato: [null, "n", "n", "m", "%"],
    },
    {
      id: "abaixo", titulo: "Produtos abaixo do mínimo", periodo: false,
      descricao: "Saldo igual ou menor que o estoque mínimo (inclui os sem estoque).",
      colunas: [["SKU"], ["Produto"], ["Saldo", 1], ["Mínimo", 1], ["Falta para o mínimo", 1], ["Fornecedor"], ["Em pedido"]],
      dados: () => ativos().filter((x) => ["baixo", "zerado"].includes(E.situacao(x))).sort((a, b) => E.saldo(a.id) - E.saldo(b.id)).map((x) => [x.sku, x.nome, E.saldo(x.id), x.minimo, Math.max(0, x.minimo - E.saldo(x.id)), L.nomeFornecedor(x.fornecedorId), emPedido(x.id) || "—"]),
      formato: [null, null, "n", "n", "n", null, null],
    },
    {
      id: "zerado", titulo: "Produtos sem estoque", periodo: false,
      descricao: "Produtos ativos com saldo zero.",
      colunas: [["SKU"], ["Produto"], ["Categoria"], ["Última saída"], ["Fornecedor"], ["Em pedido"]],
      dados: () => ativos().filter((x) => E.situacao(x) === "zerado").map((x) => {
        const ult = [...E.movimentosDoProduto(x.id)].reverse().find((m) => m.quantidade < 0);
        return [x.sku, x.nome, L.nomeCategoria(x.categoriaId), ult ? U.dataHora(ult.data) : "—", L.nomeFornecedor(x.fornecedorId), emPedido(x.id) || "—"];
      }),
      formato: [],
    },
    {
      id: "entradas-saidas", titulo: "Entradas e saídas por período", periodo: true,
      descricao: "Unidades e valores pelo custo, agrupados por dia, semana ou mês conforme o tamanho do período.",
      colunas: [["Período"], ["Entradas (un.)", 1], ["Saídas (un.)", 1], ["Saldo líquido (un.)", 1], ["Entradas (R$)", 1], ["Saídas (R$)", 1]],
      dados: () => {
        const { de, ate } = C().intervaloDe(filtro.periodo);
        return E.serieMovimentos(de, ate, { categoriaId: filtro.categoriaId }).map((b) => [b.inicio === b.fim ? U.dataCompleta(b.inicio) : `${U.dataCompleta(b.inicio)} a ${U.dataCompleta(b.fim)}`, b.entradas, b.saidas, b.entradas - b.saidas, b.valorEntradas, b.valorSaidas]);
      },
      total: (ls) => ["Total", ...[1, 2, 3].map((i) => ls.reduce((t, l) => t + l[i], 0)), ...[4, 5].map((i) => U.arredondar(ls.reduce((t, l) => t + l[i], 0)))],
      formato: [null, "n", "n", "s", "m", "m"],
    },
    {
      id: "maior", titulo: "Produtos com maior movimentação", periodo: true,
      descricao: "Os 20 produtos que mais entraram e saíram no período (estornos descontados).",
      colunas: [["Produto"], ["Entradas (un.)", 1], ["Saídas (un.)", 1], ["Total (un.)", 1], ["Movimentações", 1]],
      dados: () => { const { de, ate } = C().intervaloDe(filtro.periodo); return E.maisMovimentados(de, ate, { categoriaId: filtro.categoriaId, limite: 20 }).map((r) => [r.produto.nome, r.entradas, r.saidas, r.total, r.movimentos]); },
      formato: [null, "n", "n", "n", "n"],
    },
    {
      id: "sem-mov", titulo: "Produtos sem movimentação no período", periodo: true,
      descricao: "Produtos ativos que não tiveram nenhuma entrada, saída ou ajuste no período (estoque parado).",
      colunas: [["SKU"], ["Produto"], ["Saldo", 1], ["Valor parado (R$)", 1], ["Última movimentação"]],
      dados: () => { const { de, ate } = C().intervaloDe(filtro.periodo); return E.semMovimentacao(de, ate, { categoriaId: filtro.categoriaId }).map((r) => [r.produto.sku, r.produto.nome, r.saldo, E.valorDoProduto(r.produto), r.ultima ? U.dataHora(r.ultima) : "—"]); },
      formato: [null, null, "n", "m", null],
    },
    {
      id: "ajustes", titulo: "Histórico de ajustes", periodo: true,
      descricao: "Ajustes de inventário com contagem, diferença, motivo e responsável.",
      colunas: [["Data e hora"], ["Produto"], ["Sistema", 1], ["Contado", 1], ["Diferença", 1], ["Motivo"], ["Responsável"], ["Observação"]],
      dados: () => {
        const { de, ate } = C().intervaloDe(filtro.periodo);
        const f = filtroCategoria();
        return E.movimentosOrdenados().filter((m) => m.tipo === "ajuste" && E.noPeriodo(m, de, ate) && f(m)).reverse()
          .map((m) => [U.dataHora(m.data), L.produto(m.produtoId)?.nome || "", m.saldoAnterior, m.contada ?? m.saldoApos, m.quantidade, m.motivo, L.membro(m.responsavelId).nome, m.observacao]);
      },
      formato: [null, null, "n", "n", "s", null, null, null],
    },
    {
      id: "pedidos", titulo: "Pedidos de compra pendentes", periodo: false,
      descricao: "Pendentes de envio, enviados e parcialmente recebidos (rascunhos ficam de fora).",
      colunas: [["Pedido"], ["Fornecedor"], ["Status"], ["Previsão"], ["A receber (un.)", 1], ["Valor a receber (R$)", 1]],
      dados: () => L.dados.pedidos.filter(E.pedidoAberto)
        .filter((pc) => !filtro.categoriaId || pc.itens.some((it) => L.produto(it.produtoId)?.categoriaId === filtro.categoriaId))
        .sort((a, b) => a.previsao.localeCompare(b.previsao))
        .map((pc) => { const t = E.totaisPedido(pc); return [pc.numero, L.nomeFornecedor(pc.fornecedorId), `${E.statusPedido(pc.status).nome}${E.pedidoAtrasado(pc) ? " (atrasado)" : ""}`, U.dataCompleta(pc.previsao), t.pendenteUn, t.pendenteValor]; }),
      total: (ls) => ["Total", "", "", "", ls.reduce((t, l) => t + l[4], 0), U.arredondar(ls.reduce((t, l) => t + l[5], 0))],
      formato: [null, null, null, null, "n", "m"],
    },
  ];

  const mostrar = (v, f) => (f === "n" ? U.numero(v) : f === "m" ? U.moeda(v) : f === "s" ? U.comSinal(v) : f === "%" ? `${U.decimal(v)}%` : v);

  function montar(secao) {
    const cat = el("select", { class: "seletor", "aria-label": "Filtrar por categoria", "data-foco": "rel-cat" });
    cat.addEventListener("change", () => { filtro.categoriaId = cat.value; atualizar(); });
    p = {
      cat, periodo: el("div"), descricao: el("p", { class: "periodo-descricao", "aria-live": "polite" }),
      indicadores: el("div", { class: "indicadores indicadores--relatorio" }),
      grafico: C().cartaoGrafico({ titulo: "Entradas e saídas", sub: "", legenda: C().legenda([["", "Entradas"], ["chave--2", "Saídas"]]) }),
      escolha: el("div", { class: "relatorio-escolha", role: "tablist", "aria-label": "Relatórios" }),
      relatorio: el("div"),
    };
    secao.replaceChildren(
      C().cabecalho({ id: "relatorios", titulo: "Relatórios", sub: "Calculados a partir das movimentações e dos cadastros" }),
      p.periodo,
      el("div", { class: "barra-filtros" }, cat),
      p.descricao,
      el("p", { class: "nota-info aviso-valor" }, icone("info", 16), el("span", {}, el("b", { texto: "Sobre o valor do estoque: " }), "é uma estimativa operacional (saldo × preço de custo cadastrado). Não equivale necessariamente ao valor contábil da empresa, que depende de critérios fiscais e contábeis.")),
      p.indicadores,
      el("div", { style: { marginBottom: "16px" } }, p.grafico.cartao),
      p.escolha,
      p.relatorio);
  }

  function indicador(rotulo, nomeIcone, valor, nota) {
    return el("div", { class: "indicador" }, el("span", { class: "indicador__rotulo" }, icone(nomeIcone, 16), rotulo), el("span", { class: "indicador__valor", texto: valor }), el("span", { class: "indicador__nota", texto: nota }));
  }

  function atualizar() {
    const { de, ate } = C().intervaloDe(filtro.periodo);
    p.periodo.replaceChildren(C().seletorPeriodo(filtro.periodo, atualizar, { nome: "rel-periodo" }));
    p.cat.replaceChildren(el("option", { value: "", texto: "Todas as categorias" }), ...L.dados.categorias.map((c) => el("option", { value: c.id, texto: c.status === "ativa" ? c.nome : `${c.nome} (arquivada)` })));
    p.cat.value = filtro.categoriaId;
    const nomeCat = filtro.categoriaId ? L.nomeCategoria(filtro.categoriaId) : "todas";
    p.descricao.textContent = `Período: ${C().descreverPeriodo({ de, ate })} · Categoria: ${nomeCat}`;

    // Indicadores
    const lista = ativos();
    const valor = lista.reduce((t, x) => t + E.valorDoProduto(x), 0);
    const mov = E.totaisMovimento(de, ate, filtroCategoria());
    const abaixo = lista.filter((x) => ["baixo", "zerado"].includes(E.situacao(x)));
    const pend = RELATORIOS.find((r) => r.id === "pedidos").dados();
    p.indicadores.replaceChildren(
      indicador("Valor estimado do estoque", "wallet", U.moeda(valor, { compacto: valor >= 100000 }), `${U.unidades(lista.reduce((t, x) => t + E.saldo(x.id), 0))} em ${U.plural(lista.length, "produto", "produtos")} · hoje`),
      indicador("Entradas no período", "arrow-down-to-line", `+${U.numero(mov.entradas)}`, `${U.moeda(mov.valorEntradas)} pelo custo`),
      indicador("Saídas no período", "arrow-up-from-line", `−${U.numero(mov.saidas)}`, `${U.moeda(mov.valorSaidas)} pelo custo`),
      indicador("Ajustes no período", "sliders-horizontal", U.comSinal(mov.ajustes), `${U.plural(mov.qtdAjustes, "ajuste", "ajustes")} · ${U.moeda(mov.ajustesValor)}`),
      indicador("Abaixo do mínimo", "triangle-alert", U.numero(abaixo.length), `${U.numero(abaixo.filter((x) => E.situacao(x) === "zerado").length)} sem estoque · hoje`),
      indicador("Pedidos pendentes", "clipboard-list", U.numero(pend.length), `${U.moeda(pend.reduce((t, l) => t + l[5], 0))} a receber`),
    );

    // Gráfico
    const serie = E.serieMovimentos(de, ate, { categoriaId: filtro.categoriaId });
    const tipo = E.agrupamentoPara(de, ate);
    p.grafico.definirSub(`${{ dia: "Por dia", semana: "Por semana", mes: "Por mês" }[tipo]} · unidades`);
    const rotuloBloco = (b) => (b.inicio === b.fim ? U.dataCompleta(b.inicio) : `${U.dataCurta(b.inicio)} a ${U.dataCurta(b.fim)}`);
    if (serie.some((b) => b.entradas || b.saidas)) G().colunas(p.grafico.cartao, { rotulos: serie.map((b) => b.rotulo), series: [{ nome: "entradas", valores: serie.map((b) => Math.max(0, b.entradas)) }, { nome: "saídas", valores: serie.map((b) => Math.max(0, b.saidas)) }], formatar: (v) => `${U.numero(v)} un.`, detalheRotulo: (i) => rotuloBloco(serie[i]) });
    else p.grafico.area.replaceChildren(el("p", { class: "grafico__vazio", texto: "Nenhuma entrada ou saída neste período e categoria." }));
    G().tabela(p.grafico.cartao, ["Período", "Entradas (un.)", "Saídas (un.)"], serie.map((b) => [rotuloBloco(b), U.numero(b.entradas), U.numero(b.saidas)]));

    // Escolha do relatório
    p.escolha.replaceChildren(...RELATORIOS.map((r) => el("button", { class: "chip", type: "button", role: "tab", "aria-selected": String(filtro.relatorio === r.id), "aria-pressed": String(filtro.relatorio === r.id), "data-foco": `rel-${r.id}`, texto: r.titulo, onclick: () => { filtro.relatorio = r.id; atualizar(); } })));

    // Relatório escolhido
    const r = RELATORIOS.find((x) => x.id === filtro.relatorio) || RELATORIOS[0];
    const linhas = r.dados();
    const total = r.total && linhas.length ? r.total(linhas) : null;
    const exportar = () => {
      if (!linhas.length) { U.aviso("Este relatório está vazio com os filtros atuais.", "info"); return; }
      U.baixarCSV(U.nomeArquivo(`relatorio-${r.id}`), r.colunas.map((c) => c[0]), total ? [...linhas, total] : linhas);
    };
    p.relatorio.replaceChildren(el("article", { class: "cartao cartao--tabela", role: "tabpanel", "aria-label": r.titulo },
      el("div", { class: "cartao__cabeca" },
        el("div", {}, el("h2", { class: "cartao__titulo", texto: r.titulo }), el("p", { class: "cartao__sub", texto: `${r.descricao} ${r.periodo ? `Período: ${C().descreverPeriodo({ de, ate })}.` : "Posição de hoje (não depende do período)."}` })),
        C().botao("Exportar CSV", "btn--linha btn--pequeno", exportar, "download", { "aria-label": `Exportar ${r.titulo} em CSV` })),
      linhas.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
        el("thead", {}, el("tr", {}, ...r.colunas.map(([t, num]) => el("th", { scope: "col", class: num ? "num" : "", texto: t })))),
        el("tbody", {}, ...linhas.map((l) => el("tr", {}, ...l.map((v, i) => C().td(r.colunas[i][0], mostrar(v, r.formato[i]), `${r.colunas[i][1] ? "num" : ""}${["SKU", "Pedido", "Situação", "Data e hora"].includes(r.colunas[i][0]) ? " nowrap" : ""}${r.colunas[i][0] === "SKU" || r.colunas[i][0] === "Pedido" ? " mono" : ""}${i === (r.colunas[0][0] === "SKU" ? 1 : 0) ? " principal-celula" : ""}`))))),
        total ? el("tfoot", {}, el("tr", {}, ...total.map((v, i) => el("td", { class: r.colunas[i][1] ? "num" : "", texto: v === "" ? "" : mostrar(v, r.formato[i]) })))) : null))
        : C().vazio({ icone: "circle-check", titulo: "Nada neste relatório", texto: "Com o período e a categoria escolhidos, não há registros." }),
      linhas.length ? el("p", { class: "contagem", style: { padding: "10px 16px 6px" }, texto: U.plural(linhas.length, "linha", "linhas") }) : null));
  }

  NX.telas.relatorios = { titulo: "Relatórios", montar, atualizar };
})();
