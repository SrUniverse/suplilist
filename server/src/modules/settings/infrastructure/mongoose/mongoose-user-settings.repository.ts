import mongoose from 'mongoose';
import { UserSettings } from '../../domain/user-settings.entity.js';
import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { UserSettingsModel, IUserSettingsDocument } from './user-settings.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseUserSettingsRepository implements IUserSettingsRepository {
  private mapToDomain(doc: IUserSettingsDocument): UserSettings {
    return {
      userId: doc.userId.toString(),
      notifications: {
        email: {
          transactional: doc.notifications.email.transactional,
          security: doc.notifications.email.security,
          marketing: doc.notifications.email.marketing,
          productUpdates: doc.notifications.email.productUpdates,
        },
        push: {
          enabled: doc.notifications.push.enabled,
          marketing: doc.notifications.push.marketing,
          reminders: doc.notifications.push.reminders,
        },
      },
      locale: doc.locale,
      timezone: doc.timezone,
      consents: {
        privacyPolicy: doc.consents.privacyPolicy,
        termsOfService: doc.consents.termsOfService,
        marketingEmails: doc.consents.marketingEmails,
      },
      version: (doc as any).__v ?? 0, // Map mongoose version key to domain
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findByUserId(userId: string): Promise<UserSettings | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const session = transactionStorage.getStore();
    const doc = await UserSettingsModel.findOne({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
    
    return doc ? this.mapToDomain(doc) : null;
  }

  async save(settings: UserSettings): Promise<UserSettings> {
    const session = transactionStorage.getStore();
    
    // Check if document already exists using a quick read (no transaction lock required for check)
    const existingDoc = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(settings.userId)
    }).session(session || null);

    if (!existingDoc) {
      // Insertion (No duplicate I/O read roundtrip)
      const created = new UserSettingsModel({
        userId: new mongoose.Types.ObjectId(settings.userId),
        notifications: settings.notifications,
        locale: settings.locale,
        timezone: settings.timezone,
        consents: settings.consents,
      });
      const doc = await created.save({ session });
      return this.mapToDomain(doc);
    }

    // Update with 1 single roundtrip using Optimistic Concurrency Control (OCC)
    const doc = await UserSettingsModel.findOneAndUpdate(
      { 
        userId: new mongoose.Types.ObjectId(settings.userId), 
        __v: settings.version 
      },
      {
        $set: {
          notifications: {
            email: {
              transactional: true, // immutable
              security: true,      // immutable
              marketing: settings.notifications.email.marketing,
              productUpdates: settings.notifications.email.productUpdates,
            },
            push: {
              enabled: settings.notifications.push.enabled,
              marketing: settings.notifications.push.marketing,
              reminders: settings.notifications.push.reminders,
            }
          },
          locale: settings.locale,
          timezone: settings.timezone,
          consents: settings.consents,
        },
        $inc: { __v: 1 } // Increment the version key to block other stale threads
      },
      { new: true, session }
    );

    if (!doc) {
      throw new Error('ConcurrencyConflictError: The settings entity was modified by another process. Please try again.');
    }

    return this.mapToDomain(doc);
  }

  async deleteByUserId(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    const session = transactionStorage.getStore();
    await UserSettingsModel.deleteOne({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).session(session || null);
  }
}
export default MongooseUserSettingsRepository;
