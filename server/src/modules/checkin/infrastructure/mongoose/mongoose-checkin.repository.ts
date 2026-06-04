import { ICheckinRepository } from '../../domain/repositories/checkin.repository.interface.js';
import { Checkin } from '../../domain/entities/checkin.entity.js';
import { CheckinModel, ICheckinDocument } from './checkin.model.js';

export class MongooseCheckinRepository implements ICheckinRepository {
  private mapToDomain(doc: ICheckinDocument): Checkin {
    return {
      id: doc._id,
      userId: doc.userId,
      supplementId: doc.supplementId,
      dose: doc.dose,
      checkedAt: doc.checkedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findPaginated(userId: string, before: Date, limit: number): Promise<Checkin[]> {
    const docs = await CheckinModel.find({
      userId,
      checkedAt: { $lt: before }
    })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .exec();

    return docs.map(doc => this.mapToDomain(doc));
  }

  async upsertIdempotent(userId: string, data: any): Promise<{ data: Checkin; isDuplicate: boolean }> {
    const result = await CheckinModel.updateOne(
      { _id: data.id },
      {
        $setOnInsert: {
          userId,
          supplementId: data.supplementId,
          dose: data.dose,
          checkedAt: new Date(data.checkedAt)
        }
      },
      { upsert: true }
    );

    const document = await CheckinModel.findById(data.id).exec();
    if (!document) throw new Error('Critical failure on Check-in Upsert.');

    return {
      data: this.mapToDomain(document),
      isDuplicate: result.matchedCount > 0 // If matched, it's a sync queue retry
    };
  }
}
