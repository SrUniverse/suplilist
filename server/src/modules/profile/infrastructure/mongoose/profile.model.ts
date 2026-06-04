import mongoose, { Document, Schema } from 'mongoose';
import { AvatarStatus } from '../../domain/entities/profile.entity.js';

export interface IProfileDocument extends Document {
  // `_id` will implicitly act as userId since it's 1-1 with UserIdentity
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  onboardingState: 'pending' | 'completed';
  goals: string[];
  biometrics?: {
    weight?: number;
    biologicalSex?: 'male' | 'female';
  };
  migrationVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  // Mongoose injects __v automatically for OCC
}

const profileSchema = new Schema<IProfileDocument>({
  userId: {
    type: String,
    required: true,
    unique: true, // Guarantees 1-1 relationship
  },
  firstName: {
    type: String,
    default: null,
  },
  lastName: {
    type: String,
    default: null,
  },
  displayName: {
    type: String,
    required: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  avatarStatus: {
    type: String,
    enum: ['none', 'pending_moderation', 'approved', 'rejected'],
    default: 'none',
  },
  onboardingState: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  goals: {
    type: [String],
    default: [],
  },
  biometrics: {
    weight: { type: Number, required: false },
    biologicalSex: { type: String, enum: ['male', 'female'], required: false }
  },
  migrationVersion: {
    type: Number,
    required: false,
  }
}, {
  timestamps: true,
  collection: 'profiles',
  optimisticConcurrency: true, // Enforces __v checks on save()
});

export const ProfileModel = mongoose.model<IProfileDocument>('Profile', profileSchema);
export default ProfileModel;
