import mongoose, { Document, Schema } from 'mongoose';
import { ConsentType, ConsentAction } from '../../domain/user-settings.entity.js';

export interface IUserConsentDocument extends Document {
  userId: mongoose.Types.ObjectId | string;
  type: ConsentType;
  version: string;
  documentHash: string;
  action: ConsentAction;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const userConsentSchema = new Schema<IUserConsentDocument>({
  userId: {
    // Mixed type to support ObjectId during user lifecycle 
    // and SHA-256 string hash after 30-day anonymization purge
    type: Schema.Types.Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: ['privacy_policy', 'terms_of_service', 'marketing_emails'],
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  documentHash: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['granted', 'revoked'],
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  }
}, {
  // Disable timestamps as we explicitly use timestamp field and it is append-only
  timestamps: false, 
  collection: 'users_consents'
});

// Indices
userConsentSchema.index({ userId: 1, type: 1, timestamp: -1 });

export const UserConsentModel = mongoose.model<IUserConsentDocument>('UserConsent', userConsentSchema);
export default UserConsentModel;
