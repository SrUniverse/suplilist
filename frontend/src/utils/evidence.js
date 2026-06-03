/**
 * Canonical evidence-level badge system.
 * Replaces independent badge implementations in 4 page files.
 * Color values and HTML format match the existing my-stack-page.js implementation.
 */
export const EVIDENCE_COLORS = {
  A: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', label: 'Evidência A' },
  B: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Evidência B' },
  C: { bg: 'rgba(163,163,163,0.12)', color: '#9A9A9A', label: 'Evidência C' },
};

/**
 * Renders an inline evidence badge HTML string.
 * @param {'A'|'B'|'C'} level
 * @returns {string} HTML <span> string
 */
export function renderEvidenceBadge(level) {
  const s = EVIDENCE_COLORS[level] ?? EVIDENCE_COLORS['C'];
  return `<span style="background:${s.bg};color:${s.color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px;">${s.label}</span>`;
}
