import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';

const TIER_BADGE = { free: 'badge--muted', pro: 'badge--info', elite: 'badge--ok' };

export default class AdminSubscriptionsPage {
  constructor(container) {
    this.container = container;
    this._rows = [];
    this._page = 1;
    this._total = 0;
    this._limit = 50;
  }

  async mount() {
    injectAdminStyles();
    this._render();
    bindAdminSidebar(this.container);
    await this._load(1);
  }

  unmount() {
    this.container.innerHTML = '';
  }

  async _load(page = 1) {
    this._page = page;
    this._setLoading();
    try {
      const data = await apiFetch(`/api/admin/subscribers?page=${page}&limit=${this._limit}`);
      this._rows = data?.data?.subscribers ?? [];
      this._total = data?.data?.total ?? 0;
    } catch (err) {
      this._rows = [];
      this._showError('Erro ao carregar assinaturas: ' + (err?.message ?? 'Tente novamente.'));
    }
    this._renderTable();
    this._renderPagination();
  }

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar('/admin/subscriptions')}
        <main class="admin-main">
          <header class="admin-header"><h1 class="admin-title">Assinaturas</h1></header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr><th>Email</th><th>Plano</th><th>Status</th><th>Renova em</th><th>Stripe</th></tr>
              </thead>
              <tbody id="subs-tbody"><tr><td colspan="5" class="table-loading">Carregando…</td></tr></tbody>
            </table>
          </div>
          <div id="pagination" class="pagination"></div>
        </main>
      </div>
    `;
  }

  _renderTable() {
    const tbody = this.container.querySelector('#subs-tbody');
    if (!tbody) return;
    if (this._rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhuma assinatura encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = this._rows.map((r) => {
      const tierCls = TIER_BADGE[r.tier] ?? 'badge--muted';
      const statusCls = `status--${r.subscriptionStatus || 'incomplete'}`;
      const renew = r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString('pt-BR') : '—';
      return `
        <tr>
          <td>${escapeHtml(r.email ?? '')}</td>
          <td><span class="badge ${tierCls}">${escapeHtml(r.tier ?? 'free')}</span></td>
          <td><span class="status-badge ${statusCls}">${escapeHtml(r.subscriptionStatus ?? '—')}</span></td>
          <td>${renew}</td>
          <td class="cell-mono">${escapeHtml(r.stripeCustomerId ?? '—')}</td>
        </tr>
      `;
    }).join('');
  }

  _renderPagination() {
    const el = this.container.querySelector('#pagination');
    if (!el) return;
    const totalPages = Math.ceil(this._total / this._limit);
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === this._page ? 'page-btn--active' : ''}" data-page="${i}">${i}</button>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('.page-btn').forEach((btn) => {
      btn.addEventListener('click', () => this._load(Number(btn.dataset.page)));
    });
  }

  _setLoading() {
    const tbody = this.container.querySelector('#subs-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Carregando…</td></tr>';
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
}
