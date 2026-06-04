import mongoose from 'mongoose';
import { UserProfile } from '../../domain/user-profile.entity.js';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { UserProfileModel, IUserProfileDocument } from './user-profile.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseUserProfileRepository implements IUserProfileRepository {
  private mapToDomain(doc: IUserProfileDocument): UserProfile {
    return {
      userId: doc.userId.toString(),
      displayName: doc.displayName,
      avatarUrl: doc.avatarUrl,
      avatarStatus: doc.avatarStatus,
      // Fallback to null if not selected/loaded
      firstName: doc.firstName !== undefined ? doc.firstName : null,
      lastName: doc.lastName !== undefined ? doc.lastName : null,
      // undefined when the field was not selected — omitted from JSON.stringify
      migrationVersion: doc.migrationVersion,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const session = transactionStorage.getStore();
    
    // Normal query: does NOT fetch select: false fields (firstName, lastName)
    const doc = await UserProfileModel.findOne({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
    
    return doc ? this.mapToDomain(doc) : null;
  }

  async findPrivateByUserId(userId: string): Promise<UserProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const session = transactionStorage.getStore();
    
    // Explicitly select private fields for owner or administrative actions
    const doc = await UserProfileModel.findOne({ 
      userId: new mongoose.Types.ObjectId(userId) 
    })
    .select('+firstName +lastName +migrationVersion')
    .session(session || null);
    
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(profile: UserProfile): Promise<UserProfile> {
    const session = transactionStorage.getStore();
    let doc: IUserProfileDocument | null = null;

    if (mongoose.Types.ObjectId.isValid(profile.userId)) {
      doc = await UserProfileModel.findOne({ 
        userId: new mongoose.Types.ObjectId(profile.userId) 
      })
      // +migrationVersion is required here: without it, doc.migrationVersion is undefined
      // in memory even if the DB has a value. Mongoose will not detect a change when the
      // incoming value equals the unloaded undefined, potentially skipping the field in
      // the update statement and silently losing the persisted version counter.
      .select('+firstName +lastName +migrationVersion')
      .session(session || null);
    }

    if (doc) {
      doc.displayName = profile.displayName;
      doc.avatarUrl = profile.avatarUrl;
      doc.avatarStatus = profile.avatarStatus;
      
      // Update private fields if provided
      if (profile.firstName !== undefined) doc.firstName = profile.firstName;
      if (profile.lastName !== undefined) doc.lastName = profile.lastName;
      // Only update migrationVersion if the caller explicitly set it (not undefined)
      if (profile.migrationVersion !== undefined) doc.migrationVersion = profile.migrationVersion;

      await doc.save({ session });
    } else {
      const created = new UserProfileModel({
        userId: new mongoose.Types.ObjectId(profile.userId),
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        avatarStatus: profile.avatarStatus,
        firstName: profile.firstName,
        lastName: profile.lastName,
        migrationVersion: profile.migrationVersion,
      });
      doc = await created.save({ session });
    }

    return this.mapToDomain(doc);
  }

  async deleteByUserId(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    const session = transactionStorage.getStore();
    await UserProfileModel.deleteOne({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
  }
}
