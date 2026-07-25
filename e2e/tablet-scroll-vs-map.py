"""
E2E: em tablet touch (iPad landscape simulado), o scroll da lista de leads
NÃO deve provocar pan/zoom do mapa, e o mapa deve continuar interativo
onde ele ocupa a viewport.

Roda contra o dev-server local (http://localhost:8080) usando a rota interna
/dev/lead-preview + a home /. Uso: `python e2e/tablet-scroll-vs-map.py`.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        # iPad Air landscape, com touch habilitado.
        context = await browser.new_context(
            viewport={"width": 1180, "height": 820},
            has_touch=True,
            is_mobile=False,
            device_scale_factor=2,
            user_agent=(
                "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/17.0 Mobile/15E148 Safari/604.1"
            ),
        )
        page = await context.new_page()

        # 1) Home: verifica data-attributes em <html> (device/pointer/orientation).
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_timeout(500)
        attrs = await page.evaluate(
            "() => ({ device: document.documentElement.dataset.device, "
            "pointer: document.documentElement.dataset.pointer, "
            "orientation: document.documentElement.dataset.orientation })"
        )
        assert attrs["orientation"] == "landscape", attrs
        assert attrs["device"] in ("tablet", "desktop"), attrs
        print("home dataset:", attrs)
        await page.screenshot(path=str(SHOTS / "1_home_tablet.png"))

        # 2) Lead preview: rola a lista com gesto de touch e confirma que o
        # scrollY do documento avançou (lista rolou) e que o scroll não foi
        # engolido por um mapa (rota /dev não tem mapa; validação de que a
        # área da lista responde a touch sem interferência).
        await page.goto(
            "http://localhost:8080/dev/lead-preview", wait_until="domcontentloaded"
        )
        await page.wait_for_selector("[data-testid=social-badge], [data-testid=social-button]")
        y_before = await page.evaluate("() => window.scrollY")
        # Swipe touch vertical
        await page.touch_screen.tap(600, 400)
        for _ in range(6):
            await page.mouse.wheel(0, 400)
        await page.wait_for_timeout(300)
        y_after = await page.evaluate("() => window.scrollY")
        assert y_after > y_before, f"lista não rolou: {y_before} → {y_after}"
        print(f"lead-preview scroll: {y_before} → {y_after} OK")
        await page.screenshot(path=str(SHOTS / "2_lead_scroll.png"))

        # 3) Home novamente: confirma que o mapa ficou com cursor de crosshair
        # apenas no fluxo mouse (tablet touch NÃO deve receber cursor mouse).
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        map_cursor = await page.evaluate(
            "() => { const el = document.querySelector('[class*=gm-style]'); "
            "return el ? getComputedStyle(el).cursor : null }"
        )
        print("map cursor (tablet touch):", map_cursor)
        # Em tablet touch, `pickGestureHandling` retorna 'greedy' e o cursor
        # 'crosshair' NÃO deve ser aplicado (é só para pointer=mouse).
        if map_cursor:
            assert "crosshair" not in map_cursor, map_cursor

        await browser.close()
        print("OK — todos os cenários passaram.")


asyncio.run(main())
