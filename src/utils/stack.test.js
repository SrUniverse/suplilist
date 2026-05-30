import { describe, it, expect } from 'vitest';
import { getSupplementId } from './stack.js';

describe('getSupplementId', () => {
  it('returns supplementId when present', () => {
    expect(getSupplementId({ supplementId: 5, id: 5 })).toBe(5);
  });

  it('falls back to id when supplementId is missing', () => {
    expect(getSupplementId({ id: 3 })).toBe(3);
  });

  it('returns null for null input', () => {
    expect(getSupplementId(null)).toBeNull();
  });

  it('returns null when both fields are missing', () => {
    expect(getSupplementId({})).toBeNull();
  });

  it('returns supplementId even when id is also present', () => {
    expect(getSupplementId({ supplementId: 7, id: 99 })).toBe(7);
  });
});
