/**
 * @fileoverview Repositório para persistência, gestão e efeitos colaterais das preferências do usuário (Settings).
 * Aplica modificações de acessibilidade (tema escuro/claro), unidades métricas e notificações globais.
 */

import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_STATE } from '../../types/state.schema.js';

class SettingsRepository {
  /**
   * Construtor da classe. Inicializa aplicando o tema atual.
   */
  constructor() {
    // Escuta alterações de estado geral para reaplicar o tema caso o estado mude/importe
    eventBus.on('state:changed', ({ path, value }) => {
      if (path === 'settings.theme') {
        this.applyTheme(value);
      }
    });

    eventBus.on('state:imported', ({ state }) => {
      if (state && state.settings && state.settings.theme) {
        this.applyTheme(state.settings.theme);
      }
    });

    // Acessa o tema inicial de forma segura
    try {
      const initialTheme = this.getSetting('theme') || 'dark';
      this.applyTheme(initialTheme);
    } catch {
      // Ignora falhas síncronas de DOM na inicialização do Node
    }
  }

  /**
   * Obtém o valor de uma chave específica de preferência do usuário.
   * @param {'theme' | 'sortBy' | 'units' | 'notificationsEnabled'} key - Nome da propriedade.
   * @returns {any} O valor configurado.
   */
  getSetting(key) {
    return stateManager.getState(`settings.${key}`);
  }

  /**
   * Salva a preferência de usuário e dispara efeitos colaterais associados.
   * @param {'theme' | 'sortBy' | 'units' | 'notificationsEnabled'} key - Nome da propriedade a atualizar.
   * @param {any} value - Novo valor a ser configurado.
   * @returns {void}
   * @throws {Error} Lança exceção se a chave for inválida ou o valor rejeitado pelo schema de estado.
   */
  setSetting(key, value) {
    const validKeys = ['theme', 'sortBy', 'units', 'notificationsEnabled'];
    if (!validKeys.includes(key)) {
      throw new Error(`SettingsRepository: Chave de configuração inválida "${key}".`);
    }

    stateManager.setState(`settings.${key}`, value);

    eventBus.emit('settings:changed', { key, value });

    // Aplicação imediata de efeitos colaterais de UI
    if (key === 'theme') {
      this.applyTheme(value);
    }
  }

  /**
   * Obtém o objeto contendo todas as configurações vigentes do usuário.
   * @returns {{ theme: 'dark'|'light', sortBy: string, units: 'metric'|'imperial', notificationsEnabled: boolean }} Objeto completo de configurações.
   */
  getAll() {
    return stateManager.getState('settings') || { ...DEFAULT_STATE.settings };
  }

  /**
   * Restaura todas as preferências para os padrões estruturais de fábrica.
   * @returns {void}
   */
  reset() {
    const defaults = { ...DEFAULT_STATE.settings };
    stateManager.setState('settings', defaults);

    Object.entries(defaults).forEach(([key, value]) => {
      eventBus.emit('settings:changed', { key, value });
    });

    this.applyTheme(defaults.theme);
  }

  /**
   * Aplica fisicamente a mudança do tema (escuro/claro) alterando as classes no documento HTML.
   * @param {string} theme - Nome do tema selecionado ('dark' ou 'light').
   * @returns {void}
   */
  applyTheme(theme) {
    if (typeof document === 'undefined') return;

    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
      logger.info(`Tema de acessibilidade aplicado: ${theme}`);
    } catch (err) {
      logger.warn('Não foi possível manipular classes do documentElement no ambiente atual:', err.message);
    }
  }
}

export const settingsRepo = new SettingsRepository();
