import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger — Utility Logger', () => {
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleDebugSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    vi.resetModules();

    // Clear globals
    delete window.__errors;
    delete window.__analyticsLog;
    delete window.__piiDetections;
    delete window.__perfMetrics;

    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- DEV MODE TESTS ---
  describe('DEV Mode (isDev = true)', () => {
    beforeEach(() => {
      import.meta.env.DEV = true;
    });

    it('1. logs info, warn, debug and error to console', async () => {
      const { logger } = await import('./logger.js');

      logger.info('test info', 1, 2);
      expect(consoleInfoSpy).toHaveBeenCalledWith('[SupliList]', 'test info', 1, 2);

      logger.warn('test warn', { a: 1 });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[SupliList]', 'test warn', { a: 1 });

      logger.debug('test debug');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[SupliList]', 'test debug');

      logger.error('test error', new Error('fail'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SupliList]', 'test error', expect.any(Error));

      // Should not write to production buffer in dev
      expect(window.__errors).toBeUndefined();
    });

    it('2. logs analytics events to console in dev', async () => {
      const { logger } = await import('./logger.js');

      logger.analytics.event('click_button', { id: 'btn-1' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[SupliList][Analytics] click_button', { id: 'btn-1' });

      logger.analytics.piiDetected('email', 'test@test.com');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[SupliList]', '[PII] email', 'test@test.com');

      logger.analytics.perf('load_catalog', 120);
      expect(consoleLogSpy).toHaveBeenCalledWith('[SupliList][Perf] load_catalog: 120ms');
    });
  });

  // --- PROD MODE TESTS ---
  describe('PROD Mode (isDev = false)', () => {
    beforeEach(() => {
      import.meta.env.DEV = false;
    });

    it('3. info, warn, and debug are silent no-ops in production', async () => {
      const { logger } = await import('./logger.js');

      logger.info('silent info');
      logger.warn('silent warn');
      logger.debug('silent debug');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('4. buffers errors silently in production up to 50 items', async () => {
      const { logger } = await import('./logger.js');

      logger.error('prod error 1', { errCode: 101 });
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      expect(window.__errors).toHaveLength(1);
      expect(window.__errors[0]).toEqual({
        msg: 'prod error 1',
        args: [{ errCode: 101 }],
        ts: expect.any(Number)
      });

      // Limit buffer to 50 items
      for (let i = 0; i < 60; i++) {
        logger.error(`prod error ${i}`);
      }

      expect(window.__errors).toHaveLength(50);
      expect(window.__errors[0].msg).toBe('prod error 10'); // Pushed out first 10
      expect(window.__errors[49].msg).toBe('prod error 59');
    });

    it('5. buffers analytics events silently in production up to 100 items', async () => {
      const { logger } = await import('./logger.js');

      logger.analytics.event('event_prod', { val: 'test' });
      expect(consoleLogSpy).not.toHaveBeenCalled();

      expect(window.__analyticsLog).toHaveLength(1);
      expect(window.__analyticsLog[0].event).toBe('event_prod');

      for (let i = 0; i < 120; i++) {
        logger.analytics.event(`event_${i}`);
      }

      expect(window.__analyticsLog).toHaveLength(100);
      expect(window.__analyticsLog[0].event).toBe('event_20');
      expect(window.__analyticsLog[99].event).toBe('event_119');
    });

    it('6. buffers PII detections silently in production up to 50 items and redacts value', async () => {
      const { logger } = await import('./logger.js');

      logger.analytics.piiDetected('phone', '1234567890123');
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      expect(window.__piiDetections).toHaveLength(1);
      expect(window.__piiDetections[0]).toEqual({
        field: 'phone',
        truncated: '1234567890', // Truncated to 10 chars
        ts: expect.any(Number)
      });

      for (let i = 0; i < 60; i++) {
        logger.analytics.piiDetected('ssn', '00000000000');
      }

      expect(window.__piiDetections).toHaveLength(50);
    });

    it('7. aggregates performance metrics silently in production', async () => {
      const { logger } = await import('./logger.js');

      logger.analytics.perf('query_db', 50);
      logger.analytics.perf('query_db', 150);
      logger.analytics.perf('query_db', 100);

      expect(consoleLogSpy).not.toHaveBeenCalled();

      expect(window.__perfMetrics['query_db']).toEqual({
        count: 3,
        total: 300,
        min: 50,
        max: 150,
        avg: 100
      });
    });

    it('8. getMetrics() returns correct aggregated buffer sizes', async () => {
      const { logger } = await import('./logger.js');

      logger.error('err');
      logger.analytics.event('ev');
      logger.analytics.piiDetected('field', 'value');
      logger.analytics.perf('op', 10);

      const metrics = logger.getMetrics();
      expect(metrics).toEqual({
        errors: 1,
        piiDetections: 1,
        perfMetrics: {
          op: { count: 1, total: 10, min: 10, max: 10, avg: 10 }
        },
        analyticsEvents: 1
      });
    });

    it('9. clearBuffers() empties all logs and metrics', async () => {
      const { logger } = await import('./logger.js');

      logger.error('err');
      logger.analytics.event('ev');
      logger.analytics.piiDetected('field', 'value');
      logger.analytics.perf('op', 10);

      logger.clearBuffers();

      expect(window.__errors).toEqual([]);
      expect(window.__piiDetections).toEqual([]);
      expect(window.__analyticsLog).toEqual([]);
      expect(window.__perfMetrics).toEqual({});
    });
  });
});
