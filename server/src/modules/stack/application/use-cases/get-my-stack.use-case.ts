import { IStackItemRepository } from '../../domain/repositories/stack-item.repository.interface.js';
import { StackItemDTO } from '@suplilist/shared';

export class GetMyStackUseCase {
  constructor(private stackRepo: IStackItemRepository) {}

  async execute(userId: string): Promise<StackItemDTO[]> {
    const items = await this.stackRepo.findByUserId(userId);
    
    return items.map(item => ({
      id: item.id,
      supplementId: item.supplementId,
      dose: item.dose,
      frequency: item.frequency,
      timeOfDay: item.timeOfDay,
      notes: item.notes,
      version: item.version,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }
}
export default GetMyStackUseCase;
