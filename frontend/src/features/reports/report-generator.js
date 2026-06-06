/**
 * Report Generator — Monthly insights for user engagement
 * Emails should go out automatically on day 1 of each month
 */

import { stateManager } from '../../state/state-manager.js';
import logger from '../../platform/logger.js';

export class ReportGenerator {
  constructor() {
    this.reportCache = new Map();
  }

  /**
   * Generate monthly report
   */
  generateMonthlyReport(year, month) {
    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;

    // Return cached if exists
    if (this.reportCache.has(cacheKey)) {
      logger.info(`Report from cache: ${cacheKey}`);
      return this.reportCache.get(cacheKey);
    }

    const checkins = stateManager.select(s => s.checkins) || [];
    const stack = stateManager.select(s => s.stack) || [];
    const profile = stateManager.select(s => s.profile) || {};

    // Get month boundaries
    const startDate = this.getMonthStart(year, month);
    const endDate = this.getMonthEnd(year, month);

    // Filter checkins for this month
    const monthCheckins = checkins.filter(c => {
      return c.date >= startDate && c.date <= endDate;
    });

    // Calculate metrics
    const metrics = this.calculateMetrics(monthCheckins, stack, startDate, endDate);
    const insights = this.generateInsights(monthCheckins, stack, metrics);
    const comparison = this.getMonthComparison(year, month, checkins, stack);

    const report = {
      year,
      month,
      monthName: this.getMonthName(month),
      generatedAt: new Date().toISOString(),
      user: {
        name: profile.name || 'User',
        email: profile.email
      },
      metrics,
      insights,
      comparison,
      topSupplements: this.getTopSupplements(monthCheckins, stack),
      badges: this.generateBadges(monthCheckins, stack, metrics)
    };

    // Cache report
    this.reportCache.set(cacheKey, report);

    logger.info(`Report generated: ${cacheKey}`);

    return report;
  }

  /**
   * Calculate key metrics
   */
  calculateMetrics(monthCheckins, stack, startDate, endDate) {
    const days = this.getDayCount(startDate, endDate);
    const totalExpected = stack.length * days;
    const totalTaken = monthCheckins.length;
    const adherencePercent = totalExpected > 0
      ? Math.round((totalTaken / totalExpected) * 100)
      : 0;

    // Perfect days (all supplements taken)
    let perfectDays = 0;
    const byDate = {};
    monthCheckins.forEach(c => {
      if (!byDate[c.date]) byDate[c.date] = [];
      byDate[c.date].push(c);
    });

    Object.values(byDate).forEach(dayCheckins => {
      if (dayCheckins.length === stack.length && stack.length > 0) {
        perfectDays++;
      }
    });

    // Best and worst days
    const dateAdherence = {};
    for (let i = 0; i < days; i++) {
      const date = this.getDateOffset(startDate, i);
      const dayCheckins = monthCheckins.filter(c => c.date === date);
      const dayPercent = stack.length > 0
        ? ((dayCheckins.length / stack.length) * 100)
        : 0;
      dateAdherence[date] = dayPercent;
    }

    const sortedDates = Object.entries(dateAdherence).sort((a, b) => b[1] - a[1]);
    const bestDay = sortedDates[0];
    const worstDay = sortedDates[sortedDates.length - 1];

    // Trend
    const firstHalf = monthCheckins.filter(c => {
      const d = new Date(c.date);
      return d.getDate() <= 15;
    });
    const secondHalf = monthCheckins.filter(c => {
      const d = new Date(c.date);
      return d.getDate() > 15;
    });

    const firstHalfPercent = this.getAdherence(firstHalf, stack, 15);
    const secondHalfPercent = this.getAdherence(secondHalf, stack, 15);
    const trend = secondHalfPercent > firstHalfPercent ? 'improving' : 'declining';

    return {
      days,
      adherencePercent,
      totalTaken,
      totalExpected,
      perfectDays,
      weekdayAverage: Math.round(
        Object.values(dateAdherence).reduce((a, b) => a + b, 0) / days
      ),
      bestDay: { date: bestDay[0], percent: Math.round(bestDay[1]) },
      worstDay: { date: worstDay[0], percent: Math.round(worstDay[1]) },
      trend,
      improvementPercent: trend === 'improving'
        ? Math.round(secondHalfPercent - firstHalfPercent)
        : Math.round(firstHalfPercent - secondHalfPercent)
    };
  }

  /**
   * Generate actionable insights
   */
  generateInsights(monthCheckins, stack, metrics) {
    const insights = [];

    // High adherence
    if (metrics.adherencePercent >= 90) {
      insights.push({
        type: 'positive',
        title: '🌟 Excelente aderência!',
        description: `Você manteve ${metrics.adherencePercent}% de aderência este mês. Continue assim!`
      });
    } else if (metrics.adherencePercent >= 75) {
      insights.push({
        type: 'positive',
        title: '✨ Bom trabalho!',
        description: `Você atingiu ${metrics.adherencePercent}% de aderência. Quase lá para 90%!`
      });
    } else if (metrics.adherencePercent < 50) {
      insights.push({
        type: 'warning',
        title: '⚠️ Aderência baixa',
        description: `Você está com ${metrics.adherencePercent}%. Tente configurar lembretes diários.`
      });
    }

    // Trend analysis
    if (metrics.trend === 'improving') {
      insights.push({
        type: 'positive',
        title: '📈 Você está melhorando!',
        description: `Segunda metade do mês foi ${metrics.improvementPercent}% melhor. Parabéns!`
      });
    } else if (metrics.trend === 'declining') {
      insights.push({
        type: 'warning',
        title: '📉 Aderência em declínio',
        description: `Segunda metade foi ${metrics.improvementPercent}% pior. Revise suas estratégias.`
      });
    }

    // Best day pattern
    const bestDayDate = new Date(metrics.bestDay.date);
    const bestDayName = this.getDayName(bestDayDate.getDay());
    insights.push({
      type: 'info',
      title: `Seu melhor dia: ${bestDayName}`,
      description: `${metrics.bestDay.date} - ${metrics.bestDay.percent}% aderência. Continue mantendo esse ritmo!`
    });

    return insights;
  }

  /**
   * Compare with previous month
   */
  getMonthComparison(year, month, allCheckins, stack) {
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const currentMetrics = this.calculateMetrics(
      allCheckins.filter(c => {
        const d = new Date(c.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }),
      stack,
      this.getMonthStart(year, month),
      this.getMonthEnd(year, month)
    );

    const prevMetrics = this.calculateMetrics(
      allCheckins.filter(c => {
        const d = new Date(c.date);
        return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth;
      }),
      stack,
      this.getMonthStart(prevYear, prevMonth),
      this.getMonthEnd(prevYear, prevMonth)
    );

    const improvement = currentMetrics.adherencePercent - prevMetrics.adherencePercent;

    return {
      previousMonth: `${this.getMonthName(prevMonth)} ${prevYear}`,
      previousAdherence: prevMetrics.adherencePercent,
      currentAdherence: currentMetrics.adherencePercent,
      improvement,
      improvementPercent: improvement > 0 ? `+${improvement}%` : `${improvement}%`,
      status: improvement > 0 ? 'improved' : improvement === 0 ? 'stable' : 'declined'
    };
  }

  /**
   * Get top supplements this month
   */
  getTopSupplements(monthCheckins, stack) {
    const bySupp = {};

    monthCheckins.forEach(c => {
      if (!bySupp[c.supplementId]) {
        bySupp[c.supplementId] = 0;
      }
      bySupp[c.supplementId]++;
    });

    return Object.entries(bySupp)
      .map(([suppId, count]) => {
        const supp = stack.find(s => s.supplementId === suppId);
        return {
          name: supp?.name || suppId,
          taken: count,
          percent: Math.round((count / 30) * 100)
        };
      })
      .sort((a, b) => b.taken - a.taken)
      .slice(0, 5);
  }

  /**
   * Generate badges earned
   */
  generateBadges(monthCheckins, stack, metrics) {
    const badges = [];

    if (metrics.adherencePercent === 100) {
      badges.push({
        icon: '🏆',
        name: 'Mês Perfeito',
        description: '100% de aderência por todo o mês'
      });
    }

    if (metrics.perfectDays >= 20) {
      badges.push({
        icon: '⭐',
        name: '20+ Dias Perfeitos',
        description: `${metrics.perfectDays} dias com 100% de aderência`
      });
    }

    if (metrics.adherencePercent >= 90) {
      badges.push({
        icon: '✨',
        name: 'Consistência Excepcional',
        description: 'Manteve mais de 90% de aderência'
      });
    }

    return badges;
  }

  /**
   * Export report as HTML (for email)
   */
  getReportHTML(report) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; color: #333; }
    .header { background: #007AFF; color: white; padding: 20px; }
    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007AFF; }
    .insight { padding: 15px; margin: 10px 0; border-left: 4px solid #007AFF; }
    .insight.warning { border-color: #FF9500; }
    .insight.positive { border-color: #34C759; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Seu Relatório - ${report.monthName} ${report.year}</h1>
    <p>Análise de aderência da suplementação</p>
  </div>

  <div class="metric">
    <div>Aderência do Mês</div>
    <div class="metric-value">${report.metrics.adherencePercent}%</div>
    <div>${report.metrics.totalTaken} de ${report.metrics.totalExpected} tomados</div>
  </div>

  <div class="metric">
    <div>Dias Perfeitos</div>
    <div class="metric-value">${report.metrics.perfectDays}</div>
    <div>Dias com 100% de aderência</div>
  </div>

  <h2>Insights</h2>
  ${report.insights.map(i => `
    <div class="insight ${i.type}">
      <strong>${i.title}</strong>
      <p>${i.description}</p>
    </div>
  `).join('')}

  <h2>Comparação com Mês Anterior</h2>
  <div class="metric">
    <div>${report.comparison.previousMonth}: ${report.comparison.previousAdherence}%</div>
    <div>${report.monthName}: ${report.comparison.currentAdherence}%</div>
    <div style="font-size: 18px; font-weight: bold; color: ${report.comparison.improvement > 0 ? '#34C759' : '#FF3B30'};">
      ${report.comparison.improvementPercent}
    </div>
  </div>

  <h2>Suplementos Mais Tomados</h2>
  ${report.topSupplements.map(s => `
    <div class="metric">
      <div>${s.name}</div>
      <div class="metric-value">${s.taken}x (${s.percent}%)</div>
    </div>
  `).join('')}
</body>
</html>
    `;
  }

  // Utility methods
  getMonthStart(year, month) {
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  getMonthEnd(year, month) {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  getMonthName(month) {
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return names[month - 1];
  }

  getDayName(dayNum) {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return names[dayNum];
  }

  getDayCount(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  getDateOffset(startDate, daysOffset) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  getAdherence(checkins, stack, days) {
    const expected = stack.length * days;
    return expected > 0 ? Math.round((checkins.length / expected) * 100) : 0;
  }
}

export default new ReportGenerator();
