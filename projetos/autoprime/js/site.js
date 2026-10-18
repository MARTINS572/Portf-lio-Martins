/* ==========================================================================
   AUTOPRIME — site.js
   Tema, menu do celular, cabeçalho e animações de entrada: assets/js/comum.js.
   Aqui: contatos (a partir de js/config.js), fotos opcionais, menu ativo,
   "o que você percebeu no carro", galeria ampliada e pedido de orçamento.
   ========================================================================== */

(function () {
  "use strict";

  const O = window.APOrcamento;
  const CFG = window.AUTOPRIME_CONFIG || {};
  const EMPRESA = Object.assign({ nome: "AutoPrime Centro Automotivo", nomeCurto: "AutoPrime", endereco: {}, horarios: [], redes: {} }, CFG.empresa || {});
  const MENSAGENS = Object.assign({ orcamento: "Olá, {nome}! Vim pelo site e gostaria de um orçamento.", duvida: "Olá, {nome}! Vim pelo site e gostaria de tirar uma dúvida." }, CFG.mensagens || {});

  const $ = (seletor, base = document) => base.querySelector(seletor);
  const $$ = (seletor, base = document) => [...base.querySelectorAll(seletor)];
  const reduzir = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Cria elementos sem innerHTML (os textos nunca viram código) */
  function el(tag, atributos, ...filhos) {
    const no = document.createElement(tag);
    Object.entries(atributos || {}).forEach(([chave, valor]) => {
      if (valor == null || valor === false) return;
      if (chave === "texto") no.textContent = valor;
      else if (chave === "classe") no.className = valor;
      else no.setAttribute(chave, valor === true ? "" : valor);
    });
    filhos.flat().forEach((filho) => { if (filho != null && filho !== false) no.append(filho.nodeType ? filho : document.createTextNode(filho)); });
    return no;
  }
  function icone(nome, tamanho = 20) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", tamanho); svg.setAttribute("height", tamanho); svg.setAttribute("aria-hidden", "true");
    const uso = document.createElementNS("http://www.w3.org/2000/svg", "use");
    uso.setAttribute("href", `#i-${nome}`);
    svg.append(uso);
    return svg;
  }

  /* ----------------------------------------------------------------------
     DADOS DA EMPRESA (config.js) → contatos, mapa, rodapé, Google
     ---------------------------------------------------------------------- */
  const whatsappOk = O.whatsappValido(EMPRESA.whatsapp);
  const telefoneDigitos = (() => {
    if (!EMPRESA.telefone) return "";
    const t = O.analisarTelefone(EMPRESA.telefone);
    if (!t.ok) { console.warn(`config.js: telefone "${EMPRESA.telefone}" não parece válido; ele não será mostrado.`); return ""; }
    return t.digitos;
  })();
  const emailOk = EMPRESA.email && O.emailValido(String(EMPRESA.email).trim());
  if (EMPRESA.whatsapp && !whatsappOk) console.warn(`config.js: WhatsApp "${EMPRESA.whatsapp}" fora do formato 55 + DDD + número (só dígitos); o botão fica desativado.`);
  if (EMPRESA.email && !emailOk) console.warn(`config.js: e-mail "${EMPRESA.email}" não parece válido; ele não será mostrado.`);

  const end = EMPRESA.endereco || {};
  const enderecoPreenchido = Boolean(end.logradouro && end.cidade);
  const linhaEndereco1 = [end.logradouro, end.numero].filter(Boolean).join(", ") + (end.complemento ? ` · ${end.complemento}` : "");
  const linhaEndereco2 = [end.bairro, [end.cidade, end.uf].filter(Boolean).join(" – "), end.cep].filter(Boolean).join(" · ");
  const enderecoBusca = [end.logradouro, end.numero, end.bairro, end.cidade, end.uf, end.cep].filter(Boolean).join(", ");

  function urlSegura(url) {
    try { const u = new URL(url); return u.protocol === "https:" ? u.href : ""; } catch (erro) { return ""; }
  }

  function canal(nome, rotulo, valor, href, externo) {
    if (!valor) {
      return el("li", { classe: "canal canal--vazio" }, icone(nome, 22),
        el("div", {}, el("span", { classe: "canal__rotulo", texto: rotulo }), el("span", { classe: "canal__valor", texto: "A configurar" })));
    }
    return el("li", { classe: "canal" }, icone(nome, 22),
      el("div", {}, el("span", { classe: "canal__rotulo", texto: rotulo }),
        el("a", { classe: "canal__valor", href, target: externo ? "_blank" : null, rel: externo ? "noopener" : null, texto: valor })));
  }

  function prepararContatos() {
    const lista = $("[data-canais]");
    const linkWhatsDuvida = whatsappOk ? O.linkWhatsapp(EMPRESA.whatsapp, O.preencherModelo(MENSAGENS.duvida, EMPRESA)) : "";
    const telFormatado = telefoneDigitos ? O.analisarTelefone(telefoneDigitos).formatado : "";
    const whatsFormatado = whatsappOk ? O.analisarTelefone(EMPRESA.whatsapp).formatado : "";
    const nenhum = !whatsappOk && !telefoneDigitos && !emailOk;

    if (lista) {
      lista.replaceChildren(
        canal("message-circle", "WhatsApp", whatsFormatado, linkWhatsDuvida, true),
        canal("phone", "Telefone", telFormatado, telefoneDigitos ? `tel:+55${telefoneDigitos}` : ""),
        canal("mail", "E-mail", emailOk ? EMPRESA.email.trim() : "", emailOk ? `mailto:${EMPRESA.email.trim()}` : ""),
      );
      if (nenhum) {
        lista.after(el("p", { classe: "canais__demo" }, icone("info", 18),
          el("span", { texto: "Demonstração: a AutoPrime é fictícia, por isso telefone, WhatsApp, e-mail e endereço ficam vazios até serem configurados." })));
      }
    }

    // Horário
    const horarios = (EMPRESA.horarios || []).filter((h) => h && h.dias && h.horas);
    const caixaHorario = $("[data-horarios]");
    if (caixaHorario && horarios.length) {
      caixaHorario.replaceChildren(el("dl", { classe: "horarios" },
        horarios.map((h) => el("div", {}, el("dt", { texto: h.dias }), el("dd", { texto: h.horas })))));
    }

    // Endereço e mapa
    const local = $("[data-local]");
    if (local && enderecoPreenchido) {
      const partes = [
        el("p", { classe: "local__titulo" }, icone("map-pin", 20), el("span", { texto: "Endereço" })),
        el("address", {}, linhaEndereco1, el("br"), linhaEndereco2),
      ];
      if (EMPRESA.enderecoConfirmado) {
        const destino = encodeURIComponent(enderecoBusca);
        partes.push(
          el("iframe", { classe: "local__mapa", title: `Mapa: ${linhaEndereco1}`, loading: "lazy", referrerpolicy: "no-referrer-when-downgrade", src: `https://www.google.com/maps?q=${destino}&output=embed` }),
          el("a", { classe: "btn btn--linha", href: `https://www.google.com/maps/dir/?api=1&destination=${destino}`, target: "_blank", rel: "noopener" }, icone("navigation", 18), "Como chegar"),
        );
      } else {
        partes.push(el("p", { classe: "canal__vazio", texto: "O mapa e o botão “Como chegar” aparecem quando o endereço for marcado como confirmado na configuração." }));
      }
      local.replaceChildren(el("div", { classe: "local__dados" }, partes));
    }

    // Rodapé
    const rodape = $("[data-rodape-contatos]");
    if (rodape) {
      const itens = [];
      if (whatsappOk) itens.push(el("li", {}, el("a", { href: linkWhatsDuvida, target: "_blank", rel: "noopener", texto: `WhatsApp ${whatsFormatado}` })));
      if (telefoneDigitos) itens.push(el("li", {}, el("a", { href: `tel:+55${telefoneDigitos}`, texto: telFormatado })));
      if (emailOk) itens.push(el("li", {}, el("a", { href: `mailto:${EMPRESA.email.trim()}`, texto: EMPRESA.email.trim() })));
      if (enderecoPreenchido) itens.push(el("li", {}, el("span", { texto: [end.cidade, end.uf].filter(Boolean).join(" – ") })));
      itens.push(el("li", {}, el("a", { href: "#orcamento", texto: "Pedido de orçamento" })));
      if (nenhum) itens.push(el("li", { classe: "rodape__vazio", texto: "Canais a configurar" }));
      rodape.replaceChildren(...itens);
    }

    // Redes sociais: só com endereço válido
    const redes = $("[data-redes]");
    const NOMES = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" };
    const validas = Object.entries(EMPRESA.redes || {}).map(([rede, url]) => [rede, urlSegura(url)]).filter(([, url]) => url);
    if (redes && validas.length) {
      redes.replaceChildren(...validas.map(([rede, url]) => el("li", {}, el("a", { href: url, target: "_blank", rel: "noopener" }, NOMES[rede] || rede, icone("external-link", 14)))));
      redes.hidden = false;
    }

    // Botão flutuante e textos que só valem para a demonstração
    const flutuante = $("[data-whats-flutuante]");
    if (flutuante && whatsappOk) {
      flutuante.href = linkWhatsDuvida; flutuante.target = "_blank"; flutuante.rel = "noopener"; flutuante.hidden = false;
    }
    if (whatsappOk) $$("[data-so-demo]").forEach((no) => no.remove());

    // Dados estruturados para o Google: só com endereço confirmado (nada de empresa em endereço inexistente)
    if (EMPRESA.enderecoConfirmado && enderecoPreenchido) {
      const dados = {
        "@context": "https://schema.org",
        "@type": "AutoRepair",
        name: EMPRESA.nome,
        address: {
          "@type": "PostalAddress",
          streetAddress: [end.logradouro, end.numero, end.complemento].filter(Boolean).join(", "),
          addressLocality: end.cidade, addressRegion: end.uf || undefined, postalCode: end.cep || undefined, addressCountry: "BR",
        },
      };
      if (telefoneDigitos) dados.telephone = `+55${telefoneDigitos}`;
      if (emailOk) dados.email = EMPRESA.email.trim();
      const url = urlSegura(CFG.urlPublica || "");
      if (url) dados.url = url;
      document.head.append(el("script", { type: "application/ld+json", texto: JSON.stringify(dados) }));
    }
  }

  /* ----------------------------------------------------------------------
     FOTOS OPCIONAIS: troca a ilustração pela foto quando ela existe
     ---------------------------------------------------------------------- */
  function prepararFotos() {
    const fotos = CFG.fotos;
    if (!fotos || !fotos.usar) return;
    $$("[data-slot]").forEach((alvo) => {
      const item = fotos.arquivos && fotos.arquivos[alvo.dataset.slot];
      if (!item) return;
      const arquivo = typeof item === "string" ? item : item.arquivo;
      const caminho = `${fotos.pasta || ""}${arquivo}`;
      const teste = new Image();
      teste.decoding = "async";
      teste.addEventListener("error", () => console.warn(`Foto não encontrada: ${caminho} (a ilustração continua no lugar)`));
      teste.addEventListener("load", () => {
        const alt = (typeof item === "object" && item.alt) || "";
        if (alvo.tagName === "IMG") {
          alvo.src = caminho;
          alvo.alt = alt || alvo.alt.replace(/^Ilustração (de |do |da )?/i, "Foto: ");
          alvo.classList.add("e-foto");
        } else {
          teste.className = "palco__foto";
          teste.alt = alt || alvo.dataset.alt || "";
          alvo.append(teste);
          alvo.classList.add("tem-foto");
          $$(".palco__carro, .palco__reflexo, .palco__legenda", alvo).forEach((n) => n.setAttribute("hidden", ""));
        }
      });
      teste.src = caminho;
    });
  }

  /* ----------------------------------------------------------------------
     MENU: destaca a seção visível
     ---------------------------------------------------------------------- */
  function prepararMenuAtivo() {
    if (!("IntersectionObserver" in window)) return;
    const links = $$(".menu__link");
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        links.forEach((link) => link.classList.toggle("is-ativo", link.getAttribute("href") === `#${entrada.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((link) => { const secao = $(link.getAttribute("href")); if (secao) observador.observe(secao); });
  }

  /* ----------------------------------------------------------------------
     O QUE VOCÊ PERCEBEU NO CARRO (abas + pontos no desenho)
     ---------------------------------------------------------------------- */
  function prepararSintomas() {
    const abas = $$("[data-abas] [role=tab]");
    if (!abas.length) return;
    const pontos = $$(".ponto");
    const paineis = abas.map((aba) => document.getElementById(aba.getAttribute("aria-controls")));

    function selecionar(chave, focar) {
      abas.forEach((aba, i) => {
        const ativa = aba.dataset.ponto === chave;
        aba.setAttribute("aria-selected", String(ativa));
        aba.tabIndex = ativa ? 0 : -1;
        paineis[i].hidden = !ativa;
        if (ativa) {
          paineis[i].classList.remove("is-entrando"); void paineis[i].offsetWidth; paineis[i].classList.add("is-entrando");
          if (focar) aba.focus();
        }
      });
      pontos.forEach((ponto) => ponto.classList.toggle("is-ativo", ponto.dataset.ponto === chave));
    }

    abas.forEach((aba, i) => {
      aba.addEventListener("click", () => selecionar(aba.dataset.ponto));
      aba.addEventListener("keydown", (evento) => {
        const passos = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let destino = null;
        if (evento.key in passos) destino = abas[(i + passos[evento.key] + abas.length) % abas.length];
        if (evento.key === "Home") destino = abas[0];
        if (evento.key === "End") destino = abas[abas.length - 1];
        if (destino) { evento.preventDefault(); selecionar(destino.dataset.ponto, true); }
      });
    });
    pontos.forEach((ponto) => ponto.addEventListener("click", () => selecionar(ponto.dataset.ponto)));
    selecionar(abas[0].dataset.ponto);
    paineis.forEach((p) => p.classList.remove("is-entrando"));
  }

  /* ----------------------------------------------------------------------
     GALERIA AMPLIADA
     ---------------------------------------------------------------------- */
  function prepararGaleria() {
    const botoes = $$("[data-galeria] .galeria__botao");
    const janela = $("#lightbox");
    if (!botoes.length || !janela) return;
    const imagem = $("[data-lb-img]", janela);
    const legenda = $("[data-lb-legenda]", janela);
    const contador = $("[data-lb-contador]", janela);
    let atual = 0;
    let origem = null;

    botoes.forEach((botao) => botao.setAttribute("aria-label", `Ampliar imagem: ${botao.dataset.legenda}`));

    function mostrar(indice) {
      atual = (indice + botoes.length) % botoes.length;
      const miniatura = $("img", botoes[atual]);
      imagem.src = miniatura.currentSrc || miniatura.src;
      imagem.width = miniatura.naturalWidth || Number(miniatura.getAttribute("width"));
      imagem.height = miniatura.naturalHeight || Number(miniatura.getAttribute("height"));
      imagem.alt = miniatura.alt;
      legenda.textContent = botoes[atual].dataset.legenda;
      contador.textContent = `${atual + 1} de ${botoes.length}`;
    }

    botoes.forEach((botao, i) => botao.addEventListener("click", () => {
      origem = botao;
      mostrar(i);
      Comum.abrirDialogo(janela);
    }));
    $$("[data-lb]", janela).forEach((b) => b.addEventListener("click", () => mostrar(atual + Number(b.dataset.lb))));
    janela.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowRight") { evento.preventDefault(); mostrar(atual + 1); }
      if (evento.key === "ArrowLeft") { evento.preventDefault(); mostrar(atual - 1); }
    });
    // Deslizar o dedo para os lados troca a imagem
    let inicioX = null;
    imagem.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });
    imagem.addEventListener("pointerup", (e) => {
      if (inicioX == null) return;
      const dx = e.clientX - inicioX; inicioX = null;
      if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
    });
    janela.addEventListener("close", () => { if (origem) origem.focus(); });
  }

  /* ----------------------------------------------------------------------
     PEDIDO DE ORÇAMENTO
     ---------------------------------------------------------------------- */
  function prepararOrcamento() {
    const caixa = $("#orcamento");
    const form = $("#form-orcamento");
    if (!caixa || !form) return;
    const select = $("#f-servico");
    const revisao = $("#revisao");
    const resumoErros = $("#form-resumo");
    const contador = $("[data-contador]");
    const status = $("[data-status]", revisao);
    const btnWhats = $("[data-enviar-whats]", revisao);
    const btnEmail = $("[data-enviar-email]", revisao);
    const btnNovo = $("[data-novo]", revisao);
    const anuncio = el("p", { classe: "visualmente-oculto", "aria-live": "polite" });
    caixa.append(anuncio);

    // Lista de serviços: lida dos cards da seção Serviços (um lugar só para editar)
    const SERVICOS = {};
    $$("[data-servico]").forEach((item) => {
      const nome = $(".servico__nome", item).textContent.trim();
      SERVICOS[item.dataset.servico] = nome;
      select.add(new Option(nome, item.dataset.servico));
    });
    SERVICOS["nao-sei"] = "Não sei, preciso de uma avaliação";
    select.add(new Option(SERVICOS["nao-sei"], "nao-sei"));

    const CAMPOS = ["nome", "telefone", "email", "marca", "modelo", "ano", "servico", "descricao", "consentimento"];
    const campo = (nome) => form.elements[nome];
    let tentou = false;
    let pedido = null;
    let mensagem = "";
    let ultimoEnvio = null;
    let ocupado = false;

    function lerDados() {
      const d = {};
      CAMPOS.forEach((nome) => { d[nome] = nome === "consentimento" ? campo(nome).checked : campo(nome).value; });
      d.periodo = campo("periodo").value;
      return d;
    }
    const validar = () => O.validar(lerDados(), { servicos: SERVICOS, anoAtual: new Date().getFullYear() });

    function mostrarErro(nome, texto) {
      const entrada = campo(nome);
      const caixaErro = $(`#f-${nome}-erro`);
      if (texto) {
        entrada.setAttribute("aria-invalid", "true");
        caixaErro.replaceChildren(icone("circle-alert", 16), el("span", { texto }));
        caixaErro.hidden = false;
      } else {
        entrada.removeAttribute("aria-invalid");
        caixaErro.replaceChildren();
        caixaErro.hidden = true;
      }
    }

    function conferirCampo(nome) {
      const r = validar();
      mostrarErro(nome, r.erros[nome]);
      if (tentou) atualizarResumo(r);
      return r;
    }

    function atualizarResumo(r) {
      const qtd = Object.keys(r.erros).length;
      if (!qtd) { resumoErros.hidden = true; resumoErros.replaceChildren(); return; }
      resumoErros.replaceChildren(icone("circle-alert", 20), el("span", { texto: qtd === 1 ? "Falta corrigir 1 campo, destacado abaixo." : `Falta corrigir ${qtd} campos, destacados abaixo.` }));
      resumoErros.hidden = false;
    }

    // Validação enquanto a pessoa preenche: no blur (formato) e, depois da 1ª tentativa, a cada mudança
    CAMPOS.forEach((nome) => {
      const entrada = campo(nome);
      const evento = entrada.type === "checkbox" || entrada.tagName === "SELECT" ? "change" : "input";
      entrada.addEventListener(evento, () => { if (tentou || entrada.getAttribute("aria-invalid") === "true") conferirCampo(nome); });
      entrada.addEventListener("blur", () => {
        if (entrada.type === "checkbox") return;
        if (tentou || entrada.value.trim()) {
          const r = conferirCampo(nome);
          if (nome === "telefone" && !r.erros.telefone) entrada.value = r.valores.telefone;
        }
      });
    });
    const descricao = campo("descricao");
    const contar = () => { contador.textContent = String(descricao.value.length); };
    descricao.addEventListener("input", contar);

    function etapa(n) {
      $$(".passos__item", caixa).forEach((item) => {
        const atual = Number(item.dataset.passo) === n;
        item.classList.toggle("is-atual", atual);
        item.classList.toggle("is-feito", Number(item.dataset.passo) < n);
        if (atual) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
      });
      form.hidden = n !== 1;
      revisao.hidden = n !== 2;
    }

    function rolarPara(alvo) {
      const topo = alvo.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: topo, behavior: reduzir() ? "auto" : "smooth" });
    }

    function limparStatus() { status.hidden = true; status.replaceChildren(); status.className = "status"; }

    /* Mensagem de resultado: tipo = ok | demo | alerta | erro */
    function mostrarStatus(tipo, titulo, texto, ...extras) {
      const icones = { ok: "circle-check", demo: "info", alerta: "triangle-alert", erro: "circle-alert" };
      status.className = `status status--${tipo}`;
      status.replaceChildren(icone(icones[tipo], 20), el("div", {}, el("strong", { texto: titulo }), texto ? el("p", { texto }) : null, ...extras));
      status.hidden = false;
    }

    // Etapa 1 → 2
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      if (ocupado) return;
      tentou = true;
      const r = validar();
      CAMPOS.forEach((nome) => mostrarErro(nome, r.erros[nome]));
      atualizarResumo(r);
      if (!r.ok) {
        const primeiro = CAMPOS.find((nome) => r.erros[nome]);
        campo(primeiro).focus();
        return;
      }
      pedido = r.valores;
      campo("telefone").value = pedido.telefone;
      mensagem = O.montarMensagem(pedido, EMPRESA, MENSAGENS.orcamento);
      montarRevisao();
      etapa(2);
      limparStatus();
      btnNovo.hidden = true;
      rolarPara(caixa);
      revisao.focus({ preventScroll: true });
    });

    function montarRevisao() {
      const linhas = [
        ["Nome", pedido.nome],
        ["Telefone", pedido.telefone],
        pedido.email ? ["E-mail", pedido.email] : null,
        ["Veículo", [pedido.marca, pedido.modelo, pedido.ano].filter(Boolean).join(" ")],
        ["Serviço", pedido.servicoNome],
        pedido.periodo ? ["Melhor período", pedido.periodo] : null,
      ].filter(Boolean);
      $("[data-resumo]", revisao).replaceChildren(...linhas.map(([dt, dd]) => el("div", {}, el("dt", { texto: dt }), el("dd", { texto: dd }))));
      $("[data-mensagem]", revisao).textContent = mensagem;
      if (emailOk) {
        btnEmail.href = O.linkEmail(EMPRESA.email.trim(), `Pedido de orçamento: ${pedido.servicoNome}`, mensagem);
        btnEmail.hidden = false;
      }
    }

    function processando(sim) {
      ocupado = sim;
      btnWhats.classList.toggle("is-processando", sim);
      btnWhats.setAttribute("aria-disabled", String(sim));
      $("[data-rotulo]", btnWhats).textContent = sim ? "Abrindo o WhatsApp…" : "Enviar pelo WhatsApp";
    }

    function linkWhats(texto) {
      return el("a", { href: O.linkWhatsapp(EMPRESA.whatsapp, mensagem), target: "_blank", rel: "noopener", classe: "status__link" }, texto, icone("external-link", 14));
    }

    function abrirWhatsapp() {
      processando(true);
      let janela = null;
      try { janela = window.open(O.linkWhatsapp(EMPRESA.whatsapp, mensagem), "_blank"); } catch (erro) { janela = null; }
      if (janela) {
        try { janela.opener = null; } catch (erro) { /* outra origem: sem problema */ }
        ultimoEnvio = { assinatura: O.assinatura(mensagem), quando: Date.now() };
        mostrarStatus("ok", "WhatsApp aberto em outra aba, com a mensagem pronta.",
          "O pedido só chega à AutoPrime quando você tocar em Enviar no WhatsApp.",
          el("p", {}, linkWhats("Se a conversa não apareceu, abra por este link")));
        btnNovo.hidden = false;
      } else {
        mostrarStatus("alerta", "O navegador bloqueou a nova aba: o WhatsApp não foi aberto.",
          "Toque no link para abrir a conversa com a mensagem pronta:", el("p", {}, linkWhats("Abrir o WhatsApp")));
      }
      setTimeout(() => processando(false), 1500);
    }

    btnWhats.addEventListener("click", () => {
      if (ocupado || !pedido) return;
      if (!whatsappOk) {
        processando(true);
        setTimeout(() => {
          processando(false);
          mostrarStatus("demo", "Nada foi enviado.",
            "Esta demonstração não tem número de WhatsApp configurado, por isso o WhatsApp não foi aberto. A mensagem acima é exatamente o que a oficina receberia; você pode copiá-la.");
        }, 450);
        return;
      }
      const repetido = ultimoEnvio && ultimoEnvio.assinatura === O.assinatura(mensagem) && Date.now() - ultimoEnvio.quando < 10 * 60 * 1000;
      if (repetido) {
        const hora = new Date(ultimoEnvio.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const reabrir = el("button", { type: "button", classe: "btn btn--linha btn--pequeno" }, "Abrir o WhatsApp de novo");
        reabrir.addEventListener("click", abrirWhatsapp);
        mostrarStatus("alerta", `Você já abriu o WhatsApp com esta mesma mensagem às ${hora}.`, "Se ela não foi enviada, abra de novo. Se foi, não precisa repetir.", reabrir);
        return;
      }
      abrirWhatsapp();
    });

    $("[data-copiar]", revisao).addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error("sem área de transferência");
        await navigator.clipboard.writeText(mensagem);
        mostrarStatus("ok", "Mensagem copiada.", "Cole no WhatsApp, no e-mail ou onde preferir.");
      } catch (erro) {
        const pre = $("[data-mensagem]", revisao);
        const faixa = document.createRange(); faixa.selectNodeContents(pre);
        const selecao = window.getSelection(); selecao.removeAllRanges(); selecao.addRange(faixa);
        mostrarStatus("alerta", "Não foi possível copiar automaticamente.", "O texto da mensagem foi selecionado: use a opção Copiar do seu aparelho.");
      }
    });

    btnEmail.addEventListener("click", () => {
      mostrarStatus("ok", "Seu aplicativo de e-mail foi chamado com a mensagem pronta.", "O pedido só chega quando você enviar o e-mail por lá. Se nada abriu, use “Copiar mensagem”.");
    });

    $("[data-editar]", revisao).addEventListener("click", () => {
      etapa(1);
      rolarPara(caixa);
      campo("nome").focus({ preventScroll: true });
    });

    btnNovo.addEventListener("click", () => {
      form.reset();
      contar();
      CAMPOS.forEach((nome) => mostrarErro(nome, ""));
      resumoErros.hidden = true;
      tentou = false; pedido = null; mensagem = ""; ultimoEnvio = null;
      etapa(1);
      rolarPara(caixa);
      campo("nome").focus({ preventScroll: true });
      anuncio.textContent = "Formulário limpo para um novo pedido.";
    });

    // Botões "Solicitar orçamento" dos serviços, dos sinais do carro e do rodapé
    function escolherServico(codigo) {
      if (!SERVICOS[codigo]) return false;
      select.value = codigo;
      if (tentou || select.getAttribute("aria-invalid") === "true") conferirCampo("servico");
      select.classList.remove("is-destacado"); void select.offsetWidth; select.classList.add("is-destacado");
      anuncio.textContent = `Serviço “${SERVICOS[codigo]}” selecionado no formulário de orçamento.`;
      return true;
    }
    document.addEventListener("click", (evento) => {
      const link = evento.target.closest("[data-pedir]");
      if (!link || !escolherServico(link.dataset.pedir)) return;
      evento.preventDefault();
      if (!revisao.hidden) etapa(1);
      rolarPara(caixa);
      const vazio = ["nome", "telefone", "marca", "modelo", "descricao"].map(campo).find((c) => !c.value.trim());
      (vazio || campo("nome")).focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, "", "#orcamento");
    });

    // Link direto com o serviço: index.html?servico=freios-suspensao#orcamento
    const doLink = new URLSearchParams(location.search).get("servico");
    if (doLink) escolherServico(doLink);
    contar();
  }

  document.addEventListener("DOMContentLoaded", () => {
    prepararContatos();
    prepararFotos();
    prepararMenuAtivo();
    prepararSintomas();
    prepararGaleria();
    prepararOrcamento();
  });
})();
