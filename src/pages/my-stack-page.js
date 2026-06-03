/**
 * MyStackPage — SupliList
 * My Stack: full visual rebuild with metrics, list, add modal, replenishment sidebar
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { todayISO, offsetISO } from '../utils/date.js';
import { renderEvidenceBadge } from '../utils/evidence.js';
import { getSupplementId } from '../utils/stack.js';
import { escapeHtml } from '../utils/escape.js';
import affiliateEngine from '../monetization/affiliate-engine.js';
import ShareService from '../features/sharing/share-service.js';
import QRGenerator from '../features/sharing/qr-generator.js';


// Prices loaded lazily from /data/prices.json
let PRICES_DB = null;
async function fetchPrices() {
  if (PRICES_DB) return PRICES_DB;
  try {
    const res = await fetch('/data/prices.json');
    PRICES_DB = await res.json();
  } catch (_) {
    PRICES_DB = {};
  }
  return PRICES_DB;
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function formatBRL(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function calcMonthlyInvestment(stack) {
  return stack.reduce((acc, item) => {
    const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
    const ppg = dbEntry?.pricePerGram ?? 0;
    const dosage = parseFloat(item.dosage) || 0;
    const unit = (item.unit || 'g').toLowerCase();
    let dosageInGrams;
    if (unit === 'g')         dosageInGrams = dosage;
    else if (unit === 'mg')   dosageInGrams = dosage / 1000;
    else if (unit === 'mcg')  dosageInGrams = dosage / 1_000_000;
    else return acc; // UI, cápsulas, bi UFC etc. — skip
    return acc + dosageInGrams * ppg * 30;
  }, 0);
}

function calcAdherenceRate(stack) {
  if (!stack.length) return '0%';
  const checkins = stateManager.checkins ?? [];
  const stackIds = new Set(stack.map(item => item.supplementId ?? item.id));
  let completeDays = 0;
  for (let i = 0; i < 7; i++) {
    const day = offsetISO(i);
    const dayIds = new Set(checkins.filter(c => c.date === day).map(c => c.supplementId));
    const allChecked = [...stackIds].every(id => dayIds.has(id));
    if (allChecked) completeDays++;
  }
  return Math.round((completeDays / 7) * 100) + '%';
}

function getSupplementImage(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
  if (dbEntry?.image) return dbEntry.image;
  const slug = (item.name ?? '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `/assets/${slug}.png`;
}

function getEvidenceLevel(item) {
  const dbEntry = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
  return dbEntry?.evidenceLevel ?? 'C';
}

function calcDaysLeft(item) {
  const qty = parseFloat(item.quantity);
  const dosage = parseFloat(item.dosage);
  if (!qty || !dosage || dosage <= 0) return null;
  return Math.max(0, Math.floor(qty / dosage));
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLES = `
  /* Layout */
  .msp-wrap {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 16px 120px;
    max-width: 960px;
    margin: 0 auto;
  }

  /* Header */
  .msp-header-title {
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    font-weight: 800;
    font-size: 28px;
    color: var(--color-text-primary);
    margin: 0 0 4px;
  }
  .msp-header-sub {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Stat cards */
  .msp-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 360px) {
    .msp-stats { grid-template-columns: 1fr; }
  }
  .msp-stat-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .msp-stat-icon {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: var(--color-brand-muted);
    color: var(--color-brand);
    flex-shrink: 0;
    margin-bottom: 2px;
  }
  .msp-stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-stat-sub {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .msp-stat-value {
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .msp-stat-value.brand { color: var(--color-brand); }
  .msp-stat-icon--ev { background: var(--ev-a-bg, rgba(52,211,153,0.12)); color: var(--ev-a, #34D399); }
  .msp-stat-icon--adherence { background: var(--ev-b-bg, rgba(251,191,36,0.12)); color: var(--ev-b, #FBBF24); }

  /* Desktop: two-column layout for list + sidebar */
  .msp-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 768px) {
    .msp-body { grid-template-columns: 1fr; }
  }

  /* Section header */
  .msp-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .msp-section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-btn-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-add:hover { background: var(--color-brand-hover); }

  .msp-btn-share {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: transparent;
    border: 1.5px solid var(--color-border-strong);
    color: var(--color-text-primary);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
  }
  .msp-btn-share:hover {
    border-color: var(--color-brand);
    color: var(--color-brand);
    background: var(--color-surface-hover);
  }


  /* Stack list */
  .msp-list { display: flex; flex-direction: column; gap: 10px; }

  /* Empty state */
  .msp-empty {
    text-align: center;
    padding: 56px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: var(--color-surface-primary);
    border: 1px dashed var(--color-border-strong);
    border-radius: 16px;
  }
  .msp-empty-icon { font-size: 52px; margin-bottom: 4px; }
  .msp-empty-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .msp-empty-desc { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
  .msp-empty-cta {
    margin-top: 10px;
    padding: 11px 24px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-empty-cta:hover { background: var(--color-brand-hover); }

  /* Stack item card */
  .msp-item {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 200ms;
  }
  .msp-item:hover { border-color: var(--color-border-strong); }
  .msp-item-top {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px 10px;
  }
  .msp-item-img {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    object-fit: contain;
    background: var(--color-surface-secondary, #191D25);
    flex-shrink: 0;
    padding: 4px;
  }
  .msp-item-info { flex: 1; min-width: 0; }
  .msp-item-cat {
    font-size: 10px; font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 3px;
  }
  .msp-item-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-item-dosage {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin: 0 0 2px;
  }
  .msp-item-days {
    font-size: 11px;
    color: var(--color-brand);
    font-weight: 600;
    margin: 0;
  }
  .msp-item-stock {
    font-size: 11px;
    color: var(--color-text-muted);
    margin: 0;
  }
  .msp-item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .msp-item-actions {
    display: flex;
    gap: 4px;
  }
  .msp-item-footer {
    display: flex;
    gap: 8px;
    padding: 0 16px 14px;
  }
  .msp-btn-pause {
    flex: 1; padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--color-border-strong);
    background: transparent; color: var(--color-text-secondary);
    font-family: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 150ms;
  }
  .msp-btn-pause:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
  .msp-btn-finish {
    flex: 1; padding: 8px;
    border-radius: 8px;
    border: none;
    background: var(--color-brand); color: #fff;
    font-family: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 150ms;
  }
  .msp-btn-finish:hover { background: var(--color-brand-hover); }
  .msp-btn-icon {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    transition: background 150ms;
    color: var(--color-text-secondary);
  }
  .msp-btn-icon:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
  .msp-btn-icon.del:hover { background: var(--color-error-bg); color: var(--color-error); }
  .msp-btn-reorder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 8px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .msp-btn-reorder:hover {
    background: var(--color-surface-hover);
  }

  /* Inline edit form */
  .msp-inline-edit {
    padding: 14px 16px;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .msp-inline-edit-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: .4px;
    margin: 0;
  }
  .msp-inline-row { display: flex; gap: 8px; align-items: flex-end; }
  .msp-inline-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .msp-inline-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-input {
    width: 100%;
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 150ms;
  }
  .msp-input:focus { border-color: var(--color-brand); }
  .msp-input::placeholder { color: var(--color-text-muted); }
  .msp-select {
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 150ms;
  }
  .msp-select:focus { border-color: var(--color-brand); }
  .msp-inline-btns { display: flex; gap: 8px; justify-content: flex-end; }
  .msp-btn-save {
    padding: 9px 20px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-save:hover { background: var(--color-brand-hover); }
  .msp-btn-cancel {
    padding: 9px 16px;
    background: none;
    border: 1px solid var(--color-border-strong);
    border-radius: 10px;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms;
  }
  .msp-btn-cancel:hover { border-color: var(--color-brand); color: var(--color-text-primary); }

  /* Add supplement modal overlay */
  .msp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.7);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    backdrop-filter: blur(4px);
    animation: msp-fadein 180ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal-overlay { align-items: center; padding: 24px; }
  }
  @keyframes msp-fadein { from { opacity:0 } to { opacity:1 } }
  .msp-modal {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border-strong);
    border-radius: 20px 20px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: msp-slideup 220ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal { border-radius: 20px; padding: 28px 24px 28px; }
  }
  @keyframes msp-slideup { from { transform:translateY(40px); opacity:0 } to { transform:translateY(0); opacity:1 } }
  .msp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .msp-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-modal-close {
    background: var(--color-surface-secondary);
    border: none;
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .msp-modal-close:hover { color: var(--color-text-primary); }
  .msp-modal-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
  .msp-modal-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-modal-row { display: flex; gap: 8px; }
  .msp-modal-row .msp-input { flex: 1; }

  /* Search results in modal */
  .msp-search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 10;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,.5);
    max-height: 220px;
    overflow-y: auto;
  }
  .msp-result-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background 100ms;
  }
  .msp-result-btn:hover { background: var(--color-surface-hover); }
  .msp-result-img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: contain;
    background: var(--color-surface-primary);
    flex-shrink: 0;
  }
  .msp-result-info { display: flex; flex-direction: column; gap: 2px; }
  .msp-result-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
  .msp-result-cat { font-size: 11px; color: var(--color-text-muted); }
  .msp-modal-submit {
    padding: 12px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
    margin-top: 4px;
  }
  .msp-modal-submit:hover { background: var(--color-brand-hover); }

  /* Replenishment sidebar */
  .msp-sidebar-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px 16px;
  }
  .msp-sidebar-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .msp-replen-list { display: flex; flex-direction: column; gap: 12px; }
  .msp-replen-item { display: flex; flex-direction: column; gap: 4px; }
  .msp-replen-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-replen-price {
    font-size: 12px;
    color: var(--color-savings, #22C55E);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .msp-replen-market {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .msp-replen-empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 16px 0;
  }
  .msp-replen-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0;
  }
`;

/**
 * MyStackPage — User's supplement stack management
 *
 * Shows:
 * - Header: title + subtitle (count, monthly cost)
 * - Stat cards: count, monthly investment, 7-day adherence rate
 * - Left column: list of supplements in stack with quantity/dosage controls
 * - Right sidebar: replenishment suggestions + best prices per supplement
 * - Add modal: search + select supplement to add to stack
 * - Share modal: generate shareable link + QR code
 *
 * Integrates with StateManager (stack mutations), SUPPLEMENTS_DB (lookups),
 * ShareService (social sharing), and live pricing from prices.json.
 */
export class MyStackPage {
  /**
   * Create a new MyStackPage
   * @param {HTMLElement} container - DOM element to mount the page
   */
  constructor(container) {
    this.container = container;
    this._unsub = null;
    this._editId = null;
    this._modalOpen = false;
    this._prices = null;
    this._docClickHandler = null;
    this.shareService = new ShareService();
    this.qrGenerator = new QRGenerator();
  }

  /**
   * Mount the page to the DOM and initialize all subscriptions.
   *
   * Injects CSS, renders main scaffold, fetches live pricing async,
   * subscribes to stack state changes, attaches event listeners.
   * Uses _isMounted flag to abort renders if unmounted before async completes.
   *
   * @returns {void}
   */
  mount() {
    this._isMounted = true; // L4 FIX: flag de montagem ativa
    this._attachStyles();
    this._render();
    fetchPrices().then(prices => {
      if (!this._isMounted) return; // L4 FIX: abortar render se desmontado
      this._prices = prices;
      this._renderReplenishment();
    });

    this._unsub = stateManager.subscribe((state, action) => {
      if (!this._isMounted) return; // L4 FIX: abortar se desmontado
      const relevant = ['ADD_TO_STACK', 'REMOVE_FROM_STACK', 'UPDATE_STACK_ITEM', 'SET_STACK_QUANTITY', 'ADD_CHECKIN'];
      if (!action || relevant.includes(action.type)) {
        this._renderAll();
      }
    });
  }

  /**
   * Unmount the page and clean up all resources.
   *
   * Stops state subscription, removes event listeners, closes modal,
   * and sets _isMounted flag to prevent async renders after unmount.
   * Safe to call multiple times.
   *
   * @returns {void}
   */
  unmount() {
    this._isMounted = false; // L4 FIX: flag de montagem inativa
    if (this._docClickHandler) {
      document.removeEventListener('click', this._docClickHandler);
      this._docClickHandler = null;
    }
    this._unsub?.();
    this._closeModal();
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

  /**
   * Inject CSS styles for MyStackPage into <head> (idempotent).
   *
   * Creates <style id="msp2-styles"> with all component styles (layout, cards,
   * list, sidebar, buttons, modals). Skips if already injected.
   *
   * @returns {void}
   * @private
   */
  _attachStyles() {
    if (document.getElementById('msp2-styles')) return;
    const style = document.createElement('style');
    style.id = 'msp2-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  /**
   * Render the complete MyStackPage DOM scaffold into the container.
   *
   * Builds HTML structure with:
   * - Header: title + subtitle (#msp-subtitle)
   * - Stat cards: count, monthly cost, adherence (#msp-stats)
   * - Left column: section header + list (#msp-list) + Share/Add buttons
   * - Right sidebar: replenishment card (#msp-replenishment)
   *
   * Then calls _renderAll() to populate dynamic sections and _attachDelegatedListeners()
   * for event delegation. Direct listeners attached to Share and Add buttons.
   *
   * @returns {void}
   * @private
   */
  _render() {
    this.container.innerHTML = `
      <div class="msp-wrap">
        <!-- Header -->
        <div>
          <h1 class="msp-header-title">📦 Meu Stack</h1>
          <p class="msp-header-sub" id="msp-subtitle">Carregando...</p>
        </div>

        <!-- Stat cards -->
        <div class="msp-stats" id="msp-stats"></div>

        <!-- Body: list + sidebar -->
        <div class="msp-body">
          <!-- Left: stack list -->
          <div>
            <div class="msp-section-header">
              <h2 class="msp-section-title">Suplementos Ativos</h2>
              <div style="display: flex; gap: 8px;">
                <button class="msp-btn-share" id="msp-share-stack">
                  <span>🔗</span> Compartilhar
                </button>
                <button class="msp-btn-add" id="msp-open-modal">
                  <span>+</span> Adicionar Suplemento
                </button>
              </div>
            </div>
            <div class="msp-list" id="msp-list"></div>
          </div>

          <!-- Right: replenishment sidebar -->
          <aside>
            <div class="msp-sidebar-card">
              <h3 class="msp-sidebar-title">🛒 Reposição &amp; Arbitragem</h3>
              <div id="msp-replenishment" class="msp-replen-list">
                <p class="msp-replen-empty">Carregando preços...</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this._renderAll();
    this._attachDelegatedListeners();

    this.container.querySelector('#msp-open-modal')?.addEventListener('click', () => this._openModal());
    this.container.querySelector('#msp-share-stack')?.addEventListener('click', () => this._openShareModal());
  }

  // ─── Render all dynamic sections ──────────────────────────────────────────

  /**
   * Re-render all dynamic sections (title, stats, list, replenishment).
   *
   * Called after state mutations (ADD_TO_STACK, REMOVE_FROM_STACK, etc.).
   * Skips replenishment if prices not loaded yet.
   *
   * @returns {void}
   * @private
   */
  _renderAll() {
    this._renderSubtitle();
    this._renderStats();
    this._renderList();
    if (this._prices) this._renderReplenishment();
  }

  /**
   * Update subtitle with stack count and monthly investment estimate.
   *
   * Displays: "{count} suplemento(s) ativo(s) · R$ XX,XX/mês estimado"
   * Recalculates monthly cost using calcMonthlyInvestment() each render.
   *
   * @returns {void}
   * @private
   */
  _renderSubtitle() {
    const stack = stateManager.stack ?? [];
    const total = calcMonthlyInvestment(stack);
    const el = this.container.querySelector('#msp-subtitle');
    if (!el) return;
    el.textContent = `${stack.length} suplemento${stack.length !== 1 ? 's' : ''} ativo${stack.length !== 1 ? 's' : ''} · ${formatBRL(total)}/mês estimado`;
  }

  /**
   * Render stat cards: supplement count, monthly investment, 7-day adherence.
   *
   * Updates three stat boxes (#msp-stats) with:
   * - Count: number of items in stack
   * - Investment: estimated monthly cost using calcMonthlyInvestment()
   * - Adherence: 7-day completion rate from checkins using calcAdherenceRate()
   *
   * Each card has icon, label, value, and optional sub-label.
   *
   * @returns {void}
   * @private
   */
  _renderStats() {
    const el = this.container.querySelector('#msp-stats');
    if (!el) return;
    const stack = stateManager.stack ?? [];
    const monthly = calcMonthlyInvestment(stack);
    const adherence = calcAdherenceRate(stack);

    el.innerHTML = `
      <div class="msp-stat-card">
        <div class="msp-stat-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <span class="msp-stat-label">Investimento Mensal</span>
        <span class="msp-stat-value brand">${formatBRL(monthly)}</span>
        <span class="msp-stat-sub">Estimado por stack atual</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon msp-stat-icon--ev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <span class="msp-stat-label">Ciclos Ativos</span>
        <span class="msp-stat-value">${stack.length}</span>
        <span class="msp-stat-sub">${stack.length > 0 ? stack.length + ' suplemento' + (stack.length !== 1 ? 's' : '') + ' no protocolo' : 'Nenhum ativo'}</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon msp-stat-icon--adherence">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span class="msp-stat-label">Taxa de Adesão</span>
        <span class="msp-stat-value">${adherence}</span>
        <span class="msp-stat-sub">Últimos 7 dias</span>
      </div>
    `;
  }

  /**
   * Render the supplement list with inline edit controls and quick actions.
   *
   * For each item in stack:
   * - Shows image, name, category, dosage, days left
   * - Evidence badge (graded A-D)
   * - Inline edit mode for quantity (toggle w/ pencil button)
   * - Favorite toggle (heart icon)
   * - Quick delete button (trash icon)
   * - Affiliate links to Shopee/Amazon/Mercado Livre
   *
   * If stack empty, shows empty state with CTA to "Explorar Catálogo".
   *
   * Events delegated via _attachDelegatedListeners() for edit/delete/favorite.
   *
   * @returns {void}
   * @private
   */
  _renderList() {
    const list = this.container.querySelector('#msp-list');
    if (!list) return;
    const stack = stateManager.stack ?? [];

    if (!stack.length) {
      list.innerHTML = `
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p class="msp-empty-title">Seu stack está vazio</p>
          <p class="msp-empty-desc">Adicione os suplementos que você está tomando para acompanhar seu protocolo.</p>
          <button class="msp-empty-cta" id="msp-empty-cta">Explorar Catálogo →</button>
        </div>
      `;
      this.container.querySelector('#msp-empty-cta')?.addEventListener('click', () => this._openModal());
      return;
    }

    list.innerHTML = '';
    stack.forEach(item => {
      const itemId = getSupplementId(item);
      const daysLeft = calcDaysLeft(item);
      const imgSrc = getSupplementImage(item);
      const badge = renderEvidenceBadge(getEvidenceLevel(item));

      const el = document.createElement('div');
      el.className = 'msp-item';
      el.dataset.itemId = itemId;
      const dbEntry = SUPPLEMENTS_DB.find(s => s.id === itemId);
      const category = dbEntry?.category ?? '';
      const desc = dbEntry?.benefits?.[0] ?? '';
      const affLinks = affiliateEngine.getLinks(item.name);

      el.innerHTML = `
        <div class="msp-item-top">
          <img class="msp-item-img"
            src="${imgSrc}"
            alt="${item.name}"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'72\\' height=\\'72\\'%3E%3Crect width=\\'72\\' height=\\'72\\' rx=\\'12\\' fill=\\'%23161616\\'/%3E%3Ctext x=\\'50%25\\' y=\\'55%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'28\\' fill=\\'%23555555\\'%3E💊%3C/text%3E%3C/svg%3E'">
          <div class="msp-item-info">
            ${category ? `<p class="msp-item-cat">${category}</p>` : ''}
            <p class="msp-item-name">${escapeHtml(item.name)}</p>
            <p class="msp-item-dosage">${item.dosage ?? '—'} ${escapeHtml(item.unit ?? 'g')}/dia</p>
            ${daysLeft !== null ? `<p class="msp-item-days">~${daysLeft} dias restantes</p>` : ''}
          </div>
          <div class="msp-item-right">
            ${badge}
            <div class="msp-item-actions">
              <button class="msp-btn-icon" data-action="edit" data-id="${itemId}" aria-label="Editar ${escapeHtml(item.name)}" title="Editar">✏️</button>
              <button class="msp-btn-icon del" data-action="remove" data-id="${itemId}" aria-label="Remover ${escapeHtml(item.name)}" title="Remover">🗑️</button>
              <a class="msp-btn-reorder"
                 href="${affLinks.amazon}"
                 target="_blank"
                 rel="noopener noreferrer"
                 data-aff-id="${escapeHtml(itemId)}"
                 data-aff-mp="amazon"
                 title="Recomprar na Amazon"
                 aria-label="Recomprar ${escapeHtml(item.name)} na Amazon">🛒 Recomprar</a>
            </div>
          </div>
        </div>
        ${desc ? `<div style="padding:0 16px 8px;font-size:12px;color:var(--color-text-secondary);line-height:1.5;">${desc}</div>` : ''}
        <div class="msp-item-footer">
          <button class="msp-btn-pause" data-action="edit" data-id="${itemId}">Editar</button>
          <button class="msp-btn-finish" data-action="remove" data-id="${itemId}">Remover</button>
        </div>
      `;

      // Inline edit placeholder — inserted after card when editing
      const editWrap = document.createElement('div');
      editWrap.id = `msp-edit-${itemId}`;
      editWrap.style.display = 'none';

      list.appendChild(el);
      list.appendChild(editWrap);
    });
  }

  /**
   * Render sidebar with replenishment suggestions and best prices per supplement.
   *
   * Filters stack items to those with live pricing data.
   * For each item, finds cheapest market and displays:
   * - Item name
   * - Best price (lowest among Shopee/Amazon/Mercado Livre)
   * - Market name (store that has the best price)
   * - Divider between items
   *
   * Falls back to empty state if no pricing data available.
   * Sidebar updates only when this._prices is loaded (async from prices.json).
   *
   * @returns {void}
   * @private
   */
  _renderReplenishment() {
    const el = this.container.querySelector('#msp-replenishment');
    if (!el) return;
    const stack = stateManager.stack ?? [];
    const prices = this._prices ?? {};

    const withPrices = stack.filter(item => {
      const id = getSupplementId(item);
      const markets = prices[id];
      // Ensure at least one market entry exists (guards against empty {} crash in reduce)
      return markets && Object.keys(markets).length > 0;
    });

    if (!withPrices.length) {
      el.innerHTML = `<p class="msp-replen-empty">Nenhum preço disponível para os itens do seu stack.</p>`;
      return;
    }

    el.innerHTML = withPrices.map((item, idx) => {
      const id = getSupplementId(item);
      const markets = prices[id] ?? {};
      const entries = Object.values(markets);
      const best = entries.reduce((a, b) => (a.price < b.price ? a : b), entries[0]);
      const divider = idx < withPrices.length - 1
        ? `<hr class="msp-replen-divider">`
        : '';
      return `
        <div class="msp-replen-item">
          <span class="msp-replen-name">${escapeHtml(item.name)}</span>
          <span class="msp-replen-price">Melhor: ${formatBRL(best.price)}</span>
          <span class="msp-replen-market">${escapeHtml(best.label)}</span>
        </div>
        ${divider}
      `;
    }).join('');
  }

  // ─── Delegated list event listeners ───────────────────────────────────────

  /**
   * Attach delegated event listeners to the stack list for edit/delete/affiliate actions.
   *
   * Handles:
   * - Affiliate link clicks: tracks via affiliateEngine.trackClick()
   * - Edit button: toggles inline edit form for dosage/quantity
   * - Remove button: confirms deletion + dispatches REMOVE_FROM_STACK action
   * - Save-edit button: persists inline edits to state
   * - Cancel-edit button: closes inline edit without saving
   *
   * Event delegation attached to #msp-list for efficiency.
   *
   * @returns {void}
   * @private
   */
  _attachDelegatedListeners() {
    this.container.querySelector('#msp-list')?.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);

      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        this._toggleInlineEdit(id);
      }
      if (btn.dataset.action === 'remove') {
        const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
        if (!item) return;
        if (!confirm(`Remover "${item.name}" do stack?`)) return;
        stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
      }
      if (btn.dataset.action === 'save-edit') {
        this._saveInlineEdit(id);
      }
      if (btn.dataset.action === 'cancel-edit') {
        this._closeInlineEdit(id);
      }
    });
  }

  // ─── Inline edit ──────────────────────────────────────────────────────────

  /**
   * Toggle inline edit form open/closed for a supplement item.
   *
   * If already open, closes it. Otherwise, renders form with:
   * - Dosage input (number, min 0.1)
   * - Unit dropdown (g, mg, UI, mcg, cápsulas)
   * - Quantity/stock input (number, min 0)
   * - Save + Cancel buttons
   *
   * Ensures only one edit form open at a time (closes others).
   *
   * @param {string} id - Supplement ID to edit
   * @returns {void}
   * @private
   */
  _toggleInlineEdit(id) {
    const wrap = this.container.querySelector(`#msp-edit-${id}`);
    if (!wrap) return;
    if (wrap.style.display !== 'none') {
      this._closeInlineEdit(id);
      return;
    }
    // Close any other open edits
    this.container.querySelectorAll('[id^="msp-edit-"]').forEach(w => {
      if (w.id !== `msp-edit-${id}`) w.style.display = 'none';
    });

    const item = (stateManager.stack ?? []).find(s => (s.supplementId ?? s.id) === id);
    if (!item) return;

    wrap.style.display = 'block';
    wrap.innerHTML = `
      <div class="msp-inline-edit">
        <p class="msp-inline-edit-title">Editar — ${escapeHtml(item.name)}</p>
        <div class="msp-inline-row">
          <div class="msp-inline-field">
            <label class="msp-inline-label">Dosagem diária</label>
            <input type="number" class="msp-input" id="msp-ei-dosage-${id}" min="0.1" step="0.1" value="${item.dosage ?? ''}">
          </div>
          <div class="msp-inline-field" style="max-width:90px;">
            <label class="msp-inline-label">Unidade</label>
            <select class="msp-select" id="msp-ei-unit-${id}">
              ${['g','mg','UI','mcg','cápsulas'].map(u => `<option value="${u}" ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
          <div class="msp-inline-field">
            <label class="msp-inline-label">Estoque</label>
            <input type="number" class="msp-input" id="msp-ei-qty-${id}" min="0" value="${item.quantity ?? ''}">
          </div>
        </div>
        <div class="msp-inline-btns">
          <button class="msp-btn-cancel" data-action="cancel-edit" data-id="${id}">Cancelar</button>
          <button class="msp-btn-save" data-action="save-edit" data-id="${id}">Salvar</button>
        </div>
      </div>
    `;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Close inline edit form without saving changes.
   *
   * Hides the edit wrapper (msp-edit-{id}) by setting display to 'none'.
   * Safe to call multiple times or if form doesn't exist.
   *
   * @param {string} id - Supplement ID
   * @returns {void}
   * @private
   */
  _closeInlineEdit(id) {
    const wrap = this.container.querySelector(`#msp-edit-${id}`);
    if (wrap) wrap.style.display = 'none';
  }

  /**
   * Save inline edit form changes to state and close form.
   *
   * Reads dosage, unit, and quantity from form inputs.
   * Validates dosage > 0 (shows alert if invalid).
   * Dispatches UPDATE_STACK_ITEM action to stateManager.
   * Then closes the edit form.
   *
   * @param {string} id - Supplement ID
   * @returns {void}
   * @private
   */
  _saveInlineEdit(id) {
    const dosage = parseFloat(this.container.querySelector(`#msp-ei-dosage-${id}`)?.value) || 0;
    const unit = this.container.querySelector(`#msp-ei-unit-${id}`)?.value || 'g';
    const quantity = parseFloat(this.container.querySelector(`#msp-ei-qty-${id}`)?.value) || 0;

    if (dosage <= 0) { alert('Informe uma dosagem válida.'); return; }

    stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, { supplementId: id, dosage, unit, quantity });
    this._closeInlineEdit(id);
  }

  // ─── Add supplement modal ─────────────────────────────────────────────────

  /**
   * Open "Add Supplement" modal dialog with search, dosage, and quantity fields.
   *
   * Creates modal overlay with:
   * - Search input (debounced 180ms) that filters SUPPLEMENTS_DB by name/category
   * - Results dropdown (up to 8 matches)
   * - Dosage input + unit dropdown (pre-filled from selected result)
   * - Quantity/stock input
   * - Submit button (ADD_TO_STACK action)
   *
   * Closing: click overlay, click close button, or submit form.
   * Auto-focuses search input for quick typing.
   * Handles case where supplement already in DB (uses ID) or custom name (generates ID).
   *
   * Guard: returns early if modal already open (prevents duplicates).
   * Event delegation: document click closes results dropdown (outside search/results).
   *
   * @returns {void}
   * @private
   */
  _openModal() {
    if (this._modalOpen) return;
    this._modalOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'msp-modal-overlay';
    overlay.id = 'msp-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Adicionar suplemento');

    overlay.innerHTML = `
      <div class="msp-modal" id="msp-modal">
        <div class="msp-modal-header">
          <h2 class="msp-modal-title">Adicionar Suplemento</h2>
          <button class="msp-modal-close" id="msp-modal-close" aria-label="Fechar">✕</button>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-search">Buscar suplemento</label>
          <input type="search" id="msp-modal-search" class="msp-input"
            placeholder="Digite o nome…" autocomplete="off">
          <div id="msp-modal-results" class="msp-search-results" style="display:none"></div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label">Dosagem diária</label>
          <div class="msp-modal-row">
            <input type="number" id="msp-modal-dosage" class="msp-input" min="0.1" step="0.1" placeholder="Ex: 5">
            <select id="msp-modal-unit" class="msp-select">
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="UI">UI</option>
              <option value="mcg">mcg</option>
              <option value="cápsulas">cápsulas</option>
            </select>
          </div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-qty">Quantidade em estoque</label>
          <input type="number" id="msp-modal-qty" class="msp-input" min="0" placeholder="Ex: 250">
        </div>

        <button class="msp-modal-submit" id="msp-modal-submit">Adicionar ao Stack</button>
      </div>
    `;

    document.body.appendChild(overlay);
    // Lock router-outlet scroll while modal is open (body.overflow doesn't work after App Shell redesign)
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.style.overflow = 'hidden';
    this._modalSelectedId = null;

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this._closeModal();
    });

    document.getElementById('msp-modal-close')?.addEventListener('click', () => this._closeModal());

    // Search logic
    const searchInput = document.getElementById('msp-modal-search');
    const resultsBox = document.getElementById('msp-modal-results');
    let debounceTimer;

    searchInput?.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { resultsBox.style.display = 'none'; return; }
        const matches = SUPPLEMENTS_DB.filter(s =>
          s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q)
        ).slice(0, 8);
        if (!matches.length) { resultsBox.style.display = 'none'; return; }

        resultsBox.innerHTML = matches.map(s => `
          <button class="msp-result-btn"
            data-id="${escapeHtml(s.id)}"
            data-name="${escapeHtml(s.name)}"
            data-unit="${escapeHtml(s.dosage?.unit ?? 'g')}"
            data-dosage="${s.dosage?.maintenance ?? 5}"
            data-img="${escapeHtml(s.image ?? '')}">
            <img class="msp-result-img" src="${escapeHtml(s.image ?? '')}"
              alt="${escapeHtml(s.name)}"
              onerror="this.style.display='none'">
            <div class="msp-result-info">
              <span class="msp-result-name">${escapeHtml(s.name)}</span>
              <span class="msp-result-cat">${escapeHtml(s.category ?? '')}</span>
            </div>
          </button>
        `).join('');
        resultsBox.style.display = 'block';

        resultsBox.querySelectorAll('.msp-result-btn').forEach(btn => {
          btn.addEventListener('click', ev => {
            ev.preventDefault();
            this._modalSelectedId = btn.dataset.id;
            searchInput.value = btn.dataset.name;
            document.getElementById('msp-modal-dosage').value = btn.dataset.dosage;
            document.getElementById('msp-modal-unit').value = btn.dataset.unit;
            resultsBox.style.display = 'none';
          });
        });
      }, 180);
    });

    this._docClickHandler = (e) => {
      if (!searchInput?.contains(e.target) && !resultsBox?.contains(e.target)) {
        resultsBox.style.display = 'none';
      }
    };
    document.addEventListener('click', this._docClickHandler);

    // Submit
    document.getElementById('msp-modal-submit')?.addEventListener('click', () => {
      const name = (document.getElementById('msp-modal-search')?.value ?? '').trim();
      const dosage = parseFloat(document.getElementById('msp-modal-dosage')?.value) || 0;
      const unit = document.getElementById('msp-modal-unit')?.value || 'g';
      const quantity = parseFloat(document.getElementById('msp-modal-qty')?.value) || 0;

      if (!name) { alert('Informe o nome do suplemento.'); return; }
      if (dosage <= 0) { alert('Informe a dosagem diária.'); return; }

      const id = this._modalSelectedId
        ?? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

      stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
        supplementId: id,
        name,
        dosage,
        unit,
        quantity: quantity || null,
      });

      this._closeModal();
    });

    // Focus search
    setTimeout(() => searchInput?.focus(), 100);
  }

  /**
   * Close the "Add Supplement" modal and clean up event listeners.
   *
   * Removes document click listener (used for dropdown closing),
   * clears _modalOpen flag and _modalSelectedId, removes overlay from DOM.
   * Restores router-outlet scroll state.
   *
   * Safe to call multiple times or if modal not open.
   *
   * @returns {void}
   * @private
   */
  _closeModal() {
    if (this._docClickHandler) {
      document.removeEventListener('click', this._docClickHandler);
      this._docClickHandler = null;
    }
    this._modalOpen = false;
    this._modalSelectedId = null;
    const overlay = document.getElementById('msp-modal-overlay');
    overlay?.remove();
    // Restore router-outlet scroll
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.style.overflow = '';
  }

  /**
   * Open share modal with QR code, social sharing, and link copy options.
   *
   * Shows:
   * - QR code (renders via qrGenerator.renderQRCode())
   * - Native share button (Web Share API)
   * - WhatsApp share (opens whatsapp.com/send with pre-filled text)
   * - Telegram share (opens t.me/share/url with pre-filled text)
   * - Copy link button (clipboard copy with toast feedback)
   *
   * Closes on overlay click or close button click.
   * Guards against empty stack (shows alert if no items).
   *
   * Share URL: generated by shareService.generateShareUrl(stack).
   * Share text: formatted by shareService.formatStackText(stack).
   *
   * @returns {void}
   * @private
   */
  _openShareModal() {
    const stack = stateManager.stack || [];
    if (!stack.length) {
      alert('Seu stack de suplementação está vazio. Adicione suplementos para poder compartilhá-lo!');
      return;
    }

    const shareUrl = this.shareService.generateShareUrl(stack);
    const shareText = this.shareService.formatStackText(stack);

    // Create modal element
    const modalDiv = document.createElement('div');
    modalDiv.className = 'msp-modal-overlay';
    modalDiv.id = 'msp-share-modal';
    modalDiv.style.zIndex = '2000';

    modalDiv.innerHTML = `
      <div class="msp-modal" style="max-width: 440px; padding: 24px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="msp-modal-title" style="margin: 0; font-size: 18px;">🔗 Compartilhar Meu Stack</h3>
          <button class="msp-btn-icon" id="msp-close-share" style="font-size: 20px;">✕</button>
        </div>

        <p style="color: var(--color-text-secondary); font-size: 13px; margin: 0 0 16px 0;">
          Compartilhe sua rotina de suplementação offline-first de forma 100% segura. Seus dados ficam no seu link!
        </p>

        <!-- QR Code Canvas Container -->
        <div style="background: var(--color-surface-secondary); padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; border: 1px solid var(--color-border);">
          <canvas id="msp-share-qr-canvas" style="display: block; max-width: 100%; border-radius: 8px;"></canvas>
          <span style="font-size: 11px; color: var(--color-text-muted); display: block; margin-top: 8px;">Aponte a câmera para escanear e importar</span>
        </div>

        <!-- Sharing action buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <button class="msp-btn-save" id="msp-share-native-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📱</span> Compartilhar no Aparelho
          </button>
          
          <div style="display: flex; gap: 8px;">
            <button class="msp-btn-cancel" id="msp-share-wa-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-color: #25D366; color: #25D366; background: rgba(37,211,102,0.06);">
              <span>💬</span> WhatsApp
            </button>
            <button class="msp-btn-cancel" id="msp-share-tg-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-color: #0088cc; color: #0088cc; background: rgba(0,136,204,0.06);">
              <span>✈️</span> Telegram
            </button>
          </div>

          <button class="msp-btn-cancel" id="msp-share-copy-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>📋</span> Copiar Link de Importação
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    // Render QR Code
    const canvas = modalDiv.querySelector('#msp-share-qr-canvas');
    if (canvas) {
      this.qrGenerator.renderQRCode(canvas, shareUrl);
    }

    // Attach listeners
    modalDiv.querySelector('#msp-close-share')?.addEventListener('click', () => modalDiv.remove());
    
    // Native sharing
    modalDiv.querySelector('#msp-share-native-btn')?.addEventListener('click', async () => {
      await this.shareService.shareStack(stack);
    });

    // WhatsApp
    modalDiv.querySelector('#msp-share-wa-btn')?.addEventListener('click', () => {
      const link = this.shareService.getWhatsAppLink(shareText, shareUrl);
      window.open(link, '_blank');
    });

    // Telegram
    modalDiv.querySelector('#msp-share-tg-btn')?.addEventListener('click', () => {
      const link = this.shareService.getTelegramLink(shareText, shareUrl);
      window.open(link, '_blank');
    });

    // Copy Link
    modalDiv.querySelector('#msp-share-copy-btn')?.addEventListener('click', async () => {
      await this.shareService.copyToClipboard(shareUrl, 'Link de importação copiado!');
    });

    // Close on overlay click
    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) modalDiv.remove();
    });
  }
}

export default MyStackPage;
