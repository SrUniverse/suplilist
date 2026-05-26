/**
 * @fileoverview Componente de Fallback ErrorCard do SupliList v2.0.
 * Exibe um cartão visual amigável contendo informações sobre falhas ocorridas
 * durante o ciclo de renderização de componentes específicos.
 */

import { ErrorBoundary } from '../core/error-boundary.js';

/**
 * Cria a estrutura física do cartão de erro no DOM.
 * @private
 * @param {string} componentName - Nome do componente que falhou.
 * @param {Error | any} err - Detalhes do erro ocorrido.
 * @returns {HTMLElement} Div contendo a interface de erro formatada.
 */
function createCard(componentName, err) {
  const card = document.createElement('div');
  card.className = 'error-card bg-red-950/20 border border-red-500/30 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-3 w-full shadow-lg backdrop-blur-sm';

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
    // Ignora erros ao acessar objetos globais de ambiente
  }

  const detailMsg = isDev && err
    ? `<code class="block text-left text-red-300 font-mono text-xs mt-1 p-2 bg-red-950/40 rounded border border-red-500/10 overflow-x-auto max-w-full">${err.message || err}</code>`
    : '<p class="text-red-400/80 text-xs">Componente temporariamente indisponível.</p>';

  card.innerHTML = `
    <div class="text-2xl" aria-hidden="true">❌</div>
    <div class="flex flex-col gap-1 w-full">
      <h4 class="text-red-400 font-semibold text-sm">Falha no Componente: ${componentName}</h4>
      ${detailMsg}
    </div>
  `;

  return card;
}

// Wrappa o componente com a segurança de fronteira de erros
export const createErrorCard = ErrorBoundary.wrap(createCard, 'ErrorCard');
