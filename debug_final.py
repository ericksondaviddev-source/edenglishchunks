import json
from playwright.sync_api import sync_playwright

EXE = r"C:\Users\USUARIO\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe"
URL = "http://127.0.0.1:8765/index.html"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(URL, wait_until="load", timeout=30000)
    pg.wait_for_timeout(3000)

    pg.click("#startAppBtn")
    pg.wait_for_timeout(500)

    # Listen for console errors
    errors = []
    pg.on("pageerror", lambda e: print(f"PAGE ERROR: {e}"))
    pg.on("console", lambda msg: print(f"CONSOLE: {msg.type} - {msg.text}"))

    pg.click("#startAppBtn")
    pg.wait_for_timeout(10000)

    out = {}
    out["creativeTabDisabled"] = pg.evaluate("() => document.getElementById('creativeTab').disabled")
    out["cardHost"] = pg.evaluate("() => { const h = document.getElementById('cardHost'); return h ? h.className + ': ' + h.textContent.slice(0,200) : 'none'; }")
    print(json.dumps(out, indent=1))
    b.close()