/**
 * AffiliateEngine v2.0 — SupliList
 * Motor de afiliados: multi-marketplace, cache 6h, UTM, compliance
 *
 * Uso:
 *   import { AffiliateEngine } from '../monetization/affiliate-engine.js';
 *   const ae = new AffiliateEngine(config);
 *   const link = await ae.generateAffiliateLink('creatina-monohidratada', userPrefs);
 */

export class AffiliateEngine {

  // ─────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────

  static CACHE_TTL_MS  = 6 * 60 * 60 * 1000; // 6 horas
  static CACHE_DB_NAME = 'suplilist-prices';
  static CACHE_DB_VER  = 1;
  static CACHE_STORE   = 'price-cache';
  static APP_ID        = 'suplilist';
  static APP_VERSION   = '4.0';

  // ─────────────────────────────────────────────
  // MARKETPLACE DEFINITIONS
  // ─────────────────────────────────────────────

  static MARKETPLACES = {
    shopee: {
      id:             'shopee',
      name:           'Shopee',
      emoji:          '🛍️',
      baseUrl:        'https://shopee.com.br',
      searchPath:     '/search?keyword=',
      affiliateParam: 'af_id',
      commission:     0.12,      // 12%
      cookieDays:     30,
      avgDelivery:    '3–7 dias',
      rating:         4.7,
      color:          '#EE4D2D',
      trusted:        true,
    },
    mercadolivre: {
      id:             'mercadolivre',
      name:           'Mercado Livre',
      emoji:          '🛒',
      baseUrl:        'https://lista.mercadolivre.com.br',
      searchPath:     '/',
      affiliateParam: 'partner_id',
      commission:     0.08,      // 8%
      cookieDays:     45,
      avgDelivery:    '2–5 dias',
      rating:         4.5,
      color:          '#FFE600',
      trusted:        true,
    },
    amazon: {
      id:             'amazon',
      name:           'Amazon',
      emoji:          '📦',
      baseUrl:        'https://www.amazon.com.br',
      searchPath:     '/s?k=',
      affiliateParam: 'tag',
      commission:     0.05,      // 5%
      cookieDays:     24,
      avgDelivery:    '1–3 dias',
      rating:         4.8,
      color:          '#FF9900',
      trusted:        true,
    },
  };

  // ─────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────

  /**
   * @param {Object} config
   * @param {string} config.shopeeAffiliateId   - Shopee affiliate ID
   * @param {string} config.mlAffiliateId       - Mercado Livre partner ID
   * @param {string} config.amazonAffiliateId   - Amazon Associates tag
   * @param {string} [config.locale]            - 'pt-BR' (default)
   * @param {string} [config.currency]          - 'BRL' (default)
   * @param {boolean} [config.debug]            - Log to console
   */
  constructor(config = {}) {
    this.config = {
      shopeeAffiliateId:  config.shopeeAffiliateId  ?? 'SUPLILIST_SHOPEE',
      mlAffiliateId:      config.mlAffiliateId      ?? 'SUPLILIST_ML',
      amazonAffiliateId:  config.amazonAffiliateId  ?? 'suplilist-20',
      locale:             config.locale             ?? 'pt-BR',
      currency:           config.currency           ?? 'BRL',
      debug:              config.debug              ?? false,
    };

    this._db        = null;        // IndexedDB instance (lazy init)
    this._memCache  = new Map();   // In-memory fallback (supplementId → { prices, ts })
    this._listeners = [];          // Revenue event listeners
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────

  /**
   * Generate best affiliate link for a supplement.
   * Returns null if no marketplace configured.
   *
   * @param {string} supplementId
   * @param {Object} [userPrefs]
   * @param {string} [userPrefs.preferred]     - 'shopee' | 'mercadolivre' | 'amazon'
   * @param {string} [userPrefs.locale]        - Override locale
   * @param {boolean} [userPrefs.cheapestOnly] - Force cheapest marketplace
   * @returns {Promise<AffiliateLink|null>}
   */
  async generateAffiliateLink(supplementId, userPrefs = {}) {
    try {
      const prices  = await this.getPrices(supplementId);
      const ranked  = this._rankMarketplaces(prices, userPrefs);
      if (!ranked.length) return null;

      const best    = ranked[0];
      const mp      = AffiliateEngine.MARKETPLACES[best.marketplaceId];
      if (!mp) return null;

      const searchQuery = encodeURIComponent(this._normalizeSupplementName(supplementId));
      const rawUrl      = `${mp.baseUrl}${mp.searchPath}${searchQuery}`;
      const url         = this._injectUTM(rawUrl, supplementId, best.marketplaceId);
      const affUrl      = this._injectAffiliateId(url, best.marketplaceId);

      const link = {
        url:               affUrl,
        marketplace:       best.marketplaceId,
        marketplaceName:   mp.name,
        marketplaceEmoji:  mp.emoji,
        marketplaceColor:  mp.color,
        price:             best.price,
        commission:        mp.commission,
        estimatedEarning:  best.price > 0 ? +(best.price * mp.commission).toFixed(2) : 0,
        delivery:          mp.avgDelivery,
        rating:            mp.rating,
        disclosure:        this._getInlineDisclosure(this.config.locale),
        allOptions:        ranked,
        cacheAge:          best.cacheAgeMs,
        generatedAt:       Date.now(),
      };

      this._log('generateAffiliateLink', { supplementId, link });
      return link;

    } catch (err) {
      this._log('generateAffiliateLink ERROR', err);
      return this._fallbackLink(supplementId);
    }
  }

  /**
   * Get prices for a supplement from all marketplaces.
   * Uses IndexedDB cache (TTL: 6h), falls back to in-memory, then mock.
   *
   * @param {string} supplementId
   * @returns {Promise<MarketplacePrice[]>}
   */
  async getPrices(supplementId) {
    const cached = await this._getCached(supplementId);
    if (cached) {
      this._log('getPrices: cache HIT', supplementId);
      return cached;
    }

    this._log('getPrices: cache MISS — fetching', supplementId);
    const prices = await this._fetchPrices(supplementId);
    await this._setCache(supplementId, prices);
    return prices;
  }

  /**
   * Get all marketplace options for comparison UI.
   * Returns all 3 marketplaces sorted by score.
   *
   * @param {string} supplementId
   * @param {Object} [userPrefs]
   * @returns {Promise<RankedMarketplace[]>}
   */
  async getAllOptions(supplementId, userPrefs = {}) {
    const prices = await this.getPrices(supplementId);
    const ranked = this._rankMarketplaces(prices, userPrefs);
    return ranked.map(opt => {
      const mp = AffiliateEngine.MARKETPLACES[opt.marketplaceId];
      if (!mp) return opt;
      const searchQuery = encodeURIComponent(this._normalizeSupplementName(supplementId));
      const rawUrl      = `${mp.baseUrl}${mp.searchPath}${searchQuery}`;
      const url         = this._injectUTM(rawUrl, supplementId, opt.marketplaceId);
      const affUrl      = this._injectAffiliateId(url, opt.marketplaceId);
      return {
        ...opt,
        url: affUrl,
        disclosure: this._getInlineDisclosure(this.config.locale)
      };
    });
  }

  /**
   * Track an affiliate click for analytics.
   * Fires: gtag event + custom event + internal listener.
   *
   * @param {string} supplementId
   * @param {string} marketplaceId
   * @param {number} [price]
   */
  trackClick(supplementId, marketplaceId, price = 0) {
    const mp = AffiliateEngine.MARKETPLACES[marketplaceId];

    const payload = {
      event:                'affiliate_click',
      supplement_id:        supplementId,
      marketplace:          marketplaceId,
      price,
      currency:             this.config.currency,
      estimated_commission: +(price * (mp?.commission ?? 0)).toFixed(2),
      app_version:          AffiliateEngine.APP_VERSION,
      timestamp:            new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'affiliate_click', payload);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suplilist:affiliate_click', { detail: payload }));
    }

    this._listeners.forEach(fn => fn(payload));
    this._log('trackClick', payload);
  }

  /**
   * Track a confirmed conversion.
   *
   * @param {string} supplementId
   * @param {string} marketplaceId
   * @param {number} saleAmount
   */
  trackConversion(supplementId, marketplaceId, saleAmount) {
    const mp         = AffiliateEngine.MARKETPLACES[marketplaceId];
    const commission = +(saleAmount * (mp?.commission ?? 0)).toFixed(2);

    const payload = {
      event:         'affiliate_conversion',
      supplement_id: supplementId,
      marketplace:   marketplaceId,
      sale_amount:   saleAmount,
      commission,
      currency:      this.config.currency,
      timestamp:     new Date().toISOString(),
    };

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: `${supplementId}-${Date.now()}`,
        value:          saleAmount,
        currency:       this.config.currency,
        items: [{ item_id: supplementId, item_name: supplementId, price: saleAmount }],
      });
    }

    this._listeners.forEach(fn => fn(payload));
    this._log('trackConversion', payload);
  }

  /**
   * Subscribe to revenue events.
   * @param {Function} fn
   * @returns {Function} Unsubscribe function
   */
  onRevenueEvent(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  /**
   * Invalidate price cache for a supplement.
   * @param {string} supplementId
   */
  async invalidateCache(supplementId) {
    this._memCache.delete(supplementId);
    const db = await this._getDB();
    if (!db) return;
    try {
      const tx = db.transaction(AffiliateEngine.CACHE_STORE, 'readwrite');
      tx.objectStore(AffiliateEngine.CACHE_STORE).delete(supplementId);
      this._log('invalidateCache', supplementId);
    } catch { /* fail silently */ }
  }

  /**
   * Get the full compliance disclosure text.
   * @param {string} [locale] - 'pt-BR' | 'en-US' | 'es-ES'
   * @returns {string}
   */
  getFullDisclosure(locale) {
    const l = locale ?? this.config.locale;
    const disclosures = {
      'pt-BR': `DIVULGAÇÃO DE AFILIADO — SupliList\n\nO SupliList pode receber uma comissão quando você realiza uma compra através dos links de afiliado apresentados neste aplicativo. Esta comissão é paga PELOS MARKETPLACES (Shopee, Mercado Livre, Amazon), não por você.\n\nSeu preço NÃO aumenta. A comissão sai da margem do marketplace.\n\nSeguimos as diretrizes da CVM (Comissão de Valores Mobiliários), FTC (Federal Trade Commission) e LGPD (Lei Geral de Proteção de Dados). Todos os links patrocinados são claramente identificados com o ícone 💰.\n\nPara mais informações: /legal/affiliate-disclosure`,
      'en-US': `AFFILIATE DISCLOSURE — SupliList\n\nSupliList may receive a commission when you make a purchase through affiliate links in this app. This commission is paid BY THE MARKETPLACES, not by you.\n\nYour price does NOT increase. The commission comes from the marketplace's margin.\n\nWe comply with FTC guidelines (16 CFR Part 255) and applicable consumer protection laws. All sponsored links are clearly identified with the 💰 icon.\n\nFor more information: /legal/affiliate-disclosure`,
      'es-ES': `DIVULGACIÓN DE AFILIADO — SupliList\n\nSupliList puede recibir una comisión cuando realizas una compra a través de los enlaces de afiliado en esta aplicación. Esta comisión la pagan LOS MARKETPLACES, no tú.\n\nTu precio NO aumenta. La comisión sale del margen del marketplace.\n\nMás información: /legal/affiliate-disclosure`,
    };
    return disclosures[l] ?? disclosures['en-US'];
  }

  // ─────────────────────────────────────────────
  // PRIVATE — PRICE FETCHING
  // ─────────────────────────────────────────────

  async _fetchPrices(supplementId) {
    const now = Date.now();

    const results = await Promise.allSettled(
      Object.keys(AffiliateEngine.MARKETPLACES).map(async (mpId) => {
        try {
          // PRODUCTION: Replace _mockPrice with real API call per marketplace
          // Example:
          //   const res = await fetch(`/api/prices?marketplace=${mpId}&q=${name}`);
          //   const { price, url } = await res.json();
          const price = await this._mockPrice(mpId, supplementId);

          return {
            marketplaceId: mpId,
            price,
            fetchedAt:     now,
            cacheAgeMs:    0,
            error:         null,
          };
        } catch (err) {
          return {
            marketplaceId: mpId,
            price:         0,
            fetchedAt:     now,
            cacheAgeMs:    0,
            error:         err.message,
          };
        }
      })
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Mock price generator — simulates marketplace API response.
   * Prices are deterministic per (marketplace, supplement) for consistency.
   * Replace with real API in production.
   */
  async _mockPrice(marketplaceId, supplementId) {
    // Simulate network latency (50–200ms)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));

    const hash    = this._simpleHash(supplementId + marketplaceId);
    const base    = 20 + (hash % 80); // R$ 20–100

    const variance = {
      shopee:       0.95, // geralmente mais barato
      mercadolivre: 1.00,
      amazon:       1.05, // geralmente mais caro, entrega mais rápida
    };

    return +(base * (variance[marketplaceId] ?? 1.0)).toFixed(2);
  }

  // ─────────────────────────────────────────────
  // PRIVATE — RANKING
  // ─────────────────────────────────────────────

  /**
   * Rank marketplaces by composite score.
   * Score = price(40%) + commission(20%) + rating(20%) + user_pref(20%)
   */
  _rankMarketplaces(prices, userPrefs = {}) {
    const { preferred, cheapestOnly } = userPrefs;

    if (cheapestOnly) {
      return prices
        .filter(p => p.price > 0)
        .sort((a, b) => a.price - b.price)
        .map(p => ({ ...p, score: 1 - (p.price / 200) }));
    }

    const maxPrice = Math.max(...prices.map(p => p.price), 1);

    return prices
      .filter(p => !p.error)
      .map(p => {
        const mp = AffiliateEngine.MARKETPLACES[p.marketplaceId];
        if (!mp) return null;

        const priceScore = p.price > 0 ? (1 - (p.price / maxPrice)) * 0.40 : 0;
        const commScore  = mp.commission * 0.20;
        const rateScore  = ((mp.rating - 4.0) / 1.0) * 0.20; // 4.0–5.0 → 0–0.20
        const prefScore  = preferred === p.marketplaceId ? 0.20 : 0;

        const score = priceScore + commScore + rateScore + prefScore;

        return {
          ...p,
          marketplaceName:  mp.name,
          marketplaceEmoji: mp.emoji,
          marketplaceColor: mp.color,
          commission:       mp.commission,
          delivery:         mp.avgDelivery,
          rating:           mp.rating,
          score:            +score.toFixed(4),
          priceFormatted:   p.price > 0
            ? p.price.toLocaleString(this.config.locale, { style: 'currency', currency: this.config.currency })
            : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  // ─────────────────────────────────────────────
  // PRIVATE — UTM & AFFILIATE ID INJECTION
  // ─────────────────────────────────────────────

  _injectUTM(url, supplementId, marketplaceId) {
    const params = new URLSearchParams({
      utm_source:   AffiliateEngine.APP_ID,
      utm_medium:   'app',
      utm_campaign: 'supplement_recommendation',
      utm_content:  `${supplementId}__${marketplaceId}`,
      utm_term:     'affiliate_v2',
      ref:          AffiliateEngine.APP_ID,
    });
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${params.toString()}`;
  }

  _injectAffiliateId(url, marketplaceId) {
    const ids = {
      shopee:       this.config.shopeeAffiliateId,
      mercadolivre: this.config.mlAffiliateId,
      amazon:       this.config.amazonAffiliateId,
    };
    const mp    = AffiliateEngine.MARKETPLACES[marketplaceId];
    const affId = ids[marketplaceId];
    if (!mp || !affId) return url;

    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${mp.affiliateParam}=${encodeURIComponent(affId)}`;
  }

  _getInlineDisclosure(locale) {
    const disclosures = {
      'pt-BR': '💰 SupliList recebe comissão. Seu preço NÃO muda.',
      'en-US': '💰 SupliList earns a commission. Your price does NOT change.',
      'es-ES': '💰 SupliList recibe comisión. Tu precio NO cambia.',
    };
    return disclosures[locale] ?? disclosures['pt-BR'];
  }

  _fallbackLink(supplementId) {
    const name = this._normalizeSupplementName(supplementId);
    return {
      url:              `https://shopee.com.br/search?keyword=${encodeURIComponent(name)}`,
      marketplace:      'shopee',
      marketplaceName:  'Shopee',
      marketplaceEmoji: '🛍️',
      marketplaceColor: '#EE4D2D',
      price:            0,
      commission:       0.12,
      estimatedEarning: 0,
      delivery:         '3–7 dias',
      rating:           4.7,
      disclosure:       '💰 SupliList recebe comissão. Seu preço NÃO muda.',
      allOptions:       [],
      cacheAge:         null,
      generatedAt:      Date.now(),
      isFallback:       true,
    };
  }

  // ─────────────────────────────────────────────
  // PRIVATE — CACHE (IndexedDB + in-memory)
  // ─────────────────────────────────────────────

  async _getDB() {
    if (this._db) return this._db;
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
      const req = indexedDB.open(AffiliateEngine.CACHE_DB_NAME, AffiliateEngine.CACHE_DB_VER);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(AffiliateEngine.CACHE_STORE)) {
          db.createObjectStore(AffiliateEngine.CACHE_STORE, { keyPath: 'supplementId' });
        }
      };

      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror   = ()  => resolve(null);
    });
  }

  async _getCached(supplementId) {
    const now = Date.now();

    if (this._memCache.has(supplementId)) {
      const { prices, ts } = this._memCache.get(supplementId);
      if (now - ts < AffiliateEngine.CACHE_TTL_MS) {
        return prices.map(p => ({ ...p, cacheAgeMs: now - ts }));
      }
      this._memCache.delete(supplementId);
    }

    const db = await this._getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx    = db.transaction(AffiliateEngine.CACHE_STORE, 'readonly');
        const store = tx.objectStore(AffiliateEngine.CACHE_STORE);
        const req   = store.get(supplementId);

        req.onsuccess = (e) => {
          const record = e.target.result;
          if (!record) return resolve(null);
          const age = now - record.ts;
          if (age > AffiliateEngine.CACHE_TTL_MS) return resolve(null);
          resolve(record.prices.map(p => ({ ...p, cacheAgeMs: age })));
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async _setCache(supplementId, prices) {
    const entry = { supplementId, prices, ts: Date.now() };

    this._memCache.set(supplementId, { prices, ts: entry.ts });

    const db = await this._getDB();
    if (!db) return;

    try {
      const tx = db.transaction(AffiliateEngine.CACHE_STORE, 'readwrite');
      tx.objectStore(AffiliateEngine.CACHE_STORE).put(entry);
    } catch { /* fail silently */ }
  }

  // ─────────────────────────────────────────────
  // PRIVATE — UTILITIES
  // ─────────────────────────────────────────────

  _normalizeSupplementName(supplementId) {
    return supplementId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  _log(label, data) {
    if (this.config.debug) {
      console.log(`[AffiliateEngine] ${label}:`, data);
    }
  }
}

export default AffiliateEngine;
