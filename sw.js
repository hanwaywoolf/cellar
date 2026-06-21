// Service worker for CoChez Cellar PWA
// Minimal SW — enables install prompt and offline caching of the app shell

const CACHE_NAME = 'cochez-v1';
const SHELL_URLS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API calls (claude proxy), cache-first for app shell
  if (e.request.url.includes('/claude')) return;
  
  e.respondWith(
    fetch(e.request)
      .then(r => {
        // Cache successful GET responses
        if (r.ok && e.request.method === 'GET') {
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
