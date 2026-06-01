import { logger } from '../utils/logger.js';

const getAffiliateId = (envKey, fallback) => {
  const value = import.meta.env[envKey];
  if (!value) {
    logger.warn(`[Affiliate] ${envKey} not set, using fallback: ${fallback}`);
    return fallback;
  }
  return value;
};

export const AFFILIATE_CONFIG = {
  amazon:       getAffiliateId('VITE_AMAZON_AFFILIATE_ID', 'suplilist01-20'),
  mercadolivre: getAffiliateId('VITE_ML_AFFILIATE_ID', 'SUPLILIST_ML'),
  shopee:       getAffiliateId('VITE_SHOPEE_AFFILIATE_ID', 'SUPLILIST_SHOPEE'),
};
