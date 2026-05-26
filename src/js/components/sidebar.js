import { stateManager } from '../core/state-manager.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';

export class Sidebar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isCollapsed = window.innerWidth <= 1024;
    this.currentHash = window.location.hash || '#/';
    this.render();
    this.attachEvents();
  }

  updateActiveRoute(hash) {
    this.currentHash = hash;
    this.render(); // Re-render to ensure badges and active classes are computed and updated correctly
    this.attachEvents();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const sidebarEl = document.getElementById('sidebar');
    if (this.isCollapsed) {
      sidebarEl.classList.add('collapsed');
    } else {
      sidebarEl.classList.remove('collapsed');
    }
  }

  render() {
    let totalSuppCount = 57;
    try {
      totalSuppCount = supplementRepo.getAll().length;
    } catch(e) {}

    const stackData = stateManager.getState('stack') || stateManager.getState('stack.items') || [];
    const stackCount = Array.isArray(stackData) ? stackData.length : (stackData.items || []).length;

    this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">SupliList</div>
        <button id="sidebar-toggle" class="btn-icon" aria-label="Toggle Sidebar">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>
      <nav class="sidebar-nav">
        <a href="#/" class="nav-item ${this.currentHash === '#/' ? 'active' : ''}">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">Início</span>
        </a>
        <a href="#/list" class="nav-item ${this.currentHash === '#/list' ? 'active' : ''}" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Lista</span>
          </div>
          <span class="nav-badge" style="font-size: 10px; font-weight: 700; background: rgba(255, 255, 255, 0.1); color: var(--t2); padding: 2px 6px; border-radius: 9999px;">${totalSuppCount}</span>
        </a>
        <a href="#/my-stack" class="nav-item ${this.currentHash === '#/my-stack' ? 'active' : ''}" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <span class="nav-icon">💊</span>
            <span class="nav-label">Meu Stack</span>
          </div>
          <span class="nav-badge" style="font-size: 10px; font-weight: 700; background: rgba(255, 255, 255, 0.1); color: var(--t2); padding: 2px 6px; border-radius: 9999px;">${stackCount}</span>
        </a>
        <a href="#/favorites" class="nav-item ${this.currentHash === '#/favorites' ? 'active' : ''}">
          <span class="nav-icon">❤️</span>
          <span class="nav-label">Favoritos</span>
        </a>
        <a href="#/history" class="nav-item ${this.currentHash === '#/history' ? 'active' : ''}">
          <span class="nav-icon">🕒</span>
          <span class="nav-label">Histórico</span>
        </a>
        <a href="#/dosage" class="nav-item ${this.currentHash === '#/dosage' ? 'active' : ''}">
          <span class="nav-icon">⚖️</span>
          <span class="nav-label">Dosagem</span>
        </a>
        <a href="#/settings" class="nav-item ${this.currentHash === '#/settings' ? 'active' : ''}">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Configurações</span>
        </a>
      </nav>
      
      <div class="sidebar-footer" style="padding: 16px; border-top: 1px solid var(--border-light); margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 10px; color: var(--t3); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; display: block;">TEMA</span>
        <div class="theme-selector" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="theme-btn" data-theme="dark" title="Dark" style="width: 24px; height: 24px; border-radius: 50%; background: #050505; border: 2px solid var(--border-light); cursor: pointer; transition: transform 0.2s;"></button>
          <button class="theme-btn" data-theme="light" title="Light" style="width: 24px; height: 24px; border-radius: 50%; background: #ffffff; border: 2px solid var(--border-light); cursor: pointer; transition: transform 0.2s;"></button>
          <button class="theme-btn" data-theme="midnight" title="Midnight" style="width: 24px; height: 24px; border-radius: 50%; background: #0b1120; border: 2px solid var(--border-light); cursor: pointer; transition: transform 0.2s;"></button>
          <button class="theme-btn" data-theme="neon" title="Neon Cyberpunk" style="width: 24px; height: 24px; border-radius: 50%; background: #1a0b2e; border: 2px solid #a855f7; cursor: pointer; transition: transform 0.2s;"></button>
        </div>
      </div>
    `;
    
    // Default collapsed state
    if (this.isCollapsed) {
      document.getElementById('sidebar').classList.add('collapsed');
    }
  }

  attachEvents() {
    const toggleBtn = this.container.querySelector('#sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleCollapse());
    }

    // Auto collapse em mobile após clicar
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 640) {
          // Em mobile, mantemos a lógica que desejar (ex: fechar dropdown se houvesse)
        }
      });
    });

    // Eventos dos botões de tema
    const themeBtns = this.container.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedTheme = e.target.dataset.theme;
        stateManager.setState('settings.theme', selectedTheme);
        document.documentElement.className = selectedTheme;
        
        // Efeito visual ativo
        themeBtns.forEach(b => b.style.transform = 'scale(1)');
        e.target.style.transform = 'scale(1.2)';
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth <= 1024 && !this.isCollapsed) {
        this.isCollapsed = true;
        document.getElementById('sidebar').classList.add('collapsed');
      } else if (window.innerWidth > 1024 && this.isCollapsed) {
        this.isCollapsed = false;
        document.getElementById('sidebar').classList.remove('collapsed');
      }
    });
  }
}
