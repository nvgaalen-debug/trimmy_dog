/* Trimmy · sw.js — bewaart de app op het apparaat zodat hij ook zonder internet start.
   Werkwijze: altijd eerst het nieuwste van Netlify proberen; lukt dat niet, dan de bewaarde versie.
   Gegevens (/api/...) worden nooit bewaard: die regelt Trimmy zelf. */
const CACHE = "trimmy-app-v4";
const VAST = ["/", "/index.html", "/app.css", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(VAST.map((u) => new Request(u, { cache: "reload" })));
    // alle scripts uit index.html meenemen, zodat de lijst nooit bijgehouden hoeft te worden
    const html = await (await c.match("/index.html")).text();
    const js = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => "/" + m[1].replace(/^\//, ""));
    await c.addAll(js.map((u) => new Request(u, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/") || url.pathname.startsWith("/portaal")) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: "no-store" });
      if (res.ok && res.type === "basic") c.put(req.mode === "navigate" && (url.pathname === "/" || url.pathname === "/index.html") ? "/index.html" : url.pathname, res.clone());
      return res;
    } catch (err) {
      const hit = (req.mode === "navigate" ? await c.match("/index.html") : null) || await c.match(url.pathname) || await c.match(req);
      if (hit) return hit;
      throw err;
    }
  })());
});
