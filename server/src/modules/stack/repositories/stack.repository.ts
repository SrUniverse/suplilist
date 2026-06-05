import { StackItem } from '../domain/stack-item.entity.js';

export interface IStackRepository {
  bulkUpsert(userId: string, items: StackItem[]): Promise<{ upserted: number; modified: number }>;
  findAllByUserId(userId: string): Promise<StackItem[]>;
  deleteByUserId(userId: string): Promise<void>;
}
