import { describe, it, expect } from 'vitest';
import AdvancedSearch from './advanced-search.js';

describe('AdvancedSearch', () => {
  it('should search by supplement name', () => {
    const results = AdvancedSearch.search('creatina');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain('creatina');
  });

  it('should return empty for too short query', () => {
    const results = AdvancedSearch.search('v');
    expect(results.length).toBe(0);
  });

  it('should find exact name match', () => {
    const results = AdvancedSearch.search('creatina');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(100);
  });

  it('should find partial name matches', () => {
    const results = AdvancedSearch.search('whey');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.name.toLowerCase()).toContain('whey');
    });
  });

  it('should search by benefit', () => {
    const results = AdvancedSearch.search('força');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should filter by category', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      category: 'vitamins'
    });
    results.forEach(r => {
      expect(r.category).toBe('vitamins');
    });
  });

  it('should filter by price range', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      minPrice: 20,
      maxPrice: 50
    });
    results.forEach(r => {
      expect(r.price).toBeGreaterThanOrEqual(20);
      expect(r.price).toBeLessThanOrEqual(50);
    });
  });

  it('should filter by evidence level', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      evidenceLevel: 'A'
    });
    results.forEach(r => {
      expect(r.evidenceLevel).toBe('A');
    });
  });

  it('should filter by minimum rating', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      minRating: 4
    });
    results.forEach(r => {
      expect(r.rating).toBeGreaterThanOrEqual(4);
    });
  });

  it('should filter in stock only', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      inStockOnly: true
    });
    results.forEach(r => {
      expect(r.inStock).toBe(true);
    });
  });

  it('should sort by price ascending', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      sortBy: 'price-asc'
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });

  it('should sort by price descending', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      sortBy: 'price-desc'
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
    }
  });

  it('should sort by rating', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      sortBy: 'rating'
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].rating).toBeLessThanOrEqual(results[i - 1].rating);
    }
  });

  it('should sort by evidence level', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      sortBy: 'evidence'
    });
    const levels = { 'A': 3, 'B': 2, 'C': 1 };
    for (let i = 1; i < results.length; i++) {
      const curr = levels[results[i].evidenceLevel] || 0;
      const prev = levels[results[i - 1].evidenceLevel] || 0;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it('should respect limit parameter', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should provide autocomplete suggestions', () => {
    const suggestions = AdvancedSearch.getSuggestions('creat');
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s.name.toLowerCase()).toContain('creat');
    });
  });

  it('should prioritize prefix matches in suggestions', () => {
    const suggestions = AdvancedSearch.getSuggestions('creat');
    expect(suggestions.length).toBeGreaterThan(0);
    const prefixMatches = suggestions.filter(s =>
      s.name.toLowerCase().startsWith('creat')
    );
    expect(prefixMatches.length).toBeGreaterThan(0);
  });

  it('should limit suggestions count', () => {
    const suggestions = AdvancedSearch.getSuggestions('vita', 3) // Vitamina D, Vitamina C, etc.;
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('should get related supplements', () => {
    // Assuming vitamin-d exists
    const related = AdvancedSearch.getRelated('vitamin-d');
    expect(Array.isArray(related)).toBe(true);
  });

  it('should return filter options', () => {
    const options = AdvancedSearch.getFilterOptions();

    expect(options).toHaveProperty('categories');
    expect(options).toHaveProperty('brands');
    expect(options).toHaveProperty('evidenceLevels');
    expect(options).toHaveProperty('priceRange');
    expect(options).toHaveProperty('sortOptions');

    expect(Array.isArray(options.categories)).toBe(true);
    expect(options.priceRange).toHaveProperty('min');
    expect(options.priceRange).toHaveProperty('max');
  });

  it('should combine multiple filters', () => {
    const results = AdvancedSearch.searchWithFilters('creatina', {
      category: 'vitamins',
      minPrice: 15,
      maxPrice: 40,
      minRating: 3.5,
      sortBy: 'rating',
      limit: 10
    });

    results.forEach(r => {
      expect(r.category).toBe('vitamins');
      expect(r.price).toBeGreaterThanOrEqual(15);
      expect(r.price).toBeLessThanOrEqual(40);
      expect(r.rating).toBeGreaterThanOrEqual(3.5);
    });

    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should log search analytics', () => {
    const results = AdvancedSearch.search('vitamin');
    const analytics = AdvancedSearch.logSearch('vitamin', results);

    expect(analytics).toHaveProperty('timestamp');
    expect(analytics).toHaveProperty('query', 'vitamin');
    expect(analytics).toHaveProperty('resultCount');
    expect(analytics).toHaveProperty('topResults');
  });

  it('should handle empty search gracefully', () => {
    const results = AdvancedSearch.searchWithFilters('');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should be case insensitive', () => {
    const lower = AdvancedSearch.search('vitamin d');
    const upper = AdvancedSearch.search('VITAMIN D');
    const mixed = AdvancedSearch.search('Vitamin D');

    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });
});
