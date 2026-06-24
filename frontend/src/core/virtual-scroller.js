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
   * @param {Object} options - { itemHeight, bufferSize, scrollElement, columns, gap }
   */
  constructor(container, items = [], renderItem, options = {}) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;

    // Options
    this.itemHeight = options.itemHeight || 80;
    this.bufferSize = options.bufferSize || 5;
    this.scrollElement = options.scrollElement || window;
    this.columns = options.columns || 1;  // Grid columns support
    this.gap = options.gap ?? 12;         // Gap between items in px

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
    this._attachListeners();
    this._render();
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
    this._reset();
  }

  /**
   * Scroll to item index
   */
  scrollToIndex(index) {
    const row = Math.floor(index / this.columns);
    const rowHeight = this.itemHeight + this.gap;
    const scrollTop = Math.max(0, row * rowHeight - this.containerHeight / 2);
    if (this.scrollElement === window) {
      window.scrollTo({ top: scrollTop });
    } else {
      this.scrollElement.scrollTop = scrollTop;
    }
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
   * Render visible items — incremental DOM updates only.
   * Existing rows in the viewport are never destroyed, so cached images
   * are never evicted and re-fetched (eliminating the image flash).
   */
  _render() {
    this._getContainerHeight();
    this._updateVisibleRange();

    const cols = this.columns;
    const gap = this.gap;
    const totalRows = Math.ceil(this.items.length / cols);
    const rowHeight = this.itemHeight + gap;

    // Keep virtual height correct so the scrollbar tracks properly
    const totalHeight = totalRows === 0 ? 0 : totalRows * rowHeight - gap;
    this.listElement.style.height = totalHeight + 'px';

    const startRow = this.visibleStartIndex;
    const endRow = this.visibleEndIndex;

    // Index currently-rendered rows by their data-row attribute
    const rendered = new Map();
    for (const el of this.listElement.children) {
      const row = parseInt(el.dataset.row, 10);
      if (!isNaN(row)) rendered.set(row, el);
    }

    // Remove rows that scrolled out of the viewport
    for (const [row, el] of rendered) {
      if (row < startRow || row > endRow) {
        el.remove();
        rendered.delete(row);
      }
    }

    // Add only the rows that aren't in the DOM yet
    for (let row = startRow; row <= endRow; row++) {
      if (rendered.has(row)) continue;

      const offsetTop = row * rowHeight;
      const startItem = row * cols;
      const endItem = Math.min(startItem + cols, this.items.length);

      let rowItems = '';
      for (let i = startItem; i < endItem; i++) {
        const item = this.items[i];
        if (item) {
          rowItems += `<div class="virtual-col" style="flex:1;min-width:0;display:flex;flex-direction:column;">${this.renderItem(item, i)}</div>`;
        }
      }
      // Placeholder columns so flex:1 distributes evenly on partial last rows
      for (let i = endItem; i < startItem + cols; i++) {
        rowItems += `<div class="virtual-col" style="flex:1;min-width:0;" aria-hidden="true"></div>`;
      }

      const rowEl = document.createElement('div');
      rowEl.className = 'virtual-item';
      rowEl.dataset.row = String(row);
      rowEl.style.cssText = `position:absolute;top:${offsetTop}px;left:0;right:0;height:${this.itemHeight}px;display:flex;gap:${gap}px;align-items:stretch;`;
      rowEl.innerHTML = rowItems;
      this.listElement.appendChild(rowEl);
    }

    this.itemElements = this.listElement.querySelectorAll('.virtual-item');
  }

  /**
   * Wipe all rendered rows and re-render from scratch.
   * Called by updateItems() when the data set changes entirely.
   */
  _reset() {
    this.listElement.innerHTML = '';
    this._render();
  }

  /**
   * Calculate which rows are in viewport + buffer.
   * Works in row units when columns > 1.
   * Accounts for the container's offset from the top of the page.
   */
  _updateVisibleRange() {
    // How far into the list the viewport currently shows.
    // For window: scrollIntoList = max(0, -listRect.top)
    // For a scroll container: scrollIntoList = max(0, containerRect.top - listRect.top)
    // The non-window formula correctly accounts for the container's own position
    // in the viewport, which the window formula ignores (containerRect.top = 0).
    let scrollIntoList = 0;
    if (this.listElement) {
      const listRect = this.listElement.getBoundingClientRect();
      if (this.scrollElement === window) {
        scrollIntoList = Math.max(0, -listRect.top);
      } else {
        const containerRect = this.scrollElement.getBoundingClientRect();
        scrollIntoList = Math.max(0, containerRect.top - listRect.top);
      }
    }

    const cols = this.columns;
    const rowHeight = this.itemHeight + this.gap;
    const totalRows = Math.ceil(this.items.length / cols);

    const startRow = Math.max(
      0,
      Math.floor(scrollIntoList / rowHeight) - this.bufferSize
    );
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollIntoList + this.containerHeight) / rowHeight) + this.bufferSize
    );

    this.visibleStartIndex = startRow;
    this.visibleEndIndex = endRow;
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
      // Re-render when the scroll container is resized — critically, this fires
      // when the container transitions from a collapsed 0 height (layout not yet
      // settled at mount, or revealed after being hidden) to its real height,
      // guaranteeing the list paints even if the initial renders ran too early.
      if (typeof ResizeObserver !== 'undefined') {
        this._resizeObserver = new ResizeObserver(() => this._render());
        this._resizeObserver.observe(this.scrollElement);
      }
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
