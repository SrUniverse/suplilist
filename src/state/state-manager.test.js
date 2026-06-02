import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager, ACTIONS, STORAGE_KEY } from './state-manager.js';
import { eventBus } from '../core/event-bus.js';

function createTestSM() {
  localStorage.clear();
  StateManager.resetInstance();
  eventBus.clear();
  return StateManager.getInstance();
}

describe('StateManager v4.0', () => {
  // 1. Returns singleton (getInstance() × 2 → same object)
  it('1. Returns singleton (getInstance() × 2 -> same object)', () => {
    const sm1 = createTestSM();
    const sm2 = StateManager.getInstance();
    expect(sm1).toBe(sm2);
  });

  // 2. Dispatches valid action → state changes
  it('2. Dispatches valid action -> state changes', () => {
    const sm = createTestSM();
    expect(sm.user.name).toBeNull();

    sm.dispatch({
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'Bob' }
    });

    expect(sm.user.name).toBe('Bob');
  });

  // 3. Does not add duplicate to stack
  it('3. Does not add duplicate to stack', () => {
    const sm = createTestSM();
    expect(sm.stack.length).toBe(0);

    const item = { id: 'creatina', name: 'Creatina Monohidratada' };
    sm.dispatch({ type: ACTIONS.ADD_TO_STACK, payload: item });
    expect(sm.stack.length).toBe(1);

    // Try adding again
    sm.dispatch({ type: ACTIONS.ADD_TO_STACK, payload: item });
    expect(sm.stack.length).toBe(1); // Still 1!
  });

  // 4. Removes from stack
  it('4. Removes from stack', () => {
    const sm = createTestSM();
    const item = { id: 'creatina', name: 'Creatina Monohidratada' };
    
    sm.dispatch({ type: ACTIONS.ADD_TO_STACK, payload: item });
    expect(sm.stack.length).toBe(1);

    sm.dispatch({
      type: ACTIONS.REMOVE_FROM_STACK,
      payload: { supplementId: 'creatina' }
    });
    expect(sm.stack.length).toBe(0);
  });

  // 5. subscribe() → listener called on change
  it('5. subscribe() -> listener called on change', () => {
    const sm = createTestSM();
    const listener = vi.fn();
    
    sm.subscribe(listener);

    sm.dispatch({
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'Charlie' }
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].user.name).toBe('Charlie');
  });

  // 6. Unsubscribe → listener NOT called
  it('6. Unsubscribe -> listener NOT called', () => {
    const sm = createTestSM();
    const listener = vi.fn();
    
    const unsubscribe = sm.subscribe(listener);
    unsubscribe();

    sm.dispatch({
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'Charlie' }
    });

    expect(listener).not.toHaveBeenCalled();
  });

  // 7. State persists after simulated reload
  it('7. State persists after simulated reload', () => {
    const sm = createTestSM();
    
    sm.dispatch({
      type: ACTIONS.SET_USER_PROFILE,
      payload: { name: 'Alice' }
    });
    
    // Force write immediately to bypass the 300ms debounce
    sm._flushPersist();

    // Verify written to storage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.user.name).toBe('Alice');

    // Simulate page reload by creating a new StateManager instance
    StateManager.resetInstance();
    const newSm = StateManager.getInstance();

    expect(newSm.user.name).toBe('Alice');
  });

  // 8. Adds check-in with auto ID + timestamp
  it('8. Adds check-in with auto ID + timestamp', () => {
    const sm = createTestSM();
    expect(sm.checkins.length).toBe(0);

    sm.dispatch({
      type: ACTIONS.ADD_CHECKIN,
      payload: { supplementId: 'creatina', note: 'Pós-treino' }
    });

    expect(sm.checkins.length).toBe(1);
    const checkin = sm.checkins[0];
    expect(checkin.id).toBeDefined();
    expect(checkin.timestamp).toBeDefined();
    expect(checkin.supplementId).toBe('creatina');
    expect(checkin.note).toBe('Pós-treino');
  });

  // 9. todayCheckins returns only today's items
  it("9. todayCheckins returns only today's items", () => {
    const sm = createTestSM();
    
    // Checkin today
    sm.dispatch({
      type: ACTIONS.ADD_CHECKIN,
      payload: {
        supplementId: 'creatina',
        date: new Date().toISOString().split('T')[0]
      }
    });

    // Checkin yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    sm.dispatch({
      type: ACTIONS.ADD_CHECKIN,
      payload: {
        supplementId: 'whey',
        date: yesterday.toISOString().split('T')[0]
      }
    });

    expect(sm.checkins.length).toBe(2);
    
    const todayItems = sm.todayCheckins;
    expect(todayItems.length).toBe(1);
    expect(todayItems[0].supplementId).toBe('creatina');
  });

  // 10. Favorites: add and remove
  it('10. Favorites: add and remove', () => {
    const sm = createTestSM();
    expect(sm.favorites.length).toBe(0);

    sm.dispatch({
      type: ACTIONS.ADD_FAVORITE,
      payload: { supplementId: 'creatina' }
    });
    expect(sm.favorites).toEqual(['creatina']);

    // Avoid duplicates
    sm.dispatch({
      type: ACTIONS.ADD_FAVORITE,
      payload: { supplementId: 'creatina' }
    });
    expect(sm.favorites).toEqual(['creatina']);

    sm.dispatch({
      type: ACTIONS.REMOVE_FAVORITE,
      payload: { supplementId: 'creatina' }
    });
    expect(sm.favorites.length).toBe(0);
  });

  // 11. 1000+ dispatches in <200ms
  it('11. 1000+ dispatches in <200ms', () => {
    const sm = createTestSM();

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      sm.dispatch({
        type: ACTIONS.SET_USER_PROFILE,
        payload: { name: `User_${i}` }
      });
    }
    
    // Flush synchronously to write to localStorage before measuring
    sm._flushPersist();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
    expect(sm.user.name).toBe('User_999');
  });

  // 12. Invalid action type → no crash
  it('12. Invalid action type -> no crash', () => {
    const sm = createTestSM();
    expect(() => {
      sm.dispatch({ type: 'INVALID_ACTION_TYPE_ZZZ', payload: {} });
    }).not.toThrow();
  });

  // 13. Null action → no crash
  it('13. Null action -> no crash', () => {
    const sm = createTestSM();
    expect(() => {
      sm.dispatch(null);
      sm.dispatch(undefined);
    }).not.toThrow();
  });

  // 14. Streak returns 0 with no checkins
  it('14. Streak returns 0 with no checkins', () => {
    const sm = createTestSM();
    expect(sm.calculateStreak()).toBe(0);
  });

  // 15. Streak counts consecutive days
  it('15. Streak counts consecutive days', () => {
    const sm = createTestSM();

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);

    const checkins = [
      { date: today.toISOString().split('T')[0] },
      { date: yesterday.toISOString().split('T')[0] },
      { date: dayBefore.toISOString().split('T')[0] }
    ];

    expect(sm.calculateStreak(checkins)).toBe(3);
  });

  // 16. Mapped Action EventBus triggers (Validation Checklist)
  it('Validation Checklist: EventBus events are emitted for mapped actions', () => {
    const sm = createTestSM();
    const handler = vi.fn();
    
    eventBus.on('stack:itemAdded', handler);

    sm.dispatch({
      type: ACTIONS.ADD_TO_STACK,
      payload: { id: 'omega-3', name: 'Ômega 3' }
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      { supplementId: 'omega-3', name: 'Ômega 3' },
      'stack:itemAdded'
    );
  });

  // 18. CLEAR_CHECKINS empties the checkins array
  it('18. CLEAR_CHECKINS empties the checkins array', () => {
    const sm = createTestSM();
    sm.dispatch(ACTIONS.ADD_CHECKIN, { supplementId: 'creatina', date: '2026-01-01', note: '' });
    expect(sm.checkins.length).toBe(1);

    sm.dispatch(ACTIONS.CLEAR_CHECKINS);
    expect(sm.checkins).toEqual([]);
  });

  // 19. undo() reverts the last dispatched action
  it('19. undo() reverts the last dispatched action', () => {
    const sm = createTestSM();
    const before = sm.stack.length;

    sm.dispatch(ACTIONS.ADD_TO_STACK, {
      supplementId: 'test-9999',
      name: 'Test Supplement',
      dosage: 5,
      unit: 'g',
      quantity: 0
    });
    expect(sm.stack.length).toBe(before + 1);

    sm.undo();
    expect(sm.stack.length).toBe(before);
  });

  // 17. QuotaExceededError safety (No infinite loop/stack overflow)
  it('17. Gracefully handles QuotaExceededError and prevents infinite recursion loops', () => {
    const sm = createTestSM();

    // Add 20 old check-ins (>90 days ago) — should be pruned
    for (let i = 0; i < 20; i++) {
      sm.dispatch({
        type: ACTIONS.ADD_CHECKIN,
        payload: { supplementId: `supp-old-${i}`, date: '2025-01-01' }
      });
    }

    // Add 15 recent check-ins (within last 90 days) — should be kept
    for (let i = 0; i < 15; i++) {
      sm.dispatch({
        type: ACTIONS.ADD_CHECKIN,
        payload: { supplementId: `supp-new-${i}`, date: '2026-05-29' }
      });
    }

    // Mock localStorage.setItem to throw QuotaExceededError every time
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      const err = new Error('Quota Exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });

    // Call prune directly — should not throw or recurse infinitely
    expect(() => sm._pruneStorage()).not.toThrow();

    // Old check-ins (2025-01-01) should be pruned; recent ones (2026-05-29) kept
    expect(sm.checkins.length).toBe(15);

    // Restore original setItem
    localStorage.setItem = originalSetItem;
  });
});
