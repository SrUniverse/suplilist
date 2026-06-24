/**
 * MyStackPage — My Stack view
 */

import { stateManager } from '../../state/state-manager.js';
import { fetchPrices } from './my-stack-page-utils.js';
import { MyStackPageList } from './my-stack-page-list.js';
import { MyStackPageStats } from './my-stack-page-stats.js';
import { MyStackPageReplenishment } from './my-stack-page-replenishment.js';
import './my-stack-page.css';

export class MyStackPage {
  constructor(container) {
    this.container = container;
    this._unsub = null;
    this._isMounted = false;
    this._prices = null;

    this.list = new MyStackPageList(container);
    this.stats = new MyStackPageStats(container);
    this.replenishment = new MyStackPageReplenishment(container);
  }

  mount() {
    this._isMounted = true;
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
      if (this._prices) {
        this.replenishment.render(stateManager.stack, this._prices);
      }
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

  _render() {
    this.container.innerHTML = `
      <div class="msp-wrap">
        <div class="msp-header">
          <h1 class="msp-title">Meu Stack</h1>
          <p id="msp-subtitle" class="msp-subtitle">0 suplementos</p>
        </div>
        <div id="msp-stats" class="msp-stats"></div>
        <div class="msp-body">
          <div>
            <div class="msp-section-header">
              <h2 class="msp-section-title">Suplementos</h2>
              <button id="msp-btn-add" class="msp-btn-add">+ Adicionar</button>
            </div>
            <div id="msp-list" class="msp-list" role="list"></div>
          </div>
          <div id="msp-replenishment" class="msp-replenishment"></div>
        </div>
      </div>
    `;

    this.container.querySelector('#msp-btn-add')?.addEventListener('click', () => {
      window.history.pushState(null, null, '/list');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }
}

export default MyStackPage;
