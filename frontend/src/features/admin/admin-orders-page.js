import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';

const STATUS_CONFIG = {
  pending:    { label: 'Pendente',    cls: 'status--pending'    },
  processing: { label: 'Processando', cls: 'status--processing' },
  completed:  { label: 'Concluído',   cls: 'status--completed'  },
  failed:     { label: 'Falhou',      cls: 'status--failed'     },
  refunded:   { label: 'Reembolsado', cls: 'status--refunded'   },
};

export default class AdminOrdersPage {
  constructor(container) {
    this.container = container;
    this._orders = [];
    this._page = 1;
    this._total = 0;
    this._limit = 20;
  }

  async mount() {
    injectAdminStyles();
    this._render();
    await this._loadOrders();
  }

  unmount() {
    this.container.innerHTML = '';
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  async _loadOrders(page = 1) {
    this._page = page;
    this._setTableLoading(true);
    try {
      // apiFetch already unwraps { success, data }, so this IS the array.
      // (meta.total is dropped by the unwrap; fall back to the page length.)
      const orders = await apiFetch(`/api/payments?page=${page}&limit=${this._limit}`);
      this._orders = Array.isArray(orders) ? orders : [];
      this._total  = this._orders.length;
    } catch (err) {
      this._orders = [];
      this._showError('Erro ao carregar pedidos: ' + (err?.message ?? 'Tente novamente.'));
    } finally {
      this._setTableLoading(false);
      this._renderTable();
      this._renderPagination();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar('/admin/orders')}
        <main class="admin-main">
          <header class="admin-header">
            <h1 class="admin-title">Pedidos</h1>
          </header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuário</th>
                  <th>Total</th>
                  <th>Moeda</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody id="orders-tbody">
                <tr><td colspan="6" class="table-loading">Carregando…</td></tr>
              </tbody>
            </table>
          </div>
          <div id="pagination" class="pagination"></div>
        </main>
      </div>
    `;
    bindAdminSidebar(this.container);
  }

  _renderTable() {
    const tbody = this.container.querySelector('#orders-tbody');
    if (!tbody) return;
    if (this._orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum pedido encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = this._orders.map(o => {
      const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, cls: '' };
      const total = o.totalAmount !== undefined
        ? `R$ ${Number(o.totalAmount).toFixed(2)}`
        : '—';
      const date = o.createdAt
        ? new Date(o.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      return `
        <tr>
          <td class="cell-mono">${escapeHtml(String(o._id ?? ''))}</td>
          <td class="cell-mono">${escapeHtml(String(o.userId ?? ''))}</td>
          <td>${total}</td>
          <td>${escapeHtml(o.currency ?? 'BRL')}</td>
          <td><span class="status-badge ${cfg.cls}">${escapeHtml(cfg.label)}</span></td>
          <td>${date}</td>
        </tr>
      `;
    }).join('');
  }

  _renderPagination() {
    const el = this.container.querySelector('#pagination');
    if (!el) return;
    const totalPages = Math.ceil(this._total / this._limit);
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`<button class="page-btn ${i === this._page ? 'page-btn--active' : ''}" data-page="${i}">${i}</button>`);
    }
    el.innerHTML = pages.join('');
    el.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => this._loadOrders(Number(btn.dataset.page)));
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _setTableLoading(on) {
    const tbody = this.container.querySelector('#orders-tbody');
    if (tbody && on) tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Carregando…</td></tr>';
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
}
