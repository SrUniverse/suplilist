import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import stateManager, { ACTIONS, StateManager, STORAGE_KEY } from './state-manager.js';

describe('StateManager', () => {
  beforeEach(() => {
    stateManager.reset();
  });

  afterEach(() => {
    stateManager.reset();
    StateManager.resetInstance();
  });

  it('should initialize with default state', () => {
    const state = stateManager.select(s => s);
    expect(state).toBeDefined();
    expect(state.stack).toBeDefined();
    expect(state.checkins).toBeDefined();
  });

  it('should dispatch actions', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });
    
    const stack = stateManager.select(s => s.stack);
    expect(stack.length).toBeGreaterThan(0);
  });

  it('should select state slices', () => {
    const stack = stateManager.select(s => s.stack);
    expect(Array.isArray(stack)).toBe(true);
  });

  it('should maintain immutability', () => {
    const state1 = stateManager.select(s => s);
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });
    const state2 = stateManager.select(s => s);
    expect(state1).not.toBe(state2);
  });

  it('should support subscriptions', async () => {
    const callback = vi.fn();
    stateManager.subscribe(callback);

    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).toHaveBeenCalled();
  });

  it('should undo last action', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });
    
    const stackBefore = stateManager.select(s => s.stack);
    stateManager.undo();
    const stackAfter = stateManager.select(s => s.stack);
    
    expect(stackBefore.length).not.toBe(stackAfter.length);
  });

  it('should export state', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });
    
    const exported = stateManager.exportState();
    expect(exported).toBeDefined();
    expect(exported.stack).toBeDefined();
  });

  it('should import state', () => {
    const importData = {
      stack: [{ supplementId: '1', name: 'Vitamin D' }],
      checkins: [],
      purchases: [],
      profile: {}
    };
    
    stateManager.importState(importData);
    const state = stateManager.select(s => s);
    expect(state.stack).toEqual(importData.stack);
  });

  it('should hydrate from localStorage', () => {
    const data = {
      stack: [{ supplementId: '1', name: 'Vitamin D' }],
      checkins: [],
      favorites: [],
      user: {}
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    stateManager.hydrate(data);

    const state = stateManager.select(s => s);
    expect(state.stack.length).toBeGreaterThan(0);
    localStorage.clear();
  });

  it('should observe state changes', async () => {
    const callback = vi.fn();
    stateManager.observe('stack', callback);

    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).toHaveBeenCalled();
  });

  it('should support debug mode', () => {
    stateManager.setDebug(true);
    expect(stateManager.select(s => s)).toBeDefined();
  });

  it('should handle concurrent actions', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'D' });
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '2', name: 'C' });
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '3', name: 'B' });
    
    const stack = stateManager.select(s => s.stack);
    expect(stack.length).toBe(3);
  });

  it('should get current state via get()', () => {
    const state = stateManager.get();
    expect(state).toBeDefined();
    expect(state.stack).toBeDefined();
  });

  it('should reset to initial state', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: '1',
      name: 'Vitamin D'
    });

    stateManager.reset();
    const state = stateManager.select(s => s);
    expect(state.stack.length).toBe(0);
  });

  it('should handle REMOVE_FROM_STACK', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: 'vitD', name: 'Vitamina D' });
    const before = stateManager.select(s => s.stack);
    expect(before.length).toBe(1);

    stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: 'vitD' });
    const after = stateManager.select(s => s.stack);
    expect(after.length).toBe(0);
  });

  it('should handle CLEAR_STACK', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A' });
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '2', name: 'B' });
    stateManager.dispatch(ACTIONS.CLEAR_STACK);
    expect(stateManager.select(s => s.stack).length).toBe(0);
  });

  it('should handle ADD_CHECKIN', () => {
    stateManager.dispatch(ACTIONS.ADD_CHECKIN, {
      supplementId: 'vitD',
      date: '2026-06-09',
      taken: true
    });
    const checkins = stateManager.select(s => s.checkins);
    expect(checkins.length).toBeGreaterThan(0);
  });

  it('should handle CLEAR_CHECKINS', () => {
    stateManager.dispatch(ACTIONS.ADD_CHECKIN, { supplementId: '1', date: '2026-06-09', taken: true });
    stateManager.dispatch(ACTIONS.CLEAR_CHECKINS);
    expect(stateManager.select(s => s.checkins).length).toBe(0);
  });

  it('should handle SET_USER_PROFILE', () => {
    stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
      id: 'user-1',
      name: 'João',
      email: 'joao@test.com',
      weight: 80,
      objective: 'bulk'
    });
    const user = stateManager.select(s => s.user);
    expect(user.name).toBe('João');
    expect(user.weight).toBe(80);
  });

  it('should handle ADD_FAVORITE and REMOVE_FAVORITE', () => {
    stateManager.dispatch(ACTIONS.ADD_FAVORITE, { supplementId: 'creatina' });
    const favs = stateManager.select(s => s.favorites);
    expect(favs).toContain('creatina');

    stateManager.dispatch(ACTIONS.REMOVE_FAVORITE, { supplementId: 'creatina' });
    const favsAfter = stateManager.select(s => s.favorites);
    expect(favsAfter).not.toContain('creatina');
  });

  it('should handle SET_THEME', () => {
    stateManager.dispatch(ACTIONS.SET_THEME, { theme: 'light' });
    const theme = stateManager.select(s => s.preferences.theme);
    expect(theme).toBe('light');
  });

  it('should handle SET_RECOMMENDATIONS', () => {
    const recs = [{ id: 'creatina', name: 'Creatina' }];
    stateManager.dispatch(ACTIONS.SET_RECOMMENDATIONS, { items: recs });
    const stored = stateManager.select(s => s.recommendations.items);
    expect(stored).toEqual(recs);
  });

  it('should handle AUTH_LOGIN', () => {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      userId: 'user-123',
      email: 'user@test.com',
      emailVerified: true
    });
    const user = stateManager.select(s => s.user);
    expect(user.isAuthenticated).toBe(true);
    expect(user.email).toBe('user@test.com');
  });

  it('should handle AUTH_LOGOUT', () => {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      userId: 'user-123',
      email: 'user@test.com',
      emailVerified: true
    });
    stateManager.dispatch(ACTIONS.AUTH_LOGOUT);
    const user = stateManager.select(s => s.user);
    expect(user.isAuthenticated).toBe(false);
  });

  it('should handle SET_OFFLINE_MODE', () => {
    stateManager.dispatch(ACTIONS.SET_OFFLINE_MODE, { isOffline: true });
    const isOffline = stateManager.select(s => s.ui.isOffline);
    expect(isOffline).toBe(true);
  });

  it('should handle UPDATE_STACK_ITEM', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A', dosage: { amount: 1, unit: 'g' } });
    stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, { supplementId: '1', dosage: { amount: 2, unit: 'g' } });
    const item = stateManager.select(s => s.stack.find(i => i.supplementId === '1'));
    expect(item.dosage.amount).toBe(2);
  });

  it('should unsubscribe listeners', async () => {
    const callback = vi.fn();
    const unsub = stateManager.subscribe(callback);
    unsub();

    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A' });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).not.toHaveBeenCalled();
  });

  it('should batch multiple dispatches', async () => {
    const callback = vi.fn();
    stateManager.subscribe(callback);

    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A' });
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '2', name: 'B' });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(stateManager.select(s => s.stack).length).toBe(2);
  });

  it('should handle COMPLETE_ONBOARDING', () => {
    stateManager.dispatch(ACTIONS.COMPLETE_ONBOARDING);
    const user = stateManager.select(s => s.user);
    expect(user.onboardingComplete).toBe(true);
  });

  it('should handle UPDATE_PROFILE', () => {
    stateManager.dispatch(ACTIONS.UPDATE_PROFILE, { name: 'Maria', weight: 65 });
    const user = stateManager.select(s => s.user);
    expect(user.name).toBe('Maria');
    expect(user.weight).toBe(65);
  });

  it('should handle UPDATE_PHOTO', () => {
    stateManager.dispatch(ACTIONS.UPDATE_PHOTO, 'https://example.com/photo.jpg');
    const user = stateManager.select(s => s.user);
    expect(user.photo).toBe('https://example.com/photo.jpg');
  });

  it('should handle DELETE_PHOTO', () => {
    stateManager.dispatch(ACTIONS.UPDATE_PHOTO, 'https://example.com/photo.jpg');
    stateManager.dispatch(ACTIONS.DELETE_PHOTO);
    const user = stateManager.select(s => s.user);
    expect(user.photo).toBeNull();
  });

  it('should handle RESTORE_STACK_ITEM_AT_INDEX', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '2', name: 'B' });
    const item = { supplementId: '1', name: 'A' };
    stateManager.dispatch(ACTIONS.RESTORE_STACK_ITEM_AT_INDEX, { item, index: 0 });
    const stack = stateManager.select(s => s.stack);
    expect(stack[0].supplementId).toBe('1');
  });

  it('should handle IMPORT_STACK', () => {
    const items = [{ supplementId: 'a', name: 'A' }, { supplementId: 'b', name: 'B' }];
    stateManager.dispatch(ACTIONS.IMPORT_STACK, items);
    const stack = stateManager.select(s => s.stack);
    expect(stack.length).toBe(2);
    expect(stack[0].supplementId).toBe('a');
  });

  it('should handle INVALIDATE_RECOMMENDATIONS', () => {
    stateManager.dispatch(ACTIONS.SET_RECOMMENDATIONS, { items: [{ id: 'creatina' }] });
    stateManager.dispatch(ACTIONS.INVALIDATE_RECOMMENDATIONS);
    const recs = stateManager.select(s => s.recommendations);
    expect(recs.items).toEqual([]);
    expect(recs.generatedAt).toBeNull();
  });

  it('should handle SET_TIER to pro', () => {
    stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });
    const user = stateManager.select(s => s.user);
    expect(user.tier).toBe('pro');
  });

  it('should ignore SET_TIER with invalid tier', () => {
    stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'invalid' });
    const user = stateManager.select(s => s.user);
    expect(user.tier).not.toBe('invalid');
  });

  it('should handle SET_ROUTE', () => {
    stateManager.dispatch(ACTIONS.SET_ROUTE, { route: '/supplements' });
    const ui = stateManager.select(s => s.ui);
    expect(ui.currentRoute).toBe('/supplements');
  });

  it('should handle SHOW_TOAST', () => {
    stateManager.dispatch(ACTIONS.SHOW_TOAST, { message: 'Saved!', type: 'success' });
    const toast = stateManager.select(s => s.ui.toast);
    expect(toast.message).toBe('Saved!');
    expect(toast.type).toBe('success');
    expect(toast.duration).toBe(3000);
  });

  it('should handle SET_FAVORITES', () => {
    stateManager.dispatch(ACTIONS.SET_FAVORITES, ['creatina', 'omega3']);
    const favs = stateManager.select(s => s.favorites);
    expect(favs).toEqual(['creatina', 'omega3']);
  });

  it('should not add duplicate to favorites', () => {
    stateManager.dispatch(ACTIONS.ADD_FAVORITE, { supplementId: 'creatina' });
    stateManager.dispatch(ACTIONS.ADD_FAVORITE, { supplementId: 'creatina' });
    const favs = stateManager.select(s => s.favorites);
    expect(favs.filter(id => id === 'creatina').length).toBe(1);
  });

  it('should handle PRUNE_CHECKINS_TEST', () => {
    const newCheckins = [{ supplementId: '1', date: '2026-06-01', taken: true }];
    stateManager.dispatch(ACTIONS.PRUNE_CHECKINS_TEST, newCheckins);
    expect(stateManager.select(s => s.checkins)).toEqual(newCheckins);
  });

  it('should handle SET_STACK_QUANTITY', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: 'vitD', name: 'Vitamina D' });
    stateManager.dispatch(ACTIONS.SET_STACK_QUANTITY, { supplementId: 'vitD', quantity: 3 });
    const item = stateManager.select(s => s.stack.find(i => i.supplementId === 'vitD'));
    expect(item.quantity).toBe(3);
  });

  it('should handle SET_OWNER_ID', () => {
    stateManager.dispatch(ACTIONS.SET_OWNER_ID, 'owner-xyz');
    const ownerId = stateManager.select(s => s._ownerId);
    expect(ownerId).toBe('owner-xyz');
  });

  it('should handle AUTH_LOGIN with displayName and avatarUrl', () => {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      id: 'u1', email: 'a@b.com', displayName: 'Alice', avatarUrl: 'https://pic.com/a.jpg',
      emailVerified: true, role: 'user', isMfaEnabled: false
    });
    const user = stateManager.select(s => s.user);
    expect(user.name).toBe('Alice');
    expect(user.avatarUrl).toBe('https://pic.com/a.jpg');
    expect(user.isAuthenticated).toBe(true);
  });

  it('should not add duplicate to stack', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A' });
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, { supplementId: '1', name: 'A' });
    const stack = stateManager.select(s => s.stack);
    expect(stack.filter(i => i.supplementId === '1').length).toBe(1);
  });

  it('should ignore ADD_TO_STACK with invalid payload', () => {
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, null);
    expect(stateManager.select(s => s.stack).length).toBe(0);
  });
});
