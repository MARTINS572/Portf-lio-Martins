/* ==========================================================================
   NEXORA CRM — Tela: Visão geral (dashboard)
   Todos os números saem de NX.loja (calculados a partir dos registros).
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
  let partes = null;

  function saudacao() {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  }

  function indicador({ rotulo, valor, nota, icone: ic, classe = "" }) {
    return el("article", { class: `indicador ${classe}` },
      el("p", { class: "indicador__rotulo" }, icone(ic, 16), el("span", { texto: rotulo })),
      el("p", { class: "indicador__valor", texto: valor }),
      nota ? el("p", { class: "indicador__nota", texto: nota }) : null);
  }

  const ICONE_ATIVIDADE = { ganho: "trophy", perdido: "circle-x", movido: "arrow-right", lead: "user-plus", cliente: "building", tarefa: "check", nota: "sticky-note", contato: "phone", negocio: "handshake", excluido: "trash" };

  function abrirReferencia(ref) {
    if (!ref) return;
    if (ref.tipo === "lead") NX.detalhe.lead(ref.id);
    else if (ref.tipo === "negocio") NX.detalhe.negocio(ref.id);
    else if (ref.tipo === "cliente") NX.ir(`clientes/${ref.id}`);
    else if (ref.tipo === "tarefa") { const t = L.tarefa(ref.id); if (t) NX.form.tarefa({ id: ref.id }); }
  }

  function quando(dataHora) {
    const [d, h] = dataHora.split("T");
    const r = U.relativo(d);
    return r === "hoje" || r === "ontem" ? `${r}, ${h}` : r;
  }

  function montar(secao) {
    const meta = C().cartaoGrafico({ titulo: "Evolução das vendas", sub: "Valor das vendas concluídas por mês, com a meta mensal", classe: "grafico--largo" });
    const etapas = C().cartaoGrafico({ titulo: "Negociações por etapa", sub: "Oportunidades abertas em cada etapa do pipeline" });
    const origens = C().cartaoGrafico({ titulo: "Leads por origem", sub: "Todos os leads cadastrados" });
    const equipe = C().cartaoGrafico({ titulo: "Desempenho comercial", sub: "Valor vendido no mês por responsável" });
    partes = {
      cabeca: el("div"),
      lembrete: el("div", { class: "lembrete-caixa" }),
      indicadores: el("div", { class: "indicadores" }),
      meta, etapas, origens, equipe,
      atividades: el("ol", { class: "atividades" }),
      tarefas: el("ul", { class: "mini-tarefas" }),
      tarefasVazio: el("p", { class: "vazio-pequeno", texto: "Nenhuma tarefa pendente. Bom trabalho!", hidden: true }),
    };
    secao.replaceChildren(
      partes.cabeca,
      partes.lembrete,
      partes.indicadores,
      el("div", { class: "painel-grade" }, meta.cartao, etapas.cartao, origens.cartao, equipe.cartao),
      el("div", { class: "painel-grade painel-grade--duas" },
        el("article", { class: "cartao" },
          el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Atividades recentes" }), el("p", { class: "cartao__sub", texto: "O que mudou no CRM, do mais novo para o mais antigo" }))),
          partes.atividades),
        el("article", { class: "cartao" },
          el("div", { class: "cartao__cabeca" },
            el("div", {}, el("h2", { class: "cartao__titulo", texto: "Próximas tarefas" }), el("p", { class: "cartao__sub", texto: "Pendentes, por prazo" })),
            el("a", { class: "link-btn", href: "#/tarefas", texto: "Ver todas" })),
          partes.tarefas, partes.tarefasVazio)),
    );
  }

  function atualizar() {
    const d = L.dados;
    const k = L.indicadores();
    const hoje = U.hoje();
    const primeiroNome = d.perfil.nome.split(" ")[0];

    partes.cabeca.replaceChildren(C().cabecalho({
      id: "visao-geral",
      titulo: `${saudacao()}, ${primeiroNome}`,
      sub: `${U.dataLonga(hoje).replace(/^./, (c) => c.toUpperCase())} · ${d.empresa}`,
      acoes: [
        C().botao("Nova oportunidade", "btn--linha", () => NX.form.negocio(), "handshake"),
        C().botao("Novo lead", "btn--primario", () => NX.form.lead(), "user-plus"),
      ],
    }));

    // Lembrete de tarefas atrasadas (dentro do próprio sistema)
    const atrasadas = d.tarefas.filter((t) => !t.concluida && t.prazo < hoje).length;
    const paraHoje = d.tarefas.filter((t) => !t.concluida && t.prazo === hoje).length;
    partes.lembrete.replaceChildren(...(atrasadas || paraHoje ? [el("div", { class: `lembrete${atrasadas ? " lembrete--alerta" : ""}`, role: "status" },
      icone(atrasadas ? "alarm-clock" : "calendar-clock", 18),
      el("p", {}, atrasadas ? el("b", { texto: U.plural(atrasadas, "tarefa atrasada", "tarefas atrasadas") }) : null, atrasadas && paraHoje ? " e " : "", paraHoje ? el("b", { texto: U.plural(paraHoje, "tarefa para hoje", "tarefas para hoje") }) : null, "."),
      el("a", { class: "link-btn", href: "#/tarefas", texto: "Ver tarefas" }))] : []));

    // Indicadores
    const faltam = Math.max(0, k.meta - k.valorGanhoMes);
    const diasRestantes = U.diasEntre(hoje, U.fimDoMes(hoje));
    const pct = Math.min(1, k.progressoMeta);
    partes.indicadores.replaceChildren(
      indicador({ rotulo: "Total de leads", valor: U.numero(k.totalLeads), nota: `${U.plural(k.leadsMes, "novo", "novos")} neste mês · ${k.leadsAbertos} em andamento`, icone: "user-plus" }),
      indicador({ rotulo: "Clientes ativos", valor: U.numero(k.clientesAtivos), nota: `de ${k.clientesTotal} cadastrados`, icone: "building" }),
      indicador({ rotulo: "Negociações em andamento", valor: U.numero(k.negociacoes), nota: "nas etapas abertas do pipeline", icone: "handshake" }),
      indicador({ rotulo: "Vendas concluídas no mês", valor: U.numero(k.vendasMes), nota: `${U.moeda(k.valorGanhoMes, { compacto: false })} vendidos`, icone: "trophy" }),
      indicador({ rotulo: "Taxa de conversão", valor: U.percentual(k.conversao), nota: `${k.ganhos6m} ganhas de ${k.fechados6m} fechadas (6 meses)`, icone: "target" }),
      indicador({ rotulo: "Valor das oportunidades", valor: U.moeda(k.valorAberto), nota: `soma das ${k.negociacoes} negociações abertas`, icone: "wallet" }),
      el("article", { class: "indicador indicador--meta" },
        el("p", { class: "indicador__rotulo" }, icone("flag", 16), el("span", { texto: "Meta comercial do mês" })),
        el("p", { class: "indicador__valor" }, U.moeda(k.valorGanhoMes), el("span", { class: "indicador__de", texto: ` de ${U.moeda(k.meta)}` })),
        el("div", { class: `medidor${pct >= 1 ? " medidor--batida" : ""}`, role: "meter", "aria-valuemin": "0", "aria-valuemax": String(k.meta), "aria-valuenow": String(k.valorGanhoMes), "aria-label": `Meta do mês: ${U.percentual(k.progressoMeta)} atingida` },
          el("span", { class: "medidor__barra", style: { width: `${pct * 100}%` } })),
        el("p", { class: "indicador__nota" }, el("b", { texto: U.percentual(k.progressoMeta) }), pct >= 1 ? " · meta atingida" : ` · faltam ${U.moeda(faltam)} em ${U.plural(diasRestantes, "dia", "dias")}`)),
    );

    // Gráficos
    const vendas = L.vendasPorMes(6);
    G.area(partes.meta.cartao, {
      rotulos: vendas.map((v) => v.rotulo), valores: vendas.map((v) => v.valor), nome: "Vendas por mês",
      formatar: (v) => U.moeda(v, { compacto: true }), referencia: { valor: d.metaMensal, rotulo: `Meta ${U.moedaCompacta(d.metaMensal)}` },
      detalhes: (i) => [`${U.plural(vendas[i].quantidade, "venda", "vendas")}${vendas[i].atual ? " · mês em andamento" : ""}`],
    });
    G.tabela(partes.meta.cartao, ["Mês", "Vendas", "Valor"], vendas.map((v) => [U.mesAno(v.inicio), U.numero(v.quantidade), U.moeda(v.valor, { compacto: false })]));

    const dist = L.distribuicaoPorEtapa();
    G.barras(partes.etapas.cartao, { itens: dist.map((e) => ({ rotulo: e.rotulo, valor: e.valor, sub: U.moeda(e.total) })), ordinal: true, formatar: (v) => U.plural(v, "oportunidade", "oportunidades") });
    G.tabela(partes.etapas.cartao, ["Etapa", "Oportunidades", "Valor"], dist.map((e) => [e.rotulo, U.numero(e.valor), U.moeda(e.total, { compacto: false })]));

    const origens = L.leadsPorOrigem();
    G.barras(partes.origens.cartao, { itens: origens, formatar: (v) => U.plural(v, "lead", "leads") });
    G.tabela(partes.origens.cartao, ["Origem", "Leads"], origens.map((o) => [o.rotulo, U.numero(o.valor)]));

    const desemp = L.desempenho(U.inicioDoMes(hoje), hoje).sort((a, b) => b.valor - a.valor);
    G.barras(partes.equipe.cartao, { itens: desemp.map((p) => ({ rotulo: p.rotulo, valor: p.valor, sub: `${U.plural(p.ganhos, "venda", "vendas")} · ${p.abertos} em aberto` })), formatar: (v) => U.moeda(v), vazio: "Nenhuma venda concluída neste mês ainda." });
    G.tabela(partes.equipe.cartao, ["Responsável", "Vendas", "Valor", "Em aberto"], desemp.map((p) => [p.rotulo, U.numero(p.ganhos), U.moeda(p.valor, { compacto: false }), U.numero(p.abertos)]));

    // Atividades
    partes.atividades.replaceChildren(...d.atividades.slice(0, 8).map((a) => el("li", { class: `atividade atividade--${a.tipo}` },
      el("span", { class: "atividade__icone" }, icone(ICONE_ATIVIDADE[a.tipo] || "circle-dot", 15)),
      el("div", { class: "atividade__texto" },
        a.ref && (a.tipo !== "tarefa" || L.tarefa(a.ref.id)) ? el("button", { class: "link-texto", type: "button", onclick: () => abrirReferencia(a.ref), texto: a.texto }) : el("span", { texto: a.texto }),
        el("span", { class: "atividade__meta", texto: `${L.membro(a.autorId).nome} · ${quando(a.data)}` })))));

    // Próximas tarefas
    const pendentes = d.tarefas.filter((t) => !t.concluida).sort((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 6);
    partes.tarefasVazio.hidden = pendentes.length > 0;
    partes.tarefas.replaceChildren(...pendentes.map((t) => NX.telas.tarefas.linhaCompacta(t)));
  }

  NX.telas["visao-geral"] = { titulo: "Visão geral", montar, atualizar };
})();
