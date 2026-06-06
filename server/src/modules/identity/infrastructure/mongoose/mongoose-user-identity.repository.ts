import mongoose from 'mongoose';
import { UserIdentity } from '../../domain/user-identity.entity.js';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { UserIdentityModel, IUserIdentityDocument } from './user-identity.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseUserIdentityRepository implements IUserIdentityRepository {
  private mapToDomain(doc: IUserIdentityDocument): UserIdentity {
    return {
      id: doc._id.toString(),
      email: doc.email,
      emailVerified: doc.emailVerified,
      emailVerifiedAt: doc.emailVerifiedAt,
      passwordHash: doc.passwordHash,
      providers: doc.providers.map(p => ({
        provider: p.provider,
        providerId: p.providerId,
        providerEmail: p.providerEmail,
        linkedAt: p.linkedAt,
      })),
      mfa: {
        enabled: doc.mfa.enabled,
        type: doc.mfa.type,
        totpSecret: doc.mfa.totpSecret,
        tempSecret: doc.mfa.tempSecret,
        backupCodes: doc.mfa.backupCodes,
        enabledAt: doc.mfa.enabledAt,
        lastUsedAt: doc.mfa.lastUsedAt,
      },
      status: doc.status,
      role: doc.role,
      deletedAt: doc.deletedAt,
      suspendedAt: doc.suspendedAt,
      suspendedReason: doc.suspendedReason,
      sessionsValidAfter: doc.sessionsValidAfter,
      passwordReset: doc.passwordReset ? {
        tokenHash: doc.passwordReset.tokenHash,
        expiresAt: doc.passwordReset.expiresAt,
      } : undefined,
      version: (doc as any).__v ?? 0, // Map mongoose version key to domain
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<UserIdentity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const session = transactionStorage.getStore();
    const doc = await UserIdentityModel.findById(id).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<UserIdentity | null> {
    const session = transactionStorage.getStore();
    const doc = await UserIdentityModel.findOne({ email: email.toLowerCase().trim() }).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByProvider(provider: 'google', providerId: string): Promise<UserIdentity | null> {
    const session = transactionStorage.getStore();
    const doc = await UserIdentityModel.findOne({
      'providers.provider': provider,
      'providers.providerId': providerId,
    }).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async findByPasswordResetToken(tokenHash: string): Promise<UserIdentity | null> {
    const session = transactionStorage.getStore();
    const doc = await UserIdentityModel.findOne({
      'passwordReset.tokenHash': tokenHash,
      // The application layer checks expiration, but we can double check or just let it pass
    }).session(session || null);
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(user: UserIdentity): Promise<UserIdentity> {
    const session = transactionStorage.getStore();

    if (!user.id) {
      // Insertion (No duplicate I/O read roundtrip)
      const created = new UserIdentityModel({
        email: user.email,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        passwordHash: user.passwordHash,
        providers: user.providers,
        mfa: user.mfa,
        status: user.status,
        role: user.role,
        deletedAt: user.deletedAt,
        suspendedAt: user.suspendedAt,
        suspendedReason: user.suspendedReason,
        sessionsValidAfter: user.sessionsValidAfter,
        passwordReset: user.passwordReset,
      });
      const doc = await created.save({ session });
      return this.mapToDomain(doc);
    }

    // Update with 1 single roundtrip using Optimistic Concurrency Control (OCC)
    const doc = await UserIdentityModel.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(user.id), 
        __v: user.version 
      },
      {
        $set: {
          email: user.email,
          emailVerified: user.emailVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          passwordHash: user.passwordHash,
          providers: user.providers,
          mfa: user.mfa,
          status: user.status,
          role: user.role,
          deletedAt: user.deletedAt,
          suspendedAt: user.suspendedAt,
          suspendedReason: user.suspendedReason,
          sessionsValidAfter: user.sessionsValidAfter,
          passwordReset: user.passwordReset,
        },
        $inc: { __v: 1 } // Increment the version key to block other stale threads
      },
      { new: true, session }
    );

    if (!doc) {
      throw new Error('ConcurrencyConflictError: The entity was modified by another process. Please try again.');
    }

    return this.mapToDomain(doc);
  }

  async deleteById(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    const session = transactionStorage.getStore();
    await UserIdentityModel.deleteOne({ 
      _id: new mongoose.Types.ObjectId(id) 
    }).session(session || null);
  }
}
