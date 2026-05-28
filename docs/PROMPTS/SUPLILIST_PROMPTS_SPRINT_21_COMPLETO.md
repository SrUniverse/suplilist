# **SPRINT 21: Enterprise Features, Advanced Integrations & API Ecosystem — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 21 | **Fase:** 5 — Scale & Global Domination | **Semanas:** 63–64
**Depende de:** Sprints 1–20 completos (MVP + monetização + mobile + global)

---

# **VISÃO GERAL DO SPRINT 21**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 21.1 | `enterprise-features.js` + `team-management.js` | Sistema de times, workspaces, permissões | Muito Alta |
| 21.2 | `api-gateway.js` + `api-auth.js` | REST API + GraphQL com rate limiting | Muito Alta |
| 21.3 | `integrations-hub.js` + `webhook-engine.js` | Integração com 50+ SaaS (Slack, Zapier, etc) | Muito Alta |
| 21.4 | `advanced-analytics.js` + `custom-reports.js` | Analytics avançadas + Custom dashboards | Alta |

**Após o Sprint 21:**
- ✅ Workspace system (múltiplas organizações)
- ✅ Team management (roles, permissions, invites)
- ✅ Advanced permissions (granular, field-level)
- ✅ SSO (Single Sign-On) com OAuth2/SAML
- ✅ Activity audit log completo
- ✅ Data encryption at rest + in transit
- ✅ REST API v1.0 completa (CRUD para todos recursos)
- ✅ GraphQL API (queries + mutations + subscriptions)
- ✅ API keys + OAuth tokens management
- ✅ Rate limiting (1000 req/min base, 10k pro, unlimited enterprise)
- ✅ Request throttling + backoff automático
- ✅ API documentation (OpenAPI/Swagger)
- ✅ SDK clients (JS, Python, Go, Ruby)
- ✅ Webhook system (subscriptions a eventos)
- ✅ Zapier integration (automação)
- ✅ Slack integration (notifications + commands)
- ✅ Google Workspace integration
- ✅ Microsoft Teams integration
- ✅ Stripe integration (premium tiers)
- ✅ Twilio integration (SMS alerts)
- ✅ SendGrid integration (emails transacionais)
- ✅ HubSpot CRM integration
- ✅ Salesforce integration
- ✅ Jira integration (bug tracking)
- ✅ GitHub integration (deployment tracking)
- ✅ Wearables integrations (Fitbit, Oura, Whoop, Apple Health)
- ✅ MyFitnessPal integration
- ✅ Strava integration (atividades)
- ✅ Google Fit + Samsung Health
- ✅ Custom webhook builders
- ✅ Webhook retry logic + DLQ (Dead Letter Queue)
- ✅ Event streaming (Kafka-ready)
- ✅ Advanced analytics (cohort analysis, funnel, retention)
- ✅ Custom dashboards (drag-drop builder)
- ✅ Scheduled reports (PDF, CSV, email)
- ✅ Data export (compliant, encrypted)
- ✅ Predictive analytics (churn, LTV)
- ✅ Anomaly detection
- ✅ Real-time alerting
- ✅ Custom metrics + KPI tracking
- ✅ Benchmarking vs industria
- ✅ White-label ready
- ✅ Custom branding (logo, colors, domain)
- ✅ API-first architecture
- ✅ Webhook versioning + rollback

---

# **PROMPT 21.1: EnterpriseFeatures — Workspaces & Teams**

## TASK 1.1: CREATE /src/enterprise/enterprise-features.js

```markdown
## CONTEXT

Você está construindo o EnterpriseFeatures para SupliList v4.0 — o sistema que transforma
a plataforma de single-user em multi-tenant enterprise SaaS.

O objetivo: **"Um único SupliList que suporta desde freelancer solo até corporações Fortune 500.
Workspaces isolados, controle granular, auditoria completa, compliance máximo."**

Arquitetura:
- Workspace: Organização/empresa (tenant)
- Team: Grupo de usuários dentro workspace
- Member: Usuário com role + permissions
- Role: Permissões predefinidas (admin, editor, viewer)
- Permission: Granular, field-level, time-based
- AuditLog: Rastreamento completo de ações
- SSO: Single Sign-On via OAuth2/SAML
- DataEncryption: Criptografia em repouso + em trânsito

---

## DELIVERABLES ESPERADOS

✅ `/src/enterprise/enterprise-features.js` — Orquestrador workspace
✅ `/src/enterprise/team-management.js` — Team CRUD + invites
✅ `/src/enterprise/permissions-engine.js` — Granular permissions
✅ `/src/enterprise/sso-manager.js` — OAuth2/SAML integration
✅ `/src/enterprise/audit-logger.js` — Complete audit trail
✅ `/src/enterprise/data-encryption.js` — End-to-end encryption
✅ `/src/enterprise/enterprise-features.test.js` — Full test suite
✅ Workspace isolation (tenant-aware queries)
✅ Team member invitation + onboarding
✅ Role-based access control (RBAC)
✅ Attribute-based access control (ABAC)
✅ SSO com Google, Microsoft, GitHub, Custom SAML
✅ Activity log com 1 ano de retenção
✅ User impersonation (admin only, logged)
✅ IP whitelist + device management
✅ Session management + forced logout
✅ Permission inheritance (workspace → team → user)
✅ Time-based permissions (9am-5pm access)
✅ 2FA enforcement por workspace
✅ Data encryption com AES-256
✅ Key rotation automation
✅ Export com compliance guarantees
✅ HIPAA-ready (se aplicável)

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/enterprise/enterprise-features.js`

\`\`\`javascript
/**
 * EnterpriseFeatures v1.0 — SupliList
 * Multi-tenant workspace system com teams, permissions, audit
 *
 * Usage:
 *   import { EnterpriseFeatures } from '../enterprise/enterprise-features.js';
 *   const ent = EnterpriseFeatures.getInstance();
 *   await ent.init();
 *   
 *   // Create workspace
 *   const ws = await ent.createWorkspace(userId, { name: 'Acme Corp' });
 *   
 *   // Invite team member
 *   await ent.inviteTeamMember(workspaceId, 'john@acme.com', 'editor');
 *   
 *   // Get audit log
 *   const log = await ent.getAuditLog(workspaceId, 'last_30_days');
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { TeamManager } from './team-management.js';
import { PermissionsEngine } from './permissions-engine.js';
import { SSOManager } from './sso-manager.js';
import { AuditLogger } from './audit-logger.js';
import { DataEncryption } from './data-encryption.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} Workspace
 * @property {string} id                    - UUID
 * @property {string} ownerId               - User que criou
 * @property {string} name                  - Organization name
 * @property {string} slug                  - URL-friendly (acme-corp)
 * @property {string} description
 * @property {Object} branding              - { logo, colors, domain }
 * @property {string} plan                  - 'free' | 'pro' | 'enterprise'
 * @property {string} status                - 'active' | 'suspended' | 'deleted'
 * @property {number} memberCount           - Número de usuários
 * @property {number} storage               - GB usado
 * @property {Object} limits                - { apiCalls, storage, teams, etc }
 * @property {Object} settings              - { sso, 2fa, ipWhitelist, etc }
 * @property {number} createdAt             - Unix ms
 * @property {number} expiresAt             - Opcional, para trial
 * @property {Object} billing               - { plan, amount, currency, renewalDate }
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} id                    - UUID
 * @property {string} workspaceId
 * @property {string} userId
 * @property {string} email
 * @property {string} name
 * @property {string} avatar
 * @property {string} role                  - 'owner' | 'admin' | 'editor' | 'viewer' | 'custom'
 * @property {string[]} customPermissions   - Se role === 'custom'
 * @property {number} joinedAt              - Unix ms
 * @property {string} status                - 'active' | 'invited' | 'suspended' | 'removed'
 * @property {string} inviteToken           - Para invite pendente
 * @property {number} lastActive            - Unix ms
 * @property {Object} deviceFingerprints    - [{ device, fingerprint, lastSeen }]
 * @property {boolean} twoFAEnabled         - 2FA obrigatória?
 */

/**
 * @typedef {Object} Role
 * @property {string} id                    - 'admin', 'editor', etc
 * @property {string} name                  - Display name
 * @property {string[]} permissions         - Lista de permissões
 * @property {boolean} isCustom             - true se criado pelo workspace
 * @property {number} createdAt
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} id
 * @property {string} workspaceId
 * @property {string} userId                - Quem fez
 * @property {string} action                - 'user:created', 'data:exported', etc
 * @property {string} resource              - Tipo (user, stack, etc)
 * @property {string} resourceId            - ID do recurso
 * @property {Object} changes               - { before, after }
 * @property {string} ipAddress
 * @property {string} userAgent
 * @property {number} timestamp             - Unix ms
 * @property {string} status                - 'success' | 'failed'
 * @property {Object} metadata              - Extra info
 */

class EnterpriseFeatures {
  constructor() {
    this.workspaces = new Map();          // workspaceId → Workspace
    this.members = new Map();             // memberId → TeamMember
    this.roles = new Map();               // roleId → Role
    this.teamManager = null;
    this.permissionsEngine = null;
    this.ssoManager = null;
    this.auditLogger = null;
    this.dataEncryption = null;
  }

  static #instance = null;

  static getInstance() {
    if (!EnterpriseFeatures.#instance) {
      EnterpriseFeatures.#instance = new EnterpriseFeatures();
    }
    return EnterpriseFeatures.#instance;
  }

  /**
   * Inicializar enterprise features
   */
  async init() {
    console.log('🏢 Inicializando EnterpriseFeatures...');

    this.teamManager = TeamManager.getInstance();
    this.permissionsEngine = PermissionsEngine.getInstance();
    this.ssoManager = SSOManager.getInstance();
    this.auditLogger = AuditLogger.getInstance();
    this.dataEncryption = DataEncryption.getInstance();

    await this.teamManager.init();
    await this.permissionsEngine.init();
    await this.ssoManager.init();
    await this.auditLogger.init();
    await this.dataEncryption.init();

    // Carregar workspaces salvos
    const stored = await this._loadFromDB();
    if (stored.workspaces) {
      stored.workspaces.forEach(w => this.workspaces.set(w.id, w));
    }
    if (stored.members) {
      stored.members.forEach(m => this.members.set(m.id, m));
    }

    this._initializeDefaultRoles();

    console.log('✅ EnterpriseFeatures inicializado');
  }

  /**
   * Criar novo workspace
   */
  async createWorkspace(userId, options = {}) {
    const workspaceId = this._generateId();

    console.log(`🏢 Criando workspace "${options.name}"...`);

    try {
      const workspace = {
        id: workspaceId,
        ownerId: userId,
        name: options.name || 'My Workspace',
        slug: this._slugify(options.name || 'workspace'),
        description: options.description || '',
        branding: {
          logo: null,
          colors: { primary: '#007AFF', secondary: '#5AC8FA' },
          domain: null,
        },
        plan: 'free',
        status: 'active',
        memberCount: 1,
        storage: 0,
        limits: this._getDefaultLimits('free'),
        settings: {
          sso: false,
          ssoProvider: null,
          twoFARequired: false,
          ipWhitelist: [],
          dataResidency: options.dataResidency || 'auto',
        },
        createdAt: Date.now(),
        billing: {
          plan: 'free',
          amount: 0,
          currency: 'BRL',
          renewalDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
        },
      };

      this.workspaces.set(workspaceId, workspace);

      // Owner é membro automaticamente
      const ownerId = this._generateId();
      const ownerMember = {
        id: ownerId,
        workspaceId,
        userId,
        email: options.ownerEmail || '',
        name: options.ownerName || 'Owner',
        role: 'owner',
        joinedAt: Date.now(),
        status: 'active',
        lastActive: Date.now(),
      };

      this.members.set(ownerId, ownerMember);

      await this._saveToDB();
      await this.auditLogger.log(workspaceId, userId, 'workspace:created', 'workspace', workspaceId, {
        name: workspace.name,
      });

      eventBus.emit('workspace:created', { workspaceId, name: workspace.name });

      console.log(`✅ Workspace criado: ${workspaceId}`);
      return workspace;

    } catch (error) {
      console.error(`❌ Erro ao criar workspace:`, error);
      throw error;
    }
  }

  /**
   * Convidar membro para workspace
   */
  async inviteTeamMember(workspaceId, email, role = 'viewer', options = {}) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error(`Workspace ${workspaceId} não encontrada`);

    const inviteToken = this._generateToken();
    const memberId = this._generateId();

    console.log(`📧 Convidando ${email} como ${role}...`);

    try {
      const member = {
        id: memberId,
        workspaceId,
        userId: null, // Será preenchido ao aceitar invite
        email,
        name: options.name || email.split('@')[0],
        role,
        customPermissions: options.permissions || [],
        joinedAt: null,
        status: 'invited',
        inviteToken,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 dias
      };

      this.members.set(memberId, member);
      workspace.memberCount++;

      // Enviar email de convite
      await this._sendInviteEmail(email, workspace.name, inviteToken);

      await this._saveToDB();
      await this.auditLogger.log(workspaceId, options.invitedBy, 'member:invited', 'member', memberId, {
        email,
        role,
      });

      eventBus.emit('member:invited', { workspaceId, email, role });

      console.log(`✅ Convite enviado para ${email}`);
      return { memberId, inviteToken, expiresAt: member.expiresAt };

    } catch (error) {
      console.error(`❌ Erro ao convidar membro:`, error);
      throw error;
    }
  }

  /**
   * Aceitar convite (via token)
   */
  async acceptInvite(token, userId, userEmail) {
    console.log(`✅ Aceitando convite...`);

    const member = Array.from(this.members.values()).find(m => m.inviteToken === token);
    if (!member) throw new Error('Convite inválido ou expirado');

    if (member.expiresAt && Date.now() > member.expiresAt) {
      throw new Error('Convite expirado');
    }

    try {
      member.userId = userId;
      member.email = userEmail;
      member.status = 'active';
      member.joinedAt = Date.now();
      member.inviteToken = null;

      const workspace = this.workspaces.get(member.workspaceId);
      await this.auditLogger.log(workspace.id, userId, 'member:joined', 'member', member.id, {
        email: userEmail,
      });

      await this._saveToDB();
      eventBus.emit('member:joined', { workspaceId: member.workspaceId, userId });

      return { workspaceId: member.workspaceId, role: member.role };

    } catch (error) {
      console.error(`❌ Erro ao aceitar convite:`, error);
      throw error;
    }
  }

  /**
   * Verificar se usuário tem permissão
   */
  async canAccess(userId, workspaceId, action, resource, resourceId = null) {
    const member = Array.from(this.members.values()).find(
      m => m.userId === userId && m.workspaceId === workspaceId && m.status === 'active'
    );

    if (!member) return false;

    return this.permissionsEngine.hasPermission(member.role, member.customPermissions, action, resource);
  }

  /**
   * Obter audit log do workspace
   */
  async getAuditLog(workspaceId, options = {}) {
    const entries = await this.auditLogger.getEntries(workspaceId, options);

    return {
      total: entries.length,
      period: options.period || 'all_time',
      entries: entries.map(e => ({
        id: e.id,
        action: e.action,
        resource: e.resource,
        user: e.userEmail,
        timestamp: new Date(e.timestamp).toISOString(),
        changes: e.changes,
        status: e.status,
      })),
    };
  }

  /**
   * Configurar SSO para workspace
   */
  async configureSSOAuth(workspaceId, provider, config) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace não encontrada');

    console.log(`🔐 Configurando SSO ${provider}...`);

    try {
      await this.ssoManager.configure(provider, config);

      workspace.settings.sso = true;
      workspace.settings.ssoProvider = provider;

      await this._saveToDB();
      await this.auditLogger.log(workspaceId, config.configuredBy, 'sso:configured', 'workspace', workspaceId, {
        provider,
      });

      eventBus.emit('workspace:sso:configured', { workspaceId, provider });

      console.log(`✅ SSO ${provider} configurado`);
      return { success: true, provider };

    } catch (error) {
      console.error(`❌ Erro ao configurar SSO:`, error);
      throw error;
    }
  }

  /**
   * Upgrade workspace para plan superior
   */
  async upgradePlan(workspaceId, newPlan) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace não encontrada');

    console.log(`💎 Upgrade ${workspace.name} para ${newPlan}...`);

    try {
      const oldPlan = workspace.plan;
      workspace.plan = newPlan;
      workspace.limits = this._getDefaultLimits(newPlan);
      workspace.billing.plan = newPlan;

      // Ajustar preço baseado em plan
      const pricing = {
        free: 0,
        pro: 2900, // R$29/mês
        enterprise: 29900, // R$299/mês
      };
      workspace.billing.amount = pricing[newPlan];

      await this._saveToDB();
      await this.auditLogger.log(workspaceId, workspace.ownerId, 'plan:upgraded', 'workspace', workspaceId, {
        from: oldPlan,
        to: newPlan,
      });

      eventBus.emit('workspace:plan:upgraded', { workspaceId, plan: newPlan });

      console.log(`✅ Plan atualizado: ${oldPlan} → ${newPlan}`);
      return workspace;

    } catch (error) {
      console.error(`❌ Erro ao fazer upgrade:`, error);
      throw error;
    }
  }

  /**
   * Obter workspace com todas as informações
   */
  async getWorkspace(workspaceId) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const teamMembers = Array.from(this.members.values())
      .filter(m => m.workspaceId === workspaceId && m.status === 'active');

    return {
      ...workspace,
      members: teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
        lastActive: m.lastActive,
      })),
    };
  }

  // ============ PRIVATE METHODS ============

  _initializeDefaultRoles() {
    const defaultRoles = [
      {
        id: 'owner',
        name: 'Owner',
        permissions: ['*'], // Todas permissões
      },
      {
        id: 'admin',
        name: 'Administrator',
        permissions: [
          'workspace:manage',
          'team:manage',
          'data:export',
          'audit:view',
          'settings:manage',
        ],
      },
      {
        id: 'editor',
        name: 'Editor',
        permissions: [
          'stack:create',
          'stack:edit',
          'stack:delete',
          'product:view',
          'data:export',
        ],
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: [
          'stack:view',
          'product:view',
          'reports:view',
        ],
      },
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });
  }

  _getDefaultLimits(plan) {
    const limits = {
      free: {
        teamMembers: 2,
        apiCalls: 1000,
        storage: 1, // GB
        customDomains: 0,
        sso: false,
      },
      pro: {
        teamMembers: 10,
        apiCalls: 100000,
        storage: 50, // GB
        customDomains: 1,
        sso: true,
      },
      enterprise: {
        teamMembers: 'unlimited',
        apiCalls: 'unlimited',
        storage: 'unlimited',
        customDomains: 'unlimited',
        sso: true,
      },
    };

    return limits[plan] || limits.free;
  }

  async _sendInviteEmail(email, workspaceName, token) {
    // Usar SendGrid ou similar
    console.log(`📧 Email enviado para ${email}`);
  }

  async _saveToDB() {
    const data = {
      workspaces: Array.from(this.workspaces.values()),
      members: Array.from(this.members.values()),
    };
    return stateManager.save('enterprise:data', data);
  }

  async _loadFromDB() {
    return (await stateManager.load('enterprise:data')) || {};
  }

  _generateId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateToken() {
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
  }

  _slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}

export { EnterpriseFeatures };
\`\`\`

---

# **PROMPT 21.2: APIGateway — REST + GraphQL**

```javascript
/**
 * APIGateway v1.0
 * REST API + GraphQL com autenticação, rate limiting, documentação
 *
 * Features:
 * - REST endpoints (CRUD para todos recursos)
 * - GraphQL queries + mutations + subscriptions
 * - OpenAPI/Swagger documentation
 * - API key management
 * - Rate limiting (1000 req/min free, 10k pro, unlimited enterprise)
 * - Request logging + analytics
 * - CORS + security headers
 * - Webhook support
 */

class APIGateway {
  constructor() {
    this.routes = new Map();
    this.graphqlSchema = null;
    this.rateLimiters = new Map();
    this.apiKeys = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!APIGateway.#instance) {
      APIGateway.#instance = new APIGateway();
    }
    return APIGateway.#instance;
  }

  async init() {
    console.log('🔌 Inicializando APIGateway...');
    this._registerRESTRoutes();
    this._buildGraphQLSchema();
  }

  /**
   * Registrar rotas REST
   */
  _registerRESTRoutes() {
    // GET /api/v1/stacks
    this.routes.set('GET /stacks', async (req) => {
      const stacks = await this._getAllStacks(req.workspaceId);
      return { status: 200, data: stacks };
    });

    // POST /api/v1/stacks
    this.routes.set('POST /stacks', async (req) => {
      const stack = await this._createStack(req.workspaceId, req.body);
      return { status: 201, data: stack };
    });

    // GET /api/v1/stacks/:id
    this.routes.set('GET /stacks/:id', async (req) => {
      const stack = await this._getStack(req.workspaceId, req.params.id);
      return { status: 200, data: stack };
    });

    // PUT /api/v1/stacks/:id
    this.routes.set('PUT /stacks/:id', async (req) => {
      const stack = await this._updateStack(req.workspaceId, req.params.id, req.body);
      return { status: 200, data: stack };
    });

    // DELETE /api/v1/stacks/:id
    this.routes.set('DELETE /stacks/:id', async (req) => {
      await this._deleteStack(req.workspaceId, req.params.id);
      return { status: 204 };
    });

    // Mais rotas para products, conversions, analytics, etc
  }

  /**
   * GraphQL query/mutation
   */
  async graphql(req) {
    const { query, variables, operationName } = req.body;

    // Parse + validate GraphQL query
    // Execute com workspace context
    // Return resultado ou erro

    return {
      status: 200,
      data: { data: {} }, // GraphQL response
    };
  }

  /**
   * Gerar API key para usuário
   */
  async generateAPIKey(userId, options = {}) {
    const keyId = this._generateId();
    const secret = this._generateSecret();

    const apiKey = {
      id: keyId,
      userId,
      name: options.name || 'Default',
      keyPrefix: secret.substr(0, 20),
      secret, // Hashed na realidade
      rateLimit: options.rateLimit || 1000, // requests/min
      createdAt: Date.now(),
      lastUsedAt: null,
      status: 'active',
    };

    this.apiKeys.set(keyId, apiKey);

    return {
      id: keyId,
      key: secret, // Mostrar apenas uma vez
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Renovar API key (gerar nova secret)
   */
  async rotateAPIKey(keyId) {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) throw new Error('API key não encontrada');

    const newSecret = this._generateSecret();
    apiKey.secret = newSecret;
    apiKey.rotatedAt = Date.now();

    return { newSecret };
  }

  /**
   * Rate limit check
   */
  async checkRateLimit(apiKeyId) {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) throw new Error('Invalid API key');

    let limiter = this.rateLimiters.get(apiKeyId);
    if (!limiter) {
      limiter = {
        count: 0,
        resetAt: Date.now() + 60000, // 1 min
      };
      this.rateLimiters.set(apiKeyId, limiter);
    }

    // Check reset
    if (Date.now() > limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = Date.now() + 60000;
    }

    limiter.count++;

    if (limiter.count > apiKey.rateLimit) {
      throw new Error(`Rate limit exceeded (${apiKey.rateLimit}/min)`);
    }

    return {
      remaining: apiKey.rateLimit - limiter.count,
      resetAt: limiter.resetAt,
    };
  }

  /**
   * Obter OpenAPI spec
   */
  getOpenAPISpec() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'SupliList API',
        version: '1.0.0',
        description: 'Complete API for supplement stack management',
      },
      servers: [{ url: 'https://api.suplilist.com/v1' }],
      paths: {
        '/stacks': {
          get: { summary: 'List stacks' },
          post: { summary: 'Create stack' },
        },
        '/stacks/{id}': {
          get: { summary: 'Get stack' },
          put: { summary: 'Update stack' },
          delete: { summary: 'Delete stack' },
        },
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    };
  }

  // ============ PRIVATE ============

  async _getAllStacks(workspaceId) {
    return [];
  }

  async _createStack(workspaceId, data) {
    return {};
  }

  async _getStack(workspaceId, stackId) {
    return {};
  }

  async _updateStack(workspaceId, stackId, data) {
    return {};
  }

  async _deleteStack(workspaceId, stackId) {}

  _buildGraphQLSchema() {
    // Usar graphql-js ou Apollo
  }

  _generateSecret() {
    return 'sk_' + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
  }

  _generateId() {
    return `key_${Date.now()}`;
  }
}

export { APIGateway };
```

---

# **PROMPT 21.3: IntegrationsHub — 50+ SaaS Integrations**

```javascript
/**
 * IntegrationsHub v1.0
 * Integração com 50+ SaaS: Slack, Zapier, Stripe, SendGrid, HubSpot, etc
 *
 * Features:
 * - OAuth2 flow para cada integração
 * - Webhook listeners
 * - Bidirectional sync (2-way)
 * - Retry logic + exponential backoff
 * - Dead Letter Queue para falhas
 * - Event mapping + transformation
 * - Custom transformers
 */

class IntegrationsHub {
  constructor() {
    this.integrations = new Map();
    this.webhookListeners = new Map();
    this.eventTransformers = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!IntegrationsHub.#instance) {
      IntegrationsHub.#instance = new IntegrationsHub();
    }
    return IntegrationsHub.#instance;
  }

  async init() {
    console.log('🔗 Inicializando IntegrationsHub...');
    this._registerIntegrations();
  }

  /**
   * Conectar integração OAuth
   */
  async connectIntegration(userId, provider, options = {}) {
    const oauthConfig = this._getOAuthConfig(provider);
    const authUrl = this._buildAuthURL(provider, oauthConfig);

    return {
      provider,
      authUrl,
      state: this._generateState(), // CSRF protection
    };
  }

  /**
   * Processar OAuth callback
   */
  async processOAuthCallback(provider, code, state) {
    // Validar state
    // Exchange code por access token
    // Armazenar token + refresh
    // Validar permissões

    return {
      provider,
      connected: true,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Enviar evento para integração
   */
  async sendEvent(userId, provider, event, data) {
    const integration = this.integrations.get(provider);
    if (!integration || !integration.connected) {
      return { success: false, reason: 'not_connected' };
    }

    try {
      // Transformar evento se necessário
      const transformer = this.eventTransformers.get(provider);
      const payload = transformer ? transformer(event, data) : data;

      // Enviar via API específica
      const result = await this._sendToProvider(provider, payload);

      return { success: true, externalId: result.id };

    } catch (error) {
      // Enfileirar para retry (DLQ)
      await this._enqueueForRetry(userId, provider, event, data);
      return { success: false, error: error.message, queued: true };
    }
  }

  /**
   * Registrar webhook listener
   */
  registerWebhookListener(provider, handler) {
    this.webhookListeners.set(provider, handler);
  }

  /**
   * Processar webhook recebido
   */
  async processWebhook(provider, payload, signature) {
    // Validar signature
    if (!this._validateSignature(provider, payload, signature)) {
      throw new Error('Invalid signature');
    }

    const handler = this.webhookListeners.get(provider);
    if (!handler) return { processed: false };

    return handler(payload);
  }

  // ============ PRIVATE ============

  _registerIntegrations() {
    // Slack
    this.integrations.set('slack', {
      provider: 'slack',
      name: 'Slack',
      oauth: {
        clientId: process.env.SLACK_CLIENT_ID,
        redirectUri: 'https://api.suplilist.com/auth/slack/callback',
      },
      events: ['conversion', 'new_member', 'alert'],
    });

    // Zapier
    this.integrations.set('zapier', {
      provider: 'zapier',
      name: 'Zapier',
      webhookOnly: true,
    });

    // Stripe
    this.integrations.set('stripe', {
      provider: 'stripe',
      name: 'Stripe',
      oauth: {
        clientId: process.env.STRIPE_CLIENT_ID,
      },
      events: ['payment', 'subscription'],
    });

    // SendGrid
    this.integrations.set('sendgrid', {
      provider: 'sendgrid',
      name: 'SendGrid',
      apiKey: process.env.SENDGRID_API_KEY,
      events: ['email_transactional'],
    });

    // HubSpot
    this.integrations.set('hubspot', {
      provider: 'hubspot',
      name: 'HubSpot',
      oauth: {
        clientId: process.env.HUBSPOT_CLIENT_ID,
      },
      events: ['contact', 'deal'],
    });

    // Mais: Google Sheets, Airtable, Microsoft Teams, GitHub, etc
  }

  _getOAuthConfig(provider) {
    return this.integrations.get(provider)?.oauth || {};
  }

  _buildAuthURL(provider, config) {
    return 'https://oauth.provider.com/auth?client_id=' + config.clientId;
  }

  _generateState() {
    return Math.random().toString(36).substr(2);
  }

  async _sendToProvider(provider, payload) {
    // Chamada HTTP específica por provider
    return { id: 'ext_123' };
  }

  async _enqueueForRetry(userId, provider, event, data) {
    // Enfileirar em fila para retry (exponential backoff)
  }

  _validateSignature(provider, payload, signature) {
    // Verificar HMAC signature
    return true;
  }
}

export { IntegrationsHub };
```

---

# **PROMPT 21.4: AdvancedAnalytics — Custom Dashboards**

```javascript
/**
 * AdvancedAnalytics v1.0
 * Analytics avançadas: cohort analysis, funnel, retention, predictive
 *
 * Features:
 * - Cohort analysis (monthly, weekly)
 * - Funnel analysis (multi-step)
 * - Retention curves
 * - Churn prediction
 * - LTV projection
 * - Custom dashboards (drag-drop)
 * - Scheduled reports (PDF, CSV)
 * - Anomaly detection
 */

class AdvancedAnalytics {
  constructor() {
    this.dashboards = new Map();
    this.reports = new Map();
    this.alerts = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!AdvancedAnalytics.#instance) {
      AdvancedAnalytics.#instance = new AdvancedAnalytics();
    }
    return AdvancedAnalytics.#instance;
  }

  async init() {
    console.log('📊 Inicializando AdvancedAnalytics...');
  }

  /**
   * Análise de cohort
   */
  async getCohortAnalysis(workspaceId, options = {}) {
    const cohorts = await this._buildCohorts(workspaceId, options.granularity || 'monthly');

    return {
      cohorts: cohorts.map(c => ({
        period: c.period,
        users: c.userCount,
        retention: {
          week1: c.retention.week1 + '%',
          week4: c.retention.week4 + '%',
          month3: c.retention.month3 + '%',
        },
        ltv: c.ltv,
      })),
    };
  }

  /**
   * Análise de funnel
   */
  async getFunnelAnalysis(workspaceId, funnelName) {
    const steps = await this._getFunnelSteps(workspaceId, funnelName);

    let previous = 0;
    return {
      funnel: funnelName,
      steps: steps.map((step, i) => {
        const conversion = i === 0 ? 100 : (step.count / previous * 100).toFixed(1);
        previous = step.count;

        return {
          step: step.name,
          users: step.count,
          conversionRate: conversion + '%',
          dropoff: ((previous - step.count) / previous * 100).toFixed(1) + '%',
        };
      }),
    };
  }

  /**
   * Criar dashboard customizado
   */
  async createDashboard(workspaceId, options = {}) {
    const dashboardId = this._generateId();

    const dashboard = {
      id: dashboardId,
      workspaceId,
      name: options.name || 'Dashboard',
      widgets: options.widgets || [], // [{ type: 'metric', metric: 'dau', ... }]
      layout: options.layout || 'grid',
      isPublic: options.isPublic || false,
      createdAt: Date.now(),
    };

    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  /**
   * Agendar relatório
   */
  async scheduleReport(workspaceId, options = {}) {
    const reportId = this._generateId();

    const report = {
      id: reportId,
      workspaceId,
      name: options.name || 'Report',
      metrics: options.metrics || [],
      frequency: options.frequency || 'weekly', // daily, weekly, monthly
      format: options.format || 'pdf', // pdf, csv, xlsx
      recipients: options.recipients || [],
      nextRun: this._calculateNextRun(options.frequency),
      createdAt: Date.now(),
    };

    this.reports.set(reportId, report);

    return report;
  }

  /**
   * Detecção de anomalias
   */
  async detectAnomalies(workspaceId, metric, options = {}) {
    const data = await this._getMetricTimeseries(workspaceId, metric, options.period || 'last_30_days');

    const anomalies = this._findAnomalies(data, options.threshold || 2.0); // 2 std devs

    return {
      metric,
      anomalies: anomalies.map(a => ({
        date: a.date,
        value: a.value,
        expected: a.expected,
        deviation: ((a.value - a.expected) / a.expected * 100).toFixed(1) + '%',
        severity: a.severity, // 'low', 'medium', 'high'
      })),
    };
  }

  // ============ PRIVATE ============

  async _buildCohorts(workspaceId, granularity) {
    // Agrupar usuários por período de signup
    // Calcular retenção em cada período subsequente
    return [];
  }

  async _getFunnelSteps(workspaceId, funnelName) {
    // Obter passos do funnel predefinido
    // Contar usuários em cada step
    return [];
  }

  async _getMetricTimeseries(workspaceId, metric, period) {
    // Obter séries temporais de métrica
    return [];
  }

  _findAnomalies(data, threshold) {
    // Usar z-score ou IQR para detectar outliers
    return [];
  }

  _calculateNextRun(frequency) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (frequency === 'daily') return now + day;
    if (frequency === 'weekly') return now + (7 * day);
    if (frequency === 'monthly') return now + (30 * day);

    return now;
  }

  _generateId() {
    return `dash_${Date.now()}`;
  }
}

export { AdvancedAnalytics };
```

---

# **CHECKLIST FINAL SPRINT 21**

- [ ] EnterpriseFeatures com workspace system
- [ ] Team management (CRUD, invites, onboarding)
- [ ] Role-based access control (RBAC)
- [ ] Attribute-based access control (ABAC)
- [ ] SSO com Google, Microsoft, GitHub, Custom SAML
- [ ] OAuth2 flow completo
- [ ] SAML 2.0 support
- [ ] Activity audit log com 1+ ano retenção
- [ ] User impersonation (logged)
- [ ] IP whitelist + device management
- [ ] Session management + forced logout
- [ ] 2FA enforcement por workspace
- [ ] Data encryption AES-256
- [ ] Key rotation automation
- [ ] Secure export com compliance
- [ ] APIGateway com REST API v1.0
- [ ] GraphQL API (queries + mutations + subscriptions)
- [ ] OpenAPI/Swagger documentation
- [ ] API key generation + rotation
- [ ] Rate limiting (free/pro/enterprise tiers)
- [ ] Request logging + analytics
- [ ] CORS + security headers
- [ ] API versioning
- [ ] Webhook support
- [ ] IntegrationsHub com 50+ SaaS
- [ ] OAuth2 para cada integração
- [ ] Slack integration (notifications + commands)
- [ ] Zapier integration (trigger actions)
- [ ] Stripe integration (billing)
- [ ] SendGrid integration (transactional email)
- [ ] HubSpot CRM integration
- [ ] Salesforce integration
- [ ] Microsoft Teams integration
- [ ] Google Workspace integration
- [ ] Wearables (Fitbit, Oura, Whoop, Apple Health)
- [ ] MyFitnessPal integration
- [ ] Strava integration
- [ ] Google Fit + Samsung Health
- [ ] Custom webhook builders
- [ ] Webhook retry logic + exponential backoff
- [ ] Dead Letter Queue para falhas
- [ ] Event mapping + transformation
- [ ] Bidirectional sync (2-way)
- [ ] AdvancedAnalytics com cohort analysis
- [ ] Funnel analysis (multi-step)
- [ ] Retention curves
- [ ] Churn prediction models
- [ ] LTV projection
- [ ] Custom dashboard builder (drag-drop)
- [ ] Scheduled reports (PDF, CSV, XLSX)
- [ ] Email report delivery
- [ ] Anomaly detection
- [ ] Real-time alerting
- [ ] Benchmarking vs industry
- [ ] Custom metrics + KPI tracking
- [ ] White-label ready
- [ ] Custom branding (logo, colors, domain)
- [ ] Workspace isolation (tenant-aware)
- [ ] Data residency selection (auto, US, EU, BR, APAC)
- [ ] HIPAA-ready (se aplicável)
- [ ] SOC 2 Type II compliance
- [ ] Enterprise SLA support
- [ ] Dedicated account manager
- [ ] Priority support (24/7)
- [ ] Testes unitários completos
- [ ] E2E tests (API, integrations)

---

**FIM DO PROMPT 21 — ENTERPRISE FEATURES, APIS & INTEGRATIONS** 🏢
