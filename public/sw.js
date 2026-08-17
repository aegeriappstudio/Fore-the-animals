/* Fore the Animals! – Service Worker
 *
 * Strategie: Cache zuerst, damit die App auch im Funkloch sofort startet.
 * Im Hintergrund wird jede Datei nachgeladen; bringt das eine neue Version,
 * bekommen die offenen Seiten eine Nachricht und zeigen «Neue Version –
 * neu laden». API-Aufrufe werden nie gecacht.
 *
 * CACHE-Version bei jeder Änderung an den App-Dateien hochzählen!
 */
const CACHE = 'fta-v10';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/i18n.js', '/shared/model.js', '/manifest.json',
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

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage(message));
}

// Antwort aus dem Cache, Aktualisierung im Hintergrund («stale while revalidate»)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });

  const refresh = fetch(request).then(async (res) => {
    if (res && res.ok && res.type === 'basic') {
      if (cached) {
        // Nur melden, wenn sich der Inhalt tatsächlich geändert hat
        const [oldBody, newBody] = await Promise.all([cached.clone().text(), res.clone().text()]);
        if (oldBody !== newBody) {
          await cache.put(request, res.clone());
          tellClients({ type: 'fta-updated' });
        }
      } else {
        await cache.put(request, res.clone());
      }
    }
    return res;
  }).catch(() => null);

  if (cached) return cached;
  const fresh = await refresh;
  if (fresh) return fresh;
  return caches.match('/');
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // API nie cachen
  e.respondWith(cacheFirst(e.request));
});
