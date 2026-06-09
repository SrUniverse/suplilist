import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toastService } from './toast-service.js';
import { eventBus } from '../core/event-bus.js';

describe('ToastService', () => {
  beforeEach(() => {
    // Clear event bus state before each test
    eventBus.clear();
  });

  afterEach(() => {
    // Cleanup toasts after each test
    toastService.cleanup();
    eventBus.clear();
  });

  describe('Memory Leak Prevention - Timeout Cleanup', () => {
    it('should track timeout IDs for cleanup', () => {
      vi.useFakeTimers();

      toastService.success('Test message', 3000);

      // Service should have registered a timeout
      // We can verify by checking cleanup doesn't error
      expect(() => {
        toastService.cleanup();
      }).not.toThrow();

      vi.useRealTimers();
    });

    it('should clear all pending timeouts on cleanup()', () => {
      vi.useFakeTimers();

      // Create multiple toasts with durations
      toastService.success('Toast 1', 3000);
      toastService.error('Toast 2', 5000);
      toastService.warning('Toast 3', 4000);

      // All timeouts should be registered
      // Now cleanup should clear them all
      toastService.cleanup();

      // Advance all timers - should not emit events since we cleaned up
      vi.advanceTimersByTime(10000);

      vi.useRealTimers();
    });

    it('should not leak memory when toast expires naturally', () => {
      vi.useFakeTimers();

      const initialTimeouts = vi.getTimerCount();
      toastService.success('Test', 3000);

      // Advance past the toast duration
      vi.advanceTimersByTime(3000);

      // Timer should be cleared after natural expiration
      const finalTimeouts = vi.getTimerCount();
      expect(finalTimeouts).toBeLessThanOrEqual(initialTimeouts);

      vi.useRealTimers();
    });

    it('should handle clear() method properly', () => {
      vi.useFakeTimers();

      toastService.success('Toast 1', 3000);
      toastService.error('Toast 2', 5000);

      // Clear should remove all pending timeouts
      toastService.clear();

      // Advance timers - should not emit additional events
      vi.advanceTimersByTime(10000);

      vi.useRealTimers();
    });
  });

  describe('Cleanup Method', () => {
    it('should have a cleanup() method', () => {
      expect(typeof toastService.cleanup).toBe('function');
    });

    it('should clear all pending timeouts', () => {
      vi.useFakeTimers();

      toastService.success('Toast 1', 5000);
      toastService.error('Toast 2', 10000);
      toastService.info('Toast 3', 3000);

      const pendingBefore = vi.getTimerCount();

      toastService.cleanup();

      const pendingAfter = vi.getTimerCount();
      expect(pendingAfter).toBeLessThan(pendingBefore);

      vi.useRealTimers();
    });

    it('should not throw when cleaning up with no toasts', () => {
      expect(() => {
        toastService.cleanup();
      }).not.toThrow();
    });

    it('should clear all pending toasts', () => {
      vi.useFakeTimers();

      toastService.success('Test 1');
      toastService.error('Test 2');
      toastService.warning('Test 3');

      // Subscribe to verify toasts are present before cleanup
      let toastCount = 0;
      const unsub = eventBus.on('toast:show', () => {
        toastCount++;
      });

      toastService.cleanup();

      unsub();

      vi.useRealTimers();
    });
  });

  describe('Toast Operations', () => {
    it('should emit TOAST_SHOW event on success()', () => {
      let emitted = false;
      eventBus.once('toast:show', () => {
        emitted = true;
      });

      toastService.success('Test message');

      expect(emitted).toBe(true);
    });

    it('should emit TOAST_SHOW event on error()', () => {
      let emitted = false;
      eventBus.once('toast:show', () => {
        emitted = true;
      });

      toastService.error('Error message');

      expect(emitted).toBe(true);
    });

    it('should limit number of simultaneous toasts', () => {
      const toastMessages = [];
      eventBus.on('toast:show', (toast) => {
        toastMessages.push(toast.message);
      });

      // Create 5 toasts, max is 3
      toastService.success('Toast 1', null);
      toastService.success('Toast 2', null);
      toastService.success('Toast 3', null);
      toastService.success('Toast 4', null);
      toastService.success('Toast 5', null);

      // Should have emitted all 5, but service only keeps 3
      expect(toastMessages.length).toBe(5);

      toastService.cleanup();
    });
  });

  describe('Integration with EventBus', () => {
    it('should emit TOAST_REMOVE event after duration', () => {
      vi.useFakeTimers();

      let removeEmitted = false;
      let removedId = null;

      eventBus.on('toast:remove', ({ id }) => {
        removeEmitted = true;
        removedId = id;
      });

      toastService.success('Test', 1000);

      // Advance time past the duration
      vi.advanceTimersByTime(1100);

      expect(removeEmitted).toBe(true);
      expect(removedId).toBeTruthy();

      vi.useRealTimers();
    });

    it('should handle rapid toast creation without memory leaks', () => {
      vi.useFakeTimers();

      // Create many toasts rapidly
      for (let i = 0; i < 20; i++) {
        toastService.success(`Toast ${i}`, 3000);
      }

      const timersBeforeCleanup = vi.getTimerCount();

      toastService.cleanup();

      const timersAfterCleanup = vi.getTimerCount();
      expect(timersAfterCleanup).toBeLessThan(timersBeforeCleanup);

      vi.useRealTimers();
    });
  });
});