/**
 * MyStackPageStats — Statistics rendering (count, cost, adherence)
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
    const count = stack.length;
    el.textContent = count === 0 ? '0 suplementos' : `${count} suplemento${count !== 1 ? 's' : ''}`;
  }

  renderStats(stack) {
    const el = this.container.querySelector('#msp-stats');
    if (!el) return;

    const monthlyInvestment = calcMonthlyInvestment(stack);
    const adherenceRate = calcAdherenceRate(stack);
    const totalEvidenceA = stack.filter(s => {
      const db = SUPPLEMENTS_DB.find(d => d.id === getSupplementId(s));
      return db?.evidenceLevel === 'A';
    }).length;

    el.innerHTML = `
      <div class="msp-stat">
        <span class="msp-stat-label">Investimento/mês</span>
        <span class="msp-stat-value">${formatBRL(monthlyInvestment)}</span>
      </div>
      <div class="msp-stat">
        <span class="msp-stat-label">Aderência (7d)</span>
        <span class="msp-stat-value">${adherenceRate}</span>
      </div>
      <div class="msp-stat">
        <span class="msp-stat-label">Evidência A</span>
        <span class="msp-stat-value">${totalEvidenceA}</span>
      </div>
    `;
  }
}
