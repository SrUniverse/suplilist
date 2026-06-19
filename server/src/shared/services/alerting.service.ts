/**
 * Alerting Service
 *
 * Centralized alert management with:
 * - Alert severity classification
 * - Alert deduplication
 * - Multi-channel notification (Slack, PagerDuty, Webhook)
 * - Alert throttling to prevent spam
 * - Alert history tracking
 *
 * Configuration via environment variables:
 * - SLACK_WEBHOOK_URL: Slack webhook for alerts
 * - PAGERDUTY_INTEGRATION_KEY: PagerDuty integration key
 * - ALERT_WEBHOOK_URL: Custom webhook for alerts
 * - ALERT_MIN_LEVEL: Minimum severity level (critical|high|medium|low)
 */

import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  severity: AlertSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

interface InternalAlert extends Alert {
  id: string;
  timestamp: Date;
  hash: string;
}

// Alert deduplication tracking
const recentAlerts = new Map<string, InternalAlert>();
const DEDUP_WINDOW = 5 * 60 * 1000; // 5 minute deduplication window
const ALERT_HISTORY_LIMIT = 1000;
const alertHistory: InternalAlert[] = [];

// Cleanup old alerts periodically
setInterval(() => {
  const now = Date.now();
  for (const [hash, alert] of recentAlerts.entries()) {
    if (now - alert.timestamp.getTime() > DEDUP_WINDOW) {
      recentAlerts.delete(hash);
    }
  }

  // Trim history
  while (alertHistory.length > ALERT_HISTORY_LIMIT) {
    alertHistory.shift();
  }
}, 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Alerting Service
// ─────────────────────────────────────────────────────────────────────────────

export class AlertingService {
  /**
   * Send an alert
   */
  async alert(alert: Alert): Promise<void> {
    const internalAlert = this.enrichAlert(alert);

    // Check if already alerted in dedup window
    if (recentAlerts.has(internalAlert.hash)) {
      logger.debug('Alert deduplicated', { alertId: internalAlert.id });
      return;
    }

    // Check minimum severity level
    if (!this.shouldAlert(internalAlert.severity)) {
      logger.debug('Alert below minimum severity threshold', {
        severity: internalAlert.severity,
      });
      return;
    }

    // Add to recent alerts
    recentAlerts.set(internalAlert.hash, internalAlert);
    alertHistory.push(internalAlert);

    // Log alert
    logger.warn('Alert triggered', {
      alertId: internalAlert.id,
      severity: internalAlert.severity,
      title: internalAlert.title,
      description: internalAlert.description,
      metadata: internalAlert.metadata,
    });

    // Send to notification channels
    await Promise.allSettled([
      this.sendToSlack(internalAlert),
      this.sendToPagerDuty(internalAlert),
      this.sendToWebhook(internalAlert),
    ]);
  }

  /**
   * Get alert history
   */
  getHistory(limit: number = 100): InternalAlert[] {
    return alertHistory.slice(-limit);
  }

  /**
   * Get recent alerts (in dedup window)
   */
  getRecentAlerts(): InternalAlert[] {
    return Array.from(recentAlerts.values());
  }

  /**
   * Clear alert deduplication for a specific alert
   */
  clearAlertDedup(alertHash: string): void {
    recentAlerts.delete(alertHash);
    logger.info('Alert deduplication cleared', { alertHash });
  }

  /**
   * Get alert hash for a title/description combination
   */
  getAlertHash(title: string, description: string): string {
    return createHash('md5')
      .update(`${title}::${description}`)
      .digest('hex');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private enrichAlert(alert: Alert): InternalAlert {
    return {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      hash: this.getAlertHash(alert.title, alert.description),
    };
  }

  private shouldAlert(severity: AlertSeverity): boolean {
    const minLevel = process.env.ALERT_MIN_LEVEL || 'medium';
    const levels: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
    const minLevelIndex = levels.indexOf(minLevel as AlertSeverity);
    const severityIndex = levels.indexOf(severity);

    return severityIndex <= minLevelIndex;
  }

  private async sendToSlack(alert: InternalAlert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const payload = {
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.description,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Time',
                value: alert.timestamp.toISOString(),
                short: true,
              },
              ...(alert.metadata
                ? [
                    {
                      title: 'Details',
                      value: JSON.stringify(alert.metadata, null, 2),
                      short: false,
                    },
                  ]
                : []),
            ],
            footer: 'SupliList Alerting System',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Failed to send Slack alert', {
          status: response.status,
          alertId: alert.id,
        });
      }
    } catch (error) {
      logger.error('Error sending Slack alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendToPagerDuty(alert: InternalAlert): Promise<void> {
    const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;
    if (!integrationKey) {
      return;
    }

    try {
      const payload = {
        routing_key: integrationKey,
        event_action: 'trigger',
        dedup_key: alert.hash,
        payload: {
          summary: alert.title,
          severity: this.mapSeverityToPagerDuty(alert.severity),
          source: 'suplilist-api',
          timestamp: alert.timestamp.toISOString(),
          custom_details: {
            description: alert.description,
            ...alert.metadata,
          },
        },
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Failed to send PagerDuty alert', {
          status: response.status,
          alertId: alert.id,
        });
      }
    } catch (error) {
      logger.error('Error sending PagerDuty alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendToWebhook(alert: InternalAlert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    try {
      const payload = {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Failed to send webhook alert', {
          status: response.status,
          alertId: alert.id,
        });
      }
    } catch (error) {
      logger.error('Error sending webhook alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '#FF0000'; // Red
      case 'high':
        return '#FF6600'; // Orange
      case 'medium':
        return '#FFAA00'; // Yellow
      case 'low':
        return '#00AA00'; // Green
      default:
        return '#999999'; // Gray
    }
  }

  private mapSeverityToPagerDuty(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }
}

export const alertingService = new AlertingService();
