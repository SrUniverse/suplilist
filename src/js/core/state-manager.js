/**
 * @fileoverview Cérebro do SupliList v2.0.
 * Gerenciador de estado global imutável com persistência reativa,
 * observadores de caminhos (path observers) e integração com o EventBus.
 */

import { eventBus } from './eventbus.js';
import { AppStateSchema, DEFAULT_STATE } from '../types/state.schema.js';
import { STORAGE_KEY } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { parseJSON } from '../utils/parsers.js';

/**
 * Aplica Object.freeze recursivamente para garantir imutabilidade estrita.
 * @param {any} object 
 * @returns {any} O mesmo objeto congelado.
 */
function deepFreeze(object) {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    Object.keys(object).forEach(key => {
      if (typeof object[key] === 'object' && object[key] !== null) {
        deepFreeze(object[key]);
      }
    });
  }
  return object;
}

class StateManager {
  /**
   * Construtor do StateManager.
   */
  constructor() {
    /**
     * Mapa de observadores registrados por caminho (path).
     * @private
     * @type {Map<string, Set<Function>>}
     */
    this.observers = new Map();

    /**
     * Fila síncrona para serializar requisições de estado, prevenindo Race Conditions.
     * @private
     * @type {Array<Function>}
     */
    this._updateQueue = [];
    this._isUpdating = false;

    /**
     * Estado global atual (imutável e estritamente congelado em tempo de execução).
     * @private
     * @type {import('../types/state.schema.js').AppState}
     */
    this.state = deepFreeze(this._initializeState());

    this._setupStorageListener();
  }

  /**
   * Monitora alterações externas no localStorage (ex: o usuário apagou o cache).
   * @private
   */
  _setupStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          logger.warn('Detecção de alteração externa no localStorage. Realizando re-hydrate...');
          try {
            const newState = this._initializeState();
            this.state = deepFreeze(newState);
            eventBus.emit('state:rehydrated', { fullState: this.exportState() });
          } catch (err) {
            logger.error('Falha crítica ao tentar recuperar o estado após corrupção de storage:', err);
          }
        }
      });
    }
  }

  /**
   * Inicializa o estado lendo da persistência local (localStorage) com fallback seguro.
   * @private
   * @returns {import('../types/state.schema.js').AppState} O estado validado inicial.
   */
  _initializeState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        logger.info('Nenhum estado anterior encontrado no armazenamento. Inicializando com dados padrão.');
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }

      const parsed = parseJSON(stored);
      const validated = AppStateSchema.validate(parsed);

      if (validated.isValid) {
        return validated.data;
      } else {
        logger.warn('Estado recuperado inválido estruturalmente. Aplicando fallback de segurança.', validated.errors);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    } catch (err) {
      logger.error('Falha crítica ao ler do localStorage. Aplicando fallback de segurança.', err);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  /**
   * Obtém o clone imutável do estado completo ou de um subcaminho específico.
   * @param {string} [path] - Caminho em notação de pontos (ex: "inventory.creatina-mono").
   * @returns {any} Cópia imutável do fragmento do estado ou todo o estado.
   */
  getState(path) {
    const stateClone = JSON.parse(JSON.stringify(this.state));
    if (!path) return stateClone;

    const parts = path.split('.');
    const value = parts.reduce((acc, part) => (acc ? acc[part] : undefined), stateClone);
    
    return value !== undefined ? JSON.parse(JSON.stringify(value)) : undefined;
  }

  /**
   * Atualiza de forma imutável um subcaminho do estado global da aplicação.
   * Utiliza Mutex/Fila síncrona para evitar race conditions.
   *
   * @param {string} path - Caminho em notação de pontos (ex: "favorites", "settings.theme").
   * @param {any} value - Novo valor a ser setado no caminho especificado.
   * @param {{ strict?: boolean }} [options] - Opções de validação.
   * @returns {void}
   */
  setState(path, value, { strict = true } = {}) {
    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('StateManager.setState: O caminho do estado deve ser uma string válida.');
    }

    // Enfileira a atualização para evitar concorrência
    this._updateQueue.push(() => this._applySetState(path, value, strict));
    this._processQueue();
  }

  /**
   * Processa a fila de atualizações de estado sequencialmente.
   * @private
   */
  _processQueue() {
    if (this._isUpdating || this._updateQueue.length === 0) return;
    
    this._isUpdating = true;
    while (this._updateQueue.length > 0) {
      const updateFn = this._updateQueue.shift();
      try {
        updateFn();
      } catch (err) {
        logger.error('Erro na fila de atualização de estado:', err);
      }
    }
    this._isUpdating = false;
  }

  /**
   * Executa fisicamente a transição de estado.
   * @private
   */
  _applySetState(path, value, strict) {
    const parts = path.split('.');
    const newState = JSON.parse(JSON.stringify(this.state)); // unfreeze for mutation

    let current = newState;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    // Aplica o novo valor de forma isolada
    current[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));

    // Valida a integridade total do novo estado gerado
    const validated = AppStateSchema.validate(newState);
    if (!validated.isValid) {
      const errorMsg = `Transição de Estado Recusada: ${validated.errors.join('; ')}`;
      if (strict) {
        logger.error(errorMsg);
        throw new Error(errorMsg);
      } else {
        // Modo leniente: apenas avisa, não aplica o estado inválido
        logger.warn(`[StateManager/lenient] ${errorMsg}`);
        return;
      }
    }

    this.state = deepFreeze(validated.data);
    this._persistToStorage();

    // Notificações em cadeia de reatividade
    eventBus.emit('state:changed', {
      path,
      value: JSON.parse(JSON.stringify(value)),
      fullState: this.exportState(),
    });

    this._notifyObservers(path, value);
  }

  /**
   * Registra um callback observador para ser ativado em mudanças de um caminho específico do estado.
   * @param {string} path - Caminho do estado a ser vigiado.
   * @param {Function} callback - Callback reativo (recebe o novo valor).
   * @returns {() => void} Função de cancelamento do observador (unsubscribe).
   */
  observe(path, callback) {
    if (typeof path !== 'string' || typeof callback !== 'function') {
      logger.warn('StateManager.observe: argumentos inválidos.');
      return () => {};
    }

    if (!this.observers.has(path)) {
      this.observers.set(path, new Set());
    }
    this.observers.get(path).add(callback);

    return () => {
      const pathSet = this.observers.get(path);
      if (pathSet) {
        pathSet.delete(callback);
        if (pathSet.size === 0) {
          this.observers.delete(path);
        }
      }
    };
  }

  /**
   * Exporta uma cópia totalmente desacoplada e profunda do estado global atual.
   * @returns {import('../types/state.schema.js').AppState} Cópia profunda.
   */
  exportState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Importa e sobrescreve todo o estado ativo com validação prévia estrutural de dados.
   * @param {any} data - O objeto contendo o novo estado global.
   * @returns {void}
   * @throws {Error} Lança exceção de validação caso o estado importado falhe no schema.
   */
  importState(data) {
    const validated = AppStateSchema.validate(data);
    if (!validated.isValid) {
      throw new Error(`Falha ao importar estado global: ${validated.errors.join('; ')}`);
    }

    this.state = deepFreeze(validated.data);
    this._persistToStorage();

    eventBus.emit('state:imported', {
      state: this.exportState(),
    });

    // Notifica todos os observadores sobre a redefinição global do estado
    this.observers.forEach((callbacks, path) => {
      const newValue = this.getState(path);
      callbacks.forEach((cb) => {
        try {
          cb(newValue);
        } catch (err) {
          logger.error(`Falha no observador importado para o caminho "${path}":`, err);
        }
      });
    });
  }

  /**
   * Salva o estado corrente de forma persistente no armazenamento síncrono local (localStorage).
   * @private
   * @returns {void}
   */
  _persistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      logger.error('Falha física de escrita no localStorage (Persistência):', err);
      eventBus.emit('error:persistence', {
        error: err.message || 'localStorage write failed',
      });
    }
  }

  /**
   * Notifica todos os callbacks assinados no caminho exato de modificação.
   * @private
   * @param {string} changedPath - O caminho de estado modificado.
   * @param {any} value - O novo valor da ramificação.
   * @returns {void}
   */
  _notifyObservers(changedPath, value) {
    // 1. Notifica os observadores diretos do caminho exato
    const directCallbacks = this.observers.get(changedPath);
    if (directCallbacks) {
      directCallbacks.forEach((cb) => {
        try {
          cb(JSON.parse(JSON.stringify(value)));
        } catch (err) {
          logger.error(`Falha no observador para o caminho "${changedPath}":`, err);
        }
      });
    }

    // 2. Notifica observadores de caminhos superiores (ex: observa "inventory" e muda "inventory.creatina")
    this.observers.forEach((callbacks, path) => {
      if (changedPath.startsWith(path + '.') && path !== changedPath) {
        const newValue = this.getState(path);
        callbacks.forEach((cb) => {
          try {
            cb(newValue);
          } catch (err) {
            logger.error(`Falha no observador hierárquico para o caminho "${path}":`, err);
          }
        });
      }
    });
  }
}

export const stateManager = new StateManager();
