# Fase 3 — Video: 7 diseños + motor de animación + descargas en Biblioteca Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el renderizador de video actual en un motor de animación compartido (subtítulos palabra por palabra, fondo en movimiento, transiciones), añadir 3 diseños nuevos (keynote, netflix, diccionario), controles de calidad (resolución/bitrate/fps) y descargas MP3/MP4 en Biblioteca — sin romper nada existente.

**Architecture:** Todo ocurre dentro del script inline de `index.html`. `drawSequenceVideoFrame(canvas, media, time, themeName)` sigue siendo función pura del tiempo: se le añade (a) palabras con tiempos propios + highlight de palabra activa + crossfade de 120 ms con la línea anterior, (b) fondo ambiente en movimiento `drawSequenceAmbient` (gradientes a la deriva + partículas, todo t-driven), (c) escala lógica 720×1280 vía `context.scale` para soportar 1080×1920 sin reescribir coordenadas. Los 4 diseños actuales conservan su identidad (sus ramas de fondo quedan sobre el ambiente) y heredan el motor; los 3 nuevos aportan ramas propias. Los controles de calidad viven en el modal y alimentan WebCodecs/MediaRecorder. Biblioteca reutiliza el flujo existente: 🎬 Crear MP4 = `addCreativeChunksToSequence(lines)` + `openSequenceVideoMaker()`.

**Tech Stack:** Canvas 2D (pure-time rendering), WebCodecs (`mp4-muxer.js`) + MediaRecorder fallback, `sequenceVideoCanvas.captureStream`, lamejs (MP3 actual intacto).

---

## Contexto que debes conocer antes de tocar nada

| Hecho | Dónde |
|---|---|
| `sequenceState.videoTheme/videoPace` (añadir videoRes/videoBitrate/videoFps) | `index.html:~1040-1041` |
| `SEQUENCE_VIDEO_THEMES` (4 diseños; añadir 3 + campos glow/particle/uppercase) | `index.html:~3413-3418` |
| `drawSequenceVideoFrame` (render puro; REESCRIBIR PARCIALMENTE) | localiza por nombre |
| Fondo por tema dentro del render (ramas solar/noche/editorial/else→pulso) | dentro de `drawSequenceVideoFrame` |
| Texto principal: `drawVideoText` a (w/2, 650) + traducción a 825 (REEMPLAZAR texto por palabras; traducción intacta) | dentro de `drawSequenceVideoFrame` |
| Entradas de timeline: `{start, audioEnd, repeatStart, repeatEnd, end, text, translation, index}` | `prepareSequenceVideoMedia` |
| WebCodecs: `width=720, height=1280, fps=24, bitrate=2400000` hardcodeados | `encodeSequenceMp4WebCodecs` |
| Recorder: `captureStream(30)`, bitrate 2400000 hardcodeados | `encodeSequenceMp4Recorder` |
| Orquestación: `exportSequenceMp4` (deshabilita controles, try/finally) | localiza por nombre |
| `openSequenceVideoMaker` (guarda secuencia vacía; preview; scroll) | localiza por nombre |
| Swatches actuales (4 botones `data-video-theme` en la toolbar) + CSS | toolbar de Secuencias + `.sequence-designs` |
| `renderCreative`: `creative-actions` HTML + listeners de botones | localiza por nombre |
| `addCreativeChunksToSequence(lines)` (match exacto en catálogo) | localiza por nombre |
| Mensaje de codec no soportado (`mp4-codecs-unavailable` / `mp4-unavailable`) | `encodeSequenceMp4WebCodecs` / `encodeSequenceMp4Recorder` |
| `videoEaseOut` existe | junto a `SEQUENCE_VIDEO_THEMES` |
| Test actual: 92 checks, `TODO OK (0 fallos)` | `tools/check-ui.mjs` |

### Invariantes

1. **Nunca** tocar `assets/podcast-series.json`, su validación 9/2250, ni `exportSequenceMp3`.
2. **Nunca** eliminar los mensajes de error de codec (`mp4-unavailable`, `mp4-codecs-unavailable`).
3. El canvas de vista previa sigue en 720×1280; la resolución elegida solo se aplica durante la exportación y se restaura después.
4. No regresiones: `TODO OK` al final; respaldo antes de editar.

### Decisiones ya tomadas (no re-preguntar)

- Los 4 diseños actuales conservan su identidad; el "reeskin solarpunk" = ambiente cálido + heredar el motor en los 7.
- 🎬 Crear MP4 en Biblioteca reutiliza `addCreativeChunksToSequence` + `openSequenceVideoMaker` (sin estado nuevo).
- ⬇ MP3 en Biblioteca = `<a download>` directo al archivo local.
- Controles: resolución (720×1280 ligero / 1080×1920 nítido), bitrate (2.4/4/8 Mbps), fps (24/30).

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `index.pre-fase3.html` | Respaldo | Crear |
| `tools/check-ui.mjs` | Sección 8 (Fase 3) | Modificar |
| `index.html` | Temas, motor, controles, descargas | Modificar (5 parches) |
| `index.post-fase3.html` | Snapshot | Crear |
| `README.txt` | Registro Fase 3 | Modificar |

---

## Task 1: Respaldo y test rojo

**Files:**
- Create: `index.pre-fase3.html`
- Modify: `tools/check-ui.mjs` (sección 8 antes del console.log final)

- [ ] **Step 1: Respaldo con fecha**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item "$root\index.html" "$root\index.pre-fase3.html"
Get-Item "$root\index.pre-fase3.html" | Select-Object Name, Length
```

- [ ] **Step 2: Sección 8 en check-ui.mjs**

```js
// ---- 8. Fase 3: video y descargas ----
if (html) {
  const tStart = html.indexOf("const SEQUENCE_VIDEO_THEMES");
  const tEnd = html.indexOf("};", tStart);
  const themesBlock = tStart > -1 && tEnd > tStart ? html.slice(tStart, tEnd) : "";
  const themeKeys = ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario"];
  const missingThemes = themeKeys.filter((k) => !new RegExp("\\b" + k + "\\s*:").test(themesBlock));
  ok("motor: 7 temas de video definidos", themesBlock !== "" && missingThemes.length === 0,
    themesBlock === "" ? "SEQUENCE_VIDEO_THEMES no encontrado" : "faltan: " + missingThemes.join(", "));
  ok("motor: ambiente con glow/partículas", themesBlock.includes("glowA") && themesBlock.includes("particle"),
    "sin campos glowA/particle");
  ok("motor: subtítulos palabra por palabra", html.includes("function sequenceWordTimings") &&
    html.includes("function canvasWordLines") && html.includes("function drawVideoWords"),
    "faltan funciones de palabras");
  ok("motor: fondo ambiente en movimiento", html.includes("function drawSequenceAmbient"),
    "sin drawSequenceAmbient");
  ok("motor: transición de 120 ms entre líneas", html.includes("VIDEO_TRANSITION_SECONDS"),
    "sin VIDEO_TRANSITION_SECONDS");
  ok("controles de calidad en el modal", html.includes('id="sequenceVideoRes"') &&
    html.includes('id="sequenceVideoBitrate"') && html.includes('id="sequenceVideoFps"'),
    "faltan selects de calidad");
  ok("controles: resolución/bitrate/fps llegan a los encoders",
    html.includes("sequenceState.videoRes") && html.includes("captureStream(fps)"),
    "sin wiring");
  ok("mensaje de codec no soportado conservado",
    html.includes("mp4-codecs-unavailable") && html.includes("mp4-unavailable"),
    "mensajes de error ausentes");
  ok("Biblioteca: botón ⬇ MP3 directo", html.includes('id="creativeMp3Link"') &&
    /id="creativeMp3Link"[^>]*download/.test(html), "sin enlace de descarga");
  ok("Biblioteca: botón 🎬 Crear MP4", html.includes('id="creativeMp4Btn"'),
    "sin botón de video");
  const swatches = (html.match(/data-video-theme="[^"]+"/g) || []).map((m) => m.slice(18, -1));
  ok("swatches: 7 diseños con data-video-theme", swatches.length >= 7 &&
    ["keynote", "netflix", "diccionario"].every((k) => swatches.includes(k)),
    "diseños: " + swatches.join(","));
  ok(".creative-download y .creative-video-link con estilos",
    html.includes(".creative-download") && html.includes(".creative-video-link"),
    "sin CSS de descargas");
}
```

- [ ] **Step 3: ROJO**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: los 92 previos PASS, los ~12 nuevos FAIL (faltan temas/funciones/controles/descargas/swatches nuevos), exit 1. Ningún previo puede fallar.

---

## Task 2: 3 diseños nuevos + swatches

**Files:**
- Modify: `index.html` (temas, ramas de fondo, swatches, CSS)

- [ ] **Step 1: Ampliar `SEQUENCE_VIDEO_THEMES`** (reemplazar el bloque completo)

```js
    const SEQUENCE_VIDEO_THEMES = {
      solar: { background: "#f4cb4b", ink: "#102a43", accent: "#c83d45", secondary: "#185d9d", footer: "#102a43", footerInk: "#ffffff", glowA: "rgba(245,205,75,.36)", glowB: "rgba(200,120,40,.20)", particle: "#7a4d12", particleAlpha: .28, uppercase: false },
      noche: { background: "#081725", ink: "#f5f9fc", accent: "#53d4c8", secondary: "#78b9f2", footer: "#0d2235", footerInk: "#f5f9fc", glowA: "rgba(83,212,200,.20)", glowB: "rgba(120,185,242,.14)", particle: "#78b9f2", particleAlpha: .24, uppercase: false },
      editorial: { background: "#f6f3ea", ink: "#112a43", accent: "#c83d45", secondary: "#185d9d", footer: "#112a43", footerInk: "#ffffff", glowA: "rgba(200,160,90,.22)", glowB: "rgba(200,61,69,.10)", particle: "#8a7a55", particleAlpha: .24, uppercase: false },
      pulso: { background: "#102a43", ink: "#ffffff", accent: "#f2c94c", secondary: "#ef5b62", footer: "#c83d45", footerInk: "#ffffff", glowA: "rgba(242,201,76,.24)", glowB: "rgba(239,91,98,.20)", particle: "#f2c94c", particleAlpha: .26, uppercase: false },
      keynote: { background: "#faf3e2", ink: "#1c2b3a", accent: "#c8862a", secondary: "#185d9d", footer: "#1c2b3a", footerInk: "#ffffff", glowA: "rgba(245,205,75,.38)", glowB: "rgba(200,134,42,.22)", particle: "#c8862a", particleAlpha: .3, uppercase: false },
      netflix: { background: "#0b0b10", ink: "#ffffff", accent: "#e50914", secondary: "#f5cd4b", footer: "#141419", footerInk: "#ffffff", glowA: "rgba(229,9,20,.22)", glowB: "rgba(245,205,75,.09)", particle: "#e50914", particleAlpha: .26, uppercase: true },
      diccionario: { background: "#f7f4ec", ink: "#26221b", accent: "#8a2d2b", secondary: "#185d9d", footer: "#26221b", footerInk: "#ffffff", glowA: "rgba(185,158,100,.24)", glowB: "rgba(138,45,43,.10)", particle: "#8a2d2b", particleAlpha: .24, uppercase: false }
    };
    const VIDEO_TRANSITION_SECONDS = .12;
```

- [ ] **Step 2: Añadir las 3 ramas de fondo** (en `drawSequenceVideoFrame`, tras la rama `editorial` y antes del `else` final que dibuja `pulso`)

```js
      } else if (themeName === "keynote") {
        context.fillStyle = theme.accent;
        context.fillRect(width - 500, 0, 46, height);
        context.globalAlpha = .5 + .12 * Math.sin(time * 1.2);
        context.fillStyle = theme.secondary;
        context.beginPath(); context.arc(130, 300, 150, 0, Math.PI * 2); context.fill();
        context.globalAlpha = 1;
      } else if (themeName === "netflix") {
        context.fillStyle = "#000000";
        context.fillRect(0, 0, width, 150);
        context.fillRect(0, height - 150, width, 150);
        context.fillStyle = theme.accent;
        context.fillRect(60, 170, 130, 10);
      } else if (themeName === "diccionario") {
        context.fillStyle = theme.footer;
        context.fillRect(0, 0, width, 190);
        context.strokeStyle = "rgba(38,34,27,.18)";
        context.lineWidth = 2;
        for (let ruledY = 1180; ruledY > 220; ruledY -= 64) { context.beginPath(); context.moveTo(70, ruledY); context.lineTo(width - 70, ruledY); context.stroke(); }
        context.fillStyle = theme.accent;
        context.beginPath(); context.arc(width - 90, 95, 44, 0, Math.PI * 2); context.fill();
        context.fillStyle = theme.footerInk;
        context.font = "800 34px Georgia, serif";
        context.textAlign = "center";
        context.fillText(String(current.index + 1), width - 90, 96);
```

- [ ] **Step 3: Añadir los 3 swatches** (tras el botón `pulso` en `.sequence-designs`)

```html
<button class="sequence-design" type="button" data-video-theme="keynote" aria-pressed="false"><span class="sequence-design-swatch keynote" aria-hidden="true"></span><span><strong>Keynote</strong><small>Display enorme</small></span></button>
<button class="sequence-design" type="button" data-video-theme="netflix" aria-pressed="false"><span class="sequence-design-swatch netflix" aria-hidden="true"></span><span><strong>Netflix</strong><small>Cine oscuro</small></span></button>
<button class="sequence-design" type="button" data-video-theme="diccionario" aria-pressed="false"><span class="sequence-design-swatch diccionario" aria-hidden="true"></span><span><strong>Diccionario</strong><small>Entrada editorial</small></span></button>
```

- [ ] **Step 4: CSS de los 3 swatches** (junto a `.sequence-design-swatch.pulso`)

```css
    .sequence-design-swatch.keynote { background: linear-gradient(160deg, #faf3e2 0 60%, #c8862a 60%); }
    .sequence-design-swatch.netflix { background: linear-gradient(180deg, #0b0b10 0 72%, #e50914 72% 78%, #0b0b10 78%); }
    .sequence-design-swatch.diccionario { background: linear-gradient(90deg, #f7f4ec 0 70%, #8a2d2b 70% 80%, #26221b 80%); }
```

---

## Task 3: Motor compartido (palabras + transiciones + ambiente)

**Files:**
- Modify: `index.html` (nuevas funciones + reescritura parcial de `drawSequenceVideoFrame`)

- [ ] **Step 1: Funciones nuevas** (insertar justo después de `videoEaseInOut`)

```js
    function sequenceWordTimings(text, duration) {
      const words = String(text).trim().split(/\s+/).filter(Boolean);
      if (!words.length) return [];
      const weights = words.map(function(word) { return word.length + 1; });
      const totalWeight = weights.reduce(function(sum, weight) { return sum + weight; }, 0);
      let cursor = 0;
      return words.map(function(word, index) {
        const start = duration * (cursor / totalWeight);
        cursor += weights[index];
        return { word: word, start: start, end: duration * (cursor / totalWeight) };
      });
    }

    function canvasWordLines(context, words, maxWidth) {
      const lines = [];
      let current = [];
      let currentWidth = 0;
      const spaceWidth = context.measureText(" ").width;
      words.forEach(function(word) {
        const wordWidth = context.measureText(word.word).width;
        if (current.length && currentWidth + spaceWidth + wordWidth > maxWidth) {
          lines.push(current);
          current = [];
          currentWidth = 0;
        }
        current.push(word);
        currentWidth += (current.length > 1 ? spaceWidth : 0) + wordWidth;
      });
      if (current.length) lines.push(current);
      return lines;
    }

    function drawVideoWords(context, words, time, centerX, centerY, maxWidth, maxLines, ink, accent, alpha) {
      if (!words.length) return;
      context.save();
      context.font = "800 52px ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "middle";
      const lines = canvasWordLines(context, words, maxWidth).slice(0, maxLines);
      const lineHeight = 64;
      const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
      const spaceWidth = context.measureText(" ").width;
      lines.forEach(function(line, lineIndex) {
        const widths = line.map(function(word) { return context.measureText(word.word).width; });
        const totalWidth = widths.reduce(function(sum, w) { return sum + w; }, 0) + spaceWidth * (line.length - 1);
        let x = centerX - totalWidth / 2;
        const lineY = startY + lineIndex * lineHeight;
        line.forEach(function(word, wordIndex) {
          const width = widths[wordIndex];
          const appear = videoEaseOut(Math.min(1, Math.max(0, (time - word.start) / .1)));
          const active = time >= word.start && time < word.end;
          if (appear > 0) {
            context.save();
            context.globalAlpha = alpha * appear;
            if (active) {
              context.translate(x + width / 2, lineY);
              context.scale(1.07, 1.07);
              context.translate(-(x + width / 2), -lineY);
              context.fillStyle = accent;
            } else {
              context.fillStyle = ink;
            }
            context.fillText(word.word, x, lineY);
            context.restore();
          }
          x += width + spaceWidth;
        });
      });
      context.restore();
    }

    function drawSequenceAmbient(context, width, height, time, themeName, theme) {
      context.fillStyle = theme.background;
      context.fillRect(0, 0, width, height);
      const drift = time * .18;
      const glows = [
        [width * (.5 + .28 * Math.sin(drift * .6)), height * (.32 + .2 * Math.cos(drift * .47)), width * .55, theme.glowA],
        [width * (.44 + .3 * Math.cos(drift * .39 + 2.1)), height * (.68 + .22 * Math.sin(drift * .51 + 1.2)), width * .48, theme.glowB]
      ];
      glows.forEach(function(glow) {
        const gradient = context.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], glow[2]);
        gradient.addColorStop(0, glow[3]);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      });
      context.fillStyle = theme.particle;
      for (let index = 0; index < 14; index += 1) {
        const seed = index * 2.399;
        const px = width * (.08 + .86 * (Math.sin(seed) * .5 + .5) + .04 * Math.sin(time * .5 + seed));
        const wrapped = (((Math.cos(seed * 1.7) * .5 + .5) * .78 + .1 - (time * (.014 + (index % 5) * .004))) % 1 + 1) % 1;
        const py = height * wrapped;
        const pr = 2.2 + (index % 4) * 1.3;
        context.globalAlpha = theme.particleAlpha * (.4 + .6 * Math.abs(Math.sin(time * .8 + seed)));
        context.beginPath(); context.arc(px, py, pr, 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
    }
```

- [ ] **Step 2: Búsqueda de línea + transición** (en `drawSequenceVideoFrame`, reemplazar el bloque de búsqueda actual)

Reemplazar:

```js
      let current = timeline[0];
      for (let index = 0; index < timeline.length; index += 1) {
        if (time >= timeline[index].start) current = timeline[index];
        if (time < timeline[index].end) break;
      }
```

por:

```js
      let current = timeline[0];
      let previousIndex = -1;
      for (let index = 0; index < timeline.length; index += 1) {
        if (time >= timeline[index].start) { current = timeline[index]; previousIndex = index - 1; }
        if (time < timeline[index].end) break;
      }
```

- [ ] **Step 3: Dibujo de fondo ambiente** (justo después de `context.fillRect(0, 0, width, height);` del fondo base)

Reemplazar:

```js
      context.clearRect(0, 0, width, height);
      context.fillStyle = theme.background;
      context.fillRect(0, 0, width, height);
```

por:

```js
      context.clearRect(0, 0, width, height);
      drawSequenceAmbient(context, width, height, time, themeName, theme);
```

- [ ] **Step 4: Texto por palabras + crossfade** (reemplazar el bloque del texto principal)

Reemplazar:

```js
      context.save();
      context.translate(width / 2, 650);
      context.scale(.94 + eased * .06, .94 + eased * .06);
      drawVideoText(context, current.text, 0, 0, width - 132, 5, theme.ink, .18 + eased * .82);
      context.restore();
```

por:

```js
      const lineDuration = Math.max(.3, audioEnd - current.start);
      const shownText = theme.uppercase ? String(current.text).toUpperCase() : current.text;
      const previous = (localTime < VIDEO_TRANSITION_SECONDS && previousIndex >= 0 && timeline[previousIndex] && timeline[previousIndex] !== current) ? timeline[previousIndex] : null;
      if (previous) {
        const prevDuration = Math.max(.3, (Number.isFinite(previous.audioEnd) ? previous.audioEnd : previous.end) - previous.start);
        const prevWords = sequenceWordTimings(theme.uppercase ? String(previous.text).toUpperCase() : previous.text, prevDuration);
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, 1 - videoEaseOut(localTime / VIDEO_TRANSITION_SECONDS)));
        drawVideoWords(context, prevWords, prevDuration + 1, width / 2, 650, width - 132, 5, theme.ink, theme.accent, 1);
        context.restore();
      }
      const currentWords = sequenceWordTimings(shownText, lineDuration);
      context.save();
      context.translate(width / 2, 650 + (1 - eased) * 26);
      context.scale(.94 + eased * .06, .94 + eased * .06);
      context.translate(-width / 2, -650);
      drawVideoWords(context, currentWords, localTime, width / 2, 650, width - 132, 5, theme.ink, theme.accent, .18 + eased * .82);
      context.restore();
```

> Nota: la traducción de abajo (825) se mantiene intacta. `drawVideoText` queda sin uso para la línea principal — no borrarla (puede usarse en intro/outro u otros sitios; verificar que no se borra).

---

## Task 4: Controles de calidad + renderer resolución-safe

**Files:**
- Modify: `index.html` (selects + state + wiring + encoders + escala de resolución)

- [ ] **Step 1: Selects en el modal** (junto al label de ritmo `sequenceVideoPace`; usar como ancla su texto "Ritmo del video")

```html
                <div class="sequence-video-quality">
                  <label class="sequence-video-pace" for="sequenceVideoRes">
                    <span>Resolución</span>
                    <select id="sequenceVideoRes">
                      <option value="720x1280" selected>720 × 1280 · ligero</option>
                      <option value="1080x1920">1080 × 1920 · nítido</option>
                    </select>
                  </label>
                  <label class="sequence-video-pace" for="sequenceVideoBitrate">
                    <span>Calidad</span>
                    <select id="sequenceVideoBitrate">
                      <option value="2400000" selected>Estándar · 2.4 Mbps</option>
                      <option value="4000000">Alta · 4 Mbps</option>
                      <option value="8000000">Máxima · 8 Mbps</option>
                    </select>
                  </label>
                  <label class="sequence-video-pace" for="sequenceVideoFps">
                    <span>Fluidez</span>
                    <select id="sequenceVideoFps">
                      <option value="24" selected>24 fps</option>
                      <option value="30">30 fps</option>
                    </select>
                  </label>
                </div>
```

- [ ] **Step 2: CSS** (junto a `.sequence-video-pace`)

```css
    .sequence-video-quality { display: grid; gap: 8px; margin-top: 10px; }
```

- [ ] **Step 3: Estado + wiring** (junto a `sequenceState.videoTheme/videoPace` y los listeners de `sequenceVideoPace`)

En `sequenceState`: añadir `videoRes: "720x1280", videoBitrate: 2400000, videoFps: 24`.

Refs + listeners:

```js
    const sequenceVideoRes = document.getElementById("sequenceVideoRes");
    const sequenceVideoBitrate = document.getElementById("sequenceVideoBitrate");
    const sequenceVideoFps = document.getElementById("sequenceVideoFps");
    sequenceVideoRes.addEventListener("change", function() { sequenceState.videoRes = sequenceVideoRes.value; });
    sequenceVideoBitrate.addEventListener("change", function() { sequenceState.videoBitrate = Number(sequenceVideoBitrate.value) || 2400000; });
    sequenceVideoFps.addEventListener("change", function() { sequenceState.videoFps = Number(sequenceVideoFps.value) || 24; });
```

- [ ] **Step 4: Renderer resolución-safe** (en `drawSequenceVideoFrame`)

Reemplazar:

```js
      const context = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;
```

por:

```js
      const context = canvas.getContext("2d");
      const width = 720;
      const height = 1280;
      context.save();
      context.scale(canvas.width / 720, canvas.height / 1280);
```

Añadir `context.restore();` justo antes de cada `return;` temprano (intro y outro) y antes del `}` final de la función.

> Todas las coordenadas del render (diseñadas para 720×1280) quedan en unidades lógicas; el escalado las lleva a la resolución real. La barra de progreso `overall` usa `time/totalDuration` (independiente de resolución ✓).

- [ ] **Step 5: WebCodecs con parámetros**

Reemplazar:

```js
      const width = 720;
      const height = 1280;
      const fps = 24;
      const videoConfig = { codec: "avc1.42001f", width: width, height: height, bitrate: 2400000, framerate: fps, avc: { format: "avc" } };
```

por:

```js
      const width = sequenceVideoCanvas.width;
      const height = sequenceVideoCanvas.height;
      const fps = Math.max(1, Number(sequenceState.videoFps) || 24);
      const bitrate = Math.max(400000, Number(sequenceState.videoBitrate) || 2400000);
      const videoConfig = { codec: "avc1.42001f", width: width, height: height, bitrate: bitrate, framerate: fps, avc: { format: "avc" } };
```

- [ ] **Step 6: Recorder con parámetros**

Reemplazar `sequenceVideoCanvas.captureStream(30)` por `sequenceVideoCanvas.captureStream(Math.max(1, Number(sequenceState.videoFps) || 30))` y `videoBitsPerSecond: 2400000` por `videoBitsPerSecond: Math.max(400000, Number(sequenceState.videoBitrate) || 2400000)`.

- [ ] **Step 7: Canvas size en la orquestación** (en `exportSequenceMp4`)

Tras `sequenceVideoCreateBtn.textContent = "Preparando video…";` añadir:

```js
      const prevCanvasWidth = sequenceVideoCanvas.width;
      const prevCanvasHeight = sequenceVideoCanvas.height;
      const resParts = String(sequenceState.videoRes || "720x1280").split("x");
      sequenceVideoCanvas.width = Math.max(2, Number(resParts[0]) || 720);
      sequenceVideoCanvas.height = Math.max(2, Number(resParts[1]) || 1280);
      sequenceVideoRes.disabled = true;
      sequenceVideoBitrate.disabled = true;
      sequenceVideoFps.disabled = true;
```

En el `finally` de `exportSequenceMp4` (localizarlo): restaurar canvas + selects + re-render del preview:

```js
        sequenceVideoCanvas.width = prevCanvasWidth;
        sequenceVideoCanvas.height = prevCanvasHeight;
        sequenceVideoRes.disabled = false;
        sequenceVideoBitrate.disabled = false;
        sequenceVideoFps.disabled = false;
        renderSequenceVideoPreview();
```

(El `finally` existente re-habilita `sequenceVideoPace` y restaura el texto del botón — añadir estas líneas ahí. NO tocar los mensajes de error de codec.)

---

## Task 5: Descargas en Biblioteca

**Files:**
- Modify: `index.html` (`renderCreative` acciones + listeners + CSS)

- [ ] **Step 1: Botones en `creative-actions`**

Reemplazar el string del reader:

```js
      creativeReader.innerHTML = '...<div class="creative-actions"><button class="creative-listen" id="creativeListenBtn" type="button">▶ Escuchar audio completo</button><button class="creative-sequence" id="creativeSequenceBtn" type="button">Practicar estos chunks</button></div>' + ...
```

añadiendo tras `creativeSequenceBtn`:

```html
<a class="creative-download" id="creativeMp3Link" href="#" download>⬇ MP3</a><button class="creative-video-link" id="creativeMp4Btn" type="button">🎬 Crear MP4</button>
```

- [ ] **Step 2: Wiring** (en `renderCreative`, tras el listener de `creativeSequenceBtn`)

```js
      const creativeMp3Link = document.getElementById("creativeMp3Link");
      if (current.audio) creativeMp3Link.setAttribute("href", current.audio);
      else { creativeMp3Link.removeAttribute("href"); creativeMp3Link.classList.add("creative-download-disabled"); }
      document.getElementById("creativeMp4Btn").addEventListener("click", function() {
        addCreativeChunksToSequence(lines);
        if (sequenceState.items.length) openSequenceVideoMaker();
      });
```

- [ ] **Step 3: CSS** (junto a `.creative-listen`/`.creative-sequence`)

```css
    .creative-download, .creative-video-link { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--blue); border-radius: 9px; padding: 9px 13px; font-weight: 800; font-size: .84rem; text-decoration: none; cursor: pointer; }
    .creative-download { background: var(--blue); color: #fff; }
    .creative-video-link { background: transparent; color: var(--blue); }
    .creative-video-link:hover, .creative-download:hover { filter: brightness(1.06); }
    .creative-download-disabled { opacity: .5; pointer-events: none; }
```

(Verificar que `.creative-actions` usa flex/wrap — los botones nuevos heredan el layout.)

---

## Task 6: Test verde, snapshot y cierre

- [ ] **Step 1: Test**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: `TODO OK (0 fallos)`, exit 0 (~104 checks: 92 + ~12 nuevos).

- [ ] **Step 2: Sintaxis del script inline**

```powershell
$html = Get-Content "$root\index.html" -Raw -Encoding UTF8
$start = $html.IndexOf('<script>') + 8
$end = $html.LastIndexOf('</script>')
$html.Substring($start, $end - $start) | Set-Content "$env:TEMP\app-inline.js" -Encoding UTF8 -NoNewline
node --check "$env:TEMP\app-inline.js"
```

Expected: sin errores.

- [ ] **Step 3: Snapshot + README**

```powershell
Copy-Item "$root\index.html" "$root\index.post-fase3.html"
```

Añadir a `README.txt` una sección "Video y descargas (Fase 3)": 7 diseños, motor palabra por palabra, controles de calidad, descargas MP3/MP4 en Biblioteca.

---

## Self-review (ejecutado al escribir el plan)

- **Spec §4.5**: motor compartido → T3 (palabras proporcionales, highlight color+escala, fade+rise, fade-out, fondo en movimiento, barra de progreso ya existente, transiciones ~120 ms easeOutCubic); 3 diseños → T2 (keynote/netflix/diccionario); 4 actuales → heredan ambiente+motor manteniendo identidad; swatches → T2; controles → T4 (resolución/bitrate/fps para MP4; los MP4 gigantes se limitan con 720p/2.4M); codec error → T1+T4 (preservado y testeado).
- **Spec §4.7**: ⬇ MP3 + 🎬 Crear MP4 → T5.
- **Placeholders**: el plan no tiene.
- **Consistencia**: `VIDEO_TRANSITION_SECONDS`, `videoRes/videoBitrate/videoFps`, `sequenceWordTimings/canvasWordLines/drawVideoWords/drawSequenceAmbient`, `creativeMp3Link/creativeMp4Btn` se usan igual en código, controles y test.
