// Smart QR Review - Lightweight Service Worker
const CACHE_NAME = "smartqr-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification Event (Handles incoming Push when App is Closed / Screen Off)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Smart QR Review";
    const options = {
      body: data.body || "Ada pembaruan ulasan di outlet Anda.",
      icon: data.icon || "/api/logo/landing",
      badge: data.badge || "/api/logo/landing",
      vibrate: [350, 150, 350, 150, 600],
      tag: data.tag || `smartqr-alert-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: {
        url: data.url || "/portal",
      },
      actions: [
        { action: "open", title: "Buka Portal Outlet 📱" },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Smart QR Review", {
        body: text,
        icon: "/api/logo/landing",
        badge: "/api/logo/landing",
        vibrate: [350, 150, 350],
        silent: false,
        data: {
          url: "/portal",
        },
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

// Client PostMessage Handler -> Show Native Notification
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const title = event.data.title || "Smart QR Review";
    const options = {
      body: event.data.body || "Aktivitas ulasan baru terdeteksi.",
      icon: event.data.icon || "/api/logo/landing",
      badge: event.data.badge || "/api/logo/landing",
      vibrate: [250, 100, 250, 100, 450],
      tag: `review-alert-${Date.now()}`,
      data: {
        url: event.data.url || "/portal",
      },
    };
    self.registration.showNotification(title, options);
  }
});
