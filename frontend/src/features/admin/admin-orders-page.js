import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';

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
    this._injectStyles();
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
      const data = await apiFetch(`/api/payments?page=${page}&limit=${this._limit}`);
      this._orders = Array.isArray(data?.data) ? data.data : [];
      this._total  = data?.meta?.total ?? 0;
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
        ${this._renderSidebar('/admin/orders')}
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
    this._bindSidebarLinks();
  }

  _renderSidebar(activePath) {
    const links = [
      { path: '/admin/products', label: 'Produtos' },
      { path: '/admin/orders',   label: 'Pedidos'  },
    ];
    const items = links.map(l => `
      <a href="${l.path}" class="sidebar-link ${activePath === l.path ? 'sidebar-link--active' : ''}"
         data-path="${l.path}">${escapeHtml(l.label)}</a>
    `).join('');
    return `
      <nav class="admin-sidebar">
        <div class="sidebar-brand">Admin</div>
        ${items}
      </nav>
    `;
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

  // ── Events ──────────────────────────────────────────────────────────────────

  _bindSidebarLinks() {
    this.container.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState(null, null, link.dataset.path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
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

  // ── Styles ──────────────────────────────────────────────────────────────────

  _injectStyles() {
    // Shared admin styles are injected by admin-products-page; add only
    // the status badge styles that are specific to this page.
    if (document.getElementById('admin-order-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-order-styles';
    style.textContent = `
      /* Import shared admin layout styles if products page wasn't loaded first */
      .admin-layout { display:flex; min-height:100dvh; background:var(--color-bg,#0f0f13); color:var(--color-text,#e8e8f0); }
      .admin-sidebar { width:200px; flex-shrink:0; background:var(--color-surface,#1a1a24); border-right:1px solid var(--color-border,#2a2a38); padding:1.5rem 1rem; display:flex; flex-direction:column; gap:0.25rem; }
      .sidebar-brand { font-size:1.1rem; font-weight:700; color:var(--color-primary,#7c6ff7); margin-bottom:1rem; padding:0 0.5rem; letter-spacing:0.05em; text-transform:uppercase; }
      .sidebar-link { display:block; padding:0.6rem 0.75rem; border-radius:6px; color:var(--color-text-secondary,#9898b0); text-decoration:none; font-size:0.9rem; transition:background 0.15s,color 0.15s; }
      .sidebar-link:hover { background:var(--color-border,#2a2a38); color:var(--color-text,#e8e8f0); }
      .sidebar-link--active { background:var(--color-primary-subtle,rgba(124,111,247,0.15)); color:var(--color-primary,#7c6ff7); font-weight:600; }
      .admin-main { flex:1; padding:2rem; overflow-y:auto; }
      .admin-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; }
      .admin-title { font-size:1.5rem; font-weight:700; margin:0; }
      .admin-error { background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; padding:0.75rem 1rem; border-radius:8px; margin-bottom:1rem; font-size:0.875rem; }
      .admin-table-wrap { overflow-x:auto; }
      .admin-table { width:100%; border-collapse:collapse; font-size:0.875rem; }
      .admin-table th { text-align:left; padding:0.75rem 1rem; border-bottom:2px solid var(--color-border,#2a2a38); color:var(--color-text-secondary,#9898b0); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; }
      .admin-table td { padding:0.75rem 1rem; border-bottom:1px solid var(--color-border,#2a2a38); vertical-align:middle; }
      .admin-table tr:hover td { background:rgba(255,255,255,0.02); }
      .table-loading, .table-empty { text-align:center; color:var(--color-text-secondary,#9898b0); padding:2rem !important; }
      .cell-mono { font-family:monospace; font-size:0.78rem; color:var(--color-text-secondary,#9898b0); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      /* Status badges */
      .status-badge { display:inline-block; padding:0.25rem 0.6rem; border-radius:20px; font-size:0.75rem; font-weight:600; }
      .status--pending    { background:rgba(251,191,36,0.15); color:#fbbf24; }
      .status--processing { background:rgba(99,102,241,0.15); color:#818cf8; }
      .status--completed  { background:rgba(34,197,94,0.15);  color:#4ade80; }
      .status--failed     { background:rgba(239,68,68,0.15);  color:#f87171; }
      .status--refunded   { background:rgba(156,163,175,0.15);color:#9ca3af; }
      /* Pagination */
      .pagination { display:flex; gap:0.4rem; margin-top:1.25rem; flex-wrap:wrap; }
      .page-btn { padding:0.35rem 0.7rem; border:1px solid var(--color-border,#2a2a38); background:transparent; color:var(--color-text-secondary,#9898b0); border-radius:6px; cursor:pointer; font-size:0.82rem; transition:background 0.15s; }
      .page-btn:hover { background:var(--color-border,#2a2a38); }
      .page-btn--active { background:var(--color-primary,#7c6ff7); border-color:var(--color-primary,#7c6ff7); color:#fff; font-weight:600; }
      @media (max-width:640px) { .admin-sidebar { display:none; } .admin-main { padding:1rem; } }
    `;
    document.head.appendChild(style);
  }
}
