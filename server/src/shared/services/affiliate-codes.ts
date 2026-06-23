/**
 * affiliate-codes.ts — Single source of truth for resolving affiliate codes
 * from the environment.
 *
 * Historically two naming conventions drifted apart:
 *   - the runtime crawl path read  AFFILIATE_CODE_AMAZON / _MERCADOLIVRE / _SHOPEE
 *   - the catalog export/import pipeline read VITE_AMAZON_AFFILIATE_ID /
 *     VITE_ML_AFFILIATE_ID / VITE_SHOPEE_AFFILIATE_ID
 *
 * Setting only one set silently produced non-crediting links on the other path.
 * This resolver accepts BOTH names (preferring the explicit AFFILIATE_CODE_*,
 * falling back to the VITE_* names) so a single configuration credits every
 * path. Defaults match the values previously hardcoded in firecrawl.service.ts.
 */

import type { AffiliateCodes } from './affiliate-link.builder.js';

/** Default Amazon Associates tag used when no env var is set. */
const DEFAULT_AMAZON_TAG = 'suplilist01-20';
/** Default Mercado Livre Impact code ("matt:<word>:<toolId>"). */
const DEFAULT_ML_CODE = 'matt:suplilist:35217033';

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return '';
}

export interface ResolveAffiliateOptions {
  /**
   * When true, fall back to the built-in defaults for Amazon/ML if neither env
   * var is set. The runtime crawl path wants this (always emit a tag); the
   * static export path passes false so a missing config surfaces a warning
   * instead of silently shipping a default tag.
   */
  useDefaults?: boolean;
}

/**
 * Resolve affiliate codes from the environment, accepting both the
 * AFFILIATE_CODE_* and VITE_*_AFFILIATE_ID naming conventions.
 */
export function resolveAffiliateCodes(
  env: NodeJS.ProcessEnv = process.env,
  { useDefaults = false }: ResolveAffiliateOptions = {}
): AffiliateCodes {
  const amazon = firstNonEmpty(env.AFFILIATE_CODE_AMAZON, env.VITE_AMAZON_AFFILIATE_ID);
  const mercadolivre = firstNonEmpty(env.AFFILIATE_CODE_MERCADOLIVRE, env.VITE_ML_AFFILIATE_ID);
  const shopee = firstNonEmpty(env.AFFILIATE_CODE_SHOPEE, env.VITE_SHOPEE_AFFILIATE_ID);

  return {
    amazon: amazon || (useDefaults ? DEFAULT_AMAZON_TAG : ''),
    mercadolivre: mercadolivre || (useDefaults ? DEFAULT_ML_CODE : ''),
    // Shopee never has a usable default — crediting needs the Affiliate API.
    shopee,
  };
}
