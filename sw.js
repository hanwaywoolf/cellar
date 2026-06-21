// Service worker for CoChez Cellar PWA
// Installs unconditionally — no pre-caching during install that could block activation.
// Caches responses lazily as the user navigates.

const CACHE_NAME = 'cochez-v2';

self.addEventListener('install', () => {
  // Skip waiting immediately so the SW activates on first visit
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Never intercept the Claude API proxy or non-GET requests
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname === '/claude') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Lazily cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
