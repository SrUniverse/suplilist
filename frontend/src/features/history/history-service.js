import { stateManager } from '../../state/state-manager.js';
import { syncQueue } from '../../platform/sync-queue.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';

/**
 * HistoryService
 *
 * Mock version for Phase 4 frontend architecture hardening.
 * Reads from stateManager.checkins to simulate a paginated REST API.
 * Includes latency simulation, offline simulation (via stateManager.get('ui.isOffline')),
 * and deduplication via UUID to prevent cache/state fragmentation.
 */
export class HistoryService {
  #PAGE_SIZE = 20;
  #seenIds = new Set();
  #items = [];
  #cursor = 0;
  #hasMore = true;
  #loading = false;

  #filters = { query: '', category: 'Todos' };

  constructor() {}

  /**
   * Updates filters and resets the cache.
   * @param {Object} filters
   */
  setFilters(filters) {
    this.#filters = { ...this.#filters, ...filters };
    this.reset();
  }

  /**
   * Fetches the next page of checkins.
   * Simulates network latency and offline errors.
   * Deduplicates incoming items based on ID.
   *
   * @returns {Promise<{items: Array, hasMore: boolean, total: number}>}
   */
  async loadMore() {
    if (this.#loading || !this.#hasMore) {
      return { items: [], hasMore: false, total: this.#items.length };
    }
    
    this.#loading = true;

    try {
      // 1. Simulação de latência de rede
      await new Promise(resolve => setTimeout(resolve, 400));

      // 2. Simulação de erro de conexão estruturado (SWR offline fallback)
      if (stateManager.get('ui.isOffline')) {
        const error = new Error('offline');
        error.status = 503;
        error.error = 'offline';
        throw error;
      }

      // 3. Simulação de banco de dados e paginação com filtros aplicados
      let allCheckins = stateManager.get('checkins') || [];
      
      if (this.#filters.query || this.#filters.category !== 'Todos') {
        const q = (this.#filters.query || '').toLowerCase().trim();
        const cat = (this.#filters.category || '').toLowerCase();
        
        // Mock de JOIN (na vida real, o SQL faria isso)
        // Para mockar o filtro por texto e categoria, precisamos do supMap local
        const SUP_DB = SUPPLEMENTS_DB;
        allCheckins = allCheckins.filter(ck => {
          const dbItem = SUP_DB.find(s => s.id === ck.supplementId);
          if (!dbItem) return true; // Se não achar no db, mantém por segurança ou skip
          
          if (q && !dbItem.name.toLowerCase().includes(q) && !(dbItem.category || '').toLowerCase().includes(q)) {
            return false;
          }
          if (cat && cat !== 'todos') {
            const itemCat = (dbItem.category || '').toLowerCase();
            if (itemCat !== cat) {
              // Mapeamento específico do histórico
              if (cat === 'saúde geral' && ['saúde cardiovascular','saúde articular & pele','saúde intestinal','queima de gordura & recovery'].includes(itemCat)) return true;
              if (cat === 'cognição & neuroproteção' && itemCat === 'energéticos & foco') return true;
              return false;
            }
          }
          return true;
        });
      }

      const startIndex = this.#cursor * this.#PAGE_SIZE;
      const endIndex = startIndex + this.#PAGE_SIZE;
      const rawItems = allCheckins.slice(startIndex, endIndex);

      // Reconciliação Visual: Injetar itens pendentes se for página 1
      if (this.#cursor === 0) {
        const pending = syncQueue.getPendingItems().map(p => ({
          ...p,
          isPending: true
        }));
        
        // Empurra os pendentes primeiro (topo do histórico recente)
        pending.forEach(item => {
          const id = item.id || item.supplementId;
          if (!this.#seenIds.has(id)) {
            this.#seenIds.add(id);
            this.#items.push(item);
          }
        });
      }

      // 4. Deduplicação O(1) via UUID
      const deduplicated = rawItems.filter(item => {
        const id = item.id || item.supplementId; // Fallback temporário dependendo do shape
        if (this.#seenIds.has(id)) return false;
        this.#seenIds.add(id);
        return true;
      });

      this.#items.push(...deduplicated);
      this.#cursor++;
      this.#hasMore = endIndex < allCheckins.length;

      return {
        items: deduplicated,
        hasMore: this.#hasMore,
        total: allCheckins.length
      };
    } finally {
      this.#loading = false;
    }
  }

  /**
   * Gets the currently loaded, deduplicated, and sorted array of items.
   * @returns {Array} Imutable copy of loaded items
   */
  getItems() {
    return [...this.#items];
  }

  /**
   * Resets the cursor and cache. Useful for pull-to-refresh or explicit reloads.
   */
  reset() {
    this.#seenIds.clear();
    this.#items = [];
    this.#cursor = 0;
    this.#hasMore = true;
    this.#loading = false;
  }

  get hasMore() {
    return this.#hasMore;
  }

  get isLoading() {
    return this.#loading;
  }
}

// Singleton instance
export const historyService = new HistoryService();
