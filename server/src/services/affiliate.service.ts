/**
 * Affiliate Service - Link Conversion Logic
 * Version: 1.0.0
 *
 * Implements regex-based URL parsing and affiliate link generation
 * for multiple platforms with caching via Redis.
 */

import { getRedisClient } from '../shared/config/redis.config';
import { logger } from '../utils/logger';

interface AffiliateResult {
  affiliateUrl: string;
  source: string;
  redirectDelay: number;
  cached: boolean;
}

/**
 * Convert Amazon URL to affiliate link
 *
 * Supports formats:
 * - https://www.amazon.com.br/dp/B123456789
 * - https://www.amazon.com.br/gp/product/B123456789
 * - https://amzn.to/3xABC...
 */
export async function convertAmazonLink(
  url: string,
  productId?: string
): Promise<AffiliateResult> {
  // Check cache first
  const cacheKey = `affiliate:amazon:${url}`;
  const redis = getRedisClient();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        ...JSON.parse(cached),
        cached: true,
      };
    }
  } catch (error) {
    logger.warn('[Affiliate] Redis cache read failed:', error);
  }

  // Extract ASIN (Amazon Standard Identification Number)
  const asinMatch = url.match(
    /(?:amazon\.com\.br|amazon\.com)(?:.*?\/(?:dp|gp\/product)\/)?([A-Z0-9]{10})/i
  );

  if (!asinMatch || !asinMatch[1]) {
    throw new Error('Invalid Amazon URL: could not extract ASIN');
  }

  const asin = asinMatch[1];
  const affiliateId = process.env.VITE_AMAZON_AFFILIATE_ID || 'suplilist01-20';

  // Build affiliate URL
  const affiliateUrl = `https://www.amazon.com.br/dp/${asin}?tag=${affiliateId}`;

  const result: AffiliateResult = {
    affiliateUrl,
    source: 'amazon',
    redirectDelay: 15, // milliseconds
    cached: false,
  };

  // Cache result for 24 hours
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(result));
  } catch (error) {
    logger.warn('[Affiliate] Redis cache write failed:', error);
  }

  return result;
}

/**
 * Convert Shopee URL to affiliate link
 *
 * Supports formats:
 * - https://shopee.com.br/product/...
 * - https://shopee.com.br/search?keyword=...
 * - Sanitize querystring to prevent XSS
 */
export async function convertShopeeLink(
  url: string,
  productId?: string
): Promise<AffiliateResult> {
  const cacheKey = `affiliate:shopee:${url}`;
  const redis = getRedisClient();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        ...JSON.parse(cached),
        cached: true,
      };
    }
  } catch (error) {
    logger.warn('[Affiliate] Redis cache read failed:', error);
  }

  // Extract product ID or search query
  const productMatch = url.match(/\/product\/(\d+)/i);
  const searchMatch = url.match(/[?&]keyword=([^&]+)/i);

  if (!productMatch && !searchMatch) {
    throw new Error('Invalid Shopee URL: could not extract product or search');
  }

  const affiliateId = process.env.VITE_SHOPEE_AFFILIATE_ID || '';

  let affiliateUrl = url;

  // For product links: Add affiliate tag
  if (productMatch) {
    const productId = productMatch[1];
    // Shopee affiliate format: https://shopee.com.br/product/{id}?sp_atk={affiliate_id}
    affiliateUrl = `https://shopee.com.br/product/${productId}`;

    if (affiliateId) {
      affiliateUrl += `?sp_atk=${encodeURIComponent(affiliateId)}`;
    }
  }

  // Sanitize querystring to prevent injection
  affiliateUrl = sanitizeShopeeUrl(affiliateUrl);

  const result: AffiliateResult = {
    affiliateUrl,
    source: 'shopee',
    redirectDelay: 20, // milliseconds
    cached: false,
  };

  // Cache for 24 hours
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(result));
  } catch (error) {
    logger.warn('[Affiliate] Redis cache write failed:', error);
  }

  return result;
}

/**
 * Convert Mercado Livre URL to affiliate link
 *
 * Supports formats:
 * - https://produto.mercadolivre.com.br/...
 * - https://www.mercadolivre.com.br/...
 */
export async function convertMercadoLivreLink(
  url: string,
  productId?: string
): Promise<AffiliateResult> {
  const cacheKey = `affiliate:mercadolivre:${url}`;
  const redis = getRedisClient();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        ...JSON.parse(cached),
        cached: true,
      };
    }
  } catch (error) {
    logger.warn('[Affiliate] Redis cache read failed:', error);
  }

  // Extract product ID from URL
  const itemMatch = url.match(/(?:produto|item|p)?\.mercadolivre\.com\.br\/[A-Z]{3}-(\d+)/i);

  if (!itemMatch || !itemMatch[1]) {
    throw new Error('Invalid Mercado Livre URL: could not extract product ID');
  }

  const productMLId = itemMatch[1];
  const affiliateId = process.env.VITE_ML_AFFILIATE_ID || '';

  // Build affiliate URL
  let affiliateUrl = `https://www.mercadolivre.com.br/item/${productMLId}`;

  if (affiliateId) {
    affiliateUrl += `#partner_id=${encodeURIComponent(affiliateId)}`;
  }

  const result: AffiliateResult = {
    affiliateUrl,
    source: 'mercadolivre',
    redirectDelay: 18, // milliseconds
    cached: false,
  };

  // Cache for 24 hours
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(result));
  } catch (error) {
    logger.warn('[Affiliate] Redis cache write failed:', error);
  }

  return result;
}

/**
 * Sanitize Shopee URL to prevent XSS/injection
 *
 * Removes dangerous parameters and encodes querystring properly.
 */
function sanitizeShopeeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Whitelist of allowed parameters
    const allowedParams = ['keyword', 'sp_atk', 'page', 'sort'];

    // Create new URLSearchParams with only allowed params
    const newParams = new URLSearchParams();

    for (const [key, value] of urlObj.searchParams.entries()) {
      if (allowedParams.includes(key)) {
        newParams.set(key, value);
      }
    }

    urlObj.search = newParams.toString();
    return urlObj.toString();
  } catch (error) {
    logger.warn('[Affiliate] URL sanitization failed:', { url, error });
    // Return original URL if sanitization fails
    return url;
  }
}

/**
 * Batch convert multiple URLs
 *
 * Useful for processing lists of products
 */
export async function convertAffiliateLinks(
  links: Array<{ url: string; source: string; productId?: string }>
): Promise<AffiliateResult[]> {
  const results = await Promise.all(
    links.map(async (link) => {
      try {
        return await convertAffiliateLink(link.url, link.source, link.productId);
      } catch (error) {
        logger.error('[Affiliate] Batch conversion error:', { link, error });
        // Return original URL on error
        return {
          affiliateUrl: link.url,
          source: link.source,
          redirectDelay: 0,
          cached: false,
        };
      }
    })
  );

  return results;
}

/**
 * Helper to convert affiliate link based on source
 */
async function convertAffiliateLink(
  url: string,
  source: string,
  productId?: string
): Promise<AffiliateResult> {
  switch (source) {
    case 'amazon':
      return convertAmazonLink(url, productId);
    case 'shopee':
      return convertShopeeLink(url, productId);
    case 'mercadolivre':
      return convertMercadoLivreLink(url, productId);
    default:
      throw new Error(`Unsupported affiliate source: ${source}`);
  }
}

/**
 * Clear affiliate cache for a specific URL or all
 * (Admin/dev use only)
 */
export async function clearAffiliateCache(urlPattern?: string): Promise<number> {
  const redis = getRedisClient();

  try {
    if (!urlPattern) {
      // Clear all affiliate cache
      const keys = await redis.keys('affiliate:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    }

    // Clear specific pattern
    const keys = await redis.keys(`affiliate:*${urlPattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    logger.error('[Affiliate] Cache clear failed:', error);
    return 0;
  }
}
