// Service worker for CoChez Cellar — v5
// Network-first fetch. Updates are controlled: new SW waits until
// the app sends SKIP_WAITING (via the update banner), then activates
// and the page reloads to get fresh files.

const CACHE = 'cochez-v5';

self.addEventListener('install', () => {
  // Do NOT call skipWaiting() here — let the app decide when to update
  // so we don't interrupt a scan mid-flow.
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const { pathname } = new URL(e.request.url);
  if (pathname === '/claude') return;

  // Network-first: always try the network, cache on success, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && r.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
