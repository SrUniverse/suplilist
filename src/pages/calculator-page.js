/**
 * DosageCalculatorPage — SupliList
 * Calculadora de dosagem personalizada por biometria real
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import recommender, { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import DosageCalculator from '../ai/dosage-calculator.js';

export default class DosageCalculatorPage {
  constructor(container) {
    this.container = container;
    this._profile = this._loadProfile();
    this._results = [];
    this._debounce = null;
  }

  mount() {
    this._attachStyles();
    this._render();
    this._attachListeners();
    this._calculate();
  }

  unmount() {
    clearTimeout(this._debounce);
  }

  // ── Load saved profile from StateManager ─────────────────────────────────
  _loadProfile() {
    const u = stateManager.user ?? {};
    return {
      objective: u.objective ?? 'general',
      weight: u.weight ?? 75,
      height: u.height ?? 175,
      age: u.age ?? 28,
      trainingAge: u.trainingAge ?? 2,
      trainingFrequency: u.trainingFrequency ?? 4,
      budget: u.budget ?? 250,
      restrictions: u.restrictions ? [...u.restrictions] : [],
    };
  }

  // ── Shell render ──────────────────────────────────────────────────────────
  _render() {
    const p = this._profile;
    this.container.innerHTML = `
      <div class="calc-page">

        <div class="page-header">
          <h1 class="page-title">⚗️ Calculadora</h1>
          <p class="page-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <section class="calc-card profile-form" aria-label="Perfil biométrico">
          <h2 class="section-title">Seu Perfil</h2>

          <!-- Objetivo -->
          <div class="form-group">
            <label class="form-label">🎯 Objetivo Principal</label>
            <div class="objective-pills" role="radiogroup" aria-label="Objetivo">
              ${[
                { value: 'bulk',      label: '📈 Bulk',       desc: 'Ganho de massa' },
                { value: 'cut',       label: '🔥 Cut',        desc: 'Perda de gordura' },
                { value: 'strength',  label: '💪 Força',      desc: 'Força máxima' },
                { value: 'endurance', label: '🏃 Resistência', desc: 'Cardio/endurance' },
                { value: 'general',   label: '🌿 Saúde',      desc: 'Bem-estar geral' },
              ].map(o => `
                <button class="objective-pill${p.objective === o.value ? ' active' : ''}"
                  data-value="${o.value}" data-field="objective"
                  role="radio" aria-checked="${p.objective === o.value}" title="${o.desc}"
                >${o.label}</button>`).join('')}
            </div>
          </div>

          <!-- Peso + Altura -->
          <div class="form-row">
            ${this._sliderGroup('weight', '⚖️ Peso', 40, 150, 1, p.weight, 'kg')}
            ${this._sliderGroup('height', '📏 Altura', 140, 220, 1, p.height, 'cm')}
          </div>

          <!-- Idade + Anos treino -->
          <div class="form-row">
            ${this._sliderGroup('age', '🎂 Idade', 15, 75, 1, p.age, 'anos')}
            ${this._sliderGroup('trainingAge', '🏋️ Anos treinando', 0, 20, 0.5, p.trainingAge, 'anos')}
          </div>

          <!-- Frequência + Budget -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">📅 Dias de treino/semana</label>
              <div class="frequency-pills" role="radiogroup" aria-label="Frequência">
                ${[2, 3, 4, 5, 6, 7].map(d => `
                  <button class="freq-pill${p.trainingFrequency === d ? ' active' : ''}"
                    data-value="${d}" data-field="trainingFrequency"
                    role="radio" aria-checked="${p.trainingFrequency === d}"
                    aria-label="${d} dias por semana"
                  >${d}×</button>`).join('')}
              </div>
            </div>
            ${this._sliderGroup('budget', '💵 Orçamento mensal', 50, 1000, 10, p.budget, 'R$', true)}
          </div>

          <!-- Restrições -->
          <div class="form-group">
            <label class="form-label">🚫 Restrições / Alergias</label>
            <div class="restriction-pills" role="group" aria-label="Restrições">
              ${[
                { value: 'gluten',     label: '🌾 Glúten' },
                { value: 'lactose',    label: '🥛 Lactose' },
                { value: 'shellfish',  label: '🦐 Crustáceos' },
                { value: 'soy',        label: '🫘 Soja' },
                { value: 'vegetarian', label: '🥦 Vegetariano' },
                { value: 'vegan',      label: '🌱 Vegano' },
              ].map(r => `
                <button class="restriction-pill${p.restrictions.includes(r.value) ? ' active-danger' : ''}"
                  data-value="${r.value}" data-action="toggle-restriction"
                  aria-pressed="${p.restrictions.includes(r.value)}"
                >${r.label}</button>`).join('')}
            </div>
          </div>

          <button class="btn-save-profile" data-action="save-profile">💾 Salvar perfil</button>
        </section>

        <div class="calc-divider" aria-hidden="true"><span>Recomendações para você</span></div>

        <section class="results-section" id="results-section" aria-live="polite" aria-label="Resultados">
          <div class="results-loading" id="results-loading">
            <div class="spinner"></div>
            <p>Calculando seu stack ideal...</p>
          </div>
          <div class="results-grid" id="results-grid"></div>
        </section>

        <section class="calc-card budget-section" id="budget-section" style="display:none">
          <h2 class="section-title">💵 Resumo de Custo</h2>
          <div class="budget-grid" id="budget-grid"></div>
          <div class="budget-total" id="budget-total"></div>
        </section>

        <p class="disclaimer">
          ⚠️ As recomendações são baseadas em evidências científicas e perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo.
        </p>
      </div>
    `;
  }

  _sliderGroup(field, label, min, max, step, value, unit, unitBefore = false) {
    const unitBef = unitBefore ? `<span class="unit-label">${unit}</span>` : '';
    const unitAft = unitBefore ? '' : `<span class="unit-label">${unit}</span>`;
    return `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <div class="input-with-unit">
          <input type="range" id="${field}-slider" class="range-slider"
            min="${min}" max="${max}" step="${step}" value="${value}"
            data-field="${field}" aria-label="${label}">
          <div class="range-value-row">
            ${unitBef}
            <input type="number" id="${field}" class="number-input"
              min="${min}" max="${max}" step="${step}" value="${value}"
              data-field="${field}" aria-label="${label}">
            ${unitAft}
          </div>
        </div>
      </div>`;
  }

  // ── Calculation ───────────────────────────────────────────────────────────
  _calculate() {
    const loading = this.container.querySelector('#results-loading');
    const grid = this.container.querySelector('#results-grid');
    if (loading) loading.style.display = 'flex';
    if (grid) grid.innerHTML = '';

    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => {
      try {
        const recs = recommender.recommend(this._profile, 8);
        this._results = recs.map(supp => {
          let dosage = supp.dosage ?? {};
          try {
            const rawSupp = SUPPLEMENTS_DB.find(s => s.id === supp.id);
            if (rawSupp) {
              const calc = DosageCalculator.calculate(rawSupp, this._profile);
              if (calc) {
                dosage = {
                  ...dosage,
                  daily: calc.daily,
                  scientificRationale: calc.rationale ?? dosage.scientificRationale,
                };
              }
            }
          } catch (err) {
            console.warn('[DosageCalculatorPage] Dosage calculation error for', supp.id, err);
          }
          return { ...supp, dosage };
        });
      } catch (e) {
        console.warn('[DosageCalculatorPage] _calculate error', e);
        this._results = [];
      }
      this._renderResults();
      this._renderBudget();
      if (loading) loading.style.display = 'none';
    }, 180);
  }

  _renderResults() {
    const grid = this.container.querySelector('#results-grid');
    if (!grid) return;

    if (!this._results.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:32px">🤷</p>
          <p>Nenhum suplemento encontrado. Ajuste as restrições ou objetivo.</p>
        </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    const favorites = stateManager.getState?.()?.favorites ?? stateManager.favorites ?? [];
    const stack = stateManager.stack ?? [];

    this._results.forEach((supp, index) => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.dataset.id = supp.id;
      card.role = 'article';
      card.style.animationDelay = `${index * 60}ms`;

      const scorePercent = Math.round((supp.score ?? 0) * 100);
      const scoreColor = scorePercent >= 80 ? 'var(--color-success)' : scorePercent >= 60 ? 'var(--color-brand)' : '#FFB74D';
      const isFav = favorites.some(f => f === supp.id || f.supplementId === supp.id);
      const inStack = stack.some(s => s.supplementId === supp.id);

      card.innerHTML = `
        <div class="result-rank" aria-label="Posição ${index + 1}">#${index + 1}</div>
        <div class="result-header">
          <div class="result-meta">
            <p class="result-category">${supp.category ?? ''}</p>
            <h3 class="result-name">${supp.name}</h3>
          </div>
          <evidence-pill level="${supp.evidenceLevel ?? supp.evidence ?? 'D'}"></evidence-pill>
        </div>
        <div class="score-section" aria-label="Compatibilidade: ${scorePercent}%">
          <div class="score-label">
            <span>Compatibilidade</span>
            <span style="color:${scoreColor};font-weight:700;font-family:'JetBrains Mono',monospace">${scorePercent}%</span>
          </div>
          <div class="score-bar" role="progressbar" aria-valuenow="${scorePercent}" aria-valuemin="0" aria-valuemax="100">
            <div class="score-fill" style="width:${scorePercent}%;background:${scoreColor}"></div>
          </div>
        </div>
        <div class="dosage-block">
          <div class="dosage-main">
            <span class="dosage-value">${supp.dosage?.daily ?? supp.dosage?.maintenance ?? '—'}</span>
            <span class="dosage-unit">${supp.dosage?.unit ?? 'g'}/dia</span>
          </div>
          <p class="dosage-rationale">${supp.dosage?.scientificRationale ?? ''}</p>
        </div>
        ${supp.benefits?.length ? `
          <div class="benefits-row" aria-label="Benefícios">
            ${supp.benefits.slice(0, 3).map(b => `
              <span class="benefit-chip">
                <span class="benefit-label">${typeof b === 'string' ? b : b.label}</span>
                ${b.likelihood ? `<span class="benefit-pct">${b.likelihood}</span>` : ''}
              </span>`).join('')}
          </div>` : ''}
        <div class="result-cost">
          <span class="cost-label">Custo estimado</span>
          <span class="cost-value">R$ ${(supp.cost?.perMonth ?? 0).toFixed(2)}/mês</span>
        </div>
        ${supp.warnings?.length > 1 ? `
          <div class="warnings-section">
            ${supp.warnings.slice(1).map(w => `<p class="warning-item">⚠️ ${w}</p>`).join('')}
          </div>` : ''}
        ${supp.interactions?.length ? `
          <div class="interactions-section">
            ${supp.interactions.map(i => `
              <p class="interaction-item interaction-${i.severity ?? 'info'}">⚡ ${i.message ?? i}</p>`).join('')}
          </div>` : ''}
        <div class="result-actions">
          <button class="btn-action${isFav ? ' active-fav' : ''}" data-action="toggle-fav"
            data-id="${supp.id}" data-name="${supp.name}"
            aria-label="${isFav ? 'Remover favorito' : 'Adicionar favorito'}" aria-pressed="${isFav}">
            ${isFav ? '♥ Favorito' : '♡ Favoritar'}
          </button>
          <button class="btn-action btn-action-primary${inStack ? ' active-stack' : ''}" data-action="toggle-stack"
            data-id="${supp.id}" data-name="${supp.name}"
            aria-label="${inStack ? 'Remover do stack' : 'Adicionar ao stack'}" aria-pressed="${inStack}">
            ${inStack ? '✓ No stack' : '+ Stack'}
          </button>
        </div>
      `;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  _renderBudget() {
    const section = this.container.querySelector('#budget-section');
    const bgGrid = this.container.querySelector('#budget-grid');
    const totalEl = this.container.querySelector('#budget-total');
    if (!section || !bgGrid || !totalEl || !this._results.length) return;

    section.style.display = 'block';
    const totalCost = this._results.reduce((sum, s) => sum + (s.cost?.perMonth ?? 0), 0);
    const remaining = this._profile.budget - totalCost;

    bgGrid.innerHTML = this._results.map(s => `
      <div class="budget-item">
        <span class="budget-item-name">${s.name}</span>
        <span class="budget-item-cost">R$ ${(s.cost?.perMonth ?? 0).toFixed(2)}</span>
      </div>`).join('');

    totalEl.innerHTML = `
      <div class="budget-total-row">
        <span>Total do stack</span>
        <span class="budget-total-value" style="color:${totalCost > this._profile.budget ? 'var(--color-error)' : 'var(--color-success)'}">
          R$ ${totalCost.toFixed(2)}
        </span>
      </div>
      <div class="budget-total-row" style="font-size:13px;color:var(--color-text-muted)">
        <span>Orçamento</span><span>R$ ${this._profile.budget.toFixed(2)}</span>
      </div>
      <div class="budget-total-row" style="font-size:13px">
        <span>${remaining >= 0 ? 'Saldo restante' : 'Excede orçamento em'}</span>
        <span style="color:${remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">
          ${remaining >= 0 ? '+' : ''}R$ ${Math.abs(remaining).toFixed(2)}
        </span>
      </div>`;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────
  _attachListeners() {
    // Objective pills
    this.container.querySelectorAll('.objective-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.objective-pill').forEach(b => {
          b.classList.remove('active'); b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
        this._profile.objective = btn.dataset.value;
        this._calculate();
      });
    });

    // Frequency pills
    this.container.querySelectorAll('.freq-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.freq-pill').forEach(b => {
          b.classList.remove('active'); b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
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

    // Sliders <-> number inputs (bidirectional)
    ['weight', 'height', 'age', 'trainingAge', 'budget'].forEach(field => {
      const slider = this.container.querySelector(`#${field}-slider`);
      const input = this.container.querySelector(`#${field}`);
      if (!slider || !input) return;

      const update = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        this._profile[field] = num;
        slider.value = num;
        input.value = num;
        this._calculate();
      };

      slider.addEventListener('input', e => update(e.target.value));
      input.addEventListener('change', e => {
        const clamped = Math.min(Math.max(parseFloat(e.target.value), parseFloat(input.min)), parseFloat(input.max));
        update(clamped);
      });
    });

    // Save profile
    this.container.querySelector('[data-action="save-profile"]')?.addEventListener('click', () => {
      stateManager.dispatch(ACTIONS.SET_USER_PROFILE ?? 'SET_USER_PROFILE', { ...this._profile });
      if (window.SupliToast) window.SupliToast.show('✓ Perfil salvo!', 'success');
    });

    // Result actions (delegated)
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="toggle-fav"],[data-action="toggle-stack"]');
      if (!btn) return;
      const { action } = btn.dataset;
      const id = btn.dataset.id;
      const name = btn.dataset.name;

      if (action === 'toggle-fav') {
        const isFav = stateManager.getState?.()?.favorites?.some(f => f === id || f.supplementId === id) ?? false;
        stateManager.dispatch(isFav ? ACTIONS.REMOVE_FAVORITE : ACTIONS.ADD_FAVORITE, { supplementId: id });
        btn.textContent = isFav ? '♡ Favoritar' : '♥ Favorito';
        btn.classList.toggle('active-fav', !isFav);
        btn.setAttribute('aria-pressed', String(!isFav));
        if (window.SupliToast) window.SupliToast.show(isFav ? `${name} removido dos favoritos` : `♥ ${name} favoritado!`, isFav ? 'info' : 'success');
      }

      if (action === 'toggle-stack') {
        const inStack = stateManager.stack?.some(s => s.supplementId === id) ?? false;
        if (inStack) {
          stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
        } else {
          const computed = this._results.find(r => r.id === id);
          const dosage = computed?.dosage?.daily ?? computed?.dosage?.maintenance ?? 0;
          const unit = computed?.dosage?.unit ?? 'g';
          stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
            supplementId: id,
            name,
            dosage,
            unit,
            frequency: 'diário',
          });
        }
        btn.textContent = inStack ? '+ Stack' : '✓ No stack';
        btn.classList.toggle('active-stack', !inStack);
        btn.setAttribute('aria-pressed', String(!inStack));
        if (window.SupliToast) window.SupliToast.show(inStack ? `${name} removido do stack` : `✓ ${name} adicionado!`, inStack ? 'info' : 'success');
      }
    });
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  _attachStyles() {
    if (document.getElementById('calc-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'calc-page-styles';
    style.textContent = `
      .calc-page { display:flex; flex-direction:column; gap:24px; padding:20px 16px 100px; max-width:900px; margin:0 auto; }
      .calc-card { background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:16px; padding:20px; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:var(--color-text-primary); margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:var(--color-text-muted); margin:0; }
      .section-title { font-size:16px; font-weight:700; color:var(--color-text-primary); margin:0 0 16px; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .form-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
      .form-label { font-size:13px; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.5px; }
      .input-with-unit { display:flex; flex-direction:column; gap:6px; }
      .range-slider { -webkit-appearance:none; width:100%; height:4px; background:var(--color-border); border-radius:999px; outline:none; cursor:pointer; }
      .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--color-brand); cursor:pointer; border:2px solid var(--color-text-primary); box-shadow:0 0 8px rgba(124,58,237,.5); transition:transform 150ms; }
      .range-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
      .range-value-row { display:flex; align-items:center; gap:6px; }
      .number-input { width:72px; padding:6px 10px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:8px; color:var(--color-text-primary); font-size:15px; font-family:'JetBrains Mono',monospace; font-weight:700; text-align:center; outline:none; }
      .number-input:focus { border-color:var(--color-brand); }
      .unit-label { font-size:13px; color:var(--color-text-muted); white-space:nowrap; }
      .objective-pills, .frequency-pills, .restriction-pills { display:flex; flex-wrap:wrap; gap:8px; }
      .objective-pill, .freq-pill, .restriction-pill { padding:8px 14px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; color:var(--color-text-muted); font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .objective-pill:hover, .freq-pill:hover { border-color:var(--color-brand); color:var(--color-text-primary); }
      .objective-pill.active, .freq-pill.active { background:var(--color-brand-muted); border-color:var(--color-brand); color:var(--color-brand); }
      .freq-pill { padding:8px 12px; min-width:44px; text-align:center; }
      .restriction-pill.active-danger { background:rgba(239,83,80,.07); border-color:var(--color-error); color:var(--color-error); }
      .btn-save-profile { width:100%; padding:13px; margin-top:8px; background:var(--color-brand); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 150ms,transform 150ms; font-family:inherit; }
      .btn-save-profile:hover { opacity:.9; }
      .btn-save-profile:active { transform:scale(.98); }
      .calc-divider { display:flex; align-items:center; gap:12px; color:var(--color-text-muted); font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
      .calc-divider::before, .calc-divider::after { content:''; flex:1; height:1px; background:var(--color-border); }
      .results-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px 20px; color:var(--color-text-muted); }
      .spinner { width:32px; height:32px; border:3px solid var(--color-border); border-top-color:var(--color-brand); border-radius:50%; animation:calc-spin .8s linear infinite; }
      @keyframes calc-spin { to { transform:rotate(360deg); } }
      .results-grid { display:grid; grid-template-columns:1fr; gap:16px; }
      .result-card { background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:16px; padding:20px; position:relative; animation:calcCardIn 400ms ease both; transition:border-color 150ms,box-shadow 150ms; }
      .result-card:hover { border-color:rgba(124,58,237,.27); box-shadow:0 0 20px rgba(124,58,237,.1); }
      @keyframes calcCardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .result-rank { position:absolute; top:-10px; left:16px; background:var(--color-brand); color:#fff; font-size:11px; font-weight:800; font-family:'JetBrains Mono',monospace; padding:2px 8px; border-radius:999px; }
      .result-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:14px; }
      .result-category { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.5px; margin:0 0 3px; }
      .result-name { font-size:17px; font-weight:700; color:var(--color-text-primary); margin:0; line-height:1.2; }
      .score-section { margin-bottom:14px; }
      .score-label { display:flex; justify-content:space-between; font-size:12px; color:var(--color-text-muted); margin-bottom:6px; }
      .score-bar { height:5px; background:var(--color-border); border-radius:999px; overflow:hidden; }
      .score-fill { height:100%; border-radius:999px; transition:width 500ms ease; }
      .dosage-block { display:flex; flex-direction:column; gap:4px; padding:12px; background:var(--color-bg-primary); border-radius:10px; margin-bottom:12px; }
      .dosage-main { display:flex; align-items:baseline; gap:4px; }
      .dosage-value { font-size:28px; font-weight:900; font-family:'JetBrains Mono',monospace; color:var(--color-brand); }
      .dosage-unit { font-size:14px; color:var(--color-text-muted); font-family:'JetBrains Mono',monospace; }
      .dosage-rationale { font-size:12px; color:var(--color-text-secondary); margin:0; line-height:1.4; }
      .benefits-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
      .benefit-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; font-size:12px; }
      .benefit-label { color:var(--color-text-primary); }
      .benefit-pct { color:var(--color-success); font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; }
      .result-cost { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--color-bg-primary); border-radius:8px; margin-bottom:12px; }
      .cost-label { font-size:12px; color:var(--color-text-muted); }
      .cost-value { font-size:14px; font-weight:700; color:#FFB74D; font-family:'JetBrains Mono',monospace; }
      .warnings-section, .interactions-section { margin-bottom:10px; }
      .warning-item, .interaction-item { font-size:12px; color:#FFB74D; margin:4px 0; line-height:1.4; }
      .result-actions { display:flex; gap:8px; margin-top:4px; }
      .btn-action { flex:1; padding:9px 14px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; color:var(--color-text-muted); font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .btn-action:hover { border-color:var(--color-brand); color:var(--color-text-primary); }
      .btn-action-primary { background:var(--color-brand-muted); border-color:rgba(124,58,237,.27); color:var(--color-brand); }
      .btn-action-primary:hover { background:var(--color-brand); color:#fff; }
      .active-fav { background:rgba(239,83,80,.07); border-color:rgba(239,83,80,.27); color:var(--color-error); }
      .active-stack { background:rgba(0,230,118,.07); border-color:rgba(0,230,118,.27); color:var(--color-success); }
      .budget-section .budget-grid { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
      .budget-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--color-bg-primary); font-size:14px; }
      .budget-item-name { color:var(--color-text-primary); }
      .budget-item-cost { color:var(--color-text-muted); font-family:'JetBrains Mono',monospace; }
      .budget-total { display:flex; flex-direction:column; gap:6px; padding-top:10px; border-top:1px solid var(--color-border); }
      .budget-total-row { display:flex; justify-content:space-between; font-size:15px; font-weight:600; color:var(--color-text-primary); }
      .budget-total-value { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; }
      .disclaimer { font-size:12px; color:var(--color-text-secondary); line-height:1.6; padding:12px; border:1px solid var(--color-border); border-radius:10px; background:var(--color-surface-primary); margin:0; }
      .empty-state { text-align:center; padding:48px 20px; color:var(--color-text-muted); display:flex; flex-direction:column; align-items:center; gap:12px; grid-column:1/-1; }
      @media (max-width:560px) { .form-row { grid-template-columns:1fr; gap:0; } .calc-page { padding:16px 12px 100px; } }
      @media (min-width:640px) { .results-grid { grid-template-columns:repeat(2,1fr); } }
      @media (min-width:1024px) { .results-grid { grid-template-columns:repeat(4,1fr); } .calc-page { padding:32px 24px 80px; } }
    `;
    document.head.appendChild(style);
  }
}
