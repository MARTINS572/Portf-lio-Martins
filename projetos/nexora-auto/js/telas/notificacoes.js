/* ==========================================================================
   NEXORA AUTO — Tela: Notificações
   Duas partes: o que precisa de atenção agora (alertas calculados: estoque
   baixo, previsão próxima ou vencida, veículo pronto, orçamento aguardando)
   e o registro de atividade (nova OS, mudança de status...). As mensagens
   para o cliente são textos prontos: o sistema nunca envia nada sozinho.
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

  const PADRAO = () => ({ alerta: "", vistos: false, tipo: "", naoLidas: false, pagina: 1 });
  const estado = PADRAO();
  let p = null;
  const ICONES = { estoque: "package", previsao: "clock", pronto: "car-front", orcamento: "hourglass" };
  const NOMES = { previsao: "Previsões", pronto: "Prontos para retirada", orcamento: "Orçamentos aguardando", estoque: "Estoque baixo" };

  function montar(secao) {
    p = { alertasFiltro: el("div"), alertas: el("div"), notifFiltro: el("div", { class: "barra-filtros" }), notif: el("div", { class: "cartao cartao--tabela" }) };
    U.trocar(secao,
      C().cabecalho({ id: "notificacoes", titulo: "Notificações", sub: "Avisos internos do sistema. Nada é enviado automaticamente por WhatsApp, SMS ou e-mail: as mensagens para o cliente são textos prontos que você copia ou abre no WhatsApp.", acoes: [
        C().botao("Marcar tudo como lido", "btn--linha", () => {
          const ids = L.dados.notificacoes.filter((n) => !n.lida).map((n) => n.id);
          const chaves = alertasVisiveis().filter((a) => !a.visto).map((a) => a.chave);
          if (ids.length) O.marcarNotificacoesLidas(ids);
          if (chaves.length) O.marcarAlertasVistos(chaves);
          U.aviso(ids.length || chaves.length ? "Tudo marcado como lido." : "Não havia nada novo.", "info");
        }, "check-check"),
      ] }),
      el("h2", { class: "titulo-secao", texto: "Precisa de atenção agora" }), p.alertasFiltro, p.alertas,
      el("h2", { class: "titulo-secao", texto: "Atividade recente" }), p.notifFiltro, p.notif);
  }
  const alertasVisiveis = () => O.alertas().filter((a) => (a.tipo !== "estoque" || O.podeVer("estoque")) && (a.tipo !== "orcamento" || O.podeVer("orcamentos")));

  function acoesAlerta(a) {
    const b = [];
    const id = a.rota.split("/")[1];
    if (a.tipo === "pronto" && (O.podeVer("clientes") || O.pode("os_entregar"))) { const os = L.ordem(id); if (os) b.push(C().botao("Mensagem ao cliente", "btn--linha btn--pequeno", () => C().mensagemCliente({ titulo: "Veículo pronto para retirada", texto: O.mensagem("pronto", { os }), clienteId: os.clienteId }), "message-circle")); }
    if (a.tipo === "orcamento" && O.podeVer("clientes")) { const o = L.orcamento(id); if (o) b.push(C().botao("Mensagem ao cliente", "btn--linha btn--pequeno", () => C().mensagemCliente({ titulo: "Orçamento para aprovação", texto: O.mensagem("orcamento", { orc: o }), clienteId: o.clienteId }), "message-circle")); }
    if (a.tipo === "estoque" && O.pode("estoque_mov")) b.push(C().botao("Registrar entrada", "btn--linha btn--pequeno", () => NX.form.movimento("entrada", id), "arrow-down-to-line"));
    b.push(el("a", { class: "btn btn--fantasma btn--pequeno", href: `#/${a.rota}` }, "Abrir"));
    if (!a.visto) b.push(C().botao("Marcar como visto", "btn--fantasma btn--pequeno", () => O.marcarAlertasVistos([a.chave]), "check"));
    return b;
  }

  function desenhar() {
    const todos = alertasVisiveis();
    const tipos = [...new Set(todos.map((a) => a.tipo))];
    U.trocar(p.alertasFiltro, el("div", { class: "barra-filtros" },
      C().chips([{ valor: "", rotulo: "Todos", n: todos.filter((a) => estado.vistos || !a.visto).length }, ...tipos.map((t) => ({ valor: t, rotulo: NOMES[t], icone: ICONES[t], n: todos.filter((a) => a.tipo === t && (estado.vistos || !a.visto)).length }))], estado.alerta, (v) => { estado.alerta = v; atualizar(); }, { rotulo: "Tipo de alerta", nome: "alerta" }),
      el("label", { class: "caixa-marcar" }, el("input", { type: "checkbox", checked: estado.vistos || null, "data-foco": "alerta-vistos", onchange: (e) => { estado.vistos = e.target.checked; atualizar(); } }), el("span", { texto: "Mostrar os já vistos" }))));
    const alertas = todos.filter((a) => (!estado.alerta || a.tipo === estado.alerta) && (estado.vistos || !a.visto));
    U.trocar(p.alertas, el("div", { class: "cartao" }, alertas.length ? el("ul", { class: "notif-lista" }, ...alertas.map((a) => el("li", { class: `notif-item${a.visto ? "" : " is-nova"}` },
      el("span", { class: `notificacao__icone alerta-icone--${a.tipo}` }, icone(ICONES[a.tipo], 16)),
      el("span", { class: "notif-item__texto" }, el("b", {}, a.visto ? null : el("span", { class: "selo-novo", "aria-hidden": "true" }), a.titulo), el("span", { texto: a.texto })),
      el("span", { class: "notif-item__acoes" }, ...acoesAlerta(a))))) : C().vazio({ icone: "circle-check", titulo: "Nada precisa de atenção agora", texto: estado.vistos ? "" : "Os alertas já vistos ficam escondidos; marque a opção acima para vê-los." })));

    const n = L.dados.notificacoes;
    U.trocar(p.notifFiltro,
      C().seletor([{ valor: "", rotulo: "Todos os tipos" }, ...Object.entries(NX.TIPOS_NOTIFICACAO).map(([id, t]) => ({ valor: id, rotulo: t.nome }))], estado.tipo, (v) => { estado.tipo = v; estado.pagina = 1; atualizar(); }, { rotulo: "Tipo de notificação", foco: "notif-tipo" }),
      el("label", { class: "caixa-marcar" }, el("input", { type: "checkbox", checked: estado.naoLidas || null, "data-foco": "notif-naolidas", onchange: (e) => { estado.naoLidas = e.target.checked; estado.pagina = 1; atualizar(); } }), el("span", { texto: `Só não lidas (${n.filter((x) => !x.lida).length})` })));
    const lista = n.filter((x) => (!estado.tipo || x.tipo === estado.tipo) && (!estado.naoLidas || !x.lida));
    const { res, nav } = C().blocoPaginado(estado, lista, "notificacoes", atualizar);
    if (!res.total) { U.trocar(p.notif, C().vazio({ icone: "bell", titulo: "Nenhuma notificação", texto: "As notificações aparecem quando ordens são abertas, mudam de status ou orçamentos são enviados." })); return; }
    U.trocar(p.notif, el("p", { class: "contagem", texto: `${U.plural(res.total, "notificação", "notificações")} · as mais recentes primeiro (o sistema guarda as últimas 200)` }),
      el("ul", { class: "notif-lista" }, ...res.itens.map((x) => {
        const t = NX.TIPOS_NOTIFICACAO[x.tipo] || { nome: "Aviso", icone: "bell" };
        const os = x.osId ? L.ordem(x.osId) : null;
        const orc = x.orcId ? L.orcamento(x.orcId) : null;
        return el("li", { class: `notif-item${x.lida ? "" : " is-nova"}` },
          el("span", { class: `notificacao__icone notificacao--${x.tipo}` }, icone(t.icone, 16)),
          el("span", { class: "notif-item__texto" }, el("b", {}, x.lida ? null : el("span", { class: "selo-novo", "aria-hidden": "true" }), t.nome), el("span", { texto: x.texto }), el("small", { texto: U.dataHoraCurta(x.em) })),
          el("span", { class: "notif-item__acoes" },
            os ? el("a", { class: "btn btn--fantasma btn--pequeno", href: `#/ordens/${os.id}`, onclick: () => { if (!x.lida) O.marcarNotificacoesLidas([x.id]); } }, os.numero) : orc && O.podeVer("orcamentos") ? el("a", { class: "btn btn--fantasma btn--pequeno", href: `#/orcamentos/${orc.id}` }, O.rotuloOrc(orc)) : null,
            !x.lida ? C().botao("Marcar como lida", "btn--fantasma btn--pequeno", () => O.marcarNotificacoesLidas([x.id]), "check") : null));
      })), nav);
  }
  function aoEntrar(params) { if (params.tipo !== undefined) estado.alerta = params.tipo; }
  const atualizar = C().comFoco(desenhar);
  NX.telas.notificacoes = { titulo: "Notificações", montar, atualizar, aoEntrar, reiniciar: () => Object.assign(estado, PADRAO()) };
})();
