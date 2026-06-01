/**
 * safe-price.js — Menor Preço Seguro & Custo Real por Dose
 * SupliList v15
 *
 * Substitui getCheapestStore() por getSafestCheapestStore():
 *   - Prioriza lojas verificadas (whitelist)
 *   - Nunca oculta que o vendedor é terceiro
 *   - Integra fator de penalidade dos laudos para exibir custo real
 */

import { classifySellerEntry } from '../data/trusted-sellers.js';
import { getCostPenaltyFactor, getSummaryForSupplement } from '../data/lab-reports.js';

/**
 * @typedef {Object} SafePriceResult
 * @property {number}  price          - Preço nominal em R$
 * @property {number}  realPrice      - Preço ajustado pelo laudo (penalidade de pureza)
 * @property {string}  label          - Nome da loja
 * @property {boolean} verified       - Loja oficial verificada
 * @property {string}  sellerType     - 'official' | 'authorized_dist' | 'third_party' | 'unknown'
 * @property {string}  marketplace    - Marketplace de origem
 * @property {string}  url            - URL do produto
 * @property {boolean} hasPenalty     - Se há fator de penalidade por laudo
 * @property {number}  penaltyFactor  - Fator multiplicador de custo real
 */

/**
 * Retorna o menor preço entre LOJAS VERIFICADAS para um item.
 * Se não houver loja verificada, retorna o menor preço geral com flag de aviso.
 *
 * @param {Object} item         - Suplemento do SUPPLEMENTS_DB
 * @param {Object|null} prices  - Objeto prices[item.id]: { store: { price, label, sellerName, marketplace, url } }
 * @returns {SafePriceResult|null}
 */
export function getSafestCheapestStore(item, prices) {
  if (!item || !prices || !prices[item.id]) return null;

  const entries = Object.entries(prices[item.id]).map(([store, data]) => ({
    store,
    ...data,
    // Classificar vendedor
    classification: classifySellerEntry({
      store,
      sellerName: data.sellerName || store,
      marketplace: data.marketplace || inferMarketplace(data.url || ''),
      url: data.url || '',
    }),
  }));

  if (!entries.length) return null;

  // Preferir lojas verificadas
  const verifiedEntries = entries.filter(e => e.classification.verified);
  const pool = verifiedEntries.length > 0 ? verifiedEntries : entries;

  // Menor preço dentro do pool
  const cheapest = pool.reduce((a, b) => (a.price < b.price ? a : b));
  const isVerified = cheapest.classification.verified;

  // Aplicar penalidade de laudo (custo real por dose)
  const { penaltyFactor, hasActivePenalty } = getCostPenaltyFactor(item.id);

  return {
    price: cheapest.price,
    realPrice: Math.round(cheapest.price * penaltyFactor * 100) / 100,
    label: cheapest.classification.label || cheapest.label || cheapest.store,
    verified: isVerified,
    sellerType: cheapest.classification.type,
    marketplace: cheapest.marketplace || inferMarketplace(cheapest.url || ''),
    url: cheapest.url || '',
    hasPenalty: hasActivePenalty,
    penaltyFactor,
  };
}

/**
 * Retorna TODAS as lojas para um item, ordenadas por: verificadas primeiro, depois por preço.
 * Cada entrada inclui classificação de vendedor e penalidade de laudo.
 *
 * @param {Object} item
 * @param {Object|null} prices
 * @returns {SafePriceResult[]}
 */
export function getAllStoresForItem(item, prices) {
  if (!item || !prices || !prices[item.id]) return [];

  const { penaltyFactor, hasActivePenalty } = getCostPenaltyFactor(item.id);

  return Object.entries(prices[item.id])
    .map(([store, data]) => {
      const classification = classifySellerEntry({
        store,
        sellerName: data.sellerName || store,
        marketplace: data.marketplace || inferMarketplace(data.url || ''),
        url: data.url || '',
      });
      return {
        price: data.price,
        realPrice: Math.round(data.price * penaltyFactor * 100) / 100,
        label: classification.label || data.label || store,
        verified: classification.verified,
        sellerType: classification.type,
        marketplace: data.marketplace || inferMarketplace(data.url || ''),
        url: data.url || '',
        hasPenalty: hasActivePenalty,
        penaltyFactor,
        saving: data.saving || 0,
      };
    })
    .sort((a, b) => {
      // Verificadas primeiro, depois preço crescente
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.price - b.price;
    });
}

/**
 * Formata o preço por dose exibindo "real" quando há penalidade de laudo.
 * Ex: "R$ 2,10 / dose real" em vez de "R$ 1,47 / dose"
 *
 * @param {Object} item         - Suplemento do SUPPLEMENTS_DB
 * @param {Object|null} prices  - prices.json
 * @param {number} [daysPerMonth=30]
 * @returns {string}
 */
export function getSafeDosePriceLabel(item, prices, daysPerMonth = 30) {
  const store = getSafestCheapestStore(item, prices);
  if (!store) {
    // Fallback por pricePerGram
    const ppg = item.pricePerGram ?? 0.3;
    const dose = item.dosage?.maintenance ?? 5;
    return `R$ ${(ppg * dose / (item.dosage?.unit === 'g' ? 1 : 1000)).toFixed(2).replace('.', ',')} / dose`;
  }

  const pricePerDay = store.price / daysPerMonth;

  if (store.hasPenalty) {
    const realPricePerDay = store.realPrice / daysPerMonth;
    return `R$ ${realPricePerDay.toFixed(2).replace('.', ',')} / dose real`;
  }

  return `R$ ${pricePerDay.toFixed(2).replace('.', ',')} / dose`;
}

/**
 * Gera o HTML completo de uma linha de preço para o modal de preços.
 * Inclui badge de verificação, preço, penalidade e link.
 *
 * @param {SafePriceResult} store
 * @returns {string}
 */
export function renderPriceCardHtml(store) {
  const verifiedBadge = store.verified
    ? `<span class="seller-badge seller-badge--verified">🔒 Fonte Verificada</span>`
    : `<span class="seller-badge seller-badge--third-party">⚠️ Vendedor Terceiro</span>`;

  const realPriceNote = store.hasPenalty
    ? `<span class="price-card-real-cost" title="Custo real ajustado por laudo de pureza independente">
        Custo real: R$ ${store.realPrice.toFixed(2).replace('.', ',')}
       </span>`
    : '';

  const savingBadge = store.saving > 0
    ? `<span class="lp-price-saving">-R$ ${store.saving}</span>`
    : '';

  return `
    <div class="lp-price-card">
      <div class="lp-price-card-left">
        ${verifiedBadge}
        <div class="lp-price-card-store">${store.label}</div>
        <div class="lp-price-card-val">R$ ${store.price.toFixed(2).replace('.', ',')}</div>
        ${realPriceNote}
        ${savingBadge}
      </div>
      ${store.url
        ? `<a href="${store.url}" target="_blank" rel="noopener noreferrer"
              class="lp-price-link" data-aff-mp="${store.marketplace}">
              Comprar →
           </a>`
        : ''}
    </div>
  `;
}

/**
 * CSS dos badges de vendedor. Injetar uma vez no head.
 */
export const SELLER_BADGE_STYLES = `
  .seller-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 700; border-radius: 5px;
    padding: 2px 7px; letter-spacing: 0.02em; white-space: nowrap;
  }
  .seller-badge--verified {
    background: rgba(34,197,94,0.12); color: #22C55E;
    border: 1px solid rgba(34,197,94,0.25);
  }
  .seller-badge--third-party {
    background: rgba(234,179,8,0.10); color: #EAB308;
    border: 1px solid rgba(234,179,8,0.25);
  }
  .price-card-real-cost {
    font-size: 10px; color: #F97316; font-weight: 600;
    margin-top: 2px; display: block;
    cursor: help;
  }
  /* Menor Preço Seguro label no card */
  .lp-safe-price-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: #22C55E;
    display: flex; align-items: center; gap: 3px;
  }
  .lp-safe-price-label--unverified {
    color: #EAB308;
  }
`;

/**
 * Injeta os estilos de badge no documento (idempotente).
 */
export function injectSafePriceStyles() {
  if (document.getElementById('safe-price-styles')) return;
  const style = document.createElement('style');
  style.id = 'safe-price-styles';
  style.textContent = SELLER_BADGE_STYLES;
  document.head.appendChild(style);
}

// ─── Helpers Privados ───────────────────────────────────────────────────────

function inferMarketplace(url) {
  if (url.includes('amazon')) return 'amazon';
  if (url.includes('mercadolivre') || url.includes('meli.la')) return 'ml';
  if (url.includes('shopee')) return 'shopee';
  return 'unknown';
}
