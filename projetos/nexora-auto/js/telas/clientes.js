/* ==========================================================================
   NEXORA AUTO — Telas: Clientes (lista) e Cliente (ficha)
   A ficha junta veículos, ordens de serviço, orçamentos e o resumo do que
   foi faturado e recebido. Telefone e documento não se repetem.
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

  const PADRAO = () => ({ busca: "", tipo: "", pagina: 1, ordem: "nome", direcao: "asc" });
  const estado = PADRAO();
  let p = null;
  const ordensDe = (cid) => L.dados.ordens.filter((os) => os.clienteId === cid);
  const ultimaVisita = (cid) => ordensDe(cid).reduce((m, os) => (os.abertaEm > m ? os.abertaEm : m), "");

  function montarLista(secao) {
    const busca = C().campoBusca({ placeholder: "Nome, telefone, e-mail ou documento", rotulo: "Buscar clientes", foco: "cli-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizarLista(); } });
    p = { busca, filtros: el("div", { class: "barra-filtros" }), tabela: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "clientes", titulo: "Clientes", sub: "Pessoas e empresas atendidas, com seus veículos e o histórico de serviços.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botaoSe("cadastros", "Novo cliente", "btn--primario", () => NX.form.cliente(null), "user-plus"),
      ] }),
      p.filtros, p.tabela);
  }
  function filtrados() {
    const q = estado.busca.trim();
    const dig = U.digitos(q);
    return L.dados.clientes.filter((c) => (!estado.tipo || c.tipo === estado.tipo)
      && (!q || U.contem(c.nome, q) || (dig.length >= 3 && (c.telefone.includes(dig) || (c.documento || "").includes(dig))) || U.contem(c.email, q)));
  }
  const CHAVES = { nome: (c) => c.nome, veiculos: (c) => L.veiculosDoCliente(c.id).length, ordens: (c) => ordensDe(c.id).length, ultima: (c) => ultimaVisita(c.id) };
  function desenharLista() {
    const fin = O.podeVer("financeiro");
    U.trocar(p.filtros, p.busca.caixa, C().seletor([{ valor: "", rotulo: "Pessoas e empresas" }, { valor: "pf", rotulo: "Pessoas físicas" }, { valor: "pj", rotulo: "Empresas" }], estado.tipo, (v) => { estado.tipo = v; estado.pagina = 1; atualizarLista(); }, { rotulo: "Tipo de cliente", foco: "cli-tipo" }));
    const lista = C().ordenar(filtrados(), estado, CHAVES);
    const { res, nav } = C().blocoPaginado(estado, lista, "clientes", atualizarLista);
    const titulo = el("p", { class: "contagem", texto: U.plural(res.total, "cliente", "clientes") });
    if (!res.total) { U.trocar(p.tabela, titulo, C().vazio({ icone: "users", titulo: "Nenhum cliente encontrado", texto: estado.busca ? `Nada corresponde a "${estado.busca}".` : "Cadastre o primeiro cliente.", acao: O.pode("cadastros") ? C().botao("Novo cliente", "btn--primario btn--pequeno", () => NX.form.cliente(null), "user-plus") : null })); return; }
    const th = (r, c, cl) => C().thOrdenavel(r, c, estado, atualizarLista, cl);
    U.trocar(p.tabela, titulo, el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--larga tabela--clicavel" },
      el("caption", { class: "vh", texto: "Clientes" }),
      el("thead", {}, el("tr", {}, th("Cliente", "nome"), el("th", { scope: "col", texto: "Telefone" }), el("th", { scope: "col", texto: "E-mail" }), th("Veículos", "veiculos", "num"), th("Ordens", "ordens", "num"), th("Última visita", "ultima"), fin ? el("th", { scope: "col", class: "num", texto: "A receber" }) : null)),
      el("tbody", {}, ...res.itens.map((c) => {
        const ult = ultimaVisita(c.id);
        const aberto = ordensDe(c.id).reduce((t, os) => t + O.aReceber(os), 0);
        return el("tr", { class: "linha-clicavel", tabindex: "0", "data-foco": `linha-cli-${c.id}`, onclick: (e) => { if (!e.target.closest("a, button")) NX.ir(`clientes/${c.id}`); }, onkeydown: (e) => { if (e.key === "Enter") NX.ir(`clientes/${c.id}`); } },
          C().td("", el("span", { class: "nome-btn" }, el("span", { class: "avatar-cli", "aria-hidden": "true", texto: U.iniciais(c.nome) }), el("span", {}, el("a", { class: "link-texto", href: `#/clientes/${c.id}` }, el("b", { texto: c.nome })), el("span", { class: "suave" }, c.tipo === "pj" ? "Empresa" : "Pessoa física", " ", C().pilulaExemplo(c)))), "principal-celula"),
          C().td("Telefone", el("span", { class: "nowrap", texto: U.mascaraTelefone(c.telefone) })),
          C().td("E-mail", c.email || el("span", { class: "suave", texto: "—" })),
          C().td("Veículos", U.numero(L.veiculosDoCliente(c.id).length), "num"),
          C().td("Ordens", U.numero(ordensDe(c.id).length), "num"),
          C().td("Última visita", ult ? U.dataCompleta(ult) : el("span", { class: "suave", texto: "Nunca" })),
          fin ? C().td("A receber", aberto > 0 ? el("b", { class: "texto-alerta", texto: U.moeda(aberto) }) : el("span", { class: "suave", texto: "—" }), "num") : null);
      })))), nav);
  }
  function exportar() {
    const linhas = C().ordenar(filtrados(), estado, CHAVES).map((c) => [c.nome, c.tipo === "pj" ? "Empresa" : "Pessoa física", U.mascaraTelefone(c.telefone), c.email, c.documento ? L.mostrarDocumento(c.documento) : "", c.endereco, L.veiculosDoCliente(c.id).map((v) => L.mostrarPlaca(v.placa)).join(", "), ordensDe(c.id).length, ultimaVisita(c.id) ? U.dataCompleta(ultimaVisita(c.id)) : "", c.ficticio ? "sim" : "não"]);
    U.baixarCSV(U.nomeArquivo("clientes"), ["Nome", "Tipo", "Telefone", "E-mail", "CPF/CNPJ", "Endereço", "Placas", "Ordens", "Última visita", "Exemplo"], linhas);
  }
  const atualizarLista = C().comFoco(desenharLista);
  NX.telas.clientes = { titulo: "Clientes", montar: montarLista, atualizar: atualizarLista, reiniciar: () => Object.assign(estado, PADRAO()) };

  /* ---------- Ficha ---------- */
  let cliId = null;
  let secao = null;
  function desenharFicha() {
    const c = L.cliente(cliId);
    if (!c) { U.trocar(secao, C().cabecalho({ id: "cliente", titulo: "Cliente não encontrado", antes: C().voltar("clientes", "Clientes") }), C().vazio({ icone: "search-x", titulo: "Este cliente não existe" })); return; }
    const fin = O.podeVer("financeiro");
    const ordens = ordensDe(c.id).sort((a, b) => b.abertaEm.localeCompare(a.abertaEm));
    const orcs = L.dados.orcamentos.filter((o) => o.clienteId === c.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const veiculos = L.veiculosDoCliente(c.id);
    const faturado = ordens.filter((os) => os.faturamento).reduce((t, os) => t + os.faturamento.valor, 0);
    const recebido = ordens.reduce((t, os) => t + O.recebido(os), 0);
    const aReceber = ordens.reduce((t, os) => t + O.aReceber(os), 0);
    const linha = (k, v) => (v ? el("div", { class: "ficha__linha" }, el("dt", { texto: k }), el("dd", {}, v)) : null);
    U.trocar(secao,
      C().cabecalho({
        id: "cliente", titulo: c.nome, antes: C().voltar("clientes", "Clientes"), sub: `${c.tipo === "pj" ? "Empresa" : "Pessoa física"} · cliente desde ${U.dataCompleta(c.criadoEm)}`,
        etiquetas: [C().pilulaExemplo(c)],
        acoes: [
          C().botaoSe("cadastros", "Editar", "btn--linha", () => NX.form.cliente(c.id), "pencil"),
          C().botaoSe("cadastros", "Novo veículo", "btn--linha", () => NX.form.veiculo(null, { clienteId: c.id }), "car"),
          C().botaoSe("orc_criar", "Novo orçamento", "btn--linha", () => NX.form.editorOrcamento(null, { clienteId: c.id }), "file-plus"),
          C().botaoSe("os_abrir", "Nova OS", "btn--primario", () => NX.form.novaOS({ clienteId: c.id }), "plus"),
          C().botaoSe("cadastros", "Excluir", "btn--perigo", () => NX.form.excluirCliente(c.id), "trash"),
        ],
      }),
      el("div", { class: "detalhe-grade" },
        el("div", { class: "detalhe-grade__lado" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Contato" }),
            el("dl", { class: "ficha ficha--coluna" },
              linha("Telefone / WhatsApp", U.mascaraTelefone(c.telefone)), linha("E-mail", c.email), linha(c.tipo === "pj" ? "CNPJ" : "CPF", c.documento ? L.mostrarDocumento(c.documento) : ""),
              linha("Endereço", c.endereco), linha("Observações", c.observacoes)),
            c.ficticio ? el("p", { class: "campo__ajuda", texto: "Cliente de exemplo: telefone e e-mail são fictícios, por isso o sistema não abre o WhatsApp para ele." }) : null),
          fin ? el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: "Resumo financeiro" }),
            el("div", { class: "numeros" },
              el("div", {}, el("span", { texto: "Ordens" }), el("b", { texto: U.numero(ordens.length) })),
              el("div", {}, el("span", { texto: "Faturado" }), el("b", { texto: U.moeda(faturado) })),
              el("div", {}, el("span", { texto: "Recebido" }), el("b", { texto: U.moeda(recebido) })),
              el("div", {}, el("span", { texto: "A receber" }), el("b", { class: aReceber > 0 ? "texto-alerta" : "", texto: U.moeda(aReceber) })))) : null),
        el("div", { class: "detalhe-grade__principal" },
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: `Veículos (${veiculos.length})` }),
            veiculos.length ? el("ul", { class: "lista-simples" }, ...veiculos.map((v) => {
              const aberta = O.osAbertaDoVeiculo(v.id);
              return el("li", {}, el("span", { class: "alerta-icone" }, icone("car", 16)), el("span", { class: "lista-simples__texto" }, C().nomeVeiculo(v.id, { sub: [`${U.numero(v.km)} km`, v.combustivel, v.tipo || null].filter(Boolean).join(" · ") })),
                el("span", { class: "lista-simples__fim" }, aberta ? el("a", { href: `#/ordens/${aberta.id}` }, C().pilulaOS(aberta.status, { curto: true })) : el("span", { class: "suave", texto: "Sem OS aberta" })));
            })) : C().vazio({ icone: "car", titulo: "Nenhum veículo", acao: O.pode("cadastros") ? C().botao("Cadastrar veículo", "btn--primario btn--pequeno", () => NX.form.veiculo(null, { clienteId: c.id }), "car") : null })),
          el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: `Ordens de serviço (${ordens.length})` }),
            ordens.length ? el("div", { class: "lista-os" }, ...ordens.map((os) => C().linhaOS(os, { mostrarCliente: false }))) : el("p", { class: "vazio-pequeno", texto: "Nenhuma ordem ainda." })),
          O.podeVer("orcamentos") ? el("section", { class: "cartao" },
            el("h2", { class: "cartao__titulo cartao__titulo--espaco", texto: `Orçamentos (${orcs.length})` }),
            orcs.length ? el("ul", { class: "lista-simples" }, ...orcs.map((o) => el("li", {},
              el("span", { class: "alerta-icone" }, icone("file-text", 16)),
              el("span", { class: "lista-simples__texto" }, el("a", { class: "link-texto", href: `#/orcamentos/${o.id}`, texto: O.rotuloOrc(o) }), el("span", { class: "suave", texto: `${C().textoVeiculo(o.veiculoId)} · ${U.dataCompleta(o.emitidoEm)}` })),
              el("span", { class: "lista-simples__fim" }, el("b", { texto: U.moeda(O.totaisOrc(o).total) }), C().pilulaOrc(o))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum orçamento." })) : null)));
  }
  NX.telas.cliente = {
    titulo: "Cliente",
    tituloDinamico: () => (L.cliente(cliId) || { nome: "Cliente" }).nome,
    abrir(id) { cliId = id; }, montar(s) { secao = s; }, atualizar: C().comFoco(desenharFicha),
  };
})();
