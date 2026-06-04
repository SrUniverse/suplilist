/**
 * migration-service.test.js — Unit tests for the client-side migration service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('./api-client.js', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(status, error) {
      super(error);
      this.status = status;
      this.error = error;
    }
  },
}));

vi.mock('../state/state-manager.js', () => {
  const state = {
    _ownerId: null,
    stack: [],
    favorites: [],
    checkins: [],
  };
  return {
    stateManager: {
      state,
      dispatch: vi.fn((action) => {
        if (action.type === 'SET_OWNER_ID') {
          state._ownerId = action.payload;
        } else if (action.type === 'CLEAR_STACK') {
          state.stack = [];
        } else if (action.type === 'CLEAR_CHECKINS') {
          state.checkins = [];
        } else if (action.type === 'SET_FAVORITES') {
          state.favorites = action.payload;
        }
      }),
      _flushPersist: vi.fn(),
    },
    ACTIONS: {
      SET_USER_PROFILE: 'SET_USER_PROFILE',
      CLEAR_STACK: 'CLEAR_STACK',
      CLEAR_CHECKINS: 'CLEAR_CHECKINS',
      SET_FAVORITES: 'SET_FAVORITES',
      INVALIDATE_RECOMMENDATIONS: 'INVALIDATE_RECOMMENDATIONS',
      SET_OWNER_ID: 'SET_OWNER_ID',
    },
  };
});

// Import after mocks are in place
import { migrationService } from './migration-service.js';
import { apiFetch, ApiError } from './api-client.js';
import { stateManager, ACTIONS } from '../state/state-manager.js';

describe('MigrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateManager.state._ownerId = null;
    stateManager.state.stack = [];
    stateManager.state.favorites = [];
    stateManager.state.checkins = [];
  });

  it('triggers purge when split-brain is detected', async () => {
    stateManager.state._ownerId = 'user-old';
    stateManager.state.stack = [{ id: 'creatina', name: 'Creatina' }];
    stateManager.state.favorites = ['creatina'];

    apiFetch.mockResolvedValue({ success: true });

    await migrationService.checkAndMigrate('user-new', 0);

    // Should purge
    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.CLEAR_STACK });
    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.CLEAR_CHECKINS });
    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.SET_FAVORITES, payload: [] });
    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.SET_OWNER_ID, payload: null });
  });

  it('skips migration but stamps ownerId if server version is already complete', async () => {
    stateManager.state._ownerId = null;

    await migrationService.checkAndMigrate('user-1', 1);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.SET_OWNER_ID, payload: 'user-1' });
  });

  it('skips full migration and only syncs version if locally stamped as complete', async () => {
    stateManager.state._ownerId = 'user-1';

    apiFetch.mockResolvedValueOnce({ success: true });

    await migrationService.checkAndMigrate('user-1', 0);

    // Should only call version sync
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/profile/me/migration-sync', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  it('performs full migration when not yet migrated', async () => {
    stateManager.state._ownerId = null;
    stateManager.state.stack = [{ id: 'creatina', name: 'Creatina', dosage: {} }];
    stateManager.state.favorites = ['creatina'];
    stateManager.state.checkins = [{ id: 'chk_1', supplementId: 'creatina', date: '2026-06-03', timestamp: 12345 }];

    apiFetch.mockResolvedValue({ success: true });

    await migrationService.checkAndMigrate('user-1', 0);

    // Upload stack, favorites, check-ins, and version sync
    expect(apiFetch).toHaveBeenCalledWith('/api/stack/bulk', expect.objectContaining({ method: 'PUT' }));
    expect(apiFetch).toHaveBeenCalledWith('/api/favorites/bulk', expect.objectContaining({ method: 'PUT' }));
    expect(apiFetch).toHaveBeenCalledWith('/api/checkin/bulk', expect.objectContaining({ method: 'POST' }));
    expect(apiFetch).toHaveBeenCalledWith('/api/profile/me/migration-sync', expect.objectContaining({ method: 'PATCH' }));

    expect(stateManager.dispatch).toHaveBeenCalledWith({ type: ACTIONS.SET_OWNER_ID, payload: 'user-1' });
  });

  it('gracefully degrades and skips migration when endpoints return 404', async () => {
    stateManager.state._ownerId = null;
    stateManager.state.stack = [{ id: 'creatina', name: 'Creatina', dosage: {} }];

    // Mock apiFetch throwing 404 ApiError
    apiFetch.mockRejectedValueOnce(new ApiError(404, 'Not Found'));

    await migrationService.checkAndMigrate('user-1', 0);

    // Stack upload fails with 404, check-ins and favorites are skipped
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(stateManager.dispatch).not.toHaveBeenCalledWith({ type: ACTIONS.SET_OWNER_ID, payload: 'user-1' });
  });
});
