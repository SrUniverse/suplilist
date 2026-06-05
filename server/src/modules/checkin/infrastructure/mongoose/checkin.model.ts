import mongoose, { Document, Schema } from 'mongoose';

export interface ICheckinDocument extends Document<string> {
  _id: string; // Override ObjectId with UUIDv4 String
  userId: string;
  supplementId: string;
  clientId?: string; // Offline-first idempotency key
  dose: number;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkinSchema = new Schema<ICheckinDocument>({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  supplementId: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
    required: false,
    index: true, // often queried to avoid duplicates
  },
  dose: {
    type: Number,
    required: true,
  },
  checkedAt: {
    type: Date,
    required: true,
    index: true,
  }
}, {
  timestamps: true,
  collection: 'checkins',
});

// For cursor pagination
checkinSchema.index({ userId: 1, checkedAt: -1 });

export const CheckinModel = mongoose.model<ICheckinDocument>('Checkin', checkinSchema);
export default CheckinModel;
