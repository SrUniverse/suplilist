/**
 * @fileoverview Ponto de Entrada Central, Fluxo de Boot e Roteamento do SupliList v3.0.
 * Orquestra o carregamento de dados, inicialização do estado global, aplicação de tema,
 * montagem de componentes persistentes do shell (sidebar e top-bar) e escuta de eventos globais.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { logger } from './utils/logger.js';
import { eventBus } from './core/eventbus.js';
import { stateManager } from './core/state-manager.js';
import { supplementRepo } from './features/supplements/supplementRepo.js';
import { Analytics } from './utils/analytics.js';
import { PageRouter } from './core/page-router.js';
import { Sidebar } from './components/sidebar.js';
import { TopBar } from './components/top-bar.js';
import { INVENTORY_URGENT_DAYS } from './utils/constants.js';

// Inicializa globais de UI (Modais Singleton)
import './components/supplement-details-modal.js';

// Importações dos criadores de páginas do SPA
import { createListPage } from './components/list-page.js';
import { createFavoritesPage } from './components/favorites-page.js';
import { createMyStackPage } from './components/my-stack-page.js';
import { createHistoryPage } from './components/history-page.js';
import { createDosageCalculatorPage } from './components/dosage-calculator.js';
import { createHomePage as createDashboardPage } from './components/dashboard-page.js';
import { createLandingPage } from './components/landing-page.js';
import { createSettingsPage } from './components/settings-page.js';
import { createRecipePage } from './components/recipe-page.js';
import { createComparePage } from './components/compare-page.js';
import { createLegalPage } from './components/legal-page.js';
import { notificationScheduler } from './features/settings/notificationScheduler.js';

import { toast } from './components/toast.js';
import { ErrorBoundary } from './core/error-boundary.js';

/**
 * Inicializa a aplicação SupliList v3.0.
 * Orquestra o sequenciamento de boot síncrono e assíncrono.
 * @returns {Promise<void>}
 */
async function init() {
  try {
    // 1. Logger + EventBus prontos (são singletons)
    logger.info('SupliList v3.0 init start');

    // 2. Analytics init
    Analytics.init();

    // 3. StateManager já inicializa no construtor (carrega do localStorage automaticamente)
    logger.info('StateManager initialized');

    // 4. Carrega suplementos na memória
    await supplementRepo.loadAll();
    const suppCount = supplementRepo.getAll().length;
    eventBus.emit('supplements:loaded', { count: suppCount });
    logger.info(`Loaded ${suppCount} supplements`);

    // 5. Aplica tema das settings
    const theme = stateManager.getState('settings.theme') || 'dark';
    document.documentElement.className = theme;

    const routes = {
      '/home':       (container) => createDashboardPage(container),
      '/list':       (container) => createListPage(container),
      '/favorites':  (container) => createFavoritesPage(container),
      '/my-stack':   (container) => createMyStackPage(container),
      '/history':    (container) => createHistoryPage(container),
      '/settings':   (container) => createSettingsPage(container),
      '/dosage':     (container) => createDosageCalculatorPage(container),
      '/legal':      (container) => createLegalPage(container),
      '/':           (container) => createLandingPage(container),
    };

    // 7. Inicializa router
    const router = new PageRouter(routes);
    router.init();
    logger.info('Router initialized');

    // 8. Monta sidebar e top-bar (persistentes)
    const sidebar = new Sidebar('sidebar');
    logger.info('Sidebar mounted');

    const topBar = new TopBar('top-bar');
    logger.info('TopBar mounted');

    // 9. Eventos globais de telemetria, Toasts e inventário
    eventBus.on('router:navigate', ({ route }) => {
      const hashRoute = '#' + (route === '/' ? '/' : route);
      if (sidebar) sidebar.updateActiveRoute(hashRoute);
      if (topBar) topBar.updateBreadcrumb(hashRoute);
      
      // Normaliza a rota para rastreamento de PageView
      const to = route || '/';
      Analytics.trackPageView(to);
      logger.info(`Navigate to ${to}`);
    });

    eventBus.on('toast:show', ({ message, type }) => {
      toast.show(message, type);
    });

    // DT-05: consolida os três eventos de afiliado em um único handler
    const _onAffiliateEvent = ({ supplementId, marketplace }) => {
      Analytics.trackAffiliateClick(supplementId, marketplace);
    };
    eventBus.on('affiliate_click', _onAffiliateEvent);
    eventBus.on('supplement:buy', _onAffiliateEvent);
    eventBus.on('checkout:initiated', _onAffiliateEvent);

    eventBus.on('inventory:urgent', ({ items }) => {
      // Badge no sino
      const badge = document.getElementById('notification-badge');
      if (badge) {
        badge.textContent = items.length;
        badge.classList.remove('hidden');
        badge.style.display = 'inline-flex';
      }
    });

    eventBus.on('component:error', ({ componentName, error }) => {
      logger.error(`Component error: ${componentName}`, error);
      toast.show(`Erro em ${componentName}. Tente recarregar.`, 'danger');
    });

    eventBus.on('cycle:completed', ({ supplementId, adherencePercent }) => {
      Analytics.trackCycleCompletion(supplementId, adherencePercent);
    });

    // 10. Check inventário urgente na inicialização
    checkInventoryUrgent();

    // 10.1 Inicializa agendador de notificações PWA
    notificationScheduler.init();

    // 11. Revela app (remove opacity-0 do body ou define opacity como 1)
    document.body.style.opacity = '1';

    logger.info('SupliList v3.0 initialized successfully');
    
    // 12. Track que app foi aberto (analytics)
    Analytics.trackEvent('app_opened', {
      version: '3.0',
      timestamp: Date.now()
    });

  } catch (err) {
    logger.error('Fatal init error', err);
    document.body.style.opacity = '1';
    document.body.innerHTML = `
      <div style="padding: 40px; color: var(--t1); text-align: center; font-family: 'Inter', sans-serif;">
        <h1 style="font-family: 'Outfit', sans-serif; font-weight: 850; color: var(--danger);">⚠️ Erro ao carregar SupliList</h1>
        <p style="color: var(--t2); margin-top: 10px;">Tente recarregar a página ou limpar o cache do navegador.</p>
        <p style="color: var(--t3); font-size: 12px; margin-top: 20px; font-family: monospace;">
          ${err.message || err}
        </p>
        <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
          Recarregar
        </button>
      </div>
    `;
  }
}

/**
 * Função auxiliar para calcular os dias restantes estimados de um item da stack.
 * @param {Object} item - O item da stack.
 * @returns {number} Dias restantes estimados.
 */
function calculateDaysRemaining(item) {
  return item ? (item.estimatedDaysRemaining !== undefined ? item.estimatedDaysRemaining : 30) : 30;
}

/**
 * Função auxiliar para auditar o inventário e disparar alertas se houver itens críticos.
 * BUG-04: usa INVENTORY_URGENT_DAYS da constante canônica (era hardcoded 5).
 */
function checkInventoryUrgent() {
  const stackData = stateManager.getState('stack') || stateManager.getState('stack.items') || [];
  const stacks = Array.isArray(stackData) ? stackData : (stackData.items || []);
  
  const urgentItems = stacks.filter(item => {
    const daysLeft = calculateDaysRemaining(item);
    return daysLeft <= INVENTORY_URGENT_DAYS;
  });
  
  if (urgentItems.length > 0) {
    eventBus.emit('inventory:urgent', { items: urgentItems });
  }
}

/**
 * Factory interna para páginas "Em Breve" — evita HTML inline em main.js.
 * HIGH-05: extraído das rotas /recipe e /compare.
 * @param {HTMLElement|string} container
 * @param {string} emoji
 * @param {string} title
 * @param {string} description
 * @param {string} [analyticsEvent]
 * @returns {{ destroy: () => void }}
 */
function _createComingSoonPage(container, emoji, title, description, analyticsEvent) {
  const target = (typeof container === 'string'
    ? document.querySelector(container)
    : container) || document.querySelector('#page-content');

  if (!target) return { destroy: () => {} };

  target.innerHTML = `
    <div style="padding:40px; color:var(--t1); text-align:center; min-height:400px;
      display:flex; flex-direction:column; justify-content:center; align-items:center;
      gap:20px; background:var(--bg-card); border:1px solid var(--border);
      border-radius:24px; font-family:'Inter', sans-serif;">
      <span style="font-size:48px;">${emoji}</span>
      <h1 style="font-family:'Outfit', sans-serif; font-weight:850; font-size:24px;
        color:var(--t1); margin:0;">${title}</h1>
      <p style="color:var(--t2); max-width:400px; font-size:13px; line-height:1.6;
        margin:0;">${description}</p>
      <a href="#/list" class="btn-primary" style="text-decoration:none; padding:10px 20px;
        font-size:12px; border-radius:10px; font-weight:700; text-transform:uppercase;">
        Ir para o Catálogo
      </a>
    </div>
  `;

  if (analyticsEvent && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', analyticsEvent);
  }

  return { destroy: () => {} };
}

// BUG-01: guard contra dupla inicialização (DOMContentLoaded + readyState simultâneos)
let _initialized = false;

async function safeInit() {
  if (_initialized) {
    logger.warn('safeInit: tentativa de inicialização duplicada ignorada.');
    return;
  }
  _initialized = true;
  await init();
}

if (document.readyState === 'loading') {
  // DOM ainda não pronto — aguarda o evento
  document.addEventListener('DOMContentLoaded', () => safeInit().catch(err => logger.error('Fatal error during init', err)));
} else {
  // DOM já pronto (script carregado depois do parse)
  safeInit().catch(err => logger.error('Fatal error during init', err));
}

// Export para testes
export { init, checkInventoryUrgent, calculateDaysRemaining };
