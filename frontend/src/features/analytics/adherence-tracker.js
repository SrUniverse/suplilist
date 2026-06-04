/**
 * @fileoverview Adherence Tracker
 * Tracks supplement adherence over time and provides visualization
 */

/**
 * Calculate adherence statistics for supplements over a time period
 * @param {Array<{supplementId: string, timestamp: number}>} checkins - User checkins
 * @param {number} [days=30] - Number of days to analyze
 * @returns {Object} Adherence data keyed by supplementId
 */
export function calculateAdherence(checkins, days = 30) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const relevant = checkins.filter(c => c.timestamp > cutoff);

  // Group checkins by supplementId and date
  const grouped = {};
  for (const checkin of relevant) {
    if (!grouped[checkin.supplementId]) {
      grouped[checkin.supplementId] = new Set();
    }
    const date = new Date(checkin.timestamp).toDateString();
    grouped[checkin.supplementId].add(date);
  }

  // Calculate adherence percentages
  const result = {};
  for (const [suppId, uniqueDates] of Object.entries(grouped)) {
    const taken = uniqueDates.size;
    const missed = days - taken;
    result[suppId] = {
      taken,
      missed,
      percentage: Math.round((taken / days) * 100),
    };
  }

  return result;
}

/**
 * Get top N supplements by adherence percentage
 * @param {Object} adherenceData - Output from calculateAdherence()
 * @param {number} [limit=5] - Number of supplements to return
 * @returns {Array} Sorted by adherence % descending
 */
export function getTopSupplements(adherenceData, limit = 5) {
  return Object.entries(adherenceData)
    .map(([suppId, data]) => ({
      supplementId: suppId,
      ...data,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit);
}

/**
 * Render 30-day adherence chart (green for taken, red for missed)
 * @param {string} supplementId - Which supplement to show
 * @param {Array} checkins - All checkins
 * @param {HTMLElement} container - Where to render
 * @returns {HTMLElement} Chart element
 */
export function renderAdherenceChart(supplementId, checkins, container) {
  const chart = document.createElement('div');
  chart.className = 'adherence-chart';
  chart.setAttribute('data-supplement-id', supplementId);

  const days = 30;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();

    const hasCheckin = checkins.some(
      c => new Date(c.timestamp).toDateString() === dateStr &&
           c.supplementId === supplementId
    );

    const day = document.createElement('div');
    day.className = `chart-day ${hasCheckin ? 'taken' : 'missed'}`;
    day.title = dateStr;
    day.setAttribute('data-date', dateStr);
    day.setAttribute('aria-label', `${supplementId} on ${dateStr}: ${hasCheckin ? 'taken' : 'missed'}`);

    chart.appendChild(day);
  }

  container.appendChild(chart);
  return chart;
}

/**
 * Get adherence overview for dashboard
 * @param {Array} checkins - All user checkins
 * @returns {Object} Overview stats
 */
export function getAdherenceOverview(checkins) {
  if (checkins.length === 0) {
    return {
      averageAdherence: 0,
      topSupplements: [],
      consistency: 'none',
      message: 'Comece a marcar seus suplementos!',
    };
  }

  const adherence = calculateAdherence(checkins);
  const top = getTopSupplements(adherence);
  const avgAdherence = Math.round(
    Object.values(adherence).reduce((sum, a) => sum + a.percentage, 0) / Object.keys(adherence).length
  );

  let consistency = 'low';
  if (avgAdherence >= 80) consistency = 'excellent';
  else if (avgAdherence >= 60) consistency = 'good';
  else if (avgAdherence >= 40) consistency = 'fair';

  const messages = {
    excellent: '👏 Aderência excelente! Continue assim!',
    good: '💪 Boa consistência! Pode melhorar um pouco.',
    fair: '🎯 Bora aumentar a aderência?',
    low: '📈 Comece a marcar para ganhar consistência!',
  };

  return {
    averageAdherence: avgAdherence,
    topSupplements: top,
    consistency,
    message: messages[consistency],
  };
}

/**
 * Calculate streak for a specific supplement
 * @param {string} supplementId - Which supplement
 * @param {Array} checkins - All checkins
 * @returns {Object} Current and best streaks
 */
export function calculateStreak(supplementId, checkins) {
  const userCheckins = checkins
    .filter(c => c.supplementId === supplementId)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (userCheckins.length === 0) {
    return { current: 0, best: 0 };
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let lastDate = null;

  for (const checkin of userCheckins) {
    const checkDate = new Date(checkin.timestamp).toDateString();

    if (lastDate === null) {
      currentStreak = 1;
      lastDate = checkDate;
    } else if (lastDate === checkDate) {
      // Same day, skip
      continue;
    } else {
      // Check if consecutive day
      const last = new Date(lastDate);
      const check = new Date(checkDate);
      const daysDiff = (last - check) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        currentStreak++;
      } else {
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 1;
      }
      lastDate = checkDate;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    current: currentStreak,
    best: bestStreak,
  };
}
