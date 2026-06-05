export interface StackItem {
  userId: string;
  supplementId: string;   // natural key — the supplement's catalog ID
  name: string;
  dosage: {
    amount: number;
    unit: string;         // 'g' | 'mg' | 'ml' | 'caps'
    frequency: string;    // 'daily' | 'pre-workout' | etc
    times: number;        // times per day
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StackItemDTO {
  userId: string;
  supplementId: string;
  name: string;
  dosage: {
    amount: number;
    unit: string;
    frequency: string;
    times: number;
  };
  createdAt: string;
  updatedAt: string;
}

export class StackItemMapper {
  static toDTO(item: StackItem): StackItemDTO {
    return {
      userId: item.userId,
      supplementId: item.supplementId,
      name: item.name,
      dosage: {
        amount: item.dosage.amount,
        unit: item.dosage.unit,
        frequency: item.dosage.frequency,
        times: item.dosage.times,
      },
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
