/**
 * @fileoverview Validador de schema de suplemento para o SupliList v2.0.
 * Valida a integridade, tipos e enums de cada objeto do tipo Supplement.
 */

import { CATEGORIES, GOALS, UNITS, EVIDENCE_LEVELS, MARKETPLACES } from '../utils/constants.js';
import { isValidSlug, isPositive } from '../utils/validators.js';

/**
 * Representa os dados normalizados de um suplemento.
 * @typedef {Object} Supplement
 * @property {string} id - Identificador slug único em caixa baixa (ex: "creatina-mono").
 * @property {string} name - Nome comercial legível do suplemento.
 * @property {string} category - Categoria do suplemento de acordo com constants.js.
 * @property {'A' | 'B' | 'C'} evidenceLevel - Nível de evidência científica de eficácia.
 * @property {string} mechanism - Descrição resumida do mecanismo de ação (mínimo 10 caracteres).
 * @property {number} defaultDose - Valor numérico recomendado para a dose diária.
 * @property {string} unit - Unidade de medida associada à dose.
 * @property {string[]} goals - Lista contendo ao menos um objetivo válido.
 * @property {Record<string, number>} prices - Dicionário de preços em marketplaces indexados.
 * @property {number} costPerDose - Preço financeiro calculado por dose administrada.
 * @property {string} image - Caminho absoluto ou relativo para a imagem do suplemento.
 * @property {any[]} [interactions] - Lista de regras de interação medicamentosa conhecidas.
 * @property {string[]} [contraindications] - Lista de contraindicações formais.
 * @property {string} [notes] - Observações clínicas adicionais.
 */

export class SupplementSchema {
  /**
   * Valida e normaliza a estrutura de um suplemento individual.
   * @param {any} data - Dados brutos do suplemento recebidos de entrada.
   * @returns {{ isValid: boolean, errors: string[], data: Supplement | null }} Resultado da validação.
   */
  static validate(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['O suplemento deve ser um objeto válido.'],
        data: null,
      };
    }

    // 1. id (obrigatório, slug format)
    if (typeof data.id !== 'string') {
      errors.push('id: deve ser uma string.');
    } else {
      const normalizedId = data.id.toLowerCase().trim();
      if (!isValidSlug(normalizedId)) {
        errors.push('id: formato de slug inválido (deve conter apenas minúsculas e hífens).');
      }
    }

    // 2. name (obrigatório, string não vazia)
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('name: é obrigatório e deve ser uma string não-vazia.');
    }

    // 3. category (obrigatório, enum CATEGORIES)
    if (!data.category || !CATEGORIES.includes(data.category)) {
      errors.push(`category: deve ser um dos valores: ${CATEGORIES.join(', ')}.`);
    }

    // 4. evidenceLevel (obrigatório, enum EVIDENCE_LEVELS)
    if (!data.evidenceLevel || !EVIDENCE_LEVELS.includes(data.evidenceLevel)) {
      errors.push(`evidenceLevel: deve ser um dos valores: ${EVIDENCE_LEVELS.join(', ')}.`);
    }

    // 5. mechanism (obrigatório, string mínimo 10 caracteres)
    if (typeof data.mechanism !== 'string' || data.mechanism.trim().length < 10) {
      errors.push('mechanism: é obrigatório e deve conter ao menos 10 caracteres.');
    }

    // 6. defaultDose (obrigatório, número estritamente positivo)
    if (typeof data.defaultDose !== 'number' || !isPositive(data.defaultDose)) {
      errors.push('defaultDose: deve ser um número estritamente maior que zero.');
    }

    // 7. unit (obrigatório, enum UNITS)
    if (!data.unit || !UNITS.includes(data.unit)) {
      errors.push(`unit: deve ser um dos valores: ${UNITS.join(', ')}.`);
    }

    // 8. goals (obrigatório, array contendo pelo menos 1 objetivo válido)
    if (!Array.isArray(data.goals) || data.goals.length === 0) {
      errors.push('goals: deve ser um array não-vazio.');
    } else {
      data.goals.forEach((goal, idx) => {
        if (!GOALS.includes(goal)) {
          errors.push(`goals[${idx}]: "${goal}" não é um objetivo válido em constants.js.`);
        }
      });
    }

    // 9. prices (obrigatório, objeto contendo pelo menos 1 marketplace com preço positivo)
    if (!data.prices || typeof data.prices !== 'object' || Array.isArray(data.prices)) {
      errors.push('prices: deve ser um objeto válido.');
    } else {
      const keys = Object.keys(data.prices);
      if (keys.length === 0) {
        errors.push('prices: deve conter ao menos um marketplace com preço definido.');
      } else {
        keys.forEach((key) => {
          if (!MARKETPLACES.includes(key)) {
            errors.push(`prices: marketplace "${key}" é inválido.`);
          }
          if (typeof data.prices[key] !== 'number' || !isPositive(data.prices[key])) {
            errors.push(`prices.${key}: o preço deve ser um número estritamente positivo.`);
          }
        });
      }
    }

    // 10. costPerDose (obrigatório, número estritamente positivo)
    if (typeof data.costPerDose !== 'number' || !isPositive(data.costPerDose)) {
      errors.push('costPerDose: deve ser um número estritamente positivo.');
    }

    // 11. image (obrigatório, string representativa do caminho)
    if (typeof data.image !== 'string' || data.image.trim().length === 0) {
      errors.push('image: deve ser uma string com o caminho da imagem.');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      data: isValid ? this._normalize(data) : null,
    };
  }

  /**
   * Normaliza e congela os dados do suplemento após validação bem-sucedida.
   * @private
   * @param {any} data - Dados validados.
   * @returns {Supplement} Dados limpos e normalizados do suplemento.
   */
  static _normalize(data) {
    const supplement = {
      id: data.id.toLowerCase().trim(),
      name: data.name.trim(),
      category: data.category,
      evidenceLevel: data.evidenceLevel,
      mechanism: data.mechanism.trim(),
      defaultDose: Number(data.defaultDose),
      unit: data.unit,
      goals: data.goals.map((g) => g.trim()),
      prices: Object.fromEntries(
        Object.entries(data.prices).map(([k, v]) => [k.trim(), Number(v)])
      ),
      costPerDose: Number(data.costPerDose),
      image: data.image.trim(),
    };

    if (Array.isArray(data.interactions)) {
      supplement.interactions = data.interactions;
    }
    if (Array.isArray(data.contraindications)) {
      supplement.contraindications = data.contraindications.map((c) => c.trim());
    }
    if (typeof data.notes === 'string') {
      supplement.notes = data.notes.trim();
    }

    return Object.freeze(supplement);
  }
}
