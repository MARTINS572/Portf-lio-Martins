"""
Testes automatizados do portfólio (Playwright + Chromium).

Como rodar (uma vez):
    pip install playwright
    playwright install chromium
Depois, na pasta do projeto:
    python tests/test_site.py
Opcional: python tests/test_site.py --screens  (salva capturas em tests/screens/)

O script sobe um servidor local com os mesmos cabeçalhos de segurança do netlify.toml
(inclusive a Content-Security-Policy) e verifica os comportamentos principais.
"""
import functools
import http.server
import json
import pathlib
import re
import sys
import threading
import urllib.parse

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCREENS = "--screens" in sys.argv
WIDTHS = [320, 360, 390, 412, 768, 1024, 1280, 1920]
WA_PREFIX = "https://wa.me/5519993128050?text="


def netlify_headers():
    """Lê as regras [[headers]] do netlify.toml (formato simples) como [(caminho, {cabeçalho: valor})]."""
    text = (ROOT / "netlify.toml").read_text(encoding="utf-8")
    rules = []
    for block in text.split("[[headers]]")[1:]:
        path = re.search(r'for\s*=\s*"([^"]+)"', block).group(1)
        values = dict(re.findall(r'^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$', block, re.M))
        values.pop("for", None)
        rules.append((path, values))
    return rules


def rule_matches(pattern, path):
    path = path.split("?", 1)[0]
    if pattern.endswith("/*"):
        return path.startswith(pattern[:-1])
    return path == pattern


class Handler(http.server.SimpleHTTPRequestHandler):
    rules = []

    def end_headers(self):
        for pattern, values in self.rules:
            if rule_matches(pattern, self.path):
                for k, v in values.items():
                    self.send_header(k, v)
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404 and (ROOT / "404.html").exists():
            body = (ROOT / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, *args):
        pass


def start_server():
    Handler.rules = netlify_headers()
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


RESULTS = []


def check(name, condition, detail=""):
    RESULTS.append((name, bool(condition), detail))
    mark = "OK  " if condition else "FALHOU"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail and not condition else ""))


def new_page(browser, base, width=1280, height=900, scheme="dark", reduced=False, storage=None):
    ctx = browser.new_context(viewport={"width": width, "height": height}, color_scheme=scheme,
                              reduced_motion="reduce" if reduced else "no-preference")
    if storage is not None:
        ctx.add_init_script(f"try{{localStorage.setItem('martins-tema', {json.dumps(storage)})}}catch(e){{}}")
    page = ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: page.errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.external = []
    page.on("request", lambda r: page.external.append(r.url) if not (r.url.startswith(base) or r.url.startswith("data:")) else None)
    page.bad_responses = []
    page.on("response", lambda r: page.bad_responses.append(f"{r.status} {r.url}") if r.url.startswith(base) and r.status >= 400 else None)
    return ctx, page


def run():
    server, base = start_server()
    shots = ROOT / "tests" / "screens"
    if SCREENS:
        shots.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1) Larguras: sem rolagem horizontal, sem erros, título visível
        for w in WIDTHS:
            ctx, page = new_page(browser, base, width=w, height=900, reduced=True)
            page.goto(base + "/", wait_until="load")
            overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(f"{w}px: sem rolagem horizontal", overflow <= 0, f"excesso de {overflow}px")
            check(f"{w}px: título do hero visível", page.locator("#hero-title").is_visible())
            clipped = page.evaluate("""() => [...document.querySelectorAll('h1,h2,h3,.btn,.chip')]
                .filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')
                .map(e => e.textContent.trim().slice(0, 40))""")
            check(f"{w}px: títulos e botões sem corte", not clipped, ", ".join(clipped))
            small = page.evaluate("""() => [...document.querySelectorAll('a.btn, button, .chip, .icon-btn, .menu-list a')]
                .filter(e => e.offsetParent).map(e => e.getBoundingClientRect())
                .filter(r => r.height < 44 || r.width < 44).length""")
            check(f"{w}px: alvos de toque com 44px ou mais", small == 0, f"{small} elementos menores")
            check(f"{w}px: sem erros no console", not page.errors, "; ".join(page.errors[:3]))
            broken = [r for r in page.bad_responses if "/projetos/" not in r]
            check(f"{w}px: nenhum recurso local quebrado", not broken, "; ".join(broken[:3]))
            check(f"{w}px: nada carregado de fora (fontes locais)", not page.external, "; ".join(page.external[:3]))
            if SCREENS and w in (390, 1280):
                for scheme in ("dark", "light"):
                    page.evaluate(f"document.documentElement.setAttribute('data-theme','{scheme}')")
                    page.screenshot(path=str(shots / f"home-{w}-{scheme}.png"), full_page=True)
            ctx.close()

        # 2) Projetos e filtros (com a pasta projetos/ no site, todas as demos ficam no ar)
        ctx, page = new_page(browser, base)
        page.goto(base + "/")
        page.wait_for_selector('.status-checking', state='detached', timeout=5000)
        cards = page.locator(".project-card")
        check("Projetos: 11 cards renderizados", cards.count() == 11, str(cards.count()))
        names = page.locator(".project-title").all_inner_texts()
        expected = ["AutoPrime", "Black Copper", "Violet Studio", "Solado", "Avesso", "Ponto",
                    "AgendaPro", "Nexora CRM", "Nexora Stock", "Nexora Booking", "Nexora Auto"]
        check("Projetos: nomes conferem com o config.js", names == expected, str(names))
        check("Projetos: contadores dos filtros", page.locator("[data-count]").all_inner_texts() == ["11", "6", "5"])
        page.click("[data-filter='sites']"); page.wait_for_timeout(400)
        check("Filtro Sites mostra 6", cards.count() == 6)
        check("Filtro Sites marcado com aria-pressed", page.get_attribute("[data-filter='sites']", "aria-pressed") == "true")
        page.click("[data-filter='sistemas']"); page.wait_for_timeout(400)
        check("Filtro Sistemas mostra 5", cards.count() == 5)
        check("Texto de resultado atualizado", (page.text_content("[data-results]") or "").strip() == "5 projetos")
        check("Sistemas têm aviso de demonstração local", page.locator(".project-card .project-note").count() == 5)
        page.click("[data-filter='todos']"); page.wait_for_timeout(400)
        check("Filtro Todos volta a 11", cards.count() == 11)
        check("Nenhum card 'Em preparação' com as demos no site", page.locator(".status-preparing").count() == 0)
        check("Todas as 11 demos marcadas como no ar", page.locator(".status-published").count() == 11)
        hrefs = page.evaluate("[...document.querySelectorAll('.project-links a')].map(a => a.href)")
        check("14 botões de demo (11 principais + 3 painéis/páginas extras)", len(hrefs) == 14, str(len(hrefs)))
        broken = []
        for h in hrefs:
            r = page.request.get(h)
            if r.status != 200 or "<html" not in r.text().lower():
                broken.append(f"{r.status} {h}")
        check("Todos os botões de demo abrem uma página que existe", not broken, "; ".join(broken))
        check("Prévias reais carregadas em todos os cards", page.evaluate("[...document.querySelectorAll('.mk-img-shot')].length") == 11)
        page.locator(".project-card[data-id='autoprime'] .project-open").click()
        page.wait_for_load_state("load")
        check("Botão abre a demo na mesma aba", page.url.endswith("/projetos/autoprime/index.html"), page.url)
        page.locator('a[href="../../index.html#projetos"]').first.click()
        page.wait_for_load_state("load")
        check("Demo volta para os projetos do portfólio", page.url.endswith("/index.html#projetos"), page.url)
        page.goto(base + "/")
        check("Projetos identificados como demonstração", page.locator(".project-card .tag-accent").count() == 11)
        check("Capas diferentes por projeto", len(set(page.evaluate("[...document.querySelectorAll('.project-card')].map(c => c.style.getPropertyValue('--p-bg'))"))) == 11)
        ctx.close()

        # 2b) Demo presente vira botão; link ausente some; URL perigosa é ignorada
        ctx, page = new_page(browser, base)
        original = (ROOT / "assets/js/config.js").read_text(encoding="utf-8")
        patched = original.replace('status: "preparing"', 'status: "published"')
        patched = patched.replace('url: "projetos/black-copper/index.html"', 'url: "javascript:alert(1)"', 1)
        page.route("**/assets/js/config.js", lambda route: route.fulfill(status=200, content_type="application/javascript", body=patched))
        missing = lambda route: route.fulfill(status=404, content_type="text/html", body="<!doctype html><title>404</title>")
        page.route("**/projetos/tenis/index.html", missing)
        page.route("**/projetos/nexora-booking/reservar.html", missing)
        page.goto(base + "/")
        page.wait_for_selector('.status-checking', state='detached', timeout=5000)
        auto = page.locator(".project-card[data-id='autoprime'] .project-links a")
        check("Demo existente mostra 'Abrir demonstração'", auto.count() == 1 and "Abrir demonstração" in auto.inner_text())
        if auto.count():
            check("Demo do próprio site abre na mesma aba", auto.get_attribute("target") is None)
            check("Link da demo aponta para a pasta projetos/", (auto.get_attribute("href") or "").endswith("/projetos/autoprime/index.html"))
        booking = page.locator(".project-card[data-id='nexora-booking'] .project-links a")
        check("Link secundário ausente não aparece (só o painel)", booking.count() == 1 and "Abrir o painel" in booking.inner_text())
        check("URL 'javascript:' não vira link", page.locator(".project-card[data-id='black-copper'] a[href]").count() == 0)
        check("Demo ausente continua 'Em preparação'", page.locator(".project-card[data-id='solado'] .status-preparing").count() == 1)
        check("Só os cards com demo existente ficam 'no ar'", page.locator(".status-published").count() == 9)
        ctx.close()

        # 3) WhatsApp
        ctx, page = new_page(browser, base)
        page.goto(base + "/")
        links = page.locator("[data-wa]")
        hrefs = [links.nth(i).get_attribute("href") for i in range(links.count())]
        check("WhatsApp: todos os botões apontam para o número correto", hrefs and all(h.startswith(WA_PREFIX) for h in hrefs), str(hrefs[:2]))
        decoded = urllib.parse.unquote(hrefs[0].split("?text=", 1)[1]) if hrefs else ""
        check("WhatsApp: mensagem codificada corretamente", decoded.startswith("Olá, Martins!"), decoded)
        rels = [links.nth(i).get_attribute("rel") or "" for i in range(links.count())]
        check("WhatsApp: abre em nova aba com noopener noreferrer", all("noopener" in r and "noreferrer" in r for r in rels))
        check("WhatsApp: número exibido", "+55 19 99312-8050" in page.inner_text(".wa-number"))
        ctx.close()

        # 4) Tema
        for scheme in ("dark", "light"):
            ctx, page = new_page(browser, base, scheme=scheme)
            page.goto(base + "/")
            check(f"Tema inicial segue o sistema ({scheme})", page.get_attribute("html", "data-theme") == scheme)
            ctx.close()
        ctx, page = new_page(browser, base, scheme="dark")
        page.goto(base + "/")
        page.click("[data-theme-toggle]")
        check("Alternar tema muda para claro", page.get_attribute("html", "data-theme") == "light")
        check("meta theme-color acompanha o tema", page.get_attribute('meta[name="theme-color"]', "content") == "#FAFAF8")
        check("Rótulo do botão de tema atualizado", page.get_attribute("[data-theme-toggle]", "aria-label") == "Ativar tema escuro")
        page.reload()
        check("Tema escolhido persiste após recarregar", page.get_attribute("html", "data-theme") == "light")
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        check("Fundo muda de verdade no tema claro", bg == "rgb(250, 250, 248)", bg)
        ctx.close()

        # 5) Contraste dos tokens nos dois temas
        for theme in ("dark", "light"):
            ctx, page = new_page(browser, base, storage=theme)
            page.goto(base + "/")
            ratios = page.evaluate("""() => {
                const cs = getComputedStyle(document.documentElement);
                const hex = n => cs.getPropertyValue(n).trim();
                const lum = h => { const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4)); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
                const ratio = (a,b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
                const out = {};
                for (const t of ['--text','--text-2','--text-3','--accent-text']) { out[t] = ratio(hex(t), hex('--bg')); out[t+' (superfície)'] = ratio(hex(t), hex('--surface')); }
                out['branco sobre --accent'] = ratio(hex('--on-accent'), hex('--accent'));
                return out; }""")
            low = {k: round(v, 2) for k, v in ratios.items() if v < 4.5}
            check(f"Contraste AA no tema {theme}", not low, str(low))
            ctx.close()

        # 6) Menu mobile
        ctx, page = new_page(browser, base, width=390, height=844)
        page.goto(base + "/")
        toggle = page.locator("[data-menu-toggle]")
        check("Mobile: navegação desktop escondida", not page.locator(".nav-desktop").is_visible())
        check("Mobile: botão de menu visível", toggle.is_visible())
        toggle.click()
        check("Menu abre (aria-expanded=true)", toggle.get_attribute("aria-expanded") == "true" and page.locator("#menu-mobile").is_visible())
        box = page.locator("#menu-mobile").bounding_box()
        check("Painel do menu cobre a tela abaixo do cabeçalho", box and box["height"] > 600 and box["y"] >= 50, str(box))
        check("Foco vai para o primeiro link do menu", page.evaluate("document.activeElement.closest('#menu-mobile') !== null"))
        page.keyboard.press("Escape")
        check("Esc fecha o menu", toggle.get_attribute("aria-expanded") == "false" and not page.locator("#menu-mobile").is_visible())
        check("Foco volta para o botão do menu", page.evaluate("document.activeElement.hasAttribute('data-menu-toggle')"))
        toggle.click()
        page.click("#menu-mobile a[href='#servicos']")
        check("Menu fecha ao escolher um link", not page.locator("#menu-mobile").is_visible())
        page.wait_for_timeout(900)
        check("Link do menu leva à seção", page.evaluate("Math.abs(document.getElementById('servicos').getBoundingClientRect().top) < 120"))
        ctx.close()
        ctx, page = new_page(browser, base, width=1280)
        page.goto(base + "/")
        check("Desktop: botão de menu escondido", not page.locator("[data-menu-toggle]").is_visible())
        ctx.close()

        # 7) Formulário → WhatsApp
        ctx, page = new_page(browser, base)
        ctx.add_init_script("window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; };")
        page.goto(base + "/")
        page.click(".quote-form button[type=submit]")
        check("Formulário vazio mostra erro no nome", page.locator("#f-nome-erro").is_visible())
        check("Formulário vazio mostra erro no serviço", page.locator("#f-servico-erro").is_visible())
        check("Campo inválido marcado com aria-invalid", page.get_attribute("#f-nome", "aria-invalid") == "true")
        check("Foco vai para o primeiro campo inválido", page.evaluate("document.activeElement.id") == "f-nome")
        check("Nada é aberto com o formulário inválido", page.evaluate("window.__opened.length") == 0)
        page.fill("#f-nome", "Ana")
        check("Erro some ao corrigir o campo", not page.locator("#f-nome-erro").is_visible())
        page.fill("#f-negocio", "Padaria & Café")
        page.select_option("#f-servico", "Catálogo digital")
        page.fill("#f-mensagem", "Quero mostrar o cardápio.")
        page.click(".quote-form button[type=submit]")
        opened = page.evaluate("window.__opened")
        check("Envio válido abre o WhatsApp uma vez", len(opened) == 1)
        msg = urllib.parse.unquote(opened[0].split("?text=", 1)[1]) if opened else ""
        check("Mensagem contém os campos preenchidos", all(s in msg for s in ["Nome: Ana", "Negócio: Padaria & Café", "Preciso de: Catálogo digital", "Quero mostrar o cardápio."]), msg)
        check("Link do formulário usa o número do config", bool(opened) and opened[0].startswith(WA_PREFIX))
        check("Feedback de sucesso com link alternativo", page.locator("[data-form-status]").is_visible() and page.locator("[data-form-status] a").count() == 1)
        ctx.close()

        # 8) Âncoras, foco e 404
        ctx, page = new_page(browser, base)
        page.goto(base + "/")
        missing = page.evaluate("""() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href'))
            .filter(h => h.length > 1 && !document.getElementById(h.slice(1)))""")
        check("Todas as âncoras internas existem", not missing, str(missing))
        page.keyboard.press("Tab")
        check("Primeiro Tab mostra o atalho 'Pular para o conteúdo'", page.evaluate("document.activeElement.classList.contains('skip-link')") and page.locator(".skip-link").bounding_box()["y"] >= 0)
        page.focus("[data-theme-toggle]")
        page.keyboard.press("Shift+Tab"); page.keyboard.press("Tab")
        outline = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
        check("Indicador de foco visível no teclado", outline not in ("none", ""), outline)
        check("Ano do rodapé atualizado", page.inner_text("[data-year]").strip().isdigit())
        ctx.close()

        ctx, page = new_page(browser, base)
        resp = page.goto(base + "/pagina-que-nao-existe")
        check("Página 404 responde com status 404", resp.status == 404)
        check("Página 404 tem link para o início", page.locator("a.btn[href='/']").count() == 1)
        # O próprio documento responde 404 (esperado); qualquer outro erro conta como falha.
        extra = [e for e in page.errors if "status of 404" not in e] + [r for r in page.bad_responses if "pagina-que-nao-existe" not in r]
        check("Página 404 carrega CSS, ícone e scripts sem erros", not extra, "; ".join(extra))
        ctx.close()

        # 9) Animações respeitam prefers-reduced-motion
        ctx, page = new_page(browser, base, reduced=True)
        page.goto(base + "/")
        hidden = page.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity !== '1').length")
        check("Com movimento reduzido nada fica escondido", hidden == 0, f"{hidden} elementos")
        ctx.close()

        # 10) Se o main.js não carregar, o conteúdo continua visível
        ctx, page = new_page(browser, base)
        page.route("**/assets/js/main.js", lambda route: route.fulfill(status=200, content_type="application/javascript", body=""))
        page.goto(base + "/")
        page.wait_for_timeout(300)
        hidden = page.evaluate("[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity !== '1').length")
        check("Sem o main.js nenhum conteúdo fica invisível", hidden == 0, f"{hidden} elementos")
        ctx.close()

        browser.close()
    server.shutdown()

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{len(RESULTS) - len(failed)} de {len(RESULTS)} verificações passaram.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
