import { AuditLog } from '../domain/audit-log.entity.js';

export interface IAuditLogRepository {
  /**
   * Appends an audit log entry.
   * Updates/deletions are prohibited (immutable collection).
   */
  save(log: AuditLog): Promise<AuditLog>;

  /**
   * Retrieves a paginated history of audit logs for a specific user.
   * Employs cursor-based pagination (using the unique ObjectId string of the log).
   */
  findHistoryByUserId(userId: string, cursor: string | null, limit: number): Promise<{ logs: AuditLog[]; nextCursor: string | null }>;

  /**
   * Retrieves a paginated global log list for admin reviews.
   */
  findGlobalHistory(cursor: string | null, limit: number, filterEvent?: string): Promise<{ logs: AuditLog[]; nextCursor: string | null }>;

  /**
   * Anonymizes all audit logs for a user by replacing their userId with an anonymous ID (UUID/hash).
   * Idempotent operation.
   */
  anonymizeByUserId(userId: string, anonymousId: string): Promise<void>;
}
