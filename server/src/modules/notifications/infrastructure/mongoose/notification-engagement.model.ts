import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationEngagement extends Document<string> {
  _id: string;
  userId: string;
  notificationScheduleId: string;
  action: 'sent' | 'opened' | 'clicked' | 'ignored';
  timestamp: Date;
  createdAt: Date;
}

const notificationEngagementSchema = new Schema<INotificationEngagement>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  notificationScheduleId: { type: String, required: true, index: true },
  action: { type: String, enum: ['sent', 'opened', 'clicked', 'ignored'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
}, { collection: 'notification_engagements' });

export const NotificationEngagementModel = mongoose.model<INotificationEngagement>(
  'NotificationEngagement',
  notificationEngagementSchema
);
