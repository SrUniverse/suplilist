/**
 * @fileoverview SupplementDetailsModal - Modal de visualização detalhada de um suplemento.
 * @author SupliList Team
 * @version 3.0.0
 */

import { eventBus } from '../core/eventbus.js';
import { supplementService } from '../features/supplements/supplementService.js';
import { formatPrice } from '../utils/formatters.js';

export class SupplementDetailsModal {
  constructor() {
    this.modalEl = null;
    this.currentSupplement = null;
    this._injectStyles();
    this._createDOM();
    this._setupListeners();
  }

  _injectStyles() {
    if (document.getElementById('supplement-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'supplement-modal-styles';
    style.textContent = `
      .supp-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        padding: 1rem;
      }
      .supp-modal-overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .supp-modal-content {
        background: var(--bg-dark);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-xl);
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .supp-modal-overlay.open .supp-modal-content {
        transform: translateY(0) scale(1);
      }
      .supp-modal-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-light);
        position: sticky;
        top: 0;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        z-index: 10;
        gap: 0.5rem;
      }
      .supp-modal-btn {
        background: var(--bg-darker);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .supp-modal-btn:hover {
        background: var(--border-color);
        transform: scale(1.05);
      }
      .supp-modal-body {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        padding: 2rem;
      }
      @media (min-width: 768px) {
        .supp-modal-body {
          grid-template-columns: 1fr 1fr;
        }
      }
      /* Left Column */
      .supp-image-container {
        width: 100%;
        aspect-ratio: 1;
        border-radius: var(--radius-lg);
        background: var(--bg-darkest);
        border: 1px solid var(--border-light);
        overflow: hidden;
        margin-bottom: 1.5rem;
      }
      .supp-image-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .supp-badges {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      .supp-title {
        font-family: var(--font-headline, 'Outfit');
        font-size: 2rem;
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 1rem;
        color: #fff;
      }
      .supp-desc {
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 1rem;
      }
      
      /* Right Column */
      .mkt-card {
        background: var(--bg-darkest);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        transition: all 0.2s ease;
      }
      .mkt-card.best-price {
        border-color: var(--brand-primary);
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.15);
        background: rgba(167, 139, 250, 0.05);
      }
      .mkt-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .mkt-name {
        font-weight: 700;
        font-size: 1rem;
        color: #fff;
      }
      .mkt-price {
        color: var(--text-secondary);
        font-size: 0.85rem;
      }
      .mkt-btn {
        background: var(--brand-primary);
        color: #fff;
        border: none;
        padding: 0.6rem 1.2rem;
        border-radius: var(--radius-sm);
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
        text-transform: uppercase;
        font-size: 0.8rem;
      }
      .mkt-btn:hover {
        background: var(--brand-primary-hover);
      }
      .bento-science {
        background: var(--bg-darkest);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 1.25rem;
        margin-top: 1.5rem;
      }
      .bento-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .bento-warning {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: var(--radius-md);
        padding: 1rem;
        margin-top: 1rem;
        color: #fca5a5;
        font-size: 0.85rem;
        line-height: 1.5;
      }
      .synergy-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .synergy-tag {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-light);
        padding: 0.3rem 0.6rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
    `;
    document.head.appendChild(style);
  }

  _createDOM() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'supp-modal-overlay';
    this.modalEl.innerHTML = `
      <div class="supp-modal-content" role="dialog" aria-modal="true">
        <div class="supp-modal-header">
          <button class="supp-modal-btn" id="supp-modal-fav" title="Favoritar">🤍</button>
          <button class="supp-modal-btn" id="supp-modal-close" title="Fechar">✕</button>
        </div>
        <div class="supp-modal-body" id="supp-modal-body-content">
          <!-- Content injected dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    this.favBtn = this.modalEl.querySelector('#supp-modal-fav');
    this.closeBtn = this.modalEl.querySelector('#supp-modal-close');
    this.bodyContent = this.modalEl.querySelector('#supp-modal-body-content');

    // Fechar eventos
    this.closeBtn.addEventListener('click', () => this.close());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('open')) {
        this.close();
      }
    });

    // Favoritar evento
    this.favBtn.addEventListener('click', () => {
      if (!this.currentSupplement) return;
      eventBus.emit('supplement:favorite:toggle', { supplementId: this.currentSupplement.id });
      // Atualiza ícone optimistically
      const isFav = this.favBtn.textContent.includes('❤️');
      this.favBtn.textContent = isFav ? '🤍' : '❤️';
    });
  }

  _setupListeners() {
    // Escuta o evento global para abrir o modal com o ID específico
    const handleOpen = ({ id, supplementId }) => {
      const targetId = id || supplementId;
      if (targetId) this.open(targetId);
    };

    eventBus.on('supplement:view', handleOpen);
    eventBus.on('supplement:detail:open', handleOpen);

    // Escuta evento de afiliados para telemetria opcional
    this.modalEl.addEventListener('click', (e) => {
      const buyBtn = e.target.closest('.mkt-btn');
      if (buyBtn && this.currentSupplement) {
        const marketplace = buyBtn.dataset.marketplace;
        eventBus.emit('affiliate_click', {
          supplementId: this.currentSupplement.id,
          marketplace: marketplace
        });
      }
    });
  }

  open(id) {
    const enrichedData = supplementService.getEnriched(id, { includeFavorite: true });
    if (!enrichedData || !enrichedData.supplement) {
      console.error('Supplement not found for modal', id);
      return;
    }

    this.currentSupplement = enrichedData.supplement;
    const isFav = enrichedData.isFavorite;

    this.favBtn.textContent = isFav ? '❤️' : '🤍';
    this._renderBody();

    this.modalEl.classList.add('open');
    document.body.style.overflow = 'hidden'; // Evita scroll do body atrás do modal
  }

  close() {
    this.modalEl.classList.remove('open');
    document.body.style.overflow = '';
    this.currentSupplement = null;
  }

  _renderBody() {
    const supp = this.currentSupplement;
    
    // Badges
    const evBadge = `<span class="badge badge-success">NÍVEL ${supp.evidenceLevel || 'C'}</span>`;
    const catBadge = `<span class="badge" style="background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.2)">${supp.category || 'Geral'}</span>`;

    // Parágrafos de resumo
    const paragraphs = (supp.mechanism || '').split('\\n').map(p => `<p class="supp-desc">${p}</p>`).join('');

    // Preços e Marketplaces
    const prices = supp.prices || {};
    const links = supp.links || {};
    const marketplaces = [
      { id: 'shopee', name: 'Shopee', color: '#ee4d2d' },
      { id: 'mercadolivre', name: 'Mercado Livre', color: '#f1c40f' },
      { id: 'amazon', name: 'Amazon', color: '#ffffff' }
    ];

    const validPrices = Object.values(prices).filter(p => typeof p === 'number' && p > 0);
    const bestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    const mktHtml = marketplaces.map(mkt => {
      const price = prices[mkt.id] || 0;
      if (price <= 0) return ''; // Esconde se não tiver preço

      const isBest = price === bestPrice;
      const bestBadge = isBest ? `<span style="font-size:0.7rem; color:var(--brand-primary); font-weight:bold;">🏆 MELHOR PREÇO</span>` : '';
      const url = links[mkt.id] || `https://${mkt.id}.com.br/search?keyword=${encodeURIComponent(supp.name)}`;

      return `
        <div class="mkt-card ${isBest ? 'best-price' : ''}">
          <div class="mkt-info">
            <span class="mkt-name" style="color:${mkt.color}">${mkt.name}</span>
            <span class="mkt-price">${formatPrice(price)} — <strong>${formatPrice(supp.costPerDose)}/dose</strong></span>
            ${bestBadge}
          </div>
          <a href="${url}" target="_blank" class="mkt-btn" data-marketplace="${mkt.id}">Comprar</a>
        </div>
      `;
    }).join('');

    // Sinergias (mocks ou reais se existirem)
    const synergies = supp.synergies || [];
    const synergiesHtml = synergies.length > 0 
      ? `<div class="bento-science">
           <div class="bento-title">🧬 Sinergia (O que tomar junto)</div>
           <div class="synergy-tags">
             ${synergies.map(s => `<span class="synergy-tag">${s}</span>`).join('')}
           </div>
         </div>`
      : '';

    // Colaterais/Avisos
    const warnings = supp.warnings || '';
    const warningsHtml = warnings
      ? `<div class="bento-warning">
           <strong>⚠️ Avisos Importantes:</strong><br>${warnings}
         </div>`
      : '';

    // Referências Científicas (mock)
    const refsHtml = `
      <div class="bento-science" style="margin-top: 1rem;">
        <div class="bento-title">📚 Base Científica</div>
        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
          <div style="width: ${supp.evidenceLevel === 'A' ? '95%' : supp.evidenceLevel === 'B' ? '70%' : '40%'}; height: 100%; background: var(--success);"></div>
        </div>
        <a href="#" style="color:var(--brand-primary); font-size:0.8rem; text-decoration:none;">Ver 12 estudos clínicos em PubMed ➔</a>
      </div>
    `;

    this.bodyContent.innerHTML = `
      <!-- Coluna Esquerda -->
      <div>
        <div class="supp-image-container">
          <img src="${supp.image || supp.imageUrl || '/placeholder.png'}" alt="${supp.name}" onerror="this.src='/placeholder.png'">
        </div>
        <div class="supp-badges">
          ${evBadge}
          ${catBadge}
        </div>
        <h2 class="supp-title">${supp.name}</h2>
        ${paragraphs}
        ${warningsHtml}
      </div>

      <!-- Coluna Direita -->
      <div style="display: flex; flex-direction: column;">
        <div class="bento-title" style="margin-bottom: 1rem; color: #fff;">Onde Comprar</div>
        ${mktHtml || '<p style="color:var(--text-secondary); font-size:0.9rem;">Sem preços disponíveis no momento.</p>'}
        
        ${synergiesHtml}
        ${refsHtml}
      </div>
    `;
  }
}

// Inicializa singleton na importação (ou pode ser inicializado no main.js)
export const supplementDetailsModal = new SupplementDetailsModal();
