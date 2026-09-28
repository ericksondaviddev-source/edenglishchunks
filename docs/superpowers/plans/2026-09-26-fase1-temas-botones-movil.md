# Fase 1 · Temas Solar + Botones de Biblioteca + Móvil — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir los temas *Solar Light* / *Solar Dark* con botón ciclador, subir los botones de Biblioteca sobre la lista de líneas y reforzar la adaptación móvil, sin alterar el comportamiento actual.

**Architecture:** Todo lo nuevo vive en dos archivos externos (`assets/solar-themes.css`, `assets/theme-toggle.js`) cargados **después** del `<style>` de `index.html`, y en **3 ediciones puntuales** a `index.html`. El modo `system` conserva su paleta intacta (las secciones 1-4 sólo aplican a solar-light/solar-dark; sólo las secciones 5-6 —chrome del selector y ajustes móviles— aplican en los 3 modos), por lo que su aspecto actual queda intacto. Un script de verificación sin dependencias (`tools/check-ui.mjs`) valida tokens, contraste WCAG e invariantes de regresión.

**Tech Stack:** HTML/CSS/JS puro, Node ≥18 (`node:fs`, sin dependencias), DevTools MCP para verificación en navegador. Servidor local con Python incluido.

**Spec:** `docs/superpowers/specs/2026-09-26-solar-themes-biblioteca-video-design.md` (§4.1, §4.2, §4.3)

**Nota sobre control de versiones:** el directorio **no es un repo git**. Los "commits" de esta skill se sustituyen por **snapshots de respaldo con nombre fechado** en cada tarea que edita `index.html`. No inicializar git salvo petición explícita.

**Script de arranque del servidor** (se usa en varias tareas):

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Start-Process -FilePath "C:\Users\USUARIO\AppData\Local\Programs\Python\Python312\python.exe" `
  -ArgumentList "-m","http.server","8770","--bind","127.0.0.1" `
  -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 2
(Invoke-WebRequest -Uri "http://127.0.0.1:8770/index.html" -UseBasicParsing).StatusCode
```

Esperado: `200`.

---

### Task 1: Snapshot de respaldo de `index.html`

**Files:**
- Create: `index.backup-2026-09-26.html`
- (copia exacta de `index.html`, 238810 bytes)

- [ ] **Step 1: Crear el respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item -LiteralPath "$root\index.html" -Destination "$root\index.backup-2026-09-26.html" -Force
```

- [ ] **Step 2: Verificar que la copia es idéntica**

```powershell
$a = (Get-FileHash "$root\index.html" -Algorithm SHA256).Hash
$b = (Get-FileHash "$root\index.backup-2026-09-26.html" -Algorithm SHA256).Hash
if ($a -eq $b) { "OK respaldo identico ($($a.Substring(0,12)))" } else { "ERROR: distinto" }
```

Esperado: `OK respaldo identico (...)`.

---

### Task 2: Script de verificación `tools/check-ui.mjs` (test que debe fallar primero)

**Files:**
- Create: `tools/check-ui.mjs`

- [ ] **Step 1: Escribir el test completo**

```js
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

const ok = (name, pass, detail = "") => {
  console.log((pass ? "PASS  " : "FAIL  ") + name + (pass ? "" : "  -> " + detail));
  if (!pass) failed += 1;
};
const readSafe = (rel) => { try { return readFileSync(resolve(ROOT, rel), "utf8"); } catch { return null; } };

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex) => {
  let h = String(hex).trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return NaN;
  return 0.2126 * lin(parseInt(h.slice(0, 2), 16))
       + 0.7152 * lin(parseInt(h.slice(2, 4), 16))
       + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
};
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

function tokensOf(css, selector) {
  const i = css.indexOf(selector);
  if (i < 0) return null;
  const o = css.indexOf("{", i), c = css.indexOf("}", o);
  if (o < 0 || c < 0) return null;
  const out = {};
  for (const m of css.slice(o + 1, c).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const TOKENS = ["--page","--surface","--surface-2","--ink","--muted","--line","--navy",
  "--blue","--blue-soft","--yellow","--yellow-soft","--red","--green","--green-soft","--shadow"];

const PAIRS_LIGHT = [
  ["--ink","--surface",4.5], ["--ink","--page",4.5],
  ["--muted","--surface",4.5], ["--muted","--page",4.5],
  ["--surface","--navy",4.5], ["#ffffff","--blue",4.5],
  ["--blue","--blue-soft",4.5], ["--blue","--surface",4.5],
  ["#1c2b3a","--yellow",4.5], ["--red","--surface",4.5],
  ["--green","--surface",4.5], ["--ink","--yellow-soft",4.5], ["--ink","--green-soft",4.5],
];
const PAIRS_DARK = [
  ["--ink","--surface",4.5], ["--ink","--page",4.5],
  ["--muted","--surface",4.5], ["--muted","--page",4.5],
  ["#172435","--yellow",4.5], ["#1c2b3a","--yellow",4.5],
  ["--blue","--surface",4.5], ["--blue","--blue-soft",4.5],
  ["#14211c","--blue",4.5], ["#241b12","--red",4.5],
  ["--red","--surface",4.5], ["--green","--surface",4.5],
  ["--ink","--yellow-soft",4.5], ["--ink","--green-soft",4.5],
];

// ---- 1. archivos nuevos ----
const css = readSafe("assets/solar-themes.css");
const js = readSafe("assets/theme-toggle.js");
ok("existe assets/solar-themes.css", Boolean(css), "no encontrado");
ok("existe assets/theme-toggle.js", Boolean(js), "no encontrado");

// ---- 2. tokens completos en ambos temas ----
for (const [theme, selector] of [
  ["solar-light", ':root[data-theme="solar-light"]'],
  ["solar-dark", ':root[data-theme="solar-dark"]'],
]) {
  const tokens = css ? tokensOf(css, selector) : null;
  ok(`theme ${theme}: bloque presente`, Boolean(tokens), "selector no encontrado: " + selector);
  if (tokens) {
    const missing = TOKENS.filter((t) => !tokens[t]);
    ok(`theme ${theme}: ${TOKENS.length} tokens completos`, missing.length === 0, "faltan: " + missing.join(", "));
  }
}

// ---- 3. contraste WCAG ----
function checkPairs(label, selector, pairs) {
  const tokens = css ? tokensOf(css, selector) : null;
  if (!tokens) { ok(`${label}: contrastes`, false, "sin tokens"); return; }
  for (const [fg, bg, min] of pairs) {
    const a = fg.startsWith("#") ? fg : tokens[fg];
    const b = bg.startsWith("#") ? bg : tokens[bg];
    const r = ratio(a, b);
    const pass = !Number.isNaN(r) && r >= min;
    ok(`${label}: ${fg} sobre ${bg} >= ${min}`, pass, `ratio=${Number.isNaN(r) ? "NaN" : r.toFixed(2)} (${a} / ${b})`);
  }
}
checkPairs("solar-light", ':root[data-theme="solar-light"]', PAIRS_LIGHT);
checkPairs("solar-dark", ':root[data-theme="solar-dark"]', PAIRS_DARK);

// ---- 4. invariantes de regresión en index.html ----
const html = readSafe("index.html");
if (!html) {
  ok("index.html legible", false, "no encontrado");
} else {
  ok("index.html enlaza solar-themes.css", /href="assets\/solar-themes\.css"/.test(html));
  ok("index.html enlaza theme-toggle.js", /src="assets\/theme-toggle\.js"/.test(html));
  ok("botón de tema en el topbar", html.includes('id="themeCycleBtn"'));
  ok("6 pestañas originales intactas",
    ["cardsTab","quizTab","respondTab","questionTab","sequenceTab","creativeTab"]
      .every((id) => html.includes('id="' + id + '"')));
  ok("validacion 9 episodios / 2250 chunks intacta",
    html.includes("CREATIVE_COLLECTIONS.stories.length !== 9") && html.includes("podcastChunkCount !== 2250"));
  ok("viewport-fit=cover conservado", html.includes("viewport-fit=cover"));
  ok("cargador de podcast-series intacto", html.includes("CREATIVE_COLLECTIONS.stories = await podcastSeriesResponse.json()"));
  ok("listeners de Biblioteca intactos",
    html.includes('id="creativeListenBtn"') && html.includes('id="creativeSequenceBtn"') &&
    html.includes("addCreativeChunksToSequence"));

  const fn = html.slice(html.indexOf("function renderCreative"), html.indexOf("function playCreativeAudio"));
  const iHead = fn.indexOf('class="creative-reader-head"');
  const iActions = fn.indexOf('class="creative-actions"');
  const iLines = fn.indexOf('class="creative-lines"');
  ok("Biblioteca: acciones ANTES de la lista de lineas",
    iHead > -1 && iActions > -1 && iLines > -1 && iHead < iActions && iActions < iLines,
    `head=${iHead} actions=${iActions} lines=${iLines}`);
}

// ---- 5. lógica del selector ----
ok("theme-toggle.js cicla system -> solar-light -> solar-dark",
  Boolean(js) && /system/.test(js) && /solar-light/.test(js) && /solar-dark/.test(js));
ok("theme-toggle.js persiste en localStorage",
  Boolean(js) && js.includes("localStorage") && js.includes("ed-theme"));

console.log(failed === 0 ? "\nTODO OK (0 fallos)" : `\n${failed} FALLO(S)`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Ejecutar y confirmar que FALLA (TDD)**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
echo "exit=$LASTEXITCODE"
```

Esperado: varias líneas `FAIL` (faltan `assets/solar-themes.css`, `assets/theme-toggle.js`, el botón y el enlace) y `exit=1`.

---

### Task 3: `assets/solar-themes.css`

**Files:**
- Create: `assets/solar-themes.css`

- [ ] **Step 1: Escribir paletas + overrides de componentes**

```css
/* ==========================================================================
   Inglés con Chunks · Temas "Solar" (solar punk)
   Se carga DESPUÉS del <style> de index.html → gana en empates de especificidad.
   Secciones 1-4 sólo se aplican con data-theme="solar-light|solar-dark".
   El modo "system" no recibe NINGUNA regla de este bloque (aspecto actual intacto).
   ========================================================================== */

/* ---------- 1. Solar Light · papel cálido ---------- */
:root[data-theme="solar-light"] {
  color-scheme: light;
  --page: #faf5e9;
  --surface: #fffdf7;
  --surface-2: #f4eddd;
  --ink: #2a2318;
  --muted: #6b6152;
  --line: #e2d8c3;
  --navy: #1c4a3f;
  --blue: #1f6f63;
  --blue-soft: #e2f0ea;
  --yellow: #e9a92c;
  --yellow-soft: #fdf1d3;
  --red: #b4472f;
  --green: #2f7a4a;
  --green-soft: #e3f2e7;
  --shadow: 0 18px 50px rgba(90, 70, 30, .16);
}

/* ---------- 2. Solar Dark · carbón cálido ---------- */
:root[data-theme="solar-dark"] {
  color-scheme: dark;
  --page: #191510;
  --surface: #221c15;
  --surface-2: #2a231a;
  --ink: #f2e8d5;
  --muted: #bcb09a;
  --line: #3a3226;
  --navy: #0e0b07;
  --blue: #7fd0c0;
  --blue-soft: #153029;
  --yellow: #f5c04a;
  --yellow-soft: #3d3115;
  --red: #ef8f74;
  --green: #79d39b;
  --green-soft: #16321f;
  --shadow: 0 20px 56px rgba(0, 0, 0, .45);
}

/* ---------- 3. Solar Light · componentes vuelven al patrón "primario" ----------
   Neutralizan las 6 reglas de index.html condicionadas a prefers-color-scheme: dark
   (líneas 78, 196, 272, 318, 371, 453), que dependen del SO y no del tema elegido. */
[data-theme="solar-light"] .mode-tab.active { background: var(--navy); color: var(--surface); }
[data-theme="solar-light"] .learn-button { background: var(--navy); color: var(--surface); border-color: var(--navy); }
[data-theme="solar-light"] .quiz-next { background: var(--navy); color: var(--surface); }
[data-theme="solar-light"] .respond-next { background: var(--navy); color: var(--surface); }
[data-theme="solar-light"] .sequence-video-button { border-color: var(--navy); background: var(--navy); color: var(--surface); }
[data-theme="solar-light"] .toast { background: var(--navy); color: var(--surface); }

/* ---------- 4. Solar Dark · primario = amarillo, texto oscuro ---------- */
[data-theme="solar-dark"] .mode-tab.active { background: var(--yellow); color: #1b2430; }
[data-theme="solar-dark"] .learn-button { background: var(--yellow); color: #172435; border-color: var(--yellow); }
[data-theme="solar-dark"] .quiz-next { background: var(--yellow); color: #172435; }
[data-theme="solar-dark"] .respond-next { background: var(--yellow); color: #172435; }
[data-theme="solar-dark"] .sequence-video-button { border-color: var(--yellow); background: var(--yellow); color: #172435; }
[data-theme="solar-dark"] .toast { background: var(--yellow); color: #142334; }

/* Botones con fondo --blue / --red: en oscuro el texto pasa a oscuro (contraste AA) */
[data-theme="solar-dark"] .listen-card,
[data-theme="solar-dark"] .quiz-listen,
[data-theme="solar-dark"] .sequence-primary,
[data-theme="solar-dark"] .creative-listen { color: #14211c; }

[data-theme="solar-dark"] .listen-card.playing,
[data-theme="solar-dark"] .quiz-listen.playing,
[data-theme="solar-dark"] .quiz-repeat.listening,
[data-theme="solar-dark"] .sequence-primary.playing,
[data-theme="solar-dark"] .creative-listen.playing,
[data-theme="solar-dark"] .mic-button { color: #241b12; }
```

- [ ] **Step 2: Añadir chrome del selector y ajustes móviles (mismo archivo)**

```css

/* ==========================================================================
   5. Chrome del selector de tema  (aplica SIEMPRE, en los 3 modos)
   ========================================================================== */
.topbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.theme-cycle {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  padding: 9px 13px;
  border-radius: 10px;
  font-weight: 750;
  font-size: .9rem;
  white-space: nowrap;
  cursor: pointer;
}
.theme-cycle:hover { border-color: var(--blue); color: var(--blue); }
.theme-cycle:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

/* ==========================================================================
   6. Ajustes móviles  (aplican SIEMPRE; no tocan el <style> original)
   ========================================================================== */
input, select, textarea { font-size: 16px; }   /* evita el zoom automático de iOS */

@media (max-width: 590px) {
  .topbar-actions { display: grid; grid-template-columns: minmax(0, auto) minmax(0, 1fr); width: 100%; gap: 8px; }
  .theme-cycle { width: 100%; text-align: center; min-height: 44px; }

  .mode-tab { min-height: 44px; display: flex; align-items: center; justify-content: center; }
  .module-button, .creative-pick, .nav-button, .random-button { min-height: 44px; }
  .listen-card, .quiz-listen, .quiz-repeat, .mic-button,
  .sequence-primary, .creative-listen, .creative-sequence { min-height: 44px; }

  .shell { padding-bottom: calc(44px + env(safe-area-inset-bottom)); }
  .audio-bar { position: sticky; top: 0; z-index: 6; box-shadow: var(--shadow); }

  /* Lista de Biblioteca con scroll propio acotado (evita duplicar scroll de página) */
  .creative-library { max-height: 50vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
}
```

- [ ] **Step 3: Ejecutar el test**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
echo "exit=$LASTEXITCODE"
```

Esperado: pasan los puntos 1-3 (archivos, tokens, contrastes); siguen **fallando** los puntos 4 (enlace, botón, orden) y 5 (`ed-theme`). `exit=1`.

Si algún contraste falla, el mensaje indica exactamente el par y el ratio; ajustar SOLO el valor del token señalado en `solar-themes.css` y repetir.

---

### Task 4: `assets/theme-toggle.js`

**Files:**
- Create: `assets/theme-toggle.js`

- [ ] **Step 1: Escribir el selector**

```js
/* Inglés con Chunks · selector de tema Sistema / Solar Light / Solar Dark.
   Se carga en <head> para fijar data-theme antes del primer render (sin parpadeo). */
(function () {
  var KEY = "ed-theme";
  var ORDER = ["system", "solar-light", "solar-dark"];
  var LABELS = { system: "\u2600\uFE0E Sistema", "solar-light": "\u2600\uFE0E Solar", "solar-dark": "\u263E Solar" };

  var saved = null;
  try { saved = window.localStorage.getItem(KEY); } catch (err) { saved = null; }
  var current = ORDER.indexOf(saved) >= 0 ? saved : "system";

  function apply(theme) {
    current = theme;
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem(KEY, theme); } catch (err) { /* modo privado: se ignora */ }
    var button = document.getElementById("themeCycleBtn");
    if (button) {
      button.textContent = LABELS[theme];
      button.setAttribute("aria-label", "Tema actual: " + theme + ". Pulsa para cambiar.");
    }
  }

  apply(current);

  document.addEventListener("DOMContentLoaded", function () {
    apply(current);
    var button = document.getElementById("themeCycleBtn");
    if (!button) return;
    button.addEventListener("click", function () {
      apply(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
    });
  });
})();
```

- [ ] **Step 2: Ejecutar el test**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
echo "exit=$LASTEXITCODE"
```

Esperado: pasa el punto 5 (`localStorage` / `ed-theme`). Siguen fallando los puntos de `index.html`. `exit=1`.

---

### Task 5: Edición A — enlazar los archivos nuevos en `<head>`

**Files:**
- Modify: `index.html:545-546`

- [ ] **Step 1: Snapshot de respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item -LiteralPath "$root\index.html" -Destination "$root\index.pre-edit-A.html" -Force
```

- [ ] **Step 2: Aplicar la edición**

Buscar exactamente (líneas 545-546):

```html
  </style>
</head>
```

Reemplazar por:

```html
  </style>
  <link rel="stylesheet" href="assets/solar-themes.css">
  <script src="assets/theme-toggle.js"></script>
</head>
```

- [ ] **Step 3: Verificar que sólo cambió esa zona**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
$d = Compare-Object (Get-Content "$root\index.pre-edit-A.html") (Get-Content "$root\index.html")
$d | Format-Table -AutoSize
```

Esperado: exactamente 2 filas (`<=` la línea `</head>` y `=>` las 3 líneas nuevas).

---

### Task 6: Edición B — botón de tema en el topbar

**Files:**
- Modify: `index.html:558-559`

- [ ] **Step 1: Snapshot de respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item -LiteralPath "$root\index.html" -Destination "$root\index.pre-edit-B.html" -Force
```

- [ ] **Step 2: Aplicar la edición**

Buscar exactamente:

```html
      <button class="cta" id="personalizedBtn" type="button">Quiero mi app personalizada</button>
    </header>
```

Reemplazar por:

```html
      <div class="topbar-actions">
        <button class="theme-cycle" id="themeCycleBtn" type="button" aria-label="Tema actual: system. Pulsa para cambiar.">☀︎ Sistema</button>
        <button class="cta" id="personalizedBtn" type="button">Quiero mi app personalizada</button>
      </div>
    </header>
```

- [ ] **Step 3: Verificar diff**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
(Compare-Object (Get-Content "$root\index.pre-edit-B.html") (Get-Content "$root\index.html")).Count
```

Esperado: `4` (2 líneas quitadas, 4 añadidas).

---

### Task 7: Ejecutar test — confirmar que sólo queda el orden de Biblioteca

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
echo "exit=$LASTEXITCODE"
```

Esperado: **solo** `FAIL  Biblioteca: acciones ANTES de la lista de lineas`; todo lo demás `PASS`; `exit=1`.

---

### Task 8: Edición C — subir los botones de Biblioteca

**Files:**
- Modify: `index.html` (función `renderCreative`, líneas 4100-4104)

- [ ] **Step 1: Snapshot de respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item -LiteralPath "$root\index.html" -Destination "$root\index.pre-edit-C.html" -Force
```

- [ ] **Step 2: Aplicar la edición**

Buscar exactamente este bloque:

```js
        '<ol class="creative-lines">' + lines.map(function(line, index) {
          return '<li class="creative-line"><span class="creative-line-number">' + (index + 1) + '</span><div>' + (line.speaker ? '<span class="creative-speaker">' + escapeHtml(line.speaker) + '</span>' : '') + '<p class="creative-line-en">' + escapeHtml(line.en || line.text || "") + '</p>' + (line.es ? '<p class="creative-line-es">' + escapeHtml(line.es) + '</p>' : '') + '</div></li>';
        }).join("") + '</ol>' +
        '<div class="creative-actions"><button class="creative-listen" id="creativeListenBtn" type="button">▶ Escuchar audio completo</button><button class="creative-sequence" id="creativeSequenceBtn" type="button">Practicar estos chunks</button></div>';
```

Reemplazar por (las acciones **antes** del `<ol>`, el `<ol>` al final, mismo contenido exacto):

```js
        '<div class="creative-actions"><button class="creative-listen" id="creativeListenBtn" type="button">▶ Escuchar audio completo</button><button class="creative-sequence" id="creativeSequenceBtn" type="button">Practicar estos chunks</button></div>' +
        '<ol class="creative-lines">' + lines.map(function(line, index) {
          return '<li class="creative-line"><span class="creative-line-number">' + (index + 1) + '</span><div>' + (line.speaker ? '<span class="creative-speaker">' + escapeHtml(line.speaker) + '</span>' : '') + '<p class="creative-line-en">' + escapeHtml(line.en || line.text || "") + '</p>' + (line.es ? '<p class="creative-line-es">' + escapeHtml(line.es) + '</p>' : '') + '</div></li>';
        }).join("") + '</ol>';
```

> Nota: al mover el `<div>` antes del `<ol>`, el `+` final del `<ol>` desaparece y el `</div>` de acciones ya no cierra nada fuera.

- [ ] **Step 3: Ejecutar el test completo**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
echo "exit=$LASTEXITCODE"
```

Esperado: `TODO OK (0 fallos)` y `exit=0`.

---

### Task 9: Verificación en navegador — temas y botones

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Arrancar el servidor local**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Start-Process -FilePath "C:\Users\USUARIO\AppData\Local\Programs\Python\Python312\python.exe" `
  -ArgumentList "-m","http.server","8770","--bind","127.0.0.1" `
  -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 2
(Invoke-WebRequest -Uri "http://127.0.0.1:8770/index.html" -UseBasicParsing).StatusCode
```

Esperado: `200`.

- [ ] **Step 2: Abrir la página**

`chrome-devtools_new_page` → `http://127.0.0.1:8770/index.html`

- [ ] **Step 3: Comprobar consola limpia y tema inicial**

`chrome-devtools_list_console_messages` (página seleccionada).

Esperado: **ningún** `error`.

`chrome-devtools_evaluate_script`:

```js
() => ({
  theme: document.documentElement.getAttribute("data-theme"),
  pageBg: getComputedStyle(document.body).backgroundColor,
  ink: getComputedStyle(document.body).color,
  button: document.getElementById("themeCycleBtn")?.textContent,
  topbarKids: [...document.querySelector(".topbar").children].map(e => e.className)
})
```

Esperado: `theme: "system"`, `button: "☀︎ Sistema"`, `topbarKids: ["mode-tabs", "topbar-actions"]`, y `pageBg` coincide con el color actual del sistema.

- [ ] **Step 4: Ciclar los 3 modos y comprobar cambios reales**

```js
async () => {
  const out = [];
  for (let i = 0; i < 4; i++) {
    document.getElementById("themeCycleBtn").click();
    await new Promise(r => setTimeout(r, 120));
    out.push({
      theme: document.documentElement.getAttribute("data-theme"),
      label: document.getElementById("themeCycleBtn").textContent,
      page: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.body).color
    });
  }
  return out;
}
```

Esperado: 4 entradas en orden `system → solar-light → solar-dark → system`, con `page` distinto en cada modo (`solar-light` ≈ `rgb(250, 245, 233)`, `solar-dark` ≈ `rgb(25, 21, 16)`) y `system` = color del SO.

- [ ] **Step 5: Comprobar persistencia tras recargar**

`chrome-devtools_navigate_page` (`type: "reload"`) y repetir el script de Step 3.

Esperado: el tema elegido **antes** de recargar sigue aplicado (el test anterior deja el último en `system`; hacer un clic previo para dejarlo en `solar-dark` y verificar).

- [ ] **Step 6: Abrir Biblioteca y verificar el orden de los botones**

```js
async () => {
  document.getElementById("creativeTab").click();
  await new Promise(r => setTimeout(r, 400));
  const reader = document.getElementById("creativeReader");
  return {
    tabActive: document.getElementById("creativeTab").classList.contains("active"),
    children: [...reader.children].map(e => e.className),
    hasListen: Boolean(document.getElementById("creativeListenBtn")),
    hasSequence: Boolean(document.getElementById("creativeSequenceBtn"))
  };
}
```

Esperado: `children` = `["creative-reader-head", "creative-actions", "creative-lines"]`, `hasListen` y `hasSequence` = `true`, `tabActive` = `true`.

- [ ] **Step 7: Verificar que los botones responden (clic real, no sintético)**

Los navegadores bloquean `play()` si no hay gesto real de usuario, así que el clic debe hacerse con la herramienta de clic de DevTools, no con `.click()` de JS.

1. `chrome-devtools_take_snapshot` → localizar el `uid` del botón **"▶ Escuchar audio completo"**.
2. `chrome-devtools_click` sobre ese `uid`.
3. `chrome-devtools_evaluate_script`:

```js
() => ({
  text: document.getElementById("creativeListenBtn").textContent,
  playing: document.getElementById("creativeListenBtn").classList.contains("playing"),
  src: document.getElementById("audioPlayer").getAttribute("src")
})
```

Esperado: `text` = `■ Detener audio`, `playing: true`, `src` apunta a un MP3 bajo `assets/podcasts/`.

4. Clic de nuevo (mismo `uid` o `chrome-devtools_evaluate_script` llamando a `stopSpeech()` global) para dejarlo detenido.

**Fallo esperado y aceptable:** si el navegador bloquea el autoplay, `text` vuelve a `▶ Escuchar audio completo` y aparece un toast "Este audio todavía no está disponible." — anotarlo; no es regresión de esta fase (ese flujo es idéntico al de `index.backup-2026-09-26.html`, comprobable abriendo el respaldo en otra pestaña con el mismo servidor).

- [ ] **Step 8: Regresión de contenido**

```js
() => ({
  tabs: ["cardsTab","quizTab","respondTab","questionTab","sequenceTab","creativeTab"]
    .map(id => ({ id, disabled: document.getElementById(id).disabled })),
  loading: document.getElementById("cardHost")?.textContent?.slice(0, 60),
  totalCount: document.getElementById("totalCount")?.textContent
})
```

Esperado: ninguna pestaña `disabled` tras cargar, `cardHost` sin "Cargando", `totalCount` = `450`.

---

### Task 10: Verificación móvil

- [ ] **Step 1: Viewport 360×640**

`chrome-devtools_resize_page` → `width: 360`, `height: 640`.

> Mantener **Biblioteca abierta** (Task 9, Step 6) para que el Step 2 pueda medir también `.creative-pick`.

- [ ] **Step 2: Comprobar desbordes y targets**

```js
() => {
  const doc = document.documentElement;
  const small = [];
  document.querySelectorAll("button, select, a").forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44)) {
      small.push({ cls: el.className.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
    }
  });
  return {
    horizontalScroll: doc.scrollWidth > doc.clientWidth,
    scrollW: doc.scrollWidth, clientW: doc.clientWidth,
    smallTargets: small.slice(0, 12),
    themeBtnW: Math.round(document.getElementById("themeCycleBtn").getBoundingClientRect().width)
  };
}
```

Esperado: `horizontalScroll: false`; `themeBtnW > 0`; `smallTargets` sin entradas de `.mode-tab`, `.module-button`, `.creative-pick` (otros elementos pequeños como enlaces de texto son aceptables y se anotan para revisión).

- [ ] **Step 3: Captura**

`chrome-devtools_take_screenshot` → guardar en `docs/superpowers/proofs/fase1-360x640.png`.

- [ ] **Step 4: Repetir en 390×844 y 414×896**

`chrome-devtools_resize_page` + Step 2 + captura (`fase1-390x844.png`, `fase1-414x896.png`).

- [ ] **Step 5: Verificar el zoom de iOS no dispara**

```js
() => {
  const sel = document.getElementById("rateSelect");
  sel.focus();
  return { fontSize: getComputedStyle(sel).fontSize, focused: document.activeElement === sel };
}
```

Esperado: `fontSize: "16px"`.

- [ ] **Step 6: Landscape (verificar que `.layout` no rompe)**

`chrome-devtools_resize_page` → `width: 740`, `height: 360`.

```js
() => {
  const layout = document.querySelector(".layout");
  const cs = getComputedStyle(layout);
  return {
    columns: cs.gridTemplateColumns,
    horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    topbarOverflow: document.querySelector(".topbar").scrollWidth > document.querySelector(".topbar").clientWidth
  };
}
```

Esperado: sin `horizontalScroll` y sin desborde del topbar (en 740 px mantiene 1 columna porque el corte es 860 px; el topbar puede envolver pestañas, eso es correcto).

- [ ] **Step 7: Comprobar consola final**

`chrome-devtools_list_console_messages`.

Esperado: **ningún** `error`.

---

### Task 11: Limpieza

- [ ] **Step 1: Cerrar la página**

`chrome-devtools_close_page` (página de verificación).

- [ ] **Step 2: Detener el servidor de pruebas**

```powershell
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
  Where-Object { $_.CommandLine -like '*http.server*8770*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; "detenido $($_.ProcessId)" }
Start-Sleep -Seconds 1
if (Get-NetTCPConnection -LocalPort 8770 -State Listen -ErrorAction SilentlyContinue) { "ERROR: puerto 8770 ocupado" } else { "OK puerto 8770 libre" }
```

- [ ] **Step 3: Conservar los respaldos y listar el resultado final**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Get-ChildItem $root -File | Select-Object Name, Length | Format-Table -AutoSize
Get-ChildItem "$root\assets" -File -Filter "*.css" | Select-Object Name, Length
Get-ChildItem "$root\assets" -File -Filter "*.js" | Select-Object Name, Length
```

Esperado: `index.backup-2026-09-26.html`, `index.pre-edit-A/B/C.html`, `assets/solar-themes.css`, `assets/theme-toggle.js`, `tools/check-ui.mjs`.

Si el usuario confirma que la app se ve bien, puede borrar `index.pre-edit-*.html` (conservar `index.backup-2026-09-26.html`).

---

## Criterios de aceptación de la Fase 1

1. `node tools/check-ui.mjs` → `TODO OK (0 fallos)`, `exit=0`.
2. Los 3 modos cambian la paleta completa, persisten tras recargar y no producen parpadeo.
3. `system` conserva su paleta actual intacta (las secciones 1-4 sólo aplican a solar-light/solar-dark); las secciones 5-6 (chrome del selector y ajustes móviles) aplican en los 3 modos, por diseño.
4. En Biblioteca: `creative-reader-head` → `creative-actions` → `creative-lines`.
5. Las 6 pestañas, las 450 tarjetas y los 9 episodios/2250 chunks intactos.
6. Sin scroll horizontal a 360 px; targets principales ≥44 px; `select` a 16 px.
7. Consola sin errores.

## Siguientes fases (planes aparte)

- **Fase 2** — 2 historias TTS con diálogos + letras de 2 canciones (§4.4)
- **Fase 3** — Motor de video: 3 diseños nuevos + animaciones + descargas de Biblioteca (§4.5, §4.7)
- **Fase 4** — Música de fondo en exportaciones MP3/MP4 (§4.6)
- **Fase 5** — Verificación completa (§7)
