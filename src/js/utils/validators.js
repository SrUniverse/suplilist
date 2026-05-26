/**
 * @fileoverview Funções puras de validação de dados para o SupliList v2.0.
 * Todas as funções retornam exclusivamente valores booleanos e não produzem efeitos colaterais.
 */

/**
 * Verifica se uma string está no formato slug (apenas letras minúsculas, números e hífens).
 * @param {string} str - A string a ser validada.
 * @returns {boolean} True se for um slug válido, false caso contrário.
 */
export function isValidSlug(str) {
  if (typeof str !== 'string') return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

/**
 * Verifica se um valor é um número estritamente positivo (maior que zero).
 * @param {any} n - O valor a ser verificado.
 * @returns {boolean} True se for um número maior que zero, false caso contrário.
 */
export function isPositive(n) {
  return typeof n === 'number' && !isNaN(n) && n > 0;
}

/**
 * Verifica se um valor é um número não negativo (maior ou igual a zero).
 * @param {any} n - O valor a ser verificado.
 * @returns {boolean} True se for um número maior ou igual a zero, false caso contrário.
 */
export function isNonNegative(n) {
  return typeof n === 'number' && !isNaN(n) && n >= 0;
}

/**
 * Verifica se todos os elementos em um array são únicos.
 * @param {any[]} arr - O array a ser verificado.
 * @returns {boolean} True se todos os itens forem únicos, false caso contrário.
 */
export function isUnique(arr) {
  if (!Array.isArray(arr)) return false;
  return new Set(arr).size === arr.length;
}

/**
 * Verifica se um email possui formato sintático básico válido.
 * @param {string} email - O endereço de email a ser validado.
 * @returns {boolean} True se o formato for válido, false caso contrário.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Verifica se uma URL é válida tentando instanciar o objeto URL global.
 * @param {string} url - A URL a ser testada.
 * @returns {boolean} True se a URL for válida, false caso contrário.
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se uma data string está no formato YYYY-MM-DD e se corresponde a um dia de calendário real.
 * @param {string} str - A string de data a ser validada.
 * @returns {boolean} True se for uma data de calendário real no formato correto, false caso contrário.
 */
export function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return false;
  }
  
  const timestamp = Date.parse(str);
  if (isNaN(timestamp)) return false;

  // Garante que dias inexistentes (ex: 2026-02-30) não sejam aceitos pelo parser de data automático
  const date = new Date(str);
  const [year, month, day] = str.split('-').map(Number);
  
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}
