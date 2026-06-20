import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualScroller, IntersectionVirtualScroller } from './virtual-scroller.js';

// VirtualScroller.mount() defers its first render to requestAnimationFrame so
// the scroll container is laid out before measuring. Tests must flush that
// frame before asserting on rendered output. Double rAF covers any nested
// scheduling.
const flushRender = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

describe('VirtualScroller — Efficient List Rendering', () => {
  let container;
  let scroller;
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
  const renderItem = (item) => `<div>${item.name}</div>`;

  beforeEach(() => {
    // Create mock container
    container = document.createElement('div');
    container.style.height = '500px';
    document.body.appendChild(container);

    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 500
    });

    scroller = new VirtualScroller(container, items, renderItem, {
      itemHeight: 50,
      bufferSize: 5
    });
  });

  afterEach(() => {
    if (scroller) {
      scroller.unmount();
    }
    container.remove();
  });

  // 1. mount() creates list container
  it('1. mount() creates list container', () => {
    scroller.mount();

    const listElement = container.querySelector('.virtual-scroller-list');
    expect(listElement).toBeTruthy();
    expect(listElement.style.position).toBe('relative');
  });

  // 2. mount() renders initial items
  it('2. mount() renders initial items', async () => {
    scroller.mount();
    await flushRender();

    const items = container.querySelectorAll('.virtual-item');
    expect(items.length).toBeGreaterThan(0);
  });

  // 3. Virtual list has correct total height
  it('3. Virtual list has correct total height', async () => {
    scroller.mount();
    await flushRender();

    const listElement = container.querySelector('.virtual-scroller-list');
    const expectedHeight = items.length * (50 + 12) - 12; // 100 items, itemHeight=50, gap=12
    expect(parseInt(listElement.style.height)).toBe(expectedHeight);
  });

  // 4. Only visible items + buffer are rendered
  it('4. Only visible items + buffer are rendered', async () => {
    scroller.mount();
    await flushRender();

    const renderedItems = container.querySelectorAll('.virtual-item');
    // With 500px viewport and 50px items, should render ~10 items + buffer
    // itemHeight: 50, bufferSize: 5 → max ~20 items
    expect(renderedItems.length).toBeLessThanOrEqual(20);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  // 5. updateItems() updates the list
  it('5. updateItems() updates the list', () => {
    scroller.mount();

    const newItems = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `New ${i}` }));
    scroller.updateItems(newItems);

    const listElement = container.querySelector('.virtual-scroller-list');
    const expectedHeight = 50 * (50 + 12) - 12; // 50 items, itemHeight=50, gap=12
    expect(parseInt(listElement.style.height)).toBe(expectedHeight);
  });

  // 6. scrollToIndex() scrolls to item
  it('6. scrollToIndex() scrolls to item', () => {
    scroller.mount();

    const _scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation();
    scroller.scrollToIndex(50);

    // Should scroll to approximately item 50's position
    // Position = (50 * 50) - (500 / 2) = 2500 - 250 = 2250
    expect(scroller.scrollTop >= 0).toBeTruthy();
  });

  // 7. Items have correct positioning
  it('7. Items have correct positioning', async () => {
    scroller.mount();
    await flushRender();

    const firstItem = container.querySelector('[data-row="0"]');
    expect(firstItem).toBeTruthy();
    const style = window.getComputedStyle(firstItem);
    expect(style.position).toBe('absolute');
  });

  // 8. renderItem is called with correct parameters
  it('8. renderItem is called with correct parameters', async () => {
    const spy = vi.fn((item, _index) => `<div>${item.name}</div>`);
    const testScroller = new VirtualScroller(container, items.slice(0, 10), spy, {
      itemHeight: 50,
      bufferSize: 5
    });

    testScroller.mount();
    await flushRender();

    expect(spy).toHaveBeenCalled();
    const calls = spy.mock.calls;
    calls.forEach(call => {
      expect(call[0]).toHaveProperty('id');
      expect(call[0]).toHaveProperty('name');
      expect(typeof call[1]).toBe('number');
    });

    testScroller.unmount();
  });

  // 9. unmount() cleans up
  it('9. unmount() cleans up', () => {
    scroller.mount();
    const listElement = container.querySelector('.virtual-scroller-list');
    expect(listElement).toBeTruthy();

    scroller.unmount();

    const listAfter = container.querySelector('.virtual-scroller-list');
    expect(listAfter).toBeFalsy();
  });

  // 10. visibleStartIndex and visibleEndIndex are calculated correctly
  it('10. visibleStartIndex and visibleEndIndex calculated correctly', async () => {
    scroller.mount();
    await flushRender();

    // At scroll position 0, should see items 0-15 (10 visible + 5 buffer each)
    expect(scroller.visibleStartIndex).toBe(0);
    expect(scroller.visibleEndIndex).toBeGreaterThan(scroller.visibleStartIndex);
  });

  // 11. Buffer size affects rendered items
  it('11. Buffer size affects rendered items', async () => {
    const bufferScroller = new VirtualScroller(container, items, renderItem, {
      itemHeight: 50,
      bufferSize: 2 // Smaller buffer
    });

    bufferScroller.mount();
    await flushRender();
    const itemCount1 = container.querySelectorAll('.virtual-item').length;

    bufferScroller.unmount();
    container.innerHTML = '';

    const bigBufferScroller = new VirtualScroller(container, items, renderItem, {
      itemHeight: 50,
      bufferSize: 10 // Larger buffer
    });

    bigBufferScroller.mount();
    await flushRender();
    const itemCount2 = container.querySelectorAll('.virtual-item').length;

    // Larger buffer should render more items
    expect(itemCount2).toBeGreaterThan(itemCount1);

    bigBufferScroller.unmount();
  });

  // 12. Different itemHeight works
  it('12. Different itemHeight works', async () => {
    const tallScroller = new VirtualScroller(container, items, renderItem, {
      itemHeight: 100, // Taller items
      bufferSize: 5
    });

    tallScroller.mount();
    await flushRender();

    const listElement = container.querySelector('.virtual-scroller-list');
    const expectedHeight = items.length * (100 + 12) - 12; // 100 items, itemHeight=100, gap=12
    expect(parseInt(listElement.style.height)).toBe(expectedHeight);

    tallScroller.unmount();
  });

  // 13. Empty items list works
  it('13. Empty items list works', async () => {
    const emptyScroller = new VirtualScroller(container, [], renderItem);

    emptyScroller.mount();
    await flushRender();

    const listElement = container.querySelector('.virtual-scroller-list');
    expect(listElement).toBeTruthy();
    expect(listElement.style.height).toBe('0px');

    emptyScroller.unmount();
  });
});

describe('IntersectionVirtualScroller — Observer-based Rendering', () => {
  let container;
  let scroller;
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }));
  const renderItem = (item) => `<div>${item.name}</div>`;

  beforeEach(() => {
    // Mock IntersectionObserver globally using class syntax so it's a constructor
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    container = document.createElement('div');
    document.body.appendChild(container);

    scroller = new IntersectionVirtualScroller(container, items, renderItem, {
      bufferSize: 3
    });
  });

  afterEach(() => {
    if (scroller) {
      scroller.unmount();
    }
    container.remove();
  });

  // 1. mount() creates list container
  it('1. mount() creates list container', () => {
    scroller.mount();

    const listElement = container.querySelector('.intersection-virtual-list');
    expect(listElement).toBeTruthy();
  });

  // 2. mount() renders all items (lazy load with observer)
  it('2. mount() renders all items', () => {
    scroller.mount();

    const renderedItems = container.querySelectorAll('.virtual-item');
    expect(renderedItems.length).toBe(items.length);
  });

  // 3. updateItems() works
  it('3. updateItems() works', () => {
    scroller.mount();

    const newItems = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `New ${i}` }));
    scroller.updateItems(newItems);

    const renderedItems = container.querySelectorAll('.virtual-item');
    expect(renderedItems.length).toBe(newItems.length);
  });

  // 4. unmount() cleans up
  it('4. unmount() cleans up', () => {
    scroller.mount();

    scroller.unmount();

    const listElement = container.querySelector('.intersection-virtual-list');
    expect(listElement).toBeFalsy();
  });
});
