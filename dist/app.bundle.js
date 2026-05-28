/**
 * @fileoverview Coração da reatividade do SupliList v2.0.
 * Implementa o padrão Pub/Sub (EventBus) desacoplado para comunicação entre componentes e serviços,
 * com rastreabilidade de histórico e tolerância de falhas.
 */

import { logger } from '../utils/logger.js';

class EventBus {
  /**
   * Construtor do barramento de eventos.
   */
  constructor() {
    /**
     * Mapa de assinantes por tipo de evento.
     * @private
     * @type {Map<string, Set<Function>>}
     */
    this.subscribers = new Map();

    /**
     * Histórico de eventos recentes (limite de 100).
     * @private
     * @type {Array<{ eventType: string, payload: any, timestamp: number }>}
     */
    this.history = [];

    /**
     * Limite de tamanho do histórico.
     * @private
     * @type {number}
     */
    this._maxHistorySize = 100;
  }

  /**
   * Registra um ouvinte para um tipo específico de evento.
   * @param {string} eventType - Nome do evento.
   * @param {Function} handler - Função callback executada ao emitir o evento.
   * @returns {() => void} Função de desinscrição (unsubscribe) segura.
   */
  on(eventType, handler) {
    if (typeof eventType !== 'string' || !eventType.trim()) {
      logger.warn('EventBus.on: eventType deve ser uma string não-vazia.');
      return () => {};
    }
    if (typeof handler !== 'function') {
      logger.warn('EventBus.on: handler deve ser uma função.');
      return () => {};
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(handler);

    return () => this.off(eventType, handler);
  }

  /**
   * Remove a inscrição de um ouvinte para um tipo de evento.
   * @param {string} eventType - Nome do evento.
   * @param {Function} handler - Referência do callback a ser removido.
   * @returns {void}
   */
  off(eventType, handler) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(handler);
    }
  }

  /**
   * Emite um evento para todos os ouvintes registrados.
   * @param {string} eventType - Nome do evento a ser disparado.
   * @param {any} payload - Dados transmitidos para os ouvintes do evento.
   * @returns {void}
   */
  emit(eventType, payload) {
    if (typeof eventType !== 'string' || !eventType.trim()) {
      logger.error('EventBus.emit: eventType inválido (deve ser string não-vazia).');
      return;
    }

    // Registra no histórico com controle FIFO de capacidade
    this.history.push({ eventType, payload, timestamp: Date.now() });
    if (this.history.length > this._maxHistorySize) {
      this.history.shift();
    }

    const handlers = this.subscribers.get(eventType);
    if (!handlers || handlers.size === 0) return;

    // Dispara cada um dos handlers em ambiente controlado
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        logger.error(`Falha no manipulador do evento "${eventType}":`, err);

        // Previne loops infinitos se falhar dentro do próprio fluxo de erro do sistema
        if (eventType !== 'error:system') {
          this.emit('error:system', {
            originalEvent: eventType,
            payload: payload,
            error: err.message,
            stack: err.stack,
          });
        }
      }
    });
  }

  /**
   * Obtém o histórico de eventos recentes do barramento.
   * @param {string} [eventType] - Nome opcional do evento para filtragem rápida.
   * @returns {Array<{ eventType: string, payload: any, timestamp: number }>} Lista de logs.
   */
  getHistory(eventType) {
    if (eventType) {
      return this.history.filter((item) => item.eventType === eventType);
    }
    return [...this.history];
  }

  /**
   * Limpa permanentemente o histórico de eventos do barramento.
   * @returns {void}
   */
  clearHistory() {
    this.history = [];
  }
}

export const eventBus = new EventBus();

/*
======================================================================
TESTES INLINE PARA VALIDAÇÃO MANUAL NO CONSOLE / AMBIENTE DEV:
======================================================================
// const unsub = eventBus.on('test', (p) => console.log('Recebido:', p));
// eventBus.emit('test', { msg: 'hello' }); // Console exibe: Recebido: { msg: 'hello' }
// unsub();
// eventBus.emit('test', { msg: 'world' }); // Silencioso — não deve aparecer nada.
======================================================================
*/

/**
 * @fileoverview Cérebro do SupliList v2.0.
 * Gerenciador de estado global imutável com persistência reativa,
 * observadores de caminhos (path observers) e integração com o EventBus.
 */

import { eventBus } from './eventbus.js';
import { AppStateSchema, DEFAULT_STATE } from '../types/state.schema.js';
import { STORAGE_KEY } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { parseJSON } from '../utils/parsers.js';

/**
 * Aplica Object.freeze recursivamente para garantir imutabilidade estrita.
 * @param {any} object 
 * @returns {any} O mesmo objeto congelado.
 */
function deepFreeze(object) {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    Object.keys(object).forEach(key => {
      if (typeof object[key] === 'object' && object[key] !== null) {
        deepFreeze(object[key]);
      }
    });
  }
  return object;
}

class StateManager {
  /**
   * Construtor do StateManager.
   */
  constructor() {
    /**
     * Mapa de observadores registrados por caminho (path).
     * @private
     * @type {Map<string, Set<Function>>}
     */
    this.observers = new Map();

    /**
     * Fila síncrona para serializar requisições de estado, prevenindo Race Conditions.
     * @private
     * @type {Array<Function>}
     */
    this._updateQueue = [];
    this._isUpdating = false;

    /**
     * Estado global atual (imutável e estritamente congelado em tempo de execução).
     * @private
     * @type {import('../types/state.schema.js').AppState}
     */
    this.state = deepFreeze(this._initializeState());

    this._setupStorageListener();
  }

  /**
   * Monitora alterações externas no localStorage (ex: o usuário apagou o cache).
   * @private
   */
  _setupStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          logger.warn('Detecção de alteração externa no localStorage. Realizando re-hydrate...');
          try {
            const newState = this._initializeState();
            this.state = deepFreeze(newState);
            eventBus.emit('state:rehydrated', { fullState: this.exportState() });
          } catch (err) {
            logger.error('Falha crítica ao tentar recuperar o estado após corrupção de storage:', err);
          }
        }
      });
    }
  }

  /**
   * Inicializa o estado lendo da persistência local (localStorage) com fallback seguro.
   * @private
   * @returns {import('../types/state.schema.js').AppState} O estado validado inicial.
   */
  _initializeState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        logger.info('Nenhum estado anterior encontrado no armazenamento. Inicializando com dados padrão.');
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }

      const parsed = parseJSON(stored);
      const validated = AppStateSchema.validate(parsed);

      if (validated.isValid) {
        return validated.data;
      } else {
        logger.warn('Estado recuperado inválido estruturalmente. Aplicando fallback de segurança.', validated.errors);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    } catch (err) {
      logger.error('Falha crítica ao ler do localStorage. Aplicando fallback de segurança.', err);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  /**
   * Obtém o clone imutável do estado completo ou de um subcaminho específico.
   * @param {string} [path] - Caminho em notação de pontos (ex: "inventory.creatina-mono").
   * @returns {any} Cópia imutável do fragmento do estado ou todo o estado.
   */
  getState(path) {
    const stateClone = JSON.parse(JSON.stringify(this.state));
    if (!path) return stateClone;

    const parts = path.split('.');
    const value = parts.reduce((acc, part) => (acc ? acc[part] : undefined), stateClone);
    
    return value !== undefined ? JSON.parse(JSON.stringify(value)) : undefined;
  }

  /**
   * Atualiza de forma imutável um subcaminho do estado global da aplicação.
   * Utiliza Mutex/Fila síncrona para evitar race conditions.
   *
   * @param {string} path - Caminho em notação de pontos (ex: "favorites", "settings.theme").
   * @param {any} value - Novo valor a ser setado no caminho especificado.
   * @param {{ strict?: boolean }} [options] - Opções de validação.
   * @returns {void}
   */
  setState(path, value, { strict = true } = {}) {
    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('StateManager.setState: O caminho do estado deve ser uma string válida.');
    }

    // Enfileira a atualização para evitar concorrência
    this._updateQueue.push(() => this._applySetState(path, value, strict));
    this._processQueue();
  }

  /**
   * Processa a fila de atualizações de estado sequencialmente.
   * @private
   */
  _processQueue() {
    if (this._isUpdating || this._updateQueue.length === 0) return;
    
    this._isUpdating = true;
    while (this._updateQueue.length > 0) {
      const updateFn = this._updateQueue.shift();
      try {
        updateFn();
      } catch (err) {
        logger.error('Erro na fila de atualização de estado:', err);
      }
    }
    this._isUpdating = false;
  }

  /**
   * Executa fisicamente a transição de estado.
   * @private
   */
  _applySetState(path, value, strict) {
    const parts = path.split('.');
    const newState = JSON.parse(JSON.stringify(this.state)); // unfreeze for mutation

    let current = newState;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    // Aplica o novo valor de forma isolada
    current[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));

    // Valida a integridade total do novo estado gerado
    const validated = AppStateSchema.validate(newState);
    if (!validated.isValid) {
      const errorMsg = `Transição de Estado Recusada: ${validated.errors.join('; ')}`;
      if (strict) {
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else {
        // Modo leniente: apenas avisa, não aplica o estado inválido
        logger.warn(`[StateManager/lenient] ${errorMsg}`);
        return;
      }
    }

    this.state = deepFreeze(validated.data);
    this._persistToStorage();

    // Notificações em cadeia de reatividade
    eventBus.emit('state:changed', {
      path,
      value: JSON.parse(JSON.stringify(value)),
      fullState: this.exportState(),
    });

    this._notifyObservers(path, value);
  }

  /**
   * Registra um callback observador para ser ativado em mudanças de um caminho específico do estado.
   * @param {string} path - Caminho do estado a ser vigiado.
   * @param {Function} callback - Callback reativo (recebe o novo valor).
   * @returns {() => void} Função de cancelamento do observador (unsubscribe).
   */
  observe(path, callback) {
    if (typeof path !== 'string' || typeof callback !== 'function') {
      logger.warn('StateManager.observe: argumentos inválidos.');
      return () => {};
    }

    if (!this.observers.has(path)) {
      this.observers.set(path, new Set());
    }
    this.observers.get(path).add(callback);

    return () => {
      const pathSet = this.observers.get(path);
      if (pathSet) {
        pathSet.delete(callback);
        if (pathSet.size === 0) {
          this.observers.delete(path);
        }
      }
    };
  }

  /**
   * Exporta uma cópia totalmente desacoplada e profunda do estado global atual.
   * @returns {import('../types/state.schema.js').AppState} Cópia profunda.
   */
  exportState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Importa e sobrescreve todo o estado ativo com validação prévia estrutural de dados.
   * @param {any} data - O objeto contendo o novo estado global.
   * @returns {void}
   * @throws {Error} Lança exceção de validação caso o estado importado falhe no schema.
   */
  importState(data) {
    const validated = AppStateSchema.validate(data);
    if (!validated.isValid) {
      throw new Error(`Falha ao importar estado global: ${validated.errors.join('; ')}`);
    }

    this.state = deepFreeze(validated.data);
    this._persistToStorage();

    eventBus.emit('state:imported', {
      state: this.exportState(),
    });

    // Notifica todos os observadores sobre a redefinição global do estado
    this.observers.forEach((callbacks, path) => {
      const newValue = this.getState(path);
      callbacks.forEach((cb) => {
        try {
          cb(newValue);
        } catch (err) {
          logger.error(`Falha no observador importado para o caminho "${path}":`, err);
        }
      });
    });
  }

  /**
   * Salva o estado corrente de forma persistente no armazenamento síncrono local (localStorage).
   * @private
   * @returns {void}
   */
  _persistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      logger.error('Falha física de escrita no localStorage (Persistência):', err);
      eventBus.emit('error:persistence', {
        error: err.message || 'localStorage write failed',
      });
    }
  }

  /**
   * Notifica todos os callbacks assinados no caminho exato de modificação.
   * @private
   * @param {string} changedPath - O caminho de estado modificado.
   * @param {any} value - O novo valor da ramificação.
   * @returns {void}
   */
  _notifyObservers(changedPath, value) {
    // 1. Notifica os observadores diretos do caminho exato
    const directCallbacks = this.observers.get(changedPath);
    if (directCallbacks) {
      directCallbacks.forEach((cb) => {
        try {
          cb(JSON.parse(JSON.stringify(value)));
        } catch (err) {
          logger.error(`Falha no observador para o caminho "${changedPath}":`, err);
        }
      });
    }

    // 2. Notifica observadores de caminhos superiores (ex: observa "inventory" e muda "inventory.creatina")
    this.observers.forEach((callbacks, path) => {
      if (changedPath.startsWith(path + '.') && path !== changedPath) {
        const newValue = this.getState(path);
        callbacks.forEach((cb) => {
          try {
            cb(newValue);
          } catch (err) {
            logger.error(`Falha no observador hierárquico para o caminho "${path}":`, err);
          }
        });
      }
    });
  }
}

export const stateManager = new StateManager();

/**
 * @fileoverview Roteador Single Page Application (SPA) baseado em hash para o SupliList v3.0.
 * Gerencia o histórico de rotas, ciclo de vida das páginas (montagem, desmontagem/cleanup),
 * persistência no armazenamento local e reatividade integrada via EventBus.
 * Projetado para navegação síncrona instantânea com sincronização de URL assíncrona.
 */

import { logger } from '../utils/logger.js';
import { eventBus } from './eventbus.js';

export class PageRouter {
  /**
   * Inicializa o roteador com a configuração de rotas e seus respectivos construtores de página.
   * @param {Record<string, () => any>} routes - Mapa de rotas e criadores (ex: { '/list': createListPage }).
   */
  constructor(routes = {}) {
    /**
     * Mapa de rotas registradas.
     * @type {Record<string, () => any>}
     */
    this.routes = routes;

    /**
     * Instância da página ativa atual.
     * Utilizada para acionar os métodos de cleanup e evitar vazamentos de memória.
     * @type {any}
     */
    this.currentPageInstance = null;

    /**
     * Rota anteriormente ativa (ou atualmente renderizada).
     * @private
     * @type {string | null}
     */
    this._previousRoute = null;

    // Vincula o listener do hashchange ao escopo da classe de forma persistente
    this._boundHashChange = this._onHashChange.bind(this);
  }

  /**
   * Inicializa o roteador SPA, registrando ouvintes de eventos e carregando a rota inicial.
   * Recupera automaticamente a última rota salva no localStorage em caso de recarregamento.
   * @returns {void}
   */
  init() {
    window.addEventListener('hashchange', this._boundHashChange);
    logger.info('🧭 PageRouter inicializado com sucesso.');

    let initialRoute = this.getCurrentRoute();

    // Se o usuário carregar a raiz ('/') ou uma rota desconhecida, tenta carregar o localStorage ou envia ao catálogo
    if (initialRoute === '/' || !this._validateRoute(initialRoute)) {
      const savedRoute = localStorage.getItem('suplilist:current-route');
      if (savedRoute && this._validateRoute(savedRoute)) {
        initialRoute = savedRoute;
      } else {
        initialRoute = '/list';
      }
    }

    // Dispara a navegação inicial
    this.navigate(initialRoute);
  }

  /**
   * Executa a navegação programática para uma determinada rota de forma limpa.
   * Altera o hash do navegador, o que consequentemente dispara o evento de renderização.
   * @param {string} route - Rota destino (ex: '/list' ou 'list').
   * @returns {void}
   */
  navigate(route) {
    if (typeof route !== 'string') return;

    // Normaliza a rota garantindo a formatação padrão
    let cleanRoute = route.trim();
    if (!cleanRoute.startsWith('/')) {
      cleanRoute = '/' + cleanRoute;
    }

    // 1. Renderiza a rota de forma síncrona imediatamente para responsividade máxima e estabilidade nos testes
    if (this._previousRoute !== cleanRoute) {
      if (this._validateRoute(cleanRoute)) {
        this._renderRoute(cleanRoute);
      } else {
        logger.warn(`PageRouter: Rota "${cleanRoute}" inválida. Forçando redirecionamento para /list.`);
        cleanRoute = '/list';
        this._renderRoute('/list');
      }
    }

    // 2. Atualiza o hash do window para que a URL do browser fique sincronizada
    const targetHash = '#' + cleanRoute;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  /**
   * Retorna a rota atual extraída a partir do hash do navegador, devidamente formatada.
   * @returns {string} Rota ativa (ex: '/list').
   */
  getCurrentRoute() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return '/';

    let route = hash.slice(1); // Remove o '#'
    if (!route.startsWith('/')) {
      route = '/' + route;
    }

    return route;
  }

  /**
   * Ouvinte privado do evento de mudança de hash ('hashchange') do navegador.
   * Garante o funcionamento correto dos botões de retroceder/avançar (back/forward) do browser.
   * @private
   * @returns {void}
   */
  _onHashChange() {
    const route = this.getCurrentRoute();

    // Se o hashchange foi disparado mas a rota já é a mesma que acabamos de renderizar síncronamente, ignoramos
    if (route === this._previousRoute) {
      return;
    }

    if (this._validateRoute(route)) {
      this._renderRoute(route);
    } else {
      logger.warn(`PageRouter: Rota "${route}" não encontrada no hashchange. Redirecionando para /list.`);
      this.navigate('/list');
    }
  }

  /**
   * Método privado encarregado de executar a transição cirúrgica das páginas no DOM.
   * Efetua o cleanup da página antiga, renderiza a nova, atualiza o estado local e emite os eventos no EventBus.
   * @private
   * @param {string} route - Rota a ser montada.
   * @returns {void}
   */
  _renderRoute(route) {
    logger.info(`🧭 PageRouter: Navegando para a rota "${route}"...`);

    // 1. Executa o cleanup preventivo da página anterior para limpar listeners e toasts
    if (this.currentPageInstance) {
      try {
        if (typeof this.currentPageInstance.destroy === 'function') {
          this.currentPageInstance.destroy();
        } else if (typeof this.currentPageInstance.cleanup === 'function') {
          this.currentPageInstance.cleanup();
        }
      } catch (err) {
        logger.error('PageRouter: Falha no cleanup da página anterior:', err);
      }
      this.currentPageInstance = null;
    }

    // 2. Registra o histórico interno de transição
    const previous = this._previousRoute;
    this._previousRoute = route;

    // 3. Monta a nova página a partir do criador registrado, limpando o contêiner
    try {
      const container = document.querySelector('#page-content');
      if (container) {
        container.innerHTML = ''; // Limpeza crítica exigida pela arquitetura
      }
      const pageCreator = this.routes[route];
      if (typeof pageCreator === 'function') {
        this.currentPageInstance = pageCreator(container);
      }
    } catch (err) {
      logger.error(`PageRouter: Falha catastrófica ao criar página para "${route}":`, err);
    }

    // 4. Persiste a rota atual no armazenamento local
    localStorage.setItem('suplilist:current-route', route);

    // Rola a página de volta ao topo no roteamento
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    // 5. Emite o evento global reativo para atualização dos Breadcrumbs e destaque da Sidebar
    eventBus.emit('router:navigate', {
      route,
      previousRoute: previous
    });
  }

  /**
   * Método privado auxiliar para validar a existência da rota mapeada no construtor.
   * @private
   * @param {string} route - Rota a verificar.
   * @returns {boolean} True se a rota é válida e mapeada.
   */
  _validateRoute(route) {
    return typeof this.routes[route] === 'function';
  }

  /**
   * Destrói a escuta de eventos do roteador e limpa as instâncias de página ativas de forma segura.
   * @returns {void}
   */
  destroy() {
    window.removeEventListener('hashchange', this._boundHashChange);

    if (this.currentPageInstance) {
      try {
        if (typeof this.currentPageInstance.destroy === 'function') {
          this.currentPageInstance.destroy();
        } else if (typeof this.currentPageInstance.cleanup === 'function') {
          this.currentPageInstance.cleanup();
        }
      } catch (err) {
        logger.error('PageRouter.destroy: Erro no cleanup final:', err);
      }
      this.currentPageInstance = null;
    }

    logger.info('🧭 PageRouter destruído com sucesso.');
  }
}

/**
 * @fileoverview Ponto de Entrada Central, Fluxo de Boot e Roteamento do SupliList v3.0.
 * Orquestra o carregamento de dados, inicialização do estado global, aplicação de tema,
 * montagem de componentes persistentes do shell (sidebar e top-bar) e escuta de eventos globais.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import '../css/design-system.css';
import '../css/main.css';

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
      '/home': (container) => createDashboardPage(container),
      '/list': (container) => createListPage(container),
      '/favorites': (container) => createFavoritesPage(container),
      '/my-stack': (container) => createMyStackPage(container),
      '/history': (container) => createHistoryPage(container),
      '/settings': (container) => createSettingsPage(container),
      '/dosage': (container) => createDosageCalculatorPage(container),
      '/legal': (container) => createLegalPage(container),
      '/': (container) => createLandingPage(container),
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

  if (!target) return { destroy: () => { } };

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

  return { destroy: () => { } };
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
