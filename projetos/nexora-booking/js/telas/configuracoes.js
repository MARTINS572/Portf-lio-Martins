/* ==========================================================================
   NEXORA BOOKING — Tela: Configurações
   Dados do estabelecimento (aparecem no menu e na página pública), visual
   da página de agendamento, preferências da agenda, textos das mensagens,
   perfil, preferências deste navegador e dados da demonstração.
   Tudo o que é salvo aqui tem efeito real no sistema.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const { el, icone, $ } = U;
  const C = () => NX.componentes;

  let p = null;
  let irPara = null;

  function aoEntrar(params) { if (params.secao) irPara = params.secao; }
  function montar(secao) {
    p = { corpo: el("div") };
    U.trocar(secao, C().cabecalho({ id: "configuracoes", titulo: "Configurações", sub: "O que é salvo aqui muda o painel e a página de agendamento na hora." }), p.corpo);
  }

  const cartao = (id, titulo, sub, ...filhos) => el("article", { class: "cartao config", id: `cfg-${id}` }, el("div", {}, el("h2", { class: "cartao__titulo", texto: titulo }), sub ? el("p", { class: "cartao__sub", texto: sub }) : null), ...filhos);
  function campo(id, rotulo, controle, { ajuda, inteira, opcional } = {}) {
    controle.id = id;
    const erro = el("p", { class: "campo__erro", id: `${id}-erro`, role: "alert" });
    controle.setAttribute("aria-describedby", `${erro.id}${ajuda ? ` ${id}-ajuda` : ""}`);
    return { caixa: el("div", { class: `campo${inteira ? " campo--inteira" : ""}` }, el("label", { for: id }, rotulo, opcional ? el("span", { class: "campo__opc", texto: " (opcional)" }) : null), controle, ajuda ? el("p", { class: "campo__ajuda", id: `${id}-ajuda`, texto: ajuda }) : null, erro), erro, controle };
  }
  const texto = (valor, max, extra = {}) => el("input", { type: "text", maxlength: max, value: valor || "", autocomplete: "off", ...extra });
  function mostrarErros(campos, erros) {
    Object.values(campos).forEach((c) => { c.erro.textContent = ""; c.controle.setAttribute("aria-invalid", "false"); });
    Object.entries(erros || {}).forEach(([k, m]) => { if (campos[k]) { campos[k].erro.textContent = m; campos[k].controle.setAttribute("aria-invalid", "true"); } });
    const primeiro = Object.keys(erros || {}).find((k) => campos[k]);
    if (primeiro) campos[primeiro].controle.focus();
  }
  const caixaMarcar = (id, rotulo, marcado) => { const i = el("input", { type: "checkbox", id }); i.checked = !!marcado; return { i, caixa: el("label", { class: "caixa-marcar", for: id }, i, el("span", { texto: rotulo })) }; };

  function desenhar() {
    const d = L.dados;
    const est = d.estabelecimento;

    /* ---------- Estabelecimento ---------- */
    let logo = est.logo || null;
    const cEst = {
      nome: campo("cfg-nome", "Nome comercial", texto(est.nome, 60)),
      descricao: campo("cfg-descricao", "Descrição curta", el("textarea", { rows: 2, maxlength: 200 }), { inteira: true, opcional: true, ajuda: "Aparece no topo da página de agendamento." }),
      telefone: campo("cfg-telefone", "Telefone", texto(est.telefone, 16, { type: "tel", inputmode: "tel", placeholder: "(00) 0000-0000" }), { opcional: true }),
      whatsapp: campo("cfg-whatsapp", "WhatsApp do estabelecimento", texto(est.whatsapp, 15, { inputmode: "numeric", placeholder: "5511912345678" }), { opcional: true, ajuda: "Só números, com 55 e DDD. Se preenchido, a página mostra o botão \"Falar no WhatsApp\". Em branco, o botão não aparece." }),
      endereco: campo("cfg-endereco", "Endereço", texto(est.endereco, 120), { inteira: true, opcional: true }),
    };
    cEst.descricao.controle.value = est.descricao || "";
    cEst.telefone.controle.addEventListener("input", () => { cEst.telefone.controle.value = U.mascaraTelefone(cEst.telefone.controle.value); });
    const campoLogo = NX.editores.campoImagem(logo, { titulo: "Logo (opcional)", lado: 200, id: "cfg-logo", botao: () => $("#cfg-salvar-est"), aoMudar: (v) => { logo = v; } });
    const estCartao = cartao("estabelecimento", "Estabelecimento", "Aparece no menu lateral, nas mensagens e na página de agendamento.",
      el("div", { class: "campos" }, ...Object.values(cEst).map((c) => c.caixa)),
      campoLogo.caixa,
      est.telefoneFicticio ? el("p", { class: "campo__ajuda", texto: "O telefone de exemplo é fictício: na página ele aparece só como texto. Ao trocar por um número real, ele vira link para ligar." }) : null,
      el("div", { class: "config__botoes" }, C().botao("Salvar dados do estabelecimento", "btn--primario btn--pequeno", () => {
        if (campoLogo.ocupado()) { U.aviso("Espere a imagem terminar de processar.", "info"); return; }
        const v = Object.fromEntries(Object.entries(cEst).map(([k, c]) => [k, c.controle.value.trim()]));
        const r = L.salvarEstabelecimento({ ...v, logo });
        if (!r.ok) { mostrarErros(cEst, r.erros); return; }
        U.aviso("Dados do estabelecimento salvos.");
      }, "save", { id: "cfg-salvar-est", "data-foco": "cfg-salvar-est" })));

    /* ---------- Página pública ---------- */
    const pag = est.pagina;
    const url = new URL("reservar.html", location.href).href;
    const cores = el("fieldset", { class: "opcoes" }, el("legend", { texto: "Cor principal" }), el("div", { class: "cores-pagina" }, ...NX.CORES_PAGINA.map((c) => {
      const i = el("input", { type: "radio", name: "cfg-cor", id: `cfg-cor-${c.id}`, value: c.id });
      i.checked = pag.cor === c.id;
      return el("div", { class: "cor-opcao" }, i, el("label", { for: i.id }, el("i", { style: { "--amostra": c.cor } }), c.nome));
    })));
    const boas = campo("cfg-boas", "Mensagem de boas-vindas", el("textarea", { rows: 2, maxlength: 200 }), { inteira: true, opcional: true });
    boas.controle.value = pag.boasVindas || "";
    const precos = caixaMarcar("cfg-precos", "Mostrar preços dos serviços", pag.mostrarPrecos);
    const endereco = caixaMarcar("cfg-mostrar-end", "Mostrar endereço", pag.mostrarEndereco);
    const escolher = caixaMarcar("cfg-escolher", "Cliente pode escolher o profissional (senão, o sistema distribui)", pag.permitirEscolherProfissional);
    const pagCartao = cartao("pagina", "Página de agendamento", "O que o cliente vê ao reservar. Usa o nome, a descrição e o logo acima.",
      el("div", { class: "link-publico-caixa" }, icone("globe", 16), el("code", { texto: url }),
        C().botao("Copiar link", "btn--linha btn--pequeno", async () => { const ok = await NX.reservas.copiar(url); U.aviso(ok ? "Link copiado." : "Não foi possível copiar. Selecione o link e copie.", ok ? "ok" : "erro"); }, "copy"),
        el("a", { class: "btn btn--linha btn--pequeno", href: "reservar.html", target: "_blank", rel: "noopener" }, icone("external-link", 15), "Abrir")),
      el("p", { class: "campo__ajuda", texto: "Nesta demonstração o link funciona neste navegador: a página e o painel dividem o mesmo armazenamento local. Com servidor, qualquer cliente acessaria o mesmo endereço." }),
      cores, boas.caixa, el("div", { class: "opcoes" }, precos.caixa, endereco.caixa, escolher.caixa),
      el("div", { class: "config__botoes" }, C().botao("Salvar página", "btn--primario btn--pequeno", () => {
        const cor = (p.corpo.querySelector('input[name="cfg-cor"]:checked') || {}).value;
        const r = L.salvarPagina({ cor, boasVindas: boas.controle.value, mostrarPrecos: precos.i.checked, mostrarEndereco: endereco.i.checked, permitirEscolherProfissional: escolher.i.checked });
        if (!r.ok) { mostrarErros({ boasVindas: boas }, r.erros); if (r.erro) U.aviso(r.erro, "erro"); return; }
        U.aviso("Página de agendamento atualizada. Recarregue a aba dela para ver.");
      }, "save", { "data-foco": "cfg-salvar-pag" })));

    /* ---------- Agenda e política ---------- */
    const visao = el("select", {}, ...[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["lista", "Lista"]].map(([v, t]) => el("option", { value: v, texto: t })));
    visao.value = est.agenda.visaoInicial;
    const cVisao = campo("cfg-visao", "Visão inicial da agenda", visao);
    const cancel = caixaMarcar("cfg-cancelados", "Mostrar reservas canceladas na agenda (elas não ocupam horário)", est.agenda.mostrarCancelados);
    const regras = est.regras;
    const expediente = [1, 2, 3, 4, 5, 6, 0].map((dow) => { const h = est.horarios[dow]; return `${NX.DIAS_CURTOS[dow]} ${h ? `${h.abre}–${h.fecha}` : "fechado"}`; }).join(" · ");
    const agCartao = cartao("agenda", "Agenda, horários e política de cancelamento", null,
      el("div", { class: "campos" }, cVisao.caixa), cancel.caixa,
      el("div", { class: "config__botoes" }, C().botao("Salvar agenda", "btn--primario btn--pequeno", () => {
        L.salvarAgendaPrefs({ visaoInicial: visao.value, mostrarCancelados: cancel.i.checked });
        const tela = NX.telas.agenda.estado;
        tela.visao = null; tela.mostrarCancelados = null;
        U.aviso("Preferências da agenda salvas.");
      }, "save", { "data-foco": "cfg-salvar-agenda" })),
      el("ul", { class: "lista-limites" },
        el("li", {}, icone("calendar-x", 15), `Cliente cancela pela página até ${regras.cancelamentoHoras} h antes.`),
        el("li", {}, icone("calendar-sync", 15), `Cliente reagenda até ${regras.reagendamentoHoras} h antes, no máximo ${U.plural(regras.reagendamentosMax, "vez", "vezes")}.`),
        el("li", {}, icone("hourglass", 15), regras.confirmacaoAutomatica ? "Reservas da página chegam confirmadas." : "Reservas da página chegam pendentes até a equipe confirmar."),
        el("li", {}, icone("clock", 15), `Funcionamento: ${expediente}.`)),
      el("a", { class: "link-btn", href: "#/disponibilidade" }, icone("clock", 15), "Mudar horários e regras em Disponibilidade e horários"));

    /* ---------- Mensagens ---------- */
    const NOMES = { novo: "Reserva recebida (pendente)", confirmado: "Confirmação", reagendado: "Reagendamento", cancelado: "Cancelamento", lembrete: "Lembrete do dia" };
    const cMsg = Object.fromEntries(Object.keys(NX.MODELOS_PADRAO).map((k) => {
      const c = campo(`cfg-msg-${k}`, NOMES[k], el("textarea", { rows: 3, maxlength: 500 }), { inteira: true });
      c.controle.value = est.mensagens[k] || NX.MODELOS_PADRAO[k];
      return [k, c];
    }));
    const msgCartao = cartao("mensagens", "Textos das mensagens", "Usados no botão \"Mensagem para o cliente\" da reserva. Nada é enviado sozinho.",
      el("p", { class: "campo__ajuda" }, "Pode usar: ", ...["{cliente}", "{servico}", "{profissional}", "{data}", "{hora}", "{codigo}", "{estabelecimento}"].flatMap((t) => [el("code", { class: "codigo", texto: t }), " "])),
      el("div", { class: "campos" }, ...Object.values(cMsg).map((c) => c.caixa)),
      el("div", { class: "config__botoes" },
        C().botao("Salvar textos", "btn--primario btn--pequeno", () => {
          const r = L.salvarMensagens(Object.fromEntries(Object.entries(cMsg).map(([k, c]) => [k, c.controle.value])));
          if (!r.ok) { mostrarErros(cMsg, r.erros); return; }
          U.aviso("Textos das mensagens salvos.");
        }, "save", { "data-foco": "cfg-salvar-msg" }),
        C().botao("Voltar aos textos padrão", "btn--fantasma btn--pequeno", () => { Object.entries(cMsg).forEach(([k, c]) => { c.controle.value = NX.MODELOS_PADRAO[k]; }); U.aviso("Textos padrão colocados nos campos. Clique em Salvar textos para manter.", "info"); }, "rotate-ccw")));

    /* ---------- Perfil ---------- */
    const cPerfil = { perfilNome: campo("cfg-perfil-nome", "Seu nome", texto(d.perfil.nome, 60)), cargo: campo("cfg-perfil-cargo", "Função", texto(d.perfil.cargo, 40), { opcional: true }) };
    const perfilCartao = cartao("perfil", "Perfil", "Perfil demonstrativo, sem login. O nome aparece no histórico das reservas.",
      el("div", { class: "campos" }, cPerfil.perfilNome.caixa, cPerfil.cargo.caixa),
      el("div", { class: "config__botoes" }, C().botao("Salvar perfil", "btn--primario btn--pequeno", () => {
        const r = L.salvarPerfil({ nome: cPerfil.perfilNome.controle.value, cargo: cPerfil.cargo.controle.value });
        if (!r.ok) { mostrarErros(cPerfil, r.erros); return; }
        U.aviso("Perfil salvo.");
      }, "save", { "data-foco": "cfg-salvar-perfil" })));

    /* ---------- Preferências deste navegador ---------- */
    const pref = NX.preferencias;
    const opcao = (nome, valor, rotulo, marcado, fn) => { const id = `cfg-${nome}-${valor}`; const i = el("input", { type: "radio", name: `cfg-${nome}`, id, value: valor }); i.checked = marcado; i.addEventListener("change", fn); return el("div", { class: "opcao" }, i, el("label", { for: id, texto: rotulo })); };
    const prefCartao = cartao("preferencias", "Preferências deste navegador", "Valem só aqui e mudam na hora.",
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Densidade das tabelas" }), el("div", { class: "opcoes__lista" },
        opcao("densidade", "confortavel", "Confortável", pref.densidade !== "compacta", () => NX.salvarPreferencias({ densidade: "confortavel" }, "Densidade confortável.")),
        opcao("densidade", "compacta", "Compacta", pref.densidade === "compacta", () => NX.salvarPreferencias({ densidade: "compacta" }, "Densidade compacta.")))),
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Itens por página nas listas" }), el("div", { class: "opcoes__lista" },
        ...[10, 20, 50].map((n) => opcao("porpagina", String(n), String(n), pref.porPagina === n, () => NX.salvarPreferencias({ porPagina: n }, `${n} itens por página.`))))),
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Tema" }), el("div", { class: "opcoes__lista" },
        ...[["light", "Claro"], ["dark", "Escuro"], ["", "Igual ao sistema"]].map(([v, t]) => opcao("tema", v || "sistema", t, (Comum.temaSalvo() || "") === v, () => { Comum.definirTema(v || null); U.aviso(`Tema: ${t.toLowerCase()}.`); })))));

    /* ---------- Dados ---------- */
    const kb = Math.round(L.tamanhoSalvo() / 1024);
    const dadosCartao = cartao("dados", "Dados da demonstração", null,
      el("ul", { class: "lista-limites" },
        el("li", {}, icone("hard-drive", 15), `Tudo fica no armazenamento local deste navegador (cerca de ${U.numero(kb)} KB). Outro navegador ou aparelho não vê estes dados.`),
        el("li", {}, icone("server-off", 15), "Não há servidor, login nem banco de dados. Num sistema real, cada estabelecimento teria seus dados separados no servidor (os registros já levam o identificador do estabelecimento)."),
        el("li", {}, icone("shield-check", 15), "Nenhuma mensagem é enviada e nenhum pagamento é processado.")),
      el("div", { class: "config__botoes" },
        C().botao("Baixar cópia dos dados (JSON)", "btn--linha btn--pequeno", () => {
          const blob = new Blob([JSON.stringify(L.dados, null, 2)], { type: "application/json" });
          const link = el("a", { href: URL.createObjectURL(blob), download: `nexora-booking-dados-${U.hoje()}.json` });
          document.body.append(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(link.href), 2000);
          U.aviso("Cópia dos dados gerada (arquivo JSON).");
        }, "download")));
    const perigoCartao = el("article", { class: "cartao config zona-perigo" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Restaurar dados originais" }), el("p", { class: "cartao__sub", texto: "Apaga tudo o que foi feito nesta demonstração e volta aos dados de exemplo." })),
      el("div", { class: "config__botoes" }, C().botao("Restaurar dados originais", "btn--perigo btn--pequeno", () => NX.restaurarDados(), "rotate-ccw", { "data-foco": "cfg-restaurar" })));

    U.trocar(p.corpo, el("div", { class: "config-grade" },
      el("div", { class: "config-coluna" }, estCartao, pagCartao, msgCartao),
      el("div", { class: "config-coluna" }, agCartao, perfilCartao, prefCartao, dadosCartao, perigoCartao)));

    if (irPara) {
      const alvo = $(`#cfg-${irPara}`);
      irPara = null;
      if (alvo) setTimeout(() => { alvo.scrollIntoView({ block: "start", behavior: Comum.reduzirMovimento() ? "auto" : "smooth" }); const f = alvo.querySelector("input, textarea, select"); if (f) f.focus({ preventScroll: true }); }, 60);
    }
  }
  const atualizar = C().comFoco(desenhar);

  NX.telas.configuracoes = { titulo: "Configurações", montar, atualizar, aoEntrar };
})();
