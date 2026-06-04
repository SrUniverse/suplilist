/**
 * Mobile Utilities
 * Additional mobile-specific enhancements for UX
 */

export class MobileUtilities {
  /**
   * Fix iOS 100vh issue - viewport height changes with address bar
   */
  static fixViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Update on every resize (address bar show/hide)
    window.addEventListener('resize', () => {
      const newVh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${newVh}px`);
    });
  }

  /**
   * Detect device capabilities and set data attributes
   */
  static detectDeviceCapabilities() {
    const html = document.documentElement;

    // Check for touch support
    const isTouch = () => {
      return (('ontouchstart' in window) ||
              (navigator.maxTouchPoints > 0) ||
              (navigator.msMaxTouchPoints > 0));
    };

    if (isTouch()) {
      html.setAttribute('data-device', 'touch');
    }

    // Check for pointer hover support (mouse users)
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (canHover) {
      html.setAttribute('data-device', 'hover');
    }

    // Check for dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-color-scheme', prefersDark ? 'dark' : 'light');

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      html.setAttribute('data-reduce-motion', 'true');
    }
  }

  /**
   * Remove iOS input zoom on focus
   */
  static preventInputZoom() {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      const style = document.createElement('style');
      style.textContent = `
        input, select, textarea {
          font-size: 16px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Smooth scroll polyfill for browsers that don't support it
   */
  static enableSmoothScroll() {
    const supportsSmooth = 'scrollBehavior' in document.documentElement.style;
    if (!supportsSmooth) {
      // Fallback for older browsers
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }

  /**
   * Initialize all mobile utilities
   */
  static init() {
    this.fixViewportHeight();
    this.detectDeviceCapabilities();
    this.preventInputZoom();
    this.enableSmoothScroll();
  }
}

// Auto-init on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MobileUtilities.init());
  } else {
    MobileUtilities.init();
  }
}

export default MobileUtilities;
