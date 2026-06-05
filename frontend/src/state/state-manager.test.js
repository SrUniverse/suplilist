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
});
