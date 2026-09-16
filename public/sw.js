self.addEventListener('fetch', (event) => {
  // Un manejador fetch vacío permite pasar el requerimiento de PWA de instalabilidad.
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
