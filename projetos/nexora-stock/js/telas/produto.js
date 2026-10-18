/* ==========================================================================
   NEXORA STOCK — Tela: página do produto
   Saldo, valores, dados do cadastro, gráfico do saldo, pedidos em aberto e
   histórico completo de movimentações do produto.
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
  const linhaFicha = (...a) => NX.detalhe.linhaFicha(...a);

  let id = null;
  let pagina = 1;
  let secao = null;
  let partes = null;

  function abrir(novoId) { if (novoId !== id) pagina = 1; id = novoId; }

  function montar(s) {
    secao = s;
    const prod = L.produto(id);
    if (!prod) {
      secao.replaceChildren(C().voltar("produtos", "Produtos"), el("div", { class: "cartao" }, C().vazio({ icone: "package-x", titulo: "Produto não encontrado", texto: "Ele pode ter sido criado em outro navegador ou os dados foram restaurados.", acao: el("a", { class: "btn btn--linha", href: "#/produtos" }, "Ver produtos") })));
      partes = null;
      return;
    }
    partes = { cabeca: el("div"), aviso: el("div"), lado: el("div", { class: "produto-grade__lado" }), principal: el("div", { class: "produto-grade__principal" }) };
    partes.grafico = C().cartaoGrafico({ titulo: "Saldo nos últimos 90 dias", sub: "Unidades ao fim de cada dia", legenda: C().legenda([["", "Saldo"], ["chave--linha", "Estoque mínimo"]]) });
    partes.pedidos = el("div");
    partes.historico = el("div");
    partes.principal.append(partes.grafico.cartao, partes.pedidos, partes.historico);
    secao.replaceChildren(partes.cabeca, partes.aviso, el("div", { class: "produto-grade" }, partes.lado, partes.principal));
  }

  function atualizar() {
    if (!partes) return;
    const prod = L.produto(id);
    if (!prod) { montar(secao); return; }
    const s = E.saldo(prod.id);
    const sit = E.situacao(prod);
    const ativo = prod.status === "ativo";
    const cat = L.categoria(prod.categoriaId);
    const forn = L.fornecedor(prod.fornecedorId);

    partes.cabeca.replaceChildren(C().cabecalho({
      id: "produto", titulo: prod.nome, antes: C().voltar("produtos", "Produtos"),
      etiquetas: [el("span", { class: "mono suave", texto: prod.sku }), C().pilulaSituacao(prod), el("span", { class: "suave", texto: cat ? cat.nome : "" })],
      acoes: ativo ? [
        C().botao("Entrada", "btn--linha", () => NX.form.entrada({ produtoId: prod.id }), "arrow-down-to-line", { "aria-label": "Registrar entrada" }),
        C().botao("Saída", "btn--linha", () => NX.form.saida({ produtoId: prod.id }), "arrow-up-from-line", { "aria-label": "Registrar saída" }),
        C().botao("Ajustar", "btn--linha", () => NX.form.ajuste({ produtoId: prod.id }), "sliders-horizontal", { "aria-label": "Ajuste de inventário" }),
        C().botao("Editar", "btn--linha", () => NX.form.produto({ id: prod.id }), "pencil"),
        C().botao("Arquivar", "btn--fantasma", () => NX.acoes.arquivarProduto(prod.id), "archive"),
      ] : [
        C().botao("Editar", "btn--linha", () => NX.form.produto({ id: prod.id }), "pencil"),
        C().botao("Reativar produto", "btn--primario", () => NX.acoes.reativarProduto(prod.id), "archive-restore"),
      ],
    }));
    const pcs = E.pedidosComProduto(prod.id);
    partes.aviso.replaceChildren(
      !ativo ? el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("archive", 16), el("span", {}, el("b", { texto: "Produto arquivado" }), ` em ${prod.arquivadoEm ? U.dataHora(prod.arquivadoEm) : "data não registrada"}. Ele não aceita movimentações nem gera alertas. O histórico continua abaixo.`)) :
      (sit === "zerado" || sit === "baixo") && !pcs.length ? el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("triangle-alert", 16), el("span", {}, el("b", { texto: sit === "zerado" ? "Sem estoque e sem pedido em aberto. " : "Estoque baixo e sem pedido em aberto. " }), "Crie um pedido de compra para repor."), C().botao("Criar pedido", "btn--linha btn--pequeno", () => NX.pedidos.reposicao([prod]), "clipboard-list")) : "");

    // Lado: saldo, números e ficha
    const ref = Math.max(prod.minimo * 2, 1);
    const margem = prod.preco > 0 ? (prod.preco - prod.custo) / prod.preco : 0;
    partes.lado.replaceChildren(
      el("article", { class: "cartao saldo-destaque" },
        el("p", { class: "rotulo", texto: "Quantidade disponível" }),
        el("p", { class: "saldo-destaque__numero" }, U.numero(s), el("small", { texto: s === 1 ? "unidade" : "unidades" })),
        el("span", { class: `medidor medidor--${sit}`, role: "img", "aria-label": `Saldo ${s} para mínimo ${prod.minimo}` }, el("i", { style: { width: `${Math.round(Math.min(1, s / ref) * 100)}%` } })),
        el("p", { class: "suave", texto: `Estoque mínimo: ${U.unidades(prod.minimo)}${sit === "baixo" ? ` · faltam ${U.unidades(prod.minimo * 2 - s)} para o dobro do mínimo` : ""}` }),
        el("div", { class: "numeros" },
          el("div", {}, el("span", { texto: "Valor em estoque" }), el("b", { texto: U.moeda(E.valorDoProduto(prod)) })),
          el("div", {}, el("span", { texto: "Margem" }), el("b", { class: margem < 0 ? "negativo" : "", texto: U.percentual(margem) })),
          el("div", {}, el("span", { texto: "Preço de custo" }), el("b", { texto: U.moeda(prod.custo) })),
          el("div", {}, el("span", { texto: "Preço de venda" }), el("b", { texto: U.moeda(prod.preco) })))),
      el("article", { class: "cartao" },
        C().miniatura(prod, true),
        el("dl", { class: "ficha ficha--coluna", style: { marginTop: "10px" } },
          linhaFicha("Categoria", cat ? el("a", { class: "link-texto", href: `#/produtos?categoria=${cat.id}`, texto: cat.status === "ativa" ? cat.nome : `${cat.nome} (arquivada)` }) : null),
          linhaFicha("Fornecedor principal", forn ? el("a", { class: "link-texto", href: `#/fornecedores/${forn.id}`, texto: forn.status === "ativo" ? forn.nome : `${forn.nome} (inativo)` }) : null),
          linhaFicha("Localização", prod.localizacao),
          linhaFicha("Código de barras", prod.codigoBarras ? el("span", { class: "mono", texto: prod.codigoBarras }) : null),
          linhaFicha("Cadastrado em", U.dataCompleta(prod.criadoEm)),
          linhaFicha("Descrição", prod.descricao))),
    );

    // Gráfico do saldo
    const ate = U.hoje();
    const de = U.somarDias(ate, -89) < prod.criadoEm ? prod.criadoEm : U.somarDias(ate, -89);
    const serie = E.saldoNoTempo(prod.id, de, ate);
    G().area(partes.grafico.cartao, { rotulos: serie.map((x) => U.dataCurta(x.data)), valores: serie.map((x) => x.saldo), formatar: (v) => U.unidades(v), eixo: (v) => U.numero(v), inteiro: true, nome: `Saldo de ${prod.nome}`, referencia: prod.minimo > 0 ? { valor: prod.minimo, rotulo: `mínimo ${prod.minimo}` } : null });
    G().tabela(partes.grafico.cartao, ["Dia", "Saldo"], serie.map((x) => [U.dataCompleta(x.data), U.numero(x.saldo)]));

    // Pedidos em aberto
    partes.pedidos.replaceChildren(el("article", { class: "cartao" },
      el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Pedidos de compra em aberto" }), el("p", { class: "cartao__sub", texto: "Rascunhos, pendentes e enviados com este produto" })),
        ativo ? C().botao("Novo pedido", "btn--linha btn--pequeno", () => NX.pedidos.reposicao([prod]), "plus") : null),
      pcs.length ? el("ul", { class: "lista-simples" }, ...pcs.map((pc) => {
        const it = pc.itens.find((x) => x.produtoId === prod.id);
        return el("li", {},
          el("span", { class: `pilula pilula--${E.pedidoAtrasado(pc) ? "atrasado" : pc.status}` }, icone(E.statusPedido(pc.status).icone, 13)),
          el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/pedidos/${pc.id}`, texto: `${pc.numero} · ${L.nomeFornecedor(pc.fornecedorId)}` }), el("span", { class: "suave", texto: `${E.statusPedido(pc.status).nome}${E.pedidoAtrasado(pc) ? " (atrasado)" : ""} · previsão ${U.dataCompleta(pc.previsao)}` })),
          el("span", { class: "lista-simples__fim" }, el("b", { class: "mono", texto: `${U.numero(it.quantidade - it.recebido)} un.` }), el("span", { class: "suave", texto: it.recebido ? `de ${it.quantidade} (já chegaram ${it.recebido})` : "a receber" })));
      })) : el("p", { class: "vazio-pequeno", texto: "Nenhum pedido em aberto com este produto." })));

    // Histórico
    const movs = [...E.movimentosDoProduto(prod.id)].reverse();
    const pag = C().paginar(movs, pagina, 10);
    pagina = pag.pagina;
    partes.historico.replaceChildren(el("article", { class: "cartao cartao--tabela" },
      el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Histórico de movimentações" }), el("p", { class: "cartao__sub", texto: `${U.plural(movs.length, "movimentação", "movimentações")} · clique em uma linha para ver os detalhes` })),
        C().botao("CSV", "btn--linha btn--pequeno", () => U.baixarCSV(U.nomeArquivo(`historico-${prod.sku.toLowerCase()}`), ["Nº", "Data e hora", "Tipo", "Quantidade", "Saldo anterior", "Saldo após", "Motivo", "Documento", "Responsável", "Observação"],
          movs.map((m) => [m.numero, U.dataHora(m.data), m.tipo === "estorno" ? `Estorno de ${m.tipoOriginal}` : NX.TIPOS_MOV.find((t) => t.id === m.tipo).nome, m.quantidade, m.saldoAnterior, m.saldoApos, m.motivo, m.documento, L.membro(m.responsavelId).nome, m.observacao])), "download", { "aria-label": "Exportar histórico em CSV" })),
      movs.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
        el("thead", {}, el("tr", {}, ...["Data e hora", "Tipo", "Quantidade", "Saldo após", "Motivo", "Responsável"].map((t, i) => el("th", { scope: "col", class: [2, 3].includes(i) ? "num" : "", texto: t })))),
        el("tbody", {}, ...pag.itens.map((m) => el("tr", { class: "linha-clicavel", tabindex: "0", "aria-label": `Movimentação nº ${m.numero}, abrir detalhes`, onclick: () => NX.detalhe.movimento(m.id), onkeydown: (e) => { if (e.key === "Enter") NX.detalhe.movimento(m.id); } },
          C().td("Data e hora", U.dataHora(m.data), "principal-celula nowrap"),
          C().td("Tipo", el("span", {}, C().tipoMovimento(m), m.estornadoPor ? el("span", { class: "marca-estorno" }, "estornada") : null)),
          C().td("Quantidade", C().quantidade(m.quantidade), "num"),
          C().td("Saldo após", el("span", { class: "mono", texto: U.numero(m.saldoApos) }), "num"),
          C().td("Motivo", el("span", { class: "linha-mov" }, el("span", { class: "celula-texto", texto: m.motivo }), m.documento ? el("span", { class: "sub mono", texto: m.documento }) : null), "inteira"),
          C().td("Responsável", L.membro(m.responsavelId).nome)))))) : C().vazio({ titulo: "Sem movimentações" }),
      C().paginacao(pag, { porPagina: 10, nome: "historico", aoMudar: (n) => { pagina = n; atualizar(); }, aoMudarTamanho: () => {} })));
    const sel = partes.historico.querySelector(".paginacao select");
    if (sel) sel.remove();
  }

  NX.telas.produto = { titulo: "Produto", montar, atualizar, abrir, tituloDinamico: () => (L.produto(id) || {}).nome };
})();
