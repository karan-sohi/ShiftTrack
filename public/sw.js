const CACHE = "shifttrack-v1";

// Cache app shell and static assets on install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/manifest.json", "/icons/icon.svg"])
    )
  );
});

// Remove old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for API and navigation; cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { url, method } = event.request;

  // Never cache non-GET or API routes
  if (method !== "GET" || url.includes("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for icons / manifest
  if (url.includes("/icons/") || url.includes("/manifest.json")) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request))
    );
    return;
  }

  // Network-first for everything else (pages stay fresh)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
