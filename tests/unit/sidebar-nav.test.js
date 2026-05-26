import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SidebarNav } from '../../src/js/components/sidebar-nav.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { inventoryRepo } from '../../src/js/features/inventory/inventoryRepo.js';

describe('SidebarNav', () => {
  let navContainer;
  let mockRouter;
  let sidebarNav;
  let sidebarEl;
  let hamburgerBtn;
  let addBtn;

  beforeEach(() => {
    // Reseta EventBus
    eventBus.clearHistory();
    eventBus.subscribers.clear();

    // Cria elementos mock no DOM
    document.body.innerHTML = `
      <div id="sidebar" class="sidebar">
        <div class="sidebar-logo">⚡ SupliList</div>
        <div class="sidebar-subtitle">Precision Management</div>
        <nav id="sidebar-nav" class="sidebar-nav"></nav>
        <button id="btn-theme-toggle">🌐 TEMA</button>
        <div id="sidebar-overlay" style="display: none;"></div>
        <div class="sidebar-add-btn">
          <button id="add-supplement-btn">+ Add Supplement</button>
        </div>
      </div>
      <button id="btn-hamburger" style="display: none;">☰</button>
      <div id="topbar-breadcrumb">Home</div>
    `;

    navContainer = document.getElementById('sidebar-nav');
    sidebarEl = document.getElementById('sidebar');
    hamburgerBtn = document.getElementById('btn-hamburger');
    addBtn = document.getElementById('add-supplement-btn');

    // Mock do PageRouter
    mockRouter = {
      getCurrentRoute: vi.fn().mockReturnValue('/list'),
      navigate: vi.fn()
    };

    sidebarNav = new SidebarNav(navContainer, mockRouter);
  });

  afterEach(() => {
    sidebarNav.destroy();
    document.body.innerHTML = '';
  });

  it('deve montar a barra de navegação com os 7 links canônicos', () => {
    sidebarNav.mount();
    
    const items = navContainer.querySelectorAll('.nav-item');
    expect(items.length).toBe(7);

    const labels = Array.from(items).map(el => el.querySelector('.nav-label').textContent);
    expect(labels).toEqual(['Início', 'Lista', 'Minha Stack', 'Favoritos', 'Receita', 'Dosagem', 'Comparar']);
  });

  it('deve marcar "/list" como ativo inicialmente com base no router', () => {
    sidebarNav.mount();
    
    const activeItem = navContainer.querySelector('.nav-item.active');
    expect(activeItem).not.toBeNull();
    expect(activeItem.getAttribute('data-route')).toBe('/list');
  });

  it('deve navegar programaticamente ao clicar em um item de navegação', () => {
    sidebarNav.mount();

    const homeItem = navContainer.querySelector('[data-id="home"]');
    homeItem.click();

    expect(mockRouter.navigate).toHaveBeenCalledWith('/home');
  });

  it('deve atualizar reativamente o item ativo quando "router:navigate" é disparado', () => {
    sidebarNav.mount();

    eventBus.emit('router:navigate', { route: '/favorites' });

    const activeItem = navContainer.querySelector('.nav-item.active');
    expect(activeItem.getAttribute('data-route')).toBe('/favorites');

    const breadcrumb = document.getElementById('topbar-breadcrumb');
    expect(breadcrumb.textContent.trim()).toContain('Favoritos');
  });

  it('deve atualizar o badge textual de um item específico da sidebar via updateBadge()', () => {
    sidebarNav.mount();

    sidebarNav.updateBadge('my-stack', '5 items');

    const myStackItem = navContainer.querySelector('[data-id="my-stack"]');
    const badge = myStackItem.querySelector('.nav-badge');

    expect(badge.style.display).not.toBe('none');
    expect(badge.textContent).toBe('5 items');

    // Deve ocultar quando o valor for nulo/falsy
    sidebarNav.updateBadge('my-stack', null);
    expect(badge.style.display).toBe('none');
  });

  it('deve recalcular e exibir reativamente o badge de "My Stack" ao disparar atualizações de inventário', () => {
    vi.spyOn(inventoryRepo, 'getAll').mockReturnValue({
      'creatina': { qty: 200, supplement: { id: 'creatina', name: 'Creatina' } },
      'whey': { qty: 100, supplement: { id: 'whey', name: 'Whey' } }
    });

    sidebarNav.mount();

    // Simula evento de atualização
    eventBus.emit('inventory:updated', { supplementId: 'creatina', qty: 200, purchaseDate: '2026-05-23' });

    const myStackItem = navContainer.querySelector('[data-id="my-stack"]');
    const badge = myStackItem.querySelector('.nav-badge');

    expect(badge.style.display).not.toBe('none');
    expect(badge.textContent).toBe('2');
  });

  it('deve alternar a classe "open" no drawer lateral ao clicar no botão hambúrguer mobile', () => {
    sidebarNav.mount();

    expect(sidebarEl.classList.contains('open')).toBe(false);

    hamburgerBtn.click();
    expect(sidebarEl.classList.contains('open')).toBe(true);

    hamburgerBtn.click();
    expect(sidebarEl.classList.contains('open')).toBe(false);
  });

  it('deve fechar a gaveta mobile (remover "open") ao clicar em um item de navegação', () => {
    sidebarNav.mount();

    sidebarEl.classList.add('open');
    expect(sidebarEl.classList.contains('open')).toBe(true);

    const settingsItem = navContainer.querySelector('[data-id="home"]');
    settingsItem.click();

    expect(sidebarEl.classList.contains('open')).toBe(false);
  });

  it('deve fechar a gaveta mobile ao clicar no overlay', () => {
    sidebarNav.mount();

    sidebarEl.classList.add('open');
    expect(sidebarEl.classList.contains('open')).toBe(true);

    const overlay = document.getElementById('sidebar-overlay');
    overlay.click();
    expect(sidebarEl.classList.contains('open')).toBe(false);
  });
});
