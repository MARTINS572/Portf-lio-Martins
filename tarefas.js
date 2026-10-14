/* ==========================================================================
   NEXORA CRM — Tela: Tarefas e follow-up
   Filtros por prazo, prioridade, status e responsável. Tarefas atrasadas,
   de hoje e concluídas têm marcações diferentes (ícone + texto, não só cor).
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const filtro = { prazo: "", prioridade: "", status: "pendentes", responsavel: "" };
  let partes = null;

  const SITUACAO = {
    atrasada: { icone: "triangle-alert", rotulo: "Atrasada" },
    hoje: { icone: "calendar-clock", rotulo: "Hoje" },
    pendente: { icone: "calendar", rotulo: "Pendente" },
    concluida: { icone: "circle-check", rotulo: "Concluída" },
  };

  function rotuloPrazo(t) {
    const s = L.situacaoDaTarefa(t);
    if (s === "concluida") return `Concluída ${U.relativo(t.concluidaEm)}`;
    if (s === "atrasada") return `Atrasada · ${U.dataCurta(t.prazo)}`;
    if (s === "hoje") return "Vence hoje";
    return `${U.relativo(t.prazo)[0].toUpperCase()}${U.relativo(t.prazo).slice(1)} · ${U.dataCurta(t.prazo)}`;
  }

  function caixaConcluir(t) {
    const id = `concluir-${t.id}`;
    const caixa = el("input", { type: "checkbox", id, class: "concluir", "data-foco": id });
    caixa.checked = t.concluida;
    caixa.addEventListener("change", () => {
      const r = L.concluirTarefa(t.id, caixa.checked);
      if (r.ok) U.aviso(caixa.checked ? `Tarefa concluída: ${t.titulo}` : "Tarefa reaberta.", caixa.checked ? "ok" : "info");
    });
    return el("span", { class: "concluir-caixa" }, caixa, el("label", { for: id, class: "vh", texto: `${t.concluida ? "Reabrir" : "Concluir"}: ${t.titulo}` }));
  }

  function linkVinculo(t) {
    const v = t.vinculo;
    const nome = L.nomeDoVinculo(v);
    if (v.tipo === "cliente" && L.cliente(v.id)) return el("a", { class: "vinculo", href: `#/clientes/${v.id}` }, icone("building", 13), nome);
    if (v.tipo === "lead" && L.lead(v.id)) return el("button", { class: "vinculo", type: "button", onclick: () => NX.detalhe.lead(v.id) }, icone("user", 13), nome);
    return el("span", { class: "vinculo", texto: nome });
  }

  // Versão compacta (usada na visão geral e na ficha do cliente)
  function linhaCompacta(t, { semVinculo } = {}) {
    const s = L.situacaoDaTarefa(t);
    return el("li", { class: `mini-tarefa mini-tarefa--${s}` },
      caixaConcluir(t),
      el("div", { class: "mini-tarefa__texto" },
        el("button", { class: "link-texto", type: "button", onclick: () => NX.form.tarefa({ id: t.id }), texto: t.titulo }),
        semVinculo ? null : el("span", { class: "suave", texto: L.nomeDoVinculo(t.vinculo) })),
      el("span", { class: `situacao situacao--${s}` }, icone(SITUACAO[s].icone, 13), s === "pendente" ? U.relativo(t.prazo) : SITUACAO[s].rotulo));
  }

  function linha(t) {
    const s = L.situacaoDaTarefa(t);
    return el("li", { class: `tarefa tarefa--${s}` },
      caixaConcluir(t),
      el("div", { class: "tarefa__principal" },
        el("p", { class: "tarefa__titulo", texto: t.titulo }),
        t.descricao ? el("p", { class: "tarefa__descricao", texto: t.descricao }) : null,
        linkVinculo(t)),
      el("div", { class: "tarefa__meta" },
        el("span", { class: `situacao situacao--${s}` }, icone(SITUACAO[s].icone, 14), rotuloPrazo(t)),
        el("span", { class: `prioridade prioridade--${U.semAcento(t.prioridade)}`, title: `Prioridade ${t.prioridade.toLowerCase()}` }, el("i", { "aria-hidden": "true" }), t.prioridade),
        C().avatar(t.responsavelId)),
      el("div", { class: "acoes-linha" },
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": `Editar tarefa: ${t.titulo}`, title: "Editar", onclick: () => NX.form.tarefa({ id: t.id }) }, icone("pencil", 16)),
        el("button", { class: "icone-btn icone-btn--sutil icone-btn--p icone-btn--perigo", type: "button", "aria-label": `Excluir tarefa: ${t.titulo}`, title: "Excluir",
          onclick: async () => {
            const ok = await U.confirmar({ titulo: "Excluir tarefa?", texto: `"${t.titulo}" será removida. Esta ação não pode ser desfeita.`, rotulo: "Excluir", perigo: true });
            if (ok) { L.excluirTarefa(t.id); U.aviso("Tarefa excluída."); }
          } }, icone("trash", 16))));
  }

  function montar(secao) {
    const sel = (rotulo, opcoes, chave) => {
      const s = el("select", { "aria-label": rotulo }, ...opcoes.map(([v, t]) => el("option", { value: v, texto: t })));
      s.value = filtro[chave];
      s.addEventListener("change", () => { filtro[chave] = s.value; atualizar(); });
      return s;
    };
    partes = {
      resumo: el("div", { class: "resumo-tarefas" }),
      prazo: sel("Filtrar por prazo", [["", "Qualquer prazo"], ["atrasadas", "Atrasadas"], ["hoje", "Para hoje"], ["semana", "Próximos 7 dias"], ["depois", "Depois de 7 dias"]], "prazo"),
      prioridade: sel("Filtrar por prioridade", [["", "Todas as prioridades"], ["Alta", "Alta"], ["Média", "Média"], ["Baixa", "Baixa"]], "prioridade"),
      status: sel("Filtrar por status", [["pendentes", "Pendentes"], ["concluidas", "Concluídas"], ["todas", "Todas"]], "status"),
      responsavel: el("select", { "aria-label": "Filtrar por responsável" }),
      lista: el("div", { class: "grupos-tarefas" }),
      vazio: el("div", { class: "vazio", hidden: true }, icone("check-check", 22), el("p", { texto: "Nenhuma tarefa com esses filtros." })),
    };
    partes.responsavel.addEventListener("change", () => { filtro.responsavel = partes.responsavel.value; atualizar(); });
    secao.replaceChildren(
      C().cabecalho({ id: "tarefas", titulo: "Tarefas", sub: "Follow-ups comerciais com prazo, prioridade e responsável", acoes: [C().botao("Nova tarefa", "btn--primario", () => NX.form.tarefa(), "plus")] }),
      partes.resumo,
      el("div", { class: "barra-filtros" }, partes.prazo, partes.prioridade, partes.status, partes.responsavel,
        el("button", { class: "link-btn", type: "button", texto: "Limpar filtros", onclick: () => definirFiltro({ prazo: "", prioridade: "", status: "pendentes", responsavel: "" }) })),
      el("div", { class: "cartao" }, partes.lista, partes.vazio),
    );
  }

  function definirFiltro(novo) {
    Object.assign(filtro, novo);
    if (partes) { partes.prazo.value = filtro.prazo; partes.prioridade.value = filtro.prioridade; partes.status.value = filtro.status; partes.responsavel.value = filtro.responsavel; }
    if (partes) atualizar();
  }

  function atualizar() {
    const d = L.dados;
    const hoje = U.hoje();
    const em7 = U.somarDias(hoje, 7);
    const atual = filtro.responsavel;
    partes.responsavel.replaceChildren(el("option", { value: "", texto: "Toda a equipe" }), ...d.equipe.map((u) => el("option", { value: u.id, texto: u.id === d.perfil.id ? `${u.nome} (você)` : u.nome })));
    partes.responsavel.value = atual;

    const pend = d.tarefas.filter((t) => !t.concluida);
    const contagens = {
      atrasadas: pend.filter((t) => t.prazo < hoje).length,
      hoje: pend.filter((t) => t.prazo === hoje).length,
      semana: pend.filter((t) => t.prazo > hoje && t.prazo <= em7).length,
      concluidas: d.tarefas.filter((t) => t.concluida && t.concluidaEm >= U.inicioDoMes(hoje)).length,
    };
    const resumoBtn = (chave, rotulo, n, nomeIcone, aplicar) => el("button", { class: `resumo-tarefa resumo-tarefa--${chave}`, type: "button", "aria-pressed": String(aplicar.ativo), onclick: aplicar.fazer, "data-foco": `resumo-${chave}` },
      el("span", { class: "resumo-tarefa__icone" }, icone(nomeIcone, 16)), el("b", { texto: U.numero(n) }), el("span", { texto: rotulo }));
    partes.resumo.replaceChildren(
      resumoBtn("atrasada", "atrasadas", contagens.atrasadas, "triangle-alert", { ativo: filtro.prazo === "atrasadas" && filtro.status === "pendentes", fazer: () => definirFiltro({ prazo: "atrasadas", status: "pendentes" }) }),
      resumoBtn("hoje", "para hoje", contagens.hoje, "calendar-clock", { ativo: filtro.prazo === "hoje" && filtro.status === "pendentes", fazer: () => definirFiltro({ prazo: "hoje", status: "pendentes" }) }),
      resumoBtn("pendente", "nos próximos 7 dias", contagens.semana, "calendar", { ativo: filtro.prazo === "semana" && filtro.status === "pendentes", fazer: () => definirFiltro({ prazo: "semana", status: "pendentes" }) }),
      resumoBtn("concluida", "concluídas no mês", contagens.concluidas, "circle-check", { ativo: filtro.status === "concluidas", fazer: () => definirFiltro({ prazo: "", status: "concluidas" }) }),
    );

    const lista = d.tarefas.filter((t) =>
      (filtro.status === "todas" || (filtro.status === "pendentes" ? !t.concluida : t.concluida)) &&
      (!filtro.prioridade || t.prioridade === filtro.prioridade) &&
      (!filtro.responsavel || t.responsavelId === filtro.responsavel) &&
      (!filtro.prazo ||
        (filtro.prazo === "atrasadas" && t.prazo < hoje && !t.concluida) ||
        (filtro.prazo === "hoje" && t.prazo === hoje) ||
        (filtro.prazo === "semana" && t.prazo > hoje && t.prazo <= em7) ||
        (filtro.prazo === "depois" && t.prazo > em7)));

    const ordemPrioridade = { Alta: 0, "Média": 1, Baixa: 2 };
    const ordenar = (a, b) => a.prazo.localeCompare(b.prazo) || ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade];
    const grupos = [
      ["Atrasadas", lista.filter((t) => !t.concluida && t.prazo < hoje).sort(ordenar)],
      ["Hoje", lista.filter((t) => !t.concluida && t.prazo === hoje).sort(ordenar)],
      ["Próximos 7 dias", lista.filter((t) => !t.concluida && t.prazo > hoje && t.prazo <= em7).sort(ordenar)],
      ["Mais tarde", lista.filter((t) => !t.concluida && t.prazo > em7).sort(ordenar)],
      ["Concluídas", lista.filter((t) => t.concluida).sort((a, b) => b.concluidaEm.localeCompare(a.concluidaEm))],
    ].filter(([, itens]) => itens.length);

    partes.vazio.hidden = lista.length > 0;
    partes.lista.replaceChildren(...grupos.map(([titulo, itens]) => el("section", { class: "grupo-tarefas" },
      el("h2", { class: "grupo-tarefas__titulo" }, titulo, el("span", { class: "chip__n", texto: String(itens.length) })),
      el("ul", { class: "lista-tarefas" }, ...itens.map(linha)))));
  }

  NX.telas.tarefas = { titulo: "Tarefas", montar, atualizar, linhaCompacta, definirFiltro };
})();
