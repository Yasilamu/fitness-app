const CACHE_NAME = "fitplan-pwa-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./index.html?v=20260614-supabase",
  "./pwa.html",
  "./pwa.css?v=20260613-mobile-2",
  "./pwa.css",
  "./pwa.js?v=20260613-mobile-2",
  "./pwa.js",
  "./styles.css",
  "./styles.css?v=20260617-date-mobile-fix",
  "./responsive.css",
  "./responsive.css?v=20260613-mobile-2",
  "./app.js",
  "./app.js?v=20260614-serving-basis",
  "./food-basis.js",
  "./food-basis.js?v=20260614-serving-basis",
  "./supabase-config.js?v=20260614-serving-basis",
  "./supabase-foods.js?v=20260614-serving-basis",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
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
          return caches.match("./pwa.html");
        })
      )
  );
});
