/**
 * @fileoverview Constantes centrais e enums globais do projeto SupliList v2.0.
 * Centraliza magic strings, chaves de persistência e limites operacionais.
 */

/**
 * Categorias permitidas de suplementação.
 * @type {readonly string[]}
 */
export const CATEGORIES = Object.freeze([
  'Aminoácido',
  'Adaptógeno',
  'Mineral',
  'Hormônio',
  'Vitamina',
  'Ácido Graxo',
  'Digital'
]);

/**
 * Objetivos terapêuticos/metas fitness suportados.
 * @type {readonly string[]}
 */
export const GOALS = Object.freeze([
  'Hipertrofia',
  'Queima',
  'Energia',
  'Foco',
  'Sono',
  'Libido',
  'Longevidade',
  'Saúde Geral'
]);

/**
 * Unidades físicas de dosagem para inventário e consumo.
 * @type {readonly string[]}
 */
export const UNITS = Object.freeze(['g', 'mg', 'mcg', 'UI', 'ml']);

/**
 * Níveis de evidência científica associados à eficácia clínica.
 * @type {readonly string[]}
 */
export const EVIDENCE_LEVELS = Object.freeze(['A', 'B', 'C']);

/**
 * Marketplaces integrados para redirecionamento e afiliados.
 * @type {readonly string[]}
 */
export const MARKETPLACES = Object.freeze(['shopee', 'mercadolivre', 'amazon']);

/**
 * Tipos/níveis de severidade suportados pelas notificações Toast.
 * @type {readonly string[]}
 */
export const TOAST_TYPES = Object.freeze(['success', 'warning', 'danger', 'info']);

/**
 * Critérios válidos para ordenação das listas de suplementos.
 * @type {readonly string[]}
 */
export const SORT_OPTIONS = Object.freeze(['cost', 'evidence', 'name']);

/**
 * Chave de armazenamento utilizada para persistência em localStorage.
 * @type {string}
 */
export const STORAGE_KEY = 'suplilist:state:v2';

/**
 * Quantidade máxima de itens permitidos para comparação simultânea.
 * @type {number}
 */
export const MAX_COMPARATOR_ITEMS = 4;

/**
 * Limite de dias em estoque para disparar alerta urgente de reposição.
 * @type {number}
 */
export const INVENTORY_URGENT_DAYS = 7;
