/**
 * @fileoverview Side Drawer de Detalhes do Suplemento — SupliList v3.0.
 * Substitui o Modal antigo por um painel deslizante da direita com 3 abas:
 * "Visão Geral", "Estudos Clínicos" e "Marketplace".
 * Integra favoritos, inventário e calculadora de dosagem via EventBus.
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import { eventBus }        from '../core/eventbus.js';
import { logger }          from '../utils/logger.js';
import { supplementService } from '../features/supplements/supplementService.js';
import { favoritesRepo }   from '../features/favorites/favoritesRepo.js';
import { inventoryRepo }   from '../features/inventory/inventoryRepo.js';
import { toast }           from './toast.js';
import { formatPrice, formatDose, formatDaysLeft } from '../utils/formatters.js';

/* ══════════════════════════════════════════════════════════════
   INJEÇÃO DE ESTILOS (uma única vez no head)
   ══════════════════════════════════════════════════════════════ */

function _injectStyles() {
  if (document.getElementById('supplement-drawer-styles')) return;
  const style = document.createElement('style');
  style.id = 'supplement-drawer-styles';
  style.textContent = `
    /* ── Backdrop ─────────────────────────────────────────── */
    .sd-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .sd-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ── Drawer ────────────────────────────────────────────── */
    .sd-drawer {
      position: fixed;
      top: 0;
      right: 0;
      height: 100dvh;
      width: min(480px, 100vw);
      background: var(--bg-darkest);
      border-left: 1px solid var(--border-color);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: -8px 0 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .sd-drawer.open {
      transform: translateX(0);
    }

    /* ── Header do drawer ──────────────────────────────────── */
    .sd-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
      background: var(--bg-dark);
    }
    .sd-header-img {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      flex-shrink: 0;
      background: var(--bg-darker);
    }
    .sd-header-info {
      flex: 1;
      min-width: 0;
    }
    .sd-header-name {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 800;
      color: var(--t1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
      margin: 0 0 4px;
    }
    .sd-header-meta {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      color: var(--t3);
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .sd-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sd-badge-a { background: rgba(16,185,129,0.15); color: var(--brand-green); border: 1px solid rgba(16,185,129,0.25); }
    .sd-badge-b { background: var(--shadow-glow); color: var(--brand-primary); border: 1px solid var(--brand-primary); }
    .sd-badge-c { background: rgba(156,163,175,0.12); color: var(--t3); border: 1px solid var(--border-color); }
    .sd-badge-cat { background: var(--bg-darker); color: var(--t2); border: 1px solid var(--border-color); }
    .sd-close-btn {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--t3);
      font-size: 18px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .sd-close-btn:hover { background: var(--bg-darker); color: var(--t1); }

    /* ── Tabs ──────────────────────────────────────────────── */
    .sd-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-dark);
      flex-shrink: 0;
    }
    .sd-tab {
      flex: 1;
      padding: 12px 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--t3);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .sd-tab:hover { color: var(--t2); }
    .sd-tab.active {
      color: var(--brand-primary);
      border-bottom-color: var(--brand-primary);
    }

    /* ── Corpo scrollável ──────────────────────────────────── */
    .sd-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      scroll-behavior: smooth;
    }
    .sd-body::-webkit-scrollbar { width: 4px; }
    .sd-body::-webkit-scrollbar-track { background: transparent; }
    .sd-body::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

    /* ── Painel de aba ─────────────────────────────────────── */
    .sd-panel { display: none; flex-direction: column; gap: 16px; }
    .sd-panel.active { display: flex; }

    /* ── Seções internas ───────────────────────────────────── */
    .sd-section-title {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--t3);
      margin-bottom: 8px;
    }
    .sd-card {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 16px;
    }
    .sd-card p {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--t2);
      line-height: 1.7;
      margin: 0;
    }

    /* ── Goals pill ────────────────────────────────────────── */
    .sd-goals {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .sd-goal-pill {
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
      font-size: 11px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
    }

    /* ── Dose info grid ────────────────────────────────────── */
    .sd-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .sd-info-item {
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .sd-info-label {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .sd-info-value {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--t1);
    }
    .sd-info-value.brand { color: var(--brand-primary); }
    .sd-info-value.success { color: var(--brand-green); }
    .sd-info-value.warning { color: var(--warning); }

    /* ── Interações ────────────────────────────────────────── */
    .sd-interactions li {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--t2);
      padding: 6px 0;
      border-bottom: 1px solid var(--border-color);
      line-height: 1.5;
    }
    .sd-interactions li:last-child { border-bottom: none; }
    .sd-interactions li::before { content: '⚠️ '; }

    /* ── Estoque ──────────────────────────────────────────── */
    .sd-stock-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sd-stock-input {
      flex: 1;
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 10px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--t1);
      outline: none;
      transition: border-color 0.2s;
    }
    .sd-stock-input:focus { border-color: var(--brand-primary); }
    .sd-stock-btn {
      padding: 10px 18px;
      background: var(--brand-primary);
      color: var(--text-inverse);
      border: none;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .sd-stock-btn:hover { background: var(--brand-primary-hover); }

    /* ── Estudos (accordion) ───────────────────────────────── */
    .sd-study {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      overflow: hidden;
    }
    .sd-study-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      cursor: pointer;
      gap: 10px;
      user-select: none;
    }
    .sd-study-title {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--t1);
      flex: 1;
    }
    .sd-study-arrow {
      color: var(--t3);
      font-size: 12px;
      transition: transform 0.2s;
    }
    .sd-study.expanded .sd-study-arrow { transform: rotate(180deg); }
    .sd-study-body {
      display: none;
      padding: 0 16px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--t2);
      line-height: 1.7;
      border-top: 1px solid var(--border-color);
    }
    .sd-study.expanded .sd-study-body { display: block; }
    .sd-study-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
      padding-top: 10px;
    }
    .sd-study-tag {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
    }

    /* ── Marketplace cards ─────────────────────────────────── */
    .sd-market-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      gap: 12px;
      transition: border-color 0.2s;
    }
    .sd-market-card:hover { border-color: var(--brand-primary); }
    .sd-market-card.best { border-color: var(--brand-green); background: rgba(16, 185, 129, 0.04); }
    .sd-market-label {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: var(--t1);
      text-transform: capitalize;
    }
    .sd-market-price {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: var(--t1);
    }
    .sd-market-best-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--brand-green);
      background: rgba(16,185,129,0.12);
      border: 1px solid rgba(16,185,129,0.2);
      border-radius: 6px;
      padding: 2px 6px;
    }
    .sd-market-btn {
      padding: 8px 16px;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
      border-radius: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .sd-market-btn:hover { background: var(--shadow-glow-strong); color: var(--brand-primary-hover); }

    /* ── Footer fixo ───────────────────────────────────────── */
    .sd-footer {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-darkest);
      flex-shrink: 0;
    }
    .sd-btn-fav {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border-color);
      background: var(--bg-darker);
      color: var(--t2);
    }
    .sd-btn-fav:hover { background: var(--border-color); color: var(--t1); }
    .sd-btn-fav.is-fav { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; }
    .sd-btn-calc {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background: var(--brand-primary);
      color: var(--text-inverse);
    }
    .sd-btn-calc:hover { background: var(--brand-primary-hover); }

    /* ── Responsive ────────────────────────────────────────── */
    @media (max-width: 480px) {
      .sd-drawer { width: 100vw; }
      .sd-info-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════════════════════
   ESTUDOS CLÍNICOS ESTÁTICOS POR SUPLEMENTO
   (enriquece os dados do database com metadados científicos)
   ══════════════════════════════════════════════════════════════ */

const CLINICAL_STUDIES = {
  'creatina-mono': [
    { title: 'Efeito da Creatina na Força Máxima', year: 2021, journal: 'Journal of Strength & Conditioning', result: 'Aumento médio de 8-14% na força máxima em exercícios compostos após 4 semanas de suplementação com carga.', tags: ['Força', 'Hipertrofia', 'Duplo-cego'] },
    { title: 'Creatina e Cognição em Idosos', year: 2022, journal: 'Nutrients', result: 'Melhora significativa na memória de trabalho e velocidade de processamento após 12 semanas de uso.', tags: ['Cognição', 'Longevidade', 'RCT'] },
  ],
  'ashwagandha': [
    { title: 'Ashwagandha e Redução de Cortisol', year: 2019, journal: 'Medicine (Baltimore)', result: 'Redução de 27,9% nos níveis de cortisol sérico vs. placebo após 60 dias de 300mg/dia.', tags: ['Cortisol', 'Estresse', 'Placebo-controlado'] },
    { title: 'Efeito Adaptogênico em Atletas', year: 2020, journal: 'Journal of the International Society of Sports Nutrition', result: 'Melhora de 18% na potência máxima e recuperação muscular em atletas recreacionais.', tags: ['Performance', 'Recuperação', 'RCT'] },
  ],
  'cafeina': [
    { title: 'Cafeína e Performance Aeróbica', year: 2020, journal: 'British Journal of Sports Medicine', result: 'Meta-análise de 21 estudos: melhora média de 3% na performance de endurance com 3-6mg/kg.', tags: ['Endurance', 'Meta-análise', 'Dose-resposta'] },
  ],
};

/** Retorna estudos disponíveis para um suplemento (ou array vazio). */
function _getStudies(supplementId) {
  return CLINICAL_STUDIES[supplementId] || [];
}

/* ══════════════════════════════════════════════════════════════
   CLASSE PRINCIPAL — SupplementDrawer
   ══════════════════════════════════════════════════════════════ */

class SupplementDrawer {
  constructor() {
    _injectStyles();

    /** @type {string|null} ID do suplemento atualmente exibido */
    this._currentId = null;

    /** @type {string} Aba ativa */
    this._activeTab = 'overview';

    /** @type {HTMLElement|null} */
    this._backdropEl = null;

    /** @type {HTMLElement|null} */
    this._drawerEl = null;

    this._build();
    this._wireGlobalEvent();
  }

  /* ─── Construção do DOM ──────────────────────────────────── */

  _build() {
    // Backdrop
    this._backdropEl = document.createElement('div');
    this._backdropEl.className = 'sd-backdrop';
    this._backdropEl.setAttribute('aria-hidden', 'true');
    this._backdropEl.addEventListener('click', () => this.close());

    // Drawer container
    this._drawerEl = document.createElement('div');
    this._drawerEl.className = 'sd-drawer';
    this._drawerEl.setAttribute('role', 'dialog');
    this._drawerEl.setAttribute('aria-modal', 'true');
    this._drawerEl.setAttribute('aria-label', 'Detalhes do suplemento');

    this._drawerEl.innerHTML = `
      <!-- Header -->
      <div class="sd-header">
        <img class="sd-header-img" src="" alt="" loading="lazy" id="sd-img">
        <div class="sd-header-info">
          <p class="sd-header-name" id="sd-name">—</p>
          <div class="sd-header-meta" id="sd-meta"></div>
        </div>
        <button class="sd-close-btn" id="sd-close" aria-label="Fechar">✕</button>
      </div>

      <!-- Tabs -->
      <div class="sd-tabs" id="sd-tabs" role="tablist">
        <button class="sd-tab active" data-tab="overview" role="tab" aria-selected="true">📋 Visão Geral</button>
        <button class="sd-tab" data-tab="studies" role="tab" aria-selected="false">🔬 Estudos</button>
        <button class="sd-tab" data-tab="market" role="tab" aria-selected="false">🛒 Marketplace</button>
      </div>

      <!-- Body -->
      <div class="sd-body">
        <!-- Panel: Visão Geral -->
        <div class="sd-panel active" id="sd-panel-overview" role="tabpanel"></div>
        <!-- Panel: Estudos -->
        <div class="sd-panel" id="sd-panel-studies" role="tabpanel"></div>
        <!-- Panel: Marketplace -->
        <div class="sd-panel" id="sd-panel-market" role="tabpanel"></div>
      </div>

      <!-- Footer -->
      <div class="sd-footer">
        <button class="sd-btn-fav" id="sd-btn-fav" aria-label="Favoritar">🤍 Favoritar</button>
        <button class="sd-btn-calc" id="sd-btn-calc" aria-label="Abrir calculadora">⚗ Calcular Dose</button>
      </div>
    `;

    document.body.appendChild(this._backdropEl);
    document.body.appendChild(this._drawerEl);

    // Listeners internos
    this._drawerEl.querySelector('#sd-close').addEventListener('click', () => this.close());
    this._drawerEl.querySelector('#sd-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) this._switchTab(btn.dataset.tab);
    });
    this._drawerEl.querySelector('#sd-btn-fav').addEventListener('click', () => this._toggleFavorite());
    this._drawerEl.querySelector('#sd-btn-calc').addEventListener('click', () => this._goToCalculator());

    // Fecha com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._currentId) this.close();
    });
  }

  /* ─── API Pública ────────────────────────────────────────── */

  /**
   * Abre o drawer com os dados do suplemento especificado.
   * @param {string} supplementId
   */
  open(supplementId) {
    const enriched = supplementService.getEnriched(supplementId, {
      includeFavorite: true,
      includeInventory: true,
    });

    if (!enriched || !enriched.supplement) {
      toast.show('Suplemento não encontrado.', 'danger');
      return;
    }

    this._currentId = supplementId;
    this._activeTab = 'overview';

    this._renderHeader(enriched);
    this._renderOverview(enriched);
    this._renderStudies(supplementId);
    this._renderMarket(enriched);
    this._updateFavButton(enriched.isFavorite);
    this._switchTab('overview');

    // Abre com animação
    requestAnimationFrame(() => {
      this._backdropEl.classList.add('open');
      this._drawerEl.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    logger.info(`SupplementDrawer: aberto para "${supplementId}".`);
  }

  /** Fecha o drawer com animação de saída. */
  close() {
    this._backdropEl.classList.remove('open');
    this._drawerEl.classList.remove('open');
    document.body.style.overflow = '';
    this._currentId = null;
  }

  /* ─── Renderização dos Painéis ───────────────────────────── */

  _renderHeader({ supplement, isFavorite }) {
    const imgEl   = this._drawerEl.querySelector('#sd-img');
    const nameEl  = this._drawerEl.querySelector('#sd-name');
    const metaEl  = this._drawerEl.querySelector('#sd-meta');

    imgEl.src = supplement.image || '';
    imgEl.alt = supplement.name;
    nameEl.textContent = supplement.name;

    const lvl = supplement.evidenceLevel?.toLowerCase() || 'c';
    metaEl.innerHTML = `
      <span class="sd-badge sd-badge-${lvl}">Nível ${supplement.evidenceLevel}</span>
      <span class="sd-badge sd-badge-cat">${supplement.category}</span>
    `;
  }

  _renderOverview({ supplement, daysLeft, stockStatus }) {
    const panel = this._drawerEl.querySelector('#sd-panel-overview');
    const currentQty = inventoryRepo.getQty(supplement.id);

    const goalsHtml = (supplement.goals || [])
      .map(g => `<span class="sd-goal-pill">${g}</span>`)
      .join('');

    const interHtml = supplement.interactions?.length
      ? `<div class="sd-section-title">Interações Conhecidas</div>
         <div class="sd-card">
           <ul class="sd-interactions" style="margin:0;padding:0;list-style:none;">
             ${supplement.interactions.map(i => `<li>${i}</li>`).join('')}
           </ul>
         </div>`
      : '';

    const daysColor = daysLeft === null ? '' : daysLeft <= 7 ? 'warning' : 'success';
    const daysText  = daysLeft === null ? '—' : formatDaysLeft(daysLeft);

    panel.innerHTML = `
      <!-- Mecanismo de ação -->
      <div>
        <div class="sd-section-title">Mecanismo de Ação</div>
        <div class="sd-card"><p>${supplement.mechanism || '—'}</p></div>
      </div>

      <!-- Objetivos -->
      <div>
        <div class="sd-section-title">Objetivos Terapêuticos</div>
        <div class="sd-goals">${goalsHtml || '<span style="color:#71717a;font-size:12px;">—</span>'}</div>
      </div>

      <!-- KPIs de dose e custo -->
      <div class="sd-info-grid">
        <div class="sd-info-item">
          <div class="sd-info-label">Dose Padrão</div>
          <div class="sd-info-value brand">${formatDose(supplement.defaultDose, supplement.unit)}</div>
        </div>
        <div class="sd-info-item">
          <div class="sd-info-label">Custo / Dose</div>
          <div class="sd-info-value">${formatPrice(supplement.costPerDose)}</div>
        </div>
        <div class="sd-info-item">
          <div class="sd-info-label">Doses no Pote</div>
          <div class="sd-info-value">${supplement.doses ?? '—'}</div>
        </div>
        <div class="sd-info-item">
          <div class="sd-info-label">Estoque Restante</div>
          <div class="sd-info-value ${daysColor}">${daysText}</div>
        </div>
      </div>

      <!-- Atualizar estoque -->
      <div>
        <div class="sd-section-title">Meu Estoque</div>
        <div class="sd-card" style="padding:14px;">
          <div class="sd-stock-row">
            <input type="number" class="sd-stock-input" id="sd-qty-input"
              value="${currentQty ?? 0}" min="0"
              placeholder="Qtd em ${supplement.unit}">
            <button class="sd-stock-btn" id="sd-update-stock">Atualizar</button>
          </div>
        </div>
      </div>

      ${interHtml}
    `;

    // Listener do botão de atualizar estoque
    panel.querySelector('#sd-update-stock')?.addEventListener('click', () => {
      const input = panel.querySelector('#sd-qty-input');
      const qty = parseInt(input?.value, 10);
      if (isNaN(qty) || qty < 0) { toast.show('Quantidade inválida.', 'danger'); return; }
      inventoryRepo.update(supplement.id, qty);
      toast.show('Estoque atualizado!', 'success');
      // Atualiza o valor exibido nos KPIs sem fechar
      this.open(supplement.id);
    });
  }

  _renderStudies(supplementId) {
    const panel  = this._drawerEl.querySelector('#sd-panel-studies');
    const studies = _getStudies(supplementId);

    if (!studies.length) {
      panel.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#71717a;">
          <div style="font-size:32px;margin-bottom:12px;">🔬</div>
          <p style="font-family:'Inter',sans-serif;font-size:13px;">
            Nenhum estudo clínico catalogado para este suplemento ainda.<br>
            Os dados científicos são adicionados continuamente.
          </p>
        </div>
      `;
      return;
    }

    panel.innerHTML = studies.map((study, i) => `
      <div class="sd-study" id="sd-study-${i}">
        <div class="sd-study-header" data-study="${i}">
          <span class="sd-study-title">${study.title} (${study.year})</span>
          <span class="sd-study-arrow">▼</span>
        </div>
        <div class="sd-study-body">
          <div class="sd-study-meta">
            ${study.tags.map(t => `<span class="sd-study-tag">${t}</span>`).join('')}
            <span class="sd-study-tag" style="background:var(--bg-darker);color:var(--t3);border-color:var(--border-color);">${study.journal}</span>
          </div>
          <p style="font-family:'Inter',sans-serif;font-size:12px;color:var(--t2);line-height:1.7;margin:0;">${study.result}</p>
        </div>
      </div>
    `).join('');

    // Accordion toggle
    panel.addEventListener('click', (e) => {
      const header = e.target.closest('[data-study]');
      if (!header) return;
      const idx = header.dataset.study;
      const studyEl = panel.querySelector(`#sd-study-${idx}`);
      studyEl?.classList.toggle('expanded');
    });
  }

  _renderMarket({ supplement }) {
    const panel  = this._drawerEl.querySelector('#sd-panel-market');
    const prices = supplement.prices || {};
    const links  = supplement.links  || {};

    // Encontra o melhor preço
    let minPrice = Infinity;
    let bestMkt  = null;
    Object.entries(prices).forEach(([mkt, p]) => {
      if (p > 0 && p < minPrice) { minPrice = p; bestMkt = mkt; }
    });

    const cardsHtml = Object.entries(prices)
      .filter(([, p]) => p > 0)
      .sort(([, a], [, b]) => a - b) // menor preço primeiro
      .map(([mkt, price]) => {
        const isBest = mkt === bestMkt;
        const link   = links[mkt] || '#';
        return `
          <div class="sd-market-card ${isBest ? 'best' : ''}">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="sd-market-label">${mkt}</span>
                ${isBest ? '<span class="sd-market-best-badge">✓ Melhor Preço</span>' : ''}
              </div>
              <span class="sd-market-price">${formatPrice(price)}</span>
              <span style="font-family:'Inter',sans-serif;font-size:10px;color:var(--t3);margin-left:6px;">
                ${formatPrice(price / (supplement.doses || 1))} / dose
              </span>
            </div>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="sd-market-btn"
               data-mkt="${mkt}" data-supp="${supplement.id}">
              Comprar 🛒
            </a>
          </div>
        `;
      }).join('');

    panel.innerHTML = cardsHtml || `
      <p style="text-align:center;color:var(--t3);font-size:13px;padding:20px;">
        Nenhum marketplace disponível.
      </p>
    `;

    // Telemetria nos cliques de marketplace
    panel.querySelectorAll('.sd-market-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('affiliate_click', {
          supplementId: btn.dataset.supp,
          marketplace:  btn.dataset.mkt,
        });
      });
    });
  }

  /* ─── Helpers ────────────────────────────────────────────── */

  _switchTab(tabId) {
    this._activeTab = tabId;
    this._drawerEl.querySelectorAll('.sd-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    this._drawerEl.querySelectorAll('.sd-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `sd-panel-${tabId}`);
    });
  }

  _updateFavButton(isFav) {
    const btn = this._drawerEl.querySelector('#sd-btn-fav');
    if (!btn) return;
    btn.classList.toggle('is-fav', isFav);
    btn.innerHTML = isFav ? '❤️ Desfavoritar' : '🤍 Favoritar';
  }

  _toggleFavorite() {
    if (!this._currentId) return;
    const isNowFav = favoritesRepo.toggle(this._currentId);
    this._updateFavButton(isNowFav);
    eventBus.emit('favorite:toggled', { supplementId: this._currentId, isFavorite: isNowFav });
    toast.show(isNowFav ? '❤️ Adicionado aos favoritos!' : 'Removido dos favoritos', 'success');
  }

  _goToCalculator() {
    if (!this._currentId) return;
    this.close();
    // Navega para a calculadora e pré-seleciona o suplemento
    eventBus.emit('router:navigate:request', { route: '/dosage' });
    // Emite o suplemento para pré-seleção após a navegação
    setTimeout(() => {
      eventBus.emit('dosage:preselect', { supplementId: this._currentId });
    }, 300);
  }

  _wireGlobalEvent() {
    eventBus.on('supplement:detail:open', ({ supplementId }) => {
      if (supplementId) this.open(supplementId);
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   SINGLETON — instanciado uma única vez ao importar o módulo
   ══════════════════════════════════════════════════════════════ */

export const supplementDrawer = new SupplementDrawer();

/**
 * Função helper para abrir o drawer programaticamente.
 * @param {string} supplementId
 */
export function openSupplementDetail(supplementId) {
  supplementDrawer.open(supplementId);
}
