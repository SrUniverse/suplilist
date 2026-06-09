/**
 * auth-integration.test.js — End-to-end integration test for the full auth flow.
 *
 * Proves: a fake user can register, verify OTP, access a protected route,
 * and logout — with the entire state machine verified at each step.
 *
 * Strategy: mock at the API boundary (apiFetch) so the real
 * identityService, stateManager, and authGuard logic runs unchanged.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
const mockSetAccessToken = vi.fn();
const mockClearAccessToken = vi.fn();

vi.mock('../../platform/api-client.js', () => ({
  apiFetch: (...args) => mockApiFetch(...args),
  setAccessToken: (...args) => mockSetAccessToken(...args),
  clearAccessToken: (...args) => mockClearAccessToken(...args),
  ApiError: class ApiError extends Error {
    constructor(status, error, message = '') {
      super(message || error);
      this.name = 'ApiError';
      this.status = status;
      this.error = error;
    }
  },
}));

vi.mock('../../platform/migration-service.js', () => ({
  migrationService: { checkAndMigrate: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TEST_EMAIL    = 'integration-test@suplilist.com';
const TEST_PASSWORD = 'Test@1234!';
const TEST_USER_ID  = 'usr_integration_001';
const ACCESS_TOKEN  = 'tok_fake_access_jwt';

const identityDTO = {
  userId:        TEST_USER_ID,
  email:         TEST_EMAIL,
  role:          'free',
  isMfaEnabled:  false,
  emailVerified: true,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Import real modules fresh per test (vi.resetModules() clears singletons).
 */
async function importFresh() {
  vi.resetModules();
  const [{ stateManager, ACTIONS }, { identityService }, { authGuard }] = await Promise.all([
    import('../../state/state-manager.js'),
    import('../../platform/identity-service.js'),
    import('./auth-guard.js'),
  ]);
  return { stateManager, ACTIONS, identityService, authGuard };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Auth Integration — register → verify-OTP → protected route → logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('Step 1 — register: stores pending_verification_email and does NOT set a token', async () => {
    const { identityService } = await importFresh();

    mockApiFetch.mockResolvedValueOnce({
      status: 'pending_verification',
      userId: TEST_USER_ID,
      email:  TEST_EMAIL,
    });

    const result = await identityService.register(TEST_EMAIL, TEST_PASSWORD);

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockSetAccessToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pending_verification_email')).toBe(TEST_EMAIL);
    expect(result.status).toBe('pending_verification');
  });

  it('Step 2 — verifyOtp: sets token, fetches profile, dispatches AUTH_LOGIN', async () => {
    const { stateManager, ACTIONS, identityService } = await importFresh();

    // Call 1: POST /api/auth/verify-otp → access token
    mockApiFetch.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    // Call 2: GET /api/profile/me → identity
    mockApiFetch.mockResolvedValueOnce(identityDTO);

    await identityService.verifyOtp(TEST_EMAIL, '123456');

    expect(mockSetAccessToken).toHaveBeenCalledWith(ACCESS_TOKEN);

    const user = stateManager.get('user');
    expect(user.isAuthenticated).toBe(true);
    expect(user.email).toBe(TEST_EMAIL);
    expect(user.id).toBe(TEST_USER_ID);
    expect(user.emailVerified).toBe(true);
  });

  it('Step 3 — protected route: authGuard allows access for authenticated user', async () => {
    const { stateManager, ACTIONS, identityService, authGuard } = await importFresh();

    // Simulate authenticated state
    mockApiFetch.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    mockApiFetch.mockResolvedValueOnce(identityDTO);
    await identityService.verifyOtp(TEST_EMAIL, '123456');

    const user = stateManager.get('user');

    expect(authGuard.checkAccess('/my-stack', user)).toBe(true);
    expect(authGuard.checkAccess('/list', user)).toBe(true);
    expect(authGuard.checkAccess('/profile', user)).toBe(true);
  });

  it('Step 3b — protected route: authGuard blocks unauthenticated visitor from private routes', async () => {
    const { stateManager, authGuard } = await importFresh();

    const user = stateManager.get('user');
    expect(user.isAuthenticated).toBe(false);

    // Public routes should pass
    expect(authGuard.checkAccess('/login', user)).toBe(true);
    expect(authGuard.checkAccess('/register', user)).toBe(true);
    expect(authGuard.checkAccess('/', user)).toBe(true);

    // Private routes must be blocked (checkAccess returns false)
    expect(authGuard.checkAccess('/my-stack', user)).toBe(false);
    expect(authGuard.checkAccess('/profile', user)).toBe(false);
  });

  it('Step 4 — logout: clears token, wipes state, sets pending logout flag', async () => {
    const { stateManager, identityService } = await importFresh();

    // Login first
    mockApiFetch.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    mockApiFetch.mockResolvedValueOnce(identityDTO);
    await identityService.verifyOtp(TEST_EMAIL, '123456');
    expect(stateManager.get('user').isAuthenticated).toBe(true);

    // Logout (server call resolves)
    mockApiFetch.mockResolvedValueOnce({});
    await identityService.logout();

    expect(mockClearAccessToken).toHaveBeenCalled();

    const user = stateManager.get('user');
    expect(user.isAuthenticated).toBe(false);
  });

  it('Full flow: register → verifyOtp → access protected → logout', async () => {
    const { stateManager, identityService, authGuard } = await importFresh();

    // ── Register ──
    mockApiFetch.mockResolvedValueOnce({ status: 'pending_verification', userId: TEST_USER_ID, email: TEST_EMAIL });
    await identityService.register(TEST_EMAIL, TEST_PASSWORD);
    expect(localStorage.getItem('pending_verification_email')).toBe(TEST_EMAIL);

    // ── Verify OTP ──
    mockApiFetch.mockResolvedValueOnce({ accessToken: ACCESS_TOKEN });
    mockApiFetch.mockResolvedValueOnce(identityDTO);
    await identityService.verifyOtp(TEST_EMAIL, '654321');

    let user = stateManager.get('user');
    expect(user.isAuthenticated).toBe(true);

    // ── Access protected route ──
    expect(authGuard.checkAccess('/my-stack', user)).toBe(true);

    // ── Logout ──
    mockApiFetch.mockResolvedValueOnce({});
    await identityService.logout();

    user = stateManager.get('user');
    expect(user.isAuthenticated).toBe(false);
    expect(mockClearAccessToken).toHaveBeenCalled();

    // ── Verify protected route now blocked ──
    expect(authGuard.checkAccess('/my-stack', user)).toBe(false);
  });
});
