import mongoose from 'mongoose';
import { AuditLog } from '../../domain/audit-log.entity.js';
import { IAuditLogRepository } from '../../repositories/audit-log.repository.js';
import { AuditLogModel, IAuditLogDocument } from './audit-log.model.js';
import { transactionStorage } from '../../../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';

export class MongooseAuditLogRepository implements IAuditLogRepository {
  private mapToDomain(doc: IAuditLogDocument): AuditLog {
    // Map Meta map to a plain JS object
    let metaObj: Record<string, any> | null = null;
    if (doc.meta) {
      metaObj = {};
      if (doc.meta instanceof Map) {
        doc.meta.forEach((val, key) => {
          metaObj![key] = val;
        });
      } else {
        metaObj = doc.meta;
      }
    }

    return {
      id: doc._id.toString(),
      userId: doc.userId ? doc.userId.toString() : null,
      event: doc.event,
      outcome: doc.outcome,
      failureReason: doc.failureReason,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      deviceLabel: doc.deviceLabel,
      country: doc.country,
      meta: metaObj,
      timestamp: doc.timestamp,
    };
  }

  async save(log: AuditLog): Promise<AuditLog> {
    const session = transactionStorage.getStore();
    
    // We enforce append-only: always insert a new document, never update.
    const created = new AuditLogModel({
      _id: log.id ? new mongoose.Types.ObjectId(log.id) : undefined,
      userId: log.userId 
        ? (mongoose.Types.ObjectId.isValid(log.userId) ? new mongoose.Types.ObjectId(log.userId) : log.userId) 
        : null,
      event: log.event,
      outcome: log.outcome,
      failureReason: log.failureReason,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      deviceLabel: log.deviceLabel,
      country: log.country,
      meta: log.meta,
      timestamp: log.timestamp,
    });

    const doc = await created.save({ session });
    return this.mapToDomain(doc);
  }

  async findHistoryByUserId(
    userId: string, 
    cursor: string | null, 
    limit: number
  ): Promise<{ logs: AuditLog[]; nextCursor: string | null }> {
    const session = transactionStorage.getStore();
    const query: any = { 
      userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId 
    };

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch limit + 1 to check if there is a next page
    const docs = await AuditLogModel.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .session(session || null);

    let nextCursor: string | null = null;
    const logs = docs.map(doc => this.mapToDomain(doc));

    if (logs.length > limit) {
      const nextLog = logs.pop(); // Remove extra item
      nextCursor = nextLog!.id;
    }

    return { logs, nextCursor };
  }

  async findGlobalHistory(
    cursor: string | null, 
    limit: number, 
    filterEvent?: string
  ): Promise<{ logs: AuditLog[]; nextCursor: string | null }> {
    const session = transactionStorage.getStore();
    const query: any = {};

    if (filterEvent) {
      query.event = filterEvent;
    }

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const docs = await AuditLogModel.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .session(session || null);

    let nextCursor: string | null = null;
    const logs = docs.map(doc => this.mapToDomain(doc));

    if (logs.length > limit) {
      const nextLog = logs.pop();
      nextCursor = nextLog!.id;
    }

    return { logs, nextCursor };
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

    await AuditLogModel.updateMany(
      query,
      { $set: { userId: anonymousId } }
    ).session(session || null);
  }
}
export default MongooseAuditLogRepository;
