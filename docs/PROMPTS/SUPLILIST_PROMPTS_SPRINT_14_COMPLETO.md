# **SPRINT 14: Wearables & Health Integration Engine — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 14 | **Fase:** 4 — Enterprise & Integrations | **Semanas:** 45–48
**Depende de:** Sprints 1–13 completos (todos os engines anteriores, incluindo MarketplaceEngine)

---

# **VISÃO GERAL DO SPRINT 14**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 14.1 | `wearables-engine.js` + `health-sync.js` | Integração com Apple HealthKit, Google Fit, Whoop, Garmin | Muito Alta |
| 14.2 | `repurchase-engine.js` + `stock-predictor.js` | Predição de reposição, alertas inteligentes, janela de oportunidade | Muito Alta |
| 14.3 | `notification-manager.js` + `push-scheduler.js` | Push, email, SMS, in-app com scheduling inteligente | Alta |
| 14.4 | `health-dashboard.js` + `biometrics-tracker.js` | Dashboard de saúde unificado, HRV, sono, carga de treino | Muito Alta |

**Após o Sprint 14:**
- ✅ Leitura automática de dados de saúde (Apple Health, Google Fit, Whoop, Garmin)
- ✅ Sincronização bidirecional de atividades e biomarcadores
- ✅ Predição de reposição baseada em consumo real + atividade física
- ✅ Alertas de reposição 5 dias antes com link de melhor preço (via MarketplaceEngine)
- ✅ Push notifications nativas (iOS + Android) com scheduling inteligente
- ✅ Dashboard de saúde unificado com HRV, sono, carga de treino e correlação com suplementos
- ✅ Sistema de check-in automático via wearable (sem ação manual do usuário)
- ✅ Ajuste dinâmico de dosagem baseado em dados biométricos reais
- ✅ **Loop de otimização completo:** Wearable → Dados → IA → Dosagem → Reposição → Compra

---

# **PROMPT 14.1: WearablesEngine — Integração com Health APIs**

## TASK 1.1: CREATE /src/wearables/wearables-engine.js

```markdown
## CONTEXT

Você está construindo o WearablesEngine para SupliList v4.0 — a camada de integração
com dispositivos e plataformas de saúde que alimenta recomendações de suplementos
com dados biométricos reais do usuário.

Esta é a diferença entre um app de "chute" e um app de **ciência pessoal**.
Dados reais de HRV, sono, carga de treino e biomarcadores permitem dosagens
personalizadas e timing perfeito de suplementação.

Arquitetura:
- HealthKitConnector: Apple HealthKit (iOS)
- GoogleFitConnector: Google Fit (Android)
- WhoopConnector: Whoop API (Recovery, HRV, Strain)
- GarminConnector: Garmin Connect (atividades, VO2max, Body Battery)
- StravaConnector: Strava API (workouts, TSS)
- HealthDataNormalizer: Normaliza dados de múltiplas fontes
- BiometricsAggregator: Agrega e interpreta biomarcadores

---

## DELIVERABLES ESPERADOS

✅ `/src/wearables/wearables-engine.js` — Core engine, integração unificada
✅ `/src/wearables/connectors/healthkit-connector.js` — Apple HealthKit
✅ `/src/wearables/connectors/googlefit-connector.js` — Google Fit
✅ `/src/wearables/connectors/whoop-connector.js` — Whoop API
✅ `/src/wearables/connectors/garmin-connector.js` — Garmin Connect
✅ `/src/wearables/connectors/strava-connector.js` — Strava API
✅ `/src/wearables/health-data-normalizer.js` — Normalização de dados
✅ `/src/wearables/wearables-engine.test.js` — Full test suite
✅ Sincronização automática a cada 2 horas
✅ Persistência em IndexedDB (histórico 90 dias)
✅ Fallback gracioso quando wearable não disponível

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/wearables/wearables-engine.js`

```javascript
/**
 * WearablesEngine v1.0 — SupliList
 * Unified integration with wearables and health platforms
 *
 * Usage:
 *   import { WearablesEngine } from '../wearables/wearables-engine.js';
 *   const wearables = WearablesEngine.getInstance();
 *   await wearables.init();
 *   const health = await wearables.getLatestHealthData(userId);
 *   const recommendations = await wearables.getSupplementAdjustments(userId);
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';

const eventBus = EventBus.getInstance();

/**
 * @typedef {Object} HealthSnapshot
 * @property {string} userId
 * @property {number} timestamp                - Unix ms
 * @property {Object} recovery                 - { score: 0-100, hrv: ms, restingHR: bpm }
 * @property {Object} sleep                    - { duration: hours, quality: 0-100, deepSleep: hours, remSleep: hours }
 * @property {Object} activity                 - { steps, calories, activeMinutes, strain: 0-21 }
 * @property {Object} biometrics              - { weight, bodyFat, vo2max, bloodO2 }
 * @property {Object} workout                  - { type, duration, tss, rpe: 1-10, heartRateAvg }
 * @property {string[]} sources                - ['healthkit', 'whoop', 'garmin']
 * @property {string} dataQuality              - 'complete' | 'partial' | 'estimated'
 */

/**
 * @typedef {Object} SupplementAdjustment
 * @property {string} supplementId
 * @property {string} supplementName
 * @property {number} baseDose              - Dose base (g ou mg)
 * @property {number} adjustedDose          - Dose ajustada por biometria
 * @property {number} adjustmentFactor      - Multiplicador (0.8x – 1.4x)
 * @property {string[]} reasons             - Razões do ajuste
 * @property {string} timing               - 'pre-workout' | 'post-workout' | 'morning' | 'night'
 * @property {string} priority              - 'high' | 'normal' | 'low'
 */

/**
 * @typedef {Object} ConnectorConfig
 * @property {string} type                  - 'healthkit' | 'googlefit' | 'whoop' | 'garmin' | 'strava'
 * @property {Object} credentials           - { accessToken, refreshToken, expiresAt }
 * @property {string[]} permissions         - Permissões concedidas pelo usuário
 * @property {boolean} isConnected
 * @property {number} lastSyncedAt
 */

class WearablesEngine {
  constructor() {
    this.connectors = new Map();          // type → ConnectorInstance
    this.healthData = new Map();          // userId → HealthSnapshot[]
    this.connectorConfigs = new Map();    // userId:type → ConnectorConfig
    this.syncSchedule = new Map();        // type → intervalId
    this.SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 horas
  }

  static #instance = null;

  static getInstance() {
    if (!WearablesEngine.#instance) {
      WearablesEngine.#instance = new WearablesEngine();
    }
    return WearablesEngine.#instance;
  }

  /**
   * Inicializar engine (carrega configs, conecta APIs disponíveis)
   */
  async init() {
    console.log('⌚ Inicializando WearablesEngine...');

    const stored = await this._loadFromDB();

    if (stored.connectorConfigs) {
      stored.connectorConfigs.forEach(c => this.connectorConfigs.set(`${c.userId}:${c.type}`, c));
    }

    if (stored.healthData) {
      stored.healthData.forEach(d => {
        const existing = this.healthData.get(d.userId) || [];
        existing.push(d);
        this.healthData.set(d.userId, existing);
      });
    }

    // Detecta plataforma e inicializa connectors disponíveis
    await this._detectAndInitConnectors();

    // Inicia sync scheduler
    this._startSyncScheduler();

    console.log(`✅ WearablesEngine pronto: ${this.connectors.size} connector(s) disponível(is)`);
  }

  /**
   * Conectar plataforma de saúde para um usuário
   * @param {string} userId
   * @param {string} type - 'healthkit' | 'googlefit' | 'whoop' | 'garmin' | 'strava'
   * @param {Object} credentials
   * @returns {Promise<ConnectorConfig>}
   */
  async connectPlatform(userId, type, credentials = {}) {
    const connector = await this._getConnector(type);

    // Solicita permissões necessárias
    const permissions = await connector.requestPermissions();

    // Testa conexão
    const testResult = await connector.testConnection(credentials);

    if (!testResult.success) {
      throw new Error(`Failed to connect to ${type}: ${testResult.error}`);
    }

    const config = {
      userId,
      type,
      credentials,
      permissions,
      isConnected: true,
      lastSyncedAt: null,
      connectedAt: Date.now(),
    };

    this.connectorConfigs.set(`${userId}:${type}`, config);
    await this._saveToDB('connectorConfigs', config);

    // Faz sync inicial
    await this.syncPlatform(userId, type);

    console.log(`✅ ${type} conectado para usuário ${userId}`);

    eventBus.emit('wearables:platformConnected', { userId, type, permissions });

    return config;
  }

  /**
   * Desconectar plataforma
   */
  async disconnectPlatform(userId, type) {
    const key = `${userId}:${type}`;
    const config = this.connectorConfigs.get(key);

    if (config) {
      config.isConnected = false;
      await this._saveToDB('connectorConfigs', config);
    }

    this.connectorConfigs.delete(key);

    // Para sync desta plataforma
    const scheduleKey = `${userId}:${type}`;
    if (this.syncSchedule.has(scheduleKey)) {
      clearInterval(this.syncSchedule.get(scheduleKey));
      this.syncSchedule.delete(scheduleKey);
    }

    eventBus.emit('wearables:platformDisconnected', { userId, type });

    console.log(`🔌 ${type} desconectado para usuário ${userId}`);
  }

  /**
   * Sincronizar dados de uma plataforma específica
   * @param {string} userId
   * @param {string} type
   * @returns {Promise<HealthSnapshot>}
   */
  async syncPlatform(userId, type) {
    const key = `${userId}:${type}`;
    const config = this.connectorConfigs.get(key);

    if (!config || !config.isConnected) {
      throw new Error(`Platform ${type} not connected for user ${userId}`);
    }

    console.log(`🔄 Sincronizando ${type} para ${userId}...`);

    try {
      const connector = await this._getConnector(type, config.credentials);

      // Fetch dados das últimas 24h
      const rawData = await connector.fetchHealthData({
        startDate: Date.now() - 24 * 60 * 60 * 1000,
        endDate: Date.now(),
        metrics: ['recovery', 'sleep', 'activity', 'biometrics', 'workout'],
      });

      // Normaliza para formato unificado HealthSnapshot
      const normalizer = await this._getNormalizer();
      const snapshot = await normalizer.normalize(rawData, type, userId);

      // Armazena snapshot
      const userHistory = this.healthData.get(userId) || [];
      userHistory.unshift(snapshot); // Mais recente primeiro

      // Mantém apenas 90 dias
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const trimmed = userHistory.filter(s => s.timestamp > cutoff);
      this.healthData.set(userId, trimmed);

      // Persiste
      await this._saveToDB('healthData', snapshot);

      // Atualiza config
      config.lastSyncedAt = Date.now();
      await this._saveToDB('connectorConfigs', config);

      eventBus.emit('wearables:dataSynced', {
        userId,
        type,
        snapshot,
        dataQuality: snapshot.dataQuality,
      });

      console.log(`✅ ${type} sincronizado: qualidade=${snapshot.dataQuality}`);

      return snapshot;
    } catch (error) {
      console.error(`❌ Erro sincronizando ${type}:`, error.message);

      eventBus.emit('wearables:syncFailed', { userId, type, error: error.message });

      throw error;
    }
  }

  /**
   * Sincronizar TODAS as plataformas conectadas de um usuário
   * @param {string} userId
   * @returns {Promise<HealthSnapshot>} - Snapshot agregado
   */
  async syncAll(userId) {
    const userConfigs = Array.from(this.connectorConfigs.values())
      .filter(c => c.userId === userId && c.isConnected);

    if (userConfigs.length === 0) {
      console.log(`⚠️ Usuário ${userId} sem plataformas conectadas`);
      return null;
    }

    const snapshots = await Promise.allSettled(
      userConfigs.map(c => this.syncPlatform(userId, c.type))
    );

    const successful = snapshots
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (successful.length === 0) {
      throw new Error('All sync attempts failed');
    }

    // Agrega snapshots de múltiplas fontes
    const aggregated = await this._aggregateSnapshots(userId, successful);

    eventBus.emit('wearables:allSynced', { userId, sources: userConfigs.length, aggregated });

    return aggregated;
  }

  /**
   * Obter dados de saúde mais recentes
   * @param {string} userId
   * @param {number} hours - Janela de tempo (default 24h)
   * @returns {Promise<HealthSnapshot>}
   */
  async getLatestHealthData(userId, hours = 24) {
    const history = this.healthData.get(userId) || [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const recent = history.filter(s => s.timestamp > cutoff);

    if (recent.length === 0) {
      // Tenta sync se não tem dados recentes
      try {
        return await this.syncAll(userId);
      } catch (e) {
        return null;
      }
    }

    // Retorna o mais recente
    return recent[0];
  }

  /**
   * Calcular ajustes de suplemento baseados em dados biométricos
   * Integra com StackRecommender para dosagem personalizada real-time
   * @param {string} userId
   * @returns {Promise<SupplementAdjustment[]>}
   */
  async getSupplementAdjustments(userId) {
    const snapshot = await this.getLatestHealthData(userId);

    if (!snapshot) {
      return []; // Sem dados, sem ajustes
    }

    const stateManager = StateManager.getInstance();
    const userStack = stateManager.getState('myStack') || [];
    const adjustments = [];

    for (const supplement of userStack) {
      const adjustment = await this._calculateAdjustment(supplement, snapshot);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    // Ordena por prioridade
    return adjustments.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });
  }

  /**
   * Calcular score de recuperação para timing de suplementação
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getRecoveryInsights(userId) {
    const snapshot = await this.getLatestHealthData(userId);

    if (!snapshot) {
      return { available: false };
    }

    const recoveryScore = snapshot.recovery?.score ?? null;
    const hrv = snapshot.recovery?.hrv ?? null;
    const sleepQuality = snapshot.sleep?.quality ?? null;
    const strain = snapshot.activity?.strain ?? null;

    return {
      available: true,
      recoveryScore,
      hrv,
      sleepQuality,
      strain,
      recommendation: this._interpretRecovery(recoveryScore, strain),
      supplementTiming: this._getIdealTiming(recoveryScore, strain, snapshot),
      dataSource: snapshot.sources?.join(', '),
      timestamp: snapshot.timestamp,
    };
  }

  /**
   * Obter plataformas conectadas de um usuário
   * @param {string} userId
   * @returns {ConnectorConfig[]}
   */
  getConnectedPlatforms(userId) {
    return Array.from(this.connectorConfigs.values())
      .filter(c => c.userId === userId && c.isConnected);
  }

  /**
   * Histórico de dados de saúde (para gráficos)
   * @param {string} userId
   * @param {number} days
   * @returns {HealthSnapshot[]}
   */
  getHealthHistory(userId, days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const history = this.healthData.get(userId) || [];
    return history
      .filter(s => s.timestamp > cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // === PRIVATE HELPERS ===

  async _detectAndInitConnectors() {
    // Detecta se está em iOS (HealthKit disponível)
    if (window.webkit?.messageHandlers?.healthKit || navigator.userAgent.includes('iOS')) {
      try {
        const HealthKitConnector = (await import('./connectors/healthkit-connector.js')).default;
        this.connectors.set('healthkit', new HealthKitConnector());
        console.log('🍎 HealthKit disponível');
      } catch (e) {
        console.warn('HealthKit não disponível:', e.message);
      }
    }

    // Detecta se está em Android (Google Fit disponível)
    if (navigator.userAgent.includes('Android')) {
      try {
        const GoogleFitConnector = (await import('./connectors/googlefit-connector.js')).default;
        this.connectors.set('googlefit', new GoogleFitConnector());
        console.log('🤖 Google Fit disponível');
      } catch (e) {
        console.warn('Google Fit não disponível:', e.message);
      }
    }

    // Whoop e Garmin disponíveis em qualquer plataforma via OAuth
    const WhoopConnector = (await import('./connectors/whoop-connector.js')).default;
    this.connectors.set('whoop', new WhoopConnector());

    const GarminConnector = (await import('./connectors/garmin-connector.js')).default;
    this.connectors.set('garmin', new GarminConnector());

    const StravaConnector = (await import('./connectors/strava-connector.js')).default;
    this.connectors.set('strava', new StravaConnector());
  }

  async _getConnector(type, credentials = null) {
    let connector = this.connectors.get(type);

    if (!connector) {
      const module = await import(`./connectors/${type}-connector.js`);
      connector = new (module.default || module[`${type}Connector`])();
      this.connectors.set(type, connector);
    }

    if (credentials) {
      connector.setCredentials(credentials);
    }

    return connector;
  }

  async _getNormalizer() {
    const { HealthDataNormalizer } = await import('./health-data-normalizer.js');
    return HealthDataNormalizer.getInstance();
  }

  async _aggregateSnapshots(userId, snapshots) {
    // Agrega dados de múltiplas fontes com prioridade por fonte
    // Prioridade: Whoop (recovery) > Garmin (atividade) > HealthKit (biometrics) > Strava (workouts)
    const priority = { whoop: 4, garmin: 3, healthkit: 2, googlefit: 2, strava: 1 };

    const sorted = snapshots.sort((a, b) =>
      (priority[b.sources?.[0]] || 0) - (priority[a.sources?.[0]] || 0)
    );

    const aggregated = {
      userId,
      timestamp: Date.now(),
      recovery: null,
      sleep: null,
      activity: null,
      biometrics: null,
      workout: null,
      sources: [],
      dataQuality: 'partial',
    };

    // Merge: primeiro ganha (maior prioridade)
    for (const snapshot of sorted) {
      if (!aggregated.recovery && snapshot.recovery) {
        aggregated.recovery = snapshot.recovery;
      }
      if (!aggregated.sleep && snapshot.sleep) {
        aggregated.sleep = snapshot.sleep;
      }
      if (!aggregated.activity && snapshot.activity) {
        aggregated.activity = snapshot.activity;
      }
      if (!aggregated.biometrics && snapshot.biometrics) {
        aggregated.biometrics = snapshot.biometrics;
      }
      if (!aggregated.workout && snapshot.workout) {
        aggregated.workout = snapshot.workout;
      }
      if (snapshot.sources) {
        aggregated.sources.push(...snapshot.sources);
      }
    }

    // Determina qualidade dos dados
    const fields = ['recovery', 'sleep', 'activity', 'biometrics'];
    const filledFields = fields.filter(f => aggregated[f] !== null).length;

    aggregated.dataQuality = filledFields === 4 ? 'complete'
      : filledFields >= 2 ? 'partial'
      : 'minimal';

    return aggregated;
  }

  async _calculateAdjustment(supplement, snapshot) {
    const reasons = [];
    let factor = 1.0;

    const recoveryScore = snapshot.recovery?.score;
    const strain = snapshot.activity?.strain;
    const sleepDuration = snapshot.sleep?.duration;

    // Creatina: aumenta em dias de treino pesado, reduz em dias de descanso
    if (supplement.id?.includes('creatina')) {
      if (strain > 15) {
        factor *= 1.2;
        reasons.push(`Treino intenso (strain ${strain.toFixed(1)}/21) → +20% dose`);
      } else if (strain < 5) {
        factor *= 0.8;
        reasons.push(`Dia de descanso (strain ${strain?.toFixed(1)}/21) → -20% dose`);
      }
    }

    // Proteína/Whey: aumenta baseado em treino e peso
    if (supplement.id?.includes('whey') || supplement.category === 'Proteína') {
      if (snapshot.workout?.rpe >= 8) {
        factor *= 1.15;
        reasons.push(`Treino de alta intensidade (RPE ${snapshot.workout.rpe}/10) → +15% proteína`);
      }
    }

    // Magnésio: aumenta se sono ruim ou recuperação baixa
    if (supplement.id?.includes('magnesio') || supplement.id?.includes('magnesium')) {
      if (sleepDuration < 6 || recoveryScore < 50) {
        factor *= 1.25;
        reasons.push(`Sono insuficiente (${sleepDuration?.toFixed(1)}h) ou recuperação baixa → +25%`);
      }
    }

    // Vitamina D: ajusta baseado em atividade (produção natural no sol)
    if (supplement.id?.includes('vitamina-d') || supplement.id?.includes('vitamin-d')) {
      if (snapshot.activity?.activeMinutes < 30) {
        factor *= 1.2;
        reasons.push(`Baixa atividade ao ar livre → +20% Vitamina D`);
      }
    }

    // Sem ajuste significativo
    if (Math.abs(factor - 1.0) < 0.05 || reasons.length === 0) {
      return null;
    }

    return {
      supplementId: supplement.id,
      supplementName: supplement.name,
      baseDose: supplement.dosage?.daily || 0,
      adjustedDose: Math.round((supplement.dosage?.daily || 0) * factor * 10) / 10,
      adjustmentFactor: Math.round(factor * 100) / 100,
      reasons,
      timing: this._getIdealTimingForSupplement(supplement, snapshot),
      priority: factor > 1.15 || factor < 0.85 ? 'high' : 'normal',
    };
  }

  _interpretRecovery(score, strain) {
    if (score === null && strain === null) {
      return { status: 'unknown', message: 'Dados de recuperação não disponíveis' };
    }

    if (score >= 67) {
      return {
        status: 'optimal',
        message: 'Recuperação ótima. Dia ideal para treino intenso.',
        emoji: '🟢',
      };
    } else if (score >= 34) {
      return {
        status: 'moderate',
        message: 'Recuperação moderada. Treino leve a moderado recomendado.',
        emoji: '🟡',
      };
    } else {
      return {
        status: 'low',
        message: 'Recuperação baixa. Priorize descanso ativo e suplementos de recuperação.',
        emoji: '🔴',
      };
    }
  }

  _getIdealTiming(recoveryScore, strain, snapshot) {
    // Baseado no recovery e na atividade, sugere melhor horário para cada tipo de suplemento
    return {
      preWorkout: recoveryScore >= 50 ? 'Recomendado' : 'Cuidado com estimulantes',
      creatine: 'Qualquer hora (preferência pós-treino)',
      protein: snapshot?.workout ? '30min pós-treino' : 'Manhã ou almoço',
      magnesium: 'Noite, antes de dormir',
      vitaminD: 'Manhã, com refeição gordurosa',
    };
  }

  _getIdealTimingForSupplement(supplement, snapshot) {
    const timings = {
      creatina: 'post-workout',
      whey: snapshot?.workout ? 'post-workout' : 'morning',
      magnesio: 'night',
      'vitamina-d': 'morning',
      cafeina: 'pre-workout',
      'beta-alanina': 'pre-workout',
      'omega-3': 'morning',
    };

    for (const [key, timing] of Object.entries(timings)) {
      if (supplement.id?.includes(key)) return timing;
    }

    return 'morning'; // default
  }

  _startSyncScheduler() {
    // Sincroniza todas as plataformas conectadas a cada 2 horas
    setInterval(async () => {
      console.log('⏰ Sincronização agendada de wearables...');
      const allUserIds = new Set(
        Array.from(this.connectorConfigs.values())
          .filter(c => c.isConnected)
          .map(c => c.userId)
      );

      for (const userId of allUserIds) {
        try {
          await this.syncAll(userId);
        } catch (e) {
          console.error(`Erro no sync agendado para ${userId}:`, e.message);
        }
      }
    }, this.SYNC_INTERVAL_MS);

    console.log(`⏱️ Sync agendado a cada ${this.SYNC_INTERVAL_MS / 3600000}h`);
  }

  async _loadFromDB() {
    return { connectorConfigs: [], healthData: [] };
  }

  async _saveToDB(type, data) {
    // Implementar IndexedDB save
  }
}

export { WearablesEngine };
```

---

### Arquivo 2: `/src/wearables/wearables-engine.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { WearablesEngine } from './wearables-engine.js';

describe('WearablesEngine', () => {
  let engine;

  beforeEach(async () => {
    engine = WearablesEngine.getInstance();
    await engine.init();
  });

  it('should initialize with available connectors', async () => {
    expect(engine.connectors).toBeDefined();
    expect(engine.connectors.size).toBeGreaterThan(0);
  });

  it('should connect a platform successfully', async () => {
    const mockCredentials = { accessToken: 'test-token' };
    const config = await engine.connectPlatform('user-1', 'whoop', mockCredentials);

    expect(config).toHaveProperty('userId', 'user-1');
    expect(config).toHaveProperty('type', 'whoop');
    expect(config).toHaveProperty('isConnected', true);
  });

  it('should sync platform and return HealthSnapshot', async () => {
    const snapshot = await engine.syncPlatform('user-1', 'whoop');

    expect(snapshot).toHaveProperty('userId', 'user-1');
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('sources');
    expect(snapshot.sources).toContain('whoop');
  });

  it('should return health data within time window', async () => {
    const data = await engine.getLatestHealthData('user-1', 24);

    if (data) {
      expect(data).toHaveProperty('recovery');
      expect(data).toHaveProperty('sleep');
      expect(data).toHaveProperty('activity');
    }
  });

  it('should calculate supplement adjustments based on biometrics', async () => {
    const adjustments = await engine.getSupplementAdjustments('user-1');

    expect(Array.isArray(adjustments)).toBe(true);

    adjustments.forEach(adj => {
      expect(adj).toHaveProperty('supplementId');
      expect(adj).toHaveProperty('baseDose');
      expect(adj).toHaveProperty('adjustedDose');
      expect(adj).toHaveProperty('adjustmentFactor');
      expect(adj).toHaveProperty('reasons');
      expect(adj.reasons.length).toBeGreaterThan(0);
    });
  });

  it('should provide recovery insights', async () => {
    const insights = await engine.getRecoveryInsights('user-1');

    if (insights.available) {
      expect(insights).toHaveProperty('recoveryScore');
      expect(insights).toHaveProperty('recommendation');
      expect(insights).toHaveProperty('supplementTiming');
    }
  });

  it('should list connected platforms for a user', () => {
    const platforms = engine.getConnectedPlatforms('user-1');

    expect(Array.isArray(platforms)).toBe(true);
    platforms.forEach(p => {
      expect(p).toHaveProperty('type');
      expect(p).toHaveProperty('isConnected', true);
    });
  });

  it('should disconnect platform', async () => {
    await engine.disconnectPlatform('user-1', 'whoop');
    const platforms = engine.getConnectedPlatforms('user-1');
    const whoop = platforms.find(p => p.type === 'whoop');

    expect(whoop).toBeUndefined();
  });

  it('should return health history for charting', () => {
    const history = engine.getHealthHistory('user-1', 30);

    expect(Array.isArray(history)).toBe(true);
    // Deve estar ordenado por timestamp (mais antigo primeiro)
    for (let i = 1; i < history.length; i++) {
      expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i - 1].timestamp);
    }
  });

  it('should interpret recovery scores correctly', () => {
    const optimal = engine._interpretRecovery(75, 10);
    expect(optimal.status).toBe('optimal');
    expect(optimal.emoji).toBe('🟢');

    const moderate = engine._interpretRecovery(50, 12);
    expect(moderate.status).toBe('moderate');

    const low = engine._interpretRecovery(25, 18);
    expect(low.status).toBe('low');
    expect(low.emoji).toBe('🔴');
  });
});
```

---

## CHECKLIST TASK 1.1

- [ ] WearablesEngine classe completa com Singleton
- [ ] Connectors para 5 plataformas (HealthKit, Google Fit, Whoop, Garmin, Strava)
- [ ] Detecção automática de plataforma (iOS vs Android vs Web)
- [ ] Normalização de dados heterogêneos (HealthDataNormalizer)
- [ ] Aggregação de múltiplas fontes com hierarquia de prioridade
- [ ] Cálculo de ajustes de suplemento baseado em biometria real
- [ ] Recovery insights (HRV, sono, strain)
- [ ] Timing ideal de suplementação por dados do dia
- [ ] Sincronização automática a cada 2 horas
- [ ] Persistência de histórico em IndexedDB (90 dias)
- [ ] Disconnect gracioso com cleanup de schedule
- [ ] Testes unitários completos
- [ ] Performance <200ms para getLatestHealthData()
- [ ] Fallback elegante sem wearable (sem crash)
- [ ] EventBus para reatividade em toda a aplicação

```

---

# **PROMPT 14.2: RepurchaseEngine — Predição Inteligente de Reposição**

```javascript
/**
 * RepurchaseEngine v1.0
 * Smart repurchase prediction, stock monitoring and opportunity alerts
 * Integrates with WearablesEngine (real consumption) + MarketplaceEngine (best price)
 */

import { EventBus } from '../core/event-bus.js';
import { MarketplaceEngine } from '../marketplace/marketplace-engine.js';
import { WearablesEngine } from '../wearables/wearables-engine.js';
import { StateManager } from '../core/state-manager.js';

const eventBus = EventBus.getInstance();

/**
 * @typedef {Object} StockItem
 * @property {string} supplementId
 * @property {string} supplementName
 * @property {number} quantityGrams       - Quantidade atual (gramas)
 * @property {number} dailyDoseGrams      - Dose diária (gramas)
 * @property {number} adherenceRate       - Taxa de aderência real 0-1
 * @property {number} daysRemaining       - Dias até acabar (projeção)
 * @property {Date} projectedRunoutDate   - Data prevista de término
 * @property {string} status              - 'ok' | 'low' | 'critical' | 'out'
 * @property {number} lastPurchaseDate    - Unix ms
 * @property {number} purchaseCycleAvg   - Média de dias entre compras
 */

/**
 * @typedef {Object} RepurchaseOpportunity
 * @property {string} supplementId
 * @property {string} supplementName
 * @property {number} daysRemaining
 * @property {number} urgencyScore        - 0-100
 * @property {Object} bestOffer           - Offer do MarketplaceEngine
 * @property {number} priceTrend          - % variação últimos 7 dias
 * @property {string} recommendation      - 'buy_now' | 'wait' | 'stock_up'
 * @property {string} reason
 */

class RepurchaseEngine {
  constructor() {
    this.stockItems = new Map();         // supplementId → StockItem
    this.purchaseHistory = new Map();    // userId:supplementId → Purchase[]
    this.activeAlerts = new Map();       // supplementId → AlertConfig
    this.predictions = new Map();        // supplementId → PredictionData
  }

  static #instance = null;

  static getInstance() {
    if (!RepurchaseEngine.#instance) {
      RepurchaseEngine.#instance = new RepurchaseEngine();
    }
    return RepurchaseEngine.#instance;
  }

  async init() {
    console.log('🔁 Inicializando RepurchaseEngine...');

    const stored = await this._loadFromDB();

    if (stored.stockItems) {
      stored.stockItems.forEach(s => this.stockItems.set(s.supplementId, s));
    }

    if (stored.purchaseHistory) {
      stored.purchaseHistory.forEach(h =>
        this.purchaseHistory.set(`${h.userId}:${h.supplementId}`, h.purchases)
      );
    }

    // Inicia monitoramento a cada 6 horas
    this._startMonitoring();

    console.log(`✅ RepurchaseEngine pronto: ${this.stockItems.size} item(s) monitorado(s)`);
  }

  /**
   * Registrar item no estoque (quando usuário adiciona ao My Stack)
   * @param {string} userId
   * @param {Object} supplement - { id, name, quantityGrams, dailyDoseGrams }
   */
  async addStockItem(userId, supplement) {
    const item = {
      userId,
      supplementId: supplement.id,
      supplementName: supplement.name,
      quantityGrams: supplement.quantityGrams || 0,
      dailyDoseGrams: supplement.dailyDoseGrams || supplement.dosage?.daily || 5,
      adherenceRate: 1.0, // Assume 100% no início
      purchaseCycleAvg: null,
      lastPurchaseDate: supplement.purchaseDate || Date.now(),
      addedAt: Date.now(),
    };

    // Calcula projeção inicial
    item.daysRemaining = this._calculateDaysRemaining(item);
    item.projectedRunoutDate = new Date(Date.now() + item.daysRemaining * 24 * 60 * 60 * 1000);
    item.status = this._classifyStatus(item.daysRemaining);

    this.stockItems.set(`${userId}:${supplement.id}`, item);
    await this._saveToDB('stockItems', item);

    // Configura alerta automático
    await this.setRepurchaseAlert(userId, supplement.id);

    eventBus.emit('repurchase:itemAdded', item);

    return item;
  }

  /**
   * Atualizar estoque após check-in diário ou pesagem real
   * @param {string} userId
   * @param {string} supplementId
   * @param {Object} update - { quantityGrams, adherenceRate }
   */
  async updateStock(userId, supplementId, update) {
    const key = `${userId}:${supplementId}`;
    const item = this.stockItems.get(key);

    if (!item) {
      throw new Error(`Stock item ${supplementId} not found for user ${userId}`);
    }

    if (update.quantityGrams !== undefined) {
      item.quantityGrams = update.quantityGrams;
    }

    if (update.adherenceRate !== undefined) {
      item.adherenceRate = update.adherenceRate;
    }

    // Recalcula com dados de wearable (consumo real ajustado por treino)
    const wearables = WearablesEngine.getInstance();
    const healthData = await wearables.getLatestHealthData(userId).catch(() => null);

    if (healthData) {
      const adjustments = await wearables.getSupplementAdjustments(userId);
      const adj = adjustments.find(a => a.supplementId === supplementId);
      if (adj) {
        item.dailyDoseGrams = adj.adjustedDose;
      }
    }

    item.daysRemaining = this._calculateDaysRemaining(item);
    item.projectedRunoutDate = new Date(Date.now() + item.daysRemaining * 24 * 60 * 60 * 1000);
    item.status = this._classifyStatus(item.daysRemaining);

    await this._saveToDB('stockItems', item);

    // Dispara alerta se status mudou para crítico
    if (item.status === 'critical' || item.status === 'out') {
      eventBus.emit('repurchase:stockCritical', { userId, item });
    }

    return item;
  }

  /**
   * Registrar compra (reseta contagem)
   * @param {string} userId
   * @param {string} supplementId
   * @param {Object} purchase - { quantityGrams, price, storeId }
   */
  async recordPurchase(userId, supplementId, purchase) {
    const key = `${userId}:${supplementId}`;
    const item = this.stockItems.get(key);

    if (item) {
      // Calcula ciclo médio de compra
      const historyKey = `${userId}:${supplementId}`;
      const history = this.purchaseHistory.get(historyKey) || [];

      if (history.length > 0) {
        const lastPurchase = history[history.length - 1];
        const cycleDays = (Date.now() - lastPurchase.timestamp) / (24 * 60 * 60 * 1000);
        const cycles = history.map((h, i) =>
          i > 0 ? (h.timestamp - history[i - 1].timestamp) / (24 * 60 * 60 * 1000) : cycleDays
        );
        item.purchaseCycleAvg = cycles.reduce((a, b) => a + b, 0) / cycles.length;
      }

      // Adiciona ao estoque
      item.quantityGrams += purchase.quantityGrams;
      item.lastPurchaseDate = Date.now();
      item.daysRemaining = this._calculateDaysRemaining(item);
      item.status = this._classifyStatus(item.daysRemaining);

      await this._saveToDB('stockItems', item);
    }

    // Registra no histórico
    const historyKey = `${userId}:${supplementId}`;
    const history = this.purchaseHistory.get(historyKey) || [];
    history.push({ ...purchase, timestamp: Date.now() });
    this.purchaseHistory.set(historyKey, history);

    eventBus.emit('repurchase:purchaseRecorded', {
      userId,
      supplementId,
      purchase,
      newQuantity: item?.quantityGrams,
    });

    return { success: true, newDaysRemaining: item?.daysRemaining };
  }

  /**
   * Obter todas as oportunidades de reposição
   * (Integra com MarketplaceEngine para melhor preço atual)
   * @param {string} userId
   * @returns {Promise<RepurchaseOpportunity[]>}
   */
  async getRepurchaseOpportunities(userId) {
    const marketplace = MarketplaceEngine.getInstance();
    const userItems = Array.from(this.stockItems.values())
      .filter(i => i.userId === userId);

    const opportunities = [];

    for (const item of userItems) {
      if (item.daysRemaining > 30) continue; // Só alerta quando <30 dias

      try {
        const bestOffer = await marketplace.findBestPrice(item.supplementId);
        const priceHistory = await marketplace.getPriceHistory(item.supplementId, null, 7);
        const priceTrend = this._calculatePriceTrend(priceHistory);

        const urgencyScore = this._calculateUrgencyScore(item.daysRemaining, priceTrend);
        const recommendation = this._getRecommendation(item.daysRemaining, priceTrend);

        opportunities.push({
          supplementId: item.supplementId,
          supplementName: item.supplementName,
          daysRemaining: item.daysRemaining,
          status: item.status,
          urgencyScore,
          bestOffer,
          priceTrend,
          recommendation: recommendation.action,
          reason: recommendation.reason,
        });
      } catch (error) {
        // Se não tem preço no marketplace, inclui sem oferta
        opportunities.push({
          supplementId: item.supplementId,
          supplementName: item.supplementName,
          daysRemaining: item.daysRemaining,
          status: item.status,
          urgencyScore: this._calculateUrgencyScore(item.daysRemaining, 0),
          bestOffer: null,
          priceTrend: 0,
          recommendation: item.daysRemaining <= 5 ? 'buy_now' : 'monitor',
          reason: 'Preço não disponível no momento',
        });
      }
    }

    // Ordena por urgência
    return opportunities.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }

  /**
   * Configurar alerta de reposição para um suplemento
   * @param {string} userId
   * @param {string} supplementId
   * @param {number} daysBeforeAlert - Default: 5 dias antes de acabar
   */
  async setRepurchaseAlert(userId, supplementId, daysBeforeAlert = 5) {
    const alertKey = `${userId}:${supplementId}`;

    const alertConfig = {
      userId,
      supplementId,
      daysBeforeAlert,
      isActive: true,
      notificationChannels: ['push', 'in-app'],
      createdAt: Date.now(),
    };

    this.activeAlerts.set(alertKey, alertConfig);
    await this._saveToDB('alerts', alertConfig);

    return alertConfig;
  }

  /**
   * Obter resumo do estoque (para Dashboard)
   * @param {string} userId
   */
  getStockSummary(userId) {
    const items = Array.from(this.stockItems.values()).filter(i => i.userId === userId);

    return {
      total: items.length,
      ok: items.filter(i => i.status === 'ok').length,
      low: items.filter(i => i.status === 'low').length,
      critical: items.filter(i => i.status === 'critical').length,
      out: items.filter(i => i.status === 'out').length,
      items: items.sort((a, b) => a.daysRemaining - b.daysRemaining),
    };
  }

  // === PRIVATE ===

  _calculateDaysRemaining(item) {
    if (item.quantityGrams <= 0) return 0;
    const effectiveDailyDose = item.dailyDoseGrams * item.adherenceRate;
    if (effectiveDailyDose <= 0) return 999;
    return Math.floor(item.quantityGrams / effectiveDailyDose);
  }

  _classifyStatus(daysRemaining) {
    if (daysRemaining <= 0) return 'out';
    if (daysRemaining <= 5) return 'critical';
    if (daysRemaining <= 14) return 'low';
    return 'ok';
  }

  _calculatePriceTrend(priceHistory) {
    if (!priceHistory || priceHistory.length < 2) return 0;

    const allPoints = priceHistory.flatMap(h => h.history || []);
    if (allPoints.length < 2) return 0;

    const sorted = allPoints.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0].price;
    const last = sorted[sorted.length - 1].price;

    return ((last - first) / first) * 100; // % mudança
  }

  _calculateUrgencyScore(daysRemaining, priceTrend) {
    let score = 0;

    // Urgência por dias restantes (0–70 pontos)
    if (daysRemaining <= 0) score += 70;
    else if (daysRemaining <= 3) score += 60;
    else if (daysRemaining <= 5) score += 50;
    else if (daysRemaining <= 10) score += 35;
    else if (daysRemaining <= 20) score += 20;
    else score += 5;

    // Urgência por tendência de preço (0–30 pontos)
    // Preço subindo = mais urgente comprar agora
    if (priceTrend > 10) score += 30;
    else if (priceTrend > 5) score += 20;
    else if (priceTrend < -10) score -= 10; // Preço caindo = pode esperar

    return Math.max(0, Math.min(100, score));
  }

  _getRecommendation(daysRemaining, priceTrend) {
    if (daysRemaining <= 3) {
      return { action: 'buy_now', reason: 'Estoque crítico — menos de 3 dias restantes' };
    }

    if (daysRemaining <= 7 && priceTrend > 5) {
      return { action: 'buy_now', reason: 'Estoque baixo + preço subindo. Compre agora.' };
    }

    if (daysRemaining <= 14 && priceTrend < -5) {
      return { action: 'wait', reason: 'Estoque baixo mas preço caindo. Aguarde 2-3 dias.' };
    }

    if (daysRemaining <= 20 && priceTrend > 10) {
      return { action: 'stock_up', reason: 'Preço alto pode subir mais. Considere estoque duplo.' };
    }

    if (daysRemaining <= 14) {
      return { action: 'buy_soon', reason: `Você tem ${daysRemaining} dias. Planeje a reposição.` };
    }

    return { action: 'monitor', reason: 'Estoque adequado. Continue monitorando.' };
  }

  _startMonitoring() {
    setInterval(async () => {
      await this._checkAllAlerts();
    }, 6 * 60 * 60 * 1000); // 6 horas

    // Check imediato após 1 minuto
    setTimeout(() => this._checkAllAlerts(), 60 * 1000);
  }

  async _checkAllAlerts() {
    for (const [key, alert] of this.activeAlerts) {
      if (!alert.isActive) continue;

      const item = this.stockItems.get(key);
      if (!item) continue;

      if (item.daysRemaining <= alert.daysBeforeAlert) {
        eventBus.emit('repurchase:alertTriggered', {
          userId: alert.userId,
          supplementId: alert.supplementId,
          daysRemaining: item.daysRemaining,
          status: item.status,
        });
      }
    }
  }

  async _loadFromDB() {
    return { stockItems: [], purchaseHistory: [], alerts: [] };
  }

  async _saveToDB(type, data) {
    // Implementar IndexedDB save
  }
}

export { RepurchaseEngine };
```

---

# **PROMPT 14.3: NotificationManager — Push & Scheduling Inteligente**

```javascript
/**
 * NotificationManager v1.0
 * Multi-channel notifications: Push, in-app, email, SMS
 * Smart scheduling based on user behavior and timezone
 */

import { EventBus } from '../core/event-bus.js';

const eventBus = EventBus.getInstance();

/**
 * @typedef {Object} NotificationConfig
 * @property {string} id
 * @property {string} userId
 * @property {string} type                - 'checkin' | 'repurchase' | 'price_alert' | 'streak' | 'challenge'
 * @property {string} channel             - 'push' | 'in-app' | 'email' | 'sms'
 * @property {string} title
 * @property {string} body
 * @property {Object} data                - Payload extra
 * @property {number} scheduledAt         - Unix ms (quando enviar)
 * @property {boolean} sent
 * @property {number} sentAt              - Unix ms
 * @property {string} status              - 'pending' | 'sent' | 'failed' | 'cancelled'
 */

class NotificationManager {
  constructor() {
    this.queue = [];                       // NotificationConfig[] ordenado por scheduledAt
    this.userPreferences = new Map();      // userId → UserNotifPreferences
    this.sent = new Map();                 // notifId → NotificationConfig
    this.fcmToken = null;
    this.apnsToken = null;
    this.permissionGranted = false;
  }

  static #instance = null;

  static getInstance() {
    if (!NotificationManager.#instance) {
      NotificationManager.#instance = new NotificationManager();
    }
    return NotificationManager.#instance;
  }

  async init() {
    console.log('🔔 Inicializando NotificationManager...');

    // Solicita permissão de push
    await this._requestPushPermission();

    // Registra Service Worker para push
    await this._registerServiceWorker();

    // Ouve eventos de outros engines
    this._listenToEngineEvents();

    // Inicia processador de fila
    this._startQueueProcessor();

    console.log(`✅ NotificationManager pronto. Push: ${this.permissionGranted ? '✅' : '❌'}`);
  }

  /**
   * Agendar notificação de check-in diário
   * @param {string} userId
   * @param {string} preferredTime - 'HH:MM' (ex: '07:30')
   */
  async scheduleCheckinReminder(userId, preferredTime = '07:30') {
    const [hours, minutes] = preferredTime.split(':').map(Number);

    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Se já passou hoje, agenda para amanhã
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    return this.scheduleNotification(userId, {
      type: 'checkin',
      title: '💊 Hora dos seus suplementos!',
      body: 'Não esqueça de registrar seu check-in de hoje.',
      data: { action: 'open_checkin', userId },
      scheduledAt: scheduledDate.getTime(),
      repeat: 'daily',
    });
  }

  /**
   * Disparar alerta de reposição imediato
   * @param {string} userId
   * @param {Object} item - StockItem
   * @param {Object} offer - Melhor oferta do marketplace
   */
  async sendRepurchaseAlert(userId, item, offer = null) {
    const urgencyEmoji = item.status === 'critical' ? '🚨' : '⚠️';
    const body = offer
      ? `Melhor preço agora: R$ ${offer.price?.toFixed(2)} em ${offer.storeName}. Compre antes que acabe!`
      : `Você tem apenas ${item.daysRemaining} dias de estoque. Hora de reabastecer!`;

    return this.scheduleNotification(userId, {
      type: 'repurchase',
      title: `${urgencyEmoji} ${item.supplementName} acabando em ${item.daysRemaining} dias`,
      body,
      data: {
        action: 'open_repurchase',
        supplementId: item.supplementId,
        offerId: offer?.storeId,
        affiliateLink: offer?.affiliateLink,
      },
      scheduledAt: Date.now(), // Imediato
    });
  }

  /**
   * Disparar alerta de preço atingido
   * @param {string} userId
   * @param {Object} alert - PriceAlert config
   * @param {Object} offer - Oferta que atingiu o alvo
   */
  async sendPriceAlert(userId, alert, offer) {
    return this.scheduleNotification(userId, {
      type: 'price_alert',
      title: '🏷️ Meta de preço atingida!',
      body: `${alert.supplementName} está por R$ ${offer.price?.toFixed(2)} em ${offer.storeName} — você queria R$ ${alert.targetPrice?.toFixed(2)}!`,
      data: {
        action: 'open_product',
        supplementId: alert.supplementId,
        affiliateLink: offer?.affiliateLink,
      },
      scheduledAt: Date.now(),
    });
  }

  /**
   * Notificar quebra de streak
   * @param {string} userId
   * @param {number} streakDays
   */
  async sendStreakWarning(userId, streakDays) {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(21, 0, 0, 0); // 21h aviso de streak

    return this.scheduleNotification(userId, {
      type: 'streak',
      title: `🔥 Não quebre seu streak de ${streakDays} dias!`,
      body: 'Você ainda não fez check-in hoje. Restam algumas horas!',
      data: { action: 'open_checkin', streakDays },
      scheduledAt: endOfDay <= now ? endOfDay.getTime() + 86400000 : endOfDay.getTime(),
    });
  }

  /**
   * Agendar uma notificação (genérico)
   * @param {string} userId
   * @param {Object} config
   * @returns {Promise<NotificationConfig>}
   */
  async scheduleNotification(userId, config) {
    const prefs = this.userPreferences.get(userId) || { enabled: true, channels: ['push', 'in-app'] };

    if (!prefs.enabled) {
      console.log(`⏭️ Notificações desativadas para ${userId}`);
      return null;
    }

    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId,
      type: config.type,
      channel: prefs.channels[0] || 'in-app',
      title: config.title,
      body: config.body,
      data: config.data || {},
      scheduledAt: config.scheduledAt || Date.now(),
      repeat: config.repeat || null,
      sent: false,
      sentAt: null,
      status: 'pending',
      createdAt: Date.now(),
    };

    // Insere na fila ordenada por scheduledAt
    const insertIdx = this.queue.findIndex(n => n.scheduledAt > notif.scheduledAt);
    if (insertIdx === -1) {
      this.queue.push(notif);
    } else {
      this.queue.splice(insertIdx, 0, notif);
    }

    await this._saveToDB('notifications', notif);

    return notif;
  }

  /**
   * Enviar notificação imediatamente
   * @param {NotificationConfig} notif
   */
  async sendImmediate(notif) {
    try {
      if (notif.channel === 'push' && this.permissionGranted) {
        await this._sendPushNotification(notif);
      } else {
        await this._sendInAppNotification(notif);
      }

      notif.sent = true;
      notif.sentAt = Date.now();
      notif.status = 'sent';

      this.sent.set(notif.id, notif);

      eventBus.emit('notification:sent', notif);

      return { success: true, notifId: notif.id };
    } catch (error) {
      notif.status = 'failed';
      eventBus.emit('notification:failed', { notif, error: error.message });
      throw error;
    }
  }

  /**
   * Atualizar preferências de notificação do usuário
   * @param {string} userId
   * @param {Object} preferences
   */
  async updatePreferences(userId, preferences) {
    const current = this.userPreferences.get(userId) || {
      enabled: true,
      channels: ['push', 'in-app'],
      checkinTime: '07:30',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      types: {
        checkin: true,
        repurchase: true,
        price_alert: true,
        streak: true,
        challenge: true,
      },
    };

    const updated = { ...current, ...preferences };
    this.userPreferences.set(userId, updated);
    await this._saveToDB('userPreferences', { userId, ...updated });

    eventBus.emit('notification:preferencesUpdated', { userId, preferences: updated });

    return updated;
  }

  /**
   * Cancelar notificações pendentes de um tipo
   */
  async cancelByType(userId, type) {
    this.queue = this.queue.filter(n => !(n.userId === userId && n.type === type));
    eventBus.emit('notification:cancelled', { userId, type });
  }

  // === PRIVATE ===

  async _requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Push notifications não suportadas neste browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      this.permissionGranted = false;
      return false;
    }

    // Solicita permissão
    const permission = await Notification.requestPermission();
    this.permissionGranted = permission === 'granted';

    return this.permissionGranted;
  }

  async _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      // Registra para push (requer VAPID key em produção)
      console.log('✅ Service Worker pronto para push');
    } catch (error) {
      console.warn('Service Worker push registration failed:', error.message);
    }
  }

  _listenToEngineEvents() {
    // Responde automaticamente a eventos dos outros engines
    eventBus.on('repurchase:alertTriggered', async ({ userId, supplementId, daysRemaining, status }) => {
      const item = { supplementName: supplementId, daysRemaining, status };
      await this.sendRepurchaseAlert(userId, item);
    });

    eventBus.on('alert:priceReached', async ({ userId, alert, bestOffer }) => {
      await this.sendPriceAlert(userId, alert, bestOffer);
    });

    eventBus.on('gamification:streakAtRisk', async ({ userId, streakDays }) => {
      await this.sendStreakWarning(userId, streakDays);
    });
  }

  _startQueueProcessor() {
    // Processa fila a cada minuto
    setInterval(async () => {
      const now = Date.now();
      const due = this.queue.filter(n => n.scheduledAt <= now && !n.sent);

      for (const notif of due) {
        try {
          await this.sendImmediate(notif);

          // Se é repetível, re-agenda
          if (notif.repeat === 'daily') {
            notif.scheduledAt += 24 * 60 * 60 * 1000;
            notif.sent = false;
            notif.status = 'pending';
          } else {
            // Remove da fila
            this.queue = this.queue.filter(n => n.id !== notif.id);
          }
        } catch (e) {
          console.error(`Erro enviando notif ${notif.id}:`, e.message);
        }
      }
    }, 60 * 1000);
  }

  _isQuietHours(userId) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs?.quietHoursStart) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes > endMinutes) {
      // Atravessa meia-noite (ex: 22:00 – 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  async _sendPushNotification(notif) {
    // Em produção: envia via FCM ou APNs via Service Worker
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(notif.title, {
        body: notif.body,
        data: notif.data,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: notif.type, // Agrupa notifs do mesmo tipo
        renotify: true,
      });

      notification.onclick = () => {
        window.focus();
        eventBus.emit('notification:clicked', notif);
      };
    }
  }

  async _sendInAppNotification(notif) {
    eventBus.emit('notification:inApp', notif);
  }

  async _loadFromDB() {
    return {};
  }

  async _saveToDB(type, data) {
    // Implementar IndexedDB save
  }
}

export { NotificationManager };
```

---

# **PROMPT 14.4: HealthDashboard — Painel Unificado de Saúde**

```javascript
/**
 * HealthDashboard v1.0
 * Unified health dashboard: biometrics, supplement correlation, trends
 * Integrates WearablesEngine + RepurchaseEngine + MarketplaceEngine
 */

import { WearablesEngine } from '../wearables/wearables-engine.js';
import { RepurchaseEngine } from './repurchase-engine.js';
import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';

const eventBus = EventBus.getInstance();

class HealthDashboard {
  constructor() {
    this.wearables = WearablesEngine.getInstance();
    this.repurchase = RepurchaseEngine.getInstance();
    this.cache = new Map(); // userId → cachedDashboard (TTL: 30min)
    this.CACHE_TTL = 30 * 60 * 1000;
  }

  static #instance = null;

  static getInstance() {
    if (!HealthDashboard.#instance) {
      HealthDashboard.#instance = new HealthDashboard();
    }
    return HealthDashboard.#instance;
  }

  /**
   * Obter dashboard completo de saúde para o usuário
   * @param {string} userId
   * @param {boolean} forceRefresh
   */
  async getDashboard(userId, forceRefresh = false) {
    const cached = this.cache.get(userId);
    if (!forceRefresh && cached && (Date.now() - cached.generatedAt) < this.CACHE_TTL) {
      return cached.data;
    }

    const [
      latestHealth,
      healthHistory,
      recoveryInsights,
      supplementAdjustments,
      stockSummary,
      repurchaseOpportunities,
    ] = await Promise.all([
      this.wearables.getLatestHealthData(userId),
      this.wearables.getHealthHistory(userId, 30),
      this.wearables.getRecoveryInsights(userId),
      this.wearables.getSupplementAdjustments(userId),
      this.repurchase.getStockSummary(userId),
      this.repurchase.getRepurchaseOpportunities(userId),
    ]);

    const stateManager = StateManager.getInstance();
    const checkins = stateManager.getState('checkins') || [];
    const myStack = stateManager.getState('myStack') || [];

    const dashboard = {
      userId,
      generatedAt: Date.now(),

      // Recovery & biometrics
      recovery: {
        current: latestHealth?.recovery || null,
        insights: recoveryInsights,
        trend: this._calculateTrend(healthHistory, 'recovery.score'),
      },

      // Sleep
      sleep: {
        lastNight: latestHealth?.sleep || null,
        average7Days: this._averageField(healthHistory.slice(-7), 'sleep.duration'),
        trend: this._calculateTrend(healthHistory, 'sleep.quality'),
      },

      // Activity
      activity: {
        today: latestHealth?.activity || null,
        weeklySteps: healthHistory.slice(-7).reduce((sum, h) => sum + (h.activity?.steps || 0), 0),
        trend: this._calculateTrend(healthHistory, 'activity.strain'),
      },

      // Supplement intelligence
      supplements: {
        stackSize: myStack.length,
        adjustmentsNeeded: supplementAdjustments,
        adherenceLast7Days: this._calculateAdherence(checkins, 7),
        adherenceLast30Days: this._calculateAdherence(checkins, 30),
      },

      // Stock & repurchase
      stock: {
        summary: stockSummary,
        urgentOpportunities: repurchaseOpportunities.filter(o => o.urgencyScore >= 50),
        allOpportunities: repurchaseOpportunities,
      },

      // Wearable connections
      devices: {
        connected: this.wearables.getConnectedPlatforms(userId),
        dataQuality: latestHealth?.dataQuality || 'unavailable',
      },

      // Correlations (supplement → biometrics)
      correlations: this._calculateCorrelations(checkins, healthHistory),
    };

    // Cache
    this.cache.set(userId, { data: dashboard, generatedAt: Date.now() });

    eventBus.emit('dashboard:generated', { userId, dataQuality: dashboard.devices.dataQuality });

    return dashboard;
  }

  /**
   * Calcular correlação entre adesão de suplemento e métrica de saúde
   * Ex: "Usuários que tomam creatina regularmente têm +15% de força"
   */
  _calculateCorrelations(checkins, healthHistory) {
    if (checkins.length < 14 || healthHistory.length < 14) {
      return { available: false, reason: 'Dados insuficientes (mínimo 14 dias)' };
    }

    const correlations = [];

    // Correlação: adesão de suplementos × qualidade do sono
    const highAdherenceDays = checkins.filter(c => c.completionRate >= 0.8);
    const lowAdherenceDays = checkins.filter(c => c.completionRate < 0.5);

    if (highAdherenceDays.length >= 7 && lowAdherenceDays.length >= 7) {
      const highSleep = this._avgSleepForDays(highAdherenceDays, healthHistory);
      const lowSleep = this._avgSleepForDays(lowAdherenceDays, healthHistory);

      if (highSleep && lowSleep) {
        const diff = ((highSleep - lowSleep) / lowSleep) * 100;
        if (Math.abs(diff) > 5) {
          correlations.push({
            metric: 'sleep_quality',
            insight: diff > 0
              ? `Nos dias com boa adesão, sua qualidade de sono é ${diff.toFixed(0)}% melhor`
              : `Baixa adesão correlaciona com ${Math.abs(diff).toFixed(0)}% menos qualidade de sono`,
            confidence: 'moderate',
            diff,
          });
        }
      }
    }

    return {
      available: correlations.length > 0,
      correlations,
      note: 'Correlações baseadas nos seus dados pessoais. Não é diagnóstico médico.',
    };
  }

  _calculateTrend(history, fieldPath) {
    if (history.length < 7) return { direction: 'stable', change: 0 };

    const getField = (obj, path) =>
      path.split('.').reduce((o, k) => o?.[k], obj);

    const recent7 = history.slice(-7).map(h => getField(h, fieldPath)).filter(Boolean);
    const prev7 = history.slice(-14, -7).map(h => getField(h, fieldPath)).filter(Boolean);

    if (recent7.length < 3 || prev7.length < 3) return { direction: 'stable', change: 0 };

    const avgRecent = recent7.reduce((a, b) => a + b, 0) / recent7.length;
    const avgPrev = prev7.reduce((a, b) => a + b, 0) / prev7.length;
    const change = ((avgRecent - avgPrev) / avgPrev) * 100;

    return {
      direction: change > 3 ? 'up' : change < -3 ? 'down' : 'stable',
      change: Math.round(change * 10) / 10,
    };
  }

  _averageField(items, path) {
    const values = items.map(item => {
      return path.split('.').reduce((o, k) => o?.[k], item);
    }).filter(v => v !== null && v !== undefined);

    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  _calculateAdherence(checkins, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const relevant = checkins.filter(c => c.date > cutoff);

    if (relevant.length === 0) return null;

    const avg = relevant.reduce((sum, c) => sum + (c.completionRate || 0), 0) / relevant.length;
    return Math.round(avg * 100);
  }

  _avgSleepForDays(checkinDays, healthHistory) {
    const dates = checkinDays.map(c => new Date(c.date).toDateString());
    const relevant = healthHistory.filter(h =>
      dates.includes(new Date(h.timestamp).toDateString())
    );
    return this._averageField(relevant, 'sleep.quality');
  }
}

export { HealthDashboard };
```

---

# **CHECKLIST FINAL SPRINT 14**

- [ ] WearablesEngine com 5 connectors (HealthKit, Google Fit, Whoop, Garmin, Strava)
- [ ] Detecção automática de plataforma (iOS vs Android vs Web)
- [ ] HealthDataNormalizer para dados heterogêneos
- [ ] Aggregação multi-fonte com hierarquia de prioridade
- [ ] Cálculo de ajuste de dosagem baseado em biometria real
- [ ] Sincronização automática a cada 2 horas
- [ ] Histórico de 90 dias em IndexedDB
- [ ] RepurchaseEngine com monitoramento de estoque
- [ ] Predição de data de término baseada em consumo real
- [ ] Integração com WearablesEngine (dosagem ajustada por treino)
- [ ] Oportunidades de reposição com análise de tendência de preço
- [ ] Integração com MarketplaceEngine (melhor oferta + link afiliado)
- [ ] Alerta configurável (D-N dias antes de acabar)
- [ ] Histórico de compras com ciclo médio calculado
- [ ] NotificationManager multi-canal (push, in-app, email, SMS)
- [ ] Scheduling inteligente com horário silencioso
- [ ] Alerta de check-in diário recorrente
- [ ] Alerta de reposição automático via EventBus
- [ ] Alerta de streak em risco (21h se não fez check-in)
- [ ] Respeita preferências de horário e canal por usuário
- [ ] HealthDashboard unificado (recovery + sleep + activity + stock)
- [ ] Correlações suplemento × biometria (14+ dias de dados)
- [ ] Tendências de 7 e 30 dias para cada métrica
- [ ] Cache de 30 minutos para performance
- [ ] Testes unitários completos (todas as classes)
- [ ] Performance <300ms para getDashboard()
- [ ] Performance <200ms para getLatestHealthData()
- [ ] EventBus para reatividade cross-engine
- [ ] Fallback elegante sem wearable (zero crash)
- [ ] Compliance LGPD/GDPR (dados de saúde são sensíveis)

---

**FIM DO SPRINT 14 — WEARABLES & HEALTH INTEGRATION COMPLETA** 🚀
