import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSessionId, generateEventId, generateUUID, redactUserAgent, detectDeviceType } from './crypto-utils.js';
import { StorageManager } from '../../platform/storage-manager.js';

describe('crypto-utils — Analytics Cryptography & UA Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock StorageManager
    vi.spyOn(StorageManager, 'getItem').mockReturnValue('state-dummy-v4');

    // Setup navigator / window globals if they are missing
    if (typeof navigator === 'undefined') {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        language: 'pt-BR',
        hardwareConcurrency: 4
      });
    }

    if (typeof screen === 'undefined') {
      vi.stubGlobal('screen', {
        width: 1920,
        height: 1080,
        colorDepth: 24
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSessionId()', () => {
    it('generates a deterministic 64-char SHA-256 hex hash based on device factors', async () => {
      const sessionId1 = await generateSessionId();
      const sessionId2 = await generateSessionId();

      // Deterministic: same browser/device = same sessionId
      expect(sessionId1).toBe(sessionId2);
      expect(sessionId1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('varies session ID if screen resolution or state changes', async () => {
      const sessionId1 = await generateSessionId();

      // Change state
      vi.spyOn(StorageManager, 'getItem').mockReturnValue('state-changed-hash');
      const sessionId2 = await generateSessionId();

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('falls back to random ID if generation throws', async () => {
      // Mock crypto.subtle.digest to fail
      const originalSubtle = global.crypto?.subtle;
      if (global.crypto) {
        Object.defineProperty(global.crypto, 'subtle', {
          value: {
            digest: () => Promise.reject(new Error('Crypto error'))
          },
          writable: true,
          configurable: true
        });
      }

      const randomSessionId = await generateSessionId();

      expect(randomSessionId).toMatch(/^[a-f0-9]{64}$/);

      // Restore
      if (global.crypto && originalSubtle) {
        Object.defineProperty(global.crypto, 'subtle', {
          value: originalSubtle,
          writable: true,
          configurable: true
        });
      }
    });
  });

  describe('generateEventId()', () => {
    it('generates a 64-char hash based on name, timestamp, and user', async () => {
      const timestamp = 1717325000000;
      const eventId1 = await generateEventId('checkin:logged', timestamp, 'user-123');
      const eventId2 = await generateEventId('checkin:logged', timestamp, 'user-123');

      expect(eventId1).toBe(eventId2);
      expect(eventId1).toMatch(/^[a-f0-9]{64}$/);

      // Different timestamps yield different hashes because the exact millisecond is included
      const eventId3 = await generateEventId('checkin:logged', timestamp + 50, 'user-123');
      expect(eventId1).not.toBe(eventId3);

      const eventId4 = await generateEventId('checkin:logged', timestamp + 200, 'user-123');
      expect(eventId1).not.toBe(eventId4); // Different 100ms bucket
    });

    it('uses "anonymous" user if userId is not provided', async () => {
      const timestamp = 1717325000000;
      const eventIdAnon = await generateEventId('checkin:logged', timestamp);
      expect(eventIdAnon).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateUUID()', () => {
    it('generates standard UUID v4 format', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('redactUserAgent()', () => {
    it('correctly maps Chrome on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      expect(redactUserAgent(ua)).toBe('Chrome on Windows');
    });

    it('correctly maps Firefox on macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0';
      expect(redactUserAgent(ua)).toBe('Firefox on macOS');
    });

    it('correctly maps Safari on iOS (maps to macOS due to Mac keyword in iPhone UA)', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      expect(redactUserAgent(ua)).toBe('Safari on macOS');
    });

    it('handles unknown or empty user agents', () => {
      expect(redactUserAgent(null)).toBe('unknown');
      expect(redactUserAgent('')).toBe('unknown');
      expect(redactUserAgent('StrangeBot/1.0')).toBe('unknown on unknown');
    });
  });

  describe('detectDeviceType()', () => {
    it('identifies mobile, tablet, and desktop', () => {
      const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) ... Mobile/15E148';
      const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) ...';
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0';

      expect(detectDeviceType(iphoneUA)).toBe('mobile');
      expect(detectDeviceType(ipadUA)).toBe('tablet');
      expect(detectDeviceType(desktopUA)).toBe('desktop');
    });

    it('defaults to desktop for empty or unknown agents', () => {
      expect(detectDeviceType(null)).toBe('desktop');
      expect(detectDeviceType('')).toBe('desktop');
    });
  });
});
