# Fase 2 — Contenido nuevo (2 historias TTS + 2 canciones) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a Biblioteca 2 historias narradas con TTS local y 2 canciones indexadas, con fusión de datos opcional, textos derivados calculados y filtro de categorías en la lista lateral — sin tocar `assets/podcast-series.json` ni su validación de 9 episodios / 2250 chunks.

**Architecture:** Contenido nuevo vive en archivos aparte (`assets/extra-stories.json`, `assets/songs-index.json`) que se fusionan con `CREATIVE_COLLECTIONS` **después** de la validación existente en `index.html`. La síntesis de voz se automatiza en `tools/build-stories.mjs` (edge-tts + ffmpeg), y los guiones/letras fuente viven en `assets/stories/*.script.json`. `tools/check-ui.mjs` se amplía con una sección 6 que valida esquemas, chunks reales, presencia de audio y el orden de la fusión respecto a la validación.

**Tech Stack:** `uvx edge-tts` (TTS neural multi-voz), `ffmpeg` (concat + silencios + `loudnorm` + MP3 44,1 kHz 160 kbps), Node 20+ (`node:fs`, `node:child_process`), Python `http.server` para verificación local.

---

## Contexto que debes conocer antes de tocar nada

| Hecho | Dónde |
|---|---|
| `CREATIVE_COLLECTIONS = { stories: [], songs: [] }` | `index.html:987` |
| `creativeState` (hay que añadir `category`) | `index.html:988` |
| Botones Podcasts / Canciones | `index.html:879-880` |
| Título + hint fijos en el HTML | `index.html:884` |
| Lista lateral `#creativeList` (vacía, se rellena por JS) | `index.html:885` |
| Reader `#creativeReader` | `index.html:887` |
| DOM refs (`creativeList`, `creativeReader`, `creativeLibraryTitle/Hint`, `storiesKindBtn`, `songsKindBtn`) | `index.html:1086-1091` |
| `renderCreative()` — título/hint fijos en JS: `index.html:4089-4090` | rango `4084-4123` |
| `playCreativeAudio()` | `index.html:4125` |
| `addCreativeChunksToSequence()` — match exacto (case-insensitive) contra `sequenceState.catalog[].text` | `index.html:4148-4170` |
| `chooseCreativeKind()` | `index.html:4172-4177` |
| `loadData()` → validación 9/2250 **en `index.html:4215-4217`** y `renderCreative()` en `:4250` | `4202-4259` |
| `buildSequenceCatalog()` → `text = item[SEQUENCE_FIELDS[].field]` | `index.html:2918-2941` |
| `SEQUENCE_FIELDS = idiom, first_person, third_person, question, answer` | `index.html:2905-2911` |
| `MODULES` (10 ficheros JSON en `assets/`) | `index.html:907-916` |
| Estilo de `.creative-library-head` (patrón para `.creative-filter`) | `index.html:415-418` |
| Test actual: 56 checks, `node tools/check-ui.mjs` → `TODO OK (0 fallos)` | `tools/check-ui.mjs` (194 líneas) |
| Esquema real de entrada: `{title, subtitle, summary, audio, lines:[{en, es, speaker}]}` | `assets/podcast-series.json` |

### Invariantes (romper cualquiera = tarea fallida)

1. **Nunca** editar `assets/podcast-series.json`.
2. **Nunca** editar la validación `CREATIVE_COLLECTIONS.stories.length !== 9 || podcastChunkCount !== 2250`.
3. Todo `lines[].en` de contenido nuevo **debe** ser un chunk textual del banco de tarjetas (si no, "Practicar estos chunks" no vincula nada).
4. El contenido nuevo **nunca** puede romper la app si el archivo no existe o está mal: cargas opcionales con `.catch(function(){})`.
5. No regresiones de Fase 1: `node tools/check-ui.mjs` debe seguir en `TODO OK (0 fallos)` al final.
6. Respaldo antes de editar: `index.pre-fase2.html`.

### Decisiones ya tomadas (no re-preguntar)

- Categorías: clave = id de módulo (`native`, `idioms`, `keywords`, `adjectives`, `nouns`, `contractions`); las de los 9 podcasts se **derivan del título** con `categoryOf()` (no se puede editar el JSON de la serie).
- Las historias existentes en `assets/stories/historia-podcast-*.mp3` y `assets/stories/pizza-*.mp3` **no se indexan**; los nombres nuevos usan slugs distintos.
- Los WAV de `assets/songs/` que ya existen no se indexan salvo que el usuario lo pida.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `tools/check-ui.mjs` | Guardrail (sección 6 = Fase 2) | Modificar |
| `assets/stories/<slug>.script.json` | Guión aprobado: voces + líneas (fuente de verdad) | Crear ×2 |
| `tools/build-stories.mjs` | Valida chunks, sintetiza con edge-tts, concatena con ffmpeg, escribe `extra-stories.json` | Crear |
| `assets/stories/<slug>.mp3` | Audio final de cada historia (44,1 kHz, 160 kbps) | Crear ×2 |
| `assets/extra-stories.json` | Índice de historias nuevas (derivado de los scripts) | Crear (por el generador) |
| `assets/songs/<cancion>.mp3` | Audio entregado por el usuario | Crear (usuario) |
| `assets/songs-index.json` | Índice de canciones | Crear |
| `index.html` | Fusión tras validación + textos derivados + chips de categoría | Modificar (5 parches) |
| `index.pre-fase2.html` | Respaldo con fecha | Crear |
| `README.txt` | Registro de Fase 2 | Modificar |

---

## Task 1: Respaldo y test rojo

**Files:**
- Create: `index.pre-fase2.html`
- Modify: `tools/check-ui.mjs:1` (import) y `tools/check-ui.mjs:193` (insertar sección 6)

- [ ] **Step 1: Respaldo con fecha**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Copy-Item "$root\index.html" "$root\index.pre-fase2.html"
Get-Item "$root\index.pre-fase2.html" | Select-Object Name, Length
```

Expected: `index.pre-fase2.html`, `Length = 239113`.

- [ ] **Step 2: Ampliar el import de `check-ui.mjs`**

Reemplazar la línea 1:

```js
import { readFileSync, existsSync } from "node:fs";
```

- [ ] **Step 3: Escribir el test (sección 6) — debe FALLAR ahora**

Insertar **justo antes** de la línea final (`console.log(failed === 0 ? ...`):

```js
// ---- 6. Fase 2: contenido nuevo ----
const parseJson = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
const extraRaw = readSafe("assets/extra-stories.json");
const songsRaw = readSafe("assets/songs-index.json");
const seriesRaw = readSafe("assets/podcast-series.json");

ok("existe assets/extra-stories.json", Boolean(extraRaw), "no encontrado");
ok("existe assets/songs-index.json", Boolean(songsRaw), "no encontrado");

const extras = extraRaw ? parseJson(extraRaw) : null;
const songs = songsRaw ? parseJson(songsRaw) : null;
const series = seriesRaw ? parseJson(seriesRaw) : null;

ok("extra-stories.json: array con >= 2 historias", Array.isArray(extras) && extras.length >= 2,
  `entries=${Array.isArray(extras) ? extras.length : "JSON invalido"}`);
ok("songs-index.json: array con >= 2 canciones", Array.isArray(songs) && songs.length >= 2,
  `entries=${Array.isArray(songs) ? songs.length : "JSON invalido"}`);

const entryOk = (e, minLines) => Boolean(e) && typeof e.title === "string" && e.title.trim() !== "" &&
  typeof e.subtitle === "string" && typeof e.summary === "string" && typeof e.audio === "string" &&
  typeof e.category === "string" && e.category.trim() !== "" && Array.isArray(e.lines) &&
  e.lines.length >= minLines && e.lines.every((l) => l && typeof l.en === "string" && l.en.trim() &&
    typeof l.es === "string" && typeof l.speaker === "string" && l.speaker);

const audioMissing = (list) => (Array.isArray(list) ? list : [])
  .map((e) => e.audio).filter((p) => typeof p === "string" && !existsSync(resolve(ROOT, p)));

const MODULE_FILES = ["assets/Ingles-Frases-Nativas-1.json", "assets/Idioms-1.json",
  "assets/Idioms-2.json", "assets/Idioms-3.json", "assets/Idioms-4.json", "assets/Idioms-5.json",
  "assets/palabras_clave_esenciales.json", "assets/100_adjetivos_y_sustantivos_m_s_usados.json",
  "assets/palabras_sustantivas-comunes_m_s_usadas.json", "assets/contracciones_informales.json"];
const CARD_FIELDS = ["idiom", "first_person", "third_person", "question", "answer"];
const cardPool = new Set();
for (const file of MODULE_FILES) {
  const rows = parseJson(readSafe(file));
  if (!Array.isArray(rows)) continue;
  for (const row of rows) for (const field of CARD_FIELDS) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) cardPool.add(value.trim().toLowerCase());
  }
}
ok("banco de chunks real cargado desde los 10 JSON de tarjetas", cardPool.size >= 1000, `size=${cardPool.size}`);

if (Array.isArray(extras)) {
  ok("extra-stories: esquema completo (title/subtitle/summary/audio/category/lines)",
    extras.every((e) => entryOk(e, 20)), "faltan campos obligatorios o lineas < 20");
  const speakers = new Set(extras.flatMap((e) => e.lines.map((l) => l.speaker)));
  ok("extra-stories: >= 2 voces/personajes distintos", speakers.size >= 2, `speakers=${[...speakers].join(",")}`);
  const outside = extras.flatMap((e) => e.lines)
    .filter((l) => !cardPool.has(String(l.en).trim().toLowerCase())).map((l) => l.en);
  ok("extra-stories: TODOS los chunks existen en el banco de 2250", outside.length === 0,
    "fuera de catalogo: " + outside.slice(0, 3).join(" | "));
  ok("extra-stories: audios presentes en disco", audioMissing(extras).length === 0,
    "faltan: " + audioMissing(extras).join(", "));
  const wrongDir = extras.map((e) => e.audio).filter((p) => !p.startsWith("assets/stories/"));
  ok("extra-stories: audio bajo assets/stories/", wrongDir.length === 0, wrongDir.join(", "));
}
if (Array.isArray(songs)) {
  ok("songs-index: esquema completo (>= 8 lineas)", songs.every((e) => entryOk(e, 8)),
    "faltan campos obligatorios o lineas < 8");
  const wrongDir = songs.map((e) => e.audio).filter((p) => !p.startsWith("assets/songs/"));
  ok("songs-index: audio bajo assets/songs/ y presente", wrongDir.length === 0 && audioMissing(songs).length === 0,
    "mal: " + wrongDir.join(", ") + " | faltan: " + audioMissing(songs).join(", "));
  const stats = songs.map((e) => {
    const hits = e.lines.filter((l) => cardPool.has(String(l.en).trim().toLowerCase())).length;
    return e.lines.length ? hits / e.lines.length : 0;
  });
  ok("songs-index: >= 60% de las lineas son chunks del banco", stats.every((r) => r >= 0.6),
    "ratio=" + stats.map((r) => r.toFixed(2)).join(","));
}

if (html) {
  const iValidate = html.indexOf("podcastChunkCount !== 2250");
  const iExtra = html.indexOf("assets/extra-stories.json");
  const iSongs = html.indexOf("assets/songs-index.json");
  ok("index.html: extra-stories se fusiona DESPUES de la validacion 9/2250",
    iValidate > -1 && iExtra > iValidate, `valid=${iValidate} extra=${iExtra}`);
  ok("index.html: songs-index se carga DESPUES de la validacion",
    iValidate > -1 && iSongs > iValidate, `valid=${iValidate} songs=${iSongs}`);
  ok("index.html: la carga extra es tolerante a fallos (.catch)",
    iExtra > -1 && /\.catch\(\s*function\s*\(\s*\)\s*\{\s*\}\s*\)/.test(html.slice(iExtra, iExtra + 700)),
    "sin .catch en la fusion");

  const rStart = html.indexOf("function renderCreative");
  const rEnd = html.indexOf("function playCreativeAudio");
  const rc = rStart > -1 && rEnd > rStart ? html.slice(rStart, rEnd) : "";
  ok("renderCreative: hint calculado con totales reales (sin texto fijo de 9 episodios)",
    rc !== "" && rc.includes("extraCount") && rc.includes("chunkTotal") &&
      !rc.includes("\"9 episodios · 2250 chunks · narrados por Nora.\""),
    rc === "" ? "renderCreative no encontrada" : "sigue con hint fijo");
  ok("Biblioteca: chips de categoria en la lista lateral",
    html.includes("id=\"creativeFilter\"") && rc.includes("data-category"));
  ok("index.html: categoryOf deriva categorias sin tocar podcast-series.json",
    html.includes("function categoryOf"));
  ok("index.html: .creative-filter[hidden] oculta los chips",
    /\.creative-filter\[hidden\]/.test(html));
}
```

- [ ] **Step 4: Ejecutar el test y ver ROJO**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\check-ui.mjs
```

Expected: los 56 checks previos en `PASS`, los **nuevos** en `FAIL` (extra-stories/songs ausentes, fusión ausente, renderCreative con hint fijo), salida `N FALLO(S)` con `process.exitCode = 1`.

- [ ] **Step 5: Confirmar que solo fallan los checks nuevos**

Si falla algún check de Fase 1 (secciones 1-5), **para** y arréglalo antes de continuar: este plan no debe degradar nada existente.

---

## Task 2: Guiones de las 2 historias → GATE de aprobación

**Files:**
- Create: `assets/stories/chunks-la-semana.script.json`
- Create: `assets/stories/chunks-el-primer-dia.script.json`

- [ ] **Step 1: Leer el banco de chunks**

```powershell
node -e "const s=JSON.parse(require('fs').readFileSync('assets/podcast-series.json','utf8'));s.forEach((e,i)=>console.log(i+1, e.title, e.lines.length))"
```

Expected: 9 episodios × 250 líneas.

- [ ] **Step 2: Escribir el guión 1 — `assets/stories/chunks-la-semana.script.json`**

Reglas: **cada `en` es literal de `podcast-series.json`** (copia también su `es`), 2 personajes, 40-60 líneas, contexto laboral cotidiano, categoría `idioms` (episodios 3-4).

```json
{
  "slug": "chunks-la-semana",
  "title": "Una semana a tope",
  "subtitle": "Historia con chunks de Idioms · 2 voces · Ida y vuelta en la oficina",
  "summary": "Nora y Marco organizan una semana imposible usando chunks de Idioms: planes que se complican, plazos que se corren y nada que se resuelve sin hablarlo.",
  "category": "idioms",
  "voices": { "Nora": "en-US-JennyNeural", "Marco": "en-US-AndrewMultilingualNeural" },
  "lines": [
    { "en": "I have a lot on my plate.", "es": "Tengo mucho trabajo.", "speaker": "Nora" },
    { "en": "Do you have a lot on your plate?", "es": "¿Tienes mucho trabajo?", "speaker": "Marco" },
    { "en": "Yes, I have a full plate today.", "es": "Sí, hoy tengo mucho trabajo.", "speaker": "Nora" },
    { "en": "Ahead of the curve", "es": "Estar a la vanguardia / adelantado", "speaker": "Nora" },
    { "en": "She has a lot on her plate.", "es": "Ella tiene mucho trabajo.", "speaker": "Nora" }
  ]
}
```

Completar hasta 40-60 líneas con el mismo criterio (dialogar con los campos `idiom` / `first_person` / `third_person` / `question` / `answer` de los episodios 3 y 4).

- [ ] **Step 3: Escribir el guión 2 — `assets/stories/chunks-el-primer-dia.script.json`**

Categoría distinta (`native`, episodios 1-2) y voces distintas:

```json
{
  "slug": "chunks-el-primer-dia",
  "title": "El primer día",
  "subtitle": "Historia con chunks de Frases nativas · 2 voces · Un debut en la oficina",
  "summary": "Sara estrena trabajo y Nora la guía por el primer día con las frases nativas que todo el mundo usa y nadie explica.",
  "category": "native",
  "voices": { "Nora": "en-US-JennyNeural", "Sara": "en-GB-SoniaNeural" },
  "lines": [
    { "en": "Deal with it", "es": "Yo me encargo / Hazte cargo / Lidias con eso", "speaker": "Nora" },
    { "en": "I'll deal with it right now.", "es": "Me encargaré de eso en este momento.", "speaker": "Sara" },
    { "en": "Can you deal with it?", "es": "¿Puedes encargarte de eso?", "speaker": "Nora" },
    { "en": "Don't worry about the mess, I'll deal with it.", "es": "No te preocupes por el desorden, yo me encargo.", "speaker": "Sara" },
    { "en": "She deals with it calmly.", "es": "Ella se encarga de eso con calma.", "speaker": "Nora" }
  ]
}
```

Completar hasta 40-60 líneas.

- [ ] **Step 4: Validación local de chunks antes de pedir aprobación**

```powershell
node -e "const fs=require('fs');const P=new Set();const F=['idiom','first_person','third_person','question','answer'];const M=['Ingles-Frases-Nativas-1','Idioms-1','Idioms-2','Idioms-3','Idioms-4','Idioms-5','palabras_clave_esenciales','100_adjetivos_y_sustantivos_m_s_usados','palabras_sustantivas-comunes_m_s_usadas','contracciones_informales'];M.forEach(f=>JSON.parse(fs.readFileSync('assets/'+f+'.json','utf8')).forEach(r=>F.forEach(k=>typeof r[k]==='string'&&r[k].trim()&&P.add(r[k].trim().toLowerCase()))));['chunks-la-semana','chunks-el-primer-dia'].forEach(s=>{const j=JSON.parse(fs.readFileSync('assets/stories/'+s+'.script.json','utf8'));const bad=j.lines.filter(l=>!P.has(l.en.trim().toLowerCase()));console.log(s, j.lines.length+' lineas', bad.length? 'FUERA: '+JSON.stringify(bad.map(l=>l.en)) : 'OK', 'personajes='+new Set(j.lines.map(l=>l.speaker)).size);})"
```

Expected: `OK` en ambos, `personajes=2`, 40-60 líneas.

- [ ] **Step 5: ⛔ GATE — presentar los guiones al usuario y esperar aprobación**

Presenta ambos guiones completos (título, resumen, lista `en`/`es`/speaker) y **no ejecutes el TTS** hasta recibir aprobación explícita. Si el usuario pide cambios, aplica y repite Step 4.

---

## Task 3: `tools/build-stories.mjs` + audio de las historias

**Files:**
- Create: `tools/build-stories.mjs`
- Create: `assets/stories/chunks-la-semana.mp3`, `assets/stories/chunks-el-primer-dia.mp3`
- Create: `assets/extra-stories.json`

- [ ] **Step 1: Crear el generador**

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORIES = join(ROOT, "assets", "stories");
const GAP = 0.30;

const MODULE_FILES = ["assets/Ingles-Frases-Nativas-1.json", "assets/Idioms-1.json",
  "assets/Idioms-2.json", "assets/Idioms-3.json", "assets/Idioms-4.json", "assets/Idioms-5.json",
  "assets/palabras_clave_esenciales.json", "assets/100_adjetivos_y_sustantivos_m_s_usados.json",
  "assets/palabras_sustantivas-comunes_m_s_usadas.json", "assets/contracciones_informales.json"];
const CARD_FIELDS = ["idiom", "first_person", "third_person", "question", "answer"];

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true });
  if (res.error) throw new Error("No se pudo ejecutar " + cmd + ": " + res.error.message);
  if (res.status !== 0) throw new Error(cmd + " fallo (" + res.status + "):\n" + String(res.stderr || "").slice(-600));
  return String(res.stdout || "");
};

function catalogTexts() {
  const set = new Set();
  for (const file of MODULE_FILES) {
    const rows = json(join(ROOT, file));
    for (const row of rows) for (const field of CARD_FIELDS) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) set.add(value.trim().toLowerCase());
    }
  }
  return set;
}

function validate(script, pool) {
  const bad = script.lines.filter((l) => !pool.has(String(l.en).trim().toLowerCase())).map((l) => l.en);
  if (bad.length) throw new Error(script.slug + ": chunks fuera del banco:\n  " + bad.join("\n  "));
  const speakers = [...new Set(script.lines.map((l) => l.speaker))];
  if (speakers.length < 2) throw new Error(script.slug + ": se requieren >= 2 personajes");
  for (const s of speakers) if (!script.voices[s]) throw new Error(script.slug + ": falta voz para " + s);
  if (new Set(Object.values(script.voices)).size < 2) throw new Error(script.slug + ": se requieren >= 2 voces distintas");
}

function build(script, pool) {
  const buildDir = join(STORIES, ".build", script.slug);
  mkdirSync(buildDir, { recursive: true });
  const gap = join(buildDir, "gap.wav");
  if (!existsSync(gap)) {
    run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(GAP), gap]);
  }
  const files = [];
  script.lines.forEach((line, i) => {
    const n = String(i + 1).padStart(3, "0");
    const voice = script.voices[line.speaker];
    const segMp3 = join(buildDir, n + ".mp3");
    const segWav = join(buildDir, n + ".wav");
    if (!existsSync(segMp3)) {
      run("uvx", ["edge-tts", "--voice", voice, "--text", line.en, "--write-media", segMp3]);
    }
    if (!existsSync(segWav)) {
      run("ffmpeg", ["-y", "-i", segMp3, "-ar", "44100", "-ac", "2", segWav]);
    }
    files.push(segWav);
    if (i < script.lines.length - 1) files.push(gap);
  });
  const listPath = join(buildDir, "concat.txt");
  writeFileSync(listPath, files.map((f) => "file '" + f.replace(/\\/g, "/") + "'").join("\n") + "\n", "utf8");
  const out = join(STORIES, script.slug + ".mp3");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100",
    "-c:a", "libmp3lame", "-b:a", "160k", out]);
  console.log("OK " + script.slug + " -> assets/stories/" + script.slug + ".mp3");
}

function writeIndex() {
  const scripts = readdirSync(STORIES).filter((f) => f.endsWith(".script.json")).sort();
  const entries = scripts.map((file) => {
    const s = json(join(STORIES, file));
    return { title: s.title, subtitle: s.subtitle, summary: s.summary, category: s.category,
      audio: "assets/stories/" + s.slug + ".mp3", lines: s.lines };
  });
  writeFileSync(join(ROOT, "assets/extra-stories.json"),
    JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log("assets/extra-stories.json -> " + entries.length + " historias");
}

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? process.argv[onlyArg + 1] : null;
const scripts = readdirSync(STORIES).filter((f) => f.endsWith(".script.json"))
  .map((f) => join(STORIES, f)).filter((p) => !only || p.includes(only));
if (!scripts.length) throw new Error("No hay assets/stories/*.script.json");
const pool = catalogTexts();
console.log("chunks en el banco: " + pool.size);
for (const path of scripts) {
  const script = json(path);
  validate(script, pool);
  build(script, pool);
}
writeIndex();
```

- [ ] **Step 2: Verificar dependencias**

```powershell
ffmpeg -version | Select-Object -First 1
uvx edge-tts --list-voices | Select-String "en-US-JennyNeural|en-US-AndrewMultilingualNeural|en-GB-SoniaNeural"
```

Expected: ffmpeg N-123918+ y las 3 voces listadas.

- [ ] **Step 3: Ejecutar la síntesis (SOLO tras la aprobación del Task 2)**

```powershell
Set-Location "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
node tools\build-stories.mjs
```

Expected: `chunks en el banco: NNNNN`, dos líneas `OK ... -> assets/stories/....mp3`, y `assets/extra-stories.json -> 2 historias`. (~40-60 llamadas de TTS; tarda 1-3 min.)

- [ ] **Step 4: Verificar el audio con ffprobe**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
foreach ($f in @("chunks-la-semana","chunks-el-primer-dia")) {
  $p = "$root\assets\stories\$f.mp3"
  $d = & ffprobe -v error -show_entries format=duration,bit_rate -of default=noprint_wrappers=1 $p 2>$null
  "$f => " + ($d -join " ")
}
```

Expected: `duration` entre 60 y 300 s, `bit_rate=160000`.

- [ ] **Step 5: Ejecutar el test — los checks de historias deben ponerse VERDES**

```powershell
node tools\check-ui.mjs
```

Expected: verdes `existe assets/extra-stories.json`, `array con >= 2 historias`, `esquema completo`, `>= 2 voces`, `TODOS los chunks existen`, `audios presentes`, `audio bajo assets/stories/`, `banco de chunks real cargado`. Siguen en rojo los de `songs-index` y los de `index.html` (Task 4 / Task 6).

---

## Task 4: Integración en `index.html` (fusión + textos + chips)

**Files:**
- Modify: `index.html:884-885` (HTML), `index.html:416` (CSS), `index.html:988` (estado), `index.html:1086-1091` (refs), `index.html:4084-4123` (`renderCreative`), `index.html:4217` (fusión)

- [ ] **Step 1: Parche A — fila de filtros en el HTML**

En `index.html:884-885`, tras `.creative-library-head`:

```html
          <div class="creative-library-head"><strong id="creativeLibraryTitle">Serie podcast completa</strong><span id="creativeLibraryHint">9 episodios · 2250 chunks · narrados por Nora.</span></div>
          <div class="creative-filter" id="creativeFilter" role="group" aria-label="Filtrar por categoría" hidden></div>
          <div class="creative-list" id="creativeList"></div>
```

- [ ] **Step 2: Parche B — CSS de los chips** (junto a `.creative-library-head` en `index.html:416`)

```css
    .creative-filter { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
    .creative-filter[hidden] { display: none; }
    .creative-chip { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 999px; padding: 4px 10px; font-size: .72rem; font-weight: 700; cursor: pointer; }
    .creative-chip[aria-pressed="true"] { background: var(--blue); border-color: var(--blue); color: #fff; }
    @media (max-width: 740px) { .creative-filter { gap: 5px; padding: 8px 12px; } }
```

- [ ] **Step 3: Parche C — estado + derivación de categorías**

`index.html:988`:

```js
    const creativeState = { kind: "stories", index: 0, category: "*" };
```

Justo debajo (nuevo):

```js
    const CATEGORY_LABELS = {
      "": "Sin categoría", "*": "Todas", native: "Frases nativas", idioms: "Idioms",
      keywords: "Palabras clave", adjectives: "Adjetivos", nouns: "Sustantivos",
      contractions: "Contracciones", canciones: "Canciones"
    };
    function categoryOf(entry) {
      if (entry && typeof entry.category === "string" && entry.category) return entry.category;
      const title = String((entry && entry.title) || "").toLowerCase();
      if (title.startsWith("frases nativas")) return "native";
      if (title.startsWith("idioms")) return "idioms";
      if (title.startsWith("adjetivos")) return "adjectives";
      if (title.startsWith("sustantivos")) return "nouns";
      if (title.startsWith("palabras clave")) return "keywords";
      return "";
    }
```

- [ ] **Step 4: Parche D — ref de DOM** (tras `songsKindBtn`, `index.html:1091`)

```js
    const creativeFilter = document.getElementById("creativeFilter");
```

- [ ] **Step 5: Parche E — reescribir `renderCreative()`**

Reemplazar **todo** el cuerpo de `renderCreative()` (`index.html:4084-4123` en el estado pre-edición) por:

> Los números de línea se desplazan con los Parches A-D: localiza la función por su nombre (`function renderCreative` hasta `function playCreativeAudio`), no por línea.

```js
    function renderCreative() {
      const isStories = creativeState.kind === "stories";
      const collections = CREATIVE_COLLECTIONS[creativeState.kind] || [];
      storiesKindBtn.setAttribute("aria-pressed", String(isStories));
      songsKindBtn.setAttribute("aria-pressed", String(!isStories));

      const extraCount = isStories ? Math.max(0, CREATIVE_COLLECTIONS.stories.length - 9) : 0;
      const chunkTotal = CREATIVE_COLLECTIONS.stories.reduce(function(total, episode) {
        return total + (Array.isArray(episode.lines) ? episode.lines.length : 0);
      }, 0);
      creativeLibraryTitle.textContent = isStories
        ? (extraCount ? "Serie podcast + " + extraCount + (extraCount === 1 ? " historia" : " historias") : "Serie podcast completa")
        : (collections.length ? "Canciones (" + collections.length + ")" : "Canciones");
      creativeLibraryHint.textContent = isStories
        ? "9 episodios" + (extraCount ? " + " + extraCount + (extraCount === 1 ? " historia" : " historias") : "") +
          " · " + chunkTotal + " chunks · narrados por Nora."
        : (collections.length
            ? collections.length + " pistas terminadas creadas con tu IA de música."
            : "Pistas terminadas creadas con tu IA de música.");

      if (!collections.length) {
        creativeState.category = "*";
        creativeFilter.hidden = true;
        creativeFilter.innerHTML = "";
        creativeList.innerHTML = '<div class="creative-empty" style="min-height:180px;padding:28px 18px"><div class="creative-empty-inner"><span class="creative-empty-mark" aria-hidden="true">' + (isStories ? "H" : "♪") + '</span><h2>' + (isStories ? "Próxima historia" : "Próxima canción") + '</h2><p>' + (isStories ? "La primera historia aparecerá aquí cuando esté lista como podcast." : "La primera canción aparecerá aquí cuando entregues el archivo creado por tu IA musical.") + '</p></div></div>';
        creativeReader.innerHTML = '<div class="creative-empty"><div class="creative-empty-inner"><span class="creative-empty-mark" aria-hidden="true">' + (isStories ? "▶" : "♫") + '</span><h2>' + (isStories ? "Historias narradas, no secuencias armadas" : "Canciones reales, no audios simulados") + '</h2><p>' + (isStories ? "Cada historia se creará primero como un podcast completo y después se indexará aquí con su audio, transcripción y chunks destacados." : "Cuando compartas una canción terminada, se indexará aquí con su reproductor, letra y chunks destacados.") + '</p><p class="creative-source-note">Nada se genera ni se inventa dentro de esta sección.</p></div></div>';
        return;
      }

      const realKeys = [];
      collections.forEach(function(entry) {
        const key = categoryOf(entry);
        if (realKeys.indexOf(key) === -1) realKeys.push(key);
      });
      const showChips = realKeys.length > 1 || (realKeys.length === 1 && realKeys[0] !== "");
      if (showChips) {
        if (realKeys.indexOf(creativeState.category) === -1 && creativeState.category !== "*") creativeState.category = "*";
        const chipKeys = ["*"].concat(realKeys.filter(function(key) { return key !== "*"; }));
        creativeFilter.hidden = false;
        creativeFilter.innerHTML = chipKeys.map(function(key) {
          return '<button class="creative-chip" type="button" data-category="' + escapeHtml(key) + '" aria-pressed="' + (key === creativeState.category) + '">' + escapeHtml(CATEGORY_LABELS[key] || key) + '</button>';
        }).join("");
        creativeFilter.querySelectorAll("[data-category]").forEach(function(button) {
          button.addEventListener("click", function() {
            stopSpeech();
            creativeState.category = button.dataset.category;
            renderCreative();
          });
        });
      } else {
        creativeState.category = "*";
        creativeFilter.hidden = true;
        creativeFilter.innerHTML = "";
      }

      const visible = [];
      collections.forEach(function(entry, index) {
        if (creativeState.category !== "*" && categoryOf(entry) !== creativeState.category) return;
        visible.push({ entry: entry, index: index });
      });
      if (!visible.length && creativeState.category !== "*") {
        creativeState.category = "*";
        collections.forEach(function(entry, index) { visible.push({ entry: entry, index: index }); });
      }
      if (!visible.some(function(pair) { return pair.index === creativeState.index; })) {
        creativeState.index = visible[0].index;
      }
      const current = collections[creativeState.index];
      const lines = Array.isArray(current.lines) ? current.lines : [];

      creativeList.innerHTML = visible.map(function(pair) {
        const entry = pair.entry;
        const count = Array.isArray(entry.lines) ? entry.lines.length : 0;
        const chip = entry.category ? '<small>' + escapeHtml(CATEGORY_LABELS[entry.category] || entry.category) + '</small>' : "";
        return '<button class="creative-pick" type="button" data-creative-index="' + pair.index + '" aria-pressed="' + (pair.index === creativeState.index) + '"><span><strong>' + escapeHtml(entry.title) + '</strong><small>' + escapeHtml(entry.subtitle || (isStories ? "Podcast narrado" : "Canción indexada")) + '</small>' + chip + '</span><span class="creative-pick-count">' + count + '</span></button>';
      }).join("");
      creativeReader.innerHTML = '<div class="creative-reader-head"><p class="creative-type">' + (isStories ? "Episodio · Podcast" : "Canción · IA musical") + '</p><h2 class="creative-title">' + escapeHtml(current.title) + '</h2><p class="creative-summary">' + escapeHtml(current.summary || "Audio completo con sus chunks destacados.") + '</p></div>' +
        '<div class="creative-actions"><button class="creative-listen" id="creativeListenBtn" type="button">▶ Escuchar audio completo</button><button class="creative-sequence" id="creativeSequenceBtn" type="button">Practicar estos chunks</button></div>' +
        '<ol class="creative-lines">' + lines.map(function(line, index) {
          return '<li class="creative-line"><span class="creative-line-number">' + (index + 1) + '</span><div>' + (line.speaker ? '<span class="creative-speaker">' + escapeHtml(line.speaker) + '</span>' : '') + '<p class="creative-line-en">' + escapeHtml(line.en || line.text || "") + '</p>' + (line.es ? '<p class="creative-line-es">' + escapeHtml(line.es) + '</p>' : '') + '</div></li>';
        }).join("") + '</ol>';

      creativeList.querySelectorAll("[data-creative-index]").forEach(function(button) {
        button.addEventListener("click", function() {
          stopSpeech();
          creativeState.index = Number(button.dataset.creativeIndex);
          renderCreative();
        });
      });
      const listenButton = document.getElementById("creativeListenBtn");
      listenButton.disabled = !current.audio;
      if (!current.audio) listenButton.textContent = "Audio no disponible";
      listenButton.addEventListener("click", function() { playCreativeAudio(current, listenButton); });
      document.getElementById("creativeSequenceBtn").addEventListener("click", function() { addCreativeChunksToSequence(lines); });
    }
```

> Nota: el `<small>` extra del chip va **después** del subtitle dentro del mismo `<span>`; si prefieres no duplicar categoría en la lista, borra la línea `const chip = ...` y su concatenación — el test no la exige.

- [ ] **Step 6: Parche F — fusión opcional tras la validación**

Insertar en `loadData()`, **inmediatamente después** del cierre del bloque `if (... !== 9 || ... !== 2250) { throw ... }` (después de `index.html:4217`) y **antes** del `const loaded = await Promise.all(MODULES.map(...))`:

```js
        await Promise.all([
          fetch("assets/extra-stories.json")
            .then(function(response) { return response.ok ? response.json() : null; })
            .then(function(data) {
              if (Array.isArray(data)) CREATIVE_COLLECTIONS.stories = CREATIVE_COLLECTIONS.stories.concat(data);
            })
            .catch(function() {}),
          fetch("assets/songs-index.json")
            .then(function(response) { return response.ok ? response.json() : null; })
            .then(function(data) {
              if (Array.isArray(data)) CREATIVE_COLLECTIONS.songs = data;
            })
            .catch(function() {})
        ]);
```

- [ ] **Step 7: Ejecutar el test — verdes todos los checks de `index.html`**

```powershell
node tools\check-ui.mjs
```

Expected: verdes los 56 checks previos + todos los de `index.html` de la sección 6 (fusión DESPUÉS de la validación, `.catch`, hint derivado, chips, `categoryOf`, `.creative-filter[hidden]`). Siguen en rojo SOLO los checks de `songs-index.json` (se ponen verdes en el Task 6) y, si el Task 2/3 están pendientes, los de `extra-stories`.

- [ ] **Step 8: Confirmar invariantes de Fase 1**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
(Get-FileHash "$root\index.html" -Algorithm SHA256).Hash
Select-String -Path "$root\index.html" -Pattern "data-theme=|themeCycleBtn|assets/solar-themes.css|assets/theme-toggle.js" -Encoding UTF8 | Measure-Object | Select-Object Count
```

Expected: los 56 checks previos siguen en `PASS` (incluidos `solar-themes.css enlaza`, `botón de tema`, `6 pestañas`, `validacion 9 episodios / 2250 chunks intacta`).

---

## Task 5: Verificación en navegador (historias)

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar el servidor local**

```powershell
$root = "C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local"
Start-Process -WindowStyle Hidden python -ArgumentList "-m","http.server","8770","--bind","127.0.0.1" -WorkingDirectory $root
Start-Sleep -Seconds 2
(Invoke-WebRequest -Uri "http://127.0.0.1:8770/index.html" -UseBasicParsing).StatusCode
```

Expected: `200`.

- [ ] **Step 2: Verificar en el navegador (requiere MCP `chrome-devtools`)**

Si las herramientas `chrome-devtools` **no están disponibles** en la sesión, marca este paso como `BLOCKED` y anota en el cierre que queda pendiente (junto con la prueba 390×844 de Fase 1). Si están disponibles:

1. Navegar a `http://127.0.0.1:8770/index.html`, abrir la pestaña Biblioteca.
2. Esperar a que `#creativeTab` esté habilitado y capturar la consola: **0 errores**.
3. Comprobar en consola:
   ```js
   [CREATIVE_COLLECTIONS.stories.length, CREATIVE_COLLECTIONS.songs.length, document.getElementById("creativeLibraryHint").textContent]
   ```
   Expected: `[11, 0, "9 episodios + 2 historias · 2350 chunks · narrados por Nora."]` en este punto (`songs = 0` hasta el Task 6; los números exactos dependen de tus guiones).
4. Comprobar que la lista lateral muestra **11** botones `.creative-pick` y que hay chips `Todas | Frases nativas | Idioms | ...`.
5. Clic en el chip `Idioms` → solo se ven las piezas de esa categoría; el item actual se mantiene o salta al primero visible; **0 errores**.
6. Seleccionar la historia nueva → clic en `▶ Escuchar audio completo` → botón pasa a `■ Detener audio` y `audioPlayer.paused === false`.
7. Clic en `Practicar estos chunks` → toast `N chunks agregados a Secuencias.` con **N > 0** (nunca "aún no tiene chunks vinculados").
8. Cambiar a `Canciones` → si `songs-index.json` ya existe, ver 2 pistas; si no, ver el empty state.
9. Recargar la página → el tema y los datos siguen igual (regresión Fase 1).

- [ ] **Step 3: Verificación móvil (opcional, mismo bloque)**

Con `chrome-devtools_emulate` viewport `390x844`: sin scroll horizontal (`.scrollWidth === document.documentElement.clientWidth`), chips y lista sin overflow.

---

## Task 6: Canciones (letra → GATE → audio del usuario → índice)

**Files:**
- Create: `assets/songs/<slug>.mp3` (usuario)
- Create: `assets/songs-index.json` (agente)

- [ ] **Step 1: Escribir las 2 letras (verso/estribillo con chunks)**

Cada línea `en` de la letra debe ser, en ≥60 % de los casos, literal del banco de chunks (el estribillo conviene que sea 100 % chunks para que "Practicar estos chunks" sea potente). Estructura mínima por canción: `verse 1 (6-8 líneas) + chorus (4 líneas) + verse 2 (6 líneas) + chorus (4 líneas)` = 20-24 líneas, todas con `es` y `speaker` (`"Voz"` o el nombre del artista).

Presenta las letras en el formato:

```
Título: <title>
Categoría: canciones
Estructura: verso 1 / estribillo / verso 2 / estribillo
Línea 1: en | es   ← ¿chunk del banco? sí/no
...
```

- [ ] **Step 2: ⛔ GATE — aprobación de la letra**

No pidas audio ni escribas el índice hasta aprobación explícita.

- [ ] **Step 3: El usuario produce y entrega el audio**

El usuario genera la pista con su IA musical y la deja en `assets/songs/<slug>.mp3` (si entrega WAV/otro formato, convierte antes de indexar):

```powershell
ffmpeg -y -i "$root\assets\songs\entrada.wav" -ar 44100 -c:a libmp3lame -b:a 192k "$root\assets\songs\<slug>.mp3"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "$root\assets\songs\<slug>.mp3"
```

- [ ] **Step 4: Escribir `assets/songs-index.json`**

Esquema idéntico al de historias:

```json
[
  {
    "title": "Latido solar",
    "subtitle": "Canción · 24 líneas · chunks integrados",
    "summary": "Pop electrónico con estribillo construido sobre chunks de frases nativas.",
    "category": "canciones",
    "audio": "assets/songs/latido-solar.mp3",
    "lines": [
      { "en": "Deal with it", "es": "Yo me encargo", "speaker": "Voz" }
    ]
  }
]
```

- [ ] **Step 5: Validar el índice**

```powershell
node tools\check-ui.mjs
```

Expected: verdes todos los checks de `songs-index` y `index.html`; total `TODO OK (0 fallos)`.

---

## Task 7: Verificación final, navegador de canciones y cierre

- [ ] **Step 1: Test completo**

```powershell
node tools\check-ui.mjs
```

Expected: `TODO OK (0 fallos)`, exit 0.

- [ ] **Step 2: Verificación en navegador de Canciones** (Task 5, pasos 5-9, pero en la pestaña Canciones): 2 pistas, chips, reproducción real y "Practicar estos chunks" con N > 0.

- [ ] **Step 3: Comprobar regresión de Fase 1 en navegador**

Cambiar el tema con el botón del topbar 3 veces (system → solar-light → solar-dark), recargar, verificar `localStorage["ed-theme"]` y que no hay 0 errores de consola.

- [ ] **Step 4: Actualizar `README.txt`**

Añadir una sección:

```
FASE 2 — CONTENIDO (2026-09-26)
- assets/extra-stories.json  -> se fusiona con CREATIVE_COLLECTIONS.stories DESPUES de la validacion 9/2250.
- assets/songs-index.json    -> CREATIVE_COLLECTIONS.songs (siempre opcional: si falta, no rompe).
- assets/stories/*.script.json -> guiones aprobados (fuente de verdad).
- tools/build-stories.mjs    -> edge-tts por linea + ffmpeg (silencios 0.30s, loudnorm -16 LUFS, MP3 44.1k 160k) -> assets/stories/<slug>.mp3.
- Filtro de categorias en la lista lateral (#creativeFilter); categoryOf() deriva las categorias de los 9 podcasts sin tocar podcast-series.json.
- tools/check-ui.mjs -> seccion 6 (Fase 2). N checkpoints; TODO OK (0 fallos).
- NUNCA editar assets/podcast-series.json ni su validacion en index.html.
```

- [ ] **Step 5: Snapshot final**

```powershell
Copy-Item "$root\index.html" "$root\index.post-fase2.html"
Get-FileHash "$root\index.html" -Algorithm SHA256 | Select-Object Hash
```

- [ ] **Step 6: Detener el servidor**

```powershell
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -like "*http.server*8770*" } | ForEach-Object { Stop-Process -Id $_.ProcessId }
```

---

## Self-review (ejecutado al escribir el plan)

- **Spec §4.4**: guión+aprobación → Task 2; edge-tts ≥2 voces → Task 3 `validate()`; silencios/loudnorm/MP3 44,1 160k → Task 3 `build()`; `assets/stories/` + JSON → Task 3; letras+canciones → Task 6; esquema idéntico → Task 1 `entryOk()`; `extra-stories.json` tras validación → Task 4 Step 6 + test; `songs-index.json` → mismo parche + test; invariant 9/2250 → checks existentes intactos; filtro de categorías → Task 4 Steps 1-5; textos derivados → Task 4 Step 5.
- **Placeholders**: no hay "TBD/TODO"; los guiones completos los escribe el ejecutor en Task 2 (paso creativo con semilla real incluida).
- **Consistencia de tipos**: `slug`, `title`, `subtitle`, `summary`, `category`, `audio`, `lines[{en,es,speaker}]`, `voices{speaker:voice}` se usan igual en script, generador, test e integración.
