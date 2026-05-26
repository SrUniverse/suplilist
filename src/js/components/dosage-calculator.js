/**
 * @fileoverview Controlador da Página da Calculadora de Dosagem Clínica (DosageCalculator) do SupliList v3.0.
 * Oferece cálculo reativo com base no peso e nível de atividade, busca preditiva de compostos
 * com Fuse.js, comutação de modos (Manutenção vs Carga) e contexto de integridade clínica.
 * 
 * @author SupliList Team
 * @version 3.0.0
 */

import Fuse from 'fuse.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { favoritesRepo } from '../features/favorites/favoritesRepo.js';
import { eventBus } from '../core/eventbus.js';
import { ErrorBoundary } from '../core/error-boundary.js';
import { logger } from '../utils/logger.js';
import { toast } from './toast.js';
// MED-05: corrigido — import saiu da raiz do projeto (../../../) para o local correto
import { calculateDosage } from '../utils/calculations.js';

/**
 * Utilitário interno para envio de eventos GA4 de forma resiliente contra falhas globais.
 * @private
 * @param {string} eventName - Nome do evento no Analytics.
 * @param {Object} params - Parâmetros e metadados.
 */
function _trackAnalytics(eventName, params) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export class DosageCalculatorPage {
  /**
   * Construtor do DosageCalculatorPage.
   * @param {HTMLElement | string} container - Contêiner DOM da página.
   */
  constructor(container) {
    /**
     * Elemento DOM contêiner da página.
     * @type {HTMLElement | null}
     */
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      logger.error('DosageCalculatorPage: O elemento de contêiner não foi localizado no DOM.');
      return;
    }

    /**
     * Peso do usuário em kg.
     * @type {number}
     */
    this.weight = 70; // Default weight to align with calculations math, placeholder remains 75

    /**
     * Percentual de gordura corporal.
     * @type {number | null}
     */
    this.bf = null;

    /**
     * Nível de atividade física do usuário.
     * @type {string}
     */
    this.activityLevel = 'Moderado'; // 'Sedentário' | 'Leve' | 'Moderado' | 'Intenso'

    /**
     * Modo ativo de dosagem.
     * @type {string}
     */
    this.activeMode = 'maintenance'; // 'maintenance' | 'load'

    /**
     * Suplemento selecionado ativo para cálculo.
     * @type {Object | null}
     */
    this.selectedSupplement = null;

    /**
     * Motor de busca Fuse.js.
     * @type {Fuse | null}
     */
    this.fuse = null;

    // Armazenamento para estado original da sidebar/topbar para limpeza
    this._origLogoText = '';
    this._origSubtitleText = '';
    this._origBreadcrumbHtml = '';
    this._origSidebarNavHtml = '';

    this.init();
  }

  /**
   * Inicializa o ciclo de vida da calculadora clínica injetando a casca, motores e ouvintes.
   * @returns {HTMLElement} Contêiner da página.
   */
  init() {
    const safeInit = ErrorBoundary.wrap(() => {
      this._setupHTMLCasca();
      this._initSearchEngine();
      this._setupInterfaceListeners();

      // Renderiza inicialmente a coluna da direita com o estado vazio
      this.render();

      // Aplica os overrides exclusivos do App Shell para a variante Pro/Clinical
      this._applySidebarOverrides();

      return this.container;
    }, 'DosageCalculatorPage');

    return safeInit() || this.container;
  }

  /**
   * Constrói e injeta a marcação visual da casca da calculadora SPA.
   * @private
   * @returns {void}
   */
  _setupHTMLCasca() {
    this.container.innerHTML = `
      <div class="dosage-page-container">
        
        <!-- Título e Subtítulo -->
        <div class="page-header">
          <h1 class="page-title">Calculadora de Dosagem Clínica</h1>
          <p class="page-subtitle">Ajuste sua suplementação com base em dados biométricos e evidência clínica.</p>
        </div>

        <!-- 2-Col Layout -->
        <div class="dosage-layout">
          
          <!-- LEFT COLUMN: Forms -->
          <div class="dosage-left">
            
            <!-- Painel 1: Dados Biométricos -->
            <div class="dosage-panel">
              <h3 class="dosage-panel-title">
                <span>📊</span> DADOS BIOMÉTRICOS
              </h3>
              
              <div class="dosage-form-group">
                <label for="biometric-weight">Peso (kg)</label>
                <input type="number" id="biometric-weight" min="40" max="200" placeholder="Ex: 75" value="70" class="dosage-input" />
              </div>

              <div class="dosage-form-group">
                <label for="biometric-bf">Gordura Corporal (%)</label>
                <input type="number" id="biometric-bf" min="5" max="60" placeholder="Ex: 15" class="dosage-input" />
              </div>

              <div class="dosage-form-group">
                <label for="biometric-activity">Nível de Atividade</label>
                <select id="biometric-activity" class="dosage-select">
                  <option value="Sedentário">Sedentário (Trabalho de escritório)</option>
                  <option value="Leve">Leve (Atividade diária suave)</option>
                  <option value="Moderado" selected>Moderado (Treino 3-4x/semana)</option>
                  <option value="Intenso">Intenso (Treino diário/Atleta)</option>
                </select>
              </div>
            </div>

            <!-- Painel 2: Seleção de Composto -->
            <div class="dosage-panel">
              <h3 class="dosage-panel-title">
                <span>🧪</span> SELEÇÃO DE COMPOSTO
              </h3>
              
              <div class="dosage-search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" id="dosage-search-input" placeholder="Digite o nome do composto (Ex: Creatina)" class="dosage-input dosage-search" autocomplete="off" />
                <!-- Autocomplete Dropdown Suggestions -->
                <div id="dosage-suggestions" class="dosage-suggestions-box hidden"></div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Optimization Result & Scientific Context -->
          <div class="dosage-right" id="calculator-right-column"></div>

        </div>

      </div>
    `;
  }

  /**
   * Aplica overrides estruturais exclusivas para esta página na Sidebar e na Topbar (Clinical/Pro Edition).
   * @private
   */
  _applySidebarOverrides() {
    // No-op to preserve standard sidebar nav structure
  }

  /**
   * Restaura os estados originais da barra lateral e cabeçalho ao sair da rota.
   * @private
   */
  _restoreSidebarOverrides() {
    // No-op to preserve standard sidebar nav structure
  }

  /**
   * Inicializa o buscador Fuse.js com base na coleção de suplementos ativa.
   * @private
   * @returns {void}
   */
  _initSearchEngine() {
    const supplements = supplementRepo.getAll() || [];
    this.fuse = new Fuse(supplements, {
      keys: ['name', 'category', 'aliases'],
      threshold: 0.4
    });
  }

  /**
   * Renderiza granularmente a coluna direita contendo os resultados matemáticos e context científicos.
   * @returns {void}
   */
  render() {
    const rightCol = this.container.querySelector('#calculator-right-column');
    if (!rightCol) return;

    if (!this.selectedSupplement) {
      rightCol.innerHTML = `
        <div class="dosage-empty-state">
          <span class="pulse-icon">⚡</span>
          <h3>Nenhum composto selecionado</h3>
          <p>Use o campo de busca à esquerda para selecionar um suplemento e calcular sua dosagem clínica recomendada de forma personalizada.</p>
        </div>
      `;
      return;
    }

    const supplement = this.selectedSupplement;
    const finalDose = calculateDosage(supplement, this.weight, this.activityLevel, this.activeMode);
    const doseStr = parseFloat(finalDose).toFixed(1);
    const unitSuffix = supplement.unit || 'g';

    rightCol.innerHTML = `
      <!-- Resultado da Otimização Panel -->
      <div class="dosage-panel result-panel glow-purple">
        <div class="panel-header-row">
          <h3 class="dosage-panel-title">
            <span>✅</span> Resultado da Otimização
          </h3>
          <!-- Toggle Mode -->
          <div class="mode-toggle-group">
            <button class="mode-toggle-btn ${this.activeMode === 'maintenance' ? 'active' : ''}" data-mode="maintenance">Manutenção</button>
            <button class="mode-toggle-btn ${this.activeMode === 'load' ? 'active' : ''}" data-mode="load">Carga</button>
          </div>
        </div>
        
        <!-- Dosagem Recomendada -->
        <div class="recommended-dose-container">
          <span class="dose-label">Dosagem Recomendada</span>
          <div id="stat-recommended-dose" class="dose-value-wrap">
            <span class="dose-num">${doseStr}</span>
            <span class="dose-unit">${unitSuffix}/dia</span>
          </div>
        </div>

        <div class="protocol-badge">
          <span>✅</span> Protocolo Validado por Estudos Clínicos
        </div>

        <button id="add-to-stack-btn" class="btn-primary w-full add-protocol-btn">
          + Adicionar ao meu Protocolo
        </button>
      </div>

      <!-- Contexto Científico Panel -->
      <div class="dosage-panel scientific-context-panel">
        <h3 class="dosage-panel-title">
          <span>📖</span> Contexto Científico
        </h3>
        
        <div class="scientific-grid">
          <!-- Racional da Dosagem sub-panel -->
          <div class="sub-panel">
            <span class="sub-panel-title">Racional da Dosagem</span>
            <p class="sub-panel-text clamp-text">
              ${supplement.mechanism || 'A dosagem de manutenção indicada é calculada clinicamente com base em biomateriais.'}
            </p>
          </div>

          <!-- Nível de Evidência & Segurança sub-panel -->
          <div class="sub-panel">
            <!-- Nível de Evidência -->
            <div class="progress-metric">
              <div class="metric-row">
                <span class="metric-label">Nível de Evidência</span>
                <span class="metric-value success">Grau ${supplement.evidenceLevel}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width:${supplement.evidenceLevel === 'A' ? '100%' : (supplement.evidenceLevel === 'B' ? '70%' : '40%')};"></div>
              </div>
            </div>

            <!-- Segurança Renal -->
            <div class="progress-metric">
              <div class="metric-row">
                <span class="metric-label">Segurança Renal</span>
                <span class="metric-value success">${this._getSafetyLabel(supplement.evidenceLevel)}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width:${supplement.evidenceLevel === 'A' ? '100%' : (supplement.evidenceLevel === 'B' ? '80%' : '50%')};"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contraindicações / Interações Perigosas -->
        ${(supplement.contraindications && supplement.contraindications.length > 0) ? `
          <div class="interactions-box">
            <span class="interactions-title">🚨 Interações e Riscos</span>
            <ul class="interactions-list">
              ${supplement.contraindications.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Conecta escutas do DOM e inputs reativos à lógica de cálculos.
   * @private
   * @returns {void}
   */
  _setupInterfaceListeners() {
    const weightInput = this.container.querySelector('#biometric-weight');
    const bfInput = this.container.querySelector('#biometric-bf');
    const activitySelect = this.container.querySelector('#biometric-activity');
    const searchInput = this.container.querySelector('#dosage-search-input');
    const suggestionsBox = this.container.querySelector('#dosage-suggestions');
    const rightCol = this.container.querySelector('#calculator-right-column');

    // 1. Escuta Peso
    if (weightInput) {
      weightInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        if (val < 40) val = 40;
        if (val > 200) val = 200;
        this.weight = val;
        this._calculateAndEmit();
      });
    }

    // 2. Escuta Gordura Corporal (Opcional)
    if (bfInput) {
      bfInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        if (val < 5) val = 5;
        if (val > 60) val = 60;
        this.bf = val;
      });

      // Aplica preenchimento automático caso o usuário desfocar o campo vazio
      bfInput.addEventListener('blur', (e) => {
        if (!e.target.value.trim()) {
          e.target.value = '15';
          this.bf = 15;
        }
      });
    }

    // 3. Escuta Nível de Atividade
    if (activitySelect) {
      activitySelect.addEventListener('change', (e) => {
        this.activityLevel = e.target.value;
        this._calculateAndEmit();
      });
    }

    // 4. Escuta busca preditiva e sugestões de autocomplete
    if (searchInput && suggestionsBox) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (!query) {
          suggestionsBox.innerHTML = '';
          suggestionsBox.classList.add('hidden');
          return;
        }

        const results = this.fuse.search(query).slice(0, 5);
        if (results.length === 0) {
          suggestionsBox.innerHTML = '<div class="dosage-suggestion-empty">Nenhum resultado encontrado.</div>';
          suggestionsBox.classList.remove('hidden');
          return;
        }

        suggestionsBox.innerHTML = results.map(r => `
          <button class="dosage-suggestion-btn" data-suggestion-id="${r.item.id}">
            <span class="suggestion-name">${r.item.name}</span>
            <span class="suggestion-badge">${r.item.category}</span>
          </button>
        `).join('');
        
        suggestionsBox.classList.remove('hidden');
      });

      // Ouvinte de clique de sugestão (Event Delegation)
      suggestionsBox.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-suggestion-id]');
        if (!btn) return;

        const id = btn.dataset.suggestionId;
        const supplement = supplementRepo.getById(id);
        if (supplement) {
          this.selectedSupplement = supplement;
          searchInput.value = supplement.name;
          suggestionsBox.classList.add('hidden');
          this.render();
          this._calculateAndEmit();
        }
      });

      // Fecha sugestões ao clicar fora do campo
      this._boundDocumentClick = (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
          suggestionsBox.classList.add('hidden');
        }
      };
      document.addEventListener('click', this._boundDocumentClick);
    }

    // 5. Escuta botões e cliques da coluna direita (Toggle e Add)
    if (rightCol) {
      rightCol.addEventListener('click', (e) => {
        const modeBtn = e.target.closest('.mode-toggle-btn');
        if (modeBtn) {
          e.preventDefault();
          this.activeMode = modeBtn.dataset.mode;
          this._calculateAndEmit();
          this.render(); // Redesenha para atualizar toggle e validação
        }

        const addBtn = e.target.closest('#add-to-stack-btn');
        if (addBtn) {
          e.preventDefault();
          this._handleAddToStack();
        }
      });
    }
  }

  /**
   * Executa a fórmula matemática e notifica EventBus e GA4.
   * @private
   * @returns {void}
   */
  _calculateAndEmit() {
    if (!this.selectedSupplement) return;

    const finalDose = calculateDosage(this.selectedSupplement, this.weight, this.activityLevel, this.activeMode);

    eventBus.emit('dosage:calculated', {
      supplementId: this.selectedSupplement.id,
      weight: this.weight,
      activityLevel: this.activityLevel,
      mode: this.activeMode,
      finalDose
    });

    _trackAnalytics('dosage_calculated', {
      supplement_id: this.selectedSupplement.id,
      weight: this.weight,
      activity_level: this.activityLevel
    });

    this.render();
  }

  /**
   * Adiciona o composto ao protocolo (favoritos) e dispara telemetrias e Toasts.
   * @private
   * @returns {void}
   */
  _handleAddToStack() {
    if (!this.selectedSupplement) return;

    const finalDose = calculateDosage(this.selectedSupplement, this.weight, this.activityLevel, this.activeMode);
    
    // Adiciona reativamente
    favoritesRepo.add(this.selectedSupplement.id);

    eventBus.emit('dosage:added:to:stack', {
      supplementId: this.selectedSupplement.id,
      dose: finalDose,
      unit: this.selectedSupplement.unit || 'g'
    });

    _trackAnalytics('dosage_added_to_stack', {
      supplement_id: this.selectedSupplement.id,
      dose: finalDose,
      unit: this.selectedSupplement.unit || 'g'
    });

    toast.show(`${this.selectedSupplement.name} adicionado ao seu protocolo com dose recomendada de ${finalDose}${this.selectedSupplement.unit || 'g'}!`, 'success');
  }

  /**
   * Retorna o texto formatado para a segurança.
   * @private
   * @param {string} level - Nível de evidência.
   * @returns {string} Rótulo de integridade.
   */
  _getSafetyLabel(level) {
    if (level === 'A') return 'Alta';
    if (level === 'B') return 'Moderada';
    return 'Baixa';
  }

  /**
   * Libera os escutadores do DOM, desfaz overrides de sidebar e desinscreve canais Pub/Sub.
   * @returns {void}
   */
  destroy() {
    this._restoreSidebarOverrides();
    if (this._boundDocumentClick) {
      document.removeEventListener('click', this._boundDocumentClick);
    }
    logger.info('DosageCalculatorPage destruído com sucesso.');
  }
}

/**
 * Factory SPA padrão-ouro para o PageRouter.
 * @param {HTMLElement | string} container - Contêiner de destino.
 * @returns {DosageCalculatorPage} Instância do controlador.
 */
export function createDosageCalculatorPage(container = '#page-content') {
  return new DosageCalculatorPage(container);
}
