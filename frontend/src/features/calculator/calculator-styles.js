/**
 * Calculator Page Styles — Extracted CSS
 * Split layout calculator with form, chips, and results
 */

export function injectCalculatorStyles() {
  if (document.getElementById('calcp-styles')) return;

  const style = document.createElement('style');
  style.id = 'calcp-styles';
  style.textContent = `
    /* Root */
    .calcp-root {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px 16px 100px;
      max-width: 1100px;
      margin: 0 auto;
      font-family: 'Inter', sans-serif;
    }

    /* Header */
    .calcp-header { margin-bottom: 4px; }
    .calcp-title {
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 28px;
      color: var(--color-text-primary);
      margin: 0 0 6px;
    }
    .calcp-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
      margin: 0;
    }

    /* Split layout */
    .calcp-split {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    @media (min-width: 768px) {
      .calcp-split {
        grid-template-columns: 380px 1fr;
        align-items: start;
      }
    }

    .calcp-left, .calcp-right {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Card */
    .calcp-card {
      background: var(--color-surface-primary);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 20px;
    }
    .calcp-card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 18px;
    }

    /* Form fields */
    .calcp-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .calcp-field:last-child { margin-bottom: 0; }
    .calcp-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .calcp-optional {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: var(--color-text-muted);
      opacity: .6;
      font-size: 11px;
    }
    .calcp-input, .calcp-select {
      padding: 10px 14px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      color: var(--color-text-primary);
      font-size: 16px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 150ms;
      -webkit-appearance: none;
    }
    .calcp-input:focus, .calcp-select:focus {
      border-color: var(--color-brand);
      box-shadow: 0 0 0 3px var(--color-brand-muted, rgba(139,92,246,.12));
    }
    .calcp-input::placeholder { color: var(--color-text-muted); }
    .calcp-select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239A9A9A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
      cursor: pointer;
    }

    /* Search */
    .calcp-search-wrap {
      position: relative;
      margin-bottom: 12px;
    }
    .calcp-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      pointer-events: none;
    }
    .calcp-search {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px 10px 36px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      color: var(--color-text-primary);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 150ms;
    }
    .calcp-search:focus { border-color: var(--color-brand); }
    .calcp-search::placeholder { color: var(--color-text-muted); }

    /* Supplement chips */
    .calcp-chips {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 320px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;
    }
    .calcp-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: border-color 150ms, background 150ms;
      font-family: 'Inter', sans-serif;
      width: 100%;
    }
    .calcp-chip:hover {
      border-color: var(--color-border-strong);
      background: var(--color-surface-hover);
    }
    .calcp-chip--active {
      border-color: var(--color-brand);
      background: var(--color-brand-muted);
    }
    .calcp-chip-name {
      flex: 1;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .calcp-chip-cat {
      font-size: 11px;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }
    .calcp-ev-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .calcp-ev-badge--a { color: var(--ev-a, #34D399); background: var(--ev-a-bg, rgba(52,211,153,.12)); border-color: var(--ev-a-border, rgba(52,211,153,.25)); }
    .calcp-ev-badge--b { color: var(--ev-b, #FBBF24); background: var(--ev-b-bg, rgba(251,191,36,.12)); border-color: var(--ev-b-border, rgba(251,191,36,.25)); }
    .calcp-ev-badge--c, .calcp-ev-badge--d { color: var(--ev-c, #94A3B8); background: var(--ev-c-bg, rgba(148,163,184,.10)); border-color: var(--ev-c-border, rgba(148,163,184,.20)); }
    .calcp-progress-fill--ev-a { background: var(--ev-a, #34D399); }
    .calcp-progress-fill--ev-b { background: var(--ev-b, #FBBF24); }
    .calcp-progress-fill--ev-c, .calcp-progress-fill--ev-d { background: var(--ev-c, #94A3B8); }
    .calcp-empty-chips {
      font-size: 13px;
      color: var(--color-text-muted);
      text-align: center;
      padding: 20px 0;
      margin: 0;
    }

    /* Result card */
    .calcp-result-card { position: relative; }

    /* Placeholder */
    .calcp-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 320px;
      text-align: center;
      padding: 32px 16px;
    }
    .calcp-placeholder-icon { font-size: 48px; opacity: .3; }
    .calcp-placeholder-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-text-secondary);
      margin: 0;
    }
    .calcp-placeholder-sub {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0;
      max-width: 260px;
      line-height: 1.5;
    }

    /* Result header */
    .calcp-result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 28px;
    }
    .calcp-result-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    /* Phase toggle */
    .calcp-phase-toggle {
      display: flex;
      gap: 4px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 3px;
    }
    .calcp-phase-btn {
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: background 150ms, color 150ms;
    }
    .calcp-phase-btn--active {
      background: var(--color-brand);
      color: #fff;
    }

    /* Big dose display */
    .calcp-dose-display {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .calcp-dose-value {
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 64px;
      line-height: 1;
      color: var(--color-brand);
      letter-spacing: -2px;
    }
    .calcp-dose-unit {
      font-size: 20px;
      font-weight: 600;
      color: var(--color-text-muted);
      font-family: 'Inter', sans-serif;
    }

    /* Validated label */
    .calcp-validated {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ev-a, #34D399);
      margin-bottom: 20px;
    }
    .calcp-validated-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ev-a, #34D399);
      flex-shrink: 0;
    }

    /* Add button */
    .calcp-btn-add {
      width: 100%;
      padding: 13px 20px;
      background: var(--color-brand);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: background 150ms, transform 100ms;
      margin-bottom: 20px;
    }
    .calcp-btn-add:hover { background: var(--color-brand-hover); }
    .calcp-btn-add:active { transform: scale(.98); }
    .calcp-btn-add--in {
      background: var(--ev-a-bg, rgba(52,211,153,.12));
      color: var(--ev-a, #34D399);
      border: 1px solid var(--ev-a-border, rgba(52,211,153,.25));
    }
    .calcp-btn-add--in:hover { background: rgba(52,211,153,.18); }

    /* Separator */
    .calcp-sep {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 0 0 20px;
    }

    /* Scientific card */
    .calcp-sci-card { display: flex; flex-direction: column; gap: 0; }
    .calcp-sci-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 16px;
    }
    .calcp-sci-section { margin-bottom: 16px; }
    .calcp-sci-section:last-child { margin-bottom: 0; }
    .calcp-sci-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: .5px;
      margin: 0 0 6px;
    }
    .calcp-sci-text {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.55;
    }
    .calcp-timing-text {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 0;
      padding: 8px 12px;
      background: var(--color-brand-muted, rgba(139,92,246,0.08));
      border-radius: 8px;
      border: 1px solid var(--color-border-brand, rgba(139,92,246,0.20));
    }

    /* Progress bars */
    .calcp-progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .calcp-progress-bar {
      flex: 1;
      height: 6px;
      background: var(--color-border);
      border-radius: 999px;
      overflow: hidden;
    }
    .calcp-progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 500ms ease;
    }
    .calcp-sci-pct {
      font-size: 12px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      min-width: 44px;
    }

    /* Disclaimer */
    .calcp-disclaimer {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.6;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface-primary);
      margin: 0;
    }

    /* Mobile tweaks */
    @media (max-width: 767px) {
      .calcp-root { padding: 16px 12px 100px; }
      .calcp-title { font-size: 22px; }
      .calcp-dose-value { font-size: 48px; }
      .calcp-chips { max-height: 240px; }
    }
  `;

  document.head.appendChild(style);
}
