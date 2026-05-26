/**
 * @fileoverview Validador de schema para a árvore completa de estado (AppState) do SupliList v2.0.
 * Assegura a integridade estrutural e de tipos de todo o estado mantido em memória e persistido.
 */

import { SORT_OPTIONS } from '../utils/constants.js';
import { isValidSlug, isNonNegative, isValidDate } from '../utils/validators.js';
import { SupplementSchema } from './supplement.schema.js';

/**
 * Estado padrão de fallback da aplicação usado em caso de corrupção ou dados inválidos.
 * @type {AppState}
 */
export const DEFAULT_STATE = Object.freeze({
  supplements: {},
  favorites: [],
  inventory: {},
  settings: {
    theme: 'dark',
    sortBy: 'cost',
    units: 'metric',
    notificationsEnabled: true,
  },
  lastQuery: null,
});

/**
 * Representação da árvore completa do estado global da aplicação.
 * @typedef {Object} AppState
 * @property {Record<string, import('./supplement.schema.js').Supplement>} supplements - Coleção de suplementos.
 * @property {string[]} favorites - Lista de IDs de suplementos favoritados.
 * @property {Record<string, { qty: number, purchaseDate: string }>} inventory - Estoque indexado por ID de suplemento.
 * @property {{ theme: 'dark'|'light', sortBy: string, units: 'metric'|'imperial', notificationsEnabled: boolean }} settings - Preferências de usuário.
 * @property {{ text: string, results: string[], timestamp: number } | null} lastQuery - Cache de última busca efetuada.
 */

export class AppStateSchema {
  /**
   * Valida a integridade e estrutura de todo o estado da aplicação.
   * Em caso de invalidez estrutural, retorna o estado default (DEFAULT_STATE) de fallback seguro.
   * @param {any} data - O estado bruto a ser analisado.
   * @returns {{ isValid: boolean, errors: string[], data: AppState }} Resultado da validação estrutural.
   */
  static validate(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['O estado raiz da aplicação deve ser um objeto.'],
        data: JSON.parse(JSON.stringify(DEFAULT_STATE)),
      };
    }

    // 1. Validando supplements (Record<string, Supplement>)
    if (!data.supplements || typeof data.supplements !== 'object' || Array.isArray(data.supplements)) {
      errors.push('supplements: deve ser um dicionário/objeto.');
    } else {
      Object.entries(data.supplements).forEach(([key, supp]) => {
        if (!isValidSlug(key)) {
          errors.push(`supplements: chave de identificação "${key}" deve ser um slug válido.`);
        }
        const suppValidation = SupplementSchema.validate(supp);
        if (!suppValidation.isValid) {
          suppValidation.errors.forEach((err) => {
            errors.push(`supplements["${key}"].${err}`);
          });
        }
      });
    }

    // 2. Validando favorites (string[])
    if (!Array.isArray(data.favorites)) {
      errors.push('favorites: deve ser uma lista de strings.');
    } else {
      data.favorites.forEach((fav, idx) => {
        if (typeof fav !== 'string' || !isValidSlug(fav)) {
          errors.push(`favorites[${idx}]: valor "${fav}" deve ser uma string com formato slug.`);
        }
      });
    }

    // 3. Validando inventory (Record<string, { qty: number, purchaseDate: string }>)
    if (!data.inventory || typeof data.inventory !== 'object' || Array.isArray(data.inventory)) {
      errors.push('inventory: deve ser um objeto mapeado.');
    } else {
      Object.entries(data.inventory).forEach(([key, invItem]) => {
        if (!isValidSlug(key)) {
          errors.push(`inventory: chave "${key}" deve ser um slug válido.`);
        }
        if (!invItem || typeof invItem !== 'object') {
          errors.push(`inventory["${key}"]: deve ser um objeto com qty e purchaseDate.`);
        } else {
          if (typeof invItem.qty !== 'number' || !isNonNegative(invItem.qty)) {
            errors.push(`inventory["${key}"].qty: deve ser um número maior ou igual a zero.`);
          }
          if (typeof invItem.purchaseDate !== 'string' || !isValidDate(invItem.purchaseDate)) {
            errors.push(`inventory["${key}"].purchaseDate: deve ser uma data válida no formato YYYY-MM-DD.`);
          }
        }
      });
    }

    // 4. Validando settings ({ theme, sortBy, units, notificationsEnabled })
    if (!data.settings || typeof data.settings !== 'object') {
      errors.push('settings: deve ser um objeto válido.');
    } else {
      const { theme, sortBy, units, notificationsEnabled } = data.settings;
      if (theme !== 'dark' && theme !== 'light') {
        errors.push('settings.theme: deve ser "dark" ou "light".');
      }
      if (!SORT_OPTIONS.includes(sortBy)) {
        errors.push(`settings.sortBy: deve ser um dos valores: ${SORT_OPTIONS.join(', ')}.`);
      }
      if (units !== 'metric' && units !== 'imperial') {
        errors.push('settings.units: deve ser "metric" ou "imperial".');
      }
      if (typeof notificationsEnabled !== 'boolean') {
        errors.push('settings.notificationsEnabled: deve ser um booleano.');
      }
    }

    // 5. Validando lastQuery ({ text, results, timestamp } | null)
    if (data.lastQuery !== null) {
      if (typeof data.lastQuery !== 'object') {
        errors.push('lastQuery: deve ser um objeto ou nulo.');
      } else {
        const { text, results, timestamp } = data.lastQuery;
        if (typeof text !== 'string') {
          errors.push('lastQuery.text: deve ser uma string.');
        }
        if (!Array.isArray(results)) {
          errors.push('lastQuery.results: deve ser uma lista de strings.');
        } else {
          results.forEach((res, idx) => {
            if (typeof res !== 'string' || !isValidSlug(res)) {
              errors.push(`lastQuery.results[${idx}]: deve conter um slug válido.`);
            }
          });
        }
        if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
          errors.push('lastQuery.timestamp: deve ser um número Unix timestamp positivo.');
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      data: isValid ? data : JSON.parse(JSON.stringify(DEFAULT_STATE)),
    };
  }
}
