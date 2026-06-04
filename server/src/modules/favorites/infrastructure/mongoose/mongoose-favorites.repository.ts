import mongoose, { ClientSession } from 'mongoose';
import { Favorite, BulkSetResult } from '../../domain/favorite.entity.js';
import { IFavoritesRepository } from '../../repositories/favorites.repository.js';
import { FavoriteModel, IFavoriteDocument } from './favorite.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseFavoritesRepository implements IFavoritesRepository {
  private mapToDomain(doc: IFavoriteDocument): Favorite {
    return {
      userId: doc.userId.toString(),
      supplementId: doc.supplementId,
      createdAt: doc.createdAt,
    };
  }

  async bulkSet(userId: string, supplementIds: string[], clientSession?: ClientSession): Promise<BulkSetResult> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('invalid_user_id');
    }
    const session = clientSession ?? transactionStorage.getStore();

    // Step 1: Delete all existing favorites for this user
    await FavoriteModel.deleteMany({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);

    // Step 2: Insert the new list (if non-empty)
    if (supplementIds.length === 0) {
      return { replaced: 0 };
    }

    const docs = supplementIds.map(supplementId => ({
      userId: new mongoose.Types.ObjectId(userId),
      supplementId,
    }));

    await FavoriteModel.insertMany(docs, { session });

    return { replaced: supplementIds.length };
  }

  async findAllByUserId(userId: string): Promise<Favorite[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    const session = transactionStorage.getStore();

    const docs = await FavoriteModel.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    })
    .session(session || null)
    .sort({ createdAt: -1 });

    return docs.map(doc => this.mapToDomain(doc));
  }

  async deleteByUserId(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    const session = transactionStorage.getStore();

    await FavoriteModel.deleteMany({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
  }
}
