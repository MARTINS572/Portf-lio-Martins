"""
Gera as prévias dos cards (assets/img/previas/*.webp) a partir das demonstrações reais.

Use depois de mudar a primeira tela de alguma demo:
    pip install playwright pillow
    playwright install chromium
    python tools/capturar-previas.py

O script abre cada demo num navegador (1280 x 800, tema claro), espera as fontes
carregarem e salva a primeira tela reduzida para 800 x 500 em WebP.
"""
import functools
import http.server
import io
import pathlib
import threading

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "previas"
SHOTS = {
    "autoprime": "projetos/autoprime/index.html",
    "black-copper": "projetos/black-copper/index.html",
    "violet-studio": "projetos/violet-studio/index.html",
    "solado": "projetos/tenis/index.html",
    "avesso": "projetos/moda/index.html",
    "ponto": "projetos/doces-salgados/index.html",
    "agendapro": "projetos/agendapro/index.html",
    "nexora-crm": "projetos/nexora-crm/index.html",
    "nexora-stock": "projetos/nexora-stock/index.html",
    "nexora-booking": "projetos/nexora-booking/index.html",
    "nexora-auto": "projetos/nexora-auto/index.html",
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for key, path in SHOTS.items():
            ctx = browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce", color_scheme="light")
            page = ctx.new_page()
            page.goto(f"{base}/{path}", wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            intro = page.get_by_role("button", name="Explorar demonstração")
            if intro.count():
                intro.click()
                page.wait_for_timeout(400)
            page.wait_for_timeout(500)
            image = Image.open(io.BytesIO(page.screenshot())).convert("RGB").resize((800, 500), Image.LANCZOS)
            target = OUT / f"{key}.webp"
            image.save(target, "WEBP", quality=80, method=6)
            print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")
            ctx.close()
        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
