import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';
import { describeAdminError } from './admin-error.js';

const BRL = (n) => `R$ ${Number(n || 0).toFixed(2)}`;

export default class AdminDashboardPage {
  constructor(container) {
    this.container = container;
    this._stats = null;
  }

  async mount() {
    injectAdminStyles();
    this._render();
    bindAdminSidebar(this.container);
    await this._load();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  async _load() {
    try {
      // apiFetch already unwraps the { success, data } envelope, so this IS the
      // stats object — do NOT read .data again (that was always undefined and
      // left the panel stuck on "Carregando…").
      this._stats = await apiFetch('/api/admin/stats') ?? null;
    } catch (err) {
      this._showError(describeAdminError(err));
      return;
    }
    this._renderStats();
  }

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar('/admin')}
        <main class="admin-main">
          <header class="admin-header">
            <h1 class="admin-title">Visão geral</h1>
          </header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div id="stat-cards" class="stat-grid">
            <div class="stat-card"><div class="stat-card__label">Carregando…</div></div>
          </div>
        </main>
      </div>
    `;
  }

  _renderStats() {
    const el = this.container.querySelector('#stat-cards');
    if (!el || !this._stats) return;
    const s = this._stats;
    const role = s.users.byRole || {};
    const tier = s.users.byTier || {};

    const cards = [
      { label: 'Suplementos', value: s.supplements.total, sub: `${s.supplements.onSite} no catálogo público` },
      { label: 'Usuários', value: s.users.total, sub: `${role.admin || 0} admin · ${role.user || 0} comuns` },
      { label: 'Assinantes ativos', value: s.users.activeSubscribers, sub: `${tier.pro || 0} pro · ${tier.elite || 0} elite` },
      { label: 'Receita (concluída)', value: BRL(s.orders.revenueCompleted), sub: `${(s.orders.byStatus?.completed) || 0} pedidos pagos` },
    ];

    el.innerHTML = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(c.label)}</div>
        <div class="stat-card__value">${escapeHtml(String(c.value))}</div>
        <div class="stat-card__sub">${escapeHtml(c.sub)}</div>
      </div>
    `).join('');
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    // Clear the "Carregando…" placeholder so the panel doesn't look stuck
    // loading while the error is shown above it.
    const cards = this.container.querySelector('#stat-cards');
    if (cards) cards.innerHTML = '';
  }
}
