/**
 * Serverless-safe MongoDB connection.
 *
 * Module-level cache persists across warm-container requests.
 * The `connectionPromise` mutex serialises concurrent cold-start invocations
 * so at most one TCP handshake is opened per container, even when multiple
 * requests arrive simultaneously during a cold start.
 *
 * maxPoolSize is set to 1 because each Vercel serverless instance handles
 * one request at a time — 10 connections per instance would exhaust the
 * Atlas M0 limit (500 total) with only 50 concurrent instances.
 */
import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

// Mutex: any concurrent caller awaits the same in-flight connect instead of
// opening a second TCP connection.
let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  connectionPromise = mongoose
    .connect(uri, {
      maxPoolSize: 1,   // 1 connection per serverless instance
      minPoolSize: 0,   // allow idle connections to close
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxIdleTimeMS: 10000, // release idle connections after 10s
    })
    .then((conn) => {
      cachedConnection = conn;
      connectionPromise = null;
      return conn;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}
