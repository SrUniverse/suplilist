import { stateManager, ACTIONS, STORAGE_KEYS } from '../../state/state-manager.js';
import { eventBus } from '../../core/event-bus.js';
import { escapeHtml } from '../../utils/escape.js';
import { StorageManager } from '../../platform/storage-manager.js';
import { getAdherenceOverview } from '../analytics/adherence-tracker.js';
import { getRefillAlerts, getAlertMessage, getAlertColor } from './refill-alerts.js';
import { optimizeStack } from '../stack/stack-optimizer.js';
import { generateTimeline } from '../progress/before-after-tracker.js';
import { profileService } from './profile-service.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { identityService } from '../../platform/identity-service.js';
import { PhoneLinkSection } from '../auth/phone-link-section.js';
import './profile-page.css';

const OBJECTIVES = [
  { value: 'bulk', label: 'Bulk', desc: 'Ganho de Massa' },
  { value: 'cut', label: 'Cut', desc: 'Definição Muscular' },
  { value: 'strength', label: 'Força', desc: 'Força Máxima' },
  { value: 'endurance', label: 'Resistência', desc: 'Cardio & Endurance' },
  { value: 'general', label: 'Saúde', desc: 'Bem-estar Geral' },
];

function fieldLabel(text) {
  return `<label class="pp-field-label">${text}</label>`;
}

function cardWrap(title, content, extraClass = '') {
  return `
    <div class="pp-card${extraClass ? ' ' + extraClass : ''}">
      <h2 class="pp-card__title">${title}</h2>
      ${content}
    </div>
  `;
}

export default class ProfilePage {
  constructor(container) {
    this.container = container;
    this._form = {};
    this._editingName = false;
    /** @type {boolean} Guard contra mutações de DOM pós-desmontagem. */
    this._isMounted = false;
    /**
     * Referência local ao último perfil carregado do servidor.
     * Limpa em unmount() para evitar flash de cache antigo em re-mounts.
     * @type {object | null}
     */
    this._userData = null;
    /**
     * Unsubscribe da assinatura reativa de ui.isOffline.
     * Chamado em unmount() para desativar a bomba de memory leak.
     * @type {Function | null}
     */
    this._unsubscribeOffline = null;
  }

  async mount() {
    this._isMounted = true;
    this._userData = null;

    // Exibir skeleton enquanto aguarda o fetch do perfil do servidor.
    // O profileService.getProfile() possui deduplicação nativa via #fetchPromise —
    // se identityService.login() já chamou GET /api/profile/me, apenas 1 request sai.
    this._renderSkeleton();

    try {
      const profile = await profileService.getProfile();

      // Guard: o router pode ter navegado para outra página enquanto o fetch estava em voo.
      if (!this._isMounted) return;

      this._userData = profile;
    } catch (_err) {
      // Perfil indisponível (offline, 401, etc.) — usar estado local como fallback.
      if (!this._isMounted) return;
    }

    const user = this._userData || stateManager.user || {};
    this._form = {
      name: user.displayName || user.name || stateManager.get?.('user.name') || 'Usuário',
      objective: user.objective || stateManager.user?.objective || 'general',
      weight: user.weight || stateManager.user?.weight || '',
      biologicalSex: user.biologicalSex || stateManager.user?.biologicalSex || '',
      height: user.height || stateManager.user?.height || '',
      age: user.age || stateManager.user?.age || '',
    };
    this._render();
    this._attachListeners();

    // Sincronizar estado de rede imediatamente e inscrever para mudanças futuras.
    // stateManager.subscribe('ui.isOffline', cb) usa assinatura por caminho:
    // o callback recebe (newValue, oldValue) — não o estado completo.
    this._syncOfflineState(stateManager.get('ui.isOffline'));
    this._unsubscribeOffline = stateManager.subscribe('ui.isOffline', (isOffline) => {
      if (!this._isMounted) return;
      this._syncOfflineState(isOffline);
    });
  }

  unmount() {
    this._isMounted = false;
    if (this._phoneLink) { this._phoneLink.unmount(); this._phoneLink = null; }
    // Limpar referência local para evitar flash de cache antigo em re-mount rápido.
    this._userData = null;
    // Desarmar a bomba de memory leak: cancelar a assinatura reativa de rede.
    if (this._unsubscribeOffline) {
      this._unsubscribeOffline();
      this._unsubscribeOffline = null;
    }
  }

  /**
   * Sincroniza o estado visual dos controles de escrita com o estado de rede.
   *
   * Implementação de referência do contrato do OfflineHandler.
   * Componentes com controles de mutação devem implementar este padrão:
   *   1. Chamar _syncOfflineState(stateManager.get('ui.isOffline')) no mount()
   *   2. Subscrever stateManager.subscribe('ui.isOffline', ...)
   *   3. Cancelar a subscrição no unmount()
   *
   * @param {boolean} isOffline
   */
  _syncOfflineState(isOffline) {
    // Botão de salvar biometria
    const btnSaveBio = this.container.querySelector('#btn-save-bio');
    if (btnSaveBio) {
      btnSaveBio.disabled = isOffline;
      btnSaveBio.textContent = isOffline ? 'Indisponível Offline' : 'Salvar';
      btnSaveBio.style.opacity = isOffline ? '0.5' : '1';
    }

    // Botão de confirmar edição de nome
    const btnNameConfirm = this.container.querySelector('#btn-name-confirm');
    if (btnNameConfirm) {
      btnNameConfirm.disabled = isOffline;
      btnNameConfirm.style.opacity = isOffline ? '0.5' : '1';
    }
  }

  /**
   * Renderiza um skeleton de carregamento enquanto aguarda profileService.getProfile().
   * Usa inline styles para ser independente de classes CSS externas.
   */
  _renderSkeleton() {
    this.container.innerHTML = `
      <div class="pp-root">
        <div class="pp-skel-header">
          <div class="pp-skel pp-skel-avatar"></div>
          <div class="pp-skel pp-skel-name"></div>
        </div>
        <div class="pp-skel-card pp-skel-card--lg"></div>
        <div class="pp-skel-card pp-skel-card--sm"></div>
      </div>
    `;
  }

  _getObjectiveLabel() {
    const obj = OBJECTIVES.find(o => o.value === this._form.objective);
    return obj ? obj.label : 'Saúde';
  }

  _getInitial() {
    return (this._form.name || 'U').trim()[0].toUpperCase();
  }

  _renderAdherenceSection() {
    const checkins = stateManager.checkins || [];
    if (checkins.length === 0) {
      return cardWrap('Sua Aderência 📊', `
        <p class="pp-empty-text">
          Comece a marcar seus suplementos para ver sua aderência!
        </p>
      `);
    }

    const overview = getAdherenceOverview(checkins);
    const topSupplements = overview.topSupplements.slice(0, 5);

    const percentageColor = overview.averageAdherence >= 80 ? 'var(--color-success)' :
      overview.averageAdherence >= 60 ? 'var(--color-warning)' :
        'var(--color-error)';

    return cardWrap('Sua Aderência 📊', `
      <div class="pp-adherence-head">
        <div>
          <div class="pp-adherence-pct" style="color:${percentageColor};">${overview.averageAdherence}%</div>
          <div class="pp-adherence-cap">Aderência média (30 dias)</div>
        </div>
        <div class="pp-adherence-msg">
          ${overview.message}
        </div>
      </div>

      ${topSupplements.length > 0 ? `
        <div class="pp-section-top">
          <div class="pp-section-label">Top Suplementos</div>
          <div class="pp-top-list">
            ${topSupplements.map(supp => `
              <div class="pp-top-row">
                <span class="pp-top-name">${escapeHtml(SUPPLEMENTS_DB.find(s => s.id === supp.supplementId)?.name ?? supp.supplementId)}</span>
                <span class="pp-top-pct">${supp.percentage}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `);
  }

  _renderRefillAlertsSection() {
    const purchases = stateManager.user?.purchases || [];
    const alerts = getRefillAlerts(purchases);

    if (alerts.length === 0) {
      return cardWrap('Reposição de Suplementos 📦', `
        <p class="pp-empty-text">
          Nenhum alerta de reposição. Todos seus suplementos estão ok! ✅
        </p>
      `);
    }

    return cardWrap('Reposição de Suplementos 📦', `
      <div class="pp-alert-list">
        ${alerts.slice(0, 5).map(alert => `
          <div class="pp-alert" style="border-left:3px solid ${getAlertColor(alert.alertLevel)};background:${alert.alertLevel === 'critical' ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.05)'};">
            <div class="pp-alert-head">
              <span class="pp-alert-name">
                ${escapeHtml(alert.supplementId)}
              </span>
              <span class="pp-alert-days" style="color:${getAlertColor(alert.alertLevel)};">
                ${alert.daysRemaining} dia${alert.daysRemaining !== 1 ? 's' : ''}
              </span>
            </div>
            <div class="pp-alert-msg">
              ${getAlertMessage(alert.alertLevel, alert.daysRemaining)}
            </div>
            ${alert.price ? `
              <div class="pp-alert-price">
                Última compra: R$ ${alert.price.toFixed(2)}${alert.source ? ' em ' + escapeHtml(alert.source) : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `);
  }

  _renderStackOptimizerSection() {
    const stack = stateManager.stack || [];
    if (stack.length === 0) {
      return cardWrap('Otimizador de Stack', `
        <p class="pp-empty-text">
          Adicione suplementos ao seu stack para ver análise de otimização.
        </p>
      `);
    }

    const purchases = stateManager.user?.purchases || [];
    const goal = this._form.objective || 'general';
    const result = optimizeStack(stack, purchases, goal);

    const redundancyHtml = result.redundancies.length > 0 ? `
      <div class="pp-section-top">
        <div class="pp-section-label" style="color:var(--color-error);">Redundancias</div>
        ${result.redundancies.map(r => `
          <div class="pp-opt-redundancy">
            ${escapeHtml(r.message)}
          </div>
        `).join('')}
      </div>
    ` : '';

    const priorityGapsHtml = result.priorityGaps.length > 0 ? `
      <div class="pp-section-top">
        <div class="pp-section-label" style="color:var(--color-brand);">Adicionar para ${escapeHtml(goal)}</div>
        ${result.priorityGaps.slice(0, 3).map(g => `
          <div class="pp-opt-row">
            <span class="pp-opt-name">${escapeHtml(g.name)}</span>
            <span class="pp-opt-cost">~R$ ${g.cost}/mes</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const suggestionGapsHtml = result.suggestionGaps.length > 0 ? `
      <div class="pp-section-top">
        <div class="pp-section-label" style="font-weight:600;color:var(--color-text-tertiary);">Sugestoes opcionais</div>
        ${result.suggestionGaps.slice(0, 2).map(g => `
          <div class="pp-opt-row pp-opt-row--sm">
            <span class="pp-opt-name--sm">${escapeHtml(g.name)}</span>
            <span class="pp-opt-cost--sm">~R$ ${g.cost}/mes</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const savingsHtml = result.savingsPotential > 0 ? `
      <div class="pp-savings">
        <span class="pp-savings__text">
          Economia potencial: R$ ${result.savingsPotential.toFixed(2)}/mes
        </span>
      </div>
    ` : '';

    return cardWrap('Otimizador de Stack', `
      ${savingsHtml}
      <div class="pp-opt-recommendation">${escapeHtml(result.recommendation)}</div>
      ${redundancyHtml}
      ${priorityGapsHtml}
      ${suggestionGapsHtml}
    `);
  }

  _renderProgressSection() {
    const progress = stateManager.user?.progressRecords || [];

    if (progress.length === 0) {
      return cardWrap('Progresso Before/After', `
        <p class="pp-empty-text">
          Nenhum registro de progresso ainda. Adicione seu primeiro before/after no checkin.
        </p>
      `);
    }

    const timeline = generateTimeline(progress);
    if (timeline.length === 0) {
      return cardWrap('Progresso Before/After', `
        <p class="pp-empty-text">
          Registre pelo menos 2 medicoes para ver sua evolucao.
        </p>
      `);
    }

    const latest = timeline[timeline.length - 1];
    const { transformation } = latest;

    if (!transformation) {
      return cardWrap('Progresso Before/After', `
        <p class="pp-empty-text">
          Nao foi possivel calcular a transformacao. Verifique os dados dos registros.
        </p>
      `);
    }

    const changeColor = (v) => v > 0 ? 'var(--color-success)' : v < 0 ? 'var(--color-error)' : 'var(--color-text-secondary)';
    const sign = (v) => v > 0 ? '+' : '';

    return cardWrap('Progresso Before/After', `
      <div class="pp-row-between">
        <div>
          <div class="pp-progress-period">Periodo</div>
          <div class="pp-progress-range">${escapeHtml(latest.from)} → ${escapeHtml(latest.to)}</div>
        </div>
        <div class="pp-progress-dur">${latest.duration}d</div>
      </div>
      <div class="pp-progress-grid">
        <div class="pp-progress-cell">
          <div class="pp-progress-val" style="color:${changeColor(transformation.weightChange)};">${sign(transformation.weightChange)}${(transformation.weightChange ?? 0).toFixed(1)}kg</div>
          <div class="pp-progress-cap">Peso</div>
        </div>
        <div class="pp-progress-cell">
          <div class="pp-progress-val" style="color:${changeColor(transformation.chestChange)};">${sign(transformation.chestChange)}${(transformation.chestChange ?? 0).toFixed(1)}cm</div>
          <div class="pp-progress-cap">Peito</div>
        </div>
        <div class="pp-progress-cell">
          <div class="pp-progress-val" style="color:${changeColor(-(transformation.waistChange ?? 0))};">${sign(-(transformation.waistChange ?? 0))}${(-(transformation.waistChange ?? 0)).toFixed(1)}cm</div>
          <div class="pp-progress-cap">Cintura</div>
        </div>
      </div>
      <div class="pp-progress-summary">
        ${escapeHtml(transformation.summary)}
      </div>
    `);
  }

  _renderAuthSection() {
    const isAuthenticated = stateManager.user?.isAuthenticated || stateManager.get?.('user.isAuthenticated') || this._userData?.email;

    if (!isAuthenticated) {
      return cardWrap('Sua Conta ☁️', `
        <p class="pp-empty-text">
          Você está navegando como visitante. Faça login ou crie uma conta para fazer backup do seu stack e histórico na nuvem.
        </p>
        <div class="pp-btn-group">
          <button id="btn-profile-register" class="pp-btn pp-btn--primary">Criar Conta</button>
          <button id="btn-profile-login" class="pp-btn pp-btn--outline">Fazer Login</button>
        </div>
      `);
    }

    const email = stateManager.user?.email || this._userData?.email || 'Usuário logado';
    return cardWrap('Sua Conta ☁️', `
      <div class="pp-row-between">
        <div class="pp-account-email">
          Conectado como <strong>${escapeHtml(email)}</strong>
        </div>
        <button id="btn-profile-logout" class="pp-btn-logout">Sair</button>
      </div>
    `) + cardWrap('Telefone 📱', `<div id="phone-link-container"></div>`);
  }

  /** (Re)monta a seção de vínculo de telefone no placeholder, se autenticado. */
  _mountPhoneLinkSection() {
    if (this._phoneLink) { this._phoneLink.unmount(); this._phoneLink = null; }
    const host = this.container.querySelector('#phone-link-container');
    if (!host) return;
    this._phoneLink = new PhoneLinkSection(host);
    this._phoneLink.mount();
  }

  _render() {
    const form = this._form;
    const initial = this._getInitial();
    const objLabel = this._getObjectiveLabel();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    this.container.innerHTML = `
      <div class="pp-root">

        <!-- HEADER -->
        <div class="pp-header">
          <div id="profile-avatar-initial" class="pp-avatar">${initial}</div>

          <div class="pp-header-center">
            <div id="name-display" class="pp-name-row">
              <span id="name-text" class="pp-name-text">${escapeHtml(form.name)}</span>
              <button id="btn-edit-name" title="Editar nome" class="pp-icon-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div id="name-edit" class="pp-name-edit">
              <input id="inline-name-input" type="text" value="${escapeHtml(form.name)}" class="pp-input pp-name-input" />
              <div class="pp-btn-group pp-btn-group--center">
                <button id="btn-name-confirm" class="pp-btn pp-btn--primary pp-btn--sm">OK</button>
                <button id="btn-name-cancel" class="pp-btn--cancel">Cancelar</button>
              </div>
            </div>
            <div class="pp-badge-wrap">
              <span id="profile-objective-badge" class="pp-obj-badge">${objLabel}</span>
            </div>
          </div>
        </div>

        <!-- 0. CONTA -->
        ${this._renderAuthSection()}

        <!-- 1. DADOS BIOMÉTRICOS -->
        ${cardWrap('Dados Biométricos', `
          <div class="pp-grid-2">
            <div>
              ${fieldLabel('Peso (kg)')}
              <input id="field-weight" type="number" min="30" max="300" value="${form.weight}" placeholder="—" class="pp-input" />
            </div>
            <div>
              ${fieldLabel('Sexo Biológico')}
              <div class="pp-select-wrap">
                <select id="field-biologicalSex" class="pp-select">
                  <option value="" ${!form.biologicalSex ? 'selected' : ''}>—</option>
                  <option value="male" ${form.biologicalSex === 'male' ? 'selected' : ''}>Masculino</option>
                  <option value="female" ${form.biologicalSex === 'female' ? 'selected' : ''}>Feminino</option>
                </select>
                <svg class="pp-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div>
              ${fieldLabel('Altura (cm)')}
              <input id="field-height" type="number" min="100" max="250" value="${form.height}" placeholder="—" class="pp-input" />
            </div>
            <div>
              ${fieldLabel('Idade')}
              <input id="field-age" type="number" min="10" max="100" value="${form.age}" placeholder="—" class="pp-input" />
            </div>
          </div>
          <div>
            ${fieldLabel('Objetivo Principal')}
            <div class="pp-select-wrap">
              <select id="field-objective" class="pp-select">
                ${OBJECTIVES.map(o => `<option value="${o.value}" ${form.objective === o.value ? 'selected' : ''}>${o.label} — ${o.desc}</option>`).join('')}
              </select>
              <svg class="pp-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <button id="btn-save-bio" class="pp-btn pp-btn--primary pp-btn--start">Salvar</button>
        `)}

        <!-- 2. APARÊNCIA -->
        ${cardWrap('Aparência', `
          <div class="pp-row-between">
            <div class="pp-theme-row">
              <span id="theme-icon" class="pp-theme-icon">${isDark ? '🌙' : '☀️'}</span>
              <div>
                <div class="pp-theme-label" id="theme-label">${isDark ? 'Tema Escuro' : 'Tema Claro'}</div>
                <div class="pp-theme-sub">Aparência do app</div>
              </div>
            </div>
            <button id="theme-toggle" class="pp-toggle" role="switch" aria-checked="${isDark}">
              <span class="pp-toggle__knob">${isDark ? '🌙' : '☀️'}</span>
            </button>
          </div>
        `)}

        <!-- 3. SUA ADERÊNCIA (Premium Feature) -->
        ${this._renderAdherenceSection()}

        <!-- 3B. ALERTAS DE REPOSIÇÃO (Premium Feature) -->
        ${this._renderRefillAlertsSection()}

        <!-- 3C. OTIMIZADOR DE STACK -->
        ${this._renderStackOptimizerSection()}

        <!-- 3D. PROGRESSO BEFORE/AFTER -->
        ${this._renderProgressSection()}

        <!-- 4. DADOS & PRIVACIDADE -->
        ${cardWrap('Dados & Privacidade', `
          <p class="pp-empty-text">
            Seus dados ficam 100% no seu dispositivo. Nunca enviamos nada para servidores.
          </p>
          <div class="pp-col">
            <button id="btn-export" class="pp-btn pp-btn--outline pp-btn--icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Dados
            </button>
            <button id="btn-clear-checkins" class="pp-btn pp-btn--warning pp-btn--icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Limpar Histórico de Check-ins
            </button>
            <button id="btn-reset-data" class="pp-btn pp-btn--error pp-btn--icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Resetar Tudo
            </button>
          </div>
        `)}

        <!-- 4. SOBRE O APP -->
        ${cardWrap('Sobre o App', `
          <div class="pp-col">
            <div class="pp-row-between">
              <span class="pp-text-sm">Versão</span>
              <span class="pp-text-strong">4.0.0</span>
            </div>
            <div class="pp-divider"></div>
            <div class="pp-row-between">
              <span class="pp-text-sm">Repositório</span>
              <a href="https://github.com/suplilist/suplilist" target="_blank" rel="noopener noreferrer" class="pp-link">GitHub ↗</a>
            </div>
            <div class="pp-divider"></div>
            <div class="pp-meta-center">
              <span class="pp-text-sm">Feito com ❤️ e ciência</span>
            </div>
          </div>
        `)}

      </div>
    `;
  }

  _attachListeners() {
    // Vínculo de telefone (componente auto-contido) — remontado a cada render.
    this._mountPhoneLinkSection();

    // Inline name edit
    const btnEditName = this.container.querySelector('#btn-edit-name');
    const nameDisplay = this.container.querySelector('#name-display');
    const nameEdit = this.container.querySelector('#name-edit');
    const nameText = this.container.querySelector('#name-text');
    const inlineInput = this.container.querySelector('#inline-name-input');
    const btnNameConfirm = this.container.querySelector('#btn-name-confirm');
    const btnNameCancel = this.container.querySelector('#btn-name-cancel');

    if (btnEditName) {
      btnEditName.addEventListener('click', () => {
        nameDisplay.style.display = 'none';
        nameEdit.style.display = 'block';
        inlineInput.focus();
        inlineInput.select();
      });
    }

    if (btnNameConfirm) {
      btnNameConfirm.addEventListener('click', async () => {
        const val = (inlineInput.value || '').trim();
        if (val) {
          try {
            btnNameConfirm.disabled = true;
            btnNameConfirm.style.opacity = '0.5';
            
            await profileService.updateProfile({ displayName: val });
            
            this._form.name = val;
            nameText.textContent = val;
            const avatarEl = this.container.querySelector('#profile-avatar-initial');
            if (avatarEl) avatarEl.textContent = val[0].toUpperCase();
            
            eventBus.emit('toast:show', { message: 'Nome atualizado!', type: 'success' });
          } catch (_err) {
            eventBus.emit('toast:show', { message: 'Erro ao atualizar nome.', type: 'error' });
          } finally {
            btnNameConfirm.disabled = false;
            btnNameConfirm.style.opacity = '1';
          }
        }
        nameEdit.style.display = 'none';
        nameDisplay.style.display = 'flex';
      });
    }

    if (btnNameCancel) {
      btnNameCancel.addEventListener('click', () => {
        inlineInput.value = this._form.name;
        nameEdit.style.display = 'none';
        nameDisplay.style.display = 'flex';
      });
    }

    if (inlineInput) {
      inlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnNameConfirm && btnNameConfirm.click();
        if (e.key === 'Escape') btnNameCancel && btnNameCancel.click();
      });
    }

    // Biometrics save
    const btnSaveBio = this.container.querySelector('#btn-save-bio');
    if (btnSaveBio) {
      const weightEl = this.container.querySelector('#field-weight');
      const sexEl = this.container.querySelector('#field-biologicalSex');
      const heightEl = this.container.querySelector('#field-height');
      const ageEl = this.container.querySelector('#field-age');
      const objectiveEl = this.container.querySelector('#field-objective');

      btnSaveBio.addEventListener('click', () => {
        const _num = v => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
        this._form.weight = _num(weightEl.value);
        this._form.biologicalSex = sexEl.value || undefined;
        this._form.height = _num(heightEl.value);
        this._form.age = _num(ageEl.value);
        this._form.objective = objectiveEl.value;

        stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
          name: this._form.name,
          weight: this._form.weight,
          biologicalSex: this._form.biologicalSex,
          height: this._form.height,
          age: this._form.age,
          objective: this._form.objective,
        });

        eventBus.emit('toast:show', { message: 'Dados biométricos salvos!', type: 'success' });

        // Update objective badge
        const badge = this.container.querySelector('#profile-objective-badge');
        if (badge) badge.textContent = this._getObjectiveLabel();
      });
    }

    // Theme toggle
    const themeToggle = this.container.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isCurrentlyDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        // P11: usar chave canônica STORAGE_KEYS.THEME (antes gravava em 'theme' — chave legada)
        StorageManager.setItem(STORAGE_KEYS.THEME, newTheme);

        // Update toggle UI (visual de background/posição é dirigido por CSS via [aria-checked])
        const nowDark = newTheme === 'dark';
        themeToggle.setAttribute('aria-checked', nowDark);
        const knob = themeToggle.querySelector('.pp-toggle__knob');
        if (knob) knob.textContent = nowDark ? '🌙' : '☀️';
        const themeIcon = this.container.querySelector('#theme-icon');
        const themeLabel = this.container.querySelector('#theme-label');
        if (themeIcon) themeIcon.textContent = nowDark ? '🌙' : '☀️';
        if (themeLabel) themeLabel.textContent = nowDark ? 'Tema Escuro' : 'Tema Claro';
      });
    }

    // Export data
    const btnExport = this.container.querySelector('#btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        try {
          const data = {
            user: stateManager.user,
            stack: stateManager.stack,
            checkins: stateManager.checkins,
            exportedAt: new Date().toISOString(),
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `suplilist-backup-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          eventBus.emit('toast:show', { message: 'Dados exportados!', type: 'success' });
        } catch {
          eventBus.emit('toast:show', { message: 'Erro ao exportar dados.', type: 'error' });
        }
      });
    }

    // Clear check-ins
    const btnClearCheckins = this.container.querySelector('#btn-clear-checkins');
    if (btnClearCheckins) {
      btnClearCheckins.addEventListener('click', () => {
        if (confirm('Apagar todo o histórico de check-ins? Esta ação não pode ser desfeita.')) {
          stateManager.dispatch(ACTIONS.CLEAR_CHECKINS);
          eventBus.emit('toast:show', { message: 'Histórico de check-ins apagado.', type: 'info' });
        }
      });
    }

    // Reset all
    const btnReset = this.container.querySelector('#btn-reset-data');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const confirmation = prompt('Para confirmar, digite RESETAR:');
        if (confirmation === 'RESETAR') {
          stateManager.reset();
          // P11: limpar todas as chaves do localStorage — incluindo a legada 'theme'
          // que não é gerenciada pelo stateManager
          StorageManager.removeItem('suplilist:favorites');
          StorageManager.removeItem(STORAGE_KEYS.THEME);  // chave canônica
          StorageManager.removeItem('theme');              // chave legada (retrocompat)
          StorageManager.removeItem('suplilist:notif-checkin');
          StorageManager.removeItem('suplilist:notif-restock');
          StorageManager.removeItem('suplilist:sidebar-collapsed');
          eventBus.emit('toast:show', { message: 'App resetado com sucesso.', type: 'info' });
          window.history.pushState(null, null, '/home');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (confirmation !== null) {
          eventBus.emit('toast:show', { message: 'Texto incorreto. Reset cancelado.', type: 'error' });
        }
      });
    }

    // Auth actions
    const btnProfileRegister = this.container.querySelector('#btn-profile-register');
    if (btnProfileRegister) {
      btnProfileRegister.addEventListener('click', () => {
        eventBus.emit('router:navigate', { path: '/onboarding' });
      });
    }
    const btnProfileLogin = this.container.querySelector('#btn-profile-login');
    if (btnProfileLogin) {
      btnProfileLogin.addEventListener('click', () => {
        eventBus.emit('router:navigate', { path: '/login' });
      });
    }
    const btnProfileLogout = this.container.querySelector('#btn-profile-logout');
    if (btnProfileLogout) {
      btnProfileLogout.addEventListener('click', async () => {
        btnProfileLogout.textContent = 'Saindo...';
        try {
          await identityService.logout();
        } catch (_err) {
          eventBus.emit('toast:show', { message: 'Erro ao desconectar.', type: 'error' });
          btnProfileLogout.textContent = 'Sair';
        }
      });
    }
  }
}
