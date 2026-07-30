// Service Worker voor HR Tests Sollicitanten
// Cache-first strategie: eens geladen, werkt alles offline.
// Enige uitzondering: POST naar de Cloud Function (die MOET online gaan).

const CACHE_VERSION = 'hr-tests-v17';
const ASSETS = [
  './',
  './index.html',
  './hard-skills.html',
  './soft-skills.html',
  './startup-attitude.html',
  './business-support.html',
  './logo-united.png',
  './manifest.json'
];

// ═══════════════════ INSTALL ═══════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ═══════════════════ ACTIVATE ═══════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ═══════════════════ FETCH ═══════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST (en andere niet-GET) NOOIT cachen — die moeten online.
  if (req.method !== 'GET') return;

  // Cloud Function URL nooit cachen of onderscheppen.
  if (req.url.includes('cloudfunctions.net') || req.url.includes('run.app')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          // Cache succesvolle same-origin responses voor volgende keer
          if (resp && resp.ok && new URL(req.url).origin === location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => {
          // Offline en niet in cache — geef een simpele fallback
          return new Response('Je bent offline en deze bron is niet beschikbaar.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    })
  );
});
