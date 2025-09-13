// public/sw.js
self.addEventListener("install", (event) => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
});

// This listens for "push" events (from a backend, later)
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const title = "🚂 Train of Enlightenment";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      icon: "/icon.png"
    })
  );
});
