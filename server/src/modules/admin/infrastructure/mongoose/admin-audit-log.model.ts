import mongoose, { Document, Schema } from 'mongoose';

/**
 * Admin audit log — an append-only record of privileged actions (who did what,
 * to which target, when). Written by recordAudit() from admin/catalog mutations
 * and surfaced read-only on the admin dashboard for traceability.
 */
export interface IAdminAuditLog extends Document {
  actorId: string;
  actorEmail: string | null;
  action: string;        // e.g. 'supplement.create', 'user.role.update'
  targetType: string;    // e.g. 'supplement', 'user'
  targetId: string | null;
  metadata?: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'admin_audit_logs' }
);

adminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLogModel = mongoose.model<IAdminAuditLog>(
  'AdminAuditLog',
  adminAuditLogSchema
);
