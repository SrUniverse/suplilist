import { describe, it, expect } from 'vitest';

describe('IdentityService', () => {
  it('should export identityService singleton', async () => {
    const { identityService } = await import('./identity-service.js');
    expect(identityService).toBeDefined();
  });

  it('should have login method', async () => {
    const { identityService } = await import('./identity-service.js');
    expect(typeof identityService.login).toBe('function');
  });

  it('should have logout method', async () => {
    const { identityService } = await import('./identity-service.js');
    expect(typeof identityService.logout).toBe('function');
  });

  it('should have initializeSession method', async () => {
    const { identityService } = await import('./identity-service.js');
    expect(typeof identityService.initializeSession).toBe('function');
  });

  it('should have isReady method', async () => {
    const { identityService } = await import('./identity-service.js');
    expect(typeof identityService.isReady).toBe('function');
  });
});
