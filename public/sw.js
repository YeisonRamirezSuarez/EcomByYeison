// Minimal, conservative service worker for an installable PWA.
//
// Strategy: NETWORK-FIRST for page navigations so the storefront and Clerk
// session are always fresh. We deliberately do NOT cache API/auth/dynamic
// responses — that would risk stale prices, stock or sessions. The only thing
// precached is a self-contained offline fallback page.

const CACHE = "ecom-shell-v3";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop any caches from previous SW versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intervene on top-level navigations; everything else goes straight to
  // the network (no caching of assets, APIs or auth).
  if (request.method === "GET" && request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
