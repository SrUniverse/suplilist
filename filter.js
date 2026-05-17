// ══════════════════════════════════════════════════════════════
// js/filter.js — Lógica de Filtragem e Redefinição (Task SL-14)
// Responsabilidade: Processamento seguro de dados e fallbacks.
// ══════════════════════════════════════════════════════════════
import { IT, PRIO, bestMarketplacePrice } from './database.js';
import { generateCacheKey, getFromCache, saveToCache } from './search.js';
import { getFuse } from './list.js';

/**
 * Calcula o preço por dose para fins de ordenação.
 * Helper isolado para evitar dependências circulares com list.js.
 */
const getPdose = (i) => {
  const p = bestMarketplacePrice(i);
  return i.doses && p ? Math.round((p / i.doses) * 100) / 100 : null;
};

/**
 * Verifica se existe algum critério de filtragem ativo na UI ou no Estado.
 * @param {object} S - Estado Global
 * @returns {boolean}
 */
export function isFilteringActive(S) {
  if (!S) return false;
  const q = (document.getElementById('search')?.value || '').trim();
  return !!(q || S.goalFilter || S.priceFilter || S.cat !== 'Todos');
}

/**
 * Aplica os filtros e ordenação ao conjunto de dados.
 * [SL-14] Implementa cláusulas de guarda e reidratação automática.
 * 
 * @param {object} S - Estado Global
 * @param {Array} sourceData - Base de dados (Padrão: IT)
 * @returns {Array} Lista processada pronta para renderização.
 */
export function applyFilters(S, sourceData = IT) {
  // Guarda 1: Integridade dos dados de entrada
  if (!Array.isArray(sourceData)) {
    console.error('[Filter] Erro Crítico: Base de dados não é um array.');
    return [];
  }

  // Guarda 2: Integridade do Estado
  if (!S || !S.cfg) {
    console.warn('[Filter] Estado (S) inválido. Retornando base completa.');
    return sourceData;
  }

  try {
    const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
    const srt = S.cfg.defaultSort || 'priority';
    const gf = S.goalFilter || '';
    const pf = S.priceFilter || '';

    // [SL-28] Check Cache Hit
    const cacheKey = generateCacheKey(q);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    let baseList = [...sourceData];

    // 1. Busca Fuzzy (Fase de Redução)
    if (q) {
      const fuse = getFuse();
      if (fuse) {
        baseList = fuse.search(q).map(r => r.item);
      }
    }

    // 2. Filtros de Critério
    let filteredList = baseList.filter(i => {
      if (!i || typeof i !== 'object') return false;
      if (i.pr === 'extra' && !S.showExtra) return false;
      if (!S.showDone && S.checked?.[i.id]) return false;
      if (S.cat !== 'Todos' && i.cat !== S.cat) return false;
      if (gf && !(i.goals || []).includes(gf)) return false;
      
      if (pf) {
        const [lo, hi] = pf.includes('+') ? [parseInt(pf), 9999] : [...pf.split('-').map(Number)];
        const price = i.pm || 0;
        if (price < lo || price > hi) return false;
      }
      return true;
    });

    // [SL-14] Fallback de Reidratação:
    // Se o resultado for vazio MAS não há filtros ativos, significa que houve um erro 
    // de lógica ou estado corrompido. Retornamos a lista completa para evitar tela branca.
    if (filteredList.length === 0 && !isFilteringActive(S)) {
      console.warn('[Filter] Filtro vazio detectado em estado inativo. Reidratando...');
      return sourceData;
    }

    // 3. Ordenação
    if (srt === 'name') filteredList.sort((a,b) => a.name.localeCompare(b.name, 'pt'));
    else if (srt === 'cat') filteredList.sort((a,b) => (a.cat||'').localeCompare(b.cat||'', 'pt'));
    else if (srt === 'score') filteredList.sort((a,b) => (b.sc || 0) - (a.sc || 0));
    else if (srt === 'cost') filteredList.sort((a,b) => (a.pm || 9999) - (b.pm || 9999));
    else if (srt === 'pdose') filteredList.sort((a,b) => (getPdose(a) || 999) - (getPdose(b) || 999));
    else filteredList.sort((a,b) => (PRIO[a.pr] ?? 99) - (PRIO[b.pr] ?? 99));

    // [SL-28] Store in Cache
    saveToCache(cacheKey, filteredList);

    return filteredList;
  } catch (error) {
    console.error('[Filter] Falha na aplicação de filtros:', error);
    return sourceData; // Fallback seguro em caso de exceção
  }
}

/**
 * Redefine os filtros do sistema para o estado inicial.
 */
export function resetFilters(S) {
  if (!S) return;
  S.cat = 'Todos';
  S.goalFilter = '';
  S.priceFilter = '';
  
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.value = '';
  }
}