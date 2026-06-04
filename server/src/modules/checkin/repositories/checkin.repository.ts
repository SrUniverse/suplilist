import { Checkin, BulkInsertResult } from '../domain/checkin.entity.js';

export interface ICheckinRepository {
  bulkInsert(userId: string, entries: Checkin[]): Promise<BulkInsertResult>;
  findAllByUserId(userId: string): Promise<Checkin[]>;
  deleteByUserId(userId: string): Promise<void>;
}
