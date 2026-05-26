/**
 * @fileoverview Cache em memória com tempo de expiração (TTL) para o SupliList v2.0.
 * Otimiza a performance evitando re-calculos ou carregamentos repetitivos.
 */

export class Cache {
  /**
   * Construtor da classe de Cache.
   * @param {number} [defaultTTL=300000] - Tempo de vida padrão das chaves em milissegundos (padrão: 5 min).
   */
  constructor(defaultTTL = 5 * 60 * 1000) {
    /**
     * @private
     * @type {number}
     */
    this._defaultTTL = defaultTTL;

    /**
     * @private
     * @type {Map<string, { value: any, expiresAt: number }>}
     */
    this._store = new Map();
  }

  /**
   * Obtém um valor do cache se este existir e não estiver expirado.
   * @param {string} key - A chave de acesso.
   * @returns {any | null} O valor correspondente ou null se expirado/inexistente.
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.invalidate(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Registra um valor no cache associado a uma chave e um tempo de vida limite.
   * @param {string} key - A chave de acesso.
   * @param {any} value - O dado a ser armazenado.
   * @param {number} [ttl] - TTL personalizado em milissegundos.
   * @returns {void}
   */
  set(key, value, ttl) {
    const activeTTL = typeof ttl === 'number' ? ttl : this._defaultTTL;
    const expiresAt = Date.now() + activeTTL;
    this._store.set(key, { value, expiresAt });
  }

  /**
   * Remove permanentemente uma chave e seu valor do cache.
   * @param {string} key - A chave a ser invalidada.
   * @returns {void}
   */
  invalidate(key) {
    this._store.delete(key);
  }

  /**
   * Limpa permanentemente todos os registros mantidos em cache.
   * @returns {void}
   */
  clear() {
    this._store.clear();
  }

  /**
   * Verifica se uma chave existe no cache e permanece válida (não expirada).
   * @param {string} key - A chave de busca.
   * @returns {boolean} True se estiver ativa no cache, false caso contrário.
   */
  has(key) {
    const entry = this._store.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.invalidate(key);
      return false;
    }
    
    return true;
  }
}

export const supplementCache = new Cache();
