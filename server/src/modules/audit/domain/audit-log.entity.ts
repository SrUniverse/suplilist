export interface AuditLog {
  id: string;
  userId: string | null; // null if unauthenticated login failure
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
