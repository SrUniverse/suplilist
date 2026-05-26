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
