export class TopBar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.breadcrumbsMap = {
      '#/home': 'Início',
      '#/list': 'Catálogo',
      '#/my-stack': 'Minha Stack',
      '#/favorites': 'Favoritos',
      '#/history': 'Histórico',
      '#/dosage': 'Calculadora',
      '#/settings': 'Configurações',
      '#/legal': 'Termos e FAQ'
    };
    this.currentHash = window.location.hash || '#/';
    this.render();
  }

  updateBreadcrumb(hash) {
    this.currentHash = hash;
    const title = this.breadcrumbsMap[hash] || 'SupliList';
    const breadcrumbEl = this.container.querySelector('.breadcrumb-current');
    if (breadcrumbEl) {
      breadcrumbEl.textContent = title;
    }
  }

  render() {
    const title = this.breadcrumbsMap[this.currentHash] || 'SupliList';
    
    this.container.innerHTML = `
      <div class="breadcrumb" style="opacity: 0;">
        <!-- Espaço reservado se necessário -->
      </div>
      <div class="top-actions flex items-center gap-4">
        <button id="btn-top-history" class="text-zinc-400 hover:text-white transition-colors" aria-label="Histórico de Adesão">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </button>
        <button id="btn-top-stack" class="text-zinc-400 hover:text-white transition-colors relative" aria-label="Notificações de Estoque">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span id="notification-badge" class="hidden absolute top-0 right-0 bg-brand-primary text-white text-[9px] font-bold px-1 rounded-full transform translate-x-1/2 -translate-y-1/2">0</span>
        </button>
        <button id="btn-top-profile" class="text-zinc-400 hover:text-white transition-colors" aria-label="Perfil">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </button>
      </div>
    `;

    // Listeners diretos de navegação como solicitado na REQUISITO 2
    this.container.querySelector('#btn-top-history').addEventListener('click', () => window.location.hash = '#/history');
    this.container.querySelector('#btn-top-stack').addEventListener('click', () => window.location.hash = '#/my-stack');
    this.container.querySelector('#btn-top-profile').addEventListener('click', () => window.location.hash = '#/settings');
  }
}
