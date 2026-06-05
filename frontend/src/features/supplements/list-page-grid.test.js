import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    state: { user: { tier: 'free' }, favorites: [], stack: [] },
    dispatch: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
  ACTIONS: {}
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../core/virtual-scroller.js', () => ({
  VirtualScroller: class {
    constructor(container, items, renderFn, opts) {
      this.container = container;
      this.items = items;
      this.renderFn = renderFn;
      this.opts = opts;
    }
    mount() { this.container.innerHTML = '<div id="lp-grid"></div>'; }
    unmount() { this.container.innerHTML = ''; }
  }
}));

vi.mock('./list-page-utils.js', () => ({
  getFavoritesFromState: () => new Set(),
  toggleFavorite: vi.fn(),
  getMaxSaving: () => null,
  getPriceLabel: () => ({ price: 100 }),
  getDosePrice: () => 'R$ 2,50 / dose',
  formatPrice: (v) => 'R$ ' + v.toFixed(2)
}));

describe('ListPageGrid', () => {
  let container;
  let grid;

  beforeEach(async () => {
    container = document.createElement('div');
    container.innerHTML = '<div id="lp-grid"></div><div id="lp-sentinel"></div>';
    document.body.appendChild(container);

    const { ListPageGrid } = await import('./list-page-grid.js');
    grid = new ListPageGrid(container, {
      onModalOpen: vi.fn(),
      onCheckout: vi.fn(),
      onCardStateRefresh: vi.fn()
    });
  });

  afterEach(() => {
    grid?.unmount();
    document.body.removeChild(container);
  });

  it('should initialize with empty state', () => {
    expect(grid._filtered).toEqual([]);
    expect(grid._prices).toBeNull();
  });

  it('should update filtered items', () => {
    const items = [{ id: '1', name: 'Whey' }];
    grid.updateFiltered(items);
    expect(grid._filtered).toEqual(items);
  });

  it('should handle empty results', () => {
    const grid_el = container.querySelector('#lp-grid');
    grid.updateFiltered([]);
    expect(grid_el.innerHTML).toContain('Nenhum resultado');
  });

  it('should refresh card states without full re-render', () => {
    container.innerHTML = `
      <div id="lp-grid">
        <div class="lp-card" data-id="test-1">
          <button class="lp-btn-fav" data-action="toggle-fav" data-id="test-1">♡</button>
        </div>
      </div>
    `;
    grid._refreshCardStates();
    const btn = container.querySelector('.lp-btn-fav');
    expect(btn).toBeTruthy();
  });

  it('should render sponsored ad card for free tier', () => {
    const items = [{ id: 'sponsored-ad', isAd: true }];
    grid.updateFiltered(items);
    const html = grid._renderSupplementCard(items[0], 0);
    expect(html).toContain('PRO');
  });
});
