/* ==========================================================================
   NEXORA AUTO — documentos.js
   Versões para imprimir (ou salvar em PDF pelo próprio navegador) da ordem
   de serviço, do orçamento e dos relatórios. Usam os dados e as opções de
   Configurações → Documentos (CNPJ, endereço, garantia e rodapé).
   Nenhum documento é fiscal e nenhum tem assinatura digital.
   ========================================================================== */
window.NX = window.NX || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const { el, $ } = U;

  function cabecalhoOficina() {
    const of = L.dados.oficina;
    const doc = of.documentos;
    const linhas = [
      of.razaoSocial && of.razaoSocial !== of.nome ? of.razaoSocial : null,
      doc.mostrarCnpj && of.cnpj ? `CNPJ ${U.mascaraCnpj(of.cnpj)}` : null,
      doc.mostrarEndereco && of.endereco ? of.endereco : null,
      [of.telefone ? `Tel. ${of.telefone}` : null, of.whatsapp ? `WhatsApp ${U.mascaraTelefone(of.whatsapp.slice(2))}` : null].filter(Boolean).join(" · ") || null,
      of.horarioTexto || null,
    ].filter(Boolean);
    return el("header", { class: "doc__cabeca" },
      of.logo ? el("img", { class: "doc__logo", src: of.logo, alt: "" }) : el("span", { class: "doc__logo doc__logo--texto", texto: U.iniciais(of.nome) }),
      el("div", {}, el("strong", { class: "doc__oficina", texto: of.nome }), ...linhas.map((t) => el("span", { texto: t }))));
  }
  function rodape(ficticio) {
    const of = L.dados.oficina;
    return el("footer", { class: "doc__rodape" },
      of.documentos.mostrarGarantia && of.orcamento.garantia ? el("p", {}, el("b", { texto: "Garantia: " }), of.orcamento.garantia) : null,
      of.documentos.rodape ? el("p", { texto: of.documentos.rodape }) : null,
      el("p", { class: "doc__gerado", texto: `Gerado em ${U.dataHora(U.agora())} pelo NEXORA AUTO (projeto demonstrativo).${ficticio ? " Dados fictícios de exemplo." : ""}` }));
  }
  const bloco = (titulo, ...filhos) => el("section", { class: "doc__bloco" }, el("h2", { texto: titulo }), ...filhos);
  const dados = (pares) => el("dl", { class: "doc__dados" }, ...pares.filter(([, v]) => v != null && v !== "").flatMap(([k, v]) => [el("dt", { texto: k }), el("dd", { texto: String(v) })]));
  function tabelaItens(itens, desconto) {
    const t = O.totais(itens, desconto);
    const tipo = { servico: "Serviço", peca: "Peça", mao: "Mão de obra" };
    return el("div", {},
      el("table", { class: "doc__tabela" },
        el("thead", {}, el("tr", {}, ...["Item", "Tipo", "Qtd.", "Unitário", "Total"].map((c, i) => el("th", { class: i >= 2 ? "num" : "", texto: c })))),
        el("tbody", {}, ...itens.map((i) => el("tr", {},
          el("td", { texto: i.descricao }), el("td", { texto: tipo[i.tipo] }),
          el("td", { class: "num", texto: i.tipo === "mao" ? `${U.decimal(i.quantidade)} h` : String(i.quantidade) }),
          el("td", { class: "num", texto: U.moeda(i.unitario) }), el("td", { class: "num", texto: U.moeda(O.valorItem(i)) }))))),
      el("dl", { class: "doc__totais" },
        el("dt", { texto: "Serviços e mão de obra" }), el("dd", { texto: U.moeda(t.maoDeObra) }),
        el("dt", { texto: "Peças" }), el("dd", { texto: U.moeda(t.pecas) }),
        el("dt", { texto: "Subtotal" }), el("dd", { texto: U.moeda(t.subtotal) }),
        ...(t.desconto ? [el("dt", { texto: "Desconto" }), el("dd", { texto: `− ${U.moeda(t.desconto)}` })] : []),
        el("dt", { class: "doc__total", texto: "Total" }), el("dd", { class: "doc__total", texto: U.moeda(t.total) })));
  }
  function dadosClienteVeiculo(clienteId, veiculoId, extra = []) {
    const c = L.cliente(clienteId) || {};
    const v = L.veiculo(veiculoId) || {};
    return el("div", { class: "doc__duas" },
      bloco("Cliente", dados([["Nome", c.nome], ["Telefone", c.telefone ? U.mascaraTelefone(c.telefone) : ""], ["Documento", c.documento ? L.mostrarDocumento(c.documento) : ""], ["E-mail", c.email]])),
      bloco("Veículo", dados([["Placa", v.placa ? L.mostrarPlaca(v.placa) : ""], ["Veículo", `${v.marca || ""} ${v.modelo || ""}`.trim()], ["Ano", v.anoFab ? `${v.anoFab}/${v.anoModelo}` : ""], ["Cor", v.cor], ["Combustível", v.combustivel], ...extra])));
  }

  function imprimir(conteudo, titulo) {
    const area = $("#impressao");
    U.trocar(area, el("article", { class: "doc" }, ...conteudo));
    const tituloAntes = document.title;
    document.title = titulo;
    document.body.classList.add("imprimindo");
    const limpar = () => { document.body.classList.remove("imprimindo"); document.title = tituloAntes; window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    setTimeout(() => { window.print(); setTimeout(limpar, 1000); }, 50);
  }

  function imprimirOS(os) {
    const st = NX.STATUS_OS.find((s) => s.id === os.status);
    const orc = O.orcamentoAprovado(os);
    const conteudo = [
      cabecalhoOficina(),
      el("div", { class: "doc__titulo" }, el("h1", { texto: `Ordem de serviço ${os.numero}` }), el("p", { texto: `Situação: ${st.nome} · Aberta em ${U.dataHora(os.abertaEm)}` })),
      dadosClienteVeiculo(os.clienteId, os.veiculoId, [["Km na entrada", `${U.numero(os.kmEntrada)} km`], ["Km na saída", os.kmSaida != null ? `${U.numero(os.kmSaida)} km` : ""]]),
      bloco("Relato do cliente", el("p", { texto: os.relato })),
      os.diagnostico ? bloco("Diagnóstico técnico", el("p", { texto: os.diagnostico })) : null,
      bloco("Serviços, peças e mão de obra", os.itens.length ? tabelaItens(os.itens, os.desconto) : el("p", { texto: "Nenhum item registrado." })),
      bloco("Andamento", dados([
        ["Técnico responsável", os.tecnicoId ? NX.componentes.nomeDoTecnico(os.tecnicoId) : "Não definido"],
        ["Previsão de conclusão", os.previsao ? U.dataHora(os.previsao) : ""],
        ["Orçamento aprovado", orc ? `${O.rotuloOrc(orc)}${orc.aprovacao ? ` — ${orc.aprovacao.por} (${orc.aprovacao.canal}), ${U.dataHora(orc.aprovacao.em)}; registro interno, sem assinatura digital` : ""}` : ""],
        ["Serviço finalizado", os.finalizadaEm ? U.dataHora(os.finalizadaEm) : ""],
        ["Faturado", os.faturamento ? `${U.moeda(os.faturamento.valor)} em ${U.dataHora(os.faturamento.em)}` : ""],
        ["Recebido", os.faturamento ? `${U.moeda(O.recebido(os))} (em aberto: ${U.moeda(O.aReceber(os))})` : ""],
        ["Entregue", os.entregueEm ? `${U.dataHora(os.entregueEm)} a ${os.retiradoPor}` : ""],
        ["Cancelamento", os.cancelamento ? `${U.dataHora(os.cancelamento.em)}: ${os.cancelamento.motivo}` : ""],
      ])),
      os.observacoes ? bloco("Observações", el("p", { texto: os.observacoes })) : null,
      rodape(os.ficticio),
    ];
    imprimir(conteudo.filter(Boolean), `${os.numero} · ${L.dados.oficina.nome}`);
  }

  function imprimirOrcamento(o) {
    const st = NX.STATUS_ORC.find((s) => s.id === O.statusOrc(o));
    const os = o.osId ? L.ordem(o.osId) : null;
    const conteudo = [
      cabecalhoOficina(),
      el("div", { class: "doc__titulo" }, el("h1", { texto: `Orçamento ${O.rotuloOrc(o)}` }), el("p", { texto: `Emitido em ${U.dataCompleta(o.emitidoEm)} · Válido até ${U.dataCompleta(o.validade)} · Situação: ${st.nome}${os ? ` · ${os.numero}` : ""}` })),
      dadosClienteVeiculo(o.clienteId, o.veiculoId),
      bloco("Itens do orçamento", tabelaItens(o.itens, o.desconto)),
      o.observacoes ? bloco("Observações", el("p", { texto: o.observacoes })) : null,
      o.aprovacao ? bloco("Aprovação", el("p", { texto: `Aprovado por ${o.aprovacao.por} (${o.aprovacao.canal}) em ${U.dataHora(o.aprovacao.em)}, registrado por ${o.aprovacao.registradoPor}. Registro interno da oficina, sem assinatura digital.` })) : null,
      o.recusa ? bloco("Recusa", el("p", { texto: `Recusado em ${U.dataHora(o.recusa.em)}: ${o.recusa.motivo}` })) : null,
      rodape(o.ficticio),
    ];
    imprimir(conteudo.filter(Boolean), `${O.rotuloOrc(o)} · ${L.dados.oficina.nome}`);
  }

  function imprimirRelatorio({ titulo, sub, cabecalho, linhas, resumo = [] }) {
    const conteudo = [
      cabecalhoOficina(),
      el("div", { class: "doc__titulo" }, el("h1", { texto: titulo }), el("p", { texto: sub })),
      resumo.length ? dados(resumo) : null,
      el("table", { class: "doc__tabela doc__tabela--relatorio" },
        el("thead", {}, el("tr", {}, ...cabecalho.map((c) => el("th", { texto: c })))),
        el("tbody", {}, ...(linhas.length ? linhas.map((l) => el("tr", {}, ...l.map((c) => el("td", { class: typeof c === "number" ? "num" : "", texto: typeof c === "number" ? U.decimal(c) : c == null ? "" : String(c) })))) : [el("tr", {}, el("td", { colspan: String(cabecalho.length), texto: "Nenhum registro no período." }))]))),
      rodape(L.dados.demo && L.dados.demo.historico),
    ];
    imprimir(conteudo.filter(Boolean), `${titulo} · ${L.dados.oficina.nome}`);
  }

  NX.documentos = { imprimirOS, imprimirOrcamento, imprimirRelatorio };
})();
