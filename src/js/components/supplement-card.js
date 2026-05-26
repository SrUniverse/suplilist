/**
 * @fileoverview Componente visual SupplementCard do SupliList v3.0.
 * Design premium dark mode com donut donut chart, badges de nível A/B/C,
 * preço riscado, custo por dose e botão full-width de checkout.
 */

import { ErrorBoundary } from '../core/error-boundary.js';
import { formatPrice, formatDaysLeft, truncate } from '../utils/formatters.js';

/** Mapeia nível de evidência para classe badge */
function _badgeNivelClass(level) {
  const l = String(level).toUpperCase().trim();
  if (l === 'A') return 'badge-nivel-a';
  if (l === 'B') return 'badge-nivel-b';
  return 'badge-nivel-c';
}

/** Mapeia categoria para classe de cor do badge */
function _badgeCategoryClass(cat) {
  const map = {
    'aminoácido': 'cat-aminoacido',
    'ácido graxo': 'cat-acido-graxo',
    'vitamina': 'cat-vitamina',
    'mineral': 'cat-mineral',
    'adaptógeno': 'cat-adaptogeno',
  };
  const key = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Tenta match normalizado
  for (const [k, v] of Object.entries(map)) {
    const kn = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (key.includes(kn)) return v;
  }
  return 'cat-digital';
}

/**
 * Cria a estrutura física do card de suplemento no DOM — v3.0.
 * @param {import('../types/supplement.schema.js').Supplement} supplement
 * @param {Object} [options={}]
 * @returns {HTMLElement}
 */
function _createCard(supplement, options = {}) {
  const isFavorite  = !!options.isFavorite;
  const stockStatus = options.stockStatus || 'out-of-stock';
  const daysLeft    = typeof options.daysLeft === 'number' ? options.daysLeft : 0;

  const cardElement = document.createElement('div');
  cardElement.className = 'card flex flex-col overflow-hidden relative group';
  cardElement.style.cssText = 'height:100%;width:100%;';
  cardElement.setAttribute('data-supplement-id', supplement.id);
  cardElement.setAttribute('role', 'article');

  // Preços
  const pricesList = Object.values(supplement.prices || {}).filter((p) => typeof p === 'number' && p > 0);
  const minPrice   = pricesList.length > 0 ? Math.min(...pricesList) : 0;
  const maxPrice   = pricesList.length > 1 ? Math.max(...pricesList) : 0;

  // Badge nível
  const nivelClass = _badgeNivelClass(supplement.evidenceLevel);
  const nivelLabel = `NÍVEL ${supplement.evidenceLevel}`;

  // Badge categoria
  const catClass = _badgeCategoryClass(supplement.category);

  // Alerta de estoque
  let stockAlertHtml = '';
  if (stockStatus === 'running-low') {
    stockAlertHtml = `<p style="font-size:10px;color:#fbbf24;font-weight:600;margin-top:2px;animation:pulse 2s infinite;">⚠️ ${formatDaysLeft(daysLeft)}</p>`;
  }

  cardElement.innerHTML = `
    <!-- Cover Image -->
    <div class="card-image-wrap" style="position:relative;width:100%;aspect-ratio:1/1;flex-shrink:0;overflow:hidden;background:var(--bg-elevated);">
      <img
        src="${supplement.image}"
        alt="${supplement.name}"
        loading="lazy"
        width="400" height="400"
        style="width:100%;height:100%;object-fit:cover;transition:transform .5s ease;"
        onerror="this.src='assets/icons/placeholder.webp'"
      >
      <!-- Badge Nível -->
      <span class="${nivelClass}" style="position:absolute;top:10px;left:10px;">
        ${nivelLabel}
      </span>
      <!-- Favorito -->
      <button
        class="btn-favorite"
        style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s ease;backdrop-filter:blur(4px);"
        data-action="favorite"
        data-id="${supplement.id}"
        aria-label="Favoritar ${supplement.name}"
      >${isFavorite ? '❤️' : '🤍'}</button>
    </div>

    <!-- Body -->
    <div style="padding:14px 14px 0;display:flex;flex-direction:column;flex-grow:1;gap:6px;">

      <!-- Badges: categoria + ícone de comparar -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <span class="badge-category ${catClass}">${supplement.category}</span>
        <button
          style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:14px;padding:2px 4px;transition:color .2s ease;"
          data-action="compare"
          data-id="${supplement.id}"
          title="Comparar"
          aria-label="Comparar ${supplement.name}"
        >⚖️</button>
      </div>

      <!-- Nome -->
      <h3 style="font-size:14px;font-weight:700;color:var(--t1);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;" title="${supplement.name}">
        ${supplement.name}
      </h3>

      <!-- Mecanismo -->
      <p style="font-size:11px;color:var(--t3);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
        ${truncate(supplement.mechanism, 85)}
      </p>

      <!-- Preços -->
      <div style="margin-top:auto;padding-top:8px;">
        <div style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap;">
          <span class="price-best">${formatPrice(minPrice)}</span>
          ${maxPrice > minPrice ? `<span class="price-original">${formatPrice(maxPrice)}</span>` : ''}
        </div>
        <p class="price-per-dose">${formatPrice(supplement.costPerDose)}/dose</p>
        ${stockAlertHtml}
      </div>

    </div>

    <!-- Action row -->
    <div style="display:flex;gap:6px;padding:10px 14px;margin-top:auto;">
      <button
        style="flex:0 0 auto;padding:8px 10px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;color:var(--t2);font-size:12px;cursor:pointer;transition:all .2s ease;"
        data-action="detail"
        data-id="${supplement.id}"
        aria-label="Detalhes de ${supplement.name}"
      >Detalhes</button>
      <button
        class="btn-buy-full"
        style="border-radius:8px;flex:1;"
        data-action="buy"
        data-id="${supplement.id}"
        aria-label="Comprar ${supplement.name}"
      >🛒 VER MELHORES PREÇOS</button>
    </div>
  `;

  // Hover scale na imagem
  const img = cardElement.querySelector('img');
  if (img) {
    cardElement.addEventListener('mouseenter', () => { img.style.transform = 'scale(1.06)'; });
    cardElement.addEventListener('mouseleave', () => { img.style.transform = 'scale(1)'; });
  }

  return cardElement;
}

export const createCard = ErrorBoundary.wrap(_createCard, 'SupplementCard');



