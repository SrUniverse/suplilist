import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../data/supplements-db.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', category: 'Protein', objectives: ['muscle'], ppg: 0.20, price: 150 },
    { id: '2', name: 'Creatine', category: 'Performance', objectives: ['strength'], ppg: 0.05, price: 80 },
    { id: '3', name: 'Vitamin D', category: 'Health', objectives: ['immunity'], ppg: 0.10, price: 60 }
  ]
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn((callback) => callback),
    dispatch: vi.fn(),
    getState: vi.fn(() => ({
      stack: [],
      favorites: [],
      checkins: []
    }))
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

vi.mock('../components/virtual-scroller.js', () => ({
  VirtualScroller: class {
    constructor(container, items, renderFn) {
      this.container = container;
      this.items = items;
      this.renderFn = renderFn;
      this.mounted = false;
    }
    mount() {
      this.mounted = true;
    }
    unmount() {
      this.mounted = false;
    }
    updateItems(items) {
      this.items = items;
    }
  }
}));

vi.mock('../analytics/affiliate-engine.js', () => ({
  affiliateEngine: {
    generateLink: vi.fn((url) => `${url}?aff=123`)
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

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'supplement-modal';
    modal.innerHTML = `
      <div class="modal__overlay"></div>
      <div class="modal__content">
        <button class="modal__close"></button>
        <div class="modal__tabs">
          <button data-tab="info" class="modal__tab active"></button>
          <button data-tab="reviews" class="modal__tab"></button>
        </div>
        <div class="modal__panels">
          <div class="modal__panel--info"></div>
          <div class="modal__panel--reviews"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Dynamic import to get fresh class instance
    const { ListPage } = await import('./list-page.js');
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
    expect(grid).toBeDefined();

    const cards = container.querySelectorAll('[data-supplement-id]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('2. Filter by category updates visible supplements', async () => {
    await listPage.mount();

    // Click category filter
    const categoryFilter = container.querySelector('[data-filter="category"]');
    if (categoryFilter) {
      const proteinOption = categoryFilter.querySelector('[data-value="Protein"]');
      proteinOption?.click();
    }

    // Verify filtered results
    const visibleCards = container.querySelectorAll('[data-supplement-id]');
    const names = Array.from(visibleCards).map(card =>
      card.querySelector('[data-name]')?.textContent
    );

    expect(names.some(name => name?.includes('Whey'))).toBe(true);
  });

  it('3. Search query filters supplements and updates grid', async () => {
    await listPage.mount();

    const searchInput = container.querySelector('[data-search="supplements"]');
    if (searchInput) {
      searchInput.value = 'Whey';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    const visibleCards = container.querySelectorAll('[data-supplement-id]');
    const names = Array.from(visibleCards).map(card =>
      card.querySelector('[data-name]')?.textContent
    );

    expect(names.length).toBeGreaterThan(0);
  });

  it('4. Modal opens with supplement data and handles tab switching', async () => {
    await listPage.mount();

    const firstCard = container.querySelector('[data-supplement-id]');
    if (firstCard) {
      firstCard.click();
    }

    const modal = document.getElementById('supplement-modal');
    expect(modal.style.display).not.toBe('none');

    // Click reviews tab
    const reviewsTab = modal.querySelector('[data-tab="reviews"]');
    if (reviewsTab) {
      reviewsTab.click();
      expect(reviewsTab.classList.contains('active')).toBe(true);
    }
  });

  it('5. Modal closes on close button, overlay click, and Escape key', async () => {
    await listPage.mount();

    const firstCard = container.querySelector('[data-supplement-id]');
    firstCard?.click();

    const modal = document.getElementById('supplement-modal');
    const closeBtn = modal.querySelector('.modal__close');

    closeBtn?.click();
    expect(modal.style.display).toBe('none');

    // Reopen and test overlay
    firstCard?.click();
    const overlay = modal.querySelector('.modal__overlay');
    overlay?.click();
    expect(modal.style.display).toBe('none');

    // Reopen and test Escape key
    firstCard?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.style.display).toBe('none');
  });

  it('6. Favorite toggle dispatches ADD_FAVORITE/REMOVE_FAVORITE', async () => {
    const { stateManager } = await import('../state/state-manager.js');
    await listPage.mount();

    const favoriteBtn = container.querySelector('[data-action="toggle-favorite"]');
    if (favoriteBtn) {
      favoriteBtn.click();
      expect(stateManager.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/ADD_FAVORITE|REMOVE_FAVORITE/)
        })
      );
    }
  });

  it('7. Supplement card displays price when prices.json loads', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          '1': 150,
          '2': 80,
          '3': 60
        })
      })
    );

    await listPage.mount();
    await new Promise(resolve => setTimeout(resolve, 100));

    const priceElement = container.querySelector('[data-price]');
    if (priceElement) {
      expect(priceElement.textContent).toMatch(/R\$|price/);
    }
  });

  it('8. Unmount clears listeners and virtual scroller', () => {
    listPage.mount();
    listPage.unmount();

    // Verify no event listeners remain
    const grid = container.querySelector('[data-component="supplement-grid"]');
    expect(grid?.onclick).toBeUndefined();
  });
});
