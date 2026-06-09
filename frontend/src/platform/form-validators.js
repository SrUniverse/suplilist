/**
 * form-validators.js — Client-side input validators for auth forms.
 *
 * Each function returns the first failing error message as a string, or null
 * if the input is valid. This lets callers do:
 *
 *   const err = validateEmail(email);
 *   if (err) { this._showError(err); return; }
 *
 * These validators act as the first line of defence — they prevent malformed
 * data from ever reaching the api-client layer. They do NOT replace server-side
 * validation, which remains the authoritative source of truth.
 *
 * Regex rationale:
 *   EMAIL_REGEX  — /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *     Checks for the structural @-separated format with a dot after @.
 *     Intentionally lenient: DNS-valid validation belongs on the server.
 *     Catches the most common typos (missing @, double @, spaces).
 *
 * Password rules are co-located with their messages so both stay in sync
 * if the UX copy changes.
 */

/** @type {RegExp} */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address for structural correctness.
 *
 * @param {string} email
 * @returns {string | null} Error message, or null if valid.
 */
export function validateEmail(email) {
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return 'Endereço de e-mail inválido.';
  }
  return null;
}

/**
 * Validates a password against the SupliList strength policy:
 *   - Minimum 8 characters
 *   - At least one digit
 *   - At least one non-alphanumeric symbol
 *
 * Returns the message for the FIRST failing rule so the user can fix
 * issues one at a time without a wall of errors.
 *
 * @param {string} password
 * @returns {string | null} Error message, or null if valid.
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um símbolo especial.';
  }
  return null;
}

/**
 * Validates that two password fields match.
 * Run this BEFORE validatePassword — the mismatch message is more
 * actionable than the strength message when the confirm field is wrong.
 *
 * @param {string} password
 * @param {string} confirm
 * @returns {string | null} Error message, or null if they match.
 */
export function validatePasswordConfirm(password, confirm) {
  if (password !== confirm) {
    return 'As senhas não coincidem.';
  }
  return null;
}
