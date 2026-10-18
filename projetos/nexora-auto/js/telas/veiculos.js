/* ==========================================================================
   NEXORA AUTO — Telas: Veículos (lista) e Veículo (ficha)
   Busca por placa ou cliente, histórico de manutenção, histórico de
   quilometragem (leituras menores ficam marcadas e justificadas) e de
   responsáveis. A placa identifica o carro, mas não prova quem é o dono.
   Nenhuma consulta a bases oficiais é feita.
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

  const PADRAO = () => ({ busca: "", combustivel: "", tipo: "", pagina: 1, ordem: "placa", direcao: "asc" });
  const estado = PADRAO();
  let p = null;
  const ordensDo = (vid) => L.dados.ordens.filter((os) => os.veiculoId === vid);
  const ultimaOS = (vid) => ordensDo(vid).filter((os) => os.status !== "cancelada").sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))[0] || null;
  const ultimoServico = (vid) => ordensDo(vid).filter((os) => os.finalizadaEm).sort((a, b) => b.finalizadaEm.localeCompare(a.finalizadaEm))[0] || null;
  const resumoItens = (os) => os.itens.filter((i) => i.tipo !== "peca").map((i) => i.descricao.replace(/^S-\d+ · /, "")).join(", ") || "—";

  function montarLista(secao) {
    const busca = C().campoBusca({ placeholder: "Placa, modelo ou cliente", rotulo: "Buscar veículos", foco: "vei-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizarLista(); } });
    p = { busca, filtros: el("div", { class: "barra-filtros" }), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "veiculos", titulo: "Veículos", sub: "Cada veículo tem o histórico de manutenção e de quilometragem. A placa identifica o carro, mas não comprova quem é o dono.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botaoSe("cadastros", "Novo veículo", "btn--primario", () => NX.form.veiculo(null), "plus"),
      ] }),
      p.filtros, p.tabela);
  }
  function filtrados() {
    const q = estado.busca.trim();
    const placaQ = L.limparPlaca(q);
    return L.dados.veiculos.filter((v) => (!estado.combustivel || v.combustivel === estado.combustivel) && (!estado.tipo || (estado.tipo === "-" ? !v.tipo : v.tipo === estado.tipo))
      && (!q || (placaQ.length >= 2 && v.placa.includes(placaQ)) || U.contem(`${v.marca} ${v.modelo}`, q) || U.contem(C().nomeDoCliente(v.clienteId), q)));
  }
  const CHAVES = { placa: (v) => v.placa, km: (v) => v.km, cliente: (v) => C().nomeDoCliente(v.clienteId), ultima: (v) => (ultimaOS(v.id) || { abertaEm: "" }).abertaEm };
  function desenharLista() {
    U.trocar(p.filtros, p.busca.caixa, C().seletor([{ valor: "", rotulo: "Todos os combustíveis" }, ...NX.COMBUSTIVEIS.map((x) => ({ valor: x, rotulo: x }))], estado.combustivel, (v) => { estado.combustivel = v; estado.pagina = 1; atualizarLista(); }, { rotulo: "Combustível", foco: "vei-comb" }),
      C().seletor([{ valor: "", rotulo: "Todos os tipos" }, ...NX.TIPOS_VEICULO.map((x) => ({ valor: x, rotulo: x })), ...(L.dados.veiculos.some((v) => !v.tipo) ? [{ valor: "-", rotulo: "Tipo não informado" }] : [])], estado.tipo, (v) => { estado.tipo = v; estado.pagina = 1; atualizarLista(); }, { rotulo: "Tipo de veículo", foco: "vei-tipo" }));
    const lista = C().ordenar(filtrados(), estado, CHAVES);
    const { res, nav } = C().blocoPaginado(estado, lista, "veiculos", atualizarLista);
    const titulo = el("p", { class: "contagem", texto: U.plural(res.total, "veículo", "veículos") });
    if (!res.total) { U.trocar(p.tabela, titulo, C().vazio({ icone: "car", titulo: "Nenhum veículo encontrado", texto: estado.busca ? `Nada corresponde a "${estado.busca}".` : "Cadastre o primeiro veículo." })); return; }
    const th = (r, c, cl) => C().thOrdenavel(r, c, estado, atualizarLista, cl);
    U.trocar(p.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga tabela--clicavel" },
      el("caption", { class: "vh", texto: "Veículos" }),
      el("thead", {}, el("tr", {}, th("Veículo", "placa"), th("Cliente", "cliente"), th("Km atual", "km", "num"), th("Última visita", "ultima"), el("th", { scope: "col", texto: "Último serviço" }), el("th", { scope: "col", texto: "Na oficina" }))),
      el("tbody", {}, ...res.itens.map((v) => {
        const ult = ultimaOS(v.id);
        const serv = ultimoServico(v.id);
        const aberta = O.osAbertaDoVeiculo(v.id);
        return el("tr", { class: "linha-clicavel", tabindex: "0", "data-foco": `linha-vei-${v.id}`, onclick: (e) => { if (!e.target.closest("a, button")) NX.ir(`veiculos/${v.id}`); }, onkeydown: (e) => { if (e.key === "Enter") NX.ir(`veiculos/${v.id}`); } },
          C().td("", el("span", { class: "veiculo-celula" }, C().nomeVeiculo(v.id, { sub: `${v.tipo || "Tipo não informado"} · ${v.anoFab}/${v.anoModelo} · ${v.cor || "cor não informada"}` }), C().pilulaExemplo(v)), "principal-celula"),
          C().td("Cliente", C().nomeDoCliente(v.clienteId)),
          C().td("Km atual", el("span", { class: "nowrap", texto: `${U.numero(v.km)} km` }), "num"),
          C().td("Última visita", ult ? U.dataCompleta(ult.abertaEm) : el("span", { class: "suave", texto: "Nunca" })),
          C().td("Último serviço", serv ? el("span", { class: "celula-texto", title: resumoItens(serv), texto: `${U.dataCurta(serv.finalizadaEm)} · ${resumoItens(serv)}` }) : el("span", { class: "suave", texto: "—" })),
          C().td("Na oficina", aberta ? el("a", { href: `#/ordens/${aberta.id}` }, C().pilulaOS(aberta.status, { curto: true })) : el("span", { class: "suave", texto: "Não" })));
      })))), nav);
  }
  function exportar() {
    const linhas = C().ordenar(filtrados(), estado, CHAVES).map((v) => { const s = ultimoServico(v.id); return [L.mostrarPlaca(v.placa), v.marca, v.modelo, v.tipo || "", v.anoFab, v.anoModelo, v.cor, v.combustivel, v.km, C().nomeDoCliente(v.clienteId), ordensDo(v.id).length, s ? U.dataCompleta(s.finalizadaEm) : "", s ? resumoItens(s) : "", v.ficticio ? "sim" : "não"]; });
    U.baixarCSV(U.nomeArquivo("veiculos"), ["Placa", "Marca", "Modelo", "Tipo", "Ano fab.", "Ano-modelo", "Cor", "Combustível", "Km", "Cliente", "Ordens", "Último serviço", "Serviços", "Exemplo"], linhas);
  }
  const atualizarLista = C().comFoco(desenharLista);
  NX.telas.veiculos = { titulo: "Veículos", montar: montarLista, atualizar: atualizarLista, reiniciar: () => Object.assign(estado, PADRAO()) };

  /* ---------- Ficha ---------- */
  let veiId = null;
  let secao = null;
  function desenharFicha() {
    const v = L.veiculo(veiId);
    if (!v) { U.trocar(secao, C().cabecalho({ id: "veiculo", titulo: "Veículo não encontrado", antes: C().voltar("veiculos", "Veículos") }), C().vazio({ icone: "search-x", titulo: "Este veículo não existe" })); return; }
    const ordens = ordensDo(v.id).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm));
    const aberta = O.osAbertaDoVeiculo(v.id);
    const serv = ultimoServico(v.id);
    const fin = O.podeVer("financeiro") || O.podeVer("orcamentos");
    const linha = (k, val) => el("div", { class: "ficha__linha" }, el("dt", { texto: k }), el("dd", {}, val));
    const inconsistentes = v.historicoKm.filter((h) => h.inconsistente).length;
    U.trocar(secao,
      C().cabecalho({
        id: "veiculo", titulo: `${v.marca} ${v.modelo}`, antes: C().voltar("veiculos", "Veículos"), sub: `${v.tipo || "Tipo não informado"} · ${v.anoFab}/${v.anoModelo} · ${v.cor || "cor não informada"} · ${v.combustivel}`,
        etiquetas: [C().placa(v.placa), aberta ? el("a", { href: `#/ordens/${aberta.id}`, class: "pilula pilula--neutra" }, icone("clipboard-list", 13), `${aberta.numero} · ${O.nomeStatus(aberta.status)}`) : null, C().pilulaExemplo(v)],
        acoes: [
          C().botaoSe("cadastros", "Editar", "btn--linha", () => NX.form.veiculo(v.id), "pencil"),
          C().botaoSe("orc_criar", "Novo orçamento", "btn--linha", () => NX.form.editorOrcamento(null, { clienteId: v.clienteId, veiculoId: v.id }), "file-plus"),
          !aberta ? C().botaoSe("os_abrir", "Nova OS", "btn--primario", () => NX.form.novaOS({ veiculoId: v.id }), "plus") : null,
          C().botaoSe("cadastros", "Excluir", "btn--perigo", () => NX.form.excluirVeiculo(v.id), "trash"),
        ],
      }),
      el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("info", 16), el("span", { texto: "A placa identifica o veículo, mas não comprova quem é o dono. Os dados vêm do que foi informado na oficina: nenhuma consulta a órgãos oficiais é feita." })),
      el("div", { class: "detalhe-grade" },
        el("div", { class: "detalhe-grade__lado" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Dados do veículo" }),
            el("div", { class: "pilha" }, C().nomeCliente(v.clienteId)),
            el("dl", { class: "ficha ficha--coluna" },
              linha("Tipo", v.tipo || "Não informado (edite o cadastro para escolher)"),
              linha("Quilometragem atual", `${U.numero(v.km)} km`),
              linha("Último serviço", serv ? `${U.dataCompleta(serv.finalizadaEm)} · ${resumoItens(serv)}` : "Nenhum serviço finalizado"),
              linha("Visitas", U.plural(ordens.filter((os) => os.status !== "cancelada").length, "ordem de serviço", "ordens de serviço")),
              v.observacoes ? linha("Observações", v.observacoes) : null)),
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Responsáveis" }),
            el("p", { class: "cartao__sub", texto: "Quem foi informado como responsável pelo veículo, e desde quando." }),
            el("ul", { class: "lista-itens" }, ...[...v.historicoDono].reverse().map((h) => el("li", {},
              el("span", { class: "lista-itens__texto" }, el("b", { texto: C().nomeDoCliente(h.clienteId) }), el("small", { texto: `${U.dataCompleta(h.de)} ${h.ate ? `a ${U.dataCompleta(h.ate)}` : "até hoje"} · registrado por ${h.por}` }))))))),
        el("div", { class: "detalhe-grade__principal" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Histórico de manutenção" }),
            ordens.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
              el("caption", { class: "vh", texto: "Ordens deste veículo" }),
              el("thead", {}, el("tr", {}, ...["OS", "Data", "Km", "Serviços", fin ? "Total" : null, "Status"].filter(Boolean).map((c) => el("th", { scope: "col", class: c === "Total" || c === "Km" ? "num" : "", texto: c })))),
              el("tbody", {}, ...ordens.map((os) => el("tr", {},
                C().td("", el("a", { class: "link-texto mono", href: `#/ordens/${os.id}`, texto: os.numero }), "principal-celula"),
                C().td("Data", U.dataCompleta(os.abertaEm)),
                C().td("Km", `${U.numero(os.kmEntrada)}`, "num"),
                C().td("Serviços", el("span", { class: "celula-texto", title: resumoItens(os), texto: resumoItens(os) }), "inteira"),
                fin ? C().td("Total", U.moeda(O.totaisOS(os).total), "num") : null,
                C().td("Status", C().pilulaOS(os.status, { curto: true }))))))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma ordem de serviço para este veículo." })),
          el("section", { class: "cartao" },
            el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Histórico de quilometragem" }), el("p", { class: "cartao__sub", texto: inconsistentes ? `${U.plural(inconsistentes, "leitura menor que a anterior", "leituras menores que a anterior")}, com o motivo registrado.` : "Sempre crescente até aqui." }))),
            el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
              el("caption", { class: "vh", texto: "Leituras de quilometragem" }),
              el("thead", {}, el("tr", {}, ...["Data", "Km", "Origem", "Por"].map((c) => el("th", { scope: "col", class: c === "Km" ? "num" : "", texto: c })))),
              el("tbody", {}, ...[...v.historicoKm].reverse().map((h) => el("tr", { class: h.inconsistente ? "is-alerta" : "" },
                C().td("Data", U.dataHora(h.em)),
                C().td("Km", el("span", {}, el("b", { texto: U.numero(h.km) }), h.inconsistente ? el("small", { class: "sub texto-alerta" }, icone("triangle-alert", 12), " menor que a anterior") : null), "num"),
                C().td("Origem", el("span", {}, h.origem, h.nota ? el("small", { class: "sub", texto: `Motivo: ${h.nota}` }) : null)),
                C().td("Por", h.por))))))))));
  }
  NX.telas.veiculo = {
    titulo: "Veículo",
    tituloDinamico: () => { const v = L.veiculo(veiId); return v ? `${L.mostrarPlaca(v.placa)} · ${v.modelo}` : "Veículo"; },
    abrir(id) { veiId = id; }, montar(s) { secao = s; }, atualizar: C().comFoco(desenharFicha),
  };
})();
