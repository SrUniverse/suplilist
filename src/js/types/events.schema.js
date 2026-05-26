/**
 * @fileoverview Definições de contratos de eventos e validação de schemas de payloads do EventBus.
 * Garante que a comunicação no barramento de eventos permaneça fortemente tipada.
 */

import { TOAST_TYPES, MARKETPLACES } from '../utils/constants.js';
import { isValidSlug } from '../utils/validators.js';

/**
 * Dicionário canônico contendo todos os tipos de eventos suportados pelo sistema.
 * @enum {string}
 */
export const EVENT_TYPES = {
  STATE_CHANGED: 'state:changed',
  STATE_IMPORTED: 'state:imported',
  SUPPLEMENTS_LOADED: 'supplements:loaded',
  SUPPLEMENTS_FILTERED: 'supplements:filtered',
  SUPPLEMENT_CHANGED: 'supplement:changed',
  SUPPLEMENT_DETAIL_OPEN: 'supplement:detail:open',
  FAVORITE_TOGGLED: 'favorite:toggled',
  FAVORITES_UPDATED: 'favorites:updated',
  INVENTORY_UPDATED: 'inventory:updated',
  INVENTORY_URGENT: 'inventory:urgent',
  TOAST_SHOW: 'toast:show',
  TOAST_DISMISS: 'toast:dismiss',
  COMPARATOR_OPEN: 'comparator:open',
  CHECKOUT_INITIATED: 'checkout:initiated',
  COMPONENT_ERROR: 'component:error',
  ERROR_SYSTEM: 'error:system',
  ERROR_PERSISTENCE: 'error:persistence',
  SETTINGS_CHANGED: 'settings:changed'
};

/**
 * Validador interno de payload por tipo de evento.
 * @private
 * @type {Record<string, (payload: any) => { isValid: boolean, error?: string }> }
 */
const schemas = {
  [EVENT_TYPES.STATE_CHANGED]: (p) => {
    if (!p || typeof p.path !== 'string' || p.value === undefined || typeof p.fullState !== 'object') {
      return { isValid: false, error: 'Deve conter path (string), value (any) e fullState (object).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.STATE_IMPORTED]: (p) => {
    if (!p || typeof p.state !== 'object') {
      return { isValid: false, error: 'Deve conter state (object).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.SUPPLEMENTS_LOADED]: (p) => {
    if (!p || typeof p.supplements !== 'object' || typeof p.count !== 'number') {
      return { isValid: false, error: 'Deve conter supplements (object/array) e count (number).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.SUPPLEMENTS_FILTERED]: (p) => {
    if (
      !p ||
      typeof p.query !== 'string' ||
      typeof p.filters !== 'object' ||
      !Array.isArray(p.results) ||
      typeof p.count !== 'number'
    ) {
      return { isValid: false, error: 'Deve conter query (string), filters (object), results (array de suplementos/IDs) e count (number).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.SUPPLEMENT_CHANGED]: (p) => {
    if (!p || typeof p.id !== 'string' || typeof p.supplement !== 'object') {
      return { isValid: false, error: 'Deve conter id (string) e supplement (object).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.SUPPLEMENT_DETAIL_OPEN]: (p) => {
    if (!p || typeof p.supplementId !== 'string') {
      return { isValid: false, error: 'Deve conter supplementId (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.FAVORITE_TOGGLED]: (p) => {
    if (!p || typeof p.supplementId !== 'string' || typeof p.isFavorite !== 'boolean') {
      return { isValid: false, error: 'Deve conter supplementId (string) e isFavorite (boolean).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.FAVORITES_UPDATED]: (p) => {
    if (!p || !Array.isArray(p.favorites)) {
      return { isValid: false, error: 'Deve conter favorites (array).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.INVENTORY_UPDATED]: (p) => {
    if (
      !p ||
      typeof p.supplementId !== 'string' ||
      typeof p.qty !== 'number' ||
      typeof p.purchaseDate !== 'string'
    ) {
      return { isValid: false, error: 'Deve conter supplementId (string), qty (number) e purchaseDate (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.INVENTORY_URGENT]: (p) => {
    if (!p || !Array.isArray(p.supplements)) {
      return { isValid: false, error: 'Deve conter supplements (array).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.TOAST_SHOW]: (p) => {
    if (
      !p ||
      typeof p.message !== 'string' ||
      !TOAST_TYPES.includes(p.type) ||
      typeof p.duration !== 'number' ||
      typeof p.id !== 'string'
    ) {
      return { isValid: false, error: `Deve conter message (string), type (${TOAST_TYPES.join('|')}), duration (number) e id (string).` };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.TOAST_DISMISS]: (p) => {
    if (!p || typeof p.id !== 'string') {
      return { isValid: false, error: 'Deve conter id (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.COMPARATOR_OPEN]: (p) => {
    if (!p || !Array.isArray(p.supplementIds)) {
      return { isValid: false, error: 'Deve conter supplementIds (array).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.CHECKOUT_INITIATED]: (p) => {
    if (!p || typeof p.supplementId !== 'string' || !MARKETPLACES.includes(p.marketplace)) {
      return { isValid: false, error: `Deve conter supplementId (string) e marketplace (${MARKETPLACES.join('|')}).` };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.COMPONENT_ERROR]: (p) => {
    if (!p || typeof p.componentName !== 'string' || typeof p.error !== 'string') {
      return { isValid: false, error: 'Deve conter componentName (string) e error (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.ERROR_SYSTEM]: (p) => {
    if (!p || typeof p.originalEvent !== 'string' || typeof p.error !== 'string') {
      return { isValid: false, error: 'Deve conter originalEvent (string) e error (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.ERROR_PERSISTENCE]: (p) => {
    if (!p || typeof p.error !== 'string') {
      return { isValid: false, error: 'Deve conter error (string).' };
    }
    return { isValid: true };
  },
  [EVENT_TYPES.SETTINGS_CHANGED]: (p) => {
    if (!p || typeof p.settings !== 'object') {
      return { isValid: false, error: 'Deve conter settings (object).' };
    }
    return { isValid: true };
  }
};

/**
 * Valida o payload de um evento contra a especificação rígida do sistema.
 * Lança um erro fatal de contrato caso o payload seja inválido.
 * @param {string} eventType - O tipo de evento a ser validado.
 * @param {any} payload - Os dados repassados ao evento.
 * @returns {void}
 * @throws {Error} Lança exceção de violação de contrato se a validação falhar.
 */
export function validateEventSchema(eventType, payload) {
  const allowedEvents = Object.values(EVENT_TYPES);
  if (!allowedEvents.includes(eventType)) {
    throw new Error(`Contrato de Eventos Violado: O evento "${eventType}" não está registrado em events.schema.js.`);
  }

  const check = schemas[eventType];
  if (check) {
    const result = check(payload);
    if (!result.isValid) {
      throw new Error(`Contrato de Eventos Violado no evento "${eventType}": ${result.error}`);
    }
  }
}
