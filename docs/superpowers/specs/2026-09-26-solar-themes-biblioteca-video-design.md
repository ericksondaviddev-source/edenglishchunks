# Diseño: optimización de "Inglés con Chunks" (temas solar · móvil · Biblioteca · video · música de fondo)

Fecha: 2026-09-26
Estado: aprobado por el usuario (8 secciones)
Repo: `C:\Users\USUARIO\Desktop\English-chunks-ED-serie-local` (sin git)

---

## 1. Contexto

`index.html` (4419 líneas, 238 KB) es una SPA local de aprendizaje de inglés: 450 tarjetas, 9 episodios de podcast (2250 chunks), Quiz, Responde, Pregunta, Secuencias y Biblioteca. Se sirve por HTTP local (`Abrir App.bat` → `python -m http.server`, verificado en sesiones previas).

El usuario quiere **optimizar sin comprometer la app**: cambios de diseño, adaptación móvil y contenido nuevo (historias/canciones), manteniendo intacto todo lo existente.

## 2. Decisiones registradas

| # | Tema | Decisión |
|---|---|---|
| 1 | Temas | **Añadir** a los actuales → 3 modos: `Sistema` (auto, como hoy), `Solar Light`, `Solar Dark` |
| 2 | Selector | **Botón compacto en la barra superior** que cicla los 3 modos con un toque |
| 3 | Contenido | Todo lo actual queda; se **crea** contenido nuevo (historias con diálogos + canciones IA) |
| 4 | Volumen | **Prueba**: 2 historias + 2 canciones; validar calidad antes de escalar |
| 5 | Autoría creativa | El agente **elige** temas/géneros y **presenta el guión/letra para aprobación** antes de generar |
| 6 | Enfoque | **A — todo local en el navegador**, con cambios (ver §3) |
| 7 | Música de fondo | **Solo en las descargas** de Secuencias (MP3 y MP4), con **selector de pista** |
| 8 | Video | **3 diseños nuevos (7 total) + motor de animación compartido**; referencias Apple Keynote / Netflix / diccionario editorial adaptadas a **solar punk** |

### Cambios sobre el Enfoque A (acordados)

- **Canciones**: el agente escribe **las letras**; el usuario las produce por fuera con su IA musical y las deja en `assets/songs/`. El agente integra audio + índice + letra.
- **Video**: mantener el motor del navegador, pero con **más diseños, mejor tipografía, animaciones y subtítulos animados**, todo *elegante*.
- **Música de fondo**: el usuario aporta **instrumentales**; suenan continuas al exportar, para que los chunks no suenen planos.

## 3. Alcance

**In:**
1. Dos temas nuevos (`Solar Light`, `Solar Dark`) + botón ciclador.
2. Botones "▶ Escuchar audio completo" y "Practicar estos chunks" **arriba** en Biblioteca.
3. Adaptación móvil.
4. Contenido nuevo: 2 historias TTS con diálogos + 2 canciones (letra del agente, audio del usuario).
5. Motor de video: 3 diseños nuevos + animaciones compartidas (subtítulos palabra por palabra).
6. Música de fondo continua en exportaciones MP3/MP4 de Secuencias, con selector.
7. Descarga MP3 y creación de MP4 para las piezas de Biblioteca.

**Out (explícito):**
- No se modifica el contenido de los 9 episodios ni `podcast-series.json`.
- No se introduce Remotion/HyperFrames ni ningún pipeline externo.
- No se usan APIs de pago (Suno / ElevenLabs / Udio).
- No se añaden dependencias nuevas a la app en tiempo de ejecución (todo JS/CSS es propio o ya presente).
- No se cambia el lanzador `Abrir App.bat`.

## 4. Diseño por bloque

### 4.1 Temas Solar

**Archivos nuevos**
- `assets/solar-themes.css` — paletas.
- `assets/theme-toggle.js` — botón + persistencia.

**Mecanismo**
- `<html data-theme="system | solar-light | solar-dark">`, defecto `system`.
- `system` = **paleta intacta, sin reglas nuevas de las secciones 1-4** → sólo las secciones 5-6 (chrome del selector y ajustes móviles) aplican en los 3 modos; el aspecto sigue siendo el actual (`:root` + `@media (prefers-color-scheme: dark)`, `index.html:10-46`).
- Ambos `<link>` y `<script>` se insertan **después** del bloque `<style>` en `<head>`: en empate de especificidad gana el archivo externo.
- Persistencia en `localStorage["ed-theme"]`, leída en `theme-toggle.js` antes del primer render (inyectada en `<head>`) para evitar parpadeo.

**Paletas (solar punk)**

| Token | Solar Light | Solar Dark |
|---|---|---|
| `--page` | `#faf5e9` (papel) | `#191510` (carbón cálido) |
| `--surface` | `#fffdf7` | `#221c15` |
| `--surface-2` | `#f4eddd` | `#2a231a` |
| `--ink` | `#2a2318` | `#f2e8d5` |
| `--muted` | `#6b6152` | `#bcb09a` |
| `--line` | `#e2d8c3` | `#3a3226` |
| `--yellow` | `#e9a92c` (sol) | `#f5c04a` |
| `--blue` | `#1f6f63` (verde-azul hoja) | `#6fc7b4` |
| `--blue-soft` | `#e2f0ea` | `#1d3a34` |
| `--green` | `#2f7a4a` | `#79d39b` |
| `--red` | `#b4472f` (terracota) | `#ef8f74` |

Todos los tokens del bloque original se redefinen en ambos temas (incluidos `--navy`, `--yellow-soft`, `--green-soft`, `--shadow`, `color-scheme`).

**Reglas de componentes con color hardcodeado**
Existen 6 reglas condicionadas a `prefers-color-scheme: dark` (`index.html:78, 196, 272, 318, 371, 453`) que dependen del SO, **no** del tema elegido. El CSS externo debe:
- reafirmarlas bajo `[data-theme="solar-dark"]`,
- neutralizarlas bajo `[data-theme="solar-light"]` (incluso si el SO está en oscuro).

Usar selectores con especificidad ≥ `(0,2,0)` (p. ej. `[data-theme="solar-dark"] .mode-tab.active`).

**Botón**
- Añadir `<button id="themeCycleBtn" class="theme-cycle" type="button">` en el topbar (`index.html:549-559`).
- Cicla `system → solar-light → solar-dark → system`; `aria-label` y texto visible con el modo actual (☀︎ Sistema / ☀︎ Solar / ☾ Solar).
- Disposición en móvil: al lado del CTA, no invade la rejilla de pestañas.

**Criterio de aceptación:** contraste AA (≥4.5:1 texto, ≥3:1 texto grande) en ambos temas, verificado; los 3 modos funcionan y persisten tras recargar; sin parpadeo.

### 4.2 Botones de Biblioteca arriba

- Reordenar el `innerHTML` construido en `renderCreative()` (`index.html:4100-4104`):
  `creative-reader-head` → **`creative-actions`** → `ol.creative-lines`.
- Se conservan ids (`creativeListenBtn`, `creativeSequenceBtn`) y todos los listeners (`:4113-4117`).
- En móvil, `.creative-actions` sigue en `grid-template-columns: 1fr` (regla ya existente en `:528`).

**Riesgo:** nulo (mismo DOM, otro orden).

### 4.3 Adaptación móvil

Rehacer `@media (max-width: 590px)` (`index.html:482-543`) y ampliar `860px`:

- **Objetivos táctiles**: mín. 44×44 px en `.mode-tab`, `.module-button`, `.creative-pick`, `.nav-button`, controles de audio.
- **Cabecera**: 6 pestañas + CTA + botón de tema. Propuesta: pestañas en `grid` 3×2 (ya existe), CTA y tema en una fila debajo, tema con ancho fijo.
- **Safe areas**: `padding-bottom: env(safe-area-inset-bottom)` (el `viewport-fit=cover` ya está en `:5`).
- **iOS zoom**: `font-size: 16px` mínimo en `select`, `input`, `textarea`.
- **Barra de audio**: fija arriba (`position: sticky; top: 0`) bajo la cabecera, con sombra para separarla de la lista. Decisión cerrada en la Fase 1: se descartó `bottom: 0` porque exigía desplazamiento de cuerpo y no aportaba; verificado a 360/390/414.
- **Biblioteca**: la lista (`creative-list`) y el leedReader con scroll propio acotado para no crear doble scroll de página.
- **Landscape**: sin reglas agresivas; verificar que `.layout` no rompa.

**Verificación:** DevTools a 360×640, 390×844, 414×896 (portrait/landscape) + Lighthouse (movil) + `prefers-reduced-motion` respetado (regla ya existe, `:544`).

### 4.4 Contenido nuevo

**Historias (2 de prueba)**
1. Guión: el agente elige categorías distintas y escribe diálogos usando chunks reales de los 2250; presenta guión → **aprobación del usuario**.
2. Síntesis: `edge-tts` (`uvx edge-tts`) con **≥2 voces distintas por personaje** (inglés), una llamada por línea.
3. Post: `ffmpeg` → concatenación, silencios entre turnos (0,25-0,45 s), `loudnorm` a −16 LUFS, salida **MP3 44,1 kHz 160 kbps**.
4. Archivo en `assets/stories/` + JSON.

**Canciones (2 de prueba)**
1. El agente escribe **la letra** (chunks integrados, estructura verso/estribillo) → aprobación.
2. El usuario produce el audio con su IA musical → lo deja en `assets/songs/`.
3. El agente integra: audio + índice + `lines` (letra línea a línea, `en`/`es`).

**Esquema de datos** (idéntico al actual, `assets/podcast-series.json`):
```json
{ "title": "...", "subtitle": "...", "summary": "...", "audio": "assets/...",
  "category": "idioms", "lines": [ { "en": "...", "es": "...", "speaker": "..." } ] }
```

**Archivos nuevos y aislamiento**
- `assets/extra-stories.json` → se fusiona con `CREATIVE_COLLECTIONS.stories` **después** de la validación de 9 episodios / 2250 chunks (`index.html:4206-4214`).
- `assets/songs-index.json` → `CREATIVE_COLLECTIONS.songs` (`index.html:982`), que hoy está siempre vacío.

> **Invariant crítico:** nunca editar `assets/podcast-series.json` ni la validación de `:4210`.

**Categorías**: chip de filtro en la lista lateral (Frases nativas · Idioms · Adjetivos · Sustantivos · Palabras clave). Campo `category` opcional; sin él → "Sin categoría".

**Textos derivados**: el titular y el hint del panel (`creativeLibraryTitle` / `creativeLibraryHint`, fijos hoy en `index.html:4084-4085` y `:879`) deben calcularse con el total real de piezas cargadas (p. ej. "9 episodios + 2 historias"), no quedar en "9 episodios · 2250 chunks" cuando haya contenido nuevo.

### 4.5 Video: 7 diseños + motor de animación

**Motor compartido** (nuevo, una sola implementación):
- El render actual ya es una **función pura del tiempo** (`drawSequenceVideoFrame(canvas, media, time, theme)`, `index.html:3688`) → la animación se deriva de `t`, garantizando sincronía y reproducibilidad.
- **Subtítulos palabra por palabra**: duración de cada línea = su clip; dentro de la línea, cada palabra recibe un tramo proporcional a su longitud ponderada (con `time` conocido por línea). La palabra activa se resalta (color + escala); la línea entra con *fade + rise* y sale con *fade*.
- **Fondo en movimiento lento**: deriva de gradiente + partículas sutiles (hojas/luz), `t`-driven, sin assets.
- **Tipografía**: escala display/título/cuerpo/pie consistente; `letter-spacing` y peso ajustados por diseño.
- **Barra de progreso** inferior (fracción `t / duration`).
- **Transiciones** entre líneas: solape corto (≈120 ms) con curva `easeOutCubic`.

**3 diseños nuevos** (paleta solarpunk):

| Id | Referencia | Descripción |
|---|---|---|
| `keynote` | Apple Keynote | Tipografía display enorme, mucho aire, revelado palabra por palabra, fondo cálido con degradado suave |
| `netflix` | Netflix | Oscuro cinematográfico, mayúsculas bold, tarjeta de título de apertura, viñeta, letterbox |
| `diccionario` | Diccionario editorial | Papel, la chunk como *entrada* (headword + glosa + ejemplo), columna con numeración |

- Los 4 actuales (`solar`, `noche`, `editorial`, `pulso`, `index.html:3334-3340`) se **reeskinean** a la paleta solarpunk y heredan el motor de animación.
- Swatches nuevos en `index.html:837-840` + CSS de `.sequence-design-swatch`.

**Controles nuevos**: resolución (720×1280 / 1080×1920), bitrate y fps — los MP4 actuales llegan a **419 MB** (`mi-secuencia-chunks-solar.mp4`), hay que poder limitarlos.

**Compatibilidad**: se conserva el mensaje de error de codec no soportado (`index.html:4044-4047`).

### 4.6 Música de fondo en exportaciones

**Alcance**: solo Secuencias, solo exportaciones (acordado en Q7-A).

**Selector**: `<select>` en la toolbar de Secuencias con `Sin música` + pistas listadas en **`assets/music/index.json`** (`[{ "id", "title", "file" }]`). El usuario deja los MP3 en `assets/music/`.

**Exportación MP3** (`exportSequenceMp3`, `index.html:3285-3327`):
1. Construir la pista de voz completa como `Float32Array` (concatenación de clips + silencios, tal como hoy, pero sin codificar aún).
2. Decodificar la pista musical, **buclearla** hasta la duración total, con fade-in 1 s y fade-out final 2 s.
3. Mezclar: música a ganancia ≈0.30 con **ducking** ligero bajo voz (ganancia baja ≈0.16 mientras la envolvente de voz supera umbral, ataque ≈80 ms, liberación ≈250 ms).
4. Codificar con `lamejs` (`assets/lamejs.iife.min.js`) en **estéreo** cuando haya música (hoy es mono, `:3298`); sin música se mantiene el comportamiento actual.

**Exportación MP4**: añadir la fuente de música (bucleada + ganancia) al grafo del `AudioContext` que alimenta la grabación (`index.html:3974-3984`).

**Fallback**: pista no encontrada / error de decodificación → exportar **sin música** y avisar; nunca bloquear la exportación.

### 4.7 Descargas en Biblioteca

En `.creative-actions` (ya arriba, §4.2) se añaden:
- **`⬇ MP3`**: enlace `<a download>` directo al archivo `entry.audio` (es local, no hace falta blob).
- **`🎬 Crear MP4`**: abre el flujo de video existente con `lines` de la pieza y el motor de §4.5.

## 5. Estructura de archivos resultante

```
English-chunks-ED-serie-local/
├── index.html               (editado, con respaldo index.backup-2026-09-26.html)
├── Abrir App.bat            (sin cambios)
├── assets/
│   ├── solar-themes.css     (nuevo)
│   ├── theme-toggle.js      (nuevo)
│   ├── extra-stories.json   (nuevo)
│   ├── songs-index.json     (nuevo)
│   ├── stories/*.mp3        (nuevos, 2 historias)
│   ├── songs/*.mp3          (del usuario)
│   └── music/*.mp3          (instrumentales del usuario) + index.json (nuevo)
└── docs/superpowers/specs/  (este documento)
```

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper la validación 9/2250 (`:4210`) | Cargar contenido nuevo **después** de la validación; no editar `podcast-series.json` |
| Regresión visual por CSS externo | `data-theme="system"` no aplica nada; respaldo de `index.html`; revisión visual de las 6 secciones |
| Reglas `prefers-color-scheme` en conflicto | Selectores con especificidad ≥(0,2,0) en archivo cargado después |
| Export MP3 con música rompe el encoder actual | Mantener el camino actual intacto cuando `Sin música`; probar ambos |
| MP4 gigantes | Controles de resolución/bitrate; probar con secuencias cortas |
| `edge-tts` requiere internet | Avisar; fallback: reintentar, sin bloquear la app |
| WebCodecs/MediaRecorder sin MP4 | Mensaje de error ya existente; probar en Chrome/Edge |
| Autoaprobación de guiones sin revisión | Presentar guiones/letras y **esperar aprobación** antes de generar |

## 7. Criterios de aceptación

1. Los 9 episodios / 2250 chunks, las 450 tarjetas, Quiz y Secuencias funcionan **idéntico** a antes.
2. Los 3 modos de tema cambian todo correctamente, persisten y no producen parpadeo.
3. Los botones de Biblioteca aparecen **arriba** del listado de líneas.
4. La app es usable a 360 px sin scroll horizontal, con targets ≥44 px y sin zoom automático en iOS.
5. 2 historias nuevas y 2 canciones aparecen en Biblioteca, se escuchan y se descargan en MP3.
6. Los 7 diseños de video renderizan con subtítulos sincronizados palabra por palabra y controles de calidad.
7. Exportar MP3/MP4 con música seleccionada incluye la cama continua; con `Sin música` el resultado es el de siempre.
8. Consola del navegador **sin errores** en toda la batería de pruebas.

## 8. Fases de ejecución

| Fase | Contenido | Resultado |
|---|---|---|
| 1 | §4.1 + §4.2 + §4.3 | UI visible de inmediato |
| 2 | §4.4 (2 historias + letras de 2 canciones) | Contenido de prueba |
| 3 | §4.5 + §4.7 | Video y descargas |
| 4 | §4.6 | Música de fondo |
| 5 | §7 verificación completa | Cierre |

## 9. Entradas pendientes del usuario

- **Instrumentales** → `assets/music/` (+ se genera `index.json`).
- **Canciones producidas** → `assets/songs/`.
- **Aprobación** de los guiones de las 2 historias y de las letras de las 2 canciones.
