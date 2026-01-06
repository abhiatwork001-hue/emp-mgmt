self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const targetUrl = data.url || '/dashboard';

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                // If any window is focused AND at the target URL, skip the notification
                const isFocusedOnTarget = clientList.some(client =>
                    client.focused && client.url.includes(targetUrl)
                );

                if (isFocusedOnTarget) {
                    return;
                }

                const options = {
                    body: data.body,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    vibrate: [100, 50, 100],
                    data: {
                        url: targetUrl
                    }
                };

                return self.registration.showNotification(data.title, options);
            })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// Cache basic assets for offline feel
const CACHE_NAME = 'chick-v1';
const ASSETS = [
    '/dashboard',
    '/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
