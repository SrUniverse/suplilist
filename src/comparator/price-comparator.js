/**
 * PriceComparator v4.0 — SupliList
 * Compara custo por dose entre marketplaces, não apenas preço absoluto.
 *
 * Uso:
 *   import PriceComparator from '../comparator/price-comparator.js';
 *   const pc = new PriceComparator(affiliateEngine, supplementDB);
 *   const result = await pc.compare('creatina-monohidratada', { dosage: 5, unit: 'g', quantity: 300 });
 *
 * A métrica central é CUSTO POR DOSE, não preço absoluto.
 * Exemplo:
 *   R$ 50 para 300g de creatina a 5g/dia = R$ 0,83/dose
 *   R$ 42 para 200g de creatina a 5g/dia = R$ 1,05/dose
 *   → O produto "mais barato" é 26% mais caro por uso.
 */

import AffiliateEngine from '../monetization/affiliate-engine.js';

export class PriceComparator {

  constructor(affiliateEngine, supplementDatabase = []) {
    this._ae      = affiliateEngine;
    this._db      = supplementDatabase;
    this._history = new Map(); // supplementId → [{ ts, prices[] }]
  }

  // ─────────────────────────────────────────────
  // MAIN COMPARE METHOD
  // ─────────────────────────────────────────────

  /**
   * Compare prices for a supplement across all marketplaces.
   *
   * @param {string} supplementId
   * @param {Object} [options]
   * @param {number} [options.dosage]       - Grams (or units) per day
   * @param {string} [options.unit]         - 'g' | 'mg' | 'ml' | 'caps' | 'tabs'
   * @param {number} [options.quantity]     - Container size (same unit as dosage)
   * @param {Object} [options.userPrefs]    - Passed to AffiliateEngine
   * @returns {Promise<ComparisonResult>}
   */
  async compare(supplementId, options = {}) {
    // 1. Resolve dosage info (from options → supplement DB → defaults)
    const supplement = this._db.find(s => s.id === supplementId);
    const dosage     = options.dosage   ?? supplement?.dosage?.maintenance  ?? 5;
    const unit       = options.unit     ?? supplement?.dosage?.unit         ?? 'g';
    const quantity   = options.quantity ?? supplement?.packageSize          ?? 300;

    // 2. Get prices + affiliate links from AffiliateEngine
    const allOptions = await this._ae.getAllOptions(supplementId, options.userPrefs ?? {});

    // 3. Calculate cost per dose for each marketplace
    const compared = allOptions.map(opt => {
      const costPerDose  = this._calcCostPerDose(opt.price, quantity, dosage);
      const daysSupply   = this._calcDaysSupply(quantity, dosage);
      const costPerMonth = costPerDose * 30;

      return {
        ...opt,
        dosage,
        unit,
        quantity,
        costPerDose:           +costPerDose.toFixed(4),
        costPerDoseFormatted:  this._formatCurrency(costPerDose),
        daysSupply:            +daysSupply.toFixed(1),
        costPerMonth:          +costPerMonth.toFixed(2),
        costPerMonthFormatted: this._formatCurrency(costPerMonth),
        isWinner:              false, // set below
        savingsVsWorst:        null,  // set below
      };
    });

    // 4. Determine winner (lowest cost per dose)
    const withPrice = compared.filter(o => o.price > 0);
    const sorted    = [...withPrice].sort((a, b) => a.costPerDose - b.costPerDose);
    const winner    = sorted[0]                    ?? null;
    const worst     = sorted[sorted.length - 1]   ?? null;

    compared.forEach(opt => {
      opt.isWinner       = winner != null && opt.marketplaceId === winner.marketplaceId;
      opt.savingsVsWorst = worst && worst.costPerDose > 0 && !opt.isWinner
        ? +((worst.costPerDose - opt.costPerDose) * 30).toFixed(2)
        : null;
    });

    // 5. Record in price history (capped at 10 entries)
    this._recordHistory(supplementId, compared);

    // 6. Build and return result
    return {
      supplementId,
      supplementName:   supplement?.name ?? this._idToName(supplementId),
      dosage,
      unit,
      quantity,
      options:          compared,
      winner:           compared.find(o => o.isWinner) ?? null,
      bestPrice:        winner?.price          ?? null,
      bestCostPerDose:  winner?.costPerDose    ?? null,
      worstCostPerDose: worst?.costPerDose     ?? null,
      maxSavings:       winner && worst
        ? +((worst.costPerDose - winner.costPerDose) * 30).toFixed(2)
        : 0,
      priceHistory: this._getHistory(supplementId),
      comparedAt:   new Date().toISOString(),
    };
  }

  /**
   * Quick price summary — no UI, just the numbers.
   * Useful for inline rendering in supplement cards.
   *
   * @param {string} supplementId
   * @returns {Promise<{ best, worst, winner, winnerEmoji, costPerDose }|null>}
   */
  async quickSummary(supplementId) {
    try {
      const result = await this.compare(supplementId);
      return {
        best:        result.bestPrice,
        worst:       result.options.reduce((max, o) => Math.max(max, o.price), 0),
        winner:      result.winner?.marketplaceName  ?? null,
        winnerEmoji: result.winner?.marketplaceEmoji ?? null,
        costPerDose: result.bestCostPerDose,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────

  /**
   * Cost per single dose.
   * Ex: R$ 50 / (300g package ÷ 5g dose) = R$ 50 / 60 doses = R$ 0,833/dose
   */
  _calcCostPerDose(price, quantity, dosagePerDay) {
    if (!price || !quantity || !dosagePerDay) return 0;
    const doses = quantity / dosagePerDay;
    return doses > 0 ? price / doses : 0;
  }

  /**
   * Days the package lasts.
   * Ex: 300g ÷ 5g/dia = 60 dias
   */
  _calcDaysSupply(quantity, dosagePerDay) {
    if (!quantity || !dosagePerDay) return 0;
    return quantity / dosagePerDay;
  }

  // ─────────────────────────────────────────────
  // PRICE HISTORY (in-memory, max 10 fetches)
  // ─────────────────────────────────────────────

  _recordHistory(supplementId, options) {
    const history = this._history.get(supplementId) ?? [];
    history.push({
      ts:     Date.now(),
      prices: options.map(o => ({ marketplaceId: o.marketplaceId, price: o.price })),
    });
    if (history.length > 10) history.shift();
    this._history.set(supplementId, history);
  }

  _getHistory(supplementId) {
    return this._history.get(supplementId) ?? [];
  }

  // ─────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────

  _formatCurrency(value, locale = 'pt-BR', currency = 'BRL') {
    return value.toLocaleString(locale, { style: 'currency', currency });
  }

  _idToName(id) {
    return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

export default PriceComparator;
