const CACHE='hashemi-fb-v1';
const ASSETS=['./','./index.html','./login.html','./register.html','./app.html','./profile.html','./members.html','./chat.html','./gallery.html','./notifications.html','./settings.html','./admin.html','./css/main.css','./css/animations.css','./css/responsive.css','./js/config.js','./assets/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method==='GET' && new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return x}).catch(()=>caches.match('./index.html'))));});
