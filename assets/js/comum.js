/* ==========================================================================
   comum.js — funções compartilhadas por todas as páginas
   (portfólio e projetos demonstrativos)
   --------------------------------------------------------------------------
   Carregue este arquivo no <head>, SEM "defer":
     <script src="assets/js/comum.js"></script>          (no portfólio)
     <script src="../../assets/js/comum.js"></script>    (nos projetos)
   Assim o tema claro/escuro é aplicado antes da página aparecer.

   O que ele faz sozinho, se a página tiver os atributos abaixo:
     data-theme-toggle   → botão que troca o tema (salvo para todas as páginas)
     data-menu-toggle    → botão do menu do celular (use aria-controls="id-do-menu")
     data-header         → cabeçalho que muda ao rolar a página
     data-reveal         → elemento que aparece suavemente ao rolar
     data-ano            → recebe o ano atual
     data-fechar         → dentro de um <dialog>, botão que fecha a janela

   Funções disponíveis para os outros scripts (objeto Comum):
     Comum.aviso(texto)                       → mensagem rápida no pé da tela
     Comum.abrirDialogo(elementoDialog)       → abre uma janela <dialog>
     Comum.carregarFotos(ativo, pastaBase)    → troca ilustrações por fotos
     Comum.whatsappValido(numero)             → confere o formato do número
     Comum.linkWhatsapp(numero, mensagem)     → monta o link wa.me
     Comum.moeda(valor)                       → 1234.5 → "R$ 1.234,50"
     Comum.armazenamento.ler/salvar/remover   → localStorage com proteção
     Comum.definirTema("light" | "dark" | "auto" | null) → fixa o tema, segue o aparelho ("auto")
                                              ou volta ao padrão da página (null)
     Comum.preferenciaTema()                  → "light" | "dark" | "auto" | null (nada escolhido)

   Tema padrão: sem escolha salva, a página segue o aparelho. Uma página pode
   ter outro padrão com <html data-tema-padrao="dark"> (ou "light").
   ========================================================================== */

(function () {
  "use strict";

  const CHAVE_TEMA = "martins-tema";   // mesma chave em todas as páginas
  const raiz = document.documentElement;
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sistemaClaro = window.matchMedia("(prefers-color-scheme: light)");

  /* ---------- Armazenamento local (protegido contra navegadores que bloqueiam) ---------- */
  const armazenamento = {
    ler(chave) {
      try { return localStorage.getItem(chave); } catch (erro) { return null; }
    },
    salvar(chave, valor) {
      try { localStorage.setItem(chave, valor); return true; } catch (erro) { return false; }
    },
    remover(chave) {
      try { localStorage.removeItem(chave); } catch (erro) { /* sem problema */ }
    },
  };

  /* ---------- 1. Tema: aplicado imediatamente, antes de desenhar a página ---------- */
  function temaSalvo() {
    const tema = armazenamento.ler(CHAVE_TEMA);
    return tema === "light" || tema === "dark" ? tema : null;
  }
  function preferenciaTema() {
    const tema = armazenamento.ler(CHAVE_TEMA);
    return tema === "light" || tema === "dark" || tema === "auto" ? tema : null;
  }
  const padraoDaPagina = () => { const p = raiz.getAttribute("data-tema-padrao"); return p === "light" || p === "dark" ? p : null; };
  const temaDoSistema = () => (sistemaClaro.matches ? "light" : "dark");
  // Segue o aparelho quando a pessoa escolheu "auto" ou quando nada foi escolhido e a página não tem padrão próprio
  const segueSistema = () => { const pref = preferenciaTema(); return pref === "auto" || (!pref && !padraoDaPagina()); };
  function temaInicial() {
    const salvo = temaSalvo();
    if (salvo) return salvo;
    return segueSistema() ? temaDoSistema() : padraoDaPagina();
  }

  raiz.setAttribute("data-theme", temaInicial());
  raiz.classList.add("js");

  /* Estilos que todas as páginas usam (para não repetir em cada CSS) */
  const estilos = document.createElement("style");
  estilos.textContent = `
    [hidden] { display: none !important; }
    [data-theme="dark"] [data-theme-toggle] .icone-lua,
    [data-theme="light"] [data-theme-toggle] .icone-sol { display: none; }
    .tema-mudando, .tema-mudando *, .tema-mudando *::before, .tema-mudando *::after {
      transition: background-color .35s ease, color .35s ease, border-color .35s ease,
                  fill .35s ease, stroke .35s ease !important;
    }
    .reveal { opacity: 0; transform: translateY(24px);
      transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1);
      transition-delay: var(--delay, 0s); }
    .reveal.is-visible { opacity: 1; transform: none; }
    .comum-toast { position: fixed; left: 50%; bottom: calc(96px + env(safe-area-inset-bottom, 0px));
      z-index: 200; width: min(92vw, 440px); padding: 14px 18px; border-radius: 10px;
      background: var(--toast-bg, #15151B); color: var(--toast-fg, #F5F5F7);
      border: 1px solid var(--toast-borda, rgba(255,255,255,.15));
      font: 500 .92rem/1.5 var(--toast-fonte, system-ui, sans-serif);
      box-shadow: 0 18px 40px -18px rgba(0,0,0,.6); transform: translateX(-50%);
      animation: comum-toast .3s ease both; }
    @keyframes comum-toast { from { opacity: 0; transform: translate(-50%, 10px); } }
    @media (prefers-reduced-motion: reduce) {
      .reveal { opacity: 1; transform: none; transition: none; }
      .comum-toast { animation: none; }
    }
  `;
  document.head.append(estilos);

  function aplicarTema(tema, comTransicao) {
    if (comTransicao && !reduzirMovimento.matches) {
      raiz.classList.add("tema-mudando");
      setTimeout(() => raiz.classList.remove("tema-mudando"), 400);
    }
    raiz.setAttribute("data-theme", tema);
    atualizarBotoesTema();
    document.dispatchEvent(new CustomEvent("temamudou", { detail: { tema } }));
  }

  /* Escolha direta do tema (usada em telas de configuração).
     "light" ou "dark" fixa o tema; qualquer outro valor volta a seguir o sistema. */
  function definirTema(tema) {
    if (tema === "light" || tema === "dark") {
      armazenamento.salvar(CHAVE_TEMA, tema);
      aplicarTema(tema, true);
    } else if (tema === "auto") {
      armazenamento.salvar(CHAVE_TEMA, "auto");
      aplicarTema(temaDoSistema(), true);
    } else {
      armazenamento.remover(CHAVE_TEMA);
      aplicarTema(temaInicial(), true);
    }
  }

  function atualizarBotoesTema() {
    const tema = raiz.getAttribute("data-theme");
    document.querySelectorAll("[data-theme-toggle]").forEach((botao) => {
      botao.setAttribute("aria-label", tema === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro");
    });
  }

  function prepararTema() {
    atualizarBotoesTema();
    document.querySelectorAll("[data-theme-toggle]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const novo = raiz.getAttribute("data-theme") === "dark" ? "light" : "dark";
        aplicarTema(novo, true);
        armazenamento.salvar(CHAVE_TEMA, novo);
      });
    });
    // Acompanha o aparelho quando é isso que vale para a página
    sistemaClaro.addEventListener("change", () => {
      if (!temaSalvo() && segueSistema()) aplicarTema(temaDoSistema(), true);
    });
  }

  /* ---------- 2. Menu do celular ---------- */
  function prepararMenus() {
    document.querySelectorAll("[data-menu-toggle]").forEach((botao) => {
      const menu = document.getElementById(botao.getAttribute("aria-controls"));
      if (!menu) return;
      const cabecalho = botao.closest("header") || document.body;
      const larguraDesktop = Number(botao.dataset.menuToggle) || 980;

      const abrir = () => {
        menu.classList.add("is-open");
        cabecalho.classList.add("menu-aberto");
        botao.setAttribute("aria-expanded", "true");
        botao.setAttribute("aria-label", "Fechar menu");
        const primeiroLink = menu.querySelector("a, button");
        if (primeiroLink) primeiroLink.focus({ preventScroll: true });
      };
      const fechar = (devolverFoco) => {
        if (!menu.classList.contains("is-open")) return;
        menu.classList.remove("is-open");
        cabecalho.classList.remove("menu-aberto");
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-label", "Abrir menu");
        if (devolverFoco) botao.focus();
      };

      botao.addEventListener("click", () => (menu.classList.contains("is-open") ? fechar() : abrir()));
      menu.addEventListener("click", (evento) => { if (evento.target.closest("a")) fechar(); });
      document.addEventListener("keydown", (evento) => { if (evento.key === "Escape") fechar(true); });
      document.addEventListener("click", (evento) => {
        if (!cabecalho.contains(evento.target)) fechar();
      });
      window.matchMedia(`(min-width: ${larguraDesktop}px)`).addEventListener("change", () => fechar());
    });
  }

  /* ---------- 3. Cabeçalho ao rolar ---------- */
  function prepararCabecalho() {
    const cabecalho = document.querySelector("[data-header]");
    if (!cabecalho) return;
    let agendado = false;
    const atualizar = () => {
      cabecalho.classList.toggle("is-scrolled", window.scrollY > 10);
      agendado = false;
    };
    window.addEventListener("scroll", () => {
      if (!agendado) { agendado = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    atualizar();
  }

  /* ---------- 4. Revelar ao rolar ----------
     Só esconde o que está abaixo da tela no carregamento: se algo falhar,
     o conteúdo continua visível. */
  function prepararRevelar() {
    if (reduzirMovimento.matches || !("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver((entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("is-visible");
          obs.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    document.querySelectorAll("[data-reveal]").forEach((elemento) => {
      if (elemento.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      const irmaos = [...elemento.parentElement.children].filter((el) => el.hasAttribute("data-reveal"));
      const posicao = irmaos.indexOf(elemento);
      if (posicao > 0) elemento.style.setProperty("--delay", `${Math.min(posicao, 5) * 70}ms`);
      elemento.classList.add("reveal");
      observador.observe(elemento);
    });
  }

  /* ---------- 5. Janelas <dialog> ---------- */
  function abrirDialogo(dialogo) {
    if (!dialogo) return;
    if (typeof dialogo.showModal === "function") {
      if (!dialogo.open) dialogo.showModal();
    } else {
      dialogo.setAttribute("open", "");
    }
  }

  function prepararDialogos() {
    document.querySelectorAll("dialog").forEach((dialogo) => {
      dialogo.addEventListener("click", (evento) => {
        // Clique no fundo escuro (fora da caixa) fecha
        if (evento.target === dialogo) dialogo.close();
        if (evento.target.closest("[data-fechar]")) dialogo.close();
      });
    });
  }

  /* ---------- 6. Aviso rápido (toast) ---------- */
  let temporizadorAviso;
  function aviso(texto) {
    let caixa = document.querySelector(".comum-toast");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.className = "comum-toast";
      caixa.setAttribute("role", "status");
      caixa.setAttribute("aria-live", "polite");
      document.body.append(caixa);
    }
    caixa.hidden = false;
    caixa.textContent = texto;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { caixa.hidden = true; }, 6000);
  }

  /* ---------- 7. Fotos opcionais ----------
     Elementos com data-foto="pasta/arquivo.jpg" mostram uma ilustração.
     Se "ativo" for true, a foto é carregada por cima; se não existir,
     a ilustração continua e o Console avisa qual arquivo falta. */
  function carregarFotos(ativo, pastaBase) {
    if (!ativo) return;
    document.querySelectorAll("[data-foto]").forEach((area) => {
      const caminho = pastaBase + area.dataset.foto;
      const foto = new Image();
      foto.alt = area.dataset.alt || "";
      foto.decoding = "async";
      foto.loading = area.hasAttribute("data-foto-prioridade") ? "eager" : "lazy";
      foto.className = "foto-real";
      foto.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;";
      if (getComputedStyle(area).position === "static") area.style.position = "relative";
      foto.addEventListener("load", () => {
        area.classList.add("tem-foto");
        area.querySelectorAll(":scope > svg, :scope > .arte").forEach((arte) => arte.setAttribute("aria-hidden", "true"));
      });
      foto.addEventListener("error", () => {
        foto.remove();
        console.warn(`Foto não encontrada: ${caminho}`);
      });
      foto.src = caminho;
      area.append(foto);
    });
  }

  /* ---------- 8. WhatsApp e moeda ---------- */
  function whatsappValido(numero) {
    return /^55\d{10,11}$/.test(String(numero || ""));
  }
  function linkWhatsapp(numero, mensagem) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  }
  const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function moeda(valor) {
    return formatadorMoeda.format(valor);
  }

  /* ---------- Inicialização ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    prepararTema();
    prepararMenus();
    prepararCabecalho();
    prepararRevelar();
    prepararDialogos();
    document.querySelectorAll("[data-ano]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  });

  window.Comum = {
    armazenamento,
    aviso,
    abrirDialogo,
    carregarFotos,
    whatsappValido,
    linkWhatsapp,
    moeda,
    reduzirMovimento: () => reduzirMovimento.matches,
    definirTema,
    temaSalvo,
    preferenciaTema,
  };
})();
