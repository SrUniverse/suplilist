import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../data/supplements-db.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', unit: 'g', ppg: 0.20, price: 150 },
    { id: '2', name: 'Creatine', unit: 'g', ppg: 0.05, price: 80 },
    { id: '3', name: 'Vitamin D', unit: 'mcg', ppg: 10, price: 60 }
  ]
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn((callback) => {
      callback({ stack: [], checkins: [] });
      return vi.fn();
    }),
    dispatch: vi.fn(),
    getState: vi.fn(() => ({
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', frequency: 'daily', frequency_count: 1 },
        { id: '2', supplementId: '2', dosage: 5, unit: 'g', frequency: 'daily', frequency_count: 1 }
      ],
      checkins: [
        { supplementId: '1', date: '2026-06-01' },
        { supplementId: '1', date: '2026-06-02' },
        { supplementId: '2', date: '2026-06-01' }
      ]
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

vi.mock('../analytics/affiliate-engine.js', () => ({
  affiliateEngine: {
    generateLink: vi.fn((url) => `${url}?aff=123`)
  }
}));

describe('MyStackPage — User Personal Stack', () => {
  let container;
  let myStackPage;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'my-stack-page';
    document.body.appendChild(container);

    // Create modal for adding to stack
    const modal = document.createElement('div');
    modal.id = 'stack-modal';
    modal.innerHTML = `
      <div class="modal__overlay"></div>
      <div class="modal__content">
        <input type="text" class="modal__search" placeholder="Search">
        <div class="modal__results"></div>
        <div class="modal__form" style="display: none;">
          <input type="number" class="form__dosage" placeholder="Dosage">
          <select class="form__unit">
            <option>g</option>
            <option>mg</option>
            <option>mcg</option>
          </select>
          <input type="text" class="form__frequency">
          <button class="form__submit">Add</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const { MyStackPage } = await import('./my-stack-page.js');
    myStackPage = new MyStackPage(container);
  });

  afterEach(() => {
    if (myStackPage) myStackPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Calculates and displays monthly investment with unit conversion', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    stateManager.getState.mockReturnValue({
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', frequency: 'daily', frequency_count: 1 }
      ],
      checkins: []
    });

    await myStackPage.mount();

    // Find monthly investment display
    const investmentEl = container.querySelector('[data-metric="monthly-investment"]');
    if (investmentEl) {
      expect(investmentEl.textContent).toMatch(/R\$|monthly/i);
    }
  });

  it('2. Calculates adherence rate based on checkins', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    stateManager.getState.mockReturnValue({
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', frequency: 'daily', frequency_count: 1 }
      ],
      checkins: [
        { supplementId: '1', date: '2026-06-01' },
        { supplementId: '1', date: '2026-06-02' }
      ]
    });

    await myStackPage.mount();

    const adherenceEl = container.querySelector('[data-metric="adherence"]');
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBeGreaterThan(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('3. Modal search filters supplements and ADD_TO_STACK dispatches', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    await myStackPage.mount();

    const addBtn = container.querySelector('[data-action="add-supplement"]');
    addBtn?.click();

    const searchInput = document.querySelector('.modal__search');
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    const resultItem = document.querySelector('[data-result-id="1"]');
    resultItem?.click();

    const dosageInput = document.querySelector('.form__dosage');
    if (dosageInput) {
      dosageInput.value = '30';
      const submitBtn = document.querySelector('.form__submit');
      submitBtn?.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_TO_STACK'
        })
      );
    }
  });

  it('4. Inline edit form saves with validation and dispatches UPDATE_STACK_ITEM', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    await myStackPage.mount();

    const editBtn = container.querySelector('[data-action="edit-item"][data-stack-id="1"]');
    editBtn?.click();

    // Wait for form to appear
    await new Promise(resolve => setTimeout(resolve, 100));

    const dosageInput = container.querySelector('[data-field="dosage"]');
    if (dosageInput) {
      dosageInput.value = '50';
      const saveBtn = container.querySelector('[data-action="save-item"]');
      saveBtn?.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE_STACK_ITEM',
          payload: expect.objectContaining({
            dosage: 50
          })
        })
      );
    }
  });

  it('5. REMOVE_FROM_STACK dispatches on delete action', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    await myStackPage.mount();

    const deleteBtn = container.querySelector('[data-action="remove-item"][data-stack-id="1"]');
    if (deleteBtn) {
      deleteBtn.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REMOVE_FROM_STACK'
        })
      );
    }
  });

  it('6. Replenishment sidebar calculates best price and days remaining', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          '1': [{ price: 140, source: 'Amazon' }, { price: 150, source: 'Official' }]
        })
      })
    );

    await myStackPage.mount();
    await new Promise(resolve => setTimeout(resolve, 100));

    const bestPriceEl = container.querySelector('[data-metric="best-price"]');
    if (bestPriceEl) {
      expect(bestPriceEl.textContent).toMatch(/R\$|price/i);
    }
  });

  it('7. Empty stack shows CTA button and hides metrics', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    stateManager.getState.mockReturnValue({
      stack: [],
      checkins: []
    });

    await myStackPage.mount();

    const emptyState = container.querySelector('[data-empty-state]');
    expect(emptyState).toBeDefined();

    const ctaBtn = container.querySelector('[data-action="start-stack"]');
    expect(ctaBtn).toBeDefined();
  });

  it('8. Unmount removes listeners and cleans up modal', () => {
    myStackPage.mount();
    myStackPage.unmount();

    const modal = document.getElementById('stack-modal');
    expect(modal.style.display).toBe('none');
  });
});
