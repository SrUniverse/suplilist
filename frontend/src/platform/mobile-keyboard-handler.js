/**
 * Mobile Keyboard Handler
 * Handles virtual keyboard behavior on iOS/Android
 * - Auto-scroll inputs into view when focused
 * - Prevent layout shift when keyboard appears
 * - Prevent scrollbar jank
 */

export class MobileKeyboardHandler {
  constructor() {
    this.isInitialized = false;
    this.initialViewportHeight = window.innerHeight;
    this.keyboardVisible = false;
  }

  init() {
    if (this.isInitialized) return;

    // Handle input focus - scroll into view above keyboard
    document.addEventListener('focus', (e) => {
      if (this._isInputElement(e.target)) {
        this._handleInputFocus(e.target);
      }
    }, true);

    // Reset on blur
    document.addEventListener('blur', () => {
      this._handleInputBlur();
    }, true);

    // Detect keyboard visibility via viewport height change
    window.addEventListener('resize', () => {
      this._detectKeyboardVisibility();
    });

    // Prevent default zoom on form inputs
    document.addEventListener('touchstart', (e) => {
      if (this._isInputElement(e.target)) {
        e.target.style.fontSize = '16px';
      }
    }, false);

    this.isInitialized = true;
  }

  /**
   * Check if element is an input that needs keyboard handling
   */
  _isInputElement(el) {
    const tagName = el.tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tagName);
  }

  /**
   * Scroll input into view when focused, above keyboard
   */
  _handleInputFocus(inputEl) {
    // Delay to ensure keyboard animation starts
    setTimeout(() => {
      // Get input position
      const rect = inputEl.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!isVisible) {
        // Scroll element into view, with padding for keyboard
        const offset = 120; // Space above input when keyboard visible
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Additional scroll offset
        window.scrollBy({ top: offset, behavior: 'smooth' });
      }
    }, 300); // Wait for keyboard to appear
  }

  /**
   * Reset scroll position when input loses focus
   */
  _handleInputBlur() {
    // Optional: scroll back to top when keyboard closes
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Detect if keyboard is visible via viewport height change
   */
  _detectKeyboardVisibility() {
    const currentHeight = window.innerHeight;
    const heightDifference = this.initialViewportHeight - currentHeight;

    // If viewport height reduced by ~250px+, keyboard is likely visible
    const isKeyboardVisible = heightDifference > 200;

    if (isKeyboardVisible && !this.keyboardVisible) {
      document.body.classList.add('keyboard-visible');
      this.keyboardVisible = true;
    } else if (!isKeyboardVisible && this.keyboardVisible) {
      document.body.classList.remove('keyboard-visible');
      this.keyboardVisible = false;
    }
  }

  /**
   * Prevent 100vh height issues on mobile
   */
  _fixViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}

// Auto-init when module loads
const handler = new MobileKeyboardHandler();
if (typeof window !== 'undefined') {
  // Only init on mobile devices or if forced by tests
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.FORCE_MOBILE_KEYBOARD;
  if (isMobile) {
    handler.init();
  }
}

export default handler;
