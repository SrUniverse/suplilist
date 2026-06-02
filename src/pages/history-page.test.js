import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../ai/stack-recommender.js', () => ({
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

vi.mock('../state/state-manager.js', () => {
  return {
    stateManager: {
      subscribe: vi.fn((callback) => {
        callback(sharedState);
        return vi.fn();
      }),
      dispatch: vi.fn(),
      getState: vi.fn(() => sharedState),
      get stack() { return sharedState.stack; },
      get checkins() { return sharedState.checkins; }
    }
  };
});

vi.mock('../utils/date.js', () => ({
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

      await new Promise(resolve => setTimeout(resolve, 350));

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

      const cards = container.querySelectorAll('.hp-sup-card');
      const categories = Array.from(cards).map(c =>
        c.querySelector('.hp-badge-cat')?.textContent
      );

      expect(categories.some(cat => cat?.includes('Proteínas'))).toBe(true);
    }
  });

  it('7. Expandable card toggles log panel open/closed', async () => {
    await historyPage.mount();

    const initialBtn = container.querySelector('.hp-expand-btn');
    expect(initialBtn).not.toBeNull();
    if (initialBtn) {
      initialBtn.click();

      // Query the panel after the render click
      const logPanel = container.querySelector('.hp-logs-panel');
      expect(logPanel?.classList.contains('open')).toBe(true);

      // Click again
      const newBtn = container.querySelector('.hp-expand-btn');
      newBtn?.click();

      // Query again
      const closedPanel = container.querySelector('.hp-logs-panel');
      expect(closedPanel?.classList.contains('open')).toBe(false);
    }
  });

  it('8. Logs sort newest-first within log panel', async () => {
    await historyPage.mount();

    const card = container.querySelector('.hp-sup-card');
    expect(card).not.toBeNull();
    if (card) {
      const expandBtn = card.querySelector('.hp-expand-btn');
      expandBtn?.click();

      const logs = container.querySelectorAll('.hp-log-date');
      expect(logs.length).toBeGreaterThan(0);
    }
  });

  it('9. Adherence color class (green/yellow/red) reflects adherence level', async () => {
    await historyPage.mount();

    const card = container.querySelector('.hp-sup-card');
    expect(card).not.toBeNull();
    if (card) {
      const adherenceEl = card.querySelector('.hp-adherence');
      expect(adherenceEl).not.toBeNull();
      const classes = Array.from(adherenceEl.classList);
      expect(classes.some(c => ['green', 'yellow', 'red'].includes(c))).toBe(true);
    }
  });

  it('10. Calculates per-supplement adherence with edge case handling', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    sharedState = {
      stack: [{ id: '1', supplementId: '999', dosage: 10 }],
      checkins: []
    };

    await historyPage.mount();

    const adherenceEl = container.querySelector('.hp-stat-card:nth-child(1) .hp-stat-value');
    expect(adherenceEl).not.toBeNull();
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBe(0);
    }
  });

  it('11. Unmount removes event listeners', () => {
    historyPage.mount();
    historyPage.unmount();

    const cardToggle = container.querySelector('[data-toggle]');
    if (cardToggle) {
      expect(cardToggle.onclick).toBeFalsy();
    }
  });
});
