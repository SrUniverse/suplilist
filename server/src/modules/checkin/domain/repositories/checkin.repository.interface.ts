import { Checkin } from '../entities/checkin.entity.js';

export interface ICheckinRepository {
  findPaginated(userId: string, before: Date, limit: number): Promise<Checkin[]>;
  upsertIdempotent(userId: string, data: any): Promise<{ data: Checkin; isDuplicate: boolean }>;
}
