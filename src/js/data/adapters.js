/**
 * @fileoverview Adaptadores de dados para migração estrutural do SupliList v2.0.
 * Importa a base de dados, links de produtos e cálculos legados da raiz e os normaliza
 * para o novo padrão e schemas estabelecidos no SupliList v2.0.
 */

import { IT as rawDatabase, SUPP_IMGS, bestMarketplacePrice } from '../../../database.js';
import { PRODUCT_LINKS } from '../../../links.js';
import { pdose } from '../../../calculations.js';
import { logger } from '../utils/logger.js';
import { CATEGORIES, GOALS, UNITS, MARKETPLACES } from '../utils/constants.js';
import { isValidSlug } from '../utils/validators.js';

/**
 * Converte um item do banco de dados legado em um slug canônico.
 * @private
 * @param {Object} item - Item bruto da base original.
 * @returns {string} Slug formatado.
 */
function getSlug(item) {
  if (!item || !item.name) return 'generic-supplement';
  
  const name = item.name.toLowerCase();
  
  // Casos específicos documentados nos schemas
  if (name.includes('creatina monohidratada')) return 'creatina-mono';
  if (name.includes('whey protein')) return 'whey-protein';
  
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Mapeia categorias legadas para o enum restrito CATEGORIES.
 * @private
 * @param {string} cat - Categoria original.
 * @returns {string} Categoria mapeada e válida.
 */
function mapCategory(cat) {
  if (CATEGORIES.includes(cat)) return cat;
  
  const mapping = {
    'Desempenho': 'Aminoácido',
    'Estimulante': 'Adaptógeno',
    'Cognição': 'Adaptógeno',
    'Imunidade': 'Vitamina',
    'Extra': 'Digital',
    'Mulher': 'Vitamina',
    'Digestão': 'Vitamina',
    'Metabolismo': 'Vitamina',
    'Articulações': 'Mineral',
    'Sono': 'Adaptógeno',
    'Longevidade': 'Ácido Graxo',
    'Longevidade & Performance': 'Ácido Graxo',
    'Vegetal': 'Vitamina',
    'Antioxidante': 'Vitamina'
  };
  
  return mapping[cat] || 'Digital';
}

/**
 * Mapeia tags/objetivos do banco original para o enum restrito GOALS.
 * @private
 * @param {string[]} goals - Lista de objetivos originais.
 * @returns {string[]} Lista filtrada e normalizada de objetivos válidos.
 */
function mapGoals(goals) {
  if (!Array.isArray(goals)) return ['Saúde Geral'];
  
  const goalMap = {
    'libido': 'Libido',
    'hipertrofia': 'Hipertrofia',
    'gordura': 'Queima',
    'energia': 'Energia',
    'saude': 'Saúde Geral',
    'sono': 'Sono',
    'mulher': 'Saúde Geral',
    'digestao': 'Saúde Geral',
    'articulacoes': 'Saúde Geral',
    'metabolismo': 'Saúde Geral',
    'longevidade': 'Longevidade'
  };
  
  const mapped = goals
    .map((g) => goalMap[g.toLowerCase()])
    .filter(Boolean);
    
  return mapped.length > 0 ? mapped : ['Saúde Geral'];
}

/**
 * Converte e normaliza a base de dados legada para o padrão Record<slug, Supplement> do v2.0.
 * @returns {Record<string, import('../types/supplement.schema.js').Supplement>} Banco de dados mapeado e limpo.
 */
export function getRawSupplements() {
  if (!Array.isArray(rawDatabase)) {
    logger.warn('getRawSupplements: A base de dados original não é um array válido.');
    return {};
  }

  const normalized = {};

  rawDatabase.forEach((item) => {
    try {
      const slug = getSlug(item);
      
      // Parse básico de dosagens físicas
      const doseMatch = (item.dm || item.dn || '5g').match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
      let defaultDose = 5;
      let unit = 'g';
      
      if (doseMatch) {
        defaultDose = parseFloat(doseMatch[1]) || 5;
        const matchedUnit = doseMatch[2];
        if (matchedUnit && UNITS.includes(matchedUnit)) {
          unit = matchedUnit;
        }
      }

      // Constroi objeto de preços baseados nas fórmulas de database.js
      const prices = {};
      const basePrice = Number(item.pm) || 20;
      prices.shopee = basePrice;
      prices.mercadolivre = Math.round(basePrice * 1.08); // mlPrice formula
      prices.amazon = Math.round(basePrice * 1.18); // azPrice formula

      // Calcula custo por dose
      const calculatedCost = pdose(item) || (basePrice / (item.doses || 30));

      const supplement = {
        id: slug,
        name: item.name,
        category: mapCategory(item.cat),
        evidenceLevel: item.sc === 5 ? 'A' : (item.sc === 4 ? 'B' : 'C'),
        mechanism: item.desc && item.desc.length >= 10 ? item.desc : 'Mecanismo de ação científica preliminar.',
        defaultDose,
        unit,
        goals: mapGoals(item.goals || item.tags),
        prices,
        costPerDose: Math.round(calculatedCost * 100) / 100,
        image: SUPP_IMGS[item.id] || `assets/supplement_${item.id}.png`,
        contraindications: item.warn ? [item.warn] : [],
        notes: item.warn || ''
      };

      if (!isValidSlug(slug)) {
        logger.warn(`getRawSupplements: Slug "${slug}" gerado é inválido. Ignorando item.`);
        return;
      }

      normalized[slug] = supplement;
    } catch (err) {
      logger.warn(`getRawSupplements: Falha ao adaptar item legado com ID ${item?.id}:`, err.message);
    }
  });

  return normalized;
}

/**
 * Normaliza e indexa as URLs dos produtos por marketplace no padrão Record<slug, Record<marketplace, url>>.
 * @returns {Record<string, Record<string, string>>} Links mapeados e higienizados.
 */
export function getRawLinks() {
  if (!PRODUCT_LINKS || typeof PRODUCT_LINKS !== 'object') {
    logger.warn('getRawLinks: O dicionário de links originais é inválido.');
    return {};
  }

  const normalized = {};

  Object.entries(PRODUCT_LINKS).forEach(([idStr, value]) => {
    try {
      const numId = Number(idStr);
      const item = rawDatabase.find((i) => i.id === numId);
      
      if (!item) return;
      
      const slug = getSlug(item);

      normalized[slug] = {
        shopee: value.shopee || `https://shopee.com.br/search?keyword=${encodeURIComponent(item.name)}`,
        mercadolivre: value.ml || `https://lista.mercadolivre.com.br/${encodeURIComponent(item.name.replace(/\s+/g, '+'))}`,
        amazon: value.amazon || `https://www.amazon.com.br/s?k=${encodeURIComponent(item.name)}`
      };
    } catch (err) {
      logger.warn(`getRawLinks: Erro ao adaptar links para a chave ${idStr}:`, err.message);
    }
  });

  return normalized;
}

// ══════════════════════════════════════════════════════════════
// CÁLCULOS CANÔNICOS DE DOMÍNIO
// ══════════════════════════════════════════════════════════════

/**
 * Calcula o custo monetário por dose de um suplemento baseado no melhor preço de mercado.
 * @param {Object} supplement - Objeto Supplement ou legado.
 * @returns {number} Custo unitário por dose formatado.
 */
export function calcCostPerDose(supplement) {
  try {
    if (!supplement) return 0;
    
    // Se for o objeto v2.0 Supplement
    if (supplement.prices && typeof supplement.prices === 'object') {
      const activePrices = Object.values(supplement.prices).filter((p) => typeof p === 'number' && p > 0);
      const bestPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;
      const doses = supplement.doses || 30;
      return Math.round((bestPrice / doses) * 100) / 100;
    }
    
    // Se for objeto legado, delega para pdose
    return pdose(supplement) || 0;
  } catch {
    return 0;
  }
}

/**
 * Calcula a quantidade de dias aproximados de consumo restante em estoque.
 * @param {number} qty - Quantidade total física atualmente em estoque.
 * @param {number} defaultDose - A dosagem padrão consumida por dose.
 * @returns {number} Dias restantes arredondados.
 */
export function calcDaysLeft(qty, defaultDose) {
  if (typeof qty !== 'number' || typeof defaultDose !== 'number' || defaultDose <= 0) {
    return 0;
  }
  return Math.ceil(qty / defaultDose);
}

/**
 * Calcula a data estimada de encerramento do estoque físico do suplemento.
 * @param {string | Date} purchaseDate - Data de início/compra do estoque.
 * @param {number} daysLeft - Quantidade de dias restantes de estoque calculada.
 * @returns {Date | null} A data futura exata de esgotamento.
 */
export function calcEndDate(purchaseDate, daysLeft) {
  if (!purchaseDate || typeof daysLeft !== 'number' || daysLeft <= 0) {
    return null;
  }
  try {
    const start = typeof purchaseDate === 'string' ? new Date(purchaseDate + 'T00:00:00') : purchaseDate;
    if (isNaN(start.getTime())) return null;
    
    return new Date(start.getTime() + daysLeft * 24 * 60 * 60 * 1000);
  } catch {
    return null;
  }
}
