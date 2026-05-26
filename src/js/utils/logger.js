/**
 * @fileoverview Utilitário de logging centralizado e ciente de ambiente (ENV-aware) para o SupliList v2.0.
 * Oferece suporte a níveis de log, formatação colorida no console e controle de nível ativo.
 */

/**
 * Níveis de log disponíveis no sistema.
 * @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel
 */

class Logger {
  /**
   * Inicializa uma nova instância do Logger.
   */
  constructor() {
    /**
     * @private
     * @type {Record<LogLevel, number>}
     */
    this._priorities = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    /**
     * @private
     * @type {LogLevel}
     */
    this._level = this._determineDefaultLevel();
  }

  /**
   * Determina o nível de log padrão baseado no ambiente.
   * @private
   * @returns {LogLevel}
   */
  _determineDefaultLevel() {
    try {
      if (
        typeof process !== 'undefined' &&
        process.env &&
        process.env.NODE_ENV === 'production'
      ) {
        return 'warn';
      }
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.protocol === 'file:')
      ) {
        return 'debug';
      }
    } catch {
      // Ignora erros ao acessar objetos globais de ambiente
    }
    return 'info';
  }

  /**
   * Verifica se o logger está em ambiente de desenvolvimento.
   * MED-02: corrigido — antes sempre retornava true (o catch silenciava a detecção de prod).
   * @private
   * @returns {boolean}
   */
  _isDev() {
    try {
      // Em bundles Vite/Node, process.env.NODE_ENV é substituído em tempo de build
      if (
        typeof process !== 'undefined' &&
        process.env &&
        process.env.NODE_ENV === 'production'
      ) {
        return false;
      }
    } catch {
      // process não existe no browser — continua para detecção via hostname
    }

    // No browser, considera dev apenas em localhost / IPs locais / protocolo file:
    if (typeof window !== 'undefined' && window.location) {
      const h = window.location.hostname;
      return (
        h === 'localhost' ||
        h === '127.0.0.1' ||
        h === '' ||
        h.endsWith('.local') ||
        window.location.protocol === 'file:'
      );
    }

    // Fallback seguro: assume não-dev
    return false;
  }

  /**
   * Configura o nível mínimo de log ativo.
   * @param {LogLevel} level - Novo nível de log ('debug'|'info'|'warn'|'error')
   * @returns {void}
   */
  setLevel(level) {
    if (this._priorities[level] !== undefined) {
      this._level = level;
    }
  }

  /**
   * Verifica se um determinado nível deve ser logado.
   * @private
   * @param {LogLevel} level - Nível a ser testado
   * @returns {boolean}
   */
  _shouldLog(level) {
    return this._priorities[level] >= this._priorities[this._level];
  }

  /**
   * Emite uma mensagem de depuração (debug) se o nível permitir e estiver em desenvolvimento.
   * @param {string} msg - Mensagem principal do log
   * @param {any} [data] - Dados adicionais para contextualização
   * @returns {void}
   */
  debug(msg, data) {
    if (!this._shouldLog('debug') || !this._isDev()) return;
    const style = 'color: #8a8a8a; font-weight: bold;';
    if (data !== undefined) {
      console.debug(`%c🔍 [DEBUG] ${msg}`, style, data);
    } else {
      console.debug(`%c🔍 [DEBUG] ${msg}`, style);
    }
  }

  /**
   * Emite uma mensagem informativa (info) se o nível permitir.
   * @param {string} msg - Mensagem principal do log
   * @param {any} [data] - Dados adicionais para contextualização
   * @returns {void}
   */
  info(msg, data) {
    if (!this._shouldLog('info')) return;
    const style = 'color: #00bcd4; font-weight: bold;';
    if (data !== undefined) {
      console.info(`%cℹ️ [INFO] ${msg}`, style, data);
    } else {
      console.info(`%cℹ️ [INFO] ${msg}`, style);
    }
  }

  /**
   * Emite um aviso (warn) se o nível permitir.
   * @param {string} msg - Mensagem principal do log
   * @param {any} [data] - Dados adicionais para contextualização
   * @returns {void}
   */
  warn(msg, data) {
    if (!this._shouldLog('warn')) return;
    const style = 'color: #ff9800; font-weight: bold;';
    if (data !== undefined) {
      console.warn(`%c⚠️ [WARN] ${msg}`, style, data);
    } else {
      console.warn(`%c⚠️ [WARN] ${msg}`, style);
    }
  }

  /**
   * Emite uma mensagem de erro (error) se o nível permitir.
   * Inclui o stack trace detalhado caso esteja em ambiente de desenvolvimento.
   * @param {string} msg - Mensagem principal do erro
   * @param {Error | any} [error] - Objeto do erro ou detalhes adicionais
   * @returns {void}
   */
  error(msg, error) {
    if (!this._shouldLog('error')) return;
    const style = 'color: #f44336; font-weight: bold;';
    
    if (error instanceof Error) {
      if (this._isDev()) {
        console.error(`%c❌ [ERROR] ${msg}\n`, style, error.message, '\nStack:', error.stack);
      } else {
        console.error(`%c❌ [ERROR] ${msg}`, style, error.message);
      }
    } else if (error !== undefined) {
      console.error(`%c❌ [ERROR] ${msg}`, style, error);
    } else {
      console.error(`%c❌ [ERROR] ${msg}`, style);
    }
  }
}

export const logger = new Logger();
