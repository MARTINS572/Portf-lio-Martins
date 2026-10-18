/* ==========================================================================
   NEXORA AUTO — Tela: Painel (dashboard)
   Indicadores, gráficos e listas calculados a partir das ordens, dos
   orçamentos, da agenda e do estoque (nada é fixo). Cada indicador leva à
   lista já filtrada. Valores financeiros só aparecem para quem vê o
   financeiro.
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
  const G = () => NX.graficos;

  const periodo = { id: "30d" };
  let p = null;
  const minutosEntre = (a, b) => U.diasEntre(a.slice(0, 10), b.slice(0, 10)) * 1440 + U.minutos(b.slice(11, 16)) - U.minutos(a.slice(11, 16));
  function duracaoTexto(min) {
    if (!(min > 0)) return "—";
    if (min < 60) return `${Math.round(min)} min`;
    if (min < 48 * 60) return `${U.decimal(min / 60).replace(/,00$/, "")} h`;
    return `${U.decimal(min / 1440).replace(/,00$/, "")} dias`;
  }

  function montar(secao) {
    const graficoOS = C().cartaoGrafico({ titulo: "Ordens de serviço por período", sub: "", legenda: C().legenda([["", "Abertas"], ["chave--2", "Serviços finalizados"]]) });
    const graficoFat = C().cartaoGrafico({ titulo: "Faturamento por período", sub: "" });
    const graficoServ = C().cartaoGrafico({ titulo: "Serviços mais realizados", sub: "Ordens finalizadas no período" });
    const graficoStatus = C().cartaoGrafico({ titulo: "Distribuição por status", sub: "Ordens em aberto agora" });
    p = {
      graficoOS, graficoFat, graficoServ, graficoStatus,
      faixa: el("div"), atalhos: el("div", { class: "atalhos" }), agora: el("div", { class: "indicadores" }),
      periodo: el("div", { style: { minWidth: "0", maxWidth: "100%" } }), periodoTexto: el("p", { class: "periodo-descricao" }), indicadores: el("div", { class: "indicadores" }),
      graficos1: el("div", { class: "painel-grade" }), graficos2: el("div", { class: "painel-grade" }),
      atencao: el("div"), atencaoSub: el("p", { class: "cartao__sub" }), hoje: el("div"), hojeSub: el("p", { class: "cartao__sub" }),
    };
    U.trocar(secao,
      C().cabecalho({ id: "painel", titulo: "Painel da oficina", sub: " " }),
      p.faixa, p.atalhos,
      el("h2", { class: "titulo-secao", texto: "Agora na oficina" }),
      p.agora,
      el("div", { class: "barra-periodo", style: { marginTop: "6px" } }, el("h2", { class: "titulo-secao titulo-secao--linha", texto: "Resultados do período" }), p.periodo),
      p.periodoTexto,
      p.indicadores,
      p.graficos1, p.graficos2,
      el("div", { class: "painel-grade" },
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Precisa de atenção" }), p.atencaoSub), el("a", { class: "link-btn", href: "#/notificacoes" }, "Ver tudo")), p.atencao),
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Agenda de hoje" }), p.hojeSub), el("a", { class: "link-btn", href: "#/agenda?visao=dia" }, "Abrir agenda")), p.hoje)),
    );
  }

  function indicador({ rotulo, nomeIcone, valor, nota, href, classe = "" }) {
    const corpo = [el("span", { class: "indicador__rotulo" }, icone(nomeIcone, 16), rotulo), el("span", { class: "indicador__valor", texto: valor }), nota ? el("span", { class: "indicador__nota" }, ...[].concat(nota)) : null];
    return href ? el("a", { class: `indicador ${classe}`, href }, ...corpo) : el("div", { class: `indicador ${classe}` }, ...corpo);
  }
  const atalho = (rotulo, sub, nomeIcone, acao, classe = "") => el("button", { class: `atalho ${classe}`, type: "button", onclick: acao }, el("span", { class: "atalho__icone" }, icone(nomeIcone, 18)), el("span", {}, rotulo, el("small", { texto: sub })));

  function desenhar() {
    const d = L.dados;
    const hoje = U.hoje();
    const agora = U.agora();
    const fin = O.podeVer("financeiro");
    const perfil = O.perfilAtual();
    U.$("#titulo-painel").parentElement.querySelector(".pagina__sub").textContent = `${U.dataLonga(hoje)} · ${agora.slice(11)} · vendo como ${perfil.nome} (${d.perfil.nome})`;

    // Faixa de demonstração
    if (!NX.preferencias.avisoDemoFechado) {
      U.trocar(p.faixa, el("div", { class: "faixa-demo", role: "note" }, icone("info", 18),
        el("p", {}, el("b", { texto: "Ambiente demonstrativo — dados fictícios. " }), `A oficina ${d.oficina.nome}, os clientes, os veículos e a equipe são inventados e tudo fica salvo só neste navegador. Não há login de verdade: os perfis do menu do usuário são uma simulação. Nada é enviado por WhatsApp ou e-mail e nenhum pagamento é processado.`),
        el("div", { class: "faixa-demo__botoes" },
          C().botao("Como usar", "btn--linha btn--pequeno", () => U.$("#dlg-ajuda").showModal(), "circle-question-mark"),
          C().botao("Entendi", "btn--fantasma btn--pequeno", () => NX.salvarPreferencias({ avisoDemoFechado: true })))));
    } else U.trocar(p.faixa);

    // Atalhos (só o que o perfil pode fazer)
    U.trocar(p.atalhos,
      O.pode("os_abrir") ? atalho("Nova OS", "Abrir ordem de serviço", "clipboard-plus", () => NX.form.novaOS()) : null,
      O.pode("orc_criar") ? atalho("Novo orçamento", "Sem ordem de serviço", "file-plus", () => NX.form.editorOrcamento(null)) : null,
      O.pode("cadastros") ? atalho("Novo cliente", "Cadastro rápido", "user-plus", () => NX.form.cliente(null)) : null,
      O.pode("agenda") ? atalho("Agendar", "Recepção, serviço, entrega", "calendar-plus", () => NX.form.compromisso(null)) : null,
      O.pode("estoque_mov") ? atalho("Entrada de peças", "Compra ou devolução", "arrow-down-to-line", () => NX.form.movimento("entrada"), "atalho--entrada") : null,
      O.pode("os_status") && !O.pode("os_abrir") ? atalho("Ordens em andamento", "Diagnóstico e execução", "wrench", () => NX.ir("ordens?status=andamento")) : null,
      O.pode("recebimento") ? atalho("Receber pagamento", "Ordens faturadas em aberto", "circle-dollar-sign", () => NX.ir("financeiro?aba=receber")) : null);
    if (!p.atalhos.children.length) p.atalhos.hidden = true; else p.atalhos.hidden = false;

    // Agora (não depende do período)
    const naOficina = d.ordens.filter((os) => O.NA_OFICINA.includes(os.status));
    const andamento = naOficina.filter((os) => !O.PRONTAS.includes(os.status));
    const contar = (st) => d.ordens.filter((os) => os.status === st).length;
    const prontas = d.ordens.filter((os) => O.PRONTAS.includes(os.status));
    const atrasadas = andamento.filter((os) => os.previsao && os.previsao < agora).length;
    const agendaHoje = d.agenda.filter((a) => a.data === hoje && a.status !== "cancelado");
    const restantes = agendaHoje.filter((a) => a.status === "marcado" && `${a.data}T${a.fim}` > agora).length;
    const orcPend = d.orcamentos.filter((o) => O.statusOrc(o) === "aguardando_aprovacao");
    const baixas = d.pecas.filter((x) => ["baixo", "zerado"].includes(O.situacaoPeca(x)));
    U.trocar(p.agora,
      indicador({ rotulo: "Veículos na oficina", nomeIcone: "car", valor: U.numero(naOficina.length), nota: `${andamento.length} em serviço · ${prontas.length} prontos`, href: "#/ordens?status=abertas" }),
      indicador({ rotulo: "OS em andamento", nomeIcone: "clipboard-list", valor: U.numero(andamento.length), nota: atrasadas ? [el("b", { texto: String(atrasadas) }), ` com previsão vencida`] : "Nenhuma com previsão vencida", href: "#/ordens?status=andamento", classe: atrasadas ? "indicador--alerta" : "" }),
      indicador({ rotulo: "Aguardando aprovação", nomeIcone: "hourglass", valor: U.numero(contar("aguardando_aprovacao")), nota: contar("aguardando_pecas") ? `${contar("aguardando_pecas")} aguardando peças` : "Orçamento enviado ao cliente", href: "#/ordens?status=aguardando_aprovacao", classe: contar("aguardando_aprovacao") ? "indicador--alerta" : "" }),
      indicador({ rotulo: "Em execução", nomeIcone: "wrench", valor: U.numero(contar("em_execucao")), nota: `${contar("aprovada")} aprovadas esperando início`, href: "#/ordens?status=em_execucao" }),
      indicador({ rotulo: "Prontos para retirada", nomeIcone: "car-front", valor: U.numero(prontas.length), nota: `${contar("aguardando_retirada")} a faturar · ${contar("concluida")} faturados`, href: "#/ordens?status=prontas" }),
      indicador({ rotulo: "Agendamentos de hoje", nomeIcone: "calendar-check", valor: U.numero(agendaHoje.length), nota: `${restantes} ainda por vir`, href: "#/agenda?visao=dia" }),
      O.podeVer("orcamentos") ? indicador({ rotulo: "Orçamentos pendentes", nomeIcone: "file-text", valor: U.numero(orcPend.length), nota: fin ? `${U.moeda(orcPend.reduce((t, o) => t + O.totaisOrc(o).total, 0))} aguardando o cliente` : "Aguardando o cliente", href: "#/orcamentos?status=aguardando_aprovacao" }) : null,
      O.podeVer("estoque") ? indicador({ rotulo: "Peças com estoque baixo", nomeIcone: "package", valor: U.numero(baixas.length), nota: `${baixas.filter((x) => O.situacaoPeca(x) === "zerado").length} sem estoque`, href: "#/estoque?situacao=baixo", classe: baixas.length ? "indicador--alerta" : "" }) : null);

    // Período
    const intervalo = C().intervaloDe(periodo);
    const { de, ate } = intervalo;
    U.trocar(p.periodo, C().seletorPeriodo(periodo, atualizar, { ids: ["7d", "30d", "90d", "mes", "mes-anterior", "personalizado"], nome: "painel" }));
    p.periodoTexto.textContent = `Período: ${C().descreverPeriodo(intervalo)}.${fin ? " Faturado = ordens encerradas; recebido = pagamentos registrados (nada é cobrado pelo sistema)." : ""}`;
    const r = O.resumoFinanceiro(de, ate);
    const abertasPer = d.ordens.filter((os) => O.noPeriodo(os.abertaEm, de, ate));
    const finalizadas = d.ordens.filter((os) => O.noPeriodo(os.finalizadaEm, de, ate));
    const tempos = finalizadas.map((os) => minutosEntre(os.abertaEm, os.finalizadaEm));
    const medio = tempos.length ? tempos.reduce((t, x) => t + x, 0) / tempos.length : 0;
    const decididos = d.orcamentos.filter((o) => (o.aprovacao && O.noPeriodo(o.aprovacao.em, de, ate)) || (o.recusa && O.noPeriodo(o.recusa.em, de, ate)));
    const aprovados = decididos.filter((o) => o.aprovacao).length;
    const noPrazo = finalizadas.filter((os) => os.previsao).length;
    const cumpridas = finalizadas.filter((os) => os.previsao && os.finalizadaEm <= os.previsao).length;
    U.trocar(p.indicadores,
      indicador({ rotulo: "Ordens abertas", nomeIcone: "clipboard-plus", valor: U.numero(abertasPer.length), nota: `${U.numero(abertasPer.filter((os) => os.status === "cancelada").length)} canceladas`, href: `#/ordens?status=todas&de=${de}&ate=${ate}` }),
      indicador({ rotulo: "Serviços finalizados", nomeIcone: "check-check", valor: U.numero(finalizadas.length), nota: `Tempo médio da abertura ao fim: ${duracaoTexto(medio)}`, href: `#/relatorios?relatorio=os&de=${de}&ate=${ate}` }),
      fin ? indicador({ rotulo: "Faturamento", nomeIcone: "receipt", valor: U.moeda(r.faturado), nota: [`Recebido no período: `, el("b", { texto: U.moeda(r.recebido) })], href: `#/financeiro?de=${de}&ate=${ate}` }) : null,
      indicador({ rotulo: "Desempenho", nomeIcone: "gauge", valor: decididos.length ? U.percentual(aprovados / decididos.length) : "—", nota: [`orçamentos aprovados (${aprovados} de ${decididos.length} respondidos)`, noPrazo ? ` · previsão cumprida em ${cumpridas} de ${noPrazo}` : ""], href: `#/relatorios?relatorio=orcamentos&de=${de}&ate=${ate}` }));

    // Gráficos
    const { lista: baldes, unidade } = C().baldes(intervalo);
    const rotuloBalde = (b) => (b.de === b.ate ? U.dataCompleta(b.de) : `${U.dataCurta(b.de)} a ${U.dataCurta(b.ate)}`);
    const contaBalde = (lista, campo) => baldes.map((b) => lista.filter((x) => O.noPeriodo(x[campo], b.de, b.ate)).length);
    const sAbertas = contaBalde(d.ordens, "abertaEm");
    const sFinal = contaBalde(d.ordens, "finalizadaEm");
    p.graficoOS.definirSub(`Por ${unidade} · abertura e finalização do serviço`);
    U.trocar(p.graficos1, p.graficoOS.cartao, fin ? p.graficoFat.cartao : p.graficoServ.cartao);
    U.trocar(p.graficos2, fin ? p.graficoServ.cartao : null, p.graficoStatus.cartao);
    G().colunas(p.graficoOS.cartao, { rotulos: baldes.map((b) => b.rotulo), series: [{ nome: "abertas", valores: sAbertas }, { nome: "finalizadas", valores: sFinal }], detalheRotulo: (i) => rotuloBalde(baldes[i]) });
    G().tabela(p.graficoOS.cartao, ["Período", "Abertas", "Finalizadas"], baldes.map((b, i) => [rotuloBalde(b), U.numero(sAbertas[i]), U.numero(sFinal[i])]));
    if (fin) {
      const fat = baldes.map((b) => U.arredondar(d.ordens.filter((os) => os.faturamento && O.noPeriodo(os.faturamento.em, b.de, b.ate)).reduce((t, os) => t + os.faturamento.valor, 0)));
      p.graficoFat.definirSub(`Valor faturado por ${unidade} · total ${U.moeda(fat.reduce((a, b) => a + b, 0))}`);
      G().area(p.graficoFat.cartao, { rotulos: baldes.map((b) => b.rotulo), valores: fat, nome: "Faturamento", detalhes: (i) => [rotuloBalde(baldes[i])] });
      G().tabela(p.graficoFat.cartao, ["Período", "Faturado"], baldes.map((b, i) => [rotuloBalde(b), U.moeda(fat[i])]));
    }
    const contagem = new Map();
    finalizadas.forEach((os) => os.itens.filter((i) => i.tipo === "servico").forEach((i) => {
      const s = L.servico(i.refId);
      const nome = s ? s.nome : i.descricao;
      const x = contagem.get(nome) || { nome, qtd: 0, valor: 0 };
      x.qtd += i.quantidade; x.valor += O.valorItem(i);
      contagem.set(nome, x);
    }));
    const top = [...contagem.values()].sort((a, b) => b.qtd - a.qtd || b.valor - a.valor).slice(0, 7);
    G().barras(p.graficoServ.cartao, { itens: top.map((x) => ({ rotulo: x.nome, valor: x.qtd, sub: fin ? U.moeda(x.valor) : null })), vazio: "Nenhum serviço finalizado no período." });
    G().tabela(p.graficoServ.cartao, fin ? ["Serviço", "Vezes", "Valor"] : ["Serviço", "Vezes"], top.map((x) => (fin ? [x.nome, U.numero(x.qtd), U.moeda(x.valor)] : [x.nome, U.numero(x.qtd)])));
    const porStatus = NX.STATUS_OS.filter((s) => O.ABERTAS.includes(s.id)).map((s) => ({ rotulo: s.nome, valor: contar(s.id) }));
    G().barras(p.graficoStatus.cartao, { itens: porStatus, vazio: "Nenhuma ordem em aberto." });
    G().tabela(p.graficoStatus.cartao, ["Status", "Ordens"], porStatus.map((x) => [x.rotulo, U.numero(x.valor)]));

    // Precisa de atenção
    const alertas = O.alertas().filter((a) => (a.tipo !== "estoque" || O.podeVer("estoque")) && (a.tipo !== "orcamento" || O.podeVer("orcamentos")));
    const ICONES = { estoque: "package", previsao: "clock", pronto: "car-front", orcamento: "hourglass" };
    p.atencaoSub.textContent = alertas.length ? `${U.plural(alertas.length, "item", "itens")} · previsões, veículos prontos, orçamentos e estoque` : "Tudo em dia";
    U.trocar(p.atencao, alertas.length ? el("ul", { class: "lista-simples" }, ...alertas.slice(0, 7).map((a) => el("li", {},
      el("span", { class: `alerta-icone alerta-icone--${a.tipo}` }, icone(ICONES[a.tipo], 16)),
      el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/${a.rota}`, texto: a.titulo }), el("span", { class: "suave", texto: a.texto })),
      a.visto ? el("span", { class: "suave", texto: "visto" }) : null))) : C().vazio({ icone: "circle-check", titulo: "Nada pendente agora" }));

    // Agenda de hoje (compromissos e previsões)
    const prevHoje = O.previsoes(hoje, hoje);
    const itens = [...agendaHoje.map((a) => ({ hora: a.inicio, a })), ...prevHoje.map((os) => ({ hora: os.previsao.slice(11), os }))].sort((x, y) => x.hora.localeCompare(y.hora));
    p.hojeSub.textContent = `${U.plural(agendaHoje.length, "compromisso", "compromissos")} · ${U.plural(prevHoje.length, "previsão de conclusão", "previsões de conclusão")}`;
    U.trocar(p.hoje, itens.length ? el("ul", { class: "lista-simples" }, ...itens.slice(0, 8).map((x) => {
      if (x.os) return el("li", { class: "is-previsao" }, el("span", { class: "hora-chip hora-chip--previsao" }, icone("flag", 13), x.hora),
        el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/ordens/${x.os.id}`, texto: `Previsão de conclusão · ${x.os.numero}` }), el("span", { class: "suave", texto: `${C().textoVeiculo(x.os.veiculoId)} · ${O.nomeStatus(x.os.status)}` })), el("span", { class: "suave", texto: "previsão" }));
      const a = x.a;
      const tipo = NX.TIPOS_AGENDA.find((t) => t.id === a.tipo);
      return el("li", {}, el("span", { class: "hora-chip" }, x.hora),
        el("span", { class: "lista-simples__texto" }, el("b", { texto: `${tipo.nome}${a.veiculoId ? ` · ${C().textoVeiculo(a.veiculoId)}` : ""}` }), el("span", { class: "suave", texto: [a.tecnicoId ? C().nomeDoTecnico(a.tecnicoId) : null, a.box ? `Box ${a.box}` : null, a.observacoes].filter(Boolean).join(" · ") || "—" })),
        C().pilulaAgenda(a.status));
    })) : C().vazio({ icone: "calendar", titulo: "Nada marcado para hoje", texto: L.dados.oficina.horarios[U.diaDaSemana(hoje)] ? "Os horários livres de técnicos e boxes aparecem na agenda." : "A oficina não abre hoje." }));
  }
  const atualizar = C().comFoco(desenhar);

  NX.telas.painel = { titulo: "Painel", montar, atualizar };
})();
