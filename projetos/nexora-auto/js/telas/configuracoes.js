/* ==========================================================================
   NEXORA AUTO — Tela: Configurações
   Dados da oficina, horários, regras de orçamento, estoque e agenda,
   documentos impressos, categorias, perfis, preferências deste navegador e
   dados da demonstração. Tudo o que é salvo aqui tem efeito real:
   nome e logo no menu e nos documentos, horários na agenda, valor da hora
   e validade nos orçamentos, mínimo padrão nas peças novas, boxes na
   agenda, e assim por diante.
   ========================================================================== */
window.NX = window.NX || {};
NX.telas = NX.telas || {};

(function () {
  "use strict";
  const U = NX.util;
  const L = NX.loja;
  const O = NX.oficina;
  const { el, icone, $ } = U;
  const C = () => NX.componentes;
  let p = null;

  function montar(secao) {
    p = { corpo: el("div") };
    U.trocar(secao, C().cabecalho({ id: "configuracoes", titulo: "Configurações", sub: "O que é salvo aqui muda o sistema na hora: menu, documentos, orçamentos, agenda e estoque." }), p.corpo);
  }

  const cartao = (id, titulo, sub, ...filhos) => el("article", { class: "cartao config", id: `cfg-${id}` }, el("div", {}, el("h2", { class: "cartao__titulo", texto: titulo }), sub ? el("p", { class: "cartao__sub", texto: sub }) : null), ...filhos);
  function campo(id, rotulo, controle, { ajuda, inteira, opcional } = {}) {
    controle.id = id;
    const erro = el("p", { class: "campo__erro", id: `${id}-erro`, role: "alert" });
    controle.setAttribute("aria-describedby", `${erro.id}${ajuda ? ` ${id}-ajuda` : ""}`);
    return { caixa: el("div", { class: `campo${inteira ? " campo--inteira" : ""}` }, el("label", { for: id }, rotulo, opcional ? el("span", { class: "campo__opc", texto: " (opcional)" }) : null), controle, ajuda ? el("p", { class: "campo__ajuda", id: `${id}-ajuda`, texto: ajuda }) : null, erro), erro, controle };
  }
  const texto = (valor, max, extra = {}) => el("input", { type: "text", maxlength: max, value: valor ?? "", autocomplete: "off", ...extra });
  function mostrarErros(campos, erros) {
    Object.values(campos).forEach((c) => { c.erro.textContent = ""; c.controle.setAttribute("aria-invalid", "false"); });
    Object.entries(erros || {}).forEach(([k, m]) => { if (campos[k]) { campos[k].erro.textContent = m; campos[k].controle.setAttribute("aria-invalid", "true"); } });
    const primeiro = Object.keys(erros || {}).find((k) => campos[k]);
    if (primeiro) campos[primeiro].controle.focus();
  }
  const caixaMarcar = (id, rotulo, marcado) => { const i = el("input", { type: "checkbox", id }); i.checked = !!marcado; return { i, caixa: el("label", { class: "caixa-marcar", for: id }, i, el("span", { texto: rotulo })) }; };
  const valores = (campos) => Object.fromEntries(Object.entries(campos).map(([k, c]) => [k, c.controle.value.trim()]));

  // Logo: a imagem escolhida é reduzida no próprio navegador antes de salvar
  function campoImagem(inicial, { lado = 200, id = "cfg-logo", aoMudar } = {}) {
    let imagem = inicial || null;
    let processando = false;
    const previa = el("span", { class: "miniatura" });
    const entrada = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", id, "aria-describedby": `${id}-status` });
    const status = el("span", { id: `${id}-status`, "aria-live": "polite" });
    const remover = el("button", { class: "btn btn--fantasma btn--pequeno", type: "button", texto: "Remover logo" });
    const escolher = el("label", { class: "btn btn--linha btn--pequeno", for: id, tabindex: "0", role: "button" }, icone("image-plus", 15), "Escolher logo");
    escolher.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); entrada.click(); } });
    const caixa = el("div", { class: "imagem-campo" }, previa, el("div", { class: "imagem-campo__texto" }, el("b", { texto: "Logo (opcional)" }), status, el("div", { class: "imagem-campo__botoes" }, escolher, remover)), entrada);
    const desenhar = () => {
      U.trocar(previa, imagem ? el("img", { src: imagem, alt: "Prévia do logo" }) : icone("image", 26));
      remover.hidden = !imagem;
      if (!processando) status.textContent = imagem ? "Logo pronto. Aparece no menu e nos documentos impressos." : "JPG, PNG ou WebP de até 8 MB. A imagem é reduzida antes de salvar.";
    };
    remover.addEventListener("click", () => { imagem = null; entrada.value = ""; desenhar(); if (aoMudar) aoMudar(null); });
    entrada.addEventListener("change", () => {
      const arq = entrada.files && entrada.files[0];
      if (!arq) return;
      if (!/^image\/(png|jpeg|webp)$/.test(arq.type)) { status.textContent = "Formato não aceito. Use JPG, PNG ou WebP."; entrada.value = ""; return; }
      if (arq.size > 8 * 1024 * 1024) { status.textContent = "Arquivo maior que 8 MB."; entrada.value = ""; return; }
      processando = true;
      status.textContent = "Processando a imagem…";
      const leitor = new FileReader();
      const terminar = (msg) => { processando = false; desenhar(); if (msg) status.textContent = msg; else if (aoMudar) aoMudar(imagem); };
      leitor.onerror = () => terminar("Não foi possível ler o arquivo.");
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => terminar("Não foi possível abrir a imagem.");
        img.onload = () => {
          const escala = Math.min(1, lado / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          imagem = canvas.toDataURL("image/jpeg", 0.85);
          terminar();
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arq);
    });
    desenhar();
    return { caixa, ocupado: () => processando };
  }

  function desenhar() {
    const d = L.dados;
    const of = d.oficina;

    /* ---------- Oficina ---------- */
    let logo = of.logo || null;
    const cOf = {
      nome: campo("cfg-nome", "Nome da oficina", texto(of.nome, 60)),
      razaoSocial: campo("cfg-razao", "Razão social", texto(of.razaoSocial, 80), { opcional: true }),
      cnpj: campo("cfg-cnpj", "CNPJ", texto(of.cnpj ? U.mascaraCnpj(of.cnpj) : "", 18, { inputmode: "numeric" }), { opcional: true, ajuda: "Só aparece nos documentos se estiver marcado em Documentos." }),
      telefone: campo("cfg-telefone", "Telefone", texto(of.telefone, 16, { type: "tel", inputmode: "tel" }), { opcional: true }),
      whatsapp: campo("cfg-whatsapp", "WhatsApp da oficina", texto(of.whatsapp, 15, { inputmode: "numeric", placeholder: "5519912345678" }), { opcional: true, ajuda: "Só números, com 55 e DDD. Aparece nos documentos." }),
      horarioTexto: campo("cfg-horario-texto", "Horário (como aparece para o cliente)", texto(of.horarioTexto, 80), { opcional: true, ajuda: "Usado nas mensagens e nos documentos." }),
      endereco: campo("cfg-endereco", "Endereço", texto(of.endereco, 140), { inteira: true, opcional: true }),
    };
    cOf.telefone.controle.addEventListener("input", () => { cOf.telefone.controle.value = U.mascaraTelefone(cOf.telefone.controle.value); });
    cOf.cnpj.controle.addEventListener("input", () => { cOf.cnpj.controle.value = U.mascaraCnpj(cOf.cnpj.controle.value); });
    const campoLogo = campoImagem(logo, { aoMudar: (v) => { logo = v; } });
    const ofCartao = cartao("oficina", "Oficina", "Aparece no menu lateral, nas mensagens para o cliente e nos documentos impressos.",
      el("div", { class: "campos" }, ...Object.values(cOf).map((c) => c.caixa)), campoLogo.caixa,
      of.telefoneFicticio ? el("p", { class: "campo__ajuda", texto: "O telefone de exemplo é fictício. Ao trocar por um número real, ele deixa de ser marcado como fictício." }) : null,
      el("div", { class: "config__botoes" }, C().botao("Salvar dados da oficina", "btn--primario btn--pequeno", () => {
        if (campoLogo.ocupado()) { U.aviso("Espere a imagem terminar de processar.", "info"); return; }
        const r = L.salvarOficina({ ...valores(cOf), logo });
        if (!r.ok) { mostrarErros(cOf, r.erros); if (r.erro) U.aviso(r.erro, "erro"); return; }
        U.aviso("Dados da oficina salvos.");
      }, "save", { "data-foco": "cfg-salvar-oficina" })));

    /* ---------- Horários ---------- */
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const linhas = {};
    const erroHor = el("p", { class: "form-secao-erro", role: "alert" });
    const errosDia = {};
    const editor = el("div", { class: "jornada jornada--simples", role: "group", "aria-label": "Horário de funcionamento" },
      el("div", { class: "jornada__cab", "aria-hidden": "true" }, el("span", { texto: "Dia" }), el("span", { texto: "Abre" }), el("span", { texto: "Fecha" })),
      ...ordem.map((dow) => {
        const h = of.horarios[dow];
        const aberto = el("input", { type: "checkbox", id: `cfg-dia-${dow}` });
        aberto.checked = !!h;
        const abre = el("input", { type: "time", step: 900, value: h ? h.abre : "08:00", "aria-label": `${NX.DIAS[dow]}: abre`, id: `cfg-dia-${dow}-abre` });
        const fecha = el("input", { type: "time", step: 900, value: h ? h.fecha : "18:00", "aria-label": `${NX.DIAS[dow]}: fecha`, id: `cfg-dia-${dow}-fecha` });
        const erro = el("p", { class: "jornada__erro", role: "alert" });
        errosDia[dow] = erro;
        const linha = el("div", { class: `jornada__linha${h ? "" : " is-folga"}` },
          el("label", { class: "caixa-marcar", for: aberto.id }, aberto, el("span", {}, el("b", { texto: NX.DIAS[dow] }), " ", el("small", { class: "suave", texto: h ? "" : "fechado" }))),
          el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "Abre" }), abre),
          el("span", { class: "jornada__campo" }, el("span", { class: "jornada__rotulo-movel", texto: "Fecha" }), fecha), erro);
        const atualizarLinha = () => { linha.classList.toggle("is-folga", !aberto.checked); abre.disabled = !aberto.checked; fecha.disabled = !aberto.checked; linha.querySelector("small").textContent = aberto.checked ? "" : "fechado"; };
        aberto.addEventListener("change", atualizarLinha);
        atualizarLinha();
        linhas[dow] = { aberto, abre, fecha };
        return linha;
      }));
    const horCartao = cartao("horarios", "Horário de funcionamento", "A agenda só aceita compromissos dentro destes horários. Compromissos já marcados não são apagados.",
      editor, erroHor,
      el("div", { class: "config__botoes" }, C().botao("Salvar horários", "btn--primario btn--pequeno", () => {
        const r = L.salvarHorarios(Object.fromEntries(ordem.map((dow) => [dow, { aberto: linhas[dow].aberto.checked, abre: linhas[dow].abre.value, fecha: linhas[dow].fecha.value }])));
        Object.values(errosDia).forEach((e) => { e.textContent = ""; });
        erroHor.textContent = "";
        if (!r.ok) { Object.entries(r.erros || {}).forEach(([k, m]) => { if (k.startsWith("dia")) errosDia[k.slice(3)].textContent = m; else erroHor.textContent = m; }); return; }
        U.aviso("Horários salvos.");
      }, "save", { "data-foco": "cfg-salvar-horarios" })));

    /* ---------- Orçamentos ---------- */
    const orc = of.orcamento;
    const cOrc = {
      validadeDias: campo("cfg-validade", "Validade padrão (dias)", texto(orc.validadeDias, 3, { inputmode: "numeric" })),
      valorHora: campo("cfg-hora", "Valor da hora de mão de obra (R$)", texto(U.decimal(orc.valorHora), 10, { inputmode: "decimal" })),
      descontoMax: campo("cfg-desconto", "Desconto máximo sem autorização (%)", texto(orc.descontoMax, 2, { inputmode: "numeric" }), { ajuda: "Acima disso, só o administrador pode dar desconto (fica registrado)." }),
      garantia: campo("cfg-garantia", "Texto de garantia", el("textarea", { rows: 2, maxlength: 300 }), { inteira: true, opcional: true }),
    };
    cOrc.garantia.controle.value = orc.garantia || "";
    const orcCartao = cartao("orcamentos", "Orçamentos e mão de obra", "Valem para os próximos orçamentos e itens; os já emitidos mantêm os valores da época.",
      el("div", { class: "campos" }, ...Object.values(cOrc).map((c) => c.caixa)),
      el("div", { class: "config__botoes" }, C().botao("Salvar regras de orçamento", "btn--primario btn--pequeno", () => {
        const r = L.salvarPreferencias("orcamento", valores(cOrc));
        if (!r.ok) { mostrarErros(cOrc, r.erros); return; }
        U.aviso("Regras de orçamento salvas.");
      }, "save", { "data-foco": "cfg-salvar-orc" })));

    /* ---------- Estoque e agenda ---------- */
    const cEst = { minimoPadrao: campo("cfg-minimo", "Estoque mínimo padrão (peças novas)", texto(of.estoque.minimoPadrao, 4, { inputmode: "numeric" })) };
    const cAg = { boxes: campo("cfg-boxes", "Número de boxes (vagas de serviço)", texto(of.boxes, 2, { inputmode: "numeric" }), { ajuda: "Cada box só pode ter um compromisso por vez na agenda." }) };
    const usoBox = d.agenda.filter((a) => a.status === "marcado" && a.box && a.box > of.boxes).length;
    const estCartao = cartao("estoque", "Estoque e agenda", null,
      el("div", { class: "campos" }, cEst.minimoPadrao.caixa, cAg.boxes.caixa),
      usoBox ? el("p", { class: "nota-alerta", texto: `${usoBox} compromisso(s) marcados usam boxes acima do número atual.` }) : null,
      el("ul", { class: "lista-limites" },
        el("li", {}, icone("package", 15), "Colocar peça no orçamento não mexe no estoque."),
        el("li", {}, icone("lock", 15), "A aprovação do orçamento reserva as peças (disponível = saldo − reservado)."),
        el("li", {}, icone("check", 15), "A baixa acontece uma única vez, na finalização do serviço. Não há saldo negativo.")),
      el("div", { class: "config__botoes" }, C().botao("Salvar estoque e agenda", "btn--primario btn--pequeno", () => {
        const r1 = L.salvarPreferencias("estoque", valores(cEst));
        if (!r1.ok) { mostrarErros(cEst, r1.erros); return; }
        const r2 = L.salvarPreferencias("agenda", valores(cAg));
        if (!r2.ok) { mostrarErros(cAg, r2.erros); return; }
        U.aviso("Estoque e agenda salvos.");
      }, "save", { "data-foco": "cfg-salvar-estoque" })));

    /* ---------- Documentos ---------- */
    const doc = of.documentos;
    const mCnpj = caixaMarcar("cfg-doc-cnpj", "Mostrar CNPJ (se preenchido)", doc.mostrarCnpj);
    const mEnd = caixaMarcar("cfg-doc-end", "Mostrar endereço", doc.mostrarEndereco);
    const mGar = caixaMarcar("cfg-doc-gar", "Mostrar texto de garantia", doc.mostrarGarantia);
    const cRod = { rodape: campo("cfg-rodape", "Rodapé dos documentos", el("textarea", { rows: 2, maxlength: 200 }), { inteira: true, opcional: true }) };
    cRod.rodape.controle.value = doc.rodape || "";
    const exemplo = d.ordens.filter((os) => os.status !== "cancelada").sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))[0];
    const docCartao = cartao("documentos", "Documentos (OS e orçamento impressos)", "Valem para imprimir e para salvar em PDF pelo navegador. Os documentos não têm valor fiscal nem assinatura digital.",
      el("div", { class: "opcoes" }, mCnpj.caixa, mEnd.caixa, mGar.caixa), el("div", { class: "campos" }, cRod.rodape.caixa),
      el("div", { class: "config__botoes" },
        C().botao("Salvar documentos", "btn--primario btn--pequeno", () => {
          const r = L.salvarPreferencias("documentos", { mostrarCnpj: mCnpj.i.checked, mostrarEndereco: mEnd.i.checked, mostrarGarantia: mGar.i.checked, rodape: cRod.rodape.controle.value });
          if (!r.ok) { mostrarErros(cRod, r.erros); return; }
          U.aviso("Opções dos documentos salvas.");
        }, "save", { "data-foco": "cfg-salvar-doc" }),
        exemplo ? C().botao("Ver exemplo impresso", "btn--fantasma btn--pequeno", () => NX.documentos.imprimirOS(exemplo), "printer") : null));

    /* ---------- Categorias ---------- */
    const categorias = (tipo, titulo) => {
      const lista = tipo === "servico" ? of.categoriasServico : of.categoriasPeca;
      const entrada = el("input", { type: "text", maxlength: 30, placeholder: "Nova categoria", "aria-label": `Nova categoria de ${titulo.toLowerCase()}`, "data-foco": `cfg-cat-${tipo}` });
      const adicionar = () => { const r = L.adicionarCategoria(tipo, entrada.value); if (!r.ok) { U.aviso(r.erro, "erro"); entrada.focus(); return; } U.aviso("Categoria adicionada."); };
      entrada.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } });
      return el("div", { class: "categorias" }, el("h3", { class: "subtitulo-form", texto: titulo }),
        el("div", { class: "datas-lista" }, ...lista.map((c) => el("span", { class: "data-chip" }, c, el("button", { type: "button", "aria-label": `Remover categoria ${c}`, title: "Remover", onclick: () => { const r = L.removerCategoria(tipo, c); U.aviso(r.ok ? "Categoria removida." : r.erro, r.ok ? "ok" : "erro"); } }, icone("x", 13))))),
        el("div", { class: "adicionar-data" }, entrada, C().botao("Adicionar", "btn--linha btn--pequeno", adicionar, "plus")));
    };
    const catCartao = cartao("categorias", "Categorias", "Usadas nos cadastros de serviços e peças e nos filtros. Uma categoria em uso não pode ser removida.",
      categorias("servico", "Serviços"), categorias("peca", "Peças"));

    /* ---------- Perfis ---------- */
    const acoesDe = (pf) => (pf.acoes === "*" ? ["tudo, inclusive configurações, preços e descontos acima do limite"] : pf.acoes.map((a) => NX.ACOES[a]));
    const perfisCartao = cartao("perfis", "Perfis e permissões", "Simulação no navegador para mostrar como cada função usaria o sistema. Não é login nem segurança: num sistema publicado, as permissões seriam verificadas no servidor.",
      el("ul", { class: "lista-perfis" }, ...NX.PERFIS.map((pf) => el("li", { class: pf.id === O.papel() ? "is-atual" : "" },
        el("div", {}, el("b", { texto: `${pf.nome} · ${pf.usuario}` }), el("p", { class: "suave", texto: pf.descricao }), el("p", { class: "suave", texto: `Pode: ${acoesDe(pf).join("; ")}.` })),
        pf.id === O.papel() ? C().pilulaTom("Em uso", "ok") : C().botao("Usar este perfil", "btn--linha btn--pequeno", () => NX.trocarPerfil(pf.id), "user-cog")))));

    /* ---------- Preferências deste navegador ---------- */
    const pref = NX.preferencias;
    const opcao = (nome, valor, rotulo, marcado, fn) => { const id = `cfg-${nome}-${valor}`; const i = el("input", { type: "radio", name: `cfg-${nome}`, id, value: valor }); i.checked = marcado; i.addEventListener("change", fn); return el("div", { class: "opcao" }, i, el("label", { for: id, texto: rotulo })); };
    const prefCartao = cartao("preferencias", "Preferências deste navegador", "Valem só aqui e mudam na hora.",
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Tema" }), el("div", { class: "opcoes__lista" },
        ...[["dark", "Escuro (padrão)"], ["light", "Claro"], ["auto", "Igual ao aparelho"]].map(([v, t]) => opcao("tema", v, t, (Comum.preferenciaTema() || "dark") === v, () => { Comum.definirTema(v); U.aviso(`Tema: ${t.toLowerCase()}.`); })))),
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Densidade das tabelas" }), el("div", { class: "opcoes__lista" },
        opcao("densidade", "confortavel", "Confortável", pref.densidade !== "compacta", () => NX.salvarPreferencias({ densidade: "confortavel" }, "Densidade confortável.")),
        opcao("densidade", "compacta", "Compacta", pref.densidade === "compacta", () => NX.salvarPreferencias({ densidade: "compacta" }, "Densidade compacta.")))),
      el("fieldset", { class: "opcoes" }, el("legend", { texto: "Itens por página nas listas" }), el("div", { class: "opcoes__lista" },
        ...[10, 20, 50].map((n) => opcao("porpagina", String(n), String(n), pref.porPagina === n, () => NX.salvarPreferencias({ porPagina: n }, `${n} itens por página.`))))));

    /* ---------- Dados e limites ---------- */
    const kb = Math.round(L.tamanhoSalvo() / 1024);
    const conf = O.conferir();
    const dadosCartao = cartao("dados", "Dados da demonstração", null,
      el("p", { class: conf.ok ? "nota-ok" : "nota-alerta" }, icone(conf.ok ? "shield-check" : "triangle-alert", 15), conf.ok ? "Conferência dos dados: sem estoque negativo, sem baixa em dobro, sem recebimento maior que o faturado e sem conflito na agenda." : `Conferência encontrou ${conf.problemas.length} problema(s): ${conf.problemas.slice(0, 3).join("; ")}`),
      el("ul", { class: "lista-limites" },
        el("li", {}, icone("hard-drive", 15), `Tudo fica no armazenamento local deste navegador (cerca de ${U.numero(kb)} KB). Outro navegador ou aparelho não vê estes dados.`),
        el("li", {}, icone("server-off", 15), "Esta versão roda só no navegador e não está pronta para uso real numa oficina: não há servidor, login, banco de dados nem cópia de segurança automática. Os registros já levam o identificador da oficina, para que cada empresa tenha seus dados separados quando houver servidor."),
        el("li", {}, icone("unplug", 15), "O estoque é um módulo interno do NEXORA AUTO: ele não está conectado ao NEXORA STOCK nem a outro sistema."),
        el("li", {}, icone("shield-check", 15), "Nenhuma mensagem é enviada, nenhum pagamento é processado e nenhuma consulta de placa é feita em bases oficiais.")),
      el("div", { class: "config__botoes" },
        C().botao("Baixar cópia dos dados (JSON)", "btn--linha btn--pequeno", () => {
          const blob = new Blob([JSON.stringify(L.dados, null, 2)], { type: "application/json" });
          const link = el("a", { href: URL.createObjectURL(blob), download: `nexora-auto-dados-${U.hoje()}.json` });
          document.body.append(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(link.href), 2000);
          U.aviso("Cópia dos dados gerada (arquivo JSON).");
        }, "download")));
    const perigoCartao = el("article", { class: "cartao config zona-perigo" }, el("div", {}, el("h2", { class: "cartao__titulo", texto: "Restaurar dados de exemplo" }), el("p", { class: "cartao__sub", texto: "Apaga tudo o que foi feito nesta demonstração e monta de novo a oficina de exemplo, com histórico a partir de hoje." })),
      el("div", { class: "config__botoes" }, C().botao("Restaurar dados de exemplo", "btn--perigo btn--pequeno", () => NX.restaurarDados(), "rotate-ccw", { "data-foco": "cfg-restaurar" })));

    U.trocar(p.corpo, el("div", { class: "config-grade" },
      el("div", { class: "config-coluna" }, ofCartao, horCartao, docCartao, perfisCartao),
      el("div", { class: "config-coluna" }, orcCartao, estCartao, catCartao, prefCartao, dadosCartao, perigoCartao)));
  }
  const atualizar = C().comFoco(desenhar);
  NX.telas.configuracoes = { titulo: "Configurações", montar, atualizar };
})();
