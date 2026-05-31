import { eventBus, EVENTS } from '../core/event-bus.js';
import { AFFILIATE_CONFIG } from './affiliate.config.js';

class AffiliateEngine {
  constructor(config) {
    this._config = config;
  }

  getLinks(supplementName) {
    const q = encodeURIComponent(supplementName);
    return {
      amazon:       `https://www.amazon.com.br/s?k=${q}&tag=${this._config.amazon}`,
      mercadolivre: `https://www.mercadolivre.com.br/jm/search?as_word=${q}&partner_id=${this._config.mercadolivre}`,
      shopee:       `https://shopee.com.br/search?keyword=${q}&af_id=${this._config.shopee}`,
    };
  }

  trackClick(supplementId, marketplace) {
    eventBus.emit(EVENTS.AFFILIATE_CLICK, { supplementId, marketplace });
  }
}

const affiliateEngine = new AffiliateEngine(AFFILIATE_CONFIG);
export default affiliateEngine;
