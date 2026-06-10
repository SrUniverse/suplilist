/**
 * Crawler Blocking Middleware
 * Version: 1.0.0
 *
 * Detects and blocks automated crawlers/bots from accessing /out endpoint.
 * Uses User-Agent patterns and behavioral heuristics.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Common crawler/bot User-Agent patterns
 */
const CRAWLER_PATTERNS = [
  // Search engines
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,

  // Social media crawlers
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,

  // Monitoring/Scanning tools
  /curl/i,
  /wget/i,
  /python/i,
  /java(?!script)/i,
  /go-http-client/i,
  /request\//i, // Node.js request library
  /scrapy/i,
  /selenium/i,
  /phantomjs/i,
  /puppeteer/i,

  // Suspicious patterns
  /bot/i,
  /crawler/i,
  /spider/i,
  /scrape/i,
  /auto/i,
  /load.?test/i,
];

/**
 * Crawler blocking middleware
 *
 * Returns 403 Forbidden if User-Agent matches crawler patterns
 */
export async function crawlerBlockMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userAgent = req.get('User-Agent') || '';

  // Check if User-Agent matches crawler patterns
  const isCrawler = CRAWLER_PATTERNS.some((pattern) => pattern.test(userAgent));

  if (isCrawler) {
    logger.warn('[CrawlerBlock] Blocked crawler request:', {
      userAgent,
      ip: getClientIp(req),
      path: req.path,
      url: req.originalUrl,
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Automated requests are not allowed',
    });
  }

  // Check for suspicious request patterns
  if (isSuspiciousRequest(req)) {
    logger.warn('[CrawlerBlock] Suspicious request detected:', {
      userAgent,
      ip: getClientIp(req),
      headers: req.headers,
    });

    // Don't block, but flag it for monitoring
    res.setHeader('X-Suspicious-Request', 'true');
  }

  next();
}

/**
 * Detect suspicious request patterns
 *
 * Returns true if request looks like automated scraping
 */
function isSuspiciousRequest(req: Request): boolean {
  const userAgent = req.get('User-Agent') || '';

  // Missing or empty User-Agent
  if (!userAgent || userAgent.length < 10) {
    return true;
  }

  // No common browser headers
  if (!req.get('Accept') || !req.get('Accept-Language')) {
    return true;
  }

  // Suspicious header combinations
  if (
    req.get('X-Automated-Tool') ||
    req.get('X-Scanner') ||
    req.get('X-Crawler')
  ) {
    return true;
  }

  // No Referer header (might indicate direct access)
  // This is a weak signal, but combined with other factors...
  const hasReferer = req.get('Referer');
  const isBrowserUser = /mozilla|chrome|safari|edge|firefox/i.test(userAgent);

  if (!hasReferer && isBrowserUser === false) {
    return true;
  }

  return false;
}

/**
 * Get client IP from request
 */
function getClientIp(req: Request): string {
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = req.get('X-Real-IP');
  if (xRealIp) {
    return xRealIp;
  }

  return req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
}

/**
 * Whitelist specific User-Agents or IPs
 * (For monitoring tools, partners, etc.)
 */
const WHITELIST = [
  // Add trusted User-Agents here
  // Example: /our-internal-tool/i
];

/**
 * Override crawler blocking for whitelisted agents
 */
export function isCrawlerWhitelisted(userAgent: string): boolean {
  return WHITELIST.some((pattern) => pattern.test(userAgent));
}
