import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TopBar } from '../../src/js/components/top-bar.js';
import { eventBus } from '../../src/js/core/eventbus.js';
import { inventoryRepo } from '../../src/js/features/inventory/inventoryRepo.js';

describe('TopBar', () => {
  let topBarContainer;
  let topBar;
  let sidebarEl;

  beforeEach(() => {
    // Reseta o EventBus e o hash
    eventBus.clearHistory();
    eventBus.subscribers.clear();
    window.location.hash = '';

    // Cria elementos mock no DOM
    document.body.innerHTML = `
      <header id="top-bar">
        <div class="topbar-left">
          <span class="breadcrumb" id="breadcrumb">Home</span>
        </div>
        <div class="topbar-right">
          <button id="notification-btn" class="btn-icon" aria-label="Notificações">🔔</button>
          <button id="dashboard-btn" class="btn-icon" aria-label="Dashboard">📊</button>
          <button id="profile-btn" class="btn-icon" aria-label="Perfil">👤</button>
          <button id="hamburger-btn" class="btn-icon hamburger" aria-label="Menu" style="display: none;">☰</button>
        </div>
      </header>
      <div id="sidebar" class="sidebar"></div>
    `;

    topBarContainer = document.getElementById('top-bar');
    sidebarEl = document.getElementById('sidebar');

    topBar = new TopBar(topBarContainer);
  });

  afterEach(() => {
    topBar.destroy();
    document.body.innerHTML = '';
  });

  it('deve montar o cabeçalho e escutar cliques nos botões de ação', () => {
    topBar.mount();
    
    // Verifica cliques e mudança de hash
    const notificationBtn = document.getElementById('notification-btn');
    notificationBtn.click();
    expect(window.location.hash).toBe('#/my-stack');

    const dashboardBtn = document.getElementById('dashboard-btn');
    dashboardBtn.click();
    expect(window.location.hash).toBe('#/history');

    const profileBtn = document.getElementById('profile-btn');
    profileBtn.click();
    expect(window.location.hash).toBe('#/settings');
  });

  it('deve atualizar o breadcrumb manualmente via setBreadcrumb()', () => {
    topBar.mount();

    topBar.setBreadcrumb('Home / Teste');
    const breadcrumb = document.getElementById('breadcrumb');
    expect(breadcrumb.textContent).toBe('Home / Teste');
  });

  it('deve atualizar reativamente o breadcrumb ao receber o evento "router:navigate"', () => {
    topBar.mount();

    eventBus.emit('router:navigate', { route: '/list' });
    const breadcrumb = document.getElementById('breadcrumb');
    expect(breadcrumb.textContent).toBe('Home / Catálogo');

    eventBus.emit('router:navigate', { route: '/dosage' });
    expect(breadcrumb.textContent).toBe('Home / Calculadora');

    eventBus.emit('router:navigate', { route: '/my-stack' });
    expect(breadcrumb.textContent).toBe('Home / Meu Protocolo');
  });

  it('deve criar e exibir o badge de notificação via setNotificationBadge()', () => {
    topBar.mount();

    topBar.setNotificationBadge(3);
    const notificationBtn = document.getElementById('notification-btn');
    const badge = notificationBtn.querySelector('.notification-badge');

    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('3');
    expect(badge.classList.contains('hidden')).toBe(false);

    // Oculta ao passar 0
    topBar.setNotificationBadge(0);
    expect(badge.classList.contains('hidden')).toBe(true);
  });

  it('deve atualizar o badge reativamente ao receber o evento "inventory:urgent"', () => {
    topBar.mount();

    eventBus.emit('inventory:urgent', {
      supplements: [
        { id: 'creatina', daysLeft: 2 },
        { id: 'whey', daysLeft: 5 }
      ]
    });

    const notificationBtn = document.getElementById('notification-btn');
    const badge = notificationBtn.querySelector('.notification-badge');

    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('2');
  });

  it('deve recalcular e exibir reativamente o badge ao disparar "inventory:updated"', () => {
    vi.spyOn(inventoryRepo, 'checkUrgent').mockReturnValue({
      items: [
        { supplementId: 'creatina', daysLeft: 2 },
        { supplementId: 'whey', daysLeft: 5 },
        { supplementId: 'cafeina', daysLeft: 0 }
      ],
      hasUrgent: true
    });

    topBar.mount();

    eventBus.emit('inventory:updated', { supplementId: 'creatina', qty: 20, purchaseDate: '2026-05-23' });

    const notificationBtn = document.getElementById('notification-btn');
    const badge = notificationBtn.querySelector('.notification-badge');

    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('3');
  });

  it('deve alternar a classe "open" no sidebar móvel ao clicar no hambúrguer', () => {
    topBar.mount();

    expect(sidebarEl.classList.contains('open')).toBe(false);

    const hamburgerBtn = document.getElementById('hamburger-btn');
    hamburgerBtn.click();
    expect(sidebarEl.classList.contains('open')).toBe(true);

    hamburgerBtn.click();
    expect(sidebarEl.classList.contains('open')).toBe(false);
  });
});
