import { IStackItemRepository } from '../../domain/repositories/stack-item.repository.interface.js';

export class BulkSetStackUseCase {
  constructor(private stackRepo: IStackItemRepository) {}

  async execute(userId: string, items: any[]): Promise<{ upserted: number, modified: number }> {
    return this.stackRepo.bulkUpsert(userId, items);
  }
}
export default BulkSetStackUseCase;
