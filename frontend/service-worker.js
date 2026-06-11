/**
 * @fileoverview Service Worker do SupliList v4.0.
 * Implementa cache offline completo, estratégias diferenciadas por tipo de recurso,
 * background sync para check-ins offline, push notifications de recompra e offline fallback page.
 */

const CACHE_VERSION = 'v4.0.1';
const STATIC_CACHE = `suplilist-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `suplilist-dynamic-${CACHE_VERSION}`;
const SUPPLEMENTS_CACHE = `suplilist-supplements-${CACHE_VERSION}`;

// O Vite PWA injetará o manifesto de pré-cache (Self.__WB_MANIFEST) contendo todas as rotas em hash magicamente aqui durante o build
const MANIFEST_ASSETS = self.__WB_MANIFEST || [];
const STATIC_ASSETS = MANIFEST_ASSETS.map(asset => asset.url || asset).concat(['/']);

/**
 * Evento de Instalação: Pré-cacheia a casca (App Shell) e a página de fallback offline.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Pré-cacheando App Shell e offline fallback...');
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
    url.pathname.includes('/api/checkin') ||
    url.pathname.includes('/api/sync') ||
    url.pathname.includes('/share')
  );
}

/**
 * Auxiliar para determinar se uma requisição é de dados de usuário (Stale-While-Revalidate).
 * Identifica rotas críticas de leitura que precisam estar disponíveis offline:
 * - /api/profile/me (perfil do usuário)
 * - /api/stack (stack de suplementos do usuário)
 * - /api/favorites (favoritos salvos)
 * - /api/settings/me (configurações do usuário)
 */
function isUserDataRequest(url) {
  return (
    url.pathname.startsWith('/api/profile/me') ||
    url.pathname.startsWith('/api/stack') ||
    url.pathname.startsWith('/api/favorites') ||
    url.pathname.startsWith('/api/settings/me')
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

  // 0. NETWORK-ONLY: Bypass absoluto para rotas de autenticação
  // Nunca fazer cache de /api/auth/me para evitar account takeover ou falhas de hidratação.
  if (requestUrl.pathname.startsWith('/api/auth/')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        // Se a rede falhar, não caia no cache, apenas falhe (ou lance 503 local)
        return new Response('', { status: 503, statusText: 'Service Unavailable (Offline)' });
      })
    );
    return;
  }

  // 1. ESTRATÉGIA CACHE-FIRST: Lista de Suplementos (muda muito raramente)
  if (isSupplementsRequest(requestUrl)) {
    event.respondWith(
      caches.open(SUPPLEMENTS_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
            }).catch(() => { });
            return cachedResponse;
          }

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

  // 2. ESTRATÉGIA NETWORK-FIRST: Dados dinâmicos e históricos
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
          return caches.match(event.request).then(
            cached => cached || new Response('', { status: 503 })
          );
        })
    );
    return;
  }

  // 2.5 ESTRATÉGIA STALE-WHILE-REVALIDATE: Dados de usuário (GET /api/profile/me, /api/stack, etc.)
  //
  // Invariantes:
  //   • Se há cache: serve imediatamente, revalida em background.
  //   • Se não há cache + rede disponível: aguarda rede e armazena no cache.
  //   • Se não há cache + offline: retorna 503 estruturado.
  //     O apiFetch lança ApiError(503, 'offline') → profile-page.js usa stateManager.user como fallback.
  //     O resultado é nunca uma Promise resolvendo para undefined.
  if (isUserDataRequest(requestUrl)) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Revalida em background — resultado ignorado se já servimos o cache.
          const networkPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Rede indisponível. Se já servimos o cache acima, este resultado é ignorado.
              // Se não há cache (cold start offline), retorna 503 estruturado para que
              // o apiFetch lance ApiError em vez de resolver para undefined.
              return new Response(
                JSON.stringify({ success: false, error: 'offline', message: 'Dispositivo offline' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });

          // Stale: serve cache imediatamente se disponível;
          // enquanto isso, networkPromise atualiza o cache em background.
          return cachedResponse || networkPromise;
        });
      })
    );
    return;
  }

  // 3. ESTRATÉGIA STALE-WHILE-REVALIDATE: Assets estáticos e HTML
  event.respondWith(
    // ignoreSearch garante que requisições de atalhos (ex: /?source=pwa) encontrem a raiz '/' no cache
    caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' }).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, networkResponse.clone()));
            }
          })
          .catch(() => { });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
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
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match('/').then(cached => cached || new Response('', { status: 503 }));
          }
          return new Response('', { status: 503 });
        });
    })
  );
});

/**
 * Evento de Background Sync: Sincroniza offline check-ins.
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins' || event.tag === 'sync-history') {
    event.waitUntil(
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
 * Evento de Push Notifications.
 */
self.addEventListener('push', (event) => {
  let data = {
    title: 'SupliList — Lembrete de Suplementação',
    body: 'Hora de tomar sua creatina ou verificar seu estoque!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'recompra-alert',
    data: { url: '/#/history' }
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
 * Evento de Clique na Notificação.
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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Em uma SPA, em vez de recarregar a página inteira com client.navigate(),
            // enviamos uma mensagem em background para o router atualizar a visão instantaneamente.
            client.postMessage({ type: 'ROUTER_NAVIGATE', url: destinationUrl });
            return client;
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destinationUrl);
      }
    })
  );
});

/**
 * Evento para escutar mensagens enviadas pelos clientes (ex: SKIP_WAITING).
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

