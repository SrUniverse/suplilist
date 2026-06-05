import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../platform/api-client.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('PaymentProcessor', () => {
  let paymentProcessor;

  beforeEach(async () => {
    const module = await import('./payment-processor.js');
    paymentProcessor = module.default;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize payment gateway', async () => {
    await paymentProcessor.init();
    expect(paymentProcessor.isReady()).toBe(true);
  });

  it('should create payment intent', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({ clientSecret: 'pi_test_secret' });
    
    const intent = await paymentProcessor.createIntent({
      amount: 10000,
      currency: 'BRL',
      metadata: { userId: '1' }
    });
    
    expect(intent.clientSecret).toBe('pi_test_secret');
  });

  it('should process payment', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({ 
      status: 'succeeded',
      chargeId: 'ch_test123'
    });
    
    const result = await paymentProcessor.process({
      amount: 10000,
      currency: 'BRL',
      token: 'tok_visa'
    });
    
    expect(result.status).toBe('succeeded');
  });

  it('should handle payment failures', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockRejectedValue(new Error('Insufficient funds'));
    
    try {
      await paymentProcessor.process({
        amount: 10000,
        currency: 'BRL',
        token: 'tok_visa'
      });
    } catch (e) {
      expect(e.message).toContain('Insufficient funds');
    }
  });

  it('should handle 3D Secure challenge', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      status: 'requires_action',
      clientSecret: 'pi_test_3ds'
    });
    
    const result = await paymentProcessor.process({
      amount: 10000,
      currency: 'BRL',
      token: 'tok_visa'
    });
    
    expect(result.status).toBe('requires_action');
  });

  it('should refund payment', async () => {
    const ApiClient = (await import('../platform/api-client.js')).default;
    ApiClient.post.mockResolvedValue({
      status: 'succeeded',
      refundId: 're_test123'
    });
    
    const result = await paymentProcessor.refund({
      chargeId: 'ch_test123',
      amount: 5000
    });
    
    expect(result.refundId).toBe('re_test123');
  });

  it('should validate card details', async () => {
    const isValid = paymentProcessor.validateCard({
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2025,
      cvc: '123'
    });
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid card', async () => {
    const isValid = paymentProcessor.validateCard({
      number: '4000000000000002',
      exp_month: 12,
      exp_year: 2025,
      cvc: '123'
    });
    
    expect(isValid).toBe(false);
  });
});
