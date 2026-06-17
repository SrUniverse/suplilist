import { describe, it, expect } from 'vitest';
import { SUPPORT_EMAIL, buildSupportMailto, buildSupportWhatsApp } from './support.js';

describe('SUPPORT_EMAIL', () => {
  it('is a valid email address', () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe('buildSupportMailto', () => {
  it('builds mailto link with subject', () => {
    const link = buildSupportMailto('Suporte Premium');
    expect(link).toContain('mailto:');
    expect(link).toContain(SUPPORT_EMAIL);
    expect(link).toContain('subject=');
  });

  it('includes body when provided', () => {
    const link = buildSupportMailto('Assunto', 'Corpo da mensagem');
    expect(link).toContain('body=');
  });

  it('returns plain mailto when subject and body are empty', () => {
    const link = buildSupportMailto('', '');
    expect(link).toBe(`mailto:${SUPPORT_EMAIL}`);
  });

  it('URL-encodes special characters', () => {
    const link = buildSupportMailto('Olá & Obrigado');
    expect(link).not.toContain(' ');
    expect(link).toContain('subject=');
  });
});

describe('buildSupportWhatsApp', () => {
  it('returns null when SUPPORT_WHATSAPP is empty', () => {
    const result = buildSupportWhatsApp('Olá!');
    expect(result).toBeNull();
  });

  it('returns null with no args when unconfigured', () => {
    expect(buildSupportWhatsApp()).toBeNull();
  });
});
