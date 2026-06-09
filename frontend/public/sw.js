/**
 * Service Worker — Enables offline functionality and push notifications
 * Implements Stale-While-Revalidate caching strategy
 */

const CACHE_NAME = 'suplilist-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - Stale-While-Revalidate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, then cache
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first, then network
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Default - stale while revalidate
  event.respondWith(staleWhileRevalidateStrategy(request));
});

/**
 * Network first strategy for API requests
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fall back to cache
    const cached = await caches.match(request);
    if (cached) {
      console.log(`Serving from cache (offline): ${request.url}`);
      return cached;
    }
    return new Response('Offline - resource not cached', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Cache first strategy for static assets
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const responseToCache = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return response;
  } catch (error) {
    return new Response('Resource not found', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

/**
 * Stale while revalidate strategy
 */
async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') {
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, responseToCache));
    }
    return response;
  }).catch(() => {
    // If network fails, return cached version or undefined
    return cached;
  });

  return cached || fetchPromise;
}

/**
 * Check if URL is static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.endsWith(ext));
}

/**
 * Smart notification check - fetch pending notifications from backend
 */
async function checkPendingNotifications(userId) {
  try {
    const response = await fetch(`/api/notifications/pending?userId=${userId}`);
    const data = await response.json();

    if (data.success && data.notifications?.length > 0) {
      for (const notif of data.notifications) {
        await self.registration.showNotification(notif.title, {
          body: notif.body,
          tag: notif.tag,
          icon: '/assets/icon-192x192.png',
          badge: '/assets/badge-72x72.png',
          data: notif.data
        });

        // Track notification sent
        await trackNotificationEvent(notif.id, 'sent');
      }
    }
  } catch (error) {
    console.error('[SW] Error checking pending notifications:', error);
  }
}

/**
 * Track notification engagement events
 */
async function trackNotificationEvent(notificationId, action) {
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, action })
    });
  } catch (error) {
    console.error('[SW] Error tracking notification:', error);
  }
}

/**
 * Push notification event
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'SupliList';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    tag: data.tag || 'notification',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Notification click event - handle auto check-in + tracking
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  const notificationId = notificationData.id;

  // Track notification opened
  if (notificationId) {
    trackNotificationEvent(notificationId, 'opened');
  }

  // If it's a daily reminder, guide to check-in
  if (notificationData.type === 'daily_reminder') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Send message to app to open check-in
        clientList.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            supplementId: notificationData.supplementId,
            supplementName: notificationData.supplementName,
            action: 'check-in'
          });
        });

        // Focus or open window to check-in page
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/app/checkin');
      })
    );
  } else if (notificationData.type === 'milestone') {
    // Milestone - show celebration page
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/app/history');
      })
    );
  } else {
    // Other notifications - just focus or open home
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/app');
      })
    );
  }
});

/**
 * Message event - handle messages from app
 */
self.addEventListener('message', (event) => {
  const { type, title, options } = event.data;

  if (type === 'SEND_NOTIFICATION') {
    self.registration.showNotification(title, options);
  } else if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Periodic background sync for offline queue
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_QUEUE'
          });
        });
      })
    );
  }
});

console.log('Service Worker ready');
