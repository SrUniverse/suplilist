/**
 * Email Reminder Service — Monthly reports via email
 * Sends automatic email on day 1 of each month with adherence summary
 */

import { ReportGenerator } from '../features/reports/report-generator.js';
import { stateManager } from '../state/state-manager.js';
import { logger } from '../utils/logger.js';
import { sanitizeHtml } from './html-sanitizer.js';  // FIX C1: Add HTML sanitization

export class EmailReminderService {
  constructor() {
    this.emailApiUrl = process.env.REACT_APP_EMAIL_API_URL || '/api/email';
    this.appUrl = process.env.REACT_APP_SHARE_URL || 'https://suplilist.app';
    this.isScheduled = false;
  }

  /**
   * Initialize and schedule monthly reminders
   */
  async initialize() {
    this.scheduleMonthlyReport();
    logger.info('Email reminder service initialized');
  }

  /**
   * Schedule monthly report email
   */
  scheduleMonthlyReport() {
    // Check if today is day 1 of month
    const today = new Date();
    if (today.getDate() === 1) {
      this.sendMonthlyReportEmail();
    }

    // Schedule for tomorrow if today is day 1
    // Otherwise schedule for day 1 next month
    const nextCheck = this.getNextFirstDayOfMonth();
    const msUntilNext = nextCheck.getTime() - Date.now();

    setTimeout(() => {
      this.sendMonthlyReportEmail();
      this.scheduleMonthlyReport(); // Reschedule
    }, msUntilNext);

    logger.info(`Monthly report email scheduled for ${nextCheck.toLocaleDateString()}`);
  }

  /**
   * Get date of next first day of month
   */
  getNextFirstDayOfMonth() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * Send monthly report via email
   */
  async sendMonthlyReportEmail() {
    try {
      const profile = stateManager.select(s => s.profile);
      if (!profile?.email) {
        logger.warn('No email configured for monthly report');
        return;
      }

      // Get last month's date
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      // Generate report
      const report = ReportGenerator.generateMonthlyReport(year, month);
      const reportHtml = ReportGenerator.getReportHTML(report);

      // Send email
      const response = await this.sendEmail({
        to: profile.email,
        subject: `Seu Relatório de Aderência - ${report.monthName} ${report.year}`,
        htmlBody: reportHtml,
        textBody: this.generatePlainText(report)
      });

      logger.info(`Monthly report email sent to ${profile.email}`);
      return response;
    } catch (error) {
      logger.error('Failed to send monthly report email', error);
    }
  }

  /**
   * Send reminder email for specific supplement
   */
  async sendSupplementReminderEmail(supplementName, email) {
    try {
      // FIX C1: Sanitize supplement name to prevent XSS
      const sanitizedName = sanitizeHtml(supplementName);
      const safeAppUrl = this.appUrl.replace(/[<>"']/g, '');

      const html = `
        <h2>Lembrete de Suplementação</h2>
        <p>É hora de tomar seu <strong>${sanitizedName}</strong>!</p>
        <p>Mantenha sua aderência em dia para melhores resultados.</p>
        <a href="${safeAppUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007AFF; color: white; text-decoration: none; border-radius: 5px;">
          Abrir SupliList
        </a>
      `;

      return await this.sendEmail({
        to: email,
        subject: `Lembrete: Hora de tomar ${sanitizedName}`,
        htmlBody: html,
        textBody: `É hora de tomar seu ${sanitizedName}!`
      });
    } catch (error) {
      logger.error(`Failed to send supplement reminder email for ${supplementName}`, error);
    }
  }

  /**
   * Send email via API
   */
  async sendEmail(params) {
    try {
      const response = await fetch(this.emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: params.htmlBody,
          text: params.textBody
        })
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Email send failed', error);
      throw error;
    }
  }

  /**
   * Generate plain text version of report
   */
  generatePlainText(report) {
    const metrics = report.metrics;
    const insights = report.insights.map(i => `- ${i.title}: ${i.description}`).join('\n');

    return `
Seu Relatório - ${report.monthName} ${report.year}

Aderência: ${metrics.adherencePercent}%
Dias Perfeitos: ${metrics.perfectDays}
Tendência: ${metrics.trend === 'improving' ? 'Melhorando' : 'Declínio'}

Insights:
${insights}

Comparação com mês anterior:
${report.comparison.previousMonth}: ${report.comparison.previousAdherence}%
${report.monthName}: ${report.comparison.currentAdherence}%
Melhora: ${report.comparison.improvementPercent}

Acesse SupliList para mais detalhes.
    `;
  }

  /**
   * Get auth token from state or storage
   */
  getAuthToken() {
    return stateManager.select(s => s.auth?.token) || localStorage.getItem('authToken');
  }

  /**
   * Get email service status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.emailApiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        return { connected: false };
      }

      const data = await response.json();
      return { connected: true, ...data };
    } catch (error) {
      logger.warn('Email service status check failed', error);
      return { connected: false };
    }
  }

  /**
   * Verify email address is valid
   */
  verifyEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Unsubscribe from email reminders
   */
  async unsubscribeFromReminders() {
    try {
      const profile = stateManager.select(s => s.profile);
      const response = await fetch(`${this.emailApiUrl}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          email: profile.email
        })
      });

      logger.info('Unsubscribed from email reminders');
      return response.ok;
    } catch (error) {
      logger.error('Failed to unsubscribe', error);
      return false;
    }
  }
}

export default new EmailReminderService();
