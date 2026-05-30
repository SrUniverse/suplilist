import { describe, it, expect } from 'vitest';
import { todayISO, offsetISO } from './date.js';

describe('todayISO', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the same date as new Date().toISOString().split("T")[0]', () => {
    const expected = new Date().toISOString().split('T')[0];
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
    expect(result).toBe(yesterday.toISOString().split('T')[0]);
  });

  it('returns a string matching YYYY-MM-DD format', () => {
    expect(offsetISO(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
