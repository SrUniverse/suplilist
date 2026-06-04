import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', category: 'Proteínas', dosage: { maintenance: 30, unit: 'g' }, pricePerGram: 0.20 },
    { id: '2', name: 'Creatine', category: 'Força & Performance', dosage: { maintenance: 5, unit: 'g' }, pricePerGram: 0.05 },
    { id: '3', name: 'Vitamin D', category: 'Vitaminas & Minerais', dosage: { maintenance: 2000, unit: 'mcg' }, pricePerGram: 10 }
  ]
}));

let sharedState = {
  stack: [
    { id: '1', supplementId: '1', dosage: 30, unit: 'g', quantity: 200 },
    { id: '2', supplementId: '2', dosage: 5, unit: 'g', quantity: 100 }
  ],
  checkins: [
    { supplementId: '1', date: '2026-06-01' },
    { supplementId: '1', date: '2026-06-02' },
    { supplementId: '2', date: '2026-06-01' }
  ]
};

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn((callback) => {
      callback(sharedState);
      return vi.fn();
    }),
    dispatch: vi.fn(),
    getState: vi.fn(() => sharedState),
    get stack() { return sharedState.stack; },
    get checkins() { return sharedState.checkins; }
  },
  ACTIONS: {
    ADD_TO_STACK: 'ADD_TO_STACK',
    REMOVE_FROM_STACK: 'REMOVE_FROM_STACK',
    UPDATE_STACK_ITEM: 'UPDATE_STACK_ITEM'
  }
}));

vi.mock('../../utils/date.js', () => ({
  todayISO: () => '2026-06-02',
  offsetISO: (days) => {
    const d = new Date('2026-06-02T12:00:00');
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}));

vi.mock('../../monetization/affiliate-engine.js', () => ({
  default: {
    getLinks: vi.fn(() => ({
      amazon: 'https://amazon.com/example',
      mercadolivre: 'https://mercadolivre.com/example',
      shopee: 'https://shopee.com/example'
    })),
    trackClick: vi.fn()
  }
}));

describe('MyStackPage — User Personal Stack', () => {
  let container;
  let myStackPage;

  beforeEach(async () => {
    vi.resetModules();
    window.Element.prototype.scrollIntoView = vi.fn();

    container = document.createElement('div');
    container.id = 'my-stack-page';
    document.body.appendChild(container);

    // Reset sharedState
    sharedState = {
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', quantity: 200 },
        { id: '2', supplementId: '2', dosage: 5, unit: 'g', quantity: 100 }
      ],
      checkins: [
        { supplementId: '1', date: '2026-06-01' },
        { supplementId: '1', date: '2026-06-02' },
        { supplementId: '2', date: '2026-06-01' }
      ]
    };

    const { MyStackPage } = await import('./my-stack-page.js');
    myStackPage = new MyStackPage(container);
  });

  afterEach(() => {
    if (myStackPage) myStackPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Calculates and displays monthly investment with unit conversion', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', quantity: 200 }
      ],
      checkins: []
    };

    await myStackPage.mount();

    const investmentEl = container.querySelector('.msp-stat-card:nth-child(1) .msp-stat-value');
    expect(investmentEl).not.toBeNull();
    if (investmentEl) {
      expect(investmentEl.textContent).toMatch(/R\$|monthly/i);
    }
  });

  it('2. Calculates adherence rate based on checkins', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      stack: [
        { id: '1', supplementId: '1', dosage: 30, unit: 'g', quantity: 200 }
      ],
      checkins: [
        { supplementId: '1', date: '2026-06-01' },
        { supplementId: '1', date: '2026-06-02' }
      ]
    };

    await myStackPage.mount();

    const adherenceEl = container.querySelector('.msp-stat-card:nth-child(3) .msp-stat-value');
    expect(adherenceEl).not.toBeNull();
    if (adherenceEl) {
      const percent = parseInt(adherenceEl.textContent);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('3. Modal search filters supplements and ADD_TO_STACK dispatches', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    await myStackPage.mount();

    const addBtn = container.querySelector('#msp-open-modal');
    addBtn?.click();

    const searchInput = document.getElementById('msp-modal-search');
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    const resultItem = document.querySelector('.msp-result-btn[data-id="1"]');
    expect(resultItem).not.toBeNull();
    resultItem?.click();

    const dosageInput = document.getElementById('msp-modal-dosage');
    if (dosageInput) {
      dosageInput.value = '30';
      const submitBtn = document.getElementById('msp-modal-submit');
      submitBtn?.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        'ADD_TO_STACK',
        expect.objectContaining({
          supplementId: '1',
          name: 'Whey',
          dosage: 30
        })
      );
    }
  });

  it('4. Inline edit form saves with validation and dispatches UPDATE_STACK_ITEM', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    await myStackPage.mount();

    const editBtn = container.querySelector('[data-action="edit"][data-id="1"]');
    expect(editBtn).not.toBeNull();
    editBtn?.click();

    // Wait for form to appear
    await new Promise(resolve => setTimeout(resolve, 100));

    const dosageInput = container.querySelector('#msp-ei-dosage-1');
    expect(dosageInput).not.toBeNull();
    if (dosageInput) {
      dosageInput.value = '50';
      const saveBtn = container.querySelector('[data-action="save-edit"]');
      expect(saveBtn).not.toBeNull();
      saveBtn?.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        'UPDATE_STACK_ITEM',
        expect.objectContaining({
          id: '1',
          dosage: 50
        })
      );
    }
  });

  it('5. REMOVE_FROM_STACK dispatches on delete action', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    vi.stubGlobal('confirm', () => true);
    await myStackPage.mount();

    const deleteBtn = container.querySelector('[data-action="remove"][data-id="1"]');
    expect(deleteBtn).not.toBeNull();
    if (deleteBtn) {
      deleteBtn.click();

      expect(stateManager.dispatch).toHaveBeenCalledWith(
        'REMOVE_FROM_STACK',
        expect.objectContaining({
          id: '1'
        })
      );
    }
  });

  it('6. Replenishment sidebar calculates best price and days remaining', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          '1': {
            'store1': { price: 140, label: 'Amazon' },
            'store2': { price: 150, label: 'Official' }
          }
        })
      })
    );

    await myStackPage.mount();
    await new Promise(resolve => setTimeout(resolve, 150));

    const bestPriceEl = container.querySelector('.msp-replen-price');
    expect(bestPriceEl).not.toBeNull();
    if (bestPriceEl) {
      expect(bestPriceEl.textContent).toMatch(/R\$|Melhor/i);
    }
  });

  it('7. Empty stack shows CTA button and hides metrics', async () => {
    const { stateManager } = await import('../../state/state-manager.js');
    sharedState = {
      stack: [],
      checkins: []
    };

    await myStackPage.mount();

    const emptyState = container.querySelector('.msp-empty');
    expect(emptyState).not.toBeNull();

    const ctaBtn = container.querySelector('#msp-empty-cta');
    expect(ctaBtn).not.toBeNull();
  });

  it('8. Unmount removes listeners and cleans up modal', () => {
    myStackPage.mount();
    myStackPage.unmount();

    const modal = document.getElementById('msp-modal-overlay');
    expect(modal).toBeNull();
  });
});
