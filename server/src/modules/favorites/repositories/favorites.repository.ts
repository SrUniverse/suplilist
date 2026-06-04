import { ClientSession } from 'mongoose';
import { Favorite, BulkSetResult } from '../domain/favorite.entity.js';

export interface IFavoritesRepository {
  bulkSet(userId: string, supplementIds: string[], session?: ClientSession): Promise<BulkSetResult>;
  findAllByUserId(userId: string): Promise<Favorite[]>;
  deleteByUserId(userId: string): Promise<void>;
}
