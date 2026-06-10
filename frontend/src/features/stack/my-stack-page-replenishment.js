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
      el.innerHTML = '<p style="color:var(--color-text-muted);">Carregando preços...</p>';
      return;
    }

    const withPrices = stack
      .filter(item => {
        const supId = getSupplementId(item);
        return prices[supId];
      })
      .sort((a, b) => {
        const daysA = calcDaysLeft(a) ?? 999;
        const daysB = calcDaysLeft(b) ?? 999;
        return daysA - daysB;
      })
      .slice(0, 5);

    if (!withPrices.length) {
      el.innerHTML = '<p style="color:var(--color-text-muted);">Nenhum preço disponível</p>';
      return;
    }

    el.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;">Reposição Sugerida</h3>
      ${withPrices.map(item => {
        const supId = getSupplementId(item);
        const daysLeft = calcDaysLeft(item);
        const storeData = prices[supId];
        const bestPrice = Object.values(storeData).reduce((best, curr) =>
          (curr.price ?? 999) < (best.price ?? 999) ? curr : best
        );

        return `
          <div style="padding:8px;border-bottom:1px solid var(--color-border);font-size:12px;">
            <p style="margin:0;font-weight:600;">${escapeHtml(item.name)}</p>
            ${daysLeft != null
              ? `<p style="margin:0;color:var(--color-text-muted);font-size:11px;">Faltam ${daysLeft} dias</p>`
              : ''}
            <p style="margin:4px 0 0;font-weight:700;">${formatBRL(bestPrice.price)} · ${escapeHtml(bestPrice.label ?? 'Marketplace')}</p>
          </div>
        `;
      }).join('')}
    `;
  }
}
