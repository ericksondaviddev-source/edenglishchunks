import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

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
const usable = (p) => { try { return statSync(p).size > 0; } catch { return false; } };

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

function build(script) {
  const buildDir = join(STORIES, ".build", script.slug);
  mkdirSync(buildDir, { recursive: true });
  const gap = join(buildDir, "gap.wav");
  if (!usable(gap)) {
    run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(GAP), gap]);
  }
  const files = [];
  script.lines.forEach((line, i) => {
    const n = String(i + 1).padStart(3, "0");
    const voice = script.voices[line.speaker];
    const fp = createHash("sha1").update(voice + "|" + line.en).digest("hex").slice(0, 10);
    const segMp3 = join(buildDir, n + "-" + fp + ".mp3");
    const segWav = join(buildDir, n + "-" + fp + ".wav");
    if (!usable(segMp3)) {
      run("uvx", ["edge-tts", "--voice", voice, "--text", line.en, "--write-media", segMp3]);
    }
    if (!usable(segWav)) {
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
  for (const file of scripts) {
    const j = json(join(STORIES, file));
    if (!j.slug || !j.title || !Array.isArray(j.lines)) throw new Error("script.json incompleto: " + file);
  }
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
  build(script);
}
writeIndex();
