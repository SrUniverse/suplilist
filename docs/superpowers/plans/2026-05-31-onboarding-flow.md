# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-step onboarding wizard at `/onboarding` that activates new users by collecting name + fitness goal + an AI-suggested starter stack, then persists everything to state and redirects to `/my-stack`.

**Architecture:** `OnboardingPage` is a standard page class (same `mount()`/`unmount()` contract as every other page) registered at `/onboarding` in the router. `app.js` redirects first-time visitors to `/onboarding` before `router.start()` by checking `stateManager.user.onboardingComplete` and stack length. On submit, `COMPLETE_ONBOARDING` action (already in the reducer) finalises the flow.

**Tech Stack:** Vanilla JS, Vitest + jsdom, existing `stateManager`/`ACTIONS`, existing `recommender` singleton from `src/ai/stack-recommender.js`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/pages/onboarding-page.js` | **Create** | Full wizard: 3 steps, internal state, dispatch on submit |
| `src/pages/onboarding-page.test.js` | **Create** | Unit tests: guard logic, navigation, dispatch sequence |
| `src/core/app.js` | **Modify** | Add `/onboarding` route, extend `applyLandingMode`, add redirect guard |
| `src/css/main.css` | **Modify** | Onboarding-specific CSS classes |

---

## Task 1: CSS Styles

**Files:**
- Modify: `src/css/main.css`

- [ ] **Step 1: Append onboarding styles to `src/css/main.css`**

Open `src/css/main.css` and append at the very end:

```css
/* ─── Onboarding Wizard ───────────────────────────────────────────────────── */
.onboarding-wrap {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--color-bg);
}

.onboarding-card {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border-radius: 1.25rem;
  padding: 2rem 1.75rem;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}

.onboarding-progress {
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .08em;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.onboarding-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: .5rem;
}

.onboarding-subtitle {
  font-size: .9rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.75rem;
  line-height: 1.5;
}

.onboarding-input {
  width: 100%;
  padding: .75rem 1rem;
  border-radius: .625rem;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  outline: none;
  transition: border-color .2s;
  box-sizing: border-box;
}

.onboarding-input:focus {
  border-color: var(--color-primary);
}

.onboarding-goal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .75rem;
  margin-bottom: 1.75rem;
}

.onboarding-goal-card {
  padding: .875rem 1rem;
  border-radius: .75rem;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  text-align: left;
}

.onboarding-goal-card:hover {
  border-color: var(--color-primary);
}

.onboarding-goal-card.selected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.onboarding-goal-card__emoji {
  font-size: 1.4rem;
  display: block;
  margin-bottom: .35rem;
}

.onboarding-goal-card__label {
  font-size: .85rem;
  font-weight: 600;
  color: var(--color-text);
}

.onboarding-goal-card.selected .onboarding-goal-card__label {
  color: var(--color-primary);
}

.onboarding-supp-list {
  display: flex;
  flex-direction: column;
  gap: .625rem;
  margin-bottom: 1.75rem;
  max-height: 320px;
  overflow-y: auto;
}

.onboarding-supp-card {
  display: flex;
  align-items: center;
  gap: .875rem;
  padding: .75rem 1rem;
  border-radius: .75rem;
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer;
  transition: border-color .15s, background .15s;
}

.onboarding-supp-card.selected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.onboarding-supp-card__check {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: .3rem;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .15s, background .15s;
}

.onboarding-supp-card.selected .onboarding-supp-card__check {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
  font-size: .7rem;
}

.onboarding-supp-card__info { flex: 1; }

.onboarding-supp-card__name {
  font-size: .875rem;
  font-weight: 600;
  color: var(--color-text);
}

.onboarding-supp-card__meta {
  font-size: .75rem;
  color: var(--color-text-secondary);
  margin-top: .1rem;
}

.onboarding-supp-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: .9rem;
}

.onboarding-actions {
  display: flex;
  gap: .75rem;
  align-items: center;
}

.onboarding-btn-back {
  padding: .75rem 1.25rem;
  border-radius: .625rem;
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: .9rem;
  cursor: pointer;
  transition: border-color .15s;
  white-space: nowrap;
}

.onboarding-btn-back:hover {
  border-color: var(--color-text-secondary);
}

.onboarding-btn-next {
  flex: 1;
  padding: .875rem 1.5rem;
  border-radius: .625rem;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: .95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
}

.onboarding-btn-next:disabled {
  opacity: .4;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Verify CSS parses without error**

Run the dev server briefly to confirm no syntax errors:

```bash
npm run dev
```

Expected: server starts, no CSS parse errors in the terminal. Stop with Ctrl+C.

---

## Task 2: OnboardingPage — Skeleton + Step 1 (Welcome)

**Files:**
- Create: `src/pages/onboarding-page.js`
- Create: `src/pages/onboarding-page.test.js`

- [ ] **Step 1: Write the failing test for step 1 rendering**

Create `src/pages/onboarding-page.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    user: { onboardingComplete: false, name: null, objective: null },
    stack: [],
    dispatch: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
  ACTIONS: {
    SET_USER_PROFILE: 'SET_USER_PROFILE',
    ADD_TO_STACK: 'ADD_TO_STACK',
    COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  },
}));

vi.mock('../ai/stack-recommender.js', () => ({
  default: {
    recommend: vi.fn(() => [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, score: 0.95, priority: 'HIGH' },
      { id: 'whey-protein', name: 'Whey Protein', category: 'Proteínas',
        dosage: { daily: 30, unit: 'g' }, score: 0.90, priority: 'HIGH' },
    ]),
  },
}));

vi.mock('../core/event-bus.js', () => ({ eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } }));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeContainer() {
  const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>');
  return dom.window.document.getElementById('app');
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OnboardingPage', () => {
  let container;

  beforeEach(() => {
    container = makeContainer();
    vi.clearAllMocks();
  });

  it('Step 1: renders welcome heading', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
    expect(container.innerHTML).toContain('Bem-vindo');
  });

  it('Step 1: CTA disabled when name is empty', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
    const btn = container.querySelector('.onboarding-btn-next');
    expect(btn.disabled).toBe(true);
  });

  it('Step 1: CTA enabled after typing name', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
    const input = container.querySelector('.onboarding-input');
    input.value = 'Lucas';
    input.dispatchEvent(new Event('input'));
    const btn = container.querySelector('.onboarding-btn-next');
    expect(btn.disabled).toBe(false);
  });

  it('Step 1: CTA disabled when name is only whitespace', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
    const input = container.querySelector('.onboarding-input');
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    const btn = container.querySelector('.onboarding-btn-next');
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --reporter=verbose src/pages/onboarding-page.test.js
```

Expected: FAIL — `Cannot find module './onboarding-page.js'`

- [ ] **Step 3: Create `src/pages/onboarding-page.js` with Step 1**

```js
import { stateManager, ACTIONS } from '../state/state-manager.js';
import recommender from '../ai/stack-recommender.js';

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
    // Prevent browser back from leaving onboarding mid-flow
    this._popstateHandler = (e) => {
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

  // ── Rendering ──────────────────────────────────────────────────────────────

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
            value="${this.data.name}"
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

    // Focus the input for instant UX
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
      // Pre-select all suggestions
      this.data.selectedIds = new Set(this._suggestions.map(s => s.id));
    }

    const suppsHtml = this._suggestions.length
      ? this._suggestions.map(s => {
          const sel = this.data.selectedIds.has(s.id);
          return `
            <div class="onboarding-supp-card${sel ? ' selected' : ''}" data-supp="${s.id}">
              <div class="onboarding-supp-card__check">${sel ? '✓' : ''}</div>
              <div class="onboarding-supp-card__info">
                <div class="onboarding-supp-card__name">${s.name}</div>
                <div class="onboarding-supp-card__meta">${s.category} · ${s.dosage.daily}${s.dosage.unit}/dia · Evidência ${s.evidenceLevel ?? s.priority}</div>
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

  // ── Event Handling ─────────────────────────────────────────────────────────

  _handleClick(e) {
    // Back button
    if (e.target.closest('.onboarding-btn-back')) {
      this.step--;
      this._render();
      return;
    }

    // Goal card
    const goalCard = e.target.closest('[data-goal]');
    if (goalCard) {
      this.data.goal = goalCard.dataset.goal;
      // Reset suggestions so they regenerate for the new goal
      this._suggestions = [];
      this.data.selectedIds = new Set();
      this.container.querySelectorAll('.onboarding-goal-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.goal === this.data.goal);
      });
      const btn = this.container.querySelector('.onboarding-btn-next');
      if (btn) btn.disabled = false;
      return;
    }

    // Supplement toggle
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

    // Next / Submit button
    if (e.target.closest('.onboarding-btn-next')) {
      if (this.step < 3) {
        this.step++;
        this._render();
      } else {
        this._submit();
      }
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  _submit() {
    // 1. Save name + objective to profile
    stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
      name: this.data.name.trim(),
      objective: this.data.goal,
    });

    // 2. Add each selected supplement to stack
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

    // 3. Mark onboarding complete (persists to suplilist-state-v4)
    stateManager.dispatch(ACTIONS.COMPLETE_ONBOARDING);

    // 4. Navigate to stack
    window.__router.navigate('/my-stack');
  }
}
```

- [ ] **Step 4: Run tests — verify step 1 tests pass**

```bash
npm test -- --reporter=verbose src/pages/onboarding-page.test.js
```

Expected: 4 tests PASS (welcome heading, CTA disabled empty, CTA enabled after typing, CTA disabled whitespace).

- [ ] **Step 5: Commit**

```bash
git add src/pages/onboarding-page.js src/pages/onboarding-page.test.js src/css/main.css
git commit -m "feat(onboarding): step 1 welcome + CSS scaffold"
```

---

## Task 3: Step 2 (Goal Selection) Tests

**Files:**
- Modify: `src/pages/onboarding-page.test.js`

- [ ] **Step 1: Add step 2 tests to the existing test file**

Append inside the `describe('OnboardingPage', ...)` block in `src/pages/onboarding-page.test.js`:

```js
  it('Step 2: renders after clicking next from step 1', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
    // Fill name and advance
    const input = container.querySelector('.onboarding-input');
    input.value = 'Lucas';
    input.dispatchEvent(new Event('input'));
    container.querySelector('.onboarding-btn-next').click();
    expect(container.innerHTML).toContain('objetivo');
    expect(container.innerHTML).toContain('Hipertrofia');
  });

  it('Step 2: CTA disabled until goal selected', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 2;
    page._render();
    const btn = container.querySelector('.onboarding-btn-next');
    expect(btn.disabled).toBe(true);
  });

  it('Step 2: selecting a goal enables CTA and stores goal key', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 2;
    page._render();
    const bulkCard = container.querySelector('[data-goal="bulk"]');
    bulkCard.click();
    expect(page.data.goal).toBe('bulk');
    const btn = container.querySelector('.onboarding-btn-next');
    expect(btn.disabled).toBe(false);
  });

  it('Step 2: back button returns to step 1', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 2;
    page._render();
    container.querySelector('.onboarding-btn-back').click();
    expect(page.step).toBe(1);
    expect(container.innerHTML).toContain('Bem-vindo');
  });

  it('Step 2: changing goal resets suggestion cache', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 2;
    page.data.goal = 'bulk';
    page._suggestions = [{ id: 'old', name: 'Old', dosage: { daily: 5, unit: 'g' }, category: 'X', priority: 'HIGH' }];
    page._render();
    // Switch to a different goal
    container.querySelector('[data-goal="cut"]').click();
    expect(page._suggestions).toHaveLength(0);
    expect(page.data.goal).toBe('cut');
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --reporter=verbose src/pages/onboarding-page.test.js
```

Expected: all previous tests + 5 new step-2 tests = 9 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/onboarding-page.test.js
git commit -m "test(onboarding): step 2 goal selection coverage"
```

---

## Task 4: Step 3 (Stack Review + Submit) Tests

**Files:**
- Modify: `src/pages/onboarding-page.test.js`

- [ ] **Step 1: Add step 3 tests**

Append inside the `describe` block in `src/pages/onboarding-page.test.js`:

```js
  it('Step 3: renders supplement cards pre-selected', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data.goal = 'bulk';
    page._render();
    const cards = container.querySelectorAll('.onboarding-supp-card');
    expect(cards.length).toBe(2);
    cards.forEach(c => expect(c.classList.contains('selected')).toBe(true));
  });

  it('Step 3: toggling a card deselects it', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data.goal = 'bulk';
    page._render();
    const firstCard = container.querySelector('.onboarding-supp-card');
    firstCard.click(); // deselect
    expect(firstCard.classList.contains('selected')).toBe(false);
    expect(page.data.selectedIds.has('creatina-monohidratada')).toBe(false);
  });

  it('Step 3: submit dispatches SET_USER_PROFILE with name and objective', async () => {
    const { stateManager, ACTIONS } = await import('../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    window.__router = { navigate: vi.fn() };
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set(['creatina-monohidratada']) };
    page._suggestions = [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, priority: 'HIGH' },
    ];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.SET_USER_PROFILE, {
      name: 'Lucas',
      objective: 'bulk',
    });
  });

  it('Step 3: submit dispatches ADD_TO_STACK for each selected supplement', async () => {
    const { stateManager, ACTIONS } = await import('../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    window.__router = { navigate: vi.fn() };
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set(['creatina-monohidratada', 'whey-protein']) };
    page._suggestions = [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, priority: 'HIGH' },
      { id: 'whey-protein', name: 'Whey Protein', category: 'Proteínas',
        dosage: { daily: 30, unit: 'g' }, priority: 'HIGH' },
    ];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.ADD_TO_STACK, {
      supplementId: 'creatina-monohidratada', name: 'Creatina Monohidratada', dosage: 5, unit: 'g',
    });
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.ADD_TO_STACK, {
      supplementId: 'whey-protein', name: 'Whey Protein', dosage: 30, unit: 'g',
    });
  });

  it('Step 3: submit dispatches COMPLETE_ONBOARDING', async () => {
    const { stateManager, ACTIONS } = await import('../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    window.__router = { navigate: vi.fn() };
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set() };
    page._suggestions = [];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.COMPLETE_ONBOARDING);
  });

  it('Step 3: submit navigates to /my-stack', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const navigate = vi.fn();
    window.__router = { navigate };
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set() };
    page._suggestions = [];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(navigate).toHaveBeenCalledWith('/my-stack');
  });

  it('Step 3: empty recommender shows empty state, submit still works', async () => {
    const recommenderMock = await import('../ai/stack-recommender.js');
    recommenderMock.default.recommend.mockReturnValueOnce([]);
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    window.__router = { navigate: vi.fn() };
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data.goal = 'bulk';
    page._render();
    expect(container.innerHTML).toContain('Nenhuma sugestão encontrada');
    container.querySelector('.onboarding-btn-next').click();
    // Should not throw — navigate was called
    expect(window.__router.navigate).toHaveBeenCalledWith('/my-stack');
  });
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --reporter=verbose src/pages/onboarding-page.test.js
```

Expected: all 16 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/onboarding-page.test.js
git commit -m "test(onboarding): step 3 stack review + submit coverage"
```

---

## Task 5: Wire Up in app.js

**Files:**
- Modify: `src/core/app.js`

- [ ] **Step 1: Add `/onboarding` route to the routes array**

In `src/core/app.js`, find the `routes` array and add the onboarding route **before** the `/` entry:

```js
const routes = [
  { path: '/onboarding', load: () => import('../pages/onboarding-page.js') },
  { path: '/',          load: () => import('../pages/home-page.js') },
  // ... rest unchanged
```

- [ ] **Step 2: Add `/onboarding` to PAGE_TITLES**

```js
const PAGE_TITLES = {
  '/onboarding': 'Bem-vindo | SupliList',
  '/':           'SupliList | Suplementação Baseada em Evidências',
  // ... rest unchanged
```

- [ ] **Step 3: Extend `applyLandingMode` to include `/onboarding`**

Find `applyLandingMode()` and change:

```js
// Before:
function applyLandingMode() {
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home';
  document.body.classList.toggle('body--landing', isLanding);
}
```

To:

```js
function applyLandingMode() {
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home' || path === '/onboarding';
  document.body.classList.toggle('body--landing', isLanding);
}
```

- [ ] **Step 4: Add the redirect guard**

In `DOMContentLoaded`, after `const router = new Router(routes, container);` and **before** `router.start()`, add:

```js
  // Redirect first-time visitors to onboarding
  const onboardingDone = stateManager.user.onboardingComplete;
  const hasStack = stateManager.stack && stateManager.stack.length > 0;
  if (!onboardingDone && !hasStack && window.location.pathname !== '/onboarding') {
    window.history.replaceState(null, null, '/onboarding');
  }
```

So the surrounding context looks like:

```js
  const container = document.querySelector('#router-outlet');
  const router = new Router(routes, container);
  window.__router = router;

  // Redirect first-time visitors to onboarding
  const onboardingDone = stateManager.user.onboardingComplete;
  const hasStack = stateManager.stack && stateManager.stack.length > 0;
  if (!onboardingDone && !hasStack && window.location.pathname !== '/onboarding') {
    window.history.replaceState(null, null, '/onboarding');
  }

  router.start();
```

Note: move `window.__router = router` to just before the guard so the guard block (and the page it triggers) can access `__router` immediately.

- [ ] **Step 5: Also hide nav on popstate when on /onboarding**

Find the `popstate` listener inside `DOMContentLoaded`:

```js
// Before:
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
  const isLanding = window.location.pathname === '/' || window.location.pathname === '/home';
  isLanding ? Nav.hide() : Nav.show();
});
```

Change to:

```js
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home' || path === '/onboarding';
  isLanding ? Nav.hide() : Nav.show();
});
```

- [ ] **Step 6: Run full test suite to verify nothing broke**

```bash
npm test
```

Expected: all existing tests still pass (76+ total), no new failures.

- [ ] **Step 7: Commit**

```bash
git add src/core/app.js
git commit -m "feat(onboarding): register route, redirect guard, hide nav on /onboarding"
```

---

## Task 6: Manual Smoke Test

**Files:** none — verification only

- [ ] **Step 1: Clear localStorage and open the app**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Open DevTools → Application → Local Storage → clear `suplilist-state-v4`.

Expected: browser redirects to `/onboarding`, sidebar/topbar hidden, Step 1 renders.

- [ ] **Step 2: Complete the flow end-to-end**

1. Type a name → "Começar →" becomes active.
2. Click "Começar →" → Step 2 renders with 5 goal cards.
3. Click a goal card → it highlights, "Continuar →" becomes active.
4. Click "Continuar →" → Step 3 renders with supplement cards, all pre-checked.
5. Toggle one supplement off — it deselects visually.
6. Click "Adicionar ao meu stack e começar!" → redirects to `/my-stack`.

Expected at `/my-stack`: name shown in profile area, stack populated with selected supplements, sidebar visible.

- [ ] **Step 3: Verify returning user skips onboarding**

Refresh the page (state preserved in localStorage).

Expected: app goes to `/` (home), not `/onboarding`. Onboarding does not reappear.

- [ ] **Step 4: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(onboarding): complete 3-step wizard — welcome, goal, AI stack"
```

---

## Self-Review

**Spec coverage:**
- ✅ Trigger: `stateManager.user.onboardingComplete` + stack empty guard
- ✅ Route `/onboarding` in router
- ✅ Nav hidden via `body--landing` on `/onboarding`
- ✅ Step 1: name input, CTA disabled when empty/whitespace
- ✅ Step 2: 5 goal cards, correct `targets` keys, CTA gated
- ✅ Step 3: `recommender.recommend({ objective })`, pre-selected cards, toggle
- ✅ Empty recommender: empty state message, submit still works
- ✅ Submit: `SET_USER_PROFILE` with name + objective
- ✅ Submit: `ADD_TO_STACK` with correct payload `{ supplementId, name, dosage, unit }`
- ✅ Submit: `COMPLETE_ONBOARDING` action
- ✅ Submit: navigates to `/my-stack`
- ✅ Popstate suppressed during onboarding
- ✅ Back button preserves `this.data`
- ✅ Changing goal resets `_suggestions` cache

**Placeholder scan:** No "TBD", "TODO", or vague instructions found.

**Type consistency:** `GOALS` keys (`bulk | strength | cut | endurance | general`) match `SUPPLEMENTS_DB.targets` keys throughout. `recommender.recommend({ objective })` field name `objective` matches `_scoreObjectiveRelevance(supplement, userProfile.objective)` in the recommender. `ADD_TO_STACK` payload shape `{ supplementId, name, dosage, unit }` matches pattern in `list-page.js:1012-1016`.
