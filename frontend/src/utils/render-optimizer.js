/**
 * Render Optimizer — Debounced DOM updates, batch rendering, and cache invalidation
 * Prevents excessive reflows and repaints
 */

class RenderOptimizer {
  constructor() {
    this.pendingUpdates = new Map();
    this.rafId = null;
    this.batchTimeout = null;
    this._renderCache = new WeakMap(); // Cache DOM operations
  }

  /**
   * Schedule a batched DOM update with debouncing
   * Multiple calls to update the same target are coalesced into one paint
   * @param {HTMLElement} element - Target element
   * @param {Function} updateFn - Function that updates the element
   * @param {number} [delayMs=50] - Debounce delay in milliseconds
   */
  batchUpdate(element, updateFn, delayMs = 50) {
    // Clear existing timeout for this element
    if (this.pendingUpdates.has(element)) {
      clearTimeout(this.pendingUpdates.get(element).timeout);
    }

    const timeout = setTimeout(() => {
      // Use requestAnimationFrame for optimal paint timing
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = requestAnimationFrame(() => {
        try {
          updateFn(element);
          this.pendingUpdates.delete(element);
          this.rafId = null;
        } catch (error) {
          console.error('[RenderOptimizer] Update failed:', error);
          this.pendingUpdates.delete(element);
        }
      });
      this.pendingUpdates.set(element, { timeout, rafId: this.rafId });
    }, delayMs);

    this.pendingUpdates.set(element, { timeout });
  }

  /**
   * Batch multiple DOM mutations into a single paint cycle
   * @param {Function} updatesFn - Function containing multiple DOM operations
   * @returns {*} Result of updatesFn
   */
  batchMutations(updatesFn) {
    // Disable layout thrashing during batch
    let result;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      result = updatesFn();
      this.rafId = null;
    });
    return result;
  }

  /**
   * Debounce a render function
   * @param {Function} renderFn - Render function
   * @param {number} [delayMs=100] - Debounce delay
   * @returns {Function} Debounced render function
   */
  debounceRender(renderFn, delayMs = 100) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => renderFn(...args), delayMs);
    };
  }

  /**
   * Throttle a render function (max once per interval)
   * @param {Function} renderFn - Render function
   * @param {number} [intervalMs=16] - Throttle interval (16ms ≈ 60fps)
   * @returns {Function} Throttled render function
   */
  throttleRender(renderFn, intervalMs = 16) {
    let lastCall = 0;
    let scheduledCall = null;

    return (...args) => {
      const now = Date.now();
      const timeUntilNext = intervalMs - (now - lastCall);

      if (timeUntilNext <= 0) {
        // Can execute immediately
        lastCall = now;
        renderFn(...args);
      } else {
        // Schedule for later
        if (scheduledCall) clearTimeout(scheduledCall);
        scheduledCall = setTimeout(() => {
          lastCall = Date.now();
          renderFn(...args);
          scheduledCall = null;
        }, timeUntilNext);
      }
    };
  }

  /**
   * Invalidate render cache for an element
   * @param {HTMLElement} element - Element to invalidate
   */
  invalidateCache(element) {
    if (this._renderCache.has(element)) {
      this._renderCache.delete(element);
    }
  }

  /**
   * Cancel all pending updates
   */
  flush() {
    for (const { timeout } of this.pendingUpdates.values()) {
      clearTimeout(timeout);
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.pendingUpdates.clear();
    this.rafId = null;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.flush();
  }
}

export const renderOptimizer = new RenderOptimizer();
