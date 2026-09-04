const VERSION = 'cool-learning-shell-v5';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('SW fetch failed:', event.request.url, err);
        return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } });
      })
    );
  }
});
