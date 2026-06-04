// ============================================================
// Analytics Validators — SupliList
// Centralized validation for analytics API parameters
// ============================================================

/**
 * Validates a date in ISO format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @param {string} [paramName='date'] - Parameter name for error messages
 * @returns {string} The validated date
 * @throws {TypeError} If date is not a string
 * @throws {Error} If date format is invalid
 */
export function validateDateISO(date, paramName = 'date') {
  if (typeof date !== 'string') {
    throw new TypeError(`${paramName} must be a string`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${paramName} must be in YYYY-MM-DD format`);
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`${paramName} is not a valid date`);
  }

  return date;
}

/**
 * Validates funnel steps array
 * @param {Array<string>} steps - Array of event names
 * @returns {Array<string>} The validated steps
 * @throws {TypeError} If steps is not an array
 * @throws {Error} If steps is empty or contains invalid items
 */
export function validateFunnelSteps(steps) {
  if (!Array.isArray(steps)) {
    throw new TypeError('steps must be an array');
  }

  if (steps.length === 0) {
    throw new Error('steps cannot be empty');
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (typeof step !== 'string' || step.trim() === '') {
      throw new Error(`steps[${i}] must be a non-empty string`);
    }
  }

  return steps;
}

/**
 * Validates a positive integer parameter
 * @param {number} value - Value to validate
 * @param {string} paramName - Parameter name for error messages
 * @param {Object} [options] - Validation options
 * @param {number} [options.min=0] - Minimum value (inclusive)
 * @param {number} [options.max=Infinity] - Maximum value (inclusive)
 * @returns {number} The validated value
 * @throws {TypeError} If value is not a number
 * @throws {RangeError} If value is out of range
 */
export function validatePositiveInteger(value, paramName, options = {}) {
  const { min = 0, max = Infinity } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError(`${paramName} must be a number`);
  }

  if (!Number.isInteger(value)) {
    throw new TypeError(`${paramName} must be an integer`);
  }

  if (value < min || value > max) {
    throw new RangeError(`${paramName} must be between ${min} and ${max}`);
  }

  return value;
}

/**
 * Validates a UTC source parameter
 * @param {string} utmSource - UTM source to validate
 * @returns {string} The validated UTM source
 * @throws {TypeError} If utmSource is not a string
 * @throws {Error} If utmSource is not in the allowed list
 */
export function validateUTMSource(utmSource) {
  if (typeof utmSource !== 'string') {
    throw new TypeError('utmSource must be a string');
  }

  const validSources = ['amazon', 'ml', 'mercadolivre', 'shopee', 'iherb', 'direct'];

  if (!validSources.includes(utmSource.toLowerCase())) {
    throw new Error(`utmSource must be one of: ${validSources.join(', ')}`);
  }

  return utmSource.toLowerCase();
}

/**
 * Validates a date range (startDate <= endDate)
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @returns {Object} Object with validated startDate and endDate
 * @throws {Error} If endDate is before startDate
 */
export function validateDateRange(startDateISO, endDateISO) {
  const start = validateDateISO(startDateISO, 'startDateISO');
  const end = validateDateISO(endDateISO, 'endDateISO');

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (endTime < startTime) {
    throw new Error('endDateISO must be greater than or equal to startDateISO');
  }

  return { startDate: start, endDate: end };
}

/**
 * Validates a user ID
 * @param {string} userId - User ID to validate
 * @returns {string} The validated user ID
 * @throws {TypeError} If userId is not a string
 * @throws {Error} If userId is empty
 */
export function validateUserId(userId) {
  if (typeof userId !== 'string') {
    throw new TypeError('userId must be a string');
  }

  if (userId.trim() === '') {
    throw new Error('userId cannot be empty');
  }

  return userId;
}
