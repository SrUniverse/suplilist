import { describe, it, expect } from 'vitest';
import { todayISO, offsetISO } from './date.js';

describe('todayISO', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the same date as new Date().toISOString().split("T")[0]', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayISO()).toBe(expected);
  });
});

describe('offsetISO', () => {
  it('returns today when offset is 0', () => {
    expect(offsetISO(0)).toBe(todayISO());
  });

  it('returns a date N days in the past', () => {
    const result = offsetISO(1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expectedYesterday = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expectedYesterday);
  });

  it('returns a string matching YYYY-MM-DD format', () => {
    expect(offsetISO(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
