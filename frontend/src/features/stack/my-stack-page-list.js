/**
 * MyStackPageList — List rendering for stack items
 */
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderEvidenceBadge } from '../../utils/evidence.js';
import { getSupplementId } from '../../utils/stack.js';
import { getSupplementImage, getEvidenceLevel, calcDaysLeft } from './my-stack-page-utils.js';
import { resolveItemDose, formatDoseShort } from './stack-dose.js';

const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`;
const ICON_REMOVE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function daysPillClass(days) {
  if (days == null) return '';
  if (days <= 7)  return 'msp-days-pill msp-days-pill--urgent';
  if (days <= 14) return 'msp-days-pill msp-days-pill--warn';
  return 'msp-days-pill msp-days-pill--ok';
}

function renderItem(item) {
  const supId = getSupplementId(item);
  const img   = getSupplementImage(item);
  const ev    = getEvidenceLevel(item);
  const days  = calcDaysLeft(item);
  const dose  = resolveItemDose(item);
  const doseText = formatDoseShort(dose);

  const daysPill = days != null
    ? `<span class="${daysPillClass(days)}">${days}d restantes</span>`
    : '';

  return `
    <div class="msp-item" data-id="${supId}" role="listitem">
      <img src="${img}" alt="${escapeHtml(item.name)}" class="msp-item-img" loading="lazy" />
      <div class="msp-item-info">
        <h4 class="msp-item-name">${escapeHtml(item.name)}</h4>
        <p class="msp-item-dosage">${escapeHtml(doseText)}</p>
        <div class="msp-item-badges">
          ${renderEvidenceBadge(ev)}
          ${daysPill}
        </div>
      </div>
      <div class="msp-item-actions">
        <button class="msp-btn-icon" data-action="edit" data-id="${supId}" title="Editar dosagem" aria-label="Editar dosagem">${ICON_EDIT}</button>
        <button class="msp-btn-icon msp-btn-icon--danger" data-action="remove" data-id="${supId}" title="Remover" aria-label="Remover do stack">${ICON_REMOVE}</button>
      </div>
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="msp-empty">
      <div class="msp-empty-icon">🧪</div>
      <h3 class="msp-empty-title">Stack vazio</h3>
      <p class="msp-empty-desc">Adicione suplementos para acompanhar dosagem,<br>aderência e custo mensal.</p>
      <button class="msp-empty-cta" id="msp-empty-add">+ Adicionar suplemento</button>
    </div>
  `;
}

export class MyStackPageList {
  constructor(container) {
    this.container = container;
    this._stack = [];
    this._boundClick = this._onClick.bind(this);
  }

  render(stack) {
    this._stack = stack;
    const list = this.container.querySelector('#msp-list');
    if (!list) return;

    list.removeEventListener('click', this._boundClick);

    if (!stack.length) {
      list.innerHTML = renderEmpty();
      list.querySelector('#msp-empty-add')?.addEventListener('click', () => {
        window.history.pushState(null, null, '/list');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      return;
    }

    list.innerHTML = stack.map(renderItem).join('');
    list.addEventListener('click', this._boundClick);
  }

  _onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'edit')   this._startEdit(id);
    if (action === 'remove') this._remove(id);
    if (action === 'save')   this._saveEdit(id);
    if (action === 'cancel') this.render(this._stack);
  }

  _startEdit(id) {
    const item = this._stack.find(s => s.supplementId === id);
    if (!item) return;

    const itemEl = this.container.querySelector(`.msp-item[data-id="${id}"]`);
    if (!itemEl) return;

    const dose = resolveItemDose(item);
    const unit = dose?.unit ?? 'g';

    // Replace info + actions with an inline edit form
    itemEl.querySelector('.msp-item-info').innerHTML = `
      <div class="msp-edit-row">
        <span style="font-size:13px;font-weight:600;color:var(--color-text-primary);">${escapeHtml(item.name)}</span>
        <input class="msp-edit-input" type="number" value="${dose?.daily ?? item.dosage ?? ''}" min="0" step="0.1" aria-label="Nova dosagem" />
        <span class="msp-edit-unit">${escapeHtml(unit)}/dia</span>
      </div>
    `;
    itemEl.querySelector('.msp-item-actions').innerHTML = `
      <button class="msp-btn-save" data-action="save" data-id="${id}">Salvar</button>
      <button class="msp-btn-cancel" data-action="cancel">Cancelar</button>
    `;

    itemEl.querySelector('.msp-edit-input')?.focus();
  }

  _saveEdit(id) {
    const itemEl = this.container.querySelector(`.msp-item[data-id="${id}"]`);
    const input  = itemEl?.querySelector('.msp-edit-input');
    if (!input) return;

    const value = parseFloat(input.value);
    if (isNaN(value) || value <= 0) {
      input.style.borderColor = '#ef4444';
      input.focus();
      return;
    }

    stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, {
      supplementId: id,
      dosage: value,
    });
    // State subscription re-renders the list automatically
  }

  _remove(id) {
    const item = this._stack.find(s => s.supplementId === id);
    if (!item) return;
    if (!confirm(`Remover "${item.name}" do stack?`)) return;
    stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
  }
}
