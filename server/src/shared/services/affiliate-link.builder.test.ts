import { describe, it, expect } from 'vitest';
import {
  buildAffiliateLink,
  isDirectProductUrl,
  type AffiliateCodes,
} from './affiliate-link.builder.js';

const codes: AffiliateCodes = {
  amazon: 'suplilist01-20',
  mercadolivre: 'FULZ93-PCG7',
  shopee: 'CLH-CZB-PNR',
};

describe('isDirectProductUrl', () => {
  it('recognizes Amazon /dp/ product URLs', () => {
    expect(isDirectProductUrl('https://www.amazon.com.br/dp/B0ABCDEF12', 'amazon')).toBe(true);
    expect(isDirectProductUrl('https://www.amazon.com.br/Creatina/dp/B0ABCDEF12?ref=x', 'amazon')).toBe(true);
  });

  it('recognizes Amazon /gp/product/ URLs', () => {
    expect(isDirectProductUrl('https://www.amazon.com.br/gp/product/B0ABCDEF12', 'amazon')).toBe(true);
  });

  it('rejects Amazon search URLs as non-product', () => {
    expect(isDirectProductUrl('https://www.amazon.com.br/s?k=creatina', 'amazon')).toBe(false);
  });

  it('recognizes Mercado Livre product URLs', () => {
    expect(isDirectProductUrl('https://produto.mercadolivre.com.br/MLB-123456789-creatina', 'mercadolivre')).toBe(true);
    expect(isDirectProductUrl('https://www.mercadolivre.com.br/creatina/p/MLB123', 'mercadolivre')).toBe(true);
  });

  it('rejects Mercado Livre search URLs', () => {
    expect(isDirectProductUrl('https://lista.mercadolivre.com.br/creatina', 'mercadolivre')).toBe(false);
  });

  it('recognizes Shopee canonical product URLs', () => {
    expect(isDirectProductUrl('https://shopee.com.br/Creatina-500g-i.123456.7890123', 'shopee')).toBe(true);
    expect(isDirectProductUrl('https://shopee.com.br/product/123456/7890123', 'shopee')).toBe(true);
  });

  it('rejects Shopee search URLs', () => {
    expect(isDirectProductUrl('https://shopee.com.br/search?keyword=creatina', 'shopee')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(isDirectProductUrl('', 'amazon')).toBe(false);
  });
});

describe('buildAffiliateLink — Amazon', () => {
  it('appends the affiliate tag to a direct product URL', () => {
    const result = buildAffiliateLink('https://www.amazon.com.br/dp/B0ABCDEF12', 'amazon', codes);
    expect(result.affiliateApplied).toBe(true);
    expect(result.url).toContain('tag=suplilist01-20');
    expect(result.url).toContain('/dp/B0ABCDEF12');
    expect(result.reason).toBeNull();
  });

  it('appends the affiliate tag to a search URL', () => {
    const result = buildAffiliateLink('https://www.amazon.com.br/s?k=creatina', 'amazon', codes);
    expect(result.url).toContain('tag=suplilist01-20');
    expect(result.url).toContain('k=creatina');
  });

  it('overwrites an existing tag rather than duplicating it', () => {
    const result = buildAffiliateLink('https://www.amazon.com.br/dp/B0ABCDEF12?tag=other-20', 'amazon', codes);
    const matches = result.url.match(/tag=/g) || [];
    expect(matches.length).toBe(1);
    expect(result.url).toContain('tag=suplilist01-20');
  });

  it('reports not applied when the amazon tag is empty', () => {
    const result = buildAffiliateLink('https://www.amazon.com.br/dp/B0ABCDEF12', 'amazon', { ...codes, amazon: '' });
    expect(result.affiliateApplied).toBe(false);
    expect(result.reason).toMatch(/not configured/i);
  });
});

describe('buildAffiliateLink — Mercado Livre', () => {
  it('returns the direct URL unchanged and reports not credited', () => {
    const url = 'https://produto.mercadolivre.com.br/MLB-123456789-creatina';
    const result = buildAffiliateLink(url, 'mercadolivre', codes);
    expect(result.url).toBe(url);
    expect(result.affiliateApplied).toBe(false);
    expect(result.reason).toMatch(/affiliate-portal\/API/i);
  });

  it('does NOT inject the legacy non-crediting path format', () => {
    const url = 'https://produto.mercadolivre.com.br/MLB-123456789-creatina';
    const result = buildAffiliateLink(url, 'mercadolivre', codes);
    // The old broken format embedded the code in the path; ensure we never do that.
    expect(result.url).not.toContain('FULZ93-PCG7');
  });
});

describe('buildAffiliateLink — Shopee', () => {
  it('returns the direct URL unchanged and reports not credited', () => {
    const url = 'https://shopee.com.br/Creatina-500g-i.123456.7890123';
    const result = buildAffiliateLink(url, 'shopee', codes);
    expect(result.url).toBe(url);
    expect(result.affiliateApplied).toBe(false);
    expect(result.reason).toMatch(/generateShortLink/i);
  });

  it('does NOT inject the legacy non-crediting affid param', () => {
    const url = 'https://shopee.com.br/Creatina-500g-i.123456.7890123';
    const result = buildAffiliateLink(url, 'shopee', codes);
    expect(result.url).not.toContain('affid=');
  });
});
