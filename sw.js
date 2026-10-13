/* sw.js — Service worker de "Inglés con Chunks"
 * Offline: la app de práctica diaria funciona sin conexión tras una visita previa.
 * Estrategias:
 *   - Navegaciones: network-first (online = siempre la última versión) → fallback index.html.
 *   - JSON de contenido: stale-while-revalidate (rápido y fresco; offline sirve caché).
 *   - Estáticos (css/js/iconos): cache-first.
 *   - Media (mp3/mp4): cache-first bajo demanda, con soporte Range (206) y tope de cuota.
 *   - Cross-origin (p. ej. modelos de Hugging Face): sin interceptar.
 * Sin skipWaiting: la versión nueva se activa en la siguiente visita (sin recargas forzadas).
 * Invariantes vigiladas por tools/check-ui.mjs: precache de los 15 JSON,
 * NUNCA precachear mp3/mp4/wasm en install.
 */
"use strict";

const VERSION = "v1";
const SHELL_CACHE = "shell-" + VERSION;
const DATA_CACHE = "data-" + VERSION;
const MEDIA_CACHE = "media-" + VERSION;
const CURRENT_CACHES = [SHELL_CACHE, DATA_CACHE, MEDIA_CACHE];

const MEDIA_MAX_ENTRIES = 30; // ~tope de 250 MB según tamaños reales (2,8–14 MB por fichero)

// Shell mínimo: app + tema + iconos (sin binarios pesados)
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/solar-themes.css",
  "./assets/theme-toggle.js",
  "./assets/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];

// Los 15 JSON que la app carga al arrancar (≈691 KB): sin ellos no hay práctica offline
const DATA_ASSETS = [
  "assets/offsets.json",
  "assets/podcast-series.json",
  "assets/extra-stories.json",
  "assets/songs-index.json",
  "assets/music/index.json",
  "assets/Ingles-Frases-Nativas-1.json",
  "assets/Idioms-1.json",
  "assets/Idioms-2.json",
  "assets/Idioms-3.json",
  "assets/Idioms-4.json",
  "assets/Idioms-5.json",
  "assets/palabras_clave_esenciales.json",
  "assets/100_adjetivos_y_sustantivos_m_s_usados.json",
  "assets/palabras_sustantivas-comunes_m_s_usadas.json",
  "assets/contracciones_informales.json"
];

const MEDIA_EXT = ["mp3", "mp4", "m4a", "wav", "ogg", "webm", "m4v"];
const STATIC_EXT = ["css", "js", "png", "jpg", "jpeg", "svg", "webmanifest", "ico", "txt", "md"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(function (cache) {
        return cache.addAll(SHELL_ASSETS);
      }),
      caches.open(DATA_CACHE).then(function (cache) {
        return cache.addAll(DATA_ASSETS);
      })
    ])
  );
  // sin salto de activación: la nueva versión espera a la siguiente visita
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return CURRENT_CACHES.indexOf(key) === -1; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function offline503() {
  return new Response("Sin conexión", {
    status: 503,
    statusText: "Sin conexión",
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

// ---- Navegaciones: network-first con fallback al shell ----
async function handleNavigate(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(SHELL_CACHE).then(function (cache) { return cache.put("./index.html", copy); });
    }
    return res;
  } catch (e) {
    const cached = (await caches.match("./index.html")) || (await caches.match("./"));
    return cached || offline503();
  }
}

// ---- JSON: stale-while-revalidate ----
async function handleData(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then(function (res) {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(DATA_CACHE).then(function (cache) { return cache.put(request, copy); });
      }
      return res;
    })
    .catch(function () { return null; });
  if (cached) return cached; // sirve ya y refresca en segundo plano
  const fresh = await refresh;
  return fresh && fresh.ok ? fresh : offline503();
}

// ---- Estáticos: cache-first ----
async function handleStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(SHELL_CACHE).then(function (cache) { return cache.put(request, copy); });
  }
  return res;
}

// ---- Media: cache-first + Range + cuota ----
function sliceRange(response, rangeHeader) {
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m) return Promise.resolve(response);
  return response.arrayBuffer().then(function (buf) {
    const total = buf.byteLength;
    let start, end;
    if (m[1] === "") {
      // sufijo: bytes=-N
      const n = parseInt(m[2], 10);
      if (!n) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
      start = Math.max(total - n, 0);
      end = total - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === "" ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
    }
    if (isNaN(start) || start >= total || end < start) {
      return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
    }
    const sliced = buf.slice(start, end + 1);
    return new Response(sliced, {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
        "Content-Range": "bytes " + start + "-" + end + "/" + total,
        "Content-Length": String(sliced.byteLength),
        "Accept-Ranges": "bytes"
      }
    });
  });
}

async function putMedia(cache, key, response) {
  try {
    await cache.put(key, response);
  } catch (e) {
    // Cuota llena: purga los entrados más antiguos y reintenta una vez
    try {
      const keys = await cache.keys();
      if (keys.length > 0) {
        await cache.delete(keys[0]);
        await cache.put(key, response);
      }
    } catch (e2) { /* mejor sin caché que sin audio */ }
  }
  // Tope de entradas (los ficheros pesan 2,8–14 MB)
  try {
    const keys = await cache.keys();
    while (keys.length > MEDIA_MAX_ENTRIES) {
      await cache.delete(keys.shift());
    }
  } catch (e3) { /* no crítico */ }
}

async function handleMedia(request, event) {
  const cache = await caches.open(MEDIA_CACHE);
  const range = request.headers.get("range");
  const cached = await cache.match(request);
  if (cached) {
    return range ? sliceRange(cached, range) : cached;
  }
  // Sin caché: pide el fichero completo (sin Range) para poder guardarlo entero
  try {
    const headers = new Headers();
    headers.set("Accept", request.headers.get("accept") || "*/*");
    const res = await fetch(request, { headers: headers });
    if (res && res.ok) {
      const copy = res.clone();
      event.waitUntil(putMedia(cache, request, copy));
      // Respondemos 200 con el cuerpo completo: el <audio> lo acepta aunque pidió Range
      return res;
    }
    return res;
  } catch (e) {
    // Sin red y sin caché: respuesta controlada (la app muestra su propio estado)
    return offline503();
  }
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // cross-origin: sin interceptar

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }
  const path = url.pathname.toLowerCase();
  const ext = path.indexOf(".") === -1 ? "" : path.slice(path.lastIndexOf(".") + 1);
  if (ext === "json") {
    event.respondWith(handleData(request));
    return;
  }
  if (MEDIA_EXT.indexOf(ext) !== -1) {
    event.respondWith(handleMedia(request, event));
    return;
  }
  if (STATIC_EXT.indexOf(ext) !== -1) {
    event.respondWith(handleStatic(request));
  }
  // resto (sin extensión fuera de navegaciones): pasa a la red sin interceptar
});
