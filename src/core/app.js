import '../css/main.css';
import { stateManager, STORAGE_KEYS } from '../state/state-manager.js';
import { eventBus } from './event-bus.js';
import { Router } from './router.js';
import { Nav } from './nav.js';

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

  Nav.init();
  Nav.updateActive(window.location.pathname);

  // Landing mode (initial + on every navigation)
  applyLandingMode();
  updatePageTitle();
  window.addEventListener('popstate', () => {
    applyLandingMode();
    updatePageTitle();
    Nav.updateActive(window.location.pathname);
    const isLanding = window.location.pathname === '/' || window.location.pathname === '/home';
    isLanding ? Nav.hide() : Nav.show();
  });

  // Init router
  const container = document.querySelector('#router-outlet');
  const router = new Router(routes, container);
  router.start();

  // Expor o router globalmente para uso nos data-nav
  window.__router = router;

  // Restaurar tema salvo
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || localStorage.getItem('theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  // Theme toggle — sidebar (#btn-theme) e mobile topbar (#btn-theme-mobile)
  function _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    const themeIcon = next === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const btnTheme = document.getElementById('btn-theme');
    const btnThemeMobile = document.getElementById('btn-theme-mobile');
    if (btnTheme) btnTheme.querySelector('.sb-item__icon').innerHTML = themeIcon;
    if (btnThemeMobile) btnThemeMobile.innerHTML = themeIcon;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-theme') || e.target.closest('#btn-theme-mobile')) {
      _toggleTheme();
    }
  });

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
