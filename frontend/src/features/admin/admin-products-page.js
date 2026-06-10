import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';

const STATUS_BADGE = {
  active:   { label: 'Ativo',    cls: 'badge--active' },
  inactive: { label: 'Inativo',  cls: 'badge--inactive' },
};

export default class AdminProductsPage {
  constructor(container) {
    this.container = container;
    this._products = [];
    this._editingId = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  async mount() {
    this._injectStyles();
    this._render();
    document.addEventListener('keydown', this._onKeyDown);
    await this._loadProducts();
  }

  unmount() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.container.innerHTML = '';
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  async _loadProducts() {
    this._setTableLoading(true);
    try {
      const data = await apiFetch('/api/supplements');
      this._products = Array.isArray(data?.data) ? data.data : [];
    } catch (err) {
      this._products = [];
      this._showError('Erro ao carregar catálogo: ' + (err?.message ?? 'Tente novamente.'));
    } finally {
      this._setTableLoading(false);
      this._renderTable();
    }
  }

  async _saveProduct(payload) {
    const isNew = !this._editingId;
    const method = isNew ? 'POST' : 'PUT';
    const path   = isNew ? '/api/supplements' : `/api/supplements/${this._editingId}`;
    await apiFetch(path, { method, body: JSON.stringify(payload) });
    this._closeModal();
    await this._loadProducts();
  }

  async _deleteProduct(id) {
    if (!confirm('Confirmar exclusão deste suplemento?')) return;
    try {
      await apiFetch(`/api/supplements/${id}`, { method: 'DELETE' });
      await this._loadProducts();
    } catch (err) {
      this._showError('Erro ao excluir: ' + (err?.message ?? 'Tente novamente.'));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${this._renderSidebar('/admin/products')}
        <main class="admin-main">
          <header class="admin-header">
            <h1 class="admin-title">Catálogo de Produtos</h1>
            <button class="btn-primary" id="btn-new-product">+ Novo Produto</button>
          </header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Melhor Preço</th>
                  <th>Fonte</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="product-tbody">
                <tr><td colspan="5" class="table-loading">Carregando…</td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
      ${this._renderModal()}
    `;
    this._bindPageEvents();
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

  _renderModal() {
    return `
      <div id="product-modal" class="modal-backdrop" style="display:none" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-box">
          <h2 class="modal-title" id="modal-title">Novo Produto</h2>
          <form id="product-form" novalidate>
            <label class="form-label">
              ID do Suplemento *
              <input class="form-input" id="field-supplementId" type="text" required placeholder="creatina-monohidratada" />
            </label>
            <label class="form-label">
              Nome *
              <input class="form-input" id="field-name" type="text" required placeholder="Creatina Monohidratada" />
            </label>
            <fieldset class="form-fieldset">
              <legend>Amazon</legend>
              <label class="form-label">Preço (R$)
                <input class="form-input" id="field-amazon-price" type="number" min="0" step="0.01" />
              </label>
              <label class="form-label">URL
                <input class="form-input" id="field-amazon-url" type="url" />
              </label>
            </fieldset>
            <fieldset class="form-fieldset">
              <legend>Mercado Livre</legend>
              <label class="form-label">Preço (R$)
                <input class="form-input" id="field-ml-price" type="number" min="0" step="0.01" />
              </label>
              <label class="form-label">URL
                <input class="form-input" id="field-ml-url" type="url" />
              </label>
            </fieldset>
            <fieldset class="form-fieldset">
              <legend>Shopee</legend>
              <label class="form-label">Preço (R$)
                <input class="form-input" id="field-shopee-price" type="number" min="0" step="0.01" />
              </label>
              <label class="form-label">URL
                <input class="form-input" id="field-shopee-url" type="url" />
              </label>
            </fieldset>
            <div id="modal-error" class="admin-error" style="display:none"></div>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" id="btn-cancel">Cancelar</button>
              <button type="submit" class="btn-primary" id="btn-save">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  _renderTable() {
    const tbody = this.container.querySelector('#product-tbody');
    if (!tbody) return;
    if (this._products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum produto encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = this._products.map(p => {
      const best = p.bestPriceValue ? `R$ ${Number(p.bestPriceValue).toFixed(2)}` : '—';
      const source = escapeHtml(p.bestPrice ?? '—');
      return `
        <tr>
          <td class="cell-mono">${escapeHtml(p.supplementId ?? '')}</td>
          <td>${escapeHtml(p.name ?? '')}</td>
          <td>${best}</td>
          <td>${source}</td>
          <td class="cell-actions">
            <button class="btn-sm btn-edit" data-id="${escapeHtml(p.supplementId ?? '')}" data-prod='${JSON.stringify({
              supplementId: p.supplementId,
              name: p.name,
              prices: p.prices,
            }).replace(/'/g, '&#39;')}'>Editar</button>
            <button class="btn-sm btn-delete" data-id="${escapeHtml(p.supplementId ?? '')}">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = JSON.parse(btn.dataset.prod);
        this._openModal(prod);
      });
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._deleteProduct(btn.dataset.id));
    });
  }

  // ── Modal ───────────────────────────────────────────────────────────────────

  _openModal(product = null) {
    const modal = this.container.querySelector('#product-modal');
    const title = this.container.querySelector('#modal-title');
    const idField = this.container.querySelector('#field-supplementId');

    this._editingId = product?.supplementId ?? null;
    title.textContent = product ? 'Editar Produto' : 'Novo Produto';
    idField.disabled = !!product;

    this.container.querySelector('#field-supplementId').value = product?.supplementId ?? '';
    this.container.querySelector('#field-name').value          = product?.name ?? '';
    this.container.querySelector('#field-amazon-price').value  = product?.prices?.amazon?.price ?? '';
    this.container.querySelector('#field-amazon-url').value    = product?.prices?.amazon?.url ?? '';
    this.container.querySelector('#field-ml-price').value      = product?.prices?.mercadolivre?.price ?? '';
    this.container.querySelector('#field-ml-url').value        = product?.prices?.mercadolivre?.url ?? '';
    this.container.querySelector('#field-shopee-price').value  = product?.prices?.shopee?.price ?? '';
    this.container.querySelector('#field-shopee-url').value    = product?.prices?.shopee?.url ?? '';

    this._clearModalError();
    modal.style.display = 'flex';
    this.container.querySelector('#field-supplementId').focus();
  }

  _closeModal() {
    const modal = this.container.querySelector('#product-modal');
    if (modal) modal.style.display = 'none';
    this._editingId = null;
  }

  _clearModalError() {
    const el = this.container.querySelector('#modal-error');
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  }

  _showModalError(msg) {
    const el = this.container.querySelector('#modal-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  _bindPageEvents() {
    this.container.querySelector('#btn-new-product')
      ?.addEventListener('click', () => this._openModal());

    this.container.querySelector('#btn-cancel')
      ?.addEventListener('click', () => this._closeModal());

    this.container.querySelector('#product-modal')
      ?.addEventListener('click', (e) => {
        if (e.target === this.container.querySelector('#product-modal')) this._closeModal();
      });

    this.container.querySelector('#product-form')
      ?.addEventListener('submit', async (e) => {
        e.preventDefault();
        this._clearModalError();
        const btn = this.container.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Salvando…';
        try {
          const payload = this._collectFormPayload();
          await this._saveProduct(payload);
        } catch (err) {
          this._showModalError(err?.message ?? 'Erro ao salvar. Tente novamente.');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Salvar';
        }
      });

    this.container.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState(null, null, link.dataset.path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    });
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') this._closeModal();
  }

  _collectFormPayload() {
    const val = (id) => this.container.querySelector(id)?.value?.trim() ?? '';
    const num = (id) => { const v = parseFloat(val(id)); return isNaN(v) ? undefined : v; };

    const payload = {
      supplementId: val('#field-supplementId'),
      name: val('#field-name'),
    };

    const prices = {};
    const ap = num('#field-amazon-price');
    const au = val('#field-amazon-url');
    if (ap !== undefined && au) prices.amazon = { price: ap, url: au };

    const mp = num('#field-ml-price');
    const mu = val('#field-ml-url');
    if (mp !== undefined && mu) prices.mercadolivre = { price: mp, url: mu };

    const sp = num('#field-shopee-price');
    const su = val('#field-shopee-url');
    if (sp !== undefined && su) prices.shopee = { price: sp, url: su };

    if (Object.keys(prices).length) payload.prices = prices;
    return payload;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _setTableLoading(on) {
    const tbody = this.container.querySelector('#product-tbody');
    if (tbody && on) tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Carregando…</td></tr>';
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  _injectStyles() {
    if (document.getElementById('admin-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-styles';
    style.textContent = `
      .admin-layout {
        display: flex;
        min-height: 100dvh;
        background: var(--color-bg, #0f0f13);
        color: var(--color-text, #e8e8f0);
      }
      .admin-sidebar {
        width: 200px;
        flex-shrink: 0;
        background: var(--color-surface, #1a1a24);
        border-right: 1px solid var(--color-border, #2a2a38);
        padding: 1.5rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .sidebar-brand {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--color-primary, #7c6ff7);
        margin-bottom: 1rem;
        padding: 0 0.5rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .sidebar-link {
        display: block;
        padding: 0.6rem 0.75rem;
        border-radius: 6px;
        color: var(--color-text-secondary, #9898b0);
        text-decoration: none;
        font-size: 0.9rem;
        transition: background 0.15s, color 0.15s;
      }
      .sidebar-link:hover { background: var(--color-border, #2a2a38); color: var(--color-text, #e8e8f0); }
      .sidebar-link--active { background: var(--color-primary-subtle, rgba(124,111,247,0.15)); color: var(--color-primary, #7c6ff7); font-weight: 600; }
      .admin-main {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
      }
      .admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }
      .admin-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
      }
      .admin-error {
        background: rgba(239,68,68,0.12);
        border: 1px solid rgba(239,68,68,0.3);
        color: #fca5a5;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }
      .admin-table-wrap { overflow-x: auto; }
      .admin-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .admin-table th {
        text-align: left;
        padding: 0.75rem 1rem;
        border-bottom: 2px solid var(--color-border, #2a2a38);
        color: var(--color-text-secondary, #9898b0);
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .admin-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--color-border, #2a2a38);
        vertical-align: middle;
      }
      .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
      .table-loading, .table-empty { text-align: center; color: var(--color-text-secondary, #9898b0); padding: 2rem !important; }
      .cell-mono { font-family: monospace; font-size: 0.8rem; color: var(--color-text-secondary, #9898b0); }
      .cell-actions { display: flex; gap: 0.5rem; }
      .btn-primary {
        padding: 0.55rem 1.2rem;
        background: var(--color-primary, #7c6ff7);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .btn-primary:hover { opacity: 0.85; }
      .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-ghost {
        padding: 0.55rem 1.2rem;
        background: transparent;
        color: var(--color-text-secondary, #9898b0);
        border: 1px solid var(--color-border, #2a2a38);
        border-radius: 8px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-ghost:hover { background: var(--color-border, #2a2a38); }
      .btn-sm {
        padding: 0.3rem 0.7rem;
        border: none;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .btn-edit { background: rgba(124,111,247,0.18); color: var(--color-primary, #7c6ff7); }
      .btn-edit:hover { background: rgba(124,111,247,0.3); }
      .btn-delete { background: rgba(239,68,68,0.12); color: #fca5a5; }
      .btn-delete:hover { background: rgba(239,68,68,0.25); }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        padding: 1rem;
      }
      .modal-box {
        background: var(--color-surface, #1a1a24);
        border: 1px solid var(--color-border, #2a2a38);
        border-radius: 12px;
        padding: 1.75rem;
        width: 100%;
        max-width: 520px;
        max-height: 90dvh;
        overflow-y: auto;
      }
      .modal-title { font-size: 1.15rem; font-weight: 700; margin: 0 0 1.25rem; }
      .form-label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.82rem;
        color: var(--color-text-secondary, #9898b0);
        margin-bottom: 0.9rem;
      }
      .form-input {
        padding: 0.5rem 0.75rem;
        background: var(--color-bg, #0f0f13);
        border: 1px solid var(--color-border, #2a2a38);
        border-radius: 6px;
        color: var(--color-text, #e8e8f0);
        font-size: 0.875rem;
        transition: border-color 0.15s;
      }
      .form-input:focus { outline: none; border-color: var(--color-primary, #7c6ff7); }
      .form-input:disabled { opacity: 0.5; }
      .form-fieldset {
        border: 1px solid var(--color-border, #2a2a38);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 0.9rem;
      }
      .form-fieldset legend {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--color-text-secondary, #9898b0);
        padding: 0 0.4rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
      @media (max-width: 640px) {
        .admin-sidebar { display: none; }
        .admin-main { padding: 1rem; }
      }
    `;
    document.head.appendChild(style);
  }
}
