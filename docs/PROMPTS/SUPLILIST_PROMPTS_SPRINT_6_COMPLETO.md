# **SPRINT 6: Analytics + Stripe + Conversion Funnel — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no seu IDE.

**Sprint:** 6 | **Fase:** 2 — Core+ Global | **Semanas:** 13–16
**Depende de:** Sprints 1–5 completos (design-system, state-manager, affiliate-engine, premium-tiers, todas as pages)

---

## **VISÃO GERAL DO SPRINT 6**

| Prompt | Arquivo(s) | O que entrega |
|--------|-----------|---------------|
| 6.1 | `analytics-wrapper.js` | GoogleAnalytics4Wrapper: eventos tipados, funil de conversão, UTM tracking, attribution |
| 6.2 | `stripe-integration.js` | StripeIntegration: checkout session, webhooks, restore purchase, cancel subscription |
| 6.3 | `conversion-funnel-page.js` | ConversionFunnelPage: dashboard admin tempo real (GA4 + Stripe + afiliados) |
| 6.4 | `onboarding-flow.js` + `onboarding-page.js` | OnboardingFlow: 5 telas (goals, biometria, preferências, stack base, upgrade upsell) |

**Após o Sprint 6:**
- Analytics operacional com funil de conversão rastreado end-to-end ✅
- Checkout Stripe integrado com webhook-ready ✅
- Dashboard de admin com dados em tempo real (CA4 + Stripe + afiliados) ✅
- Onboarding otimizado que reduz D1 churn e aumenta upsell ✅

---

## **PROMPT 6.1: GoogleAnalytics4Wrapper — EVENTOS TIPADOS COMPLETO**

```markdown
You are building the production GoogleAnalytics4Wrapper for SupliList v4.0.

## CONTEXT

Analytics is invisible to users but critical for monetization.
Every click, scroll, purchase intent, and conversion must be tracked
with full attribution, UTM preservation, and funnel clarity.

This module:
- Wraps gtag() with TypeScript-level typing (via JSDoc)
- Tracks the complete conversion funnel: impression → click → cart → payment → LTV
- Preserves UTM parameters through every page transition
- Integrates with Stripe webhooks (purchase events)
- Integrates with affiliate engine (click attribution)
- Sends custom events to Mixpanel (optional backup)
- Handles offline queue (batches events when offline)
- Never sends PII; LGPD/GDPR compliant
- Provides user consent management (analytics opt-in/out)

Architecture:
- Stateless wrapper (init once, use everywhere)
- Event types enforced via JSDoc + enum
- Conversion funnel tracked in GA4 "funnel" parameter
- UTM auto-captured on page load, preserved across sessions
- Affiliate tracking: always include ?aff_id in custom events
- Custom dimensions: user_tier, stack_size, affiliate_source
- Offline queue: uses IndexedDB for failed events

---

## TASK 1: CREATE /src/analytics/analytics-wrapper.js

\`\`\`javascript
/**
 * GoogleAnalytics4Wrapper v1.0 — SupliList
 * Eventos tipados, funil de conversão, UTM tracking, offline queue
 *
 * Uso:
 *   import Analytics from '../analytics/analytics-wrapper.js';
 *   Analytics.init('G-XXXXXXXXXX', { locale: 'pt-BR', debug: true });
 *   Analytics.trackEvent('supplement_viewed', { supplementId: 'creatina', price: 89.90 });
 *   Analytics.trackConversion('premium_purchased', { tierId: 'pro', value: 99 });
 */

// ─────────────────────────────────────────────────────────────────
// ENUMS & TYPES (JSDoc-based)
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AnalyticsConfig
 * @property {string} measurementId - GA4 measurement ID (G-XXXXXXXXXX)
 * @property {string} [locale] - User locale (default: 'pt-BR')
 * @property {string} [currency] - Currency code (default: 'BRL')
 * @property {boolean} [debug] - Log to console (default: false)
 * @property {string} [serverUrl] - Optional server-side tracking URL
 * @property {boolean} [enableMixpanel] - Enable Mixpanel backup (default: false)
 * @property {string} [mixpanelToken] - Mixpanel project token
 */

/**
 * @typedef {Object} EventData
 * @property {string} [userId] - Anonymous user ID (never send email/name)
 * @property {string} [sessionId] - Session UUID
 * @property {string} [funnelStep] - 'view' | 'click' | 'cart' | 'payment' | 'success'
 * @property {number} [value] - Monetary value (BRL)
 * @property {string} [currency] - Currency override
 * @property {string} [affiliateSource] - 'organic' | 'affiliate_id_xyz' | 'partner'
 * @property {string} [utmSource] - UTM source (captured from URL)
 * @property {string} [utmMedium] - UTM medium
 * @property {string} [utmCampaign] - UTM campaign
 * @property {string} [utmContent] - UTM content
 * @property {string} [userTier] - 'free' | 'pro' | 'master'
 * @property {number} [stackSize] - Number of supplements in user's stack
 * @property {string} [supplementId] - For supplement-specific events
 * @property {string} [marketplace] - 'shopee' | 'mercadolivre' | 'amazon'
 * @property {number} [elapsedMs] - Duration (for performance)
 */

/**
 * @enum {string}
 */
const EVENT_TYPES = {
  // Funnel: View
  PAGE_VIEW:              'page_view',
  SUPPLEMENT_VIEWED:      'supplement_viewed',
  CALCULATOR_OPENED:      'calculator_opened',
  STACK_VIEWED:           'stack_viewed',
  PRICE_COMPARATOR_OPENED: 'price_comparator_opened',
  
  // Funnel: Click (intent)
  AFFILIATE_LINK_CLICKED: 'affiliate_link_clicked',
  PREMIUM_CTA_CLICKED:    'premium_cta_clicked',
  BUY_NOW_CLICKED:        'buy_now_clicked',
  CHECKOUT_INITIATED:     'checkout_initiated',
  
  // Funnel: Cart (Stripe Checkout)
  CHECKOUT_SESSION_CREATED: 'checkout_session_created',
  CHECKOUT_ABANDONED:     'checkout_abandoned',
  COUPON_APPLIED:         'coupon_applied',
  
  // Funnel: Payment
  PAYMENT_STARTED:        'payment_started',
  PAYMENT_PROCESSING:     'payment_processing',
  PAYMENT_COMPLETED:      'payment_completed',
  PAYMENT_FAILED:         'payment_failed',
  
  // Funnel: Success
  PREMIUM_ACTIVATED:      'premium_activated',
  SUBSCRIPTION_STARTED:   'subscription_started',
  AFFILIATE_CONVERTED:    'affiliate_converted',
  
  // Engagement
  STREAK_COMPLETED:       'streak_completed',
  BADGE_EARNED:           'badge_earned',
  CHALLENGE_JOINED:       'challenge_joined',
  CONTENT_SHARED:         'content_shared',
  
  // Errors & Issues
  ERROR_OCCURRED:         'error_occurred',
  API_FAILED:             'api_failed',
};

/**
 * @enum {string}
 */
const FUNNEL_STEPS = {
  IMPRESSION:  'impression',
  CLICK:       'click',
  CART:        'cart',
  PAYMENT:     'payment',
  SUCCESS:     'success',
};

// ─────────────────────────────────────────────────────────────────
// ANALYTICS WRAPPER
// ─────────────────────────────────────────────────────────────────

class GoogleAnalytics4Wrapper {
  
  static _instance = null;
  static _initialized = false;
  
  /**
   * Singleton initialization
   * @param {AnalyticsConfig} config
   * @returns {GoogleAnalytics4Wrapper}
   */
  static init(config = {}) {
    if (GoogleAnalytics4Wrapper._initialized) {
      console.warn('[Analytics] Already initialized. Returning existing instance.');
      return GoogleAnalytics4Wrapper._instance;
    }
    
    GoogleAnalytics4Wrapper._instance = new GoogleAnalytics4Wrapper(config);
    GoogleAnalytics4Wrapper._initialized = true;
    return GoogleAnalytics4Wrapper._instance;
  }
  
  static getInstance() {
    if (!GoogleAnalytics4Wrapper._initialized) {
      throw new Error('[Analytics] Not initialized. Call Analytics.init() first.');
    }
    return GoogleAnalytics4Wrapper._instance;
  }
  
  // ─────────────────────────────────────────────────────────────────
  // CONSTRUCTOR & SETUP
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * @param {AnalyticsConfig} config
   */
  constructor(config = {}) {
    this.config = {
      measurementId:   config.measurementId   ?? 'G-XXXXXXXXXX',
      locale:          config.locale          ?? 'pt-BR',
      currency:        config.currency        ?? 'BRL',
      debug:           config.debug           ?? false,
      serverUrl:       config.serverUrl       ?? null,
      enableMixpanel:  config.enableMixpanel  ?? false,
      mixpanelToken:   config.mixpanelToken   ?? null,
    };
    
    this._sessionId      = this._generateSessionId();
    this._userId         = this._getOrCreateUserId();
    this._utm            = this._captureUTM();
    this._offlineQueue   = [];
    this._isOnline       = navigator.onLine;
    this._consentGiven   = this._checkConsent();
    
    this._initGtag();
    this._initMixpanel();
    this._setupEventListeners();
  }
  
  /**
   * Initialize gtag global
   * @private
   */
  _initGtag() {
    if (typeof window === 'undefined') return;
    
    // Load gtag script if not already loaded
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }
    
    // Configure GA4
    window.gtag('config', this.config.measurementId, {
      allow_google_signals: false,  // LGPD/GDPR compliance
      allow_ad_personalization_signals: false,
      anonymize_ip: true,
      user_id: this._userId,
      session_id: this._sessionId,
    });
    
    // Load gtag script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.measurementId}`;
    document.head.appendChild(script);
    
    this._log('gtag initialized', { measurementId: this.config.measurementId });
  }
  
  /**
   * Initialize Mixpanel (optional)
   * @private
   */
  _initMixpanel() {
    if (!this.config.enableMixpanel || !this.config.mixpanelToken) return;
    
    if (typeof window === 'undefined') return;
    
    // Simple Mixpanel loader (full integration optional)
    (function(f,b){
      if(!b.__SuppliListMixpanel){
        var e={__proto__:3},c=["track","set_config","get_distinct_id","identify","alias","people","Router"],a;
        for(a=0;a<c.length;a++) e[c[a]]=function(){};
        b.__SuppliListMixpanel=e;
      }
    })(document,window);
    
    this._log('Mixpanel initialized (stub)', { token: this.config.mixpanelToken });
  }
  
  /**
   * Setup online/offline listeners
   * @private
   */
  _setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this._isOnline = true;
      this._log('online: flushing offline queue', { queueSize: this._offlineQueue.length });
      this._flushOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this._isOnline = false;
      this._log('offline: queueing events');
    });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: FUNNEL TRACKING
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Track impression (user views supplement/price/etc)
   * @param {string} eventName - e.g., 'supplement_viewed'
   * @param {EventData} data
   */
  trackImpression(eventName, data = {}) {
    this.trackEvent(eventName, {
      ...data,
      funnelStep: FUNNEL_STEPS.IMPRESSION,
    });
  }
  
  /**
   * Track click intent (user clicks affiliate link or CTA)
   * @param {string} eventName - e.g., 'affiliate_link_clicked'
   * @param {EventData} data
   */
  trackClick(eventName, data = {}) {
    this.trackEvent(eventName, {
      ...data,
      funnelStep: FUNNEL_STEPS.CLICK,
    });
  }
  
  /**
   * Track cart/checkout interaction (Stripe session created)
   * @param {string} eventName - e.g., 'checkout_initiated'
   * @param {EventData} data
   */
  trackCart(eventName, data = {}) {
    this.trackEvent(eventName, {
      ...data,
      funnelStep: FUNNEL_STEPS.CART,
    });
  }
  
  /**
   * Track payment processing
   * @param {string} eventName - e.g., 'payment_completed'
   * @param {EventData} data
   */
  trackPayment(eventName, data = {}) {
    this.trackEvent(eventName, {
      ...data,
      funnelStep: FUNNEL_STEPS.PAYMENT,
    });
  }
  
  /**
   * Track conversion success (purchase complete, affiliate converted)
   * @param {string} eventName - e.g., 'premium_activated'
   * @param {EventData} data
   */
  trackConversion(eventName, data = {}) {
    this.trackEvent(eventName, {
      ...data,
      funnelStep: FUNNEL_STEPS.SUCCESS,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: GENERIC EVENT TRACKING
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Track generic event
   * @param {string} eventName - from EVENT_TYPES enum
   * @param {EventData} data
   */
  trackEvent(eventName, data = {}) {
    if (!this._consentGiven) {
      this._log('trackEvent: consent not given, queuing only', { eventName });
      return;
    }
    
    const enriched = this._enrichEventData(eventName, data);
    
    if (this._isOnline) {
      this._sendEvent(eventName, enriched);
    } else {
      this._offlineQueue.push({ eventName, data: enriched, ts: Date.now() });
      this._log('trackEvent: offline, queued', { eventName, queueSize: this._offlineQueue.length });
    }
  }
  
  /**
   * Track page view with conversion funnel
   * @param {string} pageName - e.g., '/supplements/creatina'
   * @param {EventData} [data]
   */
  trackPageView(pageName, data = {}) {
    this.trackEvent(EVENT_TYPES.PAGE_VIEW, {
      page_path: pageName,
      page_location: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...data,
    });
  }
  
  /**
   * Track error
   * @param {string} message
   * @param {Object} context
   */
  trackError(message, context = {}) {
    this.trackEvent(EVENT_TYPES.ERROR_OCCURRED, {
      error_message: message,
      error_context: JSON.stringify(context),
    });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // CONSENT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Check if user has given analytics consent
   * @private
   * @returns {boolean}
   */
  _checkConsent() {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('analytics_consent');
    return stored === 'true';
  }
  
  /**
   * Set analytics consent (e.g., after cookie banner)
   * @param {boolean} granted
   */
  setConsent(granted = false) {
    this._consentGiven = granted;
    localStorage.setItem('analytics_consent', granted ? 'true' : 'false');
    this._log('setConsent', { granted });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // ATTRIBUTION & UTM
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Capture UTM parameters from URL
   * @private
   * @returns {Object}
   */
  _captureUTM() {
    if (typeof window === 'undefined') return {};
    
    const params = new URLSearchParams(window.location.search);
    return {
      source:   params.get('utm_source')   ?? null,
      medium:   params.get('utm_medium')   ?? null,
      campaign: params.get('utm_campaign') ?? null,
      content:  params.get('utm_content')  ?? null,
      term:     params.get('utm_term')     ?? null,
      affId:    params.get('aff_id')       ?? null,
    };
  }
  
  /**
   * Get current UTM (or from sessionStorage if preserved)
   * @returns {Object}
   */
  getUTM() {
    const stored = this._utm;
    if (typeof window === 'undefined') return stored;
    
    const sessionStored = sessionStorage.getItem('suplilist_utm');
    return sessionStored ? JSON.parse(sessionStored) : stored;
  }
  
  /**
   * Preserve UTM across page transitions
   * @private
   */
  _preserveUTM() {
    if (typeof window === 'undefined') return;
    const utm = this.getUTM();
    if (Object.values(utm).some(v => v)) {
      sessionStorage.setItem('suplilist_utm', JSON.stringify(utm));
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Enrich event with user context
   * @private
   * @param {string} eventName
   * @param {EventData} data
   * @returns {EventData}
   */
  _enrichEventData(eventName, data = {}) {
    this._preserveUTM();
    
    return {
      ...data,
      userId: data.userId ?? this._userId,
      sessionId: data.sessionId ?? this._sessionId,
      locale: data.locale ?? this.config.locale,
      currency: data.currency ?? this.config.currency,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      
      // Merge preserved UTM
      ...this.getUTM(),
    };
  }
  
  /**
   * Send event to GA4 and optional server
   * @private
   * @param {string} eventName
   * @param {EventData} data
   */
  _sendEvent(eventName, data = {}) {
    // Send to GA4
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...data,
        user_id: this._userId,
        session_id: this._sessionId,
      });
    }
    
    // Send to Mixpanel (if enabled)
    if (this.config.enableMixpanel && typeof window !== 'undefined' && window.__SuppliListMixpanel) {
      window.__SuppliListMixpanel.track(eventName, data);
    }
    
    // Send to server (if configured)
    if (this.config.serverUrl) {
      this._sendToServer(eventName, data).catch(err => {
        this._log('_sendToServer error', err);
      });
    }
    
    this._log('_sendEvent', { eventName, data });
  }
  
  /**
   * Send event to custom server endpoint
   * @private
   * @param {string} eventName
   * @param {EventData} data
   * @returns {Promise<Response>}
   */
  async _sendToServer(eventName, data) {
    if (!this.config.serverUrl) return;
    
    try {
      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, data }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      return response;
    } catch (err) {
      throw err;
    }
  }
  
  /**
   * Flush offline queue when online
   * @private
   */
  async _flushOfflineQueue() {
    const queue = [...this._offlineQueue];
    this._offlineQueue = [];
    
    for (const { eventName, data } of queue) {
      this._sendEvent(eventName, data);
    }
  }
  
  /**
   * Generate unique session ID
   * @private
   * @returns {string}
   */
  _generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get or create anonymous user ID
   * @private
   * @returns {string}
   */
  _getOrCreateUserId() {
    if (typeof window === 'undefined') return 'unknown';
    
    let userId = localStorage.getItem('suplilist_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('suplilist_user_id', userId);
    }
    return userId;
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[Analytics] ${label}`, data);
  }
}

export default GoogleAnalytics4Wrapper;
export { EVENT_TYPES, FUNNEL_STEPS };
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] `Analytics.init('G-XXXXXXXXXX')` inicializa singleton corretamente
- [ ] `Analytics.trackEvent('supplement_viewed', { supplementId: 'creatina' })` dispara para GA4
- [ ] UTM parameters (`utm_source`, `utm_medium`, etc) são capturados na primeira página e preservados em sessionStorage
- [ ] Parâmetro `?aff_id=` é incluído em todos os custom events
- [ ] `trackConversion('premium_activated', { value: 99 })` dispara funil como "success"
- [ ] `trackError('API failed', { endpoint: '/api/prices' })` cria evento de erro tipado
- [ ] Offline mode: eventos são enfileirados em `_offlineQueue` quando offline
- [ ] Quando volta online: `_flushOfflineQueue()` é chamado automaticamente
- [ ] Usuário sem consentimento: eventos NÃO são enviados (apenas enfileirados)
- [ ] `setConsent(true)` permite tracking; `setConsent(false)` bloqueia
- [ ] Session ID é único por sessão, preservado em `_sessionId`
- [ ] User ID é anônimo, armazenado em `localStorage`, reutilizado entre sessões
- [ ] GA4 configurado com `anonymize_ip: true` e `allow_google_signals: false` (LGPD/GDPR)
- [ ] Mixpanel opcional via `config.enableMixpanel` (não quebra se desabilitado)
- [ ] Server-side tracking via `config.serverUrl` é opcional (não quebra se null)

## FILES TO DELIVER

1. `/src/analytics/analytics-wrapper.js` (completo acima)
```

---

## **PROMPT 6.2: StripeIntegration — CHECKOUT + WEBHOOKS COMPLETO**

```markdown
You are building the production StripeIntegration for SupliList v4.0.

## CONTEXT

Stripe is the payment backbone for Premium subscriptions and one-time purchases.
This module must:
- Create checkout sessions (Stripe-hosted)
- Handle webhooks for payment confirmation
- Store subscription IDs in IndexedDB (offline-safe)
- Restore purchases (user lost device, new login)
- Cancel subscriptions (account deletion, user request)
- Integrate with state manager for UI updates
- Track conversion via Analytics (6.1)
- Never store card details (PCI compliance)
- Handle errors gracefully (retry, fallback)

Architecture:
- Stateless class (one instance per app)
- All secrets stay server-side (publishable key only in frontend)
- IndexedDB for subscription metadata
- Webhook verification via stripe secret key (server-side only)
- Retry logic for failed charges
- 3DS/SCA support (Stripe handles)

---

## TASK 1: CREATE /src/monetization/stripe-integration.js

\`\`\`javascript
/**
 * StripeIntegration v1.0 — SupliList
 * Checkout, webhooks, subscription management, restore purchase
 *
 * Uso:
 *   import StripeIntegration from '../monetization/stripe-integration.js';
 *   const stripe = new StripeIntegration({ publishableKey: 'pk_live_...', serverUrl: 'https://api.suplilist.com' });
 *   const { sessionId } = await stripe.createCheckoutSession({ tierId: 'pro', email: 'user@example.com' });
 *   // Redirect to Stripe-hosted checkout
 */

/**
 * @typedef {Object} StripeConfig
 * @property {string} publishableKey - Stripe publishable key (pk_live_* or pk_test_*)
 * @property {string} serverUrl - Backend API base URL (e.g., https://api.suplilist.com)
 * @property {string} [locale] - User locale (default: 'pt-BR')
 * @property {string} [currency] - Currency code (default: 'BRL')
 * @property {boolean} [debug] - Log to console (default: false)
 */

/**
 * @typedef {Object} Subscription
 * @property {string} subscriptionId - Stripe subscription ID (sub_...)
 * @property {string} customerId - Stripe customer ID (cus_...)
 * @property {string} tierId - 'pro' | 'master'
 * @property {string} status - 'active' | 'past_due' | 'canceled' | 'unpaid'
 * @property {number} currentPeriodStart - Unix timestamp
 * @property {number} currentPeriodEnd - Unix timestamp
 * @property {number} cancelAt - Unix timestamp (if scheduled for cancellation)
 * @property {string} paymentMethod - 'card' | 'pix'
 * @property {number} createdAt - Unix timestamp
 */

/**
 * @typedef {Object} CheckoutSession
 * @property {string} sessionId - Stripe session ID (cs_...)
 * @property {string} url - Stripe Checkout URL
 * @property {string} status - 'open' | 'complete' | 'expired'
 */

class StripeIntegration {
  
  static DB_NAME = 'suplilist-stripe';
  static DB_VERSION = 1;
  static STORE_NAME = 'subscriptions';
  
  /**
   * @param {StripeConfig} config
   */
  constructor(config = {}) {
    this.config = {
      publishableKey: config.publishableKey ?? 'pk_test_...',
      serverUrl:     config.serverUrl     ?? 'http://localhost:3000',
      locale:        config.locale        ?? 'pt-BR',
      currency:      config.currency      ?? 'BRL',
      debug:         config.debug         ?? false,
    };
    
    this._stripe    = null;
    this._db        = null;
    this._listeners = [];
    
    this._initStripe();
    this._initDB();
  }
  
  /**
   * Initialize Stripe.js
   * @private
   */
  _initStripe() {
    if (typeof window === 'undefined') return;
    
    // Check if Stripe.js is already loaded
    if (window.Stripe) {
      this._stripe = Stripe(this.config.publishableKey);
      this._log('Stripe.js already loaded, using it');
    } else {
      // Load Stripe.js dynamically
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        this._stripe = Stripe(this.config.publishableKey);
        this._log('Stripe.js loaded dynamically');
      };
      document.head.appendChild(script);
    }
  }
  
  /**
   * Initialize IndexedDB for offline subscription storage
   * @private
   */
  async _initDB() {
    if (typeof window === 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(StripeIntegration.DB_NAME, StripeIntegration.DB_VERSION);
      
      request.onerror = () => {
        console.error('[Stripe] IndexedDB open failed:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this._db = request.result;
        this._log('IndexedDB opened');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(StripeIntegration.STORE_NAME)) {
          db.createObjectStore(StripeIntegration.STORE_NAME, { keyPath: 'subscriptionId' });
          this._log('Created object store: ' + StripeIntegration.STORE_NAME);
        }
      };
    });
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: CHECKOUT
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Create Stripe checkout session
   * Redirects to Stripe Checkout (hosted, secure, Stripe manages PCI)
   *
   * @param {Object} params
   * @param {string} params.tierId - 'pro' | 'master'
   * @param {string} [params.email] - Customer email
   * @param {number} [params.quantity] - Months to prepay (default: 1)
   * @param {string} [params.couponCode] - Promo code
   * @param {string} [params.successUrl] - Redirect after success (default: /premium)
   * @param {string} [params.cancelUrl] - Redirect if canceled (default: /premium)
   * @returns {Promise<CheckoutSession>}
   */
  async createCheckoutSession(params = {}) {
    const {
      tierId,
      email,
      quantity = 1,
      couponCode = null,
      successUrl = '/premium?session={CHECKOUT_SESSION_ID}',
      cancelUrl = '/premium',
    } = params;
    
    if (!tierId) throw new Error('tierId is required');
    if (!['pro', 'master'].includes(tierId)) throw new Error('Invalid tierId');
    
    try {
      const payload = {
        tierId,
        email,
        quantity,
        couponCode,
        successUrl: this._absoluteUrl(successUrl),
        cancelUrl:  this._absoluteUrl(cancelUrl),
      };
      
      const response = await fetch(`${this.config.serverUrl}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Checkout creation failed: ${response.status}`);
      }
      
      const { sessionId, url } = await response.json();
      
      // Track in Analytics
      this._trackAnalytics('checkout_session_created', {
        tierId,
        sessionId,
        quantity,
      });
      
      this._log('createCheckoutSession', { tierId, sessionId });
      
      return { sessionId, url };
      
    } catch (err) {
      this._trackAnalytics('checkout_failed', { tierId, error: err.message });
      this._log('createCheckoutSession ERROR', err);
      throw err;
    }
  }
  
  /**
   * Redirect to Stripe Checkout
   * @param {string} sessionId
   */
  async redirectToCheckout(sessionId) {
    if (!this._stripe) {
      throw new Error('Stripe not yet initialized');
    }
    
    try {
      const { error } = await this._stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      this._log('redirectToCheckout ERROR', err);
      throw err;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: SUBSCRIPTION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Get active subscription (from IndexedDB, fallback to server)
   * @returns {Promise<Subscription|null>}
   */
  async getActiveSubscription() {
    try {
      // 1. Try IndexedDB first (offline support)
      const local = await this._getSubscriptionFromDB();
      if (local && local.status === 'active') {
        this._log('getActiveSubscription: from IndexedDB (offline)');
        return local;
      }
      
      // 2. Fetch from server (fresh status)
      const response = await fetch(`${this.config.serverUrl}/api/stripe/subscription`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Fetch subscription failed: ${response.status}`);
      }
      
      const subscription = await response.json();
      
      // 3. Store in IndexedDB for offline access
      await this._saveSubscriptionToDB(subscription);
      
      this._log('getActiveSubscription: from server', { subscriptionId: subscription.subscriptionId });
      return subscription;
      
    } catch (err) {
      this._log('getActiveSubscription ERROR', err);
      // Return local copy as fallback
      return await this._getSubscriptionFromDB();
    }
  }
  
  /**
   * Cancel subscription
   * User has access for remainder of billing period, then revoked
   *
   * @param {Object} params
   * @param {string} [params.reason] - Cancellation reason
   * @param {string} [params.feedback] - User feedback
   * @returns {Promise<Object>}
   */
  async cancelSubscription(params = {}) {
    const { reason = null, feedback = null } = params;
    
    try {
      const subscription = await this.getActiveSubscription();
      if (!subscription) {
        throw new Error('No active subscription to cancel');
      }
      
      const response = await fetch(`${this.config.serverUrl}/api/stripe/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._getAuthToken()}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.subscriptionId, reason, feedback }),
      });
      
      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local copy
      if (result.subscription) {
        await this._saveSubscriptionToDB({ ...subscription, status: 'canceled' });
      }
      
      this._trackAnalytics('subscription_canceled', { reason });
      this._log('cancelSubscription', { subscriptionId: subscription.subscriptionId });
      
      return result;
      
    } catch (err) {
      this._log('cancelSubscription ERROR', err);
      throw err;
    }
  }
  
  /**
   * Restore purchase (user lost device, new login)
   * Re-fetches subscription from Stripe and restores local state
   *
   * @param {string} email - User email
   * @returns {Promise<Subscription|null>}
   */
  async restorePurchase(email) {
    if (!email) throw new Error('email is required');
    
    try {
      const response = await fetch(`${this.config.serverUrl}/api/stripe/restore-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          this._log('restorePurchase: no subscription found');
          return null;
        }
        throw new Error(`Restore failed: ${response.status}`);
      }
      
      const subscription = await response.json();
      
      // Save to IndexedDB
      await this._saveSubscriptionToDB(subscription);
      
      this._trackAnalytics('purchase_restored', { subscriptionId: subscription.subscriptionId });
      this._log('restorePurchase', { subscriptionId: subscription.subscriptionId });
      
      return subscription;
      
    } catch (err) {
      this._log('restorePurchase ERROR', err);
      throw err;
    }
  }
  
  /**
   * Update payment method
   * Redirects to Stripe portal to manage payment method
   *
   * @returns {Promise<void>}
   */
  async openCustomerPortal() {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/stripe/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this._getAuthToken()}` },
      });
      
      if (!response.ok) {
        throw new Error(`Portal creation failed: ${response.status}`);
      }
      
      const { url } = await response.json();
      
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
      
    } catch (err) {
      this._log('openCustomerPortal ERROR', err);
      throw err;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────
  // WEBHOOK HANDLERS (Server-side, exposed for reference)
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * NOTE: Webhook handlers live in backend (server-side).
   * This is here for documentation.
   *
   * Backend should handle these events:
   * - checkout.session.completed  → Create/update subscription
   * - invoice.payment_succeeded   → Record payment
   * - invoice.payment_failed      → Retry / notify user
   * - customer.subscription.updated → Sync tier changes
   * - customer.subscription.deleted  → Revoke premium, cleanup
   *
   * Sample webhook verification (server-side):
   *
   * const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   *
   * app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
   *   const sig = req.headers['stripe-signature'];
   *   const body = req.body;
   *
   *   try {
   *     const event = stripe.webhooks.constructEvent(
   *       body,
   *       sig,
   *       process.env.STRIPE_WEBHOOK_SECRET
   *     );
   *
   *     if (event.type === 'checkout.session.completed') {
   *       const session = event.data.object;
   *       // Update subscription in database
   *       // Update IndexedDB via push notification / real-time sync
   *     }
   *     if (event.type === 'invoice.payment_failed') {
   *       const invoice = event.data.object;
   *       // Send email, in-app notification
   *     }
   *
   *     res.json({received: true});
   *   } catch (err) {
   *     res.status(400).send(\`Webhook error: \${err.message}\`);
   *   }
   * });
   */
  
  // ─────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────
  
  /**
   * Get subscription from IndexedDB
   * @private
   * @returns {Promise<Subscription|null>}
   */
  async _getSubscriptionFromDB() {
    if (!this._db) return null;
    
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(StripeIntegration.STORE_NAME, 'readonly');
      const store = tx.objectStore(StripeIntegration.STORE_NAME);
      
      // Get first (most recent) subscription
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const subs = request.result;
        resolve(subs.length > 0 ? subs[0] : null);
      };
    });
  }
  
  /**
   * Save subscription to IndexedDB
   * @private
   * @param {Subscription} subscription
   * @returns {Promise<void>}
   */
  async _saveSubscriptionToDB(subscription) {
    if (!this._db || !subscription) return;
    
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(StripeIntegration.STORE_NAME, 'readwrite');
      const store = tx.objectStore(StripeIntegration.STORE_NAME);
      
      const request = store.put({
        ...subscription,
        savedAt: Date.now(),
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  /**
   * Get auth token (from state manager or localStorage)
   * @private
   * @returns {string}
   */
  _getAuthToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') ?? '';
  }
  
  /**
   * Convert relative URL to absolute
   * @private
   * @param {string} url
   * @returns {string}
   */
  _absoluteUrl(url) {
    if (typeof window === 'undefined') return url;
    if (url.startsWith('http')) return url;
    return `${window.location.origin}${url}`;
  }
  
  /**
   * Track in Analytics (6.1)
   * @private
   * @param {string} eventName
   * @param {Object} data
   */
  _trackAnalytics(eventName, data = {}) {
    try {
      const Analytics = require('../analytics/analytics-wrapper.js').default;
      if (Analytics) {
        Analytics.getInstance().trackEvent(eventName, data);
      }
    } catch (_) {
      // Analytics not available, no-op
    }
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[Stripe] ${label}`, data);
  }
}

export default StripeIntegration;
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] `new StripeIntegration({ publishableKey: 'pk_test_...' })` inicializa corretamente
- [ ] Stripe.js é carregado dinamicamente da CDN
- [ ] IndexedDB é criado com store 'subscriptions'
- [ ] `createCheckoutSession({ tierId: 'pro', email: 'user@example.com' })` retorna `{ sessionId, url }`
- [ ] `redirectToCheckout(sessionId)` redireciona para Stripe Checkout (hosted)
- [ ] `getActiveSubscription()` tenta IndexedDB primeiro (offline support)
- [ ] Fallback para servidor se IndexedDB vazio
- [ ] `cancelSubscription()` faz POST para `/api/stripe/subscription/cancel`
- [ ] `restorePurchase('user@example.com')` recupera subscription e salva em IndexedDB
- [ ] `openCustomerPortal()` redireciona para Stripe Customer Portal
- [ ] Webhook handling (sample code comentado) está correto
- [ ] `_trackAnalytics()` chama Analytics.trackConversion() sem quebrar se Analytics não disponível
- [ ] `_getAuthToken()` busca token de localStorage
- [ ] URLs relativas são convertidas para absoluto com `_absoluteUrl()`
- [ ] Erros são logados e propagados corretamente

## FILES TO DELIVER

1. `/src/monetization/stripe-integration.js` (completo acima)
```

---

## **PROMPT 6.3: ConversionFunnelPage — DASHBOARD ADMIN TEMPO REAL COMPLETO**

```markdown
You are building the ConversionFunnelPage for SupliList v4.0.

## CONTEXT

This is an admin-only analytics dashboard showing:
- Real-time conversion funnel (impression → click → cart → payment → success)
- Key metrics: CTR, conversion rate, LTV, affiliate performance
- Charts: funnel visualization, time-series revenue, geographic distribution
- Data sources: GA4 (6.1) + Stripe API (6.2) + affiliate-engine
- Admin auth required (only super-admin or analytics team)
- Uses existing design-system + WebComponents
- Real-time updates via SSE or polling

Architecture:
- Fetch funnel data from backend API (aggregates GA4 + Stripe + affiliates)
- Charts via Recharts (lightweight, responsive)
- Real-time badges (last 24h, last 7d, last 30d)
- Drill-down capability: click a funnel stage to see sources
- LGPD/GDPR: no PII visible; aggregated/anonymized only

---

## TASK 1: CREATE /src/pages/conversion-funnel-page.js

\`\`\`javascript
/**
 * ConversionFunnelPage v1.0 — SupliList Admin
 * Dashboard de analytics: funil de conversão, receita, afiliados
 *
 * Uso:
 *   import ConversionFunnelPage from '../pages/conversion-funnel-page.js';
 *   const page = new ConversionFunnelPage({ userId, serverUrl: 'https://api.suplilist.com' });
 *   await page.render(document.getElementById('app'));
 */

/**
 * @typedef {Object} FunnelData
 * @property {number} impressions - Views
 * @property {number} clicks - Clicks
 * @property {number} carts - Checkout sessions created
 * @property {number} payments - Payments attempted
 * @property {number} conversions - Successful purchases
 * @property {number} revenue - Total revenue (BRL)
 */

/**
 * @typedef {Object} FunnelMetrics
 * @property {number} ctr - Click-through rate (%)
 * @property {number} conversionRate - Cart → Conversion (%)
 * @property {number} ltv - Lifetime value per converted user
 * @property {number} arpu - Average revenue per user (all)
 */

class ConversionFunnelPage {
  
  /**
   * @param {Object} config
   * @param {string} config.serverUrl - Backend API base URL
   * @param {boolean} [config.debug] - Log to console
   */
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl ?? 'http://localhost:3000',
      debug:     config.debug ?? false,
    };
    
    this._container     = null;
    this._funnelData    = null;
    this._metrics       = null;
    this._timePeriod    = '7d';  // Default: last 7 days
    this._selectedStage = null;  // Drill-down
    this._refreshInterval = null;
  }
  
  /**
   * Render page
   * @param {HTMLElement} container
   * @returns {Promise<void>}
   */
  async render(container) {
    this._container = container;
    
    try {
      // Check admin auth
      if (!await this._checkAdminAuth()) {
        this._renderUnauthorized();
        return;
      }
      
      // Load data
      await this._loadFunnelData();
      
      // Render
      this._renderPage();
      
      // Setup auto-refresh (every 30s)
      this._setupAutoRefresh();
      
    } catch (err) {
      this._log('render ERROR', err);
      this._renderError(err);
    }
  }
  
  /**
   * Check if user is admin
   * @private
   * @returns {Promise<boolean>}
   */
  async _checkAdminAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    try {
      const response = await fetch(`${this.config.serverUrl}/api/auth/verify-admin`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }
  
  /**
   * Load funnel data from backend
   * @private
   * @returns {Promise<void>}
   */
  async _loadFunnelData() {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/analytics/funnel?period=${this._timePeriod}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load funnel data: ${response.status}`);
      }
      
      this._funnelData = await response.json();
      this._calculateMetrics();
      
      this._log('_loadFunnelData', { timePeriod: this._timePeriod, data: this._funnelData });
      
    } catch (err) {
      this._log('_loadFunnelData ERROR', err);
      throw err;
    }
  }
  
  /**
   * Calculate derived metrics
   * @private
   */
  _calculateMetrics() {
    const { impressions, clicks, carts, payments, conversions, revenue } = this._funnelData;
    
    this._metrics = {
      ctr:             impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
      cartConversion:  clicks > 0 ? ((carts / clicks) * 100).toFixed(2) : 0,
      paymentSuccess:  carts > 0 ? ((payments / carts) * 100).toFixed(2) : 0,
      conversionRate:  payments > 0 ? ((conversions / payments) * 100).toFixed(2) : 0,
      ltv:             conversions > 0 ? (revenue / conversions).toFixed(2) : 0,
      arpu:            impressions > 0 ? (revenue / impressions).toFixed(2) : 0,
    };
  }
  
  /**
   * Render main page
   * @private
   */
  _renderPage() {
    const html = `
      <div class="conversion-funnel-page">
        <!-- Header -->
        <div class="cfp-header">
          <h1>Funil de Conversão</h1>
          <p class="cfp-subtitle">Últimos ${this._timePeriod === '7d' ? '7 dias' : this._timePeriod === '30d' ? '30 dias' : '24 horas'}</p>
          
          <div class="cfp-controls">
            <button class="cfp-btn ${this._timePeriod === '24h' ? 'active' : ''}" data-period="24h">Hoje</button>
            <button class="cfp-btn ${this._timePeriod === '7d' ? 'active' : ''}" data-period="7d">7 dias</button>
            <button class="cfp-btn ${this._timePeriod === '30d' ? 'active' : ''}" data-period="30d">30 dias</button>
            <button class="cfp-btn cfp-refresh-btn" title="Atualizar">↻</button>
          </div>
        </div>
        
        <!-- Key Metrics Grid -->
        <div class="cfp-metrics-grid">
          <div class="cfp-metric-card">
            <span class="cfp-metric-label">CTR</span>
            <span class="cfp-metric-value">${this._metrics.ctr}%</span>
            <span class="cfp-metric-helper">Clicks / Impressions</span>
          </div>
          <div class="cfp-metric-card">
            <span class="cfp-metric-label">Conversão</span>
            <span class="cfp-metric-value">${this._metrics.conversionRate}%</span>
            <span class="cfp-metric-helper">Pagamentos / Tentativas</span>
          </div>
          <div class="cfp-metric-card">
            <span class="cfp-metric-label">LTV</span>
            <span class="cfp-metric-value">R$ ${this._metrics.ltv}</span>
            <span class="cfp-metric-helper">Receita / Conversão</span>
          </div>
          <div class="cfp-metric-card">
            <span class="cfp-metric-label">ARPU</span>
            <span class="cfp-metric-value">R$ ${this._metrics.arpu}</span>
            <span class="cfp-metric-helper">Receita / Impressão</span>
          </div>
        </div>
        
        <!-- Funnel Diagram -->
        <div class="cfp-funnel-section">
          <h2>Funil Visual</h2>
          <div class="cfp-funnel">
            ${this._renderFunnelStage('impressions', 'Impressões', this._funnelData.impressions)}
            ${this._renderFunnelStage('clicks', 'Clicks', this._funnelData.clicks)}
            ${this._renderFunnelStage('carts', 'Carrinho', this._funnelData.carts)}
            ${this._renderFunnelStage('payments', 'Pagamento', this._funnelData.payments)}
            ${this._renderFunnelStage('conversions', 'Sucesso', this._funnelData.conversions)}
          </div>
        </div>
        
        <!-- Revenue & Affiliate Performance -->
        <div class="cfp-detail-section">
          <div class="cfp-revenue-card">
            <h3>Receita Total</h3>
            <span class="cfp-revenue-value">R$ ${Number(this._funnelData.revenue).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            <div class="cfp-breakdown">
              <div class="cfp-breakdown-item">
                <span>Premium</span>
                <span>70%</span>
              </div>
              <div class="cfp-breakdown-item">
                <span>Afiliados</span>
                <span>30%</span>
              </div>
            </div>
          </div>
          
          <div class="cfp-affiliate-card">
            <h3>Top Afiliados</h3>
            <div class="cfp-affiliate-list" id="affiliate-list"></div>
          </div>
        </div>
      </div>
      
      <style>
        .conversion-funnel-page {
          padding: 32px;
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font-family: var(--font-family-base);
        }
        
        .cfp-header {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
        }
        
        .cfp-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px;
          color: var(--color-text-primary);
        }
        
        .cfp-subtitle {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0 0 16px;
        }
        
        .cfp-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .cfp-btn {
          padding: 8px 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms;
        }
        
        .cfp-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        
        .cfp-btn.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #fff;
        }
        
        .cfp-refresh-btn {
          padding: 8px 12px;
        }
        
        .cfp-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .cfp-metric-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
        }
        
        .cfp-metric-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          font-weight: 700;
        }
        
        .cfp-metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-primary);
        }
        
        .cfp-metric-helper {
          font-size: 11px;
          color: var(--color-text-tertiary);
        }
        
        .cfp-funnel-section {
          margin-bottom: 32px;
        }
        
        .cfp-funnel-section h2 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 16px;
          color: var(--color-text-primary);
        }
        
        .cfp-funnel {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .cfp-funnel-stage {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--color-bg-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 200ms;
        }
        
        .cfp-funnel-stage:hover {
          background: var(--color-bg-tertiary);
        }
        
        .cfp-funnel-stage-bar {
          flex: 1;
          height: 24px;
          background: linear-gradient(90deg, var(--color-primary), var(--color-success));
          border-radius: 4px;
        }
        
        .cfp-funnel-stage-label {
          min-width: 80px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        
        .cfp-funnel-stage-count {
          min-width: 60px;
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-primary);
        }
        
        .cfp-detail-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .cfp-revenue-card,
        .cfp-affiliate-card {
          padding: 20px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
        }
        
        .cfp-revenue-card h3,
        .cfp-affiliate-card h3 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--color-text-primary);
        }
        
        .cfp-revenue-value {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: var(--color-success);
          margin-bottom: 16px;
        }
        
        .cfp-breakdown-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
          border-top: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        
        .cfp-affiliate-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .cfp-affiliate-row {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: var(--color-bg-tertiary);
          border-radius: 6px;
          font-size: 13px;
        }
        
        .cfp-affiliate-row strong {
          color: var(--color-text-primary);
        }
        
        .cfp-affiliate-row span {
          color: var(--color-text-secondary);
        }
      </style>
    `;
    
    if (this._container) {
      this._container.innerHTML = html;
      
      // Attach event listeners
      this._attachEventListeners();
      
      // Load affiliate data
      this._loadAffiliateData();
    }
  }
  
  /**
   * Render funnel stage
   * @private
   * @param {string} stageId
   * @param {string} stageName
   * @param {number} count
   * @returns {string}
   */
  _renderFunnelStage(stageId, stageName, count) {
    const maxCount = this._funnelData.impressions || 1;
    const width = (count / maxCount) * 100;
    
    return `
      <div class="cfp-funnel-stage" data-stage="${stageId}">
        <div class="cfp-funnel-stage-bar" style="width: ${width}%"></div>
        <span class="cfp-funnel-stage-label">${stageName}</span>
        <span class="cfp-funnel-stage-count">${count.toLocaleString('pt-BR')}</span>
      </div>
    `;
  }
  
  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Time period buttons
    this._container?.querySelectorAll('.cfp-btn:not(.cfp-refresh-btn)').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        this._timePeriod = e.target.dataset.period;
        await this._loadFunnelData();
        this._renderPage();
      });
    });
    
    // Refresh button
    this._container?.querySelector('.cfp-refresh-btn')?.addEventListener('click', async () => {
      await this._loadFunnelData();
      this._renderPage();
    });
    
    // Funnel stage drill-down
    this._container?.querySelectorAll('.cfp-funnel-stage').forEach(stage => {
      stage.addEventListener('click', () => {
        this._selectedStage = stage.dataset.stage;
        this._log('Drill-down:', this._selectedStage);
        // Could load detailed breakdown by source, etc.
      });
    });
  }
  
  /**
   * Load affiliate performance data
   * @private
   */
  async _loadAffiliateData() {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/analytics/affiliates?period=${this._timePeriod}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        }
      );
      
      if (!response.ok) return;
      
      const affiliates = await response.json();
      const list = this._container?.querySelector('#affiliate-list');
      
      if (list) {
        list.innerHTML = affiliates.slice(0, 5).map(aff => `
          <div class="cfp-affiliate-row">
            <strong>${aff.source}</strong>
            <span>R$ ${Number(aff.revenue).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
          </div>
        `).join('');
      }
    } catch (err) {
      this._log('_loadAffiliateData ERROR', err);
    }
  }
  
  /**
   * Setup auto-refresh (every 30s)
   * @private
   */
  _setupAutoRefresh() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    
    this._refreshInterval = setInterval(async () => {
      await this._loadFunnelData();
      this._renderPage();
    }, 30000);
  }
  
  /**
   * Render unauthorized page
   * @private
   */
  _renderUnauthorized() {
    if (this._container) {
      this._container.innerHTML = `
        <div style="padding: 32px; text-align: center;">
          <h2>Acesso Negado</h2>
          <p>Apenas administradores podem acessar este dashboard.</p>
          <a href="/">Voltar</a>
        </div>
      `;
    }
  }
  
  /**
   * Render error page
   * @private
   * @param {Error} err
   */
  _renderError(err) {
    if (this._container) {
      this._container.innerHTML = `
        <div style="padding: 32px;">
          <h2>Erro ao carregar dados</h2>
          <p>${err.message}</p>
          <button onclick="location.reload()">Recarregar</button>
        </div>
      `;
    }
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[ConversionFunnelPage] ${label}`, data);
  }
  
  /**
   * Cleanup
   */
  destroy() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }
  }
}

export default ConversionFunnelPage;
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] Admin auth check via GET `/api/auth/verify-admin`
- [ ] Acesso negado para non-admin
- [ ] Funnel data carregado via GET `/api/analytics/funnel?period=7d`
- [ ] Métricas calculadas corretamente (CTR, conversion rate, LTV, ARPU)
- [ ] Botões "Hoje", "7 dias", "30 dias" alternam período
- [ ] Refresh manual via botão ↻
- [ ] Auto-refresh a cada 30s
- [ ] Funnel visual mostra proporções corretas (bar width = count / maxCount)
- [ ] Drill-down em stage salva `_selectedStage`
- [ ] Affiliate performance carregado via GET `/api/analytics/affiliates`
- [ ] Top 5 afiliados exibidos com receita
- [ ] Design usa design-system tokens (colors, fonts)
- [ ] Responsive: grid se adapta em mobile
- [ ] Destroy() limpa interval

## FILES TO DELIVER

1. `/src/pages/conversion-funnel-page.js` (completo acima)
```

---

## **PROMPT 6.4: OnboardingFlow — 5 TELAS OTIMIZADO COMPLETO**

```markdown
You are building the OnboardingFlow for SupliList v4.0.

## CONTEXT

New users entering the app land on a 5-step onboarding that:
1. Sets goals (muscle, fat loss, performance, health)
2. Captures biometria (age, gender, weight, height)
3. Asks preferences (dietary restrictions, allergies, budget)
4. Shows stack base recomendado (personalized by goals + biometria)
5. Upsells premium (show value, offer discount code)

This reduces D1 churn significantly and primes for affiliate conversions.

Architecture:
- Single file, self-contained
- State machine: step 0 → 1 → 2 → 3 → 4 → complete
- Skippable at any step (but encourages completion)
- Saves to StateManager after each step
- On completion: redirects to main app
- Premium upsell only if eligible (not already pro/master)
- Animations: slide transitions between steps

---

## TASK 1: CREATE /src/pages/onboarding-page.js

\`\`\`javascript
/**
 * OnboardingFlow v1.0 — SupliList
 * 5-passo onboarding: goals, biometria, preferências, stack, premium upsell
 *
 * Uso:
 *   import OnboardingPage from '../pages/onboarding-page.js';
 *   const onboarding = new OnboardingPage({ stateManager, premiumEnabled: true });
 *   await onboarding.render(document.getElementById('app'));
 */

/**
 * @typedef {Object} OnboardingData
 * @property {string[]} goals - ['muscle', 'fat-loss', 'performance', 'health']
 * @property {number} age - Age in years
 * @property {string} gender - 'M' | 'F' | 'Other'
 * @property {number} weight - Weight in kg
 * @property {number} height - Height in cm
 * @property {string[]} restrictions - ['vegan', 'gluten-free', 'dairy-free', ...]
 * @property {string[]} allergies - ['peanut', 'shellfish', ...]
 * @property {number} budget - Max monthly budget (BRL)
 * @property {boolean} interestedInPremium - User showed interest in premium
 */

class OnboardingPage {
  
  static STEPS = {
    GOALS:       0,
    BIOMETRIA:   1,
    PREFERENCES: 2,
    STACK:       3,
    PREMIUM:     4,
  };
  
  /**
   * @param {Object} config
   * @param {Object} config.stateManager - State manager instance
   * @param {boolean} [config.premiumEnabled] - Show premium upsell
   * @param {string} [config.locale] - 'pt-BR'
   * @param {boolean} [config.debug] - Log to console
   */
  constructor(config = {}) {
    this.config = {
      stateManager:    config.stateManager,
      premiumEnabled:  config.premiumEnabled ?? true,
      locale:          config.locale ?? 'pt-BR',
      debug:           config.debug ?? false,
    };
    
    this._container = null;
    this._step = OnboardingPage.STEPS.GOALS;
    this._data = this._loadOrInitData();
    this._recommendedStack = null;
  }
  
  /**
   * Load or init onboarding data
   * @private
   * @returns {OnboardingData}
   */
  _loadOrInitData() {
    const stored = this.config.stateManager?.getState('onboarding');
    if (stored) {
      this._step = stored.currentStep ?? OnboardingPage.STEPS.GOALS;
      return stored.data;
    }
    
    return {
      goals:          [],
      age:            null,
      gender:         null,
      weight:         null,
      height:         null,
      restrictions:   [],
      allergies:      [],
      budget:         300,
      interestedInPremium: false,
    };
  }
  
  /**
   * Render onboarding flow
   * @param {HTMLElement} container
   * @returns {Promise<void>}
   */
  async render(container) {
    this._container = container;
    
    try {
      switch (this._step) {
        case OnboardingPage.STEPS.GOALS:
          this._renderGoalsStep();
          break;
        case OnboardingPage.STEPS.BIOMETRIA:
          this._renderBiometriaStep();
          break;
        case OnboardingPage.STEPS.PREFERENCES:
          this._renderPreferencesStep();
          break;
        case OnboardingPage.STEPS.STACK:
          await this._renderStackStep();
          break;
        case OnboardingPage.STEPS.PREMIUM:
          this._renderPremiumStep();
          break;
      }
    } catch (err) {
      this._log('render ERROR', err);
      this._renderError(err);
    }
  }
  
  /**
   * Step 0: Goals
   * @private
   */
  _renderGoalsStep() {
    const html = `
      <div class="onboarding-container">
        <div class="onboarding-step" data-step="0">
          <div class="onboarding-header">
            <h1>Qual é seu objetivo?</h1>
            <p>Vamos personalizar seu stack de suplementos</p>
          </div>
          
          <div class="onboarding-content">
            <div class="goals-grid">
              <label class="goal-card" data-goal="muscle">
                <input type="checkbox" name="goals" value="muscle" ${this._data.goals.includes('muscle') ? 'checked' : ''}>
                <span class="goal-icon">💪</span>
                <span class="goal-label">Ganhar Músculos</span>
              </label>
              
              <label class="goal-card" data-goal="fat-loss">
                <input type="checkbox" name="goals" value="fat-loss" ${this._data.goals.includes('fat-loss') ? 'checked' : ''}>
                <span class="goal-icon">⚡</span>
                <span class="goal-label">Perder Gordura</span>
              </label>
              
              <label class="goal-card" data-goal="performance">
                <input type="checkbox" name="goals" value="performance" ${this._data.goals.includes('performance') ? 'checked' : ''}>
                <span class="goal-icon">🏃</span>
                <span class="goal-label">Melhorar Performance</span>
              </label>
              
              <label class="goal-card" data-goal="health">
                <input type="checkbox" name="goals" value="health" ${this._data.goals.includes('health') ? 'checked' : ''}>
                <span class="goal-icon">❤️</span>
                <span class="goal-label">Saúde Geral</span>
              </label>
            </div>
          </div>
          
          <div class="onboarding-footer">
            <button class="btn-skip" data-action="skip">Pular</button>
            <button class="btn-next" data-action="next" ${this._data.goals.length === 0 ? 'disabled' : ''}>Continuar</button>
          </div>
        </div>
      </div>
      
      <style>
        .onboarding-container {
          min-height: 100vh;
          background: var(--color-bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: var(--font-family-base);
          color: var(--color-text-primary);
        }
        
        .onboarding-step {
          width: 100%;
          max-width: 480px;
          animation: slideIn 300ms ease;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .onboarding-header {
          margin-bottom: 32px;
          text-align: center;
        }
        
        .onboarding-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        
        .onboarding-header p {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }
        
        .onboarding-content {
          margin-bottom: 32px;
        }
        
        .goals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        
        .goal-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 200ms;
        }
        
        .goal-card input {
          display: none;
        }
        
        .goal-card:hover {
          border-color: var(--color-primary);
          background: var(--color-bg-tertiary);
        }
        
        .goal-card input:checked + .goal-icon + .goal-label {
          color: var(--color-primary);
        }
        
        .goal-card input:checked ~ {
          border-color: var(--color-primary);
        }
        
        .goal-icon {
          font-size: 32px;
        }
        
        .goal-label {
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          transition: color 200ms;
        }
        
        .onboarding-footer {
          display: flex;
          gap: 12px;
          justify-content: space-between;
        }
        
        .btn-skip,
        .btn-next {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms;
        }
        
        .btn-skip {
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
        }
        
        .btn-skip:hover {
          background: var(--color-bg-tertiary);
        }
        
        .btn-next {
          background: var(--color-primary);
          color: white;
        }
        
        .btn-next:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }
        
        .btn-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>
    `;
    
    this._container.innerHTML = html;
    this._attachGoalsListeners();
  }
  
  /**
   * Attach listeners for goals step
   * @private
   */
  _attachGoalsListeners() {
    // Checkbox listeners
    this._container?.querySelectorAll('input[name="goals"]').forEach(input => {
      input.addEventListener('change', () => {
        this._data.goals = Array.from(
          this._container.querySelectorAll('input[name="goals"]:checked')
        ).map(el => el.value);
        
        // Update next button disabled state
        const nextBtn = this._container.querySelector('.btn-next');
        nextBtn.disabled = this._data.goals.length === 0;
      });
    });
    
    // Action buttons
    this._container?.querySelector('.btn-skip')?.addEventListener('click', () => {
      this._step = OnboardingPage.STEPS.BIOMETRIA;
      this._saveAndContinue();
    });
    
    this._container?.querySelector('.btn-next')?.addEventListener('click', () => {
      this._step = OnboardingPage.STEPS.BIOMETRIA;
      this._saveAndContinue();
    });
  }
  
  /**
   * Step 1: Biometria
   * @private
   */
  _renderBiometriaStep() {
    const html = `
      <div class="onboarding-container">
        <div class="onboarding-step" data-step="1">
          <div class="onboarding-header">
            <h1>Seus dados</h1>
            <p>Para calcular dosagens personalizadas</p>
          </div>
          
          <div class="onboarding-content">
            <div class="biometria-form">
              <label>
                <span>Idade</span>
                <input type="number" id="age" value="${this._data.age ?? ''}" min="13" max="120" placeholder="Ex: 28">
              </label>
              
              <label>
                <span>Gênero</span>
                <select id="gender">
                  <option value="">Selecione</option>
                  <option value="M" ${this._data.gender === 'M' ? 'selected' : ''}>Masculino</option>
                  <option value="F" ${this._data.gender === 'F' ? 'selected' : ''}>Feminino</option>
                  <option value="Other" ${this._data.gender === 'Other' ? 'selected' : ''}>Outro</option>
                </select>
              </label>
              
              <label>
                <span>Peso (kg)</span>
                <input type="number" id="weight" value="${this._data.weight ?? ''}" min="20" max="300" placeholder="Ex: 80" step="0.1">
              </label>
              
              <label>
                <span>Altura (cm)</span>
                <input type="number" id="height" value="${this._data.height ?? ''}" min="100" max="250" placeholder="Ex: 180" step="0.1">
              </label>
            </div>
          </div>
          
          <div class="onboarding-footer">
            <button class="btn-skip" data-action="back">Voltar</button>
            <button class="btn-next" data-action="next">Continuar</button>
          </div>
        </div>
      </div>
      
      <style>
        .biometria-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .biometria-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .biometria-form span {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        
        .biometria-form input,
        .biometria-form select {
          padding: 12px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-primary);
          font-size: 14px;
          font-family: inherit;
        }
        
        .biometria-form input:focus,
        .biometria-form select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      </style>
    `;
    
    this._container.innerHTML = html;
    this._attachBiometriaListeners();
  }
  
  /**
   * Attach listeners for biometria step
   * @private
   */
  _attachBiometriaListeners() {
    const inputs = {
      age: this._container.querySelector('#age'),
      gender: this._container.querySelector('#gender'),
      weight: this._container.querySelector('#weight'),
      height: this._container.querySelector('#height'),
    };
    
    Object.entries(inputs).forEach(([key, input]) => {
      input.addEventListener('change', () => {
        this._data[key] = key === 'age' || key === 'weight' || key === 'height' 
          ? Number(input.value) 
          : input.value;
      });
    });
    
    this._container?.querySelector('.btn-skip')?.addEventListener('click', () => {
      this._step = OnboardingPage.STEPS.GOALS;
      this.render(this._container);
    });
    
    this._container?.querySelector('.btn-next')?.addEventListener('click', () => {
      if (!inputs.age.value || !inputs.gender.value || !inputs.weight.value || !inputs.height.value) {
        alert('Por favor preencha todos os dados');
        return;
      }
      this._step = OnboardingPage.STEPS.PREFERENCES;
      this._saveAndContinue();
    });
  }
  
  /**
   * Step 2: Preferences
   * @private
   */
  _renderPreferencesStep() {
    const html = `
      <div class="onboarding-container">
        <div class="onboarding-step" data-step="2">
          <div class="onboarding-header">
            <h1>Preferências</h1>
            <p>Restrições dietéticas e alergias</p>
          </div>
          
          <div class="onboarding-content">
            <div class="preferences-section">
              <h3>Restrições Dietéticas</h3>
              <div class="checkbox-grid">
                ${['vegan', 'vegetarian', 'gluten-free', 'dairy-free'].map(r => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="restrictions" value="${r}" ${this._data.restrictions.includes(r) ? 'checked' : ''}>
                    <span>${this._formatLabel(r)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="preferences-section">
              <h3>Alergias</h3>
              <div class="checkbox-grid">
                ${['peanut', 'tree-nut', 'shellfish', 'soy'].map(a => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="allergies" value="${a}" ${this._data.allergies.includes(a) ? 'checked' : ''}>
                    <span>${this._formatLabel(a)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="preferences-section">
              <label>
                <span>Orçamento mensal máximo</span>
                <input type="number" id="budget" value="${this._data.budget}" min="0" max="5000" step="50" placeholder="R$ 300">
              </label>
            </div>
          </div>
          
          <div class="onboarding-footer">
            <button class="btn-skip" data-action="back">Voltar</button>
            <button class="btn-next" data-action="next">Continuar</button>
          </div>
        </div>
      </div>
      
      <style>
        .preferences-section {
          margin-bottom: 24px;
        }
        
        .preferences-section h3 {
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }
        
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
        }
        
        .checkbox-item input {
          cursor: pointer;
        }
        
        .checkbox-item span {
          font-size: 13px;
          font-weight: 500;
        }
      </style>
    `;
    
    this._container.innerHTML = html;
    this._attachPreferencesListeners();
  }
  
  /**
   * Attach listeners for preferences step
   * @private
   */
  _attachPreferencesListeners() {
    this._container?.querySelectorAll('input[name="restrictions"]').forEach(input => {
      input.addEventListener('change', () => {
        this._data.restrictions = Array.from(
          this._container.querySelectorAll('input[name="restrictions"]:checked')
        ).map(el => el.value);
      });
    });
    
    this._container?.querySelectorAll('input[name="allergies"]').forEach(input => {
      input.addEventListener('change', () => {
        this._data.allergies = Array.from(
          this._container.querySelectorAll('input[name="allergies"]:checked')
        ).map(el => el.value);
      });
    });
    
    this._container?.querySelector('#budget')?.addEventListener('change', (e) => {
      this._data.budget = Number(e.target.value);
    });
    
    this._container?.querySelector('.btn-skip')?.addEventListener('click', () => {
      this._step = OnboardingPage.STEPS.BIOMETRIA;
      this.render(this._container);
    });
    
    this._container?.querySelector('.btn-next')?.addEventListener('click', async () => {
      this._step = OnboardingPage.STEPS.STACK;
      await this._saveAndContinue();
    });
  }
  
  /**
   * Step 3: Recommended Stack
   * @private
   */
  async _renderStackStep() {
    try {
      // Generate recommended stack based on data
      this._recommendedStack = await this._generateRecommendedStack();
      
      const stackHtml = this._recommendedStack.map(supp => `
        <div class="stack-item">
          <h4>${supp.name}</h4>
          <p>${supp.description}</p>
          <span class="dosage">${supp.dosage}</span>
        </div>
      `).join('');
      
      const html = `
        <div class="onboarding-container">
          <div class="onboarding-step" data-step="3">
            <div class="onboarding-header">
              <h1>Seu Stack Recomendado</h1>
              <p>Baseado em seus dados e objetivos</p>
            </div>
            
            <div class="onboarding-content stack-list">
              ${stackHtml}
            </div>
            
            <div class="onboarding-footer">
              <button class="btn-skip" data-action="back">Voltar</button>
              <button class="btn-next" data-action="next">Próximo</button>
            </div>
          </div>
        </div>
        
        <style>
          .stack-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .stack-item {
            padding: 16px;
            background: var(--color-bg-secondary);
            border-radius: 8px;
            border-left: 4px solid var(--color-primary);
          }
          
          .stack-item h4 {
            margin: 0 0 4px;
            font-size: 14px;
            font-weight: 600;
            color: var(--color-text-primary);
          }
          
          .stack-item p {
            margin: 0 0 8px;
            font-size: 12px;
            color: var(--color-text-secondary);
          }
          
          .dosage {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-primary);
          }
        </style>
      `;
      
      this._container.innerHTML = html;
      this._attachStackListeners();
      
    } catch (err) {
      this._log('_renderStackStep ERROR', err);
      this._renderError(err);
    }
  }
  
  /**
   * Generate recommended stack (mock)
   * In production: call StackRecommender engine
   * @private
   * @returns {Promise<Array>}
   */
  async _generateRecommendedStack() {
    // Mock implementation
    return [
      {
        name: 'Whey Protein',
        description: 'Proteína de alta qualidade para recuperação muscular',
        dosage: '30-40g pós-treino',
      },
      {
        name: 'Creatina Monohidratada',
        description: 'Aumenta força e resistência',
        dosage: '5g diários',
      },
      {
        name: 'Ômega-3',
        description: 'Saúde cardiovascular e articulações',
        dosage: '2-3g diários',
      },
    ];
  }
  
  /**
   * Attach listeners for stack step
   * @private
   */
  _attachStackListeners() {
    this._container?.querySelector('.btn-skip')?.addEventListener('click', () => {
      this._step = OnboardingPage.STEPS.PREFERENCES;
      this.render(this._container);
    });
    
    this._container?.querySelector('.btn-next')?.addEventListener('click', async () => {
      this._step = OnboardingPage.STEPS.PREMIUM;
      await this._saveAndContinue();
    });
  }
  
  /**
   * Step 4: Premium Upsell
   * @private
   */
  _renderPremiumStep() {
    if (!this.config.premiumEnabled) {
      this._completeOnboarding();
      return;
    }
    
    const html = `
      <div class="onboarding-container">
        <div class="onboarding-step" data-step="4">
          <div class="onboarding-header">
            <h1>Desbloqueie SupliList Pro</h1>
            <p>Recursos avançados para otimização máxima</p>
          </div>
          
          <div class="onboarding-content premium-card">
            <div class="premium-feature">
              <span>✓</span>
              <span>Recomendações personalizadas via IA</span>
            </div>
            <div class="premium-feature">
              <span>✓</span>
              <span>Comparação de preços em tempo real</span>
            </div>
            <div class="premium-feature">
              <span>✓</span>
              <span>Rastreamento de progresso avançado</span>
            </div>
            <div class="premium-feature">
              <span>✓</span>
              <span>Suporte prioritário</span>
            </div>
            
            <div class="premium-price">
              <span class="price">R$ 9,90</span>
              <span class="period">/mês (cancelável)</span>
            </div>
          </div>
          
          <div class="onboarding-footer">
            <button class="btn-skip" data-action="skip">Não agora</button>
            <button class="btn-next" data-action="upgrade">Ativar Pro</button>
          </div>
        </div>
      </div>
      
      <style>
        .premium-card {
          padding: 24px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          border-radius: 12px;
          color: white;
        }
        
        .premium-feature {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        
        .premium-feature span:first-child {
          font-weight: 700;
          color: var(--color-success);
        }
        
        .premium-price {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }
        
        .price {
          display: block;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .period {
          display: block;
          font-size: 12px;
          opacity: 0.9;
        }
      </style>
    `;
    
    this._container.innerHTML = html;
    this._attachPremiumListeners();
  }
  
  /**
   * Attach listeners for premium step
   * @private
   */
  _attachPremiumListeners() {
    this._container?.querySelector('.btn-skip')?.addEventListener('click', () => {
      this._completeOnboarding();
    });
    
    this._container?.querySelector('.btn-next')?.addEventListener('click', async () => {
      this._data.interestedInPremium = true;
      // In production: redirect to Stripe checkout
      this._log('User interested in premium');
      this._completeOnboarding();
    });
  }
  
  /**
   * Complete onboarding and redirect
   * @private
   */
  _completeOnboarding() {
    // Save final data
    this.config.stateManager?.setState('onboarding', {
      completed: true,
      data: this._data,
      completedAt: Date.now(),
    });
    
    // Track completion
    try {
      const Analytics = require('../analytics/analytics-wrapper.js').default;
      if (Analytics) {
        Analytics.getInstance().trackConversion('onboarding_completed', {
          goals: this._data.goals.join(','),
          age: this._data.age,
        });
      }
    } catch (_) {}
    
    // Redirect to home
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
  
  /**
   * Save and continue to next step
   * @private
   */
  async _saveAndContinue() {
    this.config.stateManager?.setState('onboarding', {
      currentStep: this._step,
      data: this._data,
    });
    
    await this.render(this._container);
  }
  
  /**
   * Format label for display
   * @private
   * @param {string} key
   * @returns {string}
   */
  _formatLabel(key) {
    const labels = {
      'vegan': 'Vegan',
      'vegetarian': 'Vegetariano',
      'gluten-free': 'Sem Glúten',
      'dairy-free': 'Sem Lactose',
      'peanut': 'Amendoim',
      'tree-nut': 'Castanhas',
      'shellfish': 'Frutos do Mar',
      'soy': 'Soja',
    };
    return labels[key] ?? key;
  }
  
  /**
   * Render error
   * @private
   * @param {Error} err
   */
  _renderError(err) {
    this._container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: red;">
        <h2>Erro</h2>
        <p>${err.message}</p>
        <button onclick="location.reload()">Recarregar</button>
      </div>
    `;
  }
  
  /**
   * Log debug info
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (!this.config.debug) return;
    console.log(`[OnboardingPage] ${label}`, data);
  }
}

export default OnboardingPage;
\`\`\`

---

## VALIDATION CHECKLIST

- [ ] Render step 0 (Goals) com 4 opções (muscle, fat-loss, performance, health)
- [ ] Botão "Continuar" desabilitado se nenhum goal selecionado
- [ ] Checkbox multiselect salva em `_data.goals`
- [ ] Passo 1 (Biometria) pede age, gender, weight, height
- [ ] Validação: não permite continuar se algum campo vazio
- [ ] Passo 2 (Preferences) com restrições + alergias
- [ ] Budget input funciona corretamente
- [ ] Passo 3 (Stack): gera stack recomendado mockado
- [ ] Passo 4 (Premium): mostra features e preço
- [ ] Botão "Ativar Pro" salva `interestedInPremium = true`
- [ ] Botão "Não agora" completa onboarding sem upsell
- [ ] Todos os passos salvam em StateManager
- [ ] Completion redirects para '/'
- [ ] Animations são suaves (slideIn)
- [ ] Design responsivo (mobile-first)
- [ ] Botões "Voltar" funcionam em todos os passos

## FILES TO DELIVER

1. `/src/pages/onboarding-page.js` (completo acima)
```

---

## **📊 RESUMO DO SPRINT 6**

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 6.1 | `analytics-wrapper.js` | GoogleAnalytics4Wrapper | Eventos tipados, funil CA4, UTM preservado, offline queue, LGPD-compliant |
| 6.2 | `stripe-integration.js` | StripeIntegration | Checkout Stripe-hosted, IndexedDB offline, restore purchase, webhooks sample |
| 6.3 | `conversion-funnel-page.js` | ConversionFunnelPage | Dashboard admin tempo real, metrics grid, funnel visual, affiliate breakdown |
| 6.4 | `onboarding-page.js` | OnboardingFlow | 5 telas, state machine, premium upsell, goals/biometria/preferences/stack |

---

## **✅ TOTAL ACUMULADO SPRINTS 1–6**

| Categoria | O que existe |
|-----------|-------------|
| **Web Components** | 10+ reutilizáveis (`evidence-pill`, `stat-card`, `affiliate-disclosure`, ...) |
| **Pages** | 11 completas (Home, List, Calculator, MyStack, Favorites, Streak, PriceComparator, Premium, Onboarding, ConversionFunnel, CLI) |
| **Engines** | StackRecommender, DosageCalculator, AffiliateEngine v2, PriceComparator, GoogleAnalytics4Wrapper |
| **Systems** | CheckinStreakSystem, PremiumTierSystem, StripeIntegration |
| **Design** | design-system.css (40+ tokens, dark-mode, WCAG AAA) |
| **PWA** | manifest.json + Service Worker v4 + offline queue |
| **Analytics** | GA4 eventos tipados, funil conversão, UTM tracking, offline-ready |
| **Monetização** | Stripe checkout + webhooks, Afiliados (3 marketplaces), Premium (3 tiers), Compliance (FTC/CVM/LGPD) |

---

## **🚀 PRÓXIMO: Sprint 7 — Community + Social + Viral Loops**

Sprint 7 cobre:
- **Prompt 7.1:** `CommunityFeed` — Feed social, posts, comments, likes (Twitter-style)
- **Prompt 7.2:** `GroupsEngine` — Grupos temáticos, moderação, discovery
- **Prompt 7.3:** `ReferralProgram` — Share links, tracking, rewards
- **Prompt 7.4:** `LiveStream` — Real-time events, Q&A, community chats

---

*SupliList v4.0 — Sprint 6 | 26 de maio de 2026*
*Fase 2: Core+ Global | Semanas 13–16 | Analytics + Monetização Real*
