/**
 * Returns today's date as an ISO string (YYYY-MM-DD).
 * Canonical replacement for new Date().toISOString().split('T')[0]
 * duplicated across 5 files.
 * @returns {string}
 */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the ISO date string for N days ago.
 * @param {number} days - Number of days to subtract from today (0 = today)
 * @returns {string}
 */
export function offsetISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
