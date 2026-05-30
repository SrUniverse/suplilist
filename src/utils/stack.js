/**
 * Normalizes dual-format stack items to a single supplement ID.
 * Stack items may have `supplementId` (new format) or `id` (legacy format).
 * Replaces the `item.supplementId ?? item.id` pattern used in 11+ locations.
 *
 * @param {object|null|undefined} item
 * @returns {number|string|null}
 */
export function getSupplementId(item) {
  if (item == null) return null;
  return item.supplementId ?? item.id ?? null;
}
