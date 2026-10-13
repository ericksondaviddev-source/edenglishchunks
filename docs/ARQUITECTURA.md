# Arquitectura — Inglés con Chunks

> Documento vivo. Última revisión: 2026-10-13.

## Visión general

Webapp **estática** (sin build, sin backend) sirvida desde Vercel.
Punto de entrada único: `index.html`.

```
index.html            HTML + CSS inline + JS de la app (monolito deliberado)
manifest.webmanifest  PWA: instalable en móvil/escritorio
assets/
  solar-themes.css    Temas Solar Light / Dark (cargado después del <style> inline)
  theme-toggle.js     Ciclo sistema → solar-light → solar-dark (síncrono en <head>)
  *.json              Datos de contenido (14 ficheros, ~692 KB en total)
  audio/              450 MP3 de las tarjetas
  podcasts/           9 episodios de la serie
  songs/              21 canciones + timings
  stories/            Historias narradas + timings
  videos/hero/        16 MP4 pre-renderizados (360×640@15fps) para "Crear MP4"
  icons/              Iconos PWA (192/512/maskable/apple-touch)
  voice/              Whisper en el navegador (carga lazy, opcional)
  mp4-muxer.js, lamejs.iife.min.js   Librerías cargadas bajo demanda
brand/                Material gráfico para redes (NO se usa en runtime)
tools/                Scripts de verificación y build (Node ≥18, sin dependencias)
docs/                 Documentación y planes de trabajo
.github/workflows/    CI: check-ui en cada push
```

## Principios de diseño

1. **Sin build step.** Todo se sirve tal cual; `index.html` es la app completa.
   Esto permite abrir una copia local con `npm run dev` (o `Abrir App.bat`) y
   desplegar simplemente subiendo archivos.
2. **Cero dependencias externas en runtime.** Ni CDNs ni fuentes de terceros.
   Las librerías pesadas (`lamejs`, `mp4-muxer`, `transformers`) se cargan
   solo cuando se usan.
3. **Contenido separado de mecánica.** El contenido vive en JSON bajo
   `assets/`; la lógica nunca debe incrustar frases sueltas.
4. **Verificación antes que confianza.** `npm test` valida 136 invariantes.

## Invariantes críticos (NO romper)

Validados por `tools/check-ui.mjs` (136 checks) y por CI en cada push:

- `assets/podcast-series.json`: **9 episodios / 2250 chunks** exactos.
- `theme-toggle.js` debe ir **síncrono** dentro de `<head>` (sin defer/async).
- `index.html` debe conservar **exactamente 7 bloques** `prefers-color-scheme: dark`.
- La validación 9/2250 debe ejecutarse **antes** de fusionar
  `extra-stories.json` y `songs-index.json`.
- Contacto = **solo LinkedIn**; enlaces externos con `rel="noopener"`.
- `assets/solar-themes.css` se enlaza **después** del `<style>` inline.

## Rendimiento medido (2026-10-13, local)

| Métrica | Valor |
|---|---|
| domInteractive | ~100 ms |
| Requests de arranque | 6 (316 KB) |
| JSON de contenido | 15 fetch / ~692 KB, todos en paralelo (`Promise.all`) |

El JS principal (226 KB) está **al final del `<body>`**, ya parseado el DOM.
Por eso **no se extrajo a fichero aparte**: se midió y el arranque es
satisfactorio; partirlo rompería los checks de `check-ui.mjs` sin beneficio
apreciable. Si algún día se hace, debe ser una migración propia con
actualización sincronizada de los checks y regresión completa en navegador.

## Flujo de trabajo

```bash
npm test     # 136 checks de UI/contenido (también corre en CI)
npm run dev  # servidor local en http://127.0.0.1:8765
npm run clean# elimina snapshots, caches y artefactos (solo no trackeados)
```

- **Commits atómicos**: un cambio = un commit con mensaje convencional.
- **CI** (`.github/workflows/ci.yml`): ejecuta `npm test` en todo push a `main`.
- **Deploy**: Vercel despliega automáticamente al hacer push a `main`
  (producción: https://edenglishchunks.vercel.app).

## Repositorio

- Historial empaquetado con `git gc` (~295 MB, dominado por los MP4 de
  `assets/videos/hero/` y `assets/voice/`). Si crece más, valorar Git LFS.
- `.gitignore` excluye: `node_modules`, snapshots de `index.*.html`,
  `.build/`, `.align/`, `.belt/`, `.vercel/`.

## Roadmap de mejoras (pendientes, por prioridad)

1. **Service worker offline** (la app es de práctica diaria; el contenido
   JSON+MP3 se podría cachear para uso sin conexión).
2. **Modularización del JS** (extraer a `assets/app.js` + actualizar checks)
   cuando haya tests de regresión en navegador automatizados.
3. **Contenido estático para SEO**: versión sin JS de la FAQ ya existe en
   el JSON-LD; valorar prerender de listados.
4. **Marketing**: bios, guiones de RRSS (`docs/rrss-videos.md`,
   `docs/contenido-redes.md`) y versiones en inglés.
