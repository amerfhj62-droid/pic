self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("labia-v1").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// ===============================
// PUSH NOTIFICATIONS
// ===============================
self.addEventListener("push", event => {
  if (!event.data) return;

  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: data.url
    }
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
