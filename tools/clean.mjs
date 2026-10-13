// tools/clean.mjs — limpieza segura de artefactos locales.
// Borra SOLO archivos no trackeados por git y regenerables.
// Uso: npm run clean
import { rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const removed = [];

function remove(rel) {
  const abs = join(root, rel);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    removed.push(rel);
  }
}

// 1. Snapshots de index.html (copias de seguridad históricas; el historial git conserva todo)
for (const f of readdirSync(root)) {
  if (/^index\.(pre|post|backup)-.*\.html$/.test(f)) remove(f);
}

// 2. Artefactos de Python
remove("tools/__pycache__");

// 3. Artefactos de prueba trackeados por error (no referenciados por la app)
remove("assets/videos/hero/frame-test.png");

// 4. Cachés regenerables de builds (ya en .gitignore)
remove("assets/stories/.build");
remove("assets/songs/.align");

if (removed.length === 0) {
  console.log("clean: nada que limpiar.");
} else {
  for (const r of removed) console.log("clean: eliminado " + r);
  console.log(`clean: ${removed.length} elemento(s) eliminado(s).`);
}
