import { describe, it, expect } from 'vitest';
import { Skeleton } from './skeleton.js';

describe('Skeleton.box', () => {
  it('renders a div with skeleton class', () => {
    const html = Skeleton.box();
    expect(html).toContain('class="skeleton"');
  });

  it('uses default values', () => {
    const html = Skeleton.box();
    expect(html).toContain('height: 1rem');
    expect(html).toContain('width: 100%');
    expect(html).toContain('border-radius: 4px');
  });

  it('accepts custom height, width, and radius', () => {
    const html = Skeleton.box('2rem', '50px', '8px');
    expect(html).toContain('height: 2rem');
    expect(html).toContain('width: 50px');
    expect(html).toContain('border-radius: 8px');
  });
});

describe('Skeleton.text', () => {
  it('generates 3 lines by default', () => {
    const html = Skeleton.text();
    const count = (html.match(/skeleton-text/g) || []).length;
    expect(count).toBe(3);
  });

  it('generates the specified number of lines', () => {
    const html = Skeleton.text(5);
    const count = (html.match(/skeleton-text/g) || []).length;
    expect(count).toBe(5);
  });

  it('last line is shorter (70%) than others (100%)', () => {
    const html = Skeleton.text(2);
    expect(html).toContain('width: 70%');
    expect(html).toContain('width: 100%');
  });

  it('single line is 70% wide', () => {
    const html = Skeleton.text(1);
    expect(html).toContain('width: 70%');
    expect(html).not.toContain('width: 100%');
  });
});

describe('Skeleton.supplementCard', () => {
  it('returns non-empty HTML', () => {
    const html = Skeleton.supplementCard();
    expect(html.trim().length).toBeGreaterThan(0);
  });

  it('contains skeleton class', () => {
    expect(Skeleton.supplementCard()).toContain('skeleton');
  });

  it('contains skeleton-card class', () => {
    expect(Skeleton.supplementCard()).toContain('skeleton-card');
  });
});

describe('Skeleton.historyCard', () => {
  it('returns non-empty HTML', () => {
    const html = Skeleton.historyCard();
    expect(html.trim().length).toBeGreaterThan(0);
  });

  it('contains skeleton-card class', () => {
    expect(Skeleton.historyCard()).toContain('skeleton-card');
  });
});
