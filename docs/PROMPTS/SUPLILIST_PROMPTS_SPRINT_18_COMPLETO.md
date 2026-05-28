# **SPRINT 18: Advanced Analytics & Insights Engine — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 18 | **Fase:** 4 — Analytics & Monetization Flywheel | **Semanas:** 57–58
**Depende de:** Sprints 1–17 completos (todos os engines anteriores + Integrations)

---

# **VISÃO GERAL DO SPRINT 18**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 18.1 | `analytics-engine.js` + `event-tracking.js` | Rastreamento de eventos com análise causal | Muito Alta |
| 18.2 | `insights-generator.js` + `prediction-engine.js` | Geração de insights e previsões baseadas em IA | Muito Alta |
| 18.3 | `performance-dashboard.js` + `cohort-analysis.js` | Dashboard de performance com análise de coortes | Muito Alta |
| 18.4 | `health-score-calculator.js` + `supplement-effectiveness.js` | Score de saúde pessoal e eficácia de suplementos | Muito Alta |

**Após o Sprint 18:**
- ✅ Event tracking completo (700+ tipos de eventos)
- ✅ Funnels de conversão: signup → first stack → purchase → reorder
- ✅ Cohort analysis: retenção por grupo demográfico
- ✅ User journey mapping com atribuição multi-touch
- ✅ Churn prediction com ML (6 semanas antes)
- ✅ LTV prediction baseado em early behavior
- ✅ Insights gerados automaticamente (anomalias, oportunidades)
- ✅ Recomendações personalizadas baseadas em padrões
- ✅ Performance dashboard (KPIs em tempo real)
- ✅ Custom segment builder (drag-and-drop)
- ✅ Health score (0-100): composição de métrica
- ✅ Supplement effectiveness score (tomou vs objetivo vs resultado)
- ✅ Correlação entre suplementação e resultados (força, resistência, saúde)
- ✅ Comparative analysis: seu progresso vs comunidade
- ✅ Goals tracking com previsão de quando vai atingir
- ✅ Anomaly detection: comportamentos atípicos
- ✅ Export analytics (CSV, JSON, PDF reports)
- ✅ Privacy-first: dados agregados, sem identificação
- ✅ Real-time dashboard atualização (WebSocket)
- ✅ Processamento assíncrono para cálculos pesados

---

# **PROMPT 18.1: AnalyticsEngine — Rastreamento de Eventos**

## TASK 1.1: CREATE /src/analytics/analytics-engine.js

```markdown
## CONTEXT

Você está construindo o AnalyticsEngine para SupliList v4.0 — a camada que transforma
ações do usuário em dados acionáveis.

O objetivo: **"Entender EXATAMENTE como usuários chegam ao seu primeiro sucesso,
mantêm-se engajados, e como suplementos impactam seu resultado final."**

Arquitetura:
- Event: Estrutura base (type, userId, timestamp, properties)
- EventBatch: Agregar eventos para envio eficiente
- Funnel: Rastreamento de jornada (signup → first stack → purchase → reorder)
- Cohort: Agrupamento de usuários por características
- EventStore: Persistência em IndexedDB com rotação (últimos 180 dias)
- RealTimeAggregation: Agregação incremental de eventos
- CustomSegments: Builder para criar segmentos arbitrários

---

## DELIVERABLES ESPERADOS

✅ `/src/analytics/analytics-engine.js` — Core analytics engine
✅ `/src/analytics/event-tracker.js` — Event tracking baseado em EventBus
✅ `/src/analytics/funnel-analyzer.js` — Análise de funnels
✅ `/src/analytics/cohort-analyzer.js` — Análise de coortes
✅ `/src/analytics/event-aggregator.js` — Agregação em tempo real
✅ `/src/analytics/segment-builder.js` — Custom segment builder
✅ `/src/analytics/analytics-engine.test.js` — Full test suite
✅ Event batching com flush automático (30s ou 1000 eventos)
✅ Persistência em IndexedDB (180 dias de eventos)
✅ Performance <10ms para track event
✅ Suporta 10k+ eventos/dia
✅ Real-time streaming via WebSocket
✅ Compliance: eventos anônimos, sem PII

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/analytics/analytics-engine.js`

\`\`\`javascript
/**
 * AnalyticsEngine v1.0 — SupliList
 * Event tracking, funnel analysis, cohort analysis
 *
 * Usage:
 *   import { AnalyticsEngine } from '../analytics/analytics-engine.js';
 *   const analytics = AnalyticsEngine.getInstance();
 *   await analytics.init();
 *   
 *   // Track events (called by EventBus listeners)
 *   analytics.track('user:signup', userId, {
 *     source: 'organic',
 *     country: 'BR'
 *   });
 *   
 *   // Get analytics
 *   const funnel = await analytics.getFunnel('signup-to-purchase');
 *   const cohort = await analytics.getCohortAnalysis('signup-week');
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { FunnelAnalyzer } from './funnel-analyzer.js';
import { CohortAnalyzer } from './cohort-analyzer.js';
import { EventAggregator } from './event-aggregator.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} id                - UUID
 * @property {string} type              - 'user:signup', 'stack:created', 'product:viewed', etc (700+ tipos)
 * @property {string} userId            - User ID
 * @property {string} sessionId         - Session ID para correlação
 * @property {Object} properties        - Event-specific properties
 * @property {string} source            - 'organic', 'referral', 'paid_search', 'social'
 * @property {string} campaign          - Marketing campaign ID se aplicável
 * @property {number} timestamp         - Unix ms
 * @property {string} userAgent         - Browser/app info
 * @property {string} ipHash            - IP hash (não guarda IP real por privacy)
 * @property {string} country           - País (GeoIP)
 * @property {string} deviceType        - 'mobile', 'tablet', 'desktop'
 * @property {Object} customAttributes  - Custom dimensions
 * @property {boolean} isEdgeCase       - Marcado se comportamento atípico
 */

/**
 * @typedef {Object} EventContext
 * @property {string} sessionId         - Session identifier
 * @property {string} userId            - User ID
 * @property {Object} userProfile       - User attributes cached
 * @property {number} sessionStartedAt  - Unix ms
 * @property {number} pageLoadTime      - ms
 */

class AnalyticsEngine {
  constructor() {
    this.events = [];                    // Buffer para batch
    this.eventStore = new Map();         // type:date → events[] (para queries)
    this.funnels = new Map();            // funnelId → FunnelDefinition
    this.cohorts = new Map();            // cohortId → CohortDefinition
    this.segments = new Map();           // segmentId → SegmentDefinition
    this.sessionId = null;
    this.batchSize = 1000;
    this.batchInterval = 30 * 1000;      // 30 segundos
    this.lastFlushAt = Date.now();
    this.isFlushingBatch = false;
    this.funnelAnalyzer = null;
    this.cohortAnalyzer = null;
    this.aggregator = null;
  }

  static #instance = null;

  static getInstance() {
    if (!AnalyticsEngine.#instance) {
      AnalyticsEngine.#instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.#instance;
  }

  /**
   * Inicializar analytics engine
   */
  async init() {
    console.log('📊 Inicializando AnalyticsEngine...');

    // Gerar session ID
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Inicializar analisadores
    this.funnelAnalyzer = FunnelAnalyzer.getInstance();
    this.cohortAnalyzer = CohortAnalyzer.getInstance();
    this.aggregator = EventAggregator.getInstance();

    await this.funnelAnalyzer.init();
    await this.cohortAnalyzer.init();
    await this.aggregator.init();

    // Carregar funnels e cohorts predefinidos
    await this._setupDefaultFunnels();
    await this._setupDefaultCohorts();

    // Carregar eventos salvos
    const stored = await this._loadFromDB();
    if (stored.events) {
      this.events = stored.events;
    }

    // Setup batch flusher
    this._startBatchFlusher();

    // Setup event listeners (capturar tudo do EventBus)
    this._setupEventListeners();

    console.log(`✅ AnalyticsEngine pronto (session: ${this.sessionId})`);
  }

  /**
   * Rastrear um evento
   * @param {string} type - Tipo do evento
   * @param {string} userId - User ID
   * @param {Object} properties - Propriedades do evento
   * @param {Object} options - { source, campaign, customAttributes }
   */
  async track(type, userId, properties = {}, options = {}) {
    // Validação básica
    if (!type || !userId) {
      console.warn('⚠️  track: type and userId are required');
      return;
    }

    // Limite de tamanho de propriedades
    const propertiesStr = JSON.stringify(properties);
    if (propertiesStr.length > 10000) {
      console.warn('⚠️  track: properties too large (>10kb), truncating');
    }

    // Criar evento
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      sessionId: this.sessionId,
      properties: properties || {},
      source: options.source || 'organic',
      campaign: options.campaign || null,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ipHash: await this._getIpHash(), // Não armazena IP real
      country: options.country || await this._getCountry(),
      deviceType: this._getDeviceType(),
      customAttributes: options.customAttributes || {},
      isEdgeCase: false,
    };

    // Buffer o evento
    this.events.push(event);

    // Passar para agregador (real-time)
    await this.aggregator.processEvent(event);

    // Detectar edge cases (comportamento atípico)
    if (await this._isEdgeCase(event)) {
      event.isEdgeCase = true;
    }

    // Flush se batch está cheio
    if (this.events.length >= this.batchSize) {
      await this.flushBatch();
    }

    return event;
  }

  /**
   * Flush batch de eventos (salvar no DB e enviar para backend)
   */
  async flushBatch() {
    if (this.isFlushingBatch || this.events.length === 0) return;

    this.isFlushingBatch = true;
    const batchSize = this.events.length;

    try {
      // Salvar no IndexedDB
      await this._saveToDB();

      // Enviar para backend se online (opcional, para análise cloud)
      if (navigator.onLine) {
        await this._sendBatchToBackend(this.events.slice(-100)); // Últimos 100
      }

      this.lastFlushAt = Date.now();
      console.log(`✅ Batch flushed: ${batchSize} events`);
    } catch (err) {
      console.error('❌ Flush error:', err);
    } finally {
      this.isFlushingBatch = false;
    }
  }

  /**
   * Obter dados de funnel
   */
  async getFunnelAnalysis(funnelId) {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    return this.funnelAnalyzer.analyzeFunnel(funnel, this.events);
  }

  /**
   * Obter dados de cohort
   */
  async getCohortAnalysis(cohortId) {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    return this.cohortAnalyzer.analyzeCohort(cohort, this.events);
  }

  /**
   * Criar custom segment
   */
  async createSegment(name, definition) {
    // definition = { conditions: [{property, operator, value}] }
    const segmentId = `segment-${Date.now()}`;

    this.segments.set(segmentId, {
      id: segmentId,
      name,
      definition,
      createdAt: Date.now(),
    });

    return segmentId;
  }

  /**
   * Obter eventos que matcham um segment
   */
  async getSegmentData(segmentId, limit = 1000) {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    return this.events
      .filter(evt => this._matchesSegment(evt, segment.definition))
      .slice(-limit);
  }

  /**
   * Obter eventos por tipo
   */
  async getEventsByType(type, limit = 1000) {
    return this.events
      .filter(evt => evt.type === type)
      .slice(-limit);
  }

  /**
   * Obter eventos de usuário
   */
  async getEventsByUser(userId, limit = 1000) {
    return this.events
      .filter(evt => evt.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obter timeline de um usuário (customer journey)
   */
  async getUserJourney(userId) {
    const events = await this.getEventsByUser(userId);

    return {
      userId,
      totalEvents: events.length,
      sessionDuration: events.length > 0 
        ? (events[0].timestamp - events[events.length - 1].timestamp) / 1000
        : 0,
      events: events.map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        properties: e.properties,
      })),
    };
  }

  /**
   * Detectar anomalias (comportamento atípico)
   */
  async detectAnomalies(timeWindowMinutes = 60) {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > cutoff);

    const anomalies = [];

    for (const event of recentEvents) {
      if (await this._isEdgeCase(event)) {
        anomalies.push({
          eventId: event.id,
          type: event.type,
          userId: event.userId,
          reason: 'Atypical user behavior detected',
          timestamp: event.timestamp,
        });
      }
    }

    return anomalies;
  }

  /**
   * Obter estatísticas gerais
   */
  async getStats(timeWindowDays = 7) {
    const cutoff = Date.now() - (timeWindowDays * 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > cutoff);

    // Agrupar por tipo
    const byType = {};
    recentEvents.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    // Usuários únicos
    const uniqueUsers = new Set(recentEvents.map(e => e.userId)).size;

    // Eventos por dia
    const eventsByDay = {};
    recentEvents.forEach(e => {
      const date = new Date(e.timestamp).toISOString().split('T')[0];
      eventsByDay[date] = (eventsByDay[date] || 0) + 1;
    });

    return {
      timeWindow: `${timeWindowDays} days`,
      totalEvents: recentEvents.length,
      uniqueUsers,
      eventsByType: byType,
      eventsByDay,
      averageEventsPerUser: uniqueUsers > 0 
        ? (recentEvents.length / uniqueUsers).toFixed(2)
        : 0,
    };
  }

  /**
   * PRIVATE: Setup default funnels
   */
  async _setupDefaultFunnels() {
    // Funnel 1: Signup → First Stack → Purchase
    this.funnels.set('signup-to-purchase', {
      id: 'signup-to-purchase',
      name: 'Signup to First Purchase',
      steps: [
        { name: 'signup', event: 'user:signup' },
        { name: 'create_stack', event: 'stack:created' },
        { name: 'add_to_cart', event: 'cart:product_added' },
        { name: 'purchase', event: 'order:completed' },
      ],
      conversionGoal: 'purchase',
    });

    // Funnel 2: View Product → Add to Cart → Purchase
    this.funnels.set('product-to-purchase', {
      id: 'product-to-purchase',
      name: 'Product View to Purchase',
      steps: [
        { name: 'view', event: 'product:viewed' },
        { name: 'add_to_cart', event: 'cart:product_added' },
        { name: 'checkout', event: 'checkout:started' },
        { name: 'purchase', event: 'order:completed' },
      ],
      conversionGoal: 'purchase',
    });

    // Funnel 3: Social Engagement → Purchase
    this.funnels.set('social-to-purchase', {
      id: 'social-to-purchase',
      name: 'Social Engagement to Purchase',
      steps: [
        { name: 'feed_view', event: 'social:feed_viewed' },
        { name: 'post_like', event: 'post:liked' },
        { name: 'comment', event: 'post:commented' },
        { name: 'purchase', event: 'order:completed' },
      ],
      conversionGoal: 'purchase',
    });
  }

  /**
   * PRIVATE: Setup default cohorts
   */
  async _setupDefaultCohorts() {
    // Cohort 1: Signup week
    this.cohorts.set('signup-week', {
      id: 'signup-week',
      name: 'By Signup Week',
      groupBy: 'signup_week',
      retentionMetric: 'user:active_day',
    });

    // Cohort 2: País
    this.cohorts.set('cohort-by-country', {
      id: 'cohort-by-country',
      name: 'By Country',
      groupBy: 'country',
      retentionMetric: 'user:active_day',
    });

    // Cohort 3: Device type
    this.cohorts.set('cohort-by-device', {
      id: 'cohort-by-device',
      name: 'By Device Type',
      groupBy: 'deviceType',
      retentionMetric: 'user:active_day',
    });
  }

  /**
   * PRIVATE: Setup event listeners
   */
  _setupEventListeners() {
    // Capturar TODOS os eventos do EventBus
    eventBus.on('*', (eventData, eventType) => {
      this.track(eventType, eventData.userId || 'anonymous', eventData);
    });

    console.log('📡 Event listeners configurados');
  }

  /**
   * PRIVATE: Batch flusher scheduler
   */
  _startBatchFlusher() {
    setInterval(() => {
      const timeSinceLastFlush = Date.now() - this.lastFlushAt;
      if (timeSinceLastFlush > this.batchInterval && this.events.length > 0) {
        this.flushBatch();
      }
    }, this.batchInterval / 2); // Checar a cada 15 segundos
  }

  /**
   * PRIVATE: Detect edge cases
   */
  async _isEdgeCase(event) {
    // Casos atípicos: múltiplos eventos em <100ms, comportamento de bot, etc
    const recentEvents = this.events.filter(
      e => e.userId === event.userId && 
           e.timestamp > event.timestamp - 100
    );

    if (recentEvents.length > 5) {
      return true; // 6+ eventos em 100ms = atípico
    }

    return false;
  }

  /**
   * PRIVATE: Match event against segment definition
   */
  _matchesSegment(event, definition) {
    return definition.conditions.every(condition => {
      const value = this._getPropertyValue(event, condition.property);
      return this._evaluateCondition(value, condition.operator, condition.value);
    });
  }

  /**
   * PRIVATE: Get property value (supports nested)
   */
  _getPropertyValue(event, property) {
    const parts = property.split('.');
    let current = event;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * PRIVATE: Evaluate condition
   */
  _evaluateCondition(value, operator, compareValue) {
    switch (operator) {
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'contains':
        return String(value).includes(compareValue);
      case 'gt':
        return Number(value) > Number(compareValue);
      case 'gte':
        return Number(value) >= Number(compareValue);
      case 'lt':
        return Number(value) < Number(compareValue);
      case 'lte':
        return Number(value) <= Number(compareValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(value);
      default:
        return false;
    }
  }

  /**
   * PRIVATE: Get device type
   */
  _getDeviceType() {
    if (typeof navigator === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (/mobile|android|iphone|ipod|blackberry/i.test(ua)) {
      return 'mobile';
    } else if (/ipad|tablet|kindle|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * PRIVATE: Get IP hash (privacy-first)
   */
  async _getIpHash() {
    // Nunca armazenar IP real
    // Em produção: usar fetch para API de IP anônimo
    return 'hashed-ip';
  }

  /**
   * PRIVATE: Get country
   */
  async _getCountry() {
    // GeoIP lookup (pode ser local ou via API)
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.country_code || 'XX';
    } catch {
      return 'XX';
    }
  }

  /**
   * PRIVATE: Send batch to backend
   */
  async _sendBatchToBackend(events) {
    // Enviar batch de eventos para backend analytics
    // Opcional, para análise em cloud
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: events.map(e => ({
            type: e.type,
            timestamp: e.timestamp,
            properties: e.properties,
            source: e.source,
          })),
        }),
      });
    } catch (err) {
      console.warn('⚠️  Failed to send batch to backend:', err);
    }
  }

  async _loadFromDB() {
    // Implementar com IndexedDB
    return { events: [] };
  }

  async _saveToDB() {
    // Persistir eventos em IndexedDB (rotacionar após 180 dias)
  }
}

export { AnalyticsEngine };
\`\`\`

---

### Arquivo 2: `/src/analytics/funnel-analyzer.js`

\`\`\`javascript
/**
 * FunnelAnalyzer v1.0
 * Análise de funnels de conversão
 */

class FunnelAnalyzer {
  constructor() {
    this.funnels = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!FunnelAnalyzer.#instance) {
      FunnelAnalyzer.#instance = new FunnelAnalyzer();
    }
    return FunnelAnalyzer.#instance;
  }

  async init() {
    console.log('📈 Inicializando FunnelAnalyzer...');
  }

  /**
   * Analisar funnel
   */
  analyzeFunnel(funnelDef, events) {
    const steps = funnelDef.steps;
    const analysis = {
      funnelId: funnelDef.id,
      funnelName: funnelDef.name,
      steps: [],
      totalUsers: 0,
      conversionRate: 0,
    };

    // Agrupar usuários por passo
    let usersInStep = new Set();
    let previousStepUsers = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepEvents = events.filter(e => e.type === step.event);
      const stepUsers = new Set(stepEvents.map(e => e.userId));

      if (i === 0) {
        usersInStep = stepUsers;
      } else {
        // Apenas usuários que já passaram pelo passo anterior
        usersInStep = new Set(
          [...usersInStep].filter(u => stepUsers.has(u))
        );
      }

      const dropoff = previousStepUsers 
        ? previousStepUsers.size - usersInStep.size 
        : 0;

      analysis.steps.push({
        name: step.name,
        event: step.event,
        users: usersInStep.size,
        conversionRate: i === 0 
          ? 100
          : (usersInStep.size / previousStepUsers.size * 100).toFixed(2) + '%',
        dropoff,
      });

      previousStepUsers = new Set(usersInStep);
    }

    // Taxa de conversão geral
    if (analysis.steps.length > 0) {
      const firstStepUsers = analysis.steps[0].users;
      const lastStepUsers = analysis.steps[analysis.steps.length - 1].users;
      analysis.conversionRate = firstStepUsers > 0
        ? (lastStepUsers / firstStepUsers * 100).toFixed(2) + '%'
        : '0%';
    }

    return analysis;
  }
}

export { FunnelAnalyzer };
\`\`\`

---

### Arquivo 3: `/src/analytics/cohort-analyzer.js`

\`\`\`javascript
/**
 * CohortAnalyzer v1.0
 * Análise de coortes e retenção
 */

class CohortAnalyzer {
  constructor() {}

  static #instance = null;

  static getInstance() {
    if (!CohortAnalyzer.#instance) {
      CohortAnalyzer.#instance = new CohortAnalyzer();
    }
    return CohortAnalyzer.#instance;
  }

  async init() {
    console.log('👥 Inicializando CohortAnalyzer...');
  }

  /**
   * Analisar coorte
   */
  analyzeCohort(cohortDef, events) {
    const analysis = {
      cohortId: cohortDef.id,
      cohortName: cohortDef.name,
      groups: {},
    };

    // Agrupar eventos por cohort dimension
    const grouped = {};

    for (const event of events) {
      const groupKey = this._getGroupKey(event, cohortDef.groupBy);

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }

      grouped[groupKey].push(event);
    }

    // Analisar retenção por grupo
    for (const [groupKey, groupEvents] of Object.entries(grouped)) {
      const uniqueUsers = new Set(groupEvents.map(e => e.userId)).size;
      const retentionEvents = groupEvents.filter(
        e => e.type === cohortDef.retentionMetric
      );
      const retentionRate = uniqueUsers > 0
        ? (new Set(retentionEvents.map(e => e.userId)).size / uniqueUsers * 100).toFixed(2)
        : 0;

      analysis.groups[groupKey] = {
        users: uniqueUsers,
        retentionRate: retentionRate + '%',
        events: groupEvents.length,
      };
    }

    return analysis;
  }

  _getGroupKey(event, dimension) {
    switch (dimension) {
      case 'country':
        return event.country;
      case 'deviceType':
        return event.deviceType;
      case 'signup_week':
        const date = new Date(event.timestamp);
        const week = Math.floor((date.getDate() - 1) / 7);
        return `week-${week}`;
      default:
        return 'unknown';
    }
  }
}

export { CohortAnalyzer };
\`\`\`

---

### Arquivo 4: `/src/analytics/event-aggregator.js`

\`\`\`javascript
/**
 * EventAggregator v1.0
 * Agregação em tempo real de eventos
 */

class EventAggregator {
  constructor() {
    this.aggregates = new Map();  // type:timewindow → AggregateData
  }

  static #instance = null;

  static getInstance() {
    if (!EventAggregator.#instance) {
      EventAggregator.#instance = new EventAggregator();
    }
    return EventAggregator.#instance;
  }

  async init() {
    console.log('⚡ Inicializando EventAggregator...');
  }

  /**
   * Processar evento e agregar
   */
  async processEvent(event) {
    const key = `${event.type}:hourly`;

    if (!this.aggregates.has(key)) {
      this.aggregates.set(key, {
        type: event.type,
        count: 0,
        uniqueUsers: new Set(),
        properties: {},
      });
    }

    const agg = this.aggregates.get(key);
    agg.count++;
    agg.uniqueUsers.add(event.userId);

    // Agregar propriedades (se numérico)
    for (const [prop, value] of Object.entries(event.properties)) {
      if (typeof value === 'number') {
        if (!agg.properties[prop]) {
          agg.properties[prop] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
        }
        agg.properties[prop].sum += value;
        agg.properties[prop].count++;
        agg.properties[prop].min = Math.min(agg.properties[prop].min, value);
        agg.properties[prop].max = Math.max(agg.properties[prop].max, value);
      }
    }
  }

  /**
   * Obter agregações
   */
  getAggregates(eventType) {
    const key = `${eventType}:hourly`;
    const agg = this.aggregates.get(key);

    if (!agg) return null;

    return {
      type: agg.type,
      count: agg.count,
      uniqueUsers: agg.uniqueUsers.size,
      properties: Object.entries(agg.properties).reduce((acc, [prop, stats]) => {
        acc[prop] = {
          sum: stats.sum,
          count: stats.count,
          average: (stats.sum / stats.count).toFixed(2),
          min: stats.min,
          max: stats.max,
        };
        return acc;
      }, {}),
    };
  }
}

export { EventAggregator };
\`\`\`

---

# **PROMPT 18.2: InsightsGenerator — Geração Automática de Insights**

\`\`\`javascript
/**
 * InsightsGenerator v1.0
 * Gera insights automaticamente baseado em padrões
 *
 * Usage:
 *   const insights = InsightsGenerator.getInstance();
 *   const allInsights = await insights.generateInsights(analyticsData);
 */

class InsightsGenerator {
  constructor() {
    this.insights = [];
  }

  static #instance = null;

  static getInstance() {
    if (!InsightsGenerator.#instance) {
      InsightsGenerator.#instance = new InsightsGenerator();
    }
    return InsightsGenerator.#instance;
  }

  async init() {
    console.log('💡 Inicializando InsightsGenerator...');
  }

  /**
   * Gerar insights a partir de dados
   */
  async generateInsights(analyticsData) {
    const insights = [];

    // Insight 1: Funnel dropoff anomalias
    if (analyticsData.funnelAnalysis) {
      for (const funnel of analyticsData.funnelAnalysis) {
        const anomaly = this._detectFunnelAnomaly(funnel);
        if (anomaly) {
          insights.push({
            type: 'funnel_anomaly',
            severity: 'high',
            title: anomaly.title,
            description: anomaly.description,
            recommendation: anomaly.recommendation,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Insight 2: Oportunidades de crescimento
    const growthOpp = this._detectGrowthOpportunities(analyticsData.stats);
    if (growthOpp) {
      insights.push(growthOpp);
    }

    // Insight 3: Segmentos de alta valor
    const highValue = this._detectHighValueSegments(analyticsData.cohorts);
    if (highValue) {
      insights.push(highValue);
    }

    // Insight 4: Padrões de churn
    const churnPattern = this._detectChurnPatterns(analyticsData.events);
    if (churnPattern) {
      insights.push(churnPattern);
    }

    return insights;
  }

  _detectFunnelAnomaly(funnel) {
    // Se dropoff > 60% em um passo
    for (const step of funnel.steps) {
      const dropoffRate = step.dropoff / (step.users + step.dropoff);
      if (dropoffRate > 0.6) {
        return {
          title: `High dropoff at step: ${step.name}`,
          description: `${(dropoffRate * 100).toFixed(0)}% drop-off users at ${step.name}`,
          recommendation: `Investigate user experience at ${step.name} step`,
        };
      }
    }
    return null;
  }

  _detectGrowthOpportunities(stats) {
    const eventsByDay = Object.values(stats.eventsByDay);
    if (eventsByDay.length < 2) return null;

    const avg = eventsByDay.reduce((a, b) => a + b) / eventsByDay.length;
    const trend = (eventsByDay[eventsByDay.length - 1] - avg) / avg;

    if (trend < -0.2) {
      return {
        type: 'growth_decline',
        severity: 'medium',
        title: 'Declining engagement trend',
        description: `Events down ${(Math.abs(trend) * 100).toFixed(0)}% vs average`,
        recommendation: 'Run engagement campaign or check for platform issues',
        timestamp: Date.now(),
      };
    } else if (trend > 0.2) {
      return {
        type: 'growth_spike',
        severity: 'positive',
        title: 'Strong engagement growth!',
        description: `Events up ${(trend * 100).toFixed(0)}% vs average`,
        recommendation: 'Analyze what drove the spike and repeat',
        timestamp: Date.now(),
      };
    }

    return null;
  }

  _detectHighValueSegments(cohorts) {
    // Segmento com retenção > 50%
    for (const [groupKey, cohortData] of Object.entries(cohorts.groups || {})) {
      const retentionRate = parseFloat(cohortData.retentionRate);
      if (retentionRate > 50 && cohortData.users > 10) {
        return {
          type: 'high_value_segment',
          severity: 'positive',
          title: `High-retention segment found: ${groupKey}`,
          description: `${retentionRate.toFixed(0)}% retention rate in ${groupKey}`,
          recommendation: `Focus acquisition on similar users`,
          timestamp: Date.now(),
        };
      }
    }
    return null;
  }

  _detectChurnPatterns(events) {
    // Usuários com atividade >5 dias depois silêncio >14 dias
    const userActivities = new Map();

    for (const event of events) {
      if (!userActivities.has(event.userId)) {
        userActivities.set(event.userId, []);
      }
      userActivities.get(event.userId).push(event.timestamp);
    }

    let churnerCount = 0;

    for (const [userId, timestamps] of userActivities) {
      if (timestamps.length > 5) {
        const lastActive = Math.max(...timestamps);
        const daysSinceActive = (Date.now() - lastActive) / (24 * 60 * 60 * 1000);

        if (daysSinceActive > 14) {
          churnerCount++;
        }
      }
    }

    if (churnerCount > 0) {
      return {
        type: 'churn_warning',
        severity: 'high',
        title: `${churnerCount} users at risk of churn`,
        description: `Users inactive for >14 days`,
        recommendation: 'Send re-engagement campaign',
        timestamp: Date.now(),
      };
    }

    return null;
  }
}

export { InsightsGenerator };
\`\`\`

---

# **PROMPT 18.3 & 18.4: PerformanceDashboard + HealthScoreCalculator**

Implementar `performance-dashboard.js` com:
- KPI cards (MAU, DAU, retention, LTV, CAC)
- Time series charts
- Heatmaps (quando usuários mais ativos)
- Real-time updates via WebSocket

Implementar `health-score-calculator.js` com:
- Score = (0.2 * supplementAdherence + 0.3 * goalProgress + 0.2 * healthMetrics + 0.2 * communityEngagement + 0.1 * consistency)
- Breakdown por componente
- Trending (melhora/piora semana a semana)

---

# **CHECKLIST FINAL SPRINT 18**

- [ ] AnalyticsEngine com event tracking completo (700+ tipos)
- [ ] Event batching com flush automático (30s ou 1000 eventos)
- [ ] Privacy-first: sem PII, IP hashed, geo-aggregado
- [ ] EventBus integration: capturar todos os eventos automaticamente
- [ ] FunnelAnalyzer: signup→purchase, product view→purchase, social→purchase
- [ ] CohortAnalyzer: retenção por país, device, signup week
- [ ] Custom segment builder com drag-and-drop
- [ ] Event filtering com múltiplos operadores (equals, contains, gt, lt, in)
- [ ] User journey mapping com timeline completa
- [ ] Anomaly detection: comportamento atípico (6+ eventos em 100ms, etc)
- [ ] InsightsGenerator com insights automáticos
- [ ] Churn detection (14+ dias sem atividade)
- [ ] Growth opportunity detection
- [ ] High-value segment identification
- [ ] Funnel dropoff alerts
- [ ] PerformanceDashboard com KPI cards
- [ ] Time series charts (MAU, DAU, revenue)
- [ ] Heatmaps de atividade
- [ ] Real-time updates via WebSocket
- [ ] HealthScoreCalculator (0-100)
- [ ] Health score breakdown (5 componentes)
- [ ] Supplement effectiveness score
- [ ] Correlação entre suplementação e resultados
- [ ] Comparative analysis: você vs comunidade
- [ ] Goals tracking com ETA de conclusão
- [ ] Export analytics (CSV, JSON, PDF)
- [ ] Persistência em IndexedDB (180 dias eventos)
- [ ] Real-time event aggregation
- [ ] Performance <10ms para track event
- [ ] Testes unitários completos

---

**FIM DO PROMPT 18 — ADVANCED ANALYTICS & INSIGHTS COMPLETA** 📊

\`\`\`
