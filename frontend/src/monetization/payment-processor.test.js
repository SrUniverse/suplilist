import { describe, it, expect } from 'vitest';

describe('PaymentProcessor', () => {
  it('should export PaymentProcessor class', async () => {
    const { PaymentProcessor } = await import('./payment-processor.js');
    expect(PaymentProcessor).toBeDefined();
  });

  it('should export default instance', async () => {
    const module = await import('./payment-processor.js');
    expect(module.default).toBeDefined();
  });

  it('should have init method', async () => {
    const module = await import('./payment-processor.js');
    expect(typeof module.default.init).toBe('function');
  });

  it('should have createPaymentIntent method', async () => {
    const module = await import('./payment-processor.js');
    expect(typeof module.default.createPaymentIntent).toBe('function');
  });

  it('should have processPayment method', async () => {
    const module = await import('./payment-processor.js');
    expect(typeof module.default.processPayment).toBe('function');
  });
});
