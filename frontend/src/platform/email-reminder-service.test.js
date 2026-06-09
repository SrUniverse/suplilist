import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../features/reports/report-generator.js', () => ({
  ReportGenerator: {
    generateMonthlyReport: vi.fn().mockReturnValue({
      monthName: 'Maio',
      year: 2026,
      metrics: { adherencePercent: 85, perfectDays: 20, trend: 'improving' },
      insights: [{ title: 'Boa aderência', description: 'Você está no caminho certo' }],
      comparison: { previousMonth: 'Abril', previousAdherence: 80, currentAdherence: 85, improvementPercent: 5 }
    }),
    getReportHTML: vi.fn().mockReturnValue('<html>report</html>')
  }
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    select: vi.fn((fn) => fn({ profile: { email: 'test@example.com' }, auth: { token: 'tok' } }))
  }
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { EmailReminderService } from './email-reminder-service.js';

describe('EmailReminderService', () => {
  let service;

  beforeEach(() => {
    service = new EmailReminderService();
    vi.clearAllMocks();
  });

  describe('getNextFirstDayOfMonth', () => {
    it('should return a Date on day 1 of next month', () => {
      const next = service.getNextFirstDayOfMonth();
      expect(next.getDate()).toBe(1);
      expect(next instanceof Date).toBe(true);
    });

    it('should be in the future', () => {
      const next = service.getNextFirstDayOfMonth();
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('verifyEmail', () => {
    it('should return true for valid email', () => {
      expect(service.verifyEmail('user@example.com')).toBe(true);
    });

    it('should return false for email without @', () => {
      expect(service.verifyEmail('userexample.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.verifyEmail('')).toBe(false);
    });

    it('should return false for email with spaces', () => {
      expect(service.verifyEmail('user @example.com')).toBe(false);
    });
  });

  describe('generatePlainText', () => {
    it('should include month name and year', () => {
      const report = {
        monthName: 'Junho',
        year: 2026,
        metrics: { adherencePercent: 90, perfectDays: 25, trend: 'improving' },
        insights: [{ title: 'Excelente', description: 'Parabéns' }],
        comparison: { previousMonth: 'Maio', previousAdherence: 80, currentAdherence: 90, improvementPercent: 10 }
      };
      const text = service.generatePlainText(report);
      expect(text).toContain('Junho');
      expect(text).toContain('2026');
      expect(text).toContain('90%');
    });

    it('should include insights', () => {
      const report = {
        monthName: 'Julho',
        year: 2026,
        metrics: { adherencePercent: 60, perfectDays: 10, trend: 'declining' },
        insights: [{ title: 'Melhore', description: 'Pode ser melhor' }],
        comparison: { previousMonth: 'Junho', previousAdherence: 70, currentAdherence: 60, improvementPercent: -10 }
      };
      const text = service.generatePlainText(report);
      expect(text).toContain('Melhore');
      expect(text).toContain('Declínio');
    });
  });

  describe('sendEmail', () => {
    it('should POST to email API and return response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>test</p>',
        textBody: 'test'
      });

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/email'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(service.sendEmail({ to: 'a@b.com', subject: 'x', htmlBody: '', textBody: '' }))
        .rejects.toThrow('Email API error');
    });

    it('should throw on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
      await expect(service.sendEmail({ to: 'a@b.com', subject: 'x', htmlBody: '', textBody: '' }))
        .rejects.toThrow('Network down');
    });
  });

  describe('getStatus', () => {
    it('should return connected: true on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: '1.0' })
      });
      const status = await service.getStatus();
      expect(status.connected).toBe(true);
    });

    it('should return connected: false on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const status = await service.getStatus();
      expect(status.connected).toBe(false);
    });

    it('should return connected: false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
      const status = await service.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('unsubscribeFromReminders', () => {
    it('should return true on successful unsubscribe', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await service.unsubscribeFromReminders();
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('error'));
      const result = await service.unsubscribeFromReminders();
      expect(result).toBe(false);
    });
  });
});
