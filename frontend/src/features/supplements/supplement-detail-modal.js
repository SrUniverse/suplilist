/**
 * @fileoverview Supplement Detail Modal
 * Shows purchase history and spending data for a specific supplement
 */

import { escapeHtml } from '../../utils/escape.js';
import { getSupplementSpending, getBestPriceSource } from '../profile/refill-alerts.js';

export class SupplementDetailModal {
  static _activeModal = null;

  /**
   * Show supplement detail modal
   * @param {string} supplementId - Which supplement
   * @param {Object} supplementData - Supplement info (name, description, etc)
   * @param {Array} purchases - User's purchase history
   */
  static show(supplementId, supplementData = {}, purchases = []) {
    // Prevent race condition
    if (this._activeModal) {
      this.dismiss();
    }

    // Clean up any orphaned modal
    const stale = document.getElementById('supplement-detail-modal');
    if (stale) {
      stale.remove();
    }

    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'supplement-detail-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Detalhes: ${escapeHtml(supplementId)}`);

    const supplementPurchases = purchases.filter(p => p.supplementId === supplementId && p.status === 'active');
    const spending = getSupplementSpending(supplementId, purchases);
    const bestPrice = getBestPriceSource(supplementId, purchases);

    const startDate = supplementPurchases.length > 0
      ? new Date(Math.min(...supplementPurchases.map(p => p.purchasedAt))).toLocaleDateString('pt-BR')
      : '—';

    const daysUsing = supplementPurchases.length > 0
      ? Math.floor((Date.now() - Math.min(...supplementPurchases.map(p => p.purchasedAt))) / (24 * 60 * 60 * 1000))
      : 0;

    modal.innerHTML = `
      <div style="
        position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.5);
        display:flex;align-items:flex-end;
        z-index:10000;
      " id="supplement-detail-backdrop">
        <div style="
          width:100%;max-width:600px;margin:0 auto;
          background:var(--color-bg-primary);
          border-radius:16px 16px 0 0;
          padding:24px 20px 40px;
          max-height:90vh;
          overflow-y:auto;
          display:flex;flex-direction:column;gap:20px;
        ">
          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="flex:1;">
              <h2 style="font-size:24px;font-weight:800;margin:0;color:var(--color-text-primary);">
                ${escapeHtml(supplementData.name || supplementId)}
              </h2>
              <p style="font-size:13px;color:var(--color-text-secondary);margin:8px 0 0;">
                ${escapeHtml(supplementData.description || '')}
              </p>
            </div>
            <button id="supplement-detail-close" aria-label="Fechar" style="
              background:none;border:none;cursor:pointer;
              color:var(--color-text-secondary);padding:8px;
              display:flex;align-items:center;justify-content:center;
              font-size:20px;
            ">✕</button>
          </div>

          <!-- Stats Card -->
          <div style="
            background:var(--color-surface-primary);
            border:1px solid var(--color-border);
            border-radius:12px;padding:16px;
            display:grid;grid-template-columns:1fr 1fr;gap:12px;
          ">
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:6px;">Total Gasto</div>
              <div style="font-size:20px;font-weight:800;color:var(--color-brand);">R$ ${spending.total.toFixed(2)}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">${spending.count} compra${spending.count !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:6px;">Ticket Médio</div>
              <div style="font-size:20px;font-weight:800;color:var(--color-info);">R$ ${spending.average.toFixed(2)}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">por compra</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:6px;">Começou em</div>
              <div style="font-size:18px;font-weight:800;color:var(--color-success);">${startDate}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:6px;">Tempo de Uso</div>
              <div style="font-size:18px;font-weight:800;color:var(--color-success);">${daysUsing} dias</div>
            </div>
          </div>

          <!-- Best Price -->
          ${bestPrice.source ? `
            <div style="
              background:var(--color-success-bg);border:1px solid rgba(34,197,94,0.3);
              border-radius:12px;padding:12px 16px;
            ">
              <div style="font-size:12px;color:var(--color-success);margin-bottom:6px;">💰 Melhor Preço Encontrado</div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:14px;font-weight:700;color:var(--color-text-primary);">
                  ${escapeHtml(bestPrice.source)}
                </span>
                <span style="font-size:16px;font-weight:800;color:var(--color-success);">
                  R$ ${bestPrice.price.toFixed(2)}
                </span>
              </div>
            </div>
          ` : ''}

          <!-- Purchase History -->
          ${supplementPurchases.length > 0 ? `
            <div>
              <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;color:var(--color-text-secondary);margin:0 0 12px;">Histórico de Compras</h3>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${supplementPurchases
                  .sort((a, b) => b.purchasedAt - a.purchasedAt)
                  .map((purchase, idx) => `
                    <div style="
                      background:var(--color-surface-primary);
                      border:1px solid var(--color-border);
                      border-radius:10px;padding:12px;
                    ">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                        <div>
                          <div style="font-size:12px;font-weight:700;color:var(--color-text-primary);">
                            #${supplementPurchases.length - idx} ${new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')}
                          </div>
                          <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">
                            ${purchase.quantity}g / ${purchase.dailyConsumption}g dia
                          </div>
                        </div>
                        <div style="text-align:right;">
                          <div style="font-size:14px;font-weight:800;color:var(--color-brand);">
                            R$ ${purchase.price.toFixed(2)}
                          </div>
                          <div style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">
                            ${purchase.source || '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          ` : `
            <div style="
              background:var(--color-surface-primary);
              border:1px solid var(--color-border);
              border-radius:12px;padding:20px;
              text-align:center;
            ">
              <p style="font-size:13px;color:var(--color-text-secondary);margin:0;">
                Nenhuma compra registrada ainda.
              </p>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._activeModal = modal;
    this._attachListeners();
  }

  static _attachListeners() {
    const modal = this._activeModal;
    if (!modal) return;

    // Close button
    const closeBtn = modal.querySelector('#supplement-detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss());
    }

    // Backdrop click
    const backdrop = modal.querySelector('#supplement-detail-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.dismiss();
        }
      });
    }

    // ESC key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.dismiss();
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Store handler for cleanup
    this._escapeHandler = escapeHandler;
  }

  static dismiss() {
    if (this._activeModal) {
      this._activeModal.remove();
      this._activeModal = null;
    }
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
  }
}
