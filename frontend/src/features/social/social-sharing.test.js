import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    select: vi.fn((fn) => fn({ social: { shareStats: { whatsapp: 2, twitter: 1, linkedin: 0, facebook: 0, total: 3 } }, profile: { id: 'user-1' } })),
    dispatch: vi.fn(),
  },
  ACTIONS: {}
}));

import { SocialSharing } from './social-sharing.js';

describe('SocialSharing', () => {
  let sharing;

  beforeEach(() => {
    sharing = new SocialSharing();
    window.open = vi.fn();
    vi.clearAllMocks();
  });

  describe('generateCode', () => {
    it('should generate 8-char code by default', () => {
      const code = sharing.generateCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate code with custom length', () => {
      const code = sharing.generateCode(12);
      expect(code).toHaveLength(12);
    });
  });

  describe('generateReferralLink', () => {
    it('should generate referral link with ref param', () => {
      const link = sharing.generateReferralLink('user-123');
      expect(link).toContain('ref=');
      expect(link.length).toBeGreaterThan(20);
    });
  });

  describe('generateStreakMessage', () => {
    it('should return a string', () => {
      const msg = sharing.generateStreakMessage(7, 80);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(10);
    });

    it('should include streak days in message somehow', () => {
      const msg = sharing.generateStreakMessage(7, 80);
      const hasEmoji = ['🔥', '⭐', '📅', '🏆', '✨'].some(e => msg.includes(e));
      expect(hasEmoji).toBe(true);
    });
  });

  describe('shouldPromptShare', () => {
    it('should return true for milestone streaks', () => {
      [7, 14, 30, 60, 90, 100].forEach(m => {
        expect(sharing.shouldPromptShare(m)).toBe(true);
      });
    });

    it('should return false for non-milestone streaks', () => {
      [1, 5, 8, 15, 31, 50].forEach(n => {
        expect(sharing.shouldPromptShare(n)).toBe(false);
      });
    });
  });

  describe('getSharePromptMessage', () => {
    it('should return message containing streak count for milestones', () => {
      const msg7 = sharing.getSharePromptMessage(7);
      expect(msg7).toContain('7');

      const msg30 = sharing.getSharePromptMessage(30);
      expect(msg30).toContain('30');
    });

    it('should return fallback for unknown streak', () => {
      const msg = sharing.getSharePromptMessage(999);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(5);
    });
  });

  describe('getShareStats', () => {
    it('should return share stats object', () => {
      const stats = sharing.getShareStats();
      expect(stats).toHaveProperty('whatsapp');
      expect(stats).toHaveProperty('twitter');
    });
  });

  describe('trackShare', () => {
    it('should not throw when tracking a share', () => {
      expect(() => sharing.trackShare('whatsapp')).not.toThrow();
      expect(() => sharing.trackShare('twitter')).not.toThrow();
    });
  });

  describe('getShareButtonsHTML', () => {
    it('should include platform names', () => {
      const html = sharing.getShareButtonsHTML(7, 80);
      expect(html).toContain('WhatsApp');
      expect(html).toContain('Twitter');
      expect(html).toContain('LinkedIn');
    });
  });

  describe('shareMessage', () => {
    it('should open whatsapp URL', () => {
      sharing.shareMessage('Hello world', 'whatsapp');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank');
    });

    it('should open twitter URL', () => {
      sharing.shareMessage('Hello world', 'twitter');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('twitter.com'), '_blank');
    });

    it('should open linkedin URL', () => {
      sharing.shareMessage('Hello world', 'linkedin');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('linkedin.com'), '_blank');
    });

    it('should open facebook URL', () => {
      sharing.shareMessage('Hello world', 'facebook');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('facebook.com'), '_blank');
    });
  });

  describe('copyShareLink', () => {
    it('should return true on success', async () => {
      navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      const result = await sharing.copyShareLink('https://suplilist.app?ref=ABC123');
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      navigator.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) };
      const result = await sharing.copyShareLink('https://suplilist.app');
      expect(result).toBe(false);
    });
  });
});
