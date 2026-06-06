/**
 * User Profile Schema — Extended user data with photo
 */

import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },

  photo: {
    // URL da foto (cloud storage: S3, Cloudinary, etc)
    url: {
      type: String,
      sparse: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // optional
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Photo must be a valid HTTPS URL'
      }
    },

    // Metadata
    publicId: {
      type: String,
      sparse: true
    },

    // Local fallback (base64 for small photos)
    base64: {
      type: String,
      sparse: true,
      maxlength: 5242880 // 5MB
    },

    uploadedAt: {
      type: Date,
      sparse: true
    },

    size: {
      type: Number,
      sparse: true // bytes
    },

    mimetype: {
      type: String,
      sparse: true
    }
  },

  bio: {
    type: String,
    maxlength: 500,
    sparse: true
  },

  phone: {
    type: String,
    sparse: true
  },

  onboardingComplete: {
    type: Boolean,
    default: false
  },

  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    reportFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  collection: 'user_profiles',
  timestamps: true
});

// Index for quick lookups
userProfileSchema.index({ userId: 1, updatedAt: -1 });

// Pre-save middleware to update timestamp
userProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
