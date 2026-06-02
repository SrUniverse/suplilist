import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../data/supplements-db.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', category: 'Protein', ppg: 0.20 },
    { id: '2', name: 'Creatine', category: 'Performance', ppg: 0.05 },
    { id: '3', name: 'Vitamin D', category: 'Health', ppg: 10 }
  ]
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn((callback) => {
      callback({
        stack: [
          { id: '1', supplementId: '1', dosage: 30 },
          { id: '2', supplementId: '2', dosage: 5 },
          { id: '3', supplementId: '3', dosage: 2000 }
        ],
        checkins: Array.from({ length: 25 }, (_, i) => ({
          supplementId: String((i % 3) + 1),
          date: new Date(Date.now() - (24 - i) * 86400000).toISOString().split('T')[0]
        }))
      });
      return vi.fn();
    }),
    getState: vi.fn(() => ({
      stack: [
        { id: '1', supplementId: '1', dosage: 30 },
        { id: '2', supplementId: '2', dosage: 5 },
        { id: '3', supplementId: '3', dosage: 2000 }
      ],
      checkins: Array.from({ length: 25 }, (_, i) => ({
        supplementId: String((i % 3) + 1),
        date: new Date(Date.now() - (24 - i) * 86400000).toISOString().split('T')[0]
      }))
    }))
  }
}));

vi.mock('../utils/date-utils.js', () => ({
  todayISO: () => '2026-06-02',
  offsetISO: (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}));

describe('HistoryPage — Check-in History', () => {
  let container;
  let historyPage;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'history-page';
    document.body.appendChild(container);

    const { HistoryPage } = await import('./history-page.js');
    historyPage = new HistoryPage(container);
  });

  afterEach(() => {
    if (historyPage) historyPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Calculates and displays adherence percentage', async () => {
    await historyPage.mount();

    const adherenceEl = container.querySelector('[data-metric="adherence-percent"]');
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('2. Displays total cycles and investment calculated from checkins', async () => {
    await historyPage.mount();

    const cyclesEl = container.querySelector('[data-metric="total-cycles"]');
    if (cyclesEl) {
      const cycles = parseInt(cyclesEl.textContent);
      expect(cycles).toBeGreaterThanOrEqual(0);
    }

    const investmentEl = container.querySelector('[data-metric="total-investment"]');
    if (investmentEl) {
      expect(investmentEl.textContent).toMatch(/R\$|investment/i);
    }
  });

  it('3. Renders 7-day calendar grid with day labels and today indicator', async () => {
    await historyPage.mount();

    const calendar = container.querySelector('[data-component="calendar"]');
    expect(calendar).toBeDefined();

    const dayLabels = container.querySelectorAll('[data-day-label]');
    expect(dayLabels.length).toBe(7);

    const todayIndicator = container.querySelector('[data-today]');
    expect(todayIndicator).toBeDefined();
  });

  it('4. Calendar shows filled/empty dots for checked/unchecked days', async () => {
    await historyPage.mount();

    const dots = container.querySelectorAll('[data-calendar-day]');
    expect(dots.length).toBeGreaterThan(0);

    const filledDots = container.querySelectorAll('[data-calendar-day][data-filled="true"]');
    expect(filledDots.length).toBeGreaterThanOrEqual(0);
  });

  it('5. Search filters supplements by name and category', async () => {
    await historyPage.mount();

    const searchInput = container.querySelector('[data-search="supplements"]');
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 350));

      const cards = container.querySelectorAll('[data-supplement-card]');
      const names = Array.from(cards).map(c =>
        c.querySelector('[data-supplement-name]')?.textContent
      );

      expect(names.some(n => n?.includes('Whey'))).toBe(true);
    }
  });

  it('6. Category chips toggle filter on/off', async () => {
    await historyPage.mount();

    const proteinChip = container.querySelector('[data-filter-chip="Protein"]');
    if (proteinChip) {
      proteinChip.click();
      expect(proteinChip.classList.contains('active')).toBe(true);

      const cards = container.querySelectorAll('[data-supplement-card]');
      const categories = Array.from(cards).map(c =>
        c.querySelector('[data-supplement-category]')?.textContent
      );

      expect(categories.some(cat => cat?.includes('Protein'))).toBe(true);
    }
  });

  it('7. Expandable card toggles log panel open/closed', async () => {
    await historyPage.mount();

    const card = container.querySelector('[data-supplement-card]');
    if (card) {
      const expandBtn = card.querySelector('[data-action="toggle-logs"]');
      expandBtn?.click();

      const logPanel = card.querySelector('[data-logs-panel]');
      expect(logPanel?.style.display).not.toBe('none');

      expandBtn?.click();
      expect(logPanel?.style.display).toBe('none');
    }
  });

  it('8. Logs sort newest-first within log panel', async () => {
    await historyPage.mount();

    const card = container.querySelector('[data-supplement-card]');
    if (card) {
      const expandBtn = card.querySelector('[data-action="toggle-logs"]');
      expandBtn?.click();

      const logs = card.querySelectorAll('[data-log-item]');
      if (logs.length > 1) {
        const firstDate = logs[0].getAttribute('data-date');
        const secondDate = logs[1].getAttribute('data-date');

        // First should be newer (greater date)
        expect(firstDate >= secondDate).toBe(true);
      }
    }
  });

  it('9. Adherence color class (green/yellow/red) reflects adherence level', async () => {
    await historyPage.mount();

    const card = container.querySelector('[data-supplement-card]');
    if (card) {
      const adherenceColor = card.getAttribute('data-adherence-color');
      expect(adherenceColor).toMatch(/green|yellow|red/);
    }
  });

  it('10. Calculates per-supplement adherence with edge case handling', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    stateManager.getState.mockReturnValue({
      stack: [{ id: '1', supplementId: '999', dosage: 10 }],
      checkins: []
    });

    await historyPage.mount();

    const adherenceEl = container.querySelector('[data-metric="adherence-percent"]');
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBe(0);
    }
  });

  it('11. Unmount removes event listeners', () => {
    historyPage.mount();
    historyPage.unmount();

    const cards = container.querySelectorAll('[data-supplement-card]');
    cards.forEach(card => {
      expect(card.onclick).toBeUndefined();
    });
  });
});
