/**
 * Advanced Search — Full-text search with filters
 */

import { SUPPLEMENTS_DB } from './stack-recommender.js';

export class AdvancedSearch {
  constructor() {
    this.searchIndex = this.buildSearchIndex();
  }

  /**
   * Build searchable index from supplements DB
   * @private
   */
  buildSearchIndex() {
    return SUPPLEMENTS_DB.map(supp => ({
      id: supp.id,
      name: supp.name,
      nameTokens: this.tokenize(supp.name),
      brand: supp.brand || '',
      brandTokens: this.tokenize(supp.brand || ''),
      category: supp.category,
      subCategory: supp.subCategory || '',
      description: supp.description || '',
      descriptionTokens: this.tokenize(supp.description || ''),
      benefits: supp.benefits || [],
      benefitTokens: (supp.benefits || []).flatMap(b => this.tokenize(b)),
      tags: supp.tags || [],
      evidenceLevel: supp.evidenceLevel,
      price: supp.price,
      pricePerGram: supp.pricePerGram,
      unit: supp.unit,
      rating: supp.rating || 0,
      reviews: supp.reviews || 0,
      inStock: supp.inStock !== false
    }));
  }

  /**
   * Tokenize text for search
   * @private
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  /**
   * Full-text search
   * @param {string} query - Search query
   * @returns {Array} Matching supplements
   */
  search(query) {
    if (!query || query.length < 2) return [];

    const tokens = this.tokenize(query);
    const results = [];

    this.searchIndex.forEach(item => {
      let score = 0;

      // Exact name match (highest priority)
      if (item.name.toLowerCase() === query.toLowerCase()) {
        score += 1000;
      }

      // Partial name match
      if (item.name.toLowerCase().includes(query.toLowerCase())) {
        score += 500;
      }

      // Token matches
      tokens.forEach(token => {
        if (item.nameTokens.includes(token)) score += 100;
        if (item.brandTokens.includes(token)) score += 50;
        if (item.benefitTokens.includes(token)) score += 30;
        if (item.descriptionTokens.includes(token)) score += 10;
        if (item.tags.some(tag => this.tokenize(tag).includes(token))) score += 20;
      });

      if (score > 0) {
        results.push({ ...item, score });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Search with advanced filters
   * @param {string} query - Search query
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered results
   */
  searchWithFilters(query, filters = {}) {
    let results = query ? this.search(query) : this.searchIndex;

    // Category filter
    if (filters.category) {
      results = results.filter(item => item.category === filters.category);
    }

    // Subcategory filter
    if (filters.subCategory) {
      results = results.filter(item => item.subCategory === filters.subCategory);
    }

    // Price range
    if (filters.minPrice !== undefined) {
      results = results.filter(item => item.price >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter(item => item.price <= filters.maxPrice);
    }

    // Evidence level
    if (filters.evidenceLevel) {
      const levels = Array.isArray(filters.evidenceLevel)
        ? filters.evidenceLevel
        : [filters.evidenceLevel];
      results = results.filter(item => levels.includes(item.evidenceLevel));
    }

    // Rating minimum
    if (filters.minRating) {
      results = results.filter(item => item.rating >= filters.minRating);
    }

    // Brand filter
    if (filters.brand) {
      results = results.filter(item =>
        item.brand.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    // In stock only
    if (filters.inStockOnly) {
      results = results.filter(item => item.inStock);
    }

    // Sort
    if (filters.sortBy) {
      results = this.sortResults(results, filters.sortBy);
    }

    // Pagination
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Sort results by criteria
   * @private
   */
  sortResults(results, sortBy) {
    const sortFns = {
      'relevance': (a, b) => b.score - a.score,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'rating': (a, b) => b.rating - a.rating,
      'reviews': (a, b) => b.reviews - a.reviews,
      'name': (a, b) => a.name.localeCompare(b.name),
      'evidence': (a, b) => {
        const levels = { 'A': 3, 'B': 2, 'C': 1 };
        return (levels[b.evidenceLevel] || 0) - (levels[a.evidenceLevel] || 0);
      }
    };

    const sortFn = sortFns[sortBy] || sortFns['relevance'];
    return results.sort(sortFn);
  }

  /**
   * Get search suggestions (autocomplete)
   * @param {string} partial - Partial query
   * @param {number} limit - Max suggestions
   * @returns {Array} Suggested supplements
   */
  getSuggestions(partial, limit = 10) {
    if (!partial || partial.length < 2) return [];

    const query = partial.toLowerCase();
    const suggestions = new Map();

    // Prioritize exact prefix matches
    this.searchIndex.forEach(item => {
      if (item.name.toLowerCase().startsWith(query)) {
        suggestions.set(item.id, { ...item, type: 'name', priority: 1 });
      }
    });

    // Then add partial matches
    this.searchIndex.forEach(item => {
      if (!suggestions.has(item.id) && item.name.toLowerCase().includes(query)) {
        suggestions.set(item.id, { ...item, type: 'name', priority: 2 });
      }
    });

    // Add brand suggestions
    this.searchIndex.forEach(item => {
      if (!suggestions.has(item.id) && item.brand.toLowerCase().includes(query)) {
        suggestions.set(item.id, { ...item, type: 'brand', priority: 3 });
      }
    });

    return Array.from(suggestions.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);
  }

  /**
   * Get related supplements
   * @param {string} supplementId
   * @returns {Array} Related supplements
   */
  getRelated(supplementId) {
    const supplement = this.searchIndex.find(s => s.id === supplementId);
    if (!supplement) return [];

    // Find supplements with same benefits or category
    const related = this.searchIndex
      .filter(s => s.id !== supplementId)
      .map(s => {
        let similarity = 0;

        // Same category
        if (s.category === supplement.category) similarity += 2;

        // Shared benefits
        const sharedBenefits = supplement.benefits.filter(b =>
          s.benefits.includes(b)
        ).length;
        similarity += sharedBenefits * 3;

        // Same evidence level
        if (s.evidenceLevel === supplement.evidenceLevel) similarity += 1;

        return { ...s, similarity };
      })
      .filter(s => s.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return related;
  }

  /**
   * Get filter options for UI
   * @returns {Object} Available filters
   */
  getFilterOptions() {
    const categories = [...new Set(this.searchIndex.map(s => s.category))];
    const brands = [...new Set(this.searchIndex.map(s => s.brand).filter(Boolean))];
    const evidenceLevels = [...new Set(this.searchIndex.map(s => s.evidenceLevel))];
    const priceRange = {
      min: Math.min(...this.searchIndex.map(s => s.price)),
      max: Math.max(...this.searchIndex.map(s => s.price))
    };

    return {
      categories: categories.sort(),
      brands: brands.sort(),
      evidenceLevels: evidenceLevels.sort().reverse(),
      priceRange,
      sortOptions: [
        { value: 'relevance', label: 'Relevância' },
        { value: 'price-asc', label: 'Menor Preço' },
        { value: 'price-desc', label: 'Maior Preço' },
        { value: 'rating', label: 'Melhor Avaliação' },
        { value: 'evidence', label: 'Melhor Evidência' },
        { value: 'name', label: 'Nome (A-Z)' }
      ],
      ratingOptions: [
        { value: 4.5, label: '4.5+ ⭐' },
        { value: 4, label: '4+ ⭐' },
        { value: 3.5, label: '3.5+ ⭐' },
        { value: 3, label: '3+ ⭐' }
      ]
    };
  }

  /**
   * Generate search analytics
   * @param {string} query
   * @param {Array} results
   */
  logSearch(query, results) {
    // For tracking popular searches
    return {
      timestamp: new Date().toISOString(),
      query,
      resultCount: results.length,
      topResults: results.slice(0, 3).map(r => r.id)
    };
  }
}

export default new AdvancedSearch();
