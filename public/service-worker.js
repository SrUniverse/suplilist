// ============================================================
// Service Worker v4 — SupliList PWA
// Strategy: Cache-first for assets, Network-first for data
// ============================================================

const CACHE_VERSION = 'suplilist-v4.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/src/css/design-system.css',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-dosage.png',
  '/icon-history.png'
];

// INSTALL: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          const isCurrentCache = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE, IMAGE_CACHE].includes(key);
          if (!isCurrentCache) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: Smart routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  if (isStaticAsset(request)) { event.respondWith(cacheFirstStrategy(request)); return; }
  if (url.pathname.startsWith('/api/')) { event.respondWith(networkFirstStrategy(request)); return; }
  if (request.destination === 'image') { event.respondWith(staleWhileRevalidate(request)); return; }
  if (request.mode === 'navigate') { event.respondWith(navigationStrategy(request)); return; }

  event.respondWith(networkFirstStrategy(request));
});

// BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') event.waitUntil(syncCheckins());
  if (event.tag === 'sync-stack') event.waitUntil(syncStack());
});

// PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SupliList', {
      body: data.message ?? 'Nova notificação',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'suplilist',
      actions: data.actions ?? [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          const found = clientList.find(c => c.url.startsWith('/app.html') && 'focus' in c);
          return found ? found.focus() : self.clients.openWindow('/app.html');
        })
    );
  }
});

// ---- Strategy helpers ----

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    return caches.match(request) ?? offlineResponse();
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const clone = response.clone();
      caches.open(DATA_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? offlineResponse();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(r => {
    if (r.status === 200) caches.open(IMAGE_CACHE).then(c => c.put(request, r.clone()));
    return r;
  });
  return cached ?? fetchPromise;
}

async function navigationStrategy(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('/offline.html')) ?? offlineResponse();
  }
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return ['font', 'script', 'style'].includes(request.destination)
    || url.pathname.startsWith('/assets/')
    || url.pathname.endsWith('.woff2');
}

function offlineResponse() {
  return new Response(
    JSON.stringify({ error: 'Offline', code: 'OFFLINE' }),
    { status: 503, headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' } }
  );
}

async function syncCheckins() {
  // Read pending checkins from IndexedDB and POST to /api/checkins/sync
  // Implementation filled in Sprint 4 (CheckinStreakSystem)
  console.log('[SW] Sync checkins placeholder');
}

async function syncStack() {
  console.log('[SW] Sync stack placeholder');
}

console.log('[SW] Service Worker v4 loaded');
