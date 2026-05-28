# **SPRINT 8: Gamification + Challenges + Leaderboards — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no seu IDE.

**Sprint:** 8 | **Fase:** 3 — Community Explosion | **Semanas:** 21–24
**Depende de:** Sprints 1–7 completos (design-system, state-manager, analytics, stripe, community, groups, referral, livestream)

---

## **VISÃO GERAL DO SPRINT 8**

| Prompt | Arquivo(s) | O que entrega |
|--------|-----------|---------------|
| 8.1 | `gamification-engine.js` + `achievements-page.js` | Badges, achievements, XP, progress bars, desbloqueios animados |
| 8.2 | `challenges-engine.js` + `challenges-page.js` | Weekly/monthly challenges, prizes, team competitions, progresso |
| 8.3 | `leaderboard-engine.js` + `leaderboard-page.js` | Global, amigos, grupos — leaderboards anônimos e públicos |
| 8.4 | `badges-page.js` + `streak-gamified-page.js` | Badge gallery, detalhes, streak gamificado, milestones visuais |

**Após o Sprint 8:**
- Sistema completo de gamificação (XP, níveis, badges, achievements) ✅
- Challenges semanais e mensais com prêmios (premium credits, badges) ✅
- Leaderboards globais, por grupo e por amigos ✅
- Galeria de badges e streak gamificado com milestones visuais ✅

---

## **PROMPT 8.1: GamificationEngine — BADGES + ACHIEVEMENTS + XP COMPLETO**

```markdown
You are building the production GamificationEngine for SupliList v4.0.

## CONTEXT

The GamificationEngine is the behavioral engine that makes SupliList addictive.
It tracks XP, levels, badges, streaks, and unlocks — and surfaces them beautifully.
Think: Duolingo (streaks + XP) + Steam (achievements) + Strava (trophies).

This module:
- Awards XP for every meaningful action (check-in, post, referral, purchase)
- Levels users up through 10 tiers (Iniciante → Lenda)
- Unlocks badges automatically on milestone triggers
- Stores all state in IndexedDB + localStorage (local-first)
- Emits events via EventBus for real-time UI updates
- Syncs with CommunityFeed (share achievement) and Analytics
- Supports badge rarity: Common, Rare, Epic, Legendary

Architecture:
- Singleton class (one engine per session)
- Event-driven (EventBus integration)
- All logic deterministic (testable)
- No external dependencies

---

## TASK 1: CREATE /src/gamification/gamification-engine.js

```javascript
/**
 * GamificationEngine v1.0 — SupliList
 * XP, levels, badges, achievements, streaks
 *
 * Uso:
 *   import { GamificationEngine } from '../gamification/gamification-engine.js';
 *   const gm = GamificationEngine.getInstance();
 *   await gm.init();
 *   await gm.awardXP('checkin', { supplementId: 'creatina' });
 *   const profile = gm.getProfile();
 *   const badges = gm.getUnlockedBadges();
 */

/**
 * @typedef {Object} GamificationProfile
 * @property {string} userId
 * @property {number} xp - Total XP acumulado
 * @property {number} level - Nível atual (1–10)
 * @property {string} tier - 'Iniciante' | 'Praticante' | 'Dedicado' | 'Consistente' | 'Avançado' | 'Expert' | 'Mestre' | 'Elite' | 'Campeão' | 'Lenda'
 * @property {number} xpToNextLevel - XP necessário para próximo nível
 * @property {number} xpProgressPercent - Progresso 0–100 para próximo nível
 * @property {string[]} badgeIds - IDs de badges desbloqueados
 * @property {number} totalCheckins - Check-ins totais
 * @property {number} currentStreak - Streak atual (dias)
 * @property {number} maxStreak - Maior streak já atingido
 * @property {number} challengesCompleted - Desafios concluídos
 * @property {number} referrals - Referrals confirmados
 * @property {number} createdAt - Unix timestamp
 * @property {number} updatedAt - Unix timestamp
 */

/**
 * @typedef {Object} Badge
 * @property {string} id - Unique badge ID
 * @property {string} name - Nome do badge
 * @property {string} description - Descrição da conquista
 * @property {string} icon - Emoji ou URL do ícone
 * @property {'common' | 'rare' | 'epic' | 'legendary'} rarity
 * @property {number} xpReward - XP dado ao desbloquear
 * @property {Object} trigger - Condição de desbloqueio
 * @property {string} trigger.type - 'checkin' | 'streak' | 'referral' | 'challenge' | 'purchase' | 'post' | 'level'
 * @property {number} trigger.threshold - Valor necessário
 * @property {string} category - 'consistency' | 'social' | 'purchase' | 'progression' | 'special'
 * @property {boolean} [hidden] - Badge secreto (revelado ao desbloquear)
 */

/**
 * @typedef {Object} XPEvent
 * @property {string} type - Tipo de ação
 * @property {number} amount - XP ganho
 * @property {Object} [meta] - Metadados extras
 */

class GamificationEngine {

  static _instance = null;
  static DB_NAME = 'suplilist-gamification';
  static DB_VERSION = 1;

  // XP por ação
  static XP_TABLE = {
    checkin:              10,
    checkin_streak_bonus:  5,  // +5 por dia consecutivo (máx 50)
    post_created:         15,
    comment_added:         5,
    like_given:            2,
    referral_confirmed:   100,
    challenge_completed:   80,
    challenge_joined:      10,
    purchase_affiliate:    20,
    profile_completed:     50,
    first_stack:           30,
    first_favorite:        10,
    share_achievement:      8,
    livestream_joined:      5,
    question_asked:        10,
  };

  // Thresholds por nível
  static LEVEL_TABLE = [
    { level: 1, tier: 'Iniciante',   xpRequired:     0 },
    { level: 2, tier: 'Praticante',  xpRequired:   200 },
    { level: 3, tier: 'Dedicado',    xpRequired:   600 },
    { level: 4, tier: 'Consistente', xpRequired:  1200 },
    { level: 5, tier: 'Avançado',    xpRequired:  2500 },
    { level: 6, tier: 'Expert',      xpRequired:  4500 },
    { level: 7, tier: 'Mestre',      xpRequired:  8000 },
    { level: 8, tier: 'Elite',       xpRequired: 13000 },
    { level: 9, tier: 'Campeão',     xpRequired: 20000 },
    { level: 10, tier: 'Lenda',      xpRequired: 30000 },
  ];

  // Catálogo completo de badges
  static BADGES_CATALOG = [
    // CONSISTENCY
    {
      id: 'first-checkin',
      name: 'Primeiro Passo',
      description: 'Realizou o primeiro check-in',
      icon: '🌱',
      rarity: 'common',
      xpReward: 20,
      trigger: { type: 'checkin', threshold: 1 },
      category: 'consistency',
    },
    {
      id: 'checkin-7',
      name: '7 Dias Seguidos',
      description: 'Check-in por 7 dias consecutivos',
      icon: '🔥',
      rarity: 'common',
      xpReward: 50,
      trigger: { type: 'streak', threshold: 7 },
      category: 'consistency',
    },
    {
      id: 'checkin-30',
      name: 'Mês Perfeito',
      description: 'Check-in por 30 dias consecutivos',
      icon: '🏅',
      rarity: 'rare',
      xpReward: 200,
      trigger: { type: 'streak', threshold: 30 },
      category: 'consistency',
    },
    {
      id: 'checkin-90',
      name: 'Trimestre de Ferro',
      description: 'Check-in por 90 dias consecutivos',
      icon: '💎',
      rarity: 'epic',
      xpReward: 500,
      trigger: { type: 'streak', threshold: 90 },
      category: 'consistency',
    },
    {
      id: 'checkin-365',
      name: 'Lenda Anual',
      description: '365 dias consecutivos de check-in',
      icon: '👑',
      rarity: 'legendary',
      xpReward: 2000,
      trigger: { type: 'streak', threshold: 365 },
      category: 'consistency',
    },
    {
      id: 'checkin-100',
      name: 'Centenário',
      description: '100 check-ins totais',
      icon: '💯',
      rarity: 'rare',
      xpReward: 150,
      trigger: { type: 'checkin', threshold: 100 },
      category: 'consistency',
    },
    // SOCIAL
    {
      id: 'first-post',
      name: 'Voz da Comunidade',
      description: 'Criou o primeiro post na comunidade',
      icon: '💬',
      rarity: 'common',
      xpReward: 25,
      trigger: { type: 'post', threshold: 1 },
      category: 'social',
    },
    {
      id: 'referral-1',
      name: 'Embaixador Iniciante',
      description: 'Indicou 1 amigo',
      icon: '🤝',
      rarity: 'common',
      xpReward: 100,
      trigger: { type: 'referral', threshold: 1 },
      category: 'social',
    },
    {
      id: 'referral-5',
      name: 'Super Embaixador',
      description: 'Indicou 5 amigos',
      icon: '🚀',
      rarity: 'rare',
      xpReward: 400,
      trigger: { type: 'referral', threshold: 5 },
      category: 'social',
    },
    {
      id: 'referral-25',
      name: 'Viral Champion',
      description: 'Indicou 25 amigos',
      icon: '🌟',
      rarity: 'legendary',
      xpReward: 2000,
      trigger: { type: 'referral', threshold: 25 },
      category: 'social',
    },
    // PROGRESSION
    {
      id: 'level-5',
      name: 'Meio do Caminho',
      description: 'Atingiu o nível 5: Avançado',
      icon: '⚡',
      rarity: 'rare',
      xpReward: 100,
      trigger: { type: 'level', threshold: 5 },
      category: 'progression',
    },
    {
      id: 'level-10',
      name: 'Lenda SupliList',
      description: 'Atingiu o nível máximo: Lenda',
      icon: '🏆',
      rarity: 'legendary',
      xpReward: 1000,
      trigger: { type: 'level', threshold: 10 },
      category: 'progression',
    },
    // CHALLENGES
    {
      id: 'challenge-first',
      name: 'Desafiador',
      description: 'Completou o primeiro desafio',
      icon: '🎯',
      rarity: 'common',
      xpReward: 80,
      trigger: { type: 'challenge', threshold: 1 },
      category: 'consistency',
    },
    {
      id: 'challenge-10',
      name: 'Mestre dos Desafios',
      description: 'Completou 10 desafios',
      icon: '🥇',
      rarity: 'epic',
      xpReward: 600,
      trigger: { type: 'challenge', threshold: 10 },
      category: 'consistency',
    },
    // SPECIAL (hidden)
    {
      id: 'night-owl',
      name: 'Coruja',
      description: 'Fez check-in após meia-noite',
      icon: '🦉',
      rarity: 'rare',
      xpReward: 50,
      trigger: { type: 'checkin', threshold: 1 },
      category: 'special',
      hidden: true,
    },
    {
      id: 'early-bird',
      name: 'Madrugador',
      description: 'Fez check-in antes das 6h da manhã',
      icon: '🌅',
      rarity: 'rare',
      xpReward: 50,
      trigger: { type: 'checkin', threshold: 1 },
      category: 'special',
      hidden: true,
    },
  ];

  /**
   * Singleton
   * @returns {GamificationEngine}
   */
  static getInstance() {
    if (!GamificationEngine._instance) {
      GamificationEngine._instance = new GamificationEngine();
    }
    return GamificationEngine._instance;
  }

  constructor() {
    this._db = null;
    this._profile = null;
    this._eventBus = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Inicializa IndexedDB e carrega perfil
   * @param {Object} [options]
   * @param {string} [options.userId]
   * @param {Object} [options.eventBus] - EventBus instance
   * @returns {Promise<GamificationProfile>}
   */
  async init({ userId = 'local-user', eventBus = null } = {}) {
    this._userId = userId;
    this._eventBus = eventBus;

    await this._openDB();
    this._profile = await this._loadProfile() ?? this._createDefaultProfile(userId);
    await this._saveProfile();

    this._log('GamificationEngine initialized', this._profile);
    return this._profile;
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: XP & LEVELS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Concede XP por ação e verifica level-up + badges
   * @param {string} actionType - Chave de XP_TABLE
   * @param {Object} [meta] - Metadados extras (supplementId, postId, etc)
   * @returns {Promise<{ xpGained: number, newBadges: Badge[], leveledUp: boolean, newLevel: number }>}
   */
  async awardXP(actionType, meta = {}) {
    if (!this._profile) throw new Error('GamificationEngine not initialized');

    const baseXP = GamificationEngine.XP_TABLE[actionType] ?? 0;

    // Streak bonus para check-in
    let bonus = 0;
    if (actionType === 'checkin') {
      bonus = Math.min(this._profile.currentStreak * 5, 50);
      this._profile.totalCheckins += 1;
    }

    const totalXP = baseXP + bonus;
    const oldLevel = this._profile.level;

    this._profile.xp += totalXP;
    this._updateLevel();

    const newBadges = await this._checkAndUnlockBadges(actionType, meta);
    const leveledUp = this._profile.level > oldLevel;

    await this._saveProfile();
    await this._logXPEvent({ type: actionType, amount: totalXP, meta });

    // Emite eventos
    this._emit('xp:awarded', { actionType, xpGained: totalXP, profile: this._profile });
    if (leveledUp) {
      this._emit('level:up', { newLevel: this._profile.level, tier: this._profile.tier });
    }
    if (newBadges.length > 0) {
      this._emit('badges:unlocked', { badges: newBadges });
    }

    this._log(`awardXP [${actionType}] +${totalXP}XP`, { newBadges, leveledUp });

    return { xpGained: totalXP, newBadges, leveledUp, newLevel: this._profile.level };
  }

  /**
   * Retorna o perfil atual de gamificação
   * @returns {GamificationProfile}
   */
  getProfile() {
    return { ...this._profile };
  }

  /**
   * Retorna todos os badges desbloqueados
   * @returns {Badge[]}
   */
  getUnlockedBadges() {
    const ids = new Set(this._profile?.badgeIds ?? []);
    return GamificationEngine.BADGES_CATALOG.filter(b => ids.has(b.id));
  }

  /**
   * Retorna todos os badges do catálogo com status de desbloqueio
   * @returns {Array<Badge & { unlocked: boolean }>}
   */
  getAllBadges() {
    const ids = new Set(this._profile?.badgeIds ?? []);
    return GamificationEngine.BADGES_CATALOG.map(b => ({
      ...b,
      unlocked: ids.has(b.id),
      // Oculta ícone/descrição de badges secretos não desbloqueados
      ...(b.hidden && !ids.has(b.id) ? {
        name: '???',
        description: 'Badge secreto — continue explorando!',
        icon: '🔒',
      } : {}),
    }));
  }

  /**
   * Retorna próximos badges a desbloquear (próximos 3)
   * @returns {Badge[]}
   */
  getNextBadges() {
    const ids = new Set(this._profile?.badgeIds ?? []);
    return GamificationEngine.BADGES_CATALOG
      .filter(b => !ids.has(b.id) && !b.hidden)
      .slice(0, 3);
  }

  /**
   * Retorna histórico de XP (últimas 50 entradas)
   * @returns {Promise<XPEvent[]>}
   */
  async getXPHistory() {
    return this._getAllFromStore('xp-events');
  }

  /**
   * Atualiza streak após check-in
   * @param {number} currentStreak - Streak atual do StreakSystem
   * @returns {Promise<void>}
   */
  async syncStreak(currentStreak) {
    if (!this._profile) return;
    const oldMax = this._profile.maxStreak;
    this._profile.currentStreak = currentStreak;
    if (currentStreak > oldMax) {
      this._profile.maxStreak = currentStreak;
    }
    await this._saveProfile();
  }

  /**
   * Registra conclusão de desafio
   * @param {string} challengeId
   * @returns {Promise<Object>}
   */
  async recordChallengeCompleted(challengeId) {
    this._profile.challengesCompleted += 1;
    const result = await this.awardXP('challenge_completed', { challengeId });
    return result;
  }

  /**
   * Registra referral confirmado
   * @param {string} referredUserId
   * @returns {Promise<Object>}
   */
  async recordReferral(referredUserId) {
    this._profile.referrals += 1;
    const result = await this.awardXP('referral_confirmed', { referredUserId });
    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: LEVEL LOGIC
  // ─────────────────────────────────────────────────────────────────

  /**
   * Atualiza level e tier baseado em XP total
   * @private
   */
  _updateLevel() {
    const table = GamificationEngine.LEVEL_TABLE;
    let current = table[0];

    for (let i = table.length - 1; i >= 0; i--) {
      if (this._profile.xp >= table[i].xpRequired) {
        current = table[i];
        break;
      }
    }

    this._profile.level = current.level;
    this._profile.tier = current.tier;

    const nextEntry = table[current.level]; // index = level (0-based: level 1 = index 0)
    if (nextEntry) {
      const xpForNext = nextEntry.xpRequired - current.xpRequired;
      const xpIntoLevel = this._profile.xp - current.xpRequired;
      this._profile.xpToNextLevel = nextEntry.xpRequired - this._profile.xp;
      this._profile.xpProgressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
    } else {
      // Nível máximo
      this._profile.xpToNextLevel = 0;
      this._profile.xpProgressPercent = 100;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: BADGE LOGIC
  // ─────────────────────────────────────────────────────────────────

  /**
   * Verifica e desbloqueia badges elegíveis
   * @private
   * @param {string} actionType
   * @param {Object} meta
   * @returns {Promise<Badge[]>}
   */
  async _checkAndUnlockBadges(actionType, meta) {
    const unlocked = [];
    const unlockedIds = new Set(this._profile.badgeIds);

    for (const badge of GamificationEngine.BADGES_CATALOG) {
      if (unlockedIds.has(badge.id)) continue;

      let eligible = false;

      switch (badge.trigger.type) {
        case 'checkin':
          eligible = this._profile.totalCheckins >= badge.trigger.threshold;
          // Special: night owl / early bird
          if (badge.id === 'night-owl') {
            const hour = new Date().getHours();
            eligible = hour >= 0 && hour < 5 && actionType === 'checkin';
          }
          if (badge.id === 'early-bird') {
            const hour = new Date().getHours();
            eligible = hour >= 4 && hour < 6 && actionType === 'checkin';
          }
          break;
        case 'streak':
          eligible = this._profile.currentStreak >= badge.trigger.threshold;
          break;
        case 'referral':
          eligible = this._profile.referrals >= badge.trigger.threshold;
          break;
        case 'challenge':
          eligible = this._profile.challengesCompleted >= badge.trigger.threshold;
          break;
        case 'post':
          // Rastreado via actionType
          eligible = actionType === 'post_created';
          break;
        case 'level':
          eligible = this._profile.level >= badge.trigger.threshold;
          break;
      }

      if (eligible) {
        this._profile.badgeIds.push(badge.id);
        this._profile.xp += badge.xpReward; // XP do badge
        unlocked.push(badge);
        await this._saveBadgeUnlock(badge.id);
      }
    }

    return unlocked;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: DATABASE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Abre IndexedDB
   * @private
   * @returns {Promise<void>}
   */
  async _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(GamificationEngine.DB_NAME, GamificationEngine.DB_VERSION);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this._db = req.result;
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'userId' });
        }

        if (!db.objectStoreNames.contains('badge-unlocks')) {
          const s = db.createObjectStore('badge-unlocks', { keyPath: 'id', autoIncrement: true });
          s.createIndex('badgeId', 'badgeId', { unique: false });
        }

        if (!db.objectStoreNames.contains('xp-events')) {
          const s = db.createObjectStore('xp-events', { keyPath: 'id', autoIncrement: true });
          s.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Cria perfil padrão
   * @private
   * @param {string} userId
   * @returns {GamificationProfile}
   */
  _createDefaultProfile(userId) {
    return {
      userId,
      xp: 0,
      level: 1,
      tier: 'Iniciante',
      xpToNextLevel: 200,
      xpProgressPercent: 0,
      badgeIds: [],
      totalCheckins: 0,
      currentStreak: 0,
      maxStreak: 0,
      challengesCompleted: 0,
      referrals: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Carrega perfil do IndexedDB
   * @private
   * @returns {Promise<GamificationProfile|null>}
   */
  async _loadProfile() {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('profiles', 'readonly');
      const req = tx.objectStore('profiles').get(this._userId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? null);
    });
  }

  /**
   * Salva perfil no IndexedDB
   * @private
   * @returns {Promise<void>}
   */
  async _saveProfile() {
    this._profile.updatedAt = Date.now();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('profiles', 'readwrite');
      const req = tx.objectStore('profiles').put(this._profile);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  /**
   * Salva desbloqueio de badge
   * @private
   * @param {string} badgeId
   * @returns {Promise<void>}
   */
  async _saveBadgeUnlock(badgeId) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('badge-unlocks', 'readwrite');
      const req = tx.objectStore('badge-unlocks').add({ badgeId, unlockedAt: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  /**
   * Salva evento de XP
   * @private
   * @param {XPEvent} event
   * @returns {Promise<void>}
   */
  async _logXPEvent(event) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('xp-events', 'readwrite');
      const req = tx.objectStore('xp-events').add({ ...event, createdAt: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  /**
   * Busca todos os registros de um store
   * @private
   * @param {string} storeName
   * @returns {Promise<any[]>}
   */
  async _getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? []);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: EVENT BUS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Emite evento via EventBus
   * @private
   * @param {string} event
   * @param {any} data
   */
  _emit(event, data) {
    if (this._eventBus) {
      this._eventBus.emit(event, data);
    }
    // Fallback: dispara CustomEvent no window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`gamification:${event}`, { detail: data }));
    }
  }

  /**
   * Log debug
   * @private
   * @param {string} label
   * @param {any} data
   */
  _log(label, data) {
    if (typeof window !== 'undefined' && window.__DEBUG_GAMIFICATION__) {
      console.log(`[GamificationEngine] ${label}`, data);
    }
  }

  /**
   * Destrói instância (para testes)
   */
  static resetInstance() {
    GamificationEngine._instance = null;
  }
}

export { GamificationEngine };
```

---

## TASK 2: CREATE /src/pages/achievements-page.js

```javascript
/**
 * AchievementsPage v1.0 — SupliList
 * Galeria de badges + XP + nível + progresso visual
 *
 * Uso:
 *   import { AchievementsPage } from '../pages/achievements-page.js';
 *   const page = new AchievementsPage({ container: document.getElementById('app') });
 *   await page.render();
 */

class AchievementsPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {Object} [config.gamificationEngine] - GamificationEngine instance
   */
  constructor({ container, gamificationEngine = null }) {
    this.container = container;
    this.gm = gamificationEngine ?? GamificationEngine.getInstance();
    this._activeFilter = 'all';
  }

  /**
   * Renderiza a página de conquistas
   * @returns {Promise<void>}
   */
  async render() {
    const profile = this.gm.getProfile();
    const allBadges = this.gm.getAllBadges();
    const nextBadges = this.gm.getNextBadges();

    this.container.innerHTML = `
      <div class="achievements-page">

        <!-- HEADER: Perfil de XP -->
        <section class="xp-profile-card bento-card glass-card">
          <div class="xp-tier-badge tier--${profile.tier.toLowerCase()}">${profile.tier}</div>
          <div class="xp-level">Nível ${profile.level}</div>
          <div class="xp-total">${profile.xp.toLocaleString('pt-BR')} XP</div>

          <div class="xp-progress-bar">
            <div class="xp-bar-fill" style="width: ${profile.xpProgressPercent}%"></div>
          </div>
          <div class="xp-progress-label">
            ${profile.xpToNextLevel > 0
              ? `+${profile.xpToNextLevel.toLocaleString('pt-BR')} XP para Nível ${profile.level + 1}`
              : '🏆 Nível Máximo Atingido!'
            }
          </div>

          <div class="xp-stats-grid">
            <div class="xp-stat">
              <span class="xp-stat-value">${profile.totalCheckins}</span>
              <span class="xp-stat-label">Check-ins</span>
            </div>
            <div class="xp-stat">
              <span class="xp-stat-value">${profile.currentStreak}🔥</span>
              <span class="xp-stat-label">Streak</span>
            </div>
            <div class="xp-stat">
              <span class="xp-stat-value">${profile.badgeIds.length}</span>
              <span class="xp-stat-label">Badges</span>
            </div>
            <div class="xp-stat">
              <span class="xp-stat-value">${profile.challengesCompleted}</span>
              <span class="xp-stat-label">Desafios</span>
            </div>
          </div>
        </section>

        <!-- PRÓXIMOS BADGES -->
        ${nextBadges.length > 0 ? `
        <section class="next-badges-section">
          <h3 class="section-title">🎯 Próximas Conquistas</h3>
          <div class="next-badges-list">
            ${nextBadges.map(b => `
              <div class="next-badge-card bento-card">
                <span class="badge-icon">${b.icon}</span>
                <div class="badge-info">
                  <div class="badge-name">${b.name}</div>
                  <div class="badge-desc">${b.description}</div>
                  <div class="badge-reward">+${b.xpReward} XP</div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
        ` : ''}

        <!-- FILTROS -->
        <div class="badge-filters">
          ${['all', 'consistency', 'social', 'progression', 'special'].map(f => `
            <button class="filter-btn ${this._activeFilter === f ? 'active' : ''}"
              data-filter="${f}">
              ${f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          `).join('')}
        </div>

        <!-- GRID DE BADGES -->
        <section class="badges-grid-section">
          <h3 class="section-title">🏅 Conquistas</h3>
          <div class="badges-grid" id="badges-grid">
            ${this._renderBadgeGrid(allBadges, this._activeFilter)}
          </div>
        </section>

      </div>
    `;

    this._attachEvents();
  }

  /**
   * Renderiza o grid de badges filtrado
   * @private
   * @param {Badge[]} badges
   * @param {string} filter
   * @returns {string}
   */
  _renderBadgeGrid(badges, filter) {
    const filtered = filter === 'all' ? badges : badges.filter(b => b.category === filter);

    return filtered.map(b => `
      <div class="badge-card bento-card ${b.unlocked ? 'badge--unlocked' : 'badge--locked'}
        badge-rarity--${b.rarity}"
        data-badge-id="${b.id}"
        role="button"
        tabindex="0"
        aria-label="${b.name}: ${b.description}">
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-rarity rarity--${b.rarity}">${b.rarity}</div>
        ${b.unlocked ? '<div class="badge-unlocked-indicator">✓</div>' : ''}
      </div>
    `).join('');
  }

  /**
   * Anexa eventos de interação
   * @private
   */
  _attachEvents() {
    // Filtros
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeFilter = btn.dataset.filter;
        const allBadges = this.gm.getAllBadges();
        const grid = this.container.querySelector('#badges-grid');
        if (grid) {
          grid.innerHTML = this._renderBadgeGrid(allBadges, this._activeFilter);
        }
        this.container.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.filter === this._activeFilter);
        });
      });
    });

    // Badge detail modal on click
    this.container.querySelectorAll('.badge-card').forEach(card => {
      card.addEventListener('click', () => {
        const badgeId = card.dataset.badgeId;
        const badge = GamificationEngine.BADGES_CATALOG.find(b => b.id === badgeId);
        if (badge) this._showBadgeModal(badge, card.classList.contains('badge--unlocked'));
      });
    });
  }

  /**
   * Exibe modal de detalhes do badge
   * @private
   * @param {Badge} badge
   * @param {boolean} unlocked
   */
  _showBadgeModal(badge, unlocked) {
    const modal = document.createElement('div');
    modal.className = 'badge-modal-overlay';
    modal.innerHTML = `
      <div class="badge-modal glass-card">
        <button class="modal-close" aria-label="Fechar">✕</button>
        <span class="badge-modal-icon">${badge.icon}</span>
        <h2 class="badge-modal-name">${badge.name}</h2>
        <div class="badge-modal-rarity rarity--${badge.rarity}">${badge.rarity}</div>
        <p class="badge-modal-desc">${badge.description}</p>
        <div class="badge-modal-reward">+${badge.xpReward} XP</div>
        ${unlocked
          ? '<div class="badge-modal-status status--unlocked">✅ Desbloqueado</div>'
          : '<div class="badge-modal-status status--locked">🔒 Ainda não desbloqueado</div>'
        }
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }
}

export { AchievementsPage };
```

---

## VALIDATION CHECKLIST — PROMPT 8.1

- [ ] `GamificationEngine.getInstance()` retorna singleton
- [ ] `await gm.init({ userId })` inicializa IndexedDB com 3 stores
- [ ] `await gm.awardXP('checkin')` concede 10 XP + streak bonus correto
- [ ] XP atualiza `level` e `tier` automaticamente via `_updateLevel()`
- [ ] `awardXP('checkin')` ao atingir 7 dias de streak desbloqueia badge `checkin-7`
- [ ] Badges secretos (`hidden: true`) ficam ocultos até serem desbloqueados
- [ ] `getNextBadges()` retorna 3 próximos badges não desbloqueados
- [ ] `getAllBadges()` retorna badges com `unlocked: true/false`
- [ ] Level-up emite evento `level:up` via EventBus e CustomEvent no window
- [ ] Badge unlock emite evento `badges:unlocked`
- [ ] IndexedDB persiste profile entre sessions
- [ ] `AchievementsPage.render()` exibe XP, nível, tier, progresso, badges
- [ ] Filtros por categoria funcionam (all, consistency, social, etc.)
- [ ] Click em badge abre modal com detalhes
- [ ] `GamificationEngine.resetInstance()` para uso em testes unitários

## FILES TO DELIVER

1. `/src/gamification/gamification-engine.js` (completo acima)
2. `/src/pages/achievements-page.js` (completo acima)
```

---

## **PROMPT 8.2: ChallengesEngine — CHALLENGES + PRIZES + TEAM COMPETITIONS**

```markdown
You are building the production ChallengesEngine for SupliList v4.0.

## CONTEXT

Challenges are timed community events that drive engagement, retention, and virality.
Weekly/monthly challenges with prizes (premium credits, exclusive badges).
Think: Duolingo leagues + Strava challenges + Beachbody competitions.

This module:
- Define weekly + monthly challenges com goals, prizes, start/end dates
- Rastreia progresso individual de cada usuário
- Suporta desafios em equipe (grupos do Sprint 7.2)
- Premia automaticamente ao concluir
- Exibe leaderboard interno do desafio
- Integra com GamificationEngine (XP) e CommunityFeed (share)
- Persiste em IndexedDB

Challenge types:
- 'streak': N dias consecutivos de check-in
- 'checkin': N check-ins totais
- 'referral': N indicações no período
- 'purchase': N compras via afiliado
- 'post': N posts na comunidade

---

## TASK 1: CREATE /src/challenges/challenges-engine.js

```javascript
/**
 * ChallengesEngine v1.0 — SupliList
 * Desafios semanais/mensais com prêmios e leaderboard interno
 *
 * Uso:
 *   import { ChallengesEngine } from '../challenges/challenges-engine.js';
 *   const engine = new ChallengesEngine({ userId, serverUrl });
 *   await engine.init();
 *   const challenges = engine.getActiveChallenges();
 *   await engine.joinChallenge('challenge-id');
 *   await engine.updateProgress('challenge-id', { value: 3 });
 */

/**
 * @typedef {Object} Challenge
 * @property {string} id - Unique challenge ID
 * @property {string} title - Título do desafio
 * @property {string} description - Descrição completa
 * @property {string} icon - Emoji do desafio
 * @property {'weekly' | 'monthly' | 'special'} type
 * @property {'streak' | 'checkin' | 'referral' | 'purchase' | 'post'} goalType
 * @property {number} goalValue - Valor alvo (ex: 7 dias, 5 referrals)
 * @property {number} startDate - Unix timestamp
 * @property {number} endDate - Unix timestamp
 * @property {Prize[]} prizes - Prêmios para os vencedores
 * @property {boolean} teamChallenge - Desafio por equipe?
 * @property {number} maxParticipants - Máximo de participantes
 * @property {string[]} tags - ['beginner', 'advanced', 'team']
 */

/**
 * @typedef {Object} Prize
 * @property {'badge' | 'premium_credit' | 'xp'} type
 * @property {number | string} value - Quantidade de XP/dias, ID do badge
 * @property {string} label - Ex: "30 dias Premium grátis"
 * @property {'gold' | 'silver' | 'bronze' | 'participant'} tier - Posição premiada
 */

/**
 * @typedef {Object} UserChallengeProgress
 * @property {string} challengeId
 * @property {string} userId
 * @property {number} currentValue - Progresso atual
 * @property {number} goalValue - Meta
 * @property {number} progressPercent - 0–100
 * @property {boolean} completed - Concluído?
 * @property {number} completedAt - Timestamp de conclusão
 * @property {boolean} rewardClaimed - Prêmio coletado?
 * @property {number} joinedAt - Timestamp de entrada
 */

class ChallengesEngine {

  static DB_NAME = 'suplilist-challenges';
  static DB_VERSION = 1;

  // Desafios predefinidos (seedados na inicialização)
  static DEFAULT_CHALLENGES = [
    {
      id: 'weekly-streak-7',
      title: '7 Dias de Fogo 🔥',
      description: 'Faça check-in por 7 dias consecutivos esta semana.',
      icon: '🔥',
      type: 'weekly',
      goalType: 'streak',
      goalValue: 7,
      prizes: [
        { type: 'badge', value: 'checkin-7', label: 'Badge "7 Dias de Fogo"', tier: 'gold' },
        { type: 'xp', value: 200, label: '+200 XP', tier: 'participant' },
      ],
      teamChallenge: false,
      maxParticipants: 10000,
      tags: ['beginner'],
    },
    {
      id: 'monthly-referral-3',
      title: 'Embaixador do Mês 🤝',
      description: 'Indique 3 amigos que criem conta este mês.',
      icon: '🤝',
      type: 'monthly',
      goalType: 'referral',
      goalValue: 3,
      prizes: [
        { type: 'premium_credit', value: 30, label: '30 dias Premium grátis', tier: 'gold' },
        { type: 'badge', value: 'referral-1', label: 'Badge Embaixador', tier: 'silver' },
        { type: 'xp', value: 300, label: '+300 XP', tier: 'participant' },
      ],
      teamChallenge: false,
      maxParticipants: 5000,
      tags: ['social'],
    },
    {
      id: 'weekly-posts-5',
      title: 'Voz Ativa 💬',
      description: 'Publique 5 posts na comunidade esta semana.',
      icon: '💬',
      type: 'weekly',
      goalType: 'post',
      goalValue: 5,
      prizes: [
        { type: 'xp', value: 150, label: '+150 XP', tier: 'gold' },
        { type: 'badge', value: 'first-post', label: 'Badge Comunidade', tier: 'participant' },
      ],
      teamChallenge: false,
      maxParticipants: 10000,
      tags: ['social', 'beginner'],
    },
    {
      id: 'monthly-checkin-25',
      title: 'Mês Consistente 📅',
      description: 'Realize 25 check-ins ao longo do mês.',
      icon: '📅',
      type: 'monthly',
      goalType: 'checkin',
      goalValue: 25,
      prizes: [
        { type: 'premium_credit', value: 14, label: '14 dias Premium grátis', tier: 'gold' },
        { type: 'xp', value: 400, label: '+400 XP', tier: 'participant' },
      ],
      teamChallenge: false,
      maxParticipants: 10000,
      tags: ['consistency'],
    },
    {
      id: 'special-team-streak-30',
      title: 'Equipe de Elite 🏆',
      description: 'Sua equipe completa 30 dias de streak somados.',
      icon: '🏆',
      type: 'special',
      goalType: 'streak',
      goalValue: 30,
      prizes: [
        { type: 'premium_credit', value: 60, label: '60 dias Premium para cada membro', tier: 'gold' },
        { type: 'badge', value: 'challenge-10', label: 'Badge Elite', tier: 'gold' },
      ],
      teamChallenge: true,
      maxParticipants: 100,
      tags: ['advanced', 'team'],
    },
  ];

  /**
   * @param {Object} config
   * @param {string} config.userId
   * @param {string} [config.serverUrl]
   * @param {Object} [config.gamificationEngine] - GamificationEngine instance
   */
  constructor({ userId, serverUrl = 'http://localhost:3000', gamificationEngine = null } = {}) {
    this.config = { userId, serverUrl };
    this._db = null;
    this._gm = gamificationEngine;
    this._challenges = [];
    this._userProgress = new Map(); // challengeId → UserChallengeProgress
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Inicializa engine, IndexedDB e desafios ativos
   * @returns {Promise<void>}
   */
  async init() {
    await this._openDB();
    await this._seedDefaultChallenges();
    await this._loadUserProgress();
    this._log('ChallengesEngine initialized');
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API: CHALLENGES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Retorna desafios ativos (dentro do período)
   * @returns {Challenge[]}
   */
  getActiveChallenges() {
    const now = Date.now();
    return this._challenges.filter(c => c.startDate <= now && c.endDate >= now);
  }

  /**
   * Retorna desafios que o usuário participou
   * @returns {Array<Challenge & { progress: UserChallengeProgress }>}
   */
  getJoinedChallenges() {
    const ids = new Set(this._userProgress.keys());
    return this.getActiveChallenges()
      .filter(c => ids.has(c.id))
      .map(c => ({ ...c, progress: this._userProgress.get(c.id) }));
  }

  /**
   * Retorna todos os desafios (ativos + expirados)
   * @returns {Challenge[]}
   */
  getAllChallenges() {
    return [...this._challenges];
  }

  /**
   * Usuário entra em um desafio
   * @param {string} challengeId
   * @returns {Promise<UserChallengeProgress>}
   */
  async joinChallenge(challengeId) {
    const challenge = this._challenges.find(c => c.id === challengeId);
    if (!challenge) throw new Error(`Challenge not found: ${challengeId}`);
    if (this._userProgress.has(challengeId)) throw new Error('Already joined');

    const progress = {
      challengeId,
      userId: this.config.userId,
      currentValue: 0,
      goalValue: challenge.goalValue,
      progressPercent: 0,
      completed: false,
      completedAt: null,
      rewardClaimed: false,
      joinedAt: Date.now(),
    };

    this._userProgress.set(challengeId, progress);
    await this._saveProgress(progress);

    // XP por entrar no desafio
    if (this._gm) {
      await this._gm.awardXP('challenge_joined', { challengeId });
    }

    this._log('joinChallenge', { challengeId });
    return progress;
  }

  /**
   * Atualiza progresso do usuário em um desafio
   * @param {string} challengeId
   * @param {Object} update
   * @param {number} update.value - Novo valor absoluto OU incremento
   * @param {boolean} [update.increment=true] - Se true, soma; se false, substitui
   * @returns {Promise<{ progress: UserChallengeProgress, completed: boolean, prizes: Prize[] }>}
   */
  async updateProgress(challengeId, { value = 1, increment = true } = {}) {
    const progress = this._userProgress.get(challengeId);
    if (!progress) throw new Error('Not joined in this challenge');
    if (progress.completed) return { progress, completed: true, prizes: [] };

    progress.currentValue = increment
      ? progress.currentValue + value
      : value;

    progress.progressPercent = Math.min(100, Math.round(
      (progress.currentValue / progress.goalValue) * 100
    ));

    let prizes = [];
    let completed = false;

    // Verifica conclusão
    if (progress.currentValue >= progress.goalValue && !progress.completed) {
      progress.completed = true;
      progress.completedAt = Date.now();
      completed = true;

      const challenge = this._challenges.find(c => c.id === challengeId);
      prizes = challenge?.prizes ?? [];

      // Recompensa via GamificationEngine
      if (this._gm) {
        await this._gm.recordChallengeCompleted(challengeId);
        // Concede XP dos prêmios tipo 'xp'
        for (const prize of prizes) {
          if (prize.type === 'xp') {
            await this._gm.awardXP('challenge_completed', { prize, challengeId });
          }
        }
      }

      // Emite evento de conclusão
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('challenge:completed', {
          detail: { challengeId, prizes }
        }));
      }

      this._log('Challenge completed!', { challengeId, prizes });
    }

    await this._saveProgress(progress);
    return { progress, completed, prizes };
  }

  /**
   * Retorna progresso do usuário em um desafio
   * @param {string} challengeId
   * @returns {UserChallengeProgress | null}
   */
  getProgress(challengeId) {
    return this._userProgress.get(challengeId) ?? null;
  }

  /**
   * Retorna leaderboard local de um desafio (top 20, ordenado por progresso)
   * @param {string} challengeId
   * @returns {Promise<Array<{ userId: string, progressPercent: number, completed: boolean }>>}
   */
  async getLeaderboard(challengeId) {
    const all = await this._getAllProgress(challengeId);
    return all
      .sort((a, b) => b.progressPercent - a.progressPercent || a.joinedAt - b.joinedAt)
      .slice(0, 20)
      .map((p, i) => ({
        position: i + 1,
        userId: p.userId,
        progressPercent: p.progressPercent,
        completed: p.completed,
        isMe: p.userId === this.config.userId,
      }));
  }

  /**
   * Cria um desafio customizado (Admin/Premium)
   * @param {Partial<Challenge>} challengeData
   * @returns {Promise<Challenge>}
   */
  async createCustomChallenge(challengeData) {
    const challenge = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: challengeData.title ?? 'Desafio Customizado',
      description: challengeData.description ?? '',
      icon: challengeData.icon ?? '⭐',
      type: challengeData.type ?? 'weekly',
      goalType: challengeData.goalType ?? 'checkin',
      goalValue: challengeData.goalValue ?? 7,
      startDate: challengeData.startDate ?? Date.now(),
      endDate: challengeData.endDate ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
      prizes: challengeData.prizes ?? [],
      teamChallenge: challengeData.teamChallenge ?? false,
      maxParticipants: challengeData.maxParticipants ?? 100,
      tags: challengeData.tags ?? [],
    };

    this._challenges.push(challenge);
    await this._saveChallenge(challenge);
    return challenge;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: DATABASE
  // ─────────────────────────────────────────────────────────────────

  async _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(ChallengesEngine.DB_NAME, ChallengesEngine.DB_VERSION);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this._db = req.result;
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('challenges')) {
          const s = db.createObjectStore('challenges', { keyPath: 'id' });
          s.createIndex('type', 'type', { unique: false });
          s.createIndex('endDate', 'endDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('user-progress')) {
          const s = db.createObjectStore('user-progress', { keyPath: 'id', autoIncrement: true });
          s.createIndex('challengeId', 'challengeId', { unique: false });
          s.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  async _seedDefaultChallenges() {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    // Calcula datas dinâmicas baseadas em hoje
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const seeded = ChallengesEngine.DEFAULT_CHALLENGES.map(c => ({
      ...c,
      startDate: c.type === 'weekly'
        ? weekStart.getTime()
        : c.type === 'monthly' ? monthStart.getTime() : now,
      endDate: c.type === 'weekly'
        ? weekStart.getTime() + weekMs
        : c.type === 'monthly' ? monthStart.getTime() + monthMs : now + monthMs,
    }));

    this._challenges = seeded;

    // Persiste no IndexedDB
    for (const challenge of seeded) {
      await this._saveChallenge(challenge);
    }
  }

  async _loadUserProgress() {
    const all = await new Promise((resolve, reject) => {
      const tx = this._db.transaction('user-progress', 'readonly');
      const req = tx.objectStore('user-progress').index('userId').getAll(this.config.userId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? []);
    });

    for (const p of all) {
      this._userProgress.set(p.challengeId, p);
    }
  }

  async _saveProgress(progress) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('user-progress', 'readwrite');
      const req = tx.objectStore('user-progress').put({ ...progress, updatedAt: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async _saveChallenge(challenge) {
    if (!this._db) return;
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('challenges', 'readwrite');
      const req = tx.objectStore('challenges').put(challenge);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async _getAllProgress(challengeId) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('user-progress', 'readonly');
      const req = tx.objectStore('user-progress').index('challengeId').getAll(challengeId);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? []);
    });
  }

  _log(label, data) {
    if (typeof window !== 'undefined' && window.__DEBUG_CHALLENGES__) {
      console.log(`[ChallengesEngine] ${label}`, data);
    }
  }
}

export { ChallengesEngine };
```

---

## TASK 2: CREATE /src/pages/challenges-page.js

```javascript
/**
 * ChallengesPage v1.0 — SupliList
 * Lista de desafios ativos, progresso, join e leaderboard interno
 *
 * Uso:
 *   import { ChallengesPage } from '../pages/challenges-page.js';
 *   const page = new ChallengesPage({ container, challengesEngine, userId });
 *   await page.render();
 */

class ChallengesPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {ChallengesEngine} config.challengesEngine
   * @param {string} config.userId
   */
  constructor({ container, challengesEngine, userId }) {
    this.container = container;
    this.engine = challengesEngine;
    this.userId = userId;
    this._activeTab = 'active'; // 'active' | 'joined' | 'completed'
  }

  /**
   * Renderiza a página de desafios
   * @returns {Promise<void>}
   */
  async render() {
    const activeChallenges = this.engine.getActiveChallenges();
    const joinedChallenges = this.engine.getJoinedChallenges();
    const completedChallenges = joinedChallenges.filter(c => c.progress?.completed);

    this.container.innerHTML = `
      <div class="challenges-page">

        <!-- HEADER -->
        <header class="challenges-header">
          <h1 class="page-title">🏆 Desafios</h1>
          <p class="page-subtitle">Compete, consiste e ganhe prêmios exclusivos</p>
        </header>

        <!-- TABS -->
        <div class="challenges-tabs" role="tablist">
          <button class="tab-btn ${this._activeTab === 'active' ? 'active' : ''}"
            data-tab="active" role="tab">Ativos (${activeChallenges.length})</button>
          <button class="tab-btn ${this._activeTab === 'joined' ? 'active' : ''}"
            data-tab="joined" role="tab">Participando (${joinedChallenges.length})</button>
          <button class="tab-btn ${this._activeTab === 'completed' ? 'active' : ''}"
            data-tab="completed" role="tab">Concluídos (${completedChallenges.length})</button>
        </div>

        <!-- CONTENT -->
        <div id="challenges-content">
          ${await this._renderTabContent(this._activeTab)}
        </div>

      </div>
    `;

    this._attachEvents();
  }

  /**
   * Renderiza conteúdo da tab ativa
   * @private
   * @param {string} tab
   * @returns {Promise<string>}
   */
  async _renderTabContent(tab) {
    switch (tab) {
      case 'active':
        return this._renderActiveChallenges();
      case 'joined':
        return this._renderJoinedChallenges();
      case 'completed':
        return this._renderCompletedChallenges();
      default:
        return '';
    }
  }

  _renderActiveChallenges() {
    const challenges = this.engine.getActiveChallenges();
    const joinedIds = new Set(this.engine.getJoinedChallenges().map(c => c.id));

    if (challenges.length === 0) {
      return '<div class="empty-state">Nenhum desafio ativo no momento. Volte em breve!</div>';
    }

    return `<div class="challenges-grid">
      ${challenges.map(c => {
        const joined = joinedIds.has(c.id);
        const progress = this.engine.getProgress(c.id);
        const daysLeft = Math.ceil((c.endDate - Date.now()) / (24 * 60 * 60 * 1000));

        return `
          <div class="challenge-card bento-card" data-challenge-id="${c.id}">
            <div class="challenge-header">
              <span class="challenge-icon">${c.icon}</span>
              <div class="challenge-meta">
                <span class="challenge-type type--${c.type}">${c.type}</span>
                <span class="challenge-days-left">${daysLeft}d restantes</span>
              </div>
            </div>

            <h3 class="challenge-title">${c.title}</h3>
            <p class="challenge-desc">${c.description}</p>

            <!-- Prêmios -->
            <div class="challenge-prizes">
              ${c.prizes.slice(0, 2).map(p => `
                <span class="prize-tag prize--${p.tier}">${p.label}</span>
              `).join('')}
            </div>

            <!-- Progresso (se participando) -->
            ${joined && progress ? `
              <div class="challenge-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress.progressPercent}%"></div>
                </div>
                <div class="progress-label">${progress.currentValue}/${progress.goalValue} — ${progress.progressPercent}%</div>
              </div>
            ` : ''}

            <!-- Tags -->
            <div class="challenge-tags">
              ${c.tags.map(t => `<span class="tag tag--${t}">${t}</span>`).join('')}
              ${c.teamChallenge ? '<span class="tag tag--team">👥 Equipe</span>' : ''}
            </div>

            <!-- CTA -->
            <button class="btn-primary challenge-cta"
              data-action="${joined ? 'view-progress' : 'join'}"
              data-challenge-id="${c.id}">
              ${joined ? '📊 Ver Progresso' : '🚀 Participar'}
            </button>
          </div>
        `;
      }).join('')}
    </div>`;
  }

  _renderJoinedChallenges() {
    const joined = this.engine.getJoinedChallenges();
    if (joined.length === 0) {
      return '<div class="empty-state">Você ainda não entrou em nenhum desafio. Escolha um acima!</div>';
    }

    return `<div class="challenges-grid">
      ${joined.map(c => `
        <div class="challenge-card bento-card challenge-card--joined">
          <div class="challenge-header">
            <span class="challenge-icon">${c.icon}</span>
            <span class="challenge-joined-badge">✅ Participando</span>
          </div>
          <h3 class="challenge-title">${c.title}</h3>
          <div class="challenge-progress">
            <div class="progress-bar progress-bar--large">
              <div class="progress-fill" style="width: ${c.progress.progressPercent}%"></div>
            </div>
            <div class="progress-label">${c.progress.currentValue} / ${c.progress.goalValue}</div>
          </div>
          <div class="challenge-prizes">
            ${c.prizes.slice(0, 2).map(p => `
              <span class="prize-tag prize--${p.tier}">${p.label}</span>
            `).join('')}
          </div>
          <button class="btn-secondary"
            data-action="view-leaderboard"
            data-challenge-id="${c.id}">
            🏅 Ver Leaderboard
          </button>
        </div>
      `).join('')}
    </div>`;
  }

  _renderCompletedChallenges() {
    const completed = this.engine.getJoinedChallenges().filter(c => c.progress?.completed);
    if (completed.length === 0) {
      return '<div class="empty-state">Nenhum desafio concluído ainda. Você consegue!</div>';
    }

    return `<div class="challenges-grid">
      ${completed.map(c => `
        <div class="challenge-card bento-card challenge-card--completed">
          <span class="challenge-icon">${c.icon}</span>
          <h3 class="challenge-title">${c.title}</h3>
          <div class="challenge-completed-stamp">🏆 CONCLUÍDO</div>
          <div class="challenge-prizes">
            ${c.prizes.map(p => `<span class="prize-tag prize--${p.tier}">${p.label}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  _attachEvents() {
    // Tab switching
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this._activeTab = btn.dataset.tab;
        this.container.querySelectorAll('.tab-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.tab === this._activeTab)
        );
        const content = this.container.querySelector('#challenges-content');
        if (content) {
          content.innerHTML = await this._renderTabContent(this._activeTab);
          this._attachCTAEvents();
        }
      });
    });

    this._attachCTAEvents();
  }

  _attachCTAEvents() {
    // Join / view-progress / view-leaderboard
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const challengeId = btn.dataset.challengeId;

        if (action === 'join') {
          try {
            btn.disabled = true;
            btn.textContent = 'Entrando...';
            await this.engine.joinChallenge(challengeId);
            btn.textContent = '✅ Entrou!';
            setTimeout(() => this.render(), 1000); // Re-render
          } catch (err) {
            btn.disabled = false;
            btn.textContent = err.message === 'Already joined' ? '✅ Já Participando' : '⚠️ Erro';
          }

        } else if (action === 'view-leaderboard') {
          const leaderboard = await this.engine.getLeaderboard(challengeId);
          this._showLeaderboardModal(challengeId, leaderboard);
        }
      });
    });
  }

  _showLeaderboardModal(challengeId, leaderboard) {
    const challenge = this.engine.getAllChallenges().find(c => c.id === challengeId);
    const modal = document.createElement('div');
    modal.className = 'leaderboard-modal-overlay';
    modal.innerHTML = `
      <div class="leaderboard-modal glass-card">
        <button class="modal-close">✕</button>
        <h2>${challenge?.icon} ${challenge?.title} — Leaderboard</h2>
        <ol class="leaderboard-list">
          ${leaderboard.map(entry => `
            <li class="leaderboard-entry ${entry.isMe ? 'leaderboard-entry--me' : ''}">
              <span class="lb-position">${entry.position}</span>
              <span class="lb-user">${entry.isMe ? '👤 Você' : `Usuário #${entry.position}`}</span>
              <span class="lb-progress">${entry.progressPercent}%</span>
              ${entry.completed ? '<span class="lb-done">✅</span>' : ''}
            </li>
          `).join('')}
        </ol>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }
}

export { ChallengesPage };
```

---

## VALIDATION CHECKLIST — PROMPT 8.2

- [ ] `await engine.init()` seed 5 desafios padrão com datas dinâmicas corretas
- [ ] `engine.getActiveChallenges()` filtra por startDate ≤ now ≤ endDate
- [ ] `await engine.joinChallenge(id)` cria progresso e concede XP via GamificationEngine
- [ ] `joinChallenge` lança erro se usuário já participou
- [ ] `await engine.updateProgress(id, { value: 1 })` incrementa corretamente
- [ ] `updateProgress` completa desafio ao atingir goalValue
- [ ] Conclusão emite `challenge:completed` CustomEvent
- [ ] Conclusão chama `gamificationEngine.recordChallengeCompleted()`
- [ ] `engine.getLeaderboard(id)` retorna top 20 ordenado por progresso
- [ ] `await engine.createCustomChallenge({...})` cria e persiste novo desafio
- [ ] IndexedDB persiste challenges e progresso entre sessões
- [ ] `ChallengesPage.render()` exibe tabs: Ativos / Participando / Concluídos
- [ ] Botão "Participar" chama `joinChallenge` e atualiza UI
- [ ] Modal de leaderboard abre com posições corretas

## FILES TO DELIVER

1. `/src/challenges/challenges-engine.js` (completo acima)
2. `/src/pages/challenges-page.js` (completo acima)
```

---

## **PROMPT 8.3: LeaderboardEngine — GLOBAL + AMIGOS + GRUPOS**

```markdown
You are building the production LeaderboardEngine for SupliList v4.0.

## CONTEXT

Leaderboards create competition, FOMO, and re-engagement.
Three leaderboard scopes: Global (todos os users), Amigos (rede social), Grupos (grupos do Sprint 7.2).
Anonymous by default (exibe "Você" para o usuário, "@nickname" para outros).
Think: Duolingo leagues + Fitbit weekly challenges + Strava segments.

This module:
- Busca top 100 usuários por XP / streak / check-ins
- Suporta filtros: 'xp' | 'streak' | 'checkins' | 'challenges'
- Suporta scopes: 'global' | 'friends' | 'group'
- Atualiza a cada 5 minutos (polling)
- Exibe posição do usuário mesmo fora do top 100
- Mostra variação de posição (↑3 ↓2)
- Persiste cache em IndexedDB
- Integra com GamificationEngine para dados locais

---

## TASK 1: CREATE /src/leaderboard/leaderboard-engine.js

```javascript
/**
 * LeaderboardEngine v1.0 — SupliList
 * Rankings globais, de amigos e de grupos
 *
 * Uso:
 *   import { LeaderboardEngine } from '../leaderboard/leaderboard-engine.js';
 *   const engine = new LeaderboardEngine({ userId, serverUrl });
 *   await engine.init();
 *   const data = await engine.getLeaderboard({ scope: 'global', metric: 'xp' });
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {number} position - Posição no ranking (1-based)
 * @property {string} userId
 * @property {string} displayName - Handle anônimo ou @nickname
 * @property {string} avatar - Emoji ou URL do avatar
 * @property {string} tier - 'Iniciante' → 'Lenda'
 * @property {number} value - Valor da métrica (XP, streak, etc.)
 * @property {boolean} isMe - É o usuário atual?
 * @property {number} positionChange - +3 subiu, -2 desceu, 0 igual
 */

/**
 * @typedef {Object} LeaderboardResult
 * @property {string} scope - 'global' | 'friends' | 'group'
 * @property {string} metric - 'xp' | 'streak' | 'checkins' | 'challenges'
 * @property {LeaderboardEntry[]} entries - Top entries
 * @property {LeaderboardEntry | null} myPosition - Posição do usuário (mesmo fora do top)
 * @property {number} totalParticipants
 * @property {number} updatedAt - Timestamp
 */

class LeaderboardEngine {

  static DB_NAME = 'suplilist-leaderboard';
  static DB_VERSION = 1;
  static CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
  static TOP_N = 100;

  /**
   * @param {Object} config
   * @param {string} config.userId
   * @param {string} [config.serverUrl]
   * @param {Object} [config.gamificationEngine]
   */
  constructor({ userId, serverUrl = 'http://localhost:3000', gamificationEngine = null } = {}) {
    this.config = { userId, serverUrl };
    this._db = null;
    this._gm = gamificationEngine;
    this._cache = new Map(); // cacheKey → { result, ts }
    this._pollInterval = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Inicializa engine
   * @returns {Promise<void>}
   */
  async init() {
    await this._openDB();
    this._log('LeaderboardEngine initialized');
  }

  /**
   * Inicia polling de atualização
   * @param {Function} onUpdate - Callback chamado com LeaderboardResult
   * @param {Object} [options]
   * @param {string} [options.scope='global']
   * @param {string} [options.metric='xp']
   * @returns {void}
   */
  startPolling(onUpdate, { scope = 'global', metric = 'xp' } = {}) {
    this._pollInterval = setInterval(async () => {
      const result = await this.getLeaderboard({ scope, metric, force: true });
      onUpdate(result);
    }, LeaderboardEngine.CACHE_TTL_MS);
  }

  /**
   * Para polling
   */
  stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Retorna leaderboard para scope + métrica
   * @param {Object} options
   * @param {'global' | 'friends' | 'group'} [options.scope='global']
   * @param {'xp' | 'streak' | 'checkins' | 'challenges'} [options.metric='xp']
   * @param {string} [options.groupId] - Requerido se scope='group'
   * @param {boolean} [options.force=false] - Ignora cache
   * @returns {Promise<LeaderboardResult>}
   */
  async getLeaderboard({ scope = 'global', metric = 'xp', groupId = null, force = false } = {}) {
    const cacheKey = `${scope}:${metric}:${groupId ?? ''}`;

    // Verifica cache
    if (!force && this._cache.has(cacheKey)) {
      const cached = this._cache.get(cacheKey);
      if (Date.now() - cached.ts < LeaderboardEngine.CACHE_TTL_MS) {
        this._log('Leaderboard from cache', cacheKey);
        return cached.result;
      }
    }

    let result;

    try {
      // Tenta buscar do servidor
      result = await this._fetchFromServer({ scope, metric, groupId });
    } catch (err) {
      this._log('Server fetch failed, using local data', err.message);
      // Fallback: dados locais do GamificationEngine
      result = this._buildLocalLeaderboard({ scope, metric });
    }

    // Salva no cache e IndexedDB
    this._cache.set(cacheKey, { result, ts: Date.now() });
    await this._cacheLeaderboard(cacheKey, result);

    return result;
  }

  /**
   * Retorna posição do usuário em um leaderboard específico
   * @param {Object} options
   * @returns {Promise<{ position: number, value: number, percentile: number }>}
   */
  async getMyPosition({ scope = 'global', metric = 'xp' } = {}) {
    const { myPosition, totalParticipants } = await this.getLeaderboard({ scope, metric });
    if (!myPosition) return { position: null, value: 0, percentile: 100 };

    const percentile = Math.round((1 - (myPosition.position / totalParticipants)) * 100);
    return {
      position: myPosition.position,
      value: myPosition.value,
      percentile,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: FETCH
  // ─────────────────────────────────────────────────────────────────

  /**
   * Busca leaderboard do servidor
   * @private
   */
  async _fetchFromServer({ scope, metric, groupId }) {
    const params = new URLSearchParams({
      scope,
      metric,
      userId: this.config.userId,
      limit: LeaderboardEngine.TOP_N,
      ...(groupId ? { groupId } : {}),
    });

    const response = await fetch(
      `${this.config.serverUrl}/api/leaderboards?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this._getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    return {
      scope,
      metric,
      entries: data.entries ?? [],
      myPosition: data.myPosition ?? null,
      totalParticipants: data.totalParticipants ?? data.entries?.length ?? 0,
      updatedAt: Date.now(),
    };
  }

  /**
   * Constrói leaderboard local com dados do GamificationEngine
   * @private
   */
  _buildLocalLeaderboard({ scope, metric }) {
    const profile = this._gm?.getProfile();

    const myEntry = profile ? {
      position: 1,
      userId: this.config.userId,
      displayName: 'Você',
      avatar: '👤',
      tier: profile.tier,
      value: this._getMetricValue(profile, metric),
      isMe: true,
      positionChange: 0,
    } : null;

    return {
      scope,
      metric,
      entries: myEntry ? [myEntry] : [],
      myPosition: myEntry,
      totalParticipants: 1,
      updatedAt: Date.now(),
    };
  }

  /**
   * Extrai valor da métrica do perfil
   * @private
   */
  _getMetricValue(profile, metric) {
    switch (metric) {
      case 'xp':         return profile.xp;
      case 'streak':     return profile.currentStreak;
      case 'checkins':   return profile.totalCheckins;
      case 'challenges': return profile.challengesCompleted;
      default:           return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE: DATABASE
  // ─────────────────────────────────────────────────────────────────

  async _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(LeaderboardEngine.DB_NAME, LeaderboardEngine.DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this._db = req.result;
        resolve();
      };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('leaderboard-cache')) {
          db.createObjectStore('leaderboard-cache', { keyPath: 'cacheKey' });
        }
      };
    });
  }

  async _cacheLeaderboard(cacheKey, result) {
    if (!this._db) return;
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('leaderboard-cache', 'readwrite');
      const req = tx.objectStore('leaderboard-cache').put({ cacheKey, result, ts: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  _getAuthToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') ?? '';
  }

  _log(label, data) {
    if (typeof window !== 'undefined' && window.__DEBUG_LEADERBOARD__) {
      console.log(`[LeaderboardEngine] ${label}`, data);
    }
  }

  destroy() {
    this.stopPolling();
  }
}

export { LeaderboardEngine };
```

---

## TASK 2: CREATE /src/pages/leaderboard-page.js

```javascript
/**
 * LeaderboardPage v1.0 — SupliList
 * Rankings global, amigos e grupos com filtros de métrica
 *
 * Uso:
 *   import { LeaderboardPage } from '../pages/leaderboard-page.js';
 *   const page = new LeaderboardPage({ container, leaderboardEngine });
 *   await page.render();
 */

class LeaderboardPage {

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {LeaderboardEngine} config.leaderboardEngine
   */
  constructor({ container, leaderboardEngine }) {
    this.container = container;
    this.engine = leaderboardEngine;
    this._scope = 'global';
    this._metric = 'xp';
    this._loading = false;
  }

  /**
   * Renderiza a página de leaderboard
   * @returns {Promise<void>}
   */
  async render() {
    this.container.innerHTML = `
      <div class="leaderboard-page">

        <!-- HEADER -->
        <header class="leaderboard-header">
          <h1 class="page-title">🏅 Rankings</h1>
          <p class="page-subtitle">Compare seu progresso com a comunidade</p>
        </header>

        <!-- SCOPE SELECTOR -->
        <div class="scope-selector" role="tablist">
          ${['global', 'friends', 'group'].map(s => `
            <button class="scope-btn ${this._scope === s ? 'active' : ''}"
              data-scope="${s}" role="tab">
              ${s === 'global' ? '🌍 Global' : s === 'friends' ? '👥 Amigos' : '🔗 Grupo'}
            </button>
          `).join('')}
        </div>

        <!-- METRIC SELECTOR -->
        <div class="metric-selector">
          ${[
            { key: 'xp', label: '⚡ XP' },
            { key: 'streak', label: '🔥 Streak' },
            { key: 'checkins', label: '✅ Check-ins' },
            { key: 'challenges', label: '🏆 Desafios' },
          ].map(m => `
            <button class="metric-btn ${this._metric === m.key ? 'active' : ''}"
              data-metric="${m.key}">
              ${m.label}
            </button>
          `).join('')}
        </div>

        <!-- LEADERBOARD TABLE -->
        <div id="leaderboard-content" class="leaderboard-content">
          <div class="leaderboard-loading">⏳ Carregando ranking...</div>
        </div>

      </div>
    `;

    await this._loadAndRenderLeaderboard();
    this._attachEvents();
  }

  /**
   * Carrega e renderiza o leaderboard atual
   * @private
   * @returns {Promise<void>}
   */
  async _loadAndRenderLeaderboard() {
    const content = this.container.querySelector('#leaderboard-content');
    if (!content || this._loading) return;

    this._loading = true;
    content.innerHTML = '<div class="leaderboard-loading">⏳ Carregando ranking...</div>';

    try {
      const result = await this.engine.getLeaderboard({
        scope: this._scope,
        metric: this._metric,
      });

      content.innerHTML = this._renderLeaderboard(result);
    } catch (err) {
      content.innerHTML = '<div class="leaderboard-error">⚠️ Erro ao carregar ranking. Tente novamente.</div>';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Renderiza tabela de leaderboard
   * @private
   * @param {LeaderboardResult} result
   * @returns {string}
   */
  _renderLeaderboard(result) {
    const metricLabel = {
      xp: 'XP', streak: 'Dias', checkins: 'Check-ins', challenges: 'Desafios'
    }[result.metric] ?? '';

    const myPos = result.myPosition;

    return `
      <!-- Minha posição destaque -->
      ${myPos ? `
        <div class="my-position-card bento-card glass-card">
          <div class="my-pos-rank">#${myPos.position}</div>
          <div class="my-pos-info">
            <span class="my-pos-tier">${myPos.tier}</span>
            <span class="my-pos-value">${myPos.value.toLocaleString('pt-BR')} ${metricLabel}</span>
          </div>
          <div class="my-pos-label">Sua Posição • ${result.totalParticipants.toLocaleString('pt-BR')} participantes</div>
        </div>
      ` : ''}

      <!-- Tabela -->
      <div class="leaderboard-table" role="list">
        ${result.entries.length === 0
          ? '<div class="empty-state">Nenhum dado disponível ainda. Seja o primeiro!</div>'
          : result.entries.map(entry => `
            <div class="leaderboard-row ${entry.isMe ? 'leaderboard-row--me' : ''}" role="listitem">

              <!-- Posição -->
              <div class="lb-position ${entry.position <= 3 ? `lb-position--${entry.position}` : ''}">
                ${entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : entry.position}
              </div>

              <!-- Avatar + Nome -->
              <div class="lb-user-info">
                <span class="lb-avatar">${entry.avatar}</span>
                <div class="lb-user-text">
                  <span class="lb-name">${entry.displayName}</span>
                  <span class="lb-tier">${entry.tier}</span>
                </div>
              </div>

              <!-- Variação de posição -->
              <div class="lb-change ${entry.positionChange > 0 ? 'change--up' : entry.positionChange < 0 ? 'change--down' : 'change--neutral'}">
                ${entry.positionChange > 0
                  ? `↑${entry.positionChange}`
                  : entry.positionChange < 0
                  ? `↓${Math.abs(entry.positionChange)}`
                  : '—'
                }
              </div>

              <!-- Valor -->
              <div class="lb-value">${entry.value.toLocaleString('pt-BR')} ${metricLabel}</div>

            </div>
          `).join('')
        }
      </div>

      <div class="leaderboard-footer">
        Atualizado às ${new Date(result.updatedAt).toLocaleTimeString('pt-BR')}
      </div>
    `;
  }

  /**
   * Anexa eventos de interação
   * @private
   */
  _attachEvents() {
    // Scope buttons
    this.container.querySelectorAll('.scope-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this._scope = btn.dataset.scope;
        this.container.querySelectorAll('.scope-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.scope === this._scope)
        );
        await this._loadAndRenderLeaderboard();
      });
    });

    // Metric buttons
    this.container.querySelectorAll('.metric-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this._metric = btn.dataset.metric;
        this.container.querySelectorAll('.metric-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.metric === this._metric)
        );
        await this._loadAndRenderLeaderboard();
      });
    });
  }
}

export { LeaderboardPage };
```

---

## VALIDATION CHECKLIST — PROMPT 8.3

- [ ] `await engine.init()` inicializa IndexedDB
- [ ] `await engine.getLeaderboard({ scope: 'global', metric: 'xp' })` retorna `LeaderboardResult`
- [ ] Cache de 5 minutos evita requests repetidos
- [ ] Fallback local usa dados do GamificationEngine se servidor falhar
- [ ] `getLeaderboard` com `force: true` ignora cache
- [ ] `engine.getMyPosition()` retorna posição + percentil corretos
- [ ] `startPolling(callback)` chama callback a cada 5 min
- [ ] `stopPolling()` limpa intervalo
- [ ] `LeaderboardPage.render()` exibe scope selector + metric selector
- [ ] Trocar scope/metric recarrega leaderboard automaticamente
- [ ] Top 3 exibe medalhas (🥇🥈🥉) corretamente
- [ ] Variação de posição (↑/↓) exibida por entry
- [ ] "Minha Posição" card aparece mesmo fora do top 100
- [ ] Estado de loading + erro tratados visualmente

## FILES TO DELIVER

1. `/src/leaderboard/leaderboard-engine.js` (completo acima)
2. `/src/pages/leaderboard-page.js` (completo acima)
```

---

## **PROMPT 8.4: BadgesPage + StreakGamifiedPage — GALERIA E STREAK VISUAL**

```markdown
You are building the BadgesPage and StreakGamifiedPage for SupliList v4.0.

## CONTEXT

BadgesPage is the achievement gallery — a motivational showcase of all badges
(unlocked + locked), filterable by category and rarity.

StreakGamifiedPage reimagines the basic streak tracker (Sprint 4.4) as a full
gamified experience: milestone banners, confetti, XP counter, badge previews.

Both pages use GamificationEngine and integrate seamlessly with the existing
design system (dark mode, bento grid, glass cards).

---

## TASK 1: CREATE /src/pages/badges-page.js

```javascript
/**
 * BadgesPage v1.0 — SupliList
 * Galeria completa de badges com filtros e detalhes
 *
 * Uso:
 *   import { BadgesPage } from '../pages/badges-page.js';
 *   const page = new BadgesPage({ container, gamificationEngine });
 *   await page.render();
 */

class BadgesPage {

  static RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };
  static RARITY_COLORS = {
    legendary: '#FFD700',
    epic:      '#9B59B6',
    rare:      '#3498DB',
    common:    '#95A5A6',
  };

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {GamificationEngine} config.gamificationEngine
   */
  constructor({ container, gamificationEngine }) {
    this.container = container;
    this.gm = gamificationEngine;
    this._filter = { category: 'all', rarity: 'all', status: 'all' };
    this._sort = 'rarity'; // 'rarity' | 'name' | 'recent'
  }

  /**
   * Renderiza a página de badges
   * @returns {Promise<void>}
   */
  async render() {
    const profile = this.gm.getProfile();
    const allBadges = this.gm.getAllBadges();
    const unlockedCount = allBadges.filter(b => b.unlocked).length;
    const totalCount = allBadges.length;
    const completionPct = Math.round((unlockedCount / totalCount) * 100);

    this.container.innerHTML = `
      <div class="badges-page">

        <!-- HEADER -->
        <header class="badges-header">
          <h1 class="page-title">🏅 Conquistas</h1>
          <div class="badges-progress-summary bento-card glass-card">
            <div class="bp-count">${unlockedCount} / ${totalCount}</div>
            <div class="bp-label">Badges Desbloqueados</div>
            <div class="bp-progress-bar">
              <div class="bp-progress-fill" style="width: ${completionPct}%"></div>
            </div>
            <div class="bp-pct">${completionPct}% completo</div>
          </div>
        </header>

        <!-- RARITY SUMMARY -->
        <div class="rarity-summary">
          ${['legendary', 'epic', 'rare', 'common'].map(r => {
            const rarityBadges = allBadges.filter(b => b.rarity === r);
            const unlockedRarity = rarityBadges.filter(b => b.unlocked).length;
            return `
              <div class="rarity-chip rarity--${r}">
                <span class="rarity-count">${unlockedRarity}/${rarityBadges.length}</span>
                <span class="rarity-label">${r}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- FILTERS -->
        <div class="badges-filters">
          <select class="filter-select" id="filter-category" aria-label="Filtrar por categoria">
            <option value="all">Todas as Categorias</option>
            <option value="consistency">Consistência</option>
            <option value="social">Social</option>
            <option value="progression">Progressão</option>
            <option value="special">Especial</option>
          </select>

          <select class="filter-select" id="filter-rarity" aria-label="Filtrar por raridade">
            <option value="all">Todas as Raridades</option>
            <option value="legendary">Legendary</option>
            <option value="epic">Epic</option>
            <option value="rare">Rare</option>
            <option value="common">Common</option>
          </select>

          <select class="filter-select" id="filter-status" aria-label="Filtrar por status">
            <option value="all">Todos</option>
            <option value="unlocked">Desbloqueados</option>
            <option value="locked">Bloqueados</option>
          </select>

          <select class="filter-select" id="sort-by" aria-label="Ordenar por">
            <option value="rarity">Raridade</option>
            <option value="name">Nome A–Z</option>
            <option value="status">Desbloqueados Primeiro</option>
          </select>
        </div>

        <!-- BADGES GRID -->
        <div class="badges-gallery-grid" id="badges-gallery">
          ${this._renderBadges(allBadges)}
        </div>

      </div>
    `;

    this._attachEvents();
  }

  /**
   * Renderiza badges filtrados e ordenados
   * @private
   * @param {Badge[]} badges
   * @returns {string}
   */
  _renderBadges(badges) {
    let filtered = [...badges];

    // Filtros
    if (this._filter.category !== 'all') {
      filtered = filtered.filter(b => b.category === this._filter.category);
    }
    if (this._filter.rarity !== 'all') {
      filtered = filtered.filter(b => b.rarity === this._filter.rarity);
    }
    if (this._filter.status === 'unlocked') {
      filtered = filtered.filter(b => b.unlocked);
    } else if (this._filter.status === 'locked') {
      filtered = filtered.filter(b => !b.unlocked);
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (this._sort === 'rarity') {
        return (BadgesPage.RARITY_ORDER[a.rarity] ?? 99) - (BadgesPage.RARITY_ORDER[b.rarity] ?? 99);
      }
      if (this._sort === 'name') return a.name.localeCompare(b.name);
      if (this._sort === 'status') return b.unlocked - a.unlocked;
      return 0;
    });

    if (filtered.length === 0) {
      return '<div class="empty-state">Nenhum badge encontrado com esses filtros.</div>';
    }

    return filtered.map(b => `
      <article class="badge-gallery-item ${b.unlocked ? 'badge--unlocked' : 'badge--locked'}"
        data-badge-id="${b.id}"
        role="button"
        tabindex="0"
        aria-label="${b.name}"
        style="--rarity-color: ${BadgesPage.RARITY_COLORS[b.rarity]}">

        <div class="badge-glow ${b.unlocked ? 'glow--active' : ''}"></div>
        <div class="badge-icon-wrapper">
          <span class="badge-icon-large">${b.icon}</span>
        </div>

        <div class="badge-gallery-info">
          <div class="badge-gallery-name">${b.name}</div>
          <div class="badge-rarity-label rarity--${b.rarity}">${b.rarity}</div>
          ${b.unlocked
            ? '<div class="badge-unlocked-check">✅ Desbloqueado</div>'
            : `<div class="badge-locked-hint">+${b.xpReward} XP ao desbloquear</div>`
          }
        </div>

      </article>
    `).join('');
  }

  /**
   * Anexa eventos
   * @private
   */
  _attachEvents() {
    // Filter selects
    ['filter-category', 'filter-rarity', 'filter-status', 'sort-by'].forEach(id => {
      const el = this.container.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener('change', () => {
        if (id === 'filter-category') this._filter.category = el.value;
        if (id === 'filter-rarity')   this._filter.rarity   = el.value;
        if (id === 'filter-status')   this._filter.status   = el.value;
        if (id === 'sort-by')         this._sort            = el.value;

        const gallery = this.container.querySelector('#badges-gallery');
        if (gallery) {
          gallery.innerHTML = this._renderBadges(this.gm.getAllBadges());
          this._attachBadgeClicks();
        }
      });
    });

    this._attachBadgeClicks();
  }

  _attachBadgeClicks() {
    this.container.querySelectorAll('.badge-gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        const badgeId = item.dataset.badgeId;
        const badge = GamificationEngine.BADGES_CATALOG.find(b => b.id === badgeId);
        if (badge) this._showBadgeDetail(badge, item.classList.contains('badge--unlocked'));
      });
    });
  }

  _showBadgeDetail(badge, unlocked) {
    // Remove modal existente
    document.querySelector('.badge-detail-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'badge-detail-modal modal-overlay';
    modal.innerHTML = `
      <div class="modal-card glass-card"
        style="--rarity-color: ${BadgesPage.RARITY_COLORS[badge.rarity]}">
        <button class="modal-close" aria-label="Fechar">✕</button>

        <div class="modal-badge-icon">${badge.icon}</div>
        <h2 class="modal-badge-name">${badge.name}</h2>
        <div class="modal-rarity rarity--${badge.rarity}">${badge.rarity}</div>

        <p class="modal-badge-desc">${badge.description}</p>

        <div class="modal-badge-meta">
          <div class="modal-meta-item">
            <span class="meta-label">Categoria</span>
            <span class="meta-value">${badge.category}</span>
          </div>
          <div class="modal-meta-item">
            <span class="meta-label">Recompensa</span>
            <span class="meta-value">+${badge.xpReward} XP</span>
          </div>
        </div>

        <div class="modal-status ${unlocked ? 'status--unlocked' : 'status--locked'}">
          ${unlocked ? '✅ Você desbloqueou esta conquista!' : '🔒 Continue progredindo para desbloquear'}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }
}

export { BadgesPage };
```

---

## TASK 2: CREATE /src/pages/streak-gamified-page.js

```javascript
/**
 * StreakGamifiedPage v1.0 — SupliList
 * Streak tracker gamificado: milestones, confetti, XP, badge previews
 *
 * Extensão da StreakPage (Sprint 4.4) com camada de gamificação.
 * Usa GamificationEngine para XP e badges.
 *
 * Uso:
 *   import { StreakGamifiedPage } from '../pages/streak-gamified-page.js';
 *   const page = new StreakGamifiedPage({ container, gamificationEngine, streakSystem });
 *   await page.render();
 */

class StreakGamifiedPage {

  // Milestones de streak com mensagens especiais
  static MILESTONES = [
    { days: 3,   icon: '🌱', title: 'Começando Bem!',     message: '3 dias seguidos! Você está criando o hábito.', badge: null },
    { days: 7,   icon: '🔥', title: 'Semana de Fogo!',    message: '7 dias! Seu corpo está sentindo a diferença.', badge: 'checkin-7' },
    { days: 14,  icon: '⚡', title: 'Duas Semanas!',       message: '14 dias! A consistência é sua superpotência.', badge: null },
    { days: 30,  icon: '🏅', title: 'Mês Perfeito!',      message: '30 dias! Você é um exemplo para a comunidade.', badge: 'checkin-30' },
    { days: 60,  icon: '💫', title: 'Dois Meses!',        message: '60 dias de puro compromisso. Incrível!', badge: null },
    { days: 90,  icon: '💎', title: 'Trimestre de Ferro!', message: '90 dias! Você está entre os top 5% do app.', badge: 'checkin-90' },
    { days: 180, icon: '🚀', title: 'Seis Meses!',        message: '180 dias! Uma lenda em construção.', badge: null },
    { days: 365, icon: '👑', title: 'UM ANO!',            message: '365 dias. Você é uma LENDA do SupliList!', badge: 'checkin-365' },
  ];

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {GamificationEngine} config.gamificationEngine
   * @param {Object} [config.streakSystem] - StreakSystem do Sprint 4.4
   */
  constructor({ container, gamificationEngine, streakSystem = null }) {
    this.container = container;
    this.gm = gamificationEngine;
    this.streakSystem = streakSystem;
  }

  /**
   * Renderiza a página de streak gamificado
   * @returns {Promise<void>}
   */
  async render() {
    const profile = this.gm.getProfile();
    const currentStreak = profile.currentStreak;
    const maxStreak = profile.maxStreak;
    const xpHistory = await this.gm.getXPHistory();

    const nextMilestone = StreakGamifiedPage.MILESTONES.find(m => m.days > currentStreak);
    const lastMilestone = [...StreakGamifiedPage.MILESTONES]
      .reverse()
      .find(m => m.days <= currentStreak);

    const daysToNext = nextMilestone ? nextMilestone.days - currentStreak : 0;

    this.container.innerHTML = `
      <div class="streak-gamified-page">

        <!-- STREAK HERO -->
        <section class="streak-hero bento-card glass-card">
          <div class="streak-flame-display">
            <span class="streak-flame-icon">${currentStreak >= 7 ? '🔥' : '🌱'}</span>
            <div class="streak-number">${currentStreak}</div>
            <div class="streak-label">dias seguidos</div>
          </div>

          <div class="streak-stats-row">
            <div class="streak-stat">
              <span class="streak-stat-value">${maxStreak}</span>
              <span class="streak-stat-label">Maior Streak</span>
            </div>
            <div class="streak-stat">
              <span class="streak-stat-value">${profile.totalCheckins}</span>
              <span class="streak-stat-label">Total Check-ins</span>
            </div>
            <div class="streak-stat">
              <span class="streak-stat-value">${profile.xp.toLocaleString('pt-BR')}</span>
              <span class="streak-stat-label">XP Total</span>
            </div>
          </div>

          <!-- Progress para próximo milestone -->
          ${nextMilestone ? `
            <div class="streak-milestone-progress">
              <div class="milestone-label">
                ${nextMilestone.icon} Próximo: ${nextMilestone.title} em ${daysToNext} dia${daysToNext !== 1 ? 's' : ''}
              </div>
              <div class="milestone-bar">
                <div class="milestone-fill"
                  style="width: ${Math.round(((nextMilestone.days - daysToNext) / nextMilestone.days) * 100)}%">
                </div>
              </div>
              <div class="milestone-values">
                <span>${currentStreak} dias</span>
                <span>${nextMilestone.days} dias</span>
              </div>
            </div>
          ` : '<div class="milestone-max">🏆 Você atingiu todos os milestones!</div>'}
        </section>

        <!-- MILESTONE MAIS RECENTE -->
        ${lastMilestone ? `
          <section class="last-milestone-card bento-card">
            <span class="milestone-badge-icon">${lastMilestone.icon}</span>
            <div class="milestone-info">
              <div class="milestone-title">${lastMilestone.title}</div>
              <div class="milestone-message">${lastMilestone.message}</div>
            </div>
            ${lastMilestone.badge ? `
              <div class="milestone-badge-earned">
                Badge: ${GamificationEngine.BADGES_CATALOG.find(b => b.id === lastMilestone.badge)?.name ?? ''}
              </div>
            ` : ''}
          </section>
        ` : ''}

        <!-- CHECK-IN BUTTON -->
        <section class="checkin-section">
          <button class="btn-primary btn-checkin-gamified" id="checkin-btn"
            aria-label="Fazer check-in">
            ✅ Fazer Check-in de Hoje (+${10 + Math.min(currentStreak * 5, 50)} XP)
          </button>
          <div class="checkin-hint">Faça check-in todos os dias para manter seu streak!</div>
        </section>

        <!-- MILESTONES TIMELINE -->
        <section class="milestones-timeline">
          <h3 class="section-title">📍 Jornada de Milestones</h3>
          <div class="timeline">
            ${StreakGamifiedPage.MILESTONES.map(m => {
              const reached = currentStreak >= m.days;
              return `
                <div class="timeline-item ${reached ? 'timeline-item--reached' : 'timeline-item--future'}">
                  <div class="timeline-icon">${m.icon}</div>
                  <div class="timeline-info">
                    <div class="timeline-days">${m.days} dias</div>
                    <div class="timeline-title">${m.title}</div>
                    ${m.badge ? `<div class="timeline-badge">🏅 Badge incluso</div>` : ''}
                  </div>
                  <div class="timeline-status">${reached ? '✅' : '🔒'}</div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- XP HISTORY (últimas 10 ações) -->
        <section class="xp-history-section">
          <h3 class="section-title">⚡ Histórico de XP</h3>
          <div class="xp-history-list">
            ${xpHistory.slice(-10).reverse().map(e => `
              <div class="xp-history-item">
                <span class="xp-event-type">${this._formatEventType(e.type)}</span>
                <span class="xp-event-amount">+${e.amount} XP</span>
                <span class="xp-event-time">${this._formatRelativeTime(e.createdAt)}</span>
              </div>
            `).join('') || '<div class="empty-state">Nenhuma ação de XP registrada ainda.</div>'}
          </div>
        </section>

      </div>
    `;

    this._attachEvents();
  }

  /**
   * Formata tipo de evento em português
   * @private
   */
  _formatEventType(type) {
    const labels = {
      checkin:              '✅ Check-in',
      post_created:         '💬 Post criado',
      referral_confirmed:   '🤝 Referral',
      challenge_completed:  '🏆 Desafio concluído',
      challenge_joined:     '🎯 Desafio entrou',
      purchase_affiliate:   '🛒 Compra afiliado',
      comment_added:        '💬 Comentário',
      like_given:           '❤️ Like dado',
    };
    return labels[type] ?? type;
  }

  /**
   * Formata tempo relativo
   * @private
   */
  _formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min}min atrás`;
    if (hr < 24) return `${hr}h atrás`;
    return `${day}d atrás`;
  }

  /**
   * Anexa eventos de interação
   * @private
   */
  _attachEvents() {
    const btn = this.container.querySelector('#checkin-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '⏳ Registrando...';

      try {
        // Registra check-in no StreakSystem original (se disponível)
        if (this.streakSystem) {
          await this.streakSystem.logCheckin?.();
          const newStreak = this.streakSystem.getStreak?.()?.currentStreak ?? 0;
          await this.gm.syncStreak(newStreak);
        }

        // Concede XP
        const result = await this.gm.awardXP('checkin');

        // Confetti se milestone atingido
        const newStreak = this.gm.getProfile().currentStreak;
        const isMilestone = StreakGamifiedPage.MILESTONES.some(m => m.days === newStreak);
        if (isMilestone) {
          this._triggerConfetti();
        }

        // Mostra feedback
        const toast = document.createElement('div');
        toast.className = 'xp-toast';
        toast.textContent = `+${result.xpGained} XP! ${result.newBadges.length > 0 ? `🏅 Badge desbloqueado: ${result.newBadges[0].name}` : ''}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        // Re-renderiza
        await this.render();

      } catch (err) {
        btn.disabled = false;
        btn.textContent = '✅ Fazer Check-in de Hoje';
        console.error('Check-in error:', err);
      }
    });
  }

  /**
   * Dispara animação de confetti
   * @private
   */
  _triggerConfetti() {
    if (typeof window === 'undefined') return;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 80; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${1.5 + Math.random() * 1.5}s;
        animation-delay: ${Math.random() * 0.5}s;
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      `;
      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 3500);
  }
}

export { StreakGamifiedPage };
```

---

## VALIDATION CHECKLIST — PROMPT 8.4

- [ ] `BadgesPage.render()` exibe summary de progresso (X/Y badges)
- [ ] Rarity summary chips exibem contagem correta por raridade
- [ ] Filtros (categoria, raridade, status, ordenação) funcionam em combinação
- [ ] Click em badge abre modal com detalhes e status (desbloqueado/bloqueado)
- [ ] Badges secretos (`hidden: true`) exibem "🔒 ???" até serem desbloqueados
- [ ] `StreakGamifiedPage.render()` exibe hero com streak atual
- [ ] Progress bar para próximo milestone calcula percentual corretamente
- [ ] Botão de check-in chama `gm.awardXP('checkin')` e re-renderiza
- [ ] Milestone alcançado dispara confetti (80 partículas)
- [ ] Toast XP aparece por 3 segundos com valor correto
- [ ] Badge desbloqueado no check-in aparece no toast
- [ ] Timeline de milestones marca ✅ para alcançados e 🔒 para futuros
- [ ] Histórico de XP exibe últimas 10 ações formatadas em português
- [ ] `_formatRelativeTime` exibe "Agora", "5min atrás", "2h atrás", "3d atrás"

## FILES TO DELIVER

1. `/src/pages/badges-page.js` (completo acima)
2. `/src/pages/streak-gamified-page.js` (completo acima)
```

---

## **📊 RESUMO DO SPRINT 8**

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 8.1 | `gamification-engine.js` + `achievements-page.js` | GamificationEngine (singleton) + AchievementsPage | XP, 10 níveis, 16 badges, rarity system, EventBus, IndexedDB, galeria com filtros |
| 8.2 | `challenges-engine.js` + `challenges-page.js` | ChallengesEngine + ChallengesPage | 5 desafios seed, join/progress/complete, prizes, leaderboard interno, tabs de status |
| 8.3 | `leaderboard-engine.js` + `leaderboard-page.js` | LeaderboardEngine + LeaderboardPage | Global/amigos/grupo, 4 métricas, cache 5min, fallback local, polling, posição fora do top |
| 8.4 | `badges-page.js` + `streak-gamified-page.js` | BadgesPage + StreakGamifiedPage | Galeria filtrada, rarity colors, milestones timeline, confetti, XP toast, histórico |

---

## **✅ TOTAL ACUMULADO SPRINTS 1–8**

| Categoria | O que existe |
|-----------|-------------|
| **Web Components** | 10+ reutilizáveis |
| **Pages** | 17 completas (+Achievements, Challenges, Leaderboard, Badges/Streak Gamificado) |
| **Engines** | 12 (+ GamificationEngine, ChallengesEngine, LeaderboardEngine) |
| **Gamification** | XP system, 10 níveis, 16 badges, streaks, milestones, confetti |
| **Challenges** | 5 desafios seed, sistema de progresso, prizes, leaderboard interno |
| **Leaderboards** | Global + amigos + grupos, 4 métricas, cache, polling |
| **Social Features** | Feed, Groups, Referrals, Livestreams, Challenges, Leaderboards |
| **Monetização** | Stripe, Afiliados (3 marketplaces), Premium, Tips, Prizes |

---

## **🚀 PRÓXIMO: Sprint 9 — Wearables + Health APIs + Integrações**

Sprint 9 cobre:
- **Prompt 9.1:** `WearablesEngine` — Apple Watch, Garmin, Whoop integration
- **Prompt 9.2:** `AppleHealthKitSync` — iOS HealthKit + dados de atividade
- **Prompt 9.3:** `GoogleFitSync` — Android Fit + steps + workouts
- **Prompt 9.4:** `WearablesDashboardPage` — Dashboard unificado de wearables

---

*SupliList v4.0 — Sprint 8 | 26 de maio de 2026*
*Fase 3: Community Explosion | Semanas 21–24 | Gamification + Challenges + Leaderboards*
