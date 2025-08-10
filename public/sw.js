// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'G-Remind';
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || undefined,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const taskData = event.notification.data;
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
       const client = clientList.find(c => c.url.includes('/tasks') && 'focus' in c);
       if (client) {
            client.postMessage({ type: 'notification_click', action: action, data: taskData });
            return client.focus();
       }
       if (clients.openWindow) {
           return clients.openWindow('/tasks').then(client => {
                client.postMessage({ type: 'notification_click', action: action, data: taskData });
           });
       }
    })
  );
});

// Allow the page to post messages to the service worker to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'showNotification') {
    const { title, options } = event.data.payload;
    self.registration.showNotification(title, options);
  }
});
