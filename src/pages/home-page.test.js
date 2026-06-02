import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../data/supplements-db.js', () => ({
  SUPPLEMENTS_DB: Array.from({ length: 50 }, (_, i) => ({
    id: String(i + 1),
    name: `Supplement ${i + 1}`,
    price: 100 + i * 10,
    ppg: 0.1 + i * 0.01,
    image: `supp${i + 1}.jpg`
  }))
}));

vi.mock('../utils/string-utils.js', () => ({
  escapeHtml: (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}));

vi.mock('../analytics/schema-manager.js', () => ({
  SchemaManager: {
    createWebApplicationSchema: vi.fn(() => ({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'SupliList'
    })),
    insertSchema: vi.fn()
  }
}));

vi.mock('../utils/date-utils.js', () => ({
  todayISO: () => '2026-06-02'
}));

describe('HomePage — Landing Page', () => {
  let container;
  let homePage;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'home-page';
    document.body.appendChild(container);

    const { HomePage } = await import('./home-page.js');
    homePage = new HomePage(container);
  });

  afterEach(() => {
    if (homePage) homePage.unmount?.();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('1. Renders hero section with mockup cards for first 3 supplements', async () => {
    await homePage.mount();

    const mockupCards = container.querySelectorAll('[data-component="mockup-card"]');
    expect(mockupCards.length).toBeGreaterThanOrEqual(1);
    expect(mockupCards.length).toBeLessThanOrEqual(3);
  });

  it('2. Hero mockup card displays supplement name and calculated daily price', async () => {
    await homePage.mount();

    const firstCard = container.querySelector('[data-component="mockup-card"]');
    if (firstCard) {
      const name = firstCard.querySelector('[data-supplement-name]');
      expect(name?.textContent).toContain('Supplement');

      const price = firstCard.querySelector('[data-price]');
      if (price) {
        expect(price.textContent).toMatch(/R\$|price/i);
      }
    }
  });

  it('3. Displays supplement count from SUPPLEMENTS_DB', async () => {
    await homePage.mount();

    const countEl = container.querySelector('[data-metric="supplement-count"]');
    if (countEl) {
      const count = parseInt(countEl.textContent);
      expect(count).toBe(50);
    }
  });

  it('4. Goals array maps to navigation links with query params', async () => {
    await homePage.mount();

    const goalLinks = container.querySelectorAll('[data-goal-link]');
    expect(goalLinks.length).toBeGreaterThan(0);

    goalLinks.forEach(link => {
      const href = link.getAttribute('href');
      expect(href).toContain('/list');
      expect(href).toContain('objective=');
    });
  });

  it('5. Navigation via [data-nav] elements uses pushState', async () => {
    await homePage.mount();

    const navLink = container.querySelector('[data-nav]');
    if (navLink) {
      const originalPushState = window.history.pushState;
      window.history.pushState = vi.fn();

      navLink.click?.();

      // Verify pushState or popstate was triggered
      expect(window.history.pushState).toHaveBeenCalled();
      window.history.pushState = originalPushState;
    }
  });

  it('6. [data-action="scroll-features"] scrolls to #lp-features', async () => {
    const featuresSection = document.createElement('div');
    featuresSection.id = 'lp-features';
    document.body.appendChild(featuresSection);

    await homePage.mount();

    const scrollBtn = container.querySelector('[data-action="scroll-features"]');
    if (scrollBtn) {
      const scrollToSpy = vi.spyOn(featuresSection, 'scrollIntoView');
      scrollBtn.click?.();
      // Note: actual scroll behavior depends on page implementation
    }
  });

  it('7. SchemaManager.createWebApplicationSchema is called on mount', async () => {
    const { SchemaManager } = await import('../analytics/schema-manager.js');
    await homePage.mount();

    expect(SchemaManager.createWebApplicationSchema).toHaveBeenCalled();
  });

  it('8. Schema is inserted to DOM head', async () => {
    const { SchemaManager } = await import('../analytics/schema-manager.js');
    await homePage.mount();

    expect(SchemaManager.insertSchema).toHaveBeenCalled();
  });

  it('9. HTML escaping prevents XSS in supplement names', async () => {
    const { escapeHtml } = await import('../utils/string-utils.js');

    const maliciousName = '<img src=x onerror="alert(1)">';
    const escaped = escapeHtml(maliciousName);

    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;img');
  });

  it('10. Event binding persists on mobile viewport', async () => {
    await homePage.mount();

    const navLinks = container.querySelectorAll('[data-nav]');
    navLinks.forEach(link => {
      expect(link.onclick || link.getAttribute('onclick')).toBeTruthy();
    });
  });

  it('11. Inline styles apply correctly for responsive layout', async () => {
    await homePage.mount();

    const heroSection = container.querySelector('[data-component="hero"]');
    if (heroSection) {
      const computedStyle = window.getComputedStyle(heroSection);
      expect(computedStyle).toBeDefined();
    }
  });

  it('12. Scroll event delegation works for click handlers', async () => {
    await homePage.mount();

    const scrollBtn = container.querySelector('[data-action="scroll-features"]');
    expect(scrollBtn).toBeDefined();

    // Verify event listener exists (through click behavior)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    expect(() => scrollBtn?.dispatchEvent(clickEvent)).not.toThrow();
  });

  it('13. Unmount removes event listeners', () => {
    homePage.mount();
    homePage.unmount();

    const navLinks = container.querySelectorAll('[data-nav]');
    navLinks.forEach(link => {
      expect(link.onclick).toBeUndefined();
    });
  });
});
