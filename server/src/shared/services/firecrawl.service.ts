/**
 * FirecrawlService — Web scraping via Firecrawl API
 * Economical implementation: 1 request per source, batch processing
 */

import axios from 'axios';
import { buildAffiliateLink, isDirectProductUrl, type Marketplace } from './affiliate-link.builder.js';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
  };
  error?: string;
}

interface ScrapedSupplement {
  name: string;
  dosage?: string;
  price: number;
  /** Best link for the user — affiliate-applied when the marketplace supports it. */
  url: string;
  /** Direct product page URL when one was found in the scrape, else undefined. */
  directUrl?: string;
  /** True only when an affiliate identifier that credits the sale was applied. */
  affiliateApplied?: boolean;
  source: Marketplace;
}

export class FirecrawlService {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v1';
  private maxRetries = 3;
  private retryDelayMs = 2000;
  private affiliateCodes: {
    amazon: string;
    mercadolivre: string;
    shopee: string;
  };

  /**
   * Mask sensitive data in URLs for safe logging
   * Replaces UUIDs, tokens, and API keys with ***
   */
  private maskSensitiveData(text: string): string {
    if (!text) return text;
    // Mask UUIDs (8-4-4-4-12 format)
    let masked = text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '***-UUID-***');
    // Mask API keys and tokens (sk-xxx, Bearer tokens)
    masked = masked.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***');
    masked = masked.replace(/Bearer\s+[a-zA-Z0-9_.=-]+/g, 'Bearer ***');
    return masked;
  }

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn('[FirecrawlService] FIRECRAWL_API_KEY not configured — price crawling disabled');
    }
    this.apiKey = apiKey || '';

    // Load affiliate codes from environment variables
    const amazonCode = process.env.AFFILIATE_CODE_AMAZON;
    const mercadolivreCode = process.env.AFFILIATE_CODE_MERCADOLIVRE;
    const shopeeCode = process.env.AFFILIATE_CODE_SHOPEE;

    if (!amazonCode || !mercadolivreCode || !shopeeCode) {
      console.warn(
        '[FirecrawlService] ⚠️ WARNING: One or more affiliate codes are missing in environment variables. ' +
        'Affiliate tracking may not work correctly. Required: AFFILIATE_CODE_AMAZON, AFFILIATE_CODE_MERCADOLIVRE, AFFILIATE_CODE_SHOPEE'
      );
    }

    this.affiliateCodes = {
      amazon: amazonCode || 'suplilist01-20', // Fallback to default
      mercadolivre: mercadolivreCode || 'FULZ93-PCG7',
      shopee: shopeeCode || 'CLH-CZB-PNR',
    };

    console.log('[FirecrawlService] ✓ Affiliate codes loaded from environment variables');
  }

  /**
   * Scrape supplements from a single source with batch extraction
   * ✅ ECONOMIA: 1 request por source = 3 requests/dia máximo
   */
  async scrapeSupplementsFromSource(
    source: 'amazon' | 'mercadolivre' | 'shopee',
    searchQuery: string = 'suplementos'
  ): Promise<ScrapedSupplement[]> {
    const urls = this.getSearchUrls(source, searchQuery);

    try {
      const results: ScrapedSupplement[] = [];

      for (const url of urls) {
        const data = await this.scrapeWithRetry(url);
        if (data) {
          const supplements = this.parseSupplements(data, source);
          results.push(...supplements);
        }
      }

      return results;
    } catch (error) {
      console.error(`[FirecrawlService] Error scraping ${source}:`, error);
      return [];
    }
  }

  /**
   * Search for a specific supplement across all sources (on-demand)
   * ✅ Resilient: Continues even if one source fails
   */
  async searchSupplementOnDemand(supplementName: string): Promise<ScrapedSupplement[]> {
    console.log(`[FirecrawlService] On-demand search for: ${supplementName}`);

    const sources: Array<'amazon' | 'mercadolivre' | 'shopee'> = ['amazon', 'mercadolivre', 'shopee'];
    const allResults: ScrapedSupplement[] = [];
    const errors: Array<{ source: string; error: string }> = [];

    for (const source of sources) {
      try {
        const results = await this.scrapeSupplementsFromSource(source, supplementName);
        allResults.push(...results);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[FirecrawlService] ${source} failed during on-demand search:`, errorMsg);
        errors.push({ source, error: errorMsg });
      }
    }

    // Log warnings if some sources failed
    if (errors.length > 0) {
      console.warn(
        `[FirecrawlService] On-demand search completed with ${errors.length} source(s) failing:`,
        errors.map((e) => `${e.source} (${e.error})`).join('; ')
      );
    }

    if (allResults.length === 0 && errors.length > 0) {
      console.warn(`[FirecrawlService] No results found - all sources failed for: ${supplementName}`);
    }

    return allResults;
  }

  private async scrapeWithRetry(url: string, attempt = 1): Promise<string | null> {
    try {
      console.log(`[FirecrawlService] Scraping (attempt ${attempt}): ${this.maskSensitiveData(url)}`);

      const response = await axios.post<FirecrawlResponse>(
        `${this.baseUrl}/scrape`,
        {
          url,
          formats: ['markdown'],
          timeout: 30000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 35000, // Axios request timeout
        }
      );

      if (response.data.success && response.data.data?.markdown) {
        console.log(`[FirecrawlService] ✓ Successfully scraped (attempt ${attempt}): ${this.maskSensitiveData(url)}`);
        return response.data.data.markdown;
      }

      throw new Error(`Firecrawl error: ${response.data.error || 'Unknown error'}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check for specific timeout errors
      if (errorMsg.includes('timeout') || errorMsg.includes('ECONNABORTED')) {
        console.warn(`[FirecrawlService] Timeout on attempt ${attempt}: ${this.maskSensitiveData(url)}`);
      }

      if (attempt < this.maxRetries) {
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[FirecrawlService] Retry in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.scrapeWithRetry(url, attempt + 1);
      }

      console.error(`[FirecrawlService] Failed after ${this.maxRetries} attempts: ${this.maskSensitiveData(url)} (${errorMsg})`);
      return null;
    }
  }

  private getSearchUrls(source: 'amazon' | 'mercadolivre' | 'shopee', query: string): string[] {
    const encoded = encodeURIComponent(query);

    switch (source) {
      case 'amazon':
        return [`https://www.amazon.com.br/s?k=${encoded}`];
      case 'mercadolivre':
        return [`https://lista.mercadolivre.com.br/${encoded}`];
      case 'shopee':
        return [`https://shopee.com.br/search?keyword=${encoded}`];
    }
  }

  /**
   * Parse scraped markdown/html to extract supplement data
   * Improved: handles multiple price formats, better product name extraction
   *
   * SECURITY: Uses hardcoded regex patterns only - user input is NOT used in regex construction
   * to prevent NoSQL injection attacks via $regex operators
   */
  private parseSupplements(content: string, source: 'amazon' | 'mercadolivre' | 'shopee'): ScrapedSupplement[] {
    const results: ScrapedSupplement[] = [];

    console.log(`[FirecrawlService] Parsing ${source} content (${content.length} chars)`);

    // More flexible price regex to handle various formats
    // Matches: R$ 59,00 | R$ 59.99,00 | R$59,00 | $59.00
    // NOTE: This regex is hardcoded and NOT derived from user input - SAFE for database use
    const priceRegex = /[\$R]*\s*(\d{1,3}(?:\.\d{3})*|\d+)[\,\.]\d{2}/gi;

    // Extract all potential product items with better splitting
    // Split by common markup patterns or prices
    const productBlocks = content.split(/[\n]+/).filter((line) => line.trim().length > 5);

    const seen = new Set<string>();

    for (let i = 0; i < productBlocks.length; i++) {
      const block = productBlocks[i];
      const priceMatch = block.match(priceRegex);

      if (priceMatch) {
        // Clean and parse price
        const priceStr = priceMatch[0];
        const priceNum = priceStr
          .replace(/[\$R\s]/g, '')
          .replace(/\./g, '') // Remove thousand separators
          .replace(',', '.'); // Convert comma to dot
        const price = parseFloat(priceNum);

        // Find product name - look before the price in same block
        const blockBeforePrice = block.substring(0, block.indexOf(priceStr));
        let productName = this.extractProductName(blockBeforePrice || block);

        // If name not found in current block, check previous block
        if (!productName && i > 0) {
          productName = this.extractProductName(productBlocks[i - 1]);
        }

        // Validate the extracted data
        if (productName && price > 10 && price < 1000) {
          // Valid supplement price range
          const normalizedName = this.normalizeProductName(productName);
          const key = normalizedName.toLowerCase();

          // Skip duplicates
          if (seen.has(key)) {
            console.log(`[FirecrawlService] Skipping duplicate: ${normalizedName}`);
            continue;
          }

          seen.add(key);

          // Prefer the DIRECT product link found in the scraped markdown.
          // The product heading (with the link) usually sits a few lines ABOVE
          // the price, so search a small window nearest-to-price first to avoid
          // picking up the previous product's link.
          const lookback: string[] = [];
          for (let j = i; j >= Math.max(0, i - 3); j--) {
            lookback.push(productBlocks[j]);
          }
          const directUrl = this.extractProductUrl(lookback, source);
          // Fall back to a marketplace search URL when no product link is present.
          const linkBase = directUrl ?? this.getSearchUrls(source, normalizedName)[0];
          const { url, affiliateApplied, reason } = buildAffiliateLink(
            linkBase,
            source,
            this.affiliateCodes
          );

          if (!affiliateApplied && reason) {
            console.warn(`[FirecrawlService] No affiliate credit for ${source}: ${reason}`);
          }

          console.log(
            `[FirecrawlService] Found: ${normalizedName} @ R$${price.toFixed(2)} ` +
              `(${source}, ${directUrl ? 'direct link' : 'search link'}, ` +
              `affiliate ${affiliateApplied ? 'applied' : 'pending'})`
          );

          results.push({
            name: normalizedName,
            price,
            url,
            directUrl,
            affiliateApplied,
            source,
          });
        }
      }
    }

    console.log(
      `[FirecrawlService] Parsed ${results.length} products from ${source}`
    );
    return results;
  }

  /**
   * Extract product name from text
   * Handles various product name formats in Portuguese
   */
  private extractProductName(text: string): string | null {
    // Remove extra whitespace
    text = text.trim().replace(/\s+/g, ' ');

    // Remove markdown formatting
    text = text.replace(/[*_`~]/g, '').trim();

    // Find longest meaningful text block (likely the product name)
    // Avoid short words and numbers-only blocks
    const parts = text.split(/[|•\-–]/);

    for (const part of parts) {
      const clean = part.trim();

      // Product name should have letters, be 8+ chars, contain Portuguese supplement keywords
      if (
        clean.length > 8 &&
        /[a-záéíóúãõç]/i.test(clean) &&
        clean.match(
          /creatina|whey|proteína|colágeno|ômega|vitamina|magnésio|zinco|vitamina|cafeína|colágeno/i
        )
      ) {
        return clean;
      }
    }

    // Fallback: take longest non-numeric text > 8 chars
    for (const part of parts) {
      const clean = part.trim();
      if (clean.length > 8 && !/^\d+/.test(clean)) {
        return clean;
      }
    }

    return null;
  }

  /**
   * Normalize product name for storage and matching
   * - Remove duplicates
   * - Standardize format
   */
  private normalizeProductName(name: string): string {
    return (
      name
        // Remove URLs and HTML
        .replace(/(https?:)?\/\/[^\s]+/g, '')
        // Remove email addresses
        .replace(/\S+@\S+/g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove common suffixes that are redundant
        .replace(/\s+(compre|clique|acesse|saiba)\s+/gi, ' ')
        // Capitalize first letter of each major word
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    );
  }

  /**
   * Extract a marketplace product URL from scraped markdown blocks.
   *
   * Looks for a markdown link target `[text](url)` or a bare URL that belongs to
   * the marketplace domain. Prefers a direct product page (per
   * isDirectProductUrl); otherwise returns the first marketplace URL found, or
   * undefined when none is present (caller falls back to a search URL).
   *
   * Affiliate attribution is applied separately by buildAffiliateLink — this
   * method only locates the link.
   */
  private extractProductUrl(blocks: string[], source: Marketplace): string | undefined {
    const domain = this.getDomain(source);
    // Capture markdown link targets and bare URLs containing the marketplace domain.
    const urlPattern = new RegExp(
      `(https?:\\/\\/)?(?:www\\.|produto\\.|lista\\.)?${domain.replace(/\./g, '\\.')}[^\\s)\\]"']*`,
      'gi'
    );

    let firstMatch: string | undefined;

    for (const block of blocks) {
      if (!block) continue;
      const matches = block.match(urlPattern);
      if (!matches) continue;

      for (const raw of matches) {
        const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
        firstMatch ??= normalized;
        // Prefer a direct product page as soon as we find one.
        if (isDirectProductUrl(normalized, source)) {
          return normalized;
        }
      }
    }

    return firstMatch;
  }

  /** Canonical domain per marketplace, used for URL matching. */
  private getDomain(source: Marketplace): string {
    switch (source) {
      case 'amazon':
        return 'amazon.com.br';
      case 'mercadolivre':
        return 'mercadolivre.com.br';
      case 'shopee':
        return 'shopee.com.br';
    }
  }
}

export default new FirecrawlService();
