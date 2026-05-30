// ============================================================
// app.js — Core Bootstrapper v4.0
// Usa EXCLUSIVAMENTE a API real do stateManager:
//   stateManager.dispatch({ type, payload })
//   stateManager.hydrate(saved)
//   stateManager.export()
//   stateManager.subscribe(fn)
//   stateManager.calculateStreak()
//   stateManager.getTodayCheckins()
//   getters: .user .stack .checkins .preferences
// ============================================================

// CSS — Vite processa @tailwind e design-system em um único bundle
import '../css/main.css';

import { eventBus, EVENTS } from './event-bus.js';
import { stateManager, ACTIONS, STORAGE_KEY } from './state-manager.js';
import { Router } from './router.js';

const APP_VERSION = '4.0.0';
// STORAGE_KEY importado do state-manager — fonte canônica única
const DEBUG = location.hostname === 'localhost';

// ── Boot ──────────────────────────────────────────────────────

async function init() {
  console.log(`[App] SupliList v${APP_VERSION} starting...`);

  try {
    // 1. Tema inicial (sem FOUC)
    applyTheme();

    // 2. Hidratação assíncrona formal para garantir sincronização do ciclo de vida
    await hydrateState();

    // 3. Listeners de conectividade e Service Worker
    registerConnectivityListeners();
    registerServiceWorker();

    // 4. Montar router (renderiza primeira página)
    await mountRouter();

    // 5. Serviços pesados diferidos
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => initHeavyServices(), { timeout: 3000 });
    } else {
      setTimeout(initHeavyServices, 3000);
    }

    // 6. Remover loading screen
    revealApp();

    console.log('[App] Initialized ✅');
    eventBus.emit(EVENTS.APP_READY, { version: APP_VERSION });

  } catch (err) {
    console.error('[App] Fatal init error:', err);
    showFatalError(err);
  }
}

// ── Tema ──────────────────────────────────────────────────────

function applyTheme() {
  const theme = stateManager.preferences?.theme || localStorage.getItem('suplilist:theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

// ── State Hydration ───────────────────────────────────────────

async function hydrateState() {
  console.log('[App] Hydrating state...');
  return new Promise((resolve) => {
    // Sincroniza o tema com as preferências do StateManager
    const theme = stateManager.preferences?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Registra listener no StateManager para reagir de forma reativa e instantânea
    // a qualquer alteração de tema (p. ex., cliques no botão de tema ou via dispatch)
    stateManager.subscribe('preferences.theme', (newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('suplilist:theme', newTheme);
    });

    eventBus.emit(EVENTS.STATE_REHYDRATED, stateManager.export());
    
    // Pequeno microtask delay para assegurar inicialização estável
    setTimeout(resolve, 0);
  });
}

// ── Service Worker ────────────────────────────────────────────

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] Registered:', reg.scope);

          // Escuta por novos Service Workers que estão sendo instalados
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Uma nova versão está disponível e aguardando ativação (skipWaiting)
                  console.log('[SW] Nova versão detectada.');
                  
                  // Dispara o TOAST para o usuário
                  eventBus.emit(EVENTS.TOAST_REQUESTED, {
                    message: 'Nova versão disponível. Clique para atualizar.',
                    type: 'success',
                    duration: 10000,
                    action: () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  });
                }
              }
            });
          });

          // Verifica se há novas atualizações a cada 60s
          setInterval(() => {
            reg.update();
          }, 60000);
        })
        .catch(err => console.warn('[SW] Registration failed:', err));
    });

    // Recarrega a página inteira quando o novo SW assume o controle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

// ── Connectivity ──────────────────────────────────────────────

function registerConnectivityListeners() {
  window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    eventBus.emit(EVENTS.APP_ONLINE);
  });
  window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    eventBus.emit(EVENTS.APP_OFFLINE);
  });
  if (!navigator.onLine) document.body.classList.add('offline');
}

// ── Router ────────────────────────────────────────────────────

async function mountRouter() {
  const routes = [
    { path: '/home',     load: () => import('../pages/home-page.js') },
    { path: '/list',     load: () => import('../pages/list-page.js') },
    { path: '/my-stack', load: () => import('../pages/my-stack-page.js') },
    { path: '/checkin',  load: () => import('../pages/checkin-page.js') },
    { path: '/profile',  load: () => import('../pages/profile-page.js') },
    { path: '/history',  load: () => import('../pages/history-page.js') },
    { path: '/stack',    load: () => import('../pages/stack-page.js') },
    { path: '/dosage',   load: () => import('../pages/calculator-page.js') },
  ];

  // Bottom nav: set hash → hashchange → Router handles the rest
  document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = btn.dataset.route; });
  });

  // Side-effects on every navigation: scroll reset, aria-current, state sync
  window.addEventListener('hashchange', () => {
    const path = location.hash.replace(/^#\/?/, '/') || '/home';
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.scrollTop = 0;
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.setAttribute('aria-current', el.dataset.route === path ? 'page' : 'false');
    });
    stateManager.dispatch({ type: ACTIONS.SET_ROUTE, payload: { route: path } });
    eventBus.emit(EVENTS.ROUTE_CHANGED, { path });
  });

  const router = new Router('#router-outlet', routes);
  router.init();
}

// ── Heavy services (deferred) ─────────────────────────────────

async function initHeavyServices() {
  try {
    await import('../ai/stack-recommender.js');
    console.log('[App] AI engine ready');
  } catch (e) {
    console.warn('[App] AI engine unavailable:', e);
  }
}

// ── Toast ─────────────────────────────────────────────────────

function initToast() {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const showToastFn = ({ message, type = 'info', duration = 3000, action = null }) => {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type} ${type}`;
    
    if (action && typeof action === 'function') {
      toast.style.cursor = 'pointer';
      toast.textContent = `${message} 🔄`;
      toast.addEventListener('click', () => {
        action();
        toast.remove();
      });
    } else {
      toast.textContent = message;
    }
    
    container.appendChild(toast);
    
    const timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s';
      setTimeout(() => toast.remove(), 300);
    }, duration);

    if (action) {
      toast.addEventListener('click', () => clearTimeout(timer));
    }
  };

  eventBus.on(EVENTS.TOAST_REQUESTED, showToastFn);
  eventBus.on(EVENTS.TOAST_SHOW, showToastFn);
}

// ── Theme toggle ──────────────────────────────────────────────

function initThemeToggle() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = stateManager.preferences?.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    stateManager.dispatch(ACTIONS.SET_THEME, { theme: next });
  });
}

// ── Reveal app ────────────────────────────────────────────────

function revealApp() {
  initToast();
  initThemeToggle();
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.3s';
    setTimeout(() => loading.remove(), 300);
  }
}

// ── Fatal error ───────────────────────────────────────────────

function showFatalError(err) {
  document.body.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;background:#0A0A0A;color:#F5F5F5;font-family:sans-serif;text-align:center;">
      <div style="font-size:40px;">⚠️</div>
      <h1 style="font-size:20px;font-weight:700;">Erro ao iniciar</h1>
      <p style="color:#888;font-size:14px;max-width:300px;line-height:1.5;">${err?.message || 'Erro desconhecido'}</p>
      ${DEBUG ? `<pre style="font-size:11px;color:#555;max-width:400px;text-align:left;overflow:auto;">${err?.stack || ''}</pre>` : ''}
      <button onclick="location.reload()" style="background:#7C3AED;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;">Recarregar</button>
    </div>
  `;
}

// ── Start ─────────────────────────────────────────────────────
init();
