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
    pg.click("#creativeTab")
    pg.wait_for_timeout(1000)
    pg.click("#songsKindBtn")
    pg.wait_for_timeout(800)

    pg.evaluate("""() => {
      const btns = document.querySelectorAll('[data-creative-index]');
      for (const b of btns) { if (b.textContent.includes('Sunrise City')) { b.click(); return; } }
    }""")
    pg.wait_for_timeout(700)

    out = {}
    out["creativeState"] = pg.evaluate("() => creativeState")
    print(json.dumps(out, indent=1, ensure_ascii=False))
    b.close()