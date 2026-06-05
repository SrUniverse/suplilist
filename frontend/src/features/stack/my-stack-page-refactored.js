/**
 * MyStackPage — My Stack view
 * Refactored with sub-components: List, Stats, Replenishment
 */

import { stateManager } from '../../state/state-manager.js';
import ShareService from '../sharing/share-service.js';
import QRGenerator from '../sharing/qr-generator.js';
import { stackService } from './stack-service.js';
import { fetchPrices } from './my-stack-page-utils.js';
import { MyStackPageList } from './my-stack-page-list.js';
import { MyStackPageStats } from './my-stack-page-stats.js';
import { MyStackPageReplenishment } from './my-stack-page-replenishment.js';

export class MyStackPage {
  constructor(container) {
    this.container = container;
    this._unsub = null;
    this._isMounted = false;
    this._prices = null;

    this.shareService = new ShareService();
    this.qrGenerator = new QRGenerator();

    this.list = new MyStackPageList(container, {
      onEdit: (id) => this._openEditModal(id),
    });
    this.stats = new MyStackPageStats(container);
    this.replenishment = new MyStackPageReplenishment(container);
  }

  mount() {
    this._isMounted = true;
    this._attachStyles();
    this._render();
    this._renderAll();

    fetchPrices().then(prices => {
      if (!this._isMounted) return;
      this._prices = prices;
      this.replenishment.render(stateManager.stack, prices);
    });

    this._unsub = stateManager.subscribe(() => {
      if (!this._isMounted) return;
      this._renderAll();
    });
  }

  unmount() {
    this._isMounted = false;
    this._unsub?.();
    this.container.innerHTML = '';
  }

  _renderAll() {
    const stack = stateManager.stack ?? [];
    this.stats.renderSubtitle(stack);
    this.stats.renderStats(stack);
    this.list.render(stack);
  }

  _attachStyles() {
    if (document.getElementById('msp-styles')) return;
    const style = document.createElement('style');
    style.id = 'msp-styles';
    style.textContent = `
      .msp-wrap { padding: 24px 16px; max-width: 960px; margin: 0 auto; }
      .msp-header { margin-bottom: 24px; }
      .msp-title { font-size: 28px; font-weight: 800; margin: 0 0 4px; }
      .msp-subtitle { font-size: 14px; color: var(--color-text-secondary); margin: 0; }
      #msp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
      @media (max-width: 540px) { #msp-stats { grid-template-columns: 1fr 1fr; } }
      .msp-stat { background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
      .msp-stat-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
      .msp-stat-value { font-size: 24px; font-weight: 800; color: var(--color-text-primary); }
      .msp-body { display: grid; grid-template-columns: 1fr 280px; gap: 20px; }
      @media (max-width: 768px) { .msp-body { grid-template-columns: 1fr; } }
      .msp-section { margin-bottom: 20px; }
      .msp-section-title { font-size: 15px; font-weight: 700; margin: 0 0 14px; }
      #msp-list { display: flex; flex-direction: column; gap: 10px; }
      .msp-item { background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: border-color 200ms; }
      .msp-item:hover { border-color: var(--color-border-strong); }
      .msp-item-img { width: 72px; height: 72px; border-radius: 12px; object-fit: contain; background: var(--color-surface-secondary); flex-shrink: 0; }
      .msp-item-info { flex: 1; min-width: 0; }
      .msp-item-name { font-size: 15px; font-weight: 700; margin: 0 0 3px; }
      .msp-item-dosage { font-size: 12px; color: var(--color-text-secondary); margin: 0; }
      .msp-item-badges { display: flex; gap: 6px; margin-top: 6px; }
      .msp-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
      .msp-btn-sm { padding: 6px 10px; background: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; font-size: 12px; transition: background 150ms; }
      .msp-btn-sm:hover { background: var(--color-surface-hover); }
      #msp-replenishment { background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; }
      .msp-empty { text-align: center; padding: 56px 20px; color: var(--color-text-muted); }
    `;
    document.head.appendChild(style);
  }

  _render() {
    this.container.innerHTML = `
      <div class="msp-wrap">
        <div class="msp-header">
          <h1 class="msp-title">Meu Stack</h1>
          <p id="msp-subtitle" class="msp-subtitle">0 suplementos</p>
        </div>
        <div id="msp-stats"></div>
        <div class="msp-body">
          <div class="msp-section">
            <div class="msp-section-header">
              <h2 class="msp-section-title">Suplementos</h2>
              <button id="msp-btn-add" class="msp-btn-add">+ Adicionar</button>
            </div>
            <div id="msp-list" role="list"></div>
          </div>
          <div id="msp-replenishment"></div>
        </div>
      </div>
    `;

    this.container.querySelector('#msp-btn-add')?.addEventListener('click', () => {
      window.location.hash = '#/stack/add';
    });
  }

  _openEditModal(supplementId) {
    const item = (stateManager.stack ?? []).find(s => s.supplementId === supplementId);
    if (!item) return;
    const newDosage = prompt(`Nova dosagem para ${item.name}:`, String(item.dosage));
    if (newDosage) {
      stateManager.dispatch('UPDATE_STACK_ITEM', {
        supplementId,
        dosage: parseFloat(newDosage),
      });
    }
  }
}

export default MyStackPage;
