// ================================================================
// EDWIN BARBER — Service Worker
// Maneja notificaciones push cuando llega una cita nueva
// ================================================================

const CACHE_NAME = 'edwin-barber-v1'

// Instalar el service worker
self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim())
})

// ================================================================
// NOTIFICACIONES PUSH
// ================================================================
self.addEventListener('push', event => {
  let datos = {
    titulo: '✂️ Edwin Barber',
    cuerpo: 'Nueva cita recibida',
    icono: '/images/logo.png',
    badge: '/images/logo.png',
    url: '/'
  }

  if (event.data) {
    try { Object.assign(datos, JSON.parse(event.data.text())) } catch (e) {}
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: datos.icono,
      badge: datos.badge,
      tag: 'nueva-cita',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: datos.url },
      actions: [
        { action: 'ver', title: '📋 Ver cita' },
        { action: 'cerrar', title: 'Cerrar' }
      ]
    })
  )
})

// Al tocar la notificación abre el panel admin
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'cerrar') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      const url = self.registration.scope
      for (const cliente of lista) {
        if (cliente.url.includes(url) && 'focus' in cliente) {
          cliente.postMessage({ tipo: 'abrir-admin' })
          return cliente.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})