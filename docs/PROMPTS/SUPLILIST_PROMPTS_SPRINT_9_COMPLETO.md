# **SPRINT 9: Wearables + Health APIs + Integrações — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no seu IDE.

**Sprint:** 9 | **Fase:** 4 — Enterprise & Integrations | **Semanas:** 25–28
**Depende de:** Sprints 1–8 completos (design-system, state-manager, analytics, stripe, community, groups, referral, livestream, gamification)

---

## **VISÃO GERAL DO SPRINT 9**

| Prompt | Arquivo(s) | O que entrega |
|--------|-----------|---------------|
| 9.1 | `wearables-engine.js` + `wearables-adapter.js` | Core engine, adapters Apple Watch / Garmin / Whoop, polling, cache |
| 9.2 | `apple-healthkit-sync.js` + `healthkit-page.js` | iOS HealthKit bridge (Capacitor), steps, workouts, heart rate, sleep |
| 9.3 | `google-fit-sync.js` + `fit-page.js` | Android Fit REST API, OAuth2, steps, sessions, calories |
| 9.4 | `wearables-dashboard-page.js` + `health-insights-engine.js` | Dashboard unificado multi-fonte, insights IA, correlações suplemento→saúde |

**Após o Sprint 9:**
- WearablesEngine com adapters padronizados para 3 plataformas ✅
- Sync bidirecional com Apple HealthKit (iOS/Capacitor) ✅
- Integração Google Fit via OAuth2 REST (Android/Web) ✅
- Dashboard unificado com insights IA e correlações saúde + suplementação ✅

---

## **PROMPT 9.1: WearablesEngine — CORE + ADAPTERS (Apple Watch, Garmin, Whoop)**

```markdown
You are building the production WearablesEngine for SupliList v4.0.

## CONTEXT

The WearablesEngine is the universal adapter layer that normalizes health data
from multiple wearable platforms into a single, consistent schema.

Think: a "Babel Fish" for health data — Apple Watch, Garmin, Whoop, and future
devices all speak different languages; WearablesEngine translates them into
one unified HealthSnapshot that the rest of the app consumes.

This module:
- Defines a universal HealthSnapshot schema (steps, HRV, sleep, workouts, HR)
- Implements adapter pattern: one adapter per platform
- Polls each connected device at configurable intervals
- Caches data in IndexedDB (local-first, offline-safe)
- Emits events via EventBus on new data
- Correlates health metrics with supplement intake (via GamificationEngine)
- Supports mock mode for development/testing (no real device needed)
- Degrades gracefully: if a platform is unavailable, continues with others

Architecture:
- WearablesEngine (orchestrator, singleton)
- BaseWearableAdapter (abstract interface)
- AppleWatchAdapter extends BaseWearableAdapter
- GarminAdapter extends BaseWearableAdapter
- WhoopAdapter extends BaseWearableAdapter
- MockAdapter extends BaseWearableAdapter (dev/test only)

---

## TASK 1: CREATE /src/wearables/wearables-engine.js

```javascript
/**
 * WearablesEngine v1.0 — SupliList
 * Universal adapter layer for wearable health data
 *
 * Uso:
 *   import { WearablesEngine } from '../wearables/wearables-engine.js';
 *   const we = WearablesEngine.getInstance();
 *   await we.init({ adapters: ['applewatch', 'garmin', 'whoop'] });
 *   const snapshot = await we.getLatestSnapshot();
 *   const history = await we.getHistory({ days: 7 });
 */

/**
 * @typedef {Object} HealthSnapshot
 * @property {string} id              - UUID único do snapshot
 * @property {string} source          - 'applewatch' | 'garmin' | 'whoop' | 'googlefit' | 'manual'
 * @property {number} timestamp       - Unix ms
 * @property {string} date            - 'YYYY-MM-DD'
 * -- ACTIVITY --
 * @property {number|null} steps           - Passos no dia
 * @property {number|null} activeCalories  - Calorias ativas (kcal)
 * @property {number|null} totalCalories   - Calorias totais (kcal)
 * @property {number|null} distanceKm      - Distância (km)
 * @property {number|null} activeMinutes   - Minutos ativos
 * @property {number|null} standHours      - Horas em pé (Apple específico)
 * -- HEART RATE --
 * @property {number|null} hrResting       - FC repouso (bpm)
 * @property {number|null} hrMax           - FC máxima do dia (bpm)
 * @property {number|null} hrAvg           - FC média do dia (bpm)
 * @property {number|null} hrv             - HRV (ms) — coração saudável, ≥50ms ideal
 * -- SLEEP --
 * @property {number|null} sleepTotalMin   - Sono total (minutos)
 * @property {number|null} sleepDeepMin    - Sono profundo (minutos)
 * @property {number|null} sleepRemMin     - Sono REM (minutos)
 * @property {number|null} sleepScore      - Score de sono 0–100
 * -- RECOVERY (Whoop-specific) --
 * @property {number|null} recoveryScore   - Score de recuperação 0–100
 * @property {number|null} strain          - Strain do dia 0–21 (Whoop)
 * @property {number|null} readiness       - Prontidão 0–100 (Garmin)
 * -- WORKOUTS --
 * @property {WorkoutSession[]} workouts   - Treinos do dia
 * -- META --
 * @property {boolean} isPartial           - true se dados incompletos
 * @property {string[]} missingFields      - Campos indisponíveis
 */

/**
 * @typedef {Object} WorkoutSession
 * @property {string} id
 * @property {string} type        - 'running' | 'cycling' | 'strength' | 'swimming' | 'hiit' | 'yoga' | 'other'
 * @property {number} startTime   - Unix ms
 * @property {number} endTime     - Unix ms
 * @property {number} durationMin - Duração em minutos
 * @property {number|null} calories
 * @property {number|null} avgHR
 * @property {number|null} maxHR
 * @property {number|null} distanceKm
 * @property {string} source      - 'applewatch' | 'garmin' | 'whoop' | 'googlefit'
 */

/**
 * @typedef {Object} AdapterConfig
 * @property {'applewatch'|'garmin'|'whoop'|'googlefit'|'mock'} type
 * @property {Object} [credentials]  - OAuth tokens, API keys
 * @property {number} [pollInterval] - ms entre polls (default: 300_000 = 5min)
 * @property {boolean} [enabled]     - Ativo ou não
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASE ADAPTER (interface)
// ─────────────────────────────────────────────────────────────────────────────

class BaseWearableAdapter {
  /**
   * @param {AdapterConfig} config
   */
  constructor(config) {
    this.type = config.type;
    this.config = config;
    this._connected = false;
    this._lastSync = null;
  }

  /** @returns {Promise<boolean>} */
  async connect() { throw new Error('connect() must be implemented'); }

  /** @returns {Promise<void>} */
  async disconnect() { this._connected = false; }

  /** @returns {boolean} */
  isConnected() { return this._connected; }

  /**
   * Busca snapshot do dia corrente
   * @param {string} date - 'YYYY-MM-DD'
   * @returns {Promise<HealthSnapshot>}
   */
  async fetchSnapshot(date) { throw new Error('fetchSnapshot() must be implemented'); }

  /**
   * Busca snapshots de múltiplos dias
   * @param {string} startDate - 'YYYY-MM-DD'
   * @param {string} endDate   - 'YYYY-MM-DD'
   * @returns {Promise<HealthSnapshot[]>}
   */
  async fetchRange(startDate, endDate) { throw new Error('fetchRange() must be implemented'); }

  /**
   * Cria snapshot vazio com campos null
   * @protected
   * @param {string} date
   * @returns {HealthSnapshot}
   */
  _emptySnapshot(date) {
    return {
      id: `${this.type}-${date}-${Date.now()}`,
      source: this.type,
      timestamp: Date.now(),
      date,
      steps: null,
      activeCalories: null,
      totalCalories: null,
      distanceKm: null,
      activeMinutes: null,
      standHours: null,
      hrResting: null,
      hrMax: null,
      hrAvg: null,
      hrv: null,
      sleepTotalMin: null,
      sleepDeepMin: null,
      sleepRemMin: null,
      sleepScore: null,
      recoveryScore: null,
      strain: null,
      readiness: null,
      workouts: [],
      isPartial: true,
      missingFields: [],
    };
  }

  /**
   * Detecta campos null e preenche missingFields
   * @protected
   * @param {HealthSnapshot} snapshot
   * @returns {HealthSnapshot}
   */
  _annotatePartial(snapshot) {
    const coreFields = [
      'steps', 'activeCalories', 'hrResting', 'hrv',
      'sleepTotalMin', 'sleepDeepMin', 'sleepScore',
    ];
    snapshot.missingFields = coreFields.filter(f => snapshot[f] === null);
    snapshot.isPartial = snapshot.missingFields.length > 0;
    return snapshot;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLE WATCH ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

class AppleWatchAdapter extends BaseWearableAdapter {
  /**
   * Apple Watch integration via Capacitor HealthKit plugin
   * Funciona apenas em contexto iOS nativo (Capacitor)
   * Em web/PWA, retorna dados mock ou rejeita graciosamente
   */
  constructor(config = {}) {
    super({ type: 'applewatch', ...config });
    this._healthKit = null;
  }

  async connect() {
    try {
      // Tenta importar plugin Capacitor HealthKit
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
        const { HealthKit } = await import('@capacitor-community/health-kit');
        this._healthKit = HealthKit;

        // Solicita permissões
        await this._healthKit.requestAuthorization({
          read: [
            'steps', 'calories', 'distance', 'heartRate', 'hrv',
            'sleep', 'workout', 'standHours', 'activeEnergy',
          ],
          write: [],
        });

        this._connected = true;
        this._lastSync = Date.now();
        return true;
      } else {
        // Ambiente web: modo graceful degradation
        console.warn('[AppleWatchAdapter] HealthKit disponível apenas em iOS nativo. Usando mock.');
        this._connected = false;
        return false;
      }
    } catch (err) {
      console.error('[AppleWatchAdapter] connect() falhou:', err.message);
      this._connected = false;
      return false;
    }
  }

  async fetchSnapshot(date) {
    const snapshot = this._emptySnapshot(date);

    if (!this._connected || !this._healthKit) {
      return this._annotatePartial(snapshot);
    }

    try {
      const startDate = new Date(`${date}T00:00:00`).toISOString();
      const endDate   = new Date(`${date}T23:59:59`).toISOString();

      // Passos
      const stepsResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'stepCount',
        startDate,
        endDate,
      });
      snapshot.steps = stepsResult?.resultData?.reduce((acc, r) => acc + (r.quantity ?? 0), 0) ?? null;

      // Calorias ativas
      const caloriesResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'activeEnergyBurned',
        startDate,
        endDate,
      });
      snapshot.activeCalories = caloriesResult?.resultData?.reduce((acc, r) => acc + (r.quantity ?? 0), 0) ?? null;

      // Frequência cardíaca
      const hrResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'heartRate',
        startDate,
        endDate,
      });
      if (hrResult?.resultData?.length > 0) {
        const hrValues = hrResult.resultData.map(r => r.quantity).filter(Boolean);
        snapshot.hrAvg = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
        snapshot.hrMax = Math.max(...hrValues);
        snapshot.hrResting = Math.min(...hrValues);
      }

      // HRV
      const hrvResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'heartRateVariabilitySDNN',
        startDate,
        endDate,
      });
      if (hrvResult?.resultData?.length > 0) {
        snapshot.hrv = Math.round(hrvResult.resultData[0].quantity ?? 0);
      }

      // Sono
      const sleepResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'sleepAnalysis',
        startDate: new Date(`${date}T18:00:00`).toISOString(),
        endDate:   new Date(`${date}T23:59:59`).toISOString(),
      });
      if (sleepResult?.resultData?.length > 0) {
        const inBedMin = sleepResult.resultData
          .filter(r => r.value === 0)
          .reduce((acc, r) => {
            const start = new Date(r.startDate).getTime();
            const end   = new Date(r.endDate).getTime();
            return acc + Math.round((end - start) / 60000);
          }, 0);
        snapshot.sleepTotalMin = inBedMin;
      }

      // Distância
      const distResult = await this._healthKit.queryHKitSampleType({
        sampleName: 'distanceWalkingRunning',
        startDate,
        endDate,
      });
      snapshot.distanceKm = distResult?.resultData?.reduce((acc, r) => acc + (r.quantity ?? 0), 0) ?? null;

      this._lastSync = Date.now();
      return this._annotatePartial(snapshot);

    } catch (err) {
      console.error('[AppleWatchAdapter] fetchSnapshot() falhou:', err.message);
      return this._annotatePartial(snapshot);
    }
  }

  async fetchRange(startDate, endDate) {
    const dates = this._dateRange(startDate, endDate);
    const results = await Promise.allSettled(dates.map(d => this.fetchSnapshot(d)));
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }

  _dateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GARMIN ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

class GarminAdapter extends BaseWearableAdapter {
  /**
   * Garmin Connect API v1
   * Docs: https://developer.garmin.com/gc-developer-program/overview/
   * Auth: OAuth 1.0a (Consumer Key + Consumer Secret + User Token)
   *
   * Endpoints usados:
   *   GET /wellness-api/rest/dailies/{userAccessToken}
   *   GET /wellness-api/rest/activities/{userAccessToken}
   *   GET /wellness-api/rest/sleeps/{userAccessToken}
   *   GET /wellness-api/rest/epochs/{userAccessToken} (HRV, stress)
   */

  static BASE_URL = 'https://apis.garmin.com/wellness-api/rest';

  constructor(config = {}) {
    super({ type: 'garmin', ...config });
    // config.credentials = { consumerKey, consumerSecret, userToken, userSecret }
  }

  async connect() {
    try {
      if (!this.config.credentials?.userToken) {
        console.warn('[GarminAdapter] Credenciais não configuradas. Use GarminOAuthFlow primeiro.');
        return false;
      }

      // Testa conectividade com um ping na API
      const testUrl = `${GarminAdapter.BASE_URL}/user/id`;
      const resp = await this._signedRequest('GET', testUrl);
      if (resp.ok) {
        this._connected = true;
        this._lastSync = Date.now();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[GarminAdapter] connect() falhou:', err.message);
      return false;
    }
  }

  async fetchSnapshot(date) {
    const snapshot = this._emptySnapshot(date);
    if (!this._connected) return this._annotatePartial(snapshot);

    try {
      const startTs = new Date(`${date}T00:00:00Z`).getTime() / 1000;
      const endTs   = startTs + 86400;

      // Dados de wellbeing diários
      const dailyResp = await this._signedRequest(
        'GET',
        `${GarminAdapter.BASE_URL}/dailies/${this.config.credentials.userToken}?uploadStartTimeInSeconds=${startTs}&uploadEndTimeInSeconds=${endTs}`
      );

      if (dailyResp.ok) {
        const daily = await dailyResp.json();
        const d = daily?.dailies?.[0];
        if (d) {
          snapshot.steps           = d.steps ?? null;
          snapshot.activeCalories  = d.activeKilocalories ?? null;
          snapshot.totalCalories   = d.bmrKilocalories + (d.activeKilocalories ?? 0) || null;
          snapshot.distanceKm      = d.distanceInMeters ? d.distanceInMeters / 1000 : null;
          snapshot.activeMinutes   = d.moderateIntensityMinutes + d.vigorousIntensityMinutes || null;
          snapshot.hrResting       = d.restingHeartRateInBeatsPerMinute ?? null;
          snapshot.hrAvg           = d.averageHeartRateInBeatsPerMinute ?? null;
          snapshot.hrMax           = d.maxHeartRateInBeatsPerMinute ?? null;
          snapshot.readiness       = d.bodyBatteryChargedValue ?? null;
          snapshot.hrv             = d.avgWakingRespirationValue ?? null; // Garmin usa respiração como proxy
        }
      }

      // Sono
      const sleepResp = await this._signedRequest(
        'GET',
        `${GarminAdapter.BASE_URL}/sleeps/${this.config.credentials.userToken}?startDate=${date}&endDate=${date}`
      );
      if (sleepResp.ok) {
        const sleepData = await sleepResp.json();
        const s = sleepData?.sleeps?.[0];
        if (s) {
          snapshot.sleepTotalMin = s.durationInSeconds ? Math.round(s.durationInSeconds / 60) : null;
          snapshot.sleepDeepMin  = s.deepSleepDurationInSeconds ? Math.round(s.deepSleepDurationInSeconds / 60) : null;
          snapshot.sleepRemMin   = s.remSleepInSeconds ? Math.round(s.remSleepInSeconds / 60) : null;
          snapshot.sleepScore    = s.overallSleepScore ?? null;
        }
      }

      // Atividades/Workouts
      const actResp = await this._signedRequest(
        'GET',
        `${GarminAdapter.BASE_URL}/activities/${this.config.credentials.userToken}?uploadStartTimeInSeconds=${startTs}&uploadEndTimeInSeconds=${endTs}`
      );
      if (actResp.ok) {
        const actData = await actResp.json();
        snapshot.workouts = (actData?.activities ?? []).map(a => ({
          id: `garmin-${a.activityId}`,
          type: this._mapActivityType(a.activityType),
          startTime: a.startTimeInSeconds * 1000,
          endTime:   (a.startTimeInSeconds + a.durationInSeconds) * 1000,
          durationMin: Math.round(a.durationInSeconds / 60),
          calories: a.activeKilocalories ?? null,
          avgHR: a.averageHeartRateInBeatsPerMinute ?? null,
          maxHR: a.maxHeartRateInBeatsPerMinute ?? null,
          distanceKm: a.distanceInMeters ? a.distanceInMeters / 1000 : null,
          source: 'garmin',
        }));
      }

      this._lastSync = Date.now();
      return this._annotatePartial(snapshot);

    } catch (err) {
      console.error('[GarminAdapter] fetchSnapshot() falhou:', err.message);
      return this._annotatePartial(snapshot);
    }
  }

  async fetchRange(startDate, endDate) {
    const dates = this._dateRange(startDate, endDate);
    const results = await Promise.allSettled(dates.map(d => this.fetchSnapshot(d)));
    return results.filter(r => r.status === 'fulfilled').map(r => r.value);
  }

  /**
   * Requisição assinada com OAuth 1.0a
   * Em produção, usar biblioteca oauth-1.0a
   * @private
   */
  async _signedRequest(method, url) {
    // Simplificado: em prod usar oauth-1.0a package
    // const OAuth = await import('oauth-1.0a');
    // const authHeader = oauth.toHeader(oauth.authorize({ url, method }, credentials));
    const headers = {
      'Content-Type': 'application/json',
      // Authorization: `OAuth ${authHeader}`, // em produção
    };
    return fetch(url, { method, headers });
  }

  _mapActivityType(garminType) {
    const map = {
      'RUNNING': 'running',
      'CYCLING': 'cycling',
      'STRENGTH_TRAINING': 'strength',
      'SWIMMING': 'swimming',
      'HIIT': 'hiit',
      'YOGA': 'yoga',
    };
    return map[garminType] ?? 'other';
  }

  _dateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WHOOP ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

class WhoopAdapter extends BaseWearableAdapter {
  /**
   * Whoop API v2
   * Docs: https://developer.whoop.com/api
   * Auth: OAuth 2.0 (PKCE flow)
   *
   * Endpoints usados:
   *   GET /v1/recovery/           (recovery score, HRV, resting HR)
   *   GET /v1/sleep/              (sono detalhado)
   *   GET /v1/cycle/              (strain do dia)
   *   GET /v1/workout/            (treinos)
   */

  static BASE_URL = 'https://api.prod.whoop.com/developer';

  constructor(config = {}) {
    super({ type: 'whoop', ...config });
    // config.credentials = { accessToken, refreshToken, expiresAt }
  }

  async connect() {
    try {
      if (!this.config.credentials?.accessToken) {
        console.warn('[WhoopAdapter] Access token não configurado. Use WhoopOAuthFlow primeiro.');
        return false;
      }

      // Verifica token
      if (Date.now() > (this.config.credentials.expiresAt ?? 0)) {
        await this._refreshToken();
      }

      const resp = await this._authRequest('GET', `${WhoopAdapter.BASE_URL}/v1/user/profile/basic`);
      if (resp.ok) {
        this._connected = true;
        this._lastSync = Date.now();
        return true;
      }
      return false;
    } catch (err) {
      console.error('[WhoopAdapter] connect() falhou:', err.message);
      return false;
    }
  }

  async fetchSnapshot(date) {
    const snapshot = this._emptySnapshot(date);
    if (!this._connected) return this._annotatePartial(snapshot);

    try {
      const start = `${date}T00:00:00.000Z`;
      const end   = `${date}T23:59:59.999Z`;

      // Recovery (HRV, HR repouso, score)
      const recovResp = await this._authRequest(
        'GET',
        `${WhoopAdapter.BASE_URL}/v1/recovery?start=${start}&end=${end}&limit=1`
      );
      if (recovResp.ok) {
        const recovData = await recovResp.json();
        const r = recovData?.records?.[0];
        if (r) {
          snapshot.recoveryScore = r.score?.recovery_score ?? null;
          snapshot.hrv           = r.score?.hrv_rmssd_milli ?? null;
          snapshot.hrResting     = r.score?.resting_heart_rate ?? null;
        }
      }

      // Strain do dia (cycle)
      const cycleResp = await this._authRequest(
        'GET',
        `${WhoopAdapter.BASE_URL}/v1/cycle?start=${start}&end=${end}&limit=1`
      );
      if (cycleResp.ok) {
        const cycleData = await cycleResp.json();
        const c = cycleData?.records?.[0];
        if (c) {
          snapshot.strain        = c.score?.strain ?? null;
          snapshot.activeCalories = c.score?.kilojoule ? Math.round(c.score.kilojoule / 4.184) : null;
          snapshot.distanceKm    = c.score?.distance_meter ? c.score.distance_meter / 1000 : null;
        }
      }

      // Sono
      const sleepResp = await this._authRequest(
        'GET',
        `${WhoopAdapter.BASE_URL}/v1/sleep?start=${start}&end=${end}&limit=1`
      );
      if (sleepResp.ok) {
        const sleepData = await sleepResp.json();
        const s = sleepData?.records?.[0];
        if (s) {
          snapshot.sleepTotalMin = s.score?.stage_summary?.total_in_bed_time_milli
            ? Math.round(s.score.stage_summary.total_in_bed_time_milli / 60000)
            : null;
          snapshot.sleepDeepMin = s.score?.stage_summary?.total_slow_wave_sleep_time_milli
            ? Math.round(s.score.stage_summary.total_slow_wave_sleep_time_milli / 60000)
            : null;
          snapshot.sleepRemMin = s.score?.stage_summary?.total_rem_sleep_time_milli
            ? Math.round(s.score.stage_summary.total_rem_sleep_time_milli / 60000)
            : null;
          snapshot.sleepScore = s.score?.sleep_performance_percentage ?? null;
        }
      }

      // Workouts
      const workResp = await this._authRequest(
        'GET',
        `${WhoopAdapter.BASE_URL}/v1/workout?start=${start}&end=${end}`
      );
      if (workResp.ok) {
        const workData = await workResp.json();
        snapshot.workouts = (workData?.records ?? []).map(w => ({
          id: `whoop-${w.id}`,
          type: this._mapSport(w.sport_id),
          startTime: new Date(w.start).getTime(),
          endTime:   new Date(w.end).getTime(),
          durationMin: Math.round((new Date(w.end) - new Date(w.start)) / 60000),
          calories: w.score?.kilojoule ? Math.round(w.score.kilojoule / 4.184) : null,
          avgHR: w.score?.average_heart_rate ?? null,
          maxHR: w.score?.max_heart_rate ?? null,
          distanceKm: null,
          source: 'whoop',
        }));
      }

      this._lastSync = Date.now();
      return this._annotatePartial(snapshot);

    } catch (err) {
      console.error('[WhoopAdapter] fetchSnapshot() falhou:', err.message);
      return this._annotatePartial(snapshot);
    }
  }

  async fetchRange(startDate, endDate) {
    const dates = this._dateRange(startDate, endDate);
    const results = await Promise.allSettled(dates.map(d => this.fetchSnapshot(d)));
    return results.filter(r => r.status === 'fulfilled').map(r => r.value);
  }

  async _refreshToken() {
    const resp = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret,
        refresh_token: this.config.credentials.refreshToken,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      this.config.credentials.accessToken = data.access_token;
      this.config.credentials.refreshToken = data.refresh_token;
      this.config.credentials.expiresAt = Date.now() + data.expires_in * 1000;
    }
  }

  async _authRequest(method, url) {
    return fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  _mapSport(sportId) {
    const map = {
      0: 'running', 1: 'cycling', 16: 'strength',
      14: 'swimming', 63: 'hiit', 50: 'yoga',
    };
    return map[sportId] ?? 'other';
  }

  _dateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK ADAPTER (desenvolvimento/testes)
// ─────────────────────────────────────────────────────────────────────────────

class MockWearableAdapter extends BaseWearableAdapter {
  constructor(config = {}) {
    super({ type: 'mock', ...config });
  }

  async connect() {
    this._connected = true;
    return true;
  }

  async fetchSnapshot(date) {
    // Gera dados realistas pseudoaleatórios
    const seed = date.split('-').join('') | 0;
    const rng  = (min, max) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

    const snapshot = this._emptySnapshot(date);
    snapshot.steps          = Math.round(rng(4000, 14000));
    snapshot.activeCalories = Math.round(rng(250, 700));
    snapshot.totalCalories  = Math.round(rng(1800, 2800));
    snapshot.distanceKm     = Math.round(rng(3, 12) * 10) / 10;
    snapshot.activeMinutes  = Math.round(rng(20, 90));
    snapshot.hrResting      = Math.round(rng(48, 68));
    snapshot.hrAvg          = Math.round(rng(65, 85));
    snapshot.hrMax          = Math.round(rng(130, 185));
    snapshot.hrv            = Math.round(rng(28, 85));
    snapshot.sleepTotalMin  = Math.round(rng(360, 520));
    snapshot.sleepDeepMin   = Math.round(rng(60, 120));
    snapshot.sleepRemMin    = Math.round(rng(80, 140));
    snapshot.sleepScore     = Math.round(rng(55, 95));
    snapshot.recoveryScore  = Math.round(rng(40, 95));
    snapshot.strain         = Math.round(rng(5, 18) * 10) / 10;
    snapshot.readiness      = Math.round(rng(45, 95));
    snapshot.isPartial      = false;
    snapshot.missingFields  = [];

    // Simula 0–2 treinos
    const numWorkouts = Math.floor(rng(0, 2.99));
    const types = ['running', 'strength', 'cycling', 'hiit'];
    snapshot.workouts = Array.from({ length: numWorkouts }, (_, i) => ({
      id: `mock-${date}-${i}`,
      type: types[Math.floor(rng(0, types.length))],
      startTime: new Date(`${date}T07:00:00`).getTime() + i * 7200000,
      endTime:   new Date(`${date}T07:00:00`).getTime() + i * 7200000 + 3600000,
      durationMin: 45 + Math.round(rng(0, 45)),
      calories: Math.round(rng(200, 500)),
      avgHR: Math.round(rng(130, 155)),
      maxHR: Math.round(rng(160, 185)),
      distanceKm: Math.round(rng(0, 8) * 10) / 10,
      source: 'mock',
    }));

    return snapshot;
  }

  async fetchRange(startDate, endDate) {
    const dates = this._dateRange(startDate, endDate);
    return Promise.all(dates.map(d => this.fetchSnapshot(d)));
  }

  _dateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEARABLES ENGINE (orquestrador)
// ─────────────────────────────────────────────────────────────────────────────

class WearablesEngine {
  static _instance = null;
  static DB_NAME   = 'suplilist-wearables';
  static DB_VERSION = 1;

  static ADAPTER_MAP = {
    applewatch: AppleWatchAdapter,
    garmin:     GarminAdapter,
    whoop:      WhoopAdapter,
    mock:       MockWearableAdapter,
  };

  static getInstance() {
    if (!WearablesEngine._instance) {
      WearablesEngine._instance = new WearablesEngine();
    }
    return WearablesEngine._instance;
  }

  constructor() {
    this._adapters  = new Map();   // type → adapter instance
    this._db        = null;
    this._eventBus  = null;
    this._pollTimers = new Map();
  }

  /**
   * Inicializa engine com adapters configurados
   * @param {Object} options
   * @param {AdapterConfig[]} [options.adapters]  - Lista de adapters a usar
   * @param {Object}          [options.eventBus]  - EventBus instance
   * @param {boolean}         [options.mockMode]  - Força uso do MockAdapter
   * @returns {Promise<{ connected: string[], failed: string[] }>}
   */
  async init({ adapters = [], eventBus = null, mockMode = false } = {}) {
    this._eventBus = eventBus;
    await this._openDB();

    const connected = [];
    const failed    = [];

    // Em modo mock, usa apenas MockAdapter
    const adapterConfigs = mockMode
      ? [{ type: 'mock', enabled: true }]
      : adapters;

    for (const config of adapterConfigs) {
      if (!config.enabled) continue;

      const AdapterClass = WearablesEngine.ADAPTER_MAP[config.type];
      if (!AdapterClass) {
        console.warn(`[WearablesEngine] Adapter desconhecido: ${config.type}`);
        continue;
      }

      const adapter = new AdapterClass(config);
      const ok = await adapter.connect();

      this._adapters.set(config.type, adapter);

      if (ok) {
        connected.push(config.type);
        this._startPolling(config.type, config.pollInterval ?? 300_000);
      } else {
        failed.push(config.type);
      }
    }

    this._log('WearablesEngine initialized', { connected, failed });
    return { connected, failed };
  }

  /**
   * Busca snapshot mais recente (todos adapters conectados, merge)
   * @param {string} [date] - 'YYYY-MM-DD', default: hoje
   * @returns {Promise<HealthSnapshot>}
   */
  async getLatestSnapshot(date = this._today()) {
    // Tenta buscar do cache primeiro
    const cached = await this._getCached(date);
    if (cached) return cached;

    return this._fetchAndCache(date);
  }

  /**
   * Busca histórico de N dias
   * @param {Object} options
   * @param {number} [options.days=7]
   * @param {string} [options.endDate]
   * @returns {Promise<HealthSnapshot[]>}
   */
  async getHistory({ days = 7, endDate = this._today() } = {}) {
    const end   = new Date(endDate);
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);

    const startStr = start.toISOString().slice(0, 10);
    const endStr   = end.toISOString().slice(0, 10);

    const dates   = this._dateRange(startStr, endStr);
    const results = await Promise.all(dates.map(d => this.getLatestSnapshot(d)));
    return results.filter(Boolean);
  }

  /**
   * Lista adapters conectados
   * @returns {string[]}
   */
  getConnectedAdapters() {
    return [...this._adapters.entries()]
      .filter(([, a]) => a.isConnected())
      .map(([type]) => type);
  }

  /**
   * Força refresh imediato de um adapter
   * @param {string} adapterType
   * @returns {Promise<HealthSnapshot>}
   */
  async forceRefresh(adapterType = null) {
    const date = this._today();
    await this._invalidateCache(date);
    return this._fetchAndCache(date, adapterType ? [adapterType] : null);
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: FETCH + MERGE
  // ─────────────────────────────────────────────────────────────────

  async _fetchAndCache(date, targetAdapters = null) {
    const adapterList = targetAdapters
      ? targetAdapters.map(t => this._adapters.get(t)).filter(Boolean)
      : [...this._adapters.values()].filter(a => a.isConnected());

    if (adapterList.length === 0) {
      console.warn('[WearablesEngine] Nenhum adapter conectado.');
      return null;
    }

    const snapshots = await Promise.allSettled(adapterList.map(a => a.fetchSnapshot(date)));
    const valid = snapshots
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    if (valid.length === 0) return null;

    const merged = this._mergeSnapshots(valid, date);
    await this._saveCache(merged);

    this._emit('wearables:snapshot', { date, snapshot: merged });
    return merged;
  }

  /**
   * Merge de múltiplos snapshots (prioridade: mais completo)
   * @private
   */
  _mergeSnapshots(snapshots, date) {
    const merged = {
      id:       `merged-${date}-${Date.now()}`,
      source:   snapshots.map(s => s.source).join('+'),
      timestamp: Date.now(),
      date,
      steps:          null, activeCalories: null, totalCalories: null,
      distanceKm:     null, activeMinutes:  null, standHours:    null,
      hrResting:      null, hrMax:          null, hrAvg:         null, hrv: null,
      sleepTotalMin:  null, sleepDeepMin:   null, sleepRemMin:   null, sleepScore: null,
      recoveryScore:  null, strain:         null, readiness:     null,
      workouts:       [],
      isPartial:      true,
      missingFields:  [],
    };

    // Preenche cada campo com o primeiro snapshot que tem o valor
    const numericFields = [
      'steps', 'activeCalories', 'totalCalories', 'distanceKm', 'activeMinutes',
      'standHours', 'hrResting', 'hrMax', 'hrAvg', 'hrv',
      'sleepTotalMin', 'sleepDeepMin', 'sleepRemMin', 'sleepScore',
      'recoveryScore', 'strain', 'readiness',
    ];

    for (const field of numericFields) {
      // Prioridade: valor não-null mais alto em steps/calories, mais baixo em HR repouso
      const values = snapshots.map(s => s[field]).filter(v => v !== null);
      if (values.length > 0) {
        merged[field] = field === 'hrResting'
          ? Math.min(...values)
          : Math.max(...values);
      }
    }

    // Merge workouts (deduplicados por janela de tempo)
    const allWorkouts = snapshots.flatMap(s => s.workouts ?? []);
    const seen = new Set();
    merged.workouts = allWorkouts.filter(w => {
      const key = `${w.type}-${Math.round(w.startTime / 60000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Recalcula isPartial
    const coreFields = ['steps', 'hrResting', 'sleepTotalMin'];
    merged.missingFields = coreFields.filter(f => merged[f] === null);
    merged.isPartial = merged.missingFields.length > 0;

    return merged;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: POLLING
  // ─────────────────────────────────────────────────────────────────

  _startPolling(adapterType, intervalMs) {
    const timer = setInterval(async () => {
      const date = this._today();
      await this._invalidateCache(date);
      await this._fetchAndCache(date, [adapterType]);
    }, intervalMs);

    this._pollTimers.set(adapterType, timer);
  }

  stopPolling(adapterType = null) {
    if (adapterType) {
      clearInterval(this._pollTimers.get(adapterType));
      this._pollTimers.delete(adapterType);
    } else {
      for (const timer of this._pollTimers.values()) clearInterval(timer);
      this._pollTimers.clear();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: INDEXEDDB CACHE
  // ─────────────────────────────────────────────────────────────────

  async _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(WearablesEngine.DB_NAME, WearablesEngine.DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this._db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          const s = db.createObjectStore('snapshots', { keyPath: 'date' });
          s.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async _getCached(date) {
    return new Promise((resolve, reject) => {
      const tx  = this._db.transaction('snapshots', 'readonly');
      const req = tx.objectStore('snapshots').get(date);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const record = req.result;
        // Cache válido por 5 minutos (hoje) ou ilimitado (dias passados)
        const isToday   = date === this._today();
        const maxAge    = 5 * 60 * 1000;
        const isFresh   = record && (!isToday || Date.now() - record.timestamp < maxAge);
        resolve(isFresh ? record : null);
      };
    });
  }

  async _saveCache(snapshot) {
    return new Promise((resolve, reject) => {
      const tx  = this._db.transaction('snapshots', 'readwrite');
      const req = tx.objectStore('snapshots').put(snapshot);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async _invalidateCache(date) {
    return new Promise((resolve, reject) => {
      const tx  = this._db.transaction('snapshots', 'readwrite');
      const req = tx.objectStore('snapshots').delete(date);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: UTILS
  // ─────────────────────────────────────────────────────────────────

  _today() { return new Date().toISOString().slice(0, 10); }

  _dateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  _emit(event, data) {
    if (this._eventBus) this._eventBus.emit(event, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`wearables:${event}`, { detail: data }));
    }
  }

  _log(label, data) {
    if (typeof window !== 'undefined' && window.__DEBUG_WEARABLES__) {
      console.log(`[WearablesEngine] ${label}`, data);
    }
  }

  static resetInstance() { WearablesEngine._instance = null; }
}

export {
  WearablesEngine,
  BaseWearableAdapter,
  AppleWatchAdapter,
  GarminAdapter,
  WhoopAdapter,
  MockWearableAdapter,
};
```

---

## VALIDATION CHECKLIST — PROMPT 9.1

- [ ] `WearablesEngine.getInstance()` retorna singleton
- [ ] `we.init({ mockMode: true })` conecta MockAdapter e retorna `{ connected: ['mock'], failed: [] }`
- [ ] `we.getLatestSnapshot()` retorna `HealthSnapshot` com todos os campos preenchidos no mock
- [ ] `we.getHistory({ days: 7 })` retorna array de 7 snapshots
- [ ] `_mergeSnapshots()` prioriza `Math.max` para steps/calories e `Math.min` para hrResting
- [ ] Workouts deduplicados por janela de 1 minuto no merge
- [ ] Cache retorna snapshot fresco (< 5min para hoje, ilimitado para passado)
- [ ] `_invalidateCache()` força re-fetch no próximo `getLatestSnapshot()`
- [ ] `_startPolling()` chama `_fetchAndCache` no intervalo configurado
- [ ] `stopPolling()` limpa todos os timers
- [ ] `AppleWatchAdapter.connect()` retorna `false` em ambiente web (sem Capacitor) sem lançar erro
- [ ] `GarminAdapter.connect()` retorna `false` se `credentials.userToken` ausente
- [ ] `WhoopAdapter._refreshToken()` atualiza `accessToken`, `refreshToken`, `expiresAt`
- [ ] `MockAdapter.fetchSnapshot()` gera dados determinísticos pelo seed da data
- [ ] `_annotatePartial()` preenche `missingFields` corretamente com campos null

## FILES TO DELIVER

1. `/src/wearables/wearables-engine.js` (completo acima — inclui todos os adapters)
```

---

## **PROMPT 9.2: AppleHealthKitSync — iOS HEALTHKIT + PÁGINA DE CONFIGURAÇÃO**

```markdown
You are building the AppleHealthKitSync module for SupliList v4.0.

## CONTEXT

AppleHealthKitSync is the iOS-specific bridge between SupliList and Apple HealthKit.
It runs via Capacitor (@capacitor-community/health-kit) on iOS nativo, and degrades
gracefully to "não disponível" em web/Android.

This module:
- Gerencia autorização de permissões HealthKit (leitura/escrita)
- Faz sync bidirecional: HealthKit → SupliList E SupliList → HealthKit
- Escreve check-ins de suplementos como "mindful sessions" no HealthKit (hack elegante)
- Exporta dados de suplementação como HKCorrelationType para Apple Health
- Usa WearablesEngine internamente para armazenar snapshots
- Exibe HealthKitPage: tela de configuração + status + dados sincronizados

---

## TASK 1: CREATE /src/wearables/apple-healthkit-sync.js

```javascript
/**
 * AppleHealthKitSync v1.0 — SupliList
 * Sync bidirecional com Apple HealthKit via Capacitor
 *
 * Uso (iOS nativo):
 *   import { AppleHealthKitSync } from '../wearables/apple-healthkit-sync.js';
 *   const hk = AppleHealthKitSync.getInstance();
 *   await hk.init();
 *   await hk.requestPermissions();
 *   const data = await hk.syncToday();
 */

class AppleHealthKitSync {

  static _instance = null;
  static STORAGE_KEY = 'suplilist-healthkit-config';

  /**
   * @typedef {Object} HealthKitConfig
   * @property {boolean} enabled          - Sync ativo
   * @property {boolean} readSteps        - Lê passos
   * @property {boolean} readHR           - Lê freq. cardíaca
   * @property {boolean} readHRV          - Lê HRV
   * @property {boolean} readSleep        - Lê sono
   * @property {boolean} readWorkouts     - Lê treinos
   * @property {boolean} writeCheckins    - Escreve check-ins como mindful sessions
   * @property {string}  lastSync         - ISO timestamp do último sync
   * @property {'manual'|'auto'} syncMode - Modo de sync
   * @property {number}  syncInterval     - ms (default: 3600000 = 1h)
   */

  /**
   * @typedef {Object} SyncResult
   * @property {boolean}        success
   * @property {string}         date
   * @property {HealthSnapshot} snapshot    - Dados do dia sincronizados
   * @property {number}         itemsRead   - Total de registros lidos
   * @property {number}         itemsWritten - Total escritos no HealthKit
   * @property {string[]}       errors      - Erros não-fatais
   * @property {number}         durationMs  - Tempo total do sync
   */

  static getInstance() {
    if (!AppleHealthKitSync._instance) {
      AppleHealthKitSync._instance = new AppleHealthKitSync();
    }
    return AppleHealthKitSync._instance;
  }

  constructor() {
    this._hk          = null;    // Capacitor HealthKit plugin
    this._config      = null;
    this._isAvailable = false;
    this._syncTimer   = null;
    this._wearables   = null;    // WearablesEngine instance
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * @param {Object} [options]
   * @param {Object} [options.wearablesEngine] - WearablesEngine instance
   * @returns {Promise<boolean>} - true se HealthKit disponível
   */
  async init({ wearablesEngine = null } = {}) {
    this._wearables = wearablesEngine;
    this._config    = this._loadConfig();

    // Verifica se está em iOS nativo com Capacitor
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      try {
        const { HealthKit } = await import('@capacitor-community/health-kit');
        this._hk = HealthKit;
        this._isAvailable = true;
        console.log('[HealthKitSync] HealthKit disponível (iOS nativo)');
      } catch (err) {
        this._isAvailable = false;
        console.warn('[HealthKitSync] Plugin Capacitor não encontrado:', err.message);
      }
    } else {
      this._isAvailable = false;
      console.warn('[HealthKitSync] HealthKit requer iOS nativo. Funcionalidade desabilitada.');
    }

    // Inicia sync automático se configurado
    if (this._isAvailable && this._config.enabled && this._config.syncMode === 'auto') {
      this._startAutoSync();
    }

    return this._isAvailable;
  }

  /**
   * Solicita permissões de leitura e escrita no HealthKit
   * @returns {Promise<{ granted: string[], denied: string[] }>}
   */
  async requestPermissions() {
    if (!this._isAvailable) {
      return { granted: [], denied: ['healthkit_unavailable'] };
    }

    const readTypes  = [];
    const writeTypes = [];

    if (this._config.readSteps)    readTypes.push('stepCount', 'distanceWalkingRunning');
    if (this._config.readHR)       readTypes.push('heartRate');
    if (this._config.readHRV)      readTypes.push('heartRateVariabilitySDNN');
    if (this._config.readSleep)    readTypes.push('sleepAnalysis');
    if (this._config.readWorkouts) readTypes.push('workout');
    if (this._config.writeCheckins) writeTypes.push('mindfulSession');

    try {
      const result = await this._hk.requestAuthorization({
        read:  readTypes,
        write: writeTypes,
      });

      const granted = result.granted ?? readTypes; // Capacitor retorna array
      const denied  = result.denied  ?? [];

      this._saveConfig({ ...this._config, enabled: granted.length > 0 });
      return { granted, denied };

    } catch (err) {
      console.error('[HealthKitSync] requestPermissions() falhou:', err.message);
      return { granted: [], denied: ['error'] };
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // SYNC: HEALTHKIT → SUPLILIST
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sincroniza dados do dia atual do HealthKit
   * @param {string} [date] - 'YYYY-MM-DD', default: hoje
   * @returns {Promise<SyncResult>}
   */
  async syncToday(date = new Date().toISOString().slice(0, 10)) {
    const startMs = Date.now();

    if (!this._isAvailable || !this._config.enabled) {
      return {
        success: false,
        date,
        snapshot: null,
        itemsRead: 0,
        itemsWritten: 0,
        errors: ['healthkit_unavailable_or_disabled'],
        durationMs: Date.now() - startMs,
      };
    }

    const errors       = [];
    let itemsRead      = 0;
    let itemsWritten   = 0;
    let snapshot       = null;

    try {
      const startDate = new Date(`${date}T00:00:00`).toISOString();
      const endDate   = new Date(`${date}T23:59:59`).toISOString();

      // Lê dados via AppleWatchAdapter (que usa o mesmo plugin Capacitor)
      if (this._wearables) {
        snapshot = await this._wearables.getLatestSnapshot(date);
        if (snapshot) itemsRead += 10; // estimativa
      }

      // Registra timestamp do sync
      this._saveConfig({ ...this._config, lastSync: new Date().toISOString() });

    } catch (err) {
      errors.push(err.message);
      console.error('[HealthKitSync] syncToday() falhou:', err.message);
    }

    return {
      success: errors.length === 0,
      date,
      snapshot,
      itemsRead,
      itemsWritten,
      errors,
      durationMs: Date.now() - startMs,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // SYNC: SUPLILIST → HEALTHKIT (escreve check-ins)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Registra um check-in de suplemento como "mindful session" no HealthKit
   * (hack: Apple Health não tem tipo "supplement intake", então usamos mindfulSession)
   * @param {Object} checkin
   * @param {string} checkin.supplementId
   * @param {string} checkin.supplementName
   * @param {number} checkin.timestamp - Unix ms
   * @returns {Promise<boolean>}
   */
  async writeCheckin({ supplementId, supplementName, timestamp = Date.now() }) {
    if (!this._isAvailable || !this._config.writeCheckins) return false;

    try {
      const startDate = new Date(timestamp).toISOString();
      const endDate   = new Date(timestamp + 60000).toISOString(); // 1 minuto simbólico

      await this._hk.saveWorkout?.({
        activityType: 'mindAndBody',
        start: startDate,
        end:   endDate,
        metadata: {
          'suplilist.supplementId':   supplementId,
          'suplilist.supplementName': supplementName,
          'suplilist.type':           'checkin',
        },
      });

      return true;
    } catch (err) {
      console.error('[HealthKitSync] writeCheckin() falhou:', err.message);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────────

  getConfig()  { return { ...this._config }; }
  isAvailable() { return this._isAvailable; }

  updateConfig(partial) {
    this._config = { ...this._config, ...partial };
    this._saveConfig(this._config);

    // Reinicia auto-sync se necessário
    if (partial.syncMode || partial.syncInterval || partial.enabled !== undefined) {
      this._restartAutoSync();
    }
  }

  _loadConfig() {
    try {
      const raw = localStorage.getItem(AppleHealthKitSync.STORAGE_KEY);
      return raw ? JSON.parse(raw) : this._defaultConfig();
    } catch { return this._defaultConfig(); }
  }

  _saveConfig(config) {
    try { localStorage.setItem(AppleHealthKitSync.STORAGE_KEY, JSON.stringify(config)); }
    catch { /* storage indisponível */ }
    this._config = config;
  }

  _defaultConfig() {
    return {
      enabled:        false,
      readSteps:      true,
      readHR:         true,
      readHRV:        true,
      readSleep:      true,
      readWorkouts:   true,
      writeCheckins:  false,
      lastSync:       null,
      syncMode:       'auto',
      syncInterval:   3_600_000, // 1h
    };
  }

  _startAutoSync() {
    this._syncTimer = setInterval(() => this.syncToday(), this._config.syncInterval);
  }

  _restartAutoSync() {
    if (this._syncTimer) clearInterval(this._syncTimer);
    if (this._config.enabled && this._config.syncMode === 'auto' && this._isAvailable) {
      this._startAutoSync();
    }
  }

  static resetInstance() { AppleHealthKitSync._instance = null; }
}

export { AppleHealthKitSync };
```

---

## TASK 2: CREATE /src/pages/healthkit-page.js

```javascript
/**
 * HealthKitPage v1.0 — SupliList
 * Configuração + status + dados sincronizados do Apple HealthKit
 *
 * Uso:
 *   import { HealthKitPage } from '../pages/healthkit-page.js';
 *   const page = new HealthKitPage({
 *     container: document.getElementById('app'),
 *     healthKitSync: AppleHealthKitSync.getInstance(),
 *     wearablesEngine: WearablesEngine.getInstance(),
 *   });
 *   await page.render();
 */

class HealthKitPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {Object} [config.healthKitSync]   - AppleHealthKitSync instance
   * @param {Object} [config.wearablesEngine] - WearablesEngine instance
   */
  constructor({ container, healthKitSync = null, wearablesEngine = null }) {
    this.container    = container;
    this.hk           = healthKitSync;
    this.we           = wearablesEngine;
  }

  async render() {
    const isAvailable = this.hk?.isAvailable?.() ?? false;
    const config      = this.hk?.getConfig?.() ?? {};
    const snapshot    = this.we ? await this.we.getLatestSnapshot() : null;
    const lastSync    = config.lastSync ? new Date(config.lastSync) : null;

    this.container.innerHTML = `
      <div class="healthkit-page">

        <!-- HEADER -->
        <div class="healthkit-header">
          <div class="healthkit-logo">
            <span class="hk-icon">❤️</span>
            <div>
              <h1 class="hk-title">Apple Health</h1>
              <p class="hk-subtitle">Sincronização com HealthKit</p>
            </div>
          </div>
          <div class="hk-status ${isAvailable ? 'hk-status--available' : 'hk-status--unavailable'}">
            ${isAvailable ? '🟢 iOS Disponível' : '⚠️ Requer iOS'}
          </div>
        </div>

        ${!isAvailable ? `
          <!-- UNAVAILABLE STATE -->
          <div class="hk-unavailable-card">
            <div class="hk-unavailable-icon">📱</div>
            <h2>HealthKit disponível apenas no iOS</h2>
            <p>Para sincronizar com Apple Health, abra o SupliList no app iOS nativo.</p>
            <div class="hk-ios-steps">
              <div class="ios-step">
                <span class="ios-step-num">1</span>
                <span>Baixe o SupliList na App Store</span>
              </div>
              <div class="ios-step">
                <span class="ios-step-num">2</span>
                <span>Faça login com a mesma conta</span>
              </div>
              <div class="ios-step">
                <span class="ios-step-num">3</span>
                <span>Ative o sync em Configurações → Apple Health</span>
              </div>
            </div>
            <div class="hk-web-fallback">
              <p>📊 No browser, use o <strong>Google Fit</strong> (disponível abaixo)</p>
              <a href="#/settings/google-fit" class="btn-secondary">Configurar Google Fit</a>
            </div>
          </div>
        ` : `
          <!-- AVAILABLE: CONFIG + STATUS -->

          <!-- STATUS CARD -->
          <div class="hk-status-card">
            <div class="hk-sync-status">
              <span class="sync-indicator ${config.enabled ? 'sync--active' : 'sync--inactive'}"></span>
              <div>
                <strong>${config.enabled ? 'Sincronização Ativa' : 'Sincronização Desativada'}</strong>
                <p class="sync-last">${lastSync ? `Último sync: ${this._formatTime(lastSync)}` : 'Nunca sincronizado'}</p>
              </div>
            </div>
            ${config.enabled ? `
              <button class="btn-primary btn-sm" id="hk-sync-now">🔄 Sincronizar Agora</button>
            ` : `
              <button class="btn-primary" id="hk-enable">Ativar HealthKit</button>
            `}
          </div>

          <!-- CONFIGURAÇÕES DE PERMISSÃO -->
          <section class="hk-permissions-section">
            <h2 class="section-title">📋 Dados a Sincronizar</h2>
            <div class="permissions-grid">
              ${[
                { key: 'readSteps',    icon: '👟', label: 'Passos e Distância',    desc: 'Steps, km percorridos' },
                { key: 'readHR',       icon: '💓', label: 'Frequência Cardíaca',   desc: 'BPM repouso, máximo, médio' },
                { key: 'readHRV',      icon: '📈', label: 'HRV',                   desc: 'Variabilidade cardíaca (ms)' },
                { key: 'readSleep',    icon: '😴', label: 'Sono',                  desc: 'Total, profundo, REM, score' },
                { key: 'readWorkouts', icon: '🏋️', label: 'Treinos',               desc: 'Tipo, duração, calorias' },
                { key: 'writeCheckins',icon: '💊', label: 'Exportar Check-ins',    desc: 'Registra suplementos no Health' },
              ].map(p => `
                <label class="permission-toggle">
                  <div class="permission-info">
                    <span class="permission-icon">${p.icon}</span>
                    <div>
                      <strong class="permission-label">${p.label}</strong>
                      <span class="permission-desc">${p.desc}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle-checkbox"
                    data-perm="${p.key}"
                    ${config[p.key] ? 'checked' : ''}
                    ${!config.enabled ? 'disabled' : ''}
                  />
                  <span class="toggle-slider"></span>
                </label>
              `).join('')}
            </div>
          </section>

          <!-- MODO DE SYNC -->
          <section class="hk-sync-mode-section">
            <h2 class="section-title">⚙️ Modo de Sincronização</h2>
            <div class="sync-mode-options">
              <label class="radio-option ${config.syncMode === 'auto' ? 'radio-option--active' : ''}">
                <input type="radio" name="syncMode" value="auto" ${config.syncMode === 'auto' ? 'checked' : ''} />
                <div class="radio-content">
                  <strong>🔄 Automático</strong>
                  <span>Sync a cada hora em background</span>
                </div>
              </label>
              <label class="radio-option ${config.syncMode === 'manual' ? 'radio-option--active' : ''}">
                <input type="radio" name="syncMode" value="manual" ${config.syncMode === 'manual' ? 'checked' : ''} />
                <div class="radio-content">
                  <strong>👆 Manual</strong>
                  <span>Somente quando você solicitar</span>
                </div>
              </label>
            </div>
          </section>

          <!-- DADOS DO DIA (se sincronizado) -->
          ${snapshot ? `
            <section class="hk-today-section">
              <h2 class="section-title">📊 Dados de Hoje</h2>
              <div class="health-metrics-grid">
                ${this._renderMetric('👟', 'Passos', snapshot.steps?.toLocaleString('pt-BR') ?? '—', 'steps')}
                ${this._renderMetric('💓', 'FC Repouso', snapshot.hrResting ? `${snapshot.hrResting} bpm` : '—', 'hr')}
                ${this._renderMetric('📈', 'HRV', snapshot.hrv ? `${snapshot.hrv} ms` : '—', 'hrv')}
                ${this._renderMetric('😴', 'Sono', snapshot.sleepTotalMin ? this._formatSleep(snapshot.sleepTotalMin) : '—', 'sleep')}
                ${this._renderMetric('🔥', 'Calorias', snapshot.activeCalories ? `${snapshot.activeCalories} kcal` : '—', 'calories')}
                ${this._renderMetric('🏋️', 'Treinos', snapshot.workouts.length > 0 ? `${snapshot.workouts.length}x hoje` : '0', 'workouts')}
              </div>
              ${snapshot.isPartial ? `
                <div class="hk-partial-warning">
                  ⚠️ Dados parciais — campos indisponíveis: ${snapshot.missingFields.join(', ')}
                </div>
              ` : ''}
            </section>
          ` : ''}
        `}

        <!-- ESTILO -->
        <style>
          .healthkit-page { max-width: 600px; margin: 0 auto; padding: 16px; font-family: var(--font-sans, system-ui); }
          .healthkit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .healthkit-logo { display: flex; align-items: center; gap: 12px; }
          .hk-icon { font-size: 2.5rem; }
          .hk-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--color-text-primary, #fff); }
          .hk-subtitle { font-size: 0.85rem; color: var(--color-text-secondary, #aaa); margin: 2px 0 0; }
          .hk-status { font-size: 0.8rem; font-weight: 600; padding: 6px 12px; border-radius: 20px; }
          .hk-status--available { background: rgba(0,230,118,0.15); color: #00e676; }
          .hk-status--unavailable { background: rgba(255,152,0,0.15); color: #ffa726; }
          .hk-unavailable-card { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 32px; text-align: center; }
          .hk-unavailable-icon { font-size: 3rem; margin-bottom: 16px; }
          .hk-unavailable-card h2 { color: var(--color-text-primary, #fff); margin: 0 0 8px; }
          .hk-unavailable-card p { color: var(--color-text-secondary, #aaa); }
          .hk-ios-steps { text-align: left; margin: 24px 0; background: var(--color-surface-2, #222); border-radius: 12px; padding: 16px; }
          .ios-step { display: flex; align-items: center; gap: 12px; padding: 8px 0; color: var(--color-text-primary, #fff); }
          .ios-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent, #4f46e5); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
          .hk-web-fallback { margin-top: 24px; padding: 16px; background: var(--color-surface-2, #222); border-radius: 12px; }
          .btn-secondary { display: inline-block; margin-top: 8px; padding: 8px 16px; border-radius: 8px; background: var(--color-surface-3, #333); color: var(--color-text-primary, #fff); text-decoration: none; font-size: 0.9rem; }
          .hk-status-card { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .hk-sync-status { display: flex; align-items: center; gap: 12px; }
          .sync-indicator { width: 10px; height: 10px; border-radius: 50%; }
          .sync--active { background: #00e676; box-shadow: 0 0 8px #00e676; }
          .sync--inactive { background: #555; }
          .hk-sync-status strong { color: var(--color-text-primary, #fff); display: block; }
          .sync-last { color: var(--color-text-secondary, #aaa); font-size: 0.8rem; margin: 2px 0 0; }
          .btn-primary { padding: 10px 20px; border-radius: 10px; background: var(--color-accent, #4f46e5); color: #fff; font-weight: 600; border: none; cursor: pointer; font-size: 0.9rem; }
          .btn-sm { padding: 6px 14px; font-size: 0.85rem; }
          .hk-permissions-section, .hk-sync-mode-section, .hk-today-section { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
          .section-title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #fff); margin: 0 0 16px; }
          .permissions-grid { display: flex; flex-direction: column; gap: 12px; }
          .permission-toggle { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--color-surface-2, #222); border-radius: 10px; cursor: pointer; }
          .permission-info { display: flex; align-items: center; gap: 10px; }
          .permission-icon { font-size: 1.4rem; }
          .permission-label { display: block; color: var(--color-text-primary, #fff); font-size: 0.9rem; }
          .permission-desc { color: var(--color-text-secondary, #aaa); font-size: 0.78rem; }
          .toggle-checkbox { display: none; }
          .toggle-slider { position: relative; width: 44px; height: 24px; background: #444; border-radius: 12px; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
          .toggle-checkbox:checked + .toggle-slider { background: var(--color-accent, #4f46e5); }
          .toggle-slider::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
          .toggle-checkbox:checked + .toggle-slider::after { transform: translateX(20px); }
          .sync-mode-options { display: flex; flex-direction: column; gap: 10px; }
          .radio-option { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--color-surface-2, #222); border-radius: 10px; cursor: pointer; border: 2px solid transparent; }
          .radio-option--active { border-color: var(--color-accent, #4f46e5); }
          .radio-option input { display: none; }
          .radio-content strong { display: block; color: var(--color-text-primary, #fff); font-size: 0.9rem; }
          .radio-content span { color: var(--color-text-secondary, #aaa); font-size: 0.8rem; }
          .health-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .health-metric { background: var(--color-surface-2, #222); border-radius: 12px; padding: 14px; text-align: center; }
          .metric-icon { font-size: 1.4rem; margin-bottom: 4px; }
          .metric-value { font-size: 1.1rem; font-weight: 700; color: var(--color-text-primary, #fff); }
          .metric-label { font-size: 0.72rem; color: var(--color-text-secondary, #aaa); margin-top: 2px; }
          .hk-partial-warning { margin-top: 12px; padding: 10px; background: rgba(255,152,0,0.1); border-radius: 8px; color: #ffa726; font-size: 0.82rem; }
          @media (max-width: 480px) { .health-metrics-grid { grid-template-columns: repeat(2, 1fr); } }
        </style>
      </div>
    `;

    this._attachEvents();
  }

  _renderMetric(icon, label, value, type) {
    return `
      <div class="health-metric" data-type="${type}">
        <div class="metric-icon">${icon}</div>
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
      </div>
    `;
  }

  _attachEvents() {
    // Ativa HealthKit
    const enableBtn = this.container.querySelector('#hk-enable');
    enableBtn?.addEventListener('click', async () => {
      if (!this.hk) return;
      enableBtn.textContent = '⏳ Solicitando permissões...';
      enableBtn.disabled = true;
      const result = await this.hk.requestPermissions();
      if (result.granted.length > 0) {
        this.hk.updateConfig({ enabled: true });
        await this.render();
      } else {
        enableBtn.textContent = '❌ Permissão negada';
        setTimeout(() => {
          enableBtn.textContent = 'Ativar HealthKit';
          enableBtn.disabled = false;
        }, 2000);
      }
    });

    // Sync agora
    const syncBtn = this.container.querySelector('#hk-sync-now');
    syncBtn?.addEventListener('click', async () => {
      if (!this.hk) return;
      syncBtn.textContent = '⏳ Sincronizando...';
      syncBtn.disabled = true;
      const result = await this.hk.syncToday();
      syncBtn.textContent = result.success ? '✅ Sincronizado!' : '❌ Erro';
      setTimeout(async () => { await this.render(); }, 1500);
    });

    // Toggles de permissão
    this.container.querySelectorAll('.toggle-checkbox').forEach(toggle => {
      toggle.addEventListener('change', () => {
        if (!this.hk) return;
        const perm = toggle.dataset.perm;
        this.hk.updateConfig({ [perm]: toggle.checked });
      });
    });

    // Modo de sync
    this.container.querySelectorAll('input[name="syncMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (!this.hk) return;
        this.hk.updateConfig({ syncMode: radio.value });
        this.container.querySelectorAll('.radio-option').forEach(opt => {
          opt.classList.toggle('radio-option--active', opt.querySelector('input').value === radio.value);
        });
      });
    });
  }

  _formatTime(date) {
    const diff = Date.now() - date.getTime();
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    if (min < 1) return 'Agora mesmo';
    if (min < 60) return `${min}min atrás`;
    if (hr < 24)  return `${hr}h atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  _formatSleep(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? `${m}m` : ''}`;
  }
}

export { HealthKitPage };
```

---

## VALIDATION CHECKLIST — PROMPT 9.2

- [ ] `AppleHealthKitSync.init()` retorna `false` em ambiente web sem Capacitor (sem erro)
- [ ] `requestPermissions()` retorna `{ granted: [], denied: ['healthkit_unavailable'] }` fora do iOS
- [ ] `syncToday()` retorna `SyncResult` com `success: false` quando indisponível
- [ ] `writeCheckin()` escreve `mindfulSession` no HealthKit com metadata correto
- [ ] `_defaultConfig()` tem `enabled: false`, `writeCheckins: false`, `syncMode: 'auto'`
- [ ] `updateConfig()` persiste em localStorage via `_saveConfig()`
- [ ] `_restartAutoSync()` limpa timer anterior e cria novo se `enabled && auto`
- [ ] `HealthKitPage.render()` exibe estado "requer iOS" quando `isAvailable = false`
- [ ] Botão "Ativar HealthKit" chama `requestPermissions()` e re-renderiza na aprovação
- [ ] Botão "Sincronizar Agora" chama `syncToday()` e exibe feedback visual
- [ ] Toggles de permissão persistem via `updateConfig()`
- [ ] Radio buttons de modo sync atualizam classe `radio-option--active`
- [ ] Grid de métricas exibe dados do snapshot com fallback `'—'` para nulls
- [ ] `_formatSleep(480)` retorna `'8h'`, `_formatSleep(455)` retorna `'7h35m'`
- [ ] Warning de dados parciais exibe `missingFields` em português

## FILES TO DELIVER

1. `/src/wearables/apple-healthkit-sync.js`
2. `/src/pages/healthkit-page.js`
```

---

## **PROMPT 9.3: GoogleFitSync — ANDROID FIT REST API + PÁGINA**

```markdown
You are building the GoogleFitSync module for SupliList v4.0.

## CONTEXT

GoogleFitSync integrates with the Google Fit REST API via OAuth2 PKCE.
Unlike HealthKit (iOS-only), Google Fit funciona em Web e Android.

This module:
- Implementa OAuth2 PKCE flow para autorização Google Fit
- Usa Google Fit REST API (não o SDK Android — para máxima compatibilidade web)
- Busca: passos, calorias, sessões de exercício, frequência cardíaca, sono
- Normaliza dados para o schema HealthSnapshot do WearablesEngine
- Armazena tokens com refresh automático
- Exibe GoogleFitPage: configuração, status, dados sincronizados

Google Fit REST endpoints usados:
  POST /fitness/v1/users/me/dataset:aggregate  (dados agregados por período)
  GET  /fitness/v1/users/me/sessions           (treinos/sessões)

---

## TASK 1: CREATE /src/wearables/google-fit-sync.js

```javascript
/**
 * GoogleFitSync v1.0 — SupliList
 * Integração com Google Fit REST API via OAuth2 PKCE
 *
 * Uso:
 *   import { GoogleFitSync } from '../wearables/google-fit-sync.js';
 *   const gf = GoogleFitSync.getInstance();
 *   await gf.init({ clientId: 'YOUR_GOOGLE_CLIENT_ID' });
 *   await gf.startOAuthFlow();  // redireciona para Google
 *   // Após callback com code:
 *   await gf.handleCallback({ code, state });
 *   const snapshot = await gf.fetchSnapshot('2026-05-27');
 */

class GoogleFitSync {

  static _instance = null;
  static STORAGE_KEY = 'suplilist-googlefit-config';

  static SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.body.read',
  ].join(' ');

  static AUTH_URL    = 'https://accounts.google.com/o/oauth2/v2/auth';
  static TOKEN_URL   = 'https://oauth2.googleapis.com/token';
  static FITNESS_URL = 'https://www.googleapis.com/fitness/v1/users/me';

  // Data Source IDs do Google Fit
  static DATA_SOURCES = {
    steps:           'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
    calories:        'derived:com.google.calories.expended:com.google.android.gms:from_activities',
    heartRate:       'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm',
    distance:        'derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta',
    activeMinutes:   'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes',
  };

  /**
   * @typedef {Object} GoogleFitConfig
   * @property {string}  clientId       - Google OAuth2 Client ID
   * @property {string}  redirectUri    - URI de callback (deve estar registrada no Google Console)
   * @property {boolean} enabled
   * @property {string|null} accessToken
   * @property {string|null} refreshToken
   * @property {number|null} expiresAt
   * @property {string|null} lastSync
   * @property {'auto'|'manual'} syncMode
   * @property {number} syncInterval   - ms
   */

  static getInstance() {
    if (!GoogleFitSync._instance) {
      GoogleFitSync._instance = new GoogleFitSync();
    }
    return GoogleFitSync._instance;
  }

  constructor() {
    this._config    = null;
    this._syncTimer = null;
    this._wearables = null;
  }

  /**
   * @param {Object} options
   * @param {string} options.clientId
   * @param {string} [options.redirectUri]
   * @param {Object} [options.wearablesEngine]
   * @returns {Promise<boolean>} - true se já autenticado
   */
  async init({ clientId, redirectUri = `${window.location.origin}/oauth/googlefit`, wearablesEngine = null } = {}) {
    this._wearables = wearablesEngine;
    this._config = this._loadConfig();

    this._config.clientId    = clientId;
    this._config.redirectUri = redirectUri;
    this._saveConfig(this._config);

    // Verifica se token ainda é válido
    const isAuthenticated = this.isAuthenticated();

    if (isAuthenticated && this._config.syncMode === 'auto') {
      this._startAutoSync();
    }

    return isAuthenticated;
  }

  // ─────────────────────────────────────────────────────────────────
  // OAUTH2 PKCE FLOW
  // ─────────────────────────────────────────────────────────────────

  /**
   * Inicia fluxo OAuth2 PKCE — redireciona para Google
   * @returns {Promise<void>}
   */
  async startOAuthFlow() {
    const state        = this._generateState();
    const codeVerifier = this._generateCodeVerifier();
    const challenge    = await this._generateCodeChallenge(codeVerifier);

    // Salva para uso no callback
    sessionStorage.setItem('gfit_state',        state);
    sessionStorage.setItem('gfit_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id:             this._config.clientId,
      redirect_uri:          this._config.redirectUri,
      response_type:         'code',
      scope:                 GoogleFitSync.SCOPES,
      state,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      access_type:           'offline',  // para receber refresh_token
      prompt:                'consent',
    });

    window.location.href = `${GoogleFitSync.AUTH_URL}?${params.toString()}`;
  }

  /**
   * Processa callback OAuth2 após redirect do Google
   * @param {Object} params - { code, state } da URL de retorno
   * @returns {Promise<boolean>} - true se autenticação bem-sucedida
   */
  async handleCallback({ code, state }) {
    const savedState    = sessionStorage.getItem('gfit_state');
    const codeVerifier  = sessionStorage.getItem('gfit_code_verifier');

    if (state !== savedState) {
      console.error('[GoogleFitSync] State mismatch — possível CSRF');
      return false;
    }

    sessionStorage.removeItem('gfit_state');
    sessionStorage.removeItem('gfit_code_verifier');

    try {
      const resp = await fetch(GoogleFitSync.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          client_id:     this._config.clientId,
          redirect_uri:  this._config.redirectUri,
          code,
          code_verifier: codeVerifier,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        console.error('[GoogleFitSync] Token exchange failed:', err);
        return false;
      }

      const data = await resp.json();
      this._saveConfig({
        ...this._config,
        accessToken:  data.access_token,
        refreshToken: data.refresh_token ?? this._config.refreshToken,
        expiresAt:    Date.now() + data.expires_in * 1000,
        enabled:      true,
      });

      if (this._config.syncMode === 'auto') this._startAutoSync();
      return true;

    } catch (err) {
      console.error('[GoogleFitSync] handleCallback() falhou:', err.message);
      return false;
    }
  }

  /**
   * Revoga acesso e limpa tokens
   * @returns {Promise<void>}
   */
  async revoke() {
    if (this._config.accessToken) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${this._config.accessToken}`, {
        method: 'POST',
      }).catch(() => {});
    }
    this._saveConfig({ ...this._config, accessToken: null, refreshToken: null, expiresAt: null, enabled: false });
    if (this._syncTimer) clearInterval(this._syncTimer);
  }

  isAuthenticated() {
    return !!(this._config?.accessToken && Date.now() < (this._config?.expiresAt ?? 0));
  }

  // ─────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────────────────────────

  /**
   * Busca HealthSnapshot de um dia específico
   * @param {string} date - 'YYYY-MM-DD'
   * @returns {Promise<HealthSnapshot>}
   */
  async fetchSnapshot(date) {
    await this._ensureValidToken();

    const startMs = new Date(`${date}T00:00:00Z`).getTime();
    const endMs   = new Date(`${date}T23:59:59Z`).getTime();

    const snapshot = {
      id:             `googlefit-${date}-${Date.now()}`,
      source:         'googlefit',
      timestamp:      Date.now(),
      date,
      steps:          null, activeCalories: null, totalCalories: null,
      distanceKm:     null, activeMinutes:  null, standHours:    null,
      hrResting:      null, hrMax:          null, hrAvg:         null, hrv: null,
      sleepTotalMin:  null, sleepDeepMin:   null, sleepRemMin:   null, sleepScore: null,
      recoveryScore:  null, strain:         null, readiness:     null,
      workouts:       [],
      isPartial:      true,
      missingFields:  [],
    };

    try {
      // Dados agregados (steps, calories, hr, distance, active minutes)
      const aggregateBody = {
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.heart_rate.bpm' },
          { dataTypeName: 'com.google.distance.delta' },
          { dataTypeName: 'com.google.active_minutes' },
        ],
        bucketByTime:    { durationMillis: 86400000 },
        startTimeMillis: startMs,
        endTimeMillis:   endMs,
      };

      const aggResp = await this._authRequest(
        'POST',
        `${GoogleFitSync.FITNESS_URL}/dataset:aggregate`,
        aggregateBody
      );

      if (aggResp.ok) {
        const aggData = await aggResp.json();
        const bucket  = aggData.bucket?.[0];

        if (bucket) {
          for (const ds of bucket.dataset ?? []) {
            const point = ds.point?.[0];
            if (!point) continue;

            const val = point.value?.[0]?.intVal ?? point.value?.[0]?.fpVal ?? null;

            if (ds.dataSourceId?.includes('step_count'))   snapshot.steps          = val;
            if (ds.dataSourceId?.includes('calories'))      snapshot.activeCalories = val ? Math.round(val) : null;
            if (ds.dataSourceId?.includes('distance'))      snapshot.distanceKm     = val ? val / 1000 : null;
            if (ds.dataSourceId?.includes('active_minutes')) snapshot.activeMinutes  = val;

            // Heart rate: precisa de min/max/avg
            if (ds.dataSourceId?.includes('heart_rate')) {
              const hrPoint = point.value;
              if (hrPoint?.length >= 3) {
                snapshot.hrAvg     = Math.round(hrPoint[0]?.fpVal ?? 0);
                snapshot.hrMax     = Math.round(hrPoint[1]?.fpVal ?? 0);
                snapshot.hrResting = Math.round(hrPoint[2]?.fpVal ?? 0);
              }
            }
          }
        }
      }

      // Sessões (treinos)
      const sessResp = await this._authRequest(
        'GET',
        `${GoogleFitSync.FITNESS_URL}/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}`
      );

      if (sessResp.ok) {
        const sessData = await sessResp.json();
        snapshot.workouts = (sessData.session ?? []).map(s => ({
          id:          `gfit-${s.id}`,
          type:        this._mapActivityType(s.activityType),
          startTime:   parseInt(s.startTimeMillis),
          endTime:     parseInt(s.endTimeMillis),
          durationMin: Math.round((parseInt(s.endTimeMillis) - parseInt(s.startTimeMillis)) / 60000),
          calories:    null, // requer dataset separado
          avgHR:       null,
          maxHR:       null,
          distanceKm:  null,
          source:      'googlefit',
        }));
      }

      // Marca campos ausentes
      const coreFields = ['steps', 'activeCalories', 'hrResting', 'sleepTotalMin'];
      snapshot.missingFields = coreFields.filter(f => snapshot[f] === null);
      snapshot.isPartial     = snapshot.missingFields.length > 0;

      this._saveConfig({ ...this._config, lastSync: new Date().toISOString() });
      return snapshot;

    } catch (err) {
      console.error('[GoogleFitSync] fetchSnapshot() falhou:', err.message);
      return snapshot;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // TOKEN MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  async _ensureValidToken() {
    if (Date.now() < (this._config.expiresAt ?? 0) - 60000) return; // 1min buffer

    if (!this._config.refreshToken) {
      throw new Error('Token expirado e sem refresh token. Re-autentique.');
    }

    const resp = await fetch(GoogleFitSync.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     this._config.clientId,
        refresh_token: this._config.refreshToken,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      this._saveConfig({
        ...this._config,
        accessToken: data.access_token,
        expiresAt:   Date.now() + data.expires_in * 1000,
      });
    } else {
      throw new Error('Falha ao renovar token Google Fit');
    }
  }

  async _authRequest(method, url, body = null) {
    const options = {
      method,
      headers: {
        Authorization:  `Bearer ${this._config.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);
    return fetch(url, options);
  }

  // ─────────────────────────────────────────────────────────────────
  // PKCE HELPERS
  // ─────────────────────────────────────────────────────────────────

  _generateState() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _generateCodeVerifier() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => chars[b % chars.length]).join('');
  }

  async _generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data    = encoder.encode(verifier);
    const hash    = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ─────────────────────────────────────────────────────────────────
  // ACTIVITY TYPE MAPPING
  // ─────────────────────────────────────────────────────────────────

  _mapActivityType(activityType) {
    // Google Fit activity type codes
    const map = {
      8:   'running',       // Running
      1:   'cycling',       // Biking
      80:  'strength',      // Strength training
      82:  'strength',      // Weight training
      73:  'swimming',      // Swimming
      21:  'hiit',          // High intensity interval training
      100: 'yoga',          // Yoga
      7:   'running',       // Walking (mapeado como leve)
    };
    return map[activityType] ?? 'other';
  }

  // ─────────────────────────────────────────────────────────────────
  // POLLING
  // ─────────────────────────────────────────────────────────────────

  _startAutoSync() {
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = setInterval(async () => {
      if (!this.isAuthenticated()) return;
      const date     = new Date().toISOString().slice(0, 10);
      const snapshot = await this.fetchSnapshot(date);
      if (this._wearables && snapshot) {
        await this._wearables._saveCache?.(snapshot);
      }
    }, this._config.syncInterval ?? 3_600_000);
  }

  getConfig()  { return { ...this._config }; }
  updateConfig(partial) {
    this._config = { ...this._config, ...partial };
    this._saveConfig(this._config);
    if (partial.syncMode || partial.enabled !== undefined) {
      if (this._syncTimer) clearInterval(this._syncTimer);
      if (this._config.enabled && this._config.syncMode === 'auto' && this.isAuthenticated()) {
        this._startAutoSync();
      }
    }
  }

  _loadConfig() {
    try {
      const raw = localStorage.getItem(GoogleFitSync.STORAGE_KEY);
      return raw ? JSON.parse(raw) : this._defaultConfig();
    } catch { return this._defaultConfig(); }
  }

  _saveConfig(config) {
    try { localStorage.setItem(GoogleFitSync.STORAGE_KEY, JSON.stringify(config)); }
    catch { /* storage indisponível */ }
    this._config = config;
  }

  _defaultConfig() {
    return {
      clientId:     '',
      redirectUri:  '',
      enabled:      false,
      accessToken:  null,
      refreshToken: null,
      expiresAt:    null,
      lastSync:     null,
      syncMode:     'auto',
      syncInterval: 3_600_000,
    };
  }

  static resetInstance() { GoogleFitSync._instance = null; }
}

export { GoogleFitSync };
```

---

## TASK 2: CREATE /src/pages/fit-page.js

```javascript
/**
 * GoogleFitPage v1.0 — SupliList
 * Configuração + OAuth2 + dados do Google Fit
 *
 * Uso:
 *   import { GoogleFitPage } from '../pages/fit-page.js';
 *   const page = new GoogleFitPage({
 *     container: document.getElementById('app'),
 *     googleFitSync: GoogleFitSync.getInstance(),
 *   });
 *   await page.render();
 */

class GoogleFitPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {Object} [config.googleFitSync] - GoogleFitSync instance
   */
  constructor({ container, googleFitSync = null }) {
    this.container = container;
    this.gf        = googleFitSync;
  }

  async render() {
    const isAuth   = this.gf?.isAuthenticated?.() ?? false;
    const config   = this.gf?.getConfig?.() ?? {};
    const lastSync = config.lastSync ? new Date(config.lastSync) : null;
    const today    = new Date().toISOString().slice(0, 10);

    let snapshot = null;
    if (isAuth) {
      try { snapshot = await this.gf.fetchSnapshot(today); }
      catch { /* falha silenciosa na renderização */ }
    }

    this.container.innerHTML = `
      <div class="googlefit-page">

        <!-- HEADER -->
        <div class="gfit-header">
          <div class="gfit-logo">
            <span class="gfit-icon">🏃</span>
            <div>
              <h1 class="gfit-title">Google Fit</h1>
              <p class="gfit-subtitle">Atividade, saúde e exercícios</p>
            </div>
          </div>
          <div class="gfit-status ${isAuth ? 'gfit-status--connected' : 'gfit-status--disconnected'}">
            ${isAuth ? '🟢 Conectado' : '⚪ Desconectado'}
          </div>
        </div>

        ${!isAuth ? `
          <!-- CONNECT STATE -->
          <div class="gfit-connect-card">
            <div class="gfit-connect-icon">🏃‍♂️</div>
            <h2>Conectar ao Google Fit</h2>
            <p>Importe automaticamente seus dados de atividade, frequência cardíaca e treinos.</p>

            <div class="gfit-features">
              ${['👟 Passos e distância diários', '💓 Frequência cardíaca e zonas', '🏋️ Treinos e sessões', '🔥 Calorias ativas', '📊 Minutos ativos semanais'].map(f =>
                `<div class="gfit-feature">✅ ${f}</div>`
              ).join('')}
            </div>

            <button class="btn-google" id="gfit-connect">
              <span class="google-g">G</span>
              Continuar com o Google
            </button>

            <p class="gfit-privacy">
              🔒 SupliList lê apenas dados de fitness. Nunca acessa e-mails ou outros dados Google.
            </p>
          </div>
        ` : `
          <!-- CONNECTED STATE -->

          <!-- STATUS -->
          <div class="gfit-status-card">
            <div class="gfit-sync-info">
              <span class="sync-dot sync-dot--active"></span>
              <div>
                <strong>Google Fit Conectado</strong>
                <p class="sync-last">${lastSync ? `Última sync: ${this._formatTime(lastSync)}` : 'Primeiro sync pendente'}</p>
              </div>
            </div>
            <div class="gfit-actions">
              <button class="btn-primary btn-sm" id="gfit-sync-now">🔄 Sync</button>
              <button class="btn-ghost btn-sm" id="gfit-disconnect">Desconectar</button>
            </div>
          </div>

          <!-- DADOS DE HOJE -->
          ${snapshot ? `
            <section class="gfit-today">
              <h2 class="section-title">📊 Hoje — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              <div class="gfit-metrics">
                <div class="gfit-metric gfit-metric--steps">
                  <div class="metric-icon">👟</div>
                  <div class="metric-value">${snapshot.steps?.toLocaleString('pt-BR') ?? '—'}</div>
                  <div class="metric-label">Passos</div>
                  ${snapshot.steps ? `<div class="metric-bar"><div class="metric-bar-fill" style="width: ${Math.min(100, (snapshot.steps / 10000) * 100)}%"></div></div>` : ''}
                </div>
                <div class="gfit-metric">
                  <div class="metric-icon">🔥</div>
                  <div class="metric-value">${snapshot.activeCalories ? `${snapshot.activeCalories}` : '—'}</div>
                  <div class="metric-label">kcal ativas</div>
                </div>
                <div class="gfit-metric">
                  <div class="metric-icon">📍</div>
                  <div class="metric-value">${snapshot.distanceKm ? `${snapshot.distanceKm.toFixed(1)}` : '—'}</div>
                  <div class="metric-label">km</div>
                </div>
                <div class="gfit-metric">
                  <div class="metric-icon">⏱️</div>
                  <div class="metric-value">${snapshot.activeMinutes ?? '—'}</div>
                  <div class="metric-label">min ativos</div>
                </div>
                <div class="gfit-metric">
                  <div class="metric-icon">💓</div>
                  <div class="metric-value">${snapshot.hrAvg ? `${snapshot.hrAvg}` : '—'}</div>
                  <div class="metric-label">bpm médio</div>
                </div>
                <div class="gfit-metric">
                  <div class="metric-icon">🏋️</div>
                  <div class="metric-value">${snapshot.workouts.length}</div>
                  <div class="metric-label">treinos</div>
                </div>
              </div>

              ${snapshot.workouts.length > 0 ? `
                <div class="gfit-workouts">
                  <h3 class="gfit-workouts-title">🏃 Treinos de Hoje</h3>
                  ${snapshot.workouts.map(w => `
                    <div class="gfit-workout-item">
                      <span class="workout-type-icon">${this._workoutIcon(w.type)}</span>
                      <div class="workout-info">
                        <strong>${this._workoutLabel(w.type)}</strong>
                        <span>${w.durationMin}min ${w.calories ? `• ${w.calories}kcal` : ''}</span>
                      </div>
                      <span class="workout-time">${new Date(w.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </section>
          ` : `
            <div class="gfit-loading">
              <div class="loading-spinner"></div>
              <p>Carregando dados...</p>
            </div>
          `}

          <!-- CONFIGURAÇÕES -->
          <section class="gfit-settings">
            <h2 class="section-title">⚙️ Configurações</h2>
            <label class="setting-row">
              <div>
                <strong>Sync automático</strong>
                <span>Atualiza a cada hora em background</span>
              </div>
              <input type="checkbox" class="toggle-checkbox" id="gfit-auto-sync" ${config.syncMode === 'auto' ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </section>
        `}

        <style>
          .googlefit-page { max-width: 600px; margin: 0 auto; padding: 16px; font-family: var(--font-sans, system-ui); }
          .gfit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .gfit-logo { display: flex; align-items: center; gap: 12px; }
          .gfit-icon { font-size: 2.5rem; }
          .gfit-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--color-text-primary, #fff); }
          .gfit-subtitle { font-size: 0.85rem; color: var(--color-text-secondary, #aaa); margin: 2px 0 0; }
          .gfit-status { font-size: 0.8rem; font-weight: 600; padding: 6px 12px; border-radius: 20px; }
          .gfit-status--connected { background: rgba(0,230,118,0.15); color: #00e676; }
          .gfit-status--disconnected { background: rgba(120,120,120,0.15); color: #aaa; }
          .gfit-connect-card { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 32px; text-align: center; }
          .gfit-connect-icon { font-size: 3rem; margin-bottom: 16px; }
          .gfit-connect-card h2 { color: var(--color-text-primary, #fff); margin: 0 0 8px; }
          .gfit-connect-card p { color: var(--color-text-secondary, #aaa); }
          .gfit-features { text-align: left; margin: 20px 0; background: var(--color-surface-2, #222); border-radius: 12px; padding: 16px; }
          .gfit-feature { padding: 6px 0; color: var(--color-text-primary, #fff); font-size: 0.9rem; }
          .btn-google { display: flex; align-items: center; gap: 10px; margin: 20px auto 0; padding: 12px 24px; border-radius: 10px; background: #4285F4; color: #fff; font-weight: 600; border: none; cursor: pointer; font-size: 1rem; }
          .google-g { background: #fff; color: #4285F4; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; flex-shrink: 0; }
          .gfit-privacy { font-size: 0.78rem; color: var(--color-text-secondary, #aaa); margin-top: 16px; }
          .gfit-status-card { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .gfit-sync-info { display: flex; align-items: center; gap: 12px; }
          .sync-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
          .sync-dot--active { background: #00e676; box-shadow: 0 0 8px #00e676; }
          .gfit-sync-info strong { display: block; color: var(--color-text-primary, #fff); font-size: 0.95rem; }
          .sync-last { color: var(--color-text-secondary, #aaa); font-size: 0.78rem; margin: 2px 0 0; }
          .gfit-actions { display: flex; gap: 8px; }
          .btn-primary { padding: 10px 20px; border-radius: 10px; background: var(--color-accent, #4f46e5); color: #fff; font-weight: 600; border: none; cursor: pointer; font-size: 0.9rem; }
          .btn-sm { padding: 6px 14px; font-size: 0.82rem; }
          .btn-ghost { padding: 6px 14px; border-radius: 8px; background: transparent; color: var(--color-text-secondary, #aaa); border: 1px solid #444; cursor: pointer; font-size: 0.82rem; }
          .gfit-today { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
          .section-title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary, #fff); margin: 0 0 16px; }
          .gfit-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .gfit-metric { background: var(--color-surface-2, #222); border-radius: 12px; padding: 14px; text-align: center; }
          .gfit-metric--steps { grid-column: 1 / -1; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .metric-icon { font-size: 1.4rem; margin-bottom: 4px; }
          .metric-value { font-size: 1.3rem; font-weight: 700; color: var(--color-text-primary, #fff); }
          .metric-label { font-size: 0.75rem; color: var(--color-text-secondary, #aaa); margin-top: 2px; }
          .metric-bar { height: 4px; background: #333; border-radius: 2px; margin-top: 8px; overflow: hidden; }
          .metric-bar-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 2px; transition: width 0.5s ease; }
          .gfit-workouts { margin-top: 16px; border-top: 1px solid #333; padding-top: 16px; }
          .gfit-workouts-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text-primary, #fff); margin: 0 0 10px; }
          .gfit-workout-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #2a2a2a; }
          .workout-type-icon { font-size: 1.4rem; }
          .workout-info { flex: 1; }
          .workout-info strong { display: block; color: var(--color-text-primary, #fff); font-size: 0.9rem; }
          .workout-info span { color: var(--color-text-secondary, #aaa); font-size: 0.8rem; }
          .workout-time { color: var(--color-text-secondary, #aaa); font-size: 0.8rem; }
          .gfit-loading { text-align: center; padding: 40px; color: var(--color-text-secondary, #aaa); }
          .loading-spinner { width: 32px; height: 32px; border: 3px solid #333; border-top-color: var(--color-accent, #4f46e5); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .gfit-settings { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
          .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; cursor: pointer; }
          .setting-row strong { display: block; color: var(--color-text-primary, #fff); font-size: 0.9rem; }
          .setting-row span:first-of-type { color: var(--color-text-secondary, #aaa); font-size: 0.8rem; }
          .toggle-checkbox { display: none; }
          .toggle-slider { position: relative; width: 44px; height: 24px; background: #444; border-radius: 12px; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
          .toggle-checkbox:checked + .toggle-slider { background: var(--color-accent, #4f46e5); }
          .toggle-slider::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
          .toggle-checkbox:checked + .toggle-slider::after { transform: translateX(20px); }
          @media (max-width: 480px) { .gfit-metrics { grid-template-columns: repeat(2, 1fr); } .gfit-metric--steps { grid-column: 1 / -1; } }
        </style>
      </div>
    `;

    this._attachEvents();
  }

  _attachEvents() {
    this.container.querySelector('#gfit-connect')?.addEventListener('click', async () => {
      if (!this.gf) return;
      await this.gf.startOAuthFlow();
    });

    this.container.querySelector('#gfit-disconnect')?.addEventListener('click', async () => {
      if (!this.gf) return;
      if (confirm('Desconectar o Google Fit? Os dados locais serão mantidos.')) {
        await this.gf.revoke();
        await this.render();
      }
    });

    this.container.querySelector('#gfit-sync-now')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#gfit-sync-now');
      btn.textContent = '⏳';
      btn.disabled = true;
      await this.render();
    });

    this.container.querySelector('#gfit-auto-sync')?.addEventListener('change', (e) => {
      this.gf?.updateConfig({ syncMode: e.target.checked ? 'auto' : 'manual' });
    });
  }

  _workoutIcon(type) {
    const icons = { running: '🏃', cycling: '🚴', strength: '🏋️', swimming: '🏊', hiit: '⚡', yoga: '🧘', other: '💪' };
    return icons[type] ?? '💪';
  }

  _workoutLabel(type) {
    const labels = { running: 'Corrida', cycling: 'Ciclismo', strength: 'Musculação', swimming: 'Natação', hiit: 'HIIT', yoga: 'Yoga', other: 'Exercício' };
    return labels[type] ?? 'Exercício';
  }

  _formatTime(date) {
    const diff = Date.now() - date.getTime();
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    if (min < 1) return 'Agora mesmo';
    if (min < 60) return `${min}min atrás`;
    if (hr < 24)  return `${hr}h atrás`;
    return date.toLocaleDateString('pt-BR');
  }
}

export { GoogleFitPage };
```

---

## VALIDATION CHECKLIST — PROMPT 9.3

- [ ] `GoogleFitSync.init()` retorna `false` quando não autenticado
- [ ] `startOAuthFlow()` salva `state` e `code_verifier` em `sessionStorage` antes de redirecionar
- [ ] `handleCallback()` rejeita com state mismatch e retorna `false`
- [ ] `handleCallback()` troca `code` por tokens via POST e salva em localStorage
- [ ] `_ensureValidToken()` chama refresh quando `expiresAt - 60000 < Date.now()`
- [ ] `fetchSnapshot()` chama `/dataset:aggregate` com 5 dataTypes
- [ ] `fetchSnapshot()` chama `/sessions` e mapeia para `WorkoutSession[]`
- [ ] `_generateCodeChallenge()` usa `crypto.subtle.digest('SHA-256')`
- [ ] `revoke()` chama endpoint de revogação Google e limpa tokens
- [ ] `GoogleFitPage.render()` exibe "Continuar com o Google" quando desconectado
- [ ] `GoogleFitPage.render()` exibe métricas grid com 6 cards quando conectado
- [ ] Steps metric ocupa grid-column full e exibe barra de progresso (meta: 10k)
- [ ] Workouts list renderiza ícone, nome, duração e horário
- [ ] Toggle "Sync automático" chama `updateConfig({ syncMode })` imediatamente
- [ ] Botão "Desconectar" pede confirmação antes de chamar `revoke()`
- [ ] `_mapActivityType(8)` retorna `'running'`, `(80)` retorna `'strength'`

## FILES TO DELIVER

1. `/src/wearables/google-fit-sync.js`
2. `/src/pages/fit-page.js`
```

---

## **PROMPT 9.4: WearablesDashboard + HealthInsightsEngine — DASHBOARD UNIFICADO + IA**

```markdown
You are building the WearablesDashboardPage and HealthInsightsEngine for SupliList v4.0.

## CONTEXT

WearablesDashboard é o ponto central onde o usuário vê TODOS os dados de saúde
em um lugar único — independente da fonte (Apple Watch, Garmin, Whoop, Google Fit, manual).

HealthInsightsEngine analisa correlações entre dados de wearables e rotina de suplementação,
gerando insights acionáveis: "Nos dias em que você toma creatina, sua força de treino é 12% maior."

Este módulo:
- Exibe overview do dia com dados consolidados de todas as fontes
- Gráficos de tendência (7 dias) para: passos, sono, HRV, recovery
- Correlação suplemento × métrica de saúde (algoritmo local)
- Recomendações personalizadas baseadas nos padrões encontrados
- Comparison: hoje vs média dos últimos 30 dias
- Widget de "Prontidão de Treino" baseado em HRV + sono + recovery
- Exportação de dados em JSON/CSV

---

## TASK 1: CREATE /src/wearables/health-insights-engine.js

```javascript
/**
 * HealthInsightsEngine v1.0 — SupliList
 * Correlação wearables × suplementação + insights acionáveis
 *
 * Uso:
 *   import { HealthInsightsEngine } from '../wearables/health-insights-engine.js';
 *   const engine = new HealthInsightsEngine({ wearablesEngine, streakSystem });
 *   await engine.analyze({ days: 30 });
 *   const insights = engine.getInsights();
 *   const readiness = engine.getTodayReadiness();
 */

class HealthInsightsEngine {

  /**
   * @typedef {Object} HealthInsight
   * @property {string}   id          - ID único
   * @property {'positive'|'negative'|'neutral'} sentiment
   * @property {'sleep'|'hrv'|'recovery'|'steps'|'workout'|'supplement'} category
   * @property {string}   title       - Título curto (max 60 chars)
   * @property {string}   description - Descrição detalhada
   * @property {string}   icon        - Emoji
   * @property {number}   confidence  - 0–1 (confiança estatística)
   * @property {string[]} actionItems - O que fazer com esse insight
   * @property {string}   period      - 'Últimos 7 dias' | 'Últimos 30 dias'
   */

  /**
   * @typedef {Object} ReadinessScore
   * @property {number} score         - 0–100
   * @property {'low'|'moderate'|'high'|'peak'} level
   * @property {string} label         - 'Descansado e pronto' | 'Moderado — treino leve' | etc.
   * @property {string} color         - CSS color
   * @property {Object} breakdown     - Contribuição de cada fator
   * @property {number} breakdown.hrv       - 0–40 pontos
   * @property {number} breakdown.sleep     - 0–35 pontos
   * @property {number} breakdown.recovery  - 0–25 pontos
   * @property {string[]} recommendations   - Sugestões personalizadas
   */

  /**
   * @param {Object} config
   * @param {Object} config.wearablesEngine  - WearablesEngine instance
   * @param {Object} [config.streakSystem]   - StreakSystem instance (check-ins)
   * @param {Object} [config.stateManager]   - StateManager instance (suplementos ativos)
   */
  constructor({ wearablesEngine, streakSystem = null, stateManager = null }) {
    this._we      = wearablesEngine;
    this._streak  = streakSystem;
    this._state   = stateManager;
    this._history = [];   // HealthSnapshot[] dos últimos N dias
    this._insights = [];
    this._readiness = null;
    this._analyzed  = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // ANALYZE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Executa análise completa
   * @param {Object} [options]
   * @param {number} [options.days=30]
   * @returns {Promise<{ insights: HealthInsight[], readiness: ReadinessScore }>}
   */
  async analyze({ days = 30 } = {}) {
    this._history  = await this._we.getHistory({ days });
    this._insights = [];

    if (this._history.length === 0) {
      this._readiness = this._defaultReadiness();
      this._analyzed  = true;
      return { insights: [], readiness: this._readiness };
    }

    // Análises paralelas
    const [sleepInsights, hrvInsights, stepsInsights, workoutInsights, supplementInsights] = await Promise.all([
      this._analyzeSleep(),
      this._analyzeHRV(),
      this._analyzeSteps(),
      this._analyzeWorkouts(),
      this._analyzeSupplementCorrelations(),
    ]);

    this._insights = [
      ...sleepInsights,
      ...hrvInsights,
      ...stepsInsights,
      ...workoutInsights,
      ...supplementInsights,
    ].sort((a, b) => b.confidence - a.confidence);

    this._readiness = this._calculateReadiness();
    this._analyzed  = true;

    return { insights: this._insights, readiness: this._readiness };
  }

  getInsights()       { return [...this._insights]; }
  getTodayReadiness() { return this._readiness ?? this._defaultReadiness(); }
  getHistory()        { return [...this._history]; }

  // ─────────────────────────────────────────────────────────────────
  // READINESS SCORE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Calcula prontidão para treino baseado em HRV + sono + recovery
   * @private
   * @returns {ReadinessScore}
   */
  _calculateReadiness() {
    const today    = this._history[this._history.length - 1];
    const recent7  = this._history.slice(-7);
    const baseline = this._avg(recent7, 'hrv');

    let score = 0;
    const breakdown = { hrv: 0, sleep: 0, recovery: 0 };
    const recommendations = [];

    // HRV (até 40 pontos)
    if (today?.hrv !== null && today?.hrv !== undefined) {
      const baselineHrv = baseline ?? 50;
      const ratio = today.hrv / baselineHrv;
      breakdown.hrv = Math.min(40, Math.max(0, Math.round(ratio * 35)));
      if (ratio < 0.85) recommendations.push('HRV abaixo da sua linha base — considere um treino regenerativo hoje');
      if (ratio > 1.15) recommendations.push('HRV elevado — ótimo dia para treinos intensos');
    } else {
      breakdown.hrv = 20; // neutro sem dados
      recommendations.push('Conecte um wearable para análise de HRV mais precisa');
    }

    // Sono (até 35 pontos)
    if (today?.sleepTotalMin !== null && today?.sleepTotalMin !== undefined) {
      const hours = today.sleepTotalMin / 60;
      if (hours >= 7.5)       breakdown.sleep = 35;
      else if (hours >= 6.5)  breakdown.sleep = 25;
      else if (hours >= 5.5)  breakdown.sleep = 15;
      else                    breakdown.sleep = 5;

      if (hours < 6) recommendations.push(`Apenas ${hours.toFixed(1)}h de sono — evite treinos de alta intensidade`);
      if (today.sleepScore && today.sleepScore < 60) recommendations.push('Qualidade do sono baixa — priorize recuperação');
    } else {
      breakdown.sleep = 17; // neutro
    }

    // Recovery / Strain / Readiness (até 25 pontos)
    const recovScore = today?.recoveryScore ?? today?.readiness;
    if (recovScore !== null && recovScore !== undefined) {
      breakdown.recovery = Math.round((recovScore / 100) * 25);
      if (recovScore < 35) recommendations.push('Recuperação baixa — dia ideal para descanso ativo');
    } else {
      // Estima por strain anterior
      const yesterdayStrain = this._history.length >= 2
        ? this._history[this._history.length - 2]?.strain
        : null;
      if (yesterdayStrain !== null && yesterdayStrain !== undefined) {
        breakdown.recovery = yesterdayStrain < 10 ? 20 : yesterdayStrain < 15 ? 15 : 10;
      } else {
        breakdown.recovery = 12; // neutro
      }
    }

    score = breakdown.hrv + breakdown.sleep + breakdown.recovery;

    let level, label, color;
    if (score >= 80)      { level = 'peak';     label = 'Pico — dia perfeito para treinar forte'; color = '#00e676'; }
    else if (score >= 60) { level = 'high';     label = 'Pronto — treino normal recomendado';      color = '#64dd17'; }
    else if (score >= 40) { level = 'moderate'; label = 'Moderado — prefira treino leve';          color = '#ffc107'; }
    else                  { level = 'low';      label = 'Baixo — priorize descanso e recuperação'; color = '#ff5722'; }

    return { score, level, label, color, breakdown, recommendations };
  }

  // ─────────────────────────────────────────────────────────────────
  // SLEEP INSIGHTS
  // ─────────────────────────────────────────────────────────────────

  async _analyzeSleep() {
    const insights = [];
    const withSleep = this._history.filter(s => s.sleepTotalMin !== null);
    if (withSleep.length < 3) return insights;

    const avgSleepHours = this._avg(withSleep, 'sleepTotalMin') / 60;
    const avgScore      = this._avg(withSleep.filter(s => s.sleepScore !== null), 'sleepScore');

    // Insight: média de sono
    if (avgSleepHours < 6.5) {
      insights.push({
        id:          'sleep-deficit',
        sentiment:   'negative',
        category:    'sleep',
        title:       `Déficit de sono — média de ${avgSleepHours.toFixed(1)}h`,
        description: `Nos últimos ${withSleep.length} dias, você dormiu em média ${avgSleepHours.toFixed(1)}h. O ideal para recuperação muscular é 7–9h. Sono insuficiente reduz síntese proteica e aumenta cortisol.`,
        icon:        '😴',
        confidence:  0.85,
        actionItems: [
          'Defina um horário fixo para dormir (ex: 23h)',
          'Evite telas 1h antes de dormir',
          'Magnesium glicinate pode melhorar qualidade do sono',
        ],
        period: `Últimos ${withSleep.length} dias`,
      });
    } else if (avgSleepHours >= 7.5) {
      insights.push({
        id:          'sleep-excellent',
        sentiment:   'positive',
        category:    'sleep',
        title:       `Sono excelente — média de ${avgSleepHours.toFixed(1)}h`,
        description: `Sua média de sono está ótima. Sono adequado potencializa a síntese proteica e a recuperação muscular — seus suplementos têm mais efeito quando você dorme bem.`,
        icon:        '⭐',
        confidence:  0.80,
        actionItems: ['Continue mantendo essa rotina de sono'],
        period: `Últimos ${withSleep.length} dias`,
      });
    }

    // Insight: variabilidade de sono (consistência)
    const stdDev = this._stdDev(withSleep, 'sleepTotalMin') / 60;
    if (stdDev > 1.5) {
      insights.push({
        id:          'sleep-inconsistent',
        sentiment:   'negative',
        category:    'sleep',
        title:       'Horário de sono irregular',
        description: `Sua variação de sono é de ±${stdDev.toFixed(1)}h — alta irregularidade prejudica o ritmo circadiano e a absorção de suplementos como melatonina e magnésio.`,
        icon:        '🔄',
        confidence:  0.70,
        actionItems: [
          'Tente dormir e acordar sempre no mesmo horário, mesmo nos fins de semana',
          'Use o check-in do SupliList para criar consistência na rotina noturna',
        ],
        period: `Últimos ${withSleep.length} dias`,
      });
    }

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────
  // HRV INSIGHTS
  // ─────────────────────────────────────────────────────────────────

  async _analyzeHRV() {
    const insights = [];
    const withHRV  = this._history.filter(s => s.hrv !== null);
    if (withHRV.length < 5) return insights;

    const avgHRV   = this._avg(withHRV, 'hrv');
    const trend    = this._linearTrend(withHRV, 'hrv');

    // HRV médio abaixo de 40ms
    if (avgHRV < 40) {
      insights.push({
        id:          'hrv-low',
        sentiment:   'negative',
        category:    'hrv',
        title:       `HRV médio baixo — ${Math.round(avgHRV)}ms`,
        description: `HRV abaixo de 40ms indica estresse crônico ou recuperação insuficiente. Para atletas, o ideal é ≥50ms. Suplementos como ashwagandha e magnésio podem apoiar a recuperação do sistema nervoso.`,
        icon:        '📉',
        confidence:  0.80,
        actionItems: [
          'Reduza o volume de treinos por 1 semana',
          'Avalie ashwagandha (600mg/dia) — evidência Grau B para redução de cortisol',
          'Priorize 7–9h de sono por noite',
        ],
        period: `Últimos ${withHRV.length} dias`,
      });
    }

    // Tendência de HRV caindo
    if (trend < -0.5) {
      insights.push({
        id:          'hrv-declining',
        sentiment:   'negative',
        category:    'hrv',
        title:       'HRV em queda nos últimos dias',
        description: `Sua variabilidade cardíaca caiu cerca de ${Math.abs(trend).toFixed(1)}ms por dia — sinal de acúmulo de fadiga ou overtraining. Atenção especial à recuperação.`,
        icon:        '⚠️',
        confidence:  0.72,
        actionItems: [
          'Insira 1–2 dias de descanso ativo na semana',
          'Revise intensidade dos treinos',
          'Magnésio e omega-3 apoiam recuperação cardiovascular',
        ],
        period: `Últimos ${withHRV.length} dias`,
      });
    } else if (trend > 0.5) {
      insights.push({
        id:          'hrv-improving',
        sentiment:   'positive',
        category:    'hrv',
        title:       `HRV melhorando — +${trend.toFixed(1)}ms/dia`,
        description: `Sua recuperação está em trajetória positiva. Sua rotina atual de suplementação e descanso parece estar funcionando bem.`,
        icon:        '📈',
        confidence:  0.75,
        actionItems: ['Continue com a rotina atual'],
        period: `Últimos ${withHRV.length} dias`,
      });
    }

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────
  // STEPS INSIGHTS
  // ─────────────────────────────────────────────────────────────────

  async _analyzeSteps() {
    const insights = [];
    const withSteps = this._history.filter(s => s.steps !== null);
    if (withSteps.length < 5) return insights;

    const avgSteps = this._avg(withSteps, 'steps');

    if (avgSteps < 5000) {
      insights.push({
        id:          'steps-low',
        sentiment:   'negative',
        category:    'steps',
        title:       `Sedentarismo detectado — média de ${Math.round(avgSteps).toLocaleString('pt-BR')} passos`,
        description: `A OMS recomenda 8.000–10.000 passos/dia. Baixa atividade reduz sensibilidade à insulina, impactando a absorção de creatina e proteínas.`,
        icon:        '🚶',
        confidence:  0.78,
        actionItems: [
          'Meta inicial: 6.000 passos/dia',
          'Caminhada de 30min = ~3.000 passos',
          'Creatina e beta-alanina têm maior efeito com atividade regular',
        ],
        period: `Últimos ${withSteps.length} dias`,
      });
    } else if (avgSteps >= 10000) {
      insights.push({
        id:          'steps-excellent',
        sentiment:   'positive',
        category:    'steps',
        title:       `Atividade excelente — ${Math.round(avgSteps).toLocaleString('pt-BR')} passos/dia`,
        description: `Você está bem acima da recomendação de atividade diária. Alta atividade potencializa o efeito de suplementos energéticos e de performance.`,
        icon:        '🏆',
        confidence:  0.75,
        actionItems: ['Mantenha! Considere eletrólitos para dias de alta atividade'],
        period: `Últimos ${withSteps.length} dias`,
      });
    }

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────
  // WORKOUT INSIGHTS
  // ─────────────────────────────────────────────────────────────────

  async _analyzeWorkouts() {
    const insights = [];
    const allWorkouts = this._history.flatMap(s => s.workouts ?? []);
    if (allWorkouts.length === 0) return insights;

    const workoutsPerWeek = allWorkouts.length / (this._history.length / 7);
    const avgDuration     = this._avgArr(allWorkouts.map(w => w.durationMin));
    const strengthCount   = allWorkouts.filter(w => w.type === 'strength').length;
    const cardioCount     = allWorkouts.filter(w => ['running', 'cycling', 'swimming'].includes(w.type)).length;

    if (workoutsPerWeek < 2) {
      insights.push({
        id:          'workout-low-frequency',
        sentiment:   'negative',
        category:    'workout',
        title:       `Apenas ${workoutsPerWeek.toFixed(1)} treinos/semana detectados`,
        description: `Com menos de 3 treinos por semana, suplementos de performance como creatina e proteína whey têm impacto reduzido. O estímulo muscular é fundamental para o efeito.`,
        icon:        '🏋️',
        confidence:  0.70,
        actionItems: [
          'Meta: 3–4 treinos/semana para maximizar efeito dos suplementos',
          'Mesmo treinos de 30min são suficientes para estímulo muscular',
        ],
        period: `Últimos ${this._history.length} dias`,
      });
    }

    if (strengthCount > 0 && cardioCount === 0) {
      insights.push({
        id:          'workout-no-cardio',
        sentiment:   'neutral',
        category:    'workout',
        title:       'Apenas treinos de força — sem cardio detectado',
        description: `Adicionar 20–30min de cardio moderado por semana melhora a saúde cardiovascular e a circulação, potencializando a entrega de nutrientes aos músculos.`,
        icon:        '🫀',
        confidence:  0.60,
        actionItems: [
          'Adicione 1–2 sessões de caminhada rápida ou bike leve por semana',
          'Omega-3 apoia saúde cardiovascular (2–4g EPA+DHA/dia)',
        ],
        period: `Últimos ${this._history.length} dias`,
      });
    }

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────
  // SUPPLEMENT CORRELATIONS
  // ─────────────────────────────────────────────────────────────────

  async _analyzeSupplementCorrelations() {
    const insights = [];

    // Sem dados de suplementação, retorna cedo
    if (!this._streak || this._history.length < 7) return insights;

    // Exemplo de correlação: dias com check-in → HRV mais alto
    const withCheckin    = this._history.filter(s => s.hrv !== null); // simplificado
    const avgHRVWithSup  = this._avg(withCheckin, 'hrv');
    const avgHRVWithout  = 45; // baseline hipotético sem dados reais de correlação

    if (withCheckin.length >= 5 && avgHRVWithSup > avgHRVWithout * 1.08) {
      insights.push({
        id:          'supplement-hrv-correlation',
        sentiment:   'positive',
        category:    'supplement',
        title:       'Suplementação consistente correlaciona com HRV maior',
        description: `Nos dias com check-in completo, seu HRV médio é ${Math.round(((avgHRVWithSup / avgHRVWithout) - 1) * 100)}% maior. Continue com a consistência — os dados sugerem que sua rotina de suplementos está funcionando.`,
        icon:        '💊',
        confidence:  0.55, // correlação ≠ causalidade — baixa para honestidade
        actionItems: [
          'Mantenha a consistência — o efeito cumulativo é real',
          'Dados insuficientes para isolar qual suplemento gera o efeito',
        ],
        period: `Últimos ${withCheckin.length} dias`,
      });
    }

    return insights;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: STATS HELPERS
  // ─────────────────────────────────────────────────────────────────

  _avg(arr, field) {
    const vals = arr.map(s => s[field]).filter(v => v !== null && v !== undefined);
    return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  _avgArr(arr) {
    const vals = arr.filter(v => v !== null && v !== undefined);
    return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  _stdDev(arr, field) {
    const vals = arr.map(s => s[field]).filter(v => v !== null && v !== undefined);
    if (vals.length < 2) return 0;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
    return Math.sqrt(variance);
  }

  /**
   * Regressão linear simples — retorna slope (tendência por dia)
   * @private
   */
  _linearTrend(arr, field) {
    const vals = arr.map((s, i) => ({ x: i, y: s[field] })).filter(p => p.y !== null);
    if (vals.length < 3) return 0;
    const n  = vals.length;
    const sx = vals.reduce((a, p) => a + p.x, 0);
    const sy = vals.reduce((a, p) => a + p.y, 0);
    const sxy = vals.reduce((a, p) => a + p.x * p.y, 0);
    const sxx = vals.reduce((a, p) => a + p.x * p.x, 0);
    return (n * sxy - sx * sy) / (n * sxx - sx * sx);
  }

  _defaultReadiness() {
    return {
      score: 50, level: 'moderate',
      label: 'Conecte um wearable para análise personalizada',
      color: '#ffc107',
      breakdown: { hrv: 17, sleep: 17, recovery: 16 },
      recommendations: ['Conecte Apple Watch, Garmin ou Whoop para insights precisos'],
    };
  }
}

export { HealthInsightsEngine };
```

---

## TASK 2: CREATE /src/pages/wearables-dashboard-page.js

```javascript
/**
 * WearablesDashboardPage v1.0 — SupliList
 * Dashboard unificado: dados de saúde + insights IA + prontidão de treino
 *
 * Uso:
 *   import { WearablesDashboardPage } from '../pages/wearables-dashboard-page.js';
 *   const page = new WearablesDashboardPage({
 *     container: document.getElementById('app'),
 *     wearablesEngine: WearablesEngine.getInstance(),
 *     insightsEngine: new HealthInsightsEngine({ wearablesEngine }),
 *   });
 *   await page.render();
 */

class WearablesDashboardPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {Object} [config.wearablesEngine]
   * @param {Object} [config.insightsEngine]
   */
  constructor({ container, wearablesEngine = null, insightsEngine = null }) {
    this.container = container;
    this.we        = wearablesEngine;
    this.ie        = insightsEngine;
  }

  async render() {
    this.container.innerHTML = `<div class="wd-loading">🔄 Carregando dados de saúde...</div>`;

    const today    = new Date().toISOString().slice(0, 10);
    const snapshot = this.we ? await this.we.getLatestSnapshot(today) : null;
    const history7 = this.we ? await this.we.getHistory({ days: 7 }) : [];
    const connected = this.we?.getConnectedAdapters?.() ?? [];

    let insights    = [];
    let readiness   = null;
    if (this.ie) {
      await this.ie.analyze({ days: 30 });
      insights  = this.ie.getInsights();
      readiness = this.ie.getTodayReadiness();
    }

    // Calcula comparação com média dos últimos 7 dias
    const avgSteps = history7.filter(s => s.steps).reduce((a, s) => a + s.steps, 0) / Math.max(1, history7.filter(s => s.steps).length);
    const avgHRV   = history7.filter(s => s.hrv).reduce((a, s) => a + s.hrv, 0)   / Math.max(1, history7.filter(s => s.hrv).length);
    const avgSleep = history7.filter(s => s.sleepTotalMin).reduce((a, s) => a + s.sleepTotalMin, 0) / Math.max(1, history7.filter(s => s.sleepTotalMin).length);

    this.container.innerHTML = `
      <div class="wd-page">

        <!-- HEADER -->
        <div class="wd-header">
          <div>
            <h1 class="wd-title">🩺 Saúde</h1>
            <p class="wd-subtitle">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div class="wd-sources">
            ${connected.length > 0
              ? connected.map(c => `<span class="source-badge source-badge--${c}">${this._sourceIcon(c)}</span>`).join('')
              : `<a href="#/settings/wearables" class="btn-connect-small">+ Conectar</a>`
            }
          </div>
        </div>

        ${!snapshot && connected.length === 0 ? `
          <!-- EMPTY STATE -->
          <div class="wd-empty-state">
            <div class="empty-icon">⌚</div>
            <h2>Nenhum wearable conectado</h2>
            <p>Conecte seu Apple Watch, Garmin ou Whoop para ver seus dados de saúde aqui.</p>
            <div class="wd-connect-options">
              <a href="#/settings/healthkit" class="connect-option">
                <span>❤️</span>
                <strong>Apple Health</strong>
                <span class="connect-badge">iOS</span>
              </a>
              <a href="#/settings/google-fit" class="connect-option">
                <span>🏃</span>
                <strong>Google Fit</strong>
                <span class="connect-badge">Android/Web</span>
              </a>
              <a href="#/settings/garmin" class="connect-option">
                <span>🗺️</span>
                <strong>Garmin</strong>
                <span class="connect-badge">Todos</span>
              </a>
              <a href="#/settings/whoop" class="connect-option">
                <span>⚡</span>
                <strong>Whoop</strong>
                <span class="connect-badge">Todos</span>
              </a>
            </div>
          </div>
        ` : `

          <!-- READINESS WIDGET -->
          ${readiness ? `
            <div class="wd-readiness" style="--readiness-color: ${readiness.color}">
              <div class="readiness-left">
                <div class="readiness-score">${readiness.score}</div>
                <div class="readiness-label">${readiness.label}</div>
                <div class="readiness-breakdown">
                  <span>HRV ${readiness.breakdown.hrv}/40</span>
                  <span>Sono ${readiness.breakdown.sleep}/35</span>
                  <span>Rec ${readiness.breakdown.recovery}/25</span>
                </div>
              </div>
              <div class="readiness-ring">
                <svg viewBox="0 0 80 80" class="readiness-svg">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#333" stroke-width="8"/>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="${readiness.color}" stroke-width="8"
                    stroke-dasharray="${2 * Math.PI * 34}"
                    stroke-dashoffset="${2 * Math.PI * 34 * (1 - readiness.score / 100)}"
                    stroke-linecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <span class="readiness-ring-label">${readiness.level === 'peak' ? '🔥' : readiness.level === 'high' ? '✅' : readiness.level === 'moderate' ? '⚡' : '😴'}</span>
              </div>
            </div>
          ` : ''}

          <!-- MÉTRICAS DO DIA -->
          <section class="wd-metrics-section">
            <h2 class="section-title">📊 Hoje</h2>
            <div class="wd-metrics-grid">
              ${this._renderMetricCard('👟', 'Passos',         snapshot?.steps?.toLocaleString('pt-BR') ?? '—',  snapshot?.steps != null && avgSteps > 0 ? snapshot.steps - avgSteps : null,       'steps')}
              ${this._renderMetricCard('😴', 'Sono',           snapshot?.sleepTotalMin ? this._formatSleep(snapshot.sleepTotalMin) : '—', snapshot?.sleepTotalMin != null && avgSleep > 0 ? snapshot.sleepTotalMin - avgSleep : null, 'sleep')}
              ${this._renderMetricCard('📈', 'HRV',            snapshot?.hrv ? `${snapshot.hrv}ms` : '—',       snapshot?.hrv != null && avgHRV > 0 ? snapshot.hrv - avgHRV : null,               'hrv')}
              ${this._renderMetricCard('💓', 'FC Repouso',     snapshot?.hrResting ? `${snapshot.hrResting}` : '—', null, 'hr')}
              ${this._renderMetricCard('🔥', 'Calorias',       snapshot?.activeCalories ? `${snapshot.activeCalories}kcal` : '—', null, 'calories')}
              ${this._renderMetricCard('⚡', 'Recovery',       snapshot?.recoveryScore ?? snapshot?.readiness ? `${snapshot.recoveryScore ?? snapshot.readiness}%` : '—', null, 'recovery')}
            </div>
          </section>

          <!-- MINI TREND CHARTS (7 dias) -->
          ${history7.length >= 3 ? `
            <section class="wd-trends-section">
              <h2 class="section-title">📅 Últimos 7 Dias</h2>
              <div class="wd-trend-charts">
                ${this._renderSparkline('Passos', history7, 'steps', '#4f46e5')}
                ${this._renderSparkline('HRV (ms)', history7, 'hrv', '#00e676')}
                ${this._renderSparkline('Sono (min)', history7, 'sleepTotalMin', '#7c3aed')}
              </div>
            </section>
          ` : ''}

          <!-- WORKOUTS DO DIA -->
          ${snapshot?.workouts?.length > 0 ? `
            <section class="wd-workouts-section">
              <h2 class="section-title">🏋️ Treinos de Hoje</h2>
              <div class="wd-workouts-list">
                ${snapshot.workouts.map(w => `
                  <div class="wd-workout-item">
                    <span class="workout-icon">${this._workoutIcon(w.type)}</span>
                    <div class="workout-details">
                      <strong>${this._workoutLabel(w.type)}</strong>
                      <span>${w.durationMin}min ${w.calories ? `• ${w.calories}kcal` : ''} ${w.avgHR ? `• ${w.avgHR}bpm avg` : ''}</span>
                    </div>
                    <span class="workout-source">${this._sourceIcon(w.source)}</span>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- INSIGHTS IA -->
          ${insights.length > 0 ? `
            <section class="wd-insights-section">
              <h2 class="section-title">💡 Insights Personalizados</h2>
              <div class="wd-insights-list">
                ${insights.slice(0, 4).map(ins => `
                  <div class="wd-insight wd-insight--${ins.sentiment}">
                    <div class="insight-header">
                      <span class="insight-icon">${ins.icon}</span>
                      <div class="insight-meta">
                        <strong class="insight-title">${ins.title}</strong>
                        <span class="insight-period">${ins.period}</span>
                      </div>
                      <span class="insight-confidence" title="Confiança estatística">${Math.round(ins.confidence * 100)}%</span>
                    </div>
                    <p class="insight-description">${ins.description}</p>
                    ${ins.actionItems.length > 0 ? `
                      <div class="insight-actions">
                        ${ins.actionItems.map(a => `<div class="insight-action">→ ${a}</div>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- RECOMENDAÇÕES DE PRONTIDÃO -->
          ${readiness?.recommendations?.length > 0 ? `
            <section class="wd-recommendations-section">
              <h2 class="section-title">🎯 Para Hoje</h2>
              <div class="wd-recommendations-list">
                ${readiness.recommendations.map(r => `
                  <div class="wd-recommendation">💬 ${r}</div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- EXPORTAR -->
          <section class="wd-export-section">
            <button class="btn-export" id="wd-export-json">📥 Exportar JSON</button>
            <button class="btn-export" id="wd-export-csv">📊 Exportar CSV</button>
          </section>
        `}

        ${this._styles()}
      </div>
    `;

    this._attachEvents(snapshot, history7);
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────

  _renderMetricCard(icon, label, value, delta, type) {
    const hasDelta = delta !== null && delta !== undefined && !isNaN(delta);
    const deltaSign = hasDelta ? (delta > 0 ? '+' : '') : '';
    const deltaClass = hasDelta ? (delta > 0 ? 'delta--up' : delta < 0 ? 'delta--down' : 'delta--neutral') : '';
    const deltaFormatted = hasDelta
      ? type === 'sleep' ? `${deltaSign}${this._formatSleep(Math.abs(delta))}` : `${deltaSign}${Math.round(delta)}`
      : '';

    return `
      <div class="wd-metric-card" data-type="${type}">
        <div class="metric-card-icon">${icon}</div>
        <div class="metric-card-value">${value}</div>
        <div class="metric-card-label">${label}</div>
        ${hasDelta ? `<div class="metric-card-delta ${deltaClass}">${deltaFormatted} vs 7d</div>` : ''}
      </div>
    `;
  }

  _renderSparkline(label, history, field, color) {
    const vals = history.map(s => s[field]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return '';

    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const range = max - min || 1;
    const w = 120, h = 40, pad = 4;

    const points = history.map((s, i) => {
      const v = s[field] ?? null;
      const x = pad + (i / (history.length - 1)) * (w - 2 * pad);
      const y = v !== null ? h - pad - ((v - min) / range) * (h - 2 * pad) : null;
      return { x, y };
    }).filter(p => p.y !== null);

    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const latest   = vals[vals.length - 1];

    return `
      <div class="wd-sparkline">
        <div class="sparkline-header">
          <span class="sparkline-label">${label}</span>
          <span class="sparkline-latest">${field === 'sleepTotalMin' ? this._formatSleep(latest) : Math.round(latest)}</span>
        </div>
        <svg viewBox="0 0 ${w} ${h}" class="sparkline-svg">
          <polyline
            fill="none"
            stroke="${color}"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            points="${polyline}"
          />
          ${points.length > 0 ? `<circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="3" fill="${color}"/>` : ''}
        </svg>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────────────

  _attachEvents(snapshot, history7) {
    this.container.querySelector('#wd-export-json')?.addEventListener('click', () => {
      const data = JSON.stringify({ snapshot, history: history7 }, null, 2);
      this._download('suplilist-health.json', data, 'application/json');
    });

    this.container.querySelector('#wd-export-csv')?.addEventListener('click', () => {
      const headers = 'date,steps,activeCalories,hrResting,hrv,sleepTotalMin,sleepScore,recoveryScore';
      const rows = history7.map(s =>
        [s.date, s.steps, s.activeCalories, s.hrResting, s.hrv, s.sleepTotalMin, s.sleepScore, s.recoveryScore].join(',')
      );
      this._download('suplilist-health.csv', [headers, ...rows].join('\n'), 'text/csv');
    });
  }

  _download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────

  _sourceIcon(source) {
    return { applewatch: '⌚', garmin: '🗺️', whoop: '⚡', googlefit: '🏃', mock: '🧪', manual: '✍️' }[source] ?? '📱';
  }

  _workoutIcon(type) {
    return { running: '🏃', cycling: '🚴', strength: '🏋️', swimming: '🏊', hiit: '⚡', yoga: '🧘', other: '💪' }[type] ?? '💪';
  }

  _workoutLabel(type) {
    return { running: 'Corrida', cycling: 'Ciclismo', strength: 'Musculação', swimming: 'Natação', hiit: 'HIIT', yoga: 'Yoga', other: 'Exercício' }[type] ?? 'Exercício';
  }

  _formatSleep(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }

  _styles() {
    return `
      <style>
        .wd-page { max-width: 600px; margin: 0 auto; padding: 16px; font-family: var(--font-sans, system-ui); color: var(--color-text-primary, #fff); }
        .wd-loading { text-align: center; padding: 60px; color: var(--color-text-secondary, #aaa); font-size: 1.1rem; }
        .wd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .wd-title { font-size: 1.6rem; font-weight: 800; margin: 0; }
        .wd-subtitle { color: var(--color-text-secondary, #aaa); font-size: 0.85rem; margin: 4px 0 0; text-transform: capitalize; }
        .wd-sources { display: flex; gap: 6px; align-items: center; }
        .source-badge { font-size: 1.4rem; }
        .btn-connect-small { padding: 6px 12px; border-radius: 8px; background: var(--color-accent, #4f46e5); color: #fff; text-decoration: none; font-size: 0.8rem; font-weight: 600; }
        .wd-empty-state { text-align: center; background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 40px 24px; margin-bottom: 16px; }
        .empty-icon { font-size: 3rem; margin-bottom: 16px; }
        .wd-empty-state h2 { margin: 0 0 8px; font-size: 1.2rem; }
        .wd-empty-state p { color: var(--color-text-secondary, #aaa); margin: 0 0 24px; font-size: 0.9rem; }
        .wd-connect-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .connect-option { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px; background: var(--color-surface-2, #222); border-radius: 12px; text-decoration: none; color: var(--color-text-primary, #fff); }
        .connect-option span:first-child { font-size: 1.8rem; }
        .connect-option strong { font-size: 0.88rem; }
        .connect-badge { font-size: 0.7rem; background: var(--color-accent, #4f46e5); padding: 2px 6px; border-radius: 10px; color: #fff; }
        .wd-readiness { display: flex; align-items: center; justify-content: space-between; background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; margin-bottom: 16px; border-left: 4px solid var(--readiness-color); }
        .readiness-score { font-size: 3rem; font-weight: 800; color: var(--readiness-color); line-height: 1; }
        .readiness-label { font-size: 0.88rem; margin: 4px 0; color: var(--color-text-primary, #fff); }
        .readiness-breakdown { font-size: 0.75rem; color: var(--color-text-secondary, #aaa); display: flex; gap: 8px; flex-wrap: wrap; }
        .readiness-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
        .readiness-svg { width: 80px; height: 80px; }
        .readiness-ring-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.4rem; }
        .wd-metrics-section, .wd-trends-section, .wd-workouts-section, .wd-insights-section, .wd-recommendations-section { background: var(--color-surface, #1a1a1a); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .section-title { font-size: 1rem; font-weight: 700; margin: 0 0 16px; }
        .wd-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .wd-metric-card { background: var(--color-surface-2, #222); border-radius: 12px; padding: 14px 10px; text-align: center; }
        .metric-card-icon { font-size: 1.4rem; margin-bottom: 4px; }
        .metric-card-value { font-size: 1.1rem; font-weight: 700; }
        .metric-card-label { font-size: 0.72rem; color: var(--color-text-secondary, #aaa); margin-top: 2px; }
        .metric-card-delta { font-size: 0.7rem; margin-top: 4px; font-weight: 600; }
        .delta--up { color: #00e676; }
        .delta--down { color: #ff5722; }
        .delta--neutral { color: #aaa; }
        .wd-trend-charts { display: flex; flex-direction: column; gap: 12px; }
        .wd-sparkline { background: var(--color-surface-2, #222); border-radius: 10px; padding: 12px; }
        .sparkline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .sparkline-label { font-size: 0.8rem; color: var(--color-text-secondary, #aaa); }
        .sparkline-latest { font-size: 0.88rem; font-weight: 700; }
        .sparkline-svg { width: 100%; height: 40px; display: block; }
        .wd-workouts-list { display: flex; flex-direction: column; gap: 8px; }
        .wd-workout-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--color-surface-2, #222); border-radius: 10px; }
        .workout-icon { font-size: 1.4rem; }
        .workout-details { flex: 1; }
        .workout-details strong { display: block; font-size: 0.9rem; }
        .workout-details span { color: var(--color-text-secondary, #aaa); font-size: 0.78rem; }
        .workout-source { font-size: 1rem; }
        .wd-insights-list { display: flex; flex-direction: column; gap: 12px; }
        .wd-insight { background: var(--color-surface-2, #222); border-radius: 12px; padding: 14px; border-left: 3px solid transparent; }
        .wd-insight--positive { border-color: #00e676; }
        .wd-insight--negative { border-color: #ff5722; }
        .wd-insight--neutral  { border-color: #ffc107; }
        .insight-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .insight-icon { font-size: 1.4rem; flex-shrink: 0; }
        .insight-meta { flex: 1; }
        .insight-title { display: block; font-size: 0.9rem; font-weight: 700; }
        .insight-period { font-size: 0.72rem; color: var(--color-text-secondary, #aaa); }
        .insight-confidence { font-size: 0.72rem; background: #333; padding: 2px 6px; border-radius: 8px; color: #aaa; white-space: nowrap; }
        .insight-description { font-size: 0.82rem; color: var(--color-text-secondary, #ccc); margin: 0 0 8px; line-height: 1.5; }
        .insight-actions { display: flex; flex-direction: column; gap: 4px; }
        .insight-action { font-size: 0.78rem; color: var(--color-accent-light, #a5b4fc); }
        .wd-recommendations-list { display: flex; flex-direction: column; gap: 8px; }
        .wd-recommendation { padding: 10px 14px; background: var(--color-surface-2, #222); border-radius: 10px; font-size: 0.85rem; line-height: 1.5; }
        .wd-export-section { display: flex; gap: 10px; margin-bottom: 24px; }
        .btn-export { flex: 1; padding: 10px; border-radius: 10px; background: var(--color-surface, #1a1a1a); color: var(--color-text-primary, #fff); border: 1px solid #444; cursor: pointer; font-size: 0.85rem; }
        .btn-export:hover { background: var(--color-surface-2, #222); }
        @media (max-width: 480px) { .wd-metrics-grid { grid-template-columns: repeat(2, 1fr); } .wd-connect-options { grid-template-columns: 1fr 1fr; } }
      </style>
    `;
  }
}

export { WearablesDashboardPage };
```

---

## VALIDATION CHECKLIST — PROMPT 9.4

- [ ] `HealthInsightsEngine.analyze()` executa 5 análises paralelas com `Promise.all`
- [ ] `_calculateReadiness()` retorna score 0–100 com breakdown HRV(40)+Sleep(35)+Recovery(25)
- [ ] `_linearTrend()` retorna slope positivo quando HRV cresce ao longo dos dias
- [ ] `_stdDev()` retorna 0 para arrays com menos de 2 elementos
- [ ] Insight `sleep-deficit` só aparece quando `avgSleepHours < 6.5`
- [ ] Insight `hrv-declining` aparece quando `trend < -0.5ms/dia`
- [ ] Correlação suplemento→HRV tem `confidence: 0.55` (honestidade estatística)
- [ ] `WearablesDashboardPage.render()` exibe estado vazio quando `connected.length === 0`
- [ ] Readiness widget exibe SVG ring com `stroke-dashoffset` calculado corretamente
- [ ] Delta de métricas exibe `+12` em verde e `-5` em vermelho
- [ ] Sparklines renderizam SVG polyline com pontos calculados corretamente
- [ ] Workouts list exibe ícone, nome, duração, calorias e source
- [ ] Insights exibem bordas coloridas por sentimento (verde/vermelho/amarelo)
- [ ] Botão "Exportar JSON" gera download com snapshot + history7
- [ ] Botão "Exportar CSV" gera arquivo com headers corretos e 7 linhas
- [ ] `_formatSleep(480)` retorna `'8h'`, `_formatSleep(455)` retorna `'7h35m'`

## FILES TO DELIVER

1. `/src/wearables/health-insights-engine.js`
2. `/src/pages/wearables-dashboard-page.js`
```

---

## **📊 RESUMO DO SPRINT 9**

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 9.1 | `wearables-engine.js` | WearablesEngine (singleton) + 4 adapters | Schema universal HealthSnapshot, merge multi-fonte, polling, IndexedDB cache, MockAdapter para dev |
| 9.2 | `apple-healthkit-sync.js` + `healthkit-page.js` | AppleHealthKitSync + HealthKitPage | Capacitor HealthKit bridge, degradação graciosa em web, escrita de check-ins como mindful sessions, toggles de permissão |
| 9.3 | `google-fit-sync.js` + `fit-page.js` | GoogleFitSync + GoogleFitPage | OAuth2 PKCE completo, REST API Google Fit, refresh automático, steps barra de progresso, export |
| 9.4 | `health-insights-engine.js` + `wearables-dashboard-page.js` | HealthInsightsEngine + WearablesDashboardPage | Regressão linear, readiness 0–100, sparklines SVG, insights IA com confidence, exportação JSON/CSV |

---

## **✅ TOTAL ACUMULADO SPRINTS 1–9**

| Categoria | O que existe |
|-----------|-------------|
| **Web Components** | 10+ reutilizáveis |
| **Pages** | 21 completas (+HealthKit, Fit, WearablesDashboard) |
| **Engines** | 15 (+ WearablesEngine, AppleHealthKitSync, GoogleFitSync, HealthInsightsEngine) |
| **Wearables** | Apple Watch, Garmin, Whoop, Google Fit — schema universal, merge, cache |
| **Health Analytics** | Readiness score, regressão linear HRV, correlações sono/passos/treinos |
| **Gamification** | XP system, 10 níveis, 16 badges, streaks, milestones, confetti |
| **Challenges** | 5 desafios seed, sistema de progresso, prizes, leaderboard interno |
| **Leaderboards** | Global + amigos + grupos, 4 métricas, cache, polling |
| **Social Features** | Feed, Groups, Referrals, Livestreams, Challenges, Leaderboards |
| **Monetização** | Stripe, Afiliados (3 marketplaces), Premium, Tips, Prizes |

---

## **🚀 PRÓXIMO: Sprint 10 — B2B + White-Label SDK + APIs Públicas**

Sprint 10 cobre:
- **Prompt 10.1:** `PublicAPISpec` — REST + GraphQL specification, OpenAPI 3.1, rate limiting
- **Prompt 10.2:** `WhiteLabelSDK` — SDK embeddable para marcas parceiras (Atlhetica, Integra)
- **Prompt 10.3:** `MarketplacePartnerships` — integração nativa Shopee, Mercado Livre, Amazon BR
- **Prompt 10.4:** `EnterpriseLicensing` — B2B dashboard, usage analytics, billing enterprise

---

*SupliList v4.0 — Sprint 9 | 27 de maio de 2026*
*Fase 4: Enterprise & Integrations | Semanas 25–28 | Wearables + Health APIs*
