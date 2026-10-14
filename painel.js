/* ==========================================================================
   NEXORA STOCK — Tela: Dashboard
   Indicadores, gráficos e listas calculados a partir dos dados (nada fixo).
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

  const periodo = { id: "30d" };
  let modoCategoria = "valor";
  let p = null;

  function montar(secao) {
    const seg = el("div", { class: "segmentado", role: "group", "aria-label": "Período dos indicadores" });
    [["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"]].forEach(([id, rotulo]) => seg.append(el("button", { type: "button", "data-periodo": id, "data-foco": `painel-${id}`, texto: rotulo, onclick: () => { periodo.id = id; atualizar(); } })));
    const atalho = (classe, nomeIcone, titulo, sub, fn) => el("button", { class: `atalho atalho--${classe}`, type: "button", onclick: fn },
      el("span", { class: "atalho__icone" }, icone(nomeIcone, 18)), el("span", {}, titulo, el("small", { texto: sub })));

    const graficoMov = C().cartaoGrafico({ titulo: "Entradas e saídas", sub: "", legenda: C().legenda([["", "Entradas"], ["chave--2", "Saídas"]]) });
    const graficoValor = C().cartaoGrafico({ titulo: "Evolução do valor do estoque", sub: "Estimativa pelo preço de custo cadastrado" });
    const segCat = el("div", { class: "segmentado", role: "group", "aria-label": "Medida por categoria" },
      ...[["valor", "Valor"], ["unidades", "Unidades"], ["produtos", "Produtos"]].map(([id, rotulo]) => el("button", { type: "button", "data-medida": id, "data-foco": `painel-cat-${id}`, texto: rotulo, onclick: () => { modoCategoria = id; atualizar(); } })));
    const graficoCat = C().cartaoGrafico({ titulo: "Distribuição por categoria", sub: "Produtos ativos", acoes: [segCat] });
    const graficoTop = C().cartaoGrafico({ titulo: "Produtos com maior movimentação", sub: "" });

    p = {
      seg, segCat, graficoMov, graficoValor, graficoCat, graficoTop,
      faixa: el("div"), indicadores: el("div", { class: "indicadores" }),
      reposicao: el("div"), ultimas: el("div"), pedidos: el("div"),
    };
    secao.replaceChildren(
      C().cabecalho({ id: "painel", titulo: "Dashboard", sub: `Situação do estoque · ${U.dataLonga(U.hoje())}`, acoes: [seg] }),
      p.faixa,
      el("div", { class: "atalhos", role: "group", "aria-label": "Ações frequentes" },
        atalho("produto", "package-plus", "Adicionar produto", "Novo cadastro", () => NX.form.produto()),
        atalho("entrada", "arrow-down-to-line", "Registrar entrada", "Soma ao saldo", () => NX.form.entrada()),
        atalho("saida", "arrow-up-from-line", "Registrar saída", "Venda, uso, avaria…", () => NX.form.saida()),
        atalho("ajuste", "sliders-horizontal", "Ajuste de inventário", "Contagem física", () => NX.form.ajuste()),
        atalho("pedido", "clipboard-list", "Criar pedido de compra", "Reposição", () => NX.pedidos.form())),
      p.indicadores,
      el("div", { class: "painel-grade" }, graficoMov.cartao, graficoValor.cartao, graficoCat.cartao, graficoTop.cartao),
      el("div", { class: "painel-grade painel-grade--tres" },
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Precisam de reposição" }), el("p", { class: "cartao__sub", texto: "Saldo igual ou abaixo do mínimo" })), el("a", { class: "link-btn", href: "#/produtos?situacao=reposicao" }, "Ver todos")), p.reposicao),
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Últimas movimentações" }), el("p", { class: "cartao__sub", texto: "Entradas, saídas, ajustes e estornos" })), el("a", { class: "link-btn", href: "#/movimentacoes" }, "Histórico")), p.ultimas),
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Pedidos de compra recentes" }), el("p", { class: "cartao__sub", texto: "Os 5 mais novos" })), el("a", { class: "link-btn", href: "#/pedidos" }, "Todos")), p.pedidos)),
    );
  }

  function indicador({ rotulo, nomeIcone, valor, nota, href, classe = "" }) {
    const corpo = [el("span", { class: "indicador__rotulo" }, icone(nomeIcone, 16), rotulo), el("span", { class: "indicador__valor", texto: valor }), nota ? el("span", { class: "indicador__nota" }, ...[].concat(nota)) : null];
    return href ? el("a", { class: `indicador ${classe}`, href }, ...corpo) : el("div", { class: `indicador ${classe}` }, ...corpo);
  }

  function atualizar() {
    const { de, ate } = C().intervalo(C().PERIODOS.find((x) => x.id === periodo.id));
    const dias = U.diasEntre(de, ate) + 1;
    p.seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.periodo === periodo.id)));
    p.segCat.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.medida === modoCategoria)));
    const ind = E.indicadores(de, ate);
    const d = L.dados;

    // Faixa de demonstração (primeira visita)
    if (!NX.preferencias.avisoDemoFechado) {
      const atrasado = d.pedidos.find((pc) => E.pedidoAtrasado(pc));
      const parcial = d.pedidos.find((pc) => pc.status === "parcial");
      p.faixa.replaceChildren(el("div", { class: "faixa-demo", role: "note" },
        icone("info", 18),
        el("p", {}, el("b", { texto: "Ambiente demonstrativo — dados fictícios. " }), `A loja, os produtos e os fornecedores são inventados e tudo fica salvo só neste navegador. Para testar: registre uma saída maior que o saldo${parcial ? `, receba o restante do pedido ${parcial.numero}` : ""}${atrasado ? ` ou veja o pedido atrasado ${atrasado.numero}` : ""}.`),
        el("div", { class: "faixa-demo__botoes" },
          C().botao("Como usar", "btn--linha btn--pequeno", () => U.$("#dlg-ajuda").showModal(), "circle-question-mark"),
          C().botao("Entendi", "btn--fantasma btn--pequeno", () => NX.salvarPreferencias({ avisoDemoFechado: true })))));
    } else p.faixa.replaceChildren();

    // Indicadores
    const mov = ind.movimento;
    const duplo = el("a", { class: "indicador indicador--duplo", href: "#/movimentacoes" },
      el("span", { class: "indicador__rotulo" }, icone("arrow-left-right", 16), `Entradas e saídas · ${dias} dias`),
      el("div", { class: "indicador__par" },
        el("div", {}, el("span", {}, icone("arrow-down-to-line", 14), "Entradas"), el("b", { class: "indicador__valor", texto: `+${U.numero(mov.entradas)}` }), el("span", { class: "indicador__nota", texto: `${U.moeda(mov.valorEntradas, { compacto: mov.valorEntradas >= 100000 })} pelo custo` })),
        el("div", {}, el("span", {}, icone("arrow-up-from-line", 14), "Saídas"), el("b", { class: "indicador__valor", texto: `−${U.numero(mov.saidas)}` }), el("span", { class: "indicador__nota", texto: `${U.moeda(mov.valorSaidas, { compacto: mov.valorSaidas >= 100000 })} pelo custo` }))));
    p.indicadores.replaceChildren(
      indicador({ rotulo: "Produtos cadastrados", nomeIcone: "package", valor: U.numero(ind.produtosAtivos), nota: [`ativos em ${U.plural(d.categorias.filter((c) => c.status === "ativa").length, "categoria", "categorias")}`, ind.arquivados ? ` · ${U.plural(ind.arquivados, "arquivado", "arquivados")}` : ""], href: "#/produtos" }),
      indicador({ rotulo: "Unidades em estoque", nomeIcone: "boxes", valor: U.numero(ind.unidades), nota: "soma do saldo de todos os produtos" }),
      indicador({ rotulo: "Valor estimado do estoque", nomeIcone: "wallet", valor: U.moeda(ind.valor, { compacto: ind.valor >= 1000000 }), nota: "saldo × preço de custo (estimativa)", href: "#/relatorios", classe: "indicador--largo" }),
      indicador({ rotulo: "Estoque baixo", nomeIcone: "triangle-alert", valor: U.numero(ind.baixo), nota: "saldo igual ou abaixo do mínimo", href: "#/produtos?situacao=baixo", classe: ind.baixo ? "indicador--alerta" : "" }),
      indicador({ rotulo: "Sem estoque", nomeIcone: "package-x", valor: U.numero(ind.zerado), nota: "saldo zerado", href: "#/produtos?situacao=zerado", classe: ind.zerado ? "indicador--perigo" : "" }),
      indicador({ classe: "indicador--largo", rotulo: "Pedidos de compra pendentes", nomeIcone: "clipboard-list", valor: U.numero(ind.pedidosPendentes), nota: [ind.pedidosAtrasados ? el("b", { class: "negativo", texto: `${U.plural(ind.pedidosAtrasados, "atrasado", "atrasados")} · ` }) : "", `${U.moeda(ind.valorPendente)} a receber`], href: "#/pedidos?status=abertos" }),
      duplo,
    );

    // Gráfico 1: entradas e saídas
    const serie = E.serieMovimentos(de, ate);
    const tipoBloco = E.agrupamentoPara(de, ate);
    p.graficoMov.definirSub(`${tipoBloco === "dia" ? "Por dia" : "Por semana"} · unidades · ${C().descreverPeriodo({ de, ate })}`);
    const rotuloBloco = (b) => (b.inicio === b.fim ? U.dataCompleta(b.inicio) : `${U.dataCurta(b.inicio)} a ${U.dataCurta(b.fim)}`);
    if (serie.some((b) => b.entradas || b.saidas)) {
      G().colunas(p.graficoMov.cartao, { rotulos: serie.map((b) => b.rotulo), series: [{ nome: "entradas", valores: serie.map((b) => Math.max(0, b.entradas)) }, { nome: "saídas", valores: serie.map((b) => Math.max(0, b.saidas)) }], formatar: (v) => `${U.numero(v)} un.`, detalheRotulo: (i) => rotuloBloco(serie[i]) });
    } else p.graficoMov.area.replaceChildren(el("p", { class: "grafico__vazio", texto: "Nenhuma entrada ou saída no período." }));
    G().tabela(p.graficoMov.cartao, ["Período", "Entradas (un.)", "Saídas (un.)"], serie.map((b) => [rotuloBloco(b), U.numero(b.entradas), U.numero(b.saidas)]));

    // Gráfico 2: evolução do valor
    const evol = E.evolucaoValor(de, ate);
    G().area(p.graficoValor.cartao, { rotulos: evol.map((x) => U.dataCurta(x.data)), valores: evol.map((x) => x.valor), formatar: (v) => U.moeda(v), nome: "Valor estimado do estoque",
      detalhes: (i) => [i > 0 ? `${evol[i].valor >= evol[i - 1].valor ? "+" : "−"}${U.moeda(Math.abs(evol[i].valor - evol[i - 1].valor))} desde ${U.dataCurta(evol[i - 1].data)}` : "início do período"] });
    G().tabela(p.graficoValor.cartao, ["Data", "Valor estimado"], evol.map((x) => [U.dataCompleta(x.data), U.moeda(x.valor)]));

    // Gráfico 3: categorias
    const cats = E.porCategoria().filter((c) => c.produtos > 0);
    const fmt = modoCategoria === "valor" ? (v) => U.moeda(v, { compacto: true }) : (v) => U.numero(v);
    const itens = cats.map((c) => ({ rotulo: c.categoria.nome, valor: c[modoCategoria], sub: `${U.plural(c.produtos, "produto", "produtos")} · ${U.unidades(c.unidades)} · ${U.moeda(c.valor)}` })).sort((a, b) => b.valor - a.valor);
    G().barras(p.graficoCat.cartao, { itens, formatar: fmt, vazio: "Nenhum produto ativo." });
    G().tabela(p.graficoCat.cartao, ["Categoria", "Produtos", "Unidades", "Valor"], cats.map((c) => [c.categoria.nome, U.numero(c.produtos), U.numero(c.unidades), U.moeda(c.valor)]));

    // Gráfico 4: mais movimentados
    const top = E.maisMovimentados(de, ate, { limite: 6 });
    p.graficoTop.definirSub(`Unidades que entraram e saíram · ${dias} dias`);
    G().barras(p.graficoTop.cartao, { itens: top.map((t) => ({ rotulo: t.produto.nome, valor: t.total, sub: `${U.numero(t.entradas)} entradas · ${U.numero(t.saidas)} saídas` })), formatar: (v) => `${U.numero(v)} un.`, vazio: "Nenhuma movimentação no período." });
    G().tabela(p.graficoTop.cartao, ["Produto", "Entradas", "Saídas", "Total"], top.map((t) => [t.produto.nome, U.numero(t.entradas), U.numero(t.saidas), U.numero(t.total)]));

    // Lista: reposição
    const repor = d.produtos.filter((x) => x.status === "ativo" && ["zerado", "baixo"].includes(E.situacao(x)))
      .sort((a, b) => (E.situacao(a) === "zerado" ? 0 : 1) - (E.situacao(b) === "zerado" ? 0 : 1) || E.saldo(a.id) / Math.max(1, a.minimo) - E.saldo(b.id) / Math.max(1, b.minimo));
    p.reposicao.replaceChildren(repor.length ? el("ul", { class: "lista-simples" }, ...repor.slice(0, 7).map((x) => {
      const pcs = E.pedidosComProduto(x.id);
      const sit = E.situacao(x);
      return el("li", {},
        el("span", { class: `tipo-mov tipo-mov--${sit}`, title: E.nomeSituacao(sit) }, el("span", { class: "tipo-mov__icone" }, icone(sit === "zerado" ? "package-x" : "triangle-alert", 14)), el("span", { class: "vh", texto: E.nomeSituacao(sit) })),
        el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/produtos/${x.id}`, texto: x.nome }), el("span", { class: "suave", texto: `${U.unidades(E.saldo(x.id))} · mínimo ${x.minimo} · ${L.nomeFornecedor(x.fornecedorId)}` })),
        el("span", { class: "lista-simples__fim" }, pcs.length
          ? el("a", { class: "link-btn", href: `#/pedidos/${pcs[0].id}`, texto: pcs[0].numero, title: `Em ${E.statusPedido(pcs[0].status).nome.toLowerCase()}` })
          : C().botao("Pedir", "btn--linha btn--pequeno", () => NX.pedidos.reposicao([x]), "plus", { "aria-label": `Criar pedido para ${x.nome}` })));
    }), repor.length > 7 ? el("li", { class: "suave" }, el("span"), el("span", { texto: `e mais ${repor.length - 7}…` }), el("span")) : null)
      : C().vazio({ icone: "circle-check", titulo: "Nada para repor", texto: "Todos os produtos ativos estão acima do mínimo." }));

    // Lista: últimas movimentações
    const ultimas = E.movimentosOrdenados().slice(-8).reverse();
    p.ultimas.replaceChildren(ultimas.length ? el("ul", { class: "lista-simples" }, ...ultimas.map((m) => {
      const prod = L.produto(m.produtoId);
      return el("li", {},
        el("span", { class: `tipo-mov tipo-mov--${m.tipo}` }, el("span", { class: "tipo-mov__icone" }, icone(NX.TIPOS_MOV.find((t) => t.id === m.tipo).icone, 14))),
        el("span", { class: "lista-simples__texto" }, el("button", { class: "link-texto", type: "button", onclick: () => NX.detalhe.movimento(m.id), texto: prod.nome }), el("span", { class: "suave", texto: `${m.motivo} · ${U.dataHoraCurta(m.data)}` })),
        el("span", { class: "lista-simples__fim" }, C().quantidade(m.quantidade), el("span", { class: "suave", texto: `saldo ${U.numero(m.saldoApos)}` })));
    })) : C().vazio({ titulo: "Nenhuma movimentação ainda" }));

    // Lista: pedidos recentes
    const recentes = [...d.pedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5);
    p.pedidos.replaceChildren(recentes.length ? el("ul", { class: "lista-simples" }, ...recentes.map((pc) => {
      const t = E.totaisPedido(pc);
      const st = E.statusPedido(pc.status);
      return el("li", {},
        el("span", { class: `pilula pilula--${E.pedidoAtrasado(pc) ? "atrasado" : pc.status}`, title: st.nome }, icone(E.pedidoAtrasado(pc) ? "clock" : st.icone, 13)),
        el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/pedidos/${pc.id}`, texto: `${pc.numero} · ${L.nomeFornecedor(pc.fornecedorId)}` }), el("span", { class: "suave", texto: `${E.pedidoAtrasado(pc) ? "Atrasado" : st.nome} · previsão ${U.dataCurta(pc.previsao)}` })),
        el("span", { class: "lista-simples__fim" }, el("span", { class: "mono", texto: U.moeda(t.total) }), el("span", { class: "suave", texto: U.plural(pc.itens.length, "item", "itens") })));
    })) : C().vazio({ titulo: "Nenhum pedido ainda" }));
  }

  NX.telas.painel = { titulo: "Dashboard", montar, atualizar };
})();
