/* ==========================================================================
   NEXORA BOOKING — Tela: Notificações
   Avisos INTERNOS do sistema (nova reserva, confirmação, reagendamento,
   cancelamento) e lembretes dos atendimentos das próximas 3 horas.
   Nada é enviado sozinho: a mensagem para o cliente é preparada na ficha
   da reserva e a pessoa decide se abre o WhatsApp ou o e-mail.
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

  /* ---------- Texto de uma notificação (usado aqui e no sino do topo) ---------- */
  const TIPOS = {
    novo: { icone: "calendar-plus", titulo: (n) => (n.origem === "cliente" ? "Nova reserva pela página" : "Nova reserva") },
    confirmado: { icone: "circle-check", titulo: () => "Reserva confirmada" },
    reagendado: { icone: "calendar-sync", titulo: (n) => (n.origem === "cliente" ? "Cliente reagendou" : "Reserva reagendada") },
    cancelado: { icone: "circle-x", titulo: (n) => (n.origem === "cliente" ? "Cliente cancelou" : "Reserva cancelada") },
    lembrete: { icone: "alarm-clock", titulo: () => "Atendimento em breve" },
  };
  function descrever(n) {
    const a = L.agendamento(n.agendamentoId);
    const t = TIPOS[n.tipo] || TIPOS.novo;
    if (!a) return { icone: t.icone, titulo: t.titulo(n), texto: "Reserva não encontrada (dados restaurados)." };
    return { icone: t.icone, titulo: t.titulo(n), texto: `${C().nomeDoCliente(a.clienteId)} · ${a.servicoNome} · ${U.dataCurta(a.data)} às ${a.inicio} com ${C().nomeDoProf(a.profissionalId).split(" ")[0]}${n.tipo === "novo" && a.status === "pendente" ? " · aguardando confirmação" : ""}`, agendamento: a };
  }
  NX.notificacoes = { descrever, TIPOS };

  const FILTROS = [["", "Todas"], ["naolidas", "Não lidas"], ["novo", "Novas reservas"], ["confirmado", "Confirmações"], ["reagendado", "Reagendamentos"], ["cancelado", "Cancelamentos"]];
  const estado = { filtro: "", limite: 30 };
  let p = null;

  function montar(secao) {
    p = { lembretes: el("div"), chips: el("div", { class: "chips", role: "group", "aria-label": "Filtrar notificações" }), lista: el("div") };
    U.trocar(secao, 
      C().cabecalho({ id: "notificacoes", titulo: "Notificações", sub: "Avisos internos de reservas criadas, confirmadas, reagendadas e canceladas.", acoes: [C().botao("Marcar todas como lidas", "btn--linha", () => {
        const ids = L.dados.notificacoes.filter((n) => !n.lida).map((n) => n.id);
        if (!ids.length) { U.aviso("Todas já estão lidas.", "info"); return; }
        A.marcarLidas(ids);
        U.aviso(`${U.plural(ids.length, "notificação marcada", "notificações marcadas")} como lida.`);
      }, "check-check", { "data-foco": "notif-todas" })] }),
      el("p", { class: "nota-info", style: { marginBottom: "16px" } }, icone("info", 16), el("span", {}, el("b", { texto: "Nada é enviado automaticamente. " }), "Para avisar o cliente, abra a reserva: em \"Mensagem para o cliente\" o texto já vem pronto para copiar ou abrir no WhatsApp ou no e-mail. Os textos podem ser mudados em Configurações.")),
      p.lembretes, p.chips, p.lista);
  }

  function desenhar() {
    const d = L.dados;
    // Lembretes calculados (confirmadas que começam nas próximas 3 horas)
    const lembretes = A.lembretes();
    U.trocar(p.lembretes, el("article", { class: "cartao", style: { marginBottom: "16px" } },
      el("div", { class: "cartao__cabeca" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Lembretes das próximas 3 horas" }), el("p", { class: "cartao__sub", texto: "Atendimentos confirmados que começam em breve. Use para enviar o lembrete ao cliente." }))),
      lembretes.length ? el("ul", { class: "notif-lista" }, ...lembretes.map((a) => el("li", { class: "notif-item" },
        el("span", { class: "notificacao__icone notificacao--lembrete", style: { background: "var(--alerta-fundo)", color: "var(--alerta)" } }, icone("alarm-clock", 16)),
        el("span", { class: "notif-item__texto" }, el("b", { texto: `${a.inicio} · ${C().nomeDoCliente(a.clienteId)}` }), el("small", { texto: `${a.servicoNome} com ${C().nomeDoProf(a.profissionalId)} · começa em ${A.minutosAte(a) >= 60 ? `${Math.floor(A.minutosAte(a) / 60)} h ${A.minutosAte(a) % 60} min` : `${A.minutosAte(a)} min`}` })),
        el("span", { class: "notif-item__acoes" }, C().botao("Preparar lembrete", "btn--linha btn--pequeno", () => NX.reservas.detalhe(a.id), "message-circle"))))) : el("p", { class: "vazio-pequeno", texto: "Nenhum atendimento confirmado nas próximas 3 horas." })));

    const conta = (f) => d.notificacoes.filter((n) => passa(n, f)).length;
    U.trocar(p.chips, ...FILTROS.map(([f, t]) => el("button", { class: "chip", type: "button", "aria-pressed": String(estado.filtro === f), "data-foco": `nf-${f || "todas"}`, onclick: () => { estado.filtro = f; estado.limite = 30; atualizar(); } }, t, el("span", { class: "chip__n", texto: U.numero(conta(f)) }))));
    const lista = d.notificacoes.filter((n) => passa(n, estado.filtro));
    if (!lista.length) {
      U.trocar(p.lista, el("div", { class: "cartao" }, C().vazio({ icone: "bell-off", titulo: "Nenhuma notificação aqui", texto: "Quando uma reserva for criada, confirmada, reagendada ou cancelada, o aviso aparece nesta lista." })));
      return;
    }
    U.trocar(p.lista, el("div", { class: "cartao cartao--tabela" },
      el("p", { class: "contagem", texto: `${U.plural(lista.length, "notificação", "notificações")} · as mais recentes primeiro` }),
      el("ul", { class: "notif-lista" }, ...lista.slice(0, estado.limite).map((n) => {
        const x = descrever(n);
        return el("li", { class: `notif-item${n.lida ? "" : " is-nova"}` },
          el("span", { class: `notificacao--${n.tipo}`, style: { display: "contents" } }, el("span", { class: "notificacao__icone" }, icone(x.icone, 16))),
          el("span", { class: "notif-item__texto" }, el("b", {}, n.lida ? null : el("span", { class: "selo-novo", "aria-hidden": "true" }), x.titulo, n.lida ? null : el("span", { class: "vh", texto: " (não lida)" })), el("span", { texto: x.texto }), el("small", { texto: `${U.dataHoraCurta(n.em)} · ${n.origem === "cliente" ? "feito pelo cliente na página" : "feito pela equipe"}` })),
          el("span", { class: "notif-item__acoes" },
            x.agendamento ? C().botao("Abrir reserva", "btn--linha btn--pequeno", () => { if (!n.lida) A.marcarLidas([n.id]); NX.reservas.detalhe(n.agendamentoId); }, "panel-right-open", { "data-foco": `nf-abrir-${n.id}` }) : null,
            n.lida ? null : C().botao("Marcar como lida", "btn--fantasma btn--pequeno", () => A.marcarLidas([n.id]), "check", { "data-foco": `nf-lida-${n.id}` })));
      })),
      lista.length > estado.limite ? el("div", { class: "paginacao" }, el("span", { texto: `Mostrando ${estado.limite} de ${lista.length}` }), C().botao("Mostrar mais", "btn--linha btn--pequeno", () => { estado.limite += 30; atualizar(); }, "chevron-down", { "data-foco": "nf-mais" })) : null));
  }
  function passa(n, f) {
    if (!f) return true;
    if (f === "naolidas") return !n.lida;
    return n.tipo === f;
  }
  const atualizar = C().comFoco(desenhar);

  NX.telas.notificacoes = { titulo: "Notificações", montar, atualizar };
})();
