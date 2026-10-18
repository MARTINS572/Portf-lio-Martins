/* ==========================================================================
   NEXORA BOOKING — Tela: Dashboard
   Indicadores, gráficos e listas calculados a partir das reservas (nada
   fixo). Cada indicador leva à lista já filtrada.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const M = NX.metricas;
  const R = NX.regras;
  const { el, icone } = U;
  const C = () => NX.componentes;
  const G = () => NX.graficos;

  const periodo = { id: "30d" };
  let p = null;

  function montar(secao) {
    const graficoReservas = C().cartaoGrafico({ titulo: "Agendamentos no período", sub: "", legenda: C().legenda([["", "Atendidos ou marcados"], ["chave--2", "Cancelados e faltas"]]) });
    const graficoServicos = C().cartaoGrafico({ titulo: "Serviços mais procurados", sub: "Reservas no período (sem canceladas)" });
    p = {
      graficoReservas, graficoServicos,
      faixa: el("div"), agora: el("div", { class: "indicadores" }), periodo: el("div", { style: { minWidth: "0", maxWidth: "100%" } }), periodoTexto: el("p", { class: "periodo-descricao" }),
      indicadores: el("div", { class: "indicadores" }), hoje: el("div"), hojeSub: el("p", { class: "cartao__sub" }), desempenho: el("div"), desempenhoSub: el("p", { class: "cartao__sub" }),
      aviso: el("div"),
    };
    U.trocar(secao, 
      C().cabecalho({ id: "painel", titulo: "Dashboard", sub: " ", acoes: [
        C().botao("Ver agenda de hoje", "btn--linha", () => NX.ir(`agenda?data=${U.hoje()}&visao=dia`), "calendar-days"),
        C().botao("Novo agendamento", "btn--primario", () => NX.reservas.novo(), "plus"),
      ] }),
      p.faixa, p.aviso,
      el("h2", { class: "vh", texto: "Agora" }),
      p.agora,
      el("div", { class: "barra-periodo", style: { marginTop: "6px" } }, el("h2", { class: "cartao__titulo", texto: "Resultados do período" }), p.periodo),
      p.periodoTexto,
      p.indicadores,
      el("div", { class: "painel-grade" }, graficoReservas.cartao, graficoServicos.cartao),
      el("div", { class: "painel-grade" },
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Agenda de hoje" }), p.hojeSub), el("a", { class: "link-btn", href: `#/agenda?visao=dia` }, "Abrir agenda")), p.hoje),
        el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Desempenho dos profissionais" }), p.desempenhoSub), el("a", { class: "link-btn", href: "#/relatorios?relatorio=profissionais" }, "Relatório")), p.desempenho)),
    );
  }

  function indicador({ rotulo, nomeIcone, valor, nota, href, classe = "" }) {
    const corpo = [el("span", { class: "indicador__rotulo" }, icone(nomeIcone, 16), rotulo), el("span", { class: "indicador__valor", texto: valor }), nota ? el("span", { class: "indicador__nota" }, ...[].concat(nota)) : null];
    return href ? el("a", { class: `indicador ${classe}`, href }, ...corpo) : el("div", { class: `indicador ${classe}` }, ...corpo);
  }

  function desenhar() {
    const d = L.dados;
    const hoje = U.hoje();
    const agora = U.agora();
    const { de, ate } = C().intervaloDe(periodo);
    $titulo().parentElement.querySelector(".pagina__sub").textContent = `Olá, ${d.perfil.nome.split(" ")[0]}. Hoje é ${U.dataLonga(hoje)} · ${agora.slice(11)} no horário do estabelecimento`;

    // Faixa de demonstração
    if (!NX.preferencias.avisoDemoFechado) {
      U.trocar(p.faixa, el("div", { class: "faixa-demo", role: "note" }, icone("info", 18),
        el("p", {}, el("b", { texto: "Ambiente demonstrativo — dados fictícios. " }), "O estabelecimento, os profissionais e os clientes são inventados e tudo fica salvo só neste navegador. Nada é enviado por WhatsApp ou e-mail e nenhum pagamento é processado. Abra a página de agendamento em outra aba e faça uma reserva: ela aparece aqui como pendente."),
        el("div", { class: "faixa-demo__botoes" },
          el("a", { class: "btn btn--linha btn--pequeno", href: "reservar.html", target: "_blank", rel: "noopener" }, icone("globe", 16), "Página de agendamento"),
          C().botao("Entendi", "btn--fantasma btn--pequeno", () => NX.salvarPreferencias({ avisoDemoFechado: true })))));
    } else U.trocar(p.faixa, );

    // Aviso de dia fechado
    const feriado = d.feriados.find((f) => f.data === hoje);
    const aberto = d.estabelecimento.horarios[U.diaDaSemana(hoje)];
    U.trocar(p.aviso, ...(feriado || !aberto ? [el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("calendar-x", 16), el("span", { texto: feriado ? `Hoje é feriado (${feriado.nome}): o estabelecimento não recebe reservas.` : "O estabelecimento não abre hoje." }))] : []));

    // Indicadores de agora (não dependem do período)
    const doDia = d.agendamentos.filter((a) => a.data === hoje && a.status !== "cancelado");
    const restantesHoje = doDia.filter((a) => ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > agora).length;
    const emAtendimento = doDia.filter((a) => a.status === "em_atendimento").length;
    const prox7 = d.agendamentos.filter((a) => ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > agora && a.data <= U.somarDias(hoje, 6));
    const pendentes = d.agendamentos.filter((a) => a.status === "pendente" && `${a.data}T${a.inicio}` > agora);
    const atrasadosPend = d.agendamentos.filter((a) => a.status === "pendente" && `${a.data}T${a.inicio}` <= agora).length;
    const aReceber = d.agendamentos.filter((a) => a.status === "concluido" && !a.pagamento);
    U.trocar(p.agora, 
      indicador({ rotulo: "Agendamentos de hoje", nomeIcone: "calendar-check", valor: U.numero(doDia.length), nota: [el("b", { texto: U.numero(restantesHoje) }), " ainda por vir", emAtendimento ? ` · ${emAtendimento} em atendimento` : ""], href: "#/agendamentos?periodo=hoje" }),
      indicador({ rotulo: "Próximos 7 dias", nomeIcone: "calendar-range", valor: U.numero(prox7.length), nota: `${U.moeda(prox7.reduce((t, a) => t + a.preco, 0))} previstos`, href: "#/agendamentos?periodo=proximos7&status=ativos" }),
      indicador({ rotulo: "Pendentes de confirmação", nomeIcone: "hourglass", valor: U.numero(pendentes.length), nota: pendentes.length ? (atrasadosPend ? `${atrasadosPend} já passaram do horário` : "Confirme para avisar o cliente") : "Nenhuma reserva esperando", href: "#/agendamentos?status=pendente&periodo=futuros", classe: pendentes.length ? "indicador--alerta" : "" }),
      indicador({ rotulo: "A receber", nomeIcone: "wallet", valor: U.moeda(aReceber.reduce((t, a) => t + a.preco, 0)), nota: `${U.plural(aReceber.length, "atendimento concluído", "atendimentos concluídos")} sem pagamento registrado`, href: "#/financeiro?aba=receber" }));

    // Período
    U.trocar(p.periodo, C().seletorPeriodo(periodo, atualizar, { ids: ["7d", "30d", "mes", "mes-anterior", "personalizado"], nome: "painel" }));
    p.periodoTexto.textContent = `Período: ${C().descreverPeriodo({ de, ate })}. Receita conta os pagamentos registrados; nenhuma cobrança é feita pelo sistema.`;
    const r = M.resumo(de, ate);
    const concl = r.por.concluido;
    U.trocar(p.indicadores, 
      indicador({ rotulo: "Atendimentos concluídos", nomeIcone: "check-check", valor: U.numero(concl), nota: `de ${U.plural(r.total - r.por.cancelado, "reserva", "reservas")} no período`, href: `#/agendamentos?status=concluido&de=${de}&ate=${ate}` }),
      indicador({ rotulo: "Cancelamentos e faltas", nomeIcone: "circle-x", valor: U.numero(r.por.cancelado + r.por.nao_compareceu), nota: [`${r.por.cancelado} cancel. · ${r.por.nao_compareceu} faltas · `, el("b", { texto: U.percentual(r.taxaCancelamento) })], href: `#/agendamentos?status=perdidos&de=${de}&ate=${ate}`, classe: r.taxaCancelamento > 0.2 ? "indicador--perigo" : "" }),
      indicador({ rotulo: "Receita registrada", nomeIcone: "circle-dollar-sign", valor: U.moeda(r.receita), nota: `Previsto no período: ${U.moeda(r.previsto)}`, href: `#/financeiro?de=${de}&ate=${ate}` }),
      indicador({ rotulo: "Ocupação da agenda", nomeIcone: "gauge", valor: U.percentual(r.ocupacao), nota: `${U.numero(Math.round(r.minutosReservados / 60))} h reservadas de ${U.numero(Math.round(r.minutosDisponiveis / 60))} h de trabalho`, href: `#/relatorios?relatorio=ocupacao&de=${de}&ate=${ate}` }));

    // Gráfico de agendamentos
    const s = M.serie(de, ate);
    p.graficoReservas.definirSub(`Por ${s.tipo === "dia" ? "dia" : s.tipo === "semana" ? "semana" : "mês"} · data do atendimento`);
    G().colunas(p.graficoReservas.cartao, {
      rotulos: s.pontos.map((x) => x.rotulo),
      series: [{ nome: "atendidos ou marcados", valores: s.pontos.map((x) => x.validos) }, { nome: "cancelados e faltas", valores: s.pontos.map((x) => x.perdidos) }],
      detalheRotulo: (i) => (s.pontos[i].inicio === s.pontos[i].fim ? U.dataCompleta(s.pontos[i].inicio) : `${U.dataCurta(s.pontos[i].inicio)} a ${U.dataCurta(s.pontos[i].fim)}`),
    });
    G().tabela(p.graficoReservas.cartao, ["Período", "Atendidos ou marcados", "Cancelados e faltas"], s.pontos.map((x) => [x.inicio === x.fim ? U.dataCompleta(x.inicio) : `${U.dataCurta(x.inicio)} a ${U.dataCurta(x.fim)}`, U.numero(x.validos), U.numero(x.perdidos)]));

    // Serviços
    const top = M.servicosMaisProcurados(de, ate).slice(0, 7);
    G().barras(p.graficoServicos.cartao, { itens: top.map((x) => ({ rotulo: x.nome, valor: x.reservas, sub: `${x.concluidos} concluídos · ${U.moeda(x.previsto)}` })), vazio: "Nenhuma reserva no período." });
    G().tabela(p.graficoServicos.cartao, ["Serviço", "Reservas", "Concluídos", "Valor"], top.map((x) => [x.nome, U.numero(x.reservas), U.numero(x.concluidos), U.moeda(x.previsto)]));

    // Agenda de hoje
    const lista = d.agendamentos.filter((a) => a.data === hoje && a.status !== "cancelado").sort((a, b) => a.inicio.localeCompare(b.inicio) || a.profissionalId.localeCompare(b.profissionalId));
    const cancelHoje = d.agendamentos.filter((a) => a.data === hoje && a.status === "cancelado").length;
    p.hojeSub.textContent = `${U.plural(lista.length, "reserva", "reservas")}${cancelHoje ? ` · ${U.plural(cancelHoje, "cancelada", "canceladas")} (não ocupam horário)` : ""}`;
    const proximas = lista.filter((a) => `${a.data}T${a.fim}` > agora || ["pendente", "confirmado", "em_atendimento"].includes(a.status));
    const mostrar = (proximas.length ? proximas : lista).slice(0, 8);
    U.trocar(p.hoje, mostrar.length
      ? el("ul", { class: "reservas" }, ...mostrar.map((a) => el("li", {}, C().linhaReserva(a))))
      : C().vazio({ icone: "calendar", titulo: "Nenhuma reserva para hoje", texto: aberto && !feriado ? "Os horários livres aparecem na agenda e na página de agendamento." : "O estabelecimento não abre hoje.", acao: aberto && !feriado ? C().botao("Novo agendamento", "btn--primario btn--pequeno", () => NX.reservas.novo({ data: hoje }), "plus") : null }));
    if (lista.length > mostrar.length) p.hoje.append(el("p", { class: "contagem", style: { padding: "10px 0 0" } }, `Mostrando ${mostrar.length} de ${lista.length}. `, el("a", { class: "link-btn", href: "#/agendamentos?periodo=hoje", texto: "Ver todas de hoje" })));

    // Desempenho por profissional
    const desempenho = M.desempenho(de, ate);
    p.desempenhoSub.textContent = "Concluídos, receita registrada e ocupação no período";
    U.trocar(p.desempenho, desempenho.length ? el("ul", { class: "lista-simples" }, ...desempenho.map((x) => el("li", {},
      C().avatarProf(x.profissional),
      el("span", { class: "lista-simples__texto" },
        el("b", { texto: x.profissional.nome + (x.profissional.status === "ativo" ? "" : " (inativo)") }),
        el("span", { class: "suave", texto: `${U.plural(x.por.concluido, "atendimento", "atendimentos")} · ${x.por.nao_compareceu} faltas · ocupação ${U.percentual(x.ocupacao)}` }),
        el("span", { class: "progresso", style: { marginTop: "6px" }, "aria-hidden": "true" }, el("span", { class: "progresso__barra", style: { width: `${Math.round(Math.min(1, x.ocupacao) * 100)}%` } }))),
      el("span", { class: "lista-simples__fim" }, el("b", { texto: U.moeda(x.receita) }), el("span", { class: "suave", texto: "recebido" }))))) : C().vazio({ icone: "users", titulo: "Sem profissionais no período" }));
  }
  const $titulo = () => U.$("#titulo-painel");
  const atualizar = C().comFoco(desenhar);

  NX.telas.painel = { titulo: "Dashboard", montar, atualizar };
})();
