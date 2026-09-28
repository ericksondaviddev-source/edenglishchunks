import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SONGS = {
  "sunrise-city": { title: "Sunrise City", mood: "Pop electrónico solarpunk, esperanzador" },
  "market-day": { title: "Market Day", mood: "Latin urbano, juguetón" },
  "golden-hour-drive": { title: "Golden Hour Drive", mood: "Synthwave cinematográfico" },
  "common-ground": { title: "Common Ground", mood: "Indie folk cálido" },
  "talk-fast": { title: "Talk Fast", mood: "Hip-hop ligero, spoken flow" },
  "work-it-out": { title: "Work It Out", mood: "Pop funk enérgico" },
  "big-picture": { title: "Big Picture", mood: "Pop anthemic, épico" }
};

const FILES = [
  ["sunrise-city", "Versión original", "Sunrise City Chunks.mp3"],
  ["sunrise-city", "Versión 2", "Sunrise City Chunks 2.mp3"],
  ["sunrise-city", "Tropical House", "6. Sunrise City - Tropical House.mp3"],
  ["market-day", "Versión original", "Market Day Chunks.mp3"],
  ["market-day", "Versión 2", "Market Day Chunks 2.mp3"],
  ["market-day", "Folk Pop", "5. Market Day - Folk Pop.mp3"],
  ["golden-hour-drive", "Versión original", "Golden Hour Chunks.mp3"],
  ["golden-hour-drive", "Versión 2", "Golden Hour Chunks 2.mp3"],
  ["golden-hour-drive", "Synthwave", "4. Golden Hour - Synthwave.mp3"],
  ["common-ground", "R&B Soul", "3. Evening Chunks - R&B Soul.mp3"],
  ["common-ground", "Danceable", "Evening Chunks Danceable.mp3"],
  ["common-ground", "Danceable 2", "Evening Chunks Danceable 2.mp3"],
  ["talk-fast", "Nu-Disco", "7. Connected Speech - Nu-Disco.mp3"],
  ["talk-fast", "Versión original", "Connected Speech Chunks.mp3"],
  ["talk-fast", "Versión 2", "Connected Speech Chunks 2.mp3"],
  ["work-it-out", "Versión original", "Progress Chunks.mp3"],
  ["work-it-out", "Versión 2", "Progress Chunks 2.mp3"],
  ["big-picture", "Bossa Nova", "1. Startup Chunks - Bossa Nova.mp3"],
  ["big-picture", "Latin Pop", "2. Startup Bilingual - Latin Pop.mp3"],
  ["big-picture", "Balada", "Startup Chunks Ballad.mp3"],
  ["big-picture", "Balada 2", "Startup Chunks Ballad 2.mp3"]
];

function parseLetra(slug) {
  const raw = readFileSync(join(ROOT, "assets", "songs", slug + ".letra.md"), "utf8");
  const start = raw.indexOf("## Índice");
  if (start < 0) throw new Error("Sin sección Índice: " + slug);
  const lines = [];
  for (const match of raw.slice(start).matchAll(/^- \[(.+?)\] (.+?) — (.+?) ← (C|F)\s*$/gm)) {
    lines.push({ en: match[2].trim(), es: match[3].trim(), speaker: match[1].trim() });
  }
  if (!lines.length) throw new Error("Índice vacío: " + slug);
  return lines;
}

const entries = FILES.map(function(pair) {
  const slug = pair[0], version = pair[1], file = pair[2];
  const song = SONGS[slug];
  if (!song) throw new Error("slug desconocido: " + slug);
  return {
    title: song.title + " · " + version,
    subtitle: "Canción · " + version,
    summary: song.mood + " · letra en inglés con chunks integrados.",
    category: "canciones",
    audio: "assets/songs/" + file,
    lines: parseLetra(slug)
  };
});

writeFileSync(join(ROOT, "assets", "songs-index.json"), JSON.stringify(entries, null, 2) + "\n", "utf8");
console.log("assets/songs-index.json -> " + entries.length + " canciones");
