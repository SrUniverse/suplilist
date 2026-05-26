/**
 * @fileoverview Controlador do Input de Busca do SupliList v2.0.
 * Gerencia a busca textual por relevância com debounce nativo de 300ms,
 * limpeza em ESC e sincronismo reativo do contador de resultados.
 */

import { supplementService } from '../features/supplements/supplementService.js';
import { eventBus } from '../core/eventbus.js';
import { searchState } from './search-state.js';
import { logger } from '../utils/logger.js';

/**
 * Inicializa o input de busca, acopla ouvintes de digitação (debounced) e eventos reativos.
 * @param {string} inputSelector - Seletor CSS para o elemento input.
 * @returns {void}
 */
export function initSearchInput(inputSelector) {
  if (typeof document === 'undefined') return;

  const input = document.querySelector(inputSelector);
  if (!input) {
    logger.warn(`initSearchInput: Elemento "${inputSelector}" não encontrado no DOM.`);
    return;
  }

  // 1. Configura atributos visuais e acessibilidade premium do input
  input.placeholder = 'Buscar suplementos...';
  input.setAttribute('aria-label', 'Buscar suplementos');

  // Adiciona classes premium do Tailwind para uniformização estética
  input.classList.add(
    'bg-zinc-900',
    'border',
    'border-zinc-800',
    'hover:border-zinc-700',
    'focus:border-purple-500',
    'focus:ring-1',
    'focus:ring-purple-500',
    'rounded-xl',
    'px-4',
    'py-2.5',
    'text-sm',
    'text-zinc-100',
    'w-full',
    'focus:outline-none',
    'transition-all'
  );

  // Injeta ou garante o ícone de busca 🔍 ao lado/dentro do container se possível
  const parent = input.parentElement;
  if (parent && !parent.querySelector('.search-icon-decor')) {
    const decorEl = document.createElement('span');
    decorEl.className = 'search-icon-decor text-zinc-500 text-sm mr-2 select-none pointer-events-none hidden sm:inline';
    decorEl.textContent = '🔍';
    parent.insertBefore(decorEl, input);
  }

  // 2. Mecanismo de Debounce de 300ms nativo
  let debounceTimeout = null;

  const handleSearch = () => {
    searchState.query = input.value.trim();
    supplementService.search({
      query: searchState.query,
      filters: searchState.filters,
      sortBy: searchState.sortBy
    });
  };

  input.addEventListener('input', () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      handleSearch();
    }, 300);
  });

  // 3. Limpeza instantânea da consulta ao pressionar ESC
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      handleSearch();
      input.blur();
    }
  });

  // 4. Ouvinte reativo no EventBus para atualizar o contador de itens encontrados
  eventBus.on('supplements:filtered', ({ count }) => {
    const countEl = document.querySelector('#resultado-count') || document.querySelector('#results-count');
    if (countEl) {
      countEl.textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
    }
  });
}
