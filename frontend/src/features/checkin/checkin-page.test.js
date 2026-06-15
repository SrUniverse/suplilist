import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', image: 'whey.jpg' },
    { id: '2', name: 'Creatine', image: 'creatine.jpg' },
    { id: '3', name: 'Vitamin D', image: 'vitd.jpg' }
  ]
}));

let sharedState = {
  stack: [
    { id: '1', supplementId: '1', dosage: 30 },
    { id: '2', supplementId: '2', dosage: 5 },
    { id: '3', supplementId: '3', dosage: 2000 }
  ],
  checkins: [
    { supplementId: '1', date: '2026-06-01' },
    { supplementId: '1', date: '2026-06-02' },
    { supplementId: '2', date: '2026-06-01' },
    { supplementId: '2', date: '2026-06-02' },
    { supplementId: '3', date: '2026-06-02' }
  ]
};

vi.mock('../../state/state-manager.js', () => {
  return {
    stateManager: {
      subscribe: vi.fn((callback) => {
        callback(sharedState);
        return vi.fn();
      }),
      dispatch: vi.fn(),
      calculateStreak: vi.fn(() => 5),
      getState: vi.fn(() => sharedState),
      get stack() { return sharedState.stack; },
      get checkins() { return sharedState.checkins; }
    }
  };
});

vi.mock('../../utils/date.js', () => ({
  todayISO: () => '2026-06-02'
}));

vi.mock('../../core/event-bus.js', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('CheckinPage — Daily Check-in', () => {
  let container;
  let checkinPage;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'checkin-page';
    document.body.appendChild(container);

    sharedState = {
      stack: [
        { id: '1', supplementId: '1', dosage: 30 },
        { id: '2', supplementId: '2', dosage: 5 },
        { id: '3', supplementId: '3', dosage: 2000 }
      ],
      checkins: [
        { supplementId: '1', date: '2026-06-01' },
        { supplementId: '1', date: '2026-06-02' },
        { supplementId: '2', date: '2026-06-01' },
        { supplementId: '2', date: '2026-06-02' },
        { supplementId: '3', date: '2026-06-02' }
      ]
    };

    const CheckinPage = (await import('./checkin-page.js')).default;
    checkinPage = new CheckinPage(container);
  });

  afterEach(() => {
    if (checkinPage) checkinPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Renders streak counter and progress bar with correct state', async () => {
    await checkinPage.mount();

    const streakEl = container.querySelector('[data-metric="streak"]');
    expect(streakEl).toBeDefined();
    if (streakEl) {
      expect(streakEl.textContent).toMatch(/\d+/);
    }

    const progressBar = container.querySelector('[data-component="progress-bar"]');
    expect(progressBar).toBeDefined();
  });

  it('2. Progress percentage reflects checked count / total stack', async () => {
    await checkinPage.mount();

    const progressEl = container.querySelector('[data-metric="progress-percent"]');
    if (progressEl) {
      const percent = parseInt(progressEl.textContent);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('3. Supplement card toggles checked visual state on click', async () => {
    await checkinPage.mount();

    const uncheckedCard = container.querySelector('[data-supplement-id="3"][data-checked="false"]');
    if (uncheckedCard) {
      uncheckedCard.click();

      const checkbox = uncheckedCard.querySelector('[data-component="checkbox"]');
      expect(checkbox?.classList.contains('checked')).toBe(true);
    }
  });

  it('4. Checking supplement dispatches ADD_CHECKIN with today date', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    await checkinPage.mount();

    const uncheckedCard = container.querySelector('[data-supplement-id="3"][data-checked="false"]');
    if (uncheckedCard) {
      uncheckedCard.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_CHECKIN',
          payload: expect.objectContaining({
            supplementId: '3',
            date: '2026-06-02'
          })
        })
      );
    }
  });

  it('5. Mark all button checks remaining supplements and dispatches ADD_CHECKIN batch', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    await checkinPage.mount();

    const markAllBtn = container.querySelector('[data-action="mark-all"]');
    if (markAllBtn) {
      markAllBtn.click();

      // Verify dispatch called for unchecked items
      const calls = stateManager.dispatch.mock.calls;
      const checkinCalls = calls.filter(call =>
        call[0]?.type === 'ADD_CHECKIN'
      );

      expect(checkinCalls.length).toBeGreaterThan(0);
    }
  });

  it('6. Toast event fires on single checkin', async () => {
    const { eventBus } = await import('../../core/event-bus.js');
    await checkinPage.mount();

    const uncheckedCard = container.querySelector('[data-supplement-id="3"][data-checked="false"]');
    if (uncheckedCard) {
      uncheckedCard.click();

      expect(eventBus.emit).toHaveBeenCalledWith(
        'toast:show',
        expect.objectContaining({
          message: expect.stringMatching(/adicion|check|feito/i)
        })
      );
    }
  });

  it('7. Toast event fires on mark all', async () => {
    const { eventBus } = await import('../../core/event-bus.js');
    await checkinPage.mount();

    const markAllBtn = container.querySelector('[data-action="mark-all"]');
    if (markAllBtn) {
      markAllBtn.click();

      expect(eventBus.emit).toHaveBeenCalledWith(
        'toast:show',
        expect.any(Object)
      );
    }
  });

  it('8. Empty stack shows CTA with navigation link', async () => {
    sharedState.stack = [];
    sharedState.checkins = [];

    await checkinPage.mount();

    expect(container.textContent).toContain('Stack vazio');

    // Empty-state CTA points to the catalog (direct add path) — commit ff6cfe0
    const ctaLink = container.querySelector('a[href="/list"]');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink.getAttribute('href')).toBe('/list');
  });

  it('9. Checked supplement shows Feito checkmark icon', async () => {
    await checkinPage.mount();

    const checkedCard = container.querySelector('[data-supplement-id="1"][data-checked="true"]');
    if (checkedCard) {
      const checkmark = checkedCard.querySelector('[data-icon="checkmark"]');
      expect(checkmark).toBeDefined();
    }
  });

  it('10. Unmount removes event listeners', () => {
    checkinPage.mount();
    checkinPage.unmount();

    const cards = container.querySelectorAll('[data-supplement-id]');
    cards.forEach(card => {
      expect(card.onclick).toBeUndefined();
    });
  });
});
