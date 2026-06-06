/**
 * settings-page-render.js
 *
 * HTML rendering templates for SettingsPage.
 * Separates HTML generation from page logic.
 *
 * @module settings-page-render
 */

/**
 * Render a switch input HTML element
 * @param {string} id - Element ID
 * @param {boolean} checked - Initial checked state
 * @param {string} label - Label text
 * @param {string} icon - Icon/emoji
 * @returns {string} HTML string
 */
export function renderSwitchHTML(id, checked, label, icon) {
  return `
    <div class="sp-toggle-row">
      <span class="sp-toggle-label">
        <span class="sp-toggle-icon" id="${id}-icon">${icon}</span>
        ${label}
      </span>
      <label class="sp-switch" aria-label="${label}">
        <input type="checkbox" id="${id}"${checked ? ' checked' : ''}>
        <span class="sp-switch-track"></span>
      </label>
    </div>
  `;
}

/**
 * Render subscription section based on user tier
 * @param {string} tier - User tier (free, pro, elite)
 * @returns {string} HTML string
 */
export function renderSubscriptionSection(tier) {
  if (tier === 'free') {
    return `
      <div class="sp-card" style="border: 1px dashed rgba(124, 58, 237, 0.4); background: rgba(124, 58, 237, 0.02);">
        <h2 class="sp-section-label" style="color: var(--color-brand); margin-bottom: 12px;">Assinatura Premium</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px;">Plano Atual: Gratuito 🟢</div>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 340px; line-height: 1.45;">Desbloqueie consistência avançada, remova anúncios e baixe relatórios em Excel.</p>
          </div>
          <button class="sp-btn" id="sp-upgrade-btn" style="background: var(--color-brand); color: #fff; border: none; font-weight: 700; height: 38px; border-radius: 8px; box-shadow: 0 4px 12px rgba(139,92,246,0.25); cursor: pointer; padding: 0 20px;">Quero Premium</button>
        </div>
      </div>
    `;
  }

  const planName = tier === 'elite' ? 'ELITE 🏆' : 'PRO ⭐';
  return `
    <div class="sp-card" style="border: 1px solid rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.02);">
      <h2 class="sp-section-label" style="color: #22c55e; margin-bottom: 12px;">Minha Assinatura</h2>
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div>
          <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary);">Plano Ativo: SupliList ${planName}</div>
          <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 320px; line-height: 1.45;">Seu acesso premium está ativo. Obrigado por apoiar o SupliList!</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="sp-btn sp-btn-outline" id="sp-manage-plan-btn" style="height: 38px; padding: 0 16px;">Alterar</button>
          <button class="sp-btn" id="sp-cancel-plan-btn" style="border: 1.5px solid var(--color-error); color: var(--color-error); background: transparent; font-weight: 600; height: 38px; border-radius: 8px; cursor: pointer; padding: 0 16px;">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render full settings page HTML
 * @param {Object} options - Rendering options
 * @param {boolean} options.isDark - Dark theme enabled
 * @param {boolean} options.notifCheckin - Checkin notifications enabled
 * @param {boolean} options.notifRestock - Restock notifications enabled
 * @param {string} options.tier - User subscription tier
 * @param {boolean} options.isAuthenticated - User is authenticated
 * @param {boolean} options.isMfaEnabled - MFA is enabled
 * @returns {string} HTML string
 */
export function renderFullPage({
  isDark,
  notifCheckin,
  notifRestock,
  tier,
  isAuthenticated,
  isMfaEnabled,
}) {
  return `
    <div class="sp-page">

      <!-- Header -->
      <div class="sp-header">
        <h1>Configurações</h1>
        <p>Preferências do app, dados e privacidade</p>
      </div>

      <!-- Assinatura -->
      <div class="sp-subscription-section">${renderSubscriptionSection(tier)}</div>

      <!-- Aparência -->
      <div class="sp-card">
        <h2 class="sp-section-label">Aparência</h2>
        ${renderSwitchHTML('sp-theme-toggle', isDark, 'Tema escuro', isDark ? '🌙' : '☀️')}
      </div>

      <!-- Notificações -->
      <div class="sp-card">
        <h2 class="sp-section-label">Notificações</h2>
        ${renderSwitchHTML('sp-notif-checkin', notifCheckin, 'Lembrete diário de check-in', '💊')}
        ${renderSwitchHTML('sp-notif-restock', notifRestock, 'Alertas de reposição de estoque', '📦')}
        <p class="sp-notif-note">Notificações são locais e não requerem cadastro. Nada é enviado para servidores.</p>
      </div>

      <!-- Segurança -->
      ${isAuthenticated ? `
      <div class="sp-card">
        <h2 class="sp-section-label">Segurança</h2>
        <div class="sp-action-row">
          <span class="sp-action-label">Autenticação em Duas Etapas (MFA)</span>
          ${isMfaEnabled
            ? '<span style="color: #22c55e; font-weight: 600; font-size: 14px;">Ativo ✓</span>'
            : '<button class="sp-btn sp-btn-outline" id="sp-mfa-setup-btn">Configurar</button>'
          }
        </div>
      </div>
      ` : ''}

      <!-- Dados & Privacidade -->
      <div class="sp-card">
        <h2 class="sp-section-label">Dados &amp; Privacidade</h2>
        <div class="sp-privacy-box">
          🔒 Seus dados ficam 100% no seu dispositivo. Não temos servidores e nunca coletamos informações pessoais. (LGPD)
        </div>
        <div class="sp-action-row">
          <span class="sp-action-label">Exportar meus dados (download)</span>
          <button class="sp-btn sp-btn-outline" id="sp-export-btn">Exportar</button>
        </div>
        <div class="sp-action-row" id="sp-export-file-row" style="display:none;">
          <span class="sp-action-label">Salvar backup (no seu PC)</span>
          <button class="sp-btn sp-btn-outline" id="sp-export-file-btn">Salvar</button>
        </div>
        <div class="sp-action-row" id="sp-import-file-row" style="display:none;">
          <span class="sp-action-label">Restaurar backup (do seu PC)</span>
          <button class="sp-btn sp-btn-outline" id="sp-import-file-btn">Restaurar</button>
        </div>
        <div class="sp-action-row">
          <span class="sp-action-label">Limpar histórico de check-ins</span>
          <button class="sp-btn sp-btn-outline" id="sp-clear-checkins-btn">Limpar</button>
        </div>
        <div class="sp-action-row">
          <span class="sp-action-label">Resetar tudo</span>
          <button class="sp-btn sp-btn-danger" id="sp-reset-btn">Resetar</button>
        </div>
      </div>

      <!-- Sobre & Legal -->
      <div class="sp-card">
        <h2 class="sp-section-label">Sobre &amp; Legal</h2>
        <p class="sp-version">SupliList v4.0.0 · Feito com ❤️ e ciência</p>
        <button class="sp-link-btn" data-path="/faq">
          <span>❓ Perguntas Frequentes (FAQ)</span>
          <span class="sp-link-arrow">→</span>
        </button>
        <button class="sp-link-btn" data-path="/legal?doc=termos">
          <span>📋 Termos de Uso</span>
          <span class="sp-link-arrow">→</span>
        </button>
        <button class="sp-link-btn" data-path="/legal?doc=privacidade">
          <span>🔒 Política de Privacidade</span>
          <span class="sp-link-arrow">→</span>
        </button>
        <button class="sp-link-btn" data-path="/legal?doc=medico">
          <span>⚕️ Aviso Médico</span>
          <span class="sp-link-arrow">→</span>
        </button>
        <button class="sp-link-btn" data-path="/legal?doc=afiliados">
          <span>🔗 Divulgação de Afiliados</span>
          <span class="sp-link-arrow">→</span>
        </button>
      </div>

    </div>
  `;
}
