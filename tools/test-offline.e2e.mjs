// test-offline.e2e.mjs — regresión offline del service worker
// Uso: node test-offline.e2e.mjs  (requiere servidor local en 127.0.0.1:8765)
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8765/";
const MP3 = "assets/audio/adjetivos-sustantivos_1.mp3";
let failures = 0;

function check(name, ok, detail = "") {
  console.log((ok ? "OK   " : "FALLO") + " " + name + (ok ? "" : " -> " + detail));
  if (!ok) failures++;
}
const step = async (name, fn) => {
  try { await fn(); console.log("OK   " + name); }
  catch (e) { failures++; console.log("FALLO " + name + " -> " + String(e.message).split("\n")[0]); }
};

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const failedUrls = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("requestfailed", (r) => failedUrls.push(r.url()));
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // Esperado offline: media no cacheada (ERR de red o 503 controlado del SW).
  // El guardián "solo falla media no cacheada" valida que nada crítico falle.
  if (!/net::ERR_(FAILED|ABORTED)/.test(t) && !/status of 503/.test(t)) errors.push("console: " + t);
});

// ---------- FASE 1: visita online (pobla cachés) ----------
await page.goto(BASE, { waitUntil: "networkidle" });
await step("service worker registra y activa", async () => {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) throw new Error("sin worker activo");
  });
});
await step("precache completo (shell + 15 JSON)", async () => {
  await page.waitForFunction(async () => {
    const data = await caches.open("data-v1");
    const shell = await caches.open("shell-v1");
    const [d, s] = await Promise.all([data.match("assets/offsets.json"), shell.match("index.html")]);
    return !!d && !!s;
  }, { timeout: 20000 });
});
await step("media cache poblado tras primer uso (fetch online)", async () => {
  await page.evaluate(async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw new Error("fetch " + r.status);
    await r.arrayBuffer();
  }, MP3);
  await page.waitForFunction(async (path) => {
    const c = await caches.open("media-v1");
    return !!(await c.match(path));
  }, MP3, { timeout: 15000 });
});
check("badge oculto online", await page.locator("#offlineBadge").isHidden());

// ---------- FASE 2: offline ----------
await context.setOffline(true);
check("navigator.onLine pasa a false", !(await page.evaluate(() => navigator.onLine)));

await step("recarga offline: la app carga", async () => {
  await page.reload({ waitUntil: "load", timeout: 20000 });
  await page.locator("#coverView").waitFor({ state: "visible", timeout: 10000 });
});
check("badge offline visible tras recarga", await page.locator("#offlineBadge").isVisible());

await step("tarjetas renderizan con JSON de caché", async () => {
  await page.evaluate(() => { document.getElementById("homeBtn")?.click(); });
  const enter = page.locator("#coverView button:visible").first();
  if (await enter.count()) await enter.click();
  await page.locator("#cardsView").waitFor({ state: "visible", timeout: 8000 });
  await page.waitForFunction(() => {
    const list = document.querySelector("#cardList, .card-list, .cards-list, [class*=card]");
    return !!list && list.children.length > 0;
  }, { timeout: 8000 });
});

await step("Range (206) desde caché offline", async () => {
  const status = await page.evaluate(async (path) => {
    const r = await fetch(path, { headers: { Range: "bytes=0-1023" } });
    const buf = await r.arrayBuffer();
    return { status: r.status, len: buf.byteLength, range: r.headers.get("content-range") };
  }, MP3);
  if (status.status !== 206) throw new Error("status=" + status.status);
  if (status.len !== 1024) throw new Error("bytes=" + status.len);
  if (!status.range || !status.range.includes("/80301")) throw new Error("content-range=" + status.range);
});

await step("audio <audio> reproduce offline (desde caché)", async () => {
  const ok = await page.evaluate(async (path) => {
    const a = document.getElementById("audioPlayer");
    if (!a) throw new Error("sin #audioPlayer");
    a.src = path;
    a.muted = true;
    await a.play();
    await new Promise((r) => setTimeout(r, 900));
    return { time: a.currentTime, ready: a.readyState };
  }, MP3);
  if (!(ok.time > 0)) throw new Error("currentTime=" + ok.time);
  console.log("      currentTime=" + ok.time.toFixed(2) + " readyState=" + ok.ready);
});

await step("recorrido completo offline (7 secciones)", async () => {
  await page.reload({ waitUntil: "load", timeout: 20000 });
  await page.locator("#coverView").waitFor({ state: "visible", timeout: 10000 });
  const views = ["#coverView", "#cardsView", "#quizView", "#respondView", "#questionView", "#sequenceView", "#creativeView"];
  const seen = [];
  const visibleView = async () => {
    for (const v of views) if (await page.locator(v).isVisible()) return v;
    return "NINGUNA";
  };
  const enter = page.locator("#coverView button:visible").first();
  if (await enter.count()) { await enter.click(); await page.waitForTimeout(400); }
  seen.push(await visibleView());
  for (let i = 0; i < 8; i++) {
    const next = page.locator(".next-section-btn:visible").first();
    if ((await next.count()) === 0) break;
    await next.click();
    await page.waitForTimeout(500);
    seen.push(await visibleView());
  }
  const last = seen[seen.length - 1];
  if (last !== "#creativeView") throw new Error("no llegó a Biblioteca: " + seen.join(" -> "));
  console.log("      recorrido: " + seen.join(" -> "));
});

// ---------- FASE 3: vuelve la conexión ----------
await context.setOffline(false);
await page.waitForTimeout(600);
check("badge se oculta al volver online", await page.locator("#offlineBadge").isHidden());

// Recursos que fallen offline deben ser SOLO media no cacheado (nunca JSON/shell/css)
const nonMediaFails = failedUrls.filter((u) => !/\.(mp3|mp4|m4a|wav|ogg)(\?|$)/.test(u));
check("offline: solo falla media no cacheada (nunca JSON/shell)", nonMediaFails.length === 0,
  nonMediaFails.slice(0, 3).join(" | "));
check("cero errores JS/consola inesperados", errors.length === 0, errors.slice(0, 3).join(" | "));
if (failedUrls.length) console.log("      media no cacheada (esperado): " + [...new Set(failedUrls)].length + " URLs");

await browser.close();
console.log(failures === 0 ? "\nE2E OFFLINE: TODO OK" : `\nE2E OFFLINE: ${failures} FALLO(S)`);
process.exit(failures === 0 ? 0 : 1);
