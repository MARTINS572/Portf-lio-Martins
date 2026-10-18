/* ==========================================================================
   NEXORA CRM — Tela: Relatórios comerciais
   Um filtro de período no topo vale para todos os números, gráficos e
   tabelas da página. Cada bloco pode ser exportado em CSV.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const G = NX.graficos;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const PERIODOS = [
    { id: "30d", rotulo: "Últimos 30 dias" },
    { id: "90d", rotulo: "Últimos 90 dias" },
    { id: "mes", rotulo: "Este mês" },
    { id: "mes-anterior", rotulo: "Mês passado" },
    { id: "6m", rotulo: "Últimos 6 meses" },
    { id: "personalizado", rotulo: "Personalizado" },
  ];
  const estado = { periodo: "6m", de: "", ate: "" };
  let partes = null;
  let rel = null;

  function intervalo() {
    const hoje = U.hoje();
    switch (estado.periodo) {
      case "30d": return [U.somarDias(hoje, -29), hoje];
      case "90d": return [U.somarDias(hoje, -89), hoje];
      case "mes": return [U.inicioDoMes(hoje), hoje];
      case "mes-anterior": { const ini = U.somarMeses(U.inicioDoMes(hoje), -1); return [ini, U.fimDoMes(ini)]; }
      case "6m": return [U.somarMeses(U.inicioDoMes(hoje), -5), hoje];
      default: return [estado.de, estado.ate];
    }
  }

  function montar(secao) {
    const presets = el("div", { class: "segmentado", role: "group", "aria-label": "Período do relatório" });
    const de = el("input", { type: "date", id: "rel-de", "aria-label": "Data inicial" });
    const ate = el("input", { type: "date", id: "rel-ate", "aria-label": "Data final" });
    const erro = el("p", { class: "campo__erro", role: "alert" });
    const personalizado = el("form", { class: "periodo-personalizado", hidden: true, novalidate: true },
      el("label", { for: "rel-de", texto: "De" }), de, el("label", { for: "rel-ate", texto: "até" }), ate,
      el("button", { class: "btn btn--linha btn--pequeno", type: "submit", texto: "Aplicar" }), erro);
    personalizado.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!U.dataValida(de.value) || !U.dataValida(ate.value)) { erro.textContent = "Informe as duas datas."; return; }
      if (de.value > ate.value) { erro.textContent = "A data inicial precisa ser antes da final."; return; }
      erro.textContent = "";
      estado.de = de.value; estado.ate = ate.value;
      atualizar();
      U.aviso(`Relatório de ${U.dataCompleta(de.value)} a ${U.dataCompleta(ate.value)}.`, "info");
    });

    const csv = (rotulo, fn) => el("button", { class: "link-btn", type: "button", onclick: fn }, icone("download", 14), rotulo);
    const vendas = C().cartaoGrafico({ titulo: "Vendas por período", sub: "", classe: "grafico--largo", acoes: [csv("CSV", exportarVendas)] });
    const resultado = C().cartaoGrafico({ titulo: "Oportunidades ganhas e perdidas", sub: "Quantidade de oportunidades fechadas", acoes: [csv("CSV", exportarFechadas)] });
    const origens = C().cartaoGrafico({ titulo: "Leads por origem", sub: "Leads com primeiro contato no período", acoes: [csv("CSV", exportarOrigens)] });
    const motivos = C().cartaoGrafico({ titulo: "Motivos de perda", sub: "Por que as oportunidades foram perdidas" });

    partes = {
      presets, personalizado, de, ate,
      descricao: el("p", { class: "periodo-descricao", "aria-live": "polite" }),
      indicadores: el("div", { class: "indicadores indicadores--relatorio" }),
      vendas, resultado, origens, motivos,
      desempenho: el("tbody"),
    };

    secao.replaceChildren(
      C().cabecalho({ id: "relatorios", titulo: "Relatórios", sub: "Resultados calculados a partir dos registros do CRM", acoes: [C().botao("Exportar resumo", "btn--linha", exportarResumo, "download")] }),
      el("div", { class: "barra-periodo" }, presets, personalizado),
      partes.descricao,
      partes.indicadores,
      el("div", { class: "painel-grade" }, vendas.cartao, resultado.cartao, origens.cartao, motivos.cartao),
      el("article", { class: "cartao cartao--tabela" },
        el("div", { class: "cartao__cabeca" },
          el("div", {}, el("h2", { class: "cartao__titulo", texto: "Desempenho por responsável" }), el("p", { class: "cartao__sub", texto: "Vendas, perdas e tarefas concluídas no período; oportunidades em aberto hoje" })),
          el("div", { class: "cartao__acoes" }, csv("CSV", exportarDesempenho))),
        el("div", { class: "tabela-rolagem" },
          el("table", { class: "tabela tabela--desempenho" },
            el("caption", { class: "vh", texto: "Desempenho por responsável" }),
            el("thead", {}, el("tr", {}, ...["Responsável", "Vendas", "Valor vendido", "Perdidas", "Conversão", "Em aberto", "Tarefas concluídas"].map((t, i) => el("th", { scope: "col", class: i ? "num" : "", texto: t })))),
            partes.desempenho))),
    );
  }

  function indicador(rotulo, valor, nota) {
    return el("article", { class: "indicador" }, el("p", { class: "indicador__rotulo", texto: rotulo }), el("p", { class: "indicador__valor", texto: valor }), nota ? el("p", { class: "indicador__nota", texto: nota }) : null);
  }

  function atualizar() {
    partes.presets.replaceChildren(...PERIODOS.map((p) => el("button", { type: "button", "aria-pressed": String(estado.periodo === p.id), "data-foco": `periodo-${p.id}`,
      onclick: () => {
        estado.periodo = p.id;
        if (p.id === "personalizado" && !estado.de) { const [a, b] = [U.somarDias(U.hoje(), -59), U.hoje()]; estado.de = a; estado.ate = b; }
        atualizar();
      } }, p.rotulo)));
    partes.personalizado.hidden = estado.periodo !== "personalizado";
    if (estado.periodo === "personalizado") { partes.de.value = estado.de; partes.ate.value = estado.ate; }

    const [de, ate] = intervalo();
    rel = L.relatorio(de, ate);
    partes.descricao.textContent = `${U.dataCompleta(de)} a ${U.dataCompleta(ate)} · ${U.plural(U.diasEntre(de, ate) + 1, "dia", "dias")}`;

    partes.indicadores.replaceChildren(
      indicador("Vendas no período", U.moeda(rel.valorGanho, { compacto: rel.valorGanho >= 100000 || undefined }), `${U.plural(rel.ganhos.length, "venda concluída", "vendas concluídas")} · ${U.moeda(rel.valorGanho, { compacto: false })}`),
      indicador("Valor médio das vendas", rel.ganhos.length ? U.moeda(rel.ticketMedio) : "—", "valor vendido ÷ número de vendas"),
      indicador("Conversão de oportunidades", rel.conversaoOportunidades == null ? "—" : U.percentual(rel.conversaoOportunidades), `${rel.ganhos.length} ganhas de ${rel.fechados.length} fechadas`),
      indicador("Conversão de leads", rel.conversaoLeads == null ? "—" : U.percentual(rel.conversaoLeads), `${rel.leadsConvertidos} de ${U.plural(rel.leadsNoPeriodo, "lead", "leads")} viraram clientes`),
      indicador("Ganhas × perdidas", `${rel.ganhos.length} × ${rel.perdidos.length}`, `${U.moeda(rel.valorPerdido, { compacto: false })} em oportunidades perdidas`),
    );

    // Vendas por período
    partes.vendas.definirSub(rel.porSemana ? "Valor das vendas concluídas por semana" : "Valor das vendas concluídas por mês");
    if (rel.serie.length) {
      G.area(partes.vendas.cartao, {
        rotulos: rel.serie.map((s) => s.rotulo), valores: rel.serie.map((s) => s.valor), nome: "Vendas por período",
        formatar: (v) => U.moeda(v, { compacto: true }), detalhes: (i) => [U.plural(rel.serie[i].ganhos, "venda", "vendas")],
      });
    }
    G.tabela(partes.vendas.cartao, ["Período", "Vendas", "Valor"], rel.serie.map((s) => [rel.porSemana ? `${U.dataCurta(s.ini)} a ${U.dataCurta(s.fim)}` : U.mesAno(s.ini), U.numero(s.ganhos), U.moeda(s.valor, { compacto: false })]));

    // Ganhas e perdidas
    G.colunas(partes.resultado.cartao, {
      rotulos: rel.serie.map((s) => s.rotulo),
      series: [{ nome: "Ganhas", valores: rel.serie.map((s) => s.ganhos) }, { nome: "Perdidas", valores: rel.serie.map((s) => s.perdidos) }],
    });
    const legenda = partes.resultado.cartao.querySelector(".legenda") || el("ul", { class: "legenda" });
    legenda.replaceChildren(el("li", {}, el("i", { class: "chave chave--1" }), "Ganhas"), el("li", {}, el("i", { class: "chave chave--2" }), "Perdidas"));
    partes.resultado.area.before(legenda);
    G.tabela(partes.resultado.cartao, ["Período", "Ganhas", "Perdidas"], rel.serie.map((s) => [rel.porSemana ? `${U.dataCurta(s.ini)} a ${U.dataCurta(s.fim)}` : U.mesAno(s.ini), U.numero(s.ganhos), U.numero(s.perdidos)]));

    // Leads por origem
    G.barras(partes.origens.cartao, { itens: rel.origens, formatar: (v) => U.plural(v, "lead", "leads"), vazio: "Nenhum lead no período." });
    G.tabela(partes.origens.cartao, ["Origem", "Leads"], rel.origens.map((o) => [o.rotulo, U.numero(o.valor)]));

    // Motivos de perda
    G.barras(partes.motivos.cartao, { itens: rel.motivos, formatar: (v) => U.plural(v, "oportunidade", "oportunidades"), vazio: "Nenhuma oportunidade perdida no período." });
    G.tabela(partes.motivos.cartao, ["Motivo", "Oportunidades"], rel.motivos.map((m) => [m.rotulo, U.numero(m.valor)]));

    // Desempenho
    const maior = Math.max(1, ...rel.desempenho.map((p) => p.valor));
    partes.desempenho.replaceChildren(...rel.desempenho.sort((a, b) => b.valor - a.valor).map((p) => el("tr", {},
      el("th", { scope: "row", "data-rotulo": "Responsável" }, C().pessoaComAvatar(p.id), el("span", { class: "suave bloco", texto: p.cargo })),
      el("td", { class: "num", "data-rotulo": "Vendas", texto: U.numero(p.ganhos) }),
      el("td", { class: "num", "data-rotulo": "Valor vendido" },
        el("span", { class: "barra-celula" }, el("span", { class: "barra-celula__barra", style: { width: `${(p.valor / maior) * 100}%` } })),
        el("b", { texto: U.moeda(p.valor, { compacto: false }) })),
      el("td", { class: "num", "data-rotulo": "Perdidas", texto: U.numero(p.perdidos) }),
      el("td", { class: "num", "data-rotulo": "Conversão", texto: p.conversao == null ? "—" : U.percentual(p.conversao) }),
      el("td", { class: "num", "data-rotulo": "Em aberto", texto: `${p.abertos} · ${U.moeda(p.valorAberto)}` }),
      el("td", { class: "num", "data-rotulo": "Tarefas concluídas", texto: U.numero(p.tarefasConcluidas) }))));
  }

  /* ---------- Exportações (dados do período escolhido) ---------- */
  const sufixo = () => `${rel.de}_a_${rel.ate}`;
  function exportarVendas() {
    U.baixarCSV(`nexora-vendas-${sufixo()}.csv`, ["Início", "Fim", "Vendas", "Valor vendido (R$)", "Perdidas"],
      rel.serie.map((s) => [U.dataCompleta(s.ini), U.dataCompleta(s.fim), s.ganhos, s.valor, s.perdidos]));
  }
  function exportarFechadas() {
    U.baixarCSV(`nexora-oportunidades-fechadas-${sufixo()}.csv`, ["Data", "Resultado", "Empresa", "Contato", "Serviço", "Valor (R$)", "Responsável", "Motivo da perda"],
      rel.fechados.sort((a, b) => a.fechadoEm.localeCompare(b.fechadoEm)).map((n) => [U.dataCompleta(n.fechadoEm), n.etapa === "ganho" ? "Ganha" : "Perdida", n.empresa, n.contato, n.titulo, n.valor, L.membro(n.responsavelId).nome, n.motivoPerda || ""]));
  }
  function exportarOrigens() {
    U.baixarCSV(`nexora-leads-por-origem-${sufixo()}.csv`, ["Origem", "Leads"], rel.origens.map((o) => [o.rotulo, o.valor]));
  }
  function exportarDesempenho() {
    U.baixarCSV(`nexora-desempenho-${sufixo()}.csv`, ["Responsável", "Cargo", "Vendas", "Valor vendido (R$)", "Perdidas", "Conversão (%)", "Em aberto", "Valor em aberto (R$)", "Tarefas concluídas"],
      rel.desempenho.map((p) => [p.rotulo, p.cargo, p.ganhos, p.valor, p.perdidos, p.conversao == null ? "" : Math.round(p.conversao * 1000) / 10, p.abertos, p.valorAberto, p.tarefasConcluidas]));
  }
  function exportarResumo() {
    U.baixarCSV(`nexora-resumo-${sufixo()}.csv`, ["Indicador", "Valor"], [
      ["Período", `${U.dataCompleta(rel.de)} a ${U.dataCompleta(rel.ate)}`],
      ["Vendas concluídas", rel.ganhos.length],
      ["Valor vendido (R$)", rel.valorGanho],
      ["Valor médio das vendas (R$)", Math.round(rel.ticketMedio * 100) / 100],
      ["Oportunidades perdidas", rel.perdidos.length],
      ["Valor perdido (R$)", rel.valorPerdido],
      ["Conversão de oportunidades (%)", rel.conversaoOportunidades == null ? "" : Math.round(rel.conversaoOportunidades * 1000) / 10],
      ["Leads no período", rel.leadsNoPeriodo],
      ["Leads convertidos", rel.leadsConvertidos],
      ["Conversão de leads (%)", rel.conversaoLeads == null ? "" : Math.round(rel.conversaoLeads * 1000) / 10],
    ]);
  }

  NX.telas.relatorios = { titulo: "Relatórios", montar, atualizar, estado };
})();
