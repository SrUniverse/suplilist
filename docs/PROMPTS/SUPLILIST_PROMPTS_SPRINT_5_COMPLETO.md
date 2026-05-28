# **SPRINT 5: Core+ Global — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no seu IDE.

**Sprint:** 5 | **Fase:** 2 — Core+ Global | **Semanas:** 9–12
**Depende de:** Sprints 1–4 completos (design-system, state-manager, stack-recommender, affiliate-engine base, todas as pages)

---

## **VISÃO GERAL DO SPRINT 5**

| Prompt | Arquivo(s) | O que entrega |
|--------|-----------|---------------|
| 5.1 | `affiliate-engine.js` (refatorado) | AffiliateEngine real: multi-marketplace, cache 6h, UTM completo, disclosure FTC/CVM |
| 5.2 | `price-comparator.js` + `price-comparator-page.js` | PriceComparator: busca real-time Shopee/ML/Amazon, custo por dose, ranking visual |
| 5.3 | `premium-tier-system.js` + `premium-page.js` | Modelo freemium completo: Free/Pro/Master, feature gates, Stripe-ready |
| 5.4 | `affiliate-disclosure-component.js` | Componente de disclosure FTC/CVM/LGPD globalmente compliant |

**Após o Sprint 5:**
- Monetização por afiliados 100% operacional (3 marketplaces + UTM + analytics) ✅
- Comparação de preços em tempo real com ranking visual ✅
- Sistema de tiers premium com feature gating ✅
- Compliance total: FTC, CVM, LGPD, GDPR ✅

---

## **PROMPT 5.1: AffiliateEngine — REFATORADO COMPLETO**

```markdown
You are building the production AffiliateEngine for SupliList v4.0.

## CONTEXT

The AffiliateEngine v1 (from the docs) was a stub/skeleton.
This is the REAL implementation: multi-marketplace, real UTM injection,
price caching, revenue tracking, compliance, and full analytics.

This module is the primary monetization layer.
It must be invisible to the user (no friction) but robust enough
to track every click, conversion opportunity, and commission estimate.

Architecture:
- Stateless class (no singleton — instantiated per page)
- Prices cached in IndexedDB (TTL: 6 hours)
- UTM parameters: complete, consistent, trackable
- Affiliate IDs: loaded from config (never hardcoded)
- Disclosure: always rendered, always compliant
- Analytics: gtag + custom events
- Fallback: if API fails, use last known price from cache

---

## TASK 1: CREATE /src/monetization/affiliate-engine.js

```javascript
/**
 * AffiliateEngine v2.0 — SupliList
 * Motor de afiliados: multi-marketplace, cache 6h, UTM, compliance
 *
 * Uso:
 *   import AffiliateEngine from '../monetization/affiliate-engine.js';
 *   const ae = new AffiliateEngine(config);
 *   const link = ae.generateAffiliateLink('creatina-monohidratada', userPrefs);
 */

export class AffiliateEngine {

  // ─────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────

  static CACHE_TTL_MS   = 6 * 60 * 60 * 1000;   // 6 horas
  static CACHE_DB_NAME  = 'suplilist-prices';
  static CACHE_DB_VER   = 1;
  static CACHE_STORE    = 'price-cache';
  static APP_ID         = 'suplilist';
  static APP_VERSION    = '4.0';

  // ─────────────────────────────────────────────
  // MARKETPLACE DEFINITIONS
  // ─────────────────────────────────────────────

  static MARKETPLACES = {
    shopee: {
      id:           'shopee',
      name:         'Shopee',
      emoji:        '🛍️',
      baseUrl:      'https://shopee.com.br',
      searchPath:   '/search?keyword=',
      affiliateParam: 'af_id',
      commission:   0.12,       // 12%
      cookieDays:   30,
      avgDelivery:  '3–7 dias',
      rating:       4.7,
      color:        '#EE4D2D',
      trusted:      true,
    },
    mercadolivre: {
      id:           'mercadolivre',
      name:         'Mercado Livre',
      emoji:        '🛒',
      baseUrl:      'https://lista.mercadolivre.com.br',
      searchPath:   '/',
      affiliateParam: 'partner_id',
      commission:   0.08,       // 8%
      cookieDays:   45,
      avgDelivery:  '2–5 dias',
      rating:       4.5,
      color:        '#FFE600',
      trusted:      true,
    },
    amazon: {
      id:           'amazon',
      name:         'Amazon',
      emoji:        '📦',
      baseUrl:      'https://www.amazon.com.br',
      searchPath:   '/s?k=',
      affiliateParam: 'tag',
      commission:   0.05,       // 5%
      cookieDays:   24,
      avgDelivery:  '1–3 dias',
      rating:       4.8,
      color:        '#FF9900',
      trusted:      true,
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

    this._db         = null;    // IndexedDB instance (lazy init)
    this._memCache   = new Map(); // In-memory fallback (supplementId → { prices, ts })
    this._listeners  = [];        // Revenue event listeners
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
   * @returns {AffiliateLink|null}
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
    // 1. Try cache
    const cached = await this._getCached(supplementId);
    if (cached) {
      this._log('getPrices: cache HIT', supplementId);
      return cached;
    }

    // 2. Fetch fresh prices
    this._log('getPrices: cache MISS — fetching', supplementId);
    const prices = await this._fetchPrices(supplementId);

    // 3. Store in cache
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
    return this._rankMarketplaces(prices, userPrefs);
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
      event:         'affiliate_click',
      supplement_id: supplementId,
      marketplace:   marketplaceId,
      price:         price,
      currency:      this.config.currency,
      estimated_commission: +(price * (mp?.commission ?? 0)).toFixed(2),
      app_version:   AffiliateEngine.APP_VERSION,
      timestamp:     new Date().toISOString(),
    };

    // GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'affiliate_click', payload);
    }

    // Custom DOM event (other modules can listen)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suplilist:affiliate_click', { detail: payload }));
    }

    // Internal listeners
    this._listeners.forEach(fn => fn(payload));

    this._log('trackClick', payload);
  }

  /**
   * Track a confirmed conversion (called from order confirmation webhook / postback).
   *
   * @param {string} supplementId
   * @param {string} marketplaceId
   * @param {number} saleAmount
   */
  trackConversion(supplementId, marketplaceId, saleAmount) {
    const mp = AffiliateEngine.MARKETPLACES[marketplaceId];
    const commission = +(saleAmount * (mp?.commission ?? 0)).toFixed(2);

    const payload = {
      event:       'affiliate_conversion',
      supplement_id: supplementId,
      marketplace: marketplaceId,
      sale_amount: saleAmount,
      commission,
      currency:    this.config.currency,
      timestamp:   new Date().toISOString(),
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
   * @param {Function} fn - Callback receiving the event payload
   * @returns {Function} Unsubscribe function
   */
  onRevenueEvent(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  /**
   * Invalidate price cache for a supplement (call after user reports stale price).
   */
  async invalidateCache(supplementId) {
    this._memCache.delete(supplementId);
    const db = await this._getDB();
    if (!db) return;
    const tx = db.transaction(AffiliateEngine.CACHE_STORE, 'readwrite');
    tx.objectStore(AffiliateEngine.CACHE_STORE).delete(supplementId);
    this._log('invalidateCache', supplementId);
  }

  /**
   * Get the full compliance disclosure text.
   * @param {string} [locale] - 'pt-BR' | 'en-US' | 'es-ES'
   * @returns {string}
   */
  getFullDisclosure(locale) {
    const l = locale ?? this.config.locale;
    const disclosures = {
      'pt-BR': `
**DIVULGAÇÃO DE AFILIADO — SupliList**

O SupliList pode receber uma comissão quando você realiza uma compra através
dos links de afiliado apresentados neste aplicativo. Esta comissão é paga
PELOS MARKETPLACES (Shopee, Mercado Livre, Amazon), não por você.

**Seu preço NÃO aumenta.** A comissão sai da margem do marketplace.

Seguimos as diretrizes da CVM (Comissão de Valores Mobiliários), FTC (Federal
Trade Commission) e LGPD (Lei Geral de Proteção de Dados). Todos os links
patrocinados são claramente identificados com o ícone 💰.

Para mais informações: /legal/affiliate-disclosure
      `.trim(),
      'en-US': `
**AFFILIATE DISCLOSURE — SupliList**

SupliList may receive a commission when you make a purchase through affiliate
links in this app. This commission is paid BY THE MARKETPLACES, not by you.

**Your price does NOT increase.** The commission comes from the marketplace's margin.

We comply with FTC guidelines (16 CFR Part 255) and applicable consumer
protection laws. All sponsored links are clearly identified with the 💰 icon.

For more information: /legal/affiliate-disclosure
      `.trim(),
      'es-ES': `
**DIVULGACIÓN DE AFILIADO — SupliList**

SupliList puede recibir una comisión cuando realizas una compra a través de
los enlaces de afiliado en esta aplicación. Esta comisión la pagan LOS
MARKETPLACES, no tú.

**Tu precio NO aumenta.** La comisión sale del margen del marketplace.

Más información: /legal/affiliate-disclosure
      `.trim(),
    };

    return disclosures[l] ?? disclosures['en-US'];
  }

  // ─────────────────────────────────────────────
  // PRIVATE — PRICE FETCHING
  // ─────────────────────────────────────────────

  /**
   * Fetch prices from all marketplaces.
   * In production: replace _mockPrice with real API calls.
   * Architecture is ready for real integration (SerpAPI, ScraperAPI, etc).
   */
  async _fetchPrices(supplementId) {
    const name   = this._normalizeSupplementName(supplementId);
    const now    = Date.now();

    const results = await Promise.allSettled(
      Object.keys(AffiliateEngine.MARKETPLACES).map(async (mpId) => {
        try {
          // ──────────────────────────────────────────────────────────
          // PRODUCTION: Replace this with real API call per marketplace
          // Example:
          //   const res = await fetch(`/api/prices?marketplace=${mpId}&q=${name}`);
          //   const { price, url } = await res.json();
          // ──────────────────────────────────────────────────────────
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
   * Replace with real API in production.
   * Prices are deterministic per (marketplace, supplement) for consistency.
   */
  async _mockPrice(marketplaceId, supplementId) {
    // Simulate network latency (50–200ms)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));

    // Deterministic "price" based on string hash
    const hash = this._simpleHash(supplementId + marketplaceId);
    const base  = 20 + (hash % 80);   // R$ 20–100

    // Each marketplace has a slight variance
    const variance = {
      shopee:       0.95,  // usually slightly cheaper
      mercadolivre: 1.00,
      amazon:       1.05,  // usually slightly more expensive (faster delivery)
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

    // If user wants cheapest only, sort purely by price
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

        // a) Price score (lower = better): 40%
        const priceScore = p.price > 0 ? (1 - (p.price / maxPrice)) * 0.40 : 0;

        // b) Commission (higher = better for SupliList): 20%
        const commScore  = mp.commission * 0.20;

        // c) Marketplace rating: 20%
        const rateScore  = ((mp.rating - 4.0) / 1.0) * 0.20;  // 4.0–5.0 → 0–0.20

        // d) User preference: 20%
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
      url:             `https://shopee.com.br/search?keyword=${encodeURIComponent(name)}`,
      marketplace:     'shopee',
      marketplaceName: 'Shopee',
      marketplaceEmoji:'🛍️',
      marketplaceColor:'#EE4D2D',
      price:           0,
      commission:      0.12,
      estimatedEarning:0,
      delivery:        '3–7 dias',
      rating:          4.7,
      disclosure:      '💰 SupliList recebe comissão. Seu preço NÃO muda.',
      allOptions:      [],
      cacheAge:        null,
      generatedAt:     Date.now(),
      isFallback:      true,
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

      req.onsuccess  = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror    = ()  => resolve(null); // Fail gracefully
    });
  }

  async _getCached(supplementId) {
    const now = Date.now();

    // 1. In-memory cache (fastest)
    if (this._memCache.has(supplementId)) {
      const { prices, ts } = this._memCache.get(supplementId);
      if (now - ts < AffiliateEngine.CACHE_TTL_MS) {
        return prices.map(p => ({ ...p, cacheAgeMs: now - ts }));
      }
      this._memCache.delete(supplementId);
    }

    // 2. IndexedDB
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

    // In-memory
    this._memCache.set(supplementId, { prices, ts: entry.ts });

    // IndexedDB
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
```

---

## VALIDATION CHECKLIST

- [ ] `generateAffiliateLink('creatina', {})` retorna objeto com `url`, `marketplace`, `price`, `commission`
- [ ] URL gerada contém `utm_source=suplilist`, `utm_medium=app`, `utm_campaign=supplement_recommendation`
- [ ] URL contém o affiliate ID do marketplace (af_id, partner_id, ou tag)
- [ ] Preços são cacheados no IndexedDB após primeira chamada
- [ ] Segunda chamada para mesmo suplemento usa cache (< 6h), sem nova requisição
- [ ] Cache é invalidado após 6 horas
- [ ] `getAllOptions()` retorna 3 marketplaces ordenados por score
- [ ] `userPrefs.preferred = 'shopee'` coloca Shopee no topo mesmo com preço igual
- [ ] `userPrefs.cheapestOnly = true` ordena apenas por preço
- [ ] `trackClick()` dispara `gtag('event', 'affiliate_click', {...})`
- [ ] `trackClick()` dispara `CustomEvent('suplilist:affiliate_click')`
- [ ] `onRevenueEvent(fn)` retorna função de unsubscribe funcional
- [ ] `invalidateCache('creatina')` remove do IndexedDB e in-memory
- [ ] `getFullDisclosure('pt-BR')` retorna texto com menção a CVM + LGPD
- [ ] `getFullDisclosure('en-US')` retorna texto com menção a FTC (16 CFR Part 255)
- [ ] Se IndexedDB não está disponível (SSR/Node), opera apenas com in-memory
- [ ] `_fallbackLink()` retorna link válido do Shopee mesmo sem preço

## FILES TO DELIVER

1. `/src/monetization/affiliate-engine.js`
```

---

## **PROMPT 5.2: PriceComparator — COMPLETO**

```markdown
You are building the Price Comparator for SupliList v4.0.

## CONTEXT

PriceComparator is the "Battle of Marketplaces" feature.
Users choose a supplement and see a real-time side-by-side comparison
of prices across Shopee, Mercado Livre, and Amazon Brazil.

The key metric is NOT just price — it's COST PER DOSE.
R$ 50 for 500g creatine at 5g/day = R$ 0.50/dose
R$ 42 for 300g creatine at 5g/day = R$ 0.70/dose
→ The "cheaper" product is actually MORE expensive per use.

Visual design:
- Battle cards: each marketplace gets a card
- Winner badge: best cost-per-dose gets "Melhor Custo-Benefício" crown
- Price history sparkline (last 7 fetches)
- Affiliate disclosure always visible

---

## TASK 1: CREATE /src/comparator/price-comparator.js

```javascript
/**
 * PriceComparator v4.0 — SupliList
 * Compara custo por dose entre marketplaces, não apenas preço absoluto.
 *
 * Uso:
 *   import PriceComparator from '../comparator/price-comparator.js';
 *   const pc = new PriceComparator(affiliateEngine, supplementDB);
 *   const result = await pc.compare('creatina-monohidratada', { dosage: 5, unit: 'g', quantity: 300 });
 */

import AffiliateEngine from '../monetization/affiliate-engine.js';

export class PriceComparator {

  constructor(affiliateEngine, supplementDatabase = []) {
    this._ae   = affiliateEngine;
    this._db   = supplementDatabase;
    this._history = new Map(); // supplementId → [{ ts, prices[] }]
  }

  // ─────────────────────────────────────────────
  // MAIN COMPARE METHOD
  // ─────────────────────────────────────────────

  /**
   * Compare prices for a supplement across all marketplaces.
   *
   * @param {string} supplementId
   * @param {Object} [options]
   * @param {number} [options.dosage]         - Grams (or units) per day
   * @param {string} [options.unit]           - 'g' | 'mg' | 'ml' | 'caps' | 'tabs'
   * @param {number} [options.quantity]       - Container size (same unit as dosage)
   * @param {Object} [options.userPrefs]      - Passed to AffiliateEngine
   * @returns {Promise<ComparisonResult>}
   */
  async compare(supplementId, options = {}) {
    // 1. Resolve dosage info
    const supplement = this._db.find(s => s.id === supplementId);
    const dosage   = options.dosage   ?? supplement?.dosage?.maintenance  ?? 5;
    const unit     = options.unit     ?? supplement?.dosage?.unit         ?? 'g';
    const quantity = options.quantity ?? supplement?.packageSize          ?? 300;

    // 2. Get prices + affiliate links
    const allOptions = await this._ae.getAllOptions(supplementId, options.userPrefs ?? {});

    // 3. Calculate cost per dose for each marketplace
    const compared = allOptions.map(opt => {
      const costPerDose    = this._calcCostPerDose(opt.price, quantity, dosage);
      const daysSupply     = this._calcDaysSupply(quantity, dosage);
      const costPerMonth   = costPerDose * 30;
      const savings        = null; // populated after winner is determined

      return {
        ...opt,
        dosage,
        unit,
        quantity,
        costPerDose:          +costPerDose.toFixed(4),
        costPerDoseFormatted: this._formatCurrency(costPerDose),
        daysSupply:           +daysSupply.toFixed(1),
        costPerMonth:         +costPerMonth.toFixed(2),
        costPerMonthFormatted: this._formatCurrency(costPerMonth),
        isWinner:             false, // set below
        savingsVsWorst:       null,  // set below
      };
    });

    // 4. Determine winner (lowest cost per dose)
    const withPrice     = compared.filter(o => o.price > 0);
    const sorted        = [...withPrice].sort((a, b) => a.costPerDose - b.costPerDose);
    const winner        = sorted[0];
    const worst         = sorted[sorted.length - 1];

    compared.forEach(opt => {
      opt.isWinner         = winner && opt.marketplaceId === winner.marketplaceId;
      opt.savingsVsWorst   = worst && worst.costPerDose > 0 && !opt.isWinner
        ? +((worst.costPerDose - opt.costPerDose) * 30).toFixed(2)
        : null;
    });

    // 5. Store in price history
    this._recordHistory(supplementId, compared);

    // 6. Build result
    const result = {
      supplementId,
      supplementName:    supplement?.name ?? this._idToName(supplementId),
      dosage,
      unit,
      quantity,
      options:           compared,
      winner:            compared.find(o => o.isWinner) ?? null,
      bestPrice:         winner?.price            ?? null,
      bestCostPerDose:   winner?.costPerDose       ?? null,
      worstCostPerDose:  worst?.costPerDose        ?? null,
      maxSavings:        winner && worst
        ? +((worst.costPerDose - winner.costPerDose) * 30).toFixed(2)
        : 0,
      priceHistory:      this._getHistory(supplementId),
      comparedAt:        new Date().toISOString(),
    };

    return result;
  }

  /**
   * Quick price summary — no UI, just the numbers.
   * Useful for inline rendering in supplement cards.
   *
   * @param {string} supplementId
   * @returns {Promise<{ best: number, worst: number, winner: string, costPerDose: number }>}
   */
  async quickSummary(supplementId) {
    try {
      const result = await this.compare(supplementId);
      return {
        best:        result.bestPrice,
        worst:       result.options.reduce((max, o) => Math.max(max, o.price), 0),
        winner:      result.winner?.marketplaceName ?? null,
        winnerEmoji: result.winner?.marketplaceEmoji ?? null,
        costPerDose: result.bestCostPerDose,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────

  /**
   * Cost per single dose.
   * Example: R$ 50 / (300g package / 5g dose) = R$ 50 / 60 doses = R$ 0.833/dose
   */
  _calcCostPerDose(price, quantity, dosagePerDay) {
    if (!price || !quantity || !dosagePerDay) return 0;
    const doses = quantity / dosagePerDay;
    return doses > 0 ? price / doses : 0;
  }

  /**
   * Days the package lasts.
   * Example: 300g / 5g per day = 60 days
   */
  _calcDaysSupply(quantity, dosagePerDay) {
    if (!quantity || !dosagePerDay) return 0;
    return quantity / dosagePerDay;
  }

  // ─────────────────────────────────────────────
  // PRICE HISTORY (in-memory, last 10 fetches)
  // ─────────────────────────────────────────────

  _recordHistory(supplementId, options) {
    const history = this._history.get(supplementId) ?? [];
    history.push({
      ts:     Date.now(),
      prices: options.map(o => ({ marketplaceId: o.marketplaceId, price: o.price })),
    });
    // Keep last 10 records
    if (history.length > 10) history.shift();
    this._history.set(supplementId, history);
  }

  _getHistory(supplementId) {
    return this._history.get(supplementId) ?? [];
  }

  // ─────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────

  _formatCurrency(value, locale = 'pt-BR', currency = 'BRL') {
    return value.toLocaleString(locale, { style: 'currency', currency });
  }

  _idToName(id) {
    return id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

export default PriceComparator;
```

---

## TASK 2: CREATE /src/pages/price-comparator-page.js

```javascript
/**
 * PriceComparatorPage v4.0 — SupliList
 * "Batalha de Marketplaces" — comparação visual de preços em tempo real.
 */

import sm                from '../state/state-manager.js';
import AffiliateEngine   from '../monetization/affiliate-engine.js';
import PriceComparator   from '../comparator/price-comparator.js';

export class PriceComparatorPage {
  constructor(container) {
    this.container   = container;
    this._ae         = new AffiliateEngine();
    this._comparator = new PriceComparator(this._ae, sm.state.supplements);
    this._current    = null;  // Current ComparisonResult
    this._loading    = false;
    this._debounce   = null;
  }

  mount() {
    this._render();
    this._attachListeners();
  }

  unmount() {}

  // ─────────────────────────────────────────────
  // RENDER SHELL
  // ─────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="comparator-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">⚔️ Comparar Preços</h1>
          <p class="page-subtitle">Batalha de marketplaces — custo real por dose</p>
        </div>

        <!-- ── Search ── -->
        <section class="search-section" aria-label="Busca de suplemento">
          <div class="search-wrapper">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              id="comp-search"
              class="comp-search-input"
              placeholder="Buscar suplemento... (ex: creatina, whey protein)"
              autocomplete="off"
              aria-label="Buscar suplemento para comparar preços"
            >
            <div id="comp-search-results" class="comp-dropdown" style="display:none" role="listbox" aria-label="Resultados da busca"></div>
          </div>
        </section>

        <!-- ── Dosage Context ── -->
        <section class="dosage-context card" id="dosage-context" style="display:none" aria-label="Contexto de dosagem">
          <h2 class="section-title">📐 Contexto da Comparação</h2>
          <div class="dosage-row">
            <div class="dosage-field">
              <label class="dosage-label" for="comp-quantity">Tamanho embalagem</label>
              <div class="dosage-input-group">
                <input type="number" id="comp-quantity" class="dosage-input" min="1" max="10000" value="300">
                <span class="dosage-unit" id="comp-unit-label">g</span>
              </div>
            </div>
            <div class="dosage-field">
              <label class="dosage-label" for="comp-dosage">Dose diária</label>
              <div class="dosage-input-group">
                <input type="number" id="comp-dosage" class="dosage-input" min="0.1" max="1000" step="0.1" value="5">
                <span class="dosage-unit" id="comp-dosage-unit-label">g/dia</span>
              </div>
            </div>
            <div class="dosage-field">
              <label class="dosage-label">Duração</label>
              <div class="dosage-result" id="comp-days-result">
                <span class="days-value">60</span>
                <span class="days-unit">dias</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Results: Battle Cards ── -->
        <section id="comp-results" aria-live="polite" aria-label="Comparação de preços">
          <!-- Populated by _renderResults() -->
        </section>

        <!-- ── Disclosure ── -->
        <affiliate-disclosure locale="pt-BR"></affiliate-disclosure>

      </div>
    `;

    this._attachStyles();
    this._initSearch();
  }

  // ─────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────

  _initSearch() {
    const input   = document.getElementById('comp-search');
    const results = document.getElementById('comp-search-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { results.style.display = 'none'; return; }

        const matches = sm.state.supplements
          .filter(s => s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
          .slice(0, 10);

        if (!matches.length) { results.style.display = 'none'; return; }

        results.innerHTML = matches.map(s => `
          <button
            class="comp-result-item"
            role="option"
            data-id="${s.id}"
            data-name="${s.name}"
            data-dosage="${s.dosage?.maintenance ?? 5}"
            data-quantity="${s.packageSize ?? 300}"
            data-unit="${s.dosage?.unit ?? 'g'}"
            data-action="select-supplement"
          >
            <span class="cri-name">${s.name}</span>
            <span class="cri-category">${s.category ?? ''}</span>
          </button>
        `).join('');

        results.style.display = 'block';
      }, 180);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  }

  // ─────────────────────────────────────────────
  // COMPARE & RENDER
  // ─────────────────────────────────────────────

  async _runComparison(supplementId, opts = {}) {
    const resultsEl = document.getElementById('comp-results');
    const ctxEl     = document.getElementById('dosage-context');
    if (!resultsEl) return;

    // Show loading state
    resultsEl.innerHTML = `
      <div class="comp-loading" role="status" aria-live="polite">
        <div class="loading-arena">
          <span class="loading-marketplace" style="animation-delay:0ms">🛍️</span>
          <span class="loading-vs">⚔️</span>
          <span class="loading-marketplace" style="animation-delay:200ms">🛒</span>
          <span class="loading-vs">⚔️</span>
          <span class="loading-marketplace" style="animation-delay:400ms">📦</span>
        </div>
        <p>Consultando marketplaces...</p>
      </div>
    `;
    if (ctxEl) ctxEl.style.display = 'block';

    try {
      const result = await this._comparator.compare(supplementId, opts);
      this._current = result;
      this._renderResults(result);
      this._syncDosageContext(result);
    } catch (err) {
      resultsEl.innerHTML = `
        <div class="comp-error card">
          <p>❌ Não foi possível comparar preços agora.</p>
          <p style="font-size:12px;color:#666">Tente novamente em instantes.</p>
          <button class="btn-retry btn-primary" data-action="retry" data-id="${supplementId}">↺ Tentar novamente</button>
        </div>
      `;
    }
  }

  _renderResults(result) {
    const el = document.getElementById('comp-results');
    if (!el) return;

    const hasResults = result.options.some(o => o.price > 0);

    el.innerHTML = `
      <div class="comp-header">
        <h2 class="comp-supplement-name">${result.supplementName}</h2>
        <p class="comp-subtitle">
          Embalagem: <strong>${result.quantity}${result.unit}</strong> ·
          Dose: <strong>${result.dosage}${result.unit}/dia</strong> ·
          Duração: <strong>${Math.round(result.quantity / result.dosage)} dias</strong>
        </p>
        ${result.maxSavings > 0 ? `
          <div class="comp-savings-banner">
            💰 Você pode economizar até <strong>R$ ${result.maxSavings.toFixed(2)}/mês</strong> escolhendo o melhor marketplace
          </div>
        ` : ''}
      </div>

      <!-- Battle Cards -->
      <div class="battle-grid" role="list" aria-label="Comparação de marketplaces">
        ${result.options.map((opt, idx) => this._renderBattleCard(opt, idx)).join('')}
      </div>

      ${!hasResults ? `
        <p class="comp-no-price">Preços não disponíveis no momento. Tente novamente em alguns minutos.</p>
      ` : ''}

      <!-- Cost-per-dose ranking -->
      ${hasResults ? `
        <section class="ranking-section card">
          <h3 class="ranking-title">📊 Ranking por Custo/Dose</h3>
          <div class="ranking-list">
            ${[...result.options]
              .filter(o => o.price > 0)
              .sort((a, b) => a.costPerDose - b.costPerDose)
              .map((opt, i) => `
                <div class="ranking-item ${opt.isWinner ? 'ranking-winner' : ''}">
                  <span class="ranking-pos">${i + 1}°</span>
                  <span class="ranking-mp-emoji" aria-hidden="true">${opt.marketplaceEmoji}</span>
                  <span class="ranking-mp-name">${opt.marketplaceName}</span>
                  <span class="ranking-cost-dose">${opt.costPerDoseFormatted}/dose</span>
                  <span class="ranking-cost-month">${opt.costPerMonthFormatted}/mês</span>
                  ${opt.isWinner ? '<span class="ranking-crown" aria-label="Melhor custo-benefício">👑</span>' : ''}
                </div>
              `).join('')}
          </div>
        </section>
      ` : ''}
    `;
  }

  _renderBattleCard(opt, idx) {
    const mp = opt;

    return `
      <div
        class="battle-card ${opt.isWinner ? 'battle-card-winner' : ''} ${opt.price === 0 ? 'battle-card-unavailable' : ''}"
        role="listitem"
        style="--mp-color:${opt.marketplaceColor ?? '#7C3AED'}"
        aria-label="${opt.marketplaceName}: ${opt.priceFormatted ?? 'Indisponível'}"
        data-id="${opt.marketplaceId}"
      >

        <!-- Winner Badge -->
        ${opt.isWinner ? `
          <div class="winner-badge" aria-label="Melhor custo-benefício">
            👑 Melhor Custo-Benefício
          </div>
        ` : ''}

        <!-- Marketplace Header -->
        <div class="bc-header">
          <span class="bc-emoji" aria-hidden="true">${opt.marketplaceEmoji}</span>
          <div>
            <p class="bc-name">${opt.marketplaceName}</p>
            <p class="bc-delivery">🚚 ${opt.delivery}</p>
          </div>
          <div class="bc-rating">
            ⭐ ${opt.rating?.toFixed(1) ?? '—'}
          </div>
        </div>

        <!-- Price -->
        ${opt.price > 0 ? `
          <div class="bc-price-block">
            <span class="bc-price">${opt.priceFormatted}</span>
            <span class="bc-price-label">preço do produto</span>
          </div>

          <div class="bc-metrics">
            <div class="bc-metric">
              <span class="bc-metric-value">${opt.costPerDoseFormatted}</span>
              <span class="bc-metric-label">por dose</span>
            </div>
            <div class="bc-metric-divider" aria-hidden="true"></div>
            <div class="bc-metric">
              <span class="bc-metric-value">${opt.costPerMonthFormatted}</span>
              <span class="bc-metric-label">por mês</span>
            </div>
            <div class="bc-metric-divider" aria-hidden="true"></div>
            <div class="bc-metric">
              <span class="bc-metric-value">${Math.round(opt.daysSupply)}</span>
              <span class="bc-metric-label">dias</span>
            </div>
          </div>

          ${opt.savingsVsWorst > 0 ? `
            <p class="bc-savings" aria-label="Economia vs pior opção">
              💸 R$ ${opt.savingsVsWorst.toFixed(2)}/mês a menos que o mais caro
            </p>
          ` : ''}

          <!-- CTA -->
          <a
            href="${opt.url ?? '#'}"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="bc-cta ${opt.isWinner ? 'bc-cta-winner' : ''}"
            aria-label="Ver ${mp.marketplaceName}"
            data-action="go-to-marketplace"
            data-id="${opt.marketplaceId}"
            data-supplement="${this._current?.supplementId}"
            data-price="${opt.price}"
          >
            Ver no ${opt.marketplaceName} →
          </a>
        ` : `
          <div class="bc-unavailable">
            <p>Preço indisponível</p>
            <p style="font-size:12px;color:#555">Cache expirado ou produto não encontrado</p>
          </div>
        `}

      </div>
    `;
  }

  _syncDosageContext(result) {
    const qInput     = document.getElementById('comp-quantity');
    const dInput     = document.getElementById('comp-dosage');
    const unitLabel  = document.getElementById('comp-unit-label');
    const dUnitLabel = document.getElementById('comp-dosage-unit-label');
    const daysResult = document.getElementById('comp-days-result');

    if (qInput)     qInput.value     = result.quantity;
    if (dInput)     dInput.value     = result.dosage;
    if (unitLabel)  unitLabel.textContent  = result.unit;
    if (dUnitLabel) dUnitLabel.textContent = `${result.unit}/dia`;
    if (daysResult) daysResult.innerHTML   = `
      <span class="days-value">${Math.round(result.quantity / result.dosage)}</span>
      <span class="days-unit">dias</span>
    `;
  }

  // ─────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────

  _attachListeners() {
    this.container.addEventListener('click', async (e) => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'select-supplement') {
        const id       = btn.dataset.id;
        const dosage   = parseFloat(btn.dataset.dosage)   || 5;
        const quantity = parseFloat(btn.dataset.quantity) || 300;
        const unit     = btn.dataset.unit || 'g';

        const input   = document.getElementById('comp-search');
        const results = document.getElementById('comp-search-results');
        if (input)   input.value          = btn.dataset.name;
        if (results) results.style.display = 'none';

        await this._runComparison(id, { dosage, quantity, unit });
      }

      if (action === 'go-to-marketplace') {
        this._ae.trackClick(btn.dataset.supplement, btn.dataset.id, parseFloat(btn.dataset.price));
      }

      if (action === 'retry') {
        await this._runComparison(btn.dataset.id);
      }
    });

    // Dosage context inputs → re-run comparison
    ['comp-quantity', 'comp-dosage'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', async () => {
        if (!this._current) return;
        clearTimeout(this._debounce);
        this._debounce = setTimeout(async () => {
          const q = parseFloat(document.getElementById('comp-quantity')?.value) || 300;
          const d = parseFloat(document.getElementById('comp-dosage')?.value)   || 5;
          await this._runComparison(this._current.supplementId, {
            quantity: q,
            dosage:   d,
            unit:     this._current.unit,
          });
        }, 400);
      });
    });
  }

  // ─────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────

  _attachStyles() {
    if (document.getElementById('comparator-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'comparator-page-styles';
    style.textContent = `
      .comparator-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px 16px 100px;
        max-width: 900px;
        margin: 0 auto;
      }
      .page-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }
      .card { background: #141414; border: 1px solid #2A2A2A; border-radius: 16px; padding: 20px; }

      /* Search */
      .search-section { position: relative; }
      .search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-icon {
        position: absolute;
        left: 16px;
        font-size: 16px;
        pointer-events: none;
      }
      .comp-search-input {
        width: 100%;
        padding: 14px 16px 14px 44px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 14px;
        color: #FAFAFA;
        font-size: 16px;
        font-family: 'Inter', sans-serif;
        outline: none;
        box-sizing: border-box;
        transition: border-color 150ms, box-shadow 150ms;
      }
      .comp-search-input:focus {
        border-color: #7C3AED;
        box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
      }
      .comp-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0; right: 0;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 12px;
        overflow: hidden;
        z-index: 200;
        box-shadow: 0 12px 32px rgba(0,0,0,0.6);
      }
      .comp-result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 12px 16px;
        background: none;
        border: none;
        border-bottom: 1px solid #2A2A2A;
        cursor: pointer;
        text-align: left;
        font-family: 'Inter', sans-serif;
        transition: background 150ms;
      }
      .comp-result-item:last-child { border-bottom: none; }
      .comp-result-item:hover { background: #2A2A2A; }
      .cri-name { font-size: 14px; font-weight: 600; color: #FAFAFA; }
      .cri-category { font-size: 12px; color: #666; }

      /* Dosage context */
      .section-title { font-size: 16px; font-weight: 700; color: #FAFAFA; margin: 0 0 14px; }
      .dosage-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
      .dosage-field { display: flex; flex-direction: column; gap: 6px; }
      .dosage-label { font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .dosage-input-group { display: flex; align-items: center; gap: 6px; }
      .dosage-input {
        width: 80px;
        padding: 9px 12px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 8px;
        color: #FAFAFA;
        font-size: 15px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        outline: none;
        text-align: center;
      }
      .dosage-input:focus { border-color: #7C3AED; }
      .dosage-unit { font-size: 12px; color: #888; }
      .dosage-result { display: flex; align-items: baseline; gap: 4px; padding: 9px 0; }
      .days-value { font-size: 28px; font-weight: 900; color: #00E676; font-family: 'JetBrains Mono', monospace; }
      .days-unit  { font-size: 14px; color: #888; }

      /* Loading */
      .comp-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px 20px;
        color: #888;
      }
      .loading-arena {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 32px;
      }
      .loading-marketplace {
        animation: bounce 0.8s ease-in-out infinite alternate;
      }
      .loading-vs { font-size: 20px; color: #444; }
      @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-10px); } }

      /* Comp header */
      .comp-header { margin-bottom: 8px; }
      .comp-supplement-name { font-size: 22px; font-weight: 800; color: #FAFAFA; margin: 0 0 6px; }
      .comp-subtitle { font-size: 13px; color: #888; margin: 0 0 10px; }
      .comp-savings-banner {
        display: inline-block;
        padding: 8px 14px;
        background: #00E67611;
        border: 1px solid #00E67633;
        border-radius: 999px;
        font-size: 13px;
        color: #00E676;
      }
      .comp-no-price { color: #666; font-size: 13px; padding: 8px 0; }

      /* Battle grid */
      .battle-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      /* Battle card */
      .battle-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 18px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 16px;
        transition: border-color 200ms, box-shadow 200ms, transform 200ms;
      }
      .battle-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      .battle-card-winner {
        border-color: #00E676;
        background: #00E67608;
        box-shadow: 0 0 24px rgba(0,230,118,0.12);
      }
      .battle-card-unavailable { opacity: 0.5; }

      .winner-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: #00E676;
        color: #0A0A0A;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 10px;
        border-radius: 999px;
        white-space: nowrap;
      }

      .bc-header { display: flex; align-items: center; gap: 10px; padding-top: 6px; }
      .bc-emoji { font-size: 24px; }
      .bc-name { font-size: 14px; font-weight: 700; color: #FAFAFA; margin: 0 0 2px; }
      .bc-delivery { font-size: 11px; color: #888; margin: 0; }
      .bc-rating { margin-left: auto; font-size: 12px; color: #888; white-space: nowrap; }

      .bc-price-block { display: flex; flex-direction: column; gap: 2px; }
      .bc-price {
        font-size: 26px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: #FAFAFA;
        line-height: 1;
      }
      .bc-price-label { font-size: 11px; color: #666; }

      .bc-metrics {
        display: flex;
        align-items: center;
        gap: 0;
        background: #1E1E1E;
        border-radius: 10px;
        overflow: hidden;
      }
      .bc-metric {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 10px 6px;
      }
      .bc-metric-value {
        font-size: 13px;
        font-weight: 800;
        color: #FAFAFA;
        font-family: 'JetBrains Mono', monospace;
      }
      .bc-metric-label { font-size: 10px; color: #888; text-align: center; }
      .bc-metric-divider { width: 1px; height: 32px; background: #2A2A2A; flex-shrink: 0; }

      .bc-savings {
        font-size: 12px;
        color: #00E676;
        margin: 0;
        padding: 8px 10px;
        background: #00E67608;
        border-radius: 8px;
      }

      .bc-cta {
        display: block;
        text-align: center;
        padding: 11px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #FAFAFA;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        transition: all 150ms;
        font-family: 'Inter', sans-serif;
        margin-top: auto;
      }
      .bc-cta:hover { background: #2A2A2A; border-color: #7C3AED; }
      .bc-cta-winner {
        background: #00E67611;
        border-color: #00E67644;
        color: #00E676;
      }
      .bc-cta-winner:hover { background: #00E676; color: #0A0A0A; }

      .bc-unavailable {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #555;
        font-size: 13px;
        padding: 20px;
        text-align: center;
      }

      /* Ranking */
      .ranking-section { margin-top: 4px; }
      .ranking-title { font-size: 14px; font-weight: 700; color: #FAFAFA; margin: 0 0 12px; }
      .ranking-list { display: flex; flex-direction: column; gap: 8px; }
      .ranking-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: #1E1E1E;
        border-radius: 10px;
        font-size: 13px;
        border: 1px solid transparent;
      }
      .ranking-winner { border-color: #00E67644; background: #00E67608; }
      .ranking-pos { font-size: 14px; font-weight: 800; color: #888; min-width: 24px; font-family: 'JetBrains Mono', monospace; }
      .ranking-mp-emoji { font-size: 18px; }
      .ranking-mp-name { color: #FAFAFA; font-weight: 600; flex: 1; }
      .ranking-cost-dose { color: #7C3AED; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
      .ranking-cost-month { color: #888; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
      .ranking-crown { font-size: 16px; }

      /* Error */
      .comp-error { text-align: center; color: #888; }
      .btn-retry { margin-top: 12px; padding: 10px 20px; }

      /* Responsive */
      @media (max-width: 600px) {
        .battle-grid { grid-template-columns: 1fr; }
        .dosage-row  { grid-template-columns: 1fr 1fr; }
        .dosage-row > :last-child { grid-column: 1 / -1; }
      }
      @media (min-width: 600px) and (max-width: 800px) {
        .battle-grid { grid-template-columns: repeat(3, 1fr); }
        .bc-price { font-size: 20px; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default PriceComparatorPage;
```

---

## VALIDATION CHECKLIST

### PriceComparator (lógica)
- [ ] `compare('creatina', { quantity: 300, dosage: 5, unit: 'g' })` retorna 3 opções com `costPerDose`
- [ ] `costPerDose` = `price / (quantity / dosage)` — ex: R$50 / (300/5) = R$0.833
- [ ] `daysSupply` = `quantity / dosage` — ex: 300/5 = 60 dias
- [ ] `isWinner: true` apenas para a opção com menor `costPerDose`
- [ ] `savingsVsWorst` calculado corretamente para opções não-winner
- [ ] `maxSavings` = diferença de `costPerDose * 30` entre winner e worst
- [ ] `quickSummary()` retorna `{ best, worst, winner, costPerDose }` sem lançar exceção
- [ ] `_recordHistory()` guarda máximo de 10 registros por suplemento
- [ ] Se todos os preços são 0, `winner` é `null`

### PriceComparatorPage (UI)
- [ ] Busca filtra suplementos com ≥2 caracteres em ≤180ms (debounce)
- [ ] Selecionar um suplemento fecha o dropdown e inicia a comparação
- [ ] Loading state mostra os 3 emojis dos marketplaces com animação bounce
- [ ] Após carregar, 3 cards aparecem em grid (ou 1 coluna no mobile)
- [ ] Winner card tem borda verde + badge "👑 Melhor Custo-Benefício"
- [ ] Cada card mostra: preço absoluto, custo/dose, custo/mês, dias de duração, entrega
- [ ] CTA "Ver no Marketplace" dispara `trackClick()` e abre em nova aba
- [ ] Alterar quantity/dosage re-executa a comparação automaticamente (debounce 400ms)
- [ ] Ranking table exibe opções ordenadas por custo/dose, menor = 1°
- [ ] Mobile (<600px): cards em coluna única, sem overflow

## FILES TO DELIVER

1. `/src/comparator/price-comparator.js`
2. `/src/pages/price-comparator-page.js`
```

---

## **PROMPT 5.3: PremiumTierSystem — COMPLETO**

```markdown
You are building the Premium Tier System for SupliList v4.0.

## CONTEXT

SupliList uses a freemium model with 3 tiers:

| Tier   | Price      | Target user                          |
|--------|------------|--------------------------------------|
| Free   | R$ 0/mês   | Occasional user, exploring           |
| Pro    | R$ 19/mês  | Serious user, wants full features    |
| Master | R$ 49/mês  | Power user, gym coach, nutritionist  |

Revenue goal: 5% of MAU converts to paid → R$ 8–15M ARR at 100k users.

Feature gating rules:
- FREE: basic stack (≤5 supplements), basic comparator (1 marketplace), 7-day history
- PRO: unlimited stack, all 3 marketplaces, 90-day history, export CSV, custom dosages
- MASTER: everything in Pro + AI insights, white-label export, API access, priority support

The Premium page must feel like a VALUE presentation, not a paywall.
Show what the user is missing, not what they can't have.

---

## TASK 1: CREATE /src/premium/premium-tier-system.js

```javascript
/**
 * PremiumTierSystem v4.0 — SupliList
 * Feature gates, tier management, and upgrade flows.
 *
 * Uso:
 *   import pts from '../premium/premium-tier-system.js'; // singleton
 *   pts.can('unlimited_stack');   // → true/false
 *   pts.gate('unlimited_stack');  // → throws UpgradeRequired if blocked
 */

export class PremiumTierSystem {

  // ─────────────────────────────────────────────
  // TIER DEFINITIONS
  // ─────────────────────────────────────────────

  static TIERS = {
    free: {
      id:       'free',
      name:     'Free',
      emoji:    '🌱',
      price:    0,
      currency: 'BRL',
      period:   'mês',
      color:    '#888',
      tagline:  'Para começar sua jornada',
      features: {
        // Stack
        stack_limit:             5,        // max supplements in stack
        unlimited_stack:         false,
        // Comparator
        comparator_marketplaces: 1,        // how many marketplaces shown
        // History
        history_days:            7,
        // Export
        export_csv:              false,
        export_pdf:              false,
        export_json:             false,
        // AI
        ai_insights:             false,
        ai_coaching:             false,
        // Community
        community_access:        true,     // basic read
        community_create:        false,    // can't post
        // Support
        priority_support:        false,
        // API
        api_access:              false,
        // Branding
        white_label:             false,
        // Notifications
        repurchase_alerts:       true,     // basic alerts
        smart_notifications:     false,
      },
    },
    pro: {
      id:       'pro',
      name:     'Pro',
      emoji:    '⚡',
      price:    19,
      currency: 'BRL',
      period:   'mês',
      color:    '#7C3AED',
      tagline:  'Para o atleta que leva a sério',
      annualDiscount: 0.20,   // 20% off annual
      popular: true,
      features: {
        stack_limit:             Infinity,
        unlimited_stack:         true,
        comparator_marketplaces: 3,
        history_days:            90,
        export_csv:              true,
        export_pdf:              false,
        export_json:             true,
        ai_insights:             false,
        ai_coaching:             false,
        community_access:        true,
        community_create:        true,
        priority_support:        false,
        api_access:              false,
        white_label:             false,
        repurchase_alerts:       true,
        smart_notifications:     true,
      },
    },
    master: {
      id:       'master',
      name:     'Master',
      emoji:    '👑',
      price:    49,
      currency: 'BRL',
      period:   'mês',
      color:    '#FFB74D',
      tagline:  'Para coaches e power users',
      annualDiscount: 0.25,   // 25% off annual
      features: {
        stack_limit:             Infinity,
        unlimited_stack:         true,
        comparator_marketplaces: 3,
        history_days:            Infinity,
        export_csv:              true,
        export_pdf:              true,
        export_json:             true,
        ai_insights:             true,
        ai_coaching:             true,
        community_access:        true,
        community_create:        true,
        priority_support:        true,
        api_access:              true,
        white_label:             true,
        repurchase_alerts:       true,
        smart_notifications:     true,
      },
    },
  };

  // ─────────────────────────────────────────────
  // FEATURE LABELS (for UI)
  // ─────────────────────────────────────────────

  static FEATURE_LABELS = {
    unlimited_stack:         { label: 'Stack ilimitado', category: 'stack' },
    comparator_marketplaces: { label: 'Todos os marketplaces', category: 'comparator' },
    history_days:            { label: 'Histórico completo', category: 'analytics' },
    export_csv:              { label: 'Exportar CSV', category: 'export' },
    export_pdf:              { label: 'Exportar PDF', category: 'export' },
    export_json:             { label: 'Exportar JSON', category: 'export' },
    ai_insights:             { label: 'Insights de IA', category: 'ai' },
    ai_coaching:             { label: 'Coaching por IA', category: 'ai' },
    community_create:        { label: 'Postar na comunidade', category: 'community' },
    priority_support:        { label: 'Suporte prioritário', category: 'support' },
    api_access:              { label: 'Acesso à API', category: 'api' },
    white_label:             { label: 'Exportação white-label', category: 'export' },
    smart_notifications:     { label: 'Notificações inteligentes', category: 'notifications' },
  };

  // ─────────────────────────────────────────────
  // CONSTRUCTOR (Singleton pattern via module)
  // ─────────────────────────────────────────────

  constructor() {
    this._currentTier = this._loadTier();
    this._listeners   = [];
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────

  /**
   * Get current tier definition.
   * @returns {TierDefinition}
   */
  get currentTier() {
    return PremiumTierSystem.TIERS[this._currentTier] ?? PremiumTierSystem.TIERS.free;
  }

  /**
   * Check if the current user can access a feature.
   *
   * @param {string} feature - Feature key from TIERS[].features
   * @param {*} [value]      - Optional: check if feature value meets threshold
   *                           e.g., can('stack_limit', 6) → can they add 6th supplement?
   * @returns {boolean}
   */
  can(feature, value = null) {
    const tier = this.currentTier;
    const featureValue = tier.features[feature];

    if (featureValue === undefined) return false;
    if (typeof featureValue === 'boolean') return featureValue;

    // Numeric limits
    if (value !== null && typeof featureValue === 'number') {
      return featureValue === Infinity || value <= featureValue;
    }

    return Boolean(featureValue);
  }

  /**
   * Gate a feature: returns true or fires the upgrade flow.
   * Call from action handlers: if (!pts.gate('ai_insights')) return;
   *
   * @param {string} feature
   * @param {Object} [opts]
   * @param {string} [opts.context] - Where the gate was triggered (for analytics)
   * @param {Function} [opts.onBlocked] - Custom callback when blocked
   * @returns {boolean} true if allowed, false if blocked
   */
  gate(feature, opts = {}) {
    if (this.can(feature)) return true;

    const requiredTier = this._findMinTier(feature);
    const event = {
      type:         'gate_triggered',
      feature,
      currentTier:  this._currentTier,
      requiredTier,
      context:      opts.context ?? 'unknown',
    };

    this._emit(event);
    this._trackGateEvent(feature, requiredTier, opts.context);

    if (opts.onBlocked) {
      opts.onBlocked(event);
    } else {
      this._showUpgradePrompt(feature, requiredTier);
    }

    return false;
  }

  /**
   * Get the minimum tier required for a feature.
   */
  requiredTierFor(feature) {
    return this._findMinTier(feature);
  }

  /**
   * Set the user's tier (called after successful payment or restore purchase).
   * @param {'free'|'pro'|'master'} tierId
   */
  setTier(tierId) {
    if (!PremiumTierSystem.TIERS[tierId]) return;
    this._currentTier = tierId;
    this._saveTier(tierId);

    this._emit({ type: 'tier_changed', from: this._currentTier, to: tierId });
    this._trackTierChange(tierId);
  }

  /**
   * Compare two tiers (for upgrade prompts).
   * @param {string} fromTier
   * @param {string} toTier
   * @returns {string[]} Array of features gained
   */
  getUpgradeGains(fromTier, toTier) {
    const from = PremiumTierSystem.TIERS[fromTier]?.features ?? {};
    const to   = PremiumTierSystem.TIERS[toTier]?.features   ?? {};
    const gains = [];

    Object.keys(to).forEach(key => {
      const toVal   = to[key];
      const fromVal = from[key];
      const label   = PremiumTierSystem.FEATURE_LABELS[key]?.label;
      if (!label) return;

      if (typeof toVal === 'boolean' && toVal && !fromVal) {
        gains.push(label);
      } else if (typeof toVal === 'number' && toVal > fromVal) {
        gains.push(label);
      }
    });

    return gains;
  }

  /**
   * Get annual price (with discount).
   * @param {'pro'|'master'} tierId
   * @returns {{ monthly: number, annual: number, savings: number }}
   */
  getAnnualPricing(tierId) {
    const tier = PremiumTierSystem.TIERS[tierId];
    if (!tier || !tier.annualDiscount) return null;

    const monthly = tier.price;
    const annual  = +(monthly * 12 * (1 - tier.annualDiscount)).toFixed(2);
    const savings = +(monthly * 12 - annual).toFixed(2);

    return { monthly, annual, annualPerMonth: +(annual / 12).toFixed(2), savings };
  }

  /**
   * Subscribe to tier events.
   * @param {Function} fn
   * @returns {Function} Unsubscribe
   */
  onEvent(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  // ─────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────

  _findMinTier(feature) {
    const order = ['free', 'pro', 'master'];
    for (const tierId of order) {
      const tier = PremiumTierSystem.TIERS[tierId];
      const val  = tier.features[feature];
      if (val === true || (typeof val === 'number' && val > 0)) {
        return tierId;
      }
    }
    return 'master';
  }

  _showUpgradePrompt(feature, requiredTier) {
    const tier   = PremiumTierSystem.TIERS[requiredTier];
    const label  = PremiumTierSystem.FEATURE_LABELS[feature]?.label ?? feature;
    const gains  = this.getUpgradeGains(this._currentTier, requiredTier);

    // Dispatch a custom DOM event — the Premium page or a modal can catch it
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suplilist:upgrade_prompt', {
        detail: { feature, requiredTier, tierName: tier.name, label, gains }
      }));
    }
  }

  _trackGateEvent(feature, requiredTier, context) {
    window.gtag?.('event', 'premium_gate_triggered', {
      feature,
      required_tier: requiredTier,
      current_tier:  this._currentTier,
      context:       context ?? 'unknown',
    });
  }

  _trackTierChange(tierId) {
    window.gtag?.('event', 'tier_changed', { new_tier: tierId });
  }

  _loadTier() {
    try {
      return localStorage.getItem('suplilist_tier') ?? 'free';
    } catch {
      return 'free';
    }
  }

  _saveTier(tierId) {
    try {
      localStorage.setItem('suplilist_tier', tierId);
    } catch { /* fail silently */ }
  }

  _emit(event) {
    this._listeners.forEach(fn => fn(event));
  }
}

// Singleton export
const pts = new PremiumTierSystem();
export default pts;
```

---

## TASK 2: CREATE /src/pages/premium-page.js

```javascript
/**
 * PremiumPage v4.0 — SupliList
 * Página de upgrade: apresenta os planos, benefícios e CTA de upgrade.
 * Design: value-first (mostra o que você ganha), não paywall-first.
 */

import pts, { PremiumTierSystem } from '../premium/premium-tier-system.js';

export class PremiumPage {
  constructor(container) {
    this.container   = container;
    this._billing    = 'monthly'; // 'monthly' | 'annual'
    this._unsub      = null;
  }

  mount() {
    this._render();
    this._attachListeners();

    // Listen for external upgrade events
    this._upgradeHandler = (e) => this._highlightTier(e.detail.requiredTier);
    window.addEventListener('suplilist:upgrade_prompt', this._upgradeHandler);
  }

  unmount() {
    this._unsub?.();
    window.removeEventListener('suplilist:upgrade_prompt', this._upgradeHandler);
  }

  _render() {
    const current = pts.currentTier;

    this.container.innerHTML = `
      <div class="premium-page">

        <!-- ── Hero ── -->
        <div class="premium-hero">
          <p class="premium-hero-super">🚀 Desbloqueie o potencial máximo</p>
          <h1 class="premium-hero-title">Suplementação<br>no modo Pro</h1>
          <p class="premium-hero-sub">
            De graça pra sempre. Quando você quiser ir além, estamos aqui.
          </p>

          <!-- Billing toggle -->
          <div class="billing-toggle" role="group" aria-label="Período de cobrança">
            <button
              class="billing-btn ${this._billing === 'monthly' ? 'active' : ''}"
              data-billing="monthly"
            >Mensal</button>
            <button
              class="billing-btn ${this._billing === 'annual' ? 'active' : ''}"
              data-billing="annual"
            >Anual <span class="annual-badge">Até 25% off</span></button>
          </div>
        </div>

        <!-- ── Tier Cards ── -->
        <div class="tier-grid" id="tier-grid" role="list" aria-label="Planos disponíveis">
          ${Object.values(PremiumTierSystem.TIERS).map(tier => this._renderTierCard(tier, current)).join('')}
        </div>

        <!-- ── Feature Comparison Table ── -->
        <section class="feature-table-section">
          <h2 class="ft-title">Comparação completa</h2>
          ${this._renderFeatureTable(current)}
        </section>

        <!-- ── FAQ ── -->
        <section class="faq-section">
          <h2 class="faq-title">Perguntas frequentes</h2>
          ${this._renderFAQ()}
        </section>

        <!-- ── Footer ── -->
        <p class="premium-footer-note">
          Pagamentos processados com segurança via Stripe. Cancele a qualquer momento.
          Sem taxas de cancelamento. Dados protegidos por LGPD.
        </p>

      </div>
    `;

    this._attachStyles();
  }

  _renderTierCard(tier, currentTier) {
    const isCurrentTier = currentTier.id === tier.id;
    const annualPricing = tier.annualDiscount ? pts.getAnnualPricing(tier.id) : null;
    const displayPrice  = this._billing === 'annual' && annualPricing
      ? annualPricing.annualPerMonth
      : tier.price;

    const gains = tier.id !== 'free' ? pts.getUpgradeGains('free', tier.id) : [];

    return `
      <div
        class="tier-card ${tier.popular ? 'tier-popular' : ''} ${isCurrentTier ? 'tier-current' : ''}"
        role="listitem"
        id="tier-card-${tier.id}"
        style="--tier-color:${tier.color}"
        aria-label="Plano ${tier.name}${isCurrentTier ? ' — seu plano atual' : ''}"
      >

        ${tier.popular ? `<div class="tier-popular-badge">⭐ Mais Popular</div>` : ''}
        ${isCurrentTier ? `<div class="tier-current-badge">✓ Plano Atual</div>` : ''}

        <!-- Tier header -->
        <div class="tc-header">
          <span class="tc-emoji" aria-hidden="true">${tier.emoji}</span>
          <div>
            <h3 class="tc-name">${tier.name}</h3>
            <p class="tc-tagline">${tier.tagline}</p>
          </div>
        </div>

        <!-- Price -->
        <div class="tc-price-block">
          ${tier.price === 0 ? `
            <span class="tc-price">Grátis</span>
            <span class="tc-price-sub">para sempre</span>
          ` : `
            <div class="tc-price-row">
              <span class="tc-price">R$ ${displayPrice.toFixed(0)}</span>
              <span class="tc-price-period">/mês</span>
            </div>
            ${this._billing === 'annual' && annualPricing ? `
              <p class="tc-annual-info">
                R$ ${annualPricing.annual.toFixed(0)}/ano
                · Economize R$ ${annualPricing.savings.toFixed(0)}
              </p>
            ` : ''}
          `}
        </div>

        <!-- Feature highlights -->
        <ul class="tc-features" aria-label="Principais recursos do plano ${tier.name}">
          ${gains.slice(0, 5).map(g => `
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>${g}</span>
            </li>
          `).join('')}
          ${tier.id === 'free' ? `
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>Stack com até 5 suplementos</span>
            </li>
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>Comparador de preços (1 marketplace)</span>
            </li>
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>Histórico de 7 dias</span>
            </li>
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>Sistema de streaks e badges</span>
            </li>
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>Alertas de reposição</span>
            </li>
          ` : ''}
        </ul>

        <!-- CTA -->
        ${isCurrentTier ? `
          <div class="tc-cta-current" aria-label="Plano atual">
            ✓ Plano atual
          </div>
        ` : tier.price === 0 ? `
          <button
            class="tc-cta tc-cta-ghost"
            data-action="downgrade"
            data-tier="${tier.id}"
            aria-label="Usar plano gratuito"
          >Usar gratuitamente</button>
        ` : `
          <button
            class="tc-cta tc-cta-upgrade"
            data-action="upgrade"
            data-tier="${tier.id}"
            data-billing="${this._billing}"
            style="background:${tier.color}"
            aria-label="Assinar plano ${tier.name}"
          >
            ${tier.emoji} Assinar ${tier.name}
            ${this._billing === 'annual' ? ` · R$ ${displayPrice.toFixed(0)}/mês` : ''}
          </button>
        `}

      </div>
    `;
  }

  _renderFeatureTable(currentTier) {
    const categories = {
      stack:         'Stack',
      comparator:    'Comparador',
      analytics:     'Histórico & Analytics',
      export:        'Exportação',
      ai:            'Inteligência Artificial',
      community:     'Comunidade',
      notifications: 'Notificações',
      support:       'Suporte',
      api:           'API & Integrações',
    };

    const tiers    = Object.values(PremiumTierSystem.TIERS);
    const features = PremiumTierSystem.FEATURE_LABELS;

    const grouped = {};
    Object.entries(features).forEach(([key, meta]) => {
      if (!grouped[meta.category]) grouped[meta.category] = [];
      grouped[meta.category].push({ key, ...meta });
    });

    return `
      <div class="feature-table" role="table" aria-label="Comparação de recursos por plano">
        <!-- Header -->
        <div class="ft-header" role="row">
          <div class="ft-cell-label" role="columnheader">Recurso</div>
          ${tiers.map(t => `
            <div
              class="ft-cell-tier ${currentTier.id === t.id ? 'ft-current' : ''}"
              role="columnheader"
              style="--tier-color:${t.color}"
            >
              ${t.emoji} ${t.name}
            </div>
          `).join('')}
        </div>

        <!-- Rows grouped by category -->
        ${Object.entries(grouped).map(([catKey, featList]) => `
          <div class="ft-category-header" role="row">
            <div class="ft-cat-label" role="cell" colspan="4">
              ${categories[catKey] ?? catKey}
            </div>
          </div>

          ${featList.map(feat => `
            <div class="ft-row" role="row">
              <div class="ft-cell-label" role="cell">${feat.label}</div>
              ${tiers.map(t => {
                const val = t.features[feat.key];
                let display = '';
                if (typeof val === 'boolean') {
                  display = val
                    ? `<span class="ft-check" aria-label="Disponível">✓</span>`
                    : `<span class="ft-x"     aria-label="Não disponível">✕</span>`;
                } else if (val === Infinity) {
                  display = `<span class="ft-inf" aria-label="Ilimitado">∞</span>`;
                } else if (typeof val === 'number') {
                  display = `<span class="ft-num">${val}</span>`;
                }
                return `
                  <div
                    class="ft-cell ${currentTier.id === t.id ? 'ft-current' : ''}"
                    role="cell"
                  >${display}</div>
                `;
              }).join('')}
            </div>
          `).join('')}
        `).join('')}
      </div>
    `;
  }

  _renderFAQ() {
    const faqs = [
      {
        q: 'Posso cancelar a qualquer momento?',
        a: 'Sim. Cancele quando quiser, sem multa ou taxa. Seu acesso premium dura até o fim do período pago.'
      },
      {
        q: 'O que acontece com meus dados no Free?',
        a: 'Seus dados ficam 100% seguros no seu dispositivo (local-first). Mesmo no plano Free, você tem soberania total sobre seus dados.'
      },
      {
        q: 'Vocês têm desconto para estudantes ou coaches?',
        a: 'Entre em contato via suporte para programas especiais. Coaches podem se qualificar para o plano Master com desconto.'
      },
      {
        q: 'O plano Master inclui acesso à API?',
        a: 'Sim. O plano Master inclui acesso à API REST do SupliList para integrar com seus próprios sistemas ou apps.'
      },
      {
        q: 'Aceita Pix?',
        a: 'Sim! Além de cartão de crédito via Stripe, aceitamos Pix para pagamentos anuais no Brasil.'
      },
    ];

    return `
      <div class="faq-list" role="list">
        ${faqs.map(faq => `
          <details class="faq-item" role="listitem">
            <summary class="faq-q">${faq.q}</summary>
            <p class="faq-a">${faq.a}</p>
          </details>
        `).join('')}
      </div>
    `;
  }

  _highlightTier(tierId) {
    // Scroll to and pulse the required tier card
    const card = document.getElementById(`tier-card-${tierId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('tier-highlight-pulse');
    setTimeout(() => card.classList.remove('tier-highlight-pulse'), 2000);
  }

  _attachListeners() {
    // Billing toggle
    this.container.querySelectorAll('.billing-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._billing = btn.dataset.billing;
        this.container.querySelectorAll('.billing-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.billing === this._billing);
        });
        document.getElementById('tier-grid').innerHTML =
          Object.values(PremiumTierSystem.TIERS)
            .map(t => this._renderTierCard(t, pts.currentTier))
            .join('');
      });
    });

    // Upgrade / downgrade CTAs (delegated)
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'upgrade') {
        this._initiateUpgrade(btn.dataset.tier, btn.dataset.billing);
      }
      if (btn.dataset.action === 'downgrade') {
        this._initiateDowngrade();
      }
    });
  }

  _initiateUpgrade(tierId, billing) {
    const tier = PremiumTierSystem.TIERS[tierId];
    if (!tier) return;

    // Track intent
    window.gtag?.('event', 'upgrade_initiated', {
      tier: tierId,
      billing,
      price: billing === 'annual'
        ? pts.getAnnualPricing(tierId)?.annual
        : tier.price,
    });

    // ──────────────────────────────────────────────────────────────
    // PRODUCTION: Replace with Stripe Checkout redirect
    //
    // const res = await fetch('/api/stripe/create-checkout-session', {
    //   method: 'POST',
    //   body: JSON.stringify({ tier: tierId, billing }),
    //   headers: { 'Content-Type': 'application/json' },
    // });
    // const { url } = await res.json();
    // window.location.href = url;
    // ──────────────────────────────────────────────────────────────

    // For now: simulate success (demo mode)
    const confirmed = confirm(
      `🚀 Assinar plano ${tier.name} por R$ ${tier.price}/mês?\n\n` +
      `(Integração Stripe — implementar em produção)`
    );

    if (confirmed) {
      pts.setTier(tierId);
      window.toast?.(`🎉 Bem-vindo ao ${tier.name}!`, 'success');
      this._render();
      this._attachListeners();
    }
  }

  _initiateDowngrade() {
    if (!confirm('Tem certeza que deseja voltar ao plano Free?')) return;
    pts.setTier('free');
    window.toast?.('Plano alterado para Free', 'info');
    this._render();
    this._attachListeners();
  }

  _attachStyles() {
    if (document.getElementById('premium-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'premium-page-styles';
    style.textContent = `
      .premium-page {
        display: flex;
        flex-direction: column;
        gap: 40px;
        padding: 20px 16px 100px;
        max-width: 960px;
        margin: 0 auto;
      }

      /* Hero */
      .premium-hero { text-align: center; padding: 20px 0 8px; }
      .premium-hero-super { font-size: 13px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; }
      .premium-hero-title { font-size: clamp(32px, 6vw, 52px); font-weight: 900; color: #FAFAFA; margin: 0 0 12px; line-height: 1.1; }
      .premium-hero-sub { font-size: 15px; color: #888; margin: 0 0 24px; }

      /* Billing toggle */
      .billing-toggle { display: inline-flex; background: #141414; border: 1px solid #2A2A2A; border-radius: 999px; padding: 4px; gap: 4px; }
      .billing-btn {
        padding: 8px 20px;
        background: transparent;
        border: none;
        border-radius: 999px;
        color: #888;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 150ms;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .billing-btn.active { background: #7C3AED; color: #fff; }
      .annual-badge {
        background: #00E676;
        color: #0A0A0A;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 999px;
      }

      /* Tier grid */
      .tier-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        align-items: start;
      }

      /* Tier card */
      .tier-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 20px;
        transition: border-color 200ms, transform 200ms, box-shadow 200ms;
      }
      .tier-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
      .tier-popular {
        border-color: #7C3AED;
        background: #7C3AED08;
        box-shadow: 0 0 32px rgba(124,58,237,0.15);
      }
      .tier-current { border-color: #00E676; background: #00E67606; }

      .tier-popular-badge, .tier-current-badge {
        position: absolute;
        top: -13px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        font-weight: 800;
        padding: 3px 12px;
        border-radius: 999px;
        white-space: nowrap;
      }
      .tier-popular-badge { background: #7C3AED; color: #fff; }
      .tier-current-badge { background: #00E676; color: #0A0A0A; }

      @keyframes tier-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        50% { box-shadow: 0 0 0 12px rgba(124,58,237,0.25); }
      }
      .tier-highlight-pulse { animation: tier-pulse 0.8s ease 2; border-color: #7C3AED !important; }

      .tc-header { display: flex; align-items: center; gap: 12px; }
      .tc-emoji { font-size: 28px; }
      .tc-name { font-size: 18px; font-weight: 800; color: #FAFAFA; margin: 0 0 2px; }
      .tc-tagline { font-size: 12px; color: #888; margin: 0; }

      .tc-price-block { display: flex; flex-direction: column; gap: 4px; }
      .tc-price-row { display: flex; align-items: baseline; gap: 3px; }
      .tc-price { font-size: 36px; font-weight: 900; color: #FAFAFA; font-family: 'JetBrains Mono', monospace; line-height: 1; }
      .tc-price-period { font-size: 14px; color: #888; }
      .tc-price-sub { font-size: 13px; color: #888; }
      .tc-annual-info { font-size: 12px; color: #888; margin: 0; }

      .tc-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .tc-feature { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #FAFAFA; line-height: 1.4; }
      .tc-check { color: var(--tier-color, #7C3AED); font-weight: 700; flex-shrink: 0; }

      .tc-cta {
        width: 100%;
        padding: 13px;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: opacity 150ms, transform 150ms;
      }
      .tc-cta:hover { opacity: 0.9; transform: translateY(-1px); }
      .tc-cta:active { transform: scale(0.98); }
      .tc-cta-upgrade { color: #fff; }
      .tc-cta-ghost {
        background: transparent;
        border: 1px solid #2A2A2A;
        color: #888;
      }
      .tc-cta-ghost:hover { border-color: #7C3AED; color: #FAFAFA; }
      .tc-cta-current {
        width: 100%;
        padding: 13px;
        text-align: center;
        background: #00E67611;
        border: 1px solid #00E67644;
        border-radius: 12px;
        color: #00E676;
        font-size: 14px;
        font-weight: 700;
      }

      /* Feature table */
      .feature-table-section { overflow-x: auto; }
      .ft-title { font-size: 20px; font-weight: 800; color: #FAFAFA; margin: 0 0 16px; }
      .feature-table { width: 100%; border-collapse: collapse; }
      .ft-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 12px 12px 0 0;
        overflow: hidden;
      }
      .ft-header > * { padding: 12px 16px; font-size: 13px; font-weight: 700; color: #888; }
      .ft-header .ft-current { color: var(--tier-color); }

      .ft-category-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        background: #0A0A0A;
        padding: 8px 16px;
      }
      .ft-cat-label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.8px; }

      .ft-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        border-top: 1px solid #1A1A1A;
      }
      .ft-row:hover { background: #141414; }
      .ft-cell-label { padding: 12px 16px; font-size: 13px; color: #FAFAFA; }
      .ft-cell { padding: 12px 16px; text-align: center; font-size: 14px; }
      .ft-cell.ft-current { background: #7C3AED08; }
      .ft-check { color: #00E676; font-weight: 700; }
      .ft-x     { color: #333; }
      .ft-inf   { color: #7C3AED; font-weight: 700; }
      .ft-num   { color: #FAFAFA; font-family: 'JetBrains Mono', monospace; font-weight: 600; }

      /* FAQ */
      .faq-title { font-size: 20px; font-weight: 800; color: #FAFAFA; margin: 0 0 16px; }
      .faq-list { display: flex; flex-direction: column; gap: 8px; }
      .faq-item {
        padding: 16px 20px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 12px;
        transition: border-color 150ms;
      }
      .faq-item[open] { border-color: #7C3AED44; }
      .faq-q { font-size: 14px; font-weight: 700; color: #FAFAFA; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
      .faq-q::after { content: '+'; color: #7C3AED; font-size: 18px; }
      .faq-item[open] .faq-q::after { content: '−'; }
      .faq-a { font-size: 13px; color: #888; margin: 12px 0 0; line-height: 1.6; }

      /* Footer */
      .premium-footer-note { font-size: 12px; color: #555; text-align: center; line-height: 1.6; padding: 0 16px; }

      /* Responsive */
      @media (max-width: 640px) {
        .tier-grid { grid-template-columns: 1fr; }
        .premium-hero-title { font-size: 28px; }
        .ft-header, .ft-row, .ft-category-header { grid-template-columns: 1.5fr 1fr 1fr 1fr; }
        .ft-cell-label, .ft-cell { padding: 10px 10px; font-size: 12px; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default PremiumPage;
```

---

## VALIDATION CHECKLIST

### PremiumTierSystem (lógica)
- [ ] `pts.can('unlimited_stack')` retorna `false` em Free, `true` em Pro e Master
- [ ] `pts.can('stack_limit', 6)` retorna `false` em Free (limite é 5), `true` em Pro (∞)
- [ ] `pts.can('ai_insights')` retorna `false` em Free e Pro, `true` apenas em Master
- [ ] `pts.gate('ai_insights')` retorna `false` e dispara `suplilist:upgrade_prompt` quando em Free
- [ ] `pts.gate('ai_insights')` retorna `true` quando tier é Master
- [ ] `pts.setTier('pro')` persiste no localStorage e atualiza `currentTier`
- [ ] `pts.getUpgradeGains('free', 'pro')` lista features ganhas (≥5 itens)
- [ ] `pts.getAnnualPricing('pro')` retorna `{ monthly: 19, annual: 182.4, savings: 45.6 }`
- [ ] Após recarregar a página, `pts.currentTier` reflete o tier salvo no localStorage
- [ ] `onEvent(fn)` chama `fn` quando `setTier()` é chamado

### PremiumPage (UI)
- [ ] Billing toggle "Mensal / Anual" re-renderiza os cards com preço atualizado
- [ ] Preço anual = preço mensal × 12 × (1 - desconto) ÷ 12
- [ ] Plano atual do usuário tem badge "✓ Plano Atual" verde
- [ ] `tier-highlight-pulse` anima o card quando `suplilist:upgrade_prompt` é disparado
- [ ] Feature comparison table renderiza todas as 3 colunas de tier
- [ ] ✓ aparece em verde para features habilitadas, ✕ em cinza para desabilitadas
- [ ] ∞ aparece para `Infinity` (stack ilimitado, histórico ilimitado)
- [ ] FAQ usa `<details>/<summary>` com animação de abertura
- [ ] Botão "Assinar Pro" chama `_initiateUpgrade('pro', billing)` e dispara gtag event
- [ ] Após upgrade simulado, tier muda e toast de sucesso aparece
- [ ] Mobile (<640px): 1 coluna para os tier cards

## FILES TO DELIVER

1. `/src/premium/premium-tier-system.js`
2. `/src/pages/premium-page.js`
```

---

## **PROMPT 5.4: AffiliateDisclosureComponent — COMPLETO**

```markdown
You are building the AffiliateDisclosure Web Component for SupliList v4.0.

## CONTEXT

Every page that shows affiliate links MUST display a disclosure.
FTC (USA), CVM (Brasil), and LGPD require clear, conspicuous disclosure
that the app earns a commission.

This is a reusable Web Component: <affiliate-disclosure locale="pt-BR">.
It handles:
- Multiple locales (pt-BR, en-US, es-ES)
- Collapsible (compact by default, expandable for full legal text)
- Correct legal language per jurisdiction
- Keyboard-accessible
- Renders inline or as a sticky footer (configurable)

---

## TASK 1: CREATE /src/components/affiliate-disclosure.js

```javascript
/**
 * AffiliateDisclosure Web Component v4.0 — SupliList
 *
 * Uso:
 *   <affiliate-disclosure locale="pt-BR"></affiliate-disclosure>
 *   <affiliate-disclosure locale="en-US" expanded></affiliate-disclosure>
 *   <affiliate-disclosure locale="pt-BR" sticky></affiliate-disclosure>
 *
 * Atributos:
 *   locale   — 'pt-BR' | 'en-US' | 'es-ES'  (default: 'pt-BR')
 *   expanded — boolean: mostrar texto completo imediatamente
 *   sticky   — boolean: renderizar como footer fixo
 */

class AffiliateDisclosure extends HTMLElement {

  // ─────────────────────────────────────────────
  // CONTENT DEFINITIONS
  // ─────────────────────────────────────────────

  static CONTENT = {
    'pt-BR': {
      compact: '💰 SupliList pode receber comissão pelos links. Seu preço não muda.',
      expandLabel: 'Saiba mais',
      collapseLabel: 'Recolher',
      title: 'Divulgação de Afiliado',
      full: `
        O SupliList pode receber uma comissão quando você realiza uma compra através
        dos links de afiliado neste aplicativo. Esta comissão é paga pelos marketplaces
        parceiros (Shopee, Mercado Livre, Amazon), <strong>não por você</strong>.
        <br><br>
        <strong>Seu preço não aumenta.</strong> A comissão é descontada da margem do marketplace,
        não adicionada ao seu valor de compra.
        <br><br>
        Seguimos as diretrizes da <strong>CVM</strong> (Instrução CVM nº 598/2018),
        <strong>FTC</strong> (16 CFR Part 255) e <strong>LGPD</strong>
        (Lei nº 13.709/2018). Todos os links patrocinados são claramente identificados
        com o ícone 💰.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Política de afiliados completa →
        </a>
      `,
      badge: 'Parceria declarada',
    },
    'en-US': {
      compact: '💰 SupliList may earn a commission from links. Your price won\'t change.',
      expandLabel: 'Learn more',
      collapseLabel: 'Show less',
      title: 'Affiliate Disclosure',
      full: `
        SupliList may earn a commission when you purchase through affiliate links
        on this app. This commission is paid by our partner marketplaces,
        <strong>not by you</strong>.
        <br><br>
        <strong>Your price does not increase.</strong> The commission is deducted from
        the marketplace's margin, not added to your purchase price.
        <br><br>
        We comply with <strong>FTC guidelines</strong> (16 CFR Part 255) and applicable
        consumer protection laws. All sponsored links are clearly identified with the 💰 icon.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Full affiliate policy →
        </a>
      `,
      badge: 'Declared partnership',
    },
    'es-ES': {
      compact: '💰 SupliList puede recibir comisión por los enlaces. Tu precio no cambia.',
      expandLabel: 'Saber más',
      collapseLabel: 'Colapsar',
      title: 'Divulgación de Afiliado',
      full: `
        SupliList puede recibir una comisión cuando realizas una compra a través de
        los enlaces de afiliado en esta aplicación. Esta comisión la pagan los
        marketplaces asociados, <strong>no tú</strong>.
        <br><br>
        <strong>Tu precio no aumenta.</strong> La comisión se descuenta del margen
        del marketplace.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Política de afiliados completa →
        </a>
      `,
      badge: 'Asociación declarada',
    },
  };

  // ─────────────────────────────────────────────
  // WEB COMPONENT LIFECYCLE
  // ─────────────────────────────────────────────

  static get observedAttributes() {
    return ['locale', 'expanded', 'sticky'];
  }

  constructor() {
    super();
    this._expanded = false;
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._expanded = this.hasAttribute('expanded');
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'expanded') this._expanded = newVal !== null;
    if (name === 'locale' || name === 'sticky') this._render();
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  _render() {
    const locale   = this.getAttribute('locale') || 'pt-BR';
    const sticky   = this.hasAttribute('sticky');
    const content  = AffiliateDisclosure.CONTENT[locale]
                   ?? AffiliateDisclosure.CONTENT['pt-BR'];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .disclosure {
          padding: 12px 16px;
          background: #141414;
          border: 1px solid #2A2A2A;
          border-radius: 10px;
          font-size: 12px;
          color: #888;
          line-height: 1.5;
          transition: border-color 200ms;
        }

        .disclosure:focus-within { border-color: #7C3AED44; }

        :host([sticky]) .disclosure {
          position: fixed;
          bottom: 72px;
          left: 16px;
          right: 16px;
          z-index: 50;
          border-radius: 12px;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
          max-width: 560px;
          margin: 0 auto;
        }

        .disclosure-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .disclosure-text {
          flex: 1;
          color: #888;
          font-size: 12px;
        }

        .disclosure-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          background: #7C3AED11;
          border: 1px solid #7C3AED33;
          border-radius: 999px;
          font-size: 10px;
          color: #7C3AED;
          font-weight: 600;
          white-space: nowrap;
        }

        .expand-btn {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #7C3AED;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
          font-family: inherit;
          white-space: nowrap;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
        }

        .expand-btn:focus-visible {
          outline: 2px solid #7C3AED;
          outline-offset: 2px;
          border-radius: 3px;
        }

        .disclosure-full {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2A2A2A;
          font-size: 12px;
          color: #888;
          line-height: 1.7;
          animation: slideDown 200ms ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .disclosure-full strong { color: #FAFAFA; }

        .disclosure-full a {
          color: #7C3AED;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .disclosure-full a:hover { color: #9F67FF; }

        .disclosure-title {
          font-size: 13px;
          font-weight: 700;
          color: #FAFAFA;
          margin: 0 0 8px;
        }
      </style>

      <div
        class="disclosure"
        role="note"
        aria-label="${content.title}"
        itemscope
        itemtype="https://schema.org/DisclosureNotice"
      >

        <!-- Compact row (always visible) -->
        <div class="disclosure-compact">
          <p class="disclosure-text" itemprop="text">${content.compact}</p>
          <span class="disclosure-badge" aria-hidden="true">${content.badge}</span>
          <button
            class="expand-btn"
            aria-expanded="${this._expanded}"
            aria-controls="disclosure-full-text"
          >${this._expanded ? content.collapseLabel : content.expandLabel}</button>
        </div>

        <!-- Full text (collapsible) -->
        ${this._expanded ? `
          <div class="disclosure-full" id="disclosure-full-text" role="region" aria-label="${content.title}">
            <p class="disclosure-title">${content.title}</p>
            <div>${content.full}</div>
          </div>
        ` : ''}

      </div>
    `;

    // Attach expand/collapse listener
    this.shadowRoot.querySelector('.expand-btn')?.addEventListener('click', () => {
      this._expanded = !this._expanded;
      this._render();
    });
  }
}

// Register the custom element
if (!customElements.get('affiliate-disclosure')) {
  customElements.define('affiliate-disclosure', AffiliateDisclosure);
}

export default AffiliateDisclosure;
```

---

## VALIDATION CHECKLIST

- [ ] `<affiliate-disclosure locale="pt-BR">` renderiza texto em português com menção a CVM e LGPD
- [ ] `<affiliate-disclosure locale="en-US">` renderiza em inglês com menção à FTC (16 CFR Part 255)
- [ ] `<affiliate-disclosure locale="es-ES">` renderiza em espanhol
- [ ] Locale desconhecido cai em `pt-BR` como fallback
- [ ] Compact view sempre visível com texto resumido + badge
- [ ] Botão "Saiba mais" expande o texto completo e muda para "Recolher"
- [ ] `aria-expanded` alterna corretamente entre "true" e "false"
- [ ] `<affiliate-disclosure expanded>` renderiza já expandido
- [ ] `<affiliate-disclosure sticky>` aplica `position: fixed` com `bottom: 72px` (acima da nav)
- [ ] Shadow DOM isola estilos completamente (não vaza para fora)
- [ ] Funciona como Web Component em qualquer página sem importações extras (além do registro)
- [ ] `customElements.define` não é chamado duas vezes (guard condicional)
- [ ] Link "/legal/affiliate-disclosure" abre em nova aba com `rel="noopener"`
- [ ] Focus outline visível no botão "Saiba mais" (acessibilidade)
- [ ] Animação `slideDown` ao expandir o texto completo

## FILES TO DELIVER

1. `/src/components/affiliate-disclosure.js`
```

---

## **📊 RESUMO DO SPRINT 5**

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 5.1 | `affiliate-engine.js` (v2) | AffiliateEngine | IndexedDB cache 6h, UTM completo, 3 marketplaces, analytics, compliance |
| 5.2 | `price-comparator.js` + `price-comparator-page.js` | PriceComparator + PriceComparatorPage | Custo/dose como métrica principal, battle cards, winner badge, ranking |
| 5.3 | `premium-tier-system.js` + `premium-page.js` | PremiumTierSystem + PremiumPage | 3 tiers, feature gates, billing toggle, comparison table, FAQ |
| 5.4 | `affiliate-disclosure.js` | `<affiliate-disclosure>` | Web Component Shadow DOM, 3 locales, CVM/FTC/LGPD, collapsible, sticky |

---

## **✅ TOTAL ACUMULADO SPRINTS 1–5**

| Categoria | O que existe |
|-----------|-------------|
| **Web Components** | 10+ reutilizáveis (`evidence-pill`, `stat-card`, `streak-counter`, `modal-dialog`, `affiliate-disclosure`, ...) |
| **Pages** | 7 completas (Home, List, Calculator, MyStack, Favorites, Streak, PriceComparator, Premium) |
| **Engines** | StackRecommender, DosageCalculator, AffiliateEngine v2, PriceComparator |
| **Systems** | CheckinStreakSystem, PremiumTierSystem |
| **Design** | design-system.css (40+ tokens, dark-mode, WCAG AAA) |
| **PWA** | manifest.json + Service Worker v4 |
| **Monetização** | Afiliados (3 marketplaces) + Premium (3 tiers) + Compliance (FTC/CVM/LGPD) |

---

## **🚀 PRÓXIMO: Sprint 6 — Analytics + Stripe + Conversion Funnel**

Sprint 6 cobre:
- **Prompt 6.1:** `GoogleAnalytics4Wrapper` — eventos tipados, funil de conversão, affiliate tracking
- **Prompt 6.2:** `StripeIntegration` — checkout session, webhooks, restore purchase
- **Prompt 6.3:** `ConversionFunnelPage` — dashboard de analytics em tempo real (admin)
- **Prompt 6.4:** `OnboardingFlow` — 5 telas de onboarding para novos usuários (reduz churn D1)

---

*SupliList v4.0 — Sprint 5 | 26 de maio de 2026*
*Fase 2: Core+ Global | Semanas 9–12 | Monetização operacional*
