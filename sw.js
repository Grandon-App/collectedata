// Service worker: kenbe aplikasyon an sou telefòn nan pou l louvri san entènèt.
// Chanje VERSION chak fwa ou pibliye yon nouvo vèsyon.
const VERSION = "grandon-ajan-v3";
const SHELL = [
  "./", "index.html", "app.css", "app.js", "db.js", "api.js", "sync.js", "config.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Supabase ak lòt sit: pa manyen yo, se aplikasyon an ki jere offline la.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(caches.match("index.html").then((r) => r || fetch(req)));
    return;
  }
  // Cache dabò, epi mete l ajou an aryèplan.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response("", { status: 504 });
  })());
});
