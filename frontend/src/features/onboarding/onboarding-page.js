import { stateManager, ACTIONS } from '../../state/state-manager.js';
import recommender from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

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
    this.data = { name: '', goal: null, selectedIds: new Set() };
    this._suggestions = [];
    this._clickHandler = null;
    this._popstateHandler = null;
  }

  mount() {
    this._popstateHandler = () => {
      window.history.replaceState(null, null, '/onboarding');
    };
    window.addEventListener('popstate', this._popstateHandler);
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
    }
    this._clickHandler = (e) => this._handleClick(e);
    this.container.addEventListener('click', this._clickHandler);
  }

  // ── Wizard mode ───────────────────────────────────────────────────────────────

  _renderStep1() {
    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">1 / 3</p>
          <h1 class="onboarding-title">Bem-vindo ao SupliList</h1>
          <p class="onboarding-subtitle">Vamos montar seu stack personalizado em 2 minutos.</p>
          <input
            class="onboarding-input"
            type="text"
            placeholder="Seu nome"
            autocomplete="given-name"
            value="${escapeHtml(this.data.name)}"
            style="margin-bottom:1.75rem"
          />
          <div class="onboarding-actions">
            <button class="onboarding-btn-next" ${this.data.name.trim() ? '' : 'disabled'}>
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
      >
        <span class="onboarding-goal-card__emoji">${g.emoji}</span>
        <span class="onboarding-goal-card__label">${g.label}</span>
      </button>`).join('');

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">2 / 3</p>
          <h1 class="onboarding-title">Qual é seu principal objetivo?</h1>
          <p class="onboarding-subtitle">Vamos personalizar seu stack baseado nisso.</p>
          <div class="onboarding-goal-grid">${goalsHtml}</div>
          <div class="onboarding-actions">
            <button class="onboarding-btn-back">← Voltar</button>
            <button class="onboarding-btn-next" ${this.data.goal ? '' : 'disabled'}>
              Continuar →
            </button>
          </div>
        </div>
      </div>`;
  }

  _renderStep3() {
    if (!this._suggestions.length) {
      this._suggestions = recommender.recommend({ objective: this.data.goal });
      this.data.selectedIds = new Set(this._suggestions.map(s => s.id));
    }

    const suppsHtml = this._suggestions.length
      ? this._suggestions.map(s => {
          const sel = this.data.selectedIds.has(s.id);
          return `
            <div class="onboarding-supp-card${sel ? ' selected' : ''}" data-supp="${escapeHtml(s.id)}">
              <div class="onboarding-supp-card__check">${sel ? '✓' : ''}</div>
              <div class="onboarding-supp-card__info">
                <div class="onboarding-supp-card__name">${escapeHtml(s.name)}</div>
                <div class="onboarding-supp-card__meta">${escapeHtml(s.category)} · ${escapeHtml(String(s.dosage.daily))}${escapeHtml(s.dosage.unit)}/dia · Evidência ${escapeHtml(s.evidenceLevel ?? s.priority)}</div>
              </div>
            </div>`;
        }).join('')
      : '<div class="onboarding-supp-empty">Nenhuma sugestão encontrada. Você pode explorar o catálogo após o cadastro.</div>';

    this.container.innerHTML = `
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">3 / 3</p>
          <h1 class="onboarding-title">Seu stack recomendado</h1>
          <p class="onboarding-subtitle">Baseado no seu objetivo. Você pode ajustar depois.</p>
          <div class="onboarding-supp-list">${suppsHtml}</div>
          <div class="onboarding-actions">
            <button class="onboarding-btn-back">← Voltar</button>
            <button class="onboarding-btn-next">Adicionar ao meu stack e começar!</button>
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
      this.container.querySelectorAll('.onboarding-goal-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.goal === this.data.goal);
      });
      const btn = this.container.querySelector('.onboarding-btn-next');
      if (btn) btn.disabled = false;
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
      if (this.step < 3) {
        this.step++;
        this._render();
      } else {
        this._submit();
      }
    }
  }

  _submit() {
    stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
      name: this.data.name.trim(),
      objective: this.data.goal,
    });

    this._suggestions
      .filter(s => this.data.selectedIds.has(s.id))
      .forEach(s => {
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId: s.id,
          name: s.name,
          dosage: s.dosage.daily,
          unit: s.dosage.unit,
        });
      });

    stateManager.dispatch(ACTIONS.COMPLETE_ONBOARDING);
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/my-stack' });
  }
}
