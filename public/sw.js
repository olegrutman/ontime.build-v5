// Service Worker for Push Notifications
const CACHE_NAME = 'omni-work-notifications-v1';

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push message received', event);
  
  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Notification', body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'general',
    requireInteraction: true,
    actions: data.actions || [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon.ico'
      }
    ],
    data: {
      url: data.url || '/',
      ...data.data
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ontime.Build', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received', event);
  
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if no existing one
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Handle background sync for sending notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync event', event.tag);
  
  if (event.tag === 'check-pending-approvals') {
    event.waitUntil(checkPendingApprovals());
  }
});

async function checkPendingApprovals() {
  // This will be triggered by the background sync
  // The actual approval checking will be done via the backend edge function
  console.log('Checking pending approvals in background...');
}