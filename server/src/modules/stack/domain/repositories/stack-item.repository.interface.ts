import { StackItem } from '../entities/stack-item.entity.js';

export interface IStackItemRepository {
  findByUserId(userId: string): Promise<StackItem[]>;
  findByIdAndUserId(id: string, userId: string): Promise<StackItem | null>;
  save(item: StackItem): Promise<StackItem>;
  updateWithConcurrency(id: string, userId: string, expectedVersion: number, updates: Partial<StackItem>): Promise<StackItem | null>;
  remove(id: string, userId: string): Promise<boolean>;
}
