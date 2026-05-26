/**
 * @fileoverview Safe parsers para o SupliList v2.0.
 * Converte entradas de usuário, strings e dados externos para tipos nativos de forma segura,
 * sem nunca lançar exceções para o fluxo principal da aplicação.
 */

import { UNITS } from './constants.js';
import { logger } from './logger.js';

/**
 * Converte uma string de preço em formato brasileiro ou americano para um número decimal.
 * @param {string} str - A string representando o preço (ex: "R$ 49,90", "49.90").
 * @returns {number | null} O valor numérico correspondente ou null se a conversão falhar.
 */
export function parsePrice(str) {
  if (typeof str !== 'string') return null;
  try {
    // Remove símbolos monetários, espaços e normaliza separadores decimais
    const normalized = str
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
      
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  } catch (err) {
    logger.debug('Falha ao processar preço string', { str, error: err.message });
    return null;
  }
}

/**
 * Converte uma string de dosagem física em um objeto contendo valor numérico e unidade de medida.
 * @param {string} str - A string com a dosagem (ex: "5g", "500 mg", "2000UI").
 * @returns {{ value: number, unit: string } | null} Objeto da dose ou null se a string for inválida.
 */
export function parseDose(str) {
  if (typeof str !== 'string') return null;
  try {
    // Regex para capturar números decimais opcionais seguidos por letras da unidade
    const match = str.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    if (isNaN(value) || !UNITS.includes(unit)) {
      return null;
    }
    
    return { value, unit };
  } catch (err) {
    logger.debug('Falha ao processar dose string', { str, error: err.message });
    return null;
  }
}

/**
 * Converte de forma segura uma string para um objeto Date nativo.
 * @param {string} str - A string da data (ex: "2026-05-23").
 * @returns {Date | null} Objeto Date correspondente ou null se for inválido.
 */
export function parseDate(str) {
  if (typeof str !== 'string') return null;
  try {
    const timestamp = Date.parse(str);
    return isNaN(timestamp) ? null : new Date(timestamp);
  } catch (err) {
    logger.debug('Falha ao processar data string', { str, error: err.message });
    return null;
  }
}

/**
 * Executa o parse de JSON de forma segura, capturando internamente qualquer exceção de sintaxe.
 * @param {string} str - String contendo dados serializados em JSON.
 * @returns {any | null} O objeto javascript parseado ou null caso a string seja inválida.
 */
export function parseJSON(str) {
  if (typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch (err) {
    logger.warn('Falha na conversão de string JSON para objeto', { error: err.message });
    return null;
  }
}

/**
 * Normaliza um nome de produto removendo espaços duplos e aplicando capitalização padrão.
 * @param {string} str - O nome do produto bruto.
 * @returns {string} O nome normalizado e limpo, ou string vazia se inválido.
 */
export function normalizeName(str) {
  if (typeof str !== 'string') return '';
  const cleaned = str.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0) return '';
  
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
