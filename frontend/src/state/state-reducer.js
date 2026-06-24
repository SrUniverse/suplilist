// ============================================================
// StateManager — Reducer puro
// Extraído de state-manager.js. Recebe (state, action) e devolve
// um novo estado imutável. Sem efeitos colaterais.
// ============================================================

import { logger } from '../utils/logger.js';
import { todayISO } from '../utils/date.js';
import { getSupplementId } from '../utils/stack.js';
import { ACTIONS, DEFAULT_STATE } from './state-constants.js';

/**
 * Pure reducer function that handles all state transitions
 * Redux-inspired: takes current state + action, returns new immutable state
 * @param {import('./state-constants.js').AppState} state - Current application state
 * @param {{type: string, payload?: *}} action - Action object with type and optional payload
 * @returns {import('./state-constants.js').AppState} New state after applying the action
 */
export function reducer(state, action) {
  if (!action) return state;

  switch (action.type) {
    case ACTIONS.SET_USER_PROFILE: {
      // P1: whitelist explícita — impede sobrescrita de tier/onboardingComplete via payload livre
      const ALLOWED_PROFILE_KEYS = [
        'name', 'email', 'weight', 'biologicalSex', 'height', 'age',
        'trainingFrequency', 'trainingAge', 'objective',
        'restrictions', 'budget',
      ];
      // Filtra: apenas chaves whitelisted E com valor !== undefined
      // (undefined não deve sobrescrever valores existentes no estado)
      const sanitized = Object.fromEntries(
        Object.entries(action.payload ?? {})
          .filter(([k, v]) => ALLOWED_PROFILE_KEYS.includes(k) && v !== undefined)
      );

      // PATCH 2: Validate types — campos inválidos são removidos do sanitized
      // para que o state.user original (que pode ter null ou valor válido) seja mantido
      if (sanitized.weight !== undefined && (typeof sanitized.weight !== 'number' || sanitized.weight <= 0)) {
        logger.warn('[StateManager] Invalid weight:', sanitized.weight);
        delete sanitized.weight;
      }
      if (sanitized.biologicalSex !== undefined && sanitized.biologicalSex !== null && !['male', 'female'].includes(sanitized.biologicalSex)) {
        logger.warn('[StateManager] Invalid biologicalSex:', sanitized.biologicalSex);
        delete sanitized.biologicalSex;
      }
      if (sanitized.age !== undefined && (typeof sanitized.age !== 'number' || sanitized.age < 0)) {
        logger.warn('[StateManager] Invalid age:', sanitized.age);
        delete sanitized.age;
      }
      if (sanitized.budget !== undefined && (typeof sanitized.budget !== 'number' || sanitized.budget < 0)) {
        logger.warn('[StateManager] Invalid budget:', sanitized.budget);
        delete sanitized.budget;
      }
      if (sanitized.objective !== undefined) {
        const validObjectives = ['bulk', 'cut', 'strength', 'endurance', 'general'];
        if (!validObjectives.includes(sanitized.objective)) {
          logger.warn('[StateManager] Invalid objective:', sanitized.objective);
          delete sanitized.objective;
        }
      }

      return {
        ...state,
        user: { ...state.user, ...sanitized }
      };
    }

    case ACTIONS.COMPLETE_ONBOARDING:
      return {
        ...state,
        user: {
          ...state.user,
          onboardingComplete: true
        }
      };

    case ACTIONS.UPDATE_PROFILE: {
      // Update user profile with new data
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      };
    }

    case ACTIONS.UPDATE_PHOTO: {
      // Update just the photo field
      return {
        ...state,
        user: {
          ...state.user,
          photo: action.payload
        }
      };
    }

    case ACTIONS.DELETE_PHOTO: {
      // Remove photo
      return {
        ...state,
        user: {
          ...state.user,
          photo: null
        }
      };
    }

    case ACTIONS.ADD_TO_STACK: {
      // PATCH 3: Validate payload structure
      if (!action.payload || typeof action.payload !== 'object') {
        logger.warn('[StateManager] ADD_TO_STACK requires valid payload object');
        return state;
      }

      const finalId = getSupplementId(action.payload);

      if (!finalId || typeof finalId !== 'string' || finalId.trim() === '') {
        logger.warn('[StateManager] ADD_TO_STACK requires an id or supplementId');
        return state;
      }

      // Prevent duplicates — getSupplementId resolves supplementId ?? id on both sides.
      const exists = state.stack.some(item => getSupplementId(item) === finalId);
      if (exists) return state;

      return {
        ...state,
        stack: [...state.stack, { ...action.payload, id: finalId, supplementId: finalId }]
      };
    }

    case ACTIONS.REMOVE_FROM_STACK: {
      const idToRemove = getSupplementId(action.payload);
      return {
        ...state,
        stack: state.stack.filter(item => getSupplementId(item) !== idToRemove)
      };
    }

    case ACTIONS.RESTORE_STACK_ITEM_AT_INDEX: {
      const { item, index } = action.payload;
      if (!item) return state;
      const newStack = [...state.stack];
      // Prevent duplicates if network revived late
      const exists = newStack.some(i => getSupplementId(i) === getSupplementId(item));
      if (!exists) {
        newStack.splice(index, 0, item);
      }
      return {
        ...state,
        stack: newStack
      };
    }

    case ACTIONS.CLEAR_STACK:
      return {
        ...state,
        stack: []
      };

    case ACTIONS.IMPORT_STACK:
      return {
        ...state,
        stack: (action.payload || []).map(item => {
          const normId = getSupplementId(item);
          return { ...item, id: normId, supplementId: normId };
        })
      };

    case ACTIONS.CLEAR_CHECKINS:
      return {
        ...state,
        checkins: []
      };

    case ACTIONS.ADD_CHECKIN: {
      // P9: ID com entropia combinada (timestamp + random) evita colisões em sessões de alta frequência
      const checkin = {
        id: action.payload.id ||
          `chk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp:    action.payload.timestamp || Date.now(),
        supplementId: action.payload.supplementId,
        date:         action.payload.date || todayISO(),
        // P9: limite de 500 chars na nota para evitar payload gigante no localStorage
        note: (action.payload.note || '').substring(0, 500),
      };
      return {
        ...state,
        checkins: [...state.checkins, checkin]
      };
    }

    case ACTIONS.SET_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: {
          items: action.payload.items || [],
          generatedAt: Date.now(),
          profileHash: action.payload.profileHash || null
        }
      };

    case ACTIONS.INVALIDATE_RECOMMENDATIONS:
      return {
        ...state,
        recommendations: {
          items: [],
          generatedAt: null,
          profileHash: null
        }
      };

    case ACTIONS.SET_TIER: {
      if (action.payload == null) return state;
      const VALID_TIERS = ['free', 'pro', 'elite'];
      const tier = VALID_TIERS.includes(action.payload?.tier)
        ? action.payload.tier
        : state.user.tier;
      if (tier === state.user.tier) return state;
      return { ...state, user: { ...state.user, tier } };
    }

    case ACTIONS.SET_ROUTE:
      return {
        ...state,
        ui: {
          ...state.ui,
          currentRoute: action.payload.route
        }
      };

    case ACTIONS.SHOW_TOAST:
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: {
            message: action.payload.message,
            type: action.payload.type || 'info',
            duration: action.payload.duration ?? 3000
          }
        }
      };

    case ACTIONS.SET_OFFLINE_MODE:
      return {
        ...state,
        ui: {
          ...state.ui,
          isOffline: action.payload?.isOffline ?? false
        }
      };

    case ACTIONS.ADD_FAVORITE:
      if (state.favorites.includes(action.payload.supplementId)) return state;
      return {
        ...state,
        favorites: [...state.favorites, action.payload.supplementId]
      };

    case ACTIONS.REMOVE_FAVORITE:
      return {
        ...state,
        favorites: state.favorites.filter(id => id !== action.payload.supplementId)
      };

    case ACTIONS.SET_FAVORITES:
      return {
        ...state,
        favorites: action.payload
      };

    case ACTIONS.SET_THEME:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          theme: action.payload.theme
        }
      };

    case ACTIONS.PRUNE_CHECKINS_TEST:
      return {
        ...state,
        checkins: action.payload
      };

    case ACTIONS.UPDATE_STACK_ITEM: {
      const itemId = getSupplementId(action.payload);
      return {
        ...state,
        stack: state.stack.map(item =>
          getSupplementId(item) === itemId
            ? { ...item, ...action.payload, dosage: { ...(item.dosage ?? {}), ...(action.payload.dosage ?? {}) }, supplementId: itemId }
            : item
        )
      };
    }

    case ACTIONS.SET_STACK_QUANTITY: {
      const itemId = getSupplementId(action.payload);
      return {
        ...state,
        stack: state.stack.map(item =>
          getSupplementId(item) === itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    }

    // ── Identity ─────────────────────────────────────────────────────────────
    // Payload is the merged result of JWT claims + GET /api/profile/me.
    // accessToken is intentionally absent — it lives in api-client's closure.
    // displayName/avatarUrl come from the profile fetch inside login().
    case ACTIONS.AUTH_LOGIN: {
      const {
        id, email, role, isMfaEnabled, emailVerified,
        displayName, avatarUrl, avatarStatus, tier,
      } = action.payload;
      const VALID_TIERS = ['free', 'pro', 'elite'];
      return {
        ...state,
        user: {
          ...state.user,
          id: id ?? state.user.id,
          email: email ?? state.user.email,
          name: displayName ?? state.user.name,
          role: role ?? state.user.role,
          isMfaEnabled: isMfaEnabled ?? false,
          emailVerified: emailVerified ?? false,
          isAuthenticated: true,
          avatarUrl: avatarUrl ?? state.user.avatarUrl ?? null,
          avatarStatus: avatarStatus ?? state.user.avatarStatus ?? 'none',
          tier: VALID_TIERS.includes(tier) ? tier : state.user.tier,
        },
      };
    }

    case ACTIONS.AUTH_LOGOUT:
      return {
        ...DEFAULT_STATE,
        // Manter apenas preferências de UI (tema, idioma) — dados do usuário apagados
        preferences: state.preferences,
        ui: state.ui,
      };

    case ACTIONS.SET_OWNER_ID:
      return {
        ...state,
        _ownerId: action.payload,
      };

    default:
      return state;
  }
}
