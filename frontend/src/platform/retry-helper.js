/**
 * retry-helper.js — Retry automático com exponential backoff
 *
 * Use para operações que podem falhar temporariamente
 * (network timeouts, rate limits, etc).
 *
 * @module platform/retry-helper
 *
 * @example
 * const data = await retryAsync(
 *   () => apiFetch('/api/supplements'),
 *   {
 *     maxAttempts: 3,
 *     delayMs: 1000,
 *     shouldRetry: (error) => error.status !== 404, // não retry 404
 *   }
 * );
 */

import { logger } from '../utils/logger.js';

/**
 * @typedef {object} RetryOptions
 * @prop {number} [maxAttempts=3]
 * @prop {number} [delayMs=1000]
 * @prop {number} [backoffMultiplier=2]
 * @prop {(error: Error) => boolean} [shouldRetry] - Função para decidir se retenta
 */

/**
 * Executar uma operação async com retry automático
 *
 * @template T
 * @param {() => Promise<T>} operation - Função assíncrona a executar
 * @param {RetryOptions} [options]
 * @returns {Promise<T>}
 * @throws {Error} Erro após todas as tentativas esgotarem
 *
 * @example
 * const profile = await retryAsync(
 *   () => apiFetch('/api/profile/me'),
 *   { maxAttempts: 3, delayMs: 500 }
 * );
 */
export async function retryAsync(operation, options = {}) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 1,
    shouldRetry = (error) => {
      // Never retry on 4xx client errors
      if (error.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry on all other errors (network, server errors, transient failures)
      return true;
    },
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Se não deve retry, lançar imediatamente
      if (!shouldRetry(error)) {
        throw error;
      }

      // Se foi última tentativa, lançar erro
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calcular delay com exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);

      logger.warn(
        `[RetryHelper] Tentativa ${attempt}/${maxAttempts} falhou. ` +
        `${error.message}. Retentando em ${delay}ms...`,
        { error: error.message, delay }
      );

      // Aguardar antes de retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Nunca deve chegar aqui, mas por segurança:
  throw lastError || new Error('Operação falhou após todas as tentativas');
}

/**
 * Versão simples: retry uma operação N vezes com delay fixo
 * Sem exponential backoff
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {number} maxAttempts
 * @param {number} delayMs
 * @returns {Promise<T>}
 */
export async function retrySimple(operation, maxAttempts = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Retry com jitter (aleatoriedade) para evitar thundering herd
 * Útil para múltiplas requisições simultâneas
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {RetryOptions} options
 * @returns {Promise<T>}
 */
export async function retryWithJitter(operation, options = {}) {
  return retryAsync(operation, options);
}

export const retryHelper = Object.freeze({
  retryAsync,
  retrySimple,
  retryWithJitter,
});
