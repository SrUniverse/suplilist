import { describe, it, expect } from 'vitest';

describe('SubscriptionHandler', () => {
  it('should export SubscriptionHandler class', async () => {
    const { SubscriptionHandler } = await import('./subscription-handler.js');
    expect(SubscriptionHandler).toBeDefined();
  });

  it('should export default instance', async () => {
    const module = await import('./subscription-handler.js');
    expect(module.default).toBeDefined();
  });

  it('should have createSubscription method', async () => {
    const module = await import('./subscription-handler.js');
    expect(typeof module.default.createSubscription).toBe('function');
  });

  it('should have cancelSubscription method', async () => {
    const module = await import('./subscription-handler.js');
    expect(typeof module.default.cancelSubscription).toBe('function');
  });

  it('should have isPremiumActive method', async () => {
    const module = await import('./subscription-handler.js');
    expect(typeof module.default.isPremiumActive).toBe('function');
  });
});
