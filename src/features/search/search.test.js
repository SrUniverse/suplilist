import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../ai/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey Protein', category: 'Proteínas', objectives: ['muscle'], evidenceLevel: 'B', benefits: ['Crescimento muscular', 'Força'], estimatedMonthlyCost: 150 },
    { id: '2', name: 'Creatina', category: 'Performance', objectives: ['strength'], evidenceLevel: 'A', benefits: ['Força', 'Foco', 'Energia'], estimatedMonthlyCost: 80 },
    { id: '3', name: 'Vitamin D3', category: 'Vitaminas', objectives: ['immunity'], evidenceLevel: 'A', benefits: ['Imunidade', 'Saúde óssea'], estimatedMonthlyCost: 60 }
  ]
}));

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn(() => vi.fn()),
    dispatch: vi.fn(),
    get: vi.fn((path) => {
      if (path === 'stack') return [];
      return {
        stack: [],
        favorites: [],
        checkins: []
      };
    })
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

vi.mock('../../core/virtual-scroller.js', () => ({
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

describe('ListPage Advanced Search & History', () => {
  let container;
  let listPage;

  beforeEach(async () => {
    localStorage.clear();
    container = document.createElement('div');
    container.id = 'list-page-container';
    document.body.appendChild(container);

    const ListPage = (await import('../../pages/list-page.js')).default;
    listPage = new ListPage(container, {});
    listPage.mount();
  });

  afterEach(() => {
    if (listPage) listPage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Collapsible Filters Panel', () => {
    it('toggles Advanced Filters Panel visibility on filters button click', () => {
      const advBtn = container.querySelector('#lp-adv-filters-btn');
      const advPanel = container.querySelector('#lp-advanced-panel');

      expect(advPanel.style.display).toBe('none');
      expect(listPage._advancedPanelOpen).toBe(false);

      // Click to open
      advBtn.click();
      expect(advPanel.style.display).toBe('flex');
      expect(listPage._advancedPanelOpen).toBe(true);

      // Click to close
      advBtn.click();
      expect(advPanel.style.display).toBe('none');
      expect(listPage._advancedPanelOpen).toBe(false);
    });
  });

  describe('Evidence Level Filtering', () => {
    it('filters items by evidence level chip toggle', () => {
      const advPanel = container.querySelector('#lp-advanced-panel');
      const evChipA = advPanel.querySelector('.lp-evidence-filter[data-evidence="A"]');

      expect(listPage._filtered.length).toBe(3); // All 3 loaded initially

      // Click "Grau A" chip
      evChipA.click();

      expect(listPage._evidenceFilter).toBe('A');
      expect(listPage._filtered.length).toBe(2); // Creatina and Vitamin D3 have evidenceLevel: 'A'
      expect(listPage._filtered.every(s => s.evidenceLevel === 'A')).toBe(true);

      // Toggle off by clicking "Grau A" again
      evChipA.click();

      expect(listPage._evidenceFilter).toBe('');
      expect(listPage._filtered.length).toBe(3); // Restores back to 3
    });
  });

  describe('Price Range Filtering', () => {
    it('filters items below maximum price slider input value', () => {
      const priceSlider = container.querySelector('#lp-price-range');

      expect(listPage._filtered.length).toBe(3);

      // Set slider max price filter to R$ 100
      priceSlider.value = 100;
      priceSlider.dispatchEvent(new Event('input'));

      expect(listPage._maxPriceFilter).toBe(100);
      expect(listPage._filtered.length).toBe(2); // Creatina (80) & Vitamin D3 (60) are <= 100. Whey (150) is excluded.
      expect(listPage._filtered.every(s => (s.estimatedMonthlyCost || 0) <= 100)).toBe(true);

      // Reset slider to R$ 300
      priceSlider.value = 300;
      priceSlider.dispatchEvent(new Event('input'));
      expect(listPage._filtered.length).toBe(3);
    });
  });

  describe('Benefits Tag Filtering', () => {
    it('filters items by benefit tag clicks (AND matching for multiple tags)', () => {
      const advPanel = container.querySelector('#lp-advanced-panel');
      const focusChip = advPanel.querySelector('.lp-benefit-filter[data-benefit="Foco"]');

      expect(listPage._filtered.length).toBe(3);

      // Click "Foco" chip
      focusChip.click();
      expect(listPage._benefitsFilter.has('Foco')).toBe(true);
      expect(listPage._filtered.length).toBe(1); // Only Creatina has "Foco" in benefits
      expect(listPage._filtered[0].name).toBe('Creatina');

      // Click it again to deselect
      focusChip.click();
      expect(listPage._benefitsFilter.has('Foco')).toBe(false);
      expect(listPage._filtered.length).toBe(3);
    });
  });

  describe('Search History', () => {
    it('saves query to search history and renders history chips on search execution', () => {
      listPage._saveSearchHistory('Omega 3');
      listPage._saveSearchHistory('Creatina Pura');

      const history = listPage._getSearchHistory();
      expect(history.length).toBe(2);
      expect(history[0]).toBe('Creatina Pura'); // Most recent first
      expect(history[1]).toBe('Omega 3');

      const historyPanel = container.querySelector('#lp-history-panel');
      expect(historyPanel.style.display).toBe('flex');

      const historyChips = historyPanel.querySelectorAll('.lp-history-chip');
      expect(historyChips.length).toBe(2);
      expect(historyChips[0].textContent).toContain('Creatina Pura');
    });

    it('sets input value and executes search when a history chip is clicked', () => {
      listPage._saveSearchHistory('Creatina');

      const historyPanel = container.querySelector('#lp-history-panel');
      const chip = historyPanel.querySelector('.lp-history-chip');

      // Trigger click
      chip.click();

      const searchInput = container.querySelector('#lp-search');
      expect(searchInput.value).toBe('Creatina');
      expect(listPage._query).toBe('Creatina');
      expect(listPage._filtered.length).toBe(1);
      expect(listPage._filtered[0].name).toBe('Creatina');
    });

    it('clears search history on clear button click', () => {
      listPage._saveSearchHistory('Creatina');
      const historyPanel = container.querySelector('#lp-history-panel');
      const clearBtn = historyPanel.querySelector('#lp-clear-history-btn');

      clearBtn.click();

      expect(listPage._getSearchHistory().length).toBe(0);
      expect(historyPanel.style.display).toBe('none');
    });
  });
});
