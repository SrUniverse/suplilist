/**
 * Circuit Breaker Usage Examples
 * Real-world scenarios and best practices
 */

import { circuitBreakerRegistry, CircuitState } from './circuit-breaker.service.js';
import { metricsService } from './metrics.service.js';

/**
 * Example 1: Basic Firecrawl Integration
 * This is how FirecrawlService uses the circuit breaker
 */
export async function example1_FirecrawlIntegration() {
  const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
    failureThreshold: 5,
    windowMs: 60000,
    timeoutMs: 30000,
    halfOpenRequests: 1,
    onStateChange: (prev, next) => {
      console.log(`[Firecrawl] State: ${prev} → ${next}`);
      metricsService.recordCircuitBreakerStateChange(prev, next);
    },
  });

  // Use with async function
  const result = await breaker.execute(
    async () => {
      // Call Firecrawl API
      return await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
        body: JSON.stringify({ url: 'https://example.com' }),
      });
    },
    async () => {
      // Fallback: return cached/mock data
      console.log('Using fallback data');
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { markdown: '# Cached Content' },
        }),
      };
    }
  );

  return result;
}

/**
 * Example 2: Database Connection with Circuit Breaker
 * Prevent cascading database connection failures
 */
export async function example2_DatabaseResilience() {
  const dbBreaker = circuitBreakerRegistry.getOrCreate('mongodb', {
    failureThreshold: 3, // 3 failures to trip
    windowMs: 30000, // in 30 seconds
    timeoutMs: 20000, // then wait 20s before retry
    halfOpenRequests: 1,
    onStateChange: (prev, next) => {
      if (next === CircuitState.OPEN) {
        // Send alert
        console.error(`[DB] Circuit tripped! Switching to read-only mode`);
      } else if (next === CircuitState.CLOSED) {
        console.log(`[DB] Circuit recovered, resuming normal operation`);
      }
    },
  });

  // Execute database query
  const result = await dbBreaker.execute(
    async () => {
      // Real database query
      return db.collection('supplements').find({}).toArray();
    },
    async () => {
      // Fallback: return cached results
      console.log('[DB] Using cached supplement list');
      return getCachedSupplements();
    }
  );

  return result;
}

/**
 * Example 3: API Integration with Observability
 * Third-party API call with metrics
 */
export async function example3_APICalls() {
  const apiBreaker = circuitBreakerRegistry.getOrCreate('payment-gateway', {
    failureThreshold: 5,
    windowMs: 60000,
    timeoutMs: 45000,
    onStateChange: (prev, next) => {
      console.log(`[Payment API] ${prev} → ${next}`);
      metricsService.recordCircuitBreakerStateChange(prev, next);

      if (next === CircuitState.OPEN) {
        // Notify ops team
        notifyOpsTeam('Payment Gateway is down');
      }
    },
  });

  const status = apiBreaker.getStatus();
  console.log('Payment API Status:', {
    state: status.state,
    failures: status.failureCount,
    lastChange: status.lastStateChange,
  });

  const result = await apiBreaker.execute(
    async () => {
      const response = await fetch('https://api.payment-gateway.com/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.PAYMENT_API_KEY}` },
        body: JSON.stringify({ amount: 100 }),
      });

      if (!response.ok) {
        throw new Error(`Payment API error: ${response.status}`);
      }

      return response.json();
    },
    async () => {
      // Fallback: Queue for manual processing
      console.log('Payment queued for manual processing');
      return { status: 'pending', id: 'manual-' + Date.now() };
    }
  );

  return result;
}

/**
 * Example 4: Monitoring and Metrics
 * How to track circuit breaker health
 */
export function example4_Monitoring() {
  // Get status of all circuit breakers
  const allStatus = circuitBreakerRegistry.getAllStatus();

  console.log('=== Circuit Breaker Status ===');
  for (const [name, status] of Object.entries(allStatus)) {
    console.log(`${name}:`);
    console.log(`  State: ${status.state}`);
    console.log(`  Failures: ${status.failureCount}`);
    console.log(`  Last change: ${status.lastStateChange.toISOString()}`);
    console.log('');
  }

  // Export Prometheus metrics
  const metrics = metricsService.getMetrics();
  console.log('=== Prometheus Metrics ===');
  console.log(metrics);

  // Check if any breaker is OPEN
  const openBreakers = Object.entries(allStatus)
    .filter(([_, status]) => status.state === CircuitState.OPEN)
    .map(([name, _]) => name);

  if (openBreakers.length > 0) {
    console.warn(`WARNING: Circuits open for: ${openBreakers.join(', ')}`);
  }
}

/**
 * Example 5: Manual Control (for admin/debugging)
 */
export function example5_ManualControl() {
  // Check current state
  const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {});
  const currentState = breaker.getState();
  console.log(`Current state: ${currentState}`);

  // Manually reset a breaker (admin operation)
  if (currentState === CircuitState.OPEN) {
    console.log('Manually resetting circuit breaker...');
    circuitBreakerRegistry.reset('firecrawl');
    console.log(`New state: ${breaker.getState()}`);
  }

  // Reset all breakers
  console.log('Resetting all circuit breakers...');
  circuitBreakerRegistry.resetAll();
}

/**
 * Example 6: Synchronous Operations
 * Circuit breaker also supports sync functions
 */
export function example6_SyncOperations() {
  const breaker = circuitBreakerRegistry.getOrCreate('cache-sync', {
    failureThreshold: 5,
    windowMs: 60000,
  });

  const cacheValue = breaker.executeSync(
    () => {
      // Sync cache operation
      return Cache.get('user-list');
    },
    () => {
      // Fallback: empty list
      return [];
    }
  );

  return cacheValue;
}

/**
 * Example 7: Error Handling and Recovery
 */
export async function example7_ErrorHandling() {
  const breaker = circuitBreakerRegistry.getOrCreate('external-api', {
    failureThreshold: 3,
    windowMs: 60000,
    timeoutMs: 30000,
  });

  try {
    const data = await breaker.execute(
      async () => {
        // Risky operation
        const response = await fetch('https://unreliable-api.com/data');
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return response.json();
      },
      async () => {
        // Graceful fallback
        console.log('Circuit is OPEN - returning cached data');
        return { cached: true, data: 'default values' };
      }
    );

    console.log('Got data:', data);
  } catch (error) {
    // This will only be thrown if:
    // 1. Circuit is OPEN and no fallback was provided
    // 2. Both main and fallback threw errors
    console.error('Failed even with fallback:', error);
  }
}

/**
 * Example 8: Custom Failure Tracking
 * More advanced: track specific error types
 */
class SmartCircuitBreaker {
  private breaker = circuitBreakerRegistry.getOrCreate('smart-api', {
    failureThreshold: 5,
    windowMs: 60000,
  });

  async executeWithCustomErrorHandling<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    return this.breaker.execute(async () => {
      try {
        return await operation();
      } catch (error) {
        // Only count transient errors
        // Permanent errors should not trip the circuit
        if (this.isTransientError(error)) {
          throw error; // Let circuit breaker count it
        } else {
          console.log('Permanent error, not tripping circuit:', error);
          throw error; // But still propagate
        }
      }
    }, fallback);
  }

  private isTransientError(error: any): boolean {
    // Timeout, connection reset, 5xx errors = transient
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('5xx') ||
      error?.status >= 500
    );
  }
}

/**
 * Example 9: Multi-service Setup
 * Managing multiple circuit breakers for different services
 */
export function example9_MultiService() {
  // Define all circuit breakers for your services
  const breakers = {
    firecrawl: circuitBreakerRegistry.getOrCreate('firecrawl', {
      failureThreshold: 5,
      windowMs: 60000,
    }),
    database: circuitBreakerRegistry.getOrCreate('mongodb', {
      failureThreshold: 3,
      windowMs: 30000,
    }),
    cache: circuitBreakerRegistry.getOrCreate('redis', {
      failureThreshold: 5,
      windowMs: 60000,
    }),
    payment: circuitBreakerRegistry.getOrCreate('stripe', {
      failureThreshold: 2,
      windowMs: 120000,
    }),
  };

  // Check health of all services
  function healthCheck() {
    return {
      timestamp: new Date(),
      breakers: circuitBreakerRegistry.getAllStatus(),
      allHealthy: Object.values(breakers).every(
        (b) => b.getState() === CircuitState.CLOSED
      ),
    };
  }

  return healthCheck();
}

/**
 * Example 10: Production Metrics Export
 * How to expose metrics for Prometheus scraping
 */
export function example10_MetricsEndpoint(req: any, res: any) {
  // Express middleware for /metrics endpoint
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');

  const metrics = metricsService.getMetrics();
  const allStatus = circuitBreakerRegistry.getAllStatus();

  // Add custom circuit breaker metrics
  let output = metrics;
  output += '\n# Circuit Breaker Detailed Status\n';

  for (const [name, status] of Object.entries(allStatus)) {
    const stateValue = status.state === CircuitState.CLOSED ? 0 :
                      status.state === CircuitState.OPEN ? 1 : 2;

    output += `circuit_breaker_state{name="${name}"} ${stateValue}\n`;
    output += `circuit_breaker_failures{name="${name}"} ${status.failureCount}\n`;
    output += `circuit_breaker_last_change{name="${name}"} ${status.lastStateChange.getTime()}\n`;
  }

  res.send(output);
}

// Helper functions (mock implementations)
const db = {
  collection: (name: string) => ({
    find: () => ({ toArray: async () => [] }),
  }),
};

function getCachedSupplements() {
  return [
    { name: 'Whey Protein', price: 89 },
    { name: 'Creatina', price: 45 },
  ];
}

function notifyOpsTeam(message: string) {
  console.error(`[ALERT] ${message}`);
}
