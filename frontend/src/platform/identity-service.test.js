import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./api-client.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  }
}));

describe('IdentityService', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should authenticate user', async () => {
    const IdentityService = (await import('./identity-service.js')).default;
    const ApiClient = (await import('./api-client.js')).default;
    ApiClient.post.mockResolvedValue({ token: 'jwt-token' });
    
    await IdentityService.login('user@test.com', 'password');
    expect(ApiClient.post).toHaveBeenCalledWith('/auth/login', expect.any(Object));
  });

  it('should store authentication token', async () => {
    const IdentityService = (await import('./identity-service.js')).default;
    const ApiClient = (await import('./api-client.js')).default;
    ApiClient.post.mockResolvedValue({ token: 'jwt-token' });
    
    await IdentityService.login('user@test.com', 'password');
    expect(localStorage.getItem('auth:token')).toBe('jwt-token');
  });

  it('should validate session', async () => {
    const IdentityService = (await import('./identity-service.js')).default;
    localStorage.setItem('auth:token', 'valid-token');
    const isValid = IdentityService.isAuthenticated();
    expect(isValid).toBe(true);
  });

  it('should logout user', async () => {
    const IdentityService = (await import('./identity-service.js')).default;
    localStorage.setItem('auth:token', 'token');
    IdentityService.logout();
    expect(localStorage.getItem('auth:token')).toBeNull();
  });

  it('should refresh token', async () => {
    const IdentityService = (await import('./identity-service.js')).default;
    const ApiClient = (await import('./api-client.js')).default;
    ApiClient.post.mockResolvedValue({ token: 'new-token' });
    localStorage.setItem('auth:token', 'old-token');
    
    await IdentityService.refreshToken();
    expect(localStorage.getItem('auth:token')).toBe('new-token');
  });
});
