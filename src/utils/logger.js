const PREFIX = '[SupliList]';
const isDev = import.meta.env.DEV;

export const logger = {
  info:  isDev ? (msg, ...args) => console.info(PREFIX, msg, ...args)  : () => {},
  warn:  isDev ? (msg, ...args) => console.warn(PREFIX, msg, ...args)  : () => {},
  debug: isDev ? (msg, ...args) => console.debug(PREFIX, msg, ...args) : () => {},
  // P7: erros sempre capturados — console em dev, buffer em produção para diagnóstico
  error: (msg, ...args) => {
    if (isDev) {
      console.error(PREFIX, msg, ...args);
    } else {
      // Captura silenciosa em produção (acessível via window.__errors para debug)
      try {
        window.__errors = window.__errors || [];
        window.__errors.push({ msg, args, ts: Date.now() });
        // Limita o buffer a 50 erros para evitar vazamento de memória
        if (window.__errors.length > 50) window.__errors.shift();
      } catch (_) { /* ambiente sem window, e.g. SSR */ }
    }
  },

  // Analytics-specific logging (Task 7)
  analytics: {
    /**
     * Log analytics event
     */
    event: (event, data = {}) => {
      if (isDev) {
        console.log(`${PREFIX}[Analytics] ${event}`, data);
      } else {
        try {
          window.__analyticsLog = window.__analyticsLog || [];
          window.__analyticsLog.push({ event, data, ts: Date.now() });
          if (window.__analyticsLog.length > 100) window.__analyticsLog.shift();
        } catch (_) {}
      }
    },

    /**
     * Log PII detection
     */
    piiDetected: (field, value) => {
      const msg = `[PII] ${field}`;
      if (isDev) console.warn(PREFIX, msg, value);
      try {
        window.__piiDetections = window.__piiDetections || [];
        window.__piiDetections.push({ field, truncated: value.substring(0, 10), ts: Date.now() });
        if (window.__piiDetections.length > 50) window.__piiDetections.shift();
      } catch (_) {}
    },

    /**
     * Track performance metric
     */
    perf: (operation, duration) => {
      if (isDev) console.log(`${PREFIX}[Perf] ${operation}: ${duration}ms`);
      try {
        window.__perfMetrics = window.__perfMetrics || {};
        if (!window.__perfMetrics[operation]) {
          window.__perfMetrics[operation] = { count: 0, total: 0, min: Infinity, max: -Infinity };
        }
        const stat = window.__perfMetrics[operation];
        stat.count += 1;
        stat.total += duration;
        stat.min = Math.min(stat.min, duration);
        stat.max = Math.max(stat.max, duration);
        stat.avg = stat.total / stat.count;
      } catch (_) {}
    },
  },

  /**
   * Get aggregated metrics for observability (Task 8)
   */
  getMetrics: () => {
    return {
      errors: window.__errors?.length || 0,
      piiDetections: window.__piiDetections?.length || 0,
      perfMetrics: window.__perfMetrics || {},
      analyticsEvents: window.__analyticsLog?.length || 0,
    };
  },

  /**
   * Clear all buffered logs
   */
  clearBuffers: () => {
    window.__errors = [];
    window.__piiDetections = [];
    window.__analyticsLog = [];
    window.__perfMetrics = {};
  },
};
