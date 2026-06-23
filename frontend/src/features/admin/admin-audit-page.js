import { apiFetch } from '../../platform/api-client.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderAdminSidebar, bindAdminSidebar, injectAdminStyles } from './admin-shell.js';

const ACTION_LABEL = {
  'supplement.create': 'Criou suplemento',
  'supplement.update': 'Editou suplemento',
  'supplement.delete': 'Excluiu suplemento',
  'user.role.update': 'Alterou papel',
  'user.suspend': 'Suspendeu usuário',
  'user.unsuspend': 'Reativou usuário',
};

export default class AdminAuditPage {
  constructor(container) {
    this.container = container;
    this._rows = [];
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
      // apiFetch already unwraps { success, data }, so this IS the array.
      const rows = await apiFetch('/api/admin/audit?limit=200');
      this._rows = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._rows = [];
      this._showError('Erro ao carregar auditoria: ' + (err?.message ?? 'Tente novamente.'));
    }
    this._renderTable();
  }

  _render() {
    this.container.innerHTML = `
      <div class="admin-layout">
        ${renderAdminSidebar('/admin/audit')}
        <main class="admin-main">
          <header class="admin-header"><h1 class="admin-title">Log de auditoria</h1></header>
          <div id="admin-error" class="admin-error" style="display:none"></div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr><th>Data</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhes</th></tr>
              </thead>
              <tbody id="audit-tbody"><tr><td colspan="5" class="table-loading">Carregando…</td></tr></tbody>
            </table>
          </div>
        </main>
      </div>
    `;
  }

  _renderTable() {
    const tbody = this.container.querySelector('#audit-tbody');
    if (!tbody) return;
    if (this._rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum registro ainda.</td></tr>';
      return;
    }
    tbody.innerHTML = this._rows.map((r) => {
      const when = r.createdAt
        ? new Date(r.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      const action = ACTION_LABEL[r.action] ?? r.action;
      const meta = r.metadata ? JSON.stringify(r.metadata) : '';
      return `
        <tr>
          <td>${escapeHtml(when)}</td>
          <td>${escapeHtml(r.actorEmail ?? r.actorId ?? '—')}</td>
          <td>${escapeHtml(action)}</td>
          <td class="cell-mono">${escapeHtml(`${r.targetType ?? ''}${r.targetId ? ':' + r.targetId : ''}`)}</td>
          <td class="cell-mono">${escapeHtml(meta)}</td>
        </tr>
      `;
    }).join('');
  }

  _showError(msg) {
    const el = this.container.querySelector('#admin-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
}
