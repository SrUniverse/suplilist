import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';
import { IUnitOfWork } from '../../application/unit-of-work.interface.js';
import { logger } from '../../utils/logger.js';

// Context storage to hold active transaction session for the current call execution path
export const transactionStorage = new AsyncLocalStorage<mongoose.ClientSession>();

export class MongooseUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await transactionStorage.run(session, work);
      
      await session.commitTransaction();
      return result;
    } catch (error) {
      // If we are actively in a transaction, attempt to abort it.
      // We wrap the abort in a try/catch to ensure that if the abort fails (e.g. database disconnect),
      // we do not swallow or override the original business logic error.
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          logger.error('Critical: Failed to abort MongoDB transaction:', abortError);
        }
      }
      throw error;
    } finally {
      // Crucial: Release session back to pool and clear write locks on the database.
      // The finally block runs regardless of whether the try succeeded or the catch threw/re-threw.
      await session.endSession();
    }
  }
}
