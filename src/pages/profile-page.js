import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';
import { escapeHtml } from '../utils/escape.js';

const OBJECTIVES = [
  { value: 'bulk',      label: 'Bulk',       desc: 'Ganho de Massa' },
  { value: 'cut',       label: 'Cut',        desc: 'Definição Muscular' },
  { value: 'strength',  label: 'Força',      desc: 'Força Máxima' },
  { value: 'endurance', label: 'Resistência', desc: 'Cardio & Endurance' },
  { value: 'general',   label: 'Saúde',      desc: 'Bem-estar Geral' },
];

const inputStyle = [
  'width:100%',
  'padding:11px 14px',
  'background:var(--color-bg-secondary)',
  'border:1px solid var(--color-border)',
  'color:var(--color-text-primary)',
  'border-radius:10px',
  'font-size:14px',
  'font-family:inherit',
  'box-sizing:border-box',
  'outline:none',
  'transition:border-color 0.15s',
].join(';');

const selectStyle = inputStyle + ';appearance:none;cursor:pointer;';

function fieldLabel(text) {
  return `<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:6px;">${text}</label>`;
}

function cardWrap(title, content, extra = '') {
  return `
    <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px;${extra}">
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin:0;">${title}</h2>
      ${content}
    </div>
  `;
}

export default class ProfilePage {
  constructor(container) {
    this.container = container;
    this._form = {};
    this._editingName = false;
  }

  mount() {
    const user = stateManager.user || {};
    this._form = {
      name:              user.name              || 'Usuário',
      objective:         user.objective         || 'general',
      weight:            user.weight            || '',
      height:            user.height            || '',
      age:               user.age               || '',
    };
    this._render();
    this._attachListeners();
  }

  unmount() {}

  _getObjectiveLabel() {
    const obj = OBJECTIVES.find(o => o.value === this._form.objective);
    return obj ? obj.label : 'Saúde';
  }

  _getInitial() {
    return (this._form.name || 'U').trim()[0].toUpperCase();
  }

  _render() {
    const form = this._form;
    const initial = this._getInitial();
    const objLabel = this._getObjectiveLabel();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    this.container.innerHTML = `
      <div style="padding:24px 16px 60px;display:flex;flex-direction:column;gap:20px;max-width:600px;margin:0 auto;">

        <!-- HEADER -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0 8px;">
          <div id="profile-avatar-initial" style="
            width:72px;height:72px;border-radius:50%;
            background:var(--color-brand);
            display:flex;align-items:center;justify-content:center;
            font-size:28px;font-weight:800;color:#fff;font-family:'Plus Jakarta Sans','Inter',sans-serif;
            flex-shrink:0;
          ">${initial}</div>

          <div style="text-align:center;">
            <div id="name-display" style="display:flex;align-items:center;gap:8px;justify-content:center;">
              <span id="name-text" style="font-size:22px;font-weight:800;font-family:'Plus Jakarta Sans','Inter',sans-serif;letter-spacing:-0.02em;">${escapeHtml(form.name)}</span>
              <button id="btn-edit-name" title="Editar nome" style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:2px;display:flex;align-items:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div id="name-edit" style="display:none;margin-top:6px;">
              <input id="inline-name-input" type="text" value="${escapeHtml(form.name)}" style="${inputStyle};text-align:center;font-size:16px;font-weight:700;max-width:220px;" />
              <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
                <button id="btn-name-confirm" style="background:var(--color-brand);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;">OK</button>
                <button id="btn-name-cancel" style="background:transparent;border:1px solid var(--color-border-strong);color:var(--color-text-secondary);border-radius:8px;padding:7px 14px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;">Cancelar</button>
              </div>
            </div>
            <div style="margin-top:8px;">
              <span style="
                background:var(--color-brand-muted);
                color:var(--color-brand);
                font-size:11px;font-weight:700;
                padding:3px 10px;border-radius:20px;
                text-transform:uppercase;letter-spacing:0.06em;
              ">${objLabel}</span>
            </div>
          </div>
        </div>

        <!-- 1. DADOS BIOMÉTRICOS -->
        ${cardWrap('Dados Biométricos', `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div>
              ${fieldLabel('Peso (kg)')}
              <input id="field-weight" type="number" min="30" max="300" value="${form.weight}" placeholder="—" style="${inputStyle}" />
            </div>
            <div>
              ${fieldLabel('Altura (cm)')}
              <input id="field-height" type="number" min="100" max="250" value="${form.height}" placeholder="—" style="${inputStyle}" />
            </div>
            <div>
              ${fieldLabel('Idade')}
              <input id="field-age" type="number" min="10" max="100" value="${form.age}" placeholder="—" style="${inputStyle}" />
            </div>
          </div>
          <div>
            ${fieldLabel('Objetivo Principal')}
            <div style="position:relative;">
              <select id="field-objective" style="${selectStyle}">
                ${OBJECTIVES.map(o => `<option value="${o.value}" ${form.objective === o.value ? 'selected' : ''}>${o.label} — ${o.desc}</option>`).join('')}
              </select>
              <svg style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--color-text-secondary);" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <button id="btn-save-bio" style="
            background:var(--color-brand);color:#fff;border:none;
            border-radius:10px;padding:11px 20px;
            font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;
            align-self:flex-start;
          ">Salvar</button>
        `)}

        <!-- 2. APARÊNCIA -->
        ${cardWrap('Aparência', `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span id="theme-icon" style="font-size:20px;">${isDark ? '🌙' : '☀️'}</span>
              <div>
                <div style="font-size:14px;font-weight:600;" id="theme-label">${isDark ? 'Tema Escuro' : 'Tema Claro'}</div>
                <div style="font-size:12px;color:var(--color-text-secondary);">Aparência do app</div>
              </div>
            </div>
            <button id="theme-toggle" role="switch" aria-checked="${isDark}" style="
              position:relative;width:52px;height:28px;
              background:${isDark ? 'var(--color-brand)' : 'var(--color-surface-secondary)'};
              border:1px solid ${isDark ? 'var(--color-brand)' : 'var(--color-border-strong)'};
              border-radius:50px;cursor:pointer;transition:background 0.2s,border-color 0.2s;
              flex-shrink:0;
            ">
              <span style="
                position:absolute;top:3px;
                left:${isDark ? '26px' : '3px'};
                width:20px;height:20px;border-radius:50%;
                background:#fff;transition:left 0.2s;
                display:flex;align-items:center;justify-content:center;
                font-size:11px;
              ">${isDark ? '🌙' : '☀️'}</span>
            </button>
          </div>
        `)}

        <!-- 3. DADOS & PRIVACIDADE -->
        ${cardWrap('Dados & Privacidade', `
          <p style="font-size:13px;color:var(--color-text-secondary);margin:0;line-height:1.5;">
            Seus dados ficam 100% no seu dispositivo. Nunca enviamos nada para servidores.
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button id="btn-export" style="
              background:transparent;color:var(--color-text-primary);
              border:1px solid var(--color-border-strong);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Dados
            </button>
            <button id="btn-clear-checkins" style="
              background:var(--color-warning-bg);color:var(--color-warning);
              border:1px solid rgba(245,158,11,0.3);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Limpar Histórico de Check-ins
            </button>
            <button id="btn-reset-data" style="
              background:var(--color-error-bg);color:var(--color-error);
              border:1px solid rgba(239,68,68,0.3);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Resetar Tudo
            </button>
          </div>
        `)}

        <!-- 4. SOBRE O APP -->
        ${cardWrap('Sobre o App', `
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Versão</span>
              <span style="font-size:13px;font-weight:600;">4.0.0</span>
            </div>
            <div style="height:1px;background:var(--color-border);"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Repositório</span>
              <a href="https://github.com/suplilist/suplilist" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:600;color:var(--color-brand);text-decoration:none;">GitHub ↗</a>
            </div>
            <div style="height:1px;background:var(--color-border);"></div>
            <div style="text-align:center;padding-top:4px;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Feito com ❤️ e ciência</span>
            </div>
          </div>
        `)}

      </div>
    `;
  }

  _attachListeners() {
    // Inline name edit
    const btnEditName    = this.container.querySelector('#btn-edit-name');
    const nameDisplay    = this.container.querySelector('#name-display');
    const nameEdit       = this.container.querySelector('#name-edit');
    const nameText       = this.container.querySelector('#name-text');
    const inlineInput    = this.container.querySelector('#inline-name-input');
    const btnNameConfirm = this.container.querySelector('#btn-name-confirm');
    const btnNameCancel  = this.container.querySelector('#btn-name-cancel');

    if (btnEditName) {
      btnEditName.addEventListener('click', () => {
        nameDisplay.style.display = 'none';
        nameEdit.style.display = 'block';
        inlineInput.focus();
        inlineInput.select();
      });
    }

    if (btnNameConfirm) {
      btnNameConfirm.addEventListener('click', () => {
        const val = (inlineInput.value || '').trim();
        if (val) {
          this._form.name = val;
          nameText.textContent = val;
          const avatarEl = this.container.querySelector('#profile-avatar-initial');
          if (avatarEl) avatarEl.textContent = val[0].toUpperCase();
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
      const weightEl    = this.container.querySelector('#field-weight');
      const heightEl    = this.container.querySelector('#field-height');
      const ageEl       = this.container.querySelector('#field-age');
      const objectiveEl = this.container.querySelector('#field-objective');

      btnSaveBio.addEventListener('click', () => {
        this._form.weight    = parseFloat(weightEl.value)    || undefined;
        this._form.height    = parseFloat(heightEl.value)    || undefined;
        this._form.age       = parseFloat(ageEl.value)       || undefined;
        this._form.objective = objectiveEl.value;

        stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
          name:      this._form.name,
          weight:    this._form.weight,
          height:    this._form.height,
          age:       this._form.age,
          objective: this._form.objective,
        });

        eventBus.emit('toast:show', { message: 'Dados biométricos salvos!', type: 'success' });

        // Update objective badge
        const badge = this.container.querySelector('span[style*="brand-muted"]');
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
        localStorage.setItem('theme', newTheme);

        // Update toggle UI
        const nowDark = newTheme === 'dark';
        themeToggle.style.background     = nowDark ? 'var(--color-brand)' : 'var(--color-surface-secondary)';
        themeToggle.style.borderColor    = nowDark ? 'var(--color-brand)' : 'var(--color-border-strong)';
        themeToggle.setAttribute('aria-checked', nowDark);
        const knob = themeToggle.querySelector('span');
        if (knob) {
          knob.style.left      = nowDark ? '26px' : '3px';
          knob.textContent     = nowDark ? '🌙' : '☀️';
        }
        const themeIcon  = this.container.querySelector('#theme-icon');
        const themeLabel = this.container.querySelector('#theme-label');
        if (themeIcon)  themeIcon.textContent  = nowDark ? '🌙' : '☀️';
        if (themeLabel) themeLabel.textContent  = nowDark ? 'Tema Escuro' : 'Tema Claro';
      });
    }

    // Export data
    const btnExport = this.container.querySelector('#btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        try {
          const data = {
            user:      stateManager.user,
            stack:     stateManager.stack,
            checkins:  stateManager.checkins,
            exportedAt: new Date().toISOString(),
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `suplilist-backup-${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          eventBus.emit('toast:show', { message: 'Dados exportados!', type: 'success' });
        } catch (err) {
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
          // Also clear the separate favorites localStorage key (not managed by stateManager)
          localStorage.removeItem('suplilist:favorites');
          localStorage.removeItem('suplilist:notif-checkin');
          localStorage.removeItem('suplilist:notif-restock');
          localStorage.removeItem('suplilist:sidebar-collapsed');
          eventBus.emit('toast:show', { message: 'App resetado com sucesso.', type: 'info' });
          window.history.pushState(null, null, '/home');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (confirmation !== null) {
          eventBus.emit('toast:show', { message: 'Texto incorreto. Reset cancelado.', type: 'error' });
        }
      });
    }
  }
}
