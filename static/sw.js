// Service worker: keeps a copy of the app so it opens and works offline.
// Served next to index.html (/sw.js in app.py, sw.js in the GitHub Pages
// build) so that it controls the whole app.  Paths are relative to it.
// Strategy: network first — online you always get the current version, and
// every successful response refreshes the cache; offline the cache answers.
// Bump VERSION to drop caches left by older versions of the file list.

const VERSION = 'turing-v2';
const APP_SHELL = [
  './',
  'examples',
  'static/style_index.css',
  'static/turing.js',
  'static/script_index.js',
  'static/manifest.json',
  'static/icons/icon.svg',
  'static/icons/icon-192.png',
  'static/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // POST run and other origins (e.g. livereload) always go to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (e) {
      const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (cached) return cached;
      if (request.mode === 'navigate') return cache.match('./');
      throw e;
    }
  })());
});
