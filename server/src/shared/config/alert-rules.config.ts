/**
 * Alert Rules Configuration
 *
 * Defines thresholds and rules for automatic alerting based on:
 * - Error rates
 * - Response times
 * - Service availability
 * - Resource usage
 * - Business metrics
 *
 * Rules are evaluated by the monitoring service and trigger alerts
 * when thresholds are exceeded.
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: string; // Prometheus query or custom condition
  threshold: number;
  duration: number; // milliseconds
  evaluationInterval: number; // milliseconds
}

/**
 * Alert rules for error monitoring
 */
export const ERROR_ALERT_RULES: AlertRule[] = [
  {
    id: 'error_rate_high',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5% on an endpoint',
    enabled: true,
    severity: 'high',
    condition: 'error_rate_by_endpoint > 5',
    threshold: 5,
    duration: 5 * 60 * 1000, // 5 minutes
    evaluationInterval: 1 * 60 * 1000, // 1 minute
  },
  {
    id: 'critical_error_spike',
    name: 'Critical Error Spike',
    description: 'More than 10 critical errors in last minute',
    enabled: true,
    severity: 'critical',
    condition: 'critical_errors_count > 10',
    threshold: 10,
    duration: 1 * 60 * 1000, // 1 minute
    evaluationInterval: 30 * 1000, // 30 seconds
  },
  {
    id: 'server_error_ratio',
    name: 'High Server Error Ratio',
    description: 'Server errors (5xx) exceed 10% of total errors',
    enabled: true,
    severity: 'high',
    condition: 'server_error_ratio > 10',
    threshold: 10,
    duration: 5 * 60 * 1000, // 5 minutes
    evaluationInterval: 2 * 60 * 1000, // 2 minutes
  },
  {
    id: 'auth_error_spike',
    name: 'Authentication Error Spike',
    description: 'More than 20 auth errors in 5 minutes',
    enabled: true,
    severity: 'medium',
    condition: 'auth_errors_total > 20',
    threshold: 20,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
];

/**
 * Alert rules for performance monitoring
 */
export const PERFORMANCE_ALERT_RULES: AlertRule[] = [
  {
    id: 'slow_request_rate',
    name: 'High Slow Request Rate',
    description: 'More than 20% of requests exceed 2 seconds',
    enabled: true,
    severity: 'medium',
    condition: 'slow_request_rate > 20',
    threshold: 20,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
  {
    id: 'p95_latency_high',
    name: 'High P95 Latency',
    description: 'P95 response time exceeds 1 second',
    enabled: true,
    severity: 'medium',
    condition: 'http_request_duration_seconds{quantile="0.95"} > 1',
    threshold: 1,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
  {
    id: 'db_query_slow',
    name: 'Slow Database Queries',
    description: 'More than 10% of DB queries exceed 500ms',
    enabled: true,
    severity: 'medium',
    condition: 'db_slow_query_ratio > 10',
    threshold: 10,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
];

/**
 * Alert rules for availability monitoring
 */
export const AVAILABILITY_ALERT_RULES: AlertRule[] = [
  {
    id: 'service_down',
    name: 'Service Unavailable',
    description: 'Health check failing for more than 30 seconds',
    enabled: true,
    severity: 'critical',
    condition: 'health_status < 1',
    threshold: 0,
    duration: 30 * 1000,
    evaluationInterval: 10 * 1000,
  },
  {
    id: 'mongodb_down',
    name: 'MongoDB Connection Lost',
    description: 'MongoDB connection status is down',
    enabled: true,
    severity: 'critical',
    condition: 'mongodb_status = 0',
    threshold: 0,
    duration: 10 * 1000,
    evaluationInterval: 5 * 1000,
  },
  {
    id: 'redis_down',
    name: 'Redis Connection Lost',
    description: 'Redis connection status is down',
    enabled: true,
    severity: 'high',
    condition: 'redis_status = 0',
    threshold: 0,
    duration: 10 * 1000,
    evaluationInterval: 5 * 1000,
  },
  {
    id: 'external_service_errors',
    name: 'External Service Errors',
    description: 'More than 5 failures from external service in 5 minutes',
    enabled: true,
    severity: 'high',
    condition: 'external_service_errors_total > 5',
    threshold: 5,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
];

/**
 * Alert rules for resource monitoring
 */
export const RESOURCE_ALERT_RULES: AlertRule[] = [
  {
    id: 'memory_usage_high',
    name: 'High Memory Usage',
    description: 'Memory usage exceeds 80% of heap',
    enabled: true,
    severity: 'medium',
    condition: 'memory_usage_percent > 80',
    threshold: 80,
    duration: 2 * 60 * 1000,
    evaluationInterval: 30 * 1000,
  },
  {
    id: 'memory_usage_critical',
    name: 'Critical Memory Usage',
    description: 'Memory usage exceeds 90% of heap',
    enabled: true,
    severity: 'high',
    condition: 'memory_usage_percent > 90',
    threshold: 90,
    duration: 1 * 60 * 1000,
    evaluationInterval: 15 * 1000,
  },
  {
    id: 'event_loop_lag',
    name: 'High Event Loop Lag',
    description: 'Event loop lag exceeds 100ms',
    enabled: true,
    severity: 'high',
    condition: 'event_loop_lag_ms > 100',
    threshold: 100,
    duration: 30 * 1000,
    evaluationInterval: 10 * 1000,
  },
];

/**
 * Alert rules for business metrics
 */
export const BUSINESS_ALERT_RULES: AlertRule[] = [
  {
    id: 'rate_limit_exceeded',
    name: 'Rate Limiting Triggered',
    description: 'More than 50 rate limit hits in 5 minutes',
    enabled: true,
    severity: 'medium',
    condition: 'rate_limit_hits_total > 50',
    threshold: 50,
    duration: 5 * 60 * 1000,
    evaluationInterval: 1 * 60 * 1000,
  },
  {
    id: 'payment_processing_errors',
    name: 'Payment Processing Failures',
    description: 'More than 3 payment processing errors in 10 minutes',
    enabled: true,
    severity: 'high',
    condition: 'payment_processing_errors_total > 3',
    threshold: 3,
    duration: 10 * 60 * 1000,
    evaluationInterval: 2 * 60 * 1000,
  },
  {
    id: 'validation_errors_high',
    name: 'High Validation Error Rate',
    description: 'More than 30 validation errors in 5 minutes',
    enabled: true,
    severity: 'low',
    condition: 'validation_errors_total > 30',
    threshold: 30,
    duration: 5 * 60 * 1000,
    evaluationInterval: 2 * 60 * 1000,
  },
];

/**
 * All alert rules combined
 */
export const ALL_ALERT_RULES: AlertRule[] = [
  ...ERROR_ALERT_RULES,
  ...PERFORMANCE_ALERT_RULES,
  ...AVAILABILITY_ALERT_RULES,
  ...RESOURCE_ALERT_RULES,
  ...BUSINESS_ALERT_RULES,
];

/**
 * Get alert rules by severity
 */
export function getAlertRulesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): AlertRule[] {
  return ALL_ALERT_RULES.filter((rule) => rule.severity === severity && rule.enabled);
}

/**
 * Get alert rule by ID
 */
export function getAlertRuleById(id: string): AlertRule | undefined {
  return ALL_ALERT_RULES.find((rule) => rule.id === id);
}

/**
 * Get enabled alert rules
 */
export function getEnabledAlertRules(): AlertRule[] {
  return ALL_ALERT_RULES.filter((rule) => rule.enabled);
}

/**
 * Calculate total alert rules
 */
export function getAlertRuleCount(): number {
  return ALL_ALERT_RULES.length;
}

/**
 * Calculate enabled alert rules count
 */
export function getEnabledAlertRuleCount(): number {
  return getEnabledAlertRules().length;
}
