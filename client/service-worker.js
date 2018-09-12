self.addEventListener('install', event => {
  console.log('Installing service worker', event);
});

self.addEventListener('active', event => {
  console.log('Service worker active!', event);
});

let count = 0;

self.addEventListener('fetch', event => {
  console.log('Intercepting fetch:', event);
  count++;
  console.log(`Number ${count}`);
});
