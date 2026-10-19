// Офлайн-режим: страницы — сначала сеть, затем кэш; файлы сайта и шрифты — из кэша.
const CACHE = "pp-kitchen-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./favicon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromCacheOrNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy));
  }
  return response;
}

// Страница из сети, но не дольше 4 секунд; ошибки хостинга (404, 503) в кэш не попадают.
async function networkFirstPage(request) {
  const cached = () => caches.match("./index.html");
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((c) => c.put("./index.html", copy));
      return response;
    }
    return (await cached()) ?? response;
  } catch {
    return (await cached()) ?? fetch(request);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (sameOrigin || fonts) event.respondWith(fromCacheOrNetwork(request));
});
