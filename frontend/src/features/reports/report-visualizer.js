/**
 * Report Visualizer — Beautiful charts and achievement visualizations
 * Displays heatmap, trends, streaks, and badges
 */

import { stateManager } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

export class ReportVisualizer {
  constructor(container) {
    this.container = container;
    this.dashboardData = null;
    this.isLoading = false;
  }

  async mount() {
    this._injectStyles();
    await this._loadDashboard();
    this._render();
  }

  async _loadDashboard() {
    try {
      this.isLoading = true;
      const token = stateManager.select(s => s.auth?.token);

      const response = await fetch('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        this.dashboardData = data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error('[ReportVisualizer] Error loading dashboard:', error);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Erro ao carregar relatório',
        type: 'error'
      });
    } finally {
      this.isLoading = false;
    }
  }

  _render() {
    if (!this.dashboardData) {
      this.container.innerHTML = `
        <div class="report-error">
          <p>Erro ao carregar relatório. Tente novamente.</p>
        </div>
      `;
      return;
    }

    const { streak, achievements, heatmap, trend, currentMonth } = this.dashboardData;

    const html = `
      <div class="report-root">
        <!-- Header -->
        <div class="report-header">
          <h1 class="report-title">📊 Seu Progresso</h1>
          <p class="report-subtitle">Veja sua jornada de aderência visualizada</p>
        </div>

        <!-- Key Metrics -->
        <div class="report-metrics">
          ${this._renderMetricCard(
            '🔥 Streak Atual',
            streak.currentStreak,
            'dias',
            '#FF6B6B'
          )}
          ${this._renderMetricCard(
            '⭐ Melhor Streak',
            streak.longestStreak,
            'dias',
            '#4ECDC4'
          )}
          ${this._renderMetricCard(
            '📝 Total de Registros',
            streak.totalCheckins,
            'check-ins',
            '#95E1D3'
          )}
          ${this._renderMetricCard(
            '✓ Aderência Mês',
            currentMonth?.adherence || 0,
            '%',
            '#A8E6CF'
          )}
        </div>

        <!-- Achievements -->
        ${achievements.length > 0 ? `
          <div class="report-card">
            <h2 class="report-section-title">🏆 Conquistas Desbloqueadas</h2>
            <div class="report-achievements">
              ${achievements.map(a => `
                <div class="report-badge" title="${a.description}">
                  <span class="report-badge-icon">${a.name.split(' ')[0]}</span>
                  <span class="report-badge-name">${a.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Heatmap -->
        <div class="report-card">
          <h2 class="report-section-title">📅 Últimos 30 dias</h2>
          <div class="report-heatmap">
            ${this._renderHeatmap(heatmap)}
          </div>
          <div class="report-heatmap-legend">
            <span class="legend-item"><span class="legend-box" style="background:#EBEDF0"></span> Nenhum</span>
            <span class="legend-item"><span class="legend-box" style="background:#C6E48B"></span> Baixo</span>
            <span class="legend-item"><span class="legend-box" style="background:#7BC67B"></span> Médio</span>
            <span class="legend-item"><span class="legend-box" style="background:#239A3B"></span> Alto</span>
            <span class="legend-item"><span class="legend-box" style="background:#0E4429"></span> Perfeito</span>
          </div>
        </div>

        <!-- Trend Chart -->
        <div class="report-card">
          <h2 class="report-section-title">📈 Tendência (últimos 6 meses)</h2>
          <div class="report-chart">
            ${this._renderTrendChart(trend)}
          </div>
        </div>

        <!-- Monthly Summary -->
        ${currentMonth ? `
          <div class="report-card report-card--summary">
            <h2 class="report-section-title">📊 Resumo do Mês</h2>
            <div class="report-summary">
              <div class="summary-item">
                <span class="summary-label">Dias Ativos</span>
                <span class="summary-value">${currentMonth.daysActive}/${currentMonth.totalDays}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Aderência</span>
                <span class="summary-value" style="color: ${this._getStreakColor(currentMonth.adherence)}">${currentMonth.adherence}%</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Média de Check-ins</span>
                <span class="summary-value">${currentMonth.avgCheckinsPerDay}/dia</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Export -->
        <div class="report-card report-card--action">
          <button id="btn-export-pdf" class="report-btn-export">
            📥 Exportar Relatório (PDF)
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this._attachListeners();
  }

  _renderMetricCard(label, value, unit, color) {
    return `
      <div class="report-metric-card" style="border-left-color: ${color}">
        <div class="metric-label">${label}</div>
        <div class="metric-value">
          <span class="metric-number">${value}</span>
          <span class="metric-unit">${unit}</span>
        </div>
      </div>
    `;
  }

  _renderHeatmap(data) {
    if (!data || data.length === 0) {
      return '<p class="report-empty">Sem dados de heatmap</p>';
    }

    const weeks = {};
    data.forEach(day => {
      const date = new Date(day.date);
      const weekNum = Math.floor((date.getDate() - 1) / 7);
      if (!weeks[weekNum]) weeks[weekNum] = [];
      weeks[weekNum].push(day);
    });

    return `
      <div class="heatmap-grid">
        ${Object.values(weeks).map((week, idx) => `
          <div class="heatmap-week">
            ${week.map(day => {
              const colors = {
                'none': '#EBEDF0',
                'low': '#C6E48B',
                'medium-low': '#7BC67B',
                'medium': '#3D8B56',
                'high': '#239A3B',
                'perfect': '#0E4429'
              };
              return `
                <div class="heatmap-day" style="background: ${colors[day.intensity]}"
                  title="${day.date}: ${day.adherence}%">
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  _renderTrendChart(trend) {
    if (!trend || trend.length === 0) {
      return '<p class="report-empty">Sem dados de tendência</p>';
    }

    const maxAdherence = 100;
    const chartHeight = 180;

    return `
      <div class="trend-chart">
        <svg viewBox="0 0 600 200" class="trend-svg">
          <!-- Grid lines -->
          ${[0, 25, 50, 75, 100].map(val => `
            <line x1="40" y1="${chartHeight - (val / maxAdherence) * chartHeight}"
              x2="590" y2="${chartHeight - (val / maxAdherence) * chartHeight}"
              stroke="#EBEDF0" stroke-dasharray="2,2" stroke-width="1" />
          `).join('')}

          <!-- Data line -->
          <polyline points="${this._getTrendPoints(trend, chartHeight).join(' ')}"
            fill="none" stroke="#8B5CF6" stroke-width="2" vector-effect="non-scaling-stroke" />

          <!-- Data points -->
          ${trend.map((t, i) => {
            const x = 40 + (i / (trend.length - 1)) * 550;
            const y = chartHeight - (t.adherence / maxAdherence) * chartHeight;
            return `
              <circle cx="${x}" cy="${y}" r="4" fill="#8B5CF6" />
              <text x="${x}" y="${chartHeight + 20}" text-anchor="middle" font-size="10" fill="#666">
                ${t.monthName.split(' ')[0]}
              </text>
              <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">
                ${t.adherence}%
              </text>
            `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  _getTrendPoints(trend, chartHeight) {
    const maxAdherence = 100;
    return trend.map((t, i) => {
      const x = 40 + (i / (trend.length - 1)) * 550;
      const y = chartHeight - (t.adherence / maxAdherence) * chartHeight;
      return `${x},${y}`;
    });
  }

  _getStreakColor(value) {
    if (value >= 90) return '#22C55E';
    if (value >= 70) return '#FBBF24';
    if (value >= 50) return '#F97316';
    return '#EF4444';
  }

  _attachListeners() {
    this.container.querySelector('#btn-export-pdf')?.addEventListener('click', async () => {
      await this._exportPDF();
    });
  }

  async _exportPDF() {
    try {
      const btn = this.container.querySelector('#btn-export-pdf');
      btn.disabled = true;
      btn.textContent = '⏳ Gerando PDF...';

      // Generate PDF content
      const pdfContent = this._generatePDFContent();

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-aderencia-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: '✓ Relatório exportado!',
        type: 'success'
      });

      btn.disabled = false;
      btn.textContent = '📥 Exportar Relatório (PDF)';
    } catch (error) {
      logger.error('[ReportVisualizer] Error exporting PDF:', error);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Erro ao exportar relatório',
        type: 'error'
      });
    }
  }

  _generatePDFContent() {
    const { streak, achievements, currentMonth } = this.dashboardData;
    const now = new Date();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Aderência - SupliList</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #8B5CF6; margin-bottom: 10px; }
          .subtitle { color: #999; font-size: 14px; margin-bottom: 30px; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
          .metric { padding: 20px; background: #F3F4F6; border-radius: 8px; border-left: 4px solid #8B5CF6; }
          .metric-label { color: #666; font-size: 12px; text-transform: uppercase; }
          .metric-value { font-size: 28px; font-weight: bold; margin-top: 8px; }
          .achievements { margin: 40px 0; }
          .badge { display: inline-block; padding: 10px 20px; background: #F0F0F0; border-radius: 20px; margin-right: 10px; margin-bottom: 10px; font-size: 14px; }
          .summary { margin: 30px 0; padding: 20px; background: #F9FAFB; border-radius: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 15px; }
          .summary-item { text-align: center; }
          .summary-item-label { font-size: 12px; color: #999; text-transform: uppercase; }
          .summary-item-value { font-size: 20px; font-weight: bold; color: #8B5CF6; margin-top: 5px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #EBEDF0; color: #999; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📊 Relatório de Aderência</h1>
        <div class="subtitle">Gerado em ${now.toLocaleDateString('pt-BR')} • SupliList</div>

        <div class="metrics">
          <div class="metric">
            <div class="metric-label">🔥 Streak Atual</div>
            <div class="metric-value">${streak.currentStreak} dias</div>
          </div>
          <div class="metric">
            <div class="metric-label">⭐ Melhor Streak</div>
            <div class="metric-value">${streak.longestStreak} dias</div>
          </div>
          <div class="metric">
            <div class="metric-label">📝 Total de Registros</div>
            <div class="metric-value">${streak.totalCheckins}</div>
          </div>
          <div class="metric">
            <div class="metric-label">✓ Aderência Mês</div>
            <div class="metric-value">${currentMonth?.adherence || 0}%</div>
          </div>
        </div>

        ${achievements.length > 0 ? `
          <div class="achievements">
            <h2>🏆 Conquistas Desbloqueadas</h2>
            ${achievements.map(a => `<span class="badge">${a.name}</span>`).join('')}
          </div>
        ` : ''}

        ${currentMonth ? `
          <div class="summary">
            <h2>📊 Resumo do Mês</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-item-label">Dias Ativos</div>
                <div class="summary-item-value">${currentMonth.daysActive}/${currentMonth.totalDays}</div>
              </div>
              <div class="summary-item">
                <div class="summary-item-label">Aderência</div>
                <div class="summary-item-value">${currentMonth.adherence}%</div>
              </div>
              <div class="summary-item">
                <div class="summary-item-label">Média Diária</div>
                <div class="summary-item-value">${currentMonth.avgCheckinsPerDay}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          Mantenha a consistência e veja seu progresso crescer! 💪
        </div>
      </body>
      </html>
    `;
  }

  _injectStyles() {
    if (document.getElementById('report-visualizer-styles')) return;

    const style = document.createElement('style');
    style.id = 'report-visualizer-styles';
    style.textContent = `
      .report-root {
        padding: 20px 16px 100px;
        max-width: 800px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
      }

      .report-header {
        margin-bottom: 32px;
      }

      .report-title {
        font-size: 28px;
        font-weight: 800;
        margin: 0 0 8px;
        color: var(--color-text-primary);
      }

      .report-subtitle {
        font-size: 14px;
        color: var(--color-text-muted);
        margin: 0;
      }

      .report-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 32px;
      }

      .report-metric-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-left: 4px solid;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .metric-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metric-value {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .metric-number {
        font-size: 24px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .metric-unit {
        font-size: 12px;
        color: var(--color-text-muted);
      }

      .report-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
      }

      .report-card--summary {
        background: linear-gradient(135deg, var(--color-brand-muted, rgba(139,92,246,0.08)) 0%, transparent 100%);
      }

      .report-card--action {
        display: flex;
        justify-content: center;
      }

      .report-section-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 16px;
        color: var(--color-text-primary);
      }

      .report-achievements {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .report-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
      }

      .report-badge-icon {
        font-size: 16px;
      }

      .report-heatmap {
        margin-bottom: 16px;
      }

      .heatmap-grid {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      .heatmap-week {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .heatmap-day {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        cursor: pointer;
        transition: opacity 150ms;
      }

      .heatmap-day:hover {
        opacity: 0.8;
      }

      .report-heatmap-legend {
        display: flex;
        gap: 12px;
        font-size: 12px;
        flex-wrap: wrap;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-muted);
      }

      .legend-box {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      .report-chart {
        background: var(--color-bg-primary);
        border-radius: 12px;
        padding: 16px;
        overflow-x: auto;
      }

      .trend-svg {
        width: 100%;
        height: 200px;
        min-width: 400px;
      }

      .report-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 12px;
      }

      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-align: center;
      }

      .summary-label {
        font-size: 12px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        font-weight: 600;
      }

      .summary-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-brand);
      }

      .report-btn-export {
        padding: 12px 24px;
        background: var(--color-brand);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 150ms;
        font-family: 'Inter', sans-serif;
      }

      .report-btn-export:hover {
        background: var(--color-brand-hover);
      }

      .report-btn-export:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .report-empty {
        text-align: center;
        padding: 40px;
        color: var(--color-text-muted);
      }

      .report-error {
        text-align: center;
        padding: 40px;
        color: var(--color-error);
      }

      @media (max-width: 600px) {
        .report-metrics {
          grid-template-columns: repeat(2, 1fr);
        }

        .report-summary {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

export default ReportVisualizer;
