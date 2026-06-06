/**
 * Marketplace Adapters — Fetch prices from different sources
 */

import logger from './logger.js';

/**
 * Base adapter for marketplace APIs
 */
class MarketplaceAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 5000;
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async search(supplementName) {
    throw new Error('search() must be implemented by subclass');
  }
}

/**
 * Mercado Livre Adapter
 */
export class MercadoLivreAdapter extends MarketplaceAdapter {
  constructor() {
    super('Mercado Livre', {
      baseUrl: 'https://api.mercadolibre.com/sites/MLB/search',
      timeout: 5000
    });
  }

  async search(supplementName) {
    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(supplementName)}&limit=10`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        marketplace: this.name,
        results: data.results.slice(0, 5).map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          currency: item.currency_id,
          url: item.permalink,
          seller: item.seller.nickname,
          rating: item.seller.seller_reputation?.power_seller_status || 'regular',
          shipping: item.shipping?.free_shipping ? 'Frete grátis' : 'Frete a calcular',
          availability: item.available_quantity > 0 ? 'Em estoque' : 'Fora de estoque'
        }))
      };
    } catch (error) {
      logger.error(`MercadoLivre search failed: ${supplementName}`, error);
      return { marketplace: this.name, results: [], error: error.message };
    }
  }

  getLowestPrice(results) {
    if (results.length === 0) return null;
    return results.reduce((lowest, item) =>
      item.price < lowest.price ? item : lowest
    );
  }
}

/**
 * Amazon Adapter
 */
export class AmazonAdapter extends MarketplaceAdapter {
  constructor() {
    super('Amazon', {
      baseUrl: 'https://api.amazon.com/search',
      timeout: 5000
    });
    // In production, use real API key
    this.apiKey = process.env.AMAZON_API_KEY || 'mock-key';
  }

  async search(supplementName) {
    try {
      const url = `${this.baseUrl}?keywords=${encodeURIComponent(supplementName)}&page=1`;
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        marketplace: this.name,
        results: (data.Items || []).slice(0, 5).map(item => ({
          id: item.ASIN,
          title: item.Title,
          price: item.Offers?.Listings?.[0]?.Price?.Amount || null,
          currency: 'BRL',
          url: `https://www.amazon.com.br/dp/${item.ASIN}`,
          seller: item.Offers?.Listings?.[0]?.MerchantInfo?.Name || 'Amazon',
          rating: item.CustomerReviews?.AmazonCustomerReviews?.Rating || 0,
          reviews: item.CustomerReviews?.AmazonCustomerReviews?.Count || 0,
          shipping: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsAmazonFulfilled ? 'Prime' : 'Vendedor',
          availability: item.Offers?.Listings?.[0]?.Availability?.Message || 'Verificar'
        }))
      };
    } catch (error) {
      logger.error(`Amazon search failed: ${supplementName}`, error);
      return { marketplace: this.name, results: [], error: error.message };
    }
  }
}

/**
 * Natue Adapter
 */
export class NatueAdapter extends MarketplaceAdapter {
  constructor() {
    super('Natue', {
      baseUrl: 'https://api.natue.com.br/v1/products/search',
      timeout: 5000
    });
  }

  async search(supplementName) {
    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(supplementName)}&limit=10`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        marketplace: this.name,
        results: (data.products || []).slice(0, 5).map(product => ({
          id: product.sku,
          title: product.name,
          price: product.price,
          originalPrice: product.original_price,
          discount: product.discount_percent || 0,
          currency: 'BRL',
          url: product.url,
          seller: 'Natue',
          rating: product.rating || 0,
          reviews: product.reviews_count || 0,
          shipping: product.free_shipping ? 'Frete grátis' : 'A partir de R$ 10',
          availability: product.in_stock ? 'Em estoque' : 'Fora de estoque'
        }))
      };
    } catch (error) {
      logger.error(`Natue search failed: ${supplementName}`, error);
      return { marketplace: this.name, results: [], error: error.message };
    }
  }
}

/**
 * Vitafor Adapter
 */
export class VitaforAdapter extends MarketplaceAdapter {
  constructor() {
    super('Vitafor', {
      baseUrl: 'https://api.vitafor.com.br/search',
      timeout: 5000
    });
  }

  async search(supplementName) {
    try {
      const url = `${this.baseUrl}?product=${encodeURIComponent(supplementName)}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        marketplace: this.name,
        results: (data.items || []).slice(0, 5).map(item => ({
          id: item.code,
          title: item.title,
          price: item.sale_price,
          originalPrice: item.price,
          discount: item.discount || 0,
          currency: 'BRL',
          url: item.url,
          seller: 'Vitafor',
          rating: item.rating || 0,
          reviews: item.review_count || 0,
          shipping: 'A partir de R$ 15',
          availability: item.stock > 0 ? 'Em estoque' : 'Fora de estoque'
        }))
      };
    } catch (error) {
      logger.error(`Vitafor search failed: ${supplementName}`, error);
      return { marketplace: this.name, results: [], error: error.message };
    }
  }
}

/**
 * Mock Adapter for testing/development
 */
export class MockMarketplaceAdapter extends MarketplaceAdapter {
  constructor(name) {
    super(name);
  }

  async search(supplementName) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));

    const basePrice = Math.random() * 100 + 20;

    return {
      marketplace: this.name,
      results: [
        {
          id: `${this.name.toLowerCase()}-1`,
          title: `${supplementName} - ${this.name}`,
          price: basePrice,
          originalPrice: basePrice * 1.2,
          discount: Math.random() > 0.5 ? 15 : 0,
          currency: 'BRL',
          url: `https://${this.name.toLowerCase()}.com/product`,
          seller: this.name,
          rating: 4 + Math.random(),
          reviews: Math.floor(Math.random() * 500),
          shipping: Math.random() > 0.5 ? 'Frete grátis' : 'A partir de R$ 10',
          availability: Math.random() > 0.3 ? 'Em estoque' : 'Fora de estoque'
        }
      ]
    };
  }
}

export default {
  MercadoLivreAdapter,
  AmazonAdapter,
  NatueAdapter,
  VitaforAdapter,
  MockMarketplaceAdapter
};
