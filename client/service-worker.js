import { removeUnusedCaches, precacheStaticAssets, ALL_CACHES_LIST, ALL_CACHES } from './sw/caches';

const FALLBACK_IMAGE_URL = 'https://localhost:3100/images/fallback-grocery.png';
const INDEX_HTML_PATH = '/';
const INDEX_HTML_URL = new URL(INDEX_HTML_PATH, self.location).toString();

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
  const acceptHeaders = fetchEvent.request.headers.get('accept');
  const reqUrl = new URL(fetchEvent.request.url);
  const isGroceryImage = acceptHeaders.indexOf('image/*') >= 0 && reqUrl.pathname.indexOf('/images/' === 0);
  const isApiDataRequest = acceptHeaders.indexOf('*/*') >= 0 && fetchEvent.request.method === 'GET';
  const isHTMLRequest = fetchEvent.request.headers.get('accept').indexOf('text/html') !== -1;
  const isLocal = new URL(fetchEvent.request.url).origin !== location.origin;

  if (isHTMLRequest && isLocal) {
    return event.respondWith(
      fetch(fetchEvent.request).catch(() => {
        return caches.match(INDEX_HTML_URL, { cacheName: ALL_CACHES.prefetch });
      })
    );
  }

  fetchEvent.respondWith(
    caches.match(fetchEvent.request, { cacheName: ALL_CACHES.prefetch }).then(response => {
      if (response) return response;
      // console.log(acceptHeaders);

      if (isGroceryImage) {
        return serveImage(fetchEvent);
      }

      if (isApiDataRequest) {
        return fetchApiDataWithFallback(fetchEvent);
      }

      return fetch(fetchEvent.request);
    })
  );
});
/**
 * Network first, then cache, update the cache after each successful call
 * @param {Event} fetchEvent
 * @returns {Promise}
 */
function fetchApiDataWithFallback(fetchEvent) {
  return fetch(fetchEvent.request)
    .then(response => {
      if (!response.ok) throw new Error();
      const clonedResponse = response.clone();
      //TODO: in case of successful fetch req. start saving the response to cache
      //and return the value immediately
      caches.open(ALL_CACHES.fallback).then(cache => {
        cache.add(fetchEvent.request, clonedResponse);
      });

      return response;
    })
    .catch(() => {
      //TODO: in case of network error, 404 or timeout serve the json from the cache
      return caches.match(fetchEvent.request, { cacheName: ALL_CACHES.fallback });
    });
}

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
