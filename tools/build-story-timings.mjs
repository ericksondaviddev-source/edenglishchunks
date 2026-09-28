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
