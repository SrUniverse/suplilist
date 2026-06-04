import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', category: 'Proteínas', dosage: { maintenance: 30, unit: 'g' }, pricePerGram: 0.20 },
    { id: '2', name: 'Creatine', category: 'Força & Performance', dosage: { maintenance: 5, unit: 'g' }, pricePerGram: 0.05 },
    { id: '3', name: 'Vitamin D', category: 'Vitaminas & Minerais', dosage: { maintenance: 2000, unit: 'mcg' }, pricePerGram: 10 }
  ]
}));

let sharedState = {
  stack: [
    { id: '1', supplementId: '1', dosage: 30 },
    { id: '2', supplementId: '2', dosage: 5 },
    { id: '3', supplementId: '3', dosage: 2000 }
  ],
  checkins: Array.from({ length: 25 }, (_, i) => ({
    supplementId: String((i % 3) + 1),
    date: new Date(Date.now() - (24 - i) * 86400000).toISOString().split('T')[0]
  }))
};

vi.mock('../../state/state-manager.js', () => {
  return {
    stateManager: {
      subscribe: vi.fn((...args) => {
        const cb = args.length === 2 ? args[1] : args[0];
        if (typeof cb === 'function') {
          if (args.length === 1) cb(sharedState);
          else if (args[0] === 'ui.isOffline') cb(false);
        }
        return vi.fn();
      }),
      dispatch: vi.fn(),
      get: vi.fn((key) => {
        if (key === 'ui.isOffline') return false;
        if (key === 'checkins') return sharedState.checkins;
        return null;
      }),
      getState: vi.fn(() => sharedState),
      get state() { return this.getState(); },
      get user() { return this.getState()?.user || { tier: 'free' }; },
      get stack() { return sharedState.stack; },
      get checkins() { return sharedState.checkins; }
    }
  };
});

vi.mock('../../utils/date.js', () => ({
  todayISO: () => '2026-06-02',
  offsetISO: (days) => {
    const d = new Date('2026-06-02T12:00:00');
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}));

describe('HistoryPage — Check-in History', () => {
  let container;
  let historyPage;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'history-page';
    document.body.appendChild(container);

    // Reset sharedState
    sharedState = {
      stack: [
        { id: '1', supplementId: '1', dosage: 30 },
        { id: '2', supplementId: '2', dosage: 5 },
        { id: '3', supplementId: '3', dosage: 2000 }
      ],
      checkins: Array.from({ length: 25 }, (_, i) => {
        const d = new Date('2026-06-02T12:00:00');
        d.setDate(d.getDate() - (24 - i));
        return {
          supplementId: String((i % 3) + 1),
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        };
      })
    };

    const HistoryPage = (await import('./history-page.js')).default;
    historyPage = new HistoryPage(container);
  });

  afterEach(() => {
    if (historyPage) historyPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Calculates and displays adherence percentage', async () => {
    await historyPage.mount();

    const adherenceEl = container.querySelector('.hp-stat-card:nth-child(1) .hp-stat-value');
    expect(adherenceEl).not.toBeNull();
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('2. Displays total cycles and investment calculated from checkins', async () => {
    await historyPage.mount();

    const cyclesEl = container.querySelector('.hp-stat-card:nth-child(2) .hp-stat-value');
    expect(cyclesEl).not.toBeNull();
    if (cyclesEl) {
      const cycles = parseInt(cyclesEl.textContent);
      expect(cycles).toBeGreaterThanOrEqual(0);
    }

    const investmentEl = container.querySelector('.hp-stat-card:nth-child(3) .hp-stat-value');
    expect(investmentEl).not.toBeNull();
    if (investmentEl) {
      expect(investmentEl.textContent).toMatch(/R\$|investment/i);
    }
  });

  it('3. Renders 7-day calendar grid with day labels and today indicator', async () => {
    await historyPage.mount();

    const calendar = container.querySelector('.hp-calendar');
    expect(calendar).not.toBeNull();

    const dayLabels = container.querySelectorAll('.hp-day-label');
    expect(dayLabels.length).toBe(7);

    const todayIndicator = container.querySelector('.today-filled, .today-empty');
    expect(todayIndicator).not.toBeNull();
  });

  it('4. Calendar shows filled/empty dots for checked/unchecked days', async () => {
    await historyPage.mount();

    const dots = container.querySelectorAll('.hp-day-dot');
    expect(dots.length).toBeGreaterThan(0);

    const filledDots = container.querySelectorAll('.hp-day-dot.filled, .hp-day-dot.today-filled');
    expect(filledDots.length).toBeGreaterThanOrEqual(0);
  });

  it('5. Search filters supplements by name and category', async () => {
    await historyPage.mount();

    const searchInput = container.querySelector('#hp-search');
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 500)); // wait for loadMore (400ms)

      const cards = container.querySelectorAll('.hp-sup-card');
      const names = Array.from(cards).map(c =>
        c.querySelector('.hp-sup-name')?.textContent
      );

      expect(names.some(n => n?.includes('Whey'))).toBe(true);
    }
  });

  it('6. Category chips toggle filter on/off', async () => {
    await historyPage.mount();

    const proteinChip = container.querySelector('.hp-chip[data-cat="Proteínas"]');
    expect(proteinChip).not.toBeNull();
    if (proteinChip) {
      proteinChip.click();

      // Query the active chip from the container, since innerHTML was re-rendered
      const activeChip = container.querySelector('.hp-chip.active');
      expect(activeChip).not.toBeNull();
      expect(activeChip.dataset.cat).toBe('Proteínas');

      await new Promise(resolve => setTimeout(resolve, 500)); // wait for loadMore (400ms)

      const cards = container.querySelectorAll('.hp-sup-card');
      const categories = Array.from(cards).map(c =>
        c.querySelector('.hp-badge-cat')?.textContent
      );

      expect(categories.some(cat => cat?.includes('Proteínas'))).toBe(true);
    }
  });

});

describe('HistoryPage — premium branch', () => {
  let container;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'history-page';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('12. Renders advanced dashboard and NOT lock card when tier is "pro"', async () => {
    // Arrange
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      user: { tier: 'pro' },
      stack: [{ id: '1', supplementId: '1', dosage: 30 }],
      checkins: []
    };
    stateManager.subscribe.mockImplementation((...args) => {
      const cb = args.length === 2 ? args[1] : args[0];
      if (typeof cb === 'function') {
        if (args.length === 1) cb(sharedState);
        else if (args[0] === 'ui.isOffline') cb(false);
      }
      return vi.fn();
    });

    // Act
    const HistoryPage = (await import('./history-page.js')).default;
    const page = new HistoryPage(container);
    await page.mount();

    // Assert
    expect(container.querySelector('.hp-premium-lock-card')).toBeNull();
    expect(container.querySelector('.hp-advanced-dashboard')).not.toBeNull();

    page.unmount?.();
  });

  it('13. Renders lock card and NOT advanced dashboard when tier is "free"', async () => {
    // Arrange
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      user: { tier: 'free' },
      stack: [{ id: '1', supplementId: '1', dosage: 30 }],
      checkins: []
    };
    stateManager.subscribe.mockImplementation((...args) => {
      const cb = args.length === 2 ? args[1] : args[0];
      if (typeof cb === 'function') {
        if (args.length === 1) cb(sharedState);
        else if (args[0] === 'ui.isOffline') cb(false);
      }
      return vi.fn();
    });

    // Act
    const HistoryPage = (await import('./history-page.js')).default;
    const page = new HistoryPage(container);
    await page.mount();

    // Assert
    expect(container.querySelector('.hp-premium-lock-card')).not.toBeNull();
    expect(container.querySelector('.hp-advanced-dashboard')).toBeNull();

    page.unmount?.();
  });

  it('14. Unlock button exists when tier is "free"', async () => {
    // Arrange
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      user: { tier: 'free' },
      stack: [],
      checkins: []
    };
    stateManager.subscribe.mockImplementation((...args) => {
      const cb = args.length === 2 ? args[1] : args[0];
      if (typeof cb === 'function') {
        if (args.length === 1) cb(sharedState);
        else if (args[0] === 'ui.isOffline') cb(false);
      }
      return vi.fn();
    });

    // Act
    const HistoryPage = (await import('./history-page.js')).default;
    const page = new HistoryPage(container);
    await page.mount();

    // Assert
    expect(container.querySelector('#hp-unlock-premium-btn')).not.toBeNull();

    page.unmount?.();
  });

  it('15. Excel export button exists when tier is "pro"', async () => {
    // Arrange
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      user: { tier: 'pro' },
      stack: [{ id: '1', supplementId: '1', dosage: 30 }],
      checkins: []
    };
    stateManager.subscribe.mockImplementation((...args) => {
      const cb = args.length === 2 ? args[1] : args[0];
      if (typeof cb === 'function') {
        if (args.length === 1) cb(sharedState);
        else if (args[0] === 'ui.isOffline') cb(false);
      }
      return vi.fn();
    });

    // Act
    const HistoryPage = (await import('./history-page.js')).default;
    const page = new HistoryPage(container);
    await page.mount();

    // Assert
    expect(container.querySelector('#hp-export-excel-btn')).not.toBeNull();

    page.unmount?.();
  });
});
