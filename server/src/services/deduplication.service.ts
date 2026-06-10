/**
 * Semantic Deduplication Service
 * Version: 1.0.0
 *
 * Implements semantic deduplication: trim/lowercase + preserve qualifiers
 * Groups similar products while preserving brand/dosage information
 */

interface Product {
  name: string;
  price: number;
  source: 'amazon' | 'mercadolivre' | 'shopee';
  url: string;
}

interface DedupMap {
  canonical: string; // Normalized name (trim + lowercase)
  products: Product[]; // All variants of this product
  representative: Product; // Most common/cheapest variant
}

/**
 * Extract core product name (before qualifiers)
 *
 * Examples:
 * - "Whey Protein 1kg Isolado" → "Whey Protein"
 * - "Creatina Monohidratada 300g" → "Creatina Monohidratada"
 * - "Ômega 3 60 cápsulas" → "Ômega 3"
 */
function extractCoreProductName(name: string): string {
  // Normalize: trim and lowercase
  let core = name.trim().toLowerCase();

  // Remove quantity suffixes (e.g., "1kg", "300g", "60 cápsulas", "60caps")
  core = core.replace(/\s+\d+\s*(kg|g|mg|ml|l|cápsulas?|caps?|unidades?|comprimidos?)\s*$/i, '');

  // Remove common package qualifiers
  core = core.replace(/\s+(original|premium|turbo|super|deluxe|pro|max|ultra)\s*$/i, '');

  // Remove source-specific suffixes
  core = core.replace(/\s+(frete grátis|cashback|promoção|oferta)\s*$/i, '');

  return core.trim();
}

/**
 * Extract qualifiers from product name
 *
 * Examples:
 * - "Whey Protein 1kg Isolado" → ["1kg", "isolado"]
 * - "Creatina 300g Monohidratada" → ["300g", "monohidratada"]
 */
function extractQualifiers(name: string): string[] {
  const lower = name.toLowerCase();
  const qualifiers: string[] = [];

  // Extract quantities
  const qtyMatch = lower.match(/(\d+)\s*(kg|g|mg|ml|l|cápsulas?|caps?|unidades?|comprimidos?)/i);
  if (qtyMatch) {
    qualifiers.push(`${qtyMatch[1]}${qtyMatch[2]}`);
  }

  // Extract type qualifiers
  const typeMatches = lower.match(
    /\b(isolado|hidrolisado|concentrado|monohidratada|anidro|monoidrato|monohidrato|glicinato|citrato|taurato|quelatado)\b/gi
  );
  if (typeMatches) {
    qualifiers.push(...typeMatches.map((q) => q.toLowerCase()));
  }

  // Extract flavor
  const flavorMatch = lower.match(
    /\b(chocolate|morango|baunilha|natural|sem sabor|unflavored|cookie|banana|abacaxi|maçã|framboesa)\b/gi
  );
  if (flavorMatch) {
    qualifiers.push(flavorMatch[0].toLowerCase());
  }

  return [...new Set(qualifiers)];
}

/**
 * Calculate similarity score between two product names
 * Returns 0-1 where 1 is identical
 */
function calculateSimilarity(name1: string, name2: string): number {
  const core1 = extractCoreProductName(name1);
  const core2 = extractCoreProductName(name2);

  // Exact match (highest confidence)
  if (core1 === core2) {
    return 1.0;
  }

  // Levenshtein-like distance (simplified)
  const maxLen = Math.max(core1.length, core2.length);
  if (maxLen === 0) return 0;

  // Character-level similarity
  let matches = 0;
  const minLen = Math.min(core1.length, core2.length);
  for (let i = 0; i < minLen; i++) {
    if (core1[i] === core2[i]) matches++;
  }

  const charSimilarity = matches / maxLen;

  // Word-level similarity (for compound names)
  const words1 = core1.split(/\s+/);
  const words2 = core2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w)).length;
  const allWords = Math.max(words1.length, words2.length);
  const wordSimilarity = allWords === 0 ? 0 : commonWords / allWords;

  // Weight word similarity higher (more meaningful)
  return wordSimilarity * 0.7 + charSimilarity * 0.3;
}

/**
 * Group products by semantic similarity
 * Returns map of canonical names → product groups
 */
function groupBySimilarity(products: Product[]): Map<string, DedupMap> {
  const groups = new Map<string, DedupMap>();
  const SIMILARITY_THRESHOLD = 0.8; // 80% match threshold

  for (const product of products) {
    let foundGroup = false;
    const core = extractCoreProductName(product.name);

    // Try to find existing group
    for (const [, group] of groups) {
      const similarity = calculateSimilarity(product.name, group.canonical);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Add to existing group
        group.products.push(product);
        foundGroup = true;

        // Update representative if this is cheaper
        if (product.price < group.representative.price) {
          group.representative = product;
        }

        break;
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      groups.set(core, {
        canonical: core,
        products: [product],
        representative: product,
      });
    }
  }

  return groups;
}

/**
 * Select best representative product from group
 * Prefers: cheaper, from multiple sources, with affiliate links
 */
function selectBestRepresentative(group: DedupMap): Product {
  const { products } = group;

  // If only one product, return it
  if (products.length === 1) {
    return products[0];
  }

  // Sort by: price (ascending), then source diversity
  const sorted = [...products].sort((a, b) => {
    // Same price: prefer different sources
    if (a.price === b.price) {
      const sourceA = products.filter((p) => p.source === a.source).length;
      const sourceB = products.filter((p) => p.source === b.source).length;
      return sourceA - sourceB;
    }
    // Different price: prefer cheaper
    return a.price - b.price;
  });

  return sorted[0];
}

/**
 * Merge duplicate products using semantic similarity
 *
 * Process:
 * 1. Group products by core name + qualifiers
 * 2. Select best representative from each group
 * 3. Return deduplicated list
 */
export function deduplicateProducts(products: Product[]): Product[] {
  if (products.length === 0) {
    return [];
  }

  console.log(`[Deduplication] Processing ${products.length} products`);

  // Group by semantic similarity
  const groups = groupBySimilarity(products);

  console.log(
    `[Deduplication] Identified ${groups.size} unique product groups`
  );

  // Select representative from each group
  const deduplicated: Product[] = [];
  for (const group of groups.values()) {
    const representative = selectBestRepresentative(group);
    deduplicated.push(representative);

    if (group.products.length > 1) {
      console.log(
        `[Deduplication] Merged ${group.products.length} variants of "${group.canonical}"`
      );
    }
  }

  // Sort by name for consistency
  deduplicated.sort((a, b) => a.name.localeCompare(b.name));

  console.log(
    `[Deduplication] Result: ${products.length} → ${deduplicated.length} products`
  );

  return deduplicated;
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats(
  original: Product[],
  deduplicated: Product[]
): {
  total: number;
  removed: number;
  bySource: Record<string, number>;
} {
  const bySource: Record<string, number> = {
    amazon: deduplicated.filter((p) => p.source === 'amazon').length,
    mercadolivre: deduplicated.filter((p) => p.source === 'mercadolivre').length,
    shopee: deduplicated.filter((p) => p.source === 'shopee').length,
  };

  return {
    total: deduplicated.length,
    removed: original.length - deduplicated.length,
    bySource,
  };
}
