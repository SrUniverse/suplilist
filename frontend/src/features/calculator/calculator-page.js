/**
 * CalculatorPage — SupliList
 * Calculadora de dosagem com layout split: dados biométricos | resultado
 */

import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';
import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import dosageCalculator from '../calculator/dosage-calculator.js';
import { escapeHtml } from '../../utils/escape.js';
import { EVIDENCE_COLORS as EVIDENCE_COLORS_MAP } from '../../utils/evidence.js';
import { eventBus } from '../../core/event-bus.js';
import './calculator-page.css';

const ACTIVITY_LEVELS = [
  { value: 'sedentary',  label: 'Sedentário' },
  { value: 'moderate',   label: 'Moderado' },
  { value: 'active',     label: 'Ativo' },
  { value: 'athlete',    label: 'Atleta' },
];

const OBJECTIVES = [
  { value: 'bulk',      label: 'Bulk' },
  { value: 'cut',       label: 'Cut' },
  { value: 'strength',  label: 'Força' },
  { value: 'endurance', label: 'Resistência' },
  { value: 'general',   label: 'Saúde Geral' },
];

// Use canonical EVIDENCE_COLORS from utils (aliased; D falls back to C)
const EVIDENCE_COLORS = EVIDENCE_COLORS_MAP;

export default class CalculatorPage {
  constructor(container) {
    this.container = container;
    this._weight       = stateManager.user?.weight ?? 75;
    this._bodyfat      = stateManager.user?.bodyfat ?? null;
    this._activityLevel = 'moderate';
    this._objective    = stateManager.user?.objective ?? 'general';
    this._searchQuery  = '';
    this._selectedSupp = null;
    this._phase        = 'maintenance'; // 'maintenance' | 'loading'
    this._calcResult   = null;
    this._debounce     = null;
    this._allSupps     = SUPPLEMENTS_DB ?? [];
  }

  mount() {
    this._render();
    this._attachListeners();
  }

  unmount() {
    clearTimeout(this._debounce);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  _render() {
    this.container.innerHTML = `
      <div class="calcp-root">
        <div class="calcp-header">
          <h1 class="calcp-title">Calculadora</h1>
          <p class="calcp-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <div class="calcp-split">

          <!-- LEFT COLUMN -->
          <div class="calcp-left">

            <!-- Biometrics -->
            <div class="calcp-card" id="card-biometrics">
              <h2 class="calcp-card-title">Dados Biométricos</h2>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-weight">Peso (kg)</label>
                <input id="inp-weight" data-testid="calc-weight" class="calcp-input" type="number"
                  min="40" max="200" step="1" value="${this._weight}"
                  aria-label="Peso em quilogramas">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-bodyfat">Gordura Corporal (%) <span class="calcp-optional">opcional</span></label>
                <input id="inp-bodyfat" data-testid="calc-bodyfat" class="calcp-input" type="number"
                  min="5" max="50" step="0.5" value="${this._bodyfat ?? ''}"
                  placeholder="ex: 18" aria-label="Percentual de gordura corporal">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-activity">Nível de Atividade</label>
                <select id="sel-activity" data-testid="calc-activity" class="calcp-select" aria-label="Nível de atividade">
                  ${ACTIVITY_LEVELS.map(a => `
                    <option value="${a.value}"${this._activityLevel === a.value ? ' selected' : ''}>${a.label}</option>
                  `).join('')}
                </select>
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-objective">Objetivo</label>
                <select id="sel-objective" data-testid="calc-objective" class="calcp-select" aria-label="Objetivo principal">
                  ${OBJECTIVES.map(o => `
                    <option value="${o.value}"${this._objective === o.value ? ' selected' : ''}>${o.label}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Compound selection -->
            <div class="calcp-card" id="card-compounds">
              <h2 class="calcp-card-title">Seleção de Composto</h2>

              <div class="calcp-search-wrap">
                <span class="calcp-search-icon" aria-hidden="true">🔍</span>
                <input id="inp-search" data-testid="calc-search" class="calcp-search" type="search"
                  placeholder="Buscar suplemento..."
                  value="${this._searchQuery}"
                  aria-label="Buscar suplemento">
              </div>

              <div class="calcp-chips" id="supp-list" role="listbox" aria-label="Lista de suplementos">
                ${this._renderChips()}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN -->
          <div class="calcp-right">
            <div class="calcp-card calcp-result-card" id="result-card">
              ${this._renderResult()}
            </div>
          </div>

        </div>

        <p class="calcp-disclaimer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>As recomendações são baseadas em evidências científicas e no perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo.
        </p>
      </div>
    `;
  }

  _renderChips() {
    const q = this._searchQuery.toLowerCase().trim();
    const filtered = q
      ? this._allSupps.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.category ?? '').toLowerCase().includes(q)
        )
      : this._allSupps;

    if (!filtered.length) {
      return `<p class="calcp-empty-chips">Nenhum suplemento encontrado.</p>`;
    }

    return filtered.map(s => {
      const active = this._selectedSupp?.id === s.id;
      const ev = s.evidenceLevel ?? 'D';
      const _evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];
      return `
        <button class="calcp-chip${active ? ' calcp-chip--active' : ''}"
          role="option" aria-selected="${active}"
          data-supp-id="${escapeHtml(s.id)}" title="${escapeHtml(s.name)}" data-testid="calc-chip-${escapeHtml(s.id)}">
          <span class="calcp-chip-name">${escapeHtml(s.name)}</span>
          <span class="calcp-chip-cat">${escapeHtml(s.category ?? '')}</span>
          <span class="calcp-ev-badge calcp-ev-badge--${ev.toLowerCase()}">${ev}</span>
        </button>`;
    }).join('');
  }

  _renderResult() {
    if (!this._selectedSupp) {
      return `
        <div class="calcp-placeholder">
          <div class="calcp-placeholder-icon">⚗️</div>
          <p class="calcp-placeholder-title">Selecione um composto</p>
          <p class="calcp-placeholder-sub">Escolha um suplemento na lista ao lado para ver o resultado de dosagem personalizado.</p>
        </div>`;
    }

    const supp = this._selectedSupp;
    const result = this._calcResult;
    const ev = supp.evidenceLevel ?? 'D';
    const _evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];

    // Determine displayed dose
    let doseValue = '—';
    let doseUnit = supp.dosage?.unit ?? 'g';
    if (result) {
      doseValue = this._phase === 'loading'
        ? (result.loading ?? result.daily ?? '—')
        : (result.daily ?? result.maintenance ?? '—');
    } else if (supp.dosage) {
      doseValue = this._phase === 'loading'
        ? (supp.dosage.loading ?? supp.dosage.maintenance ?? '—')
        : (supp.dosage.maintenance ?? '—');
    }

    const rationale = result?.rationale ?? supp.dosage?.timing ?? '';
    const safety = supp.safetyScore ?? 0;
    const hasLoading = !!(supp.dosage?.loading || result?.loading);

    const inStack = (stateManager.stack ?? []).some(s => s.supplementId === supp.id);

    return `
      <!-- Result header -->
      <div class="calcp-result-header">
        <h2 class="calcp-result-title">Resultado da Otimização</h2>
        ${hasLoading ? `
          <div class="calcp-phase-toggle" role="group" aria-label="Fase de protocolo">
            <button class="calcp-phase-btn${this._phase === 'maintenance' ? ' calcp-phase-btn--active' : ''}"
              data-phase="maintenance">Manutenção</button>
            <button class="calcp-phase-btn${this._phase === 'loading' ? ' calcp-phase-btn--active' : ''}"
              data-phase="loading">Carga</button>
          </div>` : ''}
      </div>

      <!-- Big dose number -->
      <div class="calcp-dose-display">
        <span class="calcp-dose-value" data-testid="calc-result-value">${doseValue}</span>
        <span class="calcp-dose-unit">${doseUnit}/dia</span>
      </div>

      <!-- Validated label -->
      <div class="calcp-validated">
        <span class="calcp-validated-dot"></span>
        Protocolo Validado por Estudos Clínicos
      </div>

      <!-- Add to protocol button -->
      <button class="calcp-btn-add${inStack ? ' calcp-btn-add--in' : ''}"
        id="btn-add-protocol" data-supp-id="${escapeHtml(supp.id)}" data-supp-name="${escapeHtml(supp.name)}" data-testid="calc-add-protocol">
        ${inStack ? '✓ No meu Protocolo' : '+ Adicionar ao meu Protocolo'}
      </button>

      <hr class="calcp-sep">

      <!-- Scientific context card -->
      <div class="calcp-sci-card">
        <h3 class="calcp-sci-title">Contexto Científico</h3>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Racional da Dosagem</p>
          <p class="calcp-sci-text">${escapeHtml(rationale || 'Dosagem baseada em estudos clínicos controlados.')}</p>
        </div>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Nível de Evidência</p>
          <div class="calcp-progress-row">
            <span class="calcp-ev-badge calcp-ev-badge--${ev.toLowerCase()}">${ev}</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${ev === 'A' ? 100 : ev === 'B' ? 65 : 35}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill calcp-progress-fill--ev-${ev.toLowerCase()}" style="width:${ev === 'A' ? 100 : ev === 'B' ? 65 : 35}%"></div>
            </div>
          </div>
        </div>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Segurança</p>
          <div class="calcp-progress-row">
            <span class="calcp-sci-pct" style="color:${safety >= 90 ? 'var(--ev-a,#34D399)' : safety >= 70 ? 'var(--ev-b,#FBBF24)' : 'var(--color-error,#EF4444)'}">${safety}/100</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${safety}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill"
                style="width:${safety}%;background:${safety >= 90 ? 'var(--ev-a,#34D399)' : safety >= 70 ? 'var(--ev-b,#FBBF24)' : 'var(--color-error,#EF4444)'}"></div>
            </div>
          </div>
        </div>

        ${supp.dosage?.timing ? `
          <div class="calcp-sci-section">
            <p class="calcp-sci-label">Timing Recomendado</p>
            <p class="calcp-timing-text">⏱ ${escapeHtml(supp.dosage.timing)}</p>
          </div>` : ''}
      </div>
    `;
  }

  // ── Calculate ─────────────────────────────────────────────────────────────
  _calculate() {
    if (!this._selectedSupp) {
      this._calcResult = null;
      return;
    }
    const profile = {
      weight: this._weight,
      bodyfat: this._bodyfat,
      activityLevel: this._activityLevel,
      objective: this._objective,
      trainingFrequency: this._activityLevel === 'athlete' ? 6 : this._activityLevel === 'active' ? 5 : this._activityLevel === 'moderate' ? 3 : 2,
    };
    try {
      const res = dosageCalculator.calculate(this._selectedSupp, profile);
      this._calcResult = res ?? null;
    } catch (err) {
      logger.warn('[CalculatorPage] dosage calc error', err);
      this._calcResult = null;
    }
  }

  // ── Refresh right column only ─────────────────────────────────────────────
  _refreshResult() {
    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => {
      this._calculate();
      const card = this.container.querySelector('#result-card');
      if (card) card.innerHTML = this._renderResult();
      this._attachResultListeners();
    }, 80);
  }

  _refreshChips() {
    const list = this.container.querySelector('#supp-list');
    if (list) list.innerHTML = this._renderChips();
  }

  // ── Listeners ─────────────────────────────────────────────────────────────
  _attachListeners() {
    // Weight input
    this.container.querySelector('#inp-weight')?.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 40 && val <= 200) {
        this._weight = val;
        this._refreshResult();
      }
    });

    // Body fat input
    this.container.querySelector('#inp-bodyfat')?.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      this._bodyfat = isNaN(val) ? null : val;
      this._refreshResult();
    });

    // Activity level select
    this.container.querySelector('#sel-activity')?.addEventListener('change', e => {
      this._activityLevel = e.target.value;
      this._refreshResult();
    });

    // Objective select
    this.container.querySelector('#sel-objective')?.addEventListener('change', e => {
      this._objective = e.target.value;
      this._refreshResult();
    });

    // Supplement search
    this.container.querySelector('#inp-search')?.addEventListener('input', e => {
      this._searchQuery = e.target.value;
      this._refreshChips();
      this._attachChipListeners();
    });

    this._attachChipListeners();
    this._attachResultListeners();
  }

  _attachChipListeners() {
    this.container.querySelectorAll('[data-supp-id]').forEach(btn => {
      // Only chips in the list (not in result)
      if (!btn.classList.contains('calcp-chip')) return;
      btn.addEventListener('click', () => {
        const id = btn.dataset.suppId;
        if (this._selectedSupp?.id === id) {
          this._selectedSupp = null;
        } else {
          this._selectedSupp = this._allSupps.find(s => s.id === id) ?? null;
        }
        this._refreshChips();
        this._attachChipListeners();
        this._refreshResult();
      });
    });
  }

  _attachResultListeners() {
    // Phase toggle
    this.container.querySelectorAll('[data-phase]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._phase = btn.dataset.phase;
        const card = this.container.querySelector('#result-card');
        if (card) card.innerHTML = this._renderResult();
        this._attachResultListeners();
      });
    });

    // Add to protocol
    const addBtn = this.container.querySelector('#btn-add-protocol');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const suppId = addBtn.dataset.suppId;
        const suppName = addBtn.dataset.suppName;
        const inStack = (stateManager.stack ?? []).some(s => s.supplementId === suppId);
        if (inStack) {
          stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: suppId });
          eventBus.emit('toast:show', { message: `${suppName} removido do protocolo`, type: 'info' });
        } else {
          const supp = this._selectedSupp;
          const result = this._calcResult;
          const doseVal = this._phase === 'loading'
            ? (result?.loading ?? result?.daily ?? supp?.dosage?.loading ?? supp?.dosage?.maintenance ?? 0)
            : (result?.daily ?? supp?.dosage?.maintenance ?? 0);
          const unit = supp?.dosage?.unit ?? 'g';
          stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
            supplementId: suppId,
            name: suppName,
            dosage: doseVal,
            unit,
            frequency: 'diário',
          });
          eventBus.emit('toast:show', { message: `✓ ${suppName} adicionado ao protocolo!`, type: 'success' });
        }
        const card = this.container.querySelector('#result-card');
        if (card) card.innerHTML = this._renderResult();
        this._attachResultListeners();
      });
    }
  }

}
