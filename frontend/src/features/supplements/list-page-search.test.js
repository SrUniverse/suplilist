import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stateManager } from '../../state/state-manager.js';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    state: { user: { tier: 'free' }, favorites: [], stack: [], checkins: [] },
    dispatch: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    stack: [],
  },
  ACTIONS: { ADD_FAVORITE: 'ADD_FAVORITE', REMOVE_FAVORITE: 'REMOVE_FAVORITE' }
}));

vi.mock('fuse.js', () => ({
  default: class Fuse {
    constructor(data) { this.data = data; }
    search(query) {
      return this.data
        .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({ item }));
    }
  }
}));

const MOCK_SUPPLEMENTS = [
  { id: '1', name: 'Whey Protein', category: 'Proteínas', targets: { bulk: 1 }, evidenceLevel: 'A', benefits: ['hipertrofia', 'recuperação'], estimatedMonthlyCost: 120 },
  { id: '2', name: 'Creatina', category: 'Performance', targets: { strength: 1 }, evidenceLevel: 'A', benefits: ['força', 'potência'], estimatedMonthlyCost: 80 },
  { id: '3', name: 'Cafeína', category: 'Estimulantes', targets: { focus: 1 }, evidenceLevel: 'A', benefits: ['foco', 'energia'], estimatedMonthlyCost: 30 },
  { id: '4', name: 'Beta-Alanina', category: 'Performance', targets: { endurance: 1 }, evidenceLevel: 'B', benefits: ['resistência'], estimatedMonthlyCost: 60 },
  { id: '5', name: 'Vitamina D3', category: 'Vitaminas', targets: { health: 1 }, evidenceLevel: 'A', benefits: ['saúde', 'imunidade'], estimatedMonthlyCost: 40 },
];

vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: MOCK_SUPPLEMENTS
}));

vi.mock('../../utils/escape.js', () => ({
  escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../config/constants.js', () => ({
  DEBOUNCE_SEARCH_MS: 300
}));

vi.mock('./list-page-utils.js', () => ({
  matchesCategory: (s, cat) => cat === 'Todos' || s.category === cat,
  matchesObjective: (s, obj) => !obj || !!s.targets?.[obj],
  getFavoritesFromState: () => new Set(),
}));

function makeContainer() {
  const el = document.createElement('div');
  el.innerHTML = `
    <input id="lp-search" type="text" />
    <div id="lp-cat-row"></div>
    <div id="lp-obj-row"></div>
    <div id="lp-results-label"></div>
    <div id="lp-history-panel" style="display:none">
      <div id="lp-history-chips"></div>
      <button id="lp-clear-history-btn">Limpar</button>
    </div>
    <div id="lp-evi-filters"></div>
    <div id="lp-ben-filters"></div>
    <input id="lp-price-range" type="range" min="10" max="300" value="300" />
    <span id="lp-price-range-val"></span>
    <button id="lp-adv-filters-btn">Avançado</button>
    <div id="lp-advanced-panel" style="display:none"></div>
    <svg>
      <circle id="lp-ring-total"></circle>
      <circle id="lp-ring-stack"></circle>
      <circle id="lp-ring-favs"></circle>
      <circle id="lp-ring-eva"></circle>
    </svg>
    <span id="lp-stat-total"></span>
    <span id="lp-stat-stack"></span>
    <span id="lp-stat-favs"></span>
    <span id="lp-stat-eva"></span>
    <div id="lp-trending"></div>
  `;
  return el;
}

describe('ListPageSearch', () => {
  let container;
  let search;
  let ListPageSearch;
  let onFiltersChanged;
  let onGridRender;

  beforeEach(async () => {
    localStorage.clear();
    stateManager.state = { user: { tier: 'free' }, favorites: [], stack: [], checkins: [] };
    stateManager.stack = [];

    container = makeContainer();
    document.body.appendChild(container);

    ({ ListPageSearch } = await import('./list-page-search.js'));

    onFiltersChanged = vi.fn();
    onGridRender = vi.fn();

    search = new ListPageSearch(container, { onFiltersChanged, onGridRender });
  });

  afterEach(() => {
    search?.unmount();
    if (container.parentNode) document.body.removeChild(container);
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
  });

  // ─────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────

  it('initializes with default filter state', () => {
    expect(search._query).toBe('');
    expect(search._category).toBe('Todos');
    expect(search._objective).toBe('');
    expect(search._evidenceFilter).toBe('');
    expect(search._maxPriceFilter).toBe(300);
    expect(search._benefitsFilter.size).toBe(0);
  });

  it('init() populates _allItems with custom supplements override', () => {
    const custom = [{ id: 'x', name: 'Custom', category: 'X', targets: {} }];
    search.init(null, custom);
    expect(search._allItems).toEqual(custom);
  });

  it('init() calls onFiltersChanged callback', () => {
    search.init();
    expect(onFiltersChanged).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // getFiltered()
  // ─────────────────────────────────────────────

  it('getFiltered() returns _filtered array', () => {
    search._filtered = [MOCK_SUPPLEMENTS[0]];
    expect(search.getFiltered()).toEqual([MOCK_SUPPLEMENTS[0]]);
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — category filter
  // ─────────────────────────────────────────────

  it('filters by category correctly', () => {
    search.init();
    search._category = 'Performance';
    search._applyFilters();
    const filtered = search.getFiltered().filter(r => !r.isAd);
    expect(filtered.every(s => s.category === 'Performance')).toBe(true);
  });

  it('Todos category returns all items', () => {
    search.init();
    search._category = 'Todos';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBe(MOCK_SUPPLEMENTS.length);
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — objective filter
  // ─────────────────────────────────────────────

  it('filters by objective correctly', () => {
    search.init();
    search._objective = 'strength';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.every(s => !!s.targets?.strength)).toBe(true);
  });

  it('no objective filter returns all items', () => {
    search.init();
    search._objective = '';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBe(MOCK_SUPPLEMENTS.length);
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — evidence filter
  // ─────────────────────────────────────────────

  it('filters by evidence level A', () => {
    search.init();
    search._evidenceFilter = 'A';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.every(s => s.evidenceLevel === 'A')).toBe(true);
  });

  it('filters by evidence level B returns only B items', () => {
    search.init();
    search._evidenceFilter = 'B';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('4');
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — price filter
  // ─────────────────────────────────────────────

  it('filters by max price using estimatedMonthlyCost', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._maxPriceFilter = 50;
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.every(s => s.estimatedMonthlyCost <= 50)).toBe(true);
  });

  it('max price 300 does not filter any items', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._maxPriceFilter = 300;
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBe(MOCK_SUPPLEMENTS.length);
  });

  it('uses prices data over estimatedMonthlyCost for price filter', () => {
    const prices = { '1': { shopee: { price: '200' } } };
    search.init(prices, MOCK_SUPPLEMENTS);
    search._maxPriceFilter = 100;
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    // Whey (id=1) has shopee price 200, exceeds 100 → filtered out
    expect(items.find(s => s.id === '1')).toBeUndefined();
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — benefits filter
  // ─────────────────────────────────────────────

  it('filters by single benefit', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._benefitsFilter.add('foco');
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.every(s => s.benefits?.some(b => b.includes('foco')))).toBe(true);
  });

  it('multi-select benefits requires ALL selected benefits to match', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._benefitsFilter.add('força');
    search._benefitsFilter.add('potência');
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    // Only Creatina has both força and potência
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('2');
  });

  // ─────────────────────────────────────────────
  // _applyFilters() — text search (Fuse.js)
  // ─────────────────────────────────────────────

  it('text search filters by name via Fuse', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._query = 'Creatina';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name).toBe('Creatina');
  });

  it('text search with no match returns empty array', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._query = 'xyznonexistent';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.length).toBe(0);
  });

  // ─────────────────────────────────────────────
  // Ad injection (free tier)
  // ─────────────────────────────────────────────

  it('injects sponsored ad at position 3 for free tier with >3 results', () => {
    stateManager.state = { user: { tier: 'free' }, favorites: [], stack: [], checkins: [] };
    search.init(null, MOCK_SUPPLEMENTS);
    search._category = 'Todos';
    search._applyFilters();
    const all = search.getFiltered();
    expect(all.length).toBeGreaterThan(3);
    // Ad should be at index 3
    expect(all[3]?.isAd).toBe(true);
    expect(all[3]?.id).toBe('sponsored-ad');
  });

  it('does not inject ad for pro tier', () => {
    stateManager.state = { user: { tier: 'pro' }, favorites: [], stack: [], checkins: [] };
    search.init(null, MOCK_SUPPLEMENTS);
    search._applyFilters();
    const all = search.getFiltered();
    expect(all.every(r => !r.isAd)).toBe(true);
  });

  it('does not inject ad when results <= 3', () => {
    stateManager.state = { user: { tier: 'free' }, favorites: [], stack: [], checkins: [] };
    search.init(null, MOCK_SUPPLEMENTS);
    search._query = 'Whey Protein';
    search._applyFilters();
    const all = search.getFiltered();
    expect(all.every(r => !r.isAd)).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Results label
  // ─────────────────────────────────────────────

  it('shows results label when query is active', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._query = 'Creatina';
    search._applyFilters();
    const label = container.querySelector('#lp-results-label');
    expect(label.textContent).toMatch(/resultado/i);
  });

  it('clears results label when no filters are active', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._query = '';
    search._category = 'Todos';
    search._objective = '';
    search._evidenceFilter = '';
    search._maxPriceFilter = 300;
    search._applyFilters();
    const label = container.querySelector('#lp-results-label');
    expect(label.textContent).toBe('');
  });

  // ─────────────────────────────────────────────
  // Search history
  // ─────────────────────────────────────────────

  it('saves a query to search history', () => {
    search._saveSearchHistory('whey');
    const history = search._getSearchHistory();
    expect(history).toContain('whey');
  });

  it('does not save empty or whitespace-only queries', () => {
    const before = search._getSearchHistory().length;
    search._saveSearchHistory('');
    search._saveSearchHistory('   ');
    const after = search._getSearchHistory().length;
    expect(after).toBe(before);
  });

  it('deduplicates search history case-insensitively', () => {
    search._saveSearchHistory('CREATINA');
    search._saveSearchHistory('creatina');
    const history = search._getSearchHistory();
    const count = history.filter(h => h.toLowerCase() === 'creatina').length;
    expect(count).toBe(1);
  });

  it('places new queries at the front of history', () => {
    search._saveSearchHistory('first');
    search._saveSearchHistory('second');
    const history = search._getSearchHistory();
    expect(history[0]).toBe('second');
  });

  it('limits search history to 10 items', () => {
    for (let i = 0; i < 15; i++) {
      search._saveSearchHistory(`query${i}`);
    }
    const history = search._getSearchHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('getSearchHistory returns empty array on invalid JSON', () => {
    localStorage.setItem('suplilist:search-history', 'not-json{');
    const history = search._getSearchHistory();
    expect(history).toEqual([]);
  });

  // ─────────────────────────────────────────────
  // Combined filters
  // ─────────────────────────────────────────────

  it('combined category + evidence filter works correctly', () => {
    search.init(null, MOCK_SUPPLEMENTS);
    search._category = 'Performance';
    search._evidenceFilter = 'A';
    search._applyFilters();
    const items = search.getFiltered().filter(r => !r.isAd);
    expect(items.every(s => s.category === 'Performance' && s.evidenceLevel === 'A')).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Callbacks
  // ─────────────────────────────────────────────

  it('calls onFiltersChanged when _applyFilters is called', () => {
    search.init();
    onFiltersChanged.mockClear();
    search._applyFilters();
    expect(onFiltersChanged).toHaveBeenCalledWith(search.getFiltered());
  });

  // ─────────────────────────────────────────────
  // unmount()
  // ─────────────────────────────────────────────

  it('unmount clears debounce timer without error', () => {
    search._debounceTimer = setTimeout(() => {}, 10000);
    expect(() => search.unmount()).not.toThrow();
  });
});
