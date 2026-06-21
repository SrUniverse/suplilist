/**
 * admin-shell.js — Shared chrome for all admin pages.
 *
 * Centralizes the sidebar, navigation links, SPA link binding and the full
 * admin stylesheet so each page (dashboard, products, users, subscriptions,
 * audit) renders consistently without duplicating layout/CSS. Pages call
 * injectAdminStyles() once and renderAdminSidebar(activePath) inside their shell.
 */

import { escapeHtml } from '../../utils/escape.js';

export const ADMIN_LINKS = [
  { path: '/admin',               label: 'Visão geral' },
  { path: '/admin/products',      label: 'Produtos' },
  { path: '/admin/subscriptions', label: 'Assinaturas' },
  { path: '/admin/users',         label: 'Usuários' },
  { path: '/admin/audit',         label: 'Auditoria' },
];

export function renderAdminSidebar(activePath) {
  const items = ADMIN_LINKS.map((l) => `
    <a href="${l.path}" class="sidebar-link ${activePath === l.path ? 'sidebar-link--active' : ''}"
       data-path="${l.path}">${escapeHtml(l.label)}</a>
  `).join('');
  return `
    <nav class="admin-sidebar" aria-label="Navegação admin">
      <div class="sidebar-brand">SupliList Admin</div>
      ${items}
    </nav>
  `;
}

/** Intercept sidebar/in-app links so they navigate via the SPA router. */
export function bindAdminSidebar(container) {
  container.querySelectorAll('[data-path]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState(null, null, link.dataset.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });
}

export function injectAdminStyles() {
  if (document.getElementById('admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'admin-styles';
  style.textContent = `
    .admin-layout { display:flex; min-height:100dvh; background:var(--color-bg,#0f0f13); color:var(--color-text,#e8e8f0); }
    .admin-sidebar { width:210px; flex-shrink:0; background:var(--color-surface,#1a1a24); border-right:1px solid var(--color-border,#2a2a38); padding:1.5rem 1rem; display:flex; flex-direction:column; gap:0.25rem; }
    .sidebar-brand { font-size:1rem; font-weight:700; color:var(--color-primary,#7c6ff7); margin-bottom:1.2rem; padding:0 0.5rem; letter-spacing:0.04em; text-transform:uppercase; }
    .sidebar-link { display:block; padding:0.6rem 0.75rem; border-radius:6px; color:var(--color-text-secondary,#9898b0); text-decoration:none; font-size:0.9rem; transition:background 0.15s,color 0.15s; }
    .sidebar-link:hover { background:var(--color-border,#2a2a38); color:var(--color-text,#e8e8f0); }
    .sidebar-link--active { background:var(--color-primary-subtle,rgba(124,111,247,0.15)); color:var(--color-primary,#7c6ff7); font-weight:600; }
    .admin-main { flex:1; padding:2rem; overflow-y:auto; }
    .admin-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; gap:1rem; flex-wrap:wrap; }
    .admin-title { font-size:1.5rem; font-weight:700; margin:0; }
    .admin-error { background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; padding:0.75rem 1rem; border-radius:8px; margin-bottom:1rem; font-size:0.875rem; }

    /* Tables */
    .admin-table-wrap { overflow-x:auto; }
    .admin-table { width:100%; border-collapse:collapse; font-size:0.875rem; }
    .admin-table th { text-align:left; padding:0.75rem 1rem; border-bottom:2px solid var(--color-border,#2a2a38); color:var(--color-text-secondary,#9898b0); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; }
    .admin-table td { padding:0.75rem 1rem; border-bottom:1px solid var(--color-border,#2a2a38); vertical-align:middle; }
    .admin-table tr:hover td { background:rgba(255,255,255,0.02); }
    .table-loading, .table-empty { text-align:center; color:var(--color-text-secondary,#9898b0); padding:2rem !important; }
    .cell-mono { font-family:monospace; font-size:0.78rem; color:var(--color-text-secondary,#9898b0); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cell-actions { display:flex; gap:0.5rem; }

    /* Buttons */
    .btn-primary { padding:0.55rem 1.2rem; background:var(--color-primary,#7c6ff7); color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:600; cursor:pointer; transition:opacity 0.15s; }
    .btn-primary:hover { opacity:0.85; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-ghost { padding:0.55rem 1.2rem; background:transparent; color:var(--color-text-secondary,#9898b0); border:1px solid var(--color-border,#2a2a38); border-radius:8px; font-size:0.875rem; cursor:pointer; transition:background 0.15s; }
    .btn-ghost:hover { background:var(--color-border,#2a2a38); }
    .btn-sm { padding:0.3rem 0.7rem; border:none; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer; transition:opacity 0.15s; }
    .btn-edit { background:rgba(124,111,247,0.18); color:var(--color-primary,#7c6ff7); }
    .btn-edit:hover { background:rgba(124,111,247,0.3); }
    .btn-delete { background:rgba(239,68,68,0.12); color:#fca5a5; }
    .btn-delete:hover { background:rgba(239,68,68,0.25); }

    /* Badges & status */
    .badge { display:inline-block; padding:0.15rem 0.5rem; border-radius:999px; font-size:0.68rem; font-weight:600; letter-spacing:0.02em; }
    .badge--ok { background:rgba(34,197,94,0.15); color:#86efac; }
    .badge--warn { background:rgba(234,179,8,0.13); color:#fde047; }
    .badge--info { background:rgba(99,102,241,0.15); color:#a5b4fc; }
    .badge--muted { background:rgba(156,163,175,0.13); color:#cbd5e1; }
    .status-badge { display:inline-block; padding:0.25rem 0.6rem; border-radius:20px; font-size:0.75rem; font-weight:600; }
    .status--pending,.status--incomplete,.status--past_due { background:rgba(251,191,36,0.15); color:#fbbf24; }
    .status--processing,.status--trialing { background:rgba(99,102,241,0.15); color:#818cf8; }
    .status--completed,.status--active { background:rgba(34,197,94,0.15); color:#4ade80; }
    .status--failed,.status--canceled,.status--unpaid { background:rgba(239,68,68,0.15); color:#f87171; }
    .status--refunded { background:rgba(156,163,175,0.15); color:#9ca3af; }

    /* Stat cards */
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1.75rem; }
    .stat-card { background:var(--color-surface,#1a1a24); border:1px solid var(--color-border,#2a2a38); border-radius:12px; padding:1.1rem 1.25rem; }
    .stat-card__label { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-secondary,#9898b0); margin-bottom:0.4rem; }
    .stat-card__value { font-size:1.8rem; font-weight:700; line-height:1; }
    .stat-card__sub { font-size:0.78rem; color:var(--color-text-secondary,#9898b0); margin-top:0.4rem; }
    .admin-section-title { font-size:1.05rem; font-weight:700; margin:1.5rem 0 0.8rem; }

    /* Pagination */
    .pagination { display:flex; gap:0.4rem; margin-top:1.25rem; flex-wrap:wrap; }
    .page-btn { padding:0.35rem 0.7rem; border:1px solid var(--color-border,#2a2a38); background:transparent; color:var(--color-text-secondary,#9898b0); border-radius:6px; cursor:pointer; font-size:0.82rem; transition:background 0.15s; }
    .page-btn:hover { background:var(--color-border,#2a2a38); }
    .page-btn--active { background:var(--color-primary,#7c6ff7); border-color:var(--color-primary,#7c6ff7); color:#fff; font-weight:600; }

    /* Modal */
    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:200; padding:1rem; }
    .modal-box { background:var(--color-surface,#1a1a24); border:1px solid var(--color-border,#2a2a38); border-radius:12px; padding:1.75rem; width:100%; max-width:560px; max-height:90dvh; overflow-y:auto; }
    .modal-title { font-size:1.15rem; font-weight:700; margin:0 0 1.25rem; }
    .modal-actions { display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem; }

    /* Forms */
    .form-label { display:flex; flex-direction:column; gap:0.35rem; font-size:0.82rem; color:var(--color-text-secondary,#9898b0); margin-bottom:0.9rem; }
    .form-input { padding:0.5rem 0.75rem; background:var(--color-bg,#0f0f13); border:1px solid var(--color-border,#2a2a38); border-radius:6px; color:var(--color-text,#e8e8f0); font-size:0.875rem; transition:border-color 0.15s; }
    .form-input:focus { outline:none; border-color:var(--color-primary,#7c6ff7); }
    .form-input:disabled { opacity:0.5; }
    .form-textarea { resize:vertical; min-height:2.4rem; font-family:inherit; }
    .form-hint { font-size:0.7rem; color:var(--color-text-secondary,#9898b0); opacity:0.8; }
    .form-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.6rem; }
    .form-row .form-label { margin-bottom:0; }
    .form-section-title { font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-primary,#7c6ff7); margin:1.1rem 0 0.6rem; padding-bottom:0.3rem; border-bottom:1px solid var(--color-border,#2a2a38); }
    .form-fieldset { border:1px solid var(--color-border,#2a2a38); border-radius:8px; padding:0.75rem 1rem; margin-bottom:0.9rem; }
    .form-fieldset legend { font-size:0.78rem; font-weight:600; color:var(--color-text-secondary,#9898b0); padding:0 0.4rem; text-transform:uppercase; letter-spacing:0.05em; }

    @media (max-width:640px) { .admin-sidebar { display:none; } .admin-main { padding:1rem; } .form-row { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}
