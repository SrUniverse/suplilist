/**
 * FirecrawlService parsing tests.
 *
 * Exercises the private parseSupplements() against realistic scraped markdown
 * for each marketplace, asserting:
 *  - price + product-name extraction
 *  - DIRECT product link capture from markdown (when present)
 *  - correct affiliate attribution per marketplace (Amazon credits via tag;
 *    Mercado Livre / Shopee do NOT credit via URL params and must not inject
 *    the legacy broken formats)
 */

import { describe, it, expect } from 'vitest';
import FirecrawlService from './firecrawl.service.js';

interface ParsedProduct {
  name: string;
  price: number;
  url: string;
  directUrl?: string;
  affiliateApplied?: boolean;
  source: 'amazon' | 'mercadolivre' | 'shopee';
}

// Realistic Firecrawl markdown. Amazon/Shopee include direct product links in
// markdown-link form; Mercado Livre block has no link (search-URL fallback).
const mockAmazonResponse = `
# Resultados de Busca para Creatina

## [CREATINA MONOHIDRATADA 500G 100% PURA](https://www.amazon.com.br/dp/B0ABCDEF12)
Marca: KM Nutrition
**R$ 59,90**
⭐ 4.8 (2341 reviews)

## [CREATINA CREAPURE 300G IMPORTADA](https://www.amazon.com.br/Creapure/dp/B0XYZ98765)
Marca: Ultimate Nutrition
**R$ 89,90**
⭐ 4.7 (1250 reviews)
`;

const mockMercadoLivreResponse = `
Creatina em Mercado Livre

1. **CREATINA MONOHIDRATADA 500G PURA CREAPURE** |
   Vendedor: Suplementos Prime |
   💰 R$ 54,90 |
   ⭐ Avaliação: 4.9

2. CREATINA 300G 100% PURA IMPORTADA |
   Vendedor: FitShop Brasil |
   Preço: R$ 79,50 |
   ⭐ 4.8 (567 avaliações)
`;

const mockShopeeResponse = `
Creatina na Shopee

[CREATINA 500G 100% PURA IMPORTADA KM NUTRITION](https://shopee.com.br/Creatina-500g-i.123456.7890123)
Loja: Nutrition Store
🏷️ R$ 56,90 | Original: R$ 89,90 | 36% OFF
⭐ 4.9 (1890 compras)
`;

function parse(content: string, source: ParsedProduct['source']): ParsedProduct[] {
  // parseSupplements is private; access via type assertion for white-box testing.
  return (FirecrawlService as unknown as {
    parseSupplements: (c: string, s: ParsedProduct['source']) => ParsedProduct[];
  }).parseSupplements(content, source);
}

describe('FirecrawlService.parseSupplements — Amazon', () => {
  const results = parse(mockAmazonResponse, 'amazon');

  it('extracts products with valid prices', () => {
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => {
      expect(p.price).toBeGreaterThan(10);
      expect(p.price).toBeLessThan(1000);
      expect(p.name.length).toBeGreaterThan(0);
    });
  });

  it('captures the DIRECT product link from markdown', () => {
    const first = results[0];
    expect(first.directUrl).toBeDefined();
    expect(first.directUrl).toContain('/dp/');
  });

  it('applies the Amazon affiliate tag and marks it applied', () => {
    const first = results[0];
    expect(first.url).toContain('tag=');
    expect(first.affiliateApplied).toBe(true);
  });
});

describe('FirecrawlService.parseSupplements — Mercado Livre', () => {
  const results = parse(mockMercadoLivreResponse, 'mercadolivre');

  it('extracts products with valid prices', () => {
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => expect(p.price).toBeGreaterThan(10));
  });

  it('does NOT inject the legacy non-crediting path format', () => {
    results.forEach((p) => expect(p.url).not.toContain('FULZ93-PCG7'));
  });

  it('marks affiliate as not applied (requires ML affiliate API)', () => {
    results.forEach((p) => expect(p.affiliateApplied).toBe(false));
  });
});

describe('FirecrawlService.parseSupplements — Shopee', () => {
  const results = parse(mockShopeeResponse, 'shopee');

  it('extracts the product with a valid price', () => {
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].price).toBeGreaterThan(10);
  });

  it('captures the DIRECT product link from markdown', () => {
    expect(results[0].directUrl).toBeDefined();
    expect(results[0].directUrl).toContain('-i.123456.7890123');
  });

  it('does NOT inject the legacy non-crediting affid param', () => {
    results.forEach((p) => expect(p.url).not.toContain('affid='));
  });

  it('marks affiliate as not applied (requires Shopee Affiliate API)', () => {
    results.forEach((p) => expect(p.affiliateApplied).toBe(false));
  });
});
