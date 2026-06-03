import { describe, it, expect } from 'vitest';
import { eventValidator, sanitizeEventPayload, containsPII } from './event-validator.js';

describe('event-validator — Schema Validation & Privacy Rules', () => {
  describe('SchemaValidator.validate()', () => {
    it('returns valid: true for events without defined schemas (lenient)', () => {
      const res = eventValidator.validate('unknown:event', { random: 'data' });
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    });

    it('validates primitive types: string, number, boolean, object', () => {
      // Define a custom schema for this test
      eventValidator.defineSchema('test:primitives', {
        name: 'string',
        age: 'number',
        active: 'boolean',
        details: 'object',
        tags: 'array',
        opt: 'optional'
      });

      const validPayload = {
        name: 'John',
        age: 30,
        active: true,
        details: { city: 'NY' },
        tags: ['a', 'b'],
        opt: 'anything'
      };

      const res = eventValidator.validate('test:primitives', validPayload);
      expect(res.valid).toBe(true);

      const invalidPayload = {
        name: 123, // Should be string
        age: '30', // Should be number
        active: 'true', // Should be boolean
        details: 'not-an-object', // Should be object
        tags: 'not-an-array' // Should be array
      };

      const resInvalid = eventValidator.validate('test:primitives', invalidPayload);
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.errors.length).toBe(5);
    });

    it('validates complex schemas: array of items', () => {
      eventValidator.defineSchema('test:complexArray', {
        ids: { type: 'array', items: 'string' }
      });

      expect(eventValidator.validate('test:complexArray', { ids: ['a', 'b'] }).valid).toBe(true);
      expect(eventValidator.validate('test:complexArray', { ids: [1, 2] }).valid).toBe(false);
      expect(eventValidator.validate('test:complexArray', { ids: 'not-array' }).valid).toBe(false);
    });

    it('validates enum values', () => {
      eventValidator.defineSchema('test:enums', {
        status: { enum: ['open', 'closed'] }
      });

      expect(eventValidator.validate('test:enums', { status: 'open' }).valid).toBe(true);
      expect(eventValidator.validate('test:enums', { status: 'pending' }).valid).toBe(false);
    });

    it('validates string minLength', () => {
      eventValidator.defineSchema('test:stringMin', {
        code: { type: 'string', minLength: 3 }
      });

      expect(eventValidator.validate('test:stringMin', { code: 'abc' }).valid).toBe(true);
      expect(eventValidator.validate('test:stringMin', { code: 'ab' }).valid).toBe(false);
      expect(eventValidator.validate('test:stringMin', { code: 123 }).valid).toBe(false);
    });

    it('validates number min and max ranges', () => {
      eventValidator.defineSchema('test:numberRange', {
        rating: { type: 'number', min: 1, max: 5 }
      });

      expect(eventValidator.validate('test:numberRange', { rating: 3 }).valid).toBe(true);
      expect(eventValidator.validate('test:numberRange', { rating: 0 }).valid).toBe(false);
      expect(eventValidator.validate('test:numberRange', { rating: 6 }).valid).toBe(false);
      expect(eventValidator.validate('test:numberRange', { rating: '3' }).valid).toBe(false);
    });

    it('identifies missing required fields', () => {
      eventValidator.defineSchema('test:required', {
        req: 'string'
      });

      const res = eventValidator.validate('test:required', {});
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Missing required field');
    });
  });

  describe('sanitizeEventPayload()', () => {
    it('strips PII fields universally', () => {
      const raw = {
        id: 1,
        email: 'user@example.com',
        phone: '123456789',
        address: '123 Main St',
        password: 'securePassword',
        creditCard: '1111222233334444'
      };

      const sanitized = sanitizeEventPayload('some:event', raw);

      expect(sanitized.id).toBe(1);
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.address).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.creditCard).toBeUndefined();
    });

    it('removes username/email unless supplement view or stack item added', () => {
      const raw = {
        userName: 'John Doe',
        userEmail: 'john@example.com',
        supplementId: 'creatina'
      };

      // Strip on general event
      const cleanGeneral = sanitizeEventPayload('general:event', raw);
      expect(cleanGeneral.userName).toBeUndefined();
      expect(cleanGeneral.userEmail).toBeUndefined();

      // Keep on supplement:view
      const cleanView = sanitizeEventPayload('supplement:view', raw);
      expect(cleanView.userName).toBe('John Doe');
      expect(cleanView.userEmail).toBe('john@example.com');
    });

    it('returns unmodified payload if not an object', () => {
      expect(sanitizeEventPayload('event', null)).toBeNull();
      expect(sanitizeEventPayload('event', 'string')).toBe('string');
    });
  });

  describe('containsPII()', () => {
    it('detects PII keys', () => {
      expect(containsPII('event', { password: 'xyz' })).toBe(true);
      expect(containsPII('event', { ssn: '123' })).toBe(true);
      expect(containsPII('event', { token: 'abc' })).toBe(true);
    });

    it('detects PII patterns: email, ssn-like, credit-card-like', () => {
      expect(containsPII('event', { contact: 'test@example.com' })).toBe(true);
      expect(containsPII('event', { document: '123-45-6789' })).toBe(true);
      expect(containsPII('event', { number: '1111222233334444' })).toBe(true);

      // Safe values
      expect(containsPII('event', { age: '25' })).toBe(false);
      expect(containsPII('event', { label: 'Whey Protein' })).toBe(false);
    });

    it('handles non-object inputs safely', () => {
      expect(containsPII('event', null)).toBe(false);
      expect(containsPII('event', 'string')).toBe(false);
    });
  });
});
