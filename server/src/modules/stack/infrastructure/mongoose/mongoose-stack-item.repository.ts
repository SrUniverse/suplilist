import { IStackItemRepository } from '../../domain/repositories/stack-item.repository.interface.js';
import { StackItem } from '../../domain/entities/stack-item.entity.js';
import { StackItemModel, IStackItemDocument } from './stack-item.model.js';

export class MongooseStackItemRepository implements IStackItemRepository {
  private mapToDomain(doc: IStackItemDocument): StackItem {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      supplementId: doc.supplementId,
      dose: doc.dose,
      frequency: doc.frequency,
      timeOfDay: doc.timeOfDay,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      version: doc.get('__v') as number ?? 0,
    };
  }

  async findByUserId(userId: string): Promise<StackItem[]> {
    const docs = await StackItemModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map(doc => this.mapToDomain(doc));
  }

  async findByIdAndUserId(id: string, userId: string): Promise<StackItem | null> {
    const doc = await StackItemModel.findOne({ _id: id, userId });
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(item: StackItem): Promise<StackItem> {
    const newDoc = new StackItemModel({
      userId: item.userId,
      supplementId: item.supplementId,
      dose: item.dose,
      frequency: item.frequency,
      timeOfDay: item.timeOfDay,
      notes: item.notes,
    });
    
    // Attempting to catch the 11000 duplicate key error and rethrow as domain error if necessary
    try {
      const savedDoc = await newDoc.save();
      return this.mapToDomain(savedDoc);
    } catch (err: any) {
      if (err.code === 11000) {
        throw new Error('duplicate_stack_item');
      }
      throw err;
    }
  }

  async updateWithConcurrency(id: string, userId: string, expectedVersion: number, updates: Partial<StackItem>): Promise<StackItem | null> {
    const doc = await StackItemModel.findOneAndUpdate(
      { _id: id, userId, __v: expectedVersion },
      { 
        $set: { ...updates },
        $inc: { __v: 1 }
      },
      { new: true }
    );
    return doc ? this.mapToDomain(doc) : null;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await StackItemModel.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }

  async bulkUpsert(userId: string, items: any[]): Promise<{ upserted: number, modified: number }> {
    if (!items || items.length === 0) return { upserted: 0, modified: 0 };
    
    const bulkOps = items.map(item => {
      // Determine dose value considering the legacy 'dosage' object format vs number
      let doseVal = item.dose ?? 0;
      if (item.dosage !== undefined) {
        if (typeof item.dosage === 'number') {
          doseVal = item.dosage;
        } else if (typeof item.dosage === 'object' && item.dosage !== null) {
          doseVal = item.dosage.amount ?? 0;
        }
      }

      return {
        updateOne: {
          filter: { userId, supplementId: item.supplementId },
          update: {
            $set: {
              userId,
              supplementId: item.supplementId,
              dose: doseVal,
              frequency: item.frequency === 'weekly' || item.frequency === 'custom' ? item.frequency : 'daily',
              timeOfDay: item.timeOfDay || 'anytime',
              notes: item.notes || item.name || null, // save name in notes if available for backward compat
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date(),
              __v: 0
            }
          },
          upsert: true
        }
      };
    });

    const result = await StackItemModel.bulkWrite(bulkOps, { ordered: false });
    return {
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0
    };
  }
}
