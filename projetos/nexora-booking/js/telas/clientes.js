/* ==========================================================================
   NEXORA BOOKING — Telas: Clientes e ficha do cliente
   Histórico, número de atendimentos e última visita vêm das reservas
   reais. O telefone não se repete (evita cadastro duplicado) e só os dados
   necessários para o atendimento são pedidos.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const M = NX.metricas;
  const { el, icone } = U;
  const C = () => NX.componentes;

  const FILTROS = [["", "Todos"], ["futura", "Com reserva marcada"], ["sumidos", "Sem visita há 60+ dias"], ["novos", "Cadastrados nos últimos 30 dias"], ["sem", "Nunca atendidos"], ["repetidos", "Nomes repetidos"]];
  const estado = { busca: "", filtro: "", ordem: "nome", direcao: "asc", pagina: 1 };
  let p = null;

  function aoEntrar(params) {
    if (params.filtro !== undefined) estado.filtro = FILTROS.some(([f]) => f === params.filtro) ? params.filtro : "";
    if (params.q !== undefined) estado.busca = params.q;
  }
  function montar(secao) {
    const busca = C().campoBusca({ placeholder: "Nome, telefone ou e-mail", rotulo: "Buscar clientes", foco: "cli-busca", valor: estado.busca, aoMudar: (v) => { estado.busca = v; estado.pagina = 1; atualizar(); } });
    p = { busca, seletores: el("div", { style: { display: "contents" } }), corpo: el("div") };
    p.filtros = el("div", { class: "barra-filtros" }, busca.caixa, p.seletores);
    U.trocar(secao, 
      C().cabecalho({ id: "clientes", titulo: "Clientes", sub: "Cadastro mínimo: nome e telefone. O histórico vem das reservas.", acoes: [
        C().botao("Exportar CSV", "btn--linha", exportar, "download"),
        C().botao("Novo cliente", "btn--primario", () => NX.form.cliente({ aoCriar: (id) => NX.ir(`clientes/${id}`) }), "user-plus"),
      ] }),
      p.filtros, p.corpo);
  }

  function lista() {
    const resumo = M.resumoClientes();
    const q = estado.busca.trim();
    const dig = U.digitos(q);
    const hoje = U.hoje();
    const nomes = new Map();
    L.dados.clientes.forEach((c) => { const k = U.semAcento(c.nome).replace(/\s+/g, " ").trim(); nomes.set(k, (nomes.get(k) || 0) + 1); });
    return L.dados.clientes.map((c) => ({ c, r: resumo.get(c.id) || { atendimentos: 0, reservas: 0 } })).filter(({ c, r }) => {
      if (q && !(U.contem(c.nome, q) || U.contem(c.email, q) || (dig.length >= 3 && c.telefone.includes(dig)))) return false;
      if (estado.filtro === "futura") return !!r.proximo;
      if (estado.filtro === "sumidos") return r.ultimaVisita && U.diasEntre(r.ultimaVisita, hoje) >= 60 && !r.proximo;
      if (estado.filtro === "novos") return c.criadoEm.slice(0, 10) >= U.somarDias(hoje, -29);
      if (estado.filtro === "sem") return !r.atendimentos;
      if (estado.filtro === "repetidos") return nomes.get(U.semAcento(c.nome).replace(/\s+/g, " ").trim()) > 1;
      return true;
    });
  }
  function ordenar(itens) {
    const dir = estado.direcao === "asc" ? 1 : -1;
    const chave = { nome: (x) => U.semAcento(x.c.nome), atendimentos: (x) => x.r.atendimentos, ultima: (x) => x.r.ultimaVisita || "", proxima: (x) => (x.r.proximo ? x.r.proximo.data + x.r.proximo.inicio : "9999") }[estado.ordem];
    return [...itens].sort((a, b) => { const x = chave(a); const y = chave(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || a.c.nome.localeCompare(b.c.nome, "pt-BR"); });
  }

  function desenhar() {
    if (p.busca.input.value !== estado.busca && document.activeElement !== p.busca.input) p.busca.input.value = estado.busca;
    U.trocar(p.seletores, C().seletor(FILTROS.map(([v, t]) => ({ valor: v, rotulo: t })), estado.filtro, (v) => { estado.filtro = v; estado.pagina = 1; atualizar(); }, { rotulo: "Filtrar clientes", foco: "cli-filtro" }));
    const itens = ordenar(lista());
    if (!itens.length) {
      U.trocar(p.corpo, el("div", { class: "cartao" }, C().vazio({ icone: "users", titulo: estado.filtro === "repetidos" ? "Nenhum nome repetido" : "Nenhum cliente encontrado", texto: estado.filtro === "repetidos" ? "O telefone já não se repete; aqui aparecem cadastros com o mesmo nome para você conferir." : "Mude a busca ou o filtro.", acao: C().botao("Novo cliente", "btn--linha btn--pequeno", () => NX.form.cliente({ aoCriar: (id) => NX.ir(`clientes/${id}`) }), "user-plus") })));
      return;
    }
    const pag = C().paginar(itens, estado.pagina, NX.preferencias.porPagina);
    estado.pagina = pag.pagina;
    const tabela = el("table", { class: "tabela tabela--cartoes" },
      el("caption", { class: "vh", texto: "Clientes" }),
      el("thead", {}, el("tr", {},
        C().thOrdenavel("Cliente", "nome", estado, atualizar),
        el("th", { scope: "col", texto: "E-mail" }),
        C().thOrdenavel("Atendimentos", "atendimentos", estado, atualizar, "num"),
        C().thOrdenavel("Última visita", "ultima", estado, atualizar),
        C().thOrdenavel("Próxima reserva", "proxima", estado, atualizar),
        el("th", { scope: "col" }, el("span", { class: "vh", texto: "Ações" })))),
      el("tbody", {}, ...pag.itens.map(({ c, r }) => el("tr", {},
        C().td("", C().nomeCliente(c.id), "principal-celula"),
        C().td("E-mail", c.email ? el("span", { class: "celula-texto", texto: c.email }) : el("span", { class: "suave", texto: "—" })),
        C().td("Atendimentos", U.numero(r.atendimentos), "num"),
        C().td("Última visita", r.ultimaVisita ? el("span", {}, U.dataCompleta(r.ultimaVisita), el("span", { class: "sub", texto: U.relativo(r.ultimaVisita) })) : el("span", { class: "suave", texto: "—" })),
        C().td("Próxima reserva", r.proximo ? el("button", { class: "link-texto", type: "button", onclick: () => NX.reservas.detalhe(r.proximo.id), texto: `${U.dataCurta(r.proximo.data)} às ${r.proximo.inicio}` }) : el("span", { class: "suave", texto: "—" })),
        C().td("", el("span", {},
          el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": `Agendar para ${c.nome}`, title: "Novo agendamento", onclick: () => NX.reservas.novo({ clienteId: c.id }) }, icone("calendar-plus", 16)),
          el("button", { class: "icone-btn icone-btn--sutil", type: "button", "aria-label": `Editar ${c.nome}`, title: "Editar", onclick: () => NX.form.cliente({ id: c.id }) }, icone("pencil", 16)),
          el("a", { class: "icone-btn icone-btn--sutil", href: `#/clientes/${c.id}`, "aria-label": `Ficha de ${c.nome}`, title: "Abrir ficha" }, icone("chevron-right", 16))), "acoes-linha")))));
    U.trocar(p.corpo, el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: `${U.plural(itens.length, "cliente", "clientes")}` }),
      el("div", { class: "tabela-rolagem" }, tabela),
      C().paginacao(pag, { porPagina: NX.preferencias.porPagina, nome: "clientes", aoMudar: (n) => { estado.pagina = n; atualizar(); }, aoMudarTamanho: (n) => NX.salvarPreferencias({ porPagina: n }) })));
  }

  const atualizar = C().comFoco(desenhar);

  function exportar() {
    const itens = ordenar(lista());
    if (!itens.length) { U.aviso("Nada para exportar.", "info"); return; }
    U.baixarCSV(U.nomeArquivo("clientes"), ["Nome", "Telefone", "E-mail", "Atendimentos", "Última visita", "Próxima reserva", "Observações", "Cadastrado em"],
      itens.map(({ c, r }) => [c.nome, U.mascaraTelefone(c.telefone), c.email, r.atendimentos, r.ultimaVisita ? U.dataCompleta(r.ultimaVisita) : "", r.proximo ? `${U.dataCompleta(r.proximo.data)} ${r.proximo.inicio}` : "", c.observacoes, U.dataCompleta(c.criadoEm)]));
  }

  NX.telas.clientes = { titulo: "Clientes", montar, atualizar, aoEntrar };

  /* ======================================================================
     FICHA DO CLIENTE
     ====================================================================== */
  let atualId = null;
  let q = null;
  function abrir(id) { atualId = id; }
  function montarFicha(secao) { q = { secao }; }
  function atualizarFicha() {
    const c = L.cliente(atualId);
    const secao = q.secao;
    if (!c) {
      U.trocar(secao, C().cabecalho({ id: "cliente", titulo: "Cliente não encontrado", antes: C().voltar("clientes", "Clientes") }), el("div", { class: "cartao" }, C().vazio({ icone: "user-x", titulo: "Este cadastro não existe mais", texto: "Ele pode ter sido excluído ou os dados foram restaurados.", acao: el("a", { class: "btn btn--linha btn--pequeno", href: "#/clientes" }, "Ver clientes") })));
      return;
    }
    const h = M.cliente(c.id);
    const futuras = h.lista.filter((a) => ["pendente", "confirmado"].includes(a.status) && `${a.data}T${a.inicio}` > U.agora());
    const linhas = h.lista.map((a) => el("tr", { class: "linha-clicavel", tabindex: "0", "data-foco": `hist-${a.id}`, onclick: () => NX.reservas.detalhe(a.id), onkeydown: (e) => { if (e.key === "Enter") NX.reservas.detalhe(a.id); } },
      C().td("Quando", el("span", {}, el("b", { class: "hora", texto: a.inicio }), el("span", { class: "sub", texto: U.dataCompleta(a.data) }))),
      C().td("", el("span", {}, el("b", { texto: a.servicoNome }), el("span", { class: "sub", texto: a.codigo })), "principal-celula"),
      C().td("Profissional", C().nomeProf(a.profissionalId, { curto: true })),
      C().td("Valor", el("span", {}, U.moeda(a.preco), a.status === "concluido" ? el("span", { class: "sub", texto: a.pagamento ? "pago" : "a receber" }) : null), "num"),
      C().td("Status", C().pilulaStatus(a.status, { curto: true }))));
    U.trocar(secao, 
      C().cabecalho({ id: "cliente", titulo: c.nome, antes: C().voltar("clientes", "Clientes"), sub: `${U.mascaraTelefone(c.telefone)}${c.email ? ` · ${c.email}` : ""} · cliente desde ${U.dataCompleta(c.criadoEm)}`,
        etiquetas: [c.ficticio ? C().pilula("Cliente fictício (demonstração)", "neutra", "info") : null, c.origem === "pagina" ? C().pilula("Cadastrado pela página", "origem", "globe") : null].filter(Boolean),
        acoes: [
          h.lista.length ? null : C().botao("Excluir cadastro", "btn--perigo", excluir, "trash"),
          C().botao("Editar", "btn--linha", () => NX.form.cliente({ id: c.id }), "pencil"),
          C().botao("Novo agendamento", "btn--primario", () => NX.reservas.novo({ clienteId: c.id }), "calendar-plus"),
        ] }),
      el("div", { class: "detalhe-grade" },
        el("div", { class: "detalhe-grade__lado" },
          el("article", { class: "cartao" }, el("h2", { class: "cartao__titulo", texto: "Resumo" }),
            el("div", { class: "numeros" },
              el("div", {}, el("span", { texto: "Atendimentos" }), el("b", { texto: U.numero(h.atendimentos) })),
              el("div", {}, el("span", { texto: "Última visita" }), el("b", { texto: h.ultimaVisita ? U.dataCurta(h.ultimaVisita) : "—" })),
              el("div", {}, el("span", { texto: "Faltas" }), el("b", { texto: U.numero(h.faltas) })),
              el("div", {}, el("span", { texto: "Cancelamentos" }), el("b", { texto: U.numero(h.cancelamentos) })),
              el("div", {}, el("span", { texto: "Total pago (registrado)" }), el("b", { texto: U.moeda(h.totalPago) })),
              el("div", {}, el("span", { texto: "Reservas futuras" }), el("b", { texto: U.numero(futuras.length) })))),
          el("article", { class: "cartao" }, el("div", { class: "cartao__cabeca" }, el("h2", { class: "cartao__titulo", texto: "Observações" }), el("button", { class: "link-btn", type: "button", texto: "Editar", onclick: () => NX.form.cliente({ id: c.id }) })),
            el("p", { class: c.observacoes ? "" : "suave", texto: c.observacoes || "Nenhuma observação. Use para preferências ou alergias que o cliente informou." })),
          h.proximo ? el("article", { class: "cartao" }, el("h2", { class: "cartao__titulo", texto: "Próxima reserva" }), el("ul", { class: "reservas", style: { marginTop: "10px" } }, el("li", {}, C().linhaReserva(h.proximo, { mostrarData: true })))) : null),
        el("div", { class: "detalhe-grade__principal" },
          el("article", { class: "cartao cartao--tabela" },
            el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Histórico de reservas" }), el("p", { class: "cartao__sub", texto: `${U.plural(h.lista.length, "reserva", "reservas")}, da mais nova para a mais antiga` })),
              h.lista.length ? el("a", { class: "link-btn", href: `#/agendamentos?cliente=${c.id}&periodo=tudo&status=` }, "Ver na lista") : null),
            h.lista.length ? el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela tabela--cartoes" },
              el("thead", {}, el("tr", {}, ...["Quando", "Serviço", "Profissional", "Valor", "Status"].map((t, i) => el("th", { scope: "col", class: i === 3 ? "num" : "", texto: t })))),
              el("tbody", {}, ...linhas))) : C().vazio({ icone: "calendar", titulo: "Ainda sem reservas", texto: "Quando houver, o histórico aparece aqui." })))));
  }
  async function excluir() {
    const c = L.cliente(atualId);
    const ok = await U.confirmar({ titulo: `Excluir ${c.nome}?`, texto: "O cadastro é apagado deste navegador. Só é possível porque este cliente não tem nenhuma reserva.", rotulo: "Excluir", perigo: true });
    if (!ok) return;
    const r = L.removerCliente(c.id);
    if (r.ok) { U.aviso("Cadastro excluído."); NX.ir("clientes"); } else U.aviso(r.erro, "erro");
  }
  NX.telas.cliente = { titulo: "Cliente", montar: montarFicha, atualizar: atualizarFicha, abrir, tituloDinamico: () => (L.cliente(atualId) || {}).nome };
})();
