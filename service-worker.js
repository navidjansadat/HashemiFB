const CACHE = 'hashemi-fb-v10';

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

  // Never intercept JS, Supabase/CDN requests, auth/API calls, or config.
  if (
    url.origin !== location.origin ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/')
  ) return;

  // Always try network first for HTML so deployments are immediately visible.
  if (event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
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
