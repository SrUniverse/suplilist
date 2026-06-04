import mongoose, { Document, Schema } from 'mongoose';

export interface ICheckinDocument extends Document {
  _id: string; // Override ObjectId with UUIDv4 String
  userId: string;
  supplementId: string;
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
