import { TimeOfDay, FrequencyType } from '@suplilist/shared';

export interface StackItem {
  id: string; // Mongoose _id
  userId: string;
  supplementId: string;
  dose: number;
  frequency: FrequencyType;
  timeOfDay: TimeOfDay;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number; // __v for OCC
}
