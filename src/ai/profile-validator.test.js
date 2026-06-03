import { describe, it, expect } from 'vitest';
import { validateUserProfile, sanitizeUserProfile } from './profile-validator.js';

describe('profile-validator', () => {
  describe('validateUserProfile', () => {
    it('should accept valid profile with required fields only', () => {
      const profile = {
        weight: 75,
        objective: 'bulk'
      };
      expect(() => validateUserProfile(profile)).not.toThrow();
    });

    it('should accept valid profile with all fields', () => {
      const profile = {
        weight: 80,
        objective: 'cut',
        budget: 300,
        age: 30,
        restrictions: ['lactose'],
        currentStack: ['creatina-monohidratada'],
        trainingFrequency: 5
      };
      expect(() => validateUserProfile(profile)).not.toThrow();
    });

    it('should throw TypeError for null userProfile', () => {
      expect(() => validateUserProfile(null)).toThrow(TypeError);
    });

    it('should throw TypeError for non-object userProfile', () => {
      expect(() => validateUserProfile('invalid')).toThrow(TypeError);
      expect(() => validateUserProfile(123)).toThrow(TypeError);
      expect(() => validateUserProfile([])).toThrow(TypeError);
    });

    it('should throw TypeError for missing weight', () => {
      const profile = { objective: 'bulk' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw TypeError for non-numeric weight', () => {
      const profile = { weight: '75', objective: 'bulk' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw RangeError for weight out of range', () => {
      expect(() => validateUserProfile({ weight: 0, objective: 'bulk' })).toThrow(RangeError);
      expect(() => validateUserProfile({ weight: -10, objective: 'bulk' })).toThrow(RangeError);
      expect(() => validateUserProfile({ weight: 301, objective: 'bulk' })).toThrow(RangeError);
    });

    it('should throw TypeError for missing objective', () => {
      const profile = { weight: 75 };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw Error for invalid objective', () => {
      const profile = { weight: 75, objective: 'invalid-objective' };
      expect(() => validateUserProfile(profile)).toThrow(Error);
      expect(() => validateUserProfile(profile)).toThrow(/must be one of/);
    });

    it('should throw TypeError for non-numeric budget', () => {
      const profile = { weight: 75, objective: 'bulk', budget: 'expensive' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw RangeError for negative budget', () => {
      const profile = { weight: 75, objective: 'bulk', budget: -100 };
      expect(() => validateUserProfile(profile)).toThrow(RangeError);
    });

    it('should throw TypeError for non-numeric age', () => {
      const profile = { weight: 75, objective: 'bulk', age: '30' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw RangeError for age out of range', () => {
      expect(() =>
        validateUserProfile({ weight: 75, objective: 'bulk', age: -1 })
      ).toThrow(RangeError);
      expect(() =>
        validateUserProfile({ weight: 75, objective: 'bulk', age: 121 })
      ).toThrow(RangeError);
    });

    it('should throw TypeError for non-array restrictions', () => {
      const profile = { weight: 75, objective: 'bulk', restrictions: 'lactose' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw TypeError for non-string restriction items', () => {
      const profile = { weight: 75, objective: 'bulk', restrictions: [123] };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw TypeError for non-array currentStack', () => {
      const profile = { weight: 75, objective: 'bulk', currentStack: 'creatina' };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw TypeError for non-string currentStack items', () => {
      const profile = { weight: 75, objective: 'bulk', currentStack: [123] };
      expect(() => validateUserProfile(profile)).toThrow(TypeError);
    });

    it('should throw RangeError for trainingFrequency out of range', () => {
      expect(() =>
        validateUserProfile({ weight: 75, objective: 'bulk', trainingFrequency: -1 })
      ).toThrow(RangeError);
      expect(() =>
        validateUserProfile({ weight: 75, objective: 'bulk', trainingFrequency: 15 })
      ).toThrow(RangeError);
    });
  });

  describe('sanitizeUserProfile', () => {
    it('should apply default values for missing optional fields', () => {
      const profile = {
        weight: 75,
        objective: 'bulk'
      };
      const sanitized = sanitizeUserProfile(profile);

      expect(sanitized.weight).toBe(75);
      expect(sanitized.objective).toBe('bulk');
      expect(sanitized.budget).toBe(200); // default
      expect(sanitized.age).toBe(25); // default
      expect(sanitized.restrictions).toEqual([]); // default
      expect(sanitized.currentStack).toEqual([]); // default
      expect(sanitized.trainingFrequency).toBe(3); // default
    });

    it('should preserve provided optional values', () => {
      const profile = {
        weight: 80,
        objective: 'cut',
        budget: 300,
        age: 30,
        restrictions: ['lactose'],
        currentStack: ['creatina-monohidratada'],
        trainingFrequency: 5
      };
      const sanitized = sanitizeUserProfile(profile);

      expect(sanitized).toEqual(profile);
    });

    it('should not mutate original profile', () => {
      const profile = {
        weight: 75,
        objective: 'bulk'
      };
      const original = { ...profile };
      sanitizeUserProfile(profile);

      expect(profile).toEqual(original);
    });
  });
});
