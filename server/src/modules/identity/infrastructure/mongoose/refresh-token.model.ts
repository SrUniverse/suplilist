import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  family: string;
  replacedBy: mongoose.Types.ObjectId | null;
  userAgent: string;
  ipAddress: string;
  deviceLabel: string | null;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserIdentity',
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  family: {
    type: String,
    required: true,
  },
  replacedBy: {
    type: Schema.Types.ObjectId,
    ref: 'RefreshToken',
    default: null,
  },
  userAgent: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  deviceLabel: {
    type: String,
    default: null,
  },
  issuedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
  collection: 'refresh_tokens'
});

// Indices
refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ family: 1 });

// TTL index for automatic cleanup
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);
export default RefreshTokenModel;
