/**
 * @fileoverview Controlador do Modal de Comparação lado-a-lado (ComparatorModal) do SupliList v2.0.
 * Renderiza uma tabela de critérios de custo, evidência, dosagens e objetivos,
 * destacando o vencedor por custo e exibindo alertas de interações sinérgicas/antagônicas.
 */

import { Modal } from './modal.js';
import { comparatorService } from '../features/comparator/comparatorService.js';
import { ErrorBoundary } from '../core/error-boundary.js';
import { formatPrice } from '../utils/formatters.js';
import { eventBus } from '../core/eventbus.js';
import { toast } from './toast.js';

/**
 * Cria a interface DOM da tabela comparativa e seções de interação.
 * @private
 * @param {string[]} supplementIds - Lista de slugs dos suplementos a comparar.
 * @param {Modal} modalInstance - Referência do modal para fechamento se necessário.
 * @returns {HTMLElement} Elemento DOM principal contendo a comparação.
 */
function _createComparatorContent(supplementIds, modalInstance) {
  const result = comparatorService.compare(supplementIds);
  const { supplements, matrix, winners, interactions } = result;

  const contentEl = document.createElement('div');
  contentEl.className = 'comparator-modal flex flex-col gap-6 text-zinc-300';

  // 1. Tabela Comparativa Lado a Lado
  const headersHtml = supplements
    .map(
      (s) => `
      <th class="p-3 font-extrabold text-zinc-100 text-center min-w-[120px]">
        <div class="flex flex-col items-center gap-2">
          <img src="${s.image}" class="w-12 h-12 object-cover rounded-xl border border-zinc-800 shadow-sm" onerror="this.src='assets/icons/placeholder.webp'">
          <span class="leading-tight text-xs block truncate max-w-[110px]" title="${s.name}">${s.name}</span>
        </div>
      </th>
    `
    )
    .join('');

  const costRowHtml = matrix.costPerDose
    .map(
      (c) => `
      <td class="p-3 text-center font-bold text-zinc-100 text-xs">${formatPrice(c)}</td>
    `
    )
    .join('');

  const evidenceRowHtml = matrix.evidenceLevel
    .map(
      (el) => `
      <td class="p-3 text-center text-xs">
        <span class="px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
          el === 'A'
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            : el === 'B'
            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
        }">${el}</span>
      </td>
    `
    )
    .join('');

  const doseRowHtml = matrix.defaultDose
    .map(
      (d) => `
      <td class="p-3 text-center text-zinc-300 font-semibold text-xs">${d}</td>
    `
    )
    .join('');

  const cheapestRowHtml = matrix.cheapestPrice
    .map(
      (cp) => `
      <td class="p-3 text-center text-emerald-400 font-extrabold text-xs">${cp}</td>
    `
    )
    .join('');

  const goalsRowHtml = matrix.goals
    .map(
      (g) => `
      <td class="p-3 text-center text-zinc-400 text-xs leading-normal">
        <div class="flex flex-wrap gap-1 justify-center">
          ${g
            .map(
              (obj) =>
                `<span class="inline-block bg-zinc-850 text-[9px] text-zinc-300 px-1.5 py-0.5 rounded font-semibold border border-zinc-800/60">${obj}</span>`
            )
            .join('')}
        </div>
      </td>
    `
    )
    .join('');

  const footerWinnersHtml = supplements
    .map((s) => {
      const isWinner = s.id === winners.cost;
      return `
      <td class="p-3 text-center">
        ${
          isWinner
            ? `
          <span class="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse shadow-sm inline-flex items-center gap-1">
            <span>🏆</span>
            <span>Vencedor</span>
          </span>
        `
            : `
          <span class="text-zinc-600 font-semibold text-xs">-</span>
        `
        }
      </td>
    `;
    })
    .join('');

  // 2. Interações Medicamentosas e Sinergias
  let interactionsHtml = '';
  if (interactions && interactions.length > 0) {
    interactionsHtml = `
      <div class="interactions-section bg-zinc-950/30 border border-zinc-800/60 rounded-2xl p-4 shadow-sm">
        <h4 class="text-zinc-200 font-bold text-xs uppercase tracking-wider border-b border-zinc-800/60 pb-2 mb-3 flex items-center gap-2">
          <span>⚠️</span>
          <span>Interações & Sinergias</span>
        </h4>
        <div class="flex flex-col gap-3">
          ${interactions
            .map((item) => {
              const pairName = item.pair.join(' + ');
              return `
              <div class="p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl">
                <span class="text-xs font-bold text-zinc-200 block mb-1.5">${pairName}</span>
                ${item.rules
                  .map(
                    (rule) => `
                  <p class="text-xs leading-relaxed ${
                    rule.type === 'synergistic' ? 'text-emerald-400' : 'text-amber-400'
                  }">
                    <strong>${rule.type === 'synergistic' ? '⚡ Sinergia:' : '⚠️ Alerta:'}</strong> 
                    ${rule.note || rule.description || ''}
                  </p>
                `
                  )
                  .join('')}
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  // 3. Monta a estrutura semântica do Modal de Comparação
  contentEl.innerHTML = `
    <div class="overflow-x-auto bg-zinc-950/20 border border-zinc-800/60 rounded-2xl shadow-sm">
      <table class="w-full text-left border-collapse table-auto">
        <thead>
          <tr class="border-b border-zinc-800/80 bg-zinc-950/40">
            <th class="p-3 font-bold text-zinc-400 text-xs">Campo</th>
            ${headersHtml}
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-800/40">
          <tr class="hover:bg-zinc-900/10">
            <td class="p-3 font-semibold text-zinc-400 text-xs">Custo/dose</td>
            ${costRowHtml}
          </tr>
          <tr class="hover:bg-zinc-900/10">
            <td class="p-3 font-semibold text-zinc-400 text-xs">Evidência</td>
            ${evidenceRowHtml}
          </tr>
          <tr class="hover:bg-zinc-900/10">
            <td class="p-3 font-semibold text-zinc-400 text-xs">Dose</td>
            ${doseRowHtml}
          </tr>
          <tr class="hover:bg-zinc-900/10">
            <td class="p-3 font-semibold text-zinc-400 text-xs">Menor preço</td>
            ${cheapestRowHtml}
          </tr>
          <tr class="hover:bg-zinc-900/10">
            <td class="p-3 font-semibold text-zinc-400 text-xs">Objetivos</td>
            ${goalsRowHtml}
          </tr>
        </tbody>
        <tfoot class="border-t border-zinc-800 bg-zinc-950/30 font-bold">
          <tr>
            <td class="p-3 text-zinc-300 text-xs">🏆 Melhor custo</td>
            ${footerWinnersHtml}
          </tr>
        </tfoot>
      </table>
    </div>

    ${interactionsHtml}

    <div class="flex justify-end mt-2">
      <button id="btn-close-comparator" class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors shadow-sm focus:outline-none">
        Fechar Janela
      </button>
    </div>
  `;

  // Listener para o botão fechar
  const closeBtn = contentEl.querySelector('#btn-close-comparator');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modalInstance.close();
    });
  }

  return contentEl;
}

// Wrappa o gerador de conteúdo DOM com a barreira de erro ErrorBoundary
const createComparatorContent = ErrorBoundary.wrap(_createComparatorContent, 'ComparatorContent');

/**
 * Abre e gerencia o modal de comparação lado-a-lado.
 * @param {string[]} supplementIds - Lista de slugs dos suplementos a comparar.
 * @returns {void}
 */
export function openComparator(supplementIds) {
  if (!Array.isArray(supplementIds) || supplementIds.length < 2) {
    toast.show('Adicione pelo menos 2 suplementos para comparar.', 'warning');
    return;
  }

  try {
    const modal = new Modal('Comparação de Suplementos', '');
    
    // Substitui o corpo com o elemento DOM dotado de listeners
    const contentEl = createComparatorContent(supplementIds, modal);
    modal._content = contentEl;
    
    modal.open();
  } catch (err) {
    toast.show('Erro ao abrir o comparador.', 'danger');
  }
}

// Ouvinte automático reativo via EventBus
eventBus.on('comparator:open', ({ supplementIds }) => {
  if (Array.isArray(supplementIds)) {
    openComparator(supplementIds);
  }
});
