/**
 * MyStackPageList — List rendering for stack items
 */
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { escapeHtml } from '../../utils/escape.js';
import { renderEvidenceBadge } from '../../utils/evidence.js';
import { getSupplementId } from '../../utils/stack.js';
import { compareWithRecommended, getStatusColor } from '../calculator/dosage-optimizer.js';
import { getSupplementImage, getEvidenceLevel, calcDaysLeft } from './my-stack-page-utils.js';
import { resolveItemDose, formatDoseShort } from './stack-dose.js';

export class MyStackPageList {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(stack) {
    const list = this.container.querySelector('#msp-list');
    if (!list) return;

    if (!stack.length) {
      list.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:20px;">Sua stack está vazia. Adicione suplementos!</p>';
      return;
    }

    list.innerHTML = stack.map((item, idx) => {
      const supId = getSupplementId(item);
      const img = getSupplementImage(item);
      const ev = getEvidenceLevel(item);
      const daysLeft = calcDaysLeft(item);
      const dose = resolveItemDose(item);
      const doseText = formatDoseShort(dose);
      const comp = compareWithRecommended(item);
      const statusColor = comp && comp.status ? getStatusColor(comp.status) : '#666';

      return `
        <div class="msp-item" data-id="${supId}" data-idx="${idx}">
          <img src="${img}" alt="${escapeHtml(item.name)}" class="msp-item-img" loading="lazy" />
          <div class="msp-item-info">
            <h4 class="msp-item-name">${escapeHtml(item.name)}</h4>
            <p class="msp-item-dosage">${doseText}${daysLeft ? ` · ${daysLeft} dias restantes` : ''}</p>
            <div class="msp-item-badges">
              ${renderEvidenceBadge(ev)}
              ${comp && comp.status && comp.status !== 'not-recommended' ? `<span style="color:${statusColor};font-size:10px;font-weight:700;">✓</span>` : ''}
            </div>
          </div>
          <div class="msp-item-actions">
            <button class="msp-btn-sm" data-action="edit" data-id="${supId}" title="Editar" aria-label="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="msp-btn-sm" data-action="remove" data-id="${supId}" title="Remover" aria-label="Remover"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    list.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'edit') {
        if (this.callbacks?.onEdit) this.callbacks.onEdit(id);
      } else if (action === 'remove') {
        const item = stack.find(s => s.supplementId === id);
        if (item && confirm(`Remover "${item.name}" do stack?`)) {
          stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { supplementId: id });
        }
      }
    });
  }
}
