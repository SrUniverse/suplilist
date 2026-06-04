import { IStackItemRepository } from '../../domain/repositories/stack-item.repository.interface.js';
import { UpdateStackItemRequestDTO, StackItemDTO } from '@suplilist/shared';

export interface UpdateStackItemInput {
  userId: string;
  itemId: string;
  expectedVersion: number;
  data: UpdateStackItemRequestDTO;
}

export class UpdateStackItemUseCase {
  constructor(private stackRepo: IStackItemRepository) {}

  async execute(input: UpdateStackItemInput): Promise<StackItemDTO> {
    const { userId, itemId, expectedVersion, data } = input;

    const updatedItem = await this.stackRepo.updateWithConcurrency(itemId, userId, expectedVersion, data);
    
    if (!updatedItem) {
      // OCC Failed. Let's fetch the current state to return it in the error
      const currentItem = await this.stackRepo.findByIdAndUserId(itemId, userId);
      if (!currentItem) {
        throw new Error('item_not_found');
      }
      
      const error: any = new Error('precondition_failed');
      error.currentItem = {
        id: currentItem.id,
        supplementId: currentItem.supplementId,
        dose: currentItem.dose,
        frequency: currentItem.frequency,
        timeOfDay: currentItem.timeOfDay,
        notes: currentItem.notes,
        version: currentItem.version,
        createdAt: currentItem.createdAt.toISOString(),
        updatedAt: currentItem.updatedAt.toISOString(),
      };
      throw error;
    }

    return {
      id: updatedItem.id,
      supplementId: updatedItem.supplementId,
      dose: updatedItem.dose,
      frequency: updatedItem.frequency,
      timeOfDay: updatedItem.timeOfDay,
      notes: updatedItem.notes,
      version: updatedItem.version,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString(),
    };
  }
}
export default UpdateStackItemUseCase;
