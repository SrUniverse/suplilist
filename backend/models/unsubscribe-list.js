/**
 * Unsubscribe List Schema — GDPR compliance
 * Tracks emails that have unsubscribed from reminders
 */

import mongoose from 'mongoose';

const unsubscribeListSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },

  unsubscribedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  reason: {
    type: String,
    enum: ['user-request', 'bounce', 'complaint', 'admin'],
    default: 'user-request'
  },

  unsubscribeType: {
    type: String,
    enum: ['all', 'monthly-report', 'reminders', 'promotional'],
    default: 'all'
  },

  resubscribedAt: {
    type: Date,
    sparse: true
  },

  emailFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'never'],
    default: 'monthly'
  },

  source: {
    type: String,
    enum: ['ui-button', 'email-link', 'api', 'bounce-handling'],
    default: 'ui-button'
  }

}, {
  timestamps: true,
  collection: 'unsubscribe_list'
});

// Index for finding unsubscribed emails quickly
unsubscribeListSchema.index({ email: 1, unsubscribedAt: -1 });

// Index for finding resubscribed users
unsubscribeListSchema.index({ resubscribedAt: 1 }, { sparse: true });

export const UnsubscribeList = mongoose.model('UnsubscribeList', unsubscribeListSchema);

export default UnsubscribeList;
