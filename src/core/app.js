import '../css/main.css';
import { stateManager, STORAGE_KEYS } from '../state/state-manager.js';
import { eventBus } from './event-bus.js';
import { Router } from './router.js';

const routes = [
  { path: '/',          load: () => import('../pages/home-page.js') },
  { path: '/home',      load: () => import('../pages/home-page.js') },
  { path: '/list',      load: () => import('../pages/list-page.js') },
  { path: '/my-stack',  load: () => import('../pages/my-stack-page.js') },
  { path: '/checkin',   load: () => import('../pages/checkin-page.js') },
  { path: '/history',   load: () => import('../pages/history-page.js') },
  { path: '/favorites', load: () => import('../pages/favorites-page.js') },
  { path: '/dosage',    load: () => import('../pages/calculator-page.js') },
  { path: '/profile',   load: () => import('../pages/profile-page.js') },
  { path: '/settings',  load: () => import('../pages/settings-page.js') },
  { path: '/faq',       load: () => import('../pages/faq-page.js') },
  { path: '/legal',     load: () => import('../pages/legal-page.js') },
];

const PAGE_TITLES = {
  '/':          'SupliList | Suplementação Baseada em Evidências',
  '/home':      'SupliList | Suplementação Baseada em Evidências',
  '/list':      'Catálogo de Suplementos | SupliList',
  '/my-stack':  'Meu Stack | SupliList',
  '/favorites': 'Favoritos | SupliList',
  '/checkin':   'Check-in Diário | SupliList',
  '/history':   'Histórico | SupliList',
  '/dosage':    'Calculadora de Dosagem | SupliList',
  '/profile':   'Meu Perfil | SupliList',
  '/settings':  'Configurações | SupliList',
  '/faq':       'Perguntas Frequentes | SupliList',
  '/legal':     'Termos & Privacidade | SupliList',
};

function updatePageTitle() {
  const path = window.location.pathname;
  document.title = PAGE_TITLES[path] || 'SupliList | Suplementação Baseada em Evidências';
}

// Landing mode: hide app shell (sidebar/topbar) on the marketing home
function applyLandingMode() {
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home';
  document.body.classList.toggle('body--landing', isLanding);
}

document.addEventListener('DOMContentLoaded', () => {
  // Init state
  if (typeof stateManager.hydrate === 'function') {
    stateManager.hydrate();
  } else if (typeof stateManager.init === 'function') {
    stateManager.init();
  }

  // Landing mode (initial + on every navigation)
  applyLandingMode();
  updatePageTitle();
  window.addEventListener('popstate', () => {
    applyLandingMode();
    updatePageTitle();
  });

  // Init router
  const container = document.querySelector('#router-outlet');
  const router = new Router(routes, container);
  router.start();

  // Expor o router globalmente para uso nos data-nav
  window.__router = router;

  // Nav item clicks — migrado de data-route (hash) para pathname
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.route;
      window.history.pushState(null, null, path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });

  // Theme toggle
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
    });
  }

  // Hide loading screen
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => { loading.style.display = 'none'; }, 300);
  }

  // Toast events
  eventBus.on('toast:show', ({ message, type = 'info', duration = 3000 }) => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  });
});
