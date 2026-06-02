// ================================================================
// EDWIN BARBER — Service Worker v2
// Caché offline + notificaciones push
// ================================================================

const CACHE_NAME = 'edwin-barber-v2'
const ARCHIVOS_CACHE = [
  '/edwin-barber/',
  '/edwin-barber/index.html',
  '/edwin-barber/style.css',
  '/edwin-barber/script.js',
  '/edwin-barber/firebase.js',
  '/edwin-barber/manifest.json',
  '/edwin-barber/images/logo.png',
  '/edwin-barber/images/logo512.png',
  '/edwin-barber/images/barberia.webp'
]

// Instalar y cachear archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARCHIVOS_CACHE).catch(() => {})
    })
  )
  self.skipWaiting()
})

// Limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

// Estrategia: network first, cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copia = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ================================================================
// NOTIFICACIONES PUSH
// ================================================================
self.addEventListener('push', event => {
  let datos = {
    titulo: '✂️ Edwin Barber',
    cuerpo: 'Nueva cita recibida',
    icono: '/edwin-barber/images/logo512.png',
    badge: '/edwin-barber/images/logo512.png',
    url: '/edwin-barber/'
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

// Al tocar la notificación
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