/* Fore the Animals! – Service Worker
 * Strategie: Netz zuerst (damit nie eine veraltete App-Version hängen bleibt),
 * bei fehlendem Empfang Rückgriff auf den Cache. API-Aufrufe werden nie gecacht.
 */
const CACHE = 'fta-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/manifest.json',
  '/img/hero.jpg', '/img/icon-192.png', '/img/icon-512.png', '/img/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // API nie cachen

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/')))
  );
});
