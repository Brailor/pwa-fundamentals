let fallbackImage = 'generic-fallback-image';

const FALLBACK_IMAGE_URL = 'https://localhost:3100/images/fallback-grocery.png';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(fallbackImage).then(cache => {
      cache.add(FALLBACK_IMAGE_URL);
    })
  );
});

self.addEventListener('active', event => {
  //TODO delete cache
  console.log('Service worker active!', event);
});

self.addEventListener('fetch', fetchEvent => {
  let acceptHeaders = fetchEvent.request.headers.get('accept');
  let reqUrl = new URL(fetchEvent.request.url);

  if (acceptHeaders.indexOf('image/*') >= 0 && reqUrl.pathname.indexOf('/images/' === 0)) {
    fetchEvent.respondWith(serveImage(fetchEvent));
  }
});

function serveImage(fetchEvent) {
  //TODO make an async function solution as well
  return fetch(fetchEvent.request, { mode: 'cors' })
    .then(response => {
      if (!response.ok) {
        return caches.match(FALLBACK_IMAGE_URL, { cacheName: fallbackImage });
      } else {
        return response;
      }
    })
    .catch(() => caches.match(FALLBACK_IMAGE_URL, { cacheName: fallbackImage }));
}
