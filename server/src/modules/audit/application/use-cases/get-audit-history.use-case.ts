import { z } from 'zod';
import { IAuditLogRepository } from '../../repositories/audit-log.repository.js';
import { AuditLog } from '../../domain/audit-log.entity.js';

const getAuditHistorySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type GetAuditHistoryInput = z.infer<typeof getAuditHistorySchema>;

export class GetAuditHistoryUseCase {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  async execute(input: GetAuditHistoryInput): Promise<{ logs: AuditLog[]; nextCursor: string | null }> {
    const validated = getAuditHistorySchema.parse(input);
    
    // We enforce cursor query directly in the repository.
    return this.auditLogRepo.findHistoryByUserId(
      validated.userId,
      validated.cursor || null,
      validated.limit
    );
  }
}
export default GetAuditHistoryUseCase;
