const CACHE_NAME = "brand-phone-pos-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "//kacher/dashboard/",
  "/pos.html",
  "/products.html",
  "//kacher/dashboard/invoices/",
  "/maintenance.html",
  "/style.css",
  "/app.js",
  "/db.js",
  "https://os-br.pages.dev/icone.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
});
