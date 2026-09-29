Inglés con Chunks - copia local (26 sept 2026)
==============================================
Esta es la versión publicada con la serie de 9 podcasts.

Para abrirla: doble clic en "Abrir App.bat".
  - Arranca un servidor local con Python y abre la app en tu navegador.
  - Para cerrar la app: cierra la ventana de la consola.
    El servidor se apaga junto con ella (no queda nada corriendo).
  - Requisito: tener Python instalado (https://www.python.org/downloads/).

Por qué no basta el doble clic en index.html:
  index.html carga sus datos (assets/*.json) con fetch(), y los navegadores
  bloquean fetch() cuando el archivo se abre con file:// (protocolo local).
  Verás el mensaje "No pudimos cargar la biblioteca" con "Failed to fetch".
  Con el servidor local todo se sirve por http://127.0.0.1 y la app carga completa.

Estructura:
- Abrir App.bat ....... lanzador (servidor local + abre el navegador)
- index.html .......... la app completa
- assets/audio/ ....... 450 MP3 de las tarjetas (comprimidos)
- assets/podcasts/ .... 9 episodios de la serie (comprimidos)
- assets/voice/ ....... audios de voz
- assets/stories/ ..... historias anteriores
- icon.jpg ............ ícono

Temas visuales y verificación (Fase 1):
- Botón de tema en la barra superior: alterna Sistema / Solar Light / Solar Dark
  (el botón muestra "☀︎ Sistema", "☀︎ Solar" y "☾ Solar"). La elección se guarda
  en el navegador y persiste al recargar la página.
- assets/solar-themes.css . paletas de los dos temas Solar.
- assets/theme-toggle.js .. lógica del botón y la persistencia.
  No los edites a mano salvo que sepas lo que haces: en el modo "Sistema" la app
  conserva su aspecto original (sólo las secciones 5-6 del CSS, el chrome del
  botón y los ajustes móviles, aplican en los 3 modos).
- tools/check-ui.mjs ...... validación de la UI, sin dependencias (Node >= 18).
  Ejecútala antes y después de cualquier cambio de interfaz:
      node tools\check-ui.mjs
  Tiene que imprimir "TODO OK (0 fallos)" y salir con código 0.
- Respaldos fechados de index.html: index.backup-2026-09-26.html (original) y
  index.pre-edit-A.html / index.pre-edit-B.html / index.pre-edit-C.html
  (instantáneas tomadas antes de cada edición de la Fase 1).

Serie de podcasts (Biblioteca):
1. Frases nativas I        6. Adjetivos II
2. Frases nativas II       7. Sustantivos I
3. Idioms I                8. Sustantivos II
4. Idioms II               9. Palabras clave y Contracciones
5. Adjetivos I

Los 2250 chunks están cubiertos entre los 9 episodios.

Contenido nuevo (Fase 2, 26 sept 2026):
- assets/stories/*.script.json ... guiones aprobados de 2 historias (fuente de verdad).
- tools/build-stories.mjs ......... edge-tts por línea + ffmpeg (silencios 0.30s,
  loudnorm -16 LUFS, MP3 44.1 kHz 160 kbps) -> assets/stories/<slug>.mp3.
  Regenerable: borra assets/stories/.build y los MP3 y vuelve a ejecutarlo.
- assets/extra-stories.json ....... índice de las 2 historias (derivado de los
  guiones); se fusiona con la Biblioteca DESPUÉS de la validación 9/2250.
- assets/songs-index.json ......... índice de las 21 canciones (7 canciones con
  varias versiones cada una), derivado de assets/songs/*.letra.md por
  tools/build-songs-index.mjs. Se carga después de la validación; si falta,
  no rompe la app.
- Biblioteca ahora muestra 32 piezas (9 podcasts + 2 historias + 21 canciones)
  con chips de filtro de categoría (Todas/Frases nativas/Idioms/...) y el
  titular calculado con los totales reales.
- NUNCA editar assets/podcast-series.json ni su validación en index.html.

Marca y contactos (Fase 2.5, 27 sept 2026):
- assets/favicon.svg .............. favicon tricolor (3 barras + estrella).
- Logo SVG + "ED-Dev" en el topbar + acento tricolor (.topbar-flag) en los 3 temas.
- Tema por defecto: solar-light (primera visita sin elección guardada).
- Selector de diseño de video en la toolbar de Secuencias (fuera del modal).
- Panel de contacto (#contactPanel, botón "Quiero mi app personalizada"):
  Telegram / Instagram / LinkedIn / WhatsApp + Colaborar (PayPal / Binance Pay).
- PENDIENTE: rellenar los placeholders TU_USUARIO / TU_BINANCE_ID en index.html
  antes de subir a GitHub/Vercel.
- FIX grabadora (27 sept 2026): "+ Agregar audio propio" abre una grabadora de voz
  (Grabar/Escuchar/Usar) en vez del selector de archivos; la grabación entra al
  flujo de audios propios existente ("Elegir archivo" sigue disponible).
- Respaldos Fase 2: index.pre-fase2.html · Fase 2.5: index.pre-fase25.html y
  index.post-fase25.html · Fase 3: index.pre-fase3.html e index.post-fase3.html.

Video y descargas (Fase 3, 27 sept 2026):
- 7 diseños de video (Solar, Noche, Editorial, Pulso + Keynote, Netflix,
  Diccionario) con swatches en la toolbar de Secuencias.
- Motor compartido: subtítulos palabra por palabra (la palabra activa se
  resalta con color y escala), fondo ambiente en movimiento y transición de
  120 ms entre líneas. Los 4 diseños actuales conservan su identidad.
- Controles de calidad en el modal: resolución (720x1280 / 1080x1920),
  bitrate (2.4/4/8 Mbps) y fps (24/30). El canvas vuelve a 720x1280 tras
  exportar; la vista previa no cambia.
- Biblioteca: cada pieza tiene ⬇ MP3 (descarga directa) y 🎬 Crear MP4
  (abre el creador con el AUDIO PROPIO de la pieza desde Fase 5).
- Respaldos Fase 3: index.pre-fase3.html e index.post-fase3.html.

Música de fondo (Fase 4, 27 sept 2026):
- Selector "Música de fondo" en la toolbar de Secuencias (Sin música por
  defecto + pistas de assets/music/index.json). Deja tus instrumentales MP3
  en assets/music/ y añádelos al index como {"id","title","file"}.
- MP3: cama bucleada con fade-in 1 s / fade-out 2 s + ducking bajo la voz
  (0.30 normal, 0.16 bajo voz); salida ESTÉREO 192k con música, MONO 128k
  como siempre sin música. Si la pista falla, exporta sin ella (sin bloquear).
- MP4: la misma cama se mezcla en el audio (cubre WebCodecs y Recorder).
- PENDIENTE: instrumentales del usuario en assets/music/.
- Respaldos Fase 4: index.pre-fase4.html e index.post-fase4.html.

Camas musicales + video fiel (Fase 5, 27 sept 2026):
- tools/build-music-beds.py .... genera 3 camas ambientales (Amanecer / Noche /
  Pulso, 60 s en loop, -20 LUFS) con numpy + ffmpeg. Regenerable.
- assets/music/{amanecer,noche,pulso}.mp3 ya listadas en assets/music/index.json;
  el selector de Fase 4 las activa sin más cambios.
- Video fiel por pieza: el botón 🎬 de cada pieza de Biblioteca abre el creador
  con el AUDIO PROPIO de la pieza (no clips) + timing proporcional por línea +
  motor 2D y controles de calidad. La secuencia del usuario queda intacta.
- FIX grabadora 2 (27 sept 2026): las variables de la grabadora se declaraban
  después de usarse (ReferenceError que tumbaba la carga); movidas antes del
  wiring. Verificado en Chromium sin errores.
- Respaldos Fase 5: index.pre-fase5.html e index.post-fase5.html.

Sincronización real + diseño especial (Fase 6, 28 sept 2026):
- Historias: timings EXACTOS desde los segmentos TTS (tools/build-story-timings.mjs
  -> assets/stories/<slug>.timing.json, [{start,end}] en segundos de audio).
- Canciones: timings por alineación con faster-whisper (tools/transcribe-songs.py
  + tools/align-song-timings.py -> assets/songs/<base>.timing.json, 21 archivos,
  cobertura media 85%; micro-solapes residuales <=0.05 s, invisibles).
- El video de cada pieza usa su timing si existe (<audio>.timing.json junto al
  MP3) y si no, el reparto proporcional de antes. Sin timing válido no se rompe
  nada.
- Nuevo diseño "Escenario" (sing-along con línea siguiente tenue), auto-
  seleccionado al abrir video desde Biblioteca (cambiable con los swatches).
  La línea siguiente va bajo la traducción y el tema omite el ecualizador de
  audio para no superponerse con ella.
- Respaldos Fase 6: index.pre-fase6.html e index.post-fase6.html.

Cierre de Fase 6 - panel de contacto (28 sept 2026):
- El panel expone SOLO LinkedIn. Se retiraron Telegram, Instagram, WhatsApp,
  PayPal y Binance Pay por decision del autor: LinkedIn es a la vez via de
  contacto y portafolio, y evita exponer datos de pago publicamente.
- LinkedIn real: https://www.linkedin.com/in/erickson-david-s-m-647253411
- Sin datos de pago internos, sin codigo huerfano de WhatsApp/Binance.
- Canales de contenido (YouTube / TikTok / Instagram) son externos: el video
  que exporta la app ya es 9:16 vertical (720x1280), el formato nativo de
  Shorts, Reels y TikTok, asi que el contenido se produce desde la app.

Revision previa al despliegue (28 sept 2026):
- check-ui.mjs gana seccion 12 "release": falla si queda cualquier placeholder
  (TU_USUARIO, TU_BINANCE_ID, example.com...), si el LinkedIn no es una URL
  real, o si un target="_blank" se queda sin rel="noopener".
- Auditoria de medios: 9 episodios (2250 chunks) + 2 historias + 21 canciones.
  31 referencias de audio, 0 ficheros ausentes.
- .gitignore creado antes del primer commit: excluye snapshots (index.pre-*,
  index.post-*, index.backup-*, index.pre-edit-*), cachos (.build, .align) y
  los MP4/MP3 de prueba generados al verificar el export de video.
- Peso real a publicar: 171,7 MB en 580 ficheros (audio del producto + 37 MB
  de runtime de transformers.js para la transcripcion de voz).
- Nota: los .wasm -threaded (18 MB) solo se usan con cabeceras COOP/COEP; si
  en Vercel no se activan, se pueden excluir para adelgazar el despliegue.
Firma: ED-Dev

Publicacion en GitHub y Vercel (28 sept 2026):
- Repo publico: https://github.com/ericksondaviddev-source/edenglishchunks
- Produccion: https://edenglishchunks.vercel.app
- check-ui.mjs suma 4 comprobaciones mas: canonical y JSON-LD deben apuntar al
  mismo origen, y og:image + twitter:image deben existir con 1200x630.
- assets/og-image.png: tarjeta social 1200x630 generada con
  tools/make-og-image.py (Pillow). Sin ella, el link se comparte sin imagen en
  LinkedIn, WhatsApp y Slack.
- El commit inicial se troceo en 7 commits por peso: la subida de esta red es de
  unos 65 KB/s y el push unico de 171 MB se agotaba a los 40 minutos.
  El repo pesa 171,7 MB: 131,7 MB de MP3 (450 chunks, 9 episodios, 21
  canciones, 2 historias) y 36,6 MB de binarios wasm de transformers.js.
- Pendiente: .wasm -threaded (18 MB) solo se usan con cabeceras COOP/COEP; si
  en Vercel no se activan, se pueden excluir para adelgazar el despliegue.
Firma: ED-Dev
