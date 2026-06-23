import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';
import {
  renderProductFormFields,
  populateProductForm,
  collectProductPayload,
} from './admin-product-form.js';
import { describeAdminError } from './admin-error.js';


export default class AdminProductsPage {
  constructor(container) {
    this.container = container;
    this._products = [];
    this._editingId = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  async mount() {
    injectAdminStyles();
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
      this._showError(describeAdminError(err));
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
        ${renderAdminSidebar('/admin/products')}
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
                  <th>Catálogo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="product-tbody">
                <tr><td colspan="6" class="table-loading">Carregando…</td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
      ${this._renderModal()}
    `;
    this._bindPageEvents();
  }

  _renderModal() {
    return `
      <div id="product-modal" class="modal-backdrop" style="display:none" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-box">
          <h2 class="modal-title" id="modal-title">Novo Produto</h2>
          <form id="product-form" novalidate>
            ${renderProductFormFields()}
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
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum produto encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = this._products.map(p => {
      const best = p.bestPriceValue ? `R$ ${Number(p.bestPriceValue).toFixed(2)}` : '—';
      const source = escapeHtml(p.bestPrice ?? '—');
      const onSite = p.metadata && p.metadata.category
        ? '<span class="badge badge--ok" title="Tem metadados — aparece no catálogo após export">no site</span>'
        : '<span class="badge badge--warn" title="Sem metadados — só preço">só preço</span>';
      return `
        <tr>
          <td class="cell-mono">${escapeHtml(p.supplementId ?? '')}</td>
          <td>${escapeHtml(p.name ?? '')}</td>
          <td>${best}</td>
          <td>${source}</td>
          <td>${onSite}</td>
          <td class="cell-actions">
            <button class="btn-sm btn-edit" data-id="${escapeHtml(p.supplementId ?? '')}">Editar</button>
            <button class="btn-sm btn-delete" data-id="${escapeHtml(p.supplementId ?? '')}">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = this._products.find(p => p.supplementId === btn.dataset.id);
        if (prod) this._openModal(prod);
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

    populateProductForm(this.container, product);

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
        const { payload, error } = collectProductPayload(this.container);
        if (error) {
          this._showModalError(error);
          return;
        }
        const btn = this.container.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Salvando…';
        try {
          await this._saveProduct(payload);
        } catch (err) {
          // Keep server validation messages (400) verbatim; give clear access
          // guidance for auth failures so a denied save isn't a mystery.
          this._showModalError(
            (err?.status === 401 || err?.status === 403)
              ? describeAdminError(err)
              : (err?.message ?? 'Erro ao salvar. Tente novamente.')
          );
        } finally {
          btn.disabled = false;
          btn.textContent = 'Salvar';
        }
      });

    bindAdminSidebar(this.container);
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') this._closeModal();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _setTableLoading(on) {
    const tbody = this.container.querySelector('#product-tbody');
    if (tbody && on) tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Carregando…</td></tr>';
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
}
