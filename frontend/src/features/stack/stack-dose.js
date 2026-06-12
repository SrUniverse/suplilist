/**
 * stack-dose.js — Fonte única para resolver a dose diária e o custo de itens do stack.
 *
 * Antes, o onboarding/my-stack liam `supplement.dosage.daily` — um campo que NÃO
 * existe no banco (o shape é { multiplier, maintenance, upperLimit, loading, unit,
 * timing }). Isso renderizava "undefined g/dia" e zerava o custo mensal.
 *
 * Aqui centralizamos o cálculo no DosageCalculator (peso × multiplier × modificadores,
 * ou dose clínica fixa) e expomos um resolvedor defensivo que recomputa a dose quando
 * um item do stack foi salvo sem valor numérico — auto-curando stacks já gravados.
 *
 * @module features/stack/stack-dose
 */

import { dosageCalculator } from '../calculator/dosage-calculator.js';
import { SUPPLEMENTS_DB } from './stack-recommender.js';
import { getSupplementId } from '../../utils/stack.js';
import { stateManager } from '../../state/state-manager.js';

/**
 * Lê o perfil biométrico do usuário no estado, com defaults seguros.
 * @returns {{ weight: number, trainingFrequency: number, objective: string, age: number }}
 */
export function getUserDosageProfile() {
  const user = stateManager.get('user') ?? {};
  return {
    weight: user.weight || 70,
    trainingFrequency: user.trainingFrequency || 3,
    objective: user.objective || 'general',
    age: user.age || 25,
  };
}

/**
 * Calcula a dose diária de um suplemento do banco para um perfil.
 * @param {Object} supplement - Entrada do SUPPLEMENTS_DB
 * @param {Object} [profile] - Perfil; se omitido, usa o do estado
 * @returns {{ daily: number|null, unit: string }}
 */
export function computeDailyDose(supplement, profile) {
  if (!supplement) return { daily: null, unit: 'g' };
  try {
    const r = dosageCalculator.calculate(supplement, profile ?? getUserDosageProfile());
    return { daily: r.daily, unit: r.unit };
  } catch {
    return { daily: null, unit: supplement.dosage?.unit ?? 'g' };
  }
}

/**
 * Resolve a dose de um item do stack: usa o valor numérico salvo se válido,
 * senão recomputa a partir do banco (auto-cura itens salvos com dose undefined).
 * @param {Object} item - Item do stack ({ supplementId, dosage?, unit? })
 * @param {Object} [profile]
 * @returns {{ daily: number|null, unit: string }}
 */
export function resolveItemDose(item, profile) {
  const stored = parseFloat(item?.dosage);
  if (Number.isFinite(stored) && stored > 0) {
    return { daily: stored, unit: item.unit ?? 'g' };
  }
  const db = SUPPLEMENTS_DB.find(s => s.id === getSupplementId(item));
  return computeDailyDose(db, profile);
}

/**
 * Converte uma dose diária + unidade em gramas/dia (para cálculo de custo).
 * @param {number} daily
 * @param {string} unit - 'g' | 'mg' | 'mcg' | 'ui'
 * @returns {number|null} gramas/dia ou null se a unidade não converte para massa
 */
export function dailyDoseInGrams(daily, unit) {
  if (!Number.isFinite(daily) || daily <= 0) return 0;
  const u = (unit || 'g').toLowerCase();
  if (u === 'g') return daily;
  if (u === 'mg') return daily / 1000;
  if (u === 'mcg') return daily / 1_000_000;
  return null; // UI e outras unidades não convertem para massa
}

/**
 * Normaliza dose+unidade para a unidade mais legível
 * (1000mg → 1g, 1000mcg → 1mg) e arredonda.
 * @param {number} daily
 * @param {string} unit
 * @returns {{ value: number, unit: string }}
 */
export function normalizeDose(daily, unit) {
  let v = daily;
  let u = (unit || 'g').toLowerCase();
  if (u === 'mg' && v >= 1000) { v = v / 1000; u = 'g'; }
  else if (u === 'mcg' && v >= 1000) { v = v / 1000; u = 'mg'; }
  const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  // Preserva 'UI' (e outras unidades não-mássicas) em maiúsculas como no banco
  const displayUnit = u === 'ui' ? 'UI' : u;
  return { value: rounded, unit: displayUnit };
}

/**
 * Formata uma dose diária para exibição com sufixo "/dia"
 * ("5 g/dia", "—" se indisponível).
 * @param {{ daily: number|null, unit: string }} dose
 * @returns {string}
 */
export function formatDose(dose) {
  if (!dose || !Number.isFinite(dose.daily) || dose.daily <= 0) return '—';
  const n = normalizeDose(dose.daily, dose.unit);
  return `${n.value}${n.unit}/dia`;
}

/**
 * Formata uma dose para exibição curta ("5 g", "—" se indisponível).
 * @param {{ daily: number|null, unit: string }} dose
 * @returns {string}
 */
export function formatDoseShort(dose) {
  if (!dose || !Number.isFinite(dose.daily) || dose.daily <= 0) return '—';
  const n = normalizeDose(dose.daily, dose.unit);
  return `${n.value} ${n.unit}`;
}
