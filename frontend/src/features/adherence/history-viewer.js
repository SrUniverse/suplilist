/**
 * History Viewer — Long-term trends and progress visualization
 * Shows users their multi-month journey for motivation
 */

import { stateManager } from '../../state/state-manager.js';
import logger from '../../platform/logger.js';

export class HistoryViewer {
  constructor(container) {
    this.container = container;
  }

  mount(months = 6) {
    this.renderHistory(months);
  }

  renderHistory(months) {
    const checkins = stateManager.select(s => s.checkins) || [];
    const stack = stateManager.select(s => s.stack) || [];

    const monthlyData = this.getMonthlyData(checkins, stack, months);
    const trend = this.calculateTrend(monthlyData);

    const html = `
      <div class="history-viewer">
        <div class="history-header">
          <h2>Seu Progresso (${months} meses)</h2>
          ${trend.improving ? `
            <div class="trend-badge improving">
              📈 Melhorando
            </div>
          ` : `
            <div class="trend-badge declining">
              📉 Declínio
            </div>
          `}
        </div>

        ${this.renderTrendChart(monthlyData)}
        ${this.renderMonthlyGrid(monthlyData)}
        ${this.renderInsights(monthlyData, trend)}
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderTrendChart(monthlyData) {
    const maxPercent = 100;
    const chartHeight = 200;

    const points = monthlyData.map((data, idx) => {
      const x = (idx / (monthlyData.length - 1 || 1)) * 400;
      const y = chartHeight - (data.adherence / maxPercent) * chartHeight;
      return { x, y, data };
    });

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return `
      <div class="chart-container">
        <svg viewBox="0 0 450 250" class="trend-chart">
          <!-- Grid lines -->
          <line x1="40" y1="200" x2="430" y2="200" stroke="#e0e0e0" stroke-width="1"/>
          <line x1="40" y1="100" x2="430" y2="100" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="5,5"/>
          <line x1="40" y1="0" x2="430" y2="0" stroke="#e0e0e0" stroke-width="1"/>

          <!-- Y-axis labels -->
          <text x="15" y="205" font-size="12" fill="#999">0%</text>
          <text x="15" y="105" font-size="12" fill="#999">50%</text>
          <text x="10" y="5" font-size="12" fill="#999">100%</text>

          <!-- Path -->
          <path d="${pathData}" stroke="#007AFF" stroke-width="2" fill="none"/>

          <!-- Points -->
          ${points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#007AFF" opacity="0.5"/>
            <circle cx="${p.x}" cy="${p.y}" r="2" fill="white"/>
          `).join('')}

          <!-- X-axis labels -->
          ${monthlyData.map((data, idx) => {
            const x = (idx / (monthlyData.length - 1 || 1)) * 400 + 40;
            return `<text x="${x}" y="225" font-size="11" fill="#999" text-anchor="middle">${data.month}</text>`;
          }).join('')}
        </svg>
      </div>
    `;
  }

  renderMonthlyGrid(monthlyData) {
    return `
      <div class="monthly-grid">
        ${monthlyData.map(data => `
          <div class="month-card">
            <div class="month-header">${data.monthYear}</div>
            <div class="month-metric">
              <div class="percent ${data.adherence >= 80 ? 'high' : data.adherence >= 60 ? 'medium' : 'low'}">
                ${data.adherence}%
              </div>
              <div class="details">
                <span>📅 ${data.totalDays} dias</span>
                <span>✅ ${data.perfectDays} perfeitos</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderInsights(monthlyData, trend) {
    const firstMonth = monthlyData[0];
    const lastMonth = monthlyData[monthlyData.length - 1];
    const improvement = lastMonth.adherence - firstMonth.adherence;
    const averageAdherence = Math.round(
      monthlyData.reduce((sum, m) => sum + m.adherence, 0) / monthlyData.length
    );

    return `
      <div class="insights-section">
        <h3>Análise</h3>

        <div class="insight-card">
          <div class="insight-label">Progresso Total</div>
          <div class="insight-value ${improvement > 0 ? 'positive' : 'negative'}">
            ${improvement > 0 ? '+' : ''}${improvement}%
          </div>
          <div class="insight-desc">
            De ${firstMonth.adherence}% para ${lastMonth.adherence}%
          </div>
        </div>

        <div class="insight-card">
          <div class="insight-label">Aderência Média</div>
          <div class="insight-value">${averageAdherence}%</div>
          <div class="insight-desc">
            Ao longo dos ${monthlyData.length} últimos meses
          </div>
        </div>

        <div class="insight-card">
          <div class="insight-label">Melhor Mês</div>
          <div class="insight-value">${Math.max(...monthlyData.map(m => m.adherence))}%</div>
          <div class="insight-desc">
            ${monthlyData.find(m => m.adherence === Math.max(...monthlyData.map(d => d.adherence)))?.monthYear}
          </div>
        </div>

        ${improvement > 0 ? `
          <div class="motivational-message">
            🎉 Você está em uma tendência de melhora! Mantenha o ritmo!
          </div>
        ` : improvement < 0 ? `
          <div class="motivational-message warning">
            ⚠️ Sua aderência está caindo. Configure lembretes e estabeleça uma rotina.
          </div>
        ` : `
          <div class="motivational-message">
            ➡️ Sua aderência está estável. Tente melhorar no próximo mês!
          </div>
        `}
      </div>
    `;
  }

  getMonthlyData(checkins, stack, months) {
    const monthlyData = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

      const monthCheckins = checkins.filter(c => c.date >= startDate && c.date <= endDate);
      const days = new Date(year, month, 0).getDate();
      const totalExpected = stack.length * days;
      const adherence = totalExpected > 0
        ? Math.round((monthCheckins.length / totalExpected) * 100)
        : 0;

      // Count perfect days
      const byDate = {};
      monthCheckins.forEach(c => {
        if (!byDate[c.date]) byDate[c.date] = [];
        byDate[c.date].push(c);
      });

      let perfectDays = 0;
      Object.values(byDate).forEach(dayCheckins => {
        if (dayCheckins.length === stack.length && stack.length > 0) {
          perfectDays++;
        }
      });

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      monthlyData.push({
        month: monthNames[month - 1],
        monthYear: `${monthNames[month - 1]} ${year}`,
        adherence,
        totalDays: days,
        perfectDays,
        taken: monthCheckins.length,
        expected: totalExpected
      });
    }

    return monthlyData;
  }

  calculateTrend(monthlyData) {
    if (monthlyData.length < 2) {
      return { improving: false, momentum: 0 };
    }

    const firstHalf = monthlyData.slice(0, Math.floor(monthlyData.length / 2));
    const secondHalf = monthlyData.slice(Math.floor(monthlyData.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.adherence, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.adherence, 0) / secondHalf.length;

    return {
      improving: secondAvg > firstAvg,
      momentum: Math.round(secondAvg - firstAvg)
    };
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default HistoryViewer;
