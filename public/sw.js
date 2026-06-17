self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Brynjas Køkken 🔥', {
      body: data.body ?? 'Noget nyt i dit feed!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/'))
})
