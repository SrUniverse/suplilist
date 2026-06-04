import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape.js';

describe('escapeHtml', () => {
  it('escapes & < > " and single quotes', () => {
    expect(escapeHtml('<b>hello & "world"</b>')).toBe(
      '&lt;b&gt;hello &amp; &quot;world&quot;&lt;/b&gt;'
    );
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it('returns empty string for non-string input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('');
  });

  it('returns unchanged string when no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
