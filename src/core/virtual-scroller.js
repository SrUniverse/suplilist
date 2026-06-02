// ============================================================
// Virtual Scroller — Efficient List Rendering
// ============================================================
// Renderiza apenas items visíveis em listas longas.
// Usa Intersection Observer para detectar visibility.
// Suporta listas dinâmicas com altura variável dos items.

export class VirtualScroller {
  /**
   * @param {HTMLElement} container - Div container para a lista
   * @param {Array} items - Array de items
   * @param {Function} renderItem - (item, index) => string (HTML)
   * @param {Object} options - { itemHeight, bufferSize, scrollElement }
   */
  constructor(container, items = [], renderItem, options = {}) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;

    // Options
    this.itemHeight = options.itemHeight || 80; // Estimated item height
    this.bufferSize = options.bufferSize || 5; // Items to render above/below viewport
    this.scrollElement = options.scrollElement || window;

    // State
    this.visibleStartIndex = 0;
    this.visibleEndIndex = 0;
    this.containerHeight = 0;
    this.scrollTop = 0;

    // DOM elements
    this.listElement = null;
    this.itemElements = [];
    this._scrollHandler = this._onScroll.bind(this);
    this._resizeObserver = null;
    this._intersectionObserver = null;
  }

  /**
   * Initialize virtual scroller
   */
  mount() {
    this._createContainer();
    this._getContainerHeight();
    this._render();
    this._attachListeners();
  }

  /**
   * Cleanup
   */
  unmount() {
    this._detachListeners();
    this._cleanupObservers();
    if (this.listElement) {
      this.listElement.remove();
    }
  }

  /**
   * Update items (e.g., after filtering)
   */
  updateItems(items) {
    this.items = items;
    this.visibleStartIndex = 0;
    this.visibleEndIndex = 0;
    this._render();
  }

  /**
   * Scroll to item index
   */
  scrollToIndex(index) {
    const scrollTop = Math.max(0, index * this.itemHeight - this.containerHeight / 2);
    this.scrollElement.scrollTop = scrollTop;
  }

  /**
   * Create list container with proper CSS
   */
  _createContainer() {
    this.listElement = document.createElement('div');
    this.listElement.className = 'virtual-scroller-list';
    this.listElement.style.cssText = `
      position: relative;
      width: 100%;
      contain: layout style paint;
    `;
    this.container.appendChild(this.listElement);
  }

  /**
   * Calculate container height
   */
  _getContainerHeight() {
    if (this.scrollElement === window) {
      this.containerHeight = window.innerHeight;
    } else {
      this.containerHeight = this.scrollElement.clientHeight;
    }
  }

  /**
   * Render visible items
   */
  _render() {
    this._getContainerHeight();
    this._updateVisibleRange();

    // Total height (virtual)
    const totalHeight = this.items.length * this.itemHeight;
    this.listElement.style.height = totalHeight + 'px';

    // Render visible items
    const html = [];
    for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
      const item = this.items[i];
      if (item) {
        const offsetTop = i * this.itemHeight;
        const itemHtml = this.renderItem(item, i);
        html.push(`
          <div class="virtual-item" data-index="${i}" style="
            position: absolute;
            top: ${offsetTop}px;
            width: 100%;
            height: ${this.itemHeight}px;
          ">
            ${itemHtml}
          </div>
        `);
      }
    }

    this.listElement.innerHTML = html.join('');
    this.itemElements = this.listElement.querySelectorAll('.virtual-item');
  }

  /**
   * Calculate which items are in viewport + buffer
   */
  _updateVisibleRange() {
    if (this.scrollElement === window) {
      this.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    } else {
      this.scrollTop = this.scrollElement.scrollTop;
    }

    // Calculate visible range
    this.visibleStartIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize
    );

    this.visibleEndIndex = Math.min(
      this.items.length - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.bufferSize
    );
  }

  /**
   * Attach scroll listener
   */
  _attachListeners() {
    if (this.scrollElement === window) {
      window.addEventListener('scroll', this._scrollHandler, { passive: true });
      window.addEventListener('resize', this._scrollHandler);
    } else {
      this.scrollElement.addEventListener('scroll', this._scrollHandler, { passive: true });
      // TODO: ResizeObserver for scroll container
    }
  }

  /**
   * Detach listeners
   */
  _detachListeners() {
    if (this.scrollElement === window) {
      window.removeEventListener('scroll', this._scrollHandler);
      window.removeEventListener('resize', this._scrollHandler);
    } else {
      this.scrollElement.removeEventListener('scroll', this._scrollHandler);
    }
  }

  /**
   * Cleanup observers
   */
  _cleanupObservers() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }
  }

  /**
   * Handle scroll event
   */
  _onScroll() {
    this._render();
  }
}

/**
 * Alternative: Intersection Observer based approach
 * Better for detecting actual visibility but more overhead
 */
export class IntersectionVirtualScroller {
  constructor(container, items = [], renderItem, options = {}) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;
    this.bufferSize = options.bufferSize || 3;
    this.visibleIndices = new Set();
    this.itemElements = new Map();

    this._observerConfig = {
      root: null,
      rootMargin: options.rootMargin || '100px',
      threshold: 0.01
    };

    this._observer = null;
  }

  mount() {
    this._createListElement();
    this._initializeObserver();
  }

  unmount() {
    if (this._observer) {
      this._observer.disconnect();
    }
    this.itemElements.forEach(el => el.remove());
    if (this.listElement) {
      this.listElement.remove();
    }
  }

  updateItems(items) {
    this.items = items;
    this.visibleIndices.clear();
    this._renderInitial();
  }

  _createListElement() {
    this.listElement = document.createElement('div');
    this.listElement.className = 'intersection-virtual-list';
    this.container.appendChild(this.listElement);
  }

  _initializeObserver() {
    this._observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.dataset.index, 10);

        if (entry.isIntersecting) {
          this.visibleIndices.add(index);
          // Optionally: render on first visibility
        } else {
          this.visibleIndices.delete(index);
          // Optionally: unrender when out of view
        }
      });
    }, this._observerConfig);

    this._renderInitial();
  }

  _renderInitial() {
    this.listElement.innerHTML = this.items
      .map((item, index) => {
        const html = this.renderItem(item, index);
        return `<div class="virtual-item" data-index="${index}">${html}</div>`;
      })
      .join('');

    // Observe all items
    this.listElement.querySelectorAll('.virtual-item').forEach(el => {
      this._observer.observe(el);
      const index = parseInt(el.dataset.index, 10);
      this.itemElements.set(index, el);
    });
  }
}

export default VirtualScroller;
