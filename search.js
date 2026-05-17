// ══════════════════════════════════════════════════════════════
// js/search.js — Gerenciamento de Cache e Performance de Busca
// [SL-28] Implementação de Cache em Memória para Consultas Repetidas.
// ══════════════════════════════════════════════════════════════
import { S } from './state.js';

// [SL-29] Mecanismo de controle de concorrência para buscas rápidas
// Garante que apenas o resultado da última busca seja renderizado.
let _activeSearchId = 0;

/**
 * Gera e retorna um novo ID único para a requisição de busca atual.
 * @returns {number} O ID da nova requisição.
 */
export function getNewSearchId() {
  _activeSearchId++;
  return _activeSearchId;
}

/** 
 * Estrutura de Cache indexada por Map para performance O(1).
 * @type {Map<string, Array>}
 */
const _cache = new Map();

/**
 * Gera uma chave única baseada no termo de busca e no estado dos filtros.
 * Isso previne colisões quando o usuário troca filtros mantendo o texto.
 */
export function generateCacheKey(query) {
  if (!S) return '';
  const q = (query || '').toLowerCase().trim();
  return [
    q,
    S.cat,
    S.goalFilter,
    S.priceFilter,
    S.showDone,
    S.showExtra,
    S.cfg?.defaultSort || 'priority'
  ].join('|');
}

/** Verifica existência de resultado no cache */
export function hasCachedResult(key) {
  return _cache.has(key);
}

/** Recupera resultados do cache */
export function getFromCache(key) {
  return _cache.get(key);
}

/** Armazena resultados no cache (limitado a 50 entradas para controle de memória) */
export function saveToCache(key, results) {
  if (_cache.size > 50) _cache.clear(); 
  _cache.set(key, results);
}

/** Invalida completamente o cache após mutações de dados */
export function invalidateSearchCache() {
  _cache.clear();
}

/**
 * Verifica se o ID da requisição de busca fornecido ainda é o mais recente.
 * Usado para abortar renderizações de resultados antigos.
 * @param {number} id - O ID da requisição a ser verificada.
 * @returns {boolean} True se o ID for o mais recente, False caso contrário.
 */
export function isCurrentSearch(id) {
  return id === _activeSearchId;
}