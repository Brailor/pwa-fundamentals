import { removeUnusedCaches, precacheStaticAssets, ALL_CACHES_LIST, ALL_CACHES } from './sw/caches';
import idb from 'idb';

const FALLBACK_IMAGE_URL = 'https://localhost:3100/images/fallback-grocery.png';
const FALLBACK_IMAGE_URLS = [
  'https://localhost:3100/images/fallback-grocery.png',
  'https://localhost:3100/images/fallback-vegetables.png',
  'https://localhost:3100/images/fallback-bakery.png',
  'https://localhost:3100/images/fallback-fruit.png',
  'https://localhost:3100/images/fallback-herbs.png',
  'https://localhost:3100/images/fallback-frozen.png',
  'https://localhost:3100/images/fallback-dairy.png',
  'https://localhost:3100/images/fallback-meat.png'
];
const INDEX_HTML_PATH = '/';
const INDEX_HTML_URL = new URL(INDEX_HTML_PATH, self.location).toString();

function openDB() {
  return idb.open('grocery-items-store', 1, upgradeDb => {
    switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('grocery-items', { keyPath: 'id' });
    }
  });
}

function serveCategoryFallbackImage(request) {
  return openDB()
    .then(db => {
      const path = new URL(request.url).pathname;
      const groceryId = parseInt(path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.')), 10);

      return db
        .transaction('grocery-items')
        .objectStore('grocery-items')
        .get(groceryId);
    })
    .then(({ category }) => {
      return caches.match(`https://localhost:3100/images/fallback-${category.toLowerCase()}.png`, {
        cacheName: ALL_CACHES.fallbackImages
      });
    });
}

function downloadGroceryItems() {
  return openDB().then(db => {
    fetch('https://localhost:3100/api/grocery/items?limit=9999')
      .then(response => response.json())
      .then(({ data: groceryItems }) => {
        //add data to indexedDB
        const tx = db.transaction('grocery-items', 'readwrite');

        tx.objectStore('grocery-items').clear();

        tx.complete.then(() => {
          const txx = db.transaction('grocery-items', 'readwrite');

          groceryItems.forEach(groceryItem => {
            txx.objectStore('grocery-items').put(groceryItem);
          });

          return txx.complete;
        });
      })
      .catch(console.error);
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(ALL_CACHES.fallbackImages).then(cache => cache.addAll(FALLBACK_IMAGE_URLS)),
      precacheStaticAssets(),
      downloadGroceryItems()
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
        return serveCategoryFallbackImage(fetchEvent.request);
      } else {
        return response;
      }
    })
    .catch(() => serveCategoryFallbackImage(fetchEvent.request));
}
