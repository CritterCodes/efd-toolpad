/**
 * Standalone push service worker for efd-admin.
 *
 * The app's PWA/Workbox service worker is gated behind ENABLE_PWA (usually off), so this
 * dedicated worker handles ONLY Web Push — no caching. It is registered directly by the
 * push subscribe hook (src/lib/usePushNotifications.js), independent of next-pwa.
 *
 * Payload is the JSON emitted by lib/webPush.js: { title, body, url, icon, badge, tag, data }.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Engel Fine Design';
  const url = payload.url || (payload.data && payload.data.url) || '/';
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: payload.tag || undefined,
    data: { ...(payload.data || {}), url },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          try {
            const clientPath = new URL(client.url).pathname;
            const targetPath = new URL(targetUrl, client.url).pathname;
            if (clientPath === targetPath) return client.focus();
          } catch (e) { /* ignore malformed URLs */ }
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
