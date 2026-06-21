// Service worker for CoChez Cellar — v3
// Does NOT auto-skip waiting — lets the app show "Update available" toast
// and only takes over when the user taps Refresh.

const CACHE = 'cochez-v3';

// First install: no existing controller, safe to skip waiting immediately.
// Subsequent updates: stay in waiting state until app sends SKIP_WAITING.
self.addEventListener('install', () => {
  if (!self.registration.active) self.skipWaiting();
});

// Listen for the app's "Refresh" button
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
