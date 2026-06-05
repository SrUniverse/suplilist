import { z } from 'zod';
import { IFavoritesRepository } from '../../repositories/favorites.repository.js';
import { BulkSetResult } from '../../domain/favorite.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const bulkSetFavoritesInputSchema = z.object({
  supplementIds: z.array(z.string()).max(500, 'Cannot exceed 500 favorites'),
});

export type BulkSetFavoritesInput = z.infer<typeof bulkSetFavoritesInputSchema>;

export class BulkSetFavoritesUseCase {
  constructor(
    private favoritesRepo: IFavoritesRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(userId: string, input: unknown): Promise<BulkSetResult> {
    const validatedInput = bulkSetFavoritesInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      return this.favoritesRepo.bulkSet(userId, validatedInput.supplementIds);
    });
  }
}
export default BulkSetFavoritesUseCase;
