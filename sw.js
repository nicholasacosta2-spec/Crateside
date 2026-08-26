/* Crateside service worker
   Shell is cache-first so the app opens instantly and works on the subway.
   Anything live — Spotify, iTunes, artwork — goes straight to the network. */

const CACHE = 'crateside-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch third-party requests — Spotify tokens and artwork must stay live.
  if (url.origin !== self.location.origin) return;

  // Never serve a cached page over an OAuth redirect: the ?code= must reach the app.
  if (url.search.includes('code=') || url.search.includes('error=')) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const live = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || live;
    })
  );
});
