/**
 * Contrato de wire para o módulo da Calculadora de Dosagem (Dosage Optimizer).
 * Estas são as estruturas de dados retornadas pelo motor de regras.
 */

/** Status da recomendação avaliada pelo sistema */
export type DosageStatus = 'optimal' | 'too_high' | 'too_low';

/** Recomendação gerada para um dado suplemento baseado no perfil biométrico */
export interface DosageRecommendation {
  /** A dose atualmente tomada pelo usuário */
  actual: number;
  /** A dose recomendada calculada pelo sistema */
  recommended: number;
  /** O status indicativo se está ótimo, alto ou baixo */
  status: DosageStatus;
  /** A mensagem amigável a ser exibida para o usuário */
  message: string;
}
