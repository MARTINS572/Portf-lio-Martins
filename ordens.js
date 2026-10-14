/* ==========================================================================
   NEXORA AUTO — Tela: Ordens de serviço (lista)
   Filtros por situação, técnico, período e busca (número, placa, cliente).
   Cada linha abre a ordem. A lista exportada em CSV é a mesma da tela.
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

  const GRUPOS = {
    andamento: { rotulo: "Em andamento", f: (os) => O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status) },
    abertas: { rotulo: "Na oficina", f: (os) => O.ABERTAS.includes(os.status) },
    prontas: { rotulo: "Prontas para retirada", f: (os) => O.PRONTAS.includes(os.status) },
    todas: { rotulo: "Todas", f: () => true },
  };
  const CHIPS = ["andamento", "aguardando_aprovacao", "aguardando_pecas", "em_execucao", "prontas", "entregue", "cancelada", "todas"];
  const PADRAO = () => ({ status: "andamento", busca: "", tecnico: "", de: "", ate: "", pagina: 1, ordem: "abertaEm", direcao: "desc" });
  const estado = PADRAO();
  let p = null;

  const filtroStatus = (id) => GRUPOS[id] ? GRUPOS[id].f : (os) => os.status === id;
  const rotuloStatus = (id) => (GRUPOS[id] ? GRUPOS[id].rotulo : O.nomeStatus(id));

  function montar(secao) {
    const busca = C().campoBusca({ placeholder: "Nº da OS, placa ou cliente", rotulo: "Buscar ordens", foco: "ordens-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizar(); } });
    p = { busca, chips: el("div"), filtros: el("div", { class: "barra-filtros" }), periodo: el("div"), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "ordens", titulo: "Ordens de serviço", sub: "Do recebimento do veículo à entrega. Clique numa ordem para ver itens, orçamento, peças, valores e histórico.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botaoSe("os_abrir", "Nova OS", "btn--primario", () => NX.form.novaOS(), "plus"),
      ] }),
      p.chips, p.filtros, p.periodo, p.tabela);
  }

  function lista() {
    const d = L.dados;
    const q = estado.busca.trim();
    const placaQ = L.limparPlaca(q);
    return d.ordens.filter((os) => filtroStatus(estado.status)(os)
      && (!estado.tecnico || os.tecnicoId === estado.tecnico)
      && (!estado.de || os.abertaEm.slice(0, 10) >= estado.de) && (!estado.ate || os.abertaEm.slice(0, 10) <= estado.ate)
      && (!q || U.contem(os.numero, q) || (placaQ.length >= 2 && (L.veiculo(os.veiculoId) || { placa: "" }).placa.includes(placaQ)) || U.contem(C().nomeDoCliente(os.clienteId), q)));
  }
  const CHAVES = {
    abertaEm: (os) => os.abertaEm, numero: (os) => os.numero, previsao: (os) => os.previsao || "9999", total: (os) => O.totaisOS(os).total,
    cliente: (os) => C().nomeDoCliente(os.clienteId), status: (os) => NX.STATUS_OS.findIndex((s) => s.id === os.status),
  };

  function desenhar() {
    const d = L.dados;
    const fin = O.podeVer("financeiro");
    const base = d.ordens.filter((os) => (!estado.tecnico || os.tecnicoId === estado.tecnico));
    U.trocar(p.chips, C().chips(CHIPS.map((id) => ({ valor: id, rotulo: rotuloStatus(id), n: base.filter(filtroStatus(id)).length })), estado.status, (v) => { estado.status = v; estado.pagina = 1; atualizar(); }, { rotulo: "Situação", nome: "ordens-st" }));
    U.trocar(p.filtros, p.busca.caixa,
      C().seletor([{ valor: "", rotulo: "Todos os status" }, ...NX.STATUS_OS.map((s) => ({ valor: s.id, rotulo: s.nome }))], NX.STATUS_OS.some((s) => s.id === estado.status) ? estado.status : "", (v) => { estado.status = v || "todas"; estado.pagina = 1; atualizar(); }, { rotulo: "Status exato", foco: "ordens-status" }),
      C().seletor(C().opcoesTecnicos({ todos: "Todos os técnicos", incluirInativos: true }), estado.tecnico, (v) => { estado.tecnico = v; estado.pagina = 1; atualizar(); }, { rotulo: "Técnico", foco: "ordens-tecnico" }),
      el("label", { class: "filtro-data" }, "Abertas de", el("input", { type: "date", value: estado.de, "data-foco": "ordens-de", onchange: (e) => { estado.de = e.target.value; estado.pagina = 1; atualizar(); } })),
      el("label", { class: "filtro-data" }, "até", el("input", { type: "date", value: estado.ate, "data-foco": "ordens-ate", onchange: (e) => { estado.ate = e.target.value; estado.pagina = 1; atualizar(); } })),
      (estado.busca || estado.tecnico || estado.de || estado.ate || estado.status !== "andamento") ? el("button", { class: "link-btn", type: "button", "data-foco": "ordens-limpar", onclick: () => { Object.assign(estado, PADRAO()); p.busca.input.value = ""; atualizar(); } }, icone("x", 14), "Limpar filtros") : null);

    const todas = C().ordenar(lista(), estado, CHAVES);
    const { res, nav } = C().blocoPaginado(estado, todas, "ordens", atualizar);
    const agora = U.agora();
    const titulo = el("p", { class: "contagem", texto: `${U.plural(res.total, "ordem", "ordens")} · ${rotuloStatus(estado.status)}${estado.tecnico ? ` · ${C().nomeDoTecnico(estado.tecnico)}` : ""}${estado.de || estado.ate ? ` · abertas ${estado.de ? `de ${U.dataCompleta(estado.de)}` : ""} ${estado.ate ? `até ${U.dataCompleta(estado.ate)}` : ""}` : ""}` });
    if (!res.total) {
      U.trocar(p.tabela, titulo, C().vazio({ icone: "clipboard-list", titulo: "Nenhuma ordem encontrada", texto: estado.busca ? `Nada corresponde a "${estado.busca}" com estes filtros.` : "Não há ordens nesta situação.", acao: O.pode("os_abrir") ? C().botao("Nova OS", "btn--primario btn--pequeno", () => NX.form.novaOS(), "plus") : null }));
      return;
    }
    const th = (r, c, cl) => C().thOrdenavel(r, c, estado, atualizar, cl);
    U.trocar(p.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga tabela--clicavel" },
      el("caption", { class: "vh", texto: "Ordens de serviço" }),
      el("thead", {}, el("tr", {}, th("OS", "numero"), el("th", { scope: "col", texto: "Veículo" }), th("Cliente", "cliente"), th("Status", "status"), el("th", { scope: "col", texto: "Técnico" }), th("Aberta", "abertaEm"), th("Previsão", "previsao"), th("Total", "total", "num"), fin ? el("th", { scope: "col", texto: "Financeiro" }) : null)),
      el("tbody", {}, ...res.itens.map((os) => {
        const atrasada = os.previsao && O.ABERTAS.includes(os.status) && !O.PRONTAS.includes(os.status) && os.previsao < agora;
        return el("tr", { class: "linha-clicavel", tabindex: "0", "data-foco": `linha-os-${os.id}`, onclick: (e) => { if (!e.target.closest("a, button")) NX.ir(`ordens/${os.id}`); }, onkeydown: (e) => { if (e.key === "Enter") NX.ir(`ordens/${os.id}`); } },
          C().td("", el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero }), "principal-celula"),
          C().td("Veículo", C().nomeVeiculo(os.veiculoId, { link: false, sub: `${U.numero(os.kmEntrada)} km na entrada` })),
          C().td("Cliente", el("span", {}, C().nomeDoCliente(os.clienteId), " ", C().pilulaExemplo(os))),
          C().td("Status", C().pilulaOS(os.status, { curto: true })),
          C().td("Técnico", C().nomeTecnico(os.tecnicoId, { curto: true })),
          C().td("Aberta", el("span", { class: "nowrap", texto: U.dataHoraCurta(os.abertaEm) })),
          C().td("Previsão", os.previsao ? el("span", { class: `nowrap${atrasada ? " negativo" : ""}` }, atrasada ? icone("clock-alert", 13) : null, ` ${U.dataHoraCurta(os.previsao)}`) : el("span", { class: "suave", texto: "—" })),
          C().td("Total", el("b", { texto: U.moeda(O.totaisOS(os).total) }), "num"),
          fin ? C().td("Financeiro", C().pilulaFin(os)) : null);
      })))), nav);
  }

  function exportar() {
    const linhas = C().ordenar(lista(), estado, CHAVES).map((os) => {
      const v = L.veiculo(os.veiculoId) || {};
      const t = O.totaisOS(os);
      return [os.numero, U.dataHora(os.abertaEm), L.mostrarPlaca(v.placa || ""), `${v.marca || ""} ${v.modelo || ""}`, C().nomeDoCliente(os.clienteId), O.nomeStatus(os.status), C().nomeDoTecnico(os.tecnicoId), os.previsao ? U.dataHora(os.previsao) : "", t.maoDeObra, t.pecas, t.desconto, t.total, os.faturamento ? os.faturamento.valor : "", O.recebido(os), os.ficticio ? "sim" : "não"];
    });
    U.baixarCSV(U.nomeArquivo("ordens"), ["OS", "Aberta em", "Placa", "Veículo", "Cliente", "Status", "Técnico", "Previsão", "Serviços e mão de obra", "Peças", "Desconto", "Total", "Faturado", "Recebido", "Exemplo"], linhas);
  }

  function aoEntrar(params) {
    if (params.status) { estado.status = GRUPOS[params.status] || NX.STATUS_OS.some((s) => s.id === params.status) ? params.status : "andamento"; estado.pagina = 1; }
    if (params.de || params.ate) { estado.de = params.de || ""; estado.ate = params.ate || ""; estado.pagina = 1; }
    if (params.tecnico !== undefined) estado.tecnico = params.tecnico;
    if (params.busca !== undefined) { estado.busca = params.busca; if (p) p.busca.input.value = params.busca; }
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.ordens = { titulo: "Ordens de serviço", montar, atualizar, aoEntrar, reiniciar: () => Object.assign(estado, PADRAO()) };
})();
