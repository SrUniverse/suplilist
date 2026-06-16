/**
 * Lazy Loader — Intelligent lazy loading for components, images, and data
 * Supports both Intersection Observer and manual trigger patterns
 */

class LazyLoader {
  constructor() {
    this.observer = null;
    this.callbacks = new WeakMap();
    this._initObserver();
  }

  /**
   * Initialize Intersection Observer for lazy loading
   * @private
   */
  _initObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[LazyLoader] IntersectionObserver not supported');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback(entry.target);
              this.observer.unobserve(entry.target);
              this.callbacks.delete(entry.target);
            }
          }
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before coming into view
        threshold: 0.01,
      }
    );
  }

  /**
   * Lazy load images with srcset support
   * @param {HTMLImageElement} img - Image element
   * @param {string} [placeholder] - Placeholder source while loading
   * @returns {Promise<void>}
   */
  lazyLoadImage(img, placeholder = null) {
    return new Promise((resolve) => {
      if (placeholder) {
        img.src = placeholder;
      }

      const loadImage = () => {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (!src) {
          resolve();
          return;
        }

        // Preload image
        const tempImg = new Image();
        tempImg.onload = () => {
          img.src = src;
          if (srcset) img.srcset = srcset;
          img.classList.add('loaded');
          resolve();
        };
        tempImg.onerror = () => {
          console.error(`[LazyLoader] Failed to load image: ${src}`);
          resolve();
        };
        tempImg.src = src;
        if (srcset) tempImg.srcset = srcset;
      };

      if (this.observer) {
        this.callbacks.set(img, loadImage);
        this.observer.observe(img);
      } else {
        // Fallback: load immediately if IntersectionObserver not available
        loadImage();
      }
    });
  }

  /**
   * Lazy load a component on viewport intersection
   * @param {HTMLElement} element - Element to observe
   * @param {Function} loadFn - Function to call when element enters viewport
   */
  lazyLoadComponent(element, loadFn) {
    if (!this.observer) {
      loadFn();
      return;
    }

    this.callbacks.set(element, loadFn);
    this.observer.observe(element);
  }

  /**
   * Lazy load data via fetch with retry logic
   * @param {string} url - URL to fetch
   * @param {Object} [options={}] - Fetch options
   * @param {number} [maxRetries=3] - Maximum retry attempts
   * @returns {Promise<any>} Parsed JSON response
   */
  async lazyFetchData(url, options = {}, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          signal: options.signal,
          ...options,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Load CSS dynamically
   * @param {string} href - CSS file URL
   * @returns {Promise<void>}
   */
  async loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      document.head.appendChild(link);
    });
  }

  /**
   * Load JavaScript module dynamically with caching
   * @param {string} src - Module URL or path
   * @returns {Promise<Module>} Imported module
   */
  async loadModule(src) {
    try {
      return await import(src);
    } catch (error) {
      console.error(`[LazyLoader] Failed to load module: ${src}`, error);
      throw error;
    }
  }

  /**
   * Unobserve a lazy element
   * @param {HTMLElement} element - Element to stop observing
   */
  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element);
      this.callbacks.delete(element);
    }
  }

  /**
   * Disconnect the observer (cleanup)
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.callbacks = new WeakMap();
    }
  }
}

export const lazyLoader = new LazyLoader();
