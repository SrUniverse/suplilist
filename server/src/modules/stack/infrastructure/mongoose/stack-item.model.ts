import mongoose, { Document, Schema } from 'mongoose';
import { TimeOfDay, FrequencyType } from '@suplilist/shared';

export interface IStackItemDocument extends Document {
  userId: string;
  supplementId: string;
  dose: number;
  frequency: FrequencyType;
  timeOfDay: TimeOfDay;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const stackItemSchema = new Schema<IStackItemDocument>({
  userId: {
    type: String,
    required: true,
  },
  supplementId: {
    type: String,
    required: true,
  },
  dose: {
    type: Number,
    required: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily',
    required: true,
  },
  timeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime',
    required: true,
  },
  notes: {
    type: String,
    default: null,
  }
}, {
  timestamps: true,
  collection: 'stack_items',
  optimisticConcurrency: true, // Guarantees __v increments
});

// Idempotency and fractionating constraint
stackItemSchema.index({ userId: 1, supplementId: 1, timeOfDay: 1 }, { unique: true });

export const StackItemModel = mongoose.model<IStackItemDocument>('StackItem', stackItemSchema);
export default StackItemModel;
