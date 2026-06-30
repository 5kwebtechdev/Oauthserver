// Firebase Cloud Messaging Service Worker
// Handles background push notifications when the app is running in a browser
// (PWA / web mode). Not used by native iOS/Android builds - the native
// Firebase SDK handles those via @capacitor-firebase/messaging.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase config is injected by the app at runtime via the service-worker
// client messaging channel. Until then, background messages are buffered.
let messagingInstance = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FCM_CONFIG') {
    try {
      const app = firebase.initializeApp(event.data.config);
      messagingInstance = firebase.messaging(app);

      messagingInstance.onBackgroundMessage((payload) => {
        const title = payload.notification?.title || 'SuperMeApp';
        const body  = payload.notification?.body  || '';
        const icon  = payload.notification?.icon  || '/assets/Icons-Neutral/home-logo.png';
        const badge = payload.notification?.badge || '/assets/Icons-Neutral/home-logo.png';

        return self.registration.showNotification(title, {
          body,
          icon,
          badge,
          data: payload.data || {},
          vibrate: [200, 100, 200],
          requireInteraction: false
        });
      });
    } catch (err) {
      console.error('[FCM-SW] Failed to initialise Firebase:', err);
    }
  }
});

// Handle notification click: focus the app window or open a new tab.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const route = data.route || data.screen || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (route && route !== '/') {
            client.postMessage({ type: 'FCM_NAVIGATE', route });
          }
          return;
        }
      }
      // No open window - open one.
      return clients.openWindow(route || '/');
    })
  );
});
