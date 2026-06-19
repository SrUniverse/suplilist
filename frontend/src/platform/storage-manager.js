// ============================================================
// StorageManager — Multi-layer Storage (IndexedDB + Cookies + File System)
// ============================================================
// Camadas de persistência:
// 1. IndexedDB — armazenamento primary (robusto, offline, ilimitado)
// 2. Cookies — sincronização entre navegadores no mesmo dispositivo
// 3. File System API — export/import manual de backups

import { logger } from '../utils/logger.js';

export class StorageManager {
  static COOKIE_DURATION_DAYS = 365;
  static COOKIE_PATH = '/';
  static STORAGE_KEY = 'suplilist-state-v4';
  static MAX_COOKIE_SIZE = 3000; // bytes (com margem de segurança)
  static DB_NAME = 'SupliListDB';
  static DB_VERSION = 1;
  static DB_STORE = 'state';

  static _db = null;
  static _dbReady = false;

  /**
   * Inicializa o banco de dados IndexedDB.
   */
  static async init() {
    if (this._dbReady) return;

    try {
      this._db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.DB_STORE)) {
            db.createObjectStore(this.DB_STORE);
          }
        };
      });

      this._dbReady = true;
    } catch (e) {
      logger.warn('[StorageManager] IndexedDB init falhou, usando fallback:', e);
      this._dbReady = false;
    }
  }

  /**
   * Escreve um valor no armazenamento.
   * Prioridade: IndexedDB → Cookies (sync) → localStorage (fallback)
   * @param {string} key - Chave de armazenamento (não-vazia, sem caracteres especiais)
   * @param {*} value - Valor a armazenar (deve ser serializável, não pode ser undefined)
   * @throws {TypeError} Se key não for string ou value for undefined
   * @throws {Error} Se key contiver caracteres inválidos ou value não for serializável
   */
  static async setItem(key, value) {
    // PATCH 1: Validar key
    if (typeof key !== 'string' || key.trim() === '') {
      throw new TypeError('key must be a non-empty string');
    }

    // PATCH 2: Validar caracteres perigosos em key (previne cookie injection)
    if (/[;\s=]/.test(key)) {
      throw new Error('key contains invalid characters (;, =, or whitespace)');
    }

    // PATCH 3: Validar value
    if (value === undefined) {
      throw new Error('value cannot be undefined (use null or removeItem instead)');
    }

    // PATCH 4: Validar serializabilidade (detecta circular reference)
    try {
      JSON.stringify(value);
    } catch (e) {
      throw new Error(`value is not serializable: ${e.message}`, { cause: e });
    }

    // Tentar IndexedDB primeiro
    if (this._dbReady && this._db) {
      try {
        await this._setIndexedDB(key, value);
        // Depois sincronizar com cookies para cross-browser
        if (!this._syncToCookie(key, value)) {
          try { localStorage.setItem(key, value); } catch (e) { this._emitStorageDegradedEvent('localStorage', e.message); }
        }
        return;
      } catch (e) {
        logger.warn('[StorageManager] IndexedDB setItem falhou, tentando fallback:', e);

        // PATCH 5: Emitir evento de degradação para UI mostrar warning
        this._emitStorageDegradedEvent('IndexedDB', e.message);
      }
    }

    // Fallback para cookies
    try {
      if (this._setCookie(key, value)) {
        return;
      }
    } catch (e) {
      this._emitStorageDegradedEvent('cookie', e.message);
    }

    // Fallback para localStorage
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      logger.error(`[StorageManager] Falha ao escrever chave "${key}":`, e);
    }
  }

  /**
   * Lê um valor do armazenamento.
   * Prioridade: IndexedDB → Cookies → localStorage
   */
  static async getItem(key) {
    // Tentar IndexedDB primeiro
    if (this._dbReady && this._db) {
      try {
        const value = await this._getIndexedDB(key);
        if (value !== null) {
          return value;
        }
      } catch (e) {
        logger.warn('[StorageManager] IndexedDB getItem falhou:', e);
      }
    }

    // Fallback para cookie
    let value = this._getCookie(key);
    if (value !== null) {
      return value;
    }

    // Fallback para localStorage
    try {
      return localStorage.getItem(key);
    } catch (e) {
      this._emitStorageDegradedEvent('localStorage', e.message);
      return null;
    }
  }

  /**
   * Lê um valor do armazenamento de forma síncrona (apenas Cookies e localStorage).
   * Útil para hidratação inicial do estado (evita UI flickering).
   */
  static getItemSync(key) {
    let value = this._getCookie(key);
    if (value !== null) return value;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      this._emitStorageDegradedEvent('localStorage', e.message);
      return null;
    }
  }

  /**
   * Remove uma chave do armazenamento.
   * Remove de todas as camadas: IndexedDB, cookies e localStorage.
   * @param {string} key - Chave a remover
   * @returns {Promise<void>}
   */
  static async removeItem(key) {
    // PATCH 6: Remover de IndexedDB (CRÍTICO - previne vazamento entre sessões)
    if (this._dbReady && this._db) {
      try {
        await new Promise((resolve, reject) => {
          const transaction = this._db.transaction([this.DB_STORE], 'readwrite');
          const store = transaction.objectStore(this.DB_STORE);
          const request = store.delete(key);

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (e) {
        logger.warn('[StorageManager] Failed to remove from IndexedDB:', e);
      }
    }

    // Remover de cookies
    this._removeCookie(key);

    // Remover de localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {
      this._emitStorageDegradedEvent('localStorage', e.message);
    }
  }

  /**
   * Lista todas as chaves do armazenamento.
   * Combina chaves de cookies e localStorage.
   */
  static getAllKeys() {
    const keys = new Set();
    const APP_PREFIXES = ['suplilist', 'sl:', 'sls:'];
    const isAppKey = (k) => APP_PREFIXES.some(p => k.startsWith(p));

    // Adicionar chaves de localStorage (apenas as do app)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isAppKey(key)) keys.add(key);
      }
    } catch (e) {
      this._emitStorageDegradedEvent('localStorage', e.message);
    }

    // Adicionar chaves de cookies (apenas as do app — evita _ga, _gid etc.)
    try {
      const cookieString = document.cookie;
      const cookies = cookieString.split(';');
      for (let cookie of cookies) {
        const key = cookie.split('=')[0].trim();
        if (key && isAppKey(key)) keys.add(key);
      }
    } catch (e) {
      this._emitStorageDegradedEvent('cookie', e.message);
    }

    return Array.from(keys);
  }

  /**
   * Verifica se um cookie está habilitado.
   */
  static areCookiesEnabled() {
    try {
      const test = '__test__';
      this._setCookie(test, '1');
      const value = this._getCookie(test);
      this._removeCookie(test);
      return value === '1';
    } catch (_e) {
      return false;
    }
  }

  /**
   * Exporta todos os dados para um arquivo JSON (File System API).
   * Abre o file picker e salva no dispositivo do usuário.
   */
  static async exportToFile() {
    try {
      if (!window.showSaveFilePicker) {
        throw new Error('File System Access API não suportada neste navegador');
      }

      // Coletar dados de todas as fontes
      const data = {
        exportDate: new Date().toISOString(),
        version: '4.0.0',
        sources: {
          indexeddb: await this._getAllFromIndexedDB(),
          cookies: this._getAllCookies(),
          localStorage: this._getAllFromLocalStorage()
        }
      };

      // Abrir file picker
      const handle = await window.showSaveFilePicker({
        suggestedName: `suplilist-export-${new Date().toISOString().slice(0, 10)}.json`,
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });

      // Escrever arquivo
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();

      return { success: true, message: 'Dados exportados com sucesso!' };
    } catch (e) {
      logger.error('[StorageManager] Export falhou:', e);
      return { success: false, message: `Erro ao exportar: ${e.message}` };
    }
  }

  /**
   * Importa dados de um arquivo JSON (File System API).
   * Abre o file picker e carrega os dados no IndexedDB.
   */
  static async importFromFile() {
    try {
      if (!window.showOpenFilePicker) {
        throw new Error('File System Access API não suportada neste navegador');
      }

      // Abrir file picker
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });

      // Ler arquivo
      const file = await handle.getFile();
      const text = await file.text();

      // PATCH 7: Validar tamanho do arquivo (max 10MB)
      if (text.length > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 10MB)');
      }

      const data = JSON.parse(text);

      // PATCH 8: Validar schema
      if (!data.version || !data.sources || typeof data.sources !== 'object') {
        throw new Error('Formato de arquivo inválido');
      }

      // PATCH 9: Validar version compatibility
      const currentVersion = '4.0.0';
      if (data.version !== currentVersion) {
        throw new Error(`Versão incompatível (esperado ${currentVersion}, recebido ${data.version})`);
      }

      // PATCH 10: Restaurar dados com validação de keys (previne prototype pollution)
      if (data.sources?.indexeddb && typeof data.sources.indexeddb === 'object') {
        const validKeyPrefixes = ['suplilist-state', 'suplilist:', 'sl:'];

        for (const [key, value] of Object.entries(data.sources.indexeddb)) {
          // Proteger contra prototype pollution
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            logger.warn(`[StorageManager] Ignorando key perigosa durante import: ${key}`);
            continue;
          }

          // Validar key contra allowlist de prefixos
          const isValid = validKeyPrefixes.some(prefix => key.startsWith(prefix));
          if (!isValid) {
            logger.warn(`[StorageManager] Ignorando key não reconhecida durante import: ${key}`);
            continue;
          }

          await this._setIndexedDB(key, value);
        }
      }

      return { success: true, message: 'Dados importados com sucesso!' };
    } catch (e) {
      logger.error('[StorageManager] Import falhou:', e);
      return { success: false, message: `Erro ao importar: ${e.message}` };
    }
  }

  /**
   * Verifica se File System API está disponível.
   */
  static isFileSystemAPIAvailable() {
    return !!(window.showSaveFilePicker && window.showOpenFilePicker);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  /**
   * Escreve um valor em IndexedDB.
   */
  static async _setIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this.DB_STORE], 'readwrite');
      const store = transaction.objectStore(this.DB_STORE);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Lê um valor de IndexedDB.
   */
  static async _getIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this.DB_STORE], 'readonly');
      const store = transaction.objectStore(this.DB_STORE);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  /**
   * Lê todos os valores de IndexedDB.
   */
  static async _getAllFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this.DB_STORE], 'readonly');
      const store = transaction.objectStore(this.DB_STORE);
      const result = {};

      // Usar cursor para iterar sobre todos os registros
      const cursorRequest = store.openCursor();

      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          result[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          // Nenhum mais registro, retornar resultado
          resolve(result);
        }
      };
    });
  }

  /**
   * Sincroniza um valor do IndexedDB para Cookies.
   * (para compartilhar entre navegadores)
   */
  static _syncToCookie(key, value) {
    try {
      // Só sincroniza dados "state" para evitar poluir cookies
      if (key === this.STORAGE_KEY) {
        return this._setCookie(key, value);
      }
    } catch (_e) {
      // Ignorar sincronização falha
    }
    return false;
  }

  /**
   * Coleta todos os cookies.
   */
  static _getAllCookies() {
    const result = {};
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      const [key, value] = cookie.split('=');
      if (key) {
        try {
          result[key] = decodeURIComponent(atob(value || ''));
        } catch {
          result[key] = value || '';
        }
      }
    }
    return result;
  }

  /**
   * Coleta todos os valores de localStorage.
   */
  static _getAllFromLocalStorage() {
    const result = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          result[key] = localStorage.getItem(key);
        }
      }
    } catch (_e) {
      // Ignorar
    }
    return result;
  }

  /**
   * Escreve um cookie.
   * Usa compressão simples: tenta JSON puro, se > 3KB, não escreve (deixa localStorage)
   * @returns {boolean} true se sucesso, false se falhar (tamanho ou outro erro)
   */
  static _setCookie(key, value) {
    try {
      // Validar tamanho aproximado
      const size = this._estimateSize(value);
      if (size > this.MAX_COOKIE_SIZE) {
        // Dado muito grande para cookie, retornar false para fallback
        return false;
      }

      const expires = new Date();
      expires.setDate(expires.getDate() + this.COOKIE_DURATION_DAYS);

      // Serializar value se necessário
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      // Encode em base64 para evitar caracteres especiais
      const encoded = btoa(encodeURIComponent(serialized));

      // PATCH 11: Adicionar Secure flag para HTTPS (previne MITM)
      const isSecure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';

      // Construir cookie
      const cookie = `${key}=${encoded}; expires=${expires.toUTCString()}; path=${this.COOKIE_PATH}; SameSite=Lax${secureFlag}`;
      document.cookie = cookie;

      // PATCH 12: Verificar se cookie foi escrito (comparar serialized)
      const readBack = this._getCookie(key);
      return readBack === serialized;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Lê um cookie.
   */
  static _getCookie(key) {
    try {
      const nameEQ = key + '=';
      const cookies = document.cookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(nameEQ)) {
          const encoded = cookie.substring(nameEQ.length);
          const decoded = decodeURIComponent(atob(encoded));
          return decoded;
        }
      }

      return null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Remove um cookie.
   */
  static _removeCookie(key) {
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() - 1);
      const cookie = `${key}=; expires=${expires.toUTCString()}; path=${this.COOKIE_PATH}`;
      document.cookie = cookie;
    } catch (_e) {
      // Ignorar
    }
  }

  /**
   * Estima o tamanho aproximado em bytes.
   */
  static _estimateSize(value) {
    if (typeof value !== 'string') {
      value = JSON.stringify(value);
    }
    // Encoding base64 aumenta tamanho em ~33%
    return Math.ceil(value.length * 1.33);
  }

  /**
   * Emite evento de degradação de storage para UI mostrar warning.
   * @private
   * @param {string} layer - Camada que falhou ('IndexedDB', 'Cookies', 'localStorage')
   * @param {string} errorMessage - Mensagem de erro
   */
  static _emitStorageDegradedEvent(layer, errorMessage) {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('storage:degraded', {
          detail: { layer, error: errorMessage, timestamp: Date.now() }
        }));
      }
    } catch (_e) {
      // Silenciar erro de emit (não crítico)
    }
  }

  /**
   * Encrypts data using Web Crypto API (AES-GCM)
   * @param {string} data - Data to encrypt
   * @param {string} password - Encryption password (minimum 8 characters)
   * @returns {Promise<string>} Encrypted data as base64
   */
  static async encrypt(data, password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      // Derive key from password
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode('suplilist-salt'), iterations: 100000, hash: 'SHA-256' },
        key,
        256
      );
      const cryptoKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM' }, false, ['encrypt']);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(data)
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      const binaryString = String.fromCharCode.apply(null, combined);
      return btoa(binaryString);
    } catch (e) {
      logger.error('[StorageManager] Encryption failed:', e);
      throw new Error('Encryption failed', { cause: e });
    }
  }

  /**
   * Decrypts data encrypted with encrypt()
   * @param {string} encryptedData - Base64-encoded encrypted data
   * @param {string} password - Decryption password
   * @returns {Promise<string>} Decrypted data
   */
  static async decrypt(encryptedData, password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      // Decode from base64
      const binaryString = atob(encryptedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Extract IV and encrypted data
      const iv = bytes.slice(0, 12);
      const encryptedBuffer = bytes.slice(12);

      // Derive key from password (same as encrypt())
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode('suplilist-salt'), iterations: 100000, hash: 'SHA-256' },
        key,
        256
      );
      const cryptoKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM' }, false, ['decrypt']);

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encryptedBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      logger.error('[StorageManager] Decryption failed:', e);
      throw new Error('Decryption failed', { cause: e });
    }
  }

  /**
   * Sets a value with TTL (time-to-live) expiration
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {number} ttlMs - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  static async setWithTTL(key, value, ttlMs = 24 * 60 * 60 * 1000) {
    if (typeof ttlMs !== 'number' || ttlMs <= 0) {
      throw new Error('ttlMs must be a positive number');
    }

    const ttlKey = `${key}:ttl`;
    const expiresAt = Date.now() + ttlMs;

    // Store value and expiration
    await this.setItem(key, value);
    await this.setItem(ttlKey, expiresAt);

    logger.debug(`[StorageManager] Set ${key} with TTL: ${ttlMs}ms`);
  }

  /**
   * Clears expired items from storage
   * Removes all keys with TTL markers that have expired
   * @returns {Promise<{cleared: number, remaining: number}>}
   */
  static async clearExpired() {
    try {
      const keys = this.getAllKeys();
      let cleared = 0;
      let remaining = 0;

      for (const key of keys) {
        // Check if this key has a TTL
        if (key.endsWith(':ttl')) {
          const baseKey = key.slice(0, -4); // Remove ':ttl' suffix
          const expiresAt = await this.getItem(key);

          if (typeof expiresAt === 'string') {
            const expiresAtNum = parseInt(expiresAt, 10);
            if (expiresAtNum < Date.now()) {
              // Expired - remove both value and TTL key
              await this.removeItem(baseKey);
              await this.removeItem(key);
              cleared++;
              logger.debug(`[StorageManager] Cleared expired key: ${baseKey}`);
            } else {
              remaining++;
            }
          }
        }
      }

      return { cleared, remaining };
    } catch (e) {
      logger.error('[StorageManager] clearExpired failed:', e);
      return { cleared: 0, remaining: 0 };
    }
  }

  // ============================================================
  // Backward compatibility aliases for tests
  // ============================================================

  /**
   * Alias for setItem with localStorage semantics
   */
  static setLocal(key, value, _options = {}) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  /**
   * Alias for getItem with localStorage semantics
   */
  static getLocal(key, _options = {}) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Alias for setItem with sessionStorage semantics
   */
  static setSession(key, value, _options = {}) {
    sessionStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  /**
   * Alias for getItem with sessionStorage semantics
   */
  static getSession(key, _options = {}) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeLocal(key) {
    localStorage.removeItem(key);
  }

  /**
   * Remove item from sessionStorage
   */
  static removeSession(key) {
    sessionStorage.removeItem(key);
  }

  /**
   * Clear both storages
   */
  static clear() {
    localStorage.clear();
    sessionStorage.clear();
  }

  /**
   * List all keys in localStorage
   */
  static listKeys() {
    return Object.keys(localStorage);
  }

  /**
   * Get keys with optional prefix filter
   */
  static getKeys(storage, prefix = '') {
    const store = storage === 'session' ? sessionStorage : localStorage;
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key) keys.push(key);
    }
    return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
  }

  /**
   * Migrate data between storages
   */
  static migrate(key, from, to) {
    const value = from === 'session' ? this.getSession(key) : this.getLocal(key);
    if (value !== undefined) {
      if (to === 'local') {
        this.setLocal(key, value);
        if (from === 'session') this.removeSession(key);
      } else if (to === 'session') {
        this.setSession(key, value);
        if (from === 'local') this.removeLocal(key);
      }
    }
  }
}

export default StorageManager;
