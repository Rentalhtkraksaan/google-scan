// Smart QR Review - Lightweight Service Worker
const CACHE_NAME = "smartqr-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification Event
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Smart QR Review";
    const options = {
      body: data.body || "Ada pembaruan ulasan di outlet Anda.",
      icon: data.icon || "/api/og",
      badge: "/api/og",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/portal",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Smart QR Review", {
        body: text,
        icon: "/api/og",
      })
    );
  }
});

// Notification Click Event -> Open or focus portal
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/portal";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/portal") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
