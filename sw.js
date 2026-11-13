const CACHE_NAME = "fitplan-pwa-v10";
const VERSION = "20261113-palettes";
const ASSETS = [
  "index.html",
  "backend.html",
  "styles.css",
  "app.js",
  "fitplan-core.js",
  "food-basis.js",
  "supabase-config.js",
  "supabase-foods.js",
  "backend.js",
  "pwa.css",
  "pwa.js",
  "responsive.css"
];

const APP_SHELL = [
  "./",
  "./pwa.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon.svg",
  ...ASSETS.flatMap((file) => [`./${file}`, `./${file}?v=${VERSION}`])
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match("./index.html");
        })
      )
  );
});
