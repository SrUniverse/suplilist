import { stateManager, ACTIONS } from '../../state/state-manager.js';
import recommender from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';
import { identityService } from '../../platform/identity-service.js';
import { computeDailyDose, formatDose } from '../stack/stack-dose.js';

/** Tamanho do stack curado sugerido no onboarding. */
const ONBOARDING_STACK_SIZE = 6;

/**
 * Dispara um evento de funil no Plausible (custom events).
 * O stub `window.plausible` é definido no index.html; seguro chamar sempre.
 * @param {string} name
 * @param {Object} [props]
 */
function trackFunnel(name, props) {
  try {
    window.plausible?.(name, props ? { props } : undefined);
  } catch { /* analytics nunca pode quebrar o fluxo */ }
}

const GOALS = [
  { key: 'bulk',       emoji: '💪', label: 'Hipertrofia' },
  { key: 'strength',   emoji: '⚡', label: 'Força' },
  { key: 'cut',        emoji: '🔥', label: 'Emagrecimento' },
  { key: 'endurance',  emoji: '🏃', label: 'Resistência' },
  { key: 'general',    emoji: '🛡️', label: 'Saúde Geral' },
];

export default class OnboardingPage {
  constructor(container) {
    this.container = container;
    this.step = 1;
    this.data = { name: '', goal: null, weight: null, trainingFrequency: 3, selectedIds: new Set() };
    this._suggestions = [];
    this._clickHandler = null;
    this._popstateHandler = null;
    this._isLoading = false;
    this._registerError = null;
  }

  mount() {
    this._popstateHandler = () => {
      window.history.replaceState(null, null, '/onboarding');
    };
    window.addEventListener('popstate', this._popstateHandler);
    trackFunnel('onboarding_start');
    this._render();
  }

  unmount() {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
      this._popstateHandler = null;
    }
    if (this._clickHandler) {
      this.container.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this.container.innerHTML = '';
  }

  _render() {
    if (this._clickHandler) {
      this.container.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    switch (this.step) {
      case 1: this._renderStep1(); break;
      case 2: this._renderStep2(); break;
      case 3: this._renderStep3(); break;
      case 4: this._renderStep4(); break;
    }
    this._clickHandler = (e) => this._handleClick(e);
    this.container.addEventListener('click', this._clickHandler);
  }

  // ── Wizard mode ───────────────────────────────────────────────────────────────

  _renderStep1() {
    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">1 / 4</p>
          <h1 class="onboarding-title">Bem-vindo ao SupliList</h1>
          <p class="onboarding-subtitle">Vamos montar seu stack personalizado em 2 minutos.</p>
          <input
            class="onboarding-input"
            data-testid="onboarding-input-name"
            type="text"
            placeholder="Seu nome"
            aria-label="Seu nome"
            autocomplete="given-name"
            value="${escapeHtml(this.data.name)}"
            style="margin-bottom:1.75rem"
          />
          <div class="onboarding-actions">
            <button class="onboarding-btn-next" data-testid="onboarding-btn-next-1" ${this.data.name.trim() ? '' : 'disabled'}>
              Começar →
            </button>
          </div>
        </div>
      </div>`;

    const input = this.container.querySelector('.onboarding-input');
    const btn   = this.container.querySelector('.onboarding-btn-next');
    input.addEventListener('input', () => {
      this.data.name = input.value;
      btn.disabled = !input.value.trim();
    });
    setTimeout(() => input.focus(), 50);
  }

  _renderStep2() {
    const goalsHtml = GOALS.map(g => `
      <button
        class="onboarding-goal-card${this.data.goal === g.key ? ' selected' : ''}"
        data-goal="${g.key}"
        data-testid="onboarding-goal-${g.key}"
      >
        <span class="onboarding-goal-card__emoji">${g.emoji}</span>
        <span class="onboarding-goal-card__label">${g.label}</span>
      </button>`).join('');

    const freqOptions = [
      { v: 2, label: '1-2x' },
      { v: 4, label: '3-4x' },
      { v: 6, label: '5-6x' },
    ];
    const freqHtml = freqOptions.map(o => `
      <button
        class="onboarding-goal-card onboarding-freq-card${this.data.trainingFrequency === o.v ? ' selected' : ''}"
        data-freq="${o.v}"
        data-testid="onboarding-freq-${o.v}"
        style="padding:0.75rem 0.5rem;"
      >
        <span class="onboarding-goal-card__label">${o.label}</span>
      </button>`).join('');

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">2 / 4</p>
          <h1 class="onboarding-title">Qual é seu principal objetivo?</h1>
          <p class="onboarding-subtitle">Vamos calcular doses personalizadas pra você.</p>
          <div class="onboarding-goal-grid">${goalsHtml}</div>

          <label for="onboarding-weight-input" style="display:block;font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);margin:1.5rem 0 0.5rem;">Seu peso (kg)</label>
          <input
            id="onboarding-weight-input"
            class="onboarding-input onboarding-weight-input"
            data-testid="onboarding-input-weight"
            type="number" inputmode="numeric" min="30" max="250"
            placeholder="Ex.: 75"
            aria-label="Peso em quilogramas"
            value="${this.data.weight ?? ''}"
          />

          <label style="display:block;font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);margin:1.25rem 0 0.5rem;">Treinos por semana</label>
          <div class="onboarding-goal-grid" style="grid-template-columns:repeat(3,1fr);">${freqHtml}</div>

          <div class="onboarding-actions" style="margin-top:1.75rem;">
            <button class="onboarding-btn-back" data-testid="onboarding-btn-back-2">← Voltar</button>
            <button class="onboarding-btn-next" data-testid="onboarding-btn-next-2" ${this._isStep2Valid() ? '' : 'disabled'}>
              Continuar →
            </button>
          </div>
        </div>
      </div>`;

    const weightInput = this.container.querySelector('.onboarding-weight-input');
    if (weightInput) {
      weightInput.addEventListener('input', () => {
        const v = parseFloat(weightInput.value);
        this.data.weight = Number.isFinite(v) && v > 0 ? v : null;
        // Mudar o peso invalida o stack já calculado.
        this._suggestions = [];
        const btn = this.container.querySelector('.onboarding-btn-next');
        if (btn) btn.disabled = !this._isStep2Valid();
      });
    }
  }

  _isStep2Valid() {
    return !!this.data.goal && Number.isFinite(this.data.weight) && this.data.weight > 0;
  }

  /** Perfil biométrico coletado, para o motor de dose. */
  _dosageProfile() {
    return {
      weight: this.data.weight || 70,
      trainingFrequency: this.data.trainingFrequency || 3,
      objective: this.data.goal || 'general',
      age: 25,
    };
  }

  _renderStep3() {
    if (!this._suggestions.length) {
      this._suggestions = recommender.getRecommendations({
        objective: this.data.goal,
        weight: this.data.weight || 70,
        limit: ONBOARDING_STACK_SIZE,
      });
      this.data.selectedIds = new Set(this._suggestions.map(s => s.id));
      trackFunnel('onboarding_stack_generated', {
        objective: this.data.goal,
        count: this._suggestions.length,
      });
    }

    const profile = this._dosageProfile();
    const suppsHtml = this._suggestions.length
      ? this._suggestions.map(s => {
          const sel = this.data.selectedIds.has(s.id);
          const dose = computeDailyDose(s, profile);
          return `
            <div class="onboarding-supp-card${sel ? ' selected' : ''}" data-supp="${escapeHtml(s.id)}" data-testid="onboarding-supp-${escapeHtml(s.id)}">
              <div class="onboarding-supp-card__check">${sel ? '✓' : ''}</div>
              <div class="onboarding-supp-card__info">
                <div class="onboarding-supp-card__name">${escapeHtml(s.name)}</div>
                <div class="onboarding-supp-card__meta">${escapeHtml(s.category)} · ${escapeHtml(formatDose(dose))} · Evidência ${escapeHtml(s.evidenceLevel ?? s.priority)}</div>
              </div>
            </div>`;
        }).join('')
      : '<div class="onboarding-supp-empty">Nenhuma sugestão encontrada. Você pode explorar o catálogo após o cadastro.</div>';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">3 / 4</p>
          <h1 class="onboarding-title">Seu stack recomendado</h1>
          <p class="onboarding-subtitle">Baseado no seu objetivo. Você pode ajustar depois.</p>
          <div class="onboarding-supp-list">${suppsHtml}</div>
          <div class="onboarding-actions">
            <button class="onboarding-btn-back" data-testid="onboarding-btn-back-3">← Voltar</button>
            <button class="onboarding-btn-next" data-testid="onboarding-btn-next-3">Continuar →</button>
          </div>
        </div>
      </div>`;
  }

  _handleClick(e) {
    if (e.target.closest('.onboarding-btn-back')) {
      this.step = Math.max(1, this.step - 1);
      this._render();
      return;
    }

    const goalCard = e.target.closest('[data-goal]');
    if (goalCard) {
      if (goalCard.dataset.goal === this.data.goal) return;
      this.data.goal = goalCard.dataset.goal;
      this._suggestions = [];
      this.data.selectedIds = new Set();
      this.container.querySelectorAll('[data-goal]').forEach(c => {
        c.classList.toggle('selected', c.dataset.goal === this.data.goal);
      });
      trackFunnel('onboarding_objective', { objective: this.data.goal });
      const btn = this.container.querySelector('.onboarding-btn-next');
      if (btn) btn.disabled = !this._isStep2Valid();
      return;
    }

    const freqCard = e.target.closest('[data-freq]');
    if (freqCard) {
      this.data.trainingFrequency = parseInt(freqCard.dataset.freq, 10);
      this._suggestions = []; // muda a dose
      this.container.querySelectorAll('[data-freq]').forEach(c => {
        c.classList.toggle('selected', parseInt(c.dataset.freq, 10) === this.data.trainingFrequency);
      });
      return;
    }

    const suppCard = e.target.closest('[data-supp]');
    if (suppCard) {
      const id = suppCard.dataset.supp;
      if (this.data.selectedIds.has(id)) {
        this.data.selectedIds.delete(id);
        suppCard.classList.remove('selected');
        suppCard.querySelector('.onboarding-supp-card__check').textContent = '';
      } else {
        this.data.selectedIds.add(id);
        suppCard.classList.add('selected');
        suppCard.querySelector('.onboarding-supp-card__check').textContent = '✓';
      }
      return;
    }

    if (e.target.closest('.onboarding-btn-next')) {
      if (this.step < 4) {
        this.step++;
        this._render();
      } else {
        this._handleRegister();
      }
      return;
    }

    if (e.target.closest('[data-action="skip-register"]')) {
      trackFunnel('onboarding_skip_account', { stackSize: this.data.selectedIds.size });
      this._finalize();
      return;
    }

    if (e.target.closest('[data-action="goto-login"]')) {
      this._finalize();
      eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/login' });
      return;
    }
  }

  _renderStep4() {
    const errorHtml = this._registerError
      ? `<div class="onboarding-error" data-testid="onboarding-register-error" role="alert">${escapeHtml(this._registerError)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">4 / 4</p>
          <h1 class="onboarding-title">Crie sua conta</h1>
          <p class="onboarding-subtitle">Salve seu stack na nuvem e acesse de qualquer dispositivo.</p>
          ${errorHtml}
          <input
            class="onboarding-input"
            data-testid="onboarding-input-email"
            type="email"
            placeholder="E-mail"
            autocomplete="email"
            aria-label="E-mail"
          />
          <input
            class="onboarding-input"
            data-testid="onboarding-input-password"
            type="password"
            placeholder="Senha (mín. 8 caracteres)"
            autocomplete="new-password"
            aria-label="Senha"
            style="margin-top:0.75rem"
          />
          <div class="onboarding-actions" style="margin-top:1.75rem">
            <button class="onboarding-btn-back" data-testid="onboarding-btn-back-4">← Voltar</button>
            <button
              class="onboarding-btn-next"
              data-testid="onboarding-btn-register"
              ${this._isLoading ? 'disabled' : ''}
            >
              ${this._isLoading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </div>
          <p class="onboarding-switch" style="text-align:center;margin-top:1rem;font-size:0.9rem">
            <button class="onboarding-btn-link" data-action="skip-register" data-testid="onboarding-btn-skip-register" type="button">
              Continuar sem conta
            </button>
          </p>
          <p class="onboarding-switch" style="text-align:center;margin-top:0.25rem;font-size:0.9rem">
            Já tem conta?
            <button class="onboarding-btn-link" data-action="goto-login" type="button">Entrar</button>
          </p>
        </div>
      </div>`;

    const emailInput    = this.container.querySelector('[data-testid="onboarding-input-email"]');
    const passwordInput = this.container.querySelector('[data-testid="onboarding-input-password"]');
    const btn           = this.container.querySelector('[data-testid="onboarding-btn-register"]');

    const syncBtn = () => {
      btn.disabled = this._isLoading || !emailInput.value.trim() || passwordInput.value.length < 8;
    };
    emailInput.addEventListener('input', syncBtn);
    passwordInput.addEventListener('input', syncBtn);
    syncBtn();

    // Clear error when user types
    [emailInput, passwordInput].forEach(el => {
      el.addEventListener('input', () => {
        if (this._registerError) {
          this._registerError = null;
          const errEl = this.container.querySelector('[data-testid="onboarding-register-error"]');
          if (errEl) errEl.remove();
        }
      });
    });

    setTimeout(() => emailInput.focus(), 50);
  }

  async _handleRegister() {
    const emailInput    = this.container.querySelector('[data-testid="onboarding-input-email"]');
    const passwordInput = this.container.querySelector('[data-testid="onboarding-input-password"]');
    const email    = emailInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';

    if (!email || password.length < 8) return;

    this._isLoading = true;
    this._registerError = null;
    this._render();

    try {
      await identityService.register(email, password);
      trackFunnel('onboarding_signup', { stackSize: this.data.selectedIds.size });
      // Salva o stack e entra direto no Check-in (uso diário principal).
      // O e-mail de verificação foi enviado; o banner global lembra de verificar.
      this._finalize('/checkin');
      eventBus.emit('toast:show', {
        message: 'Conta criada! Enviamos um link de verificação para o seu e-mail.',
        type: 'success',
        duration: 6000,
      });
    } catch (err) {
      this._isLoading = false;
      if (err?.error === 'user_already_exists' || err?.status === 499 || err?.status === 409) {
        this._registerError = 'Já existe uma conta com este e-mail. Clique em "Entrar" abaixo.';
      } else if (err?.status === 0) {
        this._registerError = 'Sem conexão. Tente novamente ou continue sem conta.';
      } else {
        this._registerError = err?.message ?? 'Erro ao criar conta. Tente novamente.';
      }
      this._render();
    }
  }

  _finalize(navigateTo = '/my-stack') {
    stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
      name: this.data.name.trim(),
      objective: this.data.goal,
      ...(Number.isFinite(this.data.weight) && this.data.weight > 0 ? { weight: this.data.weight } : {}),
      trainingFrequency: this.data.trainingFrequency,
    });

    const profile = this._dosageProfile();
    this._suggestions
      .filter(s => this.data.selectedIds.has(s.id))
      .forEach(s => {
        const dose = computeDailyDose(s, profile);
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: s.id,
          name: s.name,
          dosage: dose.daily,
          unit: dose.unit,
        });
      });

    stateManager.dispatch(ACTIONS.COMPLETE_ONBOARDING);
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: navigateTo });
  }
}
