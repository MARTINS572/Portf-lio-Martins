/* ==========================================================================
   VIOLET STUDIO — site.js
   Monta as partes da página que vêm dos dados (serviços, galeria, equipe,
   depoimentos, contato e horários) e liga o agendamento.

   FOTOS: troque usarFotos para true e coloque os arquivos em
   assets/images/violet-studio/ (nomes em assets/images/LEIA-ME.md).
   Se algum arquivo faltar, a ilustração continua no lugar.
   ========================================================================== */
(function () {
  "use strict";
  const usarFotos = false;
  const PASTA_FOTOS = "../../assets/images/violet-studio/";

  const U = AE.util;
  const M = AE.motor;
  const { el, icone, trocar } = U;
  const loja = AE.loja.criar({ chave: VIOLET.CHAVE, semente: VIOLET.semente });
  loja.carregar();
  const d = () => loja.dados;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // Coloca a foto por cima da ilustração (só onde ainda não tem); se o arquivo não existir, a ilustração fica
  function fotos(raiz = document) {
    if (!usarFotos) return;
    $$("[data-foto]", raiz).forEach((area) => {
      if (area.querySelector(".foto-real")) return;
      const img = new Image();
      img.alt = area.dataset.alt || "";
      img.className = "foto-real";
      img.loading = area.hasAttribute("data-foto-prioridade") ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("load", () => area.classList.add("tem-foto"));
      img.addEventListener("error", () => { img.remove(); console.warn(`Foto não encontrada: ${PASTA_FOTOS}${area.dataset.foto}`); });
      img.src = PASTA_FOTOS + area.dataset.foto;
      area.append(img);
    });
  }

  /* ---------- Tema padrão escolhido no painel (só vale se a visitante não escolheu) ---------- */
  const temaPadrao = d().negocio.temaPadrao;
  if (!Comum.preferenciaTema() && (temaPadrao === "claro" || temaPadrao === "escuro")) document.documentElement.setAttribute("data-theme", temaPadrao === "claro" ? "light" : "dark");

  /* ---------- Nome e logotipo (um só lugar: dados/painel) ---------- */
  function marca() {
    const n = d().negocio;
    $$("[data-negocio]").forEach((x) => { const v = n[x.dataset.negocio]; if (v) x.textContent = v; });
    const link = $("[data-marca]");
    link.setAttribute("aria-label", `${n.nome}, voltar ao início`);
    const img = $(".marca__logo", link);
    if (n.logo) {
      if (img) img.src = n.logo;
      else link.prepend(el("img", { class: "marca__logo", src: n.logo, alt: "" }));
      link.classList.add("tem-logo");
    } else {
      if (img) img.remove();
      link.classList.remove("tem-logo");
    }
    if (n.nome !== "VIOLET STUDIO") document.title = `${n.nome} | Manicure, pedicure e nail art com agendamento online`;
  }

  /* ---------- Topo: leque e horários ---------- */
  function topo() {
    const l = VioletArte.leque();
    $("[data-leque]").innerHTML = l.svg;
    trocar($("[data-leque-lista]"), l.pontas.map((p) => el("li", {}, el("span", { class: "leque__cor", style: { background: p.base }, "aria-hidden": "true" }), p.nome)));
    const r = U.resumoHorarios(d().horarios).filter((g) => !g.fechado);
    $("[data-horario-curto]").textContent = r.map((g) => `${g.dias}, ${g.horas}`).join(" · ") || "Horários a definir";
  }

  /* ---------- Serviços ---------- */
  let categoria = "Todos";
  function filtrosServicos() {
    const cats = ["Todos", ...d().categorias.filter((c) => d().servicos.some((s) => s.ativo && s.categoria === c))];
    if (!cats.includes(categoria)) categoria = "Todos";
    trocar($("[data-filtro-servicos]"), cats.map((c) => el("button", { type: "button", class: "filtro", "aria-pressed": c === categoria ? "true" : "false",
      onclick: () => { categoria = c; filtrosServicos(); servicos(); } }, c)));
  }
  function servicos() {
    const lista = d().servicos.filter((s) => s.ativo && (categoria === "Todos" || s.categoria === categoria));
    trocar($("[data-servicos]"), lista.length ? lista.map((s) => {
      const arte = el("span", { class: "servico__arte", "aria-hidden": "true" });
      arte.innerHTML = VioletArte.servico(s.arte);
      return el("li", { class: "servico" },
        arte,
        el("div", { class: "servico__corpo" },
          el("h3", { class: "servico__nome" }, el("button", { type: "button", class: "servico__abrir", onclick: () => detalheServico(s.id), "aria-haspopup": "dialog" }, s.nome, icone("chevron-right", 16))),
          el("p", { class: "servico__descricao", texto: s.descricao })),
        el("p", { class: "servico__meta" }, el("span", { texto: U.duracao(s.duracao) }), el("strong", { texto: U.moeda(s.preco) })),
        el("div", { class: "servico__acoes" },
          el("button", { type: "button", class: "btn btn--linha btn--pequeno servico__detalhes", onclick: () => detalheServico(s.id), "aria-label": `Detalhes de ${s.nome}`, "aria-haspopup": "dialog" }, "Detalhes"),
          el("a", { class: "btn btn--principal btn--pequeno", href: "#agendar", "aria-label": `Agendar ${s.nome}`, onclick: (e) => { e.preventDefault(); agendar({ servicoId: s.id }); } }, "Agendar")));
    }) : [el("li", { class: "vazio", texto: "Nenhum serviço disponível nesta categoria agora." })]);
  }
  function detalheServico(id) {
    const s = M.servico(d(), id);
    if (!s) return;
    const dlg = $("#dlg-servico");
    const arte = el("div", { class: "janela__arte", "aria-hidden": "true" });
    arte.innerHTML = VioletArte.servico(s.arte, { fundo: "#211D27" });
    arte.querySelector("svg").setAttribute("preserveAspectRatio", "xMidYMid slice");
    const profs = M.habilitadas(d(), s);
    trocar($("[data-servico-detalhe]", dlg),
      el("button", { type: "button", class: "icone-btn janela__fechar", "data-fechar": true, "aria-label": "Fechar" }, icone("x", 20)),
      arte,
      el("div", { class: "janela__texto" },
        el("p", { class: "janela__categoria", texto: s.categoria }),
        el("h2", { id: "dlg-servico-titulo", texto: s.nome }),
        el("p", { texto: s.descricao }),
        el("dl", { class: "janela__dados" },
          el("div", {}, el("dt", { texto: "Duração" }), el("dd", { texto: U.duracao(s.duracao) })),
          el("div", {}, el("dt", { texto: "Valor" }), el("dd", { texto: `${U.moeda(s.preco)} (ilustrativo)` })),
          el("div", {}, el("dt", { texto: "Quem faz" }), el("dd", { texto: profs.map((p) => p.nome).join(", ") || "—" }))),
        s.regras ? el("p", { class: "janela__regra" }, icone("info", 16), el("span", { texto: s.regras })) : null,
        el("button", { type: "button", class: "btn btn--principal", onclick: () => { dlg.close(); agendar({ servicoId: s.id }); } }, "Agendar este serviço")));
    Comum.abrirDialogo(dlg);
    $(".janela__fechar", dlg).focus();
  }

  /* ---------- Galeria ---------- */
  let filtroGaleria = "Todos";
  let visiveis = [];
  function galeria() {
    const cats = ["Todos", ...new Set(VIOLET.GALERIA.map((g) => g.categoria))];
    trocar($("[data-filtro-galeria]"), cats.map((c) => el("button", { type: "button", class: "filtro", "aria-pressed": c === filtroGaleria ? "true" : "false",
      onclick: () => { filtroGaleria = c; galeria(); } }, c)));
    visiveis = VIOLET.GALERIA.filter((g) => filtroGaleria === "Todos" || g.categoria === filtroGaleria);
    trocar($("[data-galeria]"), visiveis.map((g, i) => {
      const arte = VioletArte.galeria(g.arte);
      const quadro = el("span", { class: "peca__quadro", "data-foto": g.foto, "data-alt": `${g.titulo}: ${g.legenda}`, style: { background: arte.fundo } });
      quadro.innerHTML = arte.svg;
      return el("li", { class: `peca peca--${g.tamanho || "normal"}${g.destaqueCelular ? " peca--destaque-celular" : ""}` },
        el("button", { type: "button", class: "peca__btn", "aria-haspopup": "dialog", "aria-label": `Ampliar: ${g.titulo}. ${g.legenda}`, onclick: () => ampliar(i) },
          quadro,
          el("span", { class: "peca__legenda" }, el("b", { texto: g.titulo }), el("span", { texto: g.categoria }))));
    }));
    fotos($("[data-galeria]"));
  }
  function ampliar(i) {
    const dlg = $("#dlg-foto");
    const total = visiveis.length;
    const g = visiveis[(i + total) % total];
    const pos = visiveis.indexOf(g);
    const arte = VioletArte.galeria(g.arte);
    const quadro = el("div", { class: "foto__quadro", role: "img", "aria-label": `Ilustração: ${g.legenda}`, "data-foto": g.foto, style: { background: arte.fundo } });
    quadro.innerHTML = arte.svg;
    trocar($("[data-foto-ampliada]", dlg),
      el("button", { type: "button", class: "icone-btn janela__fechar", "data-fechar": true, "aria-label": "Fechar" }, icone("x", 20)),
      quadro,
      el("div", { class: "foto__rodape" },
        el("div", {},
          el("h2", { id: "dlg-foto-titulo", texto: g.titulo }),
          el("p", { texto: g.legenda }),
          el("p", { class: "foto__nota", texto: `${g.categoria} · ilustração de demonstração · ${pos + 1} de ${total}` })),
        el("div", { class: "foto__nav" },
          el("button", { type: "button", class: "icone-btn", "aria-label": "Anterior", onclick: () => ampliar(pos - 1) }, icone("chevron-left", 20)),
          el("button", { type: "button", class: "icone-btn", "aria-label": "Próxima", onclick: () => ampliar(pos + 1) }, icone("chevron-right", 20)))));
    dlg.dataset.pos = String(pos);
    fotos(dlg);
    if (!dlg.open) { Comum.abrirDialogo(dlg); $(".janela__fechar", dlg).focus(); }
  }
  document.addEventListener("keydown", (e) => {
    const dlg = $("#dlg-foto");
    if (!dlg.open || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const pos = Number(dlg.dataset.pos || 0);
    ampliar(e.key === "ArrowLeft" ? pos - 1 : pos + 1);
    const btn = $(`.foto__nav button[aria-label="${e.key === "ArrowLeft" ? "Anterior" : "Próxima"}"]`, dlg);
    if (btn) btn.focus();
  });

  /* ---------- Equipe ---------- */
  const iniciais = (nome) => nome.split(" ").filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (p, grande) => el("span", { class: `avatar avatar--${p.arte || "a"}${grande ? " avatar--grande" : ""}`, "aria-hidden": "true" }, el("span", { texto: iniciais(p.nome) }));
  function diasDeTrabalho(p) {
    const r = U.resumoHorarios(Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((dia) => [dia, (d().horarios[dia] || []).length ? (p.jornada[dia] || []) : []])));
    return r.filter((g) => !g.fechado).map((g) => `${g.dias}: ${g.horas}`);
  }
  function equipe() {
    const ativas = d().profissionais.filter((p) => p.ativo);
    trocar($("[data-equipe]"), ativas.length ? ativas.map((p) => {
      const servs = d().servicos.filter((s) => s.ativo && s.profissionais.includes(p.id));
      return el("li", { class: "pessoa" },
        avatar(p, true),
        el("h3", { class: "pessoa__nome", texto: p.nome }),
        el("p", { class: "pessoa__esp", texto: p.especialidades }),
        el("p", { class: "pessoa__desc", texto: p.descricao }),
        el("details", { class: "pessoa__mais" },
          el("summary", {}, `Serviços e horários`),
          el("ul", { class: "pessoa__servicos", "aria-label": `Serviços de ${p.nome}` }, servs.map((s) => el("li", { texto: s.nome }))),
          el("ul", { class: "pessoa__horas", "aria-label": `Dias de atendimento de ${p.nome}` }, diasDeTrabalho(p).map((t) => el("li", { texto: t })))),
        el("a", { class: "btn btn--linha btn--pequeno", href: "#agendar", onclick: (e) => { e.preventDefault(); agendar({ profissionalId: p.id }); } }, `Agendar com ${p.nome.split(" ")[0]}`));
    }) : [el("li", { class: "vazio", texto: "A equipe ainda não foi cadastrada." })]);
  }

  /* ---------- Depoimentos ---------- */
  function depoimentos() {
    const lista = d().depoimentos.filter((x) => x.ativo);
    const temFicticio = lista.some((x) => x.ficticio);
    $("[data-aviso-depoimentos]").hidden = !temFicticio;
    $("#depoimentos").hidden = !lista.length;
    trocar($("[data-depoimentos]"), lista.map((x) => el("li", { class: "depoimento" },
      el("blockquote", {}, el("p", { texto: x.texto })),
      el("p", { class: "depoimento__autor" }, el("span", { texto: x.autor }), x.contexto ? el("span", { texto: x.contexto }) : null,
        x.ficticio ? el("span", { class: "selo-ficticio", texto: "Fictício" }) : el("span", { class: "selo-real", texto: "Publicado com autorização" })))));
  }

  /* ---------- Perguntas que dependem das regras ---------- */
  function perguntas() {
    const r = d().regras;
    $("[data-faq-aprovacao]").textContent = r.aprovacao === "automatica"
      ? "Sim. Assim que a reserva é gravada, o horário fica confirmado e você recebe o código."
      : "Ainda não. Ela chega ao estúdio como solicitação: o horário fica guardado para você e o estúdio confirma em seguida. A tela mostra “aguardando confirmação” enquanto isso.";
    $("[data-faq-cancelamento]").textContent = `Para cancelar, use “Minha reserva” (no rodapé ou na seção de agendamento) com o código e o telefone. Pelo site, o cancelamento vai até ${U.plural(Number(r.cancelamentoHoras), "hora", "horas")} antes do horário; depois disso, fale com o estúdio. Para remarcar, cancele e faça uma nova reserva. ${r.politicaCancelamento}`;
  }

  /* ---------- Contato, endereço e horários ---------- */
  function contato() {
    const n = d().negocio;
    const canal = (rotulo, nomeIcone, conteudo) => el("div", { class: "canal" }, el("span", { class: "canal__icone", "aria-hidden": "true" }, icone(nomeIcone, 20)), el("div", {}, el("p", { class: "canal__rotulo", texto: rotulo }), conteudo));
    const naoConfig = (t) => el("p", { class: "canal__vazio", texto: t });
    trocar($("[data-canais]"),
      el("h3", { texto: "Fale com o estúdio" }),
      canal("WhatsApp", "message-circle", n.whatsapp
        ? el("a", { class: "btn btn--principal btn--pequeno", href: U.linkWhatsapp(n.whatsapp, `Olá, ${n.nomeCurto || n.nome}! Vim pelo site e queria tirar uma dúvida.`), target: "_blank", rel: "noopener" }, "Conversar no WhatsApp")
        : naoConfig("Ainda não configurado. O número é definido no painel, em Configurações.")),
      canal("Telefone", "phone", n.telefone ? el("a", { href: `tel:+55${n.telefone}`, texto: U.formatarTelefone(n.telefone) }) : naoConfig("Ainda não configurado.")),
      canal("E-mail", "mail", n.email ? el("a", { href: `mailto:${n.email}`, texto: n.email }) : naoConfig("Ainda não configurado.")),
      n.instagram ? canal("Instagram", "at-sign", el("a", { href: n.instagram, target: "_blank", rel: "noopener", texto: n.instagram.replace(/^https:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "") })) : null);
    const e = n.endereco || {};
    const temEndereco = !!(e.rua && e.cidade);
    const linha1 = [e.rua, e.numero].filter(Boolean).join(", ") + (e.complemento ? ` — ${e.complemento}` : "");
    const linha2 = [e.bairro, `${e.cidade}${e.uf ? ` - ${e.uf}` : ""}`].filter(Boolean).join(", ") + (e.cep ? ` · CEP ${e.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}` : "");
    const destino = encodeURIComponent(`${linha1}, ${linha2}`);
    trocar($("[data-lugar]"),
      el("h3", { texto: "Endereço" }),
      temEndereco
        ? el("div", { class: "lugar" },
          el("address", {}, linha1, el("br"), linha2),
          el("a", { class: "btn btn--linha btn--pequeno", href: `https://www.google.com/maps/dir/?api=1&destination=${destino}`, target: "_blank", rel: "noopener" }, icone("navigation", 16), "Como chegar"),
          n.enderecoConfirmado
            ? el("iframe", { class: "lugar__mapa", title: `Mapa: ${linha1}`, loading: "lazy", referrerpolicy: "no-referrer-when-downgrade", src: `https://www.google.com/maps?q=${destino}&output=embed` })
            : el("p", { class: "canal__vazio", texto: "O mapa aparece quando o endereço for marcado como confirmado no painel." }))
        : el("div", { class: "lugar lugar--vazio" },
          el("span", { class: "lugar__marca", "aria-hidden": "true" }, icone("map-pin", 28)),
          el("p", { texto: "Endereço ainda não configurado." }),
          el("p", { class: "canal__vazio", texto: "Esta é uma marca fictícia, então não mostramos endereço nem mapa. Quando o estúdio informar o endereço no painel, ele aparece aqui com o botão de rota." })));
    trocar($("[data-horarios]"), U.resumoHorarios(d().horarios).map((g) => el("div", { class: g.fechado ? "is-fechado" : "" }, el("dt", { texto: g.dias }), el("dd", { texto: g.horas }))));
  }

  /* ---------- Agendamento ---------- */
  const raizAgenda = $("[data-agendamento]");
  const agenda = AE.agendar.montar(raizAgenda, { loja, avatar: (p) => avatar(p), privacidade: "privacidade.html",
    ajudaObservacao: "Por exemplo: uma referência de cor ou se tem alguma alergia a produtos." });
  function agendar(opcoes = {}) {
    agenda.iniciar(opcoes);
    const alvo = $("#agendar");
    alvo.scrollIntoView({ behavior: Comum.reduzirMovimento() ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#agendar");
  }
  $$("[data-agendar]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); agendar(); }));
  $$("[data-minha-reserva]").forEach((b) => b.addEventListener("click", () => AE.minhaReserva.abrir({ loja, privacidade: "privacidade.html" })));
  if (!loja.persistente) {
    const aviso = $("[data-aviso-local] span");
    aviso.textContent = "Este navegador está bloqueando o armazenamento local. O agendamento funciona, mas as reservas não ficam salvas ao recarregar a página.";
  }

  /* ---------- Tudo junto, e de novo quando os dados mudarem (outra aba ou painel) ---------- */
  function tudo() {
    marca();
    filtrosServicos();
    servicos();
    equipe();
    depoimentos();
    perguntas();
    contato();
  }
  topo();
  galeria();
  tudo();
  loja.ouvir(tudo);
  fotos($(".hero"));
})();
