import { z } from 'zod';
import { ICheckinRepository } from '../../repositories/checkin.repository.js';
import { Checkin, BulkInsertResult } from '../../domain/checkin.entity.js';

const checkinEntrySchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  supplementId: z.string().min(1, 'supplementId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  timestamp: z.number().int().positive('timestamp must be a positive integer'),
  note: z.string().max(500, 'note cannot exceed 500 characters').optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
});

const bulkInsertCheckinsInputSchema = z.object({
  entries: z.array(checkinEntrySchema).min(1).max(100),
});

export type BulkInsertCheckinsInput = z.infer<typeof bulkInsertCheckinsInputSchema>;

export class BulkInsertCheckinsUseCase {
  constructor(private checkinRepo: ICheckinRepository) {}

  async execute(userId: string, input: unknown): Promise<BulkInsertResult> {
    const validatedInput = bulkInsertCheckinsInputSchema.parse(input);

    const domainEntries: Checkin[] = validatedInput.entries.map(entry => ({
      userId,
      clientId: entry.clientId,
      supplementId: entry.supplementId,
      date: entry.date,
      timestamp: entry.timestamp,
      note: entry.note,
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    }));

    return this.checkinRepo.bulkInsert(userId, domainEntries);
  }
}
export default BulkInsertCheckinsUseCase;
