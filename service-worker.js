const CACHE_NAME = 'generador-permisos-mobile-v0.7.4-cachefix1';
const APP_ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './src/styles.css', './src/renderer.js', './src/validation.js',
  './src/mobile-bridge.js?v=0.7.4-cachefix1',
  './assets/encabezado-institucional.png', './assets/pie-institucional.png',
  './assets/icono-192.png', './assets/icono-512.png', './assets/icono-generador.png'
];
const PDF_LIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    try {
      const response = await fetch(PDF_LIB, {mode:'cors', cache:'no-store'});
      if (response.ok) await cache.put(PDF_LIB, response);
    } catch (e) { /* first visit still requires network to load pdf-lib */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('generador-permisos-mobile-') && key !== CACHE_NAME) {
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.href === PDF_LIB) {
    event.respondWith((async () =>
      (await caches.match(PDF_LIB)) || fetch(request)
    )());
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === 'navigate' ||
    /\.(?:html|js|css)(?:$)/i.test(url.pathname) ||
    url.pathname.endsWith('/');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Network-first for the app shell and code so a deployment cannot remain
    // trapped behind an older cached JavaScript file.
    if (isDocument) {
      try {
        const response = await fetch(request, {cache:'no-store'});
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request) ||
          await cache.match('./index.html');
        if (cached) return cached;
        throw error;
      }
    }

    // Cache-first for images and other stable assets; refresh the cache when
    // an asset is not yet present.
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
