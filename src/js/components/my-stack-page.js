/**
 * @fileoverview Controlador da Página "Meu Protocolo" (MyStackPage) do SupliList v3.0.
 * Gerencia a lista de suplementos ativos da stack do usuário, calculando custos reativos,
 * integrando status visuais de estoque (🟢/🟡/🔴), remoção e reordenação (Drag-and-drop),
 * além de exportação em JSON, compartilhamento via link codificado e impressão em formato A4.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import { stateManager } from '../core/state-manager.js';
import { eventBus } from '../core/eventbus.js';
import { ErrorBoundary } from '../core/error-boundary.js';
import { logger } from '../utils/logger.js';
import { toast } from './toast.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { inventoryRepo } from '../features/inventory/inventoryRepo.js';

/**
 * Utilitário interno para envio de eventos GA4 de forma resiliente contra falhas globais.
 * @private
 * @param {string} eventName - Nome do evento no Analytics.
 * @param {Object} [params] - Parâmetros e metadados.
 */
function _trackAnalytics(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export class MyStackPage {
  /**
   * Construtor da página MyStackPage.
   * @param {HTMLElement | string} container - Contêiner DOM onde a página será montada.
   */
  constructor(container) {
    /**
     * Elemento DOM contêiner da página.
     * @type {HTMLElement | null}
     */
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      logger.error('MyStackPage: O elemento de contêiner não foi localizado no DOM.');
      return;
    }

    /**
     * Lista de callbacks de desinscrição do EventBus e DOM.
     * @private
     * @type {Function[]}
     */
    this._cleanupFns = [];

    // Vincula o escopo do objeto aos métodos ouvintes
    this._handleDosageAdded = this._handleDosageAdded.bind(this);
    this._handleDragStart = this._handleDragStart.bind(this);
    this._handleDragOver = this._handleDragOver.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);
    this._handleDrop = this._handleDrop.bind(this);

    this.init();
  }

  /**
   * Inicializa o ciclo de vida da página de stack.
   * @returns {HTMLElement} Contêiner da página.
   */
  init() {
    const safeInit = ErrorBoundary.wrap(() => {
      this._ensureStackInitialized();
      this._setupHTMLCasca();
      this._setupInterfaceListeners();
      this._subscribeToEvents();
      this._checkShareLink();

      // Força a primeira renderização do painel e itens
      this.render();

      // Dispara a telemetria do GA4 de visualização de página
      _trackAnalytics('stack_page_view');

      return this.container;
    }, 'MyStackPage');

    return safeInit() || this.container;
  }

  /**
   * Garante a inicialização da stack com os 3 itens padrão solicitados, caso esteja vazia.
   * Também sincroniza as quantidades no inventário para que os badges fiquem em conformidade.
   * @private
   * @returns {void}
   */
  _ensureStackInitialized() {
    let stack = stateManager.getState('stack');
    if (!stack || !Array.isArray(stack) || stack.length === 0) {
      stack = [
        {
          supplementId: 'creatina-mono',
          supplementName: 'Creatina Monohidratada',
          dose: 5,
          unit: 'g',
          frequency: 'daily',
          monthlyCost: 89.90,
          estimatedDaysRemaining: 10
        },
        {
          supplementId: 'ashwagandha-ksm-66',
          supplementName: 'Ashwagandha KSM-66',
          dose: 600,
          unit: 'mg',
          frequency: 'daily',
          monthlyCost: 120.00,
          estimatedDaysRemaining: 28
        },
        {
          supplementId: 'omega-3-epa-dha',
          supplementName: 'Ômega-3 EPA+DHA',
          dose: 2,
          unit: 'g',
          frequency: 'daily',
          monthlyCost: 45.00,
          estimatedDaysRemaining: 2
        }
      ];
      stateManager.setState('stack', stack);

      // Sincroniza inventário
      const inventory = stateManager.getState('inventory') || {};
      let inventoryChanged = false;

      stack.forEach(item => {
        if (!inventory[item.supplementId]) {
          const supp = supplementRepo.getById(item.supplementId);
          const defDose = supp ? supp.defaultDose : item.dose;
          // qty = estimatedDaysRemaining * defaultDose
          inventory[item.supplementId] = {
            qty: item.estimatedDaysRemaining * defDose,
            purchaseDate: new Date().toISOString().split('T')[0]
          };
          inventoryChanged = true;
        }
      });

      if (inventoryChanged) {
        stateManager.setState('inventory', inventory);
        eventBus.emit('inventory:updated', {});
      }
    }
  }

  /**
   * Verifica se há dados compartilhados codificados na URL e executa a importação.
   * @private
   * @returns {void}
   */
  _checkShareLink() {
    try {
      const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
      const shareData = urlParams.get('share');
      if (shareData) {
        const decoded = JSON.parse(atob(decodeURIComponent(shareData)));
        if (Array.isArray(decoded) && decoded.length > 0) {
          stateManager.setState('stack', decoded);

          // Sincroniza com o inventário
          const inventory = stateManager.getState('inventory') || {};
          decoded.forEach(item => {
            const supp = supplementRepo.getById(item.supplementId);
            const defDose = supp ? supp.defaultDose : item.dose;
            inventory[item.supplementId] = {
              qty: item.estimatedDaysRemaining * defDose,
              purchaseDate: new Date().toISOString().split('T')[0]
            };
          });
          stateManager.setState('inventory', inventory);

          eventBus.emit('stack:updated', decoded);
          eventBus.emit('inventory:updated', {});
          toast.show('Protocolo importado via link com sucesso!', 'success');

          // Limpa o parâmetro da URL para não repetir
          const cleanHash = window.location.hash.split('?')[0];
          window.history.replaceState({}, document.title, window.location.pathname + cleanHash);
        }
      }
    } catch (err) {
      logger.error('MyStackPage: Falha ao decodificar link de compartilhamento.', err);
      toast.show('Falha ao importar protocolo compartilhado. Link inválido.', 'error');
    }
  }

  /**
   * Constrói e injeta a marcação da casca estática da página de stack.
   * @private
   * @returns {void}
   */
  _setupHTMLCasca() {
    this.container.innerHTML = `
      <div class="my-stack-page-container flex flex-col gap-6 w-full animate-fade-in text-zinc-100 pb-12">
        
        <!-- Breadcrumb e Titulo -->
        <div class="flex flex-col gap-1 w-full no-print">
          <nav class="flex items-center gap-1.5 text-xs text-zinc-400 font-medium" aria-label="Breadcrumb">
            <span class="cursor-pointer hover:text-purple-400 transition-colors" onclick="window.location.hash='#/home'">Home</span>
            <span class="text-zinc-600">/</span>
            <span class="text-zinc-100 font-semibold">Meu Protocolo</span>
          </nav>
        </div>

        <!-- Titulo de Impressão (Oculto em tela) -->
        <div class="print-only hidden print:block mb-6 border-b border-zinc-300 pb-4">
          <h1 class="text-2xl font-bold text-zinc-900">SupliList — Relatório de Protocolo</h1>
          <p class="text-xs text-zinc-500">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>

        <!-- Bento Layout: Total Mensal & Ações Rápidas -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-stretch">
          
          <!-- Card de Totalização -->
          <div class="md:col-span-8 bg-zinc-900/20 border border-zinc-800/60 p-6 rounded-3xl flex flex-col justify-between gap-4 relative overflow-hidden shadow-lg">
            <div class="flex flex-col gap-1.5 z-10">
              <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custo do Protocolo</span>
              <h2 class="text-3xl font-extrabold text-zinc-100 tracking-tight" id="stack-total-cost">R$ 0,00</h2>
              <p class="text-xs text-zinc-400 leading-normal">Total Mensal calculado reativamente com base na dose personalizada e no melhor preço dos marketplaces.</p>
            </div>
            
            <div class="absolute -right-12 -bottom-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          <!-- Ação da Calculadora -->
          <div class="md:col-span-4 bg-zinc-900/20 border border-zinc-800/60 p-6 rounded-3xl flex flex-col justify-center gap-3 shadow-lg no-print">
            <h3 class="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧬</span> Otimização Clínica
            </h3>
            <p class="text-[11px] text-zinc-500 leading-normal">Calcule a dose certa adaptada ao seu peso corporal e nível de atividade física usando estudos científicos.</p>
            <button id="stack-go-calculator" class="btn-primary w-full text-xs font-bold py-2.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_12px_rgba(124,58,237,0.5)]">
              + Adicionar da Calculadora
            </button>
          </div>

        </div>

        <!-- Lista de Itens do Protocolo -->
        <div class="flex flex-col gap-4 w-full">
          <div class="flex items-center justify-between border-b border-zinc-800/60 pb-2 no-print">
            <h3 class="text-sm font-extrabold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Compostos Ativos <span class="text-xs text-zinc-500 font-medium normal-case">(Arraste para reordenar)</span>
            </h3>
          </div>

          <!-- Container da Lista de Itens -->
          <div id="stack-items-list" class="flex flex-col gap-3 w-full"></div>
        </div>

        <!-- Botões de Ações do Rodapé -->
        <div class="flex flex-wrap items-center gap-3 w-full border-t border-zinc-800/60 pt-6 no-print">
          <button id="stack-export-btn" class="btn-outline text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-zinc-800/40 transition-all font-semibold">
            <span>📥</span> Exportar Stack
          </button>
          <button id="stack-share-btn" class="btn-outline text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-zinc-800/40 transition-all font-semibold">
            <span>🔗</span> Compartilhar
          </button>
          <button id="stack-print-btn" class="btn-outline text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-zinc-800/40 transition-all font-semibold">
            <span>🖨️</span> Imprimir
          </button>
        </div>

      </div>
    `;

    // Adiciona estilos específicos para Drag-and-drop e layouts de impressão
    const styleSheet = document.createElement('style');
    styleSheet.id = 'my-stack-styles';
    styleSheet.textContent = `
      .stack-item {
        transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        cursor: grab;
      }
      .stack-item:active {
        cursor: grabbing;
      }
      .stack-item.dragging {
        opacity: 0.4;
        transform: scale(0.98);
        border-color: var(--brand);
        box-shadow: 0 0 16px rgba(124, 58, 237, 0.25);
      }
      .status-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 9999px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .status-badge.green {
        background-color: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
      .status-badge.yellow {
        background-color: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.2);
        color: #fbbf24;
      }
      .status-badge.red {
        background-color: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #f87171;
      }
      
      @media print {
        body {
          background: #ffffff !important;
          color: #111827 !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .my-stack-page-container {
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .stack-item {
          border: 1px solid #e5e7eb !important;
          background: #f9fafb !important;
          color: #111827 !important;
          box-shadow: none !important;
          page-break-inside: avoid;
          border-radius: 8px !important;
          padding: 12px 16px !important;
          margin-bottom: 8px !important;
        }
        .status-badge {
          border: 1px solid #d1d5db !important;
          background: #f3f4f6 !important;
          color: #374151 !important;
        }
        h2 {
          color: #111827 !important;
        }
        p {
          color: #4b5563 !important;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    this._cleanupFns.push(() => {
      const el = document.getElementById('my-stack-styles');
      if (el) el.remove();
    });
  }

  /**
   * Renderiza a listagem de suplementos carregados reativamente do estado global.
   * @returns {void}
   */
  render() {
    const listContainer = this.container.querySelector('#stack-items-list');
    const totalCostEl = this.container.querySelector('#stack-total-cost');
    if (!listContainer) return;

    const stackItems = stateManager.getState('stack') || [];

    // Se estiver vazio, renderiza o empty state premium
    if (stackItems.length === 0) {
      listContainer.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 border border-zinc-800/40 rounded-3xl bg-zinc-900/10 text-center animate-fade-in w-full">
          <span class="text-4xl">⚡</span>
          <p class="text-sm font-semibold text-zinc-400">Nenhum suplemento ativo</p>
          <p class="text-xs text-zinc-500 max-w-xs mb-4">Adicione compostos utilizando a nossa calculadora de dosagem baseada em ciência.</p>
          <button id="stack-empty-go-calc" class="btn-outline text-xs px-4 py-2 rounded-xl transition-all hover:bg-zinc-800 font-bold">
            Ir para Calculadora
          </button>
        </div>
      `;

      if (totalCostEl) totalCostEl.textContent = 'R$ 0,00';

      const emptyCalcBtn = listContainer.querySelector('#stack-empty-go-calc');
      if (emptyCalcBtn) {
        emptyCalcBtn.addEventListener('click', () => {
          window.location.hash = '#/dosage';
        });
      }
      return;
    }

    // Calcula custo total mensal dynamically
    const total = stackItems.reduce((acc, curr) => acc + (Number(curr.monthlyCost) || 0), 0);
    if (totalCostEl) {
      totalCostEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    // Renderiza itens
    listContainer.innerHTML = stackItems.map((item, index) => {
      const days = item.estimatedDaysRemaining;
      
      // Classificação das 3 faixas de criticidade do status de estoque
      let badgeClass = 'green';
      let badgeEmoji = '🟢';
      let badgeText = `Em estoque (${days} dias)`;

      if (days < 5) {
        badgeClass = 'red';
        badgeEmoji = '🔴';
        badgeText = `Faltando (${days} dia${days !== 1 ? 's' : ''})`;
      } else if (days <= 30) {
        badgeClass = 'yellow';
        badgeEmoji = '🟡';
        badgeText = `Acabando em ${days} dias`;
      }

      return `
        <div 
          class="stack-item flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 shadow-md hover:border-zinc-700/60"
          draggable="true"
          data-supplement-id="${item.supplementId}"
          data-index="${index}"
        >
          <!-- Dados Básicos -->
          <div class="flex items-start gap-3">
            <div class="flex flex-col gap-1">
              <h4 class="text-sm font-extrabold text-zinc-100 leading-snug">${item.supplementName}</h4>
              <span class="text-xs text-zinc-400 font-semibold">
                ${item.dose}${item.unit}/dia → R$ ${Number(item.monthlyCost).toFixed(2).replace('.', ',')}/mês
              </span>
            </div>
          </div>

          <!-- Badges de Estoque e Ação Remover -->
          <div class="flex items-center gap-4 justify-between sm:justify-end">
            <span class="status-badge ${badgeClass}">
              <span>${badgeEmoji}</span>
              <span>${badgeText}</span>
            </span>
            
            <button 
              class="btn-remove text-[11px] text-red-400 font-bold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 transition-all focus:outline-none no-print"
              data-action="remove"
              data-id="${item.supplementId}"
              type="button"
            >
              Remover
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Re-anexa listeners do drag and drop
    this._attachDragAndDropListeners();
  }

  /**
   * Registra escutas de eventos em botões e fluxos programáticos da página.
   * @private
   * @returns {void}
   */
  _setupInterfaceListeners() {
    // 1. Botão "+ Adicionar da Calculadora" do painel de controle
    const goCalcBtn = this.container.querySelector('#stack-go-calculator');
    if (goCalcBtn) {
      goCalcBtn.addEventListener('click', () => {
        window.location.hash = '#/dosage';
      });
    }

    // 2. Event delegation para botão "Remover" dos cards
    const listContainer = this.container.querySelector('#stack-items-list');
    if (listContainer) {
      listContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-action="remove"]');
        if (removeBtn) {
          e.preventDefault();
          const id = removeBtn.dataset.id;
          this._handleRemoveItem(id);
        }
      });
    }

    // 3. Botão "Exportar Stack"
    const exportBtn = this.container.querySelector('#stack-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleExportStack();
      });
    }

    // 4. Botão "Compartilhar"
    const shareBtn = this.container.querySelector('#stack-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleShareStack();
      });
    }

    // 5. Botão "Imprimir"
    const printBtn = this.container.querySelector('#stack-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }
  }

  /**
   * Conecta as escutas reativas do barramento reativo global (EventBus).
   * @private
   * @returns {void}
   */
  _subscribeToEvents() {
    this._cleanupFns.push(eventBus.on('dosage:added:to:stack', this._handleDosageAdded));
    this._cleanupFns.push(eventBus.on('stack:updated', () => this.render()));
    this._cleanupFns.push(eventBus.on('inventory:updated', () => this.render()));
  }

  /**
   * Handler de captura reativa disparado ao adicionar um composto via calculadora clínica.
   * @private
   * @param {{ supplementId: string, dose: number, unit: string }} payload - Parâmetros do evento.
   * @returns {void}
   */
  _handleDosageAdded({ supplementId, dose, unit }) {
    try {
      const supplement = supplementRepo.getById(supplementId);
      if (!supplement) {
        logger.warn(`MyStackPage: Suplemento "${supplementId}" não localizado na base ativa.`);
        return;
      }

      const currentStack = stateManager.getState('stack') || [];
      const existingIdx = currentStack.findIndex(item => item.supplementId === supplementId);

      // Calcula custo proporcional personalizado
      const factor = supplement.defaultDose > 0 ? (dose / supplement.defaultDose) : 1;
      const monthlyCost = Math.round(supplement.costPerDose * factor * 30 * 100) / 100;

      // Define dias restantes (se já havia estoque, preserva, senão inicia com 30 dias)
      let estimatedDaysRemaining = 30;
      const existingInventory = inventoryRepo.getDaysLeft(supplementId);
      if (existingInventory !== null) {
        estimatedDaysRemaining = existingInventory;
      } else if (existingIdx !== -1) {
        estimatedDaysRemaining = currentStack[existingIdx].estimatedDaysRemaining;
      }

      const newItem = {
        supplementId,
        supplementName: supplement.name,
        dose,
        unit,
        frequency: 'daily',
        monthlyCost,
        estimatedDaysRemaining
      };

      const updatedStack = [...currentStack];
      if (existingIdx !== -1) {
        updatedStack[existingIdx] = newItem;
      } else {
        updatedStack.push(newItem);
      }

      // Atualiza estado e sincroniza inventário físico
      stateManager.setState('stack', updatedStack);
      
      const inventory = stateManager.getState('inventory') || {};
      const defDose = supplement.defaultDose || dose;
      inventory[supplementId] = {
        qty: estimatedDaysRemaining * defDose,
        purchaseDate: inventory[supplementId]?.purchaseDate || new Date().toISOString().split('T')[0]
      };
      stateManager.setState('inventory', inventory);

      eventBus.emit('stack:updated', updatedStack);
      eventBus.emit('inventory:updated', {});
    } catch (err) {
      logger.error('MyStackPage: Falha catastrófica ao adicionar composto reativo à stack.', err);
    }
  }

  /**
   * Remove um item da stack atualizado no estado centralizado.
   * @private
   * @param {string} id - ID do suplemento a ser removido.
   * @returns {void}
   */
  _handleRemoveItem(id) {
    if (!id) return;

    try {
      const currentStack = stateManager.getState('stack') || [];
      const updated = currentStack.filter(item => item.supplementId !== id);

      stateManager.setState('stack', updated);

      // Opcional: remove do inventário também para manter badges alinhados
      inventoryRepo.remove(id);

      eventBus.emit('stack:item:removed', { supplementId: id });
      eventBus.emit('stack:updated', updated);

      // Dispara Analytics GA4
      _trackAnalytics('stack_item_removed', { supplement_id: id });
      
      toast.show('Composto removido do protocolo com sucesso.', 'info');
    } catch (err) {
      logger.error(`MyStackPage: Falha ao remover composto "${id}".`, err);
    }
  }

  /**
   * Exporta a stack em arquivo físico no formato JSON de conformidade clínica.
   * @private
   * @returns {void}
   */
  _handleExportStack() {
    try {
      const items = stateManager.getState('stack') || [];
      const total = items.reduce((acc, curr) => acc + (Number(curr.monthlyCost) || 0), 0);

      const payload = {
        exportDate: new Date().toISOString(),
        items,
        totalMonthlyCost: Math.round(total * 100) / 100,
        notes: 'Meu protocolo de suplementação esportiva'
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `suplilist-stack-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      eventBus.emit('stack:exported', payload);
      _trackAnalytics('stack_exported');

      toast.show('Arquivo JSON do protocolo exportado para download!', 'success');
    } catch (err) {
      logger.error('MyStackPage: Falha ao exportar arquivo de stack.', err);
      toast.show('Erro ao exportar o protocolo.', 'error');
    }
  }

  /**
   * Codifica a stack em base64 e copia um link de compartilhamento para a área de transferência.
   * @private
   * @returns {void}
   */
  _handleShareStack() {
    try {
      const items = stateManager.getState('stack') || [];
      if (items.length === 0) {
        toast.show('Adicione compostos antes de compartilhar o protocolo!', 'warning');
        return;
      }

      const rawBase64 = btoa(JSON.stringify(items));
      const shareUrl = `${window.location.origin}${window.location.pathname}#/my-stack?share=${encodeURIComponent(rawBase64)}`;

      // Tenta API de clipboard moderna com fallback
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            toast.show('Link de compartilhamento copiado!', 'success');
          })
          .catch(() => this._fallbackCopy(shareUrl));
      } else {
        this._fallbackCopy(shareUrl);
      }
    } catch (err) {
      logger.error('MyStackPage: Falha ao gerar link de compartilhamento.', err);
    }
  }

  /**
   * Fallback de cópia de texto legado para navegadores incompatíveis com Clipboard API.
   * @private
   * @param {string} text - Link gerado.
   * @returns {void}
   */
  _fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      toast.show('Link de compartilhamento copiado (Legacy)!', 'success');
    } catch (e) {
      logger.error('MyStackPage: Clipboard copy falhou integralmente.', e);
      toast.show('Copie o link manualmente: ' + text, 'info', 8000);
    }
    document.body.removeChild(input);
  }

  // ══════════════════════════════════════════════════════════════
  // DRAG AND DROP REORDENATION IMPLEMENTATION
  // ══════════════════════════════════════════════════════════════

  /**
   * Vincula os listeners de drag-and-drop nos elementos de card recém-montados no DOM.
   * @private
   * @returns {void}
   */
  _attachDragAndDropListeners() {
    const cards = this.container.querySelectorAll('.stack-item');
    cards.forEach(card => {
      card.addEventListener('dragstart', this._handleDragStart);
      card.addEventListener('dragend', this._handleDragEnd);
    });

    const listContainer = this.container.querySelector('#stack-items-list');
    if (listContainer) {
      listContainer.addEventListener('dragover', this._handleDragOver);
      listContainer.addEventListener('drop', this._handleDrop);
    }
  }

  /**
   * Inicia o arraste do elemento.
   * @private
   * @param {DragEvent} e - Evento dragstart.
   * @returns {void}
   */
  _handleDragStart(e) {
    const card = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.getAttribute('data-supplement-id'));
    card.classList.add('dragging');
  }

  /**
   * Finaliza o arraste limpando opacidades.
   * @private
   * @param {DragEvent} e - Evento dragend.
   * @returns {void}
   */
  _handleDragEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('dragging');
  }

  /**
   * Monitora elemento que paira por cima organizando as posições virtuais.
   * @private
   * @param {DragEvent} e - Evento dragover.
   * @returns {void}
   */
  _handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const listContainer = this.container.querySelector('#stack-items-list');
    const draggingCard = listContainer.querySelector('.dragging');
    if (!draggingCard) return;

    const siblings = [...listContainer.querySelectorAll('.stack-item:not(.dragging)')];
    
    // Encontra o próximo irmão baseado na posição central vertical do cursor
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      return offset < 0;
    });

    listContainer.insertBefore(draggingCard, nextSibling);
  }

  /**
   * Finaliza a reordenação atualizando a persistência e disparando eventos.
   * @private
   * @param {DragEvent} e - Evento drop.
   * @returns {void}
   */
  _handleDrop(e) {
    e.preventDefault();
    
    try {
      const listContainer = this.container.querySelector('#stack-items-list');
      const cards = [...listContainer.querySelectorAll('.stack-item')];
      
      const newOrder = cards.map(c => c.getAttribute('data-supplement-id')).filter(Boolean);
      const currentStack = stateManager.getState('stack') || [];

      // Reconstrói o array sob a nova indexação ordenada do DOM
      const reorderedStack = newOrder.map(id => {
        return currentStack.find(item => item.supplementId === id);
      }).filter(Boolean);

      stateManager.setState('stack', reorderedStack);
      eventBus.emit('stack:updated', reorderedStack);

      toast.show('Protocolo reordenado com sucesso.', 'info');
    } catch (err) {
      logger.error('MyStackPage: Falha ao salvar reordenação de stack.', err);
    }
  }

  /**
   * Libera memória e exclui ouvintes ao desmontar a página SPA.
   * @returns {void}
   */
  destroy() {
    this._cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (err) {
        // Ignora erros isolados de liberação
      }
    });
    this._cleanupFns = [];

    const listContainer = this.container.querySelector('#stack-items-list');
    if (listContainer) {
      listContainer.removeEventListener('dragover', this._handleDragOver);
      listContainer.removeEventListener('drop', this._handleDrop);
    }

    logger.info('MyStackPage destruído com sucesso.');
  }
}

/**
 * Factory SPA padrão-ouro da página de Stack para o PageRouter.
 * @param {HTMLElement | string} container - Contêiner de destino.
 * @returns {MyStackPage} Instância do controlador.
 */
export function createMyStackPage(container = '#page-content') {
  return new MyStackPage(container);
}
