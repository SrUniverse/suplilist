// ============================================================
// Event Validator — SupliList v4.0
// Zero-dep schema validation for events (no Zod)
// ============================================================

import { logger } from '../../utils/logger.js';

/**
 * Simple schema validator (runtime, zero dependencies)
 * @class SchemaValidator
 */
class SchemaValidator {
  constructor() {
    this.schemas = new Map();
  }

  /**
   * Define a schema for an event
   * @param {string} eventName - Event identifier
   * @param {Object} schema - Schema object with type info
   */
  defineSchema(eventName, schema) {
    this.schemas.set(eventName, schema);
  }

  /**
   * Validate a value against a type spec
   * @private
   * @param {*} value - Value to validate
   * @param {*} typeSpec - Type specification ('string', 'number', {type: 'array', items: 'string'}, etc)
   * @returns {boolean}
   */
  #validateType(value, typeSpec) {
    if (typeSpec === 'string') return typeof value === 'string';
    if (typeSpec === 'number') return typeof value === 'number' && !isNaN(value);
    if (typeSpec === 'boolean') return typeof value === 'boolean';
    if (typeSpec === 'array') return Array.isArray(value);
    if (typeSpec === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (typeSpec === 'optional') return true; // Always valid

    if (typeof typeSpec === 'object' && typeSpec !== null) {
      if (typeSpec.type === 'array' && typeSpec.items) {
        if (!Array.isArray(value)) return false;
        return value.every(item => this.#validateType(item, typeSpec.items));
      }

      if (typeSpec.enum) {
        return typeSpec.enum.includes(value);
      }

      if (typeSpec.type === 'string' && typeSpec.minLength) {
        return typeof value === 'string' && value.length >= typeSpec.minLength;
      }

      if (typeSpec.type === 'number' && (typeSpec.min !== undefined || typeSpec.max !== undefined)) {
        if (typeof value !== 'number') return false;
        if (typeSpec.min !== undefined && value < typeSpec.min) return false;
        if (typeSpec.max !== undefined && value > typeSpec.max) return false;
        return true;
      }
    }

    return false;
  }

  /**
   * Validate payload against schema
   * @param {string} eventName - Event identifier
   * @param {*} payload - Data to validate
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate(eventName, payload) {
    const schema = this.schemas.get(eventName);

    if (!schema) {
      // Unknown event, but still valid (be lenient)
      return { valid: true, errors: [] };
    }

    const errors = [];

    // Validate each required field
    Object.entries(schema).forEach(([fieldName, typeSpec]) => {
      if (typeSpec === 'optional') {
        // Optional field, skip if missing
        return;
      }

      if (!(fieldName in payload)) {
        errors.push(`Missing required field: ${fieldName}`);
        return;
      }

      if (!this.#validateType(payload[fieldName], typeSpec)) {
        errors.push(`Field "${fieldName}" has wrong type. Expected ${JSON.stringify(typeSpec)}, got ${typeof payload[fieldName]}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton validator
export const eventValidator = new SchemaValidator();

/**
 * Define schemas for common SupliList events
 */
export function initializeEventSchemas() {
  // Check-in logged
  eventValidator.defineSchema('checkin:logged', {
    date: 'string',                    // ISO date YYYY-MM-DD
    supplements: { type: 'array', items: 'string' },  // supplement IDs
    completed: 'boolean'
  });

  // Stack operations
  eventValidator.defineSchema('stack:itemAdded', {
    supplementId: { type: 'string', minLength: 1 },
    quantity: { type: 'number', min: 1 },
    dosage: 'string'
  });

  eventValidator.defineSchema('stack:itemRemoved', {
    supplementId: { type: 'string', minLength: 1 }
  });

  eventValidator.defineSchema('stack:updated', {
    stack: { type: 'array', items: 'object' }
  });

  // User profile
  eventValidator.defineSchema('user:profileUpdated', {
    weight: { type: 'number', min: 20, max: 500 },
    trainingFrequency: { type: 'number', min: 0, max: 7 },
    objective: { enum: ['bulk', 'cut', 'strength', 'endurance', 'general'] },
    budget: { type: 'number', min: 0 }
  });

  eventValidator.defineSchema('user:onboardingComplete', {
    userId: 'string',
    completedAt: 'number'  // timestamp
  });

  // Affiliate / Commerce
  eventValidator.defineSchema('affiliate_click', {
    supplementId: { type: 'string', minLength: 1 },
    supplementName: 'string',
    utmSource: { enum: ['amazon', 'ml', 'shopee', 'other'] },
    utmCampaign: 'string',
    timestamp: { type: 'number', min: 0 }
  });

  eventValidator.defineSchema('premium:unlocked', {
    tier: { enum: ['pro', 'master', 'enterprise'] },
    unlockedAt: 'number'
  });

  // Favorites
  eventValidator.defineSchema('favorite:toggled', {
    supplementId: { type: 'string', minLength: 1 },
    isFavorited: 'boolean'
  });

  // Supplement views
  eventValidator.defineSchema('supplement:view', {
    supplementId: { type: 'string', minLength: 1 },
    source: { enum: ['list', 'search', 'recommendations', 'favorites'] }
  });

  // Generic events (most events are lenient)
  // If event is not in schema, it's still valid (we're lenient)
}

/**
 * Sanitize event payload to remove PII before storage
 * @param {string} eventName - Event type
 * @param {Object} payload - Raw payload
 * @returns {Object} Sanitized payload
 */
export function sanitizeEventPayload(eventName, payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sanitized = { ...payload };

  // Remove PII fields universally
  const piiFields = ['email', 'phone', 'address', 'ipAddress', 'creditCard', 'ssn', 'password'];
  piiFields.forEach(field => {
    delete sanitized[field];
  });

  // Remove names (keep only if essential for analytics)
  if (eventName === 'supplement:view' || eventName === 'stack:itemAdded') {
    // Keep supplementName (it's public data)
  } else {
    delete sanitized.userName;
    delete sanitized.userEmail;
    delete sanitized.userPhone;
  }

  return sanitized;
}

/**
 * Check if event contains PII (should not be tracked)
 * @param {string} eventName
 * @param {Object} payload
 * @returns {boolean}
 */
export function containsPII(eventName, payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const piiPatterns = [
    /@/,  // email-like
    /^\d{3}-\d{2}-\d{4}$/,  // SSN-like
    /^\d{16}$/,  // Credit card-like
  ];

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      // Check for PII field names
      if (['password', 'ssn', 'creditCard', 'token', 'secret'].includes(key)) {
        return true;
      }

      // Check for PII patterns
      if (piiPatterns.some(pattern => pattern.test(value))) {
        logger.warn(`[EventValidator] Potential PII in "${eventName}.${key}": ${value.substring(0, 10)}...`);
        return true;
      }
    }
  }

  return false;
}

// Initialize on import
initializeEventSchemas();
