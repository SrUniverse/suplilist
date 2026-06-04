import mongoose from 'mongoose';
import { RefreshToken } from '../../domain/refresh-token.entity.js';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { RefreshTokenModel, IRefreshTokenDocument } from './refresh-token.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseRefreshTokenRepository implements IRefreshTokenRepository {
  private mapToDomain(doc: IRefreshTokenDocument): RefreshToken {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      family: doc.family,
      replacedBy: doc.replacedBy ? doc.replacedBy.toString() : null,
      userAgent: doc.userAgent,
      ipAddress: doc.ipAddress,
      deviceLabel: doc.deviceLabel,
      issuedAt: doc.issuedAt,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<RefreshToken | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const session = transactionStorage.getStore();
    const doc = await RefreshTokenModel.findById(id).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const session = transactionStorage.getStore();
    const doc = await RefreshTokenModel.findOne({ tokenHash }).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    const session = transactionStorage.getStore();
    const docs = await RefreshTokenModel.find({ userId: new mongoose.Types.ObjectId(userId) }).session(session || null);
    return docs.map(doc => this.mapToDomain(doc));
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    const session = transactionStorage.getStore();
    let doc: IRefreshTokenDocument | null = null;

    if (token.id && mongoose.Types.ObjectId.isValid(token.id)) {
      doc = await RefreshTokenModel.findById(token.id).session(session || null);
    }

    if (doc) {
      doc.tokenHash = token.tokenHash;
      doc.family = token.family;
      doc.replacedBy = token.replacedBy ? new mongoose.Types.ObjectId(token.replacedBy) : null;
      doc.userAgent = token.userAgent;
      doc.ipAddress = token.ipAddress;
      doc.deviceLabel = token.deviceLabel;
      doc.expiresAt = token.expiresAt;
      doc.revokedAt = token.revokedAt;
      
      await doc.save({ session });
    } else {
      const created = new RefreshTokenModel({
        _id: token.id ? new mongoose.Types.ObjectId(token.id) : undefined,
        userId: new mongoose.Types.ObjectId(token.userId),
        tokenHash: token.tokenHash,
        family: token.family,
        replacedBy: token.replacedBy ? new mongoose.Types.ObjectId(token.replacedBy) : null,
        userAgent: token.userAgent,
        ipAddress: token.ipAddress,
        deviceLabel: token.deviceLabel,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
      });
      doc = await created.save({ session });
    }

    return this.mapToDomain(doc);
  }

  async revokeFamily(family: string): Promise<void> {
    const session = transactionStorage.getStore();
    await RefreshTokenModel.updateMany(
      { family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { session }
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    const session = transactionStorage.getStore();
    await RefreshTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { session }
    );
  }
}
