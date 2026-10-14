/* ==========================================================================
   NEXORA BOOKING — Tela: Agendamentos
   Lista de reservas com busca, filtros (período, status, profissional,
   serviço, origem), ordenação, paginação e exportação em CSV.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const A = NX.agenda;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const GRUPOS = [
    ["", "Todos"], ["ativos", "Ativos"], ["pendente", "Pendentes"], ["confirmado", "Confirmados"], ["em_atendimento", "Em atendimento"],
    ["concluido", "Concluídos"], ["perdidos", "Cancelados e faltas"], ["cancelado", "Cancelados"], ["nao_compareceu", "Faltas"],
  ];
  const noGrupo = (a, g) => !g || (g === "ativos" ? ["pendente", "confirmado", "em_atendimento"].includes(a.status) : g === "perdidos" ? ["cancelado", "nao_compareceu"].includes(a.status) : a.status === g);
  const estado = { periodo: { id: "proximos7" }, status: "", profissionalId: "", servicoId: "", origem: "", clienteId: "", busca: "", ordem: "quando", direcao: "asc", pagina: 1 };
  let p = null;

  function aoEntrar(params) {
    if (params.status !== undefined) estado.status = GRUPOS.some(([g]) => g === params.status) ? params.status : "";
    if (params.periodo && C().PERIODOS.some((x) => x.id === params.periodo)) { estado.periodo = { id: params.periodo }; Object.assign(estado.periodo, C().intervalo(estado.periodo)); }
    if (params.de && params.ate && U.dataValida(params.de) && U.dataValida(params.ate)) estado.periodo = { id: "personalizado", de: params.de, ate: params.ate };
    if (params.profissional !== undefined) estado.profissionalId = params.profissional;
    if (params.servico !== undefined) estado.servicoId = params.servico;
    if (params.cliente !== undefined) estado.clienteId = params.cliente;
    if (params.q !== undefined) estado.busca = params.q;
    if (Object.keys(params).length) {
      estado.pagina = 1;
      const { de } = C().intervaloDe(estado.periodo);
      estado.direcao = de >= U.hoje() ? "asc" : "desc";
      estado.ordem = "quando";
    }
  }

  function montar(secao) {
    const busca = C().campoBusca({ placeholder: "Cliente, telefone, código ou serviço", rotulo: "Buscar reservas", foco: "ag-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizar(); } });
    p = { periodo: el("div"), busca, seletores: el("div", { style: { display: "contents" } }), chips: el("div", { class: "chips", role: "group", "aria-label": "Status" }), corpo: el("div") };
    p.filtros = el("div", {}, p.periodo, el("div", { class: "barra-filtros" }, busca.caixa, p.seletores));
    U.trocar(secao, 
      C().cabecalho({ id: "agendamentos", titulo: "Agendamentos", sub: "Todas as reservas, do painel e da página de agendamento.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Novo agendamento", "btn--primario", () => NX.reservas.novo(), "plus"),
      ] }),
      p.filtros, p.chips, p.corpo);
  }

  function filtrar() {
    const { de, ate } = C().intervaloDe(estado.periodo);
    const q = estado.busca.trim();
    const dig = U.digitos(q);
    return L.dados.agendamentos.filter((a) => {
      if (a.data < de || a.data > ate) return false;
      if (estado.profissionalId && a.profissionalId !== estado.profissionalId) return false;
      if (estado.servicoId && a.servicoId !== estado.servicoId) return false;
      if (estado.origem && a.origem !== estado.origem) return false;
      if (estado.clienteId && a.clienteId !== estado.clienteId) return false;
      if (q) {
        const c = L.cliente(a.clienteId);
        const ok = U.contem(a.codigo, q) || U.contem(a.servicoNome, q) || (c && (U.contem(c.nome, q) || (dig.length >= 3 && c.telefone.includes(dig))));
        if (!ok) return false;
      }
      return true;
    });
  }
  function ordenar(lista) {
    const dir = estado.direcao === "asc" ? 1 : -1;
    const chave = {
      quando: (a) => `${a.data}T${a.inicio}`,
      cliente: (a) => U.semAcento(C().nomeDoCliente(a.clienteId)),
      valor: (a) => a.preco,
    }[estado.ordem] || ((a) => `${a.data}T${a.inicio}`);
    return [...lista].sort((x, y) => { const a = chave(x); const b = chave(y); return (a < b ? -1 : a > b ? 1 : 0) * dir || `${x.data}${x.inicio}`.localeCompare(`${y.data}${y.inicio}`); });
  }

  function desenhar() {
    if (p.busca.input.value !== estado.busca && document.activeElement !== p.busca.input) p.busca.input.value = estado.busca;
    const cli = estado.clienteId ? L.cliente(estado.clienteId) : null;
    U.trocar(p.periodo, 
      C().seletorPeriodo(estado.periodo, () => { estado.pagina = 1; atualizar(); }, { ids: ["hoje", "proximos7", "futuros", "7d", "30d", "mes", "tudo", "personalizado"], nome: "ag" }),
      el("p", { class: "periodo-descricao", texto: `Data do atendimento: ${C().descreverPeriodo(C().intervaloDe(estado.periodo))}` }));
    U.trocar(p.seletores, 
        C().seletor(C().opcoesProfissionais({ todos: "Todos os profissionais", incluirInativos: true }), estado.profissionalId, (v) => { estado.profissionalId = v; estado.pagina = 1; atualizar(); }, { rotulo: "Profissional", foco: "ag-prof" }),
        C().seletor(C().opcoesServicos({ todos: "Todos os serviços", incluirInativos: true }), estado.servicoId, (v) => { estado.servicoId = v; estado.pagina = 1; atualizar(); }, { rotulo: "Serviço", foco: "ag-servico" }),
        C().seletor([{ valor: "", rotulo: "Painel e página" }, { valor: "painel", rotulo: "Criadas no painel" }, { valor: "pagina", rotulo: "Pela página online" }], estado.origem, (v) => { estado.origem = v; estado.pagina = 1; atualizar(); }, { rotulo: "Origem", foco: "ag-origem" }),
        cli ? el("span", { class: "chip", "aria-pressed": "true" }, `Cliente: ${cli.nome}`, el("button", { class: "icone-btn icone-btn--sutil icone-btn--p", type: "button", "aria-label": "Remover filtro de cliente", "data-foco": "ag-sem-cliente", onclick: () => { estado.clienteId = ""; atualizar(); } }, icone("x", 14))) : null);

    const base = filtrar();
    U.trocar(p.chips, ...GRUPOS.map(([g, t]) => el("button", { class: "chip", type: "button", "aria-pressed": String(estado.status === g), "data-foco": `ag-st-${g || "todos"}`, onclick: () => { estado.status = g; estado.pagina = 1; atualizar(); } }, t, el("span", { class: "chip__n", texto: U.numero(base.filter((a) => noGrupo(a, g)).length) }))));

    const lista = ordenar(base.filter((a) => noGrupo(a, estado.status)));
    const pag = C().paginar(lista, estado.pagina, NX.preferencias.porPagina);
    estado.pagina = pag.pagina;
    if (!lista.length) {
      U.trocar(p.corpo, el("div", { class: "cartao" }, C().vazio({ icone: "calendar-search", titulo: "Nenhuma reserva encontrada", texto: "Mude o período ou os filtros. Reservas canceladas continuam aqui, no filtro Cancelados.", acao: C().botao("Limpar filtros", "btn--linha btn--pequeno", () => { Object.assign(estado, { status: "", profissionalId: "", servicoId: "", origem: "", clienteId: "", busca: "", pagina: 1 }); p.busca.input.value = ""; atualizar(); }, "x") })));
      return;
    }
    const total = lista.filter((a) => !["cancelado", "nao_compareceu"].includes(a.status)).reduce((t, a) => t + a.preco, 0);
    const tabela = el("table", { class: "tabela tabela--larga" },
      el("caption", { class: "vh", texto: "Reservas encontradas" }),
      el("thead", {}, el("tr", {},
        C().thOrdenavel("Quando", "quando", estado, atualizar),
        C().thOrdenavel("Cliente", "cliente", estado, atualizar),
        el("th", { scope: "col", texto: "Serviço" }),
        el("th", { scope: "col", texto: "Profissional" }),
        C().thOrdenavel("Valor", "valor", estado, atualizar, "num"),
        el("th", { scope: "col", texto: "Status" }),
        el("th", { scope: "col" }, el("span", { class: "vh", texto: "Ações" })))),
      el("tbody", {}, ...pag.itens.map((a) => {
        const acoes = A.acoesPermitidas(a);
        return el("tr", {},
          C().td("Quando", el("span", { class: "nowrap" }, el("b", { class: "hora", texto: `${a.inicio}–${a.fim}` }), el("span", { class: "sub", texto: Math.abs(U.diasEntre(U.hoje(), a.data)) <= 1 ? `${U.dataCurta(a.data)} · ${U.relativo(a.data)}` : `${NX.DIAS_CURTOS[U.diaDaSemana(a.data)]}, ${U.dataCurta(a.data)}` }))),
          C().td("", C().nomeCliente(a.clienteId), "principal-celula"),
          C().td("Serviço", el("span", {}, a.servicoNome, el("span", { class: "sub" }, `${a.duracao} min · `, el("span", { class: "nowrap", texto: a.codigo })))),
          C().td("Profissional", C().nomeProf(a.profissionalId, { curto: true })),
          C().td("Valor", el("span", {}, U.moeda(a.preco), a.status === "concluido" ? el("span", { class: "sub", texto: a.pagamento ? `pago (${a.pagamento.forma})` : "a receber" }) : null), "num"),
          C().td("Status", el("span", { class: "pagina__etiquetas", style: { margin: 0, flexWrap: "nowrap" } }, C().pilulaStatus(a.status, { curto: true }), a.origem === "pagina" ? el("span", { class: "suave", title: "Feita pela página de agendamento" }, icone("globe", 14)) : null)),
          C().td("", el("span", {},
            acoes.includes("confirmar") ? el("button", { class: "btn btn--linha btn--pequeno", type: "button", "data-foco": `conf-${a.id}`, onclick: () => { const r = A.confirmar(a.id); U.aviso(r.ok ? `Reserva ${a.codigo} confirmada.` : r.erro, r.ok ? "ok" : "erro"); } }, icone("circle-check", 15), "Confirmar") : null,
            el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": `Abrir reserva ${a.codigo}`, title: "Abrir detalhes", "data-foco": `abrir-${a.id}`, onclick: () => NX.reservas.detalhe(a.id) }, icone("panel-right-open", 16))), "acoes-linha"));
      })));
    U.trocar(p.corpo, el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: `${U.plural(lista.length, "reserva", "reservas")} · ${U.moeda(total)} em reservas não canceladas` }),
      el("div", { class: "tabela-rolagem" }, tabela),
      C().paginacao(pag, { porPagina: NX.preferencias.porPagina, nome: "agendamentos", aoMudar: (n) => { estado.pagina = n; atualizar(); }, aoMudarTamanho: (n) => NX.salvarPreferencias({ porPagina: n }) })));
  }

  const atualizar = C().comFoco(desenhar);

  function exportar() {
    const lista = ordenar(filtrar().filter((a) => noGrupo(a, estado.status)));
    if (!lista.length) { U.aviso("Nada para exportar com estes filtros.", "info"); return; }
    U.baixarCSV(U.nomeArquivo("agendamentos"),
      ["Código", "Data", "Início", "Fim", "Cliente", "Telefone", "Serviço", "Profissional", "Duração (min)", "Preço registrado", "Status", "Pagamento", "Forma", "Origem", "Criada em"],
      lista.map((a) => { const c = L.cliente(a.clienteId); return [a.codigo, U.dataCompleta(a.data), a.inicio, a.fim, c ? c.nome : "", c ? U.mascaraTelefone(c.telefone) : "", a.servicoNome, C().nomeDoProf(a.profissionalId), a.duracao, a.preco, A.nomeStatus(a.status), a.pagamento ? a.pagamento.valor : "", a.pagamento ? a.pagamento.forma : "", a.origem === "pagina" ? "Página online" : "Painel", U.dataHora(a.criadoEm)]; }));
  }

  NX.telas.agendamentos = { titulo: "Agendamentos", montar, atualizar, aoEntrar };
})();
