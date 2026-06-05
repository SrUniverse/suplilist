import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    state: { user: { tier: 'free' }, favorites: [], stack: [], checkins: [] },
    dispatch: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
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

vi.mock('../stack/stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: '1', name: 'Whey', category: 'Proteínas', targets: { bulk: 1 } },
    { id: '2', name: 'Creatina', category: 'Performance', targets: { strength: 1 } }
  ]
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() }
}));

vi.mock('../../config/constants.js', () => ({
  DEBOUNCE_SEARCH_MS: 300
}));

describe('ListPageSearch', () => {
  let container;
  let search;

  beforeEach(async () => {
    container = document.createElement('div');
    container.innerHTML = `
      <input id="lp-search" />
      <div id="lp-cat-row"></div>
      <div id="lp-obj-row"></div>
      <div id="lp-results-label"></div>
      <div id="lp-stats-row">
        <div id="lp-ring-total"></div>
        <div id="lp-ring-stack"></div>
        <div id="lp-ring-favs"></div>
        <div id="lp-ring-eva"></div>
        <div id="lp-stat-total"></div>
        <div id="lp-stat-stack"></div>
        <div id="lp-stat-favs"></div>
        <div id="lp-stat-eva"></div>
      </div>
    `;
    document.body.appendChild(container);

    const { ListPageSearch } = await import('./list-page-search.js');
    search = new ListPageSearch(container, {
      onFiltersChanged: vi.fn(),
      onGridRender: vi.fn()
    });
  });

  afterEach(() => {
    search?.unmount();
    document.body.removeChild(container);
  });

  it('should initialize with default filters', () => {
    expect(search._query).toBe('');
    expect(search._category).toBe('Todos');
    expect(search._objective).toBe('');
  });

  it('should save search history', () => {
    search._saveSearchHistory('whey');
    const history = search._getSearchHistory();
    expect(history).toContain('whey');
  });

  it('should not save empty queries to history', () => {
    const before = search._getSearchHistory().length;
    search._saveSearchHistory('');
    const after = search._getSearchHistory().length;
    expect(after).toBe(before);
  });

  it('should deduplicate search history (case-insensitive)', () => {
    search._saveSearchHistory('WHEY');
    search._saveSearchHistory('whey');
    const history = search._getSearchHistory();
    const count = history.filter(h => h.toLowerCase() === 'whey').length;
    expect(count).toBe(1);
  });

  it('should limit search history to 10 items', () => {
    for (let i = 0; i < 15; i++) {
      search._saveSearchHistory(`query${i}`);
    }
    const history = search._getSearchHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });
});
