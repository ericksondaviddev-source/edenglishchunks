# Fase 6 — Sincronización real + diseño especial por pieza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los subtítulos de los videos de historias y canciones sincronicen con su audio real (no proporcional estimado) + un diseño especial `escenario` para piezas, auto-seleccionado en modo pieza.

**Architecture:** Dos fuentes de timing real: (1) historias → EXACTO desde el caché TTS (`assets/stories/.build/<slug>/NNN-<fp>.mp3` + gaps 0.30 s + offset de intro); (2) canciones → `faster-whisper` (word_timestamps) + alineación monotónica contra la letra del `.letra.md`. Los timings viven en `<audio-basename>.timing.json` junto a cada audio (`[{start, end}]` en segundos de AUDIO, sin intro, mismo orden que `lines[]`). `preparePieceVideoMedia` los carga por convención (mismo path, extensión cambiada; fetch opcional con catch → fallback proporcional actual). Nuevo tema `escenario` (escenario sing-along: fondo escenario + línea siguiente en vista previa tenue) + swatch; el modo pieza lo auto-selecciona (cambiable).

**Tech Stack:** ffprobe (duraciones), faster-whisper `base` inglés (transcripción con timestamps), Node (timings historias), canvas 2D (tema nuevo).

---

## Contexto que debes conocer antes de tocar nada

| Hecho | Dónde |
|---|---|
| Segmentos TTS: `assets/stories/.build/<slug>/NNN-<fp10>.mp3` donde fp = sha1(voice + "\|" + en)[0:10]; gap 0.30 s entre líneas (sin gap tras la última); intro 3.4 s | `tools/build-stories.mjs` (GAP=0.30), `SEQUENCE_VIDEO_INTRO_SECONDS` |
| Letras: `.letra.md` con sección `## Índice (línea a línea)`, formato `- [speaker] en — es ← C/F` | `assets/songs/*.letra.md` (7), `tools/build-songs-index.mjs` (parser) |
| Audios canciones: 21 MP3 (`assets/songs/*.mp3`, ~2-3 min c/u, 128k) | `assets/songs/` |
| Audios historias: 2 MP3 (`assets/stories/chunks-*.mp3`, ~165 s) | `assets/stories/` |
| `preparePieceVideoMedia(entry)` (timeline proporcional actual) | `index.html`, de Fase 5 |
| `SEQUENCE_VIDEO_THEMES` (7 temas + campos glow/particle/uppercase) | `index.html`, de Fase 3 |
| Ramas de fondo en `drawSequenceVideoFrame` + swatches + CSS | `index.html`, de Fase 3 |
| `openSequenceVideoMaker(piece)` (rama pieza) | `index.html`, de Fase 5 |
| `drawVideoWords` (dibuja palabras con tiempos) | `index.html`, de Fase 3 |
| Test: 119 checks, `TODO OK (0 fallos)` | `tools/check-ui.mjs` |
| `faster-whisper` 1.2.1 instalado (Python 3.12); modelos se descargan de HF al primer uso (hay internet) | entorno |

### Invariantes

1. No tocar validación 9/2250, `podcast-series.json`, exports MP3, ni nada que funciona.
2. Timing opcional: si el `.timing.json` falta o es inválido (longitud ≠ lines), fallback al proporcional actual SIN error.
3. Los `.timing.json` son datos derivados regenerables (como los MP3 de TTS).
4. No regresiones: `TODO OK` al final; respaldo antes de editar.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `index.pre-fase6.html` | Respaldo | Crear |
| `tools/build-story-timings.mjs` | Timings exactos de historias (ffprobe) | Crear |
| `assets/stories/<slug>.timing.json` | [{start,end} × líneas] | Crear ×2 |
| `tools/build-song-timings.py` | Whisper + alineación de canciones | Crear |
| `assets/songs/<base>.timing.json` | [{start,end} × líneas] | Crear ×21 |
| `tools/check-ui.mjs` | Sección 11 (Fase 6) | Modificar |
| `index.html` | Timing en prepare + tema escenario + auto-select | Modificar |
| `index.post-fase6.html` | Snapshot | Crear |
| `README.txt` | Registro Fase 6 | Modificar |

---

## Task 1: Respaldo y test rojo

**Files:**
- Create: `index.pre-fase6.html`
- Modify: `tools/check-ui.mjs` (sección 11)

- [ ] **Step 1: Respaldo**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item "$root\index.html" "$root\index.pre-fase6.html"
Get-Item "$root\index.pre-fase6.html" | Select-Object Name, Length
```

- [ ] **Step 2: Sección 11**

```js
// ---- 11. Fase 6: sincronización real + diseño especial ----
const storyTimingsOk = ["assets/stories/chunks-la-semana.timing.json", "assets/stories/chunks-el-primer-dia.timing.json"].map(function(p) {
  const raw = readSafe(p);
  const data = raw ? parseJson(raw) : null;
  return Array.isArray(data) && data.length > 0 && data.every(function(t) { return t && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start; });
});
ok("timings: 2 historias con [{start,end}] válidos", storyTimingsOk.every(Boolean),
  "faltan assets/stories/*.timing.json");
if (html) {
  const songsRaw = readSafe("assets/songs-index.json");
  const songsList = songsRaw ? parseJson(songsRaw) : null;
  const songAudios = Array.isArray(songsList) ? [...new Set(songsList.map(function(e) { return e.audio; }))] : [];
  const badTimings = songAudios.filter(function(audio) {
    const raw = readSafe(String(audio).replace(/\.mp3$/i, ".timing.json"));
    const data = raw ? parseJson(raw) : null;
    return !(Array.isArray(data) && data.length >= 8 && data.every(function(t) { return t && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start; }));
  });
  ok("timings: 21 audios de canciones con [{start,end}] válidos", songAudios.length === 21 && badTimings.length === 0,
    songAudios.length !== 21 ? `audios=${songAudios.length}` : "mal: " + badTimings.join(", "));
  ok("video fiel: usa timing real si existe", html.includes(".timing.json"),
    "sin carga de timing");
  const themeKeys8 = ["solar", "noche", "editorial", "pulso", "keynote", "netflix", "diccionario", "escenario"];
  const tStart = html.indexOf("const SEQUENCE_VIDEO_THEMES");
  const tEnd = html.indexOf("};", tStart);
  const themesBlock = tStart > -1 && tEnd > tStart ? html.slice(tStart, tEnd) : "";
  const missing8 = themeKeys8.filter((k) => !new RegExp("\\b" + k + "\\s*:").test(themesBlock));
  ok("tema especial escenario + swatch", missing8.length === 0 && html.includes('data-video-theme="escenario"'),
    missing8.length ? "faltan: " + missing8.join(", ") : "sin swatch escenario");
  ok("modo pieza: auto-selecciona escenario", html.includes('videoTheme = "escenario"'),
    "sin auto-selección");
}
```

- [ ] **Step 3: ROJO** — `node tools\check-ui.mjs`. Expected: previos PASS, ~6 nuevos FAIL (2 timings historias, 21 canciones, timing-uso, escenario, auto-select), exit 1.

---

## Task 2: Timings exactos de historias

**Files:**
- Create: `tools/build-story-timings.mjs`, `assets/stories/*.timing.json` ×2

- [ ] **Step 1: Generador** (sha1 como en build-stories.mjs: `createHash("sha1").update(voice + "|" + line.en).digest("hex").slice(0, 10)`; duración por segmento con `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>` vía spawnSync; acumula `cursor=0`, por línea: `start=cursor, end=cursor+dur`, `cursor=end+0.30` (sin gap tras la última); escribe `[{start: +start.toFixed(2), end: +end.toFixed(2)}]`)

```js
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAP = 0.30;
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const durationOf = (file) => {
  const res = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (res.status !== 0) throw new Error("ffprobe falló: " + file);
  const value = Number(String(res.stdout || "").trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error("duración inválida: " + file);
  return value;
};

for (const slug of ["chunks-la-semana", "chunks-el-primer-dia"]) {
  const script = json(join(ROOT, "assets", "stories", slug + ".script.json"));
  const buildDir = join(ROOT, "assets", "stories", ".build", slug);
  let cursor = 0;
  const timings = script.lines.map(function(line, index) {
    const fp = createHash("sha1").update(script.voices[line.speaker] + "|" + line.en).digest("hex").slice(0, 10);
    const seg = join(buildDir, String(index + 1).padStart(3, "0") + "-" + fp + ".mp3");
    const dur = durationOf(seg);
    const entry = { start: +cursor.toFixed(2), end: +(cursor + dur).toFixed(2) };
    cursor += dur + (index < script.lines.length - 1 ? GAP : 0);
    return entry;
  });
  writeFileSync(join(ROOT, "assets", "stories", slug + ".timing.json"), JSON.stringify(timings, null, 1) + "\n", "utf8");
  console.log(slug + ": " + timings.length + " líneas, audio " + cursor.toFixed(1) + " s");
}
```

- [ ] **Step 2: Ejecutar y validar** — `node tools\build-story-timings.mjs`. Expected: 60 y 58 líneas; duraciones ≈167.7 s y ≈164.0 s (comparar con el MP3 final vía ffprobe; tolerancia ±2 s por el loudnorm).

---

## Task 3: Timings de canciones (whisper + alineación)

**Files:**
- Create: `tools/build-song-timings.py`, `assets/songs/*.timing.json` ×21

- [ ] **Step 1: Transcribir** — `faster_whisper.WhisperModel("base", device="cpu", compute_type="int8")`, por archivo: `transcribe(mp3, language="en", word_timestamps=True)` (si la cobertura de alineación <70%, reintentar con `vad_filter=False`). Guardar el transcript intermedio en `assets/songs/.align/<base>.words.json` (para no re-transcribir al iterar).

- [ ] **Step 2: Alinear** — por canción: carga su `.letra.md` (sección Índice, líneas `en` en orden); normaliza (minúsculas, sin puntuación); alineación monotónica greedy: para cada línea en orden, busca desde la posición actual la ventana del transcript con más palabras coincidentes (ventana deslizante, tolera palabras extra del transcript entre líneas); `start` = inicio de la primera palabra emparejada, `end` = fin de la última; líneas sin emparejamiento → interpolación entre vecinas; post-proceso: `end[i] = min(end[i], start[i+1])`, `start` no-decreciente, todo dentro de [0, duración]. Escribe `assets/songs/<base>.timing.json` ([{start,end}] × nº líneas del índice, redondeo 2 decimales).

- [ ] **Step 3: Ejecutar** — los 21 archivos son ~55 min de audio; con `base` en CPU ≈ 20-40 min. Ejecutar en segundo plano con log (`Start-Process python ... -RedirectStandardOutput`) y sondear el progreso (los `.words.json` + `.timing.json` van apareciendo). NO bloquear el resto de tareas: T4 puede implementarse en paralelo al cómputo (el wiring no depende de los JSON).

- [ ] **Step 4: Validar** — cobertura media ≥70% de líneas emparejadas directamente; duraciones dentro del audio; el test (sección 11) en verde para canciones.

---

## Task 4: Integración (timing + tema escenario)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Timing real en `preparePieceVideoMedia`** — tras construir `lines` (o al inicio, tras validar `entry.audio`): resuelve la ruta del timing por convención (`String(entry.audio).replace(/\.mp3$/i, ".timing.json")`), `fetch` opcional con `.catch(() => null)`; si es array con la MISMA longitud que `lines` y todos `{start,end}` finitos con `end>start`, úsalo para `start/audioEnd/repeatStart/repeatEnd/end` (start/end del timing; audioEnd=repeatStart=repeatEnd=end); si no, fallback proporcional actual. El `samples` NO cambia (audio completo). Mantener `introDuration/outroDuration` (el timing es tiempo de AUDIO, el render suma intro).

- [ ] **Step 2: Tema `escenario`** — objeto en `SEQUENCE_VIDEO_THEMES` (escenario sing-along oscuro con foco cálido):

```js
      escenario: { background: "#0e1520", ink: "#ffffff", accent: "#f5cd4b", secondary: "#53d4c8", footer: "#101826", footerInk: "#ffffff", glowA: "rgba(245,205,75,.24)", glowB: "rgba(83,212,200,.14)", particle: "#f5cd4b", particleAlpha: .26, uppercase: false, upcoming: true },
```

Rama de fondo en `drawSequenceVideoFrame` (junto a las demás):

```js
      } else if (themeName === "escenario") {
        const spotX = width * (.5 + .12 * Math.sin(time * .5));
        const spot = context.createRadialGradient(spotX, 300, 40, spotX, 300, 430);
        spot.addColorStop(0, "rgba(245,205,75,.30)");
        spot.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = spot;
        context.fillRect(0, 0, width, height);
        context.strokeStyle = "rgba(245,205,75,.5)";
        context.lineWidth = 3;
        context.strokeRect(46, 205, width - 92, height - 410);
        context.fillStyle = theme.secondary;
        context.fillRect(46, 205, width - 92, 8);
```

Swatch + CSS (patrón de los 7):

```html
<button class="sequence-design" type="button" data-video-theme="escenario" aria-pressed="false"><span class="sequence-design-swatch escenario" aria-hidden="true"></span><span><strong>Escenario</strong><small>Sing-along</small></span></button>
```

```css
    .sequence-design-swatch.escenario { background: linear-gradient(180deg, #0e1520 0 65%, #f5cd4b 65% 72%, #53d4c8 72%); }
```

Línea siguiente tenue: en el bloque de texto de `drawSequenceVideoFrame` (tras dibujar la línea actual), si `theme.upcoming` y existe línea siguiente en `timeline`, dibuja su texto con `drawVideoWords` en `650 + 210`, alpha `0.28`, tiempo = duración+1 (todo revelado, sin highlight):

```js
      if (theme.upcoming) {
        const nextEntry = timeline[current.index + 1];
        if (nextEntry && nextEntry.text) {
          const nextWords = sequenceWordTimings(nextEntry.text, 1);
          drawVideoWords(context, nextWords, 2, width / 2, 860, width - 200, 2, theme.ink, theme.accent, .28);
        }
      }
```

(`current.index` es el índice en timeline ✓; `sequenceWordTimings(text, 1)` + `time=2` revela todo sin highlight.)

- [ ] **Step 3: Auto-select en modo pieza** — en la rama pieza de `openSequenceVideoMaker` (tras fijar `videoPiece`, antes o después del prepare): `sequenceState.videoTheme = "escenario";` + sincronizar los swatches (llamar a la misma sincronización que usa el listener de `data-video-theme` — localizarla: el listener hace `querySelectorAll("[data-video-theme]")` y fija `aria-pressed`; extraer esa sincronización tal cual o re-disparar `renderSequenceVideoPreview()` que ya lee `sequenceState.videoTheme`... verificar que el aria-pressed quede coherente: tras fijar el tema, recorrer los swatches y marcar el de escenario).

---

## Task 5: Test verde, snapshot y cierre

- [ ] **Step 1:** `node tools\check-ui.mjs` → `TODO OK (0 fallos)` (~128 checks).
- [ ] **Step 2:** sintaxis inline (`node --check`).
- [ ] **Step 3:** snapshot `index.post-fase6.html` + README (sección Fase 6: timings exactos/whisper, tema escenario, auto-select; respaldos).

---

## Self-review (ejecutado al escribir el plan)

- **Sync historias**: exactitud ffprobe (~10 ms) > proporcional.
- **Sync canciones**: whisper base EN + alineación monotónica con interpolación; cobertura ≥70%.
- **Diseño especial**: `escenario` + auto-select en modo pieza + línea siguiente.
- **Fallbacks**: sin timing → proporcional; sin audio → aviso (existente).
- **Consistencia**: `videoPiece/videoPieceMedia`, `.timing.json` por convención, `escenario` en temas+swatch+CSS+test.
