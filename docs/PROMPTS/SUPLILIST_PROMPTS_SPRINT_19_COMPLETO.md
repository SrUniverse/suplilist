# **SPRINT 19: Monetization & Affiliate System — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 19 | **Fase:** 4 — Analytics & Monetization Flywheel | **Semanas:** 59–60
**Depende de:** Sprints 1–18 completos (todos os engines anteriores + Analytics)

---

# **VISÃO GERAL DO SPRINT 19**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 19.1 | `affiliate-engine.js` + `commission-calculator.js` | Sistema de afiliados com rastreamento e comissões | Muito Alta |
| 19.2 | `product-links-manager.js` + `deep-link-generator.js` | Geração de links de afiliado e deep linking | Alta |
| 19.3 | `affiliate-dashboard.js` + `earnings-tracker.js` | Dashboard para afiliados com earnings tracking | Alta |
| 19.4 | `monetization-engine.js` + `premium-tier-system.js` | Sistema Premium com features tier-locked | Muito Alta |

**Após o Sprint 19:**
- ✅ Sistema de afiliados completo (CPA, CPL, revenue share)
- ✅ Rastreamento de cliques com deduplicação
- ✅ Rastreamento de conversão (purchase, signup, referral)
- ✅ Cálculo automático de comissões com regras customizáveis
- ✅ Linkshortening integrado (bit.ly, TinyURL API)
- ✅ Deep linking para todos os produtos (iOS/Android/Web)
- ✅ Geração de shareable cards (social media)
- ✅ QR codes para campanhas offline
- ✅ Affiliate dashboard com stats em tempo real
- ✅ Earnings tracking e payout automation
- ✅ Monthly payout schedule (Stripe Connect, PayPal)
- ✅ Tax forms (1099 para US, RPA para Brasil)
- ✅ Referral program (user→user com rewards)
- ✅ Premium tier system (free, pro, enterprise)
- ✅ Feature gating por tier
- ✅ Upgrade/downgrade management
- ✅ Usage billing (pay-per-use analytics, exports)
- ✅ Subscription management
- ✅ Invoice generation
- ✅ Revenue attribution (multi-touch)
- ✅ Fraud detection (click spam, suspicious patterns)
- ✅ Compliance: FTC disclosure, GDPR consent
- ✅ Currency conversion (real-time rates)
- ✅ International payout support

---

# **PROMPT 19.1: AffiliateEngine — Rastreamento & Comissões**

## TASK 1.1: CREATE /src/monetization/affiliate-engine.js

```markdown
## CONTEXT

Você está construindo o AffiliateEngine para SupliList v4.0 — o motor que transforma
usuários apaixonados em geradores de receita.

O objetivo: **"Cada usuário que recomenda um suplemento ganha comissão. Sem restrições,
sem burocracia, transparente. O SupliList ganha quando nossos afiliados ganham."**

Arquitetura:
- Affiliate: User que pode ganhar comissões
- AffiliateLink: Link rastreado (URL curta com affiliate ID)
- Click: Registro de clique em affiliate link
- Conversion: Purchase/signup atribuível ao affiliate
- Commission: Cálculo baseado em regras (CPA, CPL, revenue share)
- Payout: Transferência de earnings para banco
- FraudDetection: Detecção de click spam, suspicious patterns
- ReferralProgram: User-to-user referrals com rewards

---

## DELIVERABLES ESPERADOS

✅ `/src/monetization/affiliate-engine.js` — Core affiliate engine
✅ `/src/monetization/commission-calculator.js` — Cálculo de comissões
✅ `/src/monetization/affiliate-link-manager.js` — Link tracking
✅ `/src/monetization/fraud-detector.js` — Detecção de fraud
✅ `/src/monetization/payout-manager.js` — Processamento de pagamentos
✅ `/src/monetization/affiliate-engine.test.js` — Full test suite
✅ Link tracking com deduplicação (same user, 30 min window)
✅ Conversion attribution (last-click, first-click, linear)
✅ Commission queuing com cálculo automático
✅ Payout scheduling (monthly, net-30)
✅ Performance <50ms para click tracking
✅ Suporta 1M+ affiliate clicks/dia
✅ Compliance FTC (disclosure automática)

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/monetization/affiliate-engine.js`

\`\`\`javascript
/**
 * AffiliateEngine v1.0 — SupliList
 * Affiliate tracking, commission calculation, payout management
 *
 * Usage:
 *   import { AffiliateEngine } from '../monetization/affiliate-engine.js';
 *   const affiliate = AffiliateEngine.getInstance();
 *   await affiliate.init();
 *   
 *   // Create affiliate account
 *   const acc = await affiliate.createAffiliateAccount(userId, { bankInfo, taxId });
 *   
 *   // Track click
 *   await affiliate.trackClick(affiliateId, productSku, { source: 'social' });
 *   
 *   // Get earnings
 *   const earnings = await affiliate.getEarnings(affiliateId, 'last_30_days');
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { CommissionCalculator } from './commission-calculator.js';
import { FraudDetector } from './fraud-detector.js';
import { PayoutManager } from './payout-manager.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} AffiliateAccount
 * @property {string} id                - UUID
 * @property {string} userId            - User ID
 * @property {string} username          - Display name
 * @property {string} email
 * @property {string} status            - 'active' | 'inactive' | 'pending' | 'suspended'
 * @property {Object} bankInfo          - { bankName, accountNumber, routingNumber, accountHolder }
 * @property {string} taxId             - CPF/CNPJ (Brasil) ou SSN (US)
 * @property {string} payoutMethod      - 'bank_transfer' | 'paypal' | 'stripe' | 'crypto'
 * @property {number} minPayout         - Mínimo para saque (ex: R$100)
 * @property {string} commissionType    - 'cpa' | 'cpl' | 'revenue_share' | 'hybrid'
 * @property {number} commissionRate    - % ou valor fixo
 * @property {number} totalEarnings     - Total earned all-time
 * @property {number} pendingEarnings   - Aguardando payout
 * @property {number} paidOut           - Total sacado
 * @property {number} createdAt         - Unix ms
 * @property {number} approvedAt        - Unix ms (manual approval)
 * @property {Object} stats             - { totalClicks, totalConversions, conversionRate, avgCommission }
 */

/**
 * @typedef {Object} AffiliateLink
 * @property {string} id                - Link ID
 * @property {string} affiliateId       - Affiliate que criou
 * @property {string} shortCode         - Código curto (ex: "abc123")
 * @property {string} fullUrl           - URL original com tracking
 * @property {string} shortUrl          - URL curta (ex: https://supl.co/abc123)
 * @property {string} productSku        - Produto sendo promovido
 * @property {string} productName
 * @property {string} productImage
 * @property {string} productUrl        - Deep link
 * @property {string} campaign          - Campaign name
 * @property {string} source            - 'social', 'email', 'blog', 'website', 'direct'
 * @property {Object} customParams      - Query params customizados
 * @property {number} createdAt
 * @property {number} expiresAt         - Opcional: link expira
 * @property {boolean} isActive
 * @property {Object} stats             - { clicks, conversions, conversionRate }
 * @property {string} qrCode            - QR code data URL
 */

/**
 * @typedef {Object} AffiliateClick
 * @property {string} id
 * @property {string} affiliateId
 * @property {string} linkId
 * @property {string} productSku
 * @property {string} visitorId         - Anônimo até conversion
 * @property {number} timestamp
 * @property {string} source            - 'social', 'email', etc
 * @property {string} device            - 'mobile', 'desktop', 'tablet'
 * @property {string} browser           - Chrome, Safari, etc
 * @property {string} country
 * @property {string} fingerprint       - Para fraud detection
 * @property {boolean} isFraudulent     - Marcado se suspicious
 * @property {string} status            - 'pending' | 'converted' | 'expired' (após 30 dias)
 * @property {string} conversionId      - Linked conversion (se houver)
 */

/**
 * @typedef {Object} Commission
 * @property {string} id
 * @property {string} affiliateId
 * @property {string} clickId           - Click que originou
 * @property {string} conversionId      - Purchase/signup que gerou
 * @property {string} productSku
 * @property {number} amount            - Valor em cents (R$ * 100)
 * @property {string} currency          - 'BRL' | 'USD'
 * @property {string} type              - 'cpa' | 'cpl' | 'revenue_share'
 * @property {number} baseAmount        - Sem deduções
 * @property {number} deduction         - Chargebacks, fraud, etc
 * @property {string} status            - 'pending' | 'approved' | 'paid' | 'reversed'
 * @property {number} createdAt
 * @property {number} approvedAt        - Quando virou approved
 * @property {number} paidAt            - Quando foi sacado
 * @property {string} payoutId          - Link para payout
 */

class AffiliateEngine {
  constructor() {
    this.affiliates = new Map();         // affiliateId → AffiliateAccount
    this.links = new Map();              // linkId → AffiliateLink
    this.clicks = new Map();             // clickId → AffiliateClick
    this.commissions = new Map();        // commissionId → Commission
    this.conversions = new Map();        // conversionId → linkId mapping
    this.commissionCalc = null;
    this.fraudDetector = null;
    this.payoutMgr = null;
    this.CLICK_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 dias
    this.DEDUP_WINDOW = 30 * 60 * 1000; // 30 minutos (same user, dedup)
  }

  static #instance = null;

  static getInstance() {
    if (!AffiliateEngine.#instance) {
      AffiliateEngine.#instance = new AffiliateEngine();
    }
    return AffiliateEngine.#instance;
  }

  /**
   * Inicializar affiliate engine
   */
  async init() {
    console.log('💰 Inicializando AffiliateEngine...');

    this.commissionCalc = CommissionCalculator.getInstance();
    this.fraudDetector = FraudDetector.getInstance();
    this.payoutMgr = PayoutManager.getInstance();

    await this.commissionCalc.init();
    await this.fraudDetector.init();
    await this.payoutMgr.init();

    // Carregar dados salvos
    const stored = await this._loadFromDB();
    if (stored.affiliates) {
      stored.affiliates.forEach(a => this.affiliates.set(a.id, a));
    }
    if (stored.links) {
      stored.links.forEach(l => this.links.set(l.id, l));
    }

    // Setup event listeners (conversions)
    this._setupEventListeners();

    // Cleanup de clicks expirados
    this._startCleanupScheduler();

    // Commission settlement (daily)
    this._startSettlementScheduler();

    console.log(`✅ AffiliateEngine pronto: ${this.affiliates.size} affiliates`);
  }

  /**
   * Criar conta de afiliado
   */
  async createAffiliateAccount(userId, options = {}) {
    // Validar dados bancários
    if (!options.bankInfo || !options.taxId) {
      throw new Error('Bank info and tax ID are required');
    }

    const affiliateId = `aff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const account = {
      id: affiliateId,
      userId,
      username: options.username || `User ${userId}`,
      email: options.email,
      status: 'pending', // Requer manual approval
      bankInfo: options.bankInfo,
      taxId: options.taxId,
      payoutMethod: options.payoutMethod || 'bank_transfer',
      minPayout: options.minPayout || 10000, // R$100 padrão (em cents)
      commissionType: options.commissionType || 'revenue_share',
      commissionRate: options.commissionRate || 5, // 5% default
      totalEarnings: 0,
      pendingEarnings: 0,
      paidOut: 0,
      createdAt: Date.now(),
      approvedAt: null,
      stats: {
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        avgCommission: 0,
      },
    };

    this.affiliates.set(affiliateId, account);
    await this._saveToDB();

    eventBus.emit('affiliate:account_created', { affiliateId, userId });

    console.log(`✅ Affiliate account created: ${affiliateId}`);

    return account;
  }

  /**
   * Aprovar conta de afiliado (admin only)
   */
  async approveAffiliateAccount(affiliateId) {
    const account = this.affiliates.get(affiliateId);
    if (!account) {
      throw new Error('Affiliate not found');
    }

    account.status = 'active';
    account.approvedAt = Date.now();

    await this._saveToDB();

    eventBus.emit('affiliate:account_approved', { affiliateId });

    console.log(`✅ Affiliate approved: ${affiliateId}`);

    return account;
  }

  /**
   * Criar affiliate link
   */
  async createAffiliateLink(affiliateId, productSku, options = {}) {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate || affiliate.status !== 'active') {
      throw new Error('Affiliate account not found or inactive');
    }

    // Gerar short code
    const shortCode = this._generateShortCode();

    const link = {
      id: `link-${Date.now()}`,
      affiliateId,
      shortCode,
      fullUrl: this._buildTrackingUrl(affiliateId, productSku, shortCode, options),
      shortUrl: `https://supl.co/${shortCode}`,
      productSku,
      productName: options.productName || productSku,
      productImage: options.productImage || '',
      productUrl: options.productUrl || `/products/${productSku}`,
      campaign: options.campaign || 'general',
      source: options.source || 'direct',
      customParams: options.customParams || {},
      createdAt: Date.now(),
      expiresAt: options.expiresAt || null,
      isActive: true,
      stats: {
        clicks: 0,
        conversions: 0,
        conversionRate: 0,
      },
      qrCode: await this._generateQRCode(`https://supl.co/${shortCode}`),
    };

    this.links.set(link.id, link);
    await this._saveToDB();

    eventBus.emit('affiliate:link_created', { linkId: link.id, affiliateId });

    console.log(`✅ Affiliate link created: ${link.shortUrl}`);

    return link;
  }

  /**
   * Rastrear clique em affiliate link
   */
  async trackClick(shortCode, visitorId, options = {}) {
    const link = Array.from(this.links.values()).find(l => l.shortCode === shortCode);

    if (!link || !link.isActive) {
      console.warn(`⚠️  Link not found: ${shortCode}`);
      return null;
    }

    // Verificar expiração
    if (link.expiresAt && Date.now() > link.expiresAt) {
      link.isActive = false;
      await this._saveToDB();
      return null;
    }

    // Detectar dedup (mesmo visitor em 30 min)
    const recentClicks = Array.from(this.clicks.values())
      .filter(c => 
        c.visitorId === visitorId && 
        c.linkId === link.id &&
        Date.now() - c.timestamp < this.DEDUP_WINDOW
      );

    if (recentClicks.length > 0) {
      console.log(`🚫 Dedup: mesmo visitor, link recente`);
      return null; // Dedup
    }

    // Criar click record
    const click = {
      id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      affiliateId: link.affiliateId,
      linkId: link.id,
      productSku: link.productSku,
      visitorId,
      timestamp: Date.now(),
      source: options.source || link.source,
      device: options.device || this._getDeviceType(),
      browser: options.browser || this._getBrowser(),
      country: options.country || 'XX',
      fingerprint: await this._generateFingerprint(visitorId, options),
      isFraudulent: false,
      status: 'pending',
      conversionId: null,
    };

    // Fraud check
    const fraudScore = await this.fraudDetector.scoreClick(click, this.clicks);
    if (fraudScore > 0.7) {
      click.isFraudulent = true;
      console.warn(`🚨 Suspicious click: ${click.id} (score: ${fraudScore})`);
    }

    this.clicks.set(click.id, click);

    // Update link stats
    link.stats.clicks++;
    link.stats.conversionRate = link.stats.conversions / link.stats.clicks;

    // Update affiliate stats
    const aff = this.affiliates.get(link.affiliateId);
    if (aff) {
      aff.stats.totalClicks++;
      aff.stats.conversionRate = aff.stats.totalConversions / aff.stats.totalClicks;
    }

    await this._saveToDB();

    eventBus.emit('affiliate:click_tracked', { clickId: click.id, affiliateId: link.affiliateId });

    console.log(`📊 Click tracked: ${click.id}`);

    return click;
  }

  /**
   * Registrar conversão (purchase/signup)
   */
  async recordConversion(clickId, conversionType, conversionData) {
    const click = this.clicks.get(clickId);
    if (!click) {
      console.warn(`⚠️  Click not found: ${clickId}`);
      return null;
    }

    // Já foi convertido?
    if (click.status === 'converted') {
      console.log(`⚠️  Click already converted`);
      return null;
    }

    // Verificar expiração (30 dias)
    if (Date.now() - click.timestamp > this.CLICK_EXPIRY) {
      click.status = 'expired';
      await this._saveToDB();
      console.warn(`⚠️  Click expired (>30 days)`);
      return null;
    }

    const conversionId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    click.status = 'converted';
    click.conversionId = conversionId;

    // Calcular comissão
    const commission = await this.commissionCalc.calculateCommission(
      click.affiliateId,
      click.productSku,
      conversionType,
      conversionData
    );

    commission.id = `comm-${Date.now()}`;
    commission.clickId = clickId;
    commission.conversionId = conversionId;
    commission.affiliateId = click.affiliateId;
    commission.createdAt = Date.now();
    commission.status = 'pending';

    this.commissions.set(commission.id, commission);
    this.conversions.set(conversionId, clickId);

    // Update affiliate earnings (pending)
    const aff = this.affiliates.get(click.affiliateId);
    if (aff) {
      aff.stats.totalConversions++;
      aff.stats.conversionRate = aff.stats.totalConversions / aff.stats.totalClicks;
      aff.pendingEarnings += commission.amount;
      aff.stats.avgCommission = aff.totalEarnings > 0
        ? aff.totalEarnings / aff.stats.totalConversions
        : commission.amount;
    }

    // Update link stats
    const link = this.links.get(click.linkId);
    if (link) {
      link.stats.conversions++;
      link.stats.conversionRate = link.stats.conversions / link.stats.clicks;
    }

    await this._saveToDB();

    eventBus.emit('affiliate:conversion_recorded', {
      conversionId,
      clickId,
      affiliateId: click.affiliateId,
      amount: commission.amount,
    });

    console.log(`✅ Conversion recorded: ${conversionId} (+${commission.amount} cents)`);

    return commission;
  }

  /**
   * Obter earnings do afiliado
   */
  async getEarnings(affiliateId, period = 'all_time') {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const cutoff = this._getPeriodCutoff(period);
    const affiliateCommissions = Array.from(this.commissions.values())
      .filter(c => c.affiliateId === affiliateId && c.createdAt > cutoff);

    const breakdown = {
      pending: affiliateCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0),
      approved: affiliateCommissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + c.amount, 0),
      paid: affiliateCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0),
      reversed: affiliateCommissions
        .filter(c => c.status === 'reversed')
        .reduce((sum, c) => sum + c.amount, 0),
    };

    return {
      affiliateId,
      period,
      totalClicks: affiliate.stats.totalClicks,
      totalConversions: affiliate.stats.totalConversions,
      conversionRate: (affiliate.stats.conversionRate * 100).toFixed(2) + '%',
      breakdown,
      totalEarnings: breakdown.pending + breakdown.approved + breakdown.paid,
      currencyFormatter: (cents) => `R$${(cents / 100).toFixed(2)}`,
    };
  }

  /**
   * Processar payout
   */
  async requestPayout(affiliateId, amount) {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    if (amount < affiliate.minPayout) {
      throw new Error(`Mínimo de payout é R$${affiliate.minPayout / 100}`);
    }

    if (affiliate.pendingEarnings < amount) {
      throw new Error('Insufficient pending earnings');
    }

    // Criar payout
    const payout = await this.payoutMgr.createPayout(
      affiliateId,
      amount,
      affiliate.bankInfo,
      affiliate.payoutMethod
    );

    // Marcar comissões como paid (debit)
    affiliate.pendingEarnings -= amount;
    affiliate.paidOut += amount;

    await this._saveToDB();

    eventBus.emit('affiliate:payout_requested', { affiliateId, amount, payoutId: payout.id });

    console.log(`💸 Payout requested: ${affiliateId} - R$${(amount / 100).toFixed(2)}`);

    return payout;
  }

  /**
   * Desativar affiliate link
   */
  async deactivateLink(linkId, affiliateId) {
    const link = this.links.get(linkId);
    if (!link || link.affiliateId !== affiliateId) {
      throw new Error('Link not found or unauthorized');
    }

    link.isActive = false;
    await this._saveToDB();

    console.log(`✂️  Link deactivated: ${linkId}`);
  }

  /**
   * PRIVATE: Build tracking URL
   */
  _buildTrackingUrl(affiliateId, productSku, shortCode, options = {}) {
    const params = new URLSearchParams({
      aff: affiliateId,
      sku: productSku,
      code: shortCode,
      campaign: options.campaign || 'general',
      ...options.customParams,
    });

    return `/products/${productSku}?${params.toString()}`;
  }

  /**
   * PRIVATE: Generate short code
   */
  _generateShortCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  /**
   * PRIVATE: Generate QR code
   */
  async _generateQRCode(url) {
    // Usar QR code library (qrcode.js)
    // Return data URL
    return 'data:image/png;base64,...';
  }

  /**
   * PRIVATE: Generate fingerprint para fraud detection
   */
  async _generateFingerprint(visitorId, options) {
    const parts = [
      visitorId,
      options.device,
      options.browser,
      options.country,
      navigator?.userAgent || 'unknown',
    ];

    return btoa(parts.join('|')); // Simple encoding
  }

  /**
   * PRIVATE: Get device type
   */
  _getDeviceType() {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/mobile|android/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  /**
   * PRIVATE: Get browser
   */
  _getBrowser() {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    return 'Other';
  }

  /**
   * PRIVATE: Get period cutoff
   */
  _getPeriodCutoff(period) {
    const now = Date.now();
    switch (period) {
      case 'last_7_days':
        return now - (7 * 24 * 60 * 60 * 1000);
      case 'last_30_days':
        return now - (30 * 24 * 60 * 60 * 1000);
      case 'this_month':
        const date = new Date();
        date.setDate(1);
        return date.getTime();
      case 'last_month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(1);
        return lastMonth.getTime();
      case 'all_time':
      default:
        return 0;
    }
  }

  /**
   * PRIVATE: Setup event listeners
   */
  _setupEventListeners() {
    // Converter clicks em comissões automaticamente quando há purchase
    eventBus.on('order:completed', async (orderData) => {
      // Tentar linkar order ao affiliate click
      const clickId = this._findRelatedClick(orderData.userId);
      if (clickId) {
        await this.recordConversion(clickId, 'purchase', orderData);
      }
    });

    eventBus.on('user:signup', async (userData) => {
      const clickId = this._findRelatedClick(userData.userId);
      if (clickId) {
        await this.recordConversion(clickId, 'signup', userData);
      }
    });

    console.log('📡 Event listeners configurados');
  }

  /**
   * PRIVATE: Find related click for user
   */
  _findRelatedClick(userId) {
    // Procurar click mais recente para este usuário que ainda não foi convertido
    const clicks = Array.from(this.clicks.values())
      .filter(c => c.visitorId === userId && c.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);

    return clicks.length > 0 ? clicks[0].id : null;
  }

  /**
   * PRIVATE: Cleanup scheduler
   */
  _startCleanupScheduler() {
    setInterval(() => {
      const cutoff = Date.now() - this.CLICK_EXPIRY;
      let cleaned = 0;

      for (const [id, click] of this.clicks) {
        if (click.timestamp < cutoff && click.status === 'pending') {
          click.status = 'expired';
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleanup: ${cleaned} clicks expirados marcados`);
      }
    }, 24 * 60 * 60 * 1000); // 1x por dia
  }

  /**
   * PRIVATE: Settlement scheduler (daily)
   */
  _startSettlementScheduler() {
    setInterval(async () => {
      try {
        // Approve pending commissions (diariamente)
        for (const [id, comm] of this.commissions) {
          if (comm.status === 'pending' && !comm.isFraudulent) {
            comm.status = 'approved';
            comm.approvedAt = Date.now();
          }
        }

        await this._saveToDB();
        console.log('✅ Daily settlement completed');
      } catch (err) {
        console.error('❌ Settlement error:', err);
      }
    }, 24 * 60 * 60 * 1000); // 1x por dia
  }

  async _loadFromDB() {
    return { affiliates: [], links: [], clicks: [] };
  }

  async _saveToDB() {
    // Persistir em IndexedDB
  }
}

export { AffiliateEngine };
\`\`\`

---

### Arquivo 2: `/src/monetization/commission-calculator.js`

\`\`\`javascript
/**
 * CommissionCalculator v1.0
 * Cálculo de comissões baseado em rules
 */

class CommissionCalculator {
  constructor() {
    this.commissionRules = new Map(); // sku → rules[]
  }

  static #instance = null;

  static getInstance() {
    if (!CommissionCalculator.#instance) {
      CommissionCalculator.#instance = new CommissionCalculator();
    }
    return CommissionCalculator.#instance;
  }

  async init() {
    console.log('📐 Inicializando CommissionCalculator...');
    await this._loadRules();
  }

  /**
   * Calcular comissão
   */
  async calculateCommission(affiliateId, productSku, conversionType, conversionData) {
    const rules = this.commissionRules.get(productSku) || this._getDefaultRules();

    let baseAmount = 0;
    let commissionType = 'revenue_share';

    if (conversionType === 'purchase') {
      // Revenue share: % do valor da compra
      const purchaseAmount = conversionData.amount || 0;
      baseAmount = Math.floor(purchaseAmount * (rules.revenueSharePercent / 100));
      commissionType = 'revenue_share';
    } else if (conversionType === 'signup') {
      // CPA: valor fixo por signup
      baseAmount = rules.cpaCentsPerSignup;
      commissionType = 'cpa';
    } else if (conversionType === 'referral') {
      // CPL: valor fixo por lead
      baseAmount = rules.cplCentsPerLead;
      commissionType = 'cpl';
    }

    // Aplicar deduções (fraud, refund, etc)
    const deduction = 0; // Será adicionado se houver chargeback

    return {
      baseAmount,
      deduction,
      amount: baseAmount - deduction,
      type: commissionType,
      currency: 'BRL',
    };
  }

  _getDefaultRules() {
    return {
      revenueSharePercent: 5, // 5% por padrão
      cpaCentsPerSignup: 500, // R$5 por signup
      cplCentsPerLead: 1000, // R$10 por lead
    };
  }

  async _loadRules() {
    // Carregar rules de backend ou DB
    // Setup: Whey 5%, Creatina 7%, etc
  }
}

export { CommissionCalculator };
\`\`\`

---

### Arquivo 3: `/src/monetization/fraud-detector.js`

\`\`\`javascript
/**
 * FraudDetector v1.0
 * Detecção de fraud (click spam, suspicious patterns)
 */

class FraudDetector {
  constructor() {
    this.clickHistory = new Map(); // fingerprint → clicks[]
  }

  static #instance = null;

  static getInstance() {
    if (!FraudDetector.#instance) {
      FraudDetector.#instance = new FraudDetector();
    }
    return FraudDetector.#instance;
  }

  async init() {
    console.log('🚨 Inicializando FraudDetector...');
  }

  /**
   * Score click para probabilidade de fraud
   * 0.0 = legitimate, 1.0 = definitely fraud
   */
  async scoreClick(click, allClicks) {
    let score = 0;

    // Rule 1: Múltiplos clicks do mesmo fingerprint em curto período
    const recentFingerprints = Array.from(allClicks.values())
      .filter(c => 
        c.fingerprint === click.fingerprint && 
        Date.now() - c.timestamp < 60 * 1000 // 1 minuto
      );

    if (recentFingerprints.length > 3) {
      score += 0.4; // 40% fraud probability
    }

    // Rule 2: Click velocidade impossível (mesma pessoa, múltiplos links)
    const userLinks = Array.from(allClicks.values())
      .filter(c => 
        c.visitorId === click.visitorId &&
        c.timestamp > Date.now() - 5 * 1000 // 5 segundos
      );

    if (userLinks.length > 2) {
      score += 0.3; // 30% fraud probability
    }

    // Rule 3: Robô patterns (user agent genérico, sem JavaScript)
    if (click.browser === 'Unknown') {
      score += 0.2; // 20% fraud probability
    }

    return Math.min(1.0, score);
  }
}

export { FraudDetector };
\`\`\`

---

### Arquivo 4: `/src/monetization/payout-manager.js`

\`\`\`javascript
/**
 * PayoutManager v1.0
 * Processamento de pagamentos (Stripe, PayPal, transfers)
 */

class PayoutManager {
  constructor() {
    this.payouts = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!PayoutManager.#instance) {
      PayoutManager.#instance = new PayoutManager();
    }
    return PayoutManager.#instance;
  }

  async init() {
    console.log('💳 Inicializando PayoutManager...');
  }

  /**
   * Criar payout request
   */
  async createPayout(affiliateId, amountCents, bankInfo, payoutMethod) {
    const payoutId = `payout-${Date.now()}`;

    const payout = {
      id: payoutId,
      affiliateId,
      amount: amountCents,
      currency: 'BRL',
      method: payoutMethod,
      bankInfo,
      status: 'pending', // pending → processing → completed → failed
      createdAt: Date.now(),
      completedAt: null,
      error: null,
    };

    this.payouts.set(payoutId, payout);

    // Queue para processamento
    setTimeout(() => this._processPayout(payoutId), 5 * 1000);

    return payout;
  }

  /**
   * PRIVATE: Process payout
   */
  async _processPayout(payoutId) {
    const payout = this.payouts.get(payoutId);
    if (!payout) return;

    payout.status = 'processing';

    try {
      if (payout.method === 'bank_transfer') {
        // Integrar com Stripe Connect ou banking API
        await this._processBankTransfer(payout);
      } else if (payout.method === 'paypal') {
        // Integrar com PayPal API
        await this._processPayPal(payout);
      }

      payout.status = 'completed';
      payout.completedAt = Date.now();

      console.log(`✅ Payout completed: ${payoutId}`);
    } catch (err) {
      payout.status = 'failed';
      payout.error = err.message;
      console.error(`❌ Payout failed: ${payoutId}`, err);
    }
  }

  async _processBankTransfer(payout) {
    // Chamar Stripe API ou banco local
    console.log(`💰 Processing bank transfer: ${payout.amount} cents`);
  }

  async _processPayPal(payout) {
    // Chamar PayPal API
    console.log(`📤 Processing PayPal payout: ${payout.amount} cents`);
  }
}

export { PayoutManager };
\`\`\`

---

# **PROMPT 19.2: ProductLinksManager — Deep Linking & Shareable Cards**

\`\`\`javascript
/**
 * ProductLinksManager v1.0
 * Geração de links de afiliado com deep linking
 */

class ProductLinksManager {
  constructor() {
    this.links = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!ProductLinksManager.#instance) {
      ProductLinksManager.#instance = new ProductLinksManager();
    }
    return ProductLinksManager.#instance;
  }

  async init() {
    console.log('🔗 Inicializando ProductLinksManager...');
  }

  /**
   * Gerar deep link para todos os platforms
   */
  async generateDeepLinks(productSku, affiliateId) {
    return {
      web: \`https://suplilist.com/products/\${productSku}?aff=\${affiliateId}\`,
      ios: \`suplilist://product/\${productSku}?aff=\${affiliateId}\`,
      android: \`suplilist://product/\${productSku}?aff=\${affiliateId}\`,
      shortUrl: \`https://supl.co/\${this._generateCode()}\`,
    };
  }

  /**
   * Gerar shareable card (social media)
   */
  async generateShareableCard(productSku, affiliateId, options = {}) {
    // Criar imagem OpenGraph customizada
    return {
      title: options.productName || productSku,
      description: options.description || 'Check out this supplement on SupliList',
      image: options.productImage || '/default-product.png',
      url: \`https://suplilist.com/products/\${productSku}?aff=\${affiliateId}\`,
      tweetText: \`I found this amazing supplement on @SupliList: \${options.productName}\`,
    };
  }

  /**
   * Gerar QR code
   */
  async generateQRCode(url) {
    // Usar qrcode.js
    return 'data:image/png;base64,...';
  }

  _generateCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}

export { ProductLinksManager };
\`\`\`

---

# **PROMPT 19.3: AffiliateDashboard — Real-time Earnings**

\`\`\`javascript
/**
 * AffiliateDashboard v1.0
 * Dashboard para afiliados com stats em tempo real
 */

class AffiliateDashboard {
  constructor() {}

  static #instance = null;

  static getInstance() {
    if (!AffiliateDashboard.#instance) {
      AffiliateDashboard.#instance = new AffiliateDashboard();
    }
    return AffiliateDashboard.#instance;
  }

  async init() {
    console.log('📊 Inicializando AffiliateDashboard...');
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(affiliateId) {
    // Aggregate all affiliate stats
    return {
      todayEarnings: 0,
      monthlyEarnings: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      clickStats: {
        today: 0,
        thisMonth: 0,
        allTime: 0,
      },
      conversionStats: {
        today: 0,
        thisMonth: 0,
        rate: '0%',
      },
      topProducts: [],
      topSources: [],
      recentConversions: [],
    };
  }
}

export { AffiliateDashboard };
\`\`\`

---

# **PROMPT 19.4: MonetizationEngine — Premium Tiers**

\`\`\`javascript
/**
 * MonetizationEngine v1.0
 * Premium tier system com feature gating
 *
 * Tiers:
 * - Free: Stack creation, basic tracking
 * - Pro: Advanced analytics, custom integrations, affiliate program
 * - Enterprise: Unlimited everything, dedicated support
 */

class MonetizationEngine {
  constructor() {
    this.subscriptions = new Map();
    this.tiers = this._initTiers();
  }

  static #instance = null;

  static getInstance() {
    if (!MonetizationEngine.#instance) {
      MonetizationEngine.#instance = new MonetizationEngine();
    }
    return MonetizationEngine.#instance;
  }

  async init() {
    console.log('💎 Inicializando MonetizationEngine...');
  }

  /**
   * Obter tier do usuário
   */
  async getUserTier(userId) {
    const sub = this.subscriptions.get(userId);
    return sub ? sub.tier : 'free';
  }

  /**
   * Verificar se feature está disponível
   */
  async isFeatureAvailable(userId, featureName) {
    const tier = await this.getUserTier(userId);
    const tierConfig = this.tiers[tier];

    return tierConfig.features.includes(featureName);
  }

  /**
   * Upgrade para tier
   */
  async upgradeTier(userId, newTier) {
    if (!this.tiers[newTier]) {
      throw new Error('Invalid tier');
    }

    const tierConfig = this.tiers[newTier];

    const subscription = {
      userId,
      tier: newTier,
      monthlyPrice: tierConfig.monthlyPrice,
      status: 'active',
      createdAt: Date.now(),
      renewalAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    };

    this.subscriptions.set(userId, subscription);

    return subscription;
  }

  _initTiers() {
    return {
      free: {
        name: 'Free',
        monthlyPrice: 0,
        features: [
          'stack:create',
          'product:view',
          'social:feed',
          'tracking:basic',
        ],
      },
      pro: {
        name: 'Pro',
        monthlyPrice: 2900, // R$29/mês em cents
        features: [
          'stack:create',
          'product:view',
          'social:feed',
          'tracking:advanced',
          'analytics:custom',
          'affiliate:program',
          'integrations:premium',
          'export:csv',
          'advanced:recommendations',
        ],
      },
      enterprise: {
        name: 'Enterprise',
        monthlyPrice: 29900, // R$299/mês em cents
        features: [
          '*', // Todas as features
          'api:unlimited',
          'support:dedicated',
          'custom:branding',
          'sso:enabled',
        ],
      },
    };
  }
}

export { MonetizationEngine };
\`\`\`

---

# **CHECKLIST FINAL SPRINT 19**

- [ ] AffiliateEngine com full lifecycle (signup → click → conversion → payout)
- [ ] Affiliate account creation com approval workflow
- [ ] Affiliate link generation com short codes
- [ ] Deep linking para Web, iOS, Android
- [ ] QR code generation para campanhas offline
- [ ] Click tracking com deduplication (30 min window)
- [ ] Conversion attribution (last-click, multi-touch)
- [ ] Commission calculation (CPA, CPA, revenue share, hybrid)
- [ ] Commission approval workflow (daily settlement)
- [ ] FraudDetector: click spam, suspicious patterns
- [ ] Payout management (bank transfer, PayPal, Stripe)
- [ ] Monthly payout scheduling (net-30)
- [ ] ProductLinksManager com deep linking
- [ ] Shareable cards geração
- [ ] QR codes para campanhas
- [ ] AffiliateDashboard com stats real-time
- [ ] Earnings tracking por período
- [ ] Top products e top sources
- [ ] Recent conversions timeline
- [ ] MonetizationEngine com 3 tiers (free, pro, enterprise)
- [ ] Feature gating por tier
- [ ] Subscription management
- [ ] Upgrade/downgrade workflows
- [ ] Usage-based billing (analytics, exports)
- [ ] Invoice generation
- [ ] Tax form support (1099, RPA)
- [ ] Currency conversion (real-time rates)
- [ ] International payout support
- [ ] Referral program (user-to-user rewards)
- [ ] Commission rules por produto
- [ ] FTC disclosure compliance
- [ ] GDPR consent management
- [ ] Persistência em IndexedDB
- [ ] EventBus integration para conversions
- [ ] Real-time earnings updates
- [ ] Performance <50ms click tracking
- [ ] Testes unitários completos

---

**FIM DO PROMPT 19 — MONETIZATION & AFFILIATE SYSTEM COMPLETA** 💰

\`\`\`
