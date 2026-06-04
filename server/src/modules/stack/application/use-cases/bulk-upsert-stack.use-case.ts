import { z } from 'zod';
import { IStackRepository } from '../../repositories/stack.repository.js';
import { StackItem } from '../../domain/stack-item.entity.js';

const stackItemInputSchema = z.object({
  supplementId: z.string().min(1, 'supplementId is required'),
  name: z.string().min(1, 'name is required'),
  dosage: z.object({
    amount: z.number().positive('amount must be positive'),
    unit: z.enum(['g', 'mg', 'ml', 'caps']),
    frequency: z.string().min(1, 'frequency is required'),
    times: z.number().int().positive('times must be a positive integer'),
  }),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

const bulkUpsertInputSchema = z.array(stackItemInputSchema).min(1).max(100);

export type BulkUpsertInput = z.infer<typeof bulkUpsertInputSchema>;

export class BulkUpsertStackUseCase {
  constructor(private stackRepo: IStackRepository) {}

  async execute(userId: string, input: unknown): Promise<{ upserted: number; modified: number; total: number }> {
    const validatedItems = bulkUpsertInputSchema.parse(input);

    const domainItems: StackItem[] = validatedItems.map(item => ({
      userId,
      supplementId: item.supplementId,
      name: item.name,
      dosage: {
        amount: item.dosage.amount,
        unit: item.dosage.unit,
        frequency: item.dosage.frequency,
        times: item.dosage.times,
      },
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
    }));

    const result = await this.stackRepo.bulkUpsert(userId, domainItems);

    return {
      upserted: result.upsertedCount ?? result.upserted,
      modified: result.modifiedCount ?? result.modified,
      total: validatedItems.length,
    };
  }
}
export default BulkUpsertStackUseCase;
