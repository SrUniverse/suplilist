/**
 * @fileoverview Protetor de robustez da UI do SupliList v2.0.
 * Envolve renderizadores de componentes em blocos try/catch isolados,
 * impedindo que falhas em componentes específicos derrubem a aplicação inteira.
 */

import { logger } from '../utils/logger.js';
import { eventBus } from './eventbus.js';

export class ErrorBoundary {
  /**
   * Envolve (wrappa) uma função com tratamento automático de erros.
   * BUG-02: expectElement agora é false por padrão — componentes que retornam
   * objetos não-HTMLElement (ex: { destroy() {} }) não disparam falso-positivo.
   *
   * @param {Function} renderFn - Função que gera e retorna um HTMLElement ou objeto de ciclo de vida.
   * @param {string} componentName - Nome do componente para logs e rastreamento.
   * @param {{ expectElement?: boolean }} [options] - Opções de validação.
   * @returns {Function} Função encapsulada e protegida contra exceções.
   */
  static wrap(renderFn, componentName = 'UnknownComponent', { expectElement = false } = {}) {
    return function (...args) {
      try {
        const result = renderFn(...args);

        // Validação opcional: avisa se esperava HTMLElement mas não recebeu
        if (expectElement && !(result instanceof HTMLElement)) {
          logger.warn(`[ErrorBoundary] "${componentName}" não retornou HTMLElement. Tipo recebido: ${typeof result}`);
        }

        return result;
      } catch (err) {
        logger.error(`[ErrorBoundary] Falha crítica de renderização no componente "${componentName}":`, err);

        // Notifica o sistema sobre a falha local do componente
        eventBus.emit('component:error', {
          componentName,
          error: err.message || 'Render error',
          stack: err.stack,
          timestamp: Date.now(),
        });

        // Retorna o elemento visual amigável contendo o erro
        return ErrorBoundary._renderErrorState(componentName, err);
      }
    };
  }

  /**
   * Gera o elemento DOM visual padrão exibido em caso de falha de renderização.
   * @private
   * @param {string} componentName - Nome do componente que falhou.
   * @param {Error} err - Objeto de erro capturado na exceção.
   * @returns {HTMLElement} Div formatada contendo o aviso do erro.
   */
  static _renderErrorState(componentName, err) {
    const card = document.createElement('div');
    card.className = 'error-card bg-red-950/20 border border-red-500/30 rounded-xl p-4 text-center my-2 shadow-sm backdrop-blur-sm';

    // Determina se exibe os detalhes do erro ou mensagem genérica de prod
    let isDev = true;
    try {
      if (
        typeof process !== 'undefined' &&
        process.env &&
        process.env.NODE_ENV === 'production'
      ) {
        isDev = false;
      }
    } catch {
      // Caso de navegação do browser
    }

    const detailMsg = isDev
      ? `<code class="block text-left text-red-300 font-mono text-xs mt-2 p-2 bg-red-950/40 rounded border border-red-500/10 overflow-x-auto max-w-full">${err.message || err}</code>`
      : '<p class="text-red-400/80 text-xs mt-1">Componente temporariamente indisponível.</p>';

    card.innerHTML = `
      <div class="flex items-center justify-center gap-2 text-red-400 font-semibold text-sm">
        <span>⚠️</span>
        <span>Erro em: ${componentName}</span>
      </div>
      ${detailMsg}
    `;

    return card;
  }
}
