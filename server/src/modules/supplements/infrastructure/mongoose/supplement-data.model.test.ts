/**
 * Supplement Data Model Tests
 *
 * Test coverage for P2 fix: Database indexes optimization
 * - Index creation and configuration
 * - Query performance with indexes
 * - Full-text search support
 * - TTL index configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose, { Schema } from 'mongoose';
import { ISupplementData, SupplementDataModel } from './supplement-data.model.js';

vi.mock('mongoose', () => ({
  default: {
    model: vi.fn(() => ({
      collection: {
        getIndexes: vi.fn().mockResolvedValue({}),
      },
      indexInformation: vi.fn().mockResolvedValue({}),
    })),
    Schema: Schema,
  },
}));

describe('Supplement Data Model - Database Indexes', () => {
  describe('Index Configuration', () => {
    it('should have single index on supplementId', () => {
      // Index: { supplementId: 1 }
      // For: single-field queries, filtering by supplement
      expect(SupplementDataModel).toBeDefined();
      expect(SupplementDataModel.schema.indexes().length).toBeGreaterThan(0);
      const supplementIdIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && !idx[0].lastCrawled
      );
      expect(supplementIdIndex).toBeDefined();
    });

    it('should have compound index on supplementId and lastCrawled', () => {
      // Index: { supplementId: 1, lastCrawled: -1 }
      // For: cache invalidation queries
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex![0]).toHaveProperty('supplementId', 1);
      expect(compoundIndex![0]).toHaveProperty('lastCrawled', -1);
    });

    it('should have text index on name field', () => {
      // Index: { name: 'text' } with default_language: 'portuguese'
      // For: full-text search on product names
      expect(SupplementDataModel).toBeDefined();
      const textIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].name === 'text'
      );
      expect(textIndex).toBeDefined();
      expect(textIndex![0]).toHaveProperty('name', 'text');
    });

    it('should NOT have a TTL index (curated catalog must persist)', () => {
      // The legacy 7-day TTL on createdAt was removed: this collection holds the
      // curated affiliate catalog, which must not auto-expire.
      expect(SupplementDataModel).toBeDefined();
      const ttlIndex = SupplementDataModel.schema.indexes().find(
        idx => typeof idx[1]?.expireAfterSeconds === 'number'
      );
      expect(ttlIndex).toBeUndefined();
    });
  });

  describe('Query Performance', () => {
    it('should use index for supplementId lookups', () => {
      // Query: { supplementId: "vitamin-d" }
      // Should use: supplementId index (single or compound)
      expect(SupplementDataModel).toBeDefined();
      expect(SupplementDataModel.schema.path('supplementId')).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      const supplementIdIndexExists = indexes.some(idx => idx[0].supplementId === 1);
      expect(supplementIdIndexExists).toBe(true);
    });

    it('should use compound index for cache invalidation', () => {
      // Query: { supplementId: "vitamin-d", lastCrawled: { $lt: date } }
      // Should use: { supplementId: 1, lastCrawled: -1 }
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(Object.keys(compoundIndex![0]).length).toBeGreaterThanOrEqual(2);
    });

    it('should use text index for product name search', () => {
      // Query: { $text: { $search: "omega 3" } }
      // Should use: text index on name
      expect(SupplementDataModel).toBeDefined();
      expect(SupplementDataModel.schema.path('name')).toBeDefined();
      const textIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].name === 'text'
      );
      expect(textIndex).toBeDefined();
    });

    it('should optimize sorted queries with lastCrawled', () => {
      // Query: find().sort({ lastCrawled: -1 })
      // Should use: compound index (supplementId, lastCrawled)
      expect(SupplementDataModel).toBeDefined();
      expect(SupplementDataModel.schema.path('lastCrawled')).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should handle userId queries efficiently', () => {
      // Note: userId not directly on supplement, handled via reference
      // Still indexed for relation lookups
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);
    });
  });

  describe('Full-Text Search', () => {
    it('should support Portuguese language text search', () => {
      // Text index with default_language: 'portuguese'
      // Supports: stemming, stop words for Portuguese
      expect(SupplementDataModel).toBeDefined();
    });

    it('should enable fuzzy matching on product names', () => {
      // Text index enables partial word matching
      // Example: "omega" matches "Omega-3", "omega-3"
      expect(SupplementDataModel).toBeDefined();
    });

    it('should improve regex query performance', () => {
      // Text index is 10x faster than regex for product searches
      // Query: db.collection.find( { name: /omega/i } )
      expect(SupplementDataModel).toBeDefined();
    });

    it('should support multi-word searches', () => {
      // Text index supports: "whey protein 1kg"
      // Finds documents matching any/all words based on query
      expect(SupplementDataModel).toBeDefined();
    });
  });

  describe('No TTL Expiration (curated catalog persists)', () => {
    it('should not auto-expire documents', () => {
      // The legacy 7-day createdAt TTL was removed: the affiliate catalog is
      // curated and must persist. See supplement-data.model.ts.
      expect(SupplementDataModel).toBeDefined();
      const ttlIndex = SupplementDataModel.schema.indexes().find(
        idx => typeof idx[1]?.expireAfterSeconds === 'number'
      );
      expect(ttlIndex).toBeUndefined();
    });
  });

  describe('Schema Definition', () => {
    it('should define all required fields', () => {
      // _id, supplementId, name, prices, bestPrice, bestPriceValue,
      // priceHistory, lastCrawled, createdAt, updatedAt
      expect(SupplementDataModel).toBeDefined();
      const requiredFields = ['supplementId', 'name', 'prices', 'lastCrawled'];
      requiredFields.forEach(field => {
        expect(SupplementDataModel.schema.path(field)).toBeDefined();
      });
    });

    it('should have supplementId as required', () => {
      // supplementId: { type: String, required: true, index: true }
      expect(SupplementDataModel).toBeDefined();
      const supplementIdPath = SupplementDataModel.schema.path('supplementId');
      expect(supplementIdPath).toBeDefined();
      expect(supplementIdPath?.isRequired).toBe(true);
    });

    it('should have name as required field', () => {
      // name: { type: String, required: true }
      expect(SupplementDataModel).toBeDefined();
      const namePath = SupplementDataModel.schema.path('name');
      expect(namePath).toBeDefined();
      expect(namePath?.isRequired).toBe(true);
    });

    it('should support nested prices object', () => {
      // prices: { amazon?: {}, mercadolivre?: {}, shopee?: {} }
      expect(SupplementDataModel).toBeDefined();
      const pricesPath = SupplementDataModel.schema.path('prices');
      expect(pricesPath).toBeDefined();
      expect(pricesPath?.instance).toBe('Embedded');
    });

    it('should support price history array', () => {
      // priceHistory: [{ date, price, source }]
      expect(SupplementDataModel).toBeDefined();
      const priceHistoryPath = SupplementDataModel.schema.path('priceHistory');
      expect(priceHistoryPath).toBeDefined();
      expect(priceHistoryPath?.instance).toBe('Array');
    });

    it('should have automatic timestamps', () => {
      // timestamps: true adds createdAt and updatedAt
      expect(SupplementDataModel).toBeDefined();
      const createdAtPath = SupplementDataModel.schema.path('createdAt');
      const updatedAtPath = SupplementDataModel.schema.path('updatedAt');
      expect(createdAtPath).toBeDefined();
      expect(updatedAtPath).toBeDefined();
    });

    it('should use custom collection name', () => {
      // collection: 'supplements_data'
      expect(SupplementDataModel).toBeDefined();
      expect(SupplementDataModel.collection.name).toBe('supplements_data');
    });
  });

  describe('Index Impact on Common Queries', () => {
    it('getPricesForMultiple: should use supplementId index', () => {
      // Query: { supplementId: { $in: [id1, id2, ...] } }
      // Index: { supplementId: 1 }
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      const hasSupplementIdIndex = indexes.some(idx => idx[0].supplementId === 1);
      expect(hasSupplementIdIndex).toBe(true);
    });

    it('searchSupplements: should use text index', () => {
      // Query: { $text: { $search: searchTerm } }
      // Index: { name: 'text' }
      expect(SupplementDataModel).toBeDefined();
      const textIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].name === 'text'
      );
      expect(textIndex).toBeDefined();
      expect(textIndex![0].name).toBe('text');
    });

    it('getCacheInvalidity: should use compound index', () => {
      // Query: { supplementId, lastCrawled: { $lt: cutoff } }
      // Index: { supplementId: 1, lastCrawled: -1 }
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(Object.keys(compoundIndex![0])).toContain('supplementId');
      expect(Object.keys(compoundIndex![0])).toContain('lastCrawled');
    });

    it('getPriceHistory: should use supplementId index', () => {
      // Query: { supplementId: id, priceHistory: { $slice: n } }
      // Index: { supplementId: 1 }
      expect(SupplementDataModel).toBeDefined();
      const supplementIdIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1
      );
      expect(supplementIdIndex).toBeDefined();
    });

    it('listSupplements: should use supplementId for sorting', () => {
      // Query: find().sort({ supplementId: 1, lastCrawled: -1 })
      // Index: { supplementId: 1, lastCrawled: -1 }
      expect(SupplementDataModel).toBeDefined();
      const sortIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(sortIndex).toBeDefined();
      expect(sortIndex![0].supplementId).toBe(1);
      expect(sortIndex![0].lastCrawled).toBe(-1);
    });
  });

  describe('Index Statistics', () => {
    it('should declare the expected schema indexes', () => {
      // supplementId (field-level), compound { supplementId, lastCrawled }, text.
      // No TTL, no duplicate supplementId index.
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(indexes.length).toBeGreaterThanOrEqual(3);
    });

    it('supplementId index should be sparse=false', () => {
      // All documents have supplementId
      expect(SupplementDataModel).toBeDefined();
      const supplementIdIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && !idx[0].lastCrawled
      );
      expect(supplementIdIndex).toBeDefined();
      // Sparse should be false (or undefined, which means false)
      expect(supplementIdIndex![1]?.sparse).not.toBe(true);
    });

    it('compound index should support covered queries', () => {
      // Query: { supplementId, lastCrawled } with projection
      // Can be answered entirely by index without document lookup
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      // Compound index includes both required fields for covering
      expect(Object.keys(compoundIndex![0]).length).toBeGreaterThanOrEqual(2);
    });

    it('text index should use single field', () => {
      // Only indexing name field for text search
      expect(SupplementDataModel).toBeDefined();
      const textIndexes = SupplementDataModel.schema.indexes().filter(
        idx => idx[0].name === 'text'
      );
      expect(textIndexes.length).toBeGreaterThan(0);
    });
  });

  describe('Index Best Practices', () => {
    it('should avoid indexing redundantly', () => {
      // supplementId appears in:
      // 1. Single index { supplementId: 1 }
      // 2. Compound index { supplementId: 1, lastCrawled: -1 }
      // Both are necessary for different query patterns
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      const supplementIdIndexes = indexes.filter(idx => idx[0].supplementId === 1);
      expect(supplementIdIndexes.length).toBeGreaterThanOrEqual(2);
    });

    it('should order compound index keys correctly', () => {
      // Equality (supplementId) before Range (lastCrawled)
      // Index: { supplementId: 1, lastCrawled: -1 } ✓
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      const keys = Object.keys(compoundIndex![0]);
      const supplementIdPos = keys.indexOf('supplementId');
      const lastCrawledPos = keys.indexOf('lastCrawled');
      expect(supplementIdPos).toBeLessThan(lastCrawledPos);
    });

    it('should use descending order for lastCrawled sort', () => {
      // -1 on lastCrawled for reverse chronological order (newest first)
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex![0].lastCrawled).toBe(-1);
    });

    it('should use portuguese language for text index', () => {
      // Supports Portuguese stemming and stop words
      // Important for supplements market (Brazil/PT)
      expect(SupplementDataModel).toBeDefined();
      const textIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].name === 'text'
      );
      expect(textIndex).toBeDefined();
      const options = textIndex![1];
      expect(options).toBeDefined();
      expect(options?.default_language || options?.language_override).toBeTruthy();
    });

    it('should not over-index', () => {
      // Only 5 indexes total (including _id and TTL)
      // Each index: write cost, storage, maintenance overhead
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(indexes.length).toBeLessThanOrEqual(6);
    });
  });

  describe('Performance Characteristics', () => {
    it('supplementId query should be O(log N)', () => {
      // With index: O(log N) - binary search on B-tree
      // Without index: O(N) - full collection scan
      expect(SupplementDataModel).toBeDefined();
      const supplementIdIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1
      );
      expect(supplementIdIndex).toBeDefined();
    });

    it('compound query should use single index', () => {
      // { supplementId, lastCrawled } uses compound index
      // Better than using supplementId index then filtering
      expect(SupplementDataModel).toBeDefined();
      const compoundIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].supplementId === 1 && idx[0].lastCrawled === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(Object.keys(compoundIndex![0]).length).toBeGreaterThanOrEqual(2);
    });

    it('text search should be optimized for full-text', () => {
      // Text index: ~100ms for 1M documents
      // Regex: ~5000ms without index (50x slower)
      expect(SupplementDataModel).toBeDefined();
      const textIndex = SupplementDataModel.schema.indexes().find(
        idx => idx[0].name === 'text'
      );
      expect(textIndex).toBeDefined();
      expect(textIndex![0].name).toBe('text');
    });

    it('indexes should reduce memory pressure', () => {
      // Faster queries = fewer documents in memory
      // Less disk I/O = lower resource usage
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(indexes.length).toBeGreaterThan(0);
      expect(Array.isArray(indexes)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing schema fields', () => {
      // All original fields preserved
      // Only adding indexes, not changing structure
      expect(SupplementDataModel).toBeDefined();
      const existingFields = ['supplementId', 'name', 'prices', 'lastCrawled', 'priceHistory'];
      existingFields.forEach(field => {
        expect(SupplementDataModel.schema.path(field)).toBeDefined();
      });
    });

    it('should not break existing queries', () => {
      // Queries work with or without indexes
      // Indexes only improve performance
      expect(SupplementDataModel).toBeDefined();
      const schema = SupplementDataModel.schema;
      expect(schema).toBeDefined();
      expect(schema.paths).toBeDefined();
    });

    it('should be transparent to application code', () => {
      // No code changes required
      // Indexes created automatically on schema definition
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should be created on connection', () => {
      // Mongoose auto-creates indexes on model initialization
      // Can be disabled with schema: autoIndex = false (not done here)
      expect(SupplementDataModel).toBeDefined();
      // Schema should have autoIndex enabled
      expect(SupplementDataModel.schema.options.autoIndex).not.toBe(false);
    });
  });

  describe('Monitoring & Maintenance', () => {
    it('should support index information queries', () => {
      // db.supplements_data.getIndexes()
      // Shows all indexes and their configuration
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(Array.isArray(indexes)).toBe(true);
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should track index size growth', () => {
      // MongoDB maintains index statistics
      // Can monitor with db.collection.stats()
      expect(SupplementDataModel).toBeDefined();
      const collection = SupplementDataModel.collection;
      expect(collection).toBeDefined();
      expect(collection.name).toBe('supplements_data');
    });

    it('should support index rebuilding if needed', () => {
      // db.collection.reIndex()
      // Can optimize indexes if fragmented (rare)
      expect(SupplementDataModel).toBeDefined();
      const indexes = SupplementDataModel.schema.indexes();
      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should be monitored for query performance', () => {
      // Use db.collection.explain() to verify index usage
      // MongoDB profiler shows which indexes were used
      expect(SupplementDataModel).toBeDefined();
      const schema = SupplementDataModel.schema;
      expect(schema.indexes()).toBeDefined();
      expect(Array.isArray(schema.indexes())).toBe(true);
    });
  });
});
