// ══════════════════════════════════════════════════════════════
// js/calculations.js — Cálculos de Domínio
// ══════════════════════════════════════════════════════════════
import { bestMarketplacePrice } from './database.js';

/**
 * Calcula o preço por dose de um suplemento.
 * @param {Object} i - Objeto do suplemento
 * @returns {number|null}
 */
export function pdose(i) {
  const p = bestMarketplacePrice(i);
  return i.doses && p ? Math.round((p / i.doses) * 100) / 100 : null;
}

/**
 * Calcula a dosagem clínica recomendada (manutenção ou carga) baseada no peso e nível de atividade.
 * @param {Object} supplement - Objeto do suplemento.
 * @param {number} weight - Peso do indivíduo (kg).
 * @param {string} activityLevel - Nível de atividade ('Sedentário' | 'Leve' | 'Moderado' | 'Intenso').
 * @param {string} [mode='maintenance'] - Modo de dosagem ('maintenance' | 'load').
 * @returns {number} Dosagem ideal recomendada (arredondada para 1 casa decimal).
 */
export function calculateDosage(supplement, weight, activityLevel, mode = 'maintenance') {
  if (!supplement) return 0;
  
  // Extrai parâmetros do suplemento com fallbacks seguros baseados no defaultDose
  const dosageMaintenanceBase = supplement.dosageMaintenanceBase || supplement.defaultDose || 5;
  const dosageLoadBase = supplement.dosageLoadBase || (dosageMaintenanceBase * 4) || 20;
  const dosageSafetyMax = supplement.dosageSafetyMax || (dosageMaintenanceBase * 5) || 25;
  
  const baseDose = mode === 'maintenance' ? dosageMaintenanceBase : dosageLoadBase;
  const weightFactor = weight / 70;
  
  const ACTIVITY_LEVELS = {
    'Sedentário': 0.8,
    'Leve': 1.0,
    'Moderado': 1.2,
    'Intenso': 1.5
  };
  
  const activityFactor = ACTIVITY_LEVELS[activityLevel] || 1.2; // default Moderado
  let finalDose = baseDose * weightFactor * activityFactor;
  
  if (finalDose > dosageSafetyMax) {
    finalDose = dosageSafetyMax;
  }
  
  return Math.round(finalDose * 10) / 10;
}
