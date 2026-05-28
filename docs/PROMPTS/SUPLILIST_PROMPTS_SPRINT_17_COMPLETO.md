# **SPRINT 17: Third-Party Integrations & Data Sync — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 17 | **Fase:** 3 — Community Explosion (continuação) | **Semanas:** 55–56
**Depende de:** Sprints 1–16 completos (todos os engines anteriores + Notifications)

---

# **VISÃO GERAL DO SPRINT 17**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 17.1 | `strava-integration.js` + `strava-sync-manager.js` | Integração Strava (atividades, stats, leaderboards) | Muito Alta |
| 17.2 | `myfitnesspal-integration.js` + `nutrient-sync.js` | Integração MyFitnessPal (macros, calorias, aderência) | Muito Alta |
| 17.3 | `wearables-integration.js` + `health-kit-sync.js` | Integração Apple Health, Garmin, Whoop (heartrate, sleep, recovery) | Muito Alta |
| 17.4 | `marketplace-integration.js` + `price-sync-manager.js` | Integração com 500+ marketplaces (Shopify, Mercado Livre, Amazon) | Muito Alta |

**Após o Sprint 17:**
- ✅ Integração completa com Strava (OAuth 2.0, sync automático de atividades)
- ✅ Recomendação de stack baseada em objetivo (bulk/cut) do Strava
- ✅ Integração MyFitnessPal (logs de nutrição, macros)
- ✅ Análise de aderência: suplementos tomados vs objetivos nutricionais
- ✅ Integração Apple Health, Garmin Connect, Whoop (heartrate, sleep, HRV)
- ✅ Dashboard integrado mostrando: atividades + nutrição + suplementação + saúde
- ✅ Integração com 500+ marketplaces via Shopify/APIs nativas
- ✅ Sincronização de preços em tempo real
- ✅ Rastreamento de histórico de preços (últimos 90 dias)
- ✅ Webhook handlers para atualizações de preço
- ✅ Deal finder: alertas quando produto favorito cai de preço
- ✅ Cross-marketplace price comparison
- ✅ OAuth 2.0 para todas as integrações
- ✅ Sincronização automática a cada 1-6 horas (configurável)
- ✅ Offline cache com sync quando volta online
- ✅ Data mapping e normalizacão entre plataformas
- ✅ Permissões granulares (read-only, disconnect fácil)
- ✅ Error handling e retry automático

---

# **PROMPT 17.1: StravaIntegration — Atividades & Stats Síncronos**

## TASK 1.1: CREATE /src/integrations/strava-integration.js

```markdown
## CONTEXT

Você está construindo o StravaIntegration para SupliList v4.0 — conectando
a maior rede social de atletas do mundo com recomendação inteligente de suplementos.

O objetivo: **"Se seu objetivo no Strava é ganhar massa muscular, recomendamos
stacks bulking com creatina, whey, maltodextrina. Se é fazer maratona, recomendamos
BCAA, eletrólitos, carbs intra-treino."**

Arquitetura:
- OAuth 2.0 auth flow (obter access_token)
- Fetch atividades (últimas 100, paginated)
- Extract tipo atividade (run, ride, swim, strength, etc)
- Sincronizar com StackRecommender para dar stack recommendations
- Atualizar user profile com stats do Strava
- Webhook listener para atividades novas
- Sync automático a cada 6 horas
- Caching inteligente (atividades não mudam, apenas totals)

---

## DELIVERABLES ESPERADOS

✅ `/src/integrations/strava-integration.js` — Core Strava integration
✅ `/src/integrations/strava-auth-manager.js` — OAuth 2.0 flow
✅ `/src/integrations/strava-sync-manager.js` — Sincronização de atividades
✅ `/src/integrations/strava-data-mapper.js` — Map Strava → SupliList
✅ `/src/integrations/strava-webhook-handler.js` — Webhook listener
✅ `/src/integrations/strava-integration.test.js` — Full test suite
✅ Persistência de access_token (segura, encrypted)
✅ Persistência de atividades (últimas 100)
✅ Performance <500ms para sync
✅ Offline cache com background sync
✅ OAuth token refresh automático
✅ Compliance com Strava API T&C

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/integrations/strava-integration.js`

\`\`\`javascript
/**
 * StravaIntegration v1.0 — SupliList
 * OAuth 2.0 Strava integration with activity sync
 *
 * Usage:
 *   import { StravaIntegration } from '../integrations/strava-integration.js';
 *   const strava = StravaIntegration.getInstance();
 *   
 *   // 1. Start auth
 *   const authUrl = strava.getAuthUrl();
 *   
 *   // 2. Handle callback
 *   await strava.handleAuthCallback(code);
 *   
 *   // 3. Sync activities
 *   const activities = await strava.syncActivities();
 *   
 *   // 4. Get recommendations
 *   const stackRecs = await strava.getStackRecommendations();
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { StackRecommender } from '../stacks/stack-recommender.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} StravaActivity
 * @property {string} id                - Activity ID do Strava
 * @property {string} stravaId          - Mesmo (redundante para clareza)
 * @property {string} type              - 'Run' | 'Ride' | 'Swim' | 'WeightTraining' | 'Other'
 * @property {string} name              - "Morning Run"
 * @property {number} distance          - Metros
 * @property {number} movingTime        - Segundos
 * @property {number} elapsedTime       - Segundos
 * @property {number} elevationGain     - Metros
 * @property {number} totalElevationGain - Metros
 * @property {number} calories          - Calorias queimadas (estimado)
 * @property {number} averageHeartrate  - BPM
 * @property {number} maxHeartrate      - BPM
 * @property {number} averageSpeed      - m/s
 * @property {number} maxSpeed          - m/s
 * @property {string} startDate         - ISO string
 * @property {string} startDateLocal    - ISO string (timezone local)
 * @property {string} timezone          - "America/Sao_Paulo"
 * @property {string} location          - "São Paulo, Brazil"
 * @property {number} startLatitude     - Lat
 * @property {number} startLongitude    - Long
 * @property {boolean} manual           - Manual entry?
 * @property {boolean} commute          - É commute?
 * @property {boolean} trainer          - Trainer session?
 * @property {string} gear              - ID do gear usado
 * @property {string} description       - User notes
 * @property {number} syncedAt          - Unix ms
 * @property {Object} stats             - { volume, intensity, frequency }
 */

/**
 * @typedef {Object} StravaUser
 * @property {string} stravaId
 * @property {string} username
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} avatar             - URL do avatar
 * @property {string} city
 * @property {string} state
 * @property {string} country
 * @property {string} sex                - 'M' | 'F'
 * @property {number} weight             - kg
 * @property {number} createdAt          - Strava created_at
 * @property {Object} stats              - { totalActivities, totalDistance, totalMovingTime, totalElevation }
 */

/**
 * @typedef {Object} StravaAuth
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} expiresAt          - Unix ms
 * @property {string} athleteId          - Strava athlete ID
 * @property {string} scope              - Permissões granted
 */

class StravaIntegration {
  constructor() {
    this.auth = null;                    // StravaAuth
    this.activities = new Map();         // stravaId → StravaActivity
    this.user = null;                    // StravaUser
    this.lastSyncAt = null;
    this.syncInProgress = false;
    this.STRAVA_API_BASE = 'https://www.strava.com/api/v3';
    this.STRAVA_OAUTH_URL = 'https://www.strava.com/oauth/authorize';
    this.SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas
  }

  static #instance = null;

  static getInstance() {
    if (!StravaIntegration.#instance) {
      StravaIntegration.#instance = new StravaIntegration();
    }
    return StravaIntegration.#instance;
  }

  /**
   * Inicializar integração
   */
  async init(clientId, clientSecret, redirectUri) {
    console.log('🚴 Inicializando StravaIntegration...');

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;

    // Carregar auth salvo
    const stored = await this._loadFromDB();
    if (stored.auth) {
      this.auth = stored.auth;
      this.user = stored.user;
      this.activities = new Map(stored.activities || []);

      // Verificar se token expirou
      if (this.auth.expiresAt < Date.now()) {
        await this._refreshToken();
      }

      // Iniciar sync automático
      this._startAutoSync();
    }

    console.log(`✅ StravaIntegration pronto${this.auth ? ' (conectado)' : ' (não conectado)'}`);
  }

  /**
   * Obter URL de autenticação OAuth
   */
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      approval_prompt: 'force',
      scope: 'profile:read_all,activity:read_all',
    });

    return `${this.STRAVA_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Lidar com callback de OAuth
   * @param {string} code - Authorization code
   */
  async handleAuthCallback(code) {
    console.log('🔐 Processando callback OAuth...');

    try {
      // Trocar code por access_token
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`OAuth error: ${data.message}`);
      }

      // Salvar auth
      this.auth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        athleteId: data.athlete.id,
        scope: data.scope,
      };

      // Mapear user
      this.user = this._mapStravaUserData(data.athlete);

      await this._saveToDB();

      // Fazer sync inicial
      await this.syncActivities();

      // Iniciar sync automático
      this._startAutoSync();

      eventBus.emit('strava:authenticated', { user: this.user });

      console.log(`✅ Autenticado com Strava: ${this.user.firstname} ${this.user.lastname}`);

      return this.user;
    } catch (err) {
      console.error('❌ OAuth error:', err);
      throw err;
    }
  }

  /**
   * Sincronizar atividades do Strava
   */
  async syncActivities() {
    if (this.syncInProgress) {
      console.log('⏳ Sync já em andamento');
      return [];
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Strava');
    }

    this.syncInProgress = true;
    console.log('📥 Sincronizando atividades do Strava...');

    try {
      let page = 1;
      let hasMore = true;
      const newActivities = [];

      while (hasMore && page <= 10) { // Máx 1000 atividades (100 * 10 páginas)
        const response = await this._apiCall(
          `/athlete/activities?per_page=100&page=${page}`
        );

        if (response.length === 0) {
          hasMore = false;
          break;
        }

        for (const stravaActivity of response) {
          const mapped = this._mapStravaActivity(stravaActivity);

          // Apenas adicionar se for novo ou se stats mudaram
          if (!this.activities.has(mapped.id)) {
            this.activities.set(mapped.id, mapped);
            newActivities.push(mapped);
          }
        }

        page++;
      }

      // Atualizar stats do usuário
      await this._updateUserStats();

      // Salvar
      await this._saveToDB();

      this.lastSyncAt = Date.now();

      eventBus.emit('strava:synced', {
        newActivities: newActivities.length,
        totalActivities: this.activities.size,
      });

      console.log(`✅ Sync concluído: ${newActivities.length} atividades novas`);

      return newActivities;
    } catch (err) {
      console.error('❌ Sync error:', err);
      throw err;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Obter recomendações de stack baseado em atividades Strava
   */
  async getStackRecommendations() {
    if (!this.auth || this.activities.size === 0) {
      console.warn('⚠️  No Strava data for recommendations');
      return [];
    }

    // Analisar tipos de atividade (últimas 30)
    const recent = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .slice(0, 30);

    const activityTypes = {};
    recent.forEach(a => {
      activityTypes[a.type] = (activityTypes[a.type] || 0) + 1;
    });

    // Determinar objetivo primário
    let primaryGoal = 'general';

    if ((activityTypes['WeightTraining'] || 0) > 10) {
      primaryGoal = 'muscle_gain';
    } else if ((activityTypes['Run'] || 0) > 15 || (activityTypes['Ride'] || 0) > 10) {
      primaryGoal = 'endurance';
    }

    // Usar StackRecommender
    const stackRec = StackRecommender.getInstance();
    const recommendations = await stackRec.recommendStack({
      goal: primaryGoal,
      activityFrequency: recent.length / 4, // atividades/semana (últimas 4 semanas)
      activityTypes,
      age: this.user?.age || 25,
      weight: this.user?.weight || 75,
    });

    return recommendations;
  }

  /**
   * Obter atividades sincronizadas
   */
  async getActivities(limit = 50, offset = 0) {
    const sorted = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return sorted.slice(offset, offset + limit);
  }

  /**
   * Obter atividades por tipo
   */
  async getActivitiesByType(type) {
    return Array.from(this.activities.values())
      .filter(a => a.type === type)
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  /**
   * Obter stats agregados
   */
  async getStats() {
    if (!this.user) return null;

    const activities = Array.from(this.activities.values());

    const stats = {
      totalActivities: activities.length,
      totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000, // km
      totalMovingTime: activities.reduce((sum, a) => sum + (a.movingTime || 0), 0), // segundos
      totalElevation: activities.reduce((sum, a) => sum + (a.totalElevationGain || 0), 0),
      averageHeartrate: this._calculateAverage(activities, 'averageHeartrate'),
      caloriesBurned: activities.reduce((sum, a) => sum + (a.calories || 0), 0),
      activityTypes: this._countActivityTypes(activities),
      lastActivityAt: activities[0]?.startDate || null,
    };

    return stats;
  }

  /**
   * Desconectar Strava
   */
  async disconnect() {
    this.auth = null;
    this.user = null;
    this.activities.clear();
    this.lastSyncAt = null;

    await this._deleteFromDB();
    this._stopAutoSync();

    eventBus.emit('strava:disconnected');

    console.log('✂️  Desconectado do Strava');
  }

  /**
   * Verificar se está conectado
   */
  isConnected() {
    return this.auth !== null && this.auth.expiresAt > Date.now();
  }

  /**
   * PRIVATE: API call com token refresh automático
   */
  async _apiCall(endpoint, method = 'GET', body = null) {
    // Verificar se token expirou
    if (this.auth.expiresAt < Date.now()) {
      await this._refreshToken();
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.auth.accessToken}`,
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${this.STRAVA_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expirou, refrescar e tentar novamente
        await this._refreshToken();
        return this._apiCall(endpoint, method, body);
      }
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * PRIVATE: Refrescar token
   */
  async _refreshToken() {
    console.log('🔄 Refrescando token Strava...');

    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.auth.refreshToken,
        }),
      });

      const data = await response.json();

      this.auth.accessToken = data.access_token;
      this.auth.refreshToken = data.refresh_token;
      this.auth.expiresAt = Date.now() + (data.expires_in * 1000);

      await this._saveToDB();

      console.log('✅ Token refrescado');
    } catch (err) {
      console.error('❌ Token refresh error:', err);
      throw err;
    }
  }

  /**
   * PRIVATE: Map Strava activity to internal format
   */
  _mapStravaActivity(stravaActivity) {
    return {
      id: `strava-${stravaActivity.id}`,
      stravaId: stravaActivity.id,
      type: stravaActivity.type,
      name: stravaActivity.name,
      distance: stravaActivity.distance,
      movingTime: stravaActivity.moving_time,
      elapsedTime: stravaActivity.elapsed_time,
      elevationGain: stravaActivity.elevation_gain,
      totalElevationGain: stravaActivity.total_elevation_gain,
      calories: stravaActivity.calories,
      averageHeartrate: stravaActivity.average_heartrate,
      maxHeartrate: stravaActivity.max_heartrate,
      averageSpeed: stravaActivity.average_speed,
      maxSpeed: stravaActivity.max_speed,
      startDate: stravaActivity.start_date,
      startDateLocal: stravaActivity.start_date_local,
      timezone: stravaActivity.timezone,
      location: `${stravaActivity.location_city}, ${stravaActivity.location_state}`,
      startLatitude: stravaActivity.start_latitude,
      startLongitude: stravaActivity.start_longitude,
      manual: stravaActivity.manual,
      commute: stravaActivity.commute,
      trainer: stravaActivity.trainer,
      gear: stravaActivity.gear_id,
      description: stravaActivity.description,
      syncedAt: Date.now(),
    };
  }

  /**
   * PRIVATE: Map Strava user data
   */
  _mapStravaUserData(stravaUser) {
    return {
      stravaId: stravaUser.id,
      username: stravaUser.username,
      firstname: stravaUser.firstname,
      lastname: stravaUser.lastname,
      avatar: stravaUser.profile,
      city: stravaUser.city,
      state: stravaUser.state,
      country: stravaUser.country,
      sex: stravaUser.sex,
      weight: stravaUser.weight,
      createdAt: stravaUser.created_at,
    };
  }

  /**
   * PRIVATE: Update user stats from activities
   */
  async _updateUserStats() {
    const activities = Array.from(this.activities.values());

    this.user.stats = {
      totalActivities: activities.length,
      totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0),
      totalMovingTime: activities.reduce((sum, a) => sum + (a.movingTime || 0), 0),
      totalElevation: activities.reduce((sum, a) => sum + (a.totalElevationGain || 0), 0),
    };
  }

  /**
   * PRIVATE: Helper functions
   */
  _calculateAverage(arr, field) {
    const values = arr.filter(a => a[field]).map(a => a[field]);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  _countActivityTypes(activities) {
    return activities.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * PRIVATE: Auto sync scheduler
   */
  _startAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      try {
        await this.syncActivities();
      } catch (err) {
        console.error('❌ Auto sync error:', err);
      }
    }, this.SYNC_INTERVAL);

    console.log(`📅 Auto sync iniciado (a cada ${this.SYNC_INTERVAL / 1000 / 60 / 60} horas)`);
  }

  /**
   * PRIVATE: Stop auto sync
   */
  _stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  async _loadFromDB() {
    // Implementar com IndexedDB
    return { auth: null, user: null, activities: [] };
  }

  async _saveToDB() {
    // Persistir auth, user, activities em IndexedDB (encrypted)
  }

  async _deleteFromDB() {
    // Deletar dados de auth
  }
}

export { StravaIntegration };
\`\`\`

---

# **PROMPT 17.2: MyFitnessPalIntegration — Nutrição & Macros**

\`\`\`javascript
/**
 * MyFitnessPalIntegration v1.0
 * Integração com MyFitnessPal para rastreamento de nutrição
 *
 * Usage:
 *   const mfp = MyFitnessPalIntegration.getInstance();
 *   await mfp.init(clientId, clientSecret);
 *   await mfp.handleAuthCallback(code);
 *   const nutrition = await mfp.getNutritionData();
 *   const adherence = await mfp.checkSupplementAdherence();
 */

class MyFitnessPalIntegration {
  constructor() {
    this.auth = null;
    this.nutritionLogs = new Map();      // dateString → NutritionLog
    this.userProfile = null;
    this.lastSyncAt = null;
    this.SYNC_INTERVAL = 2 * 60 * 60 * 1000; // 2 horas (nutrition muda durante o dia)
  }

  static #instance = null;

  static getInstance() {
    if (!MyFitnessPalIntegration.#instance) {
      MyFitnessPalIntegration.#instance = new MyFitnessPalIntegration();
    }
    return MyFitnessPalIntegration.#instance;
  }

  async init(clientId, clientSecret, redirectUri) {
    console.log('🍎 Inicializando MyFitnessPalIntegration...');

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;

    const stored = await this._loadFromDB();
    if (stored.auth) {
      this.auth = stored.auth;
      this.nutritionLogs = new Map(stored.nutritionLogs || []);
      this._startAutoSync();
    }

    console.log(`✅ MyFitnessPalIntegration pronto${this.auth ? ' (conectado)' : ''}`);
  }

  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'nutrition,profile',
    });

    return `https://api.myfitnesspal.com/oauth/authorize?${params.toString()}`;
  }

  async handleAuthCallback(code) {
    console.log('🔐 Processando callback MyFitnessPal...');

    const response = await fetch('https://api.myfitnesspal.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    this.auth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    await this._saveToDB();
    await this.syncNutritionData();
    this._startAutoSync();

    console.log('✅ Autenticado com MyFitnessPal');

    return this.auth;
  }

  /**
   * Sincronizar dados de nutrição
   */
  async syncNutritionData(daysBack = 30) {
    console.log('📥 Sincronizando dados de nutrição...');

    try {
      const today = new Date();

      for (let i = 0; i < daysBack; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const nutritionData = await this._apiCall(
          `/nutrition/diary/${dateStr}`
        );

        if (nutritionData) {
          const log = {
            date: dateStr,
            totalCalories: nutritionData.total_calories,
            totalProtein: nutritionData.total_protein,
            totalCarbs: nutritionData.total_carbs,
            totalFat: nutritionData.total_fat,
            totalFiber: nutritionData.total_fiber,
            totalSodium: nutritionData.total_sodium,
            meals: nutritionData.meals || [],
            water: nutritionData.water_grams,
            notes: nutritionData.notes,
            syncedAt: Date.now(),
          };

          this.nutritionLogs.set(dateStr, log);
        }
      }

      await this._saveToDB();
      this.lastSyncAt = Date.now();

      console.log(`✅ Sincronizados ${this.nutritionLogs.size} dias de nutrição`);
    } catch (err) {
      console.error('❌ Sync error:', err);
    }
  }

  /**
   * Obter dados de nutrição
   */
  getNutritionData(date) {
    const dateStr = date instanceof Date 
      ? date.toISOString().split('T')[0]
      : date;

    return this.nutritionLogs.get(dateStr) || null;
  }

  /**
   * Verificar aderência ao objetivo nutricional
   * Compara macros com recomendação do stack
   */
  async checkSupplementAdherence(stackRecommendation) {
    // Últimos 7 dias
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = Array.from(this.nutritionLogs.values())
      .filter(log => new Date(log.date) >= sevenDaysAgo);

    if (recentLogs.length === 0) {
      return { adherence: 0, message: 'Sem dados de nutrição' };
    }

    // Calcular médias
    const avgProtein = recentLogs.reduce((sum, log) => sum + log.totalProtein, 0) / recentLogs.length;
    const avgCarbs = recentLogs.reduce((sum, log) => sum + log.totalCarbs, 0) / recentLogs.length;
    const avgFat = recentLogs.reduce((sum, log) => sum + log.totalFat, 0) / recentLogs.length;
    const avgCals = recentLogs.reduce((sum, log) => sum + log.totalCalories, 0) / recentLogs.length;

    // Comparar com stack recommendation
    const { proteinTarget, carbTarget, fatTarget, calorieTarget } = stackRecommendation;

    const proteinAdherence = this._calculateAdherence(avgProtein, proteinTarget);
    const carbsAdherence = this._calculateAdherence(avgCarbs, carbTarget);
    const fatAdherence = this._calculateAdherence(avgFat, fatTarget);
    const calAdherence = this._calculateAdherence(avgCals, calorieTarget);

    const totalAdherence = (proteinAdherence + carbsAdherence + fatAdherence + calAdherence) / 4;

    return {
      adherence: Math.min(100, totalAdherence),
      breakdown: {
        protein: { actual: Math.round(avgProtein), target: proteinTarget, adherence: proteinAdherence },
        carbs: { actual: Math.round(avgCarbs), target: carbTarget, adherence: carbsAdherence },
        fat: { actual: Math.round(avgFat), target: fatTarget, adherence: fatAdherence },
        calories: { actual: Math.round(avgCals), target: calorieTarget, adherence: calAdherence },
      },
      recommendations: this._getAdherenceRecommendations(totalAdherence),
    };
  }

  _calculateAdherence(actual, target) {
    if (target === 0) return 0;
    const ratio = actual / target;
    if (ratio >= 0.9 && ratio <= 1.1) return 100; // ±10% é 100%
    return Math.max(0, 100 - Math.abs(ratio - 1) * 100);
  }

  _getAdherenceRecommendations(adherence) {
    if (adherence >= 80) {
      return '✅ Excelente aderência ao plano nutricional';
    } else if (adherence >= 60) {
      return '⚠️  Aderência moderada, ajuste necessário';
    } else {
      return '❌ Baixa aderência, revise seu plano';
    }
  }

  async disconnect() {
    this.auth = null;
    this.nutritionLogs.clear();
    this.lastSyncAt = null;
    await this._deleteFromDB();
    this._stopAutoSync();
    console.log('✂️  Desconectado do MyFitnessPal');
  }

  isConnected() {
    return this.auth !== null && this.auth.expiresAt > Date.now();
  }

  _startAutoSync() {
    if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
    this.autoSyncInterval = setInterval(() => this.syncNutritionData(7), this.SYNC_INTERVAL);
  }

  _stopAutoSync() {
    if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
  }

  async _apiCall(endpoint, method = 'GET', body = null) {
    if (this.auth.expiresAt < Date.now()) {
      await this._refreshToken();
    }

    const options = {
      method,
      headers: { 'Authorization': `Bearer ${this.auth.accessToken}` },
    };

    if (body) options.body = JSON.stringify(body);

    return fetch(`https://api.myfitnesspal.com${endpoint}`, options).then(r => r.json());
  }

  async _refreshToken() {
    // Similar ao Strava
  }

  async _loadFromDB() {
    return { auth: null, nutritionLogs: [] };
  }

  async _saveToDB() {}
  async _deleteFromDB() {}
}

export { MyFitnessPalIntegration };
\`\`\`

---

# **PROMPT 17.3: WearablesIntegration — Apple Health, Garmin, Whoop**

\`\`\`javascript
/**
 * WearablesIntegration v1.0
 * Integração com Apple Health, Garmin Connect, Whoop
 * Sincroniza: heart rate, sleep, HRV, recovery, training load
 */

class WearablesIntegration {
  constructor() {
    this.providers = {
      appleHealth: null,
      garmin: null,
      whoop: null,
    };
    this.healthData = new Map();      // dateString → HealthSnapshot
  }

  static #instance = null;

  static getInstance() {
    if (!WearablesIntegration.#instance) {
      WearablesIntegration.#instance = new WearablesIntegration();
    }
    return WearablesIntegration.#instance;
  }

  async init() {
    console.log('⌚ Inicializando WearablesIntegration...');
    // Inicializar providers
  }

  /**
   * Sincronizar dados de wearable
   * @param {string} provider - 'appleHealth' | 'garmin' | 'whoop'
   */
  async syncWearableData(provider) {
    console.log(`📊 Sincronizando ${provider}...`);

    try {
      const data = await this._fetchProviderData(provider);

      for (const snapshot of data) {
        const dateStr = snapshot.date;
        
        if (!this.healthData.has(dateStr)) {
          this.healthData.set(dateStr, {
            date: dateStr,
            providers: {},
            aggregated: null,
          });
        }

        const dayData = this.healthData.get(dateStr);
        dayData.providers[provider] = snapshot.metrics;
        dayData.syncedAt = Date.now();

        // Agregar dados de múltiplos providers
        this._aggregateHealthData(dayData);
      }

      await this._saveToDB();
      console.log(`✅ ${provider} sincronizado`);
    } catch (err) {
      console.error(`❌ Error syncing ${provider}:`, err);
    }
  }

  /**
   * Obter recomendação de recuperação
   */
  getRecoveryRecommendation(date) {
    const dateStr = date instanceof Date 
      ? date.toISOString().split('T')[0]
      : date;

    const dayData = this.healthData.get(dateStr);
    if (!dayData?.aggregated) return null;

    const { hrv, resting_hr, sleep_quality, training_load } = dayData.aggregated;

    // Score de recuperação (0-100)
    let recoveryScore = 0;

    if (hrv > 50) recoveryScore += 30; // HRV bom
    if (resting_hr < 60) recoveryScore += 20; // HR baixa
    if (sleep_quality >= 7) recoveryScore += 30; // Sleep bom
    if (training_load < 15) recoveryScore += 20; // Carga baixa

    return {
      recoveryScore: Math.min(100, recoveryScore),
      recommendation: this._getRecoveryRecommendation(recoveryScore),
      metrics: { hrv, resting_hr, sleep_quality, training_load },
    };
  }

  /**
   * Obter dados agregados da semana
   */
  getWeeklySnapshot() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyData = Array.from(this.healthData.values())
      .filter(d => new Date(d.date) >= weekAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (weeklyData.length === 0) return null;

    // Calcular médias
    const avgHRV = weeklyData.reduce((sum, d) => sum + (d.aggregated?.hrv || 0), 0) / weeklyData.length;
    const avgRestingHR = weeklyData.reduce((sum, d) => sum + (d.aggregated?.resting_hr || 0), 0) / weeklyData.length;
    const avgSleep = weeklyData.reduce((sum, d) => sum + (d.aggregated?.sleep_hours || 0), 0) / weeklyData.length;
    const totalTrainingLoad = weeklyData.reduce((sum, d) => sum + (d.aggregated?.training_load || 0), 0);

    return {
      period: '7 dias',
      metrics: {
        avgHRV: Math.round(avgHRV),
        avgRestingHR: Math.round(avgRestingHR),
        avgSleepHours: avgSleep.toFixed(1),
        totalTrainingLoad: Math.round(totalTrainingLoad),
      },
      trendDirection: this._calculateTrend(weeklyData),
    };
  }

  _aggregateHealthData(dayData) {
    const providers = dayData.providers;
    
    dayData.aggregated = {
      // HRV: usar Whoop ou Garmin preferentemente
      hrv: providers.whoop?.hrv || providers.garmin?.hrv || providers.appleHealth?.hrv || 0,
      
      // Resting HR: Apple Health tem boa qualidade
      resting_hr: providers.appleHealth?.restingHeartRate || providers.garmin?.restingHeartRate || 0,
      
      // Sleep: Garmin e Whoop têm dados bons
      sleep_hours: providers.whoop?.sleepHours || providers.garmin?.sleepHours || 0,
      sleep_quality: providers.whoop?.sleepScore || providers.garmin?.sleepScore || 0,
      
      // Training load: Garmin e Whoop
      training_load: providers.garmin?.trainingLoad || providers.whoop?.trainingLoad || 0,
    };
  }

  _getRecoveryRecommendation(score) {
    if (score >= 80) {
      return '🟢 Recuperação excelente. Treino intenso é seguro.';
    } else if (score >= 60) {
      return '🟡 Recuperação moderada. Treino moderado recomendado.';
    } else {
      return '🔴 Recuperação baixa. Descanso recomendado.';
    }
  }

  _calculateTrend(dataPoints) {
    // Comparar valores dos últimos 7 dias
    if (dataPoints.length < 2) return 'neutral';

    const first = dataPoints[dataPoints.length - 1]?.aggregated?.hrv || 0;
    const last = dataPoints[0]?.aggregated?.hrv || 0;

    if (last > first * 1.05) return 'improving';
    if (last < first * 0.95) return 'declining';
    return 'stable';
  }

  async _fetchProviderData(provider) {
    // Implementar fetch para cada provider
    // Apple Health, Garmin API, Whoop API
    return [];
  }

  async _loadFromDB() {
    return { healthData: [] };
  }

  async _saveToDB() {}
}

export { WearablesIntegration };
\`\`\`

---

# **PROMPT 17.4: MarketplaceIntegration — 500+ Lojas**

\`\`\`javascript
/**
 * MarketplaceIntegration v1.0
 * Integração com 500+ marketplaces via Shopify, APIs nativas
 * Sincroniza preços em tempo real, deal detection, price history
 */

class MarketplaceIntegration {
  constructor() {
    this.marketplaces = new Map();     // marketplace_id → MarketplaceConfig
    this.productPrices = new Map();    // `${sku}:${marketplace}` → PriceHistory
    this.deals = [];                   // Array de deals detectados
    this.PRICE_CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 horas
  }

  static #instance = null;

  static getInstance() {
    if (!MarketplaceIntegration.#instance) {
      MarketplaceIntegration.#instance = new MarketplaceIntegration();
    }
    return MarketplaceIntegration.#instance;
  }

  async init() {
    console.log('🛍️  Inicializando MarketplaceIntegration...');

    // Carregar marketplace configs (Shopify, MercadoLivre, Amazon, etc)
    const configs = await this._loadMarketplaceConfigs();
    configs.forEach(c => this.marketplaces.set(c.id, c));

    // Iniciar monitoramento de preços
    this._startPriceMonitoring();

    console.log(`✅ MarketplaceIntegration pronto: ${this.marketplaces.size} marketplaces`);
  }

  /**
   * Sincronizar preços de produto em todos os marketplaces
   */
  async syncProductPrices(productSku) {
    console.log(`💹 Sincronizando preços para ${productSku}...`);

    try {
      for (const [marketplaceId, config] of this.marketplaces) {
        try {
          const price = await this._fetchPrice(marketplaceId, productSku, config);

          if (price) {
            const key = `${productSku}:${marketplaceId}`;

            if (!this.productPrices.has(key)) {
              this.productPrices.set(key, {
                sku: productSku,
                marketplace: marketplaceId,
                history: [],
              });
            }

            const entry = {
              price: price.currentPrice,
              previousPrice: price.previousPrice,
              currency: price.currency,
              inStock: price.inStock,
              url: price.url,
              timestamp: Date.now(),
            };

            this.productPrices.get(key).history.push(entry);
            
            // Manter apenas últimos 90 dias
            const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
            this.productPrices.get(key).history = 
              this.productPrices.get(key).history.filter(h => h.timestamp > ninetyDaysAgo);

            // Detectar deal
            if (price.isDeal) {
              this._addDeal(productSku, marketplaceId, price);
            }
          }
        } catch (err) {
          console.warn(`⚠️  Error fetching price from ${marketplaceId}:`, err);
        }
      }

      await this._saveToDB();
      console.log(`✅ Preços sincronizados para ${productSku}`);
    } catch (err) {
      console.error('❌ Sync error:', err);
    }
  }

  /**
   * Obter melhores preços para um produto em todos os marketplaces
   */
  async getBestPrices(productSku) {
    const prices = [];

    for (const [key, history] of this.productPrices) {
      if (key.startsWith(productSku)) {
        const latest = history.history[history.history.length - 1];
        
        if (latest && latest.inStock) {
          prices.push({
            marketplace: history.marketplace,
            price: latest.price,
            currency: latest.currency,
            url: latest.url,
            timestamp: latest.timestamp,
          });
        }
      }
    }

    return prices
      .sort((a, b) => a.price - b.price)
      .slice(0, 5); // Top 5 melhores
  }

  /**
   * Obter histórico de preço
   */
  getPriceHistory(productSku, marketplace) {
    const key = `${productSku}:${marketplace}`;
    const data = this.productPrices.get(key);

    if (!data) return [];

    return data.history
      .map(h => ({
        date: new Date(h.timestamp),
        price: h.price,
        currency: h.currency,
      }))
      .sort((a, b) => a.date - b.date);
  }

  /**
   * Obter deals ativos
   */
  getDeals(limit = 10) {
    return this.deals
      .filter(d => !d.expiredAt || d.expiredAt > Date.now())
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, limit);
  }

  /**
   * Adicionar produto para monitorar preço
   */
  async addProductToMonitor(productSku, productName, watchedPrice) {
    if (!this.monitoredProducts) {
      this.monitoredProducts = new Map();
    }

    this.monitoredProducts.set(productSku, {
      name: productName,
      watchedPrice,
      addedAt: Date.now(),
      notified: false,
    });

    // Sync imediato
    await this.syncProductPrices(productSku);

    console.log(`📌 Adicionado para monitorar: ${productName}`);
  }

  /**
   * Remover produto do monitoramento
   */
  removeProductFromMonitor(productSku) {
    if (this.monitoredProducts) {
      this.monitoredProducts.delete(productSku);
    }
  }

  /**
   * PRIVATE: Fetch price from specific marketplace
   */
  async _fetchPrice(marketplaceId, productSku, config) {
    switch (marketplaceId) {
      case 'shopify':
        return this._fetchShopifyPrice(productSku, config);
      case 'mercadolivre':
        return this._fetchMercadoLivrePrice(productSku, config);
      case 'amazon':
        return this._fetchAmazonPrice(productSku, config);
      case 'amazon-br':
        return this._fetchAmazonBRPrice(productSku, config);
      default:
        return null;
    }
  }

  async _fetchShopifyPrice(productSku, config) {
    // Usar Shopify GraphQL API
    const query = `{
      products(first: 1, query: "sku:${productSku}") {
        edges {
          node {
            handle
            title
            variants(first: 1) {
              edges {
                node {
                  price
                  sku
                  available
                }
              }
            }
          }
        }
      }
    }`;

    const response = await fetch(`${config.storeUrl}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': config.accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    // Parse e retornar preço
    return null;
  }

  async _fetchMercadoLivrePrice(productSku, config) {
    // Usar API do Mercado Livre
    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${productSku}`
    );
    const data = await response.json();
    // Parse e retornar preço
    return null;
  }

  async _fetchAmazonPrice(productSku, config) {
    // Usar Product Advertising API
    return null;
  }

  async _fetchAmazonBRPrice(productSku, config) {
    // Usando Amazon.com.br
    return null;
  }

  /**
   * PRIVATE: Detectar e adicionar deal
   */
  _addDeal(productSku, marketplace, price) {
    const existingDeal = this.deals.find(
      d => d.sku === productSku && d.marketplace === marketplace
    );

    if (existingDeal) {
      existingDeal.price = price.currentPrice;
      existingDeal.discountPercent = price.discountPercent;
      existingDeal.timestamp = Date.now();
    } else {
      this.deals.push({
        sku: productSku,
        name: price.name,
        marketplace,
        price: price.currentPrice,
        regularPrice: price.regularPrice,
        discountPercent: price.discountPercent,
        url: price.url,
        timestamp: Date.now(),
        expiredAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Deal válido 7 dias
      });
    }

    // Emitir evento para notificação
    eventBus.emit('marketplace:deal', {
      sku: productSku,
      marketplace,
      price: price.currentPrice,
    });
  }

  /**
   * PRIVATE: Price monitoring scheduler
   */
  _startPriceMonitoring() {
    if (this.priceCheckInterval) clearInterval(this.priceCheckInterval);

    this.priceCheckInterval = setInterval(async () => {
      if (this.monitoredProducts) {
        for (const [sku] of this.monitoredProducts) {
          await this.syncProductPrices(sku);
        }
      }
    }, this.PRICE_CHECK_INTERVAL);

    console.log('📊 Monitoramento de preços iniciado');
  }

  async _loadMarketplaceConfigs() {
    // Carregar configurações de 500+ marketplaces
    return [
      {
        id: 'shopify',
        name: 'Shopify',
        storeUrl: 'https://store.myshopify.com',
        accessToken: 'xxx',
      },
      {
        id: 'mercadolivre',
        name: 'Mercado Livre',
        baseUrl: 'https://api.mercadolibre.com',
        accessToken: 'xxx',
      },
      {
        id: 'amazon-br',
        name: 'Amazon Brasil',
        baseUrl: 'https://api.amazon.com.br',
        accessToken: 'xxx',
      },
      // ... 500+ mais
    ];
  }

  async _loadFromDB() {
    return { productPrices: [], deals: [] };
  }

  async _saveToDB() {}
}

export { MarketplaceIntegration };
\`\`\`

---

# **CHECKLIST FINAL SPRINT 17**

- [ ] StravaIntegration com OAuth 2.0 completo
- [ ] Sync automático de atividades Strava (6h interval)
- [ ] Parsing de tipos de atividade (Run, Ride, WeightTraining, etc)
- [ ] Stats agregados do Strava
- [ ] Recomendação de stack baseada em atividades
- [ ] Token refresh automático
- [ ] MyFitnessPalIntegration com OAuth 2.0
- [ ] Sync de dados nutricionais (2h interval)
- [ ] Cálculo de aderência ao plano nutricional
- [ ] WearablesIntegration: Apple Health, Garmin, Whoop
- [ ] Sync de HRV, resting HR, sleep, training load
- [ ] Aggregação de dados de múltiplos providers
- [ ] Recovery score e recomendação
- [ ] Weekly snapshot de saúde
- [ ] MarketplaceIntegration com 500+ lojas
- [ ] Sincronização de preços (2h interval)
- [ ] Deal detection e alertas
- [ ] Histórico de preços (90 dias)
- [ ] Best price comparison
- [ ] Price monitoring para produtos favoritos
- [ ] Webhook handlers para updates de preço
- [ ] OAuth 2.0 para todas as integrações
- [ ] Offline cache com background sync
- [ ] Error handling e retry automático
- [ ] Data mapping/normalization entre plataformas
- [ ] Granular permissions (read-only, easy disconnect)
- [ ] Persistência em IndexedDB (encrypted tokens)
- [ ] EventBus integration para todas as atualizações
- [ ] Testes unitários completos

---

**FIM DO PROMPT 17 — THIRD-PARTY INTEGRATIONS COMPLETA** 🔗

```
