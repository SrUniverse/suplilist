import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../platform/api-client.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  }
}));

vi.mock('../state/state-manager.js', () => ({
  default: {
    dispatch: vi.fn(),
    select: vi.fn()
  },
  ACTIONS: { UPDATE_PROFILE: 'UPDATE_PROFILE' }
}));

describe('SubscriptionHandler', () => {
  let subscriptionHandler;

  beforeEach(async () => {
    const module = await import('./subscription-handler.js');
    subscriptionHandler = module.default;
    vi.clearAllMocks();
  });

  it('should create subscription', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      subscriptionId: 'sub_test123',
      status: 'active',
      currentPeriodEnd: 1704067200000
    });
    
    const sub = await subscriptionHandler.create({
      planId: 'plan_premium',
      paymentMethodId: 'pm_test123'
    });
    
    expect(sub.subscriptionId).toBe('sub_test123');
    expect(sub.status).toBe('active');
  });

  it('should fetch active subscription', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.get.mockResolvedValue({
      subscriptionId: 'sub_test123',
      status: 'active',
      planId: 'plan_premium'
    });
    
    const sub = await subscriptionHandler.getActive();
    expect(sub.planId).toBe('plan_premium');
  });

  it('should upgrade subscription plan', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      subscriptionId: 'sub_test123',
      planId: 'plan_elite',
      status: 'active'
    });
    
    const result = await subscriptionHandler.upgrade({
      subscriptionId: 'sub_test123',
      newPlanId: 'plan_elite'
    });
    
    expect(result.planId).toBe('plan_elite');
  });

  it('should downgrade subscription plan', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      subscriptionId: 'sub_test123',
      planId: 'plan_basic',
      status: 'active'
    });
    
    const result = await subscriptionHandler.downgrade({
      subscriptionId: 'sub_test123',
      newPlanId: 'plan_basic'
    });
    
    expect(result.planId).toBe('plan_basic');
  });

  it('should cancel subscription', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.del.mockResolvedValue({
      subscriptionId: 'sub_test123',
      status: 'canceled',
      canceledAt: Date.now()
    });
    
    const result = await subscriptionHandler.cancel('sub_test123');
    expect(result.status).toBe('canceled');
  });

  it('should pause subscription', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      subscriptionId: 'sub_test123',
      status: 'paused',
      pausedUntil: 1704067200000
    });
    
    const result = await subscriptionHandler.pause({
      subscriptionId: 'sub_test123',
      daysUntilResume: 30
    });
    
    expect(result.status).toBe('paused');
  });

  it('should resume paused subscription', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      subscriptionId: 'sub_test123',
      status: 'active'
    });
    
    const result = await subscriptionHandler.resume('sub_test123');
    expect(result.status).toBe('active');
  });

  it('should handle webhook events', async () => {
    const StateManager = (await import('../state/state-manager.js')).default;
    const event = {
      type: 'customer.subscription.updated',
      data: {
        subscriptionId: 'sub_test123',
        planId: 'plan_premium'
      }
    };
    
    await subscriptionHandler.handleWebhook(event);
    expect(StateManager.dispatch).toHaveBeenCalled();
  });

  it('should calculate billing date', async () => {
    const billingDate = subscriptionHandler.getNextBillingDate({
      currentPeriodEnd: 1704067200000
    });
    
    expect(billingDate).toBeGreaterThan(Date.now());
  });
});
