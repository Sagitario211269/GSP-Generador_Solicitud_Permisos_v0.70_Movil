const CACHE_NAME = 'generador-permisos-mobile-v0.7.4-paginacion2';
const APP_ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './src/styles.css', './src/renderer.js', './src/validation.js', './src/mobile-bridge.js',
  './assets/encabezado-institucional.png', './assets/pie-institucional.png',
  './assets/icono-192.png', './assets/icono-512.png', './assets/icono-generador.png'
];
const PDF_LIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    try {
      const response = await fetch(PDF_LIB, {mode:'cors'});
      if (response.ok) await cache.put(PDF_LIB, response);
    } catch (e) { /* first visit still requires network to load pdf-lib */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('generador-permisos-mobile-') && key !== CACHE_NAME) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url === PDF_LIB) {
    event.respondWith((async () => (await caches.match(PDF_LIB)) || fetch(event.request))());
    return;
  }
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (new URL(url).origin === self.location.origin && response.ok) {
        const cache = await caches.open(CACHE_NAME); cache.put(event.request, response.clone());
      }
      return response;
    } catch (e) {
      if (event.request.mode === 'navigate') return (await caches.match('./index.html'));
      throw e;
    }
  })());
});
