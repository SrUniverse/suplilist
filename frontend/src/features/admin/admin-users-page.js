import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';

const ROLE_LABEL = { admin: 'Admin', user: 'Usuário', moderator: 'Moderador' };
const STATUS_BADGE = {
  active: 'badge--ok',
  suspended: 'badge--warn',
  pending: 'badge--info',
  deleted: 'badge--muted',
};

export default class AdminUsersPage {
  constructor(container) {
    this.container = container;
    this._users = [];
    this._page = 1;
    this._total = 0;
    this._limit = 20;
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
      const data = await apiFetch(`/api/admin/users?page=${page}&limit=${this._limit}`);
      this._users = data?.data?.users ?? [];
      this._total = data?.data?.total ?? 0;
    } catch (err) {
      this._users = [];
      this._showError('Erro ao carregar usuários: ' + (err?.message ?? 'Tente novamente.'));
    }
    this._renderTable();
    this._renderPagination();
  }

  async _setRole(id, role) {
    try {
      await apiFetch(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      await this._load(this._page);
    } catch (err) {
      this._showError('Erro ao alterar papel: ' + (err?.message ?? 'Tente novamente.'));
    }
  }

  async _toggleSuspend(user) {
    const suspend = user.status !== 'suspended';
    if (suspend && !confirm(`Suspender ${user.email}?`)) return;
    try {
      if (suspend) {
        await apiFetch(`/api/admin/users/${user.id}/suspend`, { method: 'POST', body: JSON.stringify({ reason: 'Via painel admin' }) });
      } else {
        await apiFetch(`/api/admin/users/${user.id}/suspend`, { method: 'DELETE' });
      }
      await this._load(this._page);
    } catch (err) {
      this._showError('Erro ao atualizar status: ' + (err?.message ?? 'Tente novamente.'));
    }
  }

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar('/admin/users')}
        <main class="admin-main">
          <header class="admin-header"><h1 class="admin-title">Usuários</h1></header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr><th>Email</th><th>Papel</th><th>Status</th><th>Criado</th><th>Ações</th></tr>
              </thead>
              <tbody id="users-tbody"><tr><td colspan="5" class="table-loading">Carregando…</td></tr></tbody>
            </table>
          </div>
          <div id="pagination" class="pagination"></div>
        </main>
      </div>
    `;
  }

  _renderTable() {
    const tbody = this.container.querySelector('#users-tbody');
    if (!tbody) return;
    if (this._users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum usuário encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = this._users.map((u) => {
      const roleLabel = ROLE_LABEL[u.role] ?? u.role;
      const statusCls = STATUS_BADGE[u.status] ?? 'badge--muted';
      const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—';
      const suspendLabel = u.status === 'suspended' ? 'Reativar' : 'Suspender';
      const roleBtn = u.role === 'admin'
        ? `<button class="btn-sm btn-edit" data-act="role" data-id="${escapeHtml(u.id)}" data-role="user">↓ Usuário</button>`
        : `<button class="btn-sm btn-edit" data-act="role" data-id="${escapeHtml(u.id)}" data-role="admin">↑ Admin</button>`;
      return `
        <tr>
          <td>${escapeHtml(u.email ?? '')}${u.emailVerified ? '' : ' <span class="badge badge--warn">não verif.</span>'}</td>
          <td><span class="badge badge--info">${escapeHtml(roleLabel)}</span></td>
          <td><span class="badge ${statusCls}">${escapeHtml(u.status ?? '')}</span></td>
          <td>${created}</td>
          <td class="cell-actions">
            ${roleBtn}
            <button class="btn-sm btn-delete" data-act="suspend" data-id="${escapeHtml(u.id)}">${suspendLabel}</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-act="role"]').forEach((btn) => {
      btn.addEventListener('click', () => this._setRole(btn.dataset.id, btn.dataset.role));
    });
    tbody.querySelectorAll('[data-act="suspend"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const user = this._users.find((u) => u.id === btn.dataset.id);
        if (user) this._toggleSuspend(user);
      });
    });
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
    const tbody = this.container.querySelector('#users-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Carregando…</td></tr>';
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
}
