/**
 * Adherence Dashboard — Visual progress tracking for retention
 * Shows user their compliance journey to keep them engaged
 */

import { stateManager } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import logger from '../../platform/logger.js';

export class AdherenceDashboard {
  constructor(container) {
    this.container = container;
    this.state = null;
  }

  mount() {
    this.state = stateManager.select(s => s);
    this.renderDashboard();
    this.attachListeners();
  }

  renderDashboard() {
    const checkins = this.state.checkins || [];
    const stack = this.state.stack || [];

    const html = `
      <div class="adherence-dashboard">
        <div class="dashboard-header">
          <h2>Seu Progresso</h2>
          <p class="timestamp">Atualizado hoje</p>
        </div>

        ${this.renderMainMetrics(checkins, stack)}
        ${this.renderStreak(checkins)}
        ${this.renderWeeklyChart(checkins)}
        ${this.renderMonthlyChart(checkins)}
        ${this.renderBadges(checkins)}
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderMainMetrics(checkins, stack) {
    const today = this.getToday();
    const sevenDaysAgo = this.getDateOffset(-6);
    const thirtyDaysAgo = this.getDateOffset(-29);

    // This week aderência
    const weekCheckins = checkins.filter(c => c.date >= sevenDaysAgo);
    const weekAdherence = this.calculateAdherence(weekCheckins, stack, 7);

    // This month aderência
    const monthCheckins = checkins.filter(c => c.date >= thirtyDaysAgo);
    const monthAdherence = this.calculateAdherence(monthCheckins, stack, 30);

    // Today
    const todayCheckins = checkins.filter(c => c.date === today);
    const todayPercent = stack.length > 0
      ? ((todayCheckins.length / stack.length) * 100).toFixed(0)
      : 0;

    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${todayPercent}%</div>
          <div class="metric-label">Hoje</div>
          <div class="metric-meta">${todayCheckins.length} de ${stack.length}</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">${weekAdherence}%</div>
          <div class="metric-label">Esta Semana</div>
          <div class="metric-meta">${weekCheckins.length} de ${stack.length * 7}</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">${monthAdherence}%</div>
          <div class="metric-label">Este Mês</div>
          <div class="metric-meta">${monthCheckins.length} de ${stack.length * 30}</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">${stack.length}</div>
          <div class="metric-label">Suplementos</div>
          <div class="metric-meta">Ativos</div>
        </div>
      </div>
    `;
  }

  renderStreak(checkins) {
    const streak = this.calculateStreak(checkins);
    const record = this.getStreakRecord(checkins);

    const streakIcon = streak >= 7 ? '🔥' : streak >= 3 ? '⭐' : '📅';

    return `
      <div class="streak-card">
        <div class="streak-container">
          <div class="streak-current">
            <span class="streak-icon">${streakIcon}</span>
            <div class="streak-text">
              <div class="streak-number">${streak}</div>
              <div class="streak-label">Dias Consecutivos</div>
            </div>
          </div>

          <div class="streak-record">
            <span>Recorde: ${record} dias</span>
          </div>
        </div>

        <div class="streak-progress">
          <div class="progress-bar" style="width: ${Math.min(100, (streak / 30) * 100)}%"></div>
        </div>

        ${streak >= 7 ? `
          <div class="achievement-unlock">
            🏆 Desbloqueado: "Uma Semana Perfeita"
          </div>
        ` : ''}
      </div>
    `;
  }

  renderWeeklyChart(checkins) {
    const today = this.getToday();
    const weekDays = [];

    for (let i = 6; i >= 0; i--) {
      const date = this.getDateOffset(-i);
      const dayCheckins = checkins.filter(c => c.date === date);
      const stack = stateManager.select(s => s.stack) || [];
      const percent = stack.length > 0
        ? ((dayCheckins.length / stack.length) * 100)
        : 0;

      const dayName = this.getDayName(new Date(date + 'T00:00:00'));

      weekDays.push({
        date,
        dayName,
        percent,
        isToday: date === today
      });
    }

    return `
      <div class="chart-card">
        <h3>Últimos 7 Dias</h3>
        <div class="weekly-chart">
          ${weekDays.map(day => `
            <div class="day-column ${day.isToday ? 'today' : ''}">
              <div class="day-bar">
                <div class="bar-fill" style="height: ${day.percent}%"></div>
              </div>
              <div class="day-percent">${Math.round(day.percent)}%</div>
              <div class="day-name">${day.dayName}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderMonthlyChart(checkins) {
    const weeks = [];
    const thirtyDaysAgo = this.getDateOffset(-29);

    // Group by week
    for (let i = 0; i < 4; i++) {
      const weekStart = this.getDateOffset(-29 + (i * 7));
      const weekEnd = this.getDateOffset(-29 + ((i + 1) * 7) - 1);

      const weekCheckins = checkins.filter(c => {
        return c.date >= weekStart && c.date <= weekEnd;
      });

      const stack = stateManager.select(s => s.stack) || [];
      const expectedCheckins = stack.length * 7;
      const weekPercent = expectedCheckins > 0
        ? Math.round((weekCheckins.length / expectedCheckins) * 100)
        : 0;

      weeks.push({
        number: i + 1,
        percent: weekPercent,
        checkins: weekCheckins.length
      });
    }

    return `
      <div class="chart-card">
        <h3>Este Mês</h3>
        <div class="monthly-chart">
          ${weeks.map(week => `
            <div class="week-container">
              <div class="week-bar">
                <div class="bar-fill" style="width: ${week.percent}%"></div>
              </div>
              <div class="week-info">
                <span class="week-label">Semana ${week.number}</span>
                <span class="week-percent">${week.percent}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderBadges(checkins) {
    const badges = this.unlockBadges(checkins);

    return `
      <div class="badges-card">
        <h3>Conquistas</h3>
        <div class="badges-grid">
          ${badges.map(badge => `
            <div class="badge ${badge.unlocked ? 'unlocked' : 'locked'}">
              <div class="badge-icon">${badge.icon}</div>
              <div class="badge-name">${badge.name}</div>
              <div class="badge-desc">${badge.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  calculateAdherence(checkins, stack, days) {
    if (stack.length === 0) return 0;

    const expected = stack.length * days;
    const actual = checkins.length;

    return Math.round((actual / expected) * 100);
  }

  calculateStreak(checkins) {
    const today = this.getToday();
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const checkDate = this.getDateOffset(-i);
      const dayCheckins = checkins.filter(c => c.date === checkDate);
      const stack = stateManager.select(s => s.stack) || [];

      // Se todos foram tomados este dia
      if (dayCheckins.length === stack.length && stack.length > 0) {
        streak++;
      } else if (checkDate !== today) {
        // Pare se não for hoje
        break;
      }
    }

    return streak;
  }

  getStreakRecord(checkins) {
    const stack = stateManager.select(s => s.stack) || [];
    if (stack.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;

    // Group checkins by date
    const byDate = {};
    checkins.forEach(c => {
      if (!byDate[c.date]) byDate[c.date] = [];
      byDate[c.date].push(c);
    });

    // Sort dates
    const sortedDates = Object.keys(byDate).sort();

    // Calculate streaks
    sortedDates.forEach((date, idx) => {
      if (byDate[date].length === stack.length) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0;
      }
    });

    maxStreak = Math.max(maxStreak, currentStreak);

    return maxStreak;
  }

  unlockBadges(checkins) {
    const badges = [
      {
        id: 'first-week',
        name: 'Primeira Semana',
        description: '7 dias perfeitos',
        icon: '📅',
        condition: () => this.calculateStreak(checkins) >= 7
      },
      {
        id: 'consistency',
        name: 'Consistência',
        description: '30 dias seguidos',
        icon: '🔥',
        condition: () => this.calculateStreak(checkins) >= 30
      },
      {
        id: 'commitment',
        name: 'Comprometimento',
        description: '90 dias seguidos',
        icon: '💪',
        condition: () => this.calculateStreak(checkins) >= 90
      },
      {
        id: 'perfect-month',
        name: 'Mês Perfeito',
        description: '30 dias 100%',
        icon: '⭐',
        condition: () => {
          const thirtyDaysAgo = this.getDateOffset(-29);
          const monthCheckins = checkins.filter(c => c.date >= thirtyDaysAgo);
          const stack = stateManager.select(s => s.stack) || [];
          return monthCheckins.length === stack.length * 30 && stack.length > 0;
        }
      },
      {
        id: 'community',
        name: 'Parte da Comunidade',
        description: 'Completou onboarding',
        icon: '👥',
        condition: () => stateManager.select(s => s.profile?.onboardingComplete)
      }
    ];

    return badges.map(badge => ({
      ...badge,
      unlocked: badge.condition()
    }));
  }

  // Utility methods
  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  getDateOffset(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  getDayName(date) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return days[date.getDay()];
  }

  attachListeners() {
    logger.info('Adherence dashboard mounted');
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default AdherenceDashboard;
