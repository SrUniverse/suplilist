import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

vi.mock('../../state/state-manager.js', () => ({
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

vi.mock('../stack/stack-recommender.js', () => ({
  default: {
    recommend: vi.fn(() => [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, score: 0.95, evidenceLevel: 'A', priority: 'HIGH' },
      { id: 'whey-protein', name: 'Whey Protein', category: 'Proteínas',
        dosage: { daily: 30, unit: 'g' }, score: 0.90, evidenceLevel: 'A', priority: 'HIGH' },
    ]),
  },
}));

vi.mock('../../core/event-bus.js', () => ({
  eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  EVENTS: { ROUTER_NAVIGATE: 'router:navigate' }
}));

function makeContainer() {
  const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>');
  return dom.window.document.getElementById('app');
}

describe('OnboardingPage', () => {
  let container;

  beforeEach(() => {
    container = makeContainer();
    vi.clearAllMocks();
    window.__router = { navigate: vi.fn() };
  });

  // ── Step 1 ──────────────────────────────────────────────────────────────────

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

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  it('Step 2: renders after clicking next from step 1', async () => {
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.mount();
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
    page._suggestions = [{ id: 'old', name: 'Old', dosage: { daily: 5, unit: 'g' }, category: 'X', evidenceLevel: 'A', priority: 'HIGH' }];
    page._render();
    container.querySelector('[data-goal="cut"]').click();
    expect(page._suggestions).toHaveLength(0);
    expect(page.data.goal).toBe('cut');
  });

  // ── Step 3 ──────────────────────────────────────────────────────────────────

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
    firstCard.click();
    expect(firstCard.classList.contains('selected')).toBe(false);
    expect(page.data.selectedIds.has('creatina-monohidratada')).toBe(false);
  });

  it('Step 3: submit dispatches SET_USER_PROFILE with name and objective', async () => {
    const { stateManager, ACTIONS } = await import('../../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set(['creatina-monohidratada']) };
    page._suggestions = [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, evidenceLevel: 'A', priority: 'HIGH' },
    ];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.SET_USER_PROFILE, {
      name: 'Lucas',
      objective: 'bulk',
    });
  });

  it('Step 3: submit dispatches ADD_TO_STACK for each selected supplement', async () => {
    const { stateManager, ACTIONS } = await import('../../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set(['creatina-monohidratada', 'whey-protein']) };
    page._suggestions = [
      { id: 'creatina-monohidratada', name: 'Creatina Monohidratada', category: 'Força & Performance',
        dosage: { daily: 5, unit: 'g' }, evidenceLevel: 'A', priority: 'HIGH' },
      { id: 'whey-protein', name: 'Whey Protein', category: 'Proteínas',
        dosage: { daily: 30, unit: 'g' }, evidenceLevel: 'A', priority: 'HIGH' },
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
    const { stateManager, ACTIONS } = await import('../../state/state-manager.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set() };
    page._suggestions = [];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(stateManager.dispatch).toHaveBeenCalledWith(ACTIONS.COMPLETE_ONBOARDING);
  });

  it('Step 3: submit navigates to /my-stack', async () => {
    const { eventBus } = await import('../../core/event-bus.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data = { name: 'Lucas', goal: 'bulk', selectedIds: new Set() };
    page._suggestions = [];
    page._render();
    container.querySelector('.onboarding-btn-next').click();
    expect(eventBus.emit).toHaveBeenCalledWith('router:navigate', { path: '/my-stack' });
  });

  it('Step 3: empty recommender shows empty state, submit still works', async () => {
    const recommenderMock = await import('../stack/stack-recommender.js');
    recommenderMock.default.recommend.mockReturnValueOnce([]);
    const { eventBus } = await import('../../core/event-bus.js');
    const { default: OnboardingPage } = await import('./onboarding-page.js');
    const page = new OnboardingPage(container);
    page.step = 3;
    page.data.goal = 'bulk';
    page._render();
    expect(container.innerHTML).toContain('Nenhuma sugestão encontrada');
    container.querySelector('.onboarding-btn-next').click();
    expect(eventBus.emit).toHaveBeenCalledWith('router:navigate', { path: '/my-stack' });
  });
});
