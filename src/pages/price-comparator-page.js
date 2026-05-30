/**
 * PriceComparatorPage v4.0 — SupliList
 * "Batalha de Marketplaces" — comparação visual de preços em tempo real.
 *
 * Métrica central: CUSTO POR DOSE (não preço absoluto).
 * Design: battle cards com winner badge, ranking table, affiliate disclosure.
 */

import sm              from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import AffiliateEngine from '../monetization/affiliate-engine.js';
import PriceComparator from '../comparator/price-comparator.js';

export class PriceComparatorPage {
  constructor(container) {
    this.container   = container;
    this._ae         = new AffiliateEngine();
    this._comparator = new PriceComparator(this._ae, SUPPLEMENTS_DB);
    this._current    = null;  // ComparisonResult atual
    this._loading    = false;
    this._debounce   = null;
  }

  mount() {
    this._render();
    this._attachListeners();
  }

  unmount() {
    clearTimeout(this._debounce);
  }

  // ─────────────────────────────────────────────
  // RENDER SHELL
  // ─────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="comparator-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <h1 class="page-title">⚔️ Comparar Preços</h1>
          <p class="page-subtitle">Batalha de marketplaces — custo real por dose</p>
        </div>

        <!-- ── Search ── -->
        <section class="search-section" aria-label="Busca de suplemento">
          <div class="search-wrapper">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              id="comp-search"
              class="comp-search-input"
              placeholder="Buscar suplemento... (ex: creatina, whey protein)"
              autocomplete="off"
              aria-label="Buscar suplemento para comparar preços"
            >
            <div
              id="comp-search-results"
              class="comp-dropdown"
              style="display:none"
              role="listbox"
              aria-label="Resultados da busca"
            ></div>
          </div>
        </section>

        <!-- ── Dosage Context ── -->
        <section class="dosage-context card" id="dosage-context" style="display:none" aria-label="Contexto de dosagem">
          <h2 class="section-title">📐 Contexto da Comparação</h2>
          <div class="dosage-row">
            <div class="dosage-field">
              <label class="dosage-label" for="comp-quantity">Tamanho embalagem</label>
              <div class="dosage-input-group">
                <input type="number" id="comp-quantity" class="dosage-input" min="1" max="10000" value="300">
                <span class="dosage-unit" id="comp-unit-label">g</span>
              </div>
            </div>
            <div class="dosage-field">
              <label class="dosage-label" for="comp-dosage">Dose diária</label>
              <div class="dosage-input-group">
                <input type="number" id="comp-dosage" class="dosage-input" min="0.1" max="1000" step="0.1" value="5">
                <span class="dosage-unit" id="comp-dosage-unit-label">g/dia</span>
              </div>
            </div>
            <div class="dosage-field">
              <label class="dosage-label">Duração</label>
              <div class="dosage-result" id="comp-days-result">
                <span class="days-value">60</span>
                <span class="days-unit">dias</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Results: Battle Cards ── -->
        <section id="comp-results" aria-live="polite" aria-label="Comparação de preços"></section>

      </div>
    `;

    this._attachStyles();
    this._initSearch();
  }

  // ─────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────

  _initSearch() {
    const input   = this.container.querySelector('#comp-search');
    const results = this.container.querySelector('#comp-search-results');
    if (!input || !results) return;

    let debounce;
    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { results.style.display = 'none'; return; }

        const supplements = SUPPLEMENTS_DB;
        const matches = supplements
          .filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.category?.toLowerCase().includes(q)
          )
          .slice(0, 10);

        if (!matches.length) { results.style.display = 'none'; return; }

        results.innerHTML = matches.map(s => `
          <button
            class="comp-result-item"
            role="option"
            data-id="${s.id}"
            data-name="${s.name}"
            data-dosage="${s.dosage?.maintenance ?? 5}"
            data-quantity="${s.packageSize ?? 300}"
            data-unit="${s.dosage?.unit ?? 'g'}"
            data-action="select-supplement"
          >
            <span class="cri-name">${s.name}</span>
            <span class="cri-category">${s.category ?? ''}</span>
          </button>
        `).join('');

        results.style.display = 'block';
      }, 180);
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = 'none';
      }
    });
  }

  // ─────────────────────────────────────────────
  // COMPARE & RENDER
  // ─────────────────────────────────────────────

  async _runComparison(supplementId, opts = {}) {
    const resultsEl = this.container.querySelector('#comp-results');
    const ctxEl     = this.container.querySelector('#dosage-context');
    if (!resultsEl) return;

    // Loading state
    resultsEl.innerHTML = `
      <div class="comp-loading" role="status" aria-live="polite">
        <div class="loading-arena" aria-hidden="true">
          <span class="loading-marketplace" style="animation-delay:0ms">🛍️</span>
          <span class="loading-vs">⚔️</span>
          <span class="loading-marketplace" style="animation-delay:200ms">🛒</span>
          <span class="loading-vs">⚔️</span>
          <span class="loading-marketplace" style="animation-delay:400ms">📦</span>
        </div>
        <p>Consultando marketplaces...</p>
      </div>
    `;
    if (ctxEl) ctxEl.style.display = 'block';

    try {
      const result  = await this._comparator.compare(supplementId, opts);
      this._current = result;
      this._renderResults(result);
      this._syncDosageContext(result);
    } catch (err) {
      resultsEl.innerHTML = `
        <div class="comp-error card">
          <p>❌ Não foi possível comparar preços agora.</p>
          <p style="font-size:12px;color:#666">Tente novamente em instantes.</p>
          <button class="btn-primary" data-action="retry" data-id="${supplementId}">↺ Tentar novamente</button>
        </div>
      `;
    }
  }

  _renderResults(result) {
    const el = this.container.querySelector('#comp-results');
    if (!el) return;

    const hasResults = result.options.some(o => o.price > 0);

    el.innerHTML = `
      <div class="comp-header">
        <h2 class="comp-supplement-name">${result.supplementName}</h2>
        <p class="comp-subtitle">
          Embalagem: <strong>${result.quantity}${result.unit}</strong> ·
          Dose: <strong>${result.dosage}${result.unit}/dia</strong> ·
          Duração: <strong>${Math.round(result.quantity / result.dosage)} dias</strong>
        </p>
        ${result.maxSavings > 0 ? `
          <div class="comp-savings-banner">
            💰 Você pode economizar até <strong>R$ ${result.maxSavings.toFixed(2)}/mês</strong> escolhendo o melhor marketplace
          </div>
        ` : ''}
      </div>

      <!-- Battle Cards -->
      <div class="battle-grid" role="list" aria-label="Comparação de marketplaces">
        ${result.options.map(opt => this._renderBattleCard(opt)).join('')}
      </div>

      ${!hasResults ? `
        <p class="comp-no-price">Preços não disponíveis no momento. Tente novamente em alguns minutos.</p>
      ` : ''}

      <!-- Cost-per-dose ranking -->
      ${hasResults ? `
        <section class="ranking-section card">
          <h3 class="ranking-title">📊 Ranking por Custo/Dose</h3>
          <div class="ranking-list">
            ${[...result.options]
              .filter(o => o.price > 0)
              .sort((a, b) => a.costPerDose - b.costPerDose)
              .map((opt, i) => `
                <div class="ranking-item ${opt.isWinner ? 'ranking-winner' : ''}">
                  <span class="ranking-pos">${i + 1}°</span>
                  <span class="ranking-mp-emoji" aria-hidden="true">${opt.marketplaceEmoji}</span>
                  <span class="ranking-mp-name">${opt.marketplaceName}</span>
                  <span class="ranking-cost-dose">${opt.costPerDoseFormatted}/dose</span>
                  <span class="ranking-cost-month">${opt.costPerMonthFormatted}/mês</span>
                  ${opt.isWinner ? '<span class="ranking-crown" aria-label="Melhor custo-benefício">👑</span>' : ''}
                </div>
              `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Affiliate Disclosure -->
      <p class="comp-disclosure">
        💰 SupliList pode receber comissão dos marketplaces. Seu preço <strong>não muda</strong>.
        <a href="/legal" class="comp-disclosure-link">Saiba mais</a>
      </p>
    `;
  }

  _renderBattleCard(opt) {
    return `
      <div
        class="battle-card ${opt.isWinner ? 'battle-card-winner' : ''} ${opt.price === 0 ? 'battle-card-unavailable' : ''}"
        role="listitem"
        style="--mp-color:${opt.marketplaceColor ?? '#7C3AED'}"
        aria-label="${opt.marketplaceName}: ${opt.priceFormatted ?? 'Indisponível'}"
      >
        <!-- Winner Badge -->
        ${opt.isWinner ? `
          <div class="winner-badge" aria-label="Melhor custo-benefício">
            👑 Melhor Custo-Benefício
          </div>
        ` : ''}

        <!-- Marketplace Header -->
        <div class="bc-header">
          <span class="bc-emoji" aria-hidden="true">${opt.marketplaceEmoji}</span>
          <div>
            <p class="bc-name">${opt.marketplaceName}</p>
            <p class="bc-delivery">🚚 ${opt.delivery}</p>
          </div>
          <div class="bc-rating" aria-label="Avaliação ${opt.rating}">
            ⭐ ${opt.rating?.toFixed(1) ?? '—'}
          </div>
        </div>

        <!-- Price & Metrics -->
        ${opt.price > 0 ? `
          <div class="bc-price-block">
            <span class="bc-price">${opt.priceFormatted}</span>
            <span class="bc-price-label">preço do produto</span>
          </div>

          <div class="bc-metrics">
            <div class="bc-metric">
              <span class="bc-metric-value">${opt.costPerDoseFormatted}</span>
              <span class="bc-metric-label">por dose</span>
            </div>
            <div class="bc-metric-divider" aria-hidden="true"></div>
            <div class="bc-metric">
              <span class="bc-metric-value">${opt.costPerMonthFormatted}</span>
              <span class="bc-metric-label">por mês</span>
            </div>
            <div class="bc-metric-divider" aria-hidden="true"></div>
            <div class="bc-metric">
              <span class="bc-metric-value">${Math.round(opt.daysSupply)}</span>
              <span class="bc-metric-label">dias</span>
            </div>
          </div>

          ${opt.savingsVsWorst > 0 ? `
            <p class="bc-savings" aria-label="Economia vs opção mais cara">
              💸 R$ ${opt.savingsVsWorst.toFixed(2)}/mês a menos que o mais caro
            </p>
          ` : ''}

          <p class="bc-disclosure-inline" style="
            font-size: 10px;
            color: var(--color-text-muted, #666);
            text-align: center;
            margin: 6px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            opacity: 0.8;
          ">
            💰 Contém link de afiliado. Preço inalterado.
          </p>

          <a
            href="${opt.url ?? '#'}"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="bc-cta ${opt.isWinner ? 'bc-cta-winner' : ''}"
            aria-label="Ver no ${opt.marketplaceName} (💰 Contém link de afiliado. Preço inalterado.)"
            data-action="go-to-marketplace"
            data-mp="${opt.marketplaceId}"
            data-supplement="${this._current?.supplementId ?? ''}"
            data-price="${opt.price}"
          >
            Ver no ${opt.marketplaceName} →
          </a>
        ` : `
          <div class="bc-unavailable">
            <p>Preço indisponível</p>
            <p style="font-size:12px;color:#555">Cache expirado ou produto não encontrado</p>
          </div>
        `}
      </div>
    `;
  }

  _syncDosageContext(result) {
    const qInput     = this.container.querySelector('#comp-quantity');
    const dInput     = this.container.querySelector('#comp-dosage');
    const unitLabel  = this.container.querySelector('#comp-unit-label');
    const dUnitLabel = this.container.querySelector('#comp-dosage-unit-label');
    const daysResult = this.container.querySelector('#comp-days-result');

    if (qInput)     qInput.value              = result.quantity;
    if (dInput)     dInput.value              = result.dosage;
    if (unitLabel)  unitLabel.textContent     = result.unit;
    if (dUnitLabel) dUnitLabel.textContent    = `${result.unit}/dia`;
    if (daysResult) daysResult.innerHTML      = `
      <span class="days-value">${Math.round(result.quantity / result.dosage)}</span>
      <span class="days-unit">dias</span>
    `;
  }

  // ─────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────

  _attachListeners() {
    this.container.addEventListener('click', async (e) => {
      const btn    = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'select-supplement') {
        const id       = btn.dataset.id;
        const dosage   = parseFloat(btn.dataset.dosage)   || 5;
        const quantity = parseFloat(btn.dataset.quantity) || 300;
        const unit     = btn.dataset.unit || 'g';

        const input   = this.container.querySelector('#comp-search');
        const results = this.container.querySelector('#comp-search-results');
        if (input)   input.value           = btn.dataset.name;
        if (results) results.style.display = 'none';

        await this._runComparison(id, { dosage, quantity, unit });
      }

      if (action === 'go-to-marketplace') {
        const supplementId = btn.dataset.supplement;
        const mpId         = btn.dataset.mp;
        const price        = parseFloat(btn.dataset.price) || 0;
        if (supplementId && mpId) {
          this._ae.trackClick(supplementId, mpId, price);
        }
      }

      if (action === 'retry') {
        await this._runComparison(btn.dataset.id);
      }
    });

    // Dosage context inputs → re-run comparison (debounce 400ms)
    ['comp-quantity', 'comp-dosage'].forEach(id => {
      this.container.querySelector(`#${id}`)?.addEventListener('change', () => {
        if (!this._current) return;
        clearTimeout(this._debounce);
        this._debounce = setTimeout(async () => {
          const q = parseFloat(this.container.querySelector('#comp-quantity')?.value) || 300;
          const d = parseFloat(this.container.querySelector('#comp-dosage')?.value)   || 5;
          await this._runComparison(this._current.supplementId, {
            quantity: q,
            dosage:   d,
            unit:     this._current.unit,
          });
        }, 400);
      });
    });
  }

  // ─────────────────────────────────────────────
  // STYLES (scoped, injected once)
  // ─────────────────────────────────────────────

  _attachStyles() {
    if (document.getElementById('comparator-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'comparator-page-styles';
    style.textContent = `
      /* ── Layout ── */
      .comparator-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px 16px 100px;
        max-width: 900px;
        margin: 0 auto;
      }
      .page-header { margin-bottom: 4px; }
      .page-title {
        font-size: 24px;
        font-weight: 800;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 4px;
      }
      .page-subtitle { font-size: 14px; color: var(--color-text-muted, #888); margin: 0; }
      .card {
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 16px;
        padding: 20px;
      }

      /* ── Search ── */
      .search-section { position: relative; }
      .search-wrapper { position: relative; display: flex; align-items: center; }
      .search-icon { position: absolute; left: 16px; font-size: 16px; pointer-events: none; }
      .comp-search-input {
        width: 100%;
        padding: 14px 16px 14px 44px;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 14px;
        color: var(--color-text-primary, #FAFAFA);
        font-size: 16px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
        transition: border-color 150ms, box-shadow 150ms;
      }
      .comp-search-input:focus {
        border-color: var(--color-brand, #7C3AED);
        box-shadow: 0 0 0 3px var(--color-brand-muted, rgba(124,58,237,0.15));
      }
      .comp-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0; right: 0;
        background: var(--color-elevated, #222);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 12px;
        overflow: hidden;
        z-index: 200;
        box-shadow: 0 12px 32px rgba(0,0,0,0.6);
      }
      .comp-result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 12px 16px;
        background: none;
        border: none;
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.08));
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: background 150ms;
      }
      .comp-result-item:last-child { border-bottom: none; }
      .comp-result-item:hover { background: var(--color-surface-hover, #1E1E1E); }
      .cri-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #FAFAFA); }
      .cri-category { font-size: 12px; color: var(--color-text-muted, #666); }

      /* ── Dosage Context ── */
      .section-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 14px;
      }
      .dosage-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
      .dosage-field { display: flex; flex-direction: column; gap: 6px; }
      .dosage-label {
        font-size: 11px;
        color: var(--color-text-muted, #888);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }
      .dosage-input-group { display: flex; align-items: center; gap: 6px; }
      .dosage-input {
        width: 80px;
        padding: 9px 12px;
        background: var(--color-surface-hover, #1E1E1E);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 8px;
        color: var(--color-text-primary, #FAFAFA);
        font-size: 15px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-weight: 700;
        outline: none;
        text-align: center;
        transition: border-color 150ms;
      }
      .dosage-input:focus { border-color: var(--color-brand, #7C3AED); }
      .dosage-unit { font-size: 12px; color: var(--color-text-muted, #888); }
      .dosage-result { display: flex; align-items: baseline; gap: 4px; padding: 9px 0; }
      .days-value {
        font-size: 28px;
        font-weight: 900;
        color: var(--color-success, #22C55E);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .days-unit { font-size: 14px; color: var(--color-text-muted, #888); }

      /* ── Loading ── */
      .comp-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px 20px;
        color: var(--color-text-muted, #888);
        font-size: 14px;
      }
      .loading-arena { display: flex; align-items: center; gap: 12px; font-size: 32px; }
      .loading-marketplace { animation: comp-bounce 0.8s ease-in-out infinite alternate; }
      .loading-vs { font-size: 20px; color: var(--color-text-muted, #444); }
      @keyframes comp-bounce {
        from { transform: translateY(0); }
        to   { transform: translateY(-10px); }
      }

      /* ── Comp Header ── */
      .comp-header { margin-bottom: 8px; }
      .comp-supplement-name {
        font-size: 22px;
        font-weight: 800;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 6px;
      }
      .comp-subtitle { font-size: 13px; color: var(--color-text-muted, #888); margin: 0 0 10px; }
      .comp-savings-banner {
        display: inline-block;
        padding: 8px 14px;
        background: rgba(34,197,94,0.08);
        border: 1px solid rgba(34,197,94,0.2);
        border-radius: 999px;
        font-size: 13px;
        color: var(--color-success, #22C55E);
      }
      .comp-no-price { color: var(--color-text-muted, #666); font-size: 13px; padding: 8px 0; }

      /* ── Battle Grid ── */
      .battle-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      /* ── Battle Card ── */
      .battle-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 18px;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 16px;
        transition: border-color 200ms, box-shadow 200ms, transform 200ms;
      }
      .battle-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .battle-card-winner {
        border-color: var(--color-success, #22C55E);
        background: rgba(34,197,94,0.04);
        box-shadow: 0 0 24px rgba(34,197,94,0.10);
      }
      .battle-card-unavailable { opacity: 0.5; pointer-events: none; }

      .winner-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-success, #22C55E);
        color: #0A0A0A;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 12px;
        border-radius: 999px;
        white-space: nowrap;
      }

      .bc-header { display: flex; align-items: center; gap: 10px; padding-top: 6px; }
      .bc-emoji { font-size: 24px; }
      .bc-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 2px;
      }
      .bc-delivery { font-size: 11px; color: var(--color-text-muted, #888); margin: 0; }
      .bc-rating { margin-left: auto; font-size: 12px; color: var(--color-text-muted, #888); white-space: nowrap; }

      .bc-price-block { display: flex; flex-direction: column; gap: 2px; }
      .bc-price {
        font-size: 26px;
        font-weight: 900;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        color: var(--color-text-primary, #FAFAFA);
        line-height: 1;
      }
      .bc-price-label { font-size: 11px; color: var(--color-text-muted, #666); }

      .bc-metrics {
        display: flex;
        align-items: center;
        background: var(--color-surface-hover, #1E1E1E);
        border-radius: 10px;
        overflow: hidden;
      }
      .bc-metric {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 10px 6px;
      }
      .bc-metric-value {
        font-size: 13px;
        font-weight: 800;
        color: var(--color-text-primary, #FAFAFA);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .bc-metric-label { font-size: 10px; color: var(--color-text-muted, #888); text-align: center; }
      .bc-metric-divider {
        width: 1px;
        height: 32px;
        background: var(--color-border, rgba(255,255,255,0.08));
        flex-shrink: 0;
      }

      .bc-savings {
        font-size: 12px;
        color: var(--color-success, #22C55E);
        margin: 0;
        padding: 8px 10px;
        background: rgba(34,197,94,0.06);
        border-radius: 8px;
      }

      .bc-cta {
        display: block;
        text-align: center;
        padding: 11px;
        background: var(--color-surface-hover, #1E1E1E);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 10px;
        color: var(--color-text-primary, #FAFAFA);
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        transition: all 150ms;
        font-family: inherit;
        margin-top: auto;
      }
      .bc-cta:hover {
        background: var(--color-elevated, #222);
        border-color: var(--color-brand, #7C3AED);
      }
      .bc-cta-winner {
        background: rgba(34,197,94,0.08);
        border-color: rgba(34,197,94,0.3);
        color: var(--color-success, #22C55E);
      }
      .bc-cta-winner:hover {
        background: var(--color-success, #22C55E);
        color: #0A0A0A;
        border-color: var(--color-success, #22C55E);
      }

      .bc-unavailable {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--color-text-muted, #555);
        font-size: 13px;
        padding: 20px;
        text-align: center;
      }

      /* ── Ranking ── */
      .ranking-section { margin-top: 4px; }
      .ranking-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 12px;
      }
      .ranking-list { display: flex; flex-direction: column; gap: 8px; }
      .ranking-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--color-surface-hover, #1E1E1E);
        border-radius: 10px;
        font-size: 13px;
        border: 1px solid transparent;
      }
      .ranking-winner {
        border-color: rgba(34,197,94,0.3);
        background: rgba(34,197,94,0.05);
      }
      .ranking-pos {
        font-size: 14px;
        font-weight: 800;
        color: var(--color-text-muted, #888);
        min-width: 24px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .ranking-mp-emoji { font-size: 18px; }
      .ranking-mp-name { color: var(--color-text-primary, #FAFAFA); font-weight: 600; flex: 1; }
      .ranking-cost-dose {
        color: var(--color-brand, #7C3AED);
        font-weight: 700;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .ranking-cost-month {
        color: var(--color-text-muted, #888);
        font-size: 12px;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .ranking-crown { font-size: 16px; }

      /* ── Disclosure ── */
      .comp-disclosure {
        font-size: 12px;
        color: var(--color-text-muted, #666);
        text-align: center;
        margin: 4px 0 0;
      }
      .comp-disclosure-link {
        color: var(--color-brand, #7C3AED);
        text-decoration: none;
      }
      .comp-disclosure-link:hover { text-decoration: underline; }

      /* ── Error ── */
      .comp-error { text-align: center; color: var(--color-text-muted, #888); }
      .comp-error .btn-primary { margin-top: 12px; padding: 10px 20px; }

      /* ── Responsive ── */
      @media (max-width: 600px) {
        .battle-grid { grid-template-columns: 1fr; }
        .dosage-row  { grid-template-columns: 1fr 1fr; }
        .dosage-row > :last-child { grid-column: 1 / -1; }
        .bc-price { font-size: 22px; }
      }
      @media (min-width: 601px) and (max-width: 800px) {
        .battle-grid { grid-template-columns: repeat(3, 1fr); }
        .bc-price { font-size: 20px; }
        .bc-metric-value { font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default PriceComparatorPage;
