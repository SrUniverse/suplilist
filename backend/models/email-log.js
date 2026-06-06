/**
 * Email Log Schema — Track all emails sent via Resend
 */

import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  to: {
    type: String,
    required: true,
    index: true
  },

  subject: {
    type: String,
    required: true
  },

  messageId: {
    type: String,
    index: true,
    sparse: true
  },

  status: {
    type: String,
    enum: ['sent', 'failed', 'bounced', 'complained'],
    default: 'sent',
    index: true
  },

  error: {
    type: String,
    sparse: true
  },

  provider: {
    type: String,
    default: 'resend',
    enum: ['resend', 'sendgrid', 'mailgun', 'aws-ses']
  },

  emailType: {
    type: String,
    enum: ['monthly-report', 'reminder', 'onboarding', 'promotional', 'transactional'],
    sparse: true
  },

  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  openedAt: {
    type: Date,
    sparse: true
  },

  clickedAt: {
    type: Date,
    sparse: true
  },

  metadata: {
    type: Map,
    of: String,
    sparse: true
  }

}, {
  timestamps: true,
  collection: 'email_logs'
});

// Index for finding emails from last 30 days
emailLogSchema.index({ userId: 1, sentAt: -1 });

// Index for tracking bounces by email address
emailLogSchema.index({ to: 1, status: 1 });

// TTL index: automatically delete logs after 90 days
emailLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);

export default EmailLog;
