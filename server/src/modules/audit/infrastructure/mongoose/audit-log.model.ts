import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLogDocument extends Document {
  userId: mongoose.Types.ObjectId | string | null; // Supports string hash after purge anonymization
  event: string;
  outcome: 'success' | 'failure';
  failureReason: string | null;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string | null;
  country: string | null;
  meta: Record<string, any> | null;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>({
  userId: {
    type: Schema.Types.Mixed, // Supports ObjectId (live) and String (anonymized UUID/null)
    default: null,
  },
  event: {
    type: String,
    required: true,
  },
  outcome: {
    type: String,
    enum: ['success', 'failure'],
    required: true,
  },
  failureReason: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  deviceLabel: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  meta: {
    type: Schema.Types.Map,
    of: Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  }
}, {
  timestamps: false, // Disable default createdAt/updatedAt as we use explicit timestamp
  collection: 'audit_logs',
});

// Indexes for high performance query execution (No Collection Scans)
// Primary: userId + createdAt for audit log queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
// Secondary: event type filtering
auditLogSchema.index({ event: 1, timestamp: -1 });
// Tertiary: userId + event compound for filtering by user action
auditLogSchema.index({ userId: 1, event: 1, timestamp: -1 });
// Legacy indexes kept for backward compatibility
auditLogSchema.index({ userId: 1, _id: -1 });
auditLogSchema.index({ event: 1, _id: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
export default AuditLogModel;
