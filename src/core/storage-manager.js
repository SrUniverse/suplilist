// ============================================================
// StorageManager — Multi-layer Storage (IndexedDB + Cookies + File System)
// ============================================================
// Camadas de persistência:
// 1. IndexedDB — armazenamento primary (robusto, offline, ilimitado)
// 2. Cookies — sincronização entre navegadores no mesmo dispositivo
// 3. File System API — export/import manual de backups

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
      console.warn('[StorageManager] IndexedDB init falhou, usando fallback:', e);
      this._dbReady = false;
    }
  }

  /**
   * Escreve um valor no armazenamento.
   * Prioridade: IndexedDB → Cookies (sync) → localStorage (fallback)
   */
  static async setItem(key, value) {
    // Tentar IndexedDB primeiro
    if (this._dbReady && this._db) {
      try {
        await this._setIndexedDB(key, value);
        // Depois sincronizar com cookies para cross-browser
        this._syncToCookie(key, value);
        return;
      } catch (e) {
        console.warn('[StorageManager] IndexedDB setItem falhou, tentando fallback:', e);
      }
    }

    // Fallback para cookies
    try {
      if (this._setCookie(key, value)) {
        return;
      }
    } catch (e) {
      // Cookie falhou, tentar localStorage
    }

    // Fallback para localStorage
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`[StorageManager] Falha ao escrever chave "${key}":`, e);
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
        console.warn('[StorageManager] IndexedDB getItem falhou:', e);
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
      return null;
    }
  }

  /**
   * Remove uma chave do armazenamento.
   */
  static removeItem(key) {
    // Remover de cookies
    this._removeCookie(key);

    // Remover de localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignorar
    }
  }

  /**
   * Lista todas as chaves do armazenamento.
   * Combina chaves de cookies e localStorage.
   */
  static getAllKeys() {
    const keys = new Set();

    // Adicionar chaves de localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.add(key);
      }
    } catch (e) {
      // Ignorar
    }

    // Adicionar chaves de cookies
    try {
      const cookieString = document.cookie;
      const cookies = cookieString.split(';');
      for (let cookie of cookies) {
        const key = cookie.split('=')[0].trim();
        if (key) keys.add(key);
      }
    } catch (e) {
      // Ignorar
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
    } catch (e) {
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
      console.error('[StorageManager] Export falhou:', e);
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
      const data = JSON.parse(text);

      // Restaurar dados em IndexedDB
      if (data.sources?.indexeddb) {
        for (const [key, value] of Object.entries(data.sources.indexeddb)) {
          await this._setIndexedDB(key, value);
        }
      }

      return { success: true, message: 'Dados importados com sucesso!' };
    } catch (e) {
      console.error('[StorageManager] Import falhou:', e);
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
        this._setCookie(key, value);
      }
    } catch (e) {
      // Ignorar sincronização falha
    }
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
    } catch (e) {
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

      // Encodevalue em base64 para evitar caracteres especiais
      const encoded = btoa(encodeURIComponent(value));

      // Construir cookie
      const cookie = `${key}=${encoded}; expires=${expires.toUTCString()}; path=${this.COOKIE_PATH}; SameSite=Lax`;
      document.cookie = cookie;

      // Verificar se cookie foi escrito
      const readBack = this._getCookie(key);
      return readBack === value;
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
}

export default StorageManager;
