/**
 * @fileoverview Service Worker do SupliList v3.0.
 * Implementa cache offline completo, estratégias diferenciadas por tipo de recurso,
 * background sync para check-ins offline, push notifications de recompra e offline fallback page.
 */

const CACHE_VERSION = 'v3.0.0';
const STATIC_CACHE = `suplilist-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `suplilist-dynamic-${CACHE_VERSION}`;
const SUPPLEMENTS_CACHE = `suplilist-supplements-${CACHE_VERSION}`;

// Recursos estáticos fundamentais para o funcionamento offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/src/css/design-system.css',
  '/src/css/main.css',
  '/src/js/main.js',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-dosage.png',
  '/icon-history.png',
  '/screenshot-1.png',
  '/screenshot-2.png',
  '/apple-touch-icon.png'
];

/**
 * Evento de Instalação: Pré-cacheia a casca (App Shell) e a página de fallback offline.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Pré-cacheando App Shell e offline fallback...');
      // Usamos addAll, mas envolvemos em Promise.allSettled ou catch para evitar falha catastrófica caso algum asset não exista na fase de dev.
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Falha ao pré-cachear asset opcional: ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

/**
 * Evento de Ativação: Limpa caches antigos para garantir integridade da versão 3.0.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== SUPPLEMENTS_CACHE
          ) {
            console.log(`[Service Worker] Removendo cache obsoleto: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Auxiliar para determinar se uma requisição é de suplementos (Cache-First).
 * Identifica chamadas ao arquivo database.js, ou endpoints simulados de suplementos.
 */
function isSupplementsRequest(url) {
  return (
    url.pathname.includes('database.js') ||
    url.pathname.includes('supplements') ||
    url.search.includes('supplements')
  );
}

/**
 * Auxiliar para determinar se uma requisição é de dados dinâmicos (Network-First).
 * Identifica dados históricos de check-ins, sincronizações e dados de terceiros.
 */
function isDynamicDataRequest(url) {
  return (
    url.pathname.includes('/api/history') ||
    url.pathname.includes('/api/checkins') ||
    url.pathname.includes('/api/sync') ||
    url.pathname.includes('/share')
  );
}

/**
 * Evento de Interceptação de Requisições (Fetch).
 */
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Apenas intercepta requisições de mesma origem (ou APIs explicitamente suportadas) e método GET
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 1. ESTRATÉGIA CACHE-FIRST: Lista de Suplementos (muda muito raramente)
  if (isSupplementsRequest(requestUrl)) {
    event.respondWith(
      caches.open(SUPPLEMENTS_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Retorna o cache IMEDIATAMENTE, mas faz fetch em background para atualizar (Stale-While-Revalidate)
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {/* silencia falhas offline */});
            return cachedResponse;
          }

          // Se não estiver em cache, faz o fetch normal
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. ESTRATÉGIA NETWORK-FIRST: Dados dinâmicos e históricos (precisa estar em tempo real se online)
  if (isDynamicDataRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[Service Worker] Rede indisponível. Servindo histórico/dados dinâmicos do cache.');
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. ESTRATÉGIA STALE-WHILE-REVALIDATE: Assets estáticos e HTML da aplicação
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza cache em background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* offline */});
        return cachedResponse;
      }

      // Se não encontrou no cache, tenta buscar na rede
      return fetch(event.request)
        .then((networkResponse) => {
          // Salva dinamicamente assets estáticos encontrados
          if (
            networkResponse.status === 200 &&
            (event.request.destination === 'style' ||
              event.request.destination === 'script' ||
              event.request.destination === 'image' ||
              requestUrl.pathname.endsWith('.woff2'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Se for uma navegação HTML falhando offline, entrega a página offline fallback
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            console.log('[Service Worker] Falha na navegação. Retornando offline fallback...');
            return caches.match('/offline.html');
          }
        });
    })
  );
});

/**
 * Evento de Background Sync: Sincroniza check-ins salvos localmente quando a rede volta.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins' || event.tag === 'sync-history') {
    console.log('[Service Worker] Sincronização em background acionada para check-ins/histórico!');
    event.waitUntil(
      // Dispara sinalização para todas as janelas ativas da aplicação para sincronizarem suas filas IndexedDB/localStorage
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_DATA',
            tag: event.tag
          });
        });
      })
    );
  }
});

/**
 * Evento de Push Notifications: Exibe alertas nativos na tela do dispositivo (ex: lembretes de recompra).
 */
self.addEventListener('push', (event) => {
  let data = {
    title: 'SupliList — Lembrete de Suplementação',
    body: 'Hora de tomar sua creatina ou verificar seu estoque!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'recompra-alert',
    data: { url: '/app.html#/history' }
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open_app', title: 'Abrir SupliList' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Evento de Clique na Notificação: Redireciona o usuário para a página correta da notificação.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const destinationUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se já houver uma aba aberta, foca nela e redireciona
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(destinationUrl);
            }
          });
        }
      }
      // Se não houver abas abertas, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(destinationUrl);
      }
    })
  );
});
