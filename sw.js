// Service worker: kenbe aplikasyon an sou telefòn nan pou l louvri san entènèt.
// Chanje VERSION chak fwa ou pibliye yon nouvo vèsyon.
const CFG = self.GRANDON_SW || { baz: "", lokal: null, non: "prod" };
const VERSION = `grandon-ajan-v95-${CFG.non}`;
const SHELL_BAZ = [
  "./", "index.html", "app.css", "look-a.css", "look-b.css", "look-c.css",
  "app.js", "db.js", "api.js", "sync.js", "config.js", "ui.js", "i18n.js", "taxonomy.js", "fmt.js",
  "looks.js", "pwoblem.js", "look-base.js", "look-a.js", "look-b.js", "look-c.js", "kat.js",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css", "vendor/leaflet/images/layers.png", "vendor/leaflet/images/layers-2x.png",
  "vendor/leaflet/images/marker-icon.png", "vendor/leaflet/images/marker-icon-2x.png", "vendor/leaflet/images/marker-shadow.png",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
];
// Fichye lokal yo (index, config, manifest) rete kote service worker la ye; lòt yo soti nan CFG.baz.
const SHELL = [...SHELL_BAZ.map((u) => (!CFG.lokal || CFG.lokal.includes(u) ? u : CFG.baz + u)), ...(CFG.plis || [])]; // plis: fichye mak sit la (logo, koulè)
// Kopi tès la (tes/) gen pwòp service worker li: prodiksyon pa janm reponn pou li.
const SOU_TES = CFG.non === "prod" ? ["tes/", "ep-tes/"].map((x) => new URL(x, self.registration.scope).pathname) : null;
const CACHE_FOTO = "grandon-foto";
const CACHE_FONT = "grandon-font";
const CACHE_KAT = "grandon-kat";

self.addEventListener("install", (e) => {
  // Nouvo vèsyon an pran plas ansyen an touswit (aplikasyon an rechaje paj la, eksepte nan mitan yon fòm).
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Efase sèlman ansyen cache pa nou yo (ak ansyen non san sifiks): pa manyen cache lòt kopi a.
    for (const k of await caches.keys()) {
      const pam = k.endsWith(`-${CFG.non}`) || /^grandon-ajan-v\d+$/.test(k);
      if (pam && k !== VERSION) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Klike sou yon notifikasyon: louvri aplikasyon an (oswa mete l devan) sou paj alèt la.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "", self.registration.scope).href;
  e.waitUntil((async () => {
    const tout = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = tout.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { await w.focus(); if (e.notification.data?.url) w.navigate?.(url).catch(() => {}); return; }
    await self.clients.openWindow(url);
  })());
});

// Cache dabò; si pa gen anyen, rezo a; kenbe repons lan pou pwochen fwa.
async function cacheDabò(req, nom) {
  const cache = await caches.open(nom);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === "opaque") cache.put(req, r.clone());
    return r;
  } catch { return new Response("", { status: 504 }); }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Foto kliyan piblik yo: kenbe yo pou yo parèt menm offline.
  if (url.pathname.includes("/storage/v1/object/public/")) { e.respondWith(cacheDabò(req, CACHE_FOTO)); return; }
  // Polis Google Fonts (css + fichye woff2): kenbe yo pou look yo rete menm jan offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") { e.respondWith(cacheDabò(req, CACHE_FONT)); return; }
  // Mozayik kat OpenStreetMap: kenbe sa ajan an deja wè pou kat la parèt offline.
  if (url.hostname === "tile.openstreetmap.org") { e.respondWith(cacheDabò(req, CACHE_KAT)); return; }
  // Supabase ak lòt sit: pa manyen yo, se aplikasyon an ki jere offline la.
  if (url.origin !== self.location.origin) return;
  if (SOU_TES && SOU_TES.some((x) => url.pathname.startsWith(x))) return;
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
