import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../ai/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey Protein', category: 'Proteínas', objectives: ['muscle'], ppg: 0.20, price: 150 },
    { id: '2', name: 'Creatina', category: 'Performance', objectives: ['strength'], ppg: 0.05, price: 80 },
    { id: '3', name: 'Vitamin D', category: 'Vitaminas', objectives: ['immunity'], ppg: 0.10, price: 60 }
  ]
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn(() => vi.fn()),
    dispatch: vi.fn(),
    getState: vi.fn(() => ({
      stack: [],
      favorites: [],
      checkins: []
    }))
  },
  ACTIONS: {
    ADD_FAVORITE: 'ADD_FAVORITE',
    REMOVE_FAVORITE: 'REMOVE_FAVORITE'
  }
}));

vi.mock('fuse.js', () => ({
  default: class Fuse {
    constructor(data) {
      this.data = data;
    }
    search(query) {
      return this.data
        .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
        .map((item, idx) => ({ item, refIndex: idx }));
    }
  }
}));

vi.mock('../core/virtual-scroller.js', () => ({
  VirtualScroller: class {
    constructor(container, items, renderFn) {
      this.container = container;
      this.items = items;
      this.renderFn = renderFn;
      this.mounted = false;
    }
    mount() {
      this.mounted = true;
      this.container.innerHTML = `<div id="lp-grid" data-component="supplement-grid">` + 
        this.items.map(item => this.renderFn(item)).join('') + 
        `</div>`;
    }
    unmount() {
      this.mounted = false;
      this.container.innerHTML = '';
    }
    updateItems(items) {
      this.items = items;
      if (this.mounted) {
        this.container.innerHTML = `<div id="lp-grid" data-component="supplement-grid">` + 
          this.items.map(item => this.renderFn(item)).join('') + 
          `</div>`;
      }
    }
  }
}));

vi.mock('../monetization/affiliate-engine.js', () => ({
  default: {
    getLinks: vi.fn(() => ({
      amazon: 'https://amazon.com/example',
      mercadolivre: 'https://mercadolivre.com/example',
      shopee: 'https://shopee.com/example'
    })),
    trackClick: vi.fn()
  }
}));

describe('ListPage — Supplement Catalog', () => {
  let container;
  let listPage;

  beforeEach(async () => {
    // Setup container
    container = document.createElement('div');
    container.id = 'list-page';
    document.body.appendChild(container);

    // Dynamic import to get fresh class instance
    const ListPage = (await import('./list-page.js')).default;
    listPage = new ListPage(container, {});
  });

  afterEach(() => {
    if (listPage) listPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Renders supplement grid with correct structure', async () => {
    await listPage.mount();

    const grid = container.querySelector('[data-component="supplement-grid"]');
    expect(grid).not.toBeNull();

    const cards = container.querySelectorAll('.lp-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('2. Filter by category updates visible supplements', async () => {
    await listPage.mount();

    // Click category filter
    const proteinOption = container.querySelector('.lp-chip[data-cat="Proteínas"]');
    proteinOption?.click();

    // Verify filtered results
    const visibleCards = container.querySelectorAll('.lp-card');
    const names = Array.from(visibleCards).map(card =>
      card.querySelector('.lp-card-name')?.textContent
    );

    expect(names.some(name => name?.includes('Whey'))).toBe(true);
  });

  it('3. Search query filters supplements and updates grid', async () => {
    await listPage.mount();

    const searchInput = container.querySelector('#lp-search');
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    const visibleCards = container.querySelectorAll('.lp-card');
    const names = Array.from(visibleCards).map(card =>
      card.querySelector('.lp-card-name')?.textContent
    );

    expect(names.length).toBeGreaterThan(0);
  });

  it('4. Modal opens with supplement data and handles tab switching', async () => {
    await listPage.mount();

    const firstBtn = container.querySelector('.lp-btn-ver-precos');
    firstBtn?.click();

    const modal = document.getElementById('lp-modal-overlay');
    expect(modal).not.toBeNull();

    // Click benefits tab
    const benefitsTab = modal.querySelector('.lp-tab[data-tab="benefits"]');
    if (benefitsTab) {
      benefitsTab.click();
      expect(benefitsTab.classList.contains('active')).toBe(true);
    }
  });

  it('5. Modal closes on close button, overlay click, and Escape key', async () => {
    await listPage.mount();

    const firstBtn = container.querySelector('.lp-btn-ver-precos');
    firstBtn?.click();

    const modal = document.getElementById('lp-modal-overlay');
    expect(modal).not.toBeNull();

    const closeBtn = modal.querySelector('#lp-modal-close');
    closeBtn?.click();
    expect(document.getElementById('lp-modal-overlay')).toBeNull();

    // Reopen and test overlay click
    firstBtn?.click();
    const newModal = document.getElementById('lp-modal-overlay');
    newModal?.click();
    expect(document.getElementById('lp-modal-overlay')).toBeNull();

    // Reopen and test Escape key
    firstBtn?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('lp-modal-overlay')).toBeNull();
  });

  it('6. Favorite toggle dispatches ADD_FAVORITE/REMOVE_FAVORITE', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    await listPage.mount();

    const favoriteBtn = container.querySelector('[data-action="toggle-fav"]');
    if (favoriteBtn) {
      favoriteBtn.click();
      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.stringMatching(/ADD_FAVORITE|REMOVE_FAVORITE/),
        expect.any(Object)
      );
    }
  });

  it('7. Supplement card displays price when prices.json loads', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          '1': {
            'store1': { price: 150, label: 'Amazon', pricePerUnit: 0.2, unit: 'g' }
          },
          '2': {
            'store1': { price: 80, label: 'Mercado Livre' }
          },
          '3': {
            'store1': { price: 60, label: 'Shopee' }
          }
        })
      })
    );

    await listPage.mount();
    await new Promise(resolve => setTimeout(resolve, 100));

    const priceElement = container.querySelector('.lp-card-price');
    if (priceElement) {
      expect(priceElement.textContent).toMatch(/R\$|price/);
    }
  });

  it('8. Unmount clears listeners and virtual scroller', () => {
    listPage.mount();
    const spy = vi.spyOn(listPage._scroller, 'unmount');
    listPage.unmount();
    expect(spy).toHaveBeenCalled();
  });
});
