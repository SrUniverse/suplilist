/**
 * trusted-sellers.js — Whitelist de Vendedores Oficiais
 * SupliList v15 — Sistema de Menor Preço Seguro
 *
 * Somente vendedores listados aqui recebem o selo 🔒 "Fonte Verificada".
 * A fonte de verdade é pública: lojas oficiais das marcas dentro dos
 * marketplaces, ou e-commerces com controle de estoque próprio.
 *
 * Critérios de inclusão:
 *   1. Loja oficial da marca no marketplace (verificada pela plataforma)
 *   2. E-commerce próprio da marca com CNPJ rastreável
 *   3. Distribuidores autorizados publicados no site da marca
 *
 * Atualização: revisão manual trimestral recomendada.
 */

/** @typedef {'official' | 'authorized_dist' | 'third_party' | 'unknown'} SellerType */

/**
 * Whitelist de lojas oficiais no Mercado Livre.
 * Critério: nome exato da loja conforme aparece no ML (case-insensitive match).
 */
export const ML_OFFICIAL_STORES = new Set([
  // Growth Supplements
  'growth-supplements-oficial',
  'growth supplements',
  // Integralmedica / Nestlé
  'integralmedica',
  'integralmedica-oficial',
  // Dark Lab
  'dark-lab-oficial',
  'dark lab',
  // Max Titanium
  'max-titanium-oficial',
  'max titanium',
  // Probiótica
  'probiotica-oficial',
  'probiotica',
  // Atlhetica Nutrition
  'atlhetica-nutrition',
  'atlhetica nutrition',
  // Vitafor
  'vitafor-oficial',
  'vitafor',
  // Midway
  'midway-suplementos',
  'midway',
  // Br Nutrition
  'brnutrition',
  'br nutrition',
  // Imunofar
  'imunofar',
  // Arnold Nutrition
  'arnold-nutrition',
  // Nutrify
  'nutrify',
  // Polivita
  'polivita',
  // Equaliv
  'equaliv',
  // Puravida
  'puravida-oficial',
  'puravida',
]);

/**
 * Whitelist de lojas oficiais na Amazon Brasil.
 * Critério: nome do vendedor exato ou "Amazon.com.br" (estoque próprio).
 */
export const AMAZON_OFFICIAL_SELLERS = new Set([
  'amazon.com.br',
  'amazon',
  // Growth Supplements
  'growth supplements nutrition',
  'growth supplements',
  // Integralmedica
  'integralmedica',
  'nestlé health science',
  // Dark Lab
  'dark lab',
  'dark lab brasil',
  // Max Titanium
  'max titanium suplementos',
  'max titanium',
  // Probiótica
  'probiótica',
  'probiotica',
  // Atlhetica
  'atlhetica nutrition',
  // Vitafor
  'vitafor',
  // Midway
  'midway suplementos',
  // Universal Nutrition
  'universal nutrition',
  // Optimum Nutrition (importada)
  'optimum nutrition',
  'glanbia performance nutrition',
  // Puravida
  'puravida',
  // Equaliv
  'equaliv',
  // Sundown
  'sundown naturals',
  // Nature Made
  'nature made',
  // NOW Foods
  'now foods',
  // Solgar
  'solgar',
  // Doctor's Best
  "doctor's best",
  // Swanson
  'swanson',
]);

/**
 * Whitelist de lojas oficiais na Shopee.
 * Critério: loja com badge "Shopee Mall" ou verificação oficial da plataforma.
 */
export const SHOPEE_OFFICIAL_STORES = new Set([
  'growth supplements oficial',
  'integralmedica oficial',
  'dark lab oficial',
  'max titanium oficial',
  'probiotica oficial',
  'atlhetica nutrition oficial',
  'vitafor oficial',
  'midway oficial',
  'equaliv oficial',
  'puravida oficial',
  'nutrify oficial',
  'polivita oficial',
]);

/**
 * E-commerces próprios das marcas (controle de estoque próprio, CNPJ verificável).
 * Domínios aceitos como "Fonte Verificada".
 */
export const OFFICIAL_ECOMMERCES = new Set([
  'growth.com.br',
  'integralmedica.com.br',
  'darklabnutrition.com.br',
  'maxtitanium.com.br',
  'probiotica.com.br',
  'atlhetica.com.br',
  'vitafor.com.br',
  'midway.com.br',
  'equaliv.com.br',
  'puravida.com.br',
  'nutrify.com.br',
]);

/**
 * Determina o tipo de vendedor a partir dos metadados de preço.
 *
 * @param {Object} entry - Entrada de preço: { store, sellerName, marketplace, url }
 * @returns {{ type: SellerType, verified: boolean, label: string }}
 */
export function classifySellerEntry(entry) {
  if (!entry) return { type: 'unknown', verified: false, label: 'Desconhecido' };

  const marketplace = (entry.marketplace || '').toLowerCase();
  const seller = (entry.sellerName || entry.store || '').toLowerCase().trim();
  const url = (entry.url || '').toLowerCase();

  // Verificar e-commerce próprio
  for (const domain of OFFICIAL_ECOMMERCES) {
    if (url.includes(domain)) {
      return { type: 'official', verified: true, label: entry.store || 'Loja Oficial' };
    }
  }

  // Verificar por marketplace
  if (marketplace === 'amazon') {
    if (AMAZON_OFFICIAL_SELLERS.has(seller)) {
      return { type: 'official', verified: true, label: entry.store || seller };
    }
  } else if (marketplace === 'ml' || marketplace === 'mercadolivre') {
    if (ML_OFFICIAL_STORES.has(seller)) {
      return { type: 'official', verified: true, label: entry.store || seller };
    }
  } else if (marketplace === 'shopee') {
    if (SHOPEE_OFFICIAL_STORES.has(seller)) {
      return { type: 'official', verified: true, label: entry.store || seller };
    }
  }

  return { type: 'third_party', verified: false, label: entry.store || seller || 'Vendedor Terceiro' };
}

/**
 * Retorna o badge HTML para exibir junto ao vendedor.
 * 🔒 verde = Fonte Verificada | ⚠️ amarelo = Vendedor Terceiro
 *
 * @param {boolean} verified
 * @returns {string} HTML string
 */
export function getSellerBadgeHtml(verified) {
  if (verified) {
    return `<span class="seller-badge seller-badge--verified" title="Loja oficial da marca verificada">🔒 Fonte Verificada</span>`;
  }
  return `<span class="seller-badge seller-badge--third-party" title="Vendedor terceiro — não é loja oficial da marca">⚠️ Vendedor Terceiro</span>`;
}
