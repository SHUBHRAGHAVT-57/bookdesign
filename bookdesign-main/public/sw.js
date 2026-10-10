// KeyTurn service worker: hand-written, no libraries.
// - The app shell and built assets are cached on install so the demo works offline.
// - Page loads try the network first (so a redeploy is picked up) and fall back to the cache.
// - Everything else is cache-first and filled on demand.
const CACHE = 'keyturn-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './keyturn.svg'];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const response = await cache.match('./index.html');
    if (response) {
      const html = await response.text();
      const assets = Array.from(html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g), (match) => match[1]);
      await Promise.all(assets.map(async (asset) => {
        try {
          const assetResponse = await fetch(asset);
          if (assetResponse.ok) await cache.put(asset, assetResponse);
        } catch {
          // A failed asset fetch is retried at runtime; it must not block installation.
        }
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('keyturn-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
        if (response.ok) await cache.put('./index.html', response.clone());
        return response;
      } catch {
        return (await cache.match('./index.html', { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
