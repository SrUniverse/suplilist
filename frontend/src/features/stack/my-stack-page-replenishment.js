/**
 * MyStackPageReplenishment — Replenishment suggestions based on prices
 */
import { getSupplementId } from '../../utils/stack.js';
import { formatBRL, calcDaysLeft } from './my-stack-page-utils.js';
import { escapeHtml } from '../../utils/escape.js';

export class MyStackPageReplenishment {
  constructor(container) {
    this.container = container;
  }

  render(stack, prices) {
    const el = this.container.querySelector('#msp-replenishment');
    if (!el) return;

    if (!prices) {
      el.innerHTML = `
        <h3 class="msp-replenishment-title">Reposição Sugerida</h3>
        <p class="msp-replenishment-empty">Carregando preços...</p>
      `;
      return;
    }

    const items = stack
      .filter(item => prices[getSupplementId(item)])
      .sort((a, b) => (calcDaysLeft(a) ?? 999) - (calcDaysLeft(b) ?? 999))
      .slice(0, 5);

    if (!items.length) {
      el.innerHTML = `
        <h3 class="msp-replenishment-title">Reposição Sugerida</h3>
        <p class="msp-replenishment-empty">Nenhum preço disponível</p>
      `;
      return;
    }

    el.innerHTML = `
      <h3 class="msp-replenishment-title">Reposição Sugerida</h3>
      ${items.map(item => {
        const supId     = getSupplementId(item);
        const days      = calcDaysLeft(item);
        const storeData = prices[supId];
        const best      = Object.values(storeData).reduce((b, c) =>
          (c.price ?? 999) < (b.price ?? 999) ? c : b
        );

        return `
          <div class="msp-replenishment-item">
            <p class="msp-replenishment-name">${escapeHtml(item.name)}</p>
            ${days != null ? `<p class="msp-replenishment-days">Faltam ${days} dias</p>` : ''}
            <div class="msp-replenishment-row">
              <span class="msp-replenishment-price">${formatBRL(best.price)}</span>
              ${best.url
                ? `<a href="${escapeHtml(best.url)}" target="_blank" rel="noopener noreferrer" class="msp-replenishment-buy">
                     Comprar →
                   </a>`
                : `<span class="msp-replenishment-price" style="font-size:11px;font-weight:600;color:var(--color-text-muted);">${escapeHtml(best.label ?? 'Marketplace')}</span>`
              }
            </div>
          </div>
        `;
      }).join('')}
    `;
  }
}
