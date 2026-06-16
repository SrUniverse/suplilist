/**
 * Responsive Helpers — Breakpoint utilities and responsive logic
 * Centralized breakpoints matching CSS media queries
 */

class ResponsiveHelpers {
  constructor() {
    // Breakpoints must match CSS design-system.css
    this.breakpoints = {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };

    this.mediaQueries = new Map();
    this._initMediaQueries();
  }

  /**
   * Initialize media query listeners
   * @private
   */
  _initMediaQueries() {
    for (const [name, width] of Object.entries(this.breakpoints)) {
      const mq = window.matchMedia(`(min-width: ${width}px)`);
      this.mediaQueries.set(name, mq);
      // Listen for changes
      if (mq.addListener) mq.addListener(() => this._notifyListeners(name));
      else mq.addEventListener('change', () => this._notifyListeners(name));
    }
  }

  /**
   * Get current breakpoint name
   * @returns {string} Breakpoint name (xs, sm, md, lg, xl, 2xl)
   */
  getCurrentBreakpoint() {
    let current = 'xs';
    for (const [name, width] of Object.entries(this.breakpoints)) {
      if (window.innerWidth >= width) {
        current = name;
      }
    }
    return current;
  }

  /**
   * Check if current viewport is at or above breakpoint
   * @param {string} breakpoint - Breakpoint name
   * @returns {boolean} Whether viewport is at or above breakpoint
   */
  isAtLeast(breakpoint) {
    const mq = this.mediaQueries.get(breakpoint);
    return mq ? mq.matches : window.innerWidth >= this.breakpoints[breakpoint];
  }

  /**
   * Check if current viewport is at or below breakpoint
   * @param {string} breakpoint - Breakpoint name
   * @returns {boolean} Whether viewport is at or below breakpoint
   */
  isAtMost(breakpoint) {
    const width = this.breakpoints[breakpoint];
    return width ? window.innerWidth <= width : false;
  }

  /**
   * Check if current viewport is mobile (< md breakpoint)
   * @returns {boolean} Whether viewport is mobile
   */
  isMobile() {
    return this.isAtMost('md') || window.innerWidth < this.breakpoints.md;
  }

  /**
   * Check if current viewport is tablet (md to lg)
   * @returns {boolean} Whether viewport is tablet
   */
  isTablet() {
    return this.isAtLeast('md') && this.isAtMost('lg');
  }

  /**
   * Check if current viewport is desktop (>= lg)
   * @returns {boolean} Whether viewport is desktop
   */
  isDesktop() {
    return this.isAtLeast('lg');
  }

  /**
   * Get device orientation
   * @returns {string} 'portrait' or 'landscape'
   */
  getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  /**
   * Check if device is in portrait orientation
   * @returns {boolean} Whether in portrait
   */
  isPortrait() {
    return this.getOrientation() === 'portrait';
  }

  /**
   * Check if device is in landscape orientation
   * @returns {boolean} Whether in landscape
   */
  isLandscape() {
    return this.getOrientation() === 'landscape';
  }

  /**
   * Get viewport dimensions
   * @returns {Object} {width, height}
   */
  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Watch for breakpoint changes
   * @param {Function} callback - Called when breakpoint changes: (breakpoint, oldBreakpoint) => {}
   * @returns {Function} Unsubscribe function
   */
  watchBreakpoint(callback) {
    let currentBreakpoint = this.getCurrentBreakpoint();

    const resizeListener = () => {
      const newBreakpoint = this.getCurrentBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        const oldBreakpoint = currentBreakpoint;
        currentBreakpoint = newBreakpoint;
        callback(newBreakpoint, oldBreakpoint);
      }
    };

    window.addEventListener('resize', resizeListener);
    return () => window.removeEventListener('resize', resizeListener);
  }

  /**
   * Watch for orientation changes
   * @param {Function} callback - Called when orientation changes: (orientation, oldOrientation) => {}
   * @returns {Function} Unsubscribe function
   */
  watchOrientation(callback) {
    let currentOrientation = this.getOrientation();

    const orientationListener = () => {
      const newOrientation = this.getOrientation();
      if (newOrientation !== currentOrientation) {
        const oldOrientation = currentOrientation;
        currentOrientation = newOrientation;
        callback(newOrientation, oldOrientation);
      }
    };

    window.addEventListener('orientationchange', orientationListener);
    window.addEventListener('resize', orientationListener);

    return () => {
      window.removeEventListener('orientationchange', orientationListener);
      window.removeEventListener('resize', orientationListener);
    };
  }

  /**
   * Execute callback only on specific breakpoints
   * @param {string|string[]} breakpoints - Breakpoint(s) to match
   * @param {Function} callback - Callback to execute
   * @returns {Function} Unsubscribe function
   */
  onBreakpoint(breakpoints, callback) {
    const breakpointList = Array.isArray(breakpoints) ? breakpoints : [breakpoints];

    const checkAndExecute = () => {
      const current = this.getCurrentBreakpoint();
      if (breakpointList.includes(current)) {
        callback(current);
      }
    };

    // Check immediately
    checkAndExecute();

    // Watch for changes
    const unsubscribe = this.watchBreakpoint(checkAndExecute);
    return unsubscribe;
  }

  /**
   * Get CSS custom properties for current breakpoint
   * @param {string} breakpoint - Breakpoint name
   * @returns {Object} CSS variables for breakpoint
   */
  getBreakpointVars(breakpoint = null) {
    const bp = breakpoint || this.getCurrentBreakpoint();
    const vars = {};

    // Example: set grid columns based on breakpoint
    const gridConfigs = {
      xs: { columns: 1, spacing: '8px' },
      sm: { columns: 2, spacing: '12px' },
      md: { columns: 2, spacing: '16px' },
      lg: { columns: 3, spacing: '20px' },
      xl: { columns: 4, spacing: '24px' },
      '2xl': { columns: 4, spacing: '32px' },
    };

    return gridConfigs[bp] || gridConfigs.xs;
  }
}

export const responsiveHelpers = new ResponsiveHelpers();
