import mongoose from 'mongoose';
import { UserConsent } from '../../domain/user-settings.entity.js';
import { IUserConsentRepository } from '../../repositories/user-consent.repository.js';
import { UserConsentModel, IUserConsentDocument } from './user-consent.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseUserConsentRepository implements IUserConsentRepository {
  private mapToDomain(doc: IUserConsentDocument): UserConsent {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      version: doc.version,
      documentHash: doc.documentHash,
      action: doc.action,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      timestamp: doc.timestamp,
    };
  }

  async save(consent: UserConsent): Promise<UserConsent> {
    const session = transactionStorage.getStore();
    
    // We enforce APPEND-ONLY behavior.
    // We only perform insertOne operations here, never updateOne or findOneAndUpdate.
    const created = new UserConsentModel({
      userId: mongoose.Types.ObjectId.isValid(consent.userId)
        ? new mongoose.Types.ObjectId(consent.userId)
        : consent.userId, // supports string hashes after anonymization
      type: consent.type,
      version: consent.version,
      documentHash: consent.documentHash,
      action: consent.action,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
      timestamp: consent.timestamp,
    });

    const doc = await created.save({ session });
    return this.mapToDomain(doc);
  }

  async findHistoryByUserId(userId: string): Promise<UserConsent[]> {
    const session = transactionStorage.getStore();
    
    let queryUserId: any = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      queryUserId = new mongoose.Types.ObjectId(userId);
    }

    const docs = await UserConsentModel.find({ userId: queryUserId })
      .sort({ timestamp: -1 })
      .session(session || null);

    return docs.map(doc => this.mapToDomain(doc));
  }

  async anonymizeByUserId(userId: string, anonymousId: string): Promise<void> {
    const session = transactionStorage.getStore();
    const queryUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const query: any = {
      $or: [
        { userId: queryUserId }
      ]
    };
    if (typeof queryUserId !== 'string') {
      query.$or.push({ userId: userId.toString() });
    }

    await UserConsentModel.updateMany(
      query,
      { $set: { userId: anonymousId } }
    ).session(session || null);
  }
}
export default MongooseUserConsentRepository;
