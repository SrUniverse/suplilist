// ============================================================
// Crypto Utils — SupliList v4.0
// Anonymous session fingerprinting, event deduplication hashes
// ============================================================

import { logger } from '../../utils/logger.js';
import { StorageManager } from '../../platform/storage-manager.js';

/**
 * Generate an anonymous session ID based on device fingerprint
 * Deterministic: same browser/device = same sessionId
 * Privacy-safe: no PII, no IP, no cookies
 *
 * @returns {Promise<string>} Session ID (64 hex chars, SHA-256)
 */
export async function generateSessionId() {
  try {
    // Fingerprint components (device-specific but not traceable to user)
    const components = [
      navigator.userAgent.substring(0, 50),  // Browser + OS (first 50 chars)
      navigator.language,                     // Language
      navigator.hardwareConcurrency || 1,     // CPU cores
      screen.width,                           // Screen width
      screen.height,                          // Screen height
      screen.colorDepth,                      // Color depth
      new Date().getTimezoneOffset(),         // Timezone
      StorageManager.getItem('suplilist-state-v4')?.substring(0, 20) || 'no-state',  // State hash
    ];

    const fingerprint = components.join('|');
    const hash = await sha256(fingerprint);

    return hash;
  } catch (err) {
    logger.error('[CryptoUtils] Failed to generate sessionId:', err);
    // Fallback: random session (loses consistency but ensures tracking)
    return generateRandomId();
  }
}

/**
 * Generate a deduplication hash for an event
 * If same event (name + timestamp + userId) occurs twice, hash will match
 *
 * @param {string} eventName - Event type
 * @param {number} timestamp - When event occurred
 * @param {string} [userId] - user.id if available
 * @returns {Promise<string>} Event ID (64 hex chars, SHA-256)
 */
export async function generateEventId(eventName, timestamp, userId = null) {
  try {
    // Combine event components
    // Same event fired at same millisecond by same user = same ID
    const components = [
      eventName,
      timestamp.toString(),
      userId || 'anonymous',
      // Add 1ms window tolerance (helps with rapid events)
      Math.floor(timestamp / 100).toString() // Groups into 100ms buckets
    ];

    const dedupeKey = components.join(':');
    const hash = await sha256(dedupeKey);

    return hash;
  } catch (err) {
    logger.error('[CryptoUtils] Failed to generate eventId:', err);
    return generateRandomId();
  }
}

/**
 * SHA-256 hash using Web Crypto API (native, no deps)
 * @private
 * @param {string} message - String to hash
 * @returns {Promise<string>} Hex digest (64 chars)
 */
async function sha256(message) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    logger.error('[CryptoUtils] SHA-256 failed:', err);
    // Fallback: simple hash (not cryptographic, but better than nothing)
    return fallbackHash(message);
  }
}

/**
 * Fallback hash function (not crypto-grade, but fast and deterministic)
 * @private
 * @param {string} message
 * @returns {string} 64-char hex string
 */
function fallbackHash(message) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Keep as 32-bit int
  }

  // Repeat to get 64 hex chars (32 bytes)
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return (hex + hex + hex + hex + hex + hex + hex + hex).substring(0, 64);
}

/**
 * Generate a random ID (fallback for critical paths)
 * @private
 * @returns {string} 64 hex chars
 */
function generateRandomId() {
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id.substring(0, 64);
}

/**
 * Generate a UUID v4 (for non-critical IDs like clickIds)
 * @returns {string} UUID v4 format
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Redact user agent to remove identifying info
 * Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
 * Result: "Chrome on Windows"
 *
 * @param {string} userAgent
 * @returns {string} Redacted UA
 */
export function redactUserAgent(userAgent) {
  if (!userAgent) return 'unknown';

  // Extract browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  // Extract OS
  let os = 'unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

/**
 * Detect device type from user agent
 * @param {string} userAgent
 * @returns {'desktop'|'mobile'|'tablet'}
 */
export function detectDeviceType(userAgent) {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'tablet';
  }

  if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) {
    return 'mobile';
  }

  return 'desktop';
}

export const cryptoUtils = {
  generateSessionId,
  generateEventId,
  generateUUID,
  redactUserAgent,
  detectDeviceType
};
