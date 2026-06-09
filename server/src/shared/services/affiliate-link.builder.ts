/**
 * affiliate-link.builder.ts — Build marketplace links with affiliate attribution.
 *
 * Goal: given a marketplace URL (ideally a DIRECT product page, otherwise a
 * search page), return the best link to send a user to, plus whether an
 * affiliate identifier that actually credits the sale was applied.
 *
 * Per-marketplace reality (researched against current affiliate programs):
 *
 *   Amazon Associates — appending `?tag=<assoc-id>` to ANY amazon.com.br URL
 *     (product or search) credits the sale. This is the documented, reliable
 *     mechanism and is implemented here.
 *
 *   Mercado Livre — affiliate links are generated ONLY through the affiliate
 *     portal ("Criar link") or the affiliate API. There is NO query parameter
 *     you can append to a product URL that credits. We therefore return the
 *     direct product URL unchanged and report affiliateApplied = false until
 *     ML affiliate-API integration (credentials) is added.
 *
 *   Shopee — requires a tracked deep link generated via the Affiliate API
 *     (`generateShortLink` with originUrl + subIds), which needs an App ID and
 *     Secret. A `&affid=` query param on a product/search URL does NOT credit.
 *     We return the direct URL unchanged and report affiliateApplied = false
 *     until Shopee Affiliate-API integration (credentials) is added.
 *
 * This module is intentionally pure (no network, no env reads) so it is fully
 * unit-testable. Network-based link generation (Shopee/ML APIs) belongs in a
 * separate service that calls into this one for the Amazon path.
 */

export type Marketplace = 'amazon' | 'mercadolivre' | 'shopee';

export interface AffiliateCodes {
  amazon: string;
  mercadolivre: string;
  shopee: string;
}

export interface AffiliateLinkResult {
  /** Best link to send the user to (affiliate-applied when possible). */
  url: string;
  /** True only when an identifier that actually credits the sale was applied. */
  affiliateApplied: boolean;
  /**
   * Reason affiliate attribution could not be applied, when affiliateApplied is
   * false. Useful for logging/monitoring. null when applied successfully.
   */
  reason: string | null;
}

/**
 * Patterns that identify a DIRECT product page (as opposed to a search page).
 * Used by isDirectProductUrl so callers can prefer product links.
 */
const PRODUCT_URL_PATTERNS: Record<Marketplace, RegExp> = {
  // /dp/ASIN or /gp/product/ASIN
  amazon: /amazon\.[a-z.]+\/(?:[^?#]*\/)?(?:dp|gp\/product)\/[A-Z0-9]{10}/i,
  // .../MLB-123456789 or .../p/MLB123 product detail pages
  mercadolivre: /(?:produto\.mercadolivre\.com\.br|mercadolivre\.com\.br\/[^?#]*(?:\/p\/|MLB-?\d+))/i,
  // Shopee canonical product URL: ...-i.<shopid>.<itemid>  or  /product/<shopid>/<itemid>
  shopee: /shopee\.com\.br\/(?:[^?#]*-i\.\d+\.\d+|product\/\d+\/\d+)/i,
};

/**
 * Returns true when the URL points to a direct product page for the marketplace.
 */
export function isDirectProductUrl(url: string, source: Marketplace): boolean {
  if (!url) return false;
  return PRODUCT_URL_PATTERNS[source].test(url);
}

/**
 * Append (or overwrite) the Amazon Associates `tag` query parameter.
 * Works for both product and search URLs.
 */
function applyAmazonTag(rawUrl: string, tag: string): string {
  if (!tag) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (!/amazon\./i.test(u.hostname)) return rawUrl;
    u.searchParams.set('tag', tag);
    return u.toString();
  } catch {
    // Not a parseable absolute URL — append defensively without duplicating tag.
    if (/[?&]tag=/.test(rawUrl)) return rawUrl;
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}tag=${encodeURIComponent(tag)}`;
  }
}

/**
 * Build the best affiliate link for a marketplace URL.
 *
 * @param rawUrl Direct product URL when available, otherwise a search URL.
 * @param source Marketplace the URL belongs to.
 * @param codes  Affiliate identifiers loaded from environment.
 */
export function buildAffiliateLink(
  rawUrl: string,
  source: Marketplace,
  codes: AffiliateCodes
): AffiliateLinkResult {
  switch (source) {
    case 'amazon':
      return {
        url: applyAmazonTag(rawUrl, codes.amazon),
        affiliateApplied: Boolean(codes.amazon),
        reason: codes.amazon ? null : 'amazon affiliate tag not configured',
      };

    case 'mercadolivre':
      return {
        url: rawUrl,
        affiliateApplied: false,
        reason:
          'Mercado Livre crediting requires affiliate-portal/API link generation; ' +
          'a query parameter on a product URL does not credit.',
      };

    case 'shopee':
      return {
        url: rawUrl,
        affiliateApplied: false,
        reason:
          'Shopee crediting requires Affiliate-API generateShortLink (App ID + Secret); ' +
          'a query parameter on a product URL does not credit.',
      };

    default: {
      // Exhaustiveness guard — TypeScript flags if a Marketplace is unhandled.
      const _never: never = source;
      return { url: rawUrl, affiliateApplied: false, reason: `unknown source: ${String(_never)}` };
    }
  }
}
