/**
 * Integration tests: Firecrawl Service with Circuit Breaker
 * Tests resilience, fallback behavior, and state transitions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import firecrawlService, { FirecrawlService } from './firecrawl.service.js';
import { circuitBreakerRegistry, CircuitState } from './circuit-breaker.service.js';
import { metricsService } from './metrics.service.js';

vi.mock('axios');

describe('Firecrawl Service with Circuit Breaker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metricsService.clear();
    circuitBreakerRegistry.resetAll();
  });

  afterEach(() => {
    circuitBreakerRegistry.resetAll();
  });

  describe('circuit breaker integration', () => {
    it('should start with CLOSED circuit breaker', async () => {
      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {});
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should trip circuit after 5 failures in 60 seconds', async () => {
      const mockError = new Error('API Error');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 5,
        windowMs: 60000,
        timeoutMs: 100,
      });

      // Trigger 5 failures
      const service = new FirecrawlService();

      for (let i = 0; i < 5; i++) {
        try {
          await service.searchSupplementOnDemand('test-supplement');
        } catch {
          // Expected failures
        }
      }

      // Circuit should be OPEN
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should use fallback when circuit is OPEN', async () => {
      const mockError = new Error('Service Down');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 100,
      });

      const service = new FirecrawlService();

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.searchSupplementOnDemand('test');
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Search should still work via fallback
      const results = await service.searchSupplementOnDemand('creatina');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].price).toBeGreaterThan(0);
    });

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      const mockError = new Error('Service Down');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50, // Short timeout for testing
      });

      const service = new FirecrawlService();

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.searchSupplementOnDemand('test');
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should transition to HALF_OPEN
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should recover to CLOSED after successful request in HALF_OPEN', async () => {
      const mockError = new Error('Service Down');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50,
        halfOpenRequests: 1,
      });

      const service = new FirecrawlService();

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.searchSupplementOnDemand('test');
        } catch {
          // Expected
        }
      }

      // Wait for HALF_OPEN transition
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Mock successful response
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            markdown: '# Supplements\n\n- **Whey Protein** - R$ 80,00',
          },
        },
      } as any);

      // Attempt recovery
      const results = await service.searchSupplementOnDemand('protein');

      // Should be recovered
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('metrics tracking', () => {
    it('should record circuit breaker state changes', async () => {
      const mockError = new Error('Service Down');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 1,
        windowMs: 60000,
        timeoutMs: 100,
        onStateChange: (prev, next) => {
          metricsService.recordCircuitBreakerStateChange(prev, next);
        },
      });

      const service = new FirecrawlService();

      // Trigger failure to trip circuit
      try {
        await service.searchSupplementOnDemand('test');
      } catch {
        // Expected
      }

      // Verify metrics were recorded
      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('circuit_breaker_state_changes_total');
    });

    it('should record fallback usage', async () => {
      const mockError = new Error('Service Down');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 1,
        windowMs: 60000,
      });

      const service = new FirecrawlService();

      // Trip circuit
      try {
        await service.searchSupplementOnDemand('test');
      } catch {
        // Expected
      }

      // Use fallback
      const results = await service.searchSupplementOnDemand('creatina');
      expect(results.length).toBeGreaterThan(0);

      // Verify metrics
      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('circuit_breaker_fallback_total');
    });
  });

  describe('graceful degradation', () => {
    it('should return mock data when circuit is open', async () => {
      const mockError = new Error('API Timeout');
      vi.mocked(axios.post).mockRejectedValue(mockError);

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 1,
        windowMs: 60000,
      });

      const service = new FirecrawlService();

      // Trip the circuit
      try {
        await service.searchSupplementOnDemand('test');
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Should still work with mock fallback
      const results = await service.searchSupplementOnDemand('whey protein');
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            price: expect.any(Number),
            source: expect.any(String),
          }),
        ])
      );

      // Should contain well-known supplements
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes('whey'))).toBe(true);
    });

    it('should recover when service becomes available again', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Down'));

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 1,
        windowMs: 60000,
        timeoutMs: 50,
        halfOpenRequests: 1,
      });

      const service = new FirecrawlService();

      // Trip circuit
      try {
        await service.searchSupplementOnDemand('test');
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery window
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Service recovers
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            markdown:
              '# Real Results\n\n- **Whey Isolate 1kg** - R$ 150,00\n- **Creatina Pura** - R$ 50,00',
          },
        },
      } as any);

      const results = await service.searchSupplementOnDemand('whey');

      // Circuit should be closed and using real data
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(results.length).toBeGreaterThan(0);
      // Real data has higher prices than mock
      expect(results[0].price).toBeGreaterThan(100);
    });
  });

  describe('on-demand search resilience', () => {
    it('should continue searching other sources when one is behind circuit breaker', async () => {
      // Simulate first source failing
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Firecrawl timeout'));

      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 1,
        windowMs: 60000,
      });

      const service = new FirecrawlService();

      // Trip circuit on first search
      try {
        await service.searchSupplementOnDemand('test');
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Second search should still work via fallback
      const results = await service.searchSupplementOnDemand('creatina');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('price');
      expect(results[0]).toHaveProperty('source');
    });
  });
});
