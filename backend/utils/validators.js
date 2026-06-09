/**
 * Validates a string as a properly formatted email address.
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates a string as a MongoDB ObjectId (24-char hex).
 */
export function validateObjectId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}
