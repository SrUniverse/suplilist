import { IProfileRepository } from '../../domain/repositories/profile.repository.interface.js';
import { Profile } from '../../domain/entities/profile.entity.js';
import { ProfileModel, IProfileDocument } from './profile.model.js';

export class MongooseProfileRepository implements IProfileRepository {
  private mapToDomain(doc: IProfileDocument): Profile {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      displayName: doc.displayName,
      avatarUrl: doc.avatarUrl,
      avatarStatus: doc.avatarStatus,
      onboardingState: doc.onboardingState,
      goals: doc.goals,
      biometrics: doc.biometrics ? {
        weight: doc.biometrics.weight,
        biologicalSex: doc.biometrics.biologicalSex
      } : undefined,
      migrationVersion: doc.migrationVersion,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      version: doc.get('__v') as number ?? 0,
    };
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const doc = await ProfileModel.findOne({ userId });
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(profile: Profile): Promise<Profile> {
    // Used mainly for creation (which goes through Saga and might pass session from MongooseUnitOfWork via cls-hooked or similar)
    // Wait, MongooseUnitOfWork often uses cls-hooked or passing sessions. 
    // If the UoW handles transactions globally, `ProfileModel.create/save` will use it if hooked,
    // or we might need to rely on the Mongoose save() with session.
    // For standard save:
    const doc = await ProfileModel.findOneAndUpdate(
      { userId: profile.userId },
      {
        $set: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          avatarStatus: profile.avatarStatus,
          onboardingState: profile.onboardingState,
          goals: profile.goals,
          biometrics: profile.biometrics,
          migrationVersion: profile.migrationVersion,
        }
      },
      { new: true, upsert: true }
    );
    return this.mapToDomain(doc);
  }

  async updateWithConcurrency(userId: string, expectedVersion: number, updates: Partial<Profile>): Promise<Profile | null> {
    const flattenedUpdates: Record<string, any> = { ...updates };
    
    // Evitar sobreposição destrutiva do objeto biometrics
    if (updates.biometrics) {
      delete flattenedUpdates.biometrics;
      if (updates.biometrics.weight !== undefined) {
        flattenedUpdates['biometrics.weight'] = updates.biometrics.weight;
      }
      if (updates.biometrics.biologicalSex !== undefined) {
        flattenedUpdates['biometrics.biologicalSex'] = updates.biometrics.biologicalSex;
      }
    }

    const doc = await ProfileModel.findOneAndUpdate(
      { userId, __v: expectedVersion },
      { 
        $set: flattenedUpdates,
        $inc: { __v: 1 }
      },
      { new: true }
    );
    return doc ? this.mapToDomain(doc) : null;
  }
}
