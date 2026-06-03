import mongoose, { Document, Schema } from 'mongoose';
import { AvatarStatus } from '../../domain/user-profile.entity.js';

export interface IUserProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<IUserProfileDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserIdentity',
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true,
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
  // Defense-in-depth: private fields set to select: false.
  // Any default query will not load these fields from the database unless explicitly requested.
  firstName: {
    type: String,
    default: null,
    select: false,
    trim: true,
  },
  lastName: {
    type: String,
    default: null,
    select: false,
    trim: true,
  }
}, {
  timestamps: true,
  collection: 'users_profile'
});

// Indices
userProfileSchema.index({ userId: 1 });

export const UserProfileModel = mongoose.model<IUserProfileDocument>('UserProfile', userProfileSchema);
export default UserProfileModel;
