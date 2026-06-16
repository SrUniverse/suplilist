/**
 * Monitoring Service
 *
 * Evaluates alert rules against collected metrics and triggers alerts
 * when thresholds are exceeded.
 *
 * Features:
 * - Periodic rule evaluation
 * - State tracking (to avoid duplicate alerts)
 * - Alert aggregation
 * - SLO monitoring
 * - Metric health checks
 */

import { logger } from '../utils/logger.js';
import { alertingService } from './alerting.service.js';
import { errorMetrics } from './error-metrics.service.js';
import { getEnabledAlertRules, AlertRule } from '../config/alert-rules.config.js';

interface RuleState {
  lastTriggered: number;
  consecutiveFailures: number;
}

const ruleStates = new Map<string, RuleState>();
let monitoringInterval: ReturnType<typeof setInterval> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Service Level Objectives (SLOs)
// ─────────────────────────────────────────────────────────────────────────────

export interface SLO {
  name: string;
  description: string;
  target: number; // percentage
  window: number; // milliseconds
  metric: string;
}

const SLOs: SLO[] = [
  {
    name: 'API Availability',
    description: 'Percentage of successful API requests',
    target: 99.9,
    window: 30 * 24 * 60 * 60 * 1000, // 30 days
    metric: 'availability',
  },
  {
    name: 'Response Time P99',
    description: 'P99 response time under 500ms',
    target: 99.0,
    window: 24 * 60 * 60 * 1000, // 24 hours
    metric: 'response_time_p99',
  },
  {
    name: 'Error Rate',
    description: 'Error rate under 0.1%',
    target: 99.9,
    window: 7 * 24 * 60 * 60 * 1000, // 7 days
    metric: 'error_rate',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring Service
// ─────────────────────────────────────────────────────────────────────────────

export class MonitoringService {
  /**
   * Start monitoring — evaluate rules periodically
   */
  startMonitoring(interval: number = 30 * 1000): void {
    if (monitoringInterval) {
      logger.warn('Monitoring already started');
      return;
    }

    logger.info('Starting monitoring service', { evaluationInterval: interval });

    monitoringInterval = setInterval(() => {
      this.evaluateRules();
      this.evaluateSLOs();
    }, interval);

    // Run immediately on start
    this.evaluateRules();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!monitoringInterval) {
      return;
    }

    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Monitoring stopped');
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    active: boolean;
    rulesEvaluated: number;
    enabledRules: number;
    slos: SLO[];
  } {
    return {
      active: monitoringInterval !== null,
      rulesEvaluated: ruleStates.size,
      enabledRules: getEnabledAlertRules().length,
      slos: SLOs,
    };
  }

  /**
   * Get SLO status
   */
  getSLOStatus(): Record<string, { target: number; current: number; status: string }> {
    const status: Record<string, any> = {};

    for (const slo of SLOs) {
      status[slo.name] = {
        target: slo.target,
        current: this.calculateSLOCurrent(slo),
        status: this.calculateSLOStatus(slo),
      };
    }

    return status;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private evaluateRules(): void {
    const enabledRules = getEnabledAlertRules();

    logger.debug(`Evaluating ${enabledRules.length} alert rules`);

    for (const rule of enabledRules) {
      const triggered = this.evaluateRule(rule);

      if (triggered) {
        this.handleRuleTriggered(rule);
      }
    }
  }

  private evaluateRule(rule: AlertRule): boolean {
    try {
      // Evaluate rule based on type
      if (rule.id.includes('error_rate')) {
        return this.evaluateErrorRateRule(rule);
      }

      if (rule.id.includes('critical_error')) {
        return this.evaluateCriticalErrorRule(rule);
      }

      if (rule.id.includes('auth_error')) {
        return this.evaluateAuthErrorRule(rule);
      }

      // Add more specific evaluators as needed
      logger.debug('No evaluator for rule', { ruleId: rule.id });
      return false;
    } catch (error) {
      logger.error('Error evaluating rule', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private evaluateErrorRateRule(rule: AlertRule): boolean {
    const errorRatio = errorMetrics.getServerErrorRatio();
    return errorRatio > rule.threshold;
  }

  private evaluateCriticalErrorRule(rule: AlertRule): boolean {
    const criticalCount = errorMetrics.getCriticalErrorCount();
    return criticalCount > rule.threshold;
  }

  private evaluateAuthErrorRule(rule: AlertRule): boolean {
    // This would need to query the actual auth error count
    // For now, return false (would need metrics integration)
    return false;
  }

  private handleRuleTriggered(rule: AlertRule): void {
    const state = ruleStates.get(rule.id) || { lastTriggered: 0, consecutiveFailures: 0 };

    // Check if rule triggered recently (deduplication)
    const now = Date.now();
    if (now - state.lastTriggered < rule.duration) {
      logger.debug('Rule already triggered recently', { ruleId: rule.id });
      return;
    }

    // Update state
    state.lastTriggered = now;
    state.consecutiveFailures++;
    ruleStates.set(rule.id, state);

    // Send alert
    alertingService.alert({
      severity: rule.severity,
      title: rule.name,
      description: `${rule.description}\nThreshold: ${rule.threshold}\nDuration: ${rule.duration}ms`,
      metadata: {
        ruleId: rule.id,
        consecutiveFailures: state.consecutiveFailures,
        lastTriggered: new Date(state.lastTriggered).toISOString(),
      },
    });

    logger.warn('Alert rule triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
    });
  }

  private evaluateSLOs(): void {
    for (const slo of SLOs) {
      const current = this.calculateSLOCurrent(slo);
      const status = current >= slo.target ? 'met' : 'breached';

      logger.debug('SLO evaluation', {
        sloName: slo.name,
        target: slo.target,
        current,
        status,
      });

      // Alert if SLO breached
      if (status === 'breached') {
        alertingService.alert({
          severity: 'high',
          title: `SLO Breach: ${slo.name}`,
          description: `${slo.description}\nTarget: ${slo.target}%\nCurrent: ${current.toFixed(2)}%`,
          metadata: {
            sloName: slo.name,
            target: slo.target,
            current: current.toFixed(2),
          },
        });
      }
    }
  }

  private calculateSLOCurrent(slo: SLO): number {
    switch (slo.metric) {
      case 'availability':
        // 100 - error rate = availability
        const errorRatio = errorMetrics.getServerErrorRatio();
        return 100 - errorRatio;

      case 'response_time_p99':
        // This would need actual percentile data
        return 99.0;

      case 'error_rate':
        // Inverse of availability target
        return 100 - errorMetrics.getServerErrorRatio();

      default:
        return 0;
    }
  }

  private calculateSLOStatus(slo: SLO): string {
    const current = this.calculateSLOCurrent(slo);
    return current >= slo.target ? 'met' : 'breached';
  }
}

export const monitoringService = new MonitoringService();

/**
 * Initialize monitoring on module load
 */
export function initializeMonitoring(
  interval: number = 30 * 1000,
  autoStart: boolean = true,
): void {
  if (autoStart && process.env.NODE_ENV !== 'test') {
    monitoringService.startMonitoring(interval);
  }
}
