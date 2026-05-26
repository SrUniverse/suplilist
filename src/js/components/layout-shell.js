/**
 * @fileoverview Controlador reativo e interativo do Layout Bento (LayoutShell) do SupliList v2.0.
 * Renderiza reativamente o painel de Inventário ('Minha Stack') e opera a Calculadora de Dosagem
 * Inteligente com análises de interações e dosagem personalizada por peso corporal.
 */

import { inventoryRepo } from '../features/inventory/inventoryRepo.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { eventBus } from '../core/eventbus.js';
import { formatDaysLeft, formatDose } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';
import { toast } from './toast.js';

class LayoutShellController {
  /**
   * Construtor do painel do Layout Bento.
   */
  constructor() {
    this.inventoryListContainer = document.getElementById('inventory-list');
    this.calcWeightInput = document.getElementById('calc-weight');
    this.calcSupplementSelect = document.getElementById('calc-supplement');
    this.calcDoseValue = document.getElementById('calc-dose-value');
    this.calcDoseNote = document.getElementById('calc-dose-note');
    this.calcWarningArea = document.getElementById('calc-warning-area');
    this.calcWarningText = document.getElementById('calc-warning-text');

    this._cleanupFns = [];
  }

  /**
   * Inicializa o painel do Bento Grid, renderiza listas e acopla eventos reativos.
   * @returns {void}
   */
  init() {
    this.renderInventory();
    this.setupCalculator();
    this._subscribeToEvents();
    this._setupCalculatorListeners();
    logger.info('LayoutShell Bento Grid inicializado.');
  }

  /**
   * Renderiza reativamente a lista física de suplementos no estoque (Minha Stack).
   * @returns {void}
   */
  renderInventory() {
    if (!this.inventoryListContainer) return;

    const items = inventoryRepo.getAll();
    const itemArray = Object.entries(items);

    if (itemArray.length === 0) {
      this.inventoryListContainer.innerHTML = `
        <div class="py-6 text-center flex flex-col items-center justify-center gap-1.5 text-zinc-500 animate-fade-in">
          <span class="text-2xl">📦</span>
          <p class="text-xs font-semibold text-zinc-400">Stack vazia</p>
          <p class="text-[10px] text-zinc-500 max-w-[180px]">Atualize o estoque nos detalhes de qualquer suplemento.</p>
        </div>
      `;
      return;
    }

    this.inventoryListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    itemArray.forEach(([id, item]) => {
      const { qty, daysLeft, supplement } = item;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 p-3 bg-zinc-950/30 border border-zinc-800/40 rounded-2xl hover:border-zinc-800 transition-colors animate-fade-in group relative';
      row.setAttribute('data-inventory-id', id);

      // Determina as cores do status de estoque
      let statusBadgeClass = 'bg-zinc-800/40 text-zinc-400 border-zinc-800/20';
      if (daysLeft !== null) {
        if (daysLeft <= 7) {
          statusBadgeClass = 'bg-red-500/10 text-red-400 border-red-500/25';
        } else if (daysLeft <= 15) {
          statusBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
        } else {
          statusBadgeClass = 'bg-purple-500/10 text-purple-300 border-purple-500/25';
        }
      }

      row.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${supplement.image}" alt="" class="w-8 h-8 object-cover rounded-lg border border-zinc-800/80 flex-shrink-0" onerror="this.src='assets/icons/placeholder.webp'">
          <div class="flex flex-col min-w-0 leading-tight">
            <span class="text-xs font-bold text-zinc-200 truncate pr-4" title="${supplement.name}">${supplement.name}</span>
            <span class="text-[9px] text-zinc-500 font-semibold mt-0.5">${qty}${supplement.unit} em estoque</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}">
            ${daysLeft !== null ? `${Math.ceil(daysLeft)} dias` : 'Esgotado'}
          </span>
          <button data-action="remove-stock" data-id="${id}" class="text-zinc-600 hover:text-red-400 transition-colors text-xs p-1 focus:outline-none" title="Remover monitoramento" aria-label="Remover ${supplement.name} do estoque">
            🗑️
          </button>
        </div>
      `;

      // Evento de remover estoque
      const removeBtn = row.querySelector('[data-action="remove-stock"]');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          inventoryRepo.remove(id);
          toast.show(`Monitoramento de ${supplement.name} removido.`, 'success');
        });
      }

      fragment.appendChild(row);
    });

    this.inventoryListContainer.appendChild(fragment);
  }

  /**
   * Popula dinamicamente a Calculadora de Dosagem com suplementos cadastrados.
   * @returns {void}
   */
  setupCalculator() {
    if (!this.calcSupplementSelect) return;

    const supplements = supplementRepo.getAll();

    this.calcSupplementSelect.innerHTML = supplements
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join('');

    this.calculatePersonalizedDose();
  }

  /**
   * Calcula a dosagem individual baseada no peso do usuário e regras do domínio.
   * @returns {void}
   */
  calculatePersonalizedDose() {
    if (!this.calcWeightInput || !this.calcSupplementSelect || !this.calcDoseValue) return;

    const weight = parseFloat(this.calcWeightInput.value);
    const supplementId = this.calcSupplementSelect.value;

    if (isNaN(weight) || weight < 30 || weight > 200 || !supplementId) {
      this.calcDoseValue.textContent = '---';
      this.calcDoseNote.textContent = 'Por favor, insira um peso corporal válido entre 30 e 200 kg.';
      if (this.calcWarningArea) this.calcWarningArea.classList.add('hidden');
      return;
    }

    const supplement = supplementRepo.getById(supplementId);
    if (!supplement) return;

    let personalizedDose = 0;
    let note = '';

    // Multiplicadores baseados em dosagem científica real por kg corporal
    switch (supplementId) {
      case 'creatina-monohidratada':
      case 'creatina-creapure':
        personalizedDose = 0.07 * weight; // 0.07g por kg
        note = `Com base no seu peso de ${weight}kg, a dose recomendada de manutenção de Creatina é de ${personalizedDose.toFixed(1)}g diários. Consuma todos os dias.`;
        break;
      case 'whey-protein-concentrado':
      case 'whey-protein-isolado':
        personalizedDose = 0.4 * weight; // 0.4g por kg para dose pós-treino recomendada
        note = `Para maximizar a síntese proteica pós-treino com ${weight}kg, consuma cerca de ${personalizedDose.toFixed(1)}g de Whey nesta refeição.`;
        break;
      case 'cafeina-anidra':
        personalizedDose = 3.0 * weight; // 3.0mg por kg
        note = `Dose pré-treino otimizada de Cafeína estimada em ${personalizedDose.toFixed(0)}mg para estímulo neuro-muscular. Cuidado com o horário de consumo.`;
        break;
      default:
        // Escala padrão baseada na dose padrão do suplemento para 70kg de base
        personalizedDose = supplement.defaultDose * (weight / 70);
        note = `Dosagem padrão adaptada para ${weight}kg de peso corporal. Consulte orientação nutricional.`;
        break;
    }

    const formattedDose = formatDose(personalizedDose, supplement.unit);
    this.calcDoseValue.textContent = `${formattedDose} / dia`;
    this.calcDoseNote.textContent = note;

    // Processa os alertas de interações conhecidas do suplemento
    if (this.calcWarningArea && this.calcWarningText) {
      if (supplement.interactions && supplement.interactions.length > 0) {
        this.calcWarningText.innerHTML = supplement.interactions
          .map((i) => `<span class="block mb-1">• ${i}</span>`)
          .join('');
        this.calcWarningArea.classList.remove('hidden');
      } else {
        this.calcWarningArea.classList.add('hidden');
      }
    }
  }

  /**
   * Associa os escutadores de mudança para o peso e dropdown de suplemento.
   * @private
   * @returns {void}
   */
  _setupCalculatorListeners() {
    if (this.calcWeightInput) {
      this.calcWeightInput.addEventListener('input', () => this.calculatePersonalizedDose());
    }

    if (this.calcSupplementSelect) {
      this.calcSupplementSelect.addEventListener('change', () => this.calculatePersonalizedDose());
    }
  }

  /**
   * Inscreve o painel nos canais reativos do EventBus.
   * @private
   * @returns {void}
   */
  _subscribeToEvents() {
    // Escuta atualizações de estoque físicas
    const unsubInventory = eventBus.on('inventory:updated', () => {
      this.renderInventory();
    });

    // Se o estado completo do app mudar ou for carregado/importado, re-renderiza
    const unsubState = eventBus.on('state:changed', ({ path }) => {
      if (path && path.startsWith('inventory')) {
        this.renderInventory();
      }
    });

    const unsubImport = eventBus.on('state:imported', () => {
      this.renderInventory();
      this.setupCalculator();
    });

    this._cleanupFns.push(unsubInventory, unsubState, unsubImport);
  }

  /**
   * Limpa referências e destrói o controlador.
   * @returns {void}
   */
  destroy() {
    this._cleanupFns.forEach((fn) => fn());
    this._cleanupFns = [];
    logger.info('LayoutShell Bento Grid destruído.');
  }
}

export const layoutShell = new LayoutShellController();
