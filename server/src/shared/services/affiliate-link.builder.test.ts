import { describe, it, expect } from 'vitest';
import {
  buildAffiliateLink,
  isDirectProductUrl,
  type AffiliateCodes,
} from './affiliate-link.builder.js';

const codes: AffiliateCodes = {
  amazon: 'suplilist01-20',
  mercadolivre: 'matt:suplilist:35217033',
  shopee: '',
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
  const mlUrl = 'https://produto.mercadolivre.com.br/MLB-123456789-creatina';

  it('appends matt_word and matt_tool to a direct product URL', () => {
    const result = buildAffiliateLink(mlUrl, 'mercadolivre', codes);
    expect(result.affiliateApplied).toBe(true);
    expect(result.url).toContain('matt_word=suplilist');
    expect(result.url).toContain('matt_tool=35217033');
    expect(result.reason).toBeNull();
  });

  it('preserves the original product path', () => {
    const result = buildAffiliateLink(mlUrl, 'mercadolivre', codes);
    expect(result.url).toContain('produto.mercadolivre.com.br/MLB-123456789');
  });

  it('overwrites existing matt params rather than duplicating', () => {
    const urlWithParams = `${mlUrl}?matt_word=old&matt_tool=99`;
    const result = buildAffiliateLink(urlWithParams, 'mercadolivre', codes);
    const matches = result.url.match(/matt_tool=/g) || [];
    expect(matches.length).toBe(1);
    expect(result.url).toContain('matt_tool=35217033');
  });

  it('reports not applied when code is not configured', () => {
    const result = buildAffiliateLink(mlUrl, 'mercadolivre', { ...codes, mercadolivre: '' });
    expect(result.affiliateApplied).toBe(false);
    expect(result.reason).toMatch(/not configured/i);
    expect(result.url).toBe(mlUrl);
  });

  it('does NOT inject the legacy broken path format', () => {
    const result = buildAffiliateLink(mlUrl, 'mercadolivre', codes);
    expect(result.url).not.toContain('FULZ93');
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
