/**
 * @fileoverview Página de Comparação de Suplementos — SupliList v3.0.
 * Fase 4: Comparador side-by-side real (até 3 suplementos simultâneos) com:
 * - Busca Fuse.js integrada
 * - Tabela comparativa com highlight do melhor valor por linha
 * - Botão "Adicionar ao Stack" direto da tabela
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import Fuse              from 'fuse.js';
import { eventBus }      from '../core/eventbus.js';
import { logger }        from '../utils/logger.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { stateManager }  from '../core/state-manager.js';
import { toast }         from './toast.js';
import { formatPrice, formatDose } from '../utils/formatters.js';

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */

function _injectStyles() {
  if (document.getElementById('compare-page-styles')) return;
  const s = document.createElement('style');
  s.id = 'compare-page-styles';
  s.textContent = `
    .cp-wrap {
      max-width: 980px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 40px;
    }
    .cp-header { display: flex; flex-direction: column; gap: 4px; }
    .cp-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 850;
      color: var(--t1);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .cp-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; color: var(--t3); margin: 0; }

    /* ── Slots de seleção ────────────────────────────────────── */
    .cp-slots {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    @media (max-width: 640px) { .cp-slots { grid-template-columns: 1fr; } }

    .cp-slot {
      background: var(--bg-dark);
      border: 1px dashed var(--border-color);
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s;
      position: relative;
    }
    .cp-slot.filled { border-style: solid; border-color: var(--brand-primary); }

    .cp-slot-label {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--t3);
    }

    .cp-slot-search-wrap { position: relative; }
    .cp-slot-search {
      width: 100%;
      box-sizing: border-box;
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 10px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--t1);
      outline: none;
      transition: border-color 0.2s;
    }
    .cp-slot-search:focus { border-color: var(--brand-primary); }
    .cp-slot-search::placeholder { color: var(--t3); }

    .cp-slot-suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0; right: 0;
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: none;
    }
    .cp-slot-suggestions.open { display: block; }
    .cp-slot-sugg-item {
      padding: 10px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--t2);
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.15s;
    }
    .cp-slot-sugg-item:last-child { border-bottom: none; }
    .cp-slot-sugg-item:hover { background: var(--shadow-glow); color: var(--t1); }

    .cp-slot-selected {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--shadow-glow);
      border: 1px solid var(--brand-primary);
      border-radius: 12px;
    }
    .cp-slot-selected img {
      width: 36px; height: 36px;
      border-radius: 8px;
      object-fit: cover;
      background: var(--bg-darker);
    }
    .cp-slot-selected-name {
      flex: 1;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--t1);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cp-slot-clear {
      background: transparent;
      border: none;
      color: var(--t3);
      cursor: pointer;
      font-size: 14px;
      padding: 2px;
      flex-shrink: 0;
    }
    .cp-slot-clear:hover { color: #ef4444; }

    /* ── Tabela comparativa ──────────────────────────────────── */
    .cp-table-wrap {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      overflow: hidden;
    }
    .cp-table-title {
      padding: 18px 24px;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--t3);
      border-bottom: 1px solid var(--border-color);
    }
    .cp-table { width: 100%; border-collapse: collapse; }
    .cp-table th {
      padding: 14px 20px;
      text-align: left;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--t1);
      background: var(--bg-darker);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }
    .cp-table th:first-child {
      width: 160px;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--t3);
      background: var(--bg-dark);
    }
    .cp-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-color);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--t2);
      vertical-align: top;
    }
    .cp-table td:first-child {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--t3);
      background: rgba(0, 0, 0, 0.02);
      white-space: nowrap;
    }
    .cp-table tr:last-child td { border-bottom: none; }
    .cp-table tr:hover td { background: rgba(0,0,0,0.01); }
    .cp-table tr:hover td:first-child { background: rgba(0,0,0,0.02); }

    /* ── Células com destaque ────────────────────────────────── */
    .cp-cell-best {
      color: var(--brand-green) !important;
      font-weight: 700;
    }
    .cp-cell-best::after {
      content: ' ✓';
      font-size: 10px;
    }
    .cp-cell-worst { color: var(--t3); }

    /* ── Badge de nível ──────────────────────────────────────── */
    .cp-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .cp-badge-a { background: rgba(16,185,129,0.15); color: var(--brand-green); }
    .cp-badge-b { background: var(--shadow-glow); color: var(--brand-primary); }
    .cp-badge-c { background: rgba(156,163,175,0.12); color: var(--t3); }

    /* ── Goals pill ──────────────────────────────────────────── */
    .cp-goals { display: flex; flex-wrap: wrap; gap: 4px; }
    .cp-goal-pill {
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
      font-size: 10px;
      font-weight: 600;
    }

    /* ── Linha de ações ──────────────────────────────────────── */
    .cp-table .cp-action-row td {
      padding: 16px 20px;
      background: var(--bg-darker);
      border-top: 1px solid var(--border-color);
    }
    .cp-add-stack-btn {
      padding: 9px 16px;
      border-radius: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      background: var(--brand-primary);
      color: var(--text-inverse);
      transition: all 0.2s;
      width: 100%;
    }
    .cp-add-stack-btn:hover { background: var(--brand-primary-hover); }
    .cp-add-stack-btn:disabled {
      background: rgba(16,185,129,0.12);
      color: var(--brand-green);
      cursor: default;
    }

    /* ── Empty state ─────────────────────────────────────────── */
    .cp-empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--t3);
      border: 1px dashed var(--border-color);
      border-radius: 24px;
    }
    .cp-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .cp-empty p { font-family: 'Inter', sans-serif; font-size: 14px; }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

const COMPARE_ROWS = [
  { key: 'category',      label: 'Categoria',       render: (s) => s.category || '—' },
  { key: 'evidenceLevel', label: 'Evidência',        render: (s) => {
    const lvl = (s.evidenceLevel || 'C').toUpperCase();
    return `<span class="cp-badge cp-badge-${lvl.toLowerCase()}">Nível ${lvl}</span>`;
  }},
  { key: 'defaultDose',   label: 'Dose Padrão',      render: (s) => formatDose(s.defaultDose, s.unit), compareAs: 'numeric', lowerIsBetter: false },
  { key: 'costPerDose',   label: 'Custo / Dose',     render: (s) => formatPrice(s.costPerDose), compareAs: 'numeric', lowerIsBetter: true },
  { key: 'doses',         label: 'Doses / Pote',     render: (s) => s.doses ?? '—', compareAs: 'numeric', lowerIsBetter: false },
  { key: 'goals',         label: 'Objetivos',        render: (s) => {
    const pills = (s.goals || []).map(g => `<span class="cp-goal-pill">${g}</span>`).join('');
    return `<div class="cp-goals">${pills || '—'}</div>`;
  }},
  { key: 'mechanism',     label: 'Mecanismo',        render: (s) => `<span style="font-size:11px;line-height:1.5;color:#71717a;">${(s.mechanism || '—').slice(0, 120)}${s.mechanism?.length > 120 ? '...' : ''}</span>` },
];

/** Valor numérico de nível de evidência para comparação */
function _evidenceNum(level) {
  return { A: 3, B: 2, C: 1 }[level?.toUpperCase()] || 0;
}

/* ══════════════════════════════════════════════════════════════
   CLASSE PRINCIPAL
   ══════════════════════════════════════════════════════════════ */

class ComparePageController {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    /** @type {(import('../features/supplements/supplementRepo.js').Supplement|null)[]} */
    this._selected = [null, null, null];

    this._fuseIndex = null;
    this._cleanupFns = [];
  }

  init() {
    _injectStyles();
    this._buildFuse();
    this._render();
    this._setupListeners();

    // Pré-seleciona via evento da calculadora
    eventBus.on('compare:preselect', ({ supplementId }) => {
      const supp = supplementRepo.getById(supplementId);
      if (supp && !this._selected[0]) {
        this._selected[0] = supp;
        this._render();
        this._setupListeners();
      }
    });
  }

  _buildFuse() {
    const all = supplementRepo.getAll();
    this._fuseIndex = new Fuse(all, {
      keys: ['name', 'category'],
      threshold: 0.35,
      minMatchCharLength: 2,
    });
  }

  /* ── Renderização ──────────────────────────────────────────── */

  _render() {
    if (!this.container) return;

    const slotsHtml = this._selected.map((supp, i) => this._renderSlot(supp, i)).join('');
    const hasAny    = this._selected.some(Boolean);
    const tableHtml = hasAny ? this._renderTable() : `
      <div class="cp-empty">
        <div class="cp-empty-icon">⚖️</div>
        <p>Selecione pelo menos um suplemento acima para iniciar a comparação.</p>
      </div>
    `;

    this.container.innerHTML = `
      <div class="cp-wrap">
        <div class="cp-header">
          <h1 class="cp-title">⚖️ Comparador de Suplementos</h1>
          <p class="cp-subtitle">Compare até 3 suplementos lado a lado. O melhor valor de cada linha é destacado automaticamente.</p>
        </div>

        <div class="cp-slots" id="cp-slots">${slotsHtml}</div>

        <div id="cp-table-container">${tableHtml}</div>
      </div>
    `;
  }

  _renderSlot(supp, index) {
    if (supp) {
      return `
        <div class="cp-slot filled" data-slot="${index}">
          <div class="cp-slot-label">Suplemento ${index + 1}</div>
          <div class="cp-slot-selected">
            <img src="${supp.image || ''}" alt="${supp.name}"
                 onerror="this.src='assets/icons/placeholder.webp'">
            <span class="cp-slot-selected-name">${supp.name}</span>
            <button class="cp-slot-clear" data-clear="${index}" title="Remover">✕</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="cp-slot" data-slot="${index}">
        <div class="cp-slot-label">Suplemento ${index + 1}</div>
        <div class="cp-slot-search-wrap">
          <input type="text" class="cp-slot-search" data-slot-input="${index}"
                 placeholder="Buscar suplemento...">
          <div class="cp-slot-suggestions" id="cp-suggestions-${index}"></div>
        </div>
      </div>
    `;
  }

  _renderTable() {
    const selected = this._selected.filter(Boolean);
    if (!selected.length) return '';

    // Cabeçalho
    const thCols = selected.map(s => `<th>${s.name}</th>`).join('');

    // Linhas de dados
    const rowsHtml = COMPARE_ROWS.map(row => {
      const cells = selected.map((s, colIdx) => {
        const rawVal = s[row.key];

        // Lógica de highlight do melhor valor
        let cssClass = '';
        if (row.compareAs === 'numeric' && selected.length > 1) {
          let numVal;
          if (row.key === 'costPerDose') numVal = s.costPerDose;
          else if (row.key === 'defaultDose') numVal = s.defaultDose;
          else if (row.key === 'doses') numVal = s.doses || 0;
          else if (row.key === 'evidenceLevel') numVal = _evidenceNum(s.evidenceLevel);

          const allNums = selected.map(sx => {
            if (row.key === 'costPerDose') return sx.costPerDose;
            if (row.key === 'defaultDose') return sx.defaultDose;
            if (row.key === 'doses') return sx.doses || 0;
            if (row.key === 'evidenceLevel') return _evidenceNum(sx.evidenceLevel);
            return 0;
          });

          const best = row.lowerIsBetter ? Math.min(...allNums) : Math.max(...allNums);
          if (numVal === best) cssClass = 'cp-cell-best';
        }

        return `<td class="${cssClass}">${row.render(s)}</td>`;
      }).join('');

      return `<tr><td>${row.label}</td>${cells}</tr>`;
    }).join('');

    // Linha de ações
    const actionCells = selected.map((s, i) => {
      const inStack = this._isInStack(s.id);
      return `
        <td>
          <button class="cp-add-stack-btn" data-add-stack="${s.id}"
                  ${inStack ? 'disabled' : ''}>
            ${inStack ? '✓ No Stack' : '+ Adicionar ao Stack'}
          </button>
        </td>
      `;
    }).join('');

    // Preenchimento de colunas vazias se < 3 selecionados
    const emptyPad = Array(3 - selected.length).fill('<td style="background:var(--bg-darkest);border-color:var(--border-color);"></td>').join('');

    return `
      <div class="cp-table-wrap">
        <div class="cp-table-title">⚖️ Comparação Detalhada</div>
        <div style="overflow-x:auto;">
          <table class="cp-table">
            <thead>
              <tr>
                <th></th>
                ${thCols}
                ${Array(3 - selected.length).fill('<th style="background:var(--bg-darkest);border-color:var(--border-color);"></th>').join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.replace(/<\/tr>/g, () => emptyPad + '</tr>')}
              <tr class="cp-action-row">
                <td style="background:var(--bg-darker);"></td>
                ${actionCells}
                ${Array(3 - selected.length).fill('<td style="background:var(--bg-darkest);border-color:var(--border-color);"></td>').join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _isInStack(supplementId) {
    const stack = stateManager.getState('stack') || {};
    const items = Array.isArray(stack) ? stack : (stack.items || []);
    return items.some(i => i.supplementId === supplementId);
  }

  /* ── Listeners ─────────────────────────────────────────────── */

  _setupListeners() {
    const container = this.container;
    if (!container) return;

    // Limpar slot
    container.querySelectorAll('[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.clear, 10);
        this._selected[idx] = null;
        this._render();
        this._setupListeners();
      });
    });

    // Busca nos slots
    container.querySelectorAll('[data-slot-input]').forEach(input => {
      const idx     = parseInt(input.dataset.slotInput, 10);
      const suggsEl = container.querySelector(`#cp-suggestions-${idx}`);

      input.addEventListener('input', () => {
        const q = input.value.trim();
        if (!q || q.length < 2) { suggsEl?.classList.remove('open'); return; }

        const results = this._fuseIndex
          ? this._fuseIndex.search(q).slice(0, 8).map(r => r.item)
          : supplementRepo.search(q).slice(0, 8);

        if (!suggsEl) return;
        suggsEl.innerHTML = results.map(s => `
          <div class="cp-slot-sugg-item" data-sugg-id="${s.id}">${s.name}
            <span style="color:#71717a;font-size:10px;"> — ${s.category}</span>
          </div>
        `).join('') || '<div class="cp-slot-sugg-item" style="color:#71717a;">Nenhum resultado</div>';

        suggsEl.classList.add('open');
      });

      // Selecionar da lista
      suggsEl?.addEventListener('click', e => {
        const item = e.target.closest('[data-sugg-id]');
        if (!item) return;
        const supp = supplementRepo.getById(item.dataset.suggId);
        if (!supp) return;
        // Evita duplicata
        if (this._selected.some(s => s?.id === supp.id)) {
          toast.show('Este suplemento já está na comparação.', 'info');
          return;
        }
        this._selected[idx] = supp;
        this._render();
        this._setupListeners();
      });

      // Fechar ao clicar fora
      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggsEl?.contains(e.target)) {
          suggsEl?.classList.remove('open');
        }
      }, { once: false });
    });

    // Adicionar ao Stack
    container.querySelectorAll('[data-add-stack]').forEach(btn => {
      btn.addEventListener('click', () => {
        const suppId = btn.dataset.addStack;
        const supp   = supplementRepo.getById(suppId);
        if (!supp) return;

        const stack = stateManager.getState('stack') || {};
        const items = Array.isArray(stack) ? stack : (stack.items || []);
        const newItems = [...items, {
          supplementId: suppId,
          name: supp.name,
          dose: `${supp.defaultDose}${supp.unit}`,
          addedAt: new Date().toISOString(),
        }];

        try {
          stateManager.setState('stack', { items: newItems });
          toast.show(`✅ ${supp.name} adicionado ao My Stack!`, 'success');
          eventBus.emit('stack:item:added', { supplementId: suppId });
          btn.disabled = true;
          btn.textContent = '✓ No Stack';
        } catch (err) {
          logger.error('ComparePage: erro ao adicionar ao stack', err);
          toast.show('Erro ao adicionar ao Stack.', 'danger');
        }
      });
    });
  }

  destroy() {
    this._cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    this._cleanupFns = [];
    logger.info('ComparePageController destruído.');
  }
}

/* ══════════════════════════════════════════════════════════════
   FACTORY EXPORT
   ══════════════════════════════════════════════════════════════ */

const _createComparePage = (container = '#page-content') => {
  const ctrl = new ComparePageController(container);
  ctrl.init();
  return ctrl;
};

export const createComparePage = _createComparePage;
