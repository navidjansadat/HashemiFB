const CACHE = 'hashemi-fb-v3';

const ASSETS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './app.html',
  './profile.html',
  './members.html',
  './chat.html',
  './gallery.html',
  './notifications.html',
  './settings.html',
  './admin.html',
  './css/main.css',
  './css/animations.css',
  './css/responsive.css',
  './assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache JavaScript/config or Supabase/CDN requests.
  if (
    url.origin !== location.origin ||
    url.pathname.endsWith('.js') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
