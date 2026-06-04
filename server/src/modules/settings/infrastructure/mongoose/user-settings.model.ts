import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettingsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  notifications: {
    email: {
      transactional: boolean;
      security: boolean;
      marketing: boolean;
      productUpdates: boolean;
    };
    push: {
      enabled: boolean;
      marketing: boolean;
      reminders: boolean;
    };
  };
  locale: string;
  timezone: string;
  consents: {
    privacyPolicy: boolean;
    termsOfService: boolean;
    marketingEmails: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettingsDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserIdentity',
    required: true,
    unique: true,
  },
  notifications: {
    email: {
      transactional: { type: Boolean, default: true, required: true }, // hardcoded true
      security: { type: Boolean, default: true, required: true },      // hardcoded true
      marketing: { type: Boolean, default: false, required: true },
      productUpdates: { type: Boolean, default: true, required: true }
    },
    push: {
      enabled: { type: Boolean, default: true, required: true },
      marketing: { type: Boolean, default: false, required: true },
      reminders: { type: Boolean, default: true, required: true }
    }
  },
  locale: { type: String, default: 'pt-BR', required: true },
  timezone: { type: String, default: 'America/Sao_Paulo', required: true },
  consents: {
    privacyPolicy: { type: Boolean, default: false, required: true },
    termsOfService: { type: Boolean, default: false, required: true },
    marketingEmails: { type: Boolean, default: false, required: true }
  }
}, {
  timestamps: true,
  collection: 'users_settings'
});

// Indices
userSettingsSchema.index({ userId: 1 });

export const UserSettingsModel = mongoose.model<IUserSettingsDocument>('UserSettings', userSettingsSchema);
export default UserSettingsModel;
