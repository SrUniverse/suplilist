import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationPreference extends Document<string> {
  _id: string;
  userId: string;
  enabled: boolean;
  optimalTime: string; // HH:mm format
  notificationTypes: {
    daily: boolean;
    streak: boolean;
    milestones: boolean;
    comeback: boolean;
    social: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: true },
  optimalTime: { type: String, default: '08:00' },
  notificationTypes: {
    daily: { type: Boolean, default: true },
    streak: { type: Boolean, default: true },
    milestones: { type: Boolean, default: true },
    comeback: { type: Boolean, default: true },
    social: { type: Boolean, default: false },
  },
}, { timestamps: true, collection: 'notification_preferences' });

export const NotificationPreferenceModel = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema
);
