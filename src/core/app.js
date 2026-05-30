import '../css/main.css';
import { stateManager } from '../state/state-manager.js';
import { eventBus } from './event-bus.js';
import { Router } from './router.js';

const routes = [
  { path: '/home',     load: () => import('../pages/home-page.js') },
  { path: '/list',     load: () => import('../pages/list-page.js') },
  { path: '/my-stack', load: () => import('../pages/my-stack-page.js') },
  { path: '/checkin',  load: () => import('../pages/checkin-page.js') },
  { path: '/history',  load: () => import('../pages/history-page.js') },
  { path: '/dosage',   load: () => import('../pages/calculator-page.js') },
  { path: '/profile',  load: () => import('../pages/profile-page.js') },
];

document.addEventListener('DOMContentLoaded', () => {
  // Init state
  if (typeof stateManager.hydrate === 'function') {
    stateManager.hydrate();
  } else if (typeof stateManager.init === 'function') {
    stateManager.init();
  }

  // Init router
  const container = document.querySelector('#router-outlet');
  new Router(routes, container).start();

  // Nav item clicks
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = '#' + btn.dataset.route;
    });
  });

  // Theme toggle
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
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
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  });
});
