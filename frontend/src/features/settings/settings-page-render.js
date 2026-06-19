/**
 * settings-page-render.js
 *
 * HTML rendering templates for SettingsPage.
 * Redesigned with two-column layout, sidebar nav, grouped cards,
 * and rich toggle/action rows. Inspired by Strava, Linear, Headspace.
 *
 * @module settings-page-render
 */

/**
 * Ícones SVG de linha (currentColor) para os cards, linhas e links da página.
 * Substituem os emojis coloridos para manter a consistência com o design system
 * de ícones de linha (o sidebar nav já usa SVGs). Tamanho padrão 20px.
 * @type {Record<string, string>}
 */
export const SP_ICONS = {
  appearance: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>`,
  moon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  alarm: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/></svg>`,
  package: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  lock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  database: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  save: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  restore: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  trash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  bulb: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>`,
  help: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  fileText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  medical: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  link: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  heart: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-1px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
};

/**
 * Render an iOS-style toggle row
 * @param {string} id        - Checkbox element ID
 * @param {boolean} checked  - Initial state
 * @param {string} title     - Row primary label
 * @param {string} subtitle  - Row secondary label
 * @param {string} icon      - SVG markup (ver SP_ICONS) ou caractere
 * @returns {string} HTML string
 */
export function renderSwitchHTML(id, checked, title, subtitle, icon) {
  return `
    <div class="sp-row" role="listitem">
      <div class="sp-row-info">
        <div class="sp-row-icon">${icon}</div>
        <div class="sp-row-text">
          <p class="sp-row-title">${title}</p>
          ${subtitle ? `<p class="sp-row-subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      <div class="sp-row-control">
        <label class="sp-switch" aria-label="${title}">
          <input type="checkbox" id="${id}"${checked ? ' checked' : ''}>
          <span class="sp-switch-track"></span>
        </label>
      </div>
    </div>
  `;
}

/**
 * Render a clickable action row with a button on the right
 * @param {string} id       - Button element ID
 * @param {string} title    - Row label
 * @param {string} subtitle - Descriptive text
 * @param {string} icon     - Emoji icon
 * @param {string} btnLabel - Button text
 * @param {string} btnClass - Additional CSS class for the button
 * @returns {string} HTML string
 */
export function renderActionRow(id, title, subtitle, icon, btnLabel, btnClass = 'sp-btn-outline') {
  return `
    <div class="sp-row" role="listitem">
      <div class="sp-row-info">
        <div class="sp-row-icon">${icon}</div>
        <div class="sp-row-text">
          <p class="sp-row-title">${title}</p>
          ${subtitle ? `<p class="sp-row-subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      <div class="sp-row-control">
        <button class="sp-btn ${btnClass}" id="${id}">${btnLabel}</button>
      </div>
    </div>
  `;
}

/**
 * Render subscription section based on user tier
 * @param {string} tier - 'free' | 'pro' | 'elite'
 * @returns {string} HTML string
 */
export function renderSubscriptionSection(tier) {
  if (tier === 'free') {
    return `
      <div class="sp-plan-card sp-plan-card--free">
        <div>
          <div class="sp-plan-badge sp-plan-badge--free">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0l1.3 2.6L9 3.5l-2 2 .5 2.8L5 7l-2.5 1.3.5-2.8-2-2 2.7-.9z"/></svg>
            Gratuito
          </div>
          <h3 class="sp-plan-name">Plano Free</h3>
          <p class="sp-plan-desc">Desbloqueie histórico avançado, remova anúncios e exporte relatórios em Excel com o PRO.</p>
          <ul class="sp-plan-features">
            <li class="sp-plan-feature">
              <svg class="sp-plan-feature-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 8 6.5 11.5 13 5"/></svg>
              Catálogo completo de 55+ suplementos
            </li>
            <li class="sp-plan-feature">
              <svg class="sp-plan-feature-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 8 6.5 11.5 13 5"/></svg>
              Stack personalizada & check-ins
            </li>
            <li class="sp-plan-feature" style="color: var(--color-text-muted); opacity: 0.5;">
              <svg class="sp-plan-feature-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
              Gráficos & relatórios Excel (PRO)
            </li>
          </ul>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0;">
          <button class="sp-btn sp-btn-primary" id="sp-upgrade-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1l1.8 3.6L13 5.5l-3 2.9.7 4.1L7 10.5l-3.7 2 .7-4.1L1 5.5l4.2-.9z"/></svg>
            Quero o PRO
          </button>
          <span style="font-size:11px; color:var(--color-text-muted);">A partir de R$ 9,90/mês</span>
        </div>
      </div>
    `;
  }

  const isPro = tier === 'pro';
  const planLabel = isPro ? 'PRO' : 'ELITE';
  return `
    <div class="sp-plan-card sp-plan-card--paid">
      <div>
        <div class="sp-plan-badge sp-plan-badge--paid">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polyline points="2 5.5 4.5 8 8.5 3"/></svg>
          Ativo — SupliList ${planLabel}
        </div>
        <h3 class="sp-plan-name">Seu plano está ativo</h3>
        <p class="sp-plan-desc">Obrigado por apoiar o SupliList! Todos os recursos premium estão desbloqueados.</p>
      </div>
      <div style="display:flex; gap:8px; flex-shrink:0;">
        <button class="sp-btn sp-btn-outline" id="sp-manage-plan-btn">Gerenciar</button>
        <button class="sp-btn sp-btn-danger" id="sp-cancel-plan-btn">Cancelar</button>
      </div>
    </div>
  `;
}

/**
 * Render a legal link row
 * @param {string} icon  - Emoji icon
 * @param {string} label - Link text
 * @param {string} path  - Navigation path
 * @returns {string} HTML string
 */
function renderLegalLink(icon, label, path) {
  return `
    <button class="sp-link-row" data-path="${path}">
      <div class="sp-link-row-left">
        <div class="sp-link-row-icon">${icon}</div>
        <span class="sp-link-row-label">${label}</span>
      </div>
      <span class="sp-link-arrow">›</span>
    </button>
  `;
}

/**
 * Render full settings page HTML
 * @param {Object} options
 * @param {boolean} options.isDark           - Dark theme enabled
 * @param {boolean} options.notifCheckin     - Check-in notification enabled
 * @param {boolean} options.notifRestock     - Restock notification enabled
 * @param {string}  options.tier             - User subscription tier
 * @param {boolean} options.isAuthenticated  - User is authenticated
 * @param {boolean} options.isMfaEnabled     - MFA is enabled
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

      <!-- ─── Header ──────────────────────────── -->
      <div class="sp-header">
        <h1>Configurações</h1>
        <p>Preferências, notificações, dados e privacidade</p>
      </div>

      <!-- ─── Sidebar Nav ─────────────────────── -->
      <nav class="sp-nav" aria-label="Seções das configurações">
        <a href="#sp-section-subscription" class="sp-nav-item active">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M8 1l1.8 3.6L14 5.5l-3 2.9.7 4.1L8 10.5l-3.7 2 .7-4.1L2 5.5l4.2-.9z"/>
          </svg>
          Assinatura
        </a>
        <a href="#sp-section-appearance" class="sp-nav-item">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="8" cy="8" r="5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/>
          </svg>
          Aparência
        </a>
        <a href="#sp-section-notifications" class="sp-nav-item">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M8 1a5 5 0 015 5v3l1 2H2l1-2V6a5 5 0 015-5z"/><path d="M6 14h4"/>
          </svg>
          Notificações
        </a>
        ${isAuthenticated ? `
        <a href="#sp-section-security" class="sp-nav-item">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="4" y="7" width="8" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>
          </svg>
          Segurança
        </a>` : ''}
        <a href="#sp-section-data" class="sp-nav-item">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <ellipse cx="8" cy="4" rx="5" ry="2.5"/><path d="M3 4v4c0 1.4 2.2 2.5 5 2.5S13 9.4 13 8V4"/><path d="M3 8v4c0 1.4 2.2 2.5 5 2.5S13 13.4 13 12V8"/>
          </svg>
          Dados
        </a>
        <a href="#sp-section-about" class="sp-nav-item">
          <svg class="sp-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="8" cy="8" r="6"/><path d="M8 7v5M8 5v.5"/>
          </svg>
          Sobre
        </a>
      </nav>

      <!-- ─── Main Content ─────────────────────── -->
      <div class="sp-content">

        <!-- Assinatura -->
        <div class="sp-section" id="sp-section-subscription">
          <div class="sp-subscription-section">
            ${renderSubscriptionSection(tier)}
          </div>
        </div>

        <!-- Aparência -->
        <div class="sp-section sp-card" id="sp-section-appearance">
          <div class="sp-card-header">
            <div class="sp-card-header-icon" style="background: rgba(139,92,246,0.1); color: var(--color-brand);">${SP_ICONS.appearance}</div>
            <div class="sp-card-header-text">
              <p class="sp-section-label">Aparência</p>
              <p class="sp-section-desc">Personalize a interface do app</p>
            </div>
          </div>
          <div role="list">
            ${renderSwitchHTML(
              'sp-theme-toggle',
              isDark,
              'Tema escuro',
              'Adapta as cores para uso noturno',
              isDark ? SP_ICONS.moon : SP_ICONS.sun
            )}
          </div>
        </div>

        <!-- Notificações -->
        <div class="sp-section sp-card" id="sp-section-notifications">
          <div class="sp-card-header">
            <div class="sp-card-header-icon" style="background: rgba(251,191,36,0.12); color: #FBBF24;">${SP_ICONS.bell}</div>
            <div class="sp-card-header-text">
              <p class="sp-section-label">Notificações</p>
              <p class="sp-section-desc">Locais — nada é enviado a servidores</p>
            </div>
          </div>
          <div role="list">
            ${renderSwitchHTML(
              'sp-notif-checkin',
              notifCheckin,
              'Lembrete diário de check-in',
              'Notifica no horário que você escolher',
              SP_ICONS.alarm
            )}
            ${renderSwitchHTML(
              'sp-notif-restock',
              notifRestock,
              'Alerta de reposição de estoque',
              'Avisa quando um suplemento da stack estiver acabando',
              SP_ICONS.package
            )}
          </div>
        </div>

        <!-- Segurança (only if authenticated) -->
        ${isAuthenticated ? `
        <div class="sp-section sp-card" id="sp-section-security">
          <div class="sp-card-header">
            <div class="sp-card-header-icon" style="background: rgba(34,197,94,0.1); color: #22C55E;">${SP_ICONS.lock}</div>
            <div class="sp-card-header-text">
              <p class="sp-section-label">Segurança</p>
              <p class="sp-section-desc">Proteção da sua conta</p>
            </div>
          </div>
          <div role="list">
            <div class="sp-row">
              <div class="sp-row-info">
                <div class="sp-row-icon">${SP_ICONS.shield}</div>
                <div class="sp-row-text">
                  <p class="sp-row-title">Autenticação em Duas Etapas (MFA)</p>
                  <p class="sp-row-subtitle">Proteja sua conta com uma camada extra de segurança</p>
                </div>
              </div>
              <div class="sp-row-control">
                ${isMfaEnabled
                  ? '<span class="sp-badge-active"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 5.5 4 7.5 8 3"/></svg> Ativo</span>'
                  : '<button class="sp-btn sp-btn-outline" id="sp-mfa-setup-btn">Configurar</button>'
                }
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Dados & Privacidade -->
        <div class="sp-section sp-card" id="sp-section-data">
          <div class="sp-card-header">
            <div class="sp-card-header-icon" style="background: rgba(96,165,250,0.12); color: #60A5FA;">${SP_ICONS.database}</div>
            <div class="sp-card-header-text">
              <p class="sp-section-label">Dados & Privacidade</p>
              <p class="sp-section-desc">Controle total sobre suas informações</p>
            </div>
          </div>

          <div class="sp-privacy-box">
            <span class="sp-privacy-icon">${SP_ICONS.lock}</span>
            <span>Seus dados ficam <strong>100% no seu dispositivo</strong>. Não temos servidores e nunca coletamos informações pessoais. (LGPD)</span>
          </div>

          <div role="list">
            ${renderActionRow('sp-export-btn', 'Exportar meus dados', 'Salva todas as suas informações em JSON', SP_ICONS.download, 'Exportar')}
            <div id="sp-export-file-row" style="display:none;">
              ${renderActionRow('sp-export-file-btn', 'Salvar backup local', 'Grava um arquivo .json no seu computador', SP_ICONS.save, 'Salvar')}
            </div>
            <div id="sp-import-file-row" style="display:none;">
              ${renderActionRow('sp-import-file-btn', 'Restaurar backup', 'Importa um arquivo .json salvo anteriormente', SP_ICONS.restore, 'Restaurar')}
            </div>
            ${renderActionRow('sp-clear-checkins-btn', 'Limpar histórico de check-ins', 'Remove todos os registros de adesão', SP_ICONS.trash, 'Limpar', 'sp-btn-outline')}
            ${renderActionRow('sp-reset-btn', 'Resetar tudo', 'Apaga todas as configurações e dados locais', SP_ICONS.warning, 'Resetar tudo', 'sp-btn-danger')}
          </div>
        </div>

        <!-- Sobre & Legal -->
        <div class="sp-section sp-card" id="sp-section-about">
          <div class="sp-card-header">
            <div class="sp-card-header-icon" style="background: rgba(244,114,182,0.12); color: #F472B6;">${SP_ICONS.bulb}</div>
            <div class="sp-card-header-text">
              <p class="sp-section-label">Sobre & Legal</p>
              <p class="sp-section-desc">Informações do app e documentos legais</p>
            </div>
          </div>

          <div class="sp-version-row">
            <span class="sp-version-logo">
              SupliList
              <span class="sp-version-tag">v4.0.0</span>
            </span>
            <span style="font-size:12px; color:var(--color-text-muted);">Feito com ${SP_ICONS.heart} e ciência</span>
          </div>

          <div role="list">
            ${renderLegalLink(SP_ICONS.help, 'Perguntas Frequentes (FAQ)', '/faq')}
            ${renderLegalLink(SP_ICONS.fileText, 'Termos de Uso', '/legal?doc=termos')}
            ${renderLegalLink(SP_ICONS.lock, 'Política de Privacidade', '/legal?doc=privacidade')}
            ${renderLegalLink(SP_ICONS.medical, 'Aviso Médico', '/legal?doc=medico')}
            ${renderLegalLink(SP_ICONS.link, 'Divulgação de Afiliados', '/legal?doc=afiliados')}
          </div>
        </div>

      </div><!-- /.sp-content -->
    </div><!-- /.sp-page -->
  `;
}
