import { eventBus, EVENTS } from '../core/event-bus.js';
import { AFFILIATE_CONFIG } from './affiliate.config.js';

class AffiliateEngine {
  constructor(config) {
    this._config = config;
  }

  getLinks(supplementName, supplementId = null) {
    const q = encodeURIComponent(supplementName);
    const slug = supplementId || supplementName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return {
      amazon:       `https://www.amazon.com.br/s?k=${q}&tag=${this._config.amazon}&s=review-rank`,
      mercadolivre: `https://lista.mercadolivre.com.br/${slug}`,
      shopee:       `https://shopee.com.br/search?keyword=${q}&sortBy=sales`,
    };
  }

  trackClick(supplementId, marketplace) {
    eventBus.emit(EVENTS.AFFILIATE_CLICK, { supplementId, marketplace });
  }
}

const affiliateEngine = new AffiliateEngine(AFFILIATE_CONFIG);
export default affiliateEngine;
