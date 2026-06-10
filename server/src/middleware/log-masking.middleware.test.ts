/**
 * Log Masking Middleware Tests
 *
 * Comprehensive test coverage for sensitive data masking:
 * - IP address hashing (GDPR compliance)
 * - URL affiliate parameter removal
 * - Token/secret masking
 * - Email and PII masking
 * - Performance: cache verification
 * - Edge cases: malformed data, empty inputs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hashIP,
  maskBearerToken,
  maskAuthHeaders,
  sanitizeUrl,
  maskEmail,
  maskPhoneNumber,
  maskCreditCard,
  maskCPF,
  maskSecrets,
  maskLogEntry,
  maskObjectProperties,
  extractClientIP,
  logMaskingMiddleware,
  clearIPHashCache,
  getIPHashCacheStats,
} from './log-masking.middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// IP Hashing Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IP Hashing', () => {
  beforeEach(() => {
    clearIPHashCache();
  });

  it('should hash IP addresses consistently', () => {
    const ip = '192.168.1.1';
    const hash1 = hashIP(ip);
    const hash2 = hashIP(ip);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^ip:[a-f0-9]{16}$/);
  });

  it('should produce different hashes for different IPs', () => {
    const hash1 = hashIP('192.168.1.1');
    const hash2 = hashIP('10.0.0.1');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle unknown IPs gracefully', () => {
    const hash = hashIP('unknown-ip');
    expect(hash).toBe('ip:unknown');
  });

  it('should handle empty IP strings', () => {
    const hash = hashIP('');
    expect(hash).toBe('ip:unknown');
  });

  it('should use cache for repeated IPs', () => {
    const ip = '192.168.1.1';

    // First call calculates hash
    hashIP(ip);
    const stats1 = getIPHashCacheStats();
    expect(stats1.size).toBe(1);

    // Second call should use cache
    hashIP(ip);
    const stats2 = getIPHashCacheStats();
    expect(stats2.size).toBe(1); // No additional entries
  });

  it('should support IPv6 addresses', () => {
    const ipv6 = '2001:0db8:85a3::8a2e:0370:7334';
    const hash = hashIP(ipv6);

    expect(hash).toMatch(/^ip:[a-f0-9]{16}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bearer Token Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Bearer Token Masking', () => {
  it('should mask Bearer tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = maskBearerToken(input);

    expect(result).toContain('Bearer ***');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should be case-insensitive', () => {
    const input = 'BEARER token123';
    const result = maskBearerToken(input);

    expect(result).toContain('Bearer ***');
  });

  it('should handle multiple Bearer tokens', () => {
    const input = 'Bearer token1 and Bearer token2';
    const result = maskBearerToken(input);

    expect(result).toBe('Bearer *** and Bearer ***');
  });

  it('should handle empty Bearer value', () => {
    const input = 'Bearer ';
    const result = maskBearerToken(input);

    expect(result).toBe('Bearer ');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Header Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Authorization Header Masking', () => {
  it('should mask Authorization headers', () => {
    const input = 'Authorization: Bearer xyz123';
    const result = maskAuthHeaders(input);

    expect(result).toContain('Authorization:');
    expect(result).toContain('***');
  });

  it('should mask X-API-Key headers', () => {
    const input = 'X-API-Key: sk-abc123def456';
    const result = maskAuthHeaders(input);

    expect(result).toContain('X-API-Key:');
    expect(result).not.toContain('sk-abc123def456');
  });

  it('should mask multiple different headers', () => {
    const input1 = 'X-Auth-Token: token123';
    const input2 = 'API-Key: key456';

    expect(maskAuthHeaders(input1)).toContain('***');
    expect(maskAuthHeaders(input2)).toContain('***');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// URL Sanitization Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('URL Sanitization', () => {
  it('should mask Amazon affiliate tags', () => {
    const url = 'https://amazon.com.br/dp/B123?tag=supli-20';
    const result = sanitizeUrl(url);

    expect(result).toContain('tag=***');
    expect(result).toContain('/dp/B123');
    expect(result).not.toContain('supli-20');
  });

  it('should preserve non-sensitive query parameters', () => {
    const url = 'https://example.com?search=vitamin&sort=price';
    const result = sanitizeUrl(url);

    expect(result).toContain('search=vitamin');
    expect(result).toContain('sort=price');
  });

  it('should mask multiple sensitive parameters', () => {
    const url = 'https://example.com?tag=abc&token=xyz&api_key=secret';
    const result = sanitizeUrl(url);

    expect(result).toContain('tag=***');
    expect(result).toContain('token=***');
    expect(result).toContain('api_key=***');
  });

  it('should mask UTM parameters', () => {
    const url = 'https://example.com?utm_campaign=sale&utm_source=email&product=item';
    const result = sanitizeUrl(url);

    expect(result).toContain('utm_campaign=***');
    expect(result).toContain('utm_source=***');
    expect(result).toContain('product=item'); // Should preserve this
  });

  it('should handle malformed URLs gracefully', () => {
    const url = 'not a valid url';
    const result = sanitizeUrl(url);

    // Should still attempt to mask parameters
    expect(typeof result).toBe('string');
  });

  it('should handle URLs without query parameters', () => {
    const url = 'https://example.com/path';
    const result = sanitizeUrl(url);

    expect(result).toBe(url);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Email Masking', () => {
  it('should mask email addresses', () => {
    const email = 'john.doe@example.com';
    const result = maskEmail(email);

    expect(result).toMatch(/j\*\*\*@example\.com/);
  });

  it('should mask multiple emails', () => {
    const input = 'Contact john.doe@example.com or jane.smith@test.com';
    const result = maskEmail(input);

    expect(result).toContain('j***@example.com');
    expect(result).toContain('j***@test.com');
  });

  it('should handle single character emails', () => {
    const email = 'a@example.com';
    const result = maskEmail(email);

    expect(result).toMatch(/a\*\*\*@example\.com/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phone Number Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Phone Number Masking', () => {
  it('should mask Brazilian phone numbers', () => {
    const phone = '11 98765-4321';
    const result = maskPhoneNumber(phone);

    expect(result).toContain('***');
    expect(result).toContain('4321');
  });

  it('should mask phone numbers with formatting', () => {
    const phone = '(11) 9876-5432';
    const result = maskPhoneNumber(phone);

    expect(result).toContain('***');
  });

  it('should handle short phone segments gracefully', () => {
    const phone = '123';
    const result = maskPhoneNumber(phone);

    expect(result).toBe('***');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit Card Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Credit Card Masking', () => {
  it('should mask credit card numbers', () => {
    const card = '1234-5678-9012-3456';
    const result = maskCreditCard(card);

    expect(result).toMatch(/1234-5678-9012-\*\*\*\*/);
  });

  it('should mask credit cards without separators', () => {
    const card = '4111111111111111';
    const result = maskCreditCard(card);

    expect(result).toMatch(/4111-\*\*\*\*-\*\*\*\*/);
  });

  it('should handle short numbers gracefully', () => {
    const card = '123';
    const result = maskCreditCard(card);

    expect(result).toBe('****');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CPF Masking Tests (Brazilian Tax ID)
// ─────────────────────────────────────────────────────────────────────────────

describe('CPF Masking', () => {
  it('should mask CPF with dots and dashes', () => {
    const cpf = '123.456.789-00';
    const result = maskCPF(cpf);

    expect(result).toMatch(/123\.456\.\*\*\*-\*\*/);
  });

  it('should mask CPF without formatting', () => {
    const cpf = '12345678900';
    const result = maskCPF(cpf);

    expect(result).toMatch(/123\.456\.\*\*\*-\*\*/);
  });

  it('should handle invalid CPF lengths', () => {
    const cpf = '123456';
    const result = maskCPF(cpf);

    expect(result).toBe('***.***.***.‐**');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Secret Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Secret Masking', () => {
  it('should mask API keys in query strings', () => {
    const input = 'Request to https://api.example.com?api_key=sk-1234567890';
    const result = maskSecrets(input);

    expect(result).toContain('api_key=***');
    expect(result).not.toContain('sk-1234567890');
  });

  it('should mask AWS keys', () => {
    const input = 'Found AWS key AKIAIOSFODNN7EXAMPLE in logs';
    const result = maskSecrets(input);

    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).toContain('***');
  });

  it('should mask Bearer tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = maskSecrets(input);

    expect(result).toContain('Bearer ***');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive Log Entry Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Comprehensive Log Entry Masking', () => {
  it('should mask multiple types of sensitive data', () => {
    const log = 'User john.doe@example.com with IP 192.168.1.1 used token Bearer xyz123 ' +
                'to access https://amazon.com/dp/B123?tag=supli-20';
    const result = maskLogEntry(log);

    expect(result).not.toContain('john.doe@example.com');
    expect(result).not.toContain('192.168.1.1');
    expect(result).not.toContain('xyz123');
    expect(result).not.toContain('supli-20');
    expect(result).toContain('j***');
    expect(result).toContain('ip:');
    expect(result).toContain('Bearer ***');
    expect(result).toContain('tag=***');
  });

  it('should handle empty logs', () => {
    const result = maskLogEntry('');
    expect(result).toBe('');
  });

  it('should handle logs with no sensitive data', () => {
    const log = 'User completed checkout successfully';
    const result = maskLogEntry(log);

    expect(result).toBe(log);
  });

  it('should handle complex real-world logs', () => {
    const log = 'Error: Failed to process order for user@example.com (IP: 10.0.0.1) ' +
                'using payment card 4111-1111-1111-1111 and CPF 123.456.789-00. ' +
                'API call to https://payment.api.com?token=secret&key=value returned 500. ' +
                'Contact: +55 11 98765-4321';
    const result = maskLogEntry(log);

    expect(result).not.toContain('user@example.com');
    expect(result).not.toContain('10.0.0.1');
    expect(result).not.toContain('4111-1111-1111-1111');
    expect(result).not.toContain('123.456.789-00');
    expect(result).not.toContain('secret');
    expect(result).not.toContain('98765-4321');
    expect(result).toContain('ip:');
    expect(result).toContain('token=***');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Object Property Masking Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Object Property Masking', () => {
  it('should mask sensitive keys', () => {
    const obj = {
      username: 'john',
      password: 'secret123',
      email: 'john@example.com',
    };

    const result = maskObjectProperties(obj);

    expect(result.password).toBe('***');
    expect(result.username).toBe('john');
    expect(result.email).toMatch(/j\*\*\*@example\.com/);
  });

  it('should handle nested objects', () => {
    const obj = {
      user: {
        name: 'John',
        credentials: {
          password: 'secret',
          api_key: 'key123',
        },
      },
    };

    const result = maskObjectProperties(obj);

    expect(result.user.credentials.password).toBe('***');
    expect(result.user.credentials.api_key).toBe('***');
    expect(result.user.name).toBe('John');
  });

  it('should handle arrays', () => {
    const obj = {
      tokens: ['token1', 'token2'],
      names: ['Alice', 'Bob'],
    };

    const result = maskObjectProperties(obj);

    expect(Array.isArray(result.tokens)).toBe(true);
    expect(Array.isArray(result.names)).toBe(true);
  });

  it('should mask IP addresses in objects', () => {
    const obj = {
      client_ip: '192.168.1.1',
      ip_address: '10.0.0.1',
    };

    const result = maskObjectProperties(obj);

    expect(result.client_ip).toMatch(/^ip:[a-f0-9]{16}$/);
    expect(result.ip_address).toMatch(/^ip:[a-f0-9]{16}$/);
  });

  it('should prevent infinite recursion', () => {
    const obj: any = { a: 1 };
    obj.self = obj; // Circular reference

    // Should handle gracefully without hanging
    expect(() => maskObjectProperties(obj)).not.toThrow();
  });

  it('should handle null and undefined', () => {
    const result = maskObjectProperties({
      nullVal: null,
      undefinedVal: undefined,
    });

    expect(result.nullVal).toBe(null);
    expect(result.undefinedVal).toBeUndefined();
  });

  it('should handle various data types', () => {
    const obj = {
      str: 'value',
      num: 123,
      bool: true,
      arr: [1, 2, 3],
      nested: { key: 'value' },
    };

    const result = maskObjectProperties(obj);

    expect(result.str).toBe('value');
    expect(result.num).toBe(123);
    expect(result.bool).toBe(true);
    expect(Array.isArray(result.arr)).toBe(true);
    expect(typeof result.nested).toBe('object');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Extract Client IP Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Extract Client IP', () => {
  it('should extract Cloudflare IP header', () => {
    const req = {
      headers: { 'cf-connecting-ip': '203.0.113.1' },
      ip: 'fallback-ip',
    };

    const ip = extractClientIP(req);
    expect(ip).toBe('203.0.113.1');
  });

  it('should extract X-Forwarded-For header', () => {
    const req = {
      headers: { 'x-forwarded-for': '192.0.2.1, 198.51.100.1' },
      ip: 'fallback-ip',
    };

    const ip = extractClientIP(req);
    expect(ip).toBe('192.0.2.1');
  });

  it('should fallback to req.ip', () => {
    const req = {
      headers: {},
      ip: '127.0.0.1',
    };

    const ip = extractClientIP(req);
    expect(ip).toBe('127.0.0.1');
  });

  it('should return unknown-ip as fallback', () => {
    const req = { headers: {}, ip: null };

    const ip = extractClientIP(req);
    expect(ip).toBe('unknown-ip');
  });

  it('should prefer Cloudflare over X-Forwarded-For', () => {
    const req = {
      headers: {
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '192.0.2.1',
      },
      ip: '127.0.0.1',
    };

    const ip = extractClientIP(req);
    expect(ip).toBe('203.0.113.1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Express Middleware Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Log Masking Express Middleware', () => {
  it('should attach masked IP to request', () => {
    const req = {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
      ip: '192.168.1.1',
    };

    const res = {};
    const next = vi.fn();

    logMaskingMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.maskedIP).toMatch(/^ip:[a-f0-9]{16}$/);
  });

  it('should handle missing request data gracefully', () => {
    const req = { headers: {} };
    const res = {};
    const next = vi.fn();

    logMaskingMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.maskedIP).toBe('ip:unknown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Management Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache Management', () => {
  beforeEach(() => {
    clearIPHashCache();
  });

  it('should clear cache', () => {
    hashIP('192.168.1.1');
    const statsBefore = getIPHashCacheStats();
    expect(statsBefore.size).toBeGreaterThan(0);

    clearIPHashCache();
    const statsAfter = getIPHashCacheStats();
    expect(statsAfter.size).toBe(0);
  });

  it('should report cache stats', () => {
    hashIP('192.168.1.1');
    hashIP('10.0.0.1');

    const stats = getIPHashCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.max).toBeGreaterThan(0);
  });
});
