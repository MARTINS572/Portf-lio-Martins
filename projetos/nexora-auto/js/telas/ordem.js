/* ==========================================================================
   NEXORA AUTO — Tela: Ordem de serviço (detalhe)
   Andamento por etapas, próximo passo (com o que falta para avançar),
   relato e diagnóstico, itens com a situação de cada peça no estoque,
   orçamentos e revisões, financeiro e histórico completo.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const { el, icone } = U;
  const C = () => NX.componentes;
  let osId = null;
  let secao = null;

  const ETAPAS = [
    ["aguardando_avaliacao", "Recebida"], ["em_diagnostico", "Diagnóstico"], ["aguardando_orcamento", "Orçamento"], ["aguardando_aprovacao", "Aprovação"],
    ["aprovada", "Aprovada"], ["em_execucao", "Execução"], ["aguardando_retirada", "Pronta"], ["concluida", "Faturada"], ["entregue", "Entregue"],
  ];
  const indiceEtapa = (st) => (st === "aguardando_pecas" ? 4 : ETAPAS.findIndex(([id]) => id === st));
  const ROTULO_ACAO = {
    em_diagnostico: ["Iniciar diagnóstico", "stethoscope"], aguardando_orcamento: ["Diagnóstico concluído", "calculator"],
    em_execucao: ["Iniciar execução", "wrench"], aguardando_retirada: ["Finalizar serviço", "check"], concluida: ["Encerrar e faturar", "receipt"], entregue: ["Registrar entrega", "key-round"],
  };
  const ACAO_DO_STATUS = { cancelada: "os_cancelar", concluida: "os_encerrar", entregue: "os_entregar" };

  function etapas(os) {
    if (os.status === "cancelada") return el("p", { class: "aviso-cancelada", role: "note" }, icone("circle-x", 18), el("span", {}, el("b", { texto: "Ordem cancelada" }), ` em ${U.dataHora(os.cancelamento.em)} por ${os.cancelamento.por}: ${os.cancelamento.motivo}`));
    const atual = indiceEtapa(os.status);
    return el("ol", { class: "etapas", "aria-label": "Andamento da ordem" }, ...ETAPAS.map(([id, nome], i) => el("li", { class: `etapa${i < atual ? " is-feita" : i === atual ? " is-atual" : ""}`, "aria-current": i === atual ? "step" : null },
      el("span", { class: "etapa__marca", "aria-hidden": "true" }, i < atual ? icone("check", 12) : String(i + 1)),
      el("span", { class: "etapa__nome", texto: i === atual && os.status === "aguardando_pecas" ? "Aguardando peças" : nome }))));
  }

  function proximoPasso(os) {
    const passos = O.proximos(os).filter((x) => x.status !== "cancelada");
    const blocos = [];
    passos.forEach(({ status, pendencias }) => {
      const acao = ACAO_DO_STATUS[status] || "os_status";
      const pode = O.pode(acao);
      const [rotulo, ic] = ROTULO_ACAO[status] || [`Mover para ${O.nomeStatus(status)}`, "arrow-right"];
      const rotuloFinal = os.status === "aguardando_orcamento" && status === "em_diagnostico" ? "Voltar ao diagnóstico" : rotulo;
      const principal = status !== "em_diagnostico" || os.status === "aguardando_avaliacao";
      blocos.push(el("div", { class: "passo" },
        el("button", { class: `btn ${principal ? "btn--primario" : "btn--linha"}`, type: "button", disabled: !pode || pendencias.length > 0, "data-foco": `passo-${status}`, onclick: () => NX.form.mudarStatus(os, status) }, icone(ic, 16), rotuloFinal),
        !pode ? el("p", { class: "passo__nota" }, icone("lock", 13), `Seu perfil (${O.perfilAtual().nome}) não pode ${NX.ACOES[acao]}.`) : null,
        pode && pendencias.length ? el("ul", { class: "pendencias", "aria-label": "O que falta" }, ...pendencias.map((t) => el("li", {}, icone("circle-alert", 13), t))) : null));
    });
    // Ações de contexto
    const extras = [];
    const pend = O.orcamentoPendente(os);
    if (O.itensEditaveis(os) && O.pode("os_itens")) extras.push(C().botao("Incluir item", "btn--linha", () => NX.form.item(os), "plus"));
    if (["em_diagnostico", "aguardando_orcamento"].includes(os.status) && !os.orcamentoId && !pend && O.pode("orc_criar")) extras.push(C().botao("Gerar orçamento", "btn--linha", () => NX.form.gerarOrcamento(os), "file-plus", { disabled: !os.itens.length || String(os.diagnostico || "").trim().length < 10, title: !os.itens.length ? "Inclua os itens antes" : String(os.diagnostico || "").trim().length < 10 ? "Registre o diagnóstico antes" : null }));
    if (pend && O.podeVer("orcamentos")) extras.push(el("a", { class: "btn btn--linha", href: `#/orcamentos/${pend.id}` }, icone("file-text", 16), `Ver ${O.rotuloOrc(pend)} (${pend.status === "rascunho" ? "rascunho" : "aguardando"})`));
    if (pend && pend.status === "aguardando_aprovacao" && O.pode("orc_aprovar")) {
      extras.push(C().botao("Registrar aprovação", "btn--primario", () => NX.form.aprovar(pend), "thumbs-up"));
      extras.push(C().botao("Registrar recusa", "btn--linha", () => NX.form.recusar(pend), "thumbs-down"));
    }
    if (pend && pend.status === "rascunho" && O.pode("orc_criar")) extras.push(C().botao("Enviar orçamento", "btn--primario", () => { const r = O.enviarOrcamento(pend.id); U.aviso(r.ok ? "Orçamento enviado para aprovação." : r.erro, r.ok ? "ok" : "erro"); }, "send"));
    const aprovado = O.orcamentoAprovado(os);
    if (aprovado && !pend && !["aguardando_retirada", "concluida", "entregue", "cancelada"].includes(os.status) && O.pode("orc_criar")) extras.push(C().botao("Revisar orçamento", "btn--linha", () => revisar(aprovado), "file-pen-line", { title: "Para incluir ou mudar itens já aprovados (precisa de nova aprovação)" }));
    if (os.faturamento && O.aReceber(os) > 0 && O.pode("recebimento")) extras.push(C().botao("Registrar recebimento", "btn--primario", () => NX.form.recebimento(os), "circle-dollar-sign"));
    if (O.PODE_CANCELAR.includes(os.status) && O.pode("os_cancelar")) extras.push(C().botao("Cancelar ordem", "btn--perigo", () => NX.form.cancelarOS(os), "circle-x"));
    const faltam = os.itens.filter((i) => i.tipo === "peca" && i.estado === "falta");
    const nota = blocos.length ? null : {
      aguardando_aprovacao: "Aguardando o cliente responder ao orçamento. Enquanto isso, nenhuma peça é reservada.",
      aguardando_pecas: `Aguardando a entrada no estoque de: ${faltam.map((i) => `${i.quantidade}× ${i.descricao}`).join(", ")}. Quando a peça entrar, a reserva é feita sozinha e a ordem volta para "${O.nomeStatus(os.retomarStatus || "aprovada")}".`,
      entregue: `Veículo entregue em ${os.entregueEm ? U.dataHora(os.entregueEm) : "—"} a ${os.retiradoPor || "—"}.`,
    }[os.status];
    if (!blocos.length && !extras.length && !nota) return null;
    return el("section", { class: "cartao proximo-passo", "aria-labelledby": "titulo-proximo" },
      el("h2", { class: "cartao__titulo", id: "titulo-proximo", texto: os.status === "entregue" ? "Ordem finalizada" : "Próximo passo" }),
      blocos.length ? el("div", { class: "passos" }, ...blocos) : null,
      nota ? el("p", { class: "passo__aguardando" }, icone(os.status === "entregue" ? "key-round" : "hourglass", 16), nota) : null,
      faltam.length && O.pode("estoque_mov") ? el("div", { class: "acoes-contexto acoes-contexto--sem-linha" }, ...faltam.map((i) => C().botao(`Registrar entrada: ${i.descricao.split(" · ")[0]}`, "btn--linha", () => NX.form.movimento("entrada", i.refId), "arrow-down-to-line"))) : null,
      extras.length ? el("div", { class: "acoes-contexto" }, ...extras) : null);
  }

  async function revisar(o) {
    const r = O.revisarOrcamento(o.id);
    if (!r.ok) { U.aviso(r.erro, "erro"); return; }
    U.aviso(`Revisão ${r.orcamento.revisao} criada como rascunho. Inclua os itens e envie ao cliente.`, "info");
    setTimeout(() => NX.form.editorOrcamento(r.orcamento.id), 30);
  }

  function cartaoItens(os) {
    const editavel = O.itensEditaveis(os) && O.pode("os_itens");
    const t = O.totaisOS(os);
    const tipoIcone = { servico: "wrench", peca: "package", mao: "hard-hat" };
    const tipoNome = { servico: "Serviço", peca: "Peça", mao: "Mão de obra" };
    const corpo = os.itens.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes tabela--itens" },
      el("caption", { class: "vh", texto: "Itens da ordem" }),
      el("thead", {}, el("tr", {}, ...["Item", "Qtd.", "Unitário", "Total", "Estoque", ""].map((c, i) => el("th", { scope: "col", class: [1, 2, 3].includes(i) ? "num" : "", texto: c })))),
      el("tbody", {}, ...os.itens.map((i) => el("tr", {},
        C().td("", el("span", { class: "item-desc" }, el("span", { class: `item-tipo item-tipo--${i.tipo}`, title: tipoNome[i.tipo] }, icone(tipoIcone[i.tipo], 14)), el("span", {}, el("b", { texto: i.descricao }), el("small", { class: "suave", texto: tipoNome[i.tipo] }))), "principal-celula"),
        C().td("Qtd.", i.tipo === "mao" ? `${U.decimal(i.quantidade)} h` : String(i.quantidade), "num"),
        C().td("Unitário", U.moeda(i.unitario), "num"),
        C().td("Total", el("b", { texto: U.moeda(O.valorItem(i)) }), "num"),
        C().td("Estoque", i.tipo === "peca" ? C().pilulaPeca(i.estado) : el("span", { class: "suave", texto: "—" })),
        C().td("", editavel ? el("button", { class: "icone-btn icone-btn--sutil icone-btn--perigo icone-btn--p", type: "button", "aria-label": `Remover ${i.descricao}`, onclick: async () => {
          if (!(await U.confirmar({ titulo: "Remover item?", texto: `${i.descricao} sai da ordem. Isso fica no histórico.`, rotulo: "Remover", perigo: true }))) return;
          const r = O.removerItem(os.id, i.id); U.aviso(r.ok ? "Item removido." : r.erro, r.ok ? "ok" : "erro");
        } }, icone("trash", 15)) : null, "acoes-linha"))))),
    el("dl", { class: "totais" },
      el("dt", { texto: "Serviços e mão de obra" }), el("dd", { texto: U.moeda(t.maoDeObra) }),
      el("dt", { texto: "Peças" }), el("dd", { texto: U.moeda(t.pecas) }),
      t.desconto ? el("dt", { texto: "Desconto" }) : null, t.desconto ? el("dd", { texto: `− ${U.moeda(t.desconto)}` }) : null,
      el("dt", { class: "totais__total", texto: "Total" }), el("dd", { class: "totais__total", texto: U.moeda(t.total) })))
      : C().vazio({ icone: "list-plus", titulo: "Nenhum item ainda", texto: "Depois do diagnóstico, inclua serviços, peças e mão de obra para montar o orçamento.", acao: editavel ? C().botao("Incluir item", "btn--primario btn--pequeno", () => NX.form.item(os), "plus") : null });
    const nota = os.orcamentoId
      ? "Itens aprovados pelo cliente: não mudam sem uma revisão do orçamento. Peças reservadas saem do estoque uma única vez, na finalização do serviço."
      : "Colocar uma peça aqui não mexe no estoque. Ela só é reservada quando o cliente aprovar o orçamento.";
    return el("section", { class: "cartao", "aria-labelledby": "titulo-itens" },
      el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", id: "titulo-itens", texto: "Serviços, peças e mão de obra" }), el("p", { class: "cartao__sub", texto: nota })),
        editavel && os.itens.length ? C().botao("Incluir item", "btn--linha btn--pequeno", () => NX.form.item(os), "plus") : null),
      corpo);
  }

  function cartaoRelato(os) {
    const pode = O.pode("os_editar") && !["entregue", "cancelada"].includes(os.status);
    return el("section", { class: "cartao", "aria-labelledby": "titulo-relato" },
      el("div", { class: "cartao__cabeca" }, el("h2", { class: "cartao__titulo", id: "titulo-relato", texto: "Relato e diagnóstico" }), pode ? C().botao("Editar", "btn--linha btn--pequeno", () => NX.form.editarOS(os), "pencil") : null),
      el("dl", { class: "ficha ficha--coluna" },
        el("div", { class: "ficha__linha" }, el("dt", { texto: "O que o cliente relatou" }), el("dd", { texto: os.relato })),
        el("div", { class: "ficha__linha" }, el("dt", { texto: "Diagnóstico técnico" }), el("dd", {}, os.diagnostico || el("span", { class: "suave" }, "Ainda não registrado. ", pode ? el("button", { class: "link-btn", type: "button", onclick: () => NX.form.editarOS(os, { foco: "diagnostico" }) }, "Registrar diagnóstico") : null))),
        os.observacoes ? el("div", { class: "ficha__linha" }, el("dt", { texto: "Observações internas" }), el("dd", { texto: os.observacoes })) : null));
  }

  function cartaoOrcamentos(os) {
    if (!O.podeVer("orcamentos") && !O.podeVer("ordens")) return null;
    const lista = L.dados.orcamentos.filter((o) => o.osId === os.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    return el("section", { class: "cartao", "aria-labelledby": "titulo-orcs" },
      el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", id: "titulo-orcs", texto: "Orçamentos desta ordem" }), el("p", { class: "cartao__sub", texto: "Aprovado não muda: mudanças viram uma revisão, que precisa de nova aprovação." }))),
      lista.length ? el("ul", { class: "lista-simples" }, ...lista.map((o) => el("li", {},
        el("span", { class: "alerta-icone" }, icone("file-text", 16)),
        el("span", { class: "lista-simples__texto" }, O.podeVer("orcamentos") ? el("a", { class: "link-texto", href: `#/orcamentos/${o.id}`, texto: O.rotuloOrc(o) }) : el("b", { texto: O.rotuloOrc(o) }),
          el("span", { class: "suave", texto: o.cancelamento ? `Cancelado: ${o.cancelamento.motivo}` : o.aprovacao ? `Aprovado por ${o.aprovacao.por} (${o.aprovacao.canal}) em ${U.dataHoraCurta(o.aprovacao.em)}` : o.recusa ? `Recusado: ${o.recusa.motivo}` : `Emitido ${U.dataCurta(o.emitidoEm)} · válido até ${U.dataCurta(o.validade)}` })),
        el("span", { class: "lista-simples__fim" }, el("b", { texto: U.moeda(O.totaisOrc(o).total) }), C().pilulaOrc(o))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum orçamento gerado ainda." }));
  }

  function cartaoLado(os) {
    const v = L.veiculo(os.veiculoId);
    const agora = U.agora();
    const atrasada = os.previsao && O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status) && os.previsao < agora;
    const linha = (k, val) => el("div", { class: "ficha__linha" }, el("dt", { texto: k }), el("dd", {}, val));
    const cartoes = [
      el("section", { class: "cartao", "aria-labelledby": "titulo-veiculo-os" },
        el("h2", { class: "cartao__titulo cartao__titulo--espaco", id: "titulo-veiculo-os", texto: "Veículo e cliente" }),
        el("div", { class: "pilha" }, C().nomeVeiculo(os.veiculoId), C().nomeCliente(os.clienteId)),
        el("dl", { class: "ficha ficha--coluna" },
          linha("Quilometragem na entrada", `${U.numero(os.kmEntrada)} km`),
          os.kmSaida != null ? linha("Quilometragem na saída", `${U.numero(os.kmSaida)} km`) : null,
          v ? linha("Combustível", v.combustivel) : null)),
      el("section", { class: "cartao", "aria-labelledby": "titulo-andamento" },
        el("h2", { class: "cartao__titulo cartao__titulo--espaco", id: "titulo-andamento", texto: "Andamento" }),
        el("dl", { class: "ficha ficha--coluna" },
          linha("Técnico responsável", C().nomeTecnico(os.tecnicoId, { vazio: "Ainda não definido" })),
          linha("Previsão de conclusão", os.previsao ? el("span", { class: atrasada ? "negativo" : "" }, U.dataHora(os.previsao), atrasada ? " · vencida" : "") : el("span", { class: "suave", texto: "Sem previsão" })),
          linha("Aberta em", `${U.dataHora(os.abertaEm)} · ${os.historico[0] ? os.historico[0].por : ""}`),
          os.finalizadaEm ? linha("Serviço finalizado", U.dataHora(os.finalizadaEm)) : null,
          os.entregueEm ? linha("Entregue", `${U.dataHora(os.entregueEm)} a ${os.retiradoPor}`) : null)),
    ];
    if (O.podeVer("financeiro") || O.pode("recebimento")) {
      const recebs = os.recebimentos;
      cartoes.push(el("section", { class: "cartao", "aria-labelledby": "titulo-fin-os" },
        el("div", { class: "cartao__cabeca" }, el("h2", { class: "cartao__titulo", id: "titulo-fin-os", texto: "Financeiro" }), C().pilulaFin(os)),
        el("div", { class: "numeros" },
          el("div", {}, el("span", { texto: "Orçado (aprovado)" }), el("b", { texto: os.orcamentoId ? U.moeda(O.totaisOrc(L.orcamento(os.orcamentoId)).total) : "—" })),
          el("div", {}, el("span", { texto: "Executado" }), el("b", { texto: os.finalizadaEm ? U.moeda(O.totaisOS(os).total) : "—" })),
          el("div", {}, el("span", { texto: "Faturado" }), el("b", { texto: os.faturamento ? U.moeda(os.faturamento.valor) : "—" })),
          el("div", {}, el("span", { texto: "Recebido" }), el("b", { texto: U.moeda(O.recebido(os)) }))),
        os.faturamento && O.aReceber(os) > 0 ? el("p", { class: "nota-alerta" }, icone("clock", 14), `Em aberto: ${U.moeda(O.aReceber(os))}. Encerrar a ordem não marca como pago.`) : null,
        recebs.length ? el("ul", { class: "lista-itens" }, ...recebs.map((rc) => el("li", { class: rc.estorno ? "is-desfeito" : "" },
          el("span", { class: "lista-itens__texto" }, el("b", { texto: `${U.moeda(rc.valor)} · ${rc.forma}` }), el("small", { texto: rc.estorno ? `Desfeito: ${rc.estorno.motivo}` : `${U.dataCompleta(rc.data)} · registrado por ${rc.por}${rc.observacao ? ` · ${rc.observacao}` : ""}` })),
          !rc.estorno && O.pode("recebimento") ? el("button", { class: "link-btn", type: "button", onclick: () => NX.form.estornar(os, rc) }, "Desfazer") : null))) : el("p", { class: "vazio-pequeno", texto: os.faturamento ? "Nenhum recebimento registrado." : "A ordem ainda não foi faturada." })));
    }
    return cartoes;
  }

  function historico(os) {
    const ICONES = { aberta: "clipboard-plus", status: "refresh-cw", editada: "pencil", item: "list-plus", orcamento: "file-text", aprovado: "thumbs-up", recusado: "thumbs-down", recebimento: "circle-dollar-sign", cancelada: "circle-x", pecas: "package-check" };
    return el("section", { class: "cartao", "aria-labelledby": "titulo-hist" },
      el("h2", { class: "cartao__titulo cartao__titulo--espaco", id: "titulo-hist", texto: "Histórico de alterações" }),
      el("ol", { class: "linha-tempo" }, ...[...os.historico].reverse().map((h) => el("li", {},
        el("span", { class: "linha-tempo__icone" }, icone(ICONES[h.acao] || "dot", 14)),
        el("div", {}, el("span", { texto: h.texto }), el("span", { class: "suave", texto: `${U.dataHora(h.em)} · ${h.por}` }))))));
  }

  function mensagem(os) {
    const pend = O.orcamentoPendente(os);
    const tipo = O.PRONTAS.includes(os.status) ? "pronto" : pend && pend.status === "aguardando_aprovacao" ? "orcamento" : "status";
    const texto = O.mensagem(tipo, { os, orc: pend });
    C().mensagemCliente({ titulo: { pronto: "Veículo pronto para retirada", orcamento: "Orçamento para aprovação", status: "Atualização da ordem" }[tipo], texto, clienteId: os.clienteId });
  }

  function desenhar() {
    const os = L.ordem(osId);
    if (!os) {
      U.trocar(secao, C().cabecalho({ id: "ordem", titulo: "Ordem não encontrada", antes: C().voltar("ordens", "Ordens de serviço") }), C().vazio({ icone: "search-x", titulo: "Esta ordem não existe", texto: "Ela pode ter sido apagada ao restaurar os dados de exemplo.", acao: el("a", { class: "btn btn--linha", href: "#/ordens" }, "Ver ordens") }));
      return;
    }
    const v = L.veiculo(os.veiculoId);
    const podeMsg = O.podeVer("clientes") || O.pode("os_entregar");
    U.trocar(secao,
      C().cabecalho({
        id: "ordem", titulo: `${os.numero}`, antes: C().voltar("ordens", "Ordens de serviço"),
        sub: `${v ? `${L.mostrarPlaca(v.placa)} · ${v.marca} ${v.modelo}` : ""} · ${C().nomeDoCliente(os.clienteId)}`,
        etiquetas: [C().pilulaOS(os.status), O.podeVer("financeiro") && os.status !== "cancelada" ? C().pilulaFin(os) : null, C().pilulaExemplo(os)],
        acoes: [
          podeMsg && os.status !== "cancelada" ? C().botao("Mensagem ao cliente", "btn--linha", () => mensagem(os), "message-circle") : null,
          C().botao("Imprimir / PDF", "btn--linha", () => NX.documentos.imprimirOS(os), "printer"),
        ],
      }),
      etapas(os),
      proximoPasso(os),
      el("div", { class: "detalhe-grade detalhe-grade--lado" },
        el("div", { class: "detalhe-grade__principal" }, cartaoRelato(os), cartaoItens(os), cartaoOrcamentos(os), historico(os)),
        el("div", { class: "detalhe-grade__lado" }, ...cartaoLado(os))));
  }

  NX.telas.ordem = {
    titulo: "Ordem de serviço",
    tituloDinamico: () => { const os = L.ordem(osId); return os ? os.numero : "Ordem de serviço"; },
    abrir(id) { osId = id; },
    montar(s) { secao = s; },
    atualizar: C().comFoco(desenhar),
  };
})();
