// ══════════════════════════════════════════════════════════════
// js/filter.js — Lógica de Filtragem e Redefinição (Task SL-14)
// Responsabilidade: Processamento seguro de dados e fallbacks.
// ══════════════════════════════════════════════════════════════
import { IT, PRIO, INTERACT } from './database.js';
import { generateCacheKey, getFromCache, saveToCache } from './search.js';
import { getFuse, pdose } from './list.js';

/**
 * Verifica se um suplemento possui interações classificadas como perigosas (critical).
 */
const hasCriticalAlert = (item) => {
  const name = item.name.toLowerCase();
  return INTERACT.some(int => 
    int.type === 'danger' && 
    (int.title.toLowerCase().includes(name) || int.desc.toLowerCase().includes(name))
  );
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
 */
export function applyFilters(S, sourceData = IT) {
  if (!Array.isArray(sourceData)) {
    console.error('[Filter] Erro Crítico: Base de dados não é um array.');
    return [];
  }

  if (!S || !S.cfg) {
    console.warn('[Filter] Estado (S) inválido. Retornando base completa.');
    return sourceData;
  }

  try {
    const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
    const srt = S.cfg.defaultSort || 'priority';
    const gf = S.goalFilter || '';
    const pf = S.priceFilter || '';

    const isCriticalQuery = q === '!critical' || q === '!perigo';

    const cacheKey = generateCacheKey(q);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    let baseList = [...sourceData];

    if (q && !isCriticalQuery) {
      const fuse = getFuse();
      if (fuse) baseList = fuse.search(q).map(r => r.item);
    }

    // Filtragem Combinatória (Lógica AND)
    const filteredList = baseList.filter(i => {
      if (!i || typeof i !== 'object') return false;
      
      // Filtro de Alertas Críticos (Keyword na busca)
      if (isCriticalQuery && !hasCriticalAlert(i)) return false;

      // Filtros Globais
      if (i.pr === 'extra' && !S.showExtra) return false;
      if (!S.showDone && S.checked?.[i.id]) return false;
      
      // Filtro de Categoria (Barra Lateral)
      if (S.cat !== 'Todos' && i.cat !== S.cat) return false;
      
      // Filtro de Objetivo (Top Select)
      if (gf && !(i.goals || []).includes(gf) && !i.tags?.includes(gf)) return false;
      
      // Filtro de Preço (Top Select)
      if (pf) {
        const [lo, hi] = pf.includes('+') ? [parseInt(pf), 9999] : [...pf.split('-').map(Number)];
        const price = i.pm || 0;
        if (price < lo || price > hi) return false;
      }

      return true;
    });

    if (filteredList.length === 0 && !isFilteringActive(S)) {
      console.warn('[Filter] Filtro vazio detectado em estado inativo. Reidratando...');
      return sourceData;
    }

    // 3. Ordenação
    if (srt === 'name') filteredList.sort((a,b) => a.name.localeCompare(b.name, 'pt'));
    else if (srt === 'cat') filteredList.sort((a,b) => (a.cat||'').localeCompare(b.cat||'', 'pt'));
    else if (srt === 'score') filteredList.sort((a,b) => (b.sc || 0) - (a.sc || 0));
    else if (srt === 'cost') filteredList.sort((a,b) => (a.pm || 9999) - (b.pm || 9999));
    else if (srt === 'pdose') filteredList.sort((a,b) => (pdose(a) || 999) - (pdose(b) || 999));
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
 * Calcula a contagem de itens por categoria baseado nos filtros ATIVOS (exceto a própria categoria).
 * Isso permite que os badges [N] reflitam a realidade do que o usuário verá ao clicar.
 */
export function calculateCategoryCounts(S, sourceData = IT) {
  const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
  const gf = S.goalFilter || '';
  const pf = S.priceFilter || '';
  const isCriticalQuery = q === '!critical' || q === '!perigo';

  // Filtra a base ignorando apenas S.cat
  const preFiltered = sourceData.filter(i => {
    if (i.pr === 'extra' && !S.showExtra) return false;
    if (!S.showDone && S.checked?.[i.id]) return false;
    if (gf && !(i.goals || []).includes(gf)) return false;
    if (pf) {
       const [lo, hi] = pf.includes('+') ? [parseInt(pf), 9999] : [...pf.split('-').map(Number)];
       if (i.pm < lo || i.pm > hi) return false;
    }
    if (q) {
      if (isCriticalQuery) {
        if (!hasCriticalAlert(i)) return false;
      } else if (!i.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const counts = { Todos: preFiltered.length };
  preFiltered.forEach(i => {
    counts[i.cat] = (counts[i.cat] || 0) + 1;
  });
  return counts;
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