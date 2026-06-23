import { describe, it, expect } from 'vitest';
import { resolveAffiliateCodes } from './affiliate-codes.js';

describe('resolveAffiliateCodes', () => {
  it('reads the AFFILIATE_CODE_* naming convention', () => {
    const codes = resolveAffiliateCodes({
      AFFILIATE_CODE_AMAZON: 'amz-tag-20',
      AFFILIATE_CODE_MERCADOLIVRE: 'matt:word:123',
      AFFILIATE_CODE_SHOPEE: 'shopee-x',
    } as NodeJS.ProcessEnv);
    expect(codes).toEqual({ amazon: 'amz-tag-20', mercadolivre: 'matt:word:123', shopee: 'shopee-x' });
  });

  it('reads the VITE_* naming convention as a fallback', () => {
    const codes = resolveAffiliateCodes({
      VITE_AMAZON_AFFILIATE_ID: 'amz-vite-20',
      VITE_ML_AFFILIATE_ID: 'matt:vite:999',
      VITE_SHOPEE_AFFILIATE_ID: 'shopee-vite',
    } as NodeJS.ProcessEnv);
    expect(codes).toEqual({ amazon: 'amz-vite-20', mercadolivre: 'matt:vite:999', shopee: 'shopee-vite' });
  });

  it('prefers AFFILIATE_CODE_* over VITE_* when both are set', () => {
    const codes = resolveAffiliateCodes({
      AFFILIATE_CODE_AMAZON: 'primary-20',
      VITE_AMAZON_AFFILIATE_ID: 'fallback-20',
    } as NodeJS.ProcessEnv);
    expect(codes.amazon).toBe('primary-20');
  });

  it('treats whitespace-only values as empty', () => {
    const codes = resolveAffiliateCodes({
      AFFILIATE_CODE_AMAZON: '   ',
      VITE_AMAZON_AFFILIATE_ID: 'real-20',
    } as NodeJS.ProcessEnv);
    expect(codes.amazon).toBe('real-20');
  });

  it('returns empty strings when nothing is configured and useDefaults is false', () => {
    const codes = resolveAffiliateCodes({} as NodeJS.ProcessEnv);
    expect(codes).toEqual({ amazon: '', mercadolivre: '', shopee: '' });
  });

  it('applies Amazon/ML defaults when useDefaults is true', () => {
    const codes = resolveAffiliateCodes({} as NodeJS.ProcessEnv, { useDefaults: true });
    expect(codes.amazon).toBe('suplilist01-20');
    expect(codes.mercadolivre).toBe('matt:suplilist:35217033');
    // Shopee never gets a default — crediting needs the Affiliate API.
    expect(codes.shopee).toBe('');
  });
});
