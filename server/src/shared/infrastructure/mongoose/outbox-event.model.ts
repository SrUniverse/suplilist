import mongoose, { Document, Schema } from 'mongoose';

export interface IOutboxEventDocument extends Document {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  attempts: number;
  errorReason: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

const outboxEventSchema = new Schema<IOutboxEventDocument>({
  aggregateType: {
    type: String,
    required: true,
  },
  aggregateId: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  payload: {
    type: Schema.Types.Map,
    of: Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    required: true,
  },
  errorReason: {
    type: String,
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'outbox_events',
});

// Indexes for high performance queue query
outboxEventSchema.index({ status: 1, createdAt: 1 });

export const OutboxEventModel = mongoose.model<IOutboxEventDocument>('OutboxEvent', outboxEventSchema);
export default OutboxEventModel;
