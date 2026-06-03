export type SupplementObjective =
  | 'bulk'
  | 'cut'
  | 'performance'
  | 'health'
  | 'cognitive'
  | 'sleep'
  | 'hormonal';

export type EvidenceTier = 'A' | 'B' | 'C' | 'D';

export interface SupplementDTO {
  id: string;
  name: string;
  category: string;
  objectives: SupplementObjective[];
  evidenceTier: EvidenceTier;
  dosage: {
    min: number;
    max: number;
    unit: string;
  };
  pricePerMonth: number;
}
