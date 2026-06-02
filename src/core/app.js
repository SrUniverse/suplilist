import '../css/main.css';
import { stateManager, STORAGE_KEYS } from '../state/state-manager.js';
import { eventBus, EVENTS } from './event-bus.js';
import { Router } from './router.js';
import { Nav } from './nav.js';
import { analyticsEngine } from '../analytics/analytics-engine.js';
import { StorageManager } from './storage-manager.js';
import './mobile-keyboard-handler.js';
import './mobile-utilities.js';
import './pwa-handler.js';
import './performance-monitor.js';
import NotificationService from '../features/notifications/notification-service.js';


const routes = [
  { path: '/onboarding', load: () => import('../pages/onboarding-page.js') },
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

const PAGE_METADATA = {
  '/onboarding': {
    title: 'Bem-vindo | SupliList',
    description: 'Faça o seu onboarding no SupliList e configure seu perfil de suplementação personalizada.',
    keywords: 'onboarding, cadastro, configurar suplementos'
  },
  '/': {
    title: 'SupliList | Suplementos com Evidência Científica — Compare Preços e Doses',
    description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos na Amazon, Mercado Livre e Shopee. Calcule doses baseadas no seu peso. 100% offline e gratuito.',
    keywords: 'suplementos, creatina, whey protein, vitaminas, comparador de preços, dosagem, suplementação, stack de suplementos'
  },
  '/home': {
    title: 'SupliList | Suplementos com Evidência Científica — Compare Preços e Doses',
    description: 'Compare preços de creatina, whey protein, vitaminas e 57+ suplementos na Amazon, Mercado Livre e Shopee. Calcule doses baseadas no seu peso. 100% offline e gratuito.',
    keywords: 'suplementos, creatina, whey protein, vitaminas, comparador de preços, dosagem, suplementação, stack de suplementos'
  },
  '/list': {
    title: 'Catálogo de Suplementos | SupliList',
    description: 'Veja o catálogo completo com 57+ suplementos esportivos e fitoterápicos. Classificados por Nível de Evidência Científica (Grau A, B, C) e comparação de preços.',
    keywords: 'catalogo de suplementos, whey protein barato, creatina pura, comprar suplementos'
  },
  '/my-stack': {
    title: 'Meu Stack | SupliList',
    description: 'Gerencie seu stack personalizado de suplementos diários. Organize horários, doses e acompanhe seu consumo.',
    keywords: 'stack de suplementos, suplementos diarios, rotina de suplementos'
  },
  '/favorites': {
    title: 'Favoritos | SupliList',
    description: 'Seus suplementos favoritos salvos para rápido acesso, comparação de dosagem e monitoramento de preços.',
    keywords: 'favoritos, suplementos salvos, comparar suplementos'
  },
  '/checkin': {
    title: 'Check-in Diário | SupliList',
    description: 'Registre o seu consumo diário de suplementação. Monitore a consistência do seu stack ao longo do tempo.',
    keywords: 'checkin, consistência treinos, registro diario suplementos'
  },
  '/history': {
    title: 'Histórico | SupliList',
    description: 'Histórico detalhado do seu consumo de suplementação diária, check-ins passados e consistência.',
    keywords: 'historico de suplementos, consumo de creatina, logs de suplementacao'
  },
  '/dosage': {
    title: 'Calculadora de Dosagem | SupliList',
    description: 'Calcule a dosagem diária ideal de creatina, whey protein, cafeína e outros suplementos de acordo com seu peso corporal e nível de treino.',
    keywords: 'dosagem creatina, dose por peso, calcular whey protein, creatina gramas'
  },
  '/profile': {
    title: 'Meu Perfil | SupliList',
    description: 'Gerencie suas informações físicas, peso e preferências de treino para o cálculo automático de dosagem.',
    keywords: 'perfil fisico, calcular dose peso, dados corporais'
  },
  '/settings': {
    title: 'Configurações | SupliList',
    description: 'Ajuste preferências do aplicativo, gerencie dados locais, exporte/importe backups e selecione o tema visual.',
    keywords: 'configuracoes, backup suplementos, exportar dados'
  },
  '/faq': {
    title: 'Perguntas Frequentes | SupliList',
    description: 'Tire suas dúvidas sobre o funcionamento do SupliList, evidências científicas, dosagens e como usá-lo offline.',
    keywords: 'faq suplementos, duvidas creatina, como usar suplilist'
  },
  '/legal': {
    title: 'Termos & Privacidade | SupliList',
    description: 'Leia os termos de uso e a política de privacidade do SupliList. 100% focado em privacidade, sem coleta de dados.',
    keywords: 'termos de uso, privacidade, seguranca dos dados'
  }
};

/**
 * Update SEO metadata (title, description, og:*, twitter:*) based on current route
 * Called on every route change for proper search engine indexing and social sharing
 * @returns {void}
 * @example
 * // On navigation to /list, updates document.title and all meta tags for that page
 */
function updateSEOMetadata() {
  const path = window.location.pathname;
  const meta = PAGE_METADATA[path] || PAGE_METADATA['/'];

  // 1. Atualizar Título
  document.title = meta.title;

  // 2. Atualizar Descrição
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute('content', meta.description);

  // 3. Atualizar Keywords
  const keyEl = document.querySelector('meta[name="keywords"]');
  if (keyEl) keyEl.setAttribute('content', meta.keywords);

  // 4. Atualizar link Canonical
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) {
    canonicalEl.setAttribute('href', `https://suplilist.com${path === '/' ? '' : path}`);
  }

  // 5. Atualizar tags OpenGraph (WhatsApp, Facebook, etc.)
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', `https://suplilist.com${path === '/' ? '' : path}`);

  // 6. Atualizar tags Twitter Card
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', meta.title);

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', meta.description);

  const twitterUrl = document.querySelector('meta[name="twitter:url"]');
  if (twitterUrl) twitterUrl.setAttribute('content', `https://suplilist.com${path === '/' ? '' : path}`);
}

/**
 * Toggle "landing mode" UI — hides app shell (sidebar/topbar) on marketing pages
 * Pages: / (home), /home, /onboarding
 * Adds .body--landing class to <body> for CSS hooks
 * @returns {void}
 */
function applyLandingMode() {
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home' || path === '/onboarding';
  document.body.classList.toggle('body--landing', isLanding);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar IndexedDB (não bloqueia, mas prepara para uso)
  StorageManager.init().catch(e => {
    console.warn('[App] IndexedDB init falhou, usando fallback:', e);
  });

  // State is initialized in the StateManager constructor (_initializeState reads from localStorage).
  // Do NOT call hydrate() here — hydrate(undefined) merges with DEFAULT_STATE, wiping user data.

  Nav.init();
  Nav.updateActive(window.location.pathname);

  // Landing mode (initial + on every navigation)
  applyLandingMode();
  updateSEOMetadata();
  window.addEventListener('popstate', () => {
    applyLandingMode();
    updateSEOMetadata();
    // Nav.updateActive is already called by router.js handleRoute() — no duplicate needed
    const isLanding = window.location.pathname === '/' || window.location.pathname === '/home' || window.location.pathname === '/onboarding';
    isLanding ? Nav.hide() : Nav.show();
  });

  // Init router
  const container = document.querySelector('#router-outlet');
  const router = new Router(routes, container);

  // P10: Navegação programática via EventBus em vez de window.__router
  // Uso: eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/home' })
  eventBus.on(EVENTS.ROUTER_NAVIGATE, ({ path } = {}) => {
    if (path) router.navigate(path);
  });

  router.start();

  // Initialize Analytics Engine (captures events from EventBus)
  analyticsEngine.init().catch((err) => {
    // Analytics errors should not crash the app
    console.error('[App] Analytics init error:', err);
  });

  // Restaurar tema salvo
  const savedTheme = StorageManager.getItem(STORAGE_KEYS.THEME) || StorageManager.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Theme toggle — sidebar (#btn-theme) e mobile topbar (#btn-theme-mobile)
  function _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    StorageManager.setItem(STORAGE_KEYS.THEME, next);
    const themeIcon = next === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const btnTheme = document.getElementById('btn-theme');
    const btnThemeMobile = document.getElementById('btn-theme-mobile');
    if (btnTheme) btnTheme.querySelector('.sb-item__icon').innerHTML = themeIcon;
    // Update mobile topbar icon without replacing the button element itself
    const mobileIconEl = btnThemeMobile?.querySelector('svg') ?? btnThemeMobile;
    if (mobileIconEl && mobileIconEl !== btnThemeMobile) {
      mobileIconEl.outerHTML = themeIcon; // replace just the svg
    } else if (btnThemeMobile) {
      btnThemeMobile.innerHTML = themeIcon; // fallback (no nested svg yet)
    }
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

  // Toast events — both 'toast:show' (pages) and 'ui:toastRequested' (stateManager/profile)
  function _showToast({ message, type = 'info', duration = 3000 }) {
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
  }
  eventBus.on('toast:show', _showToast);
  eventBus.on('ui:toastRequested', _showToast); // stateManager.dispatch(ACTIONS.SHOW_TOAST) + profile-page legacy

  // L3 FIX: Ouvir mensagens do Service Worker (Navegação via Push e Sync offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data) return;

      if (event.data.type === 'ROUTER_NAVIGATE' && event.data.url) {
        try {
          const url = new URL(event.data.url, window.location.origin);
          // Extrai o hash path se aplicável (ex: /#/history) ou o pathname
          const path = url.hash ? url.hash.slice(1) : url.pathname;
          eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: path || '/' });
        } catch (_) {
          // Fallback seguro se falhar ao analisar URL
          eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/' });
        }
      } else if (event.data.type === 'SYNC_OFFLINE_DATA') {
        eventBus.emit(EVENTS.SYNC_STARTED);
        eventBus.emit('toast:show', { message: 'Sincronizando dados offline...', type: 'info', duration: 2000 });
        
        try {
          // Re-sincronizar o estado disparando leitura de localStorage
          if (typeof stateManager._setupStorageSync === 'function') {
            stateManager._setupStorageSync();
          }
          eventBus.emit(EVENTS.SYNC_COMPLETED);
          eventBus.emit('toast:show', { message: 'Dados atualizados em segundo plano!', type: 'success', duration: 2500 });
        } catch (err) {
          eventBus.emit(EVENTS.SYNC_FAILED);
        }
      }
    });
  }

  // L3 notifications and streak tracking integration
  const notifService = new NotificationService();
  
  // Initial check on app startup
  try {
    notifService.checkAndTriggerDailyReminder(stateManager.state);
    notifService.checkAndTriggerLowStockAlerts(stateManager.state);
  } catch (err) {
    console.error('[App] Initial notifications check failed:', err);
  }

  // Subscribe to state changes to handle streak milestones and low-stock alerts dynamically
  stateManager.subscribe((state, action) => {
    try {
      notifService.checkAndTriggerStreakMilestones(state);
      if (action && (action.type?.includes('CHECKIN') || action.type?.includes('STACK') || action.type?.includes('QUANTITY'))) {
        notifService.checkAndTriggerLowStockAlerts(state);
      }
    } catch (err) {
      console.error('[App] Notification subscriber error:', err);
    }
  });

  // L3 query string shared stack auto-import integration
  const urlParams = new URLSearchParams(window.location.search);
  const sharedStack = urlParams.get('stack');
  if (sharedStack) {
    try {
      const decoded = decodeURIComponent(escape(atob(sharedStack)));
      const stackItems = JSON.parse(decoded);
      if (Array.isArray(stackItems) && stackItems.length > 0) {
        setTimeout(() => {
          if (confirm(`Deseja importar o stack compartilhado com ${stackItems.length} suplemento(s)? Isso substituirá sua rotina atual.`)) {
            stateManager.dispatch('IMPORT_STACK', stackItems);
            eventBus.emit('toast:show', { message: 'Stack importado com sucesso!', type: 'success' });
            
            // Clean up URL parameters safely
            const newUrl = window.location.pathname;
            window.history.replaceState(null, null, newUrl);
            
            // Re-route to my-stack to show imported items
            if (window.location.pathname !== '/my-stack') {
              eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/my-stack' });
            }
          } else {
            // Clean up parameter to avoid prompt on page refresh
            const newUrl = window.location.pathname;
            window.history.replaceState(null, null, newUrl);
          }
        }, 800);
      }
    } catch (e) {
      console.error('[App] Shared stack parsing failed:', e);
    }
  }

  // Flush analytics before page unload
  window.addEventListener('beforeunload', () => {
    if (analyticsEngine.isInitialized()) {
      analyticsEngine.flush().catch(() => {
        // Silently ignore flush errors on unload
      });
      analyticsEngine.endSession().catch(() => {
        // Silently ignore session end errors on unload
      });
    }
  });
});

