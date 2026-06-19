// Precache-manifest injected by vite-plugin-pwa at build time
const PRECACHE = self.__WB_MANIFEST || []

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('brynjas-v1')
      .then((cache) =>
        cache.addAll(PRECACHE.map((entry) => (typeof entry === 'string' ? entry : entry.url)))
          .catch(() => {})
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// Network-first for navigation, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  e.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
})

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Brynjas Køkken 🔥', {
      body: data.body ?? 'Noget nyt i dit feed!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/'))
})
