// ============================================================
// User Profile Validator — SupliList
// Validates user profile data for recommendation engine.
// ============================================================

/**
 * Valid objective values for supplement recommendations.
 */
const VALID_OBJECTIVES = ['bulk', 'strength', 'cut', 'endurance', 'general'];

/**
 * Valid restriction values (allergies/intolerances).
 */
const VALID_RESTRICTIONS = ['lactose', 'shellfish', 'soy', 'gluten', 'nuts'];

/**
 * Validates a user profile object for the recommendation engine.
 *
 * @param {Object} userProfile - The user profile to validate
 * @param {number} userProfile.weight - User weight in kg (1-300)
 * @param {string} userProfile.objective - Training objective (bulk/strength/cut/endurance/general)
 * @param {number} [userProfile.budget=200] - Monthly budget in R$
 * @param {number} [userProfile.age=25] - User age in years
 * @param {string[]} [userProfile.restrictions=[]] - Dietary restrictions/allergies
 * @param {string[]} [userProfile.currentStack=[]] - Currently used supplement IDs
 * @param {number} [userProfile.trainingFrequency=3] - Weekly training frequency
 * @throws {TypeError} If userProfile is not an object
 * @throws {RangeError} If numeric values are out of valid ranges
 * @throws {Error} If required fields are missing or have invalid values
 */
export function validateUserProfile(userProfile) {
  // Type check
  if (!userProfile || typeof userProfile !== 'object' || Array.isArray(userProfile)) {
    throw new TypeError('userProfile must be a valid object');
  }

  // Required: weight (positive number, realistic range)
  if (typeof userProfile.weight !== 'number') {
    throw new TypeError('weight must be a number');
  }
  if (userProfile.weight <= 0 || userProfile.weight > 300) {
    throw new RangeError('weight must be between 1 and 300 kg');
  }

  // Required: objective (closed list of valid values)
  if (!userProfile.objective || typeof userProfile.objective !== 'string') {
    throw new TypeError('objective must be a string');
  }
  if (!VALID_OBJECTIVES.includes(userProfile.objective)) {
    throw new Error(`objective must be one of: ${VALID_OBJECTIVES.join(', ')}`);
  }

  // Optional: budget (non-negative number)
  if (userProfile.budget !== undefined) {
    if (typeof userProfile.budget !== 'number') {
      throw new TypeError('budget must be a number');
    }
    if (userProfile.budget < 0) {
      throw new RangeError('budget must be non-negative');
    }
  }

  // Optional: age (positive number, realistic range)
  if (userProfile.age !== undefined) {
    if (typeof userProfile.age !== 'number') {
      throw new TypeError('age must be a number');
    }
    if (userProfile.age < 0 || userProfile.age > 120) {
      throw new RangeError('age must be between 0 and 120');
    }
  }

  // Optional: restrictions (array of valid restriction strings)
  if (userProfile.restrictions !== undefined) {
    if (!Array.isArray(userProfile.restrictions)) {
      throw new TypeError('restrictions must be an array');
    }
    for (const restriction of userProfile.restrictions) {
      if (typeof restriction !== 'string') {
        throw new TypeError('each restriction must be a string');
      }
      // Warning: unknown restriction (not blocking)
      if (!VALID_RESTRICTIONS.includes(restriction)) {
        console.warn(`[ProfileValidator] Unknown restriction: ${restriction}`);
      }
    }
  }

  // Optional: currentStack (array of supplement ID strings)
  if (userProfile.currentStack !== undefined) {
    if (!Array.isArray(userProfile.currentStack)) {
      throw new TypeError('currentStack must be an array');
    }
    for (const id of userProfile.currentStack) {
      if (typeof id !== 'string') {
        throw new TypeError('each currentStack item must be a string (supplement ID)');
      }
    }
  }

  // Optional: trainingFrequency (positive number, realistic range)
  if (userProfile.trainingFrequency !== undefined) {
    if (typeof userProfile.trainingFrequency !== 'number') {
      throw new TypeError('trainingFrequency must be a number');
    }
    if (userProfile.trainingFrequency < 0 || userProfile.trainingFrequency > 14) {
      throw new RangeError('trainingFrequency must be between 0 and 14 sessions per week');
    }
  }

  return true;
}

/**
 * Sanitizes a user profile by applying defaults and normalizing values.
 *
 * @param {Object} userProfile - The user profile to sanitize
 * @returns {Object} A sanitized copy of the profile with defaults applied
 */
export function sanitizeUserProfile(userProfile) {
  return {
    weight: userProfile.weight,
    objective: userProfile.objective,
    budget: userProfile.budget ?? 200,
    age: userProfile.age ?? 25,
    restrictions: userProfile.restrictions ?? [],
    currentStack: userProfile.currentStack ?? [],
    trainingFrequency: userProfile.trainingFrequency ?? 3
  };
}
