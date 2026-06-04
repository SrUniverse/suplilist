import mongoose from 'mongoose';
import { StackItem } from '../../domain/stack-item.entity.js';
import { IStackRepository } from '../../repositories/stack.repository.js';
import { StackItemModel, IStackItemDocument } from './stack-item.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseStackRepository implements IStackRepository {
  private mapToDomain(doc: IStackItemDocument): StackItem {
    return {
      userId: doc.userId.toString(),
      supplementId: doc.supplementId,
      name: doc.name,
      dosage: {
        amount: doc.dosage.amount,
        unit: doc.dosage.unit,
        frequency: doc.dosage.frequency,
        times: doc.dosage.times,
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async bulkUpsert(userId: string, items: StackItem[]): Promise<{ upserted: number; modified: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('invalid_user_id');
    }
    const session = transactionStorage.getStore();
    
    if (items.length === 0) {
      return { upserted: 0, modified: 0 };
    }

    const ops = items.map(item => ({
      updateOne: {
        filter: { 
          userId: new mongoose.Types.ObjectId(userId), 
          supplementId: item.supplementId 
        },
        update: {
          $set: {
            name: item.name,
            dosage: item.dosage,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: item.createdAt ?? new Date(),
          }
        },
        upsert: true
      }
    }));

    const result = await StackItemModel.bulkWrite(ops, { ordered: false, session: session || undefined });
    return {
      upserted: result.upsertedCount,
      modified: result.modifiedCount
    };
  }

  async findAllByUserId(userId: string): Promise<StackItem[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    const session = transactionStorage.getStore();

    const docs = await StackItemModel.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    })
    .session(session || null)
    .sort({ createdAt: -1 });

    return docs.map(doc => this.mapToDomain(doc));
  }

  async deleteByUserId(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    const session = transactionStorage.getStore();

    await StackItemModel.deleteMany({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
  }
}
