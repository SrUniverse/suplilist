import { logger } from '../shared/utils/logger.js';
/**
 * IQR (Interquartile Range) Filtering Service
 * Version: 1.0.0
 *
 * Removes price outliers using statistical IQR method
 * Preserves all legitimate products within normal distribution
 */

interface Product {
  name: string;
  price: number;
  source: 'amazon' | 'mercadolivre' | 'shopee';
  url: string;
}

interface IQRStats {
  q1: number; // 25th percentile
  q2: number; // 50th percentile (median)
  q3: number; // 75th percentile
  iqr: number; // Interquartile range (Q3 - Q1)
  lowerBound: number; // Q1 - 1.5 * IQR
  upperBound: number; // Q3 + 1.5 * IQR
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

/**
 * Calculate percentile from sorted array
 * Uses linear interpolation for non-integer positions
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate IQR statistics for price distribution
 */
function calculateIQRStats(prices: number[]): IQRStats {
  if (prices.length === 0) {
    return {
      q1: 0,
      q2: 0,
      q3: 0,
      iqr: 0,
      lowerBound: 0,
      upperBound: 0,
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
    };
  }

  // Sort prices
  const sorted = [...prices].sort((a, b) => a - b);

  // Calculate quartiles
  const q1 = percentile(sorted, 25);
  const q2 = percentile(sorted, 50);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;

  // IQR bounds for outlier detection
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Additional stats
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
    prices.length;
  const stdDev = Math.sqrt(variance);

  return {
    q1,
    q2,
    q3,
    iqr,
    lowerBound,
    upperBound,
    min,
    max,
    mean,
    stdDev,
  };
}

/**
 * Identify outlier products based on price
 * Uses IQR method: prices outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are outliers
 */
function identifyOutliers(
  products: Product[],
  stats: IQRStats
): { outliers: Product[]; valid: Product[] } {
  const outliers: Product[] = [];
  const valid: Product[] = [];

  for (const product of products) {
    // Check if price is within valid range
    if (
      product.price >= stats.lowerBound &&
      product.price <= stats.upperBound
    ) {
      valid.push(product);
    } else {
      outliers.push(product);
    }
  }

  return { outliers, valid };
}

/**
 * Detect outliers per source to avoid removing cheap alternatives
 * Useful when one marketplace has systematically lower prices
 */
function identifyOutliersPerSource(
  products: Product[],
  stats: IQRStats
): { outliers: Product[]; valid: Product[] } {
  const sources = ['amazon', 'mercadolivre', 'shopee'] as const;
  const outliers: Product[] = [];
  const valid: Product[] = [];

  for (const source of sources) {
    const sourceProducts = products.filter((p) => p.source === source);
    if (sourceProducts.length < 3) {
      // Not enough data for per-source analysis
      valid.push(...sourceProducts);
      continue;
    }

    const sourcePrices = sourceProducts.map((p) => p.price);
    const sourceStats = calculateIQRStats(sourcePrices);

    for (const product of sourceProducts) {
      if (
        product.price >= sourceStats.lowerBound &&
        product.price <= sourceStats.upperBound
      ) {
        valid.push(product);
      } else {
        outliers.push(product);
      }
    }
  }

  return { outliers, valid };
}

/**
 * Log filtering details
 */
function logFilteringDetails(
  stats: IQRStats,
  removed: Product[]
): void {
  logger.info('[IQRFilter] Price Statistics:', {
    min: `R$${stats.min.toFixed(2)}`,
    q1: `R$${stats.q1.toFixed(2)}`,
    median: `R$${stats.q2.toFixed(2)}`,
    q3: `R$${stats.q3.toFixed(2)}`,
    max: `R$${stats.max.toFixed(2)}`,
    mean: `R$${stats.mean.toFixed(2)}`,
    stdDev: `R$${stats.stdDev.toFixed(2)}`,
  });

  logger.info('[IQRFilter] Outlier Bounds:', {
    lower: `R$${stats.lowerBound.toFixed(2)}`,
    upper: `R$${stats.upperBound.toFixed(2)}`,
    iqr: `R$${stats.iqr.toFixed(2)}`,
  });

  if (removed.length > 0) {
    logger.info('[IQRFilter] Removed Outliers:');
    for (const product of removed) {
      const reason =
        product.price < stats.lowerBound ? 'suspiciously cheap' : 'suspiciously expensive';
      logger.info(`  - ${product.name}: R$${product.price.toFixed(2)} (${reason})`);
    }
  }
}

/**
 * Apply IQR filtering to remove price outliers
 *
 * Process:
 * 1. Calculate price quartiles (Q1, Q2, Q3)
 * 2. Define outlier bounds: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
 * 3. Remove products outside bounds
 * 4. Preserve per-source diversity
 */
export function filterOutliers(products: Product[]): {
  products: Product[];
  count: number;
  removed: Product[];
  stats: IQRStats;
} {
  if (products.length === 0) {
    return {
      products: [],
      count: 0,
      removed: [],
      stats: {
        q1: 0,
        q2: 0,
        q3: 0,
        iqr: 0,
        lowerBound: 0,
        upperBound: 0,
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0,
      },
    };
  }

  logger.info(`[IQRFilter] Filtering ${products.length} products`);

  // Extract prices
  const prices = products.map((p) => p.price);

  // Calculate IQR statistics
  const stats = calculateIQRStats(prices);

  // Try per-source filtering first to preserve marketplace diversity
  let { outliers, valid } = identifyOutliersPerSource(products, stats);

  // If per-source removes too much (>30%), fall back to global IQR
  if (outliers.length > products.length * 0.3) {
    logger.info(
      '[IQRFilter] Per-source filtering too aggressive, using global IQR'
    );
    const globalResult = identifyOutliers(products, stats);
    outliers = globalResult.outliers;
    valid = globalResult.valid;
  }

  // Log details
  logFilteringDetails(stats, outliers);

  logger.info(
    `[IQRFilter] Filtered: ${products.length} → ${valid.length} products (removed ${outliers.length})`
  );

  return {
    products: valid,
    count: valid.length,
    removed: outliers,
    stats,
  };
}

/**
 * Get filtering statistics
 */
export function getFilteringStats(
  original: Product[],
  filtered: Product[]
): {
  total: number;
  removed: number;
  percentage: number;
  bySource: Record<string, { total: number; kept: number }>;
} {
  const bySource: Record<string, { total: number; kept: number }> = {
    amazon: {
      total: original.filter((p) => p.source === 'amazon').length,
      kept: filtered.filter((p) => p.source === 'amazon').length,
    },
    mercadolivre: {
      total: original.filter((p) => p.source === 'mercadolivre').length,
      kept: filtered.filter((p) => p.source === 'mercadolivre').length,
    },
    shopee: {
      total: original.filter((p) => p.source === 'shopee').length,
      kept: filtered.filter((p) => p.source === 'shopee').length,
    },
  };

  return {
    total: filtered.length,
    removed: original.length - filtered.length,
    percentage: original.length > 0 ? ((original.length - filtered.length) / original.length) * 100 : 0,
    bySource,
  };
}
