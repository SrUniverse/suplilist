/**
 * Accessibility Helpers (a11y) — WCAG 2.1 Level AA compliance utilities
 * Focus management, keyboard navigation, ARIA helpers, and semantic HTML
 */

class AccessibilityHelpers {
  /**
   * Trap focus within a modal/dialog element
   * Prevents tab key from escaping the element
   * @param {HTMLElement} element - Modal element
   * @param {HTMLElement} [initialFocus] - Element to focus initially
   * @returns {Function} Cleanup function
   */
  static trapFocus(element, initialFocus = null) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Set initial focus
    const toFocus = initialFocus || firstElement;
    setTimeout(() => toFocus.focus(), 0);

    const keyHandler = (event) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift+Tab: move backwards
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        // Tab: move forwards
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', keyHandler);

    return () => {
      element.removeEventListener('keydown', keyHandler);
    };
  }

  /**
   * Restore focus to previous element
   * Use after closing a modal/dialog
   * @returns {Function} Function to call to restore focus
   */
  static saveFocus() {
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };
  }

  /**
   * Announce text to screen readers
   * @param {string} message - Message to announce
   * @param {string} [priority='polite'] - 'polite' or 'assertive'
   */
  static announce(message, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only'; // Screen reader only
    announcer.textContent = message;
    document.body.appendChild(announcer);

    setTimeout(() => {
      announcer.remove();
    }, 1000);
  }

  /**
   * Make an element's hidden state accessible to screen readers
   * @param {HTMLElement} element - Element to hide
   * @param {boolean} isHidden - Whether element is hidden
   */
  static setHidden(element, isHidden) {
    if (isHidden) {
      element.setAttribute('aria-hidden', 'true');
      element.classList.add('visually-hidden');
      // Also disable all interactive elements within
      element.querySelectorAll('button, a, input, select, textarea').forEach(el => {
        el.setAttribute('tabindex', '-1');
        el.setAttribute('aria-disabled', 'true');
      });
    } else {
      element.removeAttribute('aria-hidden');
      element.classList.remove('visually-hidden');
      element.querySelectorAll('button, a, input, select, textarea').forEach(el => {
        el.removeAttribute('tabindex');
        el.removeAttribute('aria-disabled');
      });
    }
  }

  /**
   * Create an ARIA-compliant button from a div
   * @param {HTMLElement} element - Element to make a button
   * @param {Function} onClick - Click handler
   */
  static makeButton(element, onClick) {
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.addEventListener('click', onClick);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event);
      }
    });
  }

  /**
   * Set loading state with ARIA attributes
   * @param {HTMLElement} element - Element being loaded
   * @param {boolean} isLoading - Loading state
   */
  static setLoadingState(element, isLoading) {
    element.setAttribute('aria-busy', String(isLoading));
    if (isLoading) {
      element.setAttribute('aria-label', 'Loading...');
    } else {
      element.removeAttribute('aria-label');
    }
  }

  /**
   * Set error state with ARIA attributes
   * @param {HTMLElement} element - Element in error state
   * @param {string|null} errorMessage - Error message or null to clear
   */
  static setErrorState(element, errorMessage = null) {
    if (errorMessage) {
      element.setAttribute('aria-invalid', 'true');
      const errorId = `error-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('aria-describedby', errorId);
      
      let errorEl = element.nextElementSibling;
      if (!errorEl || !errorEl.id) {
        errorEl = document.createElement('div');
        errorEl.id = errorId;
        errorEl.className = 'error-message';
        errorEl.textContent = errorMessage;
        element.parentNode.insertBefore(errorEl, element.nextSibling);
      }
    } else {
      element.removeAttribute('aria-invalid');
      element.removeAttribute('aria-describedby');
    }
  }

  /**
   * Create a skip link to jump to main content
   * Place near top of page for keyboard navigation
   * @returns {HTMLElement} Skip link element
   */
  static createSkipLink(targetId = 'main-content') {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.setAttribute('aria-label', 'Skip to main content');
    return skipLink;
  }

  /**
   * Check if an element is visible to users
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is visible
   */
  static isVisible(element) {
    if (!element) return false;
    return !!(
      element.offsetParent !== null ||
      getComputedStyle(element).position === 'fixed'
    );
  }

  /**
   * Get all interactive elements in a container
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement[]} Array of interactive elements
   */
  static getInteractiveElements(container) {
    return Array.from(
      container.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  /**
   * Make content region live (updates announced to screen readers)
   * @param {HTMLElement} region - Region element
   * @param {string} [politeness='polite'] - 'polite', 'assertive', or 'off'
   */
  static makeLiveRegion(region, politeness = 'polite') {
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
  }

  /**
   * Add keyboard shortcut helper
   * @param {string} key - Key to listen for (e.g., 'k', 'Escape')
   * @param {Function} handler - Handler function
   * @param {Object} [options={}] - Options (ctrl, shift, alt)
   * @returns {Function} Cleanup function
   */
  static addKeyboardShortcut(key, handler, options = {}) {
    const listener = (event) => {
      if (event.key === key &&
          event.ctrlKey === (options.ctrl || false) &&
          event.shiftKey === (options.shift || false) &&
          event.altKey === (options.alt || false)) {
        event.preventDefault();
        handler(event);
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }
}

export default AccessibilityHelpers;
