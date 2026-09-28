import { readFileSync, existsSync } from "node:fs";
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
  ["#1b2430","--yellow",4.5],
  ["#142334","--yellow",4.5],
  ["--blue","--surface",4.5], ["--blue","--blue-soft",4.5],
  ["#14211c","--blue",4.5], ["#241b12","--red",4.5],
  ["--red","--surface",4.5], ["--green","--surface",4.5],
  ["--ink","--yellow-soft",4.5], ["--ink","--green-soft",4.5],
];

// ---- 1. archivos nuevos ----
const css = readSafe("assets/solar-themes.css");
const js = readSafe("assets/theme-toggle.js");
const html = readSafe("index.html");
ok("existe assets/solar-themes.css", Boolean(css), "no encontrado");
ok("existe assets/theme-toggle.js", Boolean(js), "no encontrado");

const overrideCount = css ? (css.match(/\[data-theme=/g) || []).length : 0;
ok("solar-themes.css tiene >= 22 reglas con [data-theme=]", overrideCount >= 22, `encontradas=${overrideCount}`);

const ungated = [];
if (css) {
  let braceDepth = 0, inComment = false, currentSelector = "";
  const lines = css.split("\n");
  for (const rawLine of lines) {
    let line = rawLine;
    if (inComment) { const end = line.indexOf("*/"); if (end < 0) continue; line = line.slice(end + 2); inComment = false; }
    const cOpen = line.indexOf("/*");
    if (cOpen >= 0) { const cClose = line.indexOf("*/", cOpen); if (cClose < 0) { inComment = true; line = line.slice(0, cOpen); } else { line = line.slice(0, cOpen) + line.slice(cClose + 2); } }
    for (const ch of line) {
      if (ch === "{") {
        if (braceDepth === 0) {
          const sel = currentSelector.trim();
          const isMedia = /^@media\b/.test(sel);
          const gated = /\[data-theme=/.test(sel);
          const section56 = /\.theme-cycle|\.topbar-actions|^\s*(input|select|textarea)\b|\.audio-control|\.mode-tab|\.module-button|\.creative-pick|\.nav-button|\.random-button|\.listen-card|\.quiz-listen|\.quiz-repeat|\.mic-button|\.sequence-primary|\.creative-listen|\.creative-sequence|\.shell\b|\.audio-bar|\.creative-library/.test(sel);
          if (!gated && !isMedia && !section56) ungated.push(sel.replace(/\s+/g, " ").slice(0, 80));
        }
        braceDepth++; currentSelector = "";
      } else if (ch === "}") { braceDepth = Math.max(0, braceDepth - 1); currentSelector = ""; }
      else if (braceDepth === 0) currentSelector += ch;
    }
  }
}
ok("solar-themes.css: sin reglas de nivel superior fuera de los bloques permitidos (gate [data-theme] o secciones 5-6)",
  ungated.length === 0, "ungated: " + ungated.join(" || "));

const section3Needed = [".mode-tab.active", ".learn-button", ".quiz-next", ".respond-next", ".sequence-video-button", ".toast"];
const section4Needed = [".mode-tab.active", ".learn-button", ".quiz-next", ".respond-next", ".sequence-video-button", ".toast"];
const has = (theme, sel) => Boolean(css) && css.includes('[data-theme="' + theme + '"] ' + sel);
const miss3 = section3Needed.filter((s) => !has("solar-light", s));
const miss4 = section4Needed.filter((s) => !has("solar-dark", s));
ok("solar-light neutraliza las 6 reglas prefers-color-scheme:dark (spec 4.1)", miss3.length === 0, "faltan: " + miss3.join(", "));
ok("solar-dark reafirma las 6 reglas primarias", miss4.length === 0, "faltan: " + miss4.join(", "));

ok("solar-themes.css define .theme-cycle y .topbar-actions (chrome)",
  Boolean(css) && css.includes(".theme-cycle {") && css.includes(".topbar-actions {"), "reglas ausentes");

const osDarkCount = html ? (html.match(/@media \(prefers-color-scheme: dark\)/g) || []).length : 0;
ok("index.html conserva exactamente 7 bloques prefers-color-scheme: dark", osDarkCount === 7, `encontrados=${osDarkCount}`);

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
if (!html) {
  ok("index.html legible", false, "no encontrado");
} else {
  ok("index.html enlaza solar-themes.css", /href="assets\/solar-themes\.css"/.test(html));
  ok("index.html enlaza theme-toggle.js", /src="assets\/theme-toggle\.js"/.test(html));
  ok("botón de tema en el topbar", html.includes('id="themeCycleBtn"'));
  const headerSlice = (() => { const s = html.indexOf("<header"), e = html.indexOf("</header>"); return s > -1 && e > s ? html.slice(s, e + 9) : ""; })();
  ok("topbar: contiene .topbar-actions con CTA + botón de tema",
    headerSlice.includes('class="topbar-actions"') && headerSlice.includes('id="personalizedBtn"') && headerSlice.includes('id="themeCycleBtn"'),
    headerSlice === "" ? "header no encontrado" : "ids encontrados pero falta estructura");
  ok("topbar: div balanceado dentro del <header>",
    headerSlice !== "" && (headerSlice.match(/<div/g) || []).length === (headerSlice.match(/<\/div>/g) || []).length,
    `divs=${headerSlice === "" ? 0 : (headerSlice.match(/<div/g) || []).length} cierres=${headerSlice === "" ? 0 : (headerSlice.match(/<\/div>/g) || []).length}`);
  const headStart = html.indexOf("<head");
  const headEnd = html.indexOf("</head>");
  const iCssLink = html.indexOf('href="assets/solar-themes.css"');
  const iJsScript = html.indexOf('src="assets/theme-toggle.js"');
  ok("solar-themes.css: link dentro de <head> y DESPUÉS del <style> inline",
    iCssLink > html.lastIndexOf("</style>") && iCssLink > headStart && iCssLink < headEnd,
    `styleEnd=${html.lastIndexOf("</style>")} link=${iCssLink} head=[${headStart},${headEnd}]`);
  ok("theme-toggle.js: script dentro de <head>, síncrono (sin defer/async)",
    iJsScript > headStart && iJsScript < headEnd && /<script src="assets\/theme-toggle\.js"><\/script>/.test(html),
    `script=${iJsScript} head=[${headStart},${headEnd}]`);
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

  const sStart = html.indexOf("function renderCreative");
  const sEnd = html.indexOf("function playCreativeAudio");
  const fn = sStart > -1 && sEnd > sStart ? html.slice(sStart, sEnd) : "";
  const iHead = fn.indexOf('class="creative-reader-head"');
  const iActions = fn.indexOf('class="creative-actions"');
  const iLines = fn.indexOf('class="creative-lines"');
  ok("Biblioteca: acciones ANTES de la lista de lineas",
    fn !== "" && iHead > -1 && iActions > -1 && iLines > -1 && iHead < iActions && iActions < iLines,
    `slice=${fn !== ""} head=${iHead} actions=${iActions} lines=${iLines}`);
}

// ---- 5. lógica del selector ----
ok("theme-toggle.js cicla system -> solar-light -> solar-dark",
  Boolean(js) && /system/.test(js) && /solar-light/.test(js) && /solar-dark/.test(js));
ok("theme-toggle.js persiste en localStorage",
  Boolean(js) && js.includes("localStorage") && js.includes("ed-theme"));

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
ok("existe assets/podcast-series.json (invariante intacto)", Array.isArray(series), "JSON invalido");

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
let loadedFiles = 0;
for (const file of MODULE_FILES) {
  const rows = parseJson(readSafe(file));
  if (!Array.isArray(rows)) continue;
  loadedFiles += 1;
  for (const row of rows) for (const field of CARD_FIELDS) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) cardPool.add(value.trim().toLowerCase());
  }
}
ok("banco de chunks real cargado desde los 10 JSON de tarjetas",
  loadedFiles === MODULE_FILES.length && cardPool.size >= 1000,
  `files=${loadedFiles}/${MODULE_FILES.length} size=${cardPool.size}`);

if (Array.isArray(extras)) {
  ok("extra-stories: esquema completo (title/subtitle/summary/audio/category/lines)",
    extras.every((e) => entryOk(e, 20)), "faltan campos obligatorios o lineas < 20");
  const speakers = new Set(extras.flatMap((e) => (e.lines || []).map((l) => l.speaker)));
  ok("extra-stories: >= 2 voces/personajes distintos", speakers.size >= 2, `speakers=${[...speakers].join(",")}`);
  const outside = extras.flatMap((e) => (e.lines || []))
    .filter((l) => !cardPool.has(String(l.en).trim().toLowerCase())).map((l) => l.en);
  ok("extra-stories: TODOS los chunks existen en el banco de 2250", outside.length === 0,
    "fuera de catalogo: " + outside.slice(0, 3).join(" | "));
  const missingAudio = audioMissing(extras);
  ok("extra-stories: audios presentes en disco", missingAudio.length === 0,
    "faltan: " + missingAudio.join(", "));
  const wrongDir = extras.map((e) => e.audio)
    .filter((p) => typeof p === "string" && !p.startsWith("assets/stories/"));
  ok("extra-stories: audio bajo assets/stories/", wrongDir.length === 0, wrongDir.join(", "));
}
if (Array.isArray(songs)) {
  ok("songs-index: esquema completo (>= 8 lineas)", songs.every((e) => entryOk(e, 8)),
    "faltan campos obligatorios o lineas < 8");
  const missingAudio = audioMissing(songs);
  const wrongDir = songs.map((e) => e.audio)
    .filter((p) => typeof p === "string" && !p.startsWith("assets/songs/"));
  ok("songs-index: audio bajo assets/songs/ y presente", wrongDir.length === 0 && missingAudio.length === 0,
    "mal: " + wrongDir.join(", ") + " | faltan: " + missingAudio.join(", "));
  const stats = songs.map((e) => {
    const lines = e.lines || [];
    const hits = lines.filter((l) => cardPool.has(String(l.en).trim().toLowerCase())).length;
    return lines.length ? hits / lines.length : 0;
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
    iExtra > -1 && /\.catch\(\s*function\s*\(\s*\)\s*\{\s*console\.warn\([^)]*\);\s*\}\s*\)/.test(html.slice(iExtra, iExtra + 700)),
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
    html.includes("contactHeading") && html.includes("personalizedBtn"),
    "faltan ids del panel");
  ok("contacto: solo LinkedIn (fase 6)", html.includes("linkedin.com/in/") &&
    !html.includes("t.me/") && !html.includes("instagram.com/") && !html.includes("wa.me/"),
    "el panel debe exponer solo LinkedIn");
  ok("colaboracion: sin datos de pago internos (LinkedIn es el canal)",
    !html.includes("paypal.me") && !html.includes("Binance Pay") && !html.includes("TU_BINANCE_ID"),
    "quitan datos de pago del panel");
  ok("sin referencias huerfanas (whatsapp/binance js)",
    !html.includes("binanceCopyBtn") && !html.includes("whatsappLink") && !html.includes("WHATSAPP_NUMBER"),
    "quedan referencias a elementos eliminados");
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

  const upIdx = html.indexOf('("sequenceUploadBtn").addEventListener');
  const upSlice = upIdx > -1 ? html.slice(upIdx, upIdx + 500) : "";
  ok("Secuencias: + Agregar abre la grabadora (no el input de archivo)",
    upSlice.includes("sequenceRecorderPanel.hidden = false") && !upSlice.includes("sequenceAudioUpload.click()"),
    "el botón sigue abriendo el archivo");
  ok("Secuencias: la grabadora usa el micrófono y enlaza al flujo de audios propios",
    html.includes('id="sequenceRecorder"') && html.includes('id="sequenceRecordBtn"') &&
    html.includes('id="sequenceRecordUseBtn"') && html.includes("getUserMedia") &&
    html.includes("addCustomAudioFiles([file])"),
    "faltan piezas de la grabadora");
  ok("Secuencias: la grabadora se detiene al navegar",
    html.includes("stopSequenceRecorderSafe()"),
    "sin hook de parada");

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

// ---- 9. Fase 4: música de fondo en exportaciones ----
ok("existe assets/music/index.json", Boolean(readSafe("assets/music/index.json")), "no encontrado");
if (html) {
  ok("selector de música en Secuencias", html.includes('id="sequenceMusicSelect"') &&
    html.includes("Sin música"), "sin selector");
  ok("música: índice opcional", html.includes("assets/music/index.json"),
    "sin carga del índice");
  ok("música: decode + mezcla compartidos", html.includes("function decodeMusicTrack") &&
    html.includes("function mixSequenceMusic"), "sin helpers");
  ok("música: ducking bajo voz", html.includes("mixSequenceMusic") &&
    /0\.16|duck/.test(html), "sin ducking");
  ok("MP3: estéreo cuando hay música", html.includes("Mp3Encoder(2"),
    "sin codificador estéreo");
  ok("MP3: camino mono intacto sin música", html.includes("Mp3Encoder(1"),
    "sin codificador mono");
  ok("MP4: cama mezclada en samples", html.includes("mixSequenceMusic(media") ||
    html.includes("mixSequenceMusic(voice"),
    "sin mezcla en MP4");
  ok("música: fallback sin bloqueo", html.includes("Sin música") &&
    html.includes("sequenceState.musicId"), "sin fallback");
}

// ---- 10. Fase 5: camas + video fiel ----
const musicIndex = parseJson(readSafe("assets/music/index.json"));
ok("music/index: >= 3 pistas", Array.isArray(musicIndex) && musicIndex.length >= 3,
  `entries=${Array.isArray(musicIndex) ? musicIndex.length : "JSON invalido"}`);
if (Array.isArray(musicIndex)) {
  const missingMusic = musicIndex.map((t) => t.file).filter((f) => typeof f !== "string" || !existsSync(resolve(ROOT, f)));
  ok("music/index: audios presentes", missingMusic.length === 0, "faltan: " + missingMusic.join(", "));
  ok("music/index: esquema {id,title,file}", musicIndex.every((t) => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.file === "string"), "esquema inválido");
}
if (html) {
  ok("video fiel: prepara media desde la pieza", html.includes("function preparePieceVideoMedia"),
    "sin preparePieceVideoMedia");
  ok("video fiel: modo pieza en el maker", html.includes("sequenceState.videoPiece"),
    "sin videoPiece");
  ok("video fiel: 🎬 abre el modo pieza", html.includes("openSequenceVideoMaker(current)"),
    "sin apertura por pieza");
}

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

// ---- 12. release: nada de placeholders publicables ----
{
  const leaks = ["TU_USUARIO", "TU_BINANCE_ID", "TU_EMAIL", "TU_DOMINIO", "TU_TOKEN", "example.com"];
  const found = leaks.filter((k) => html.includes(k));
  ok("release: sin placeholders en el HTML publicado", found.length === 0,
    found.length ? "queda: " + found.join(", ") : "todo resuelto");
  const liHref = (html.match(/href="(https:\/\/(?:www\.)?linkedin\.com\/in\/[^"]+)"/) || [])[1] || "";
  ok("release: LinkedIn real y completo", /^https:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]{8,}$/i.test(liHref),
    "href='" + liHref + "'");
  const anchors = html.match(/<a\b[^>]*>/g) || [];
  const blankAnchors = anchors.filter((a) => a.includes('target="_blank"'));
  const unsafeAnchors = blankAnchors.filter((a) => !/rel="[^"]*noopener/.test(a));
  ok("release: enlaces externos con noopener", unsafeAnchors.length === 0,
    unsafeAnchors.length ? unsafeAnchors.length + " sin noopener: " + unsafeAnchors[0] : "anclas=" + blankAnchors.length);

  // AEO: datos estructurados parseables (si no, el AEO muere en silencio)
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ldOk = ld.length > 0;
  let ldTypes = [];
  for (const raw of ld) {
    try {
      const parsed = JSON.parse(raw);
      ldTypes = ldTypes.concat((parsed["@graph"] || [parsed]).map((n) => n["@type"]));
    } catch (e) { ldOk = false; }
  }
  ok("release: JSON-LD parseable", ldOk, ldOk ? "bloques=" + ld.length : "JSON-LD invalido");
  ok("release: AEO con WebApplication + FAQPage + HowTo",
    ldTypes.includes("WebApplication") && ldTypes.includes("FAQPage") && ldTypes.includes("HowTo"),
    "tipos: " + ldTypes.join(","));
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
  ok("release: meta description para AEO", desc.length >= 100 && desc.length <= 320,
    "len=" + desc.length);
  const faqCount = (html.match(/"@type":\s*"Question"/g) || []).length;
  ok("release: >=4 preguntas FAQ para motores de respuesta", faqCount >= 4, "preguntas=" + faqCount);
}

console.log(failed === 0 ? "\nTODO OK (0 fallos)" : `\n${failed} FALLO(S)`);
process.exitCode = failed === 0 ? 0 : 1;
