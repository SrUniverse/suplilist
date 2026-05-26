/**
 * @fileoverview Funções puras de formatação de dados para o SupliList v2.0.
 * Fornece métodos consistentes para renderização visual de moedas, dosagens, datas e tempos relativos.
 */

import { INVENTORY_URGENT_DAYS } from './constants.js';

/**
 * Formata um valor numérico para a moeda brasileira (BRL).
 * @param {number} value - O valor a ser formatado.
 * @returns {string} String formatada: ex: "R$ 49,90".
 */
export function formatPrice(value) {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
  
  // Normaliza espaços em branco (incluindo non-breaking spaces gerados pelo Intl)
  return formatted.replace(/\s+/g, ' ').trim();
}

/**
 * Formata uma dose com sua unidade física correspondente, sem espaços.
 * @param {number} dose - Quantidade da dose.
 * @param {string} unit - Unidade de medida (g, mg, mcg, UI, ml).
 * @returns {string} Dose formatada: ex: "5g", "500mg".
 */
export function formatDose(dose, unit) {
  const safeDose = typeof dose === 'number' ? dose : 0;
  const safeUnit = typeof unit === 'string' ? unit.trim() : '';
  return `${safeDose}${safeUnit}`;
}

/**
 * Converte uma data string (formato ISO YYYY-MM-DD ou data padrão) no formato brasileiro (DD/MM/YYYY).
 * @param {string | Date} dateStr - A data a ser formatada.
 * @returns {string} Data formatada: ex: "23/05/2026".
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr;
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Formata a diferença temporal de forma relativa em português ("há X dias", "há Y horas").
 * @param {Date | string | number} date - A data de referência a ser comparada com o momento atual.
 * @returns {string} Tempo relativo formatado.
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const timestamp = typeof date === 'string' || typeof date === 'number'
    ? new Date(date).getTime()
    : date.getTime();
    
  if (isNaN(timestamp)) return '';
  
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'agora mesmo';
  }
  if (diffMins < 60) {
    return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  }
  return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
}

/**
 * Capitaliza a primeira letra de uma string e transforma o restante em minúsculas.
 * @param {string} str - A string a ser capitalizada.
 * @returns {string} String formatada com a primeira letra maiúscula.
 */
export function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Trunca uma string adicionando reticências se ultrapassar o tamanho máximo estabelecido.
 * @param {string} str - A string a ser truncada.
 * @param {number} maxLen - O limite máximo de caracteres permitidos.
 * @returns {string} A string truncada com "..." se ultrapassado o limite, ou original.
 */
export function truncate(str, maxLen) {
  if (typeof str !== 'string') return '';
  if (typeof maxLen !== 'number' || maxLen <= 0 || str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen).trim() + '...';
}

/**
 * Formata visualmente os dias restantes em estoque de um item do inventário.
 * @param {number} days - Quantidade de dias restantes calculada.
 * @returns {string} String com status e emoji adequado: "20 dias", "⚠️ 5 dias", "❌ Esgotado".
 */
export function formatDaysLeft(days) {
  if (typeof days !== 'number' || isNaN(days) || days <= 0) {
    return '❌ Esgotado';
  }
  
  const roundedDays = Math.ceil(days);
  const pluralSuffix = roundedDays > 1 ? 's' : '';
  
  if (roundedDays <= INVENTORY_URGENT_DAYS) {
    return `⚠️ ${roundedDays} dia${pluralSuffix}`;
  }
  
  return `${roundedDays} dia${pluralSuffix}`;
}
