/**
 * settings-page-styles.js
 *
 * CSS styles for SettingsPage component.
 * Extracted from main component for better maintainability.
 *
 * @module settings-page-styles
 */

export function injectSettingsStyles() {
  if (document.getElementById('settings-page-styles')) return;

  const style = document.createElement('style');
  style.id = 'settings-page-styles';
  style.textContent = `
    .sp-page {
      padding: 24px;
      max-width: 700px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin: 0 auto;
    }

    .sp-header h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--color-text-primary);
      margin: 0 0 6px 0;
    }

    .sp-header p {
      color: var(--color-text-secondary);
      margin: 0;
      font-size: 15px;
    }

    .sp-card {
      background: var(--color-surface-primary);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 24px;
    }

    .sp-section-label {
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      color: var(--color-text-muted);
      margin: 0 0 16px 0;
    }

    /* Toggle rows */
    .sp-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
    }

    .sp-toggle-row:last-of-type {
      border-bottom: none;
    }

    .sp-toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      color: var(--color-text-primary);
    }

    .sp-toggle-icon {
      font-size: 18px;
      line-height: 1;
    }

    /* Switch pill */
    .sp-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .sp-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .sp-switch-track {
      position: absolute;
      inset: 0;
      background: var(--color-surface-secondary);
      border: 1.5px solid var(--color-border-strong);
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .sp-switch input:checked + .sp-switch-track {
      background: var(--color-brand);
      border-color: var(--color-brand);
    }

    .sp-switch-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .sp-switch input:checked + .sp-switch-track::after {
      transform: translateX(20px);
    }

    /* Notif note */
    .sp-notif-note {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 12px 0 0 0;
    }

    /* Privacy highlight box */
    .sp-privacy-box {
      background: var(--color-brand-muted);
      border: 1px solid color-mix(in srgb, var(--color-brand) 30%, transparent);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }

    /* Action rows */
    .sp-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
    }

    .sp-action-row:last-of-type {
      border-bottom: none;
    }

    .sp-action-label {
      font-size: 15px;
      color: var(--color-text-primary);
    }

    /* Buttons */
    .sp-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      background: transparent;
    }

    .sp-btn-outline {
      border: 1.5px solid var(--color-border-strong);
      color: var(--color-text-primary);
    }

    .sp-btn-outline:hover {
      border-color: var(--color-brand);
      color: var(--color-brand);
    }

    .sp-btn-danger {
      border: 1.5px solid var(--color-error);
      color: var(--color-error);
    }

    .sp-btn-danger:hover {
      background: color-mix(in srgb, var(--color-error) 10%, transparent);
    }

    /* About version */
    .sp-version {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0 0 20px 0;
    }

    /* Legal link rows */
    .sp-link-btn {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      margin-bottom: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 15px;
      color: var(--color-text-primary);
      text-align: left;
      transition: border-color 0.15s ease, background 0.15s ease;
      box-sizing: border-box;
    }

    .sp-link-btn:last-child {
      margin-bottom: 0;
    }

    .sp-link-btn:hover {
      border-color: var(--color-brand);
      background: var(--color-surface-secondary);
    }

    .sp-link-arrow {
      color: var(--color-text-muted);
      font-size: 14px;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}
