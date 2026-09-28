# Fase 2.5 — Marca, tricolor, contactos y selector de diseño Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir identidad de marca (favicon + logo SVG tricolor con "ED-Dev"), acento tricolor Venezuela/La Guaira en el topbar, tema por defecto solar-light, selector de diseño de video visible en la toolbar de Secuencias y panel de contacto/colaboraciones — sin regresiones.

**Architecture:** Los estilos de componente van al `<style>` inline de `index.html` (patrón existente); el acento tricolor es idéntico en los 3 temas. El logo es SVG inline en el topbar; el favicon es un SVG aparte enlazado desde `<head>`. El selector de diseño se MUEVE del modal a la toolbar (los listeners usan `document.querySelectorAll("[data-video-theme]")` global, así que el movimiento no rompe nada). El panel de contacto es una sección inline oculta que se abre desde "Quiero mi app personalizada".

**Tech Stack:** SVG procedural, CSS (inline + solar-themes.css), vanilla JS, Node (guardrail).

---

## Contexto

| Hecho | Dónde |
|---|---|
| `<head>` cierra en `:553` (favicon link va antes) | `index.html:552-553` |
| `.topbar` CSS (flex, space-between, border-bottom) | `index.html:60-67` |
| Header topbar (nav mode-tabs + .topbar-actions) | `index.html:556-569` |
| Botones del topbar: themeCycleBtn + personalizedBtn | `index.html:566-567` |
| Listener de personalizedBtn (abre WhatsApp / toast) | `index.html:4392-4399` |
| `WHATSAPP_NUMBER = ""` | `index.html:911` |
| Swatches `.sequence-designs` (4 botones data-video-theme, DENTRO del modal) | `index.html:846-851` |
| Modal video-maker (`sequenceVideoMaker`, pace + preview + acciones) | `index.html:836-868` |
| Binding de swatches: `document.querySelectorAll("[data-video-theme]")` (GLOBAL — el movimiento no rompe) | `index.html:4502-4506` |
| CSS `.sequence-designs` (grid 2-col) y `.sequence-design` | `index.html:386-391` |
| Media query `.sequence-designs { grid-template-columns: 1fr 1fr; }` | `index.html:525` |
| `showToast(message)` existe | (usado en :4394) |
| Test actual: 76 checks, `node tools/check-ui.mjs` → `TODO OK (0 fallos)` | `tools/check-ui.mjs` |

### Invariantes

1. No romper validación 9/2250, `podcast-series.json`, ni nada de Fase 1/2 (`TODO OK` al final).
2. Topbar: divs balanceados + `.topbar-actions` con CTA + botón de tema (checks existentes).
3. Tricolor = SOLO acentos (no tema nuevo, no cambio de paleta de los temas).
4. Placeholders de contacto claramente rellenables (`TU_USUARIO` / `TU_BINANCE_ID`).

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `index.pre-fase25.html` | Respaldo | Crear |
| `tools/check-ui.mjs` | Sección 7 (Fase 2.5) | Modificar |
| `assets/favicon.svg` | Favicon tricolor | Crear |
| `index.html` | Logo topbar + acento + favicon link + default solar-light + selector arriba + panel contacto | Modificar (6 parches) |
| `README.txt` | Registro Fase 2.5 | Modificar |

---

## Task 1: Respaldo y test rojo

**Files:**
- Create: `index.pre-fase25.html`
- Modify: `tools/check-ui.mjs` (insertar sección 7 antes del console.log final)

- [ ] **Step 1: Respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item "$root\index.html" "$root\index.pre-fase25.html"
Get-Item "$root\index.pre-fase25.html" | Select-Object Name, Length
```

- [ ] **Step 2: Insertar sección 7 en check-ui.mjs** (justo antes de `console.log(failed === 0 ? ...`)

```js
// ---- 7. Fase 2.5: marca, tricolor, contactos, selector de diseño ----
const favSvg = readSafe("assets/favicon.svg");
ok("existe assets/favicon.svg", Boolean(favSvg), "no encontrado");
ok("favicon.svg es SVG con la marca tricolor", Boolean(favSvg) && favSvg.includes("<svg") &&
  favSvg.includes("#f5cd4b") && favSvg.includes("#185d9d") && favSvg.includes("#c83d45"),
  "sin <svg> o sin los 3 colores tricolor");
ok("index.html enlaza el favicon", html.includes('rel="icon"') && html.includes("assets/favicon.svg"),
  "link de favicon ausente");

if (html) {
  const headerStart = html.indexOf("<header");
  const headerEnd = html.indexOf("</header>");
  const hb = headerStart > -1 && headerEnd > headerStart ? html.slice(headerStart, headerEnd + 9) : "";
  ok("topbar: logo con marca + ED-Dev", hb.includes("topbar-brand") && hb.includes("ED-Dev"),
    "sin .topbar-brand o sin ED-Dev");
  ok("topbar: acento tricolor (topbar-flag)", hb.includes("topbar-flag"), "sin .topbar-flag");
  ok("topbar: div balanceado (Fase 2.5)", hb !== "" &&
    (hb.match(/<div/g) || []).length === (hb.match(/<\/div>/g) || []).length,
    `divs=${(hb.match(/<div/g) || []).length} cierres=${(hb.match(/<\/div>/g) || []).length}`);
  ok("panel de contacto presente", html.includes('id="contactPanel"') &&
    html.includes("contactHeading") && html.includes("binanceCopyBtn"),
    "faltan ids del panel");
  ok("contacto: enlaces Telegram/Instagram/LinkedIn",
    html.includes("t.me") && html.includes("instagram.com") && html.includes("linkedin.com"),
    "faltan enlaces");
  ok("colaborar: PayPal + Binance Pay", html.includes("paypal.me") && html.includes("Binance Pay"),
    "faltan datos de colaboración");
  const iDesigns = html.indexOf('class="sequence-designs"');
  const iMaker = html.indexOf('id="sequenceVideoMaker"');
  ok("selector de diseño de video FUERA del modal (en la toolbar)",
    iDesigns > -1 && iMaker > -1 && iDesigns < iMaker, `designs=${iDesigns} maker=${iMaker}`);
  ok("selector: >= 4 swatches con data-video-theme",
    (html.match(/data-video-theme=/g) || []).length >= 4,
    `count=${(html.match(/data-video-theme=/g) || []).length}`);
}
ok("theme-toggle.js: primera visita = solar-light", js.includes('? saved : "solar-light"'),
  "fallback sigue en system");
```

- [ ] **Step 3: Ejecutar el test — ROJO**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: 76 checks previos PASS, los ~12 nuevos FAIL (favicon/logo/contacto/selector/default), salida `N FALLO(S)`, exit 1. Ningún check previo puede fallar.

---

## Task 2: Favicon SVG

**Files:**
- Create: `assets/favicon.svg`
- Modify: `index.html` (link en `<head>`)

- [ ] **Step 1: Crear `assets/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#102a43"/>
  <rect x="13" y="16" width="10" height="34" rx="3" fill="#f5cd4b"/>
  <rect x="27" y="16" width="10" height="34" rx="3" fill="#185d9d"/>
  <rect x="41" y="16" width="10" height="34" rx="3" fill="#c83d45"/>
  <path d="M32 4.5l1.76 3.57 3.94.52-2.87 3.7.73 3.91L32 14.3l-3.56 1.9.73-3.91-2.87-3.7 3.94-.52z" fill="#ffffff"/>
</svg>
```

(Marca: 3 barras chunk tricolor amarillo/azul/rojo + estrella blanca de 5 puntos; fondo navy redondeado.)

- [ ] **Step 2: Enlazar en `<head>`** (junto al theme-toggle.js, antes de `</head>`)

```html
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
```

---

## Task 3: Logo topbar + acento tricolor

**Files:**
- Modify: `index.html` (HTML topbar + CSS) y `index.html:60-67` (position relative)

- [ ] **Step 1: Parche — CSS del logo y acento** (junto a `.topbar` en `:60-67`)

Añadir tras el bloque `.topbar { ... }`:

```css
    .topbar { position: relative; }
    .topbar-flag { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 999px; background: linear-gradient(90deg, #f5cd4b 0 33%, #185d9d 33% 66%, #c83d45 66%); }
    .topbar-brand { display: flex; align-items: center; gap: 8px; margin-right: 4px; }
    .topbar-brand svg { width: 26px; height: 26px; flex: 0 0 auto; }
    .topbar-brand strong { font-family: Georgia, "Times New Roman", serif; font-size: .95rem; letter-spacing: .04em; white-space: nowrap; }
```

> Nota: el `.topbar { position: relative; }` aquí SOBRESCRIBE el bloque anterior (misma especificidad, más abajo gana). Es intencional para anclar `.topbar-flag`. Alternativa: añadir `position: relative;` dentro del bloque `.topbar { ... }` original y omitir esta línea.

- [ ] **Step 2: Parche — logo en el topbar** (`.topbar-actions`, `:565-568`)

```html
      <div class="topbar-actions">
        <div class="topbar-brand">
          <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="14" fill="#102a43"/><rect x="13" y="16" width="10" height="34" rx="3" fill="#f5cd4b"/><rect x="27" y="16" width="10" height="34" rx="3" fill="#185d9d"/><rect x="41" y="16" width="10" height="34" rx="3" fill="#c83d45"/><path d="M32 4.5l1.76 3.57 3.94.52-2.87 3.7.73 3.91L32 14.3l-3.56 1.9.73-3.91-2.87-3.7 3.94-.52z" fill="#ffffff"/></svg>
          <strong>ED-Dev</strong>
        </div>
        <button class="theme-cycle" id="themeCycleBtn" type="button" aria-label="Tema actual: system. Pulsa para cambiar.">☀︎ Sistema</button>
        <button class="cta" id="personalizedBtn" type="button">Quiero mi app personalizada</button>
      </div>
```

---

## Task 4: Tema por defecto solar-light

**Files:**
- Modify: `assets/theme-toggle.js:10`
- Modify: `index.html:566` (texto inicial del botón)

- [ ] **Step 1: Cambiar el fallback en theme-toggle.js**

```js
  var current = ORDER.indexOf(saved) >= 0 ? saved : "solar-light";
```

(Primera visita sin `localStorage["ed-theme"]` → solar-light en vez de system.)

- [ ] **Step 2: Actualizar el texto inicial del botón** (`index.html:566`)

```html
        <button class="theme-cycle" id="themeCycleBtn" type="button" aria-label="Tema actual: solar-light. Pulsa para cambiar.">☀︎ Solar</button>
```

(Evita el flash del label incorrecto antes de DOMContentLoaded.)

---

## Task 5: Selector de diseño de video ARRIBA

**Files:**
- Modify: `index.html` (mover `.sequence-designs` del modal `:846-851` a la toolbar, tras `:834`)
- Modify: `index.html:386-391` (CSS del selector)

- [ ] **Step 1: Mover el bloque de swatches**

Cortar el bloque `.sequence-designs` completo (los 4 botones con `data-video-theme`) desde dentro del modal y pegarlo **entre** el cierre del div de botones (`:834`) y `.sequence-status` (`:835`):

```html
          </div>
          <div class="sequence-designs-wrap">
            <p class="sequence-designs-label">Diseño del video</p>
            <div class="sequence-designs" role="group" aria-label="Diseños visuales">
              <button class="sequence-design" type="button" data-video-theme="solar" aria-pressed="true"><span class="sequence-design-swatch solar" aria-hidden="true"></span><span><strong>Solar</strong><small>Cálido y enérgico</small></span></button>
              <button class="sequence-design" type="button" data-video-theme="noche" aria-pressed="false"><span class="sequence-design-swatch noche" aria-hidden="true"></span><span><strong>Noche</strong><small>Oscuro y enfocado</small></span></button>
              <button class="sequence-design" type="button" data-video-theme="editorial" aria-pressed="false"><span class="sequence-design-swatch editorial" aria-hidden="true"></span><span><strong>Editorial</strong><small>Limpio y expresivo</small></span></button>
              <button class="sequence-design" type="button" data-video-theme="pulso" aria-pressed="false"><span class="sequence-design-swatch pulso" aria-hidden="true"></span><span><strong>Pulso</strong><small>Contraste en movimiento</small></span></button>
            </div>
          </div>
          <p class="sequence-status" id="sequenceStatus" role="status">La secuencia vive en esta pestaña. Guárdala como archivo para continuar otro día.</p>
```

(El binding en `:4502-4506` usa `document.querySelectorAll("[data-video-theme]")` global → el movimiento no rompe los listeners ni la sincronización de aria-pressed.)

- [ ] **Step 2: CSS horizontal del selector** (reemplazar `.sequence-designs { display: grid; ... }` en `:386`)

```css
    .sequence-designs-wrap { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin: 2px 0 10px; }
    .sequence-designs-label { margin: 0; color: var(--muted); font-size: .78rem; font-weight: 700; }
    .sequence-designs { display: flex; flex-wrap: wrap; gap: 8px; }
    .sequence-design { min-width: 170px; }
```

(Las reglas `.sequence-design` existentes en `:387-391` quedan; solo se añade `min-width`. La media query de `:525` queda inofensiva.)

---

## Task 6: Panel de contacto y colaboraciones

**Files:**
- Modify: `index.html` (sección nueva tras `</header>` + JS + CSS)

- [ ] **Step 1: Parche — sección del panel** (inmediatamente después de `</header>` en `:569`, antes de `<section class="layout" id="cardsView">`)

```html
    <section class="contact-panel" id="contactPanel" aria-labelledby="contactHeading" hidden>
      <div class="contact-head">
        <div>
          <h2 id="contactHeading">Hablemos</h2>
          <p>¿Quieres una app personalizada como esta? Escríbeme por donde prefieras o apoya el proyecto.</p>
        </div>
        <button class="sequence-video-close" id="contactCloseBtn" type="button" aria-label="Cerrar panel de contacto">Cerrar</button>
      </div>
      <div class="contact-grid">
        <a class="contact-link" href="https://t.me/TU_USUARIO" target="_blank" rel="noopener"><strong>Telegram</strong><small>@TU_USUARIO</small></a>
        <a class="contact-link" href="https://instagram.com/TU_USUARIO" target="_blank" rel="noopener"><strong>Instagram</strong><small>@TU_USUARIO</small></a>
        <a class="contact-link" href="https://linkedin.com/in/TU_USUARIO" target="_blank" rel="noopener"><strong>LinkedIn</strong><small>/in/TU_USUARIO</small></a>
        <a class="contact-link" id="whatsappLink" href="https://wa.me/" target="_blank" rel="noopener"><strong>WhatsApp</strong><small id="whatsappLinkHint">Número no configurado</small></a>
      </div>
      <div class="contact-colab">
        <h3>Colaborar con el proyecto</h3>
        <div class="contact-grid">
          <a class="contact-link" href="https://paypal.me/TU_USUARIO" target="_blank" rel="noopener"><strong>PayPal</strong><small>paypal.me/TU_USUARIO</small></a>
          <button class="contact-link" id="binanceCopyBtn" type="button"><strong>Binance Pay</strong><small id="binanceIdText">ID: TU_BINANCE_ID · clic para copiar</small></button>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: Parche — JS** (reemplazar el listener de `personalizedBtn` en `:4392-4399` y añadir refs)

Reemplazar el bloque completo `document.getElementById("personalizedBtn").addEventListener(...)` por:

```js
    const contactPanel = document.getElementById("contactPanel");
    const whatsappLink = document.getElementById("whatsappLink");
    if (WHATSAPP_NUMBER.trim()) {
      whatsappLink.href = "https://wa.me/" + WHATSAPP_NUMBER.replace(/\D/g, "");
      document.getElementById("whatsappLinkHint").textContent = "WhatsApp directo";
    } else {
      whatsappLink.classList.add("contact-disabled");
    }
    document.getElementById("personalizedBtn").addEventListener("click", function() {
      contactPanel.hidden = false;
      contactPanel.scrollIntoView({ behavior: "auto", block: "start" });
    });
    document.getElementById("contactCloseBtn").addEventListener("click", function() {
      contactPanel.hidden = true;
    });
    document.getElementById("binanceCopyBtn").addEventListener("click", function() {
      const id = document.getElementById("binanceIdText").textContent.replace(/^ID:\s*/, "").replace(/\s*· clic para copiar$/, "").trim();
      if (!id || id === "TU_BINANCE_ID") {
        showToast("Configura tu Binance Pay ID antes de compartir.");
        return;
      }
      navigator.clipboard.writeText(id).then(function() {
        showToast("Binance Pay ID copiado al portapapeles.");
      }, function() {
        showToast("No se pudo copiar: " + id);
      });
    });
```

> Nota: las refs (`contactPanel`, `whatsappLink`) van aquí, dentro del mismo bloque de listeners — verificar que `WHATSAPP_NUMBER` ya está declarado antes (está en `:911`, antes de `:4392` ✓).

- [ ] **Step 3: Parche — CSS del panel** (junto al CSS del topbar)

```css
    .contact-panel { border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow); border-radius: 16px; padding: 18px; margin: 0 0 18px; }
    .contact-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .contact-head h2 { margin: 0 0 4px; font-family: Georgia, "Times New Roman", serif; font-size: 1.15rem; }
    .contact-head p { margin: 0; color: var(--muted); font-size: .82rem; }
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .contact-link { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; border: 1px solid var(--line); background: transparent; border-radius: 12px; padding: 10px 12px; text-decoration: none; color: var(--ink); cursor: pointer; font: inherit; text-align: left; }
    .contact-link:hover { border-color: var(--blue); background: var(--blue-soft); }
    .contact-link strong { font-size: .86rem; }
    .contact-link small { color: var(--muted); font-size: .72rem; word-break: break-all; }
    .contact-link.contact-disabled { opacity: .5; pointer-events: none; }
    .contact-colab { margin-top: 14px; }
    .contact-colab h3 { margin: 0 0 8px; font-size: .92rem; }
```

---

## Task 7: Test verde, snapshot y cierre

- [ ] **Step 1: Test completo**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: `TODO OK (0 fallos)`, exit 0 (~88 checks: 76 + ~12 nuevos).

- [ ] **Step 2: Verificación manual rápida** (la app está abierta en `http://127.0.0.1:8765`): favicon en la pestaña del navegador, logo + ED-Dev arriba, línea tricolor, tema inicia en Solar, swatches de diseño visibles en la toolbar de Secuencias, panel de contacto desde "Quiero mi app personalizada".

- [ ] **Step 3: Snapshot + README**

```powershell
Copy-Item "$root\index.html" "$root\index.post-fase25.html"
```

Añadir a `README.txt`:

```
FASE 2.5 — MARCA Y CONTACTOS (2026-09-27)
- assets/favicon.svg -> favicon tricolor (3 barras + estrella).
- Logo SVG + "ED-Dev" en el topbar + acento tricolor (.topbar-flag) en los 3 temas.
- Tema por defecto: solar-light (primera visita).
- Selector de diseño de video en la toolbar de Secuencias (fuera del modal).
- Panel de contacto (#contactPanel): Telegram/Instagram/LinkedIn/WhatsApp + Colaborar (PayPal/Binance Pay).
- PENDIENTE: rellenar los placeholders TU_USUARIO / TU_BINANCE_ID antes de subir.
```

---

## Self-review (ejecutado al escribir el plan)

- **Cobertura**: favicon → T2; logo+acento → T3; default solar-light → T4; selector arriba → T5; panel contacto/colaborar → T6; test → T1/T7; snapshot+README → T7.
- **Placeholders**: los `TU_USUARIO`/`TU_BINANCE_ID` SON el requisito (placeholders rellenables acordados con el usuario), no omisiones.
- **Consistencia**: `topbar-brand`, `topbar-flag`, `contactPanel`, `binanceCopyBtn`, `sequence-designs-wrap` se usan igual en HTML, CSS, JS y test.
