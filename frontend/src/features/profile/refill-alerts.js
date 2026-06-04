/**
 * @fileoverview Refill Alerts
 * Tracks supplement purchases and alerts when they're running low
 */

/**
 * Calculate days until a supplement runs out
 * @param {Object} purchase - { quantity, dailyConsumption, purchasedAt }
 * @returns {number} Days remaining (can be negative if already expired)
 */
export function calculateDaysUntilRefill(purchase) {
  if (!purchase || !purchase.quantity || !purchase.dailyConsumption) {
    return 0;
  }

  const daysRemaining = Math.floor(purchase.quantity / purchase.dailyConsumption);
  const daysSincePurchase = Math.floor((Date.now() - purchase.purchasedAt) / (24 * 60 * 60 * 1000));

  return Math.max(0, daysRemaining - daysSincePurchase);
}

/**
 * Get alert level based on days remaining
 * @param {number} daysRemaining - Days until refill needed
 * @returns {string} Alert level: 'critical' | 'warning' | 'info' | 'ok'
 */
export function getAlertLevel(daysRemaining) {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 3) return 'critical';
  if (daysRemaining <= 10) return 'warning';
  if (daysRemaining <= 20) return 'info';
  return 'ok';
}

/**
 * Get all supplements that need refilling (next 30 days)
 * @param {Array} purchases - User's purchase history
 * @returns {Array} Sorted by urgency (most urgent first)
 */
export function getRefillAlerts(purchases) {
  if (!Array.isArray(purchases)) {
    return [];
  }

  return purchases
    .map(purchase => {
      const daysRemaining = calculateDaysUntilRefill(purchase);
      const alertLevel = getAlertLevel(daysRemaining);

      return {
        supplementId: purchase.supplementId,
        daysRemaining,
        alertLevel,
        purchasedAt: purchase.purchasedAt,
        quantity: purchase.quantity,
        dailyConsumption: purchase.dailyConsumption,
        price: purchase.price,
        source: purchase.source,
      };
    })
    .filter(alert => alert.daysRemaining <= 30 && alert.alertLevel !== 'ok')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Get color for alert level
 * @param {string} level - Alert level
 * @returns {string} CSS color variable
 */
export function getAlertColor(level) {
  switch (level) {
    case 'critical':
      return 'var(--color-error)';
    case 'warning':
      return 'var(--color-warning)';
    case 'info':
      return 'var(--color-info)';
    case 'expired':
      return 'var(--color-error)';
    default:
      return 'var(--color-success)';
  }
}

/**
 * Get message for alert level
 * @param {string} level - Alert level
 * @param {number} days - Days remaining
 * @returns {string} Alert message
 */
export function getAlertMessage(level, days) {
  switch (level) {
    case 'expired':
      return '⚠️ Produto expirado! Compre novo.';
    case 'critical':
      return `🚨 ${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}. Compre AGORA!`;
    case 'warning':
      return `⚠️ ${days} dias restantes. Considere comprar em breve.`;
    case 'info':
      return `📦 ${days} dias restantes. Tempo de reabastecer.`;
    default:
      return `✅ ${days} dias restantes.`;
  }
}

/**
 * Track a purchase
 * @param {string} supplementId - Which supplement
 * @param {number} quantity - Amount purchased (grams/ml/units)
 * @param {number} dailyConsumption - Daily intake amount
 * @param {number} price - Cost in reais
 * @param {string} source - Where purchased (Amazon, Nutrilibrium, etc.)
 * @returns {Object} Purchase record
 */
export function createPurchaseRecord(supplementId, quantity, dailyConsumption, price, source = null) {
  if (!supplementId || !quantity || !dailyConsumption) {
    throw new Error('supplementId, quantity, and dailyConsumption are required');
  }

  return {
    id: `purchase_${Date.now()}`,
    supplementId,
    quantity,
    dailyConsumption,
    price,
    source,
    purchasedAt: Date.now(),
    status: 'active', // 'active' | 'finished' | 'cancelled'
  };
}

/**
 * Get total spent on a supplement
 * @param {string} supplementId - Which supplement
 * @param {Array} purchases - Purchase history
 * @returns {Object} { total, count, average }
 */
export function getSupplementSpending(supplementId, purchases) {
  const relevant = purchases.filter(p => p.supplementId === supplementId && p.status === 'active');

  if (relevant.length === 0) {
    return { total: 0, count: 0, average: 0 };
  }

  const total = relevant.reduce((sum, p) => sum + (p.price || 0), 0);
  const average = total / relevant.length;

  return {
    total: Math.round(total * 100) / 100,
    count: relevant.length,
    average: Math.round(average * 100) / 100,
  };
}

/**
 * Get best price source for a supplement
 * @param {string} supplementId - Which supplement
 * @param {Array} purchases - Purchase history
 * @returns {Object} { source, price, supplementId }
 */
export function getBestPriceSource(supplementId, purchases) {
  const relevant = purchases
    .filter(p => p.supplementId === supplementId && p.source && p.price)
    .sort((a, b) => a.price - b.price);

  if (relevant.length === 0) {
    return { source: null, price: null, supplementId };
  }

  return {
    source: relevant[0].source,
    price: relevant[0].price,
    supplementId,
  };
}
