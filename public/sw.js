// Service worker for Smart Fitness (R-STR-08): lets Rutinas and a strength session open with no signal.
// Pages are network-first, so online you always get fresh data; the copy is only a fallback.
// Server Actions (POST), the API and Supabase are never touched: sets logged offline wait on the
// phone (localStorage) and upload themselves when the signal is back.

const VERSION = "v1";
const PAGES = `sft-pages-${VERSION}`;
const STATIC = `sft-static-${VERSION}`;

/** Pages kept for offline use. Other sections need fresh data and aren't useful offline. */
const OFFLINE_PAGES = ["/rutinas", "/sesion"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sft-") && k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isOfflinePage = (url) => OFFLINE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    // Only real pages: a redirect to the login or an error must not replace a good copy.
    if (response.ok && !response.redirected && response.type === "basic") await cache.put(request, response.clone());
    return response;
  } catch {
    // Same page with the same query first (/sesion?rutina=3), then any copy of that page.
    const exact = await cache.match(request);
    if (exact) return exact;
    const loose = await cache.match(request, { ignoreSearch: true });
    if (loose) return loose;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Sin conexión</title>" +
        "<body style='font-family:system-ui;padding:24px;line-height:1.4'><h1>Sin conexión</h1><p>Esta página no está guardada en el teléfono. " +
        "Abre Rutinas o la sesión una vez con señal y quedarán disponibles sin conexión.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/**
 * "Warm" pages from Rutinas: keep a copy of each session page and of the build files its HTML names,
 * so a session I haven't opened yet still opens without signal.
 */
async function warm(urls) {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  for (const href of urls) {
    const url = new URL(href, self.location.origin);
    if (url.origin !== self.location.origin || !isOfflinePage(url)) continue;
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await pages.put(url, response);
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) ?? [])];
      for (const asset of assets) if (!(await statics.match(asset))) await statics.add(asset).catch(() => {});
    } catch {
      // No signal: try again next time Rutinas opens.
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "warm" && Array.isArray(event.data.urls)) event.waitUntil(warm(event.data.urls));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Next's build files have a content hash in their name: they never change.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Full page loads of the offline pages. Client-side navigations (RSC requests) fall back to a full
  // load when they fail, which lands here.
  if (request.mode === "navigate" && isOfflinePage(url)) {
    event.respondWith(networkFirst(request));
  }
});
