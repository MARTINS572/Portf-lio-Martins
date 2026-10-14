/* ==========================================================================
   Martins | Criação de Sites — script.js (portfólio)
   --------------------------------------------------------------------------
   Tema, menu do celular, cabeçalho e animações ficam em assets/js/comum.js.
   Aqui ficam as configurações e o que é só do portfólio.
   ========================================================================== */


/* ------------------------------------------------------------------------
   CONFIGURAÇÕES — EDITE AQUI
   ------------------------------------------------------------------------ */
const CONFIG = {
  // Seu WhatsApp, só com números: 55 (Brasil) + DDD + número.
  // Celular fica com 13 dígitos no total. Enquanto estiver vazio, os botões
  // avisam que o número não foi configurado (não abrem contato inexistente).
  whatsapp: "",

  // Mensagem usada pelos botões que não têm uma mensagem própria
  mensagemPadrao: "Olá, Martins! Vi seu portfólio e quero conversar sobre a criação de um site.",

  // Redes sociais: cole o link completo (começando com https://).
  // As que ficarem vazias não aparecem.
  redes: {
    Instagram: "",
    LinkedIn: "",
    GitHub: "",
    Behance: "",
  },

  // Projetos de clientes reais.
  // site: endereço do site no ar (se mudar para .com.br, troque só aqui).
  // print: imagem da tela do site para a capa (ex.: "assets/images/clientes/nails-by-bratz.jpg").
  //        Enquanto estiver "", a capa mostra a ilustração.
  clientes: {
    "nails-by-bratz": {
      site: "https://nailsbybratz.pythonanywhere.com",
      print: "",
    },
  },

  // Fotos das capas dos projetos demonstrativos (pasta assets/images/portfolio/).
  // Depois de colocar os arquivos, mude para true. Veja assets/images/LEIA-ME.md.
  usarFotos: false,
};


/* ------------------------------------------------------------------------
   WHATSAPP
   Todo elemento com a classe "js-whatsapp" vira um link do WhatsApp.
   A mensagem vem do atributo data-msg (ou da mensagem padrão).
   ------------------------------------------------------------------------ */
function avisoNumero() {
  return CONFIG.whatsapp
    ? "O número de WhatsApp em script.js está em um formato inválido. Use só números: 55 + DDD + número."
    : "O número de WhatsApp ainda não foi configurado. Edite CONFIG.whatsapp no arquivo script.js.";
}

function prepararWhatsapp() {
  const botoes = document.querySelectorAll(".js-whatsapp");

  if (!Comum.whatsappValido(CONFIG.whatsapp)) {
    console.warn(avisoNumero());
    botoes.forEach((botao) => {
      botao.addEventListener("click", (evento) => {
        evento.preventDefault();
        Comum.aviso(avisoNumero());
      });
    });
    return;
  }

  botoes.forEach((botao) => {
    botao.href = Comum.linkWhatsapp(CONFIG.whatsapp, botao.dataset.msg || CONFIG.mensagemPadrao);
    botao.target = "_blank";
    botao.rel = "noopener";
  });

  // Número formatado na seção de contato: +55 (DD) 99999-9999
  const n = CONFIG.whatsapp;
  const resto = n.slice(4);
  const corte = resto.length - 4;
  const numero = document.getElementById("whatsapp-numero");
  numero.textContent = `+55 (${n.slice(2, 4)}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
  numero.hidden = false;
}


/* ------------------------------------------------------------------------
   FORMULÁRIO → WHATSAPP
   Não existe servidor: o formulário confere os campos, monta a mensagem e
   abre o WhatsApp. A mensagem de sucesso só diz o que realmente aconteceu.
   ------------------------------------------------------------------------ */
function prepararFormulario() {
  const form = document.getElementById("form-contato");
  const status = document.getElementById("form-status");

  const regras = [
    { id: "f-nome", testar: (v) => v.length >= 2, erro: "Escreva seu nome." },
    { id: "f-negocio", testar: (v) => v.length >= 2, erro: "Escreva o nome do negócio." },
    { id: "f-servico", testar: (v) => v !== "", erro: "Escolha o serviço desejado." },
    { id: "f-descricao", testar: (v) => v.length >= 20, erro: "Conte um pouco mais sobre o projeto (pelo menos 20 caracteres)." },
  ];

  const mostrarStatus = (tipo, conteudo) => {
    status.className = `formulario__status is-${tipo}`;
    status.replaceChildren(...[].concat(conteudo));
    status.hidden = false;
  };

  const validarCampo = ({ id, testar, erro }) => {
    const campo = document.getElementById(id);
    const valido = testar(campo.value.trim());
    campo.setAttribute("aria-invalid", String(!valido));
    document.getElementById(`${id}-erro`).textContent = valido ? "" : erro;
    return valido;
  };

  // Corrige o aviso de erro enquanto a pessoa digita
  regras.forEach((regra) => {
    const campo = document.getElementById(regra.id);
    campo.addEventListener("input", () => {
      if (campo.getAttribute("aria-invalid") === "true") validarCampo(regra);
    });
    campo.addEventListener("blur", () => {
      if (campo.value.trim()) validarCampo(regra);
    });
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    status.hidden = true;

    // 1. Validação de todos os campos
    const invalidos = regras.filter((regra) => !validarCampo(regra));
    if (invalidos.length) {
      mostrarStatus("erro", "Confira os campos destacados antes de continuar.");
      document.getElementById(invalidos[0].id).focus();
      return;
    }

    // 2. Sem número configurado, não finge que enviou
    if (!Comum.whatsappValido(CONFIG.whatsapp)) {
      mostrarStatus("erro", avisoNumero());
      return;
    }

    // 3. Monta a mensagem
    const dados = new FormData(form);
    const mensagem = [
      `Olá, Martins! Meu nome é ${dados.get("nome").trim()}, do negócio ${dados.get("negocio").trim()}.`,
      `Serviço desejado: ${dados.get("servico")}.`,
      "",
      dados.get("descricao").trim(),
    ].join("\n");
    const link = Comum.linkWhatsapp(CONFIG.whatsapp, mensagem);

    // 4. Abre o WhatsApp; se o navegador bloquear a nova aba, oferece o link
    const janela = window.open(link, "_blank");
    if (janela) {
      janela.opener = null;
      mostrarStatus("ok", "Pronto! O WhatsApp abriu em uma nova aba com a sua mensagem. Confira e toque em enviar.");
    } else {
      const a = document.createElement("a");
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Abrir conversa no WhatsApp";
      mostrarStatus("ok", ["Sua mensagem está pronta. ", a]);
    }
  });
}


/* ------------------------------------------------------------------------
   REDES SOCIAIS (só aparecem as que têm link)
   ------------------------------------------------------------------------ */
function prepararRedes() {
  const listas = [document.getElementById("redes-contato"), document.getElementById("redes-rodape")];
  Object.entries(CONFIG.redes).forEach(([nome, url]) => {
    if (!url) return;
    if (!/^https:\/\//.test(url)) {
      console.warn(`O link de ${nome} precisa começar com https://`);
      return;
    }
    listas.forEach((lista) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = nome;
      li.append(a);
      lista.append(li);
    });
  });
  listas.forEach((lista) => { lista.hidden = lista.children.length === 0; });
}


/* ------------------------------------------------------------------------
   PROJETOS DE CLIENTES (link e print opcional)
   ------------------------------------------------------------------------ */
function prepararClientes() {
  document.querySelectorAll("[data-cliente-link]").forEach((link) => {
    const cliente = CONFIG.clientes[link.dataset.clienteLink];
    if (cliente && cliente.site) link.href = cliente.site;
  });

  document.querySelectorAll("[data-cliente-print]").forEach((capa) => {
    const cliente = CONFIG.clientes[capa.dataset.clientePrint];
    if (!cliente || !cliente.print) return;
    const imagem = new Image();
    imagem.className = "cliente__print";
    imagem.alt = "";   // decorativa: o nome do projeto está ao lado
    imagem.loading = "lazy";
    imagem.addEventListener("load", () => capa.classList.add("tem-print"));
    imagem.addEventListener("error", () => {
      imagem.remove();
      console.warn(`Print não encontrado: ${cliente.print}. Confira o caminho em CONFIG.clientes.`);
    });
    imagem.src = cliente.print;
    capa.append(imagem);
  });
}


/* ------------------------------------------------------------------------
   BARRA DE PROGRESSO E LINK ATIVO NO MENU
   ------------------------------------------------------------------------ */
function prepararRolagem() {
  const barra = document.getElementById("barra-progresso");
  let agendado = false;
  const atualizar = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.transform = `scaleX(${total > 0 ? Math.min(window.scrollY / total, 1) : 0})`;
    agendado = false;
  };
  window.addEventListener("scroll", () => {
    if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
  }, { passive: true });
  atualizar();

  if (!("IntersectionObserver" in window)) return;
  const links = [...document.querySelectorAll(".nav__link")];
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      links.forEach((link) => {
        const ativo = link.getAttribute("href") === `#${entrada.target.id}`;
        link.classList.toggle("is-active", ativo);
        if (ativo) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((link) => {
    const secao = document.querySelector(link.getAttribute("href"));
    if (secao) observador.observe(secao);
  });
}


/* ------------------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  prepararWhatsapp();
  prepararFormulario();
  prepararRedes();
  prepararClientes();
  prepararRolagem();
  Comum.carregarFotos(CONFIG.usarFotos, "assets/images/");
});
