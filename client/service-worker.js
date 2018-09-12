import { removeUnusedCaches, precacheStaticAssets, ALL_CACHES_LIST, ALL_CACHES } from './sw/caches';

const FALLBACK_IMAGE_URL = 'https://localhost:3100/images/fallback-grocery.png';

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(ALL_CACHES.fallbackImages).then(cache => cache.add(FALLBACK_IMAGE_URL)),
      precacheStaticAssets()
    ])
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(removeUnusedCaches(ALL_CACHES_LIST));
});

self.addEventListener('fetch', fetchEvent => {
  let acceptHeaders = fetchEvent.request.headers.get('accept');
  let reqUrl = new URL(fetchEvent.request.url);

  fetchEvent.respondWith(
    caches.match(fetchEvent.request, { cacheName: ALL_CACHES.prefetch }).then(response => {
      if (response) return response;

      if (acceptHeaders.indexOf('image/*') >= 0 && reqUrl.pathname.indexOf('/images/' === 0)) {
        return serveImage(fetchEvent);
      }

      return fetch(fetchEvent.request);
    })
  );
});

function serveImage(fetchEvent) {
  return fetch(fetchEvent.request, { mode: 'cors', credentials: 'omit' })
    .then(response => {
      if (!response.ok) {
        return caches.match(FALLBACK_IMAGE_URL, { cacheName: ALL_CACHES.fallbackImages });
      } else {
        return response;
      }
    })
    .catch(() => caches.match(FALLBACK_IMAGE_URL, { cacheName: ALL_CACHES.fallbackImages }));
}
