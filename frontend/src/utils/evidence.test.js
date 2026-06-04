import { describe, it, expect } from 'vitest';
import { EVIDENCE_COLORS, renderEvidenceBadge } from './evidence.js';

describe('EVIDENCE_COLORS', () => {
  it('defines A, B, and C levels', () => {
    expect(EVIDENCE_COLORS.A).toBeDefined();
    expect(EVIDENCE_COLORS.B).toBeDefined();
    expect(EVIDENCE_COLORS.C).toBeDefined();
  });

  it('each level has bg, color, and label', () => {
    for (const key of ['A', 'B', 'C']) {
      expect(EVIDENCE_COLORS[key].bg).toBeTruthy();
      expect(EVIDENCE_COLORS[key].color).toBeTruthy();
      expect(EVIDENCE_COLORS[key].label).toBeTruthy();
    }
  });
});

describe('renderEvidenceBadge', () => {
  it('returns an HTML span string', () => {
    const html = renderEvidenceBadge('A');
    expect(html).toContain('<span');
    expect(html).toContain('Evidência A');
  });

  it('falls back to C for unknown level', () => {
    const html = renderEvidenceBadge('Z');
    expect(html).toContain('Evidência C');
  });

  it('applies correct color for each level', () => {
    expect(renderEvidenceBadge('A')).toContain(EVIDENCE_COLORS.A.color);
    expect(renderEvidenceBadge('B')).toContain(EVIDENCE_COLORS.B.color);
    expect(renderEvidenceBadge('C')).toContain(EVIDENCE_COLORS.C.color);
  });
});
