# **SPRINT 22: Marketplace, White-Label & B2B Distribution — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 22 | **Fase:** 5 — Scale & Global Domination | **Semanas:** 65–66
**Depende de:** Sprints 1–21 completos (MVP + monetização + mobile + global + enterprise + APIs)

---

# **VISÃO GERAL DO SPRINT 22**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 22.1 | `marketplace-engine.js` + `vendor-management.js` | Marketplace de apps/plugins/templates | Muito Alta |
| 22.2 | `white-label-platform.js` + `branding-engine.js` | Sistema white-label completo | Muito Alta |
| 22.3 | `b2b-distribution-engine.js` + `partner-program.js` | B2B sales + partner program | Muito Alta |
| 22.4 | `revenue-sharing-engine.js` + `payout-automation.js` | Revenue share automático + payouts | Alta |

**Após o Sprint 22:**
- ✅ Marketplace para apps/plugins/templates
- ✅ Vendor onboarding completo
- ✅ App submission + review workflow
- ✅ Revenue split (70/30, customizável)
- ✅ Vendor dashboard com sales analytics
- ✅ App ratings + reviews system
- ✅ Featured apps + trending algorithms
- ✅ Search + discovery (full-text search)
- ✅ Categories + tagging
- ✅ Version management + rollback
- ✅ App permissions system
- ✅ Sandbox environment para testing
- ✅ White-label para 50+ marcas
- ✅ Custom domain (white-label.com)
- ✅ Custom branding (logo, colors, fonts)
- ✅ Custom email templates + branding
- ✅ White-label mobile apps
- ✅ White-label API endpoints
- ✅ Custom workflows + automation
- ✅ Data isolation por white-label
- ✅ Custom user roles + permissions
- ✅ Whitelabel analytics + reporting
- ✅ Multi-language per white-label
- ✅ Custom payment methods
- ✅ License key system (per white-label)
- ✅ Usage-based billing para white-label
- ✅ B2B partner onboarding
- ✅ Affiliate program (5-20% comissão)
- ✅ Agency program (custom pricing)
- ✅ Reseller program
- ✅ Channel partner program
- ✅ Co-marketing opportunities
- ✅ Joint webinars + events
- ✅ Lead sharing program
- ✅ MDF (Marketing Development Funds)
- ✅ Partner success manager
- ✅ Custom integration support
- ✅ Revenue sharing (net-30, net-60)
- ✅ Automated payout system
- ✅ Multi-currency payouts
- ✅ Tax document generation (1099, etc)
- ✅ Payment method flexibility (bank, PayPal, Stripe)
- ✅ Transparent revenue dashboard
- ✅ Dispute resolution system
- ✅ Partner API + webhooks
- ✅ Performance-based incentives
- ✅ Bonus programs (quarterly)
- ✅ Chargeback protection
- ✅ Fraud detection + prevention
- ✅ Partner training platform
- ✅ Resource library (docs, templates)
- ✅ Co-branded materials
- ✅ Partner community forum
- ✅ Quarterly business reviews
- ✅ Partner tier system (silver, gold, platinum)
- ✅ Volume-based discounts
- ✅ Priority support tiers
- ✅ Early access program
- ✅ Marketplace homepage personalization
- ✅ Recommendation engine (ML)
- ✅ Viral growth mechanics (referral)

---

# **PROMPT 22.1: MarketplaceEngine — Apps/Plugins/Templates**

## TASK 1.1: CREATE /src/marketplace/marketplace-engine.js

```markdown
## CONTEXT

Você está construindo o MarketplaceEngine para SupliList v4.0 — o ecossistema que permite
desenvolvedores estender a plataforma com apps, plugins, templates e integrações.

O objetivo: **"Um marketplace vibrante onde 1000+ developers criam, vendem e ganham comissão.
Ecosystem completo com descoberta, reviews, ratings, pagamentos, payouts automáticos."**

Arquitetura:
- Marketplace: Plataforma de apps/plugins
- App: Plugin/template/integração (vendido no marketplace)
- Vendor: Developer que vende apps
- AppVersion: Versionamento + rollback
- Review: Avaliações + ratings
- VendorPayout: Pagamento automático de comissões
- AppMetrics: Analytics de download/uso
- DiscoveryEngine: Recomendações + trending

---

## DELIVERABLES ESPERADOS

✅ `/src/marketplace/marketplace-engine.js` — Orquestrador marketplace
✅ `/src/marketplace/vendor-management.js` — Vendor CRUD + onboarding
✅ `/src/marketplace/app-submission.js` — App submission workflow
✅ `/src/marketplace/review-system.js` — Ratings + reviews
✅ `/src/marketplace/discovery-engine.js` — Search + recommendations
✅ `/src/marketplace/app-installer.js` — Install/uninstall + versioning
✅ `/src/marketplace/marketplace-engine.test.js` — Full test suite
✅ Vendor onboarding (KYC/AML compliant)
✅ App submission + review workflow (automated)
✅ Approval/rejection com feedback
✅ Revenue split (70/30, customizável por tier)
✅ Marketplace homepage com featured apps
✅ Full-text search com facets
✅ Categories + trending algorithm
✅ Ratings + reviews com moderation
✅ User permissions system
✅ Sandbox environment para testing
✅ Version management + automatic rollback
✅ App permissions (what data can access)
✅ Usage analytics per app
✅ Performance: search <200ms, install <5s
✅ Support para 50+ idiomas

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/marketplace/marketplace-engine.js`

\`\`\`javascript
/**
 * MarketplaceEngine v1.0 — SupliList
 * Marketplace para apps, plugins, templates com vendor management
 *
 * Usage:
 *   import { MarketplaceEngine } from '../marketplace/marketplace-engine.js';
 *   const mp = MarketplaceEngine.getInstance();
 *   await mp.init();
 *   
 *   // Submit app
 *   const app = await mp.submitApp(vendorId, { name: 'App Name', ... });
 *   
 *   // Get featured apps
 *   const featured = await mp.getFeaturedApps();
 *   
 *   // Install app
 *   await mp.installApp(userId, appId, { config });
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { VendorManager } from './vendor-management.js';
import { AppSubmission } from './app-submission.js';
import { ReviewSystem } from './review-system.js';
import { DiscoveryEngine } from './discovery-engine.js';
import { AppInstaller } from './app-installer.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} Vendor
 * @property {string} id                    - UUID
 * @property {string} userId                - Owner user
 * @property {string} companyName           - Vendor name
 * @property {string} description
 * @property {string} website               - vendor.com
 * @property {string} logo                  - URL
 * @property {string} email                 - Support email
 * @property {string} country               - Onde está registrado
 * @property {string} taxId                 - Tax ID para pagamentos
 * @property {string} status                - 'pending' | 'approved' | 'suspended'
 * @property {Object} bankInfo              - { bankName, accountNumber, etc }
 * @property {number} appCount              - Quantos apps publicados
 * @property {number} totalDownloads        - Total de downloads
 * @property {number} avgRating             - Rating médio
 * @property {number} totalEarnings         - Lifetime earnings
 * @property {number} pendingPayout         - Awaiting payout
 * @property {number} createdAt             - Unix ms
 * @property {number} approvedAt            - Unix ms
 * @property {Object} stats                 - { monthlyEarnings, conversionRate, etc }
 */

/**
 * @typedef {Object} MarketplaceApp
 * @property {string} id                    - UUID
 * @property {string} vendorId
 * @property {string} name                  - App name
 * @property {string} slug                  - URL-friendly
 * @property {string} description
 * @property {string[]} categories          - ['productivity', 'health', etc]
 * @property {string[]} tags                - ['nutrition', 'tracking', etc]
 * @property {string} icon                  - App icon URL (512x512)
 * @property {string[]} screenshots         - Banner images
 * @property {string} documentation         - README/docs URL
 * @property {string} sourceCodeUrl         - Github (optional)
 * @property {string} currentVersion        - '1.0.0'
 * @property {string[]} versions            - ['1.0.0', '0.9.0', ...]
 * @property {string} status                - 'draft' | 'reviewing' | 'published' | 'suspended'
 * @property {Object} pricing               - { free: true } ou { price: 2900, currency: 'BRL' }
 * @property {string[]} permissions         - What data can access (stack:read, user:read, etc)
 * @property {number} downloads             - Lifetime
 * @property {number} monthlyDownloads      - Current month
 * @property {number} rating                - 0-5 stars
 * @property {number} reviewCount
 * @property {number} installCount          - Active installations
 * @property {number} uninstallRate         - % uninstalled
 * @property {number} crashRate             - % errors
 * @property {Object} metrics               - { dailyDownloads, dayOverDayGrowth, etc }
 * @property {number} publishedAt           - Unix ms
 * @property {number} updatedAt             - Unix ms
 * @property {boolean} isFeatured           - Show on homepage
 * @property {boolean} trending             - Algorithmic ranking
 */

/**
 * @typedef {Object} AppVersion
 * @property {string} id
 * @property {string} appId
 * @property {string} version              - '1.0.0'
 * @property {string} changelog            - What changed
 * @property {string} sourceUrl            - S3/CDN URL ao código
 * @property {number} size                 - Bytes
 * @property {number} downloadCount
 * @property {number} crashRate
 * @property {string[]} requiredPermissions - List of permissions needed
 * @property {Object} compatibility         - { minVersion: '4.0.0', maxVersion: '*' }
 * @property {string} status                - 'available' | 'deprecated' | 'broken'
 * @property {number} publishedAt           - Unix ms
 * @property {number} deprecatedAt          - Unix ms (optional)
 */

/**
 * @typedef {Object} AppReview
 * @property {string} id
 * @property {string} appId
 * @property {string} userId                - Reviewer
 * @property {number} rating                - 1-5 stars
 * @property {string} title
 * @property {string} body
 * @property {number} helpfulCount          - Upvotes
 * @property {boolean} isVerifiedPurchase
 * @property {string} status                - 'published' | 'flagged' | 'removed'
 * @property {number} createdAt
 * @property {number} updatedAt
 */

class MarketplaceEngine {
  constructor() {
    this.vendors = new Map();              // vendorId → Vendor
    this.apps = new Map();                 // appId → MarketplaceApp
    this.versions = new Map();             // versionId → AppVersion
    this.reviews = new Map();              // reviewId → AppReview
    this.installations = new Map();        // installationId → { userId, appId, version }
    this.vendorManager = null;
    this.appSubmission = null;
    this.reviewSystem = null;
    this.discoveryEngine = null;
    this.appInstaller = null;
  }

  static #instance = null;

  static getInstance() {
    if (!MarketplaceEngine.#instance) {
      MarketplaceEngine.#instance = new MarketplaceEngine();
    }
    return MarketplaceEngine.#instance;
  }

  /**
   * Inicializar marketplace engine
   */
  async init() {
    console.log('🛍️  Inicializando MarketplaceEngine...');

    this.vendorManager = VendorManager.getInstance();
    this.appSubmission = AppSubmission.getInstance();
    this.reviewSystem = ReviewSystem.getInstance();
    this.discoveryEngine = DiscoveryEngine.getInstance();
    this.appInstaller = AppInstaller.getInstance();

    await this.vendorManager.init();
    await this.appSubmission.init();
    await this.reviewSystem.init();
    await this.discoveryEngine.init();
    await this.appInstaller.init();

    // Carregar dados salvos
    const stored = await this._loadFromDB();
    if (stored.vendors) {
      stored.vendors.forEach(v => this.vendors.set(v.id, v));
    }
    if (stored.apps) {
      stored.apps.forEach(a => this.apps.set(a.id, a));
    }
    if (stored.versions) {
      stored.versions.forEach(v => this.versions.set(v.id, v));
    }

    console.log('✅ MarketplaceEngine inicializado');
  }

  /**
   * Onboarding de vendor (KYC/AML)
   */
  async onboardVendor(userId, options = {}) {
    const vendorId = this._generateId();

    console.log(`👤 Onboarding vendor ${options.companyName}...`);

    try {
      // 1. Validar informações
      this._validateVendorInfo(options);

      // 2. Verificar KYC (Know Your Customer)
      const kycStatus = await this._performKYC(options);
      if (kycStatus.status !== 'approved') {
        throw new Error(`KYC falhou: ${kycStatus.reason}`);
      }

      // 3. Criar vendor profile
      const vendor = {
        id: vendorId,
        userId,
        companyName: options.companyName,
        description: options.description || '',
        website: options.website || '',
        logo: options.logo || null,
        email: options.email,
        country: options.country,
        taxId: options.taxId,
        status: 'pending', // Await manual approval
        bankInfo: {
          bankName: options.bankInfo.bankName,
          accountNumber: options.bankInfo.accountNumber,
          routingNumber: options.bankInfo.routingNumber,
          accountHolder: options.bankInfo.accountHolder,
        },
        appCount: 0,
        totalDownloads: 0,
        avgRating: 0,
        totalEarnings: 0,
        pendingPayout: 0,
        createdAt: Date.now(),
        stats: {
          monthlyEarnings: 0,
          conversionRate: 0,
        },
      };

      this.vendors.set(vendorId, vendor);

      await this._saveToDB();
      await this._sendOnboardingEmail(vendor.email, vendor.companyName);

      eventBus.emit('vendor:onboarded', { vendorId, company: vendor.companyName });

      console.log(`✅ Vendor onboarded: ${vendorId}`);
      return { vendorId, status: 'pending_approval' };

    } catch (error) {
      console.error(`❌ Vendor onboarding falhou:`, error);
      throw error;
    }
  }

  /**
   * Submeter app para review
   */
  async submitApp(vendorId, options = {}) {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error('Vendor não encontrada');

    const appId = this._generateId();

    console.log(`📦 Submetendo app "${options.name}"...`);

    try {
      // 1. Validar app info
      this._validateAppInfo(options);

      // 2. Fazer upload do código
      const sourceUrl = await this._uploadAppSource(appId, options.sourceCode);

      // 3. Testar permissões solicitadas
      const validPerms = await this._validatePermissions(options.permissions);

      // 4. Criar app record
      const app = {
        id: appId,
        vendorId,
        name: options.name,
        slug: this._slugify(options.name),
        description: options.description,
        categories: options.categories || [],
        tags: options.tags || [],
        icon: options.icon,
        screenshots: options.screenshots || [],
        documentation: options.documentation || '',
        sourceCodeUrl: options.sourceCodeUrl || null,
        currentVersion: '1.0.0',
        versions: ['1.0.0'],
        status: 'reviewing',
        pricing: options.pricing || { free: true },
        permissions: validPerms,
        downloads: 0,
        monthlyDownloads: 0,
        rating: 0,
        reviewCount: 0,
        installCount: 0,
        metrics: {
          dailyDownloads: 0,
          dayOverDayGrowth: 0,
        },
        publishedAt: null,
        updatedAt: Date.now(),
      };

      this.apps.set(appId, app);

      // 5. Criar primeira versão
      const versionId = this._generateId();
      const version = {
        id: versionId,
        appId,
        version: '1.0.0',
        changelog: options.changelog || 'Initial release',
        sourceUrl,
        size: options.sourceCodeSize || 0,
        downloadCount: 0,
        crashRate: 0,
        requiredPermissions: validPerms,
        compatibility: options.compatibility || { minVersion: '4.0.0' },
        status: 'available',
        publishedAt: Date.now(),
      };

      this.versions.set(versionId, version);

      // 6. Enfileirar para review automático
      await this.appSubmission.submitForReview(appId, {
        securityScan: true,
        performanceTest: true,
        permissionAudit: true,
      });

      await this._saveToDB();

      // 7. Atualizar vendor stats
      vendor.appCount++;
      eventBus.emit('app:submitted', { appId, name: app.name, vendorId });

      console.log(`✅ App submetido: ${appId} (aguardando review)`);
      return { appId, status: 'reviewing', estimatedReviewTime: '24-48 horas' };

    } catch (error) {
      console.error(`❌ Erro ao submeter app:`, error);
      throw error;
    }
  }

  /**
   * Aprovar app (admin/review team)
   */
  async approveApp(appId, reviewedBy, options = {}) {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App não encontrada');

    console.log(`✅ Aprovando app ${app.name}...`);

    try {
      app.status = 'published';
      app.publishedAt = Date.now();
      app.isFeatured = options.featured || false;

      await this._saveToDB();
      await this.discoveryEngine.indexApp(app);

      const vendor = this.vendors.get(app.vendorId);
      await this._sendApprovalEmail(vendor.email, app.name);

      eventBus.emit('app:approved', { appId, name: app.name });

      console.log(`✅ App ${app.name} publicado!`);
      return { appId, status: 'published' };

    } catch (error) {
      console.error(`❌ Erro ao aprovar app:`, error);
      throw error;
    }
  }

  /**
   * Rejeitar app (admin/review team)
   */
  async rejectApp(appId, reviewedBy, reason) {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App não encontrada');

    console.log(`❌ Rejeitando app ${app.name}: ${reason}`);

    try {
      app.status = 'draft'; // Volta a draft para correções

      const vendor = this.vendors.get(app.vendorId);
      await this._sendRejectionEmail(vendor.email, app.name, reason);

      eventBus.emit('app:rejected', { appId, reason });

      await this._saveToDB();

      console.log(`✅ Rejeição notificada ao vendor`);
      return { appId, status: 'draft', reason };

    } catch (error) {
      console.error(`❌ Erro ao rejeitar app:`, error);
      throw error;
    }
  }

  /**
   * Obter apps em destaque (homepage)
   */
  async getFeaturedApps(options = {}) {
    const featured = Array.from(this.apps.values())
      .filter(a => a.status === 'published' && a.isFeatured)
      .sort((a, b) => (b.rating * b.reviewCount) - (a.rating * a.reviewCount))
      .slice(0, options.limit || 12);

    return {
      featured: featured.map(a => this._serializeApp(a)),
      trending: await this._getTrendingApps(options.limit || 12),
      newReleases: await this._getNewReleases(options.limit || 6),
    };
  }

  /**
   * Buscar apps no marketplace
   */
  async searchApps(query, options = {}) {
    const results = await this.discoveryEngine.search(query, {
      categories: options.categories,
      tags: options.tags,
      minRating: options.minRating,
      sortBy: options.sortBy || 'relevance', // relevance, rating, downloads
      limit: options.limit || 24,
      offset: options.offset || 0,
    });

    return {
      query,
      total: results.total,
      apps: results.hits.map(a => this._serializeApp(a)),
      facets: results.facets,
    };
  }

  /**
   * Instalar app
   */
  async installApp(userId, appId, options = {}) {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App não encontrada');
    if (app.status !== 'published') throw new Error('App não está publicado');

    const installId = this._generateId();

    console.log(`⬇️  Instalando app ${app.name}...`);

    try {
      // 1. Solicitar permissões (usuário confirma)
      if (app.permissions.length > 0) {
        await this._requestPermissions(userId, app.permissions);
      }

      // 2. Instalar versão atual
      const installation = {
        id: installId,
        userId,
        appId,
        version: app.currentVersion,
        config: options.config || {},
        status: 'active',
        installedAt: Date.now(),
        lastUpdateAt: Date.now(),
      };

      this.installations.set(installId, installation);

      // 3. Atualizar stats
      app.installCount++;
      app.monthlyDownloads++;

      await this._saveToDB();

      // 4. Registrar para analytics
      await this._recordInstall(userId, appId, app.currentVersion);

      eventBus.emit('app:installed', { userId, appId, version: app.currentVersion });

      console.log(`✅ App instalado: ${installId}`);
      return { installId, version: app.currentVersion };

    } catch (error) {
      console.error(`❌ Erro ao instalar app:`, error);
      throw error;
    }
  }

  /**
   * Desinstalar app
   */
  async uninstallApp(installationId) {
    const inst = this.installations.get(installationId);
    if (!inst) throw new Error('Instalação não encontrada');

    console.log(`🗑️  Desinstalando app...`);

    try {
      const app = this.apps.get(inst.appId);
      app.installCount--;
      app.uninstallRate = (app.uninstallRate || 0) + 1;

      this.installations.delete(installationId);

      await this._saveToDB();

      eventBus.emit('app:uninstalled', { userId: inst.userId, appId: inst.appId });

      console.log(`✅ App desinstalado`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Erro ao desinstalar:`, error);
      throw error;
    }
  }

  /**
   * Deixar review em app
   */
  async leaveReview(userId, appId, options = {}) {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App não encontrada');

    const reviewId = this._generateId();

    console.log(`⭐ Review sendo registrado...`);

    try {
      const review = {
        id: reviewId,
        appId,
        userId,
        rating: options.rating || 5, // 1-5
        title: options.title || '',
        body: options.body || '',
        helpfulCount: 0,
        isVerifiedPurchase: true,
        status: 'published',
        createdAt: Date.now(),
      };

      this.reviews.set(reviewId, review);

      // Atualizar rating do app
      await this._recalculateAppRating(appId);

      await this._saveToDB();

      eventBus.emit('review:created', { appId, rating: review.rating });

      console.log(`✅ Review registrado`);
      return { reviewId, rating: review.rating };

    } catch (error) {
      console.error(`❌ Erro ao deixar review:`, error);
      throw error;
    }
  }

  /**
   * Obter analytics do vendor
   */
  async getVendorAnalytics(vendorId, period = 'last_30_days') {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error('Vendor não encontrada');

    const vendorApps = Array.from(this.apps.values())
      .filter(a => a.vendorId === vendorId && a.status === 'published');

    return {
      vendor: vendor.companyName,
      apps: vendor.appCount,
      period,
      metrics: {
        downloads: vendorApps.reduce((sum, a) => sum + a.monthlyDownloads, 0),
        installations: vendorApps.reduce((sum, a) => sum + a.installCount, 0),
        avgRating: (vendorApps.reduce((sum, a) => sum + a.rating, 0) / vendorApps.length).toFixed(2),
        revenue: vendor.pendingPayout + (vendor.totalEarnings || 0),
      },
      topApps: vendorApps
        .sort((a, b) => b.monthlyDownloads - a.monthlyDownloads)
        .slice(0, 5)
        .map(a => ({
          name: a.name,
          downloads: a.monthlyDownloads,
          rating: a.rating,
          revenue: a.monthlyDownloads * (a.pricing.free ? 0 : 100),
        })),
    };
  }

  // ============ PRIVATE METHODS ============

  _validateVendorInfo(info) {
    if (!info.companyName) throw new Error('Company name required');
    if (!info.email) throw new Error('Email required');
    if (!info.country) throw new Error('Country required');
    if (!info.taxId) throw new Error('Tax ID required');
    if (!info.bankInfo) throw new Error('Bank info required');
  }

  async _performKYC(options) {
    // Integração com serviço KYC (Stripe Connect, Plaid, etc)
    console.log('🔐 Verificando KYC...');
    return { status: 'approved' };
  }

  _validateAppInfo(info) {
    if (!info.name) throw new Error('App name required');
    if (!info.description) throw new Error('Description required');
    if (!info.sourceCode) throw new Error('Source code required');
  }

  async _uploadAppSource(appId, sourceCode) {
    // Upload para S3/CDN
    return `https://suplilist-apps.s3.amazonaws.com/${appId}/1.0.0/app.js`;
  }

  async _validatePermissions(permissions) {
    const validPerms = [
      'stack:read',
      'stack:write',
      'user:read',
      'user:write',
      'conversions:read',
      'analytics:read',
    ];
    return permissions.filter(p => validPerms.includes(p));
  }

  async _requestPermissions(userId, permissions) {
    // Mostrar modal para usuário confirmar
    return true;
  }

  async _recordInstall(userId, appId, version) {
    // Gravar em analytics
  }

  async _recalculateAppRating(appId) {
    const appReviews = Array.from(this.reviews.values())
      .filter(r => r.appId === appId && r.status === 'published');

    const app = this.apps.get(appId);
    const avgRating = appReviews.length > 0
      ? (appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length).toFixed(2)
      : 0;

    app.rating = parseFloat(avgRating);
    app.reviewCount = appReviews.length;
  }

  async _getTrendingApps(limit) {
    return Array.from(this.apps.values())
      .filter(a => a.status === 'published')
      .sort((a, b) => b.monthlyDownloads - a.monthlyDownloads)
      .slice(0, limit)
      .map(a => this._serializeApp(a));
  }

  async _getNewReleases(limit) {
    return Array.from(this.apps.values())
      .filter(a => a.status === 'published')
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, limit)
      .map(a => this._serializeApp(a));
  }

  async _sendOnboardingEmail(email, company) {
    console.log(`📧 Onboarding email enviado para ${email}`);
  }

  async _sendApprovalEmail(email, appName) {
    console.log(`📧 Approval email enviado para ${email}`);
  }

  async _sendRejectionEmail(email, appName, reason) {
    console.log(`📧 Rejection email enviado para ${email}`);
  }

  _serializeApp(app) {
    return {
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      icon: app.icon,
      rating: app.rating,
      reviewCount: app.reviewCount,
      downloads: app.monthlyDownloads,
      price: app.pricing.free ? 'Free' : `R$ ${app.pricing.price / 100}`,
      vendor: this.vendors.get(app.vendorId)?.companyName,
    };
  }

  async _saveToDB() {
    const data = {
      vendors: Array.from(this.vendors.values()),
      apps: Array.from(this.apps.values()),
      versions: Array.from(this.versions.values()),
      reviews: Array.from(this.reviews.values()),
    };
    return stateManager.save('marketplace:data', data);
  }

  async _loadFromDB() {
    return (await stateManager.load('marketplace:data')) || {};
  }

  _generateId() {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}

export { MarketplaceEngine };
\`\`\`

---

# **PROMPT 22.2: WhiteLabelPlatform — Custom Branding**

```javascript
/**
 * WhiteLabelPlatform v1.0
 * Sistema white-label para 50+ marcas customizadas
 *
 * Features:
 * - Custom domain (white-label.com)
 * - Custom branding (logo, colors, fonts)
 * - Custom email templates
 * - White-label mobile apps
 * - Data isolation por cliente
 * - Custom user roles
 * - Multi-language support
 * - Custom workflows
 */

class WhiteLabelPlatform {
  constructor() {
    this.whitelabels = new Map();
    this.brandingConfigs = new Map();
    this.customDomains = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!WhiteLabelPlatform.#instance) {
      WhiteLabelPlatform.#instance = new WhiteLabelPlatform();
    }
    return WhiteLabelPlatform.#instance;
  }

  async init() {
    console.log('🎨 Inicializando WhiteLabelPlatform...');
  }

  /**
   * Criar instância white-label
   */
  async createWhiteLabel(options = {}) {
    const wlId = this._generateId();

    console.log(`🏷️  Criando white-label ${options.name}...`);

    try {
      // 1. Provisionar subdomain/custom domain
      const domain = options.customDomain || `${this._slugify(options.name)}.suplilist.app`;
      
      // 2. Criar branding config
      const branding = {
        primaryColor: options.primaryColor || '#007AFF',
        secondaryColor: options.secondaryColor || '#5AC8FA',
        accentColor: options.accentColor || '#FF2D55',
        logo: options.logo,
        favicon: options.favicon,
        fontFamily: options.fontFamily || 'System Font',
      };

      const whiteLabel = {
        id: wlId,
        clientId: options.clientId,
        name: options.name,
        domain,
        customDomain: options.customDomain || null,
        branding,
        status: 'active',
        dataIsolation: true,
        allowedFeatures: options.allowedFeatures || [
          'stacks',
          'conversions',
          'analytics',
          'social',
        ],
        customUserRoles: options.customUserRoles || [],
        emailTemplates: await this._generateEmailTemplates(branding),
        mobileAppConfig: {
          ios: { appId: `com.suplilist.${options.clientId}` },
          android: { packageName: `com.suplilist.${options.clientId}` },
        },
        createdAt: Date.now(),
      };

      this.whitelabels.set(wlId, whiteLabel);
      this.customDomains.set(domain, wlId);

      // 3. Provisionar DNS + SSL
      await this._provisionDomain(domain);

      await this._saveToDB();

      eventBus.emit('whitelabel:created', { wlId, domain });

      console.log(`✅ White-label criado: ${domain}`);
      return { wlId, domain, status: 'ready' };

    } catch (error) {
      console.error(`❌ Erro ao criar white-label:`, error);
      throw error;
    }
  }

  /**
   * Atualizar branding
   */
  async updateBranding(wlId, brandingConfig) {
    const wl = this.whitelabels.get(wlId);
    if (!wl) throw new Error('White-label não encontrada');

    wl.branding = { ...wl.branding, ...brandingConfig };
    wl.emailTemplates = await this._generateEmailTemplates(wl.branding);

    await this._saveToDB();

    eventBus.emit('whitelabel:branding:updated', { wlId });

    return { success: true, branding: wl.branding };
  }

  /**
   * Obter preview do white-label
   */
  async getPreview(wlId) {
    const wl = this.whitelabels.get(wlId);
    if (!wl) throw new Error('White-label não encontrada');

    return {
      name: wl.name,
      domain: wl.domain,
      branding: wl.branding,
      previewUrl: `https://${wl.domain}?preview=true`,
      mobileApps: wl.mobileAppConfig,
    };
  }

  // ============ PRIVATE ============

  async _generateEmailTemplates(branding) {
    return {
      welcome: this._buildEmailTemplate('welcome', branding),
      verification: this._buildEmailTemplate('verification', branding),
      passwordReset: this._buildEmailTemplate('password-reset', branding),
      notification: this._buildEmailTemplate('notification', branding),
    };
  }

  _buildEmailTemplate(type, branding) {
    return `<div style="background: ${branding.primaryColor}">
      <!-- Custom email template -->
    </div>`;
  }

  async _provisionDomain(domain) {
    // Criar DNS records + SSL certificate
    console.log(`🔒 Provisionando domínio ${domain}...`);
  }

  async _saveToDB() {
    // Salvar em IndexedDB
  }

  _generateId() {
    return `wl_${Date.now()}`;
  }

  _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}

export { WhiteLabelPlatform };
```

---

# **PROMPT 22.3: B2BDistributionEngine — Partner Programs**

```javascript
/**
 * B2BDistributionEngine v1.0
 * Programa B2B com affiliate, agency, reseller, channel partners
 *
 * Features:
 * - Affiliate program (5-20% comissão)
 * - Agency program (custom pricing)
 * - Reseller program
 * - Channel partners
 * - Lead sharing
 * - Co-marketing
 * - Partner tiers (silver, gold, platinum)
 */

class B2BDistributionEngine {
  constructor() {
    this.partners = new Map();
    this.partnerTiers = this._initTiers();
  }

  static #instance = null;

  static getInstance() {
    if (!B2BDistributionEngine.#instance) {
      B2BDistributionEngine.#instance = new B2BDistributionEngine();
    }
    return B2BDistributionEngine.#instance;
  }

  async init() {
    console.log('🤝 Inicializando B2BDistributionEngine...');
  }

  /**
   * Onboard partner (affiliate, agency, reseller)
   */
  async onboardPartner(userId, options = {}) {
    const partnerId = this._generateId();

    console.log(`🤝 Onboarding partner ${options.companyName}...`);

    try {
      const partner = {
        id: partnerId,
        userId,
        companyName: options.companyName,
        programType: options.programType, // 'affiliate', 'agency', 'reseller', 'channel'
        tier: 'silver', // default tier
        status: 'approved',
        commissionRate: this._getCommissionRate(options.programType, 'silver'),
        monthlyTarget: 0,
        metrics: {
          referrals: 0,
          conversions: 0,
          revenue: 0,
          monthlyEarnings: 0,
        },
        createdAt: Date.now(),
      };

      this.partners.set(partnerId, partner);

      await this._saveToDB();

      eventBus.emit('partner:onboarded', { partnerId, type: options.programType });

      console.log(`✅ Partner onboarded: ${partnerId}`);
      return { partnerId, tier: partner.tier, commission: partner.commissionRate };

    } catch (error) {
      console.error(`❌ Erro ao onboard partner:`, error);
      throw error;
    }
  }

  /**
   * Upgrade partner tier
   */
  async upgradePartnerTier(partnerId, newTier) {
    const partner = this.partners.get(partnerId);
    if (!partner) throw new Error('Partner não encontrada');

    partner.tier = newTier;
    partner.commissionRate = this._getCommissionRate(partner.programType, newTier);

    await this._saveToDB();

    return { tier: newTier, commissionRate: partner.commissionRate };
  }

  /**
   * Obter partner dashboard
   */
  async getPartnerDashboard(partnerId) {
    const partner = this.partners.get(partnerId);
    if (!partner) throw new Error('Partner não encontrada');

    return {
      partner: partner.companyName,
      tier: partner.tier,
      type: partner.programType,
      commission: partner.commissionRate,
      monthlyEarnings: partner.metrics.monthlyEarnings,
      metrics: partner.metrics,
      nextTierRequirements: this._getTierRequirements(partner.tier),
    };
  }

  // ============ PRIVATE ============

  _initTiers() {
    return {
      silver: {
        name: 'Silver',
        minMonthlyRevenue: 0,
        benefits: ['standard_support', 'marketing_materials'],
      },
      gold: {
        name: 'Gold',
        minMonthlyRevenue: 50000,
        benefits: ['standard_support', 'marketing_materials', 'dedicated_manager', 'co_marketing'],
      },
      platinum: {
        name: 'Platinum',
        minMonthlyRevenue: 250000,
        benefits: ['priority_support', 'marketing_materials', 'dedicated_manager', 'co_marketing', 'custom_pricing'],
      },
    };
  }

  _getCommissionRate(programType, tier) {
    const rates = {
      affiliate: { silver: 0.05, gold: 0.10, platinum: 0.15 },
      agency: { silver: 0.10, gold: 0.15, platinum: 0.20 },
      reseller: { silver: 0.20, gold: 0.25, platinum: 0.30 },
      channel: { silver: 0.15, gold: 0.20, platinum: 0.25 },
    };
    return rates[programType]?.[tier] || 0;
  }

  _getTierRequirements(currentTier) {
    const tiers = ['silver', 'gold', 'platinum'];
    const currentIdx = tiers.indexOf(currentTier);
    if (currentIdx >= 2) return null; // No tier above platinum

    const nextTier = tiers[currentIdx + 1];
    return this._initTiers()[nextTier];
  }

  async _saveToDB() {
    // Salvar em IndexedDB
  }

  _generateId() {
    return `partner_${Date.now()}`;
  }
}

export { B2BDistributionEngine };
```

---

# **PROMPT 22.4: RevenueShareEngine — Automatic Payouts**

```javascript
/**
 * RevenueShareEngine v1.0
 * Cálculo automático de revenue share + pagamentos
 *
 * Features:
 * - Revenue split (customizável por partner)
 * - Automated payout (monthly, net-30)
 * - Multi-currency support
 * - Tax document generation (1099, RPA)
 * - Chargeback handling
 * - Dispute resolution
 * - Payment method flexibility
 */

class RevenueShareEngine {
  constructor() {
    this.payouts = new Map();
    this.disputes = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!RevenueShareEngine.#instance) {
      RevenueShareEngine.#instance = new RevenueShareEngine();
    }
    return RevenueShareEngine.#instance;
  }

  async init() {
    console.log('💰 Inicializando RevenueShareEngine...');
  }

  /**
   * Calcular revenue share para período
   */
  async calculateRevenue(partnerId, startDate, endDate) {
    const partner = await this._getPartner(partnerId);
    if (!partner) throw new Error('Partner não encontrada');

    const revenue = await this._getPartnerRevenue(partnerId, startDate, endDate);
    const share = Math.round(revenue * partner.commissionRate);

    return {
      partnerId,
      period: { startDate, endDate },
      grossRevenue: revenue,
      commissionRate: (partner.commissionRate * 100) + '%',
      partnerShare: share,
      suplilistShare: revenue - share,
      status: 'calculated',
    };
  }

  /**
   * Agendar payout automático (mensal)
   */
  async schedulePayout(partnerId, options = {}) {
    const payoutId = this._generateId();
    const nextPayout = this._calculateNextPayoutDate();

    const payout = {
      id: payoutId,
      partnerId,
      amount: 0, // Será calculado
      currency: options.currency || 'BRL',
      paymentMethod: options.paymentMethod || 'bank_transfer',
      status: 'pending_calculation',
      scheduledFor: nextPayout,
      payoutDetails: {
        bankName: options.bankName,
        accountNumber: options.accountNumber,
        accountHolder: options.accountHolder,
      },
      taxDocument: null,
      createdAt: Date.now(),
    };

    this.payouts.set(payoutId, payout);

    return { payoutId, scheduledFor: nextPayout, status: 'scheduled' };
  }

  /**
   * Processar payout
   */
  async processPayout(payoutId) {
    const payout = this.payouts.get(payoutId);
    if (!payout) throw new Error('Payout não encontrada');

    console.log(`💳 Processando payout ${payoutId}...`);

    try {
      // 1. Calcular amount final
      const calculation = await this.calculateRevenue(
        payout.partnerId,
        this._getLastPayoutDate(),
        new Date()
      );

      payout.amount = calculation.partnerShare;

      // 2. Gerar tax document
      const taxDoc = await this._generateTaxDocument(payout);
      payout.taxDocument = taxDoc;

      // 3. Processar pagamento
      const paymentResult = await this._processPayment(payout);

      payout.status = 'completed';
      payout.completedAt = Date.now();
      payout.paymentId = paymentResult.id;

      await this._saveToDB();

      eventBus.emit('payout:completed', { payoutId, amount: payout.amount });

      console.log(`✅ Payout processado: R$ ${(payout.amount / 100).toFixed(2)}`);
      return { payoutId, amount: payout.amount, status: 'completed' };

    } catch (error) {
      console.error(`❌ Erro ao processar payout:`, error);
      payout.status = 'failed';
      payout.error = error.message;
      await this._saveToDB();
      throw error;
    }
  }

  /**
   * Obter histórico de payouts
   */
  async getPayoutHistory(partnerId, options = {}) {
    const payouts = Array.from(this.payouts.values())
      .filter(p => p.partnerId === partnerId && p.status === 'completed')
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, options.limit || 24);

    return {
      partnerId,
      payouts: payouts.map(p => ({
        id: p.id,
        amount: (p.amount / 100).toFixed(2),
        currency: p.currency,
        date: new Date(p.completedAt).toISOString(),
        method: p.paymentMethod,
      })),
      total: payouts.reduce((sum, p) => sum + p.amount, 0),
    };
  }

  /**
   * Registrar chargeback/disputa
   */
  async reportDispute(payoutId, reason) {
    const dispute = {
      id: this._generateId(),
      payoutId,
      reason,
      status: 'open',
      createdAt: Date.now(),
    };

    this.disputes.set(dispute.id, dispute);

    await this._saveToDB();

    return { disputeId: dispute.id, status: 'open' };
  }

  // ============ PRIVATE ============

  async _getPartner(partnerId) {
    // Buscar info do partner
    return null;
  }

  async _getPartnerRevenue(partnerId, startDate, endDate) {
    // Calcular receita gerada pelo partner
    return 0;
  }

  async _generateTaxDocument(payout) {
    // Gerar 1099 (US) ou RPA (Brasil)
    return {
      type: 'RPA', // ou '1099'
      url: `https://docs.suplilist.com/tax/${payout.id}.pdf`,
    };
  }

  async _processPayment(payout) {
    // Usar Stripe Connect, PayPal, ou transferência bancária
    return { id: 'pymt_123', status: 'success' };
  }

  _calculateNextPayoutDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 30);
    return nextMonth.getTime();
  }

  _getLastPayoutDate() {
    return new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 dias atrás
  }

  async _saveToDB() {
    // Salvar em IndexedDB
  }

  _generateId() {
    return `payout_${Date.now()}`;
  }
}

export { RevenueShareEngine };
```

---

# **CHECKLIST FINAL SPRINT 22**

- [ ] MarketplaceEngine com vendor management
- [ ] Vendor onboarding (KYC/AML compliant)
- [ ] App submission workflow
- [ ] Automated review system (security, performance)
- [ ] Manual approval/rejection
- [ ] App versioning + rollback
- [ ] Version compatibility tracking
- [ ] App permissions system (granular)
- [ ] Sandbox environment para testing
- [ ] App installation + uninstallation
- [ ] Active installations tracking
- [ ] Usage analytics per app
- [ ] Crash rate monitoring
- [ ] Performance metrics
- [ ] Ratings + reviews system
- [ ] Review moderation (AI + manual)
- [ ] Verified purchase badge
- [ ] Review helpfulness voting
- [ ] Discovery engine (full-text search)
- [ ] Categories + tagging
- [ ] Trending algorithm (ML-based)
- [ ] Featured apps selection
- [ ] Personalized recommendations
- [ ] Search facets (rating, price, category)
- [ ] Marketplace homepage
- [ ] New releases section
- [ ] Vendor dashboard
- [ ] Vendor analytics
- [ ] Vendor earnings tracking
- [ ] Top performing apps metrics
- [ ] Revenue per app
- [ ] Download trends
- [ ] Customer reviews insights
- [ ] WhiteLabelPlatform com custom branding
- [ ] Custom domain support (CNAME)
- [ ] SSL certificate automation
- [ ] Custom color scheme
- [ ] Custom logo + favicon
- [ ] Custom font families
- [ ] Email template branding
- [ ] Data isolation per white-label
- [ ] Feature toggling per white-label
- [ ] Custom user roles per white-label
- [ ] Multi-language per white-label
- [ ] White-label mobile apps (iOS/Android)
- [ ] White-label app store submission
- [ ] White-label analytics
- [ ] White-label reports
- [ ] Customizable workflows
- [ ] B2BDistributionEngine com partner programs
- [ ] Affiliate program (5-20% commission)
- [ ] Agency program (custom pricing)
- [ ] Reseller program
- [ ] Channel partner program
- [ ] Lead sharing program
- [ ] Co-marketing opportunities
- [ ] Partner tiers (silver, gold, platinum)
- [ ] Tier-based commission rates
- [ ] Tier upgrade requirements
- [ ] Partner onboarding
- [ ] Partner dashboard
- [ ] Partner metrics tracking
- [ ] Monthly performance reports
- [ ] Incentive programs (bonus, rewards)
- [ ] Early access program
- [ ] Partner training platform
- [ ] Resource library (docs, templates)
- [ ] Co-branded materials
- [ ] Partner community forum
- [ ] Quarterly business reviews
- [ ] Dedicated partner manager (platinum)
- [ ] Priority support for partners
- [ ] RevenueShareEngine com automatic payouts
- [ ] Revenue calculation (net-30)
- [ ] Commission split per partner
- [ ] Automated payout scheduling
- [ ] Multi-currency payout support
- [ ] Payment method flexibility (bank, PayPal, Stripe)
- [ ] Tax document generation (1099, RPA)
- [ ] Transparent payout dashboard
- [ ] Payout history + analytics
- [ ] Dispute resolution system
- [ ] Chargeback handling
- [ ] Fraud detection
- [ ] Payment reconciliation
- [ ] Vendor earnings verification
- [ ] Payout audit trail
- [ ] Compliance with payment regulations
- [ ] Performance-based bonus programs
- [ ] Volume-based incentives
- [ ] Seasonal promotions
- [ ] Marketplace SEO optimization
- [ ] App store listing optimization
- [ ] Viral growth mechanics (referral)
- [ ] Affiliate link tracking
- [ ] Conversion attribution
- [ ] Testes unitários completos
- [ ] E2E tests (marketplace, white-label, partners)

---

**FIM DO PROMPT 22 — MARKETPLACE, WHITE-LABEL & B2B DISTRIBUTION** 🛍️🤝

```
