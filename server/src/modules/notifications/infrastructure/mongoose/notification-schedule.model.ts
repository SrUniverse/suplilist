import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationSchedule extends Document<string> {
  _id: string;
  userId: string;
  type: 'daily' | 'streak' | 'milestones' | 'comeback' | 'social';
  scheduledTime: Date;
  sent: boolean;
  sentAt?: Date;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationScheduleSchema = new Schema<INotificationSchedule>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['daily', 'streak', 'milestones', 'comeback', 'social'], required: true },
  scheduledTime: { type: Date, required: true, index: true },
  sent: { type: Boolean, default: false },
  sentAt: { type: Date, default: null },
  message: { type: String, required: true },
}, { timestamps: true, collection: 'notification_schedules' });

export const NotificationScheduleModel = mongoose.model<INotificationSchedule>(
  'NotificationSchedule',
  notificationScheduleSchema
);
