// Keep this URL available: existing R Shinylive clients update this registration.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    // Shared-origin caches may contain unrelated wave-site data; delete only our URLs.
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (request.url.startsWith(scope)) await cache.delete(request);
      }
    }
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (client.url.startsWith(scope)) await client.navigate(client.url);
    }
  })());
});
