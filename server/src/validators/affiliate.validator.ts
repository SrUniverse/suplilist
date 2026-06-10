/**
 * Affiliate Input Validation
 * Version: 1.0.0
 *
 * Validates request body for /api/affiliate/out endpoint
 * Using Zod for schema-based validation with automatic error messages
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Affiliate request schema
 *
 * POST /api/affiliate/out
 * {
 *   "url": "https://www.amazon.com.br/dp/B123456789",
 *   "source": "amazon|shopee|mercadolivre",
 *   "productId": "optional-internal-id"
 * }
 */
export const affiliateRequestSchema = z.object({
  url: z
    .string()
    .url('Invalid URL format')
    .refine(
      (url) =>
        /amazon\.com\.br|shopee\.com\.br|mercadolivre\.com\.br/.test(url),
      'URL must be from a supported affiliate partner (Amazon, Shopee, Mercado Livre)'
    ),

  source: z
    .enum(['amazon', 'shopee', 'mercadolivre'], {
      errorMap: () => ({
        message:
          'Invalid affiliate source. Must be: amazon, shopee, or mercadolivre',
      }),
    })
    .describe('Affiliate partner source'),

  productId: z
    .string()
    .optional()
    .describe('Internal product identifier for tracking'),
});

export type AffiliateRequest = z.infer<typeof affiliateRequestSchema>;

/**
 * Middleware to validate affiliate request
 *
 * Validates request body and returns 400 on invalid data
 */
export async function validateAffiliateInput(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const result = affiliateRequestSchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;

      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request parameters',
        details: Object.entries(errors).reduce(
          (acc, [field, messages]) => {
            acc[field] = messages?.[0] || 'Invalid value';
            return acc;
          },
          {} as Record<string, string>
        ),
      });
    }

    // Attach validated data to request
    req.body = result.data;
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Failed to parse request body',
    });
  }
}

/**
 * Additional validation functions for specific fields
 */

/**
 * Validate Amazon URL and extract ASIN
 */
export function validateAmazonUrl(
  url: string
): { valid: boolean; asin?: string; error?: string } {
  try {
    const urlObj = new URL(url);

    // Check domain
    if (!urlObj.hostname.includes('amazon.com.br')) {
      return { valid: false, error: 'Not an Amazon.com.br URL' };
    }

    // Extract ASIN
    const asinMatch = urlObj.pathname.match(
      /(?:dp|gp\/product)\/([A-Z0-9]{10})/i
    );

    if (!asinMatch || !asinMatch[1]) {
      return { valid: false, error: 'Could not extract ASIN from URL' };
    }

    return { valid: true, asin: asinMatch[1] };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate Shopee URL
 */
export function validateShopeeUrl(
  url: string
): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('shopee.com.br')) {
      return { valid: false, error: 'Not a Shopee.com.br URL' };
    }

    // Check if it's a product or search URL
    if (!/\/product\/|search\?/.test(url)) {
      return {
        valid: false,
        error: 'Must be a product or search URL',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate Mercado Livre URL
 */
export function validateMercadoLivreUrl(
  url: string
): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('mercadolivre.com.br')) {
      return { valid: false, error: 'Not a Mercado Livre.com.br URL' };
    }

    // Check if it contains product/item ID
    if (!/item|product/.test(url)) {
      return {
        valid: false,
        error: 'Must be a product item URL',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Sanitize and normalize affiliate URLs
 *
 * Removes tracking parameters that might conflict with affiliate tags
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove common tracking parameters that might interfere
    const paramsToRemove = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fbclid',
      'gclid',
      'msclkid',
      'ref',
      'tag', // Custom tags from other affiliates
    ];

    paramsToRemove.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch {
    return url; // Return original if sanitization fails
  }
}
