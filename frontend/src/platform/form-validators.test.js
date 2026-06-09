import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validatePasswordConfirm } from './form-validators.js';

describe('validateEmail', () => {
  it('should return null for valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('should return null for email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBeNull();
  });

  it('should return error for missing @', () => {
    expect(validateEmail('userexample.com')).toBeTruthy();
  });

  it('should return error for missing domain', () => {
    expect(validateEmail('user@')).toBeTruthy();
  });

  it('should return error for empty string', () => {
    expect(validateEmail('')).toBeTruthy();
  });

  it('should return error for null', () => {
    expect(validateEmail(null)).toBeTruthy();
  });

  it('should return error for email with spaces', () => {
    expect(validateEmail('user @example.com')).toBeTruthy();
  });

  it('should trim before checking', () => {
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('should return null for valid strong password', () => {
    expect(validatePassword('Abc123!@#')).toBeNull();
  });

  it('should return error for password shorter than 8 chars', () => {
    expect(validatePassword('Ab1!')).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('should return error for empty password', () => {
    expect(validatePassword('')).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('should return error for null', () => {
    expect(validatePassword(null)).toBe('A senha deve ter pelo menos 8 caracteres.');
  });

  it('should return error if no digit', () => {
    expect(validatePassword('Abcdefg!')).toBe('A senha deve conter pelo menos um número.');
  });

  it('should return error if no special symbol', () => {
    expect(validatePassword('Abcdefg1')).toBe('A senha deve conter pelo menos um símbolo especial.');
  });

  it('should check length first before other rules', () => {
    const err = validatePassword('abc');
    expect(err).toContain('8 caracteres');
  });
});

describe('validatePasswordConfirm', () => {
  it('should return null when passwords match', () => {
    expect(validatePasswordConfirm('Abc123!@', 'Abc123!@')).toBeNull();
  });

  it('should return error when passwords do not match', () => {
    expect(validatePasswordConfirm('Abc123!@', 'Different1!')).toBe('As senhas não coincidem.');
  });

  it('should return error when confirm is empty', () => {
    expect(validatePasswordConfirm('Abc123!@', '')).toBeTruthy();
  });
});
