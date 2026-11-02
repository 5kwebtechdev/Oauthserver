// Retire the service worker previously installed by the mobile web build.
// The current logged-out website is not a PWA and must always load fresh routes.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ]).then(() => self.clients.claim()),
  );
});
