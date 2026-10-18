"""
Testes das demonstrações em /projetos/ (Playwright + Chromium).

    python tests/test_demos.py

Para cada página: abre sem erro, sem recurso quebrado, sem rolagem lateral, com título
visível e link de volta ao portfólio. Depois percorre o fluxo principal de cada demo
(reservas, cadastros, carrinho, encomenda e orçamento) e confere o resultado na tela.
As fontes do Google Fonts são substituídas por uma resposta vazia, para o teste não
depender da internet.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_site import check, start_server, RESULTS  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*")

PAGES = [
    "projetos/autoprime/index.html", "projetos/autoprime/privacidade.html",
    "projetos/black-copper/index.html", "projetos/black-copper/painel.html", "projetos/black-copper/privacidade.html",
    "projetos/violet-studio/index.html", "projetos/violet-studio/painel.html", "projetos/violet-studio/privacidade.html",
    "projetos/tenis/index.html", "projetos/moda/index.html", "projetos/doces-salgados/index.html",
    "projetos/agendapro/index.html", "projetos/nexora-crm/index.html", "projetos/nexora-stock/index.html",
    "projetos/nexora-booking/index.html", "projetos/nexora-booking/reservar.html", "projetos/nexora-auto/index.html",
]


def page_for(browser, base, width=1280, height=900):
    ctx = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
    ctx.route(FONTS, lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    page = ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: page.errors.append(f"console.error: {m.text}") if m.type == "error" else None)
    page.bad = []
    page.on("response", lambda r: page.bad.append(f"{r.status} {r.url}") if r.url.startswith(base) and r.status >= 400 else None)
    return ctx, page


def walk_studio_booking(page, name):
    """Agenda de Estúdio (Black Copper e Violet Studio): escolhe a primeira opção de cada etapa."""
    sec = page.locator(".ae-agendar")
    for _ in range(9):
        if sec.locator(".ae-opcao__rotulo").count():
            sec.locator(".ae-opcao__rotulo").first.click()
        if sec.locator("button.ae-cal__dia.is-livre").count():
            sec.locator("button.ae-cal__dia.is-livre").first.click()
            page.wait_for_timeout(120)
        if sec.locator("button.ae-hora").count():
            sec.locator("button.ae-hora").first.click()
            page.wait_for_timeout(120)
        fields = sec.locator("input.ae-campo__entrada")
        for i in range(fields.count()):
            f = fields.nth(i)
            if not f.is_visible() or f.input_value():
                continue
            kind = " ".join(filter(None, [f.get_attribute("type"), f.get_attribute("id"), f.get_attribute("name")]))
            if "tel" in kind or "fone" in kind:
                f.fill("19991234567")
            elif "mail" in kind:
                f.fill("ana@exemplo.com")
            else:
                f.fill(name)
        boxes = sec.locator("input.ae-check__caixa")
        for i in range(boxes.count()):
            if not boxes.nth(i).is_checked():
                boxes.nth(i).check()
        sec.locator(".ae-acoes button.ae-btn--principal").last.click()
        page.wait_for_timeout(400)
        if sec.locator(".ae-final").count():
            return sec.locator(".ae-final__codigo strong").inner_text().strip()
    return None


def run():
    server, base = start_server()
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1) Todas as páginas abrem, em celular e computador
        for path in PAGES:
            for width in (390, 1280):
                ctx, page = page_for(browser, base, width=width)
                resp = page.goto(f"{base}/{path}", wait_until="load")
                page.wait_for_timeout(400)
                label = f"{path} @{width}"
                ok_status = resp is not None and resp.status == 200
                heading = page.evaluate("() => [...document.querySelectorAll('h1,h2')].some(h => h.offsetParent && h.textContent.trim())")
                overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                back = page.evaluate("() => [...document.querySelectorAll('a[href]')].some(a => /\\.\\.\\/\\.\\.\\/index\\.html/.test(a.getAttribute('href')))")
                demo_note = page.evaluate("() => /demonstra|fictíci/i.test(document.body.innerText)")
                problems = []
                if not ok_status: problems.append(f"status {resp.status if resp else '-'}")
                if not heading: problems.append("sem título visível")
                if overflow > 0: problems.append(f"rolagem lateral de {overflow}px")
                if not back: problems.append("sem link de volta ao portfólio")
                if not demo_note: problems.append("sem aviso de demonstração")
                if page.errors: problems.append("; ".join(page.errors[:2]))
                if page.bad: problems.append("; ".join(page.bad[:2]))
                check(f"{label}: abre completa e sem erros", not problems, " | ".join(problems))
                ctx.close()

        # 1b) O link de volta leva a uma página que existe
        ctx, page = page_for(browser, base)
        resp = page.goto(f"{base}/projetos/autoprime/index.html")
        page.locator('a[href="../../index.html#projetos"]').first.click()
        page.wait_for_load_state("load")
        check("Voltar ao portfólio abre a seção de projetos", page.url.endswith("/index.html#projetos") and page.locator("#projetos-title").count() == 1, page.url)
        ctx.close()

        # 2) Violet Studio: reserva completa, aparece no painel e pode ser cancelada pelo código
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/violet-studio/index.html#agendar")
        code = walk_studio_booking(page, "Ana Teste Violet")
        check("Violet Studio: reserva gera código", bool(code) and len(code) >= 5, str(code))
        stored = page.evaluate("() => (localStorage.getItem('violet-studio:dados') || '').includes('Ana Teste Violet')")
        check("Violet Studio: reserva gravada no navegador", stored)
        page.goto(f"{base}/projetos/violet-studio/painel.html")
        page.wait_for_timeout(500)
        check("Violet Studio: reserva aparece no painel do estúdio", "Ana Teste Violet" in page.inner_text("body"))
        check("Violet Studio: painel sem erros", not page.errors, "; ".join(page.errors[:2]))
        page.goto(f"{base}/projetos/violet-studio/index.html#agendar")
        page.get_by_role("button", name=re.compile("consultar ou cancelar", re.I)).first.click()
        page.wait_for_timeout(300)
        dialog = page.locator("dialog[open]")
        inputs = dialog.locator("input:visible")
        for i in range(inputs.count()):
            kind = (inputs.nth(i).get_attribute("type") or "") + (inputs.nth(i).get_attribute("id") or "")
            inputs.nth(i).fill("19991234567" if ("tel" in kind or "fone" in kind) else (code or ""))
        dialog.locator("button[type=submit], button.ae-btn--principal").first.click()
        page.wait_for_timeout(400)
        found = "Ana Teste Violet" in dialog.inner_text() or (code or "#") in dialog.inner_text()
        check("Violet Studio: 'Minha reserva' encontra pelo código e telefone", found, dialog.inner_text()[:200])
        cancel = dialog.get_by_role("button", name=re.compile("cancelar", re.I))
        if cancel.count():
            cancel.first.click(); page.wait_for_timeout(300)
            confirm = dialog.get_by_role("button", name=re.compile("sim|confirmar cancel|cancelar reserva", re.I))
            if confirm.count():
                confirm.last.click(); page.wait_for_timeout(400)
        check("Violet Studio: reserva cancelada pelo cliente", re.search(r"cancelad", dialog.inner_text(), re.I) is not None, dialog.inner_text()[:200])
        ctx.close()

        # 3) Black Copper: mesma agenda, outra marca
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/black-copper/index.html#agendar")
        code = walk_studio_booking(page, "Bruno Teste Copper")
        check("Black Copper: reserva gera código", bool(code), str(code))
        # A Black Copper confirma na hora (não fica em "pendentes"): o cliente novo aparece no cadastro do painel.
        page.goto(f"{base}/projetos/black-copper/painel.html#/clientes")
        page.wait_for_timeout(600)
        check("Black Copper: cliente da reserva aparece no painel da barbearia", "Bruno Teste Copper" in page.inner_text("main"))
        ctx.close()

        # 4) Nexora Booking: página do cliente → painel
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/nexora-booking/reservar.html")
        main = page.locator("main")
        main.locator("button", has_text="Corte masculino").first.click(); page.wait_for_timeout(250)
        main.locator("button", has_text="Sem preferência").first.click(); page.wait_for_timeout(250)
        main.locator("button", has_text=re.compile(r"^\d{2}:\d{2}$")).first.click(); page.wait_for_timeout(300)
        page.fill("#p-nome", "Carla Teste Booking")
        page.fill("#p-telefone", "19991234567")
        page.check("#p-aceite")
        main.locator("button[type=submit]").first.click(); page.wait_for_timeout(400)
        for _ in range(2):
            confirm = main.get_by_role("button", name=re.compile("confirmar|enviar|reservar", re.I))
            if confirm.count():
                confirm.last.click(); page.wait_for_timeout(400)
        text = main.inner_text()
        check("Nexora Booking: cliente conclui a reserva com código", re.search(r"c[oó]digo", text, re.I) is not None and "Carla" in text, text[:200])
        page.goto(f"{base}/projetos/nexora-booking/index.html#/agendamentos")
        page.wait_for_timeout(700)
        check("Nexora Booking: reserva da página aparece no painel", "Carla Teste Booking" in page.inner_text("body"))
        check("Nexora Booking: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 5) AgendaPro: novo agendamento e bloqueio do mesmo horário
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/agendapro/index.html")
        page.get_by_role("button", name="Novo agendamento").first.click(); page.wait_for_timeout(300)
        page.select_option("#jr-profissional", index=1)
        page.wait_for_timeout(150)
        slot = page.locator("#jr-horario option").first.get_attribute("value")
        slot_text = page.locator("#jr-horario option").first.inner_text()
        page.fill("#jr-nome", "Diego Teste Agenda")
        page.fill("#jr-telefone", "19991234567")
        page.click("#jr-salvar"); page.wait_for_timeout(400)
        check("AgendaPro: agendamento salvo e listado", "Diego Teste Agenda" in page.inner_text("body"))
        page.get_by_role("button", name="Novo agendamento").first.click(); page.wait_for_timeout(300)
        page.select_option("#jr-profissional", index=1)
        page.wait_for_timeout(150)
        options = page.locator("#jr-horario option").all_inner_texts()
        check("AgendaPro: horário ocupado some das opções (sem conflito)", slot_text not in options, f"{slot_text} ainda em {options[:4]}")
        check("AgendaPro: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 6) Nexora CRM: cadastro de lead
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/nexora-crm/index.html#/leads")
        if page.get_by_role("button", name="Explorar demonstração").count():
            page.get_by_role("button", name="Explorar demonstração").click()
        page.wait_for_timeout(400)
        page.get_by_role("button", name="Novo lead").first.click(); page.wait_for_timeout(300)
        page.locator("#form-salvar").click(); page.wait_for_timeout(200)
        check("Nexora CRM: formulário vazio mostra erros", page.locator("dialog[open] [aria-invalid=true]").count() > 0)
        page.fill("#f-nome", "Helena Teste CRM")
        page.fill("#f-empresa", "Floricultura Teste")
        page.fill("#f-email", "helena@exemplo.com")
        page.fill("#f-telefone", "19991234567")
        page.select_option("#f-origem", index=1)
        page.select_option("#f-interesse", index=1)
        page.fill("#f-valor", "2500")
        page.locator("#form-salvar").click(); page.wait_for_timeout(500)
        check("Nexora CRM: lead cadastrado aparece na lista", "Helena Teste CRM" in page.inner_text("main"))
        check("Nexora CRM: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 7) Nexora Stock: saída maior que o saldo é bloqueada
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/nexora-stock/index.html")
        page.wait_for_timeout(400)
        page.get_by_role("button", name="Registrar saída").first.click(); page.wait_for_timeout(300)
        page.select_option("#f-produtoId", index=1)
        page.fill("#f-quantidade", "999999")
        page.locator("#form-salvar").click(); page.wait_for_timeout(300)
        blocked = page.locator("dialog[open]").count() == 1 and re.search(r"saldo|dispon|maior", page.locator("dialog[open]").inner_text(), re.I) is not None
        check("Nexora Stock: saída maior que o saldo é bloqueada", blocked, page.locator("dialog[open]").inner_text()[:200] if page.locator("dialog[open]").count() else "janela fechou")
        page.fill("#f-quantidade", "1")
        page.locator("#form-salvar").click(); page.wait_for_timeout(400)
        check("Nexora Stock: saída válida é registrada", page.locator("dialog[open]").count() == 0)
        check("Nexora Stock: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 8) Nexora Auto: abrir uma ordem de serviço
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/nexora-auto/index.html")
        page.wait_for_timeout(400)
        check("Nexora Auto: painel carrega (sem tela de erro)", page.locator("#erro-carga").is_hidden())
        page.get_by_role("button", name="Nova OS").first.click(); page.wait_for_timeout(300)
        page.select_option("#f-clienteId", index=1); page.wait_for_timeout(200)
        page.select_option("#f-veiculoId", index=1); page.wait_for_timeout(150)
        # A quilometragem de entrada não pode ser menor que a última registrada do veículo.
        last_km = re.search(r"Última quilometragem:\s*([\d.]+)", page.locator("dialog[open]").inner_text())
        km = int(last_km.group(1).replace(".", "")) + 350 if last_km else 50000
        page.fill("#f-kmEntrada", str(km))
        page.fill("#f-relato", "Barulho na suspensão dianteira ao passar em lombadas (teste automatizado).")
        page.locator("#form-salvar").click(); page.wait_for_timeout(600)
        check("Nexora Auto: nova OS aberta", page.locator("dialog[open]").count() == 0 and "suspensão dianteira" in page.inner_text("main"))
        check("Nexora Auto: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 9) Solado: produto no carrinho com subtotal
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/tenis/index.html")
        page.locator("#loja button", has_text="Garoa").first.click(); page.wait_for_timeout(300)
        page.locator('label[for="pt-40"]').click()
        page.click("#adicionar"); page.wait_for_timeout(300)
        check("Solado: carrinho conta 1 item", page.inner_text("#contador-carrinho").strip() == "1")
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        page.click("#abrir-carrinho"); page.wait_for_timeout(300)
        check("Solado: subtotal com o preço do produto", "459,90" in page.inner_text("#carrinho-subtotal"))
        ctx.close()

        # 10) Avesso: peça na sacola
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/moda/index.html")
        page.locator("main a", has_text="Camiseta Avesso").first.click(); page.wait_for_timeout(400)
        page.click("#adicionar"); page.wait_for_timeout(200)
        check("Avesso: sem tamanho escolhido a peça não entra", page.inner_text("#contador-sacola").strip() == "0")
        page.locator('label[for="pt-M"]').click()
        page.click("#adicionar"); page.wait_for_timeout(300)
        check("Avesso: sacola conta 1 peça", page.inner_text("#contador-sacola").strip() == "1")
        page.goto(f"{base}/projetos/moda/index.html#/sacola"); page.wait_for_timeout(300)
        check("Avesso: subtotal da sacola", "129,00" in page.inner_text("#resumo-subtotal"))
        ctx.close()

        # 11) Ponto: encomenda com validação e resumo
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/doces-salgados/index.html")
        for _ in range(25):
            page.click('button[data-acao="mais"][data-id="brigadeiro"]')
        page.wait_for_timeout(200)
        check("Ponto: total da encomenda atualizado", page.inner_text("#total-valor").strip() not in ("R$ 0,00", ""))
        form = page.locator("#form-encomenda")
        form.locator("button[type=submit]").first.click(); page.wait_for_timeout(300)
        check("Ponto: data e nome obrigatórios", page.inner_text("#f-nome-erro").strip() != "" or page.inner_text("#f-data-erro").strip() != "")
        ctx.close()

        # 12) AutoPrime: pedido de orçamento revisado antes de enviar
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/projetos/autoprime/index.html#orcamento")
        page.locator("#orcamento button[type=submit]").click(); page.wait_for_timeout(200)
        check("AutoPrime: formulário vazio mostra erros", page.locator("#orcamento [aria-invalid=true]").count() > 0)
        page.fill("#f-nome", "Eduardo Teste")
        page.fill("#f-telefone", "19991234567")
        page.fill("#f-marca", "Volkswagen")
        page.fill("#f-modelo", "Gol")
        page.select_option("#f-servico", index=1)
        page.fill("#f-descricao", "Revisão dos 60 mil km e verificação do barulho no freio.")
        page.check("#f-consentimento")
        page.locator("#orcamento button[type=submit]").click(); page.wait_for_timeout(400)
        body = page.inner_text("body")
        check("AutoPrime: revisão mostra os dados antes de enviar", "Eduardo Teste" in body and "Gol" in body)
        check("AutoPrime: sem erros", not page.errors, "; ".join(page.errors[:2]))
        ctx.close()

        # 13) Tema escolhido no portfólio vale nas demos (mesma chave "martins-tema")
        ctx, page = page_for(browser, base)
        page.goto(f"{base}/index.html")
        page.click("[data-theme-toggle]")
        chosen = page.get_attribute("html", "data-theme")
        page.goto(f"{base}/projetos/violet-studio/index.html")
        page.wait_for_timeout(200)
        check("Tema escolhido no portfólio continua na demo", page.get_attribute("html", "data-theme") == chosen, chosen)
        ctx.close()

        browser.close()
    server.shutdown()
    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{len(RESULTS) - len(failed)} de {len(RESULTS)} verificações passaram.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
