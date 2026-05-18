/**
 * ══════════════════════════════════════════════════════════════════════
 * js/compare.js — Módulo de Comparação de Suplementos (Sprint 5 - SL-40)
 *
 * Arquitetura: Floating Comparison Dock + Full-Screen Overlay Modal
 *
 * Responsabilidades:
 *   1. Gerenciar estado de seleção (máx. MAX_ITEMS simultâneos)
 *   2. Renderizar o Floating Dock com miniaturas + CTA "Comparar Agora"
 *   3. Abrir Modal full-screen com tabela comparativa lado a lado
 *   4. Calcular métricas derivadas: preço/g proteína, custo/dose
 *   5. Higienização XSS em toda injeção de HTML dinâmico
 *   6. Acessibilidade: Focus Trap, ARIA Live Region, data-i18n
 *   7. Feedback Háptico via Vibration API (mobile)
 *
 * Dependências: i18n.js (t, translatePage), accessibility.js (announceToScreenReader),
 *               modal.js (openModal, closeModal), state.js (S)
 * ══════════════════════════════════════════════════════════════════════
 */

import { S, save } from './state.js';
import { t, translatePage } from './i18n.js';
import { announceToScreenReader } from './accessibility.js';
import { openModal, closeModal } from './modal.js';
import { IT, INTERACT, RECIPE_SYNERGIES, bestMarketplacePrice } from './database.js';
import { escapeHTML } from './utils.js';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

/** Número máximo de itens selecionáveis para comparação simultânea. */
const MAX_ITEMS = 3;

/** IDs dos elementos raiz criados pelo módulo. */
const DOM_IDS = {
  DOCK:    'cmp-dock',
  OVERLAY: 'cmp-overlay',
  PANEL:   'cmp-panel',
};

// ─────────────────────────────────────────────
// ESTADO CENTRALIZADO DO MÓDULO
// ─────────────────────────────────────────────

/**
 * @type {Map<string, Object>} Mapeia item.id → objeto completo do suplemento.
 * Uso de Map garante inserção ordenada e O(1) em add/remove/has.
 */
const _selectedItems = new Map();

// ─────────────────────────────────────────────
// UTILITÁRIOS DE SEGURANÇA (Anti-XSS)
// ─────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir injeção XSS.
 * Deve ser aplicado a QUALQUER dado externo antes de ser inserido no DOM via innerHTML.
 * @param {*} value - Valor a ser higienizado.
 * @returns {string}
 */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ─────────────────────────────────────────────
// UTILITÁRIOS DE CÁLCULO COMPARATIVO
// ─────────────────────────────────────────────

/**
 * Calcula o custo por dose (R$/dose) de um suplemento.
 * Retorna null se os dados necessários não estiverem disponíveis.
 *
 * @param {Object} item - Objeto do suplemento
 * @param {number} item.price  - Preço total em R$
 * @param {number} item.doses  - Número de doses na embalagem
 * @returns {number|null}
 */
export function calcCostPerDose(item) {
  const price = parseFloat(item?.pm);
  const doses = parseInt(item?.doses, 10);
  if (!price || !doses || doses <= 0) return null;
  return price / doses;
}

/**
 * Calcula o custo por grama de proteína (R$/g proteína).
 * Útil para comparar produtos de proteína de diferentes tamanhos/preços.
 *
 * @param {Object} item
 * @param {number} item.price         - Preço total em R$
 * @param {number} item.servingG      - Proteína por dose (g)
 * @param {number} item.doses         - Doses totais
 * @returns {number|null}
 */
export function calcCostPerGramProtein(item) {
  const price    = parseFloat(item?.pm);
  const proteinG = parseFloat(item?.servingG);
  const doses    = parseInt(item?.doses, 10);
  if (!price || !proteinG || !doses || proteinG <= 0 || doses <= 0) return null;
  const totalProtein = proteinG * doses;
  return price / totalProtein;
}

/**
 * Executa a análise completa de uma stack de suplementos.
 * @param {number[]} ids - IDs dos suplementos na stack
 */
export function analyzeStack(ids) {
  const items = ids.map(id => IT.find(it => it.id === id)).filter(Boolean);
  if (!items.length) return null;

  const monthlyCost = items.reduce((sum, it) => {
    const p = bestMarketplacePrice(it);
    return sum + (it.doses ? (p / it.doses) * 30 : p);
  }, 0);

  const avgEvidence = items.reduce((sum, it) => sum + (it.sc || 0), 0) / items.length;
  
  const names = items.map(i => i.name.toLowerCase());
  const conflicts = INTERACT.filter(int => 
    int.type === 'danger' && names.some(n => int.title.toLowerCase().includes(n))
  );
  
  const synergies = RECIPE_SYNERGIES.filter(syn => 
    syn[0].every(id => ids.includes(id))
  );

  return {
    items,
    monthlyCost,
    avgEvidence,
    conflicts,
    synergies,
    count: items.length
  };
}

/**
 * Move um item para a Stack A ou B
 */
export function assignToAB(id, side) {
  const key = side === 'A' ? 'stackA' : 'stackB';
  const other = side === 'A' ? 'stackB' : 'stackA';
  
  // Remove do outro lado se existir (toggle exclusivo)
  S[other] = S[other].filter(i => i !== id); // filter já gera novo array
  let list = S[key];
  const idx = list.indexOf(id);
  if (idx === -1) list.push(id);
  else list.splice(idx, 1);
  S[key] = list;
  
  save();
  renderCompareAB();
}

/**
 * Determina qual item tem o melhor valor para uma métrica específica.
 * Retorna o id do item com o menor valor (menor custo = melhor).
 *
 * @param {Object[]} items  - Array de suplementos
 * @param {Function} metricFn - Função de cálculo (ex: calcCostPerDose)
 * @returns {string|null} - id do melhor item, ou null se não calculável
 */
function getBestValueId(items, metricFn) {
  let bestId    = null;
  let bestValue = Infinity;
  for (const item of items) {
    const val = metricFn(item);
    if (val !== null && val < bestValue) {
      bestValue = val;
      bestId    = item.id;
    }
  }
  return bestId;
}

// ─────────────────────────────────────────────
// UTILITÁRIOS HÁPTICOS
// ─────────────────────────────────────────────

/**
 * Dispara um padrão de vibração no dispositivo móvel (Vibration API).
 * Degrada graciosamente em ambientes sem suporte.
 * @param {'success'|'warning'|'error'} type
 */
function haptic(type) {
  if (!navigator.vibrate) return;
  const patterns = {
    success: [40],
    warning: [30, 60, 30],
    error:   [60, 40, 60, 40, 60],
  };
  navigator.vibrate(patterns[type] ?? [20]);
}

// ─────────────────────────────────────────────
// INICIALIZAÇÃO DOS ELEMENTOS DOM
// ─────────────────────────────────────────────

/**
 * Cria e injeta o Floating Dock e o Overlay no final do <body>.
 * Idempotente: pode ser chamado múltiplas vezes sem duplicar os elementos.
 */
export function initCompare() {
  // ── Floating Dock ──────────────────────────────────────────────────
  if (!document.getElementById(DOM_IDS.DOCK)) {
    const dock = document.createElement('div');
    dock.id            = DOM_IDS.DOCK;
    dock.className     = 'cmp-dock';
    dock.setAttribute('role',       'region');
    dock.setAttribute('aria-label', t('compare.dock_label') || 'Comparar suplementos selecionados');
    dock.setAttribute('aria-live',  'polite');
    dock.innerHTML = _renderDockHTML([]);
    document.body.appendChild(dock);
  }

  // ── Overlay Modal ──────────────────────────────────────────────────
  if (!document.getElementById(DOM_IDS.OVERLAY)) {
    const overlay = document.createElement('div');
    overlay.id        = DOM_IDS.OVERLAY;
    overlay.className = 'cmp-overlay';
    overlay.setAttribute('role',        'dialog');
    overlay.setAttribute('aria-modal',  'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-labelledby', 'cmp-modal-title');
    overlay.innerHTML = `
      <div class="cmp-panel" id="${DOM_IDS.PANEL}" role="document">
        <div class="cmp-panel-head">
          <h2 class="cmp-modal-title" id="cmp-modal-title" data-i18n="compare.modal_title">
            Comparação de Suplementos
          </h2>
          <button
            class="cmp-close-btn"
            id="cmp-close-btn"
            aria-label="${esc(t('compare.close') || 'Fechar comparação')}"
            data-i18n-title="compare.close"
          >✕</button>
        </div>
        <div class="cmp-scroll-wrap">
          <div class="cmp-table-wrap" id="cmp-table-wrap" role="table" aria-label="Tabela comparativa">
            <!-- Colunas injetadas dinamicamente por _renderCompareTable() -->
          </div>
        </div>
        <div class="cmp-panel-footer">
          <button class="cmp-clear-btn" id="cmp-clear-btn" data-i18n="compare.clear_all">
            Limpar Seleção
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Fecha ao clicar fora do painel (backdrop click)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeCompareModal();
    });

    // Evento: botão fechar no cabeçalho
    overlay.querySelector('#cmp-close-btn').addEventListener('click', _closeCompareModal);

    // Evento: limpar toda a seleção
    overlay.querySelector('#cmp-clear-btn').addEventListener('click', () => {
      clearAll();
      _closeCompareModal();
    });
  }

  _syncDock();
}

// ─────────────────────────────────────────────
// GERENCIAMENTO DE ESTADO DE SELEÇÃO
// ─────────────────────────────────────────────

/**
 * Adiciona um suplemento à seleção para comparação.
 * Respeita o limite de MAX_ITEMS e fornece feedback ao usuário.
 *
 * @param {Object} item - Objeto completo do suplemento
 * @param {string} item.id   - Identificador único
 * @param {string} item.name - Nome do suplemento
 */
export function addToCompare(item) {
  if (!item?.id) {
    console.warn('[compare] addToCompare: item inválido.', item);
    return;
  }

  // Já está selecionado: toggle (remove)
  if (_selectedItems.has(item.id)) {
    removeFromCompare(item.id);
    return;
  }

  // Limite atingido
  if (_selectedItems.size >= MAX_ITEMS) {
    const msg = t('compare.limit_reached', { max: MAX_ITEMS })
      || `Máximo de ${MAX_ITEMS} itens para comparação.`;
    announceToScreenReader(msg);
    haptic('warning');
    _flashDockWarning();
    return;
  }

  _selectedItems.set(item.id, item);

  const addedMsg = t('compare.item_added', { name: item.name })
    || `${item.name} adicionado à comparação.`;
  announceToScreenReader(addedMsg);
  haptic('success');
  _markCardSelected(item.id, true);
  _syncDock();
}

/**
 * Remove um suplemento da seleção pelo seu ID.
 * @param {string} id
 */
export function removeFromCompare(id) {
  const idx = S.cmpSel.indexOf(id);
  if (idx === -1) return;
  
  const itemName = IT.find(i => i.id === id)?.name || '';
  const list = S.cmpSel;
  list.splice(idx, 1);
  S.cmpSel = list; // Dispara o Proxy.set para persistência e reatividade

  const removedMsg = t('compare.item_removed', { name: itemName })
    || `${item.name} removido da comparação.`;
  announceToScreenReader(removedMsg);
  haptic('warning');
  _markCardSelected(id, false);
  _syncDock();
}

/**
 * Limpa toda a seleção de uma vez.
 */
export function clearAll() {
  _selectedItems.forEach((_, id) => _markCardSelected(id, false));
  _selectedItems.clear();

  announceToScreenReader(t('compare.cleared') || 'Seleção de comparação limpa.');
  haptic('warning');
  _syncDock();
}

/**
 * Alterna a seleção de um item (add/remove).
 * API de conveniência para os cards da lista principal.
 * @param {Object} item
 */
export function toggleCompare(item) {
  addToCompare(item); // addToCompare já faz o toggle internamente
}

// ─────────────────────────────────────────────
// SINCRONIZAÇÃO DO DOCK (UI REATIVA)
// ─────────────────────────────────────────────

/**
 * Atualiza o Floating Dock para refletir o estado atual de _selectedItems.
 * Gerencia a visibilidade (show/hide) e re-renderiza as miniaturas.
 */
function _syncDock() {
  const dock = document.getElementById(DOM_IDS.DOCK);
  if (!dock) return;

  const items = Array.from(_selectedItems.values());
  dock.innerHTML = _renderDockHTML(items);

  // Visibilidade via classe CSS (animada via transition)
  if (items.length > 0) {
    dock.classList.add('visible');
    dock.setAttribute('aria-hidden', 'false');
  } else {
    dock.classList.remove('visible');
    dock.setAttribute('aria-hidden', 'true');
  }

  // Reconecta eventos do Dock (botões re-criados no innerHTML)
  _bindDockEvents();

  // Atualiza i18n nos novos elementos
  translatePage();
}

/**
 * Gera o HTML interno do Floating Dock.
 * @param {Object[]} items
 * @returns {string}
 */
function _renderDockHTML(items) {
  const countLabel = items.length === 1
    ? (t('items.one') || '1 item')
    : (t('items.other', { count: items.length }) || `${items.length} itens`);

  const thumbnails = items.map(item => `
    <div class="cmp-dock-thumb" data-id="${esc(item.id)}" title="${esc(item.name)}" role="listitem">
      <img
        src="${esc(item.img || 'assets/placeholder.png')}"
        alt="${esc(item.name)}"
        class="cmp-dock-thumb-img"
        loading="lazy"
        onerror="this.src='assets/placeholder.png'"
      />
      <button
        class="cmp-dock-remove"
        aria-label="${esc(t('compare.remove_item') || 'Remover')} ${esc(item.name)}"
        data-remove-id="${esc(item.id)}"
      >✕</button>
    </div>
  `).join('');

  const placeholders = Array.from({ length: MAX_ITEMS - items.length }, (_, i) => `
    <div class="cmp-dock-slot" role="listitem" aria-label="${esc(t('compare.empty_slot') || 'Slot vazio')} ${i + 1}">
      <span class="cmp-dock-slot-icon">+</span>
    </div>
  `).join('');

  const canCompare = items.length >= 2;

  return `
    <div class="cmp-dock-inner">
      <div class="cmp-dock-left">
        <span class="cmp-dock-label" data-i18n="compare.dock_label">Comparar</span>
        <span class="cmp-dock-count">${esc(countLabel)}</span>
      </div>
      <div class="cmp-dock-thumbs" role="list" aria-label="${esc(t('compare.selected_items') || 'Itens selecionados')}">
        ${thumbnails}
        ${placeholders}
      </div>
      <div class="cmp-dock-actions">
        <button
          class="cmp-dock-compare-btn ${canCompare ? '' : 'disabled'}"
          id="cmp-dock-compare-btn"
          aria-disabled="${canCompare ? 'false' : 'true'}"
          ${!canCompare ? 'tabindex="-1"' : ''}
          data-i18n="compare.compare_now"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="4" width="6" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="9" y="1" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          ${esc(t('compare.compare_now') || 'Comparar Agora')}
        </button>
        <button
          class="cmp-dock-clear-btn"
          id="cmp-dock-clear-btn"
          aria-label="${esc(t('compare.clear_all') || 'Limpar seleção')}"
          data-i18n-title="compare.clear_all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>`;
}

/**
 * Registra os event listeners nos botões do Dock após re-renderização.
 */
function _bindDockEvents() {
  const dock = document.getElementById(DOM_IDS.DOCK);
  if (!dock) return;

  // Botão "Comparar Agora"
  const compareBtn = dock.querySelector('#cmp-dock-compare-btn');
  if (compareBtn && compareBtn.getAttribute('aria-disabled') !== 'true') {
    compareBtn.addEventListener('click', _openCompareModal);
  }

  // Botão "Limpar"
  const clearBtn = dock.querySelector('#cmp-dock-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  // Botões de remoção individual nos thumbs
  dock.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromCompare(btn.dataset.removeId);
    });
  });
}

/**
 * Aplica animação de "warning pulse" no Dock quando o limite é atingido.
 */
function _flashDockWarning() {
  const dock = document.getElementById(DOM_IDS.DOCK);
  if (!dock) return;
  dock.classList.add('cmp-dock--warn');
  setTimeout(() => dock.classList.remove('cmp-dock--warn'), 700);
}

// ─────────────────────────────────────────────
// MARCAÇÃO VISUAL NOS CARDS DA LISTA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Adiciona/remove a classe CSS `is-in-compare` no card da lista principal.
 * Isso atualiza o estado visual do checkbox de comparação no card.
 * Ao adicionar, dispara a animação de pulso `just-added` e faz scroll ao topo.
 * @param {string} id
 * @param {boolean} selected
 */
function _markCardSelected(id, selected) {
  const cards = document.querySelectorAll(`[data-item-id="${CSS.escape(id)}"]`);
  cards.forEach(card => {
    card.classList.toggle('is-in-compare', selected);

    if (selected) {
      // Pulso visual de confirmação no card
      card.classList.remove('just-added');
      // Força reflow para reiniciar a animação caso o item seja re-adicionado
      void card.offsetWidth;
      card.classList.add('just-added');
      card.addEventListener('animationend', () => card.classList.remove('just-added'), { once: true });

      // Scroll suave ao topo para que o usuário veja o Dock aparecer
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const checkbox = card.querySelector('[data-compare-checkbox]');
    if (checkbox) {
      checkbox.setAttribute('aria-checked', String(selected));
      checkbox.classList.toggle('checked', selected);
    }
  });
}

// ─────────────────────────────────────────────
// MODAL DE COMPARAÇÃO
// ─────────────────────────────────────────────

/**
 * Abre o painel de comparação full-screen.
 * Faz scroll ao topo antes de abrir para garantir que o painel (que
 * desce do topo da viewport) seja imediatamente visível ao usuário.
 */
function _openCompareModal() {
  const items = Array.from(_selectedItems.values());
  if (items.length < 2) {
    announceToScreenReader(t('compare.min_items') || 'Selecione ao menos 2 itens para comparar.');
    return;
  }

  const tableWrap = document.getElementById('cmp-table-wrap');
  if (tableWrap) {
    tableWrap.innerHTML = _renderCompareTable(items);
  }

  // Garante que o painel seja visto: rola ao topo antes de abrir
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Pequeno delay para o scroll completar antes da animação do painel
  const delay = window.scrollY > 0 ? 280 : 0;
  setTimeout(() => {
    const overlay = document.getElementById(DOM_IDS.OVERLAY);
    openModal(overlay);
    translatePage();

    // Registra handler de remoção de colunas dentro da tabela
    overlay.querySelectorAll('.cmp-remove-col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCompare(btn.dataset.removeId);
        // Atualiza a tabela se ainda houver itens suficientes, senão fecha
        if (_selectedItems.size >= 2) {
          const wrap = document.getElementById('cmp-table-wrap');
          if (wrap) wrap.innerHTML = _renderCompareTable(Array.from(_selectedItems.values()));
          overlay.querySelectorAll('.cmp-remove-col-btn').forEach(b => {
            b.addEventListener('click', () => removeFromCompare(b.dataset.removeId));
          });
        } else {
          _closeCompareModal();
        }
      });
    });

    announceToScreenReader(
      t('compare.modal_opened', { count: items.length })
      || `Comparando ${items.length} suplementos.`
    );
  }, delay);
}

/**
 * Fecha o modal de comparação e restaura o foco.
 */
function _closeCompareModal() {
  const overlay = document.getElementById(DOM_IDS.OVERLAY);
  closeModal(overlay); // Usa modal.js para restaurar foco e limpar keydown handler

  announceToScreenReader(t('compare.modal_closed') || 'Painel de comparação fechado.');
}

// ─────────────────────────────────────────────
// RENDERIZAÇÃO DA TABELA COMPARATIVA
// ─────────────────────────────────────────────

/**
 * Gera o HTML completo da tabela comparativa lado a lado.
 * Todos os dados externos são higienizados via esc().
 *
 * @param {Object[]} items - Array de suplementos selecionados
 * @returns {string} HTML seguro da tabela
 */
function _renderCompareTable(items) {
  // ── Calcula métricas derivadas ──────────────────────────────────
  const bestCostPerDose    = getBestValueId(items, calcCostPerDose);
  const bestCostPerProtein = getBestValueId(items, calcCostPerGramProtein);

  // ── Cabeçalho: coluna por item ──────────────────────────────────
  const headerCols = items.map(item => `
    <div class="cmp-col cmp-col-head" role="columnheader">
      <div class="cmp-item-img-wrap">
        <img
          src="${esc(item.img || 'assets/placeholder.png')}"
          alt="${esc(item.name)}"
          class="cmp-item-img"
          loading="lazy"
          onerror="this.src='assets/placeholder.png'"
        />
      </div>
      <div class="cmp-item-name">${esc(item.name)}</div>
      <div class="cmp-item-brand">${esc(item.brand || '—')}</div>
      <button
        class="cmp-remove-col-btn"
        data-remove-id="${esc(item.id)}"
        aria-label="${esc(t('compare.remove_item') || 'Remover')} ${esc(item.name)}"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `).join('');

  // ── Seções de métricas comparativas ────────────────────────────
  const sections = [
    {
      key:   'price',
      label: t('compare.section.price') || 'Preço',
      rows: [
        {
          label: t('compare.row.price_total') || 'Preço Total',
          key:   'price',
          fmt:   (v) => v != null ? `R$ ${parseFloat(v).toFixed(2)}` : '—',
          bestId: null, // menor preço = melhor (pode ser habilitado)
        },
        {
          label: t('compare.row.cost_per_dose') || 'Custo/Dose',
          key:   '__costPerDose',
          compute: calcCostPerDose,
          fmt:   (v) => v != null ? `R$ ${v.toFixed(2)}/dose` : '—',
          bestId: bestCostPerDose,
          badge: t('compare.badge.best_cost') || 'Melhor Custo',
        },
        {
          label: t('compare.row.cost_per_gram') || 'Custo/g Proteína',
          key:   '__costPerGram',
          compute: calcCostPerGramProtein,
          fmt:   (v) => v != null ? `R$ ${v.toFixed(3)}/g` : '—',
          bestId: bestCostPerProtein,
          badge: t('compare.badge.best_protein') || 'Melhor Proteína',
        },
      ],
    },
    {
      key:   'nutrition',
      label: t('compare.section.nutrition') || 'Nutrição',
      rows: [
        {
          label: t('compare.row.serving_size') || 'Porção',
          fmt:   (v) => v != null ? `${esc(v)}g` : '—',
          key:   'servingSize',
        },
        {
          label: t('compare.row.protein_per_dose') || 'Proteína/Dose',
          fmt:   (v) => v != null ? `${esc(v)}g` : '—',
          key:   'servingG',
        },
        {
          label: t('compare.row.calories') || 'Calorias/Dose',
          fmt:   (v) => v != null ? `${esc(v)} kcal` : '—',
          key:   'calories',
        },
        {
          label: t('compare.row.total_doses') || 'Doses Totais',
          fmt:   (v) => v != null ? `${esc(v)}` : '—',
          key:   'doses',
        },
      ],
    },
    {
      key:   'quality',
      label: t('compare.section.quality') || 'Qualidade',
      rows: [
        {
          label: t('compare.row.rating') || 'Avaliação',
          fmt:   (v) => v != null ? `⭐ ${parseFloat(v).toFixed(1)}` : '—',
          key:   'rating',
        },
        {
          label: t('compare.row.efficacy') || 'Eficácia Científica',
          fmt:   (v) => v != null ? `${'★'.repeat(Math.round(v))}${'☆'.repeat(5 - Math.round(v))}` : '—',
          key:   'efficacy',
        },
        {
          label: t('compare.row.category') || 'Categoria',
          fmt:   (v) => esc(v || '—'),
          key:   'category',
        },
      ],
    },
  ];

  // ── Renderiza cada seção como bloco de linhas ───────────────────
  const sectionsHTML = sections.map(section => {
    const rowsHTML = section.rows.map(row => {
      const cells = items.map(item => {
        const rawVal = row.compute ? row.compute(item) : item[row.key];
        const display = row.fmt ? row.fmt(rawVal) : esc(String(rawVal ?? '—'));
        const isBest = row.bestId && row.bestId === item.id;

        return `
          <div class="cmp-col cmp-cell" role="cell" ${isBest ? 'data-best="true"' : ''}>
            <span class="cmp-cell-val">${display}</span>
            ${isBest && row.badge ? `<span class="cmp-best-badge" aria-label="${esc(row.badge)}">${esc(row.badge)}</span>` : ''}
          </div>`;
      }).join('');

      return `
        <div class="cmp-row" role="row">
          <div class="cmp-row-label" role="rowheader">${esc(row.label)}</div>
          <div class="cmp-row-cells">
            ${cells}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="cmp-section" role="rowgroup">
        <div class="cmp-section-head" role="row">
          <span class="cmp-section-label">${esc(section.label)}</span>
        </div>
        ${rowsHTML}
      </div>`;
  }).join('');

  return `
    <div class="cmp-cols-header" role="row">
      <div class="cmp-row-label-spacer"></div>
      <div class="cmp-header-cols">
        ${headerCols}
      </div>
    </div>
    ${sectionsHTML}`;
}

/**
 * Renderiza a nova interface de Comparação A vs B
 */
export function renderCompareAB() {
  const container = document.getElementById('cmp-ab-view');
  if (!container) return;

  const analysisA = analyzeStack(S.stackA || []);
  const analysisB = analyzeStack(S.stackB || []);

  const maxCost = Math.max(analysisA?.monthlyCost || 0, analysisB?.monthlyCost || 0, 1);

  const renderColumn = (analysis, side) => {
    if (!analysis) return `
      <div class="cmp-ab-empty">
        <div class="empty-ico">➕</div>
        <p>Stack ${side} vazia</p>
        <small>Adicione itens da lista abaixo</small>
      </div>`;

    return `
      <div class="cmp-stack-card">
        <div class="cmp-stack-header">
          <div class="cmp-stack-title">STACK ${side}</div>
          <div class="cmp-stack-main-metrics">
            <div class="cmp-metric">
              <span class="lbl">Custo Mensal</span>
              <span class="val">R$ ${analysis.monthlyCost.toFixed(0)}</span>
            </div>
            <div class="cmp-metric">
              <span class="lbl">Evidência Média</span>
              <span class="val">${analysis.avgEvidence.toFixed(1)} ★</span>
            </div>
          </div>
        </div>
        
        <div class="cmp-bar-wrap">
          <div class="cmp-bar-fill" style="width: ${(analysis.monthlyCost / maxCost) * 100}%; background: var(--accent)"></div>
        </div>

        <div class="cmp-stack-items">
          ${analysis.items.map(it => `
            <div class="cmp-stack-mini-item">
              <span>${it.name}</span>
              <button onclick="window._app.assignToAB(${it.id}, '${side}')">✕</button>
            </div>
          `).join('')}
        </div>

        <div class="cmp-stack-analysis">
          ${analysis.conflicts.length ? `<div class="cmp-alert danger">⚠️ ${analysis.conflicts.length} Conflitos detectados</div>` : ''}
          ${analysis.synergies.length ? `<div class="cmp-alert success">✨ ${analysis.synergies.length} Sinergias ativas</div>` : ''}
        </div>
      </div>`;
  };

  container.innerHTML = `
    <div class="cmp-ab-grid">
      <div class="cmp-ab-col">${renderColumn(analysisA, 'A')}</div>
      <div class="cmp-ab-divider">VS</div>
      <div class="cmp-ab-col">${renderColumn(analysisB, 'B')}</div>
    </div>
    <div class="cmp-ab-selector">
      <h4>Selecione para comparar:</h4>
      <div class="cmp-ab-pool">
        ${IT.filter(i => i.pr !== 'extra').map(it => {
          const inA = S.stackA.includes(it.id);
          const inB = S.stackB.includes(it.id);
          return `
            <div class="cmp-pool-item ${inA?'in-a':''} ${inB?'in-b':''}">
              <span class="name">${it.name}</span>
              <div class="btns">
                <button class="btn-a" onclick="window._app.assignToAB(${it.id}, 'A')">A</button>
                <button class="btn-b" onclick="window._app.assignToAB(${it.id}, 'B')">B</button>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// INTEGRAÇÃO COM CARDS DA LISTA PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Registra o handler de comparação em todos os botões/checkboxes de comparação
 * presentes na lista de suplementos. Deve ser chamado após renderização da lista.
 *
 * Espera que cada card tenha:
 *   - `data-item-id="<id>"` no elemento raiz do card
 *   - `data-compare-trigger` no botão/checkbox de comparação
 *
 * O objeto do item deve ser acessível via card.dataset ou via função `getItemById`.
 *
 * @param {Function} getItemById - Função que recebe um id e retorna o objeto item
 */
export function bindCompareButtons(getItemById) {
  document.querySelectorAll('[data-compare-trigger]').forEach(btn => {
    // Remove listener anterior para evitar duplicação
    btn.replaceWith(btn.cloneNode(true));
  });

  // Re-seleciona após cloneNode
  document.querySelectorAll('[data-compare-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('[data-item-id]');
      if (!card) return;
      const item = getItemById(card.dataset.itemId);
      if (item) toggleCompare(item);
    });
  });
}

/**
 * Retorna true se o item com dado id está atualmente selecionado para comparação.
 * Útil para renderização inicial dos cards (aplicar estado correto).
 * @param {string} id
 * @returns {boolean}
 */
export function isInCompare(id) {
  return _selectedItems.has(id);
}

/**
 * Retorna o número de itens atualmente selecionados.
 * @returns {number}
 */
export function compareCount() {
  return _selectedItems.size;
}

// ─────────────────────────────────────────────
// EXPORTAÇÃO DO ESTADO (para uso em outros módulos)
// ─────────────────────────────────────────────

/**
 * Retorna cópia imutável do array de itens selecionados.
 * @returns {Object[]}
 */
export function getSelectedItems() {
  return Array.from(_selectedItems.values());
}
