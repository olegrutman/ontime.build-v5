// Ontime.Build push-notification service worker.
// Minimal — push + click only. No app-shell caching.
// The manifest placeholder below is required by vite-plugin-pwa's injectManifest build.
// eslint-disable-next-line no-underscore-dangle
self.__WB_MANIFEST;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data = { title: 'Ontime.Build', body: event.data.text() };
    }
  }

  const title = data.title || 'Ontime.Build';
  const options = {
    body: data.body || '',
    icon: data.icon || '/ontime-logo.png',
    badge: data.badge || '/ontime-logo.png',
    tag: data.tag || `notif-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        const targetPath = targetUrl.startsWith('http') ? new URL(targetUrl).pathname : targetUrl.split('?')[0];
        if (clientUrl.pathname === targetPath && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl).catch(() => {});
          return;
        }
      } catch (_e) { /* ignore */ }
    }
    if (allClients[0] && 'focus' in allClients[0]) {
      await allClients[0].focus();
      if ('navigate' in allClients[0]) await allClients[0].navigate(targetUrl).catch(() => {});
      return;
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
