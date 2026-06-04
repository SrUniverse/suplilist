export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type FrequencyType = 'daily' | 'weekly' | 'custom';

export interface StackItemDTO {
  id: string;
  supplementId: string;
  dose: number;
  frequency: FrequencyType;
  timeOfDay: TimeOfDay;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStackItemRequestDTO {
  supplementId: string;
  dose: number;
  frequency: FrequencyType;
  timeOfDay: TimeOfDay;
  notes?: string | null;
}

export interface UpdateStackItemRequestDTO {
  dose?: number;
  frequency?: FrequencyType;
  timeOfDay?: TimeOfDay;
  notes?: string | null;
}
