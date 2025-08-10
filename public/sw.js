// public/sw.js
/* Service Worker for G-Remind background notifications and message bridge */
self.addEventListener('install', (evt) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'G-Remind';
  const options = Object.assign(
    {
      body: data.body || '',
      tag: data.tag,
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
    },
    data.options || {}
  );
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    // For "yes"/"no" actions, we need to communicate back to the client.
  if (event.action) {
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function(clientList) {
      if (clientList.length > 0) {
        clientList[0].postMessage({
          type: 'notification_action',
          payload: {
            action: event.action,
            taskId: event.notification.tag,
          }
        });
      }
    });
  }
  
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (evt) => {
  const { type, payload } = evt.data || {};
  if (type === 'showNotification') {
    self.registration.showNotification(payload.title, payload.options || {});
  }
});
