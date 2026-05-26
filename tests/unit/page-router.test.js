import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PageRouter } from '../../src/js/core/page-router.js';
import { eventBus } from '../../src/js/core/eventbus.js';

describe('PageRouter', () => {
  let router;
  let listPageCreator;
  let favoritesPageCreator;
  let listPageInstance;
  let favoritesPageInstance;

  beforeEach(() => {
    // Reseta o EventBus e o localStorage
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    localStorage.clear();
    window.location.hash = '';

    // Cria mocks para os page instances
    listPageInstance = {
      destroy: vi.fn(),
      cleanup: vi.fn()
    };
    favoritesPageInstance = {
      destroy: vi.fn(),
      cleanup: vi.fn()
    };

    // Cria mocks para os page creators
    listPageCreator = vi.fn().mockReturnValue(listPageInstance);
    favoritesPageCreator = vi.fn().mockReturnValue(favoritesPageInstance);

    // Inicializa o roteador com rotas mapeadas
    router = new PageRouter({
      '/list': listPageCreator,
      '/favorites': favoritesPageCreator
    });
  });

  afterEach(() => {
    router.destroy();
  });

  it('deve inicializar e carregar a rota padrão "/list" se nenhuma rota estiver ativa', () => {
    router.init();
    expect(window.location.hash).toBe('#/list');
    expect(listPageCreator).toHaveBeenCalled();
    expect(localStorage.getItem('suplilist:current-route')).toBe('/list');
  });

  it('deve restaurar a rota do localStorage se o hash inicial for vazio ou inválido', () => {
    localStorage.setItem('suplilist:current-route', '/favorites');
    router.init();
    expect(window.location.hash).toBe('#/favorites');
    expect(favoritesPageCreator).toHaveBeenCalled();
  });

  it('deve suportar navegação programática por hash via navigate()', () => {
    router.init();
    listPageCreator.mockClear();

    router.navigate('/favorites');
    expect(window.location.hash).toBe('#/favorites');
    expect(favoritesPageCreator).toHaveBeenCalled();
    expect(localStorage.getItem('suplilist:current-route')).toBe('/favorites');
  });

  it('deve redirecionar para a rota "/list" caso uma rota desconhecida seja acessada', () => {
    router.init();
    listPageCreator.mockClear();

    router.navigate('/unknown-route');
    expect(window.location.hash).toBe('#/list');
    expect(listPageCreator).toHaveBeenCalled();
  });

  it('deve emitir o evento "router:navigate" no EventBus ao trocar de rota', () => {
    const navigateListener = vi.fn();
    eventBus.on('router:navigate', navigateListener);

    router.init(); // Dispara inicialização que navega para /list
    expect(navigateListener).toHaveBeenCalledWith({
      route: '/list',
      previousRoute: null
    });

    navigateListener.mockClear();
    router.navigate('/favorites');
    expect(navigateListener).toHaveBeenCalledWith({
      route: '/favorites',
      previousRoute: '/list'
    });
  });

  it('deve executar o cleanup (.destroy() ou .cleanup()) da página anterior durante a transição', () => {
    router.init(); // Renderiza /list
    expect(listPageInstance.destroy).not.toHaveBeenCalled();

    router.navigate('/favorites'); // Transiciona para /favorites
    expect(listPageInstance.destroy).toHaveBeenCalled(); // .destroy() da página anterior deve ser chamado
  });

  it('deve dar fallback para .cleanup() caso o controlador da página não possua .destroy()', () => {
    const pageInstanceWithCleanupOnly = { cleanup: vi.fn() };
    const alternativeCreator = vi.fn().mockReturnValue(pageInstanceWithCleanupOnly);

    router = new PageRouter({
      '/list': listPageCreator,
      '/cleanup-page': alternativeCreator
    });
    router.init(); // Renderiza /list

    router.navigate('/cleanup-page'); // Transiciona para /cleanup-page
    expect(listPageInstance.destroy).toHaveBeenCalled();

    router.navigate('/list'); // Transiciona de volta para /list
    expect(pageInstanceWithCleanupOnly.cleanup).toHaveBeenCalled(); // .cleanup() deve ser acionado
  });

  it('deve lidar com o evento window "hashchange" para retroceder e avançar no navegador', async () => {
    router.init();
    listPageCreator.mockClear();

    // Altera o hash diretamente simulando ação de retroceder/avançar do navegador
    window.location.hash = '#/favorites';
    
    // Dispara manualmente o evento no escopo simulado para garantir execução rápida no ambiente de testes
    const hashEvent = new Event('hashchange');
    window.dispatchEvent(hashEvent);

    expect(favoritesPageCreator).toHaveBeenCalled();
    expect(localStorage.getItem('suplilist:current-route')).toBe('/favorites');
  });
});
