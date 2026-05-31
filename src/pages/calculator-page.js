/**
 * CalculatorPage — SupliList
 * Calculadora de dosagem com layout split: dados biométricos | resultado
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import dosageCalculator from '../ai/dosage-calculator.js';
import { escapeHtml } from '../utils/escape.js';
import { EVIDENCE_COLORS as EVIDENCE_COLORS_MAP } from '../utils/evidence.js';
import { eventBus } from '../core/event-bus.js';

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
    this._attachStyles();
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
              <h2 class="calcp-card-title">⚗️ Dados Biométricos</h2>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-weight">Peso (kg)</label>
                <input id="inp-weight" class="calcp-input" type="number"
                  min="40" max="200" step="1" value="${this._weight}"
                  aria-label="Peso em quilogramas">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-bodyfat">Gordura Corporal (%) <span class="calcp-optional">opcional</span></label>
                <input id="inp-bodyfat" class="calcp-input" type="number"
                  min="5" max="50" step="0.5" value="${this._bodyfat ?? ''}"
                  placeholder="ex: 18" aria-label="Percentual de gordura corporal">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-activity">Nível de Atividade</label>
                <select id="sel-activity" class="calcp-select" aria-label="Nível de atividade">
                  ${ACTIVITY_LEVELS.map(a => `
                    <option value="${a.value}"${this._activityLevel === a.value ? ' selected' : ''}>${a.label}</option>
                  `).join('')}
                </select>
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-objective">Objetivo</label>
                <select id="sel-objective" class="calcp-select" aria-label="Objetivo principal">
                  ${OBJECTIVES.map(o => `
                    <option value="${o.value}"${this._objective === o.value ? ' selected' : ''}>${o.label}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Compound selection -->
            <div class="calcp-card" id="card-compounds">
              <h2 class="calcp-card-title">🔬 Seleção de Composto</h2>

              <div class="calcp-search-wrap">
                <span class="calcp-search-icon" aria-hidden="true">🔍</span>
                <input id="inp-search" class="calcp-search" type="search"
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
          ⚠️ As recomendações são baseadas em evidências científicas e no perfil informado.
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
      const evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];
      return `
        <button class="calcp-chip${active ? ' calcp-chip--active' : ''}"
          role="option" aria-selected="${active}"
          data-supp-id="${s.id}" title="${s.name}">
          <span class="calcp-chip-name">${s.name}</span>
          <span class="calcp-chip-cat">${s.category ?? ''}</span>
          <span class="calcp-ev-badge" style="background:${evStyle.bg};color:${evStyle.color}">${ev}</span>
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
    const evStyle = EVIDENCE_COLORS[ev] ?? EVIDENCE_COLORS['C'];

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
        <span class="calcp-dose-value">${doseValue}</span>
        <span class="calcp-dose-unit">${doseUnit}/dia</span>
      </div>

      <!-- Validated label -->
      <div class="calcp-validated">
        <span class="calcp-validated-dot"></span>
        Protocolo Validado por Estudos Clínicos
      </div>

      <!-- Add to protocol button -->
      <button class="calcp-btn-add${inStack ? ' calcp-btn-add--in' : ''}"
        id="btn-add-protocol" data-supp-id="${supp.id}" data-supp-name="${supp.name}">
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
            <span class="calcp-ev-badge" style="background:${evStyle.bg};color:${evStyle.color}">${ev}</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${ev === 'A' ? 100 : ev === 'B' ? 65 : 35}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill" style="width:${ev === 'A' ? 100 : ev === 'B' ? 65 : 35}%;background:${evStyle.color}"></div>
            </div>
          </div>
        </div>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Segurança</p>
          <div class="calcp-progress-row">
            <span class="calcp-sci-pct" style="color:${safety >= 90 ? '#22C55E' : safety >= 70 ? '#F59E0B' : '#EF4444'}">${safety}/100</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${safety}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill"
                style="width:${safety}%;background:${safety >= 90 ? '#22C55E' : safety >= 70 ? '#F59E0B' : '#EF4444'}"></div>
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
      console.warn('[CalculatorPage] dosage calc error', err);
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

  // ── Styles ────────────────────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('calcp-styles')) return;
    const style = document.createElement('style');
    style.id = 'calcp-styles';
    style.textContent = `
      /* Root */
      .calcp-root {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px 16px 100px;
        max-width: 1100px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
      }

      /* Header */
      .calcp-header { margin-bottom: 4px; }
      .calcp-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 28px;
        color: var(--color-text-primary);
        margin: 0 0 6px;
      }
      .calcp-subtitle {
        font-size: 14px;
        color: var(--color-text-muted);
        margin: 0;
      }

      /* Split layout */
      .calcp-split {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media (min-width: 768px) {
        .calcp-split {
          grid-template-columns: 380px 1fr;
          align-items: start;
        }
      }

      .calcp-left, .calcp-right {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Card */
      .calcp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 20px;
      }
      .calcp-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 18px;
      }

      /* Form fields */
      .calcp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .calcp-field:last-child { margin-bottom: 0; }
      .calcp-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: .5px;
      }
      .calcp-optional {
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        color: var(--color-text-muted);
        opacity: .6;
        font-size: 11px;
      }
      .calcp-input, .calcp-select {
        padding: 10px 14px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border-color 150ms;
        -webkit-appearance: none;
      }
      .calcp-input:focus, .calcp-select:focus {
        border-color: var(--color-brand);
        box-shadow: 0 0 0 3px rgba(124,58,237,.12);
      }
      .calcp-input::placeholder { color: var(--color-text-muted); }
      .calcp-select {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239A9A9A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
        cursor: pointer;
      }

      /* Search */
      .calcp-search-wrap {
        position: relative;
        margin-bottom: 12px;
      }
      .calcp-search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        pointer-events: none;
      }
      .calcp-search {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 14px 10px 36px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border-color 150ms;
      }
      .calcp-search:focus { border-color: var(--color-brand); }
      .calcp-search::placeholder { color: var(--color-text-muted); }

      /* Supplement chips */
      .calcp-chips {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 320px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--color-border) transparent;
      }
      .calcp-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        cursor: pointer;
        text-align: left;
        transition: border-color 150ms, background 150ms;
        font-family: 'Inter', sans-serif;
        width: 100%;
      }
      .calcp-chip:hover {
        border-color: var(--color-border-strong);
        background: var(--color-surface-hover);
      }
      .calcp-chip--active {
        border-color: var(--color-brand);
        background: var(--color-brand-muted);
      }
      .calcp-chip-name {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .calcp-chip-cat {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
      }
      .calcp-ev-badge {
        flex-shrink: 0;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 5px;
        text-transform: uppercase;
      }
      .calcp-empty-chips {
        font-size: 13px;
        color: var(--color-text-muted);
        text-align: center;
        padding: 20px 0;
        margin: 0;
      }

      /* Result card */
      .calcp-result-card { position: relative; }

      /* Placeholder */
      .calcp-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-height: 320px;
        text-align: center;
        padding: 32px 16px;
      }
      .calcp-placeholder-icon { font-size: 48px; opacity: .3; }
      .calcp-placeholder-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--color-text-secondary);
        margin: 0;
      }
      .calcp-placeholder-sub {
        font-size: 13px;
        color: var(--color-text-muted);
        margin: 0;
        max-width: 260px;
        line-height: 1.5;
      }

      /* Result header */
      .calcp-result-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 28px;
      }
      .calcp-result-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
      }

      /* Phase toggle */
      .calcp-phase-toggle {
        display: flex;
        gap: 4px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 3px;
      }
      .calcp-phase-btn {
        padding: 5px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: background 150ms, color 150ms;
      }
      .calcp-phase-btn--active {
        background: var(--color-brand);
        color: #fff;
      }

      /* Big dose display */
      .calcp-dose-display {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .calcp-dose-value {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 64px;
        line-height: 1;
        color: var(--color-brand);
        letter-spacing: -2px;
      }
      .calcp-dose-unit {
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text-muted);
        font-family: 'Inter', sans-serif;
      }

      /* Validated label */
      .calcp-validated {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-success);
        margin-bottom: 20px;
      }
      .calcp-validated-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success);
        flex-shrink: 0;
      }

      /* Add button */
      .calcp-btn-add {
        width: 100%;
        padding: 13px 20px;
        background: var(--color-brand);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: background 150ms, transform 100ms;
        margin-bottom: 20px;
      }
      .calcp-btn-add:hover { background: var(--color-brand-hover); }
      .calcp-btn-add:active { transform: scale(.98); }
      .calcp-btn-add--in {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,.25);
      }
      .calcp-btn-add--in:hover { background: rgba(34,197,94,.18); }

      /* Separator */
      .calcp-sep {
        border: none;
        border-top: 1px solid var(--color-border);
        margin: 0 0 20px;
      }

      /* Scientific card */
      .calcp-sci-card { display: flex; flex-direction: column; gap: 0; }
      .calcp-sci-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 16px;
      }
      .calcp-sci-section { margin-bottom: 16px; }
      .calcp-sci-section:last-child { margin-bottom: 0; }
      .calcp-sci-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: .5px;
        margin: 0 0 6px;
      }
      .calcp-sci-text {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.55;
      }
      .calcp-timing-text {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0;
        padding: 8px 12px;
        background: var(--color-bg-primary);
        border-radius: 8px;
        border-left: 3px solid var(--color-brand);
      }

      /* Progress bars */
      .calcp-progress-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .calcp-progress-bar {
        flex: 1;
        height: 6px;
        background: var(--color-border);
        border-radius: 999px;
        overflow: hidden;
      }
      .calcp-progress-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 500ms ease;
      }
      .calcp-sci-pct {
        font-size: 12px;
        font-weight: 700;
        font-family: 'Inter', sans-serif;
        min-width: 44px;
      }

      /* Disclaimer */
      .calcp-disclaimer {
        font-size: 12px;
        color: var(--color-text-muted);
        line-height: 1.6;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface-primary);
        margin: 0;
      }

      /* Mobile tweaks */
      @media (max-width: 767px) {
        .calcp-root { padding: 16px 12px 100px; }
        .calcp-title { font-size: 22px; }
        .calcp-dose-value { font-size: 48px; }
        .calcp-chips { max-height: 240px; }
      }
    `;
    document.head.appendChild(style);
  }
}
