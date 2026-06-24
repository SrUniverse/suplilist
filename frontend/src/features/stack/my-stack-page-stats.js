/**
 * MyStackPageStats — Statistics rendering (count, cost, adherence, evidence)
 */
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { getSupplementId } from '../../utils/stack.js';
import { calcMonthlyInvestment, calcAdherenceRate, formatBRL } from './my-stack-page-utils.js';

export class MyStackPageStats {
  constructor(container) {
    this.container = container;
  }

  renderSubtitle(stack) {
    const el = this.container.querySelector('#msp-subtitle');
    if (!el) return;
    const n = stack.length;
    el.textContent = n === 0 ? '0 suplementos' : `${n} suplemento${n !== 1 ? 's' : ''}`;
  }

  renderStats(stack) {
    const el = this.container.querySelector('#msp-stats');
    if (!el) return;

    const investment = calcMonthlyInvestment(stack);
    const adherence  = calcAdherenceRate(stack);
    const evidenceA  = stack.filter(s => {
      const db = SUPPLEMENTS_DB.find(d => d.id === getSupplementId(s));
      return db?.evidenceLevel === 'A';
    }).length;

    el.innerHTML = `
      <div class="msp-stat">
        <span class="msp-stat-label">Investimento/mês</span>
        <span class="msp-stat-value">${formatBRL(investment)}</span>
      </div>
      <div class="msp-stat">
        <span class="msp-stat-label">Aderência (7d)</span>
        <span class="msp-stat-value">${adherence}</span>
      </div>
      <div class="msp-stat">
        <span class="msp-stat-label">Evidência A</span>
        <span class="msp-stat-value">${evidenceA}</span>
      </div>
    `;
  }
}
