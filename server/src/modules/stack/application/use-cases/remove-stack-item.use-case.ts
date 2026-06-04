import { IStackItemRepository } from '../../domain/repositories/stack-item.repository.interface.js';

export interface RemoveStackItemInput {
  userId: string;
  itemId: string;
}

export class RemoveStackItemUseCase {
  constructor(private stackRepo: IStackItemRepository) {}

  async execute(input: RemoveStackItemInput): Promise<void> {
    const { userId, itemId } = input;

    const removed = await this.stackRepo.remove(itemId, userId);
    
    if (!removed) {
      throw new Error('item_not_found');
    }
  }
}
export default RemoveStackItemUseCase;
