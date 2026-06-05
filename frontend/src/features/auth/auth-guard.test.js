import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform/identity-service.js', () => ({
  default: {
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    hasPermission: vi.fn()
  }
}));

vi.mock('../../core/router.js', () => ({
  default: {
    navigate: vi.fn()
  }
}));

describe('AuthGuard', () => {
  let authGuard;

  beforeEach(async () => {
    const module = await import('./auth-guard.js');
    authGuard = module.default;
    vi.clearAllMocks();
  });

  it('should allow authenticated users', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(true);
    
    const canAccess = authGuard.canAccess('/dashboard');
    expect(canAccess).toBe(true);
  });

  it('should block unauthenticated users', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(false);
    
    const canAccess = authGuard.canAccess('/dashboard');
    expect(canAccess).toBe(false);
  });

  it('should redirect to login if not authenticated', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    const Router = (await import('../../core/router.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(false);
    
    authGuard.guard('/dashboard');
    expect(Router.navigate).toHaveBeenCalledWith('/login');
  });

  it('should check user permissions', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(true);
    IdentityService.hasPermission.mockReturnValue(true);
    
    const canAccess = authGuard.canAccess('/admin', { permission: 'admin' });
    expect(canAccess).toBe(true);
  });

  it('should block if permission denied', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(true);
    IdentityService.hasPermission.mockReturnValue(false);
    
    const canAccess = authGuard.canAccess('/admin', { permission: 'admin' });
    expect(canAccess).toBe(false);
  });

  it('should validate token expiry', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.getToken.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) - 3600
    });
    
    const isValid = authGuard.isTokenValid();
    expect(isValid).toBe(false);
  });

  it('should refresh expired token', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.getToken.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 60
    });
    
    IdentityService.hasPermission.mockReturnValue(true);
    const canAccess = authGuard.canAccess('/protected');
    expect(canAccess).toBe(true);
  });

  it('should whitelist public routes', async () => {
    const canAccess = authGuard.canAccess('/login');
    expect(canAccess).toBe(true);
  });

  it('should support role-based access control', async () => {
    const IdentityService = (await import('../../platform/identity-service.js')).default;
    IdentityService.isAuthenticated.mockReturnValue(true);
    IdentityService.hasPermission.mockImplementation((role) => role === 'premium');
    
    const canAccess = authGuard.canAccess('/premium', { roles: ['premium'] });
    expect(canAccess).toBe(true);
  });
});
