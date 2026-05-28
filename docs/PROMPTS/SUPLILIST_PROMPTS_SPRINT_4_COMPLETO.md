# **SPRINT 4: Core Features — PROMPTS COMPLETOS**

> Padrão industrial. Código real + checklists + deliverables. Cole direto no Antigravity.

---

## **PROMPT 4.1: DosageCalculatorPage — COMPLETO**

```markdown
You are building the Dosage Calculator page for SupliList v4.0.

## CONTEXT

The DosageCalculatorPage is the scientific heart of SupliList.
Users input their biometrics and get personalized dosage recommendations
backed by the StackRecommender algorithm.

Design philosophy:
- Feels like a real clinical tool (not a toy)
- Inputs are clear and accessible (sliders + number inputs)
- Results are immediate (real-time recalculation, no "Submit" needed)
- Scientific rationale shown for every recommendation
- Safety limits always visible (no surprises)

---

## TASK 1: CREATE /src/pages/dosage-calculator-page.js

```javascript
/**
 * DosageCalculatorPage v4.0 — SupliList
 * Calculadora de dosagem personalizada por biometria real
 */

import sm, { ACTIONS } from '../state/state-manager.js';
import StackRecommender from '../ai/stack-recommender.js';
import DosageCalculator from '../ai/dosage-calculator.js';

export class DosageCalculatorPage {
  constructor(container) {
    this.container  = container;
    this._profile   = this._loadProfile();
    this._results   = [];
    this._debounce  = null;
    this._recommender = new StackRecommender(sm.state.supplements);
  }

  mount() {
    this._render();
    this._attachListeners();
    this._calculate(); // Initial calculation with default values
  }

  unmount() {}

  // ── Load saved profile from StateManager ──
  _loadProfile() {
    const u = sm.state.user;
    return {
      objective:          u.objective          ?? 'general',
      weight:             u.weight             ?? 75,
      height:             u.height             ?? 175,
      age:                u.age                ?? 28,
      trainingAge:        u.trainingAge        ?? 2,
      trainingFrequency:  u.trainingFrequency  ?? 4,
      budget:             u.budget             ?? 250,
      restrictions:       u.restrictions       ?? [],
    };
  }

  _render() {
    this.container.innerHTML = `
      <div class="calc-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">⚗️ Calculadora</h1>
          <p class="page-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <!-- ── Profile Form ── -->
        <section class="profile-form card" aria-label="Perfil biométrico">
          <h2 class="section-title">Seu Perfil</h2>

          <!-- Objetivo -->
          <div class="form-group">
            <label class="form-label" for="objective">🎯 Objetivo Principal</label>
            <div class="objective-pills" role="radiogroup" aria-label="Objetivo">
              ${[
                { value: 'bulk',      label: '📈 Bulk',      desc: 'Ganho de massa' },
                { value: 'cut',       label: '🔥 Cut',       desc: 'Perda de gordura' },
                { value: 'strength',  label: '💪 Força',     desc: 'Força máxima' },
                { value: 'endurance', label: '🏃 Resistência', desc: 'Cardio/endurance' },
                { value: 'general',   label: '🌿 Saúde',     desc: 'Bem-estar geral' },
              ].map(o => `
                <button
                  class="objective-pill ${this._profile.objective === o.value ? 'active' : ''}"
                  data-value="${o.value}"
                  data-field="objective"
                  role="radio"
                  aria-checked="${this._profile.objective === o.value}"
                  aria-label="${o.desc}"
                  title="${o.desc}"
                >${o.label}</button>
              `).join('')}
            </div>
          </div>

          <!-- Peso + Altura (row) -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="weight">⚖️ Peso</label>
              <div class="input-with-unit">
                <input
                  type="range"
                  id="weight-slider"
                  class="range-slider"
                  min="40" max="150" step="1"
                  value="${this._profile.weight}"
                  data-field="weight"
                  aria-label="Peso em kg"
                >
                <div class="range-value-row">
                  <input
                    type="number"
                    id="weight"
                    class="number-input"
                    min="40" max="150"
                    value="${this._profile.weight}"
                    data-field="weight"
                    aria-label="Peso"
                  >
                  <span class="unit-label">kg</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="height">📏 Altura</label>
              <div class="input-with-unit">
                <input
                  type="range"
                  id="height-slider"
                  class="range-slider"
                  min="140" max="220" step="1"
                  value="${this._profile.height}"
                  data-field="height"
                  aria-label="Altura em cm"
                >
                <div class="range-value-row">
                  <input
                    type="number"
                    id="height"
                    class="number-input"
                    min="140" max="220"
                    value="${this._profile.height}"
                    data-field="height"
                    aria-label="Altura"
                  >
                  <span class="unit-label">cm</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Idade + Anos de treino (row) -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="age">🎂 Idade</label>
              <div class="input-with-unit">
                <input
                  type="range"
                  id="age-slider"
                  class="range-slider"
                  min="15" max="75" step="1"
                  value="${this._profile.age}"
                  data-field="age"
                  aria-label="Idade em anos"
                >
                <div class="range-value-row">
                  <input
                    type="number"
                    id="age"
                    class="number-input"
                    min="15" max="75"
                    value="${this._profile.age}"
                    data-field="age"
                    aria-label="Idade"
                  >
                  <span class="unit-label">anos</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="trainingAge">🏋️ Anos treinando</label>
              <div class="input-with-unit">
                <input
                  type="range"
                  id="trainingAge-slider"
                  class="range-slider"
                  min="0" max="20" step="0.5"
                  value="${this._profile.trainingAge}"
                  data-field="trainingAge"
                  aria-label="Anos de treinamento"
                >
                <div class="range-value-row">
                  <input
                    type="number"
                    id="trainingAge"
                    class="number-input"
                    min="0" max="20" step="0.5"
                    value="${this._profile.trainingAge}"
                    data-field="trainingAge"
                    aria-label="Anos de treino"
                  >
                  <span class="unit-label">anos</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Frequência + Budget (row) -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="trainingFrequency">📅 Dias de treino/semana</label>
              <div class="frequency-pills" role="radiogroup" aria-label="Frequência de treino">
                ${[2, 3, 4, 5, 6, 7].map(d => `
                  <button
                    class="freq-pill ${this._profile.trainingFrequency === d ? 'active' : ''}"
                    data-value="${d}"
                    data-field="trainingFrequency"
                    role="radio"
                    aria-checked="${this._profile.trainingFrequency === d}"
                    aria-label="${d} dias por semana"
                  >${d}×</button>
                `).join('')}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="budget">💵 Orçamento mensal</label>
              <div class="input-with-unit">
                <input
                  type="range"
                  id="budget-slider"
                  class="range-slider"
                  min="50" max="1000" step="10"
                  value="${this._profile.budget}"
                  data-field="budget"
                  aria-label="Orçamento em reais por mês"
                >
                <div class="range-value-row">
                  <span class="unit-label">R$</span>
                  <input
                    type="number"
                    id="budget"
                    class="number-input"
                    min="50" max="1000" step="10"
                    value="${this._profile.budget}"
                    data-field="budget"
                    aria-label="Orçamento mensal"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Restrições -->
          <div class="form-group">
            <label class="form-label">🚫 Restrições / Alergias</label>
            <div class="restriction-pills" role="group" aria-label="Restrições alimentares">
              ${[
                { value: 'gluten',     label: '🌾 Glúten' },
                { value: 'lactose',    label: '🥛 Lactose' },
                { value: 'shellfish',  label: '🦐 Crustáceos' },
                { value: 'soy',        label: '🫘 Soja' },
                { value: 'vegetarian', label: '🥦 Vegetariano' },
                { value: 'vegan',      label: '🌱 Vegano' },
              ].map(r => `
                <button
                  class="restriction-pill ${this._profile.restrictions.includes(r.value) ? 'active-danger' : ''}"
                  data-value="${r.value}"
                  data-action="toggle-restriction"
                  aria-pressed="${this._profile.restrictions.includes(r.value)}"
                >${r.label}</button>
              `).join('')}
            </div>
          </div>

          <!-- Save profile button -->
          <button class="btn-save-profile btn-primary" data-action="save-profile">
            💾 Salvar perfil
          </button>
        </section>

        <!-- ── Divider ── -->
        <div class="calc-divider" aria-hidden="true">
          <span>Recomendações para você</span>
        </div>

        <!-- ── Results ── -->
        <section class="results-section" id="results-section" aria-live="polite" aria-label="Resultados">
          <div class="results-loading" id="results-loading">
            <div class="spinner"></div>
            <p>Calculando seu stack ideal...</p>
          </div>
          <div class="results-grid" id="results-grid"></div>
        </section>

        <!-- ── Budget Summary ── -->
        <section class="budget-section card" id="budget-section" style="display:none">
          <h2 class="section-title">💵 Resumo de Custo</h2>
          <div class="budget-grid" id="budget-grid"></div>
          <div class="budget-total" id="budget-total"></div>
        </section>

        <!-- ── Disclaimer ── -->
        <p class="disclaimer">
          ⚠️ As recomendações são baseadas em evidências científicas e perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo de suplementação.
        </p>

      </div>
    `;

    this._attachStyles();
  }

  // ── Real-time calculation ──

  _calculate() {
    const loading = document.getElementById('results-loading');
    const grid    = document.getElementById('results-grid');

    if (loading) loading.style.display = 'flex';
    if (grid)    grid.innerHTML        = '';

    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => {
      this._results = this._recommender.recommendStack(this._profile);
      this._renderResults();
      this._renderBudget();
      if (loading) loading.style.display = 'none';
    }, 180);
  }

  _renderResults() {
    const grid = document.getElementById('results-grid');
    if (!grid) return;

    if (this._results.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:32px">🤷</p>
          <p>Nenhum suplemento encontrado para este perfil. Tente ajustar as restrições.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    this._results.forEach((supp, index) => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.setAttribute('data-id', supp.id);
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `Recomendação ${index + 1}: ${supp.name}`);
      card.style.animationDelay = `${index * 60}ms`;

      const scorePercent = Math.round(supp.score * 100);
      const scoreColor   = scorePercent >= 80 ? '#00E676' : scorePercent >= 60 ? '#7C3AED' : '#FFB74D';

      const inStack    = sm.isInStack(supp.id);
      const isFav      = sm.isFavorite(supp.id);

      card.innerHTML = `
        <!-- Rank badge -->
        <div class="result-rank" aria-label="Posição ${index + 1}">
          #${index + 1}
        </div>

        <!-- Header -->
        <div class="result-header">
          <div class="result-meta">
            <p class="result-category">${supp.category}</p>
            <h3 class="result-name">${supp.name}</h3>
          </div>
          <evidence-pill level="${supp.evidenceLevel}"></evidence-pill>
        </div>

        <!-- Score bar -->
        <div class="score-section" aria-label="Compatibilidade: ${scorePercent}%">
          <div class="score-label">
            <span>Compatibilidade</span>
            <span style="color:${scoreColor};font-weight:700;font-family:'JetBrains Mono',monospace">${scorePercent}%</span>
          </div>
          <div class="score-bar" role="progressbar" aria-valuenow="${scorePercent}" aria-valuemin="0" aria-valuemax="100">
            <div class="score-fill" style="width:${scorePercent}%;background:${scoreColor}"></div>
          </div>
        </div>

        <!-- Dosage block -->
        <div class="dosage-block">
          <div class="dosage-main">
            <span class="dosage-value">${supp.dosage?.daily ?? '—'}</span>
            <span class="dosage-unit">${supp.dosage?.unit ?? 'g'}/dia</span>
          </div>
          <p class="dosage-rationale">${supp.dosage?.scientificRationale ?? ''}</p>
        </div>

        <!-- Benefits -->
        ${supp.benefits?.length ? `
          <div class="benefits-row" aria-label="Benefícios">
            ${supp.benefits.slice(0, 3).map(b => `
              <span class="benefit-chip">
                <span class="benefit-label">${b.label}</span>
                <span class="benefit-pct">${b.likelihood}</span>
              </span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Cost -->
        <div class="result-cost">
          <span class="cost-label">Custo estimado</span>
          <span class="cost-value">R$ ${(supp.cost?.perMonth ?? 0).toFixed(2)}/mês</span>
        </div>

        <!-- Warnings -->
        ${supp.warnings?.length > 1 ? `
          <div class="warnings-section" aria-label="Avisos">
            ${supp.warnings.slice(1).map(w => `
              <p class="warning-item">⚠️ ${w}</p>
            `).join('')}
          </div>
        ` : ''}

        <!-- Interactions -->
        ${supp.interactions?.length ? `
          <div class="interactions-section" aria-label="Interações">
            ${supp.interactions.map(i => `
              <p class="interaction-item interaction-${i.severity}">
                ⚡ ${i.message}
              </p>
            `).join('')}
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="result-actions">
          <button
            class="btn-action ${isFav ? 'active-fav' : ''}"
            data-action="toggle-fav"
            data-id="${supp.id}"
            data-name="${supp.name}"
            aria-label="${isFav ? 'Remover favorito' : 'Adicionar favorito'}"
            aria-pressed="${isFav}"
          >${isFav ? '♥ Favorito' : '♡ Favoritar'}</button>

          <button
            class="btn-action btn-action-primary ${inStack ? 'active-stack' : ''}"
            data-action="toggle-stack"
            data-id="${supp.id}"
            data-name="${supp.name}"
            aria-label="${inStack ? 'Remover do stack' : 'Adicionar ao stack'}"
            aria-pressed="${inStack}"
          >${inStack ? '✓ No stack' : '+ Stack'}</button>
        </div>
      `;

      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
  }

  _renderBudget() {
    const section  = document.getElementById('budget-section');
    const budgetGrid = document.getElementById('budget-grid');
    const totalEl  = document.getElementById('budget-total');
    if (!section || !budgetGrid || !totalEl) return;

    section.style.display = 'block';
    const totalCost = this._results.reduce((sum, s) => sum + (s.cost?.perMonth ?? 0), 0);
    const remaining = this._profile.budget - totalCost;

    budgetGrid.innerHTML = this._results.map(s => `
      <div class="budget-item">
        <span class="budget-item-name">${s.name}</span>
        <span class="budget-item-cost">R$ ${(s.cost?.perMonth ?? 0).toFixed(2)}</span>
      </div>
    `).join('');

    totalEl.innerHTML = `
      <div class="budget-total-row">
        <span>Total do stack</span>
        <span class="budget-total-value" style="color:${totalCost > this._profile.budget ? '#EF5350' : '#00E676'}">
          R$ ${totalCost.toFixed(2)}
        </span>
      </div>
      <div class="budget-total-row" style="font-size:13px;color:#888">
        <span>Orçamento</span>
        <span>R$ ${this._profile.budget.toFixed(2)}</span>
      </div>
      <div class="budget-total-row" style="font-size:13px">
        <span>${remaining >= 0 ? 'Saldo restante' : 'Excede orçamento em'}</span>
        <span style="color:${remaining >= 0 ? '#00E676' : '#EF5350'}">
          ${remaining >= 0 ? '+' : ''}R$ ${Math.abs(remaining).toFixed(2)}
        </span>
      </div>
    `;
  }

  // ── Event Listeners ──

  _attachListeners() {
    // Objective pills
    this.container.querySelectorAll('.objective-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.objective-pill').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        this._profile.objective = btn.dataset.value;
        this._calculate();
      });
    });

    // Frequency pills
    this.container.querySelectorAll('.freq-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.freq-pill').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        this._profile.trainingFrequency = parseInt(btn.dataset.value);
        this._calculate();
      });
    });

    // Restriction pills
    this.container.querySelectorAll('[data-action="toggle-restriction"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        const idx = this._profile.restrictions.indexOf(val);
        if (idx === -1) {
          this._profile.restrictions.push(val);
          btn.classList.add('active-danger');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          this._profile.restrictions.splice(idx, 1);
          btn.classList.remove('active-danger');
          btn.setAttribute('aria-pressed', 'false');
        }
        this._calculate();
      });
    });

    // Sliders ↔ number inputs (bidirectional sync)
    ['weight', 'height', 'age', 'trainingAge', 'budget'].forEach(field => {
      const slider = document.getElementById(`${field}-slider`);
      const input  = document.getElementById(field);
      if (!slider || !input) return;

      const update = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        this._profile[field] = num;
        slider.value = num;
        input.value  = num;
        this._calculate();
      };

      slider.addEventListener('input', e => update(e.target.value));
      input.addEventListener('change', e => {
        const clamped = Math.min(
          Math.max(parseFloat(e.target.value), parseFloat(input.min)),
          parseFloat(input.max)
        );
        update(clamped);
      });
    });

    // Save profile
    this.container.querySelector('[data-action="save-profile"]')?.addEventListener('click', () => {
      sm.dispatch({ type: ACTIONS.UPDATE_USER_PROFILE, payload: { ...this._profile } });
      window.toast?.('✓ Perfil salvo com sucesso!', 'success');
    });

    // Result actions (delegated)
    this.container.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      const name   = btn.dataset.name;

      if (action === 'toggle-fav') {
        const isFav = sm.isFavorite(id);
        sm.dispatch({ type: isFav ? ACTIONS.REMOVE_FAVORITE : ACTIONS.ADD_FAVORITE, payload: id });
        btn.textContent = isFav ? '♡ Favoritar' : '♥ Favorito';
        btn.classList.toggle('active-fav', !isFav);
        btn.setAttribute('aria-pressed', String(!isFav));
        window.toast?.(isFav ? `${name} removido dos favoritos` : `♥ ${name} favoritado!`, isFav ? 'info' : 'success');
      }

      if (action === 'toggle-stack') {
        const inStack = sm.isInStack(id);
        sm.dispatch({ type: inStack ? ACTIONS.REMOVE_FROM_STACK : ACTIONS.ADD_TO_STACK, payload: { id, name } });
        btn.textContent = inStack ? '+ Stack' : '✓ No stack';
        btn.classList.toggle('active-stack', !inStack);
        btn.setAttribute('aria-pressed', String(!inStack));
        window.toast?.(inStack ? `${name} removido do stack` : `✓ ${name} adicionado ao stack!`, inStack ? 'info' : 'success');
      }
    });
  }

  _attachStyles() {
    if (document.getElementById('calc-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'calc-page-styles';
    style.textContent = `
      .calc-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 20px 16px 100px;
        max-width: 900px;
        margin: 0 auto;
      }

      /* Card base */
      .card {
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 16px;
        padding: 20px;
      }

      /* Page header */
      .page-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }

      /* Section title */
      .section-title { font-size: 16px; font-weight: 700; color: #FAFAFA; margin: 0 0 16px; }

      /* Form groups */
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .form-label {
        font-size: 13px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Range sliders */
      .input-with-unit { display: flex; flex-direction: column; gap: 6px; }
      .range-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: #2A2A2A;
        border-radius: 999px;
        outline: none;
        cursor: pointer;
      }
      .range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px; height: 18px;
        border-radius: 50%;
        background: #7C3AED;
        cursor: pointer;
        border: 2px solid #FAFAFA;
        box-shadow: 0 0 8px rgba(124,58,237,0.5);
        transition: transform 150ms;
      }
      .range-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
      .range-value-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .number-input {
        width: 72px;
        padding: 6px 10px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 8px;
        color: #FAFAFA;
        font-size: 15px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        text-align: center;
        outline: none;
      }
      .number-input:focus { border-color: #7C3AED; }
      .unit-label { font-size: 13px; color: #888; white-space: nowrap; }

      /* Objective pills */
      .objective-pills, .frequency-pills, .restriction-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .objective-pill, .freq-pill, .restriction-pill {
        padding: 8px 14px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        color: #888;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms;
        font-family: 'Inter', sans-serif;
      }
      .objective-pill:hover, .freq-pill:hover { border-color: #7C3AED; color: #FAFAFA; }
      .objective-pill.active, .freq-pill.active {
        background: #7C3AED22;
        border-color: #7C3AED;
        color: #7C3AED;
      }
      .freq-pill { padding: 8px 12px; min-width: 44px; text-align: center; }
      .restriction-pill { background: #1E1E1E; }
      .restriction-pill.active-danger {
        background: #EF535011;
        border-color: #EF5350;
        color: #EF5350;
      }

      /* Save button */
      .btn-save-profile {
        width: 100%;
        padding: 13px;
        margin-top: 8px;
        background: #7C3AED;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 150ms, transform 150ms;
        font-family: 'Inter', sans-serif;
      }
      .btn-save-profile:hover { opacity: 0.9; }
      .btn-save-profile:active { transform: scale(0.98); }

      /* Divider */
      .calc-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #444;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
      }
      .calc-divider::before, .calc-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #2A2A2A;
      }

      /* Results grid */
      .results-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 48px 20px;
        color: #888;
      }
      .spinner {
        width: 32px; height: 32px;
        border: 3px solid #2A2A2A;
        border-top-color: #7C3AED;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .results-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }

      /* Result card */
      .result-card {
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 16px;
        padding: 20px;
        position: relative;
        animation: cardIn 400ms ease both;
        transition: border-color 150ms, box-shadow 150ms;
      }
      .result-card:hover {
        border-color: #7C3AED44;
        box-shadow: 0 0 20px rgba(124,58,237,0.1);
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .result-rank {
        position: absolute;
        top: -10px; left: 16px;
        background: #7C3AED;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 14px;
      }
      .result-category { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 3px; }
      .result-name { font-size: 17px; font-weight: 700; color: #FAFAFA; margin: 0; line-height: 1.2; }

      /* Score bar */
      .score-section { margin-bottom: 14px; }
      .score-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #888;
        margin-bottom: 6px;
      }
      .score-bar {
        height: 5px;
        background: #2A2A2A;
        border-radius: 999px;
        overflow: hidden;
      }
      .score-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 500ms ease;
      }

      /* Dosage block */
      .dosage-block {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        background: #1E1E1E;
        border-radius: 10px;
        margin-bottom: 12px;
      }
      .dosage-main { display: flex; align-items: baseline; gap: 4px; }
      .dosage-value {
        font-size: 28px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: #7C3AED;
      }
      .dosage-unit { font-size: 14px; color: #888; font-family: 'JetBrains Mono', monospace; }
      .dosage-rationale { font-size: 12px; color: #666; margin: 0; line-height: 1.4; }

      /* Benefits */
      .benefits-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      .benefit-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        font-size: 12px;
      }
      .benefit-label { color: #FAFAFA; }
      .benefit-pct { color: #00E676; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; }

      /* Cost */
      .result-cost {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #1E1E1E;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .cost-label { font-size: 12px; color: #888; }
      .cost-value { font-size: 14px; font-weight: 700; color: #FFB74D; font-family: 'JetBrains Mono', monospace; }

      /* Warnings / Interactions */
      .warnings-section, .interactions-section { margin-bottom: 10px; }
      .warning-item, .interaction-item { font-size: 12px; color: #FFB74D; margin: 4px 0; line-height: 1.4; }
      .interaction-warning { color: #FFB74D; }
      .interaction-caution  { color: #FF9800; }
      .interaction-info     { color: #7C3AED; }

      /* Result actions */
      .result-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
      .btn-action {
        flex: 1;
        padding: 9px 14px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        color: #888;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms;
        font-family: 'Inter', sans-serif;
      }
      .btn-action:hover { border-color: #7C3AED; color: #FAFAFA; }
      .btn-action-primary { background: #7C3AED22; border-color: #7C3AED44; color: #7C3AED; }
      .btn-action-primary:hover { background: #7C3AED; color: #fff; }
      .active-fav { background: #EF535011; border-color: #EF535044; color: #EF5350; }
      .active-stack { background: #00E67611; border-color: #00E67644; color: #00E676; }

      /* Budget */
      .budget-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }
      .budget-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #1E1E1E;
        font-size: 14px;
      }
      .budget-item-name { color: #FAFAFA; }
      .budget-item-cost { color: #888; font-family: 'JetBrains Mono', monospace; }
      .budget-total { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid #2A2A2A; }
      .budget-total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 600; color: #FAFAFA; }
      .budget-total-value { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; }

      /* Disclaimer */
      .disclaimer {
        font-size: 12px;
        color: #555;
        line-height: 1.6;
        padding: 12px;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        background: #141414;
        margin: 0;
      }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 48px 20px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        grid-column: 1 / -1;
      }

      /* Responsive */
      @media (max-width: 560px) {
        .form-row { grid-template-columns: 1fr; gap: 0; }
        .calc-page { padding: 16px 12px 100px; }
      }
      @media (min-width: 640px) {
        .results-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (min-width: 1024px) {
        .results-grid { grid-template-columns: repeat(4, 1fr); }
        .calc-page { padding: 32px 24px 80px; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default DosageCalculatorPage;
```

---

## VALIDATION CHECKLIST

- [ ] Sliders and number inputs stay in sync (bidirectional)
- [ ] Changing any input recalculates results in ≤180ms
- [ ] Objective pill change updates `this._profile.objective` and recalculates
- [ ] Restriction toggle adds/removes from `this._profile.restrictions`
- [ ] "Salvar perfil" dispatches `UPDATE_USER_PROFILE` to StateManager and shows toast
- [ ] Each result card shows: rank badge, name, category, evidence-pill, score bar, dosage, cost
- [ ] Dosage value (e.g. 5g) reflects the user's weight and objective
- [ ] Score fill bar animates to the correct width
- [ ] "Favoritar" / "+ Stack" buttons dispatch correct ACTIONS and change label on click
- [ ] Budget section shows total cost and remaining/over budget highlighted correctly
- [ ] Disclaimer appears at the bottom
- [ ] Mobile (≤560px): single-column form layout, no overflow
- [ ] Desktop (≥1024px): 4-col results grid

## FILES TO DELIVER

1. `/src/pages/dosage-calculator-page.js`
```

---

## **PROMPT 4.2: MyStackPage — COMPLETO**

```markdown
You are building the My Stack page for SupliList v4.0.

## CONTEXT

MyStackPage is where users manage their active supplement protocol:
- See what they're currently taking (their "stack")
- Track how much of each supplement they have left
- Get alerts when something is running low (≤5 days)
- Reorder directly from here (affiliate links)
- CRUD: add, edit, remove supplements from the stack

This page is high-frequency: users open it daily before the gym.
It must load instantly from localStorage (<50ms) and feel responsive.

---

## TASK 1: CREATE /src/pages/my-stack-page.js

```javascript
/**
 * MyStackPage v4.0 — SupliList
 * Gerenciamento do stack ativo: CRUD, estoque, reposição
 */

import sm, { ACTIONS } from '../state/state-manager.js';
import AffiliateEngine from '../monetization/affiliate-engine.js';

export class MyStackPage {
  constructor(container) {
    this.container   = container;
    this._unsub      = null;
    this._affiliate  = new AffiliateEngine();
    this._editId     = null;  // ID of supplement being edited
  }

  mount() {
    this._render();
    this._attachListeners();

    this._unsub = sm.subscribe((state, action) => {
      const stackActions = [
        'ADD_TO_STACK', 'REMOVE_FROM_STACK',
        'UPDATE_STACK_ITEM', 'SET_STACK_QUANTITY'
      ];
      if (stackActions.includes(action.type)) {
        this._renderStackList();
        this._renderAlerts();
        this._renderSummary();
      }
    });
  }

  unmount() { this._unsub?.(); }

  _render() {
    const stack = sm.state.stack;

    this.container.innerHTML = `
      <div class="mystack-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">📦 Meu Stack</h1>
          <p class="page-subtitle">Seu protocolo de suplementação ativo</p>
        </div>

        <!-- ── Alerts: Running Low ── -->
        <div id="alerts-section"></div>

        <!-- ── Summary Stats ── -->
        <div class="summary-grid" id="summary-grid">
          <stat-card label="Suplementos" value="${stack.length}" unit="ativos" color="var(--color-primary)"></stat-card>
          <stat-card label="Custo Total"  value="—"              unit="R$/mês"  color="var(--color-warning)"></stat-card>
          <stat-card label="Adesão Hoje" value="${this._todayAdherencePercent()}%" unit="" color="var(--color-success)" trend="${this._todayAdherencePercent() >= 80 ? 'up' : 'neutral'}"></stat-card>
          <stat-card label="Dias de Streak" value="${sm.currentStreak}" unit="dias" color="var(--color-success)"></stat-card>
        </div>

        <!-- ── Stack List ── -->
        <section class="stack-section">
          <div class="section-header">
            <h2 class="section-title">Ativos</h2>
            <button class="btn-add" data-action="open-add-modal" aria-label="Adicionar suplemento ao stack">
              + Adicionar
            </button>
          </div>

          <div id="stack-list" class="stack-list"></div>
        </section>

      </div>

      <!-- ── Add/Edit Modal ── -->
      <modal-dialog id="stack-modal" title="Adicionar suplemento">
        <div class="modal-form">

          <!-- Search for supplement -->
          <div class="modal-form-group">
            <label class="modal-label" for="modal-search">Suplemento</label>
            <div style="position:relative">
              <input
                type="search"
                id="modal-search"
                class="modal-input"
                placeholder="Buscar suplemento... (ex: creatina)"
                autocomplete="off"
              >
              <div id="modal-search-results" class="search-dropdown" style="display:none"></div>
            </div>
          </div>

          <!-- Quantity -->
          <div class="modal-form-group">
            <label class="modal-label" for="modal-quantity">Quantidade em estoque</label>
            <div class="modal-input-row">
              <input type="number" id="modal-quantity" class="modal-input" min="0" max="10000" value="250" placeholder="250">
              <select id="modal-unit" class="modal-select" aria-label="Unidade">
                <option value="g">g</option>
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="caps">cáps</option>
                <option value="tabs">tabs</option>
                <option value="un">un</option>
              </select>
            </div>
          </div>

          <!-- Daily dosage -->
          <div class="modal-form-group">
            <label class="modal-label" for="modal-dosage">Dosagem diária</label>
            <div class="modal-input-row">
              <input type="number" id="modal-dosage" class="modal-input" min="0.1" max="1000" step="0.1" value="5" placeholder="5">
              <span class="modal-unit-label" id="modal-dosage-unit">g/dia</span>
            </div>
          </div>

          <!-- Purchase date (optional) -->
          <div class="modal-form-group">
            <label class="modal-label" for="modal-purchase-date">Data da compra</label>
            <input type="date" id="modal-purchase-date" class="modal-input" value="${new Date().toISOString().split('T')[0]}">
          </div>

          <!-- Notes (optional) -->
          <div class="modal-form-group">
            <label class="modal-label" for="modal-notes">Notas (opcional)</label>
            <textarea id="modal-notes" class="modal-textarea" placeholder="Ex: Tomar com refeição, marca preferida..." rows="2"></textarea>
          </div>

        </div>

        <div slot="footer" class="modal-footer-btns">
          <button class="btn-modal-cancel btn-ghost" data-action="close-modal">Cancelar</button>
          <button class="btn-modal-save btn-primary"  data-action="save-stack-item">Salvar</button>
        </div>
      </modal-dialog>
    `;

    this._attachStyles();
    this._renderStackList();
    this._renderAlerts();
    this._renderSummary();
    this._initModalSearch();
  }

  // ── Render stack items ──

  _renderStackList() {
    const list  = document.getElementById('stack-list');
    const stack = sm.state.stack;
    if (!list) return;

    if (stack.length === 0) {
      list.innerHTML = `
        <div class="stack-empty">
          <p style="font-size:40px">📭</p>
          <p>Seu stack está vazio.</p>
          <p style="font-size:13px;color:#666">Adicione suplementos que você está tomando.</p>
          <button class="btn-primary" data-action="open-add-modal" style="margin-top:8px">+ Adicionar suplemento</button>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    stack.forEach(item => {
      const daysLeft    = this._calcDaysLeft(item);
      const urgency     = daysLeft !== null && daysLeft <= 5  ? 'critical'
                        : daysLeft !== null && daysLeft <= 14 ? 'low'
                        : 'ok';
      const todayDone   = sm.todayCheckins.some(c => c.supplementId === item.id);
      const affLink     = this._affiliate.generateAffiliateLink(item.id);

      const el = document.createElement('div');
      el.className = `stack-item stack-item-${urgency}`;
      el.setAttribute('data-id', item.id);
      el.setAttribute('role', 'listitem');

      el.innerHTML = `
        <!-- Checkin badge -->
        <div class="stack-checkin-badge ${todayDone ? 'done' : ''}" aria-label="${todayDone ? 'Tomado hoje' : 'Não tomado hoje'}">
          ${todayDone ? '✓' : '○'}
        </div>

        <!-- Main info -->
        <div class="stack-info">
          <p class="stack-category">${item.category ?? 'Suplemento'}</p>
          <h3 class="stack-name">${item.name}</h3>
          <p class="stack-dosage">
            ${item.dosage ?? '—'} ${item.unit ?? 'g'}/dia
            ${item.notes ? `· <span style="color:#666">${item.notes}</span>` : ''}
          </p>
        </div>

        <!-- Stock info -->
        <div class="stack-stock">
          ${daysLeft !== null ? `
            <div class="days-left days-left-${urgency}">
              <span class="days-value">${daysLeft}</span>
              <span class="days-label">dias</span>
            </div>
            <div class="stock-bar-wrap">
              <div class="stock-bar">
                <div
                  class="stock-fill stock-fill-${urgency}"
                  style="width:${Math.min((daysLeft / 30) * 100, 100)}%"
                ></div>
              </div>
              <p class="stock-qty">${item.quantity} ${item.unit ?? 'g'} restantes</p>
            </div>
          ` : `
            <p class="stock-unknown">Estoque não informado</p>
          `}
        </div>

        <!-- Actions -->
        <div class="stack-actions">
          ${affLink ? `
            <a
              href="${affLink.url}"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="btn-reorder"
              aria-label="Recomprar ${item.name}"
              data-action="track-affiliate"
              data-id="${item.id}"
              data-marketplace="${affLink.marketplace}"
            >🛒 Recomprar</a>
          ` : ''}

          <button
            class="btn-edit-stack"
            data-action="edit-item"
            data-id="${item.id}"
            aria-label="Editar ${item.name}"
          >✏️</button>

          <button
            class="btn-remove-stack"
            data-action="remove-item"
            data-id="${item.id}"
            aria-label="Remover ${item.name} do stack"
          >🗑️</button>
        </div>
      `;

      fragment.appendChild(el);
    });

    list.innerHTML = '';
    list.appendChild(fragment);
  }

  // ── Render low-stock alerts ──

  _renderAlerts() {
    const section  = document.getElementById('alerts-section');
    if (!section) return;

    const critical = sm.state.stack.filter(item => {
      const days = this._calcDaysLeft(item);
      return days !== null && days <= 5;
    });

    if (critical.length === 0) {
      section.innerHTML = '';
      return;
    }

    section.innerHTML = `
      <div class="alerts-banner" role="alert" aria-live="assertive">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <strong>Estoque baixo</strong>
          <p>${critical.map(i => `${i.name} (${this._calcDaysLeft(i)} dias)`).join(' · ')}</p>
        </div>
        <button class="alert-dismiss" data-action="dismiss-alerts" aria-label="Dispensar alertas">✕</button>
      </div>
    `;
  }

  // ── Render summary stats ──

  _renderSummary() {
    const grid = document.getElementById('summary-grid');
    if (!grid) return;

    const stack      = sm.state.stack;
    const supps      = sm.state.supplements;
    const user       = sm.state.user;

    let totalCost = 0;
    stack.forEach(item => {
      const supp = supps.find(s => s.id === item.id);
      if (!supp) return;
      const dosage     = item.dosage || (supp.dosage?.maintenance ?? 5);
      const monthly    = dosage * 30;
      totalCost += (monthly / 1000) * (supp.pricePerGram || 0.05);
    });

    // Re-create stat-cards with updated values
    grid.innerHTML = `
      <stat-card label="Suplementos"  value="${stack.length}"               unit="ativos" color="var(--color-primary)"></stat-card>
      <stat-card label="Custo Total"  value="${totalCost.toFixed(0)}"        unit="R$/mês" color="var(--color-warning)"></stat-card>
      <stat-card label="Adesão Hoje"  value="${this._todayAdherencePercent()}" unit="%"   color="var(--color-success)" trend="${this._todayAdherencePercent() >= 80 ? 'up' : 'neutral'}"></stat-card>
      <stat-card label="Streak"       value="${sm.currentStreak}"            unit="dias"   color="var(--color-success)"></stat-card>
    `;
  }

  // ── Modal search (fuzzy find supplement from database) ──

  _initModalSearch() {
    const input   = document.getElementById('modal-search');
    const results = document.getElementById('modal-search-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { results.style.display = 'none'; return; }

        const matches = sm.state.supplements
          .filter(s => s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
          .slice(0, 8);

        if (matches.length === 0) {
          results.style.display = 'none';
          return;
        }

        results.innerHTML = matches.map(s => `
          <button
            class="search-result-item"
            data-id="${s.id}"
            data-name="${s.name}"
            data-category="${s.category}"
            data-unit="${s.dosage?.unit ?? 'g'}"
            data-dosage="${s.dosage?.maintenance ?? 5}"
            data-action="select-supplement"
          >
            <span class="sr-name">${s.name}</span>
            <span class="sr-category">${s.category}</span>
          </button>
        `).join('');
        results.style.display = 'block';
      }, 200);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  }

  // ── Attach all listeners ──

  _attachListeners() {
    this.container.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      switch (action) {

        case 'open-add-modal': {
          this._editId = null;
          const modal  = this.container.querySelector('#stack-modal');
          if (modal) {
            modal.setAttribute('title', 'Adicionar suplemento');
            // Reset form
            ['modal-search','modal-quantity','modal-dosage','modal-notes'].forEach(id => {
              const el = document.getElementById(id);
              if (el) el.value = id === 'modal-quantity' ? '250' : id === 'modal-dosage' ? '5' : '';
            });
            modal.setAttribute('open', '');
          }
          break;
        }

        case 'close-modal': {
          const modal = this.container.querySelector('#stack-modal');
          modal?.removeAttribute('open');
          break;
        }

        case 'save-stack-item': {
          const name     = document.getElementById('modal-search')?.value?.trim();
          const quantity = parseFloat(document.getElementById('modal-quantity')?.value) || 0;
          const dosage   = parseFloat(document.getElementById('modal-dosage')?.value) || 0;
          const unit     = document.getElementById('modal-unit')?.value || 'g';
          const notes    = document.getElementById('modal-notes')?.value?.trim();
          const date     = document.getElementById('modal-purchase-date')?.value;

          if (!name) { window.toast?.('⚠️ Informe o nome do suplemento', 'warning'); break; }
          if (dosage <= 0) { window.toast?.('⚠️ Informe a dosagem diária', 'warning'); break; }

          const id = this._editId ?? (name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now());

          sm.dispatch({
            type: this._editId ? ACTIONS.UPDATE_STACK_ITEM : ACTIONS.ADD_TO_STACK,
            payload: { id, name, quantity, dosage, unit, notes, lastPurchase: date }
          });

          this.container.querySelector('#stack-modal')?.removeAttribute('open');
          window.toast?.(`✓ ${name} ${this._editId ? 'atualizado' : 'adicionado ao stack'}!`, 'success');
          this._editId = null;
          break;
        }

        case 'edit-item': {
          const id   = btn.dataset.id;
          const item = sm.state.stack.find(s => s.id === id);
          if (!item) break;

          this._editId = id;
          const modal  = this.container.querySelector('#stack-modal');
          if (modal) {
            modal.setAttribute('title', 'Editar suplemento');
            const f = {
              'modal-search':        item.name,
              'modal-quantity':      item.quantity ?? '',
              'modal-dosage':        item.dosage ?? '',
              'modal-notes':         item.notes ?? '',
              'modal-purchase-date': item.lastPurchase ?? '',
            };
            Object.entries(f).forEach(([id, val]) => {
              const el = document.getElementById(id);
              if (el) el.value = val;
            });
            const unitEl = document.getElementById('modal-unit');
            if (unitEl && item.unit) unitEl.value = item.unit;
            modal.setAttribute('open', '');
          }
          break;
        }

        case 'remove-item': {
          const id   = btn.dataset.id;
          const item = sm.state.stack.find(s => s.id === id);
          if (!item) break;
          if (!confirm(`Remover ${item.name} do stack?`)) break;
          sm.dispatch({ type: ACTIONS.REMOVE_FROM_STACK, payload: id });
          window.toast?.(`${item.name} removido do stack`, 'info');
          break;
        }

        case 'select-supplement': {
          const nameInput    = document.getElementById('modal-search');
          const dosageInput  = document.getElementById('modal-dosage');
          const unitSelect   = document.getElementById('modal-unit');
          const unitLabel    = document.getElementById('modal-dosage-unit');
          const resultsDropdown = document.getElementById('modal-search-results');

          if (nameInput)   nameInput.value   = btn.dataset.name;
          if (dosageInput) dosageInput.value = btn.dataset.dosage;
          if (unitSelect)  unitSelect.value  = btn.dataset.unit;
          if (unitLabel)   unitLabel.textContent = `${btn.dataset.unit}/dia`;
          if (resultsDropdown) resultsDropdown.style.display = 'none';
          break;
        }

        case 'track-affiliate': {
          this._affiliate.trackAffiliateClick(btn.dataset.id, btn.dataset.marketplace);
          break;
        }

        case 'dismiss-alerts': {
          const alertsSection = document.getElementById('alerts-section');
          if (alertsSection) alertsSection.innerHTML = '';
          break;
        }
      }
    });
  }

  // ── Helpers ──

  _calcDaysLeft(item) {
    if (!item.quantity || !item.dosage || item.dosage <= 0) return null;
    return Math.max(0, Math.floor(item.quantity / item.dosage));
  }

  _todayAdherencePercent() {
    const stack = sm.state.stack;
    if (!stack.length) return 100;
    const done  = sm.todayCheckins.length;
    return Math.round((Math.min(done, stack.length) / stack.length) * 100);
  }

  _attachStyles() {
    if (document.getElementById('mystack-styles')) return;
    const style = document.createElement('style');
    style.id = 'mystack-styles';
    style.textContent = `
      .mystack-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px 16px 100px;
        max-width: 800px;
        margin: 0 auto;
      }
      .page-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }

      /* Summary */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      @media (min-width: 600px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } }

      /* Section header */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .section-title { font-size: 16px; font-weight: 700; color: #FAFAFA; margin: 0; }
      .btn-add {
        padding: 8px 16px;
        background: #7C3AED;
        color: #fff;
        border: none;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: opacity 150ms;
      }
      .btn-add:hover { opacity: 0.9; }

      /* Alerts */
      .alerts-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        background: #FFB74D11;
        border: 1px solid #FFB74D44;
        border-radius: 12px;
        animation: slideDown 300ms ease;
      }
      @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      .alert-icon { font-size: 20px; flex-shrink: 0; }
      .alert-content { flex: 1; }
      .alert-content strong { color: #FFB74D; font-size: 14px; }
      .alert-content p { color: #888; font-size: 13px; margin: 2px 0 0; }
      .alert-dismiss { background: none; border: none; color: #666; cursor: pointer; font-size: 16px; }

      /* Stack list */
      .stack-list { display: flex; flex-direction: column; gap: 10px; }
      .stack-empty {
        text-align: center;
        padding: 48px 20px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        background: #141414;
        border: 1px dashed #2A2A2A;
        border-radius: 16px;
      }

      /* Stack item */
      .stack-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        background: #141414;
        border-radius: 14px;
        border: 1px solid #2A2A2A;
        transition: border-color 200ms;
      }
      .stack-item-ok       { border-color: #2A2A2A; }
      .stack-item-low      { border-color: #FFB74D44; background: #FFB74D05; }
      .stack-item-critical { border-color: #EF535044; background: #EF535005; animation: pulse-border 2s ease-in-out infinite; }
      @keyframes pulse-border {
        0%, 100% { border-color: #EF535044; }
        50%       { border-color: #EF5350; }
      }

      /* Checkin badge */
      .stack-checkin-badge {
        width: 32px; height: 32px;
        border-radius: 50%;
        border: 2px solid #2A2A2A;
        background: #1E1E1E;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        color: #444;
        flex-shrink: 0;
        font-weight: 700;
      }
      .stack-checkin-badge.done {
        border-color: #00E676;
        background: #00E67611;
        color: #00E676;
      }

      /* Stack info */
      .stack-info { flex: 1; min-width: 0; }
      .stack-category { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px; }
      .stack-name { font-size: 15px; font-weight: 700; color: #FAFAFA; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .stack-dosage { font-size: 12px; color: #888; margin: 0; font-family: 'JetBrains Mono', monospace; }

      /* Stock */
      .stack-stock { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; min-width: 80px; }
      .days-left {
        display: flex;
        align-items: baseline;
        gap: 3px;
      }
      .days-value { font-size: 22px; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; }
      .days-label { font-size: 11px; color: #888; }
      .days-left-ok       .days-value { color: #00E676; }
      .days-left-low      .days-value { color: #FFB74D; }
      .days-left-critical .days-value { color: #EF5350; }
      .stock-bar-wrap { width: 100%; }
      .stock-bar { height: 4px; background: #2A2A2A; border-radius: 999px; overflow: hidden; width: 80px; }
      .stock-fill { height: 100%; border-radius: 999px; transition: width 500ms ease; }
      .stock-fill-ok       { background: #00E676; }
      .stock-fill-low      { background: #FFB74D; }
      .stock-fill-critical { background: #EF5350; }
      .stock-qty { font-size: 11px; color: #666; margin: 3px 0 0; text-align: right; font-family: 'JetBrains Mono', monospace; }
      .stock-unknown { font-size: 12px; color: #444; }

      /* Actions */
      .stack-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
      .btn-reorder {
        padding: 6px 12px;
        background: #7C3AED22;
        border: 1px solid #7C3AED44;
        border-radius: 999px;
        color: #7C3AED;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
        transition: all 150ms;
        font-family: 'Inter', sans-serif;
      }
      .btn-reorder:hover { background: #7C3AED; color: #fff; }
      .btn-edit-stack, .btn-remove-stack {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        transition: background 150ms;
      }
      .btn-edit-stack:hover   { background: #2A2A2A; }
      .btn-remove-stack:hover { background: #EF535022; }

      /* Modal form */
      .modal-form { display: flex; flex-direction: column; gap: 14px; }
      .modal-form-group { display: flex; flex-direction: column; gap: 6px; }
      .modal-label { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
      .modal-input {
        width: 100%;
        padding: 11px 14px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #FAFAFA;
        font-size: 15px;
        font-family: 'Inter', sans-serif;
        outline: none;
        box-sizing: border-box;
      }
      .modal-input:focus { border-color: #7C3AED; }
      .modal-input::placeholder { color: #444; }
      .modal-select {
        padding: 11px 14px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #FAFAFA;
        font-size: 15px;
        font-family: 'Inter', sans-serif;
        outline: none;
        cursor: pointer;
      }
      .modal-input-row { display: flex; gap: 8px; align-items: center; }
      .modal-unit-label { font-size: 13px; color: #888; white-space: nowrap; }
      .modal-textarea {
        width: 100%;
        padding: 11px 14px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #FAFAFA;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        outline: none;
        resize: vertical;
        box-sizing: border-box;
      }
      .modal-textarea:focus { border-color: #7C3AED; }
      .modal-footer-btns { display: flex; gap: 8px; }

      /* Search dropdown */
      .search-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0; right: 0;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        overflow: hidden;
        z-index: 100;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      }
      .search-result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 11px 14px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background 150ms;
        font-family: 'Inter', sans-serif;
        border-bottom: 1px solid #2A2A2A;
      }
      .search-result-item:last-child { border-bottom: none; }
      .search-result-item:hover { background: #2A2A2A; }
      .sr-name { font-size: 14px; color: #FAFAFA; font-weight: 600; }
      .sr-category { font-size: 12px; color: #666; }

      /* Ghost / primary buttons reused from home-page */
      .btn-ghost {
        flex: 1;
        padding: 11px;
        background: transparent;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #888;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
      }
      .btn-primary {
        flex: 1;
        padding: 11px;
        background: #7C3AED;
        border: none;
        border-radius: 10px;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: opacity 150ms;
      }
      .btn-primary:hover { opacity: 0.9; }
    `;
    document.head.appendChild(style);
  }
}

export default MyStackPage;
```

---

## VALIDATION CHECKLIST

- [ ] Stack list renders all items from StateManager instantly (<50ms)
- [ ] Empty state shows "Adicionar suplemento" CTA
- [ ] "Adicionado hoje" badge (green ✓) appears for supplements checked in today
- [ ] Item with ≤5 days left shows red pulsing border and red days counter
- [ ] Item with ≤14 days left shows orange border
- [ ] Item with >14 days shows normal border
- [ ] Stock bar fills proportionally (days_left / 30 × 100%)
- [ ] "Recomprar" link contains affiliate UTM parameters
- [ ] "+" button opens modal-dialog
- [ ] Modal search finds supplements by name (≥2 chars), selecting one fills all fields
- [ ] "Salvar" dispatches ADD_TO_STACK (or UPDATE_STACK_ITEM if editing) and closes modal
- [ ] Edit ✏️ pre-fills modal with existing data
- [ ] Delete 🗑️ shows confirm() before dispatching REMOVE_FROM_STACK
- [ ] Summary stat-cards update after every stack change (reactive)
- [ ] Alerts banner appears only when ≥1 supplement has ≤5 days left
- [ ] Dismiss button on alerts banner hides it without affecting stack data

## FILES TO DELIVER

1. `/src/pages/my-stack-page.js`
```

---

## **PROMPT 4.3: FavoritesPage — COMPLETO**

```markdown
You are building the Favorites page for SupliList v4.0.

## CONTEXT

FavoritesPage is where users save supplements they want to try or track.
Unlike MyStack (active, taking now), Favorites is a wishlist / research list.

Key features:
- List of favorited supplements (from StackRecommender or manual)
- Filter by category, evidence level
- Quick-add to stack from favorites
- Price tracking (show current best price)
- Sort: by name, evidence, price, date added

---

## TASK 1: CREATE /src/pages/favorites-page.js

```javascript
/**
 * FavoritesPage v4.0 — SupliList
 * Lista de suplementos favoritos com filtros, sort e ação rápida
 */

import sm, { ACTIONS } from '../state/state-manager.js';
import AffiliateEngine from '../monetization/affiliate-engine.js';

export class FavoritesPage {
  constructor(container) {
    this.container  = container;
    this._unsub     = null;
    this._sort      = 'date-desc'; // 'date-desc', 'name-asc', 'evidence', 'price-asc'
    this._filter    = { category: '', evidence: '' };
    this._affiliate = new AffiliateEngine();
  }

  mount() {
    this._render();
    this._attachListeners();

    this._unsub = sm.subscribe((state, action) => {
      if (['ADD_FAVORITE','REMOVE_FAVORITE','ADD_TO_STACK','REMOVE_FROM_STACK'].includes(action.type)) {
        this._renderList();
        this._renderStats();
      }
    });
  }

  unmount() { this._unsub?.(); }

  _render() {
    this.container.innerHTML = `
      <div class="favs-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">♥ Favoritos</h1>
          <p class="page-subtitle">Suplementos que você quer experimentar</p>
        </div>

        <!-- ── Stats ── -->
        <div class="favs-stats" id="favs-stats" aria-live="polite"></div>

        <!-- ── Controls (Filter + Sort) ── -->
        <div class="favs-controls" role="group" aria-label="Controles">

          <!-- Filter by category -->
          <select class="filter-select" id="fav-filter-category" aria-label="Categoria">
            <option value="">📂 Categoria</option>
            <option value="Performance">Performance</option>
            <option value="Proteína">Proteína</option>
            <option value="Vitaminas">Vitaminas</option>
            <option value="Minerais">Minerais</option>
            <option value="Adaptógenos">Adaptógenos</option>
            <option value="Estimulantes">Estimulantes</option>
            <option value="Saúde">Saúde</option>
          </select>

          <!-- Filter by evidence -->
          <select class="filter-select" id="fav-filter-evidence" aria-label="Evidência">
            <option value="">🔬 Evidência</option>
            <option value="A">A — Forte</option>
            <option value="B">B — Boa</option>
            <option value="C">C — Fraca</option>
          </select>

          <!-- Sort -->
          <select class="filter-select" id="fav-sort" aria-label="Ordenar por">
            <option value="date-desc">↓ Mais recentes</option>
            <option value="date-asc">↑ Mais antigos</option>
            <option value="name-asc">A–Z Nome</option>
            <option value="evidence">🔬 Evidência</option>
            <option value="price-asc">💵 Menor preço</option>
          </select>

          <!-- Clear -->
          <button class="btn-clear-favs" id="btn-clear-favs" aria-label="Limpar filtros">✕</button>
        </div>

        <!-- ── List ── -->
        <div id="favs-list" class="favs-list" role="list" aria-label="Suplementos favoritos"></div>

      </div>
    `;

    this._attachStyles();
    this._renderList();
    this._renderStats();
  }

  _getFavItems() {
    const favIds = sm.state.favorites || [];
    const supps  = sm.state.supplements;
    return favIds
      .map((entry, idx) => {
        const id   = typeof entry === 'string' ? entry : entry.id;
        const meta = typeof entry === 'object'  ? entry : {};
        const supp = supps.find(s => s.id === id);
        if (!supp) return null;
        return { ...supp, _addedAt: meta.addedAt ?? (Date.now() - idx * 60000) };
      })
      .filter(Boolean);
  }

  _applyFilterSort(items) {
    let result = [...items];

    if (this._filter.category) {
      result = result.filter(s => s.category === this._filter.category);
    }
    if (this._filter.evidence) {
      result = result.filter(s => s.evidenceLevel === this._filter.evidence);
    }

    const sortMap = { A: 4, B: 3, C: 2, D: 1 };
    switch (this._sort) {
      case 'date-desc':  result.sort((a, b) => (b._addedAt ?? 0) - (a._addedAt ?? 0)); break;
      case 'date-asc':   result.sort((a, b) => (a._addedAt ?? 0) - (b._addedAt ?? 0)); break;
      case 'name-asc':   result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); break;
      case 'evidence':   result.sort((a, b) => (sortMap[b.evidenceLevel] ?? 0) - (sortMap[a.evidenceLevel] ?? 0)); break;
      case 'price-asc':  result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)); break;
    }

    return result;
  }

  _renderList() {
    const list  = document.getElementById('favs-list');
    if (!list) return;

    const items   = this._applyFilterSort(this._getFavItems());

    if (items.length === 0) {
      const hasFavs = (sm.state.favorites ?? []).length > 0;
      list.innerHTML = hasFavs
        ? `<div class="favs-empty">
             <p style="font-size:32px">🔍</p>
             <p>Nenhum favorito com estes filtros.</p>
             <button class="btn-clear-filter-inline btn-ghost" data-action="clear-filters">Limpar filtros</button>
           </div>`
        : `<div class="favs-empty">
             <p style="font-size:40px">♡</p>
             <p>Você ainda não favoritou nenhum suplemento.</p>
             <p style="font-size:13px;color:#666">Explore o catálogo e toque no coração ♥.</p>
             <a href="#/list" class="btn-primary" style="margin-top:10px">Explorar catálogo</a>
           </div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(supp => {
      const inStack  = sm.isInStack(supp.id);
      const affLink  = this._affiliate.generateAffiliateLink(supp.id);
      const bestPrice = affLink?.price ?? supp.price ?? null;

      const el = document.createElement('div');
      el.className = 'fav-item';
      el.setAttribute('role', 'listitem');
      el.setAttribute('data-id', supp.id);

      el.innerHTML = `
        <div class="fav-item-left">
          <div class="fav-meta">
            <p class="fav-category">${supp.category ?? ''}</p>
            <h3 class="fav-name">${supp.name}</h3>
          </div>
          <div class="fav-tags">
            <evidence-pill level="${supp.evidenceLevel}"></evidence-pill>
            ${supp.targets?.slice(0,2).map(t => `
              <span class="target-chip">${t}</span>
            `).join('') ?? ''}
          </div>
        </div>

        <div class="fav-item-right">
          ${bestPrice ? `
            <div class="fav-price">
              <span class="fav-price-value">R$ ${parseFloat(bestPrice).toFixed(2)}</span>
              ${affLink ? `<span class="fav-marketplace">${affLink.marketplace}</span>` : ''}
            </div>
          ` : ''}

          <div class="fav-actions">
            ${affLink ? `
              <a
                href="${affLink.url}"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="btn-buy"
                aria-label="Comprar ${supp.name}"
                data-action="track-affiliate"
                data-id="${supp.id}"
                data-marketplace="${affLink.marketplace}"
              >🛒</a>
            ` : ''}

            <button
              class="btn-add-stack-fav ${inStack ? 'in-stack' : ''}"
              data-action="toggle-stack"
              data-id="${supp.id}"
              data-name="${supp.name}"
              aria-label="${inStack ? 'No seu stack' : 'Adicionar ao stack'}"
              aria-pressed="${inStack}"
            >${inStack ? '✓' : '+'}</button>

            <button
              class="btn-remove-fav"
              data-action="remove-fav"
              data-id="${supp.id}"
              aria-label="Remover ${supp.name} dos favoritos"
            >♥</button>
          </div>
        </div>
      `;

      fragment.appendChild(el);
    });

    list.innerHTML = '';
    list.appendChild(fragment);
  }

  _renderStats() {
    const statsEl = document.getElementById('favs-stats');
    if (!statsEl) return;

    const total   = (sm.state.favorites ?? []).length;
    const shown   = this._applyFilterSort(this._getFavItems()).length;
    const inStack = this._getFavItems().filter(s => sm.isInStack(s.id)).length;

    statsEl.innerHTML = `
      <span class="fav-stat-chip">♥ ${total} favoritos</span>
      ${shown !== total ? `<span class="fav-stat-chip">🔍 ${shown} filtrados</span>` : ''}
      <span class="fav-stat-chip" style="color:#00E676">✓ ${inStack} no stack</span>
    `;
  }

  _attachListeners() {
    // Filter / sort changes
    ['fav-filter-category', 'fav-filter-evidence'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        const key = id.replace('fav-filter-', '');
        this._filter[key] = e.target.value;
        this._renderList();
        this._renderStats();
      });
    });
    document.getElementById('fav-sort')?.addEventListener('change', (e) => {
      this._sort = e.target.value;
      this._renderList();
    });
    document.getElementById('btn-clear-favs')?.addEventListener('click', () => this._clearFilters());

    // List actions (delegated)
    this.container.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'remove-fav') {
        const id = btn.dataset.id;
        sm.dispatch({ type: ACTIONS.REMOVE_FAVORITE, payload: id });
        window.toast?.('Removido dos favoritos', 'info');
      }

      if (action === 'toggle-stack') {
        const { id, name } = btn.dataset;
        const inStack = sm.isInStack(id);
        sm.dispatch({ type: inStack ? ACTIONS.REMOVE_FROM_STACK : ACTIONS.ADD_TO_STACK, payload: { id, name } });
        window.toast?.(inStack ? `${name} removido do stack` : `✓ ${name} adicionado ao stack!`, inStack ? 'info' : 'success');
      }

      if (action === 'track-affiliate') {
        this._affiliate.trackAffiliateClick(btn.dataset.id, btn.dataset.marketplace);
      }

      if (action === 'clear-filters') {
        this._clearFilters();
      }
    });
  }

  _clearFilters() {
    this._filter = { category: '', evidence: '' };
    ['fav-filter-category', 'fav-filter-evidence'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this._renderList();
    this._renderStats();
  }

  _attachStyles() {
    if (document.getElementById('favs-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'favs-page-styles';
    style.textContent = `
      .favs-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px 16px 100px;
        max-width: 800px;
        margin: 0 auto;
      }
      .page-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }

      /* Stats chips */
      .favs-stats { display: flex; flex-wrap: wrap; gap: 8px; }
      .fav-stat-chip {
        padding: 4px 12px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #888;
        font-family: 'JetBrains Mono', monospace;
      }

      /* Controls */
      .favs-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .filter-select {
        padding: 9px 14px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        color: #FAFAFA;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        outline: none;
        -webkit-appearance: none;
      }
      .filter-select:focus { border-color: #7C3AED; }
      .btn-clear-favs {
        padding: 9px 14px;
        background: transparent;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 150ms;
      }
      .btn-clear-favs:hover { border-color: #EF5350; color: #EF5350; }

      /* Favorites list */
      .favs-list { display: flex; flex-direction: column; gap: 10px; }
      .favs-empty {
        text-align: center;
        padding: 60px 20px;
        color: #888;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      /* Fav item */
      .fav-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 14px;
        transition: border-color 150ms, box-shadow 150ms;
      }
      .fav-item:hover {
        border-color: #7C3AED44;
        box-shadow: 0 2px 12px rgba(124,58,237,0.08);
      }

      .fav-item-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
      .fav-meta { min-width: 0; }
      .fav-category { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px; }
      .fav-name { font-size: 15px; font-weight: 700; color: #FAFAFA; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fav-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
      .target-chip {
        padding: 3px 8px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 999px;
        font-size: 11px;
        color: #888;
        text-transform: capitalize;
      }

      .fav-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
      .fav-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
      .fav-price-value { font-size: 16px; font-weight: 700; color: #7C3AED; font-family: 'JetBrains Mono', monospace; }
      .fav-marketplace { font-size: 11px; color: #666; text-transform: capitalize; }

      .fav-actions { display: flex; gap: 6px; align-items: center; }
      .btn-buy {
        width: 34px; height: 34px;
        display: flex; align-items: center; justify-content: center;
        background: #7C3AED22;
        border: 1px solid #7C3AED44;
        border-radius: 50%;
        font-size: 15px;
        text-decoration: none;
        transition: all 150ms;
      }
      .btn-buy:hover { background: #7C3AED; }
      .btn-add-stack-fav {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 1px solid #2A2A2A;
        background: #1E1E1E;
        color: #888;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 150ms;
      }
      .btn-add-stack-fav:hover { border-color: #00E676; color: #00E676; }
      .btn-add-stack-fav.in-stack { background: #00E67611; border-color: #00E67644; color: #00E676; }
      .btn-remove-fav {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 1px solid #EF535022;
        background: #EF535011;
        color: #EF5350;
        font-size: 16px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 150ms;
      }
      .btn-remove-fav:hover { background: #EF5350; color: #fff; }

      /* Shared */
      .btn-ghost {
        padding: 9px 18px;
        background: transparent;
        border: 1px solid #2A2A2A;
        border-radius: 10px;
        color: #888;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: all 150ms;
      }
      .btn-ghost:hover { border-color: #7C3AED; color: #FAFAFA; }
      .btn-primary {
        padding: 10px 20px;
        background: #7C3AED;
        border: none;
        border-radius: 999px;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        font-family: 'Inter', sans-serif;
        display: inline-flex;
        align-items: center;
        transition: opacity 150ms;
      }
      .btn-primary:hover { opacity: 0.9; }

      @media (max-width: 480px) {
        .fav-item { flex-direction: column; align-items: flex-start; }
        .fav-item-right { flex-direction: row; width: 100%; justify-content: space-between; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default FavoritesPage;
```

---

## VALIDATION CHECKLIST

- [ ] Favorites list renders all favorited supplements from StateManager
- [ ] Empty state (no favorites) shows "Explorar catálogo" CTA
- [ ] Empty state (filtered, no match) shows "Limpar filtros" button
- [ ] Category and evidence filters reduce the list correctly
- [ ] Sort "Evidência" orders A > B > C > D
- [ ] Sort "Menor preço" orders ascending by affiliate price
- [ ] Stats bar updates after remove/add events
- [ ] "✕ Limpar" button resets both filters
- [ ] ♥ (remove-fav) button dispatches REMOVE_FAVORITE and shows toast
- [ ] "+" dispatches ADD_TO_STACK; turns green ✓ when in stack
- [ ] Clicking ✓ (in-stack) dispatches REMOVE_FROM_STACK
- [ ] 🛒 buy link opens correct affiliate URL in new tab
- [ ] `trackAffiliateClick` is called on 🛒 click
- [ ] Mobile (<480px): item stacks vertically, actions row stays horizontal

## FILES TO DELIVER

1. `/src/pages/favorites-page.js`
```

---

## **PROMPT 4.4: CheckinStreakSystem — COMPLETO**

```markdown
You are building the Checkin & Streak System for SupliList v4.0.

## CONTEXT

The streak system is the gamification core of SupliList.
It tracks daily supplement adherence, builds streaks, awards badges,
and shows the user a motivational timeline of their journey.

Components:
1. `CheckinStreakSystem` class (core logic, no UI)
2. `StreakPage` (visual timeline, badges, milestones)
3. `DailyCheckinModal` (quick full-stack check-in from any page)

Design philosophy:
- Streak breaks only if user misses an entire calendar day
- "Partial" check-ins count (took 3 of 5 supplements = partial day, streak lives)
- Milestones at 7, 14, 30, 60, 90, 180, 365 days trigger special badges
- Timeline shows the last 30 days as a heatmap

---

## TASK 1: CREATE /src/systems/checkin-streak-system.js

```javascript
/**
 * CheckinStreakSystem v4.0 — SupliList
 * Core logic: streaks, adherence, badges, milestones
 */

export class CheckinStreakSystem {
  constructor(stateManager) {
    this.sm = stateManager;
  }

  // ── Streak calculation ──

  /**
   * Current streak: consecutive days where the user had ≥1 check-in.
   * A day counts if ANY supplement was checked in.
   * Partial adherence (not all supplements) still counts.
   */
  getCurrentStreak() {
    const checkins = this.sm.state.checkins || [];
    if (checkins.length === 0) return 0;

    const daySet  = this._getDaySet(checkins);
    const today   = this._dateKey(new Date());
    const days    = [...daySet].sort().reverse(); // newest first

    // If most recent check-in isn't today or yesterday, streak is 0
    if (days[0] !== today && days[0] !== this._dateKey(this._yesterday())) {
      return 0;
    }

    let streak = 0;
    let cursor = days[0] === today ? new Date() : this._yesterday();

    for (const day of days) {
      const expected = this._dateKey(cursor);
      if (day === expected) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400000);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Best (record) streak ever.
   */
  getBestStreak() {
    const checkins = this.sm.state.checkins || [];
    if (checkins.length === 0) return 0;

    const days = [...this._getDaySet(checkins)].sort();
    let maxStreak = 0;
    let current   = 1;

    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diff = (curr - prev) / 86400000;

      if (diff === 1) {
        current++;
      } else {
        maxStreak = Math.max(maxStreak, current);
        current   = 1;
      }
    }

    return Math.max(maxStreak, current);
  }

  /**
   * Adherence % for last N days.
   * adhered = days with ≥ threshold% of stack checked in
   */
  getAdherence(days = 30, threshold = 0.5) {
    const checkins = this.sm.state.checkins || [];
    const stack    = this.sm.state.stack    || [];
    if (!stack.length) return 100;

    const cutoff = Date.now() - days * 86400000;

    // Group checkins by day
    const byDay = {};
    checkins.filter(c => c.timestamp >= cutoff).forEach(c => {
      const key = this._dateKey(new Date(c.timestamp));
      if (!byDay[key]) byDay[key] = new Set();
      byDay[key].add(c.supplementId);
    });

    const adheredDays = Object.values(byDay).filter(
      set => set.size / stack.length >= threshold
    ).length;

    return Math.round((adheredDays / days) * 100);
  }

  /**
   * Today's adherence fraction (0–1).
   */
  getTodayAdherence() {
    const stack    = this.sm.state.stack    || [];
    const todayCI  = this.sm.todayCheckins  || [];
    if (!stack.length) return 1;
    return Math.min(todayCI.length / stack.length, 1);
  }

  // ── Heatmap data for last 30 days ──

  /**
   * Returns an array of 30 day objects for the heatmap:
   * { date: Date, key: 'YYYY-MM-DD', count: N, total: N, level: 0-4 }
   */
  getHeatmapData(days = 30) {
    const checkins = this.sm.state.checkins || [];
    const stack    = this.sm.state.stack    || [];
    const result   = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const key  = this._dateKey(date);
      const dayCheckins = checkins.filter(c => this._dateKey(new Date(c.timestamp)) === key);
      const count       = new Set(dayCheckins.map(c => c.supplementId)).size;
      const total       = stack.length || 1;

      // Level: 0 (none) → 4 (full)
      const ratio = count / total;
      const level = count === 0 ? 0
                  : ratio < 0.25 ? 1
                  : ratio < 0.5  ? 2
                  : ratio < 1    ? 3
                  : 4;

      result.push({ date, key, count, total, level });
    }

    return result;
  }

  // ── Badges / achievements ──

  /**
   * Returns an array of all badges, each with { id, earned, earnedAt }
   */
  getBadges() {
    const streak      = this.getCurrentStreak();
    const best        = this.getBestStreak();
    const totalDays   = this._getDaySet(this.sm.state.checkins || []).size;
    const adherence30 = this.getAdherence(30);

    const BADGE_DEFS = [
      { id: 'first-day',    label: '🌱 Primeiro Dia',      desc: 'Primeiro check-in',         condition: totalDays >= 1      },
      { id: 'week-1',       label: '7️⃣ Semana 1',          desc: 'Streak de 7 dias',           condition: best >= 7           },
      { id: 'fortnight',    label: '🔥 Quinzena',          desc: 'Streak de 14 dias',          condition: best >= 14          },
      { id: 'month-1',      label: '🏅 30 Dias',           desc: 'Streak de 30 dias',          condition: best >= 30          },
      { id: 'two-months',   label: '⚡ 60 Dias',           desc: 'Streak de 60 dias',          condition: best >= 60          },
      { id: 'quarter',      label: '💎 90 Dias',           desc: 'Streak de 90 dias',          condition: best >= 90          },
      { id: 'half-year',    label: '🥇 180 Dias',          desc: 'Streak de 180 dias',         condition: best >= 180         },
      { id: 'year-1',       label: '👑 1 Ano',             desc: 'Streak de 365 dias!',        condition: best >= 365         },
      { id: 'adherent-80',  label: '📊 80% Adesão',        desc: '80% de adesão em 30 dias',   condition: adherence30 >= 80   },
      { id: 'adherent-100', label: '💯 Perfeito',          desc: '100% de adesão em 30 dias',  condition: adherence30 === 100 },
      { id: 'century',      label: '💯 100 Dias',          desc: '100 dias totais com check-in', condition: totalDays >= 100  },
    ];

    // Load persisted earnedAt from state
    const saved = this.sm.state.earnedBadges || {};

    return BADGE_DEFS.map(def => ({
      ...def,
      earned:   def.condition,
      earnedAt: def.condition ? (saved[def.id] ?? Date.now()) : null
    }));
  }

  /**
   * Check if any new badges were earned since last check.
   * Call this after every check-in. Returns array of newly earned badges.
   */
  checkNewBadges(previousBadges = []) {
    const current  = this.getBadges();
    const prevIds  = new Set(previousBadges.filter(b => b.earned).map(b => b.id));
    return current.filter(b => b.earned && !prevIds.has(b.id));
  }

  // ── Milestones ──

  getNextMilestone() {
    const best = this.getBestStreak();
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    const next = milestones.find(m => m > best);
    if (!next) return null;
    return {
      target:    next,
      remaining: next - best,
      progress:  Math.round((best / next) * 100)
    };
  }

  // ── Private helpers ──

  _dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  _yesterday() {
    return new Date(Date.now() - 86400000);
  }

  _getDaySet(checkins) {
    return new Set(checkins.map(c => this._dateKey(new Date(c.timestamp))));
  }
}

export default CheckinStreakSystem;
```

---

## TASK 2: CREATE /src/pages/streak-page.js

```javascript
/**
 * StreakPage v4.0 — SupliList
 * Timeline visual, badges, heatmap, milestones
 */

import sm, { ACTIONS }  from '../state/state-manager.js';
import CheckinStreakSystem from '../systems/checkin-streak-system.js';

export class StreakPage {
  constructor(container) {
    this.container = container;
    this._system   = new CheckinStreakSystem(sm);
    this._unsub    = null;
  }

  mount() {
    this._render();

    this._unsub = sm.subscribe((state, action) => {
      if (['ADD_CHECKIN','REMOVE_CHECKIN'].includes(action.type)) {
        this._render();
      }
    });
  }

  unmount() { this._unsub?.(); }

  _render() {
    const streak    = this._system.getCurrentStreak();
    const best      = this._system.getBestStreak();
    const adherence = this._system.getAdherence(30);
    const heatmap   = this._system.getHeatmapData(30);
    const badges    = this._system.getBadges();
    const milestone = this._system.getNextMilestone();

    this.container.innerHTML = `
      <div class="streak-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">🔥 Progresso</h1>
          <p class="page-subtitle">Sua jornada de suplementação</p>
        </div>

        <!-- ── Streak Hero ── -->
        <section class="streak-hero-section">
          <streak-counter count="${streak}" record="${best}"></streak-counter>

          <div class="streak-stats-row">
            <div class="streak-stat">
              <span class="ss-value">${best}</span>
              <span class="ss-label">Recorde</span>
            </div>
            <div class="streak-stat-divider" aria-hidden="true"></div>
            <div class="streak-stat">
              <span class="ss-value">${adherence}%</span>
              <span class="ss-label">Adesão 30d</span>
            </div>
            <div class="streak-stat-divider" aria-hidden="true"></div>
            <div class="streak-stat">
              <span class="ss-value">${sm.state.checkins?.length ?? 0}</span>
              <span class="ss-label">Check-ins</span>
            </div>
          </div>
        </section>

        <!-- ── Next milestone ── -->
        ${milestone ? `
          <section class="milestone-section card">
            <div class="milestone-header">
              <span class="milestone-icon">🎯</span>
              <div>
                <h3 class="milestone-title">Próximo marco: ${milestone.target} dias</h3>
                <p class="milestone-sub">${milestone.remaining} dias para o próximo badge</p>
              </div>
              <span class="milestone-pct">${milestone.progress}%</span>
            </div>
            <div class="milestone-bar" role="progressbar" aria-valuenow="${milestone.progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="milestone-fill" style="width:${milestone.progress}%"></div>
            </div>
          </section>
        ` : `
          <div class="milestone-complete card">
            <span>🏆 Você atingiu todos os marcos! Lendário.</span>
          </div>
        `}

        <!-- ── 30-day Heatmap ── -->
        <section class="heatmap-section card" aria-label="Heatmap de check-ins — últimos 30 dias">
          <h2 class="section-title">Últimos 30 dias</h2>
          <div class="heatmap-grid" role="list" aria-label="Calendário de adesão">
            ${heatmap.map(day => {
              const label = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              return `
                <div
                  class="heatmap-cell level-${day.level}"
                  role="listitem"
                  aria-label="${label}: ${day.count} de ${day.total} suplementos"
                  title="${label}: ${day.count}/${day.total}"
                ></div>
              `;
            }).join('')}
          </div>
          <div class="heatmap-legend" aria-hidden="true">
            <span>Menos</span>
            ${[0,1,2,3,4].map(l => `<div class="legend-cell level-${l}"></div>`).join('')}
            <span>Mais</span>
          </div>
        </section>

        <!-- ── Badges ── -->
        <section class="badges-section" aria-label="Conquistas">
          <h2 class="section-title">Conquistas</h2>
          <div class="badges-grid" role="list">
            ${badges.map(badge => `
              <div
                class="badge-card ${badge.earned ? 'earned' : 'locked'}"
                role="listitem"
                aria-label="${badge.label}: ${badge.earned ? 'conquistado' : 'bloqueado'}"
                title="${badge.desc}"
              >
                <span class="badge-icon" aria-hidden="true">${badge.label.split(' ')[0]}</span>
                <span class="badge-name">${badge.label.split(' ').slice(1).join(' ')}</span>
                <span class="badge-desc">${badge.desc}</span>
                ${badge.earned && badge.earnedAt ? `
                  <span class="badge-date">
                    ${new Date(badge.earnedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </section>

      </div>
    `;

    this._attachStyles();
  }

  _attachStyles() {
    if (document.getElementById('streak-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'streak-page-styles';
    style.textContent = `
      .streak-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px 16px 100px;
        max-width: 700px;
        margin: 0 auto;
      }
      .page-header { margin-bottom: 4px; }
      .page-title { font-size: 24px; font-weight: 800; color: #FAFAFA; margin: 0 0 4px; }
      .page-subtitle { font-size: 14px; color: #888; margin: 0; }

      /* Card */
      .card {
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 16px;
        padding: 20px;
      }
      .section-title { font-size: 16px; font-weight: 700; color: #FAFAFA; margin: 0 0 16px; }

      /* Streak hero */
      .streak-hero-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }
      .streak-stats-row {
        display: flex;
        gap: 0;
        align-items: center;
        background: #141414;
        border: 1px solid #2A2A2A;
        border-radius: 14px;
        padding: 16px;
        width: 100%;
        max-width: 400px;
      }
      .streak-stat {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .ss-value {
        font-size: 24px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: #7C3AED;
        line-height: 1;
      }
      .ss-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
      .streak-stat-divider { width: 1px; height: 36px; background: #2A2A2A; }

      /* Milestone */
      .milestone-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .milestone-icon { font-size: 24px; flex-shrink: 0; }
      .milestone-title { font-size: 15px; font-weight: 700; color: #FAFAFA; margin: 0 0 2px; }
      .milestone-sub { font-size: 12px; color: #888; margin: 0; }
      .milestone-pct { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; color: #7C3AED; margin-left: auto; }
      .milestone-bar { height: 6px; background: #2A2A2A; border-radius: 999px; overflow: hidden; }
      .milestone-fill {
        height: 100%;
        background: linear-gradient(90deg, #7C3AED, #00E676);
        border-radius: 999px;
        transition: width 600ms ease;
      }
      .milestone-complete {
        text-align: center;
        color: #FFB74D;
        font-size: 15px;
        font-weight: 700;
      }

      /* Heatmap */
      .heatmap-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
        margin-bottom: 10px;
      }
      .heatmap-cell {
        aspect-ratio: 1;
        border-radius: 4px;
        cursor: default;
        transition: transform 150ms;
      }
      .heatmap-cell:hover { transform: scale(1.3); }
      .level-0 { background: #1E1E1E; border: 1px solid #2A2A2A; }
      .level-1 { background: #4C1D95; }
      .level-2 { background: #6D28D9; }
      .level-3 { background: #7C3AED; }
      .level-4 { background: #00E676; }

      .heatmap-legend {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #666;
        justify-content: flex-end;
      }
      .legend-cell {
        width: 12px; height: 12px;
        border-radius: 3px;
      }

      /* Badges */
      .badges-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .badge-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 14px 8px;
        background: #1E1E1E;
        border: 1px solid #2A2A2A;
        border-radius: 14px;
        text-align: center;
        transition: transform 200ms, box-shadow 200ms;
      }
      .badge-card.earned {
        background: #7C3AED11;
        border-color: #7C3AED44;
        animation: badgeIn 400ms ease;
      }
      .badge-card.earned:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(124,58,237,0.2);
      }
      @keyframes badgeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      .badge-card.locked { opacity: 0.4; filter: grayscale(1); }
      .badge-icon { font-size: 28px; line-height: 1; }
      .badge-name { font-size: 12px; font-weight: 700; color: #FAFAFA; line-height: 1.2; }
      .badge-desc { font-size: 11px; color: #888; line-height: 1.3; }
      .badge-date { font-size: 10px; color: #7C3AED; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

      @media (min-width: 480px) {
        .badges-grid { grid-template-columns: repeat(4, 1fr); }
        .heatmap-grid { grid-template-columns: repeat(15, 1fr); }
      }
      @media (min-width: 768px) {
        .streak-page { padding: 32px 24px 80px; }
        .badges-grid { grid-template-columns: repeat(5, 1fr); }
        .heatmap-grid { grid-template-columns: repeat(30, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default StreakPage;
```

---

## VALIDATION CHECKLIST

### CheckinStreakSystem
- [ ] `getCurrentStreak()` returns 0 when last check-in was >1 day ago
- [ ] `getCurrentStreak()` counts consecutive days correctly (no gaps)
- [ ] `getCurrentStreak()` returns 1 when only today has check-ins
- [ ] `getBestStreak()` returns the highest consecutive streak ever
- [ ] `getAdherence(30)` returns % of days with ≥50% supplements checked in last 30 days
- [ ] `getHeatmapData(30)` returns exactly 30 objects with level 0–4
- [ ] `getBadges()` returns `earned: true` only when the condition is met
- [ ] `getBestStreak() >= 7` → `week-1` badge earned
- [ ] `checkNewBadges(prev)` returns only newly earned badges not in prev list
- [ ] `getNextMilestone()` returns `null` if streak ≥ 365

### StreakPage
- [ ] `<streak-counter>` shows correct streak and record
- [ ] Stats row shows best, adherence %, total check-ins
- [ ] Milestone bar width matches `milestone.progress`
- [ ] Heatmap renders 30 cells, darkest for level 4 (all supplements that day), empty for level 0
- [ ] Hovering heatmap cell scales it up
- [ ] Earned badges have purple background, locked badges are greyed out
- [ ] Badges with `earned: true` animate in on first render
- [ ] Mobile (≤480px): 3-col badge grid, 10-col heatmap
- [ ] Desktop (≥768px): 5-col badge grid, 30-col heatmap (one cell per day, full row)

## FILES TO DELIVER

1. `/src/systems/checkin-streak-system.js`
2. `/src/pages/streak-page.js`
```

---

## 📊 RESUMO DO SPRINT 4

| Prompt | Arquivo(s) | Componentes | Destaques |
|--------|-----------|-------------|-----------|
| 4.1 | `dosage-calculator-page.js` | DosageCalculatorPage | Sliders bidirecionais, recálculo 180ms, score bar, budget |
| 4.2 | `my-stack-page.js` | MyStackPage | Stock tracking, days-left urgency, modal CRUD, affiliate reorder |
| 4.3 | `favorites-page.js` | FavoritesPage | Filter + sort, price display, toggle stack, remove fav |
| 4.4 | `checkin-streak-system.js` + `streak-page.js` | CheckinStreakSystem + StreakPage | Streak lógica, heatmap 30d, 11 badges, milestone bar |

**Após completar o Sprint 4:**
- Calculadora científica com perfil completo ✅
- Gerenciamento de stack com rastreamento de estoque ✅
- Lista de favoritos com filtros e compra direta ✅
- Sistema de streaks e badges gamificado ✅

**Total acumulado Sprints 1–4:**
- 10 Web Components reutilizáveis
- 6 Pages completas (Home, List, Calculator, MyStack, Favorites, Streak)
- 2 AI engines (StackRecommender, DosageCalculator)
- 1 Affiliate engine (monetização)
- 1 Streak system (gamificação)
- 1 Design system CSS (40+ tokens)
- 1 PWA manifest + Service Worker

**Próximo:** Sprint 5 — AffiliateEngine real + PriceComparator + Premium tier (Fase 2)

---

*SupliList v4.0 — Sprint 4 | 26 de maio de 2026*
