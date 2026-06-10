/**
 * Serverless-safe MongoDB connection.
 *
 * Vercel functions are ephemeral but the Node.js module cache persists for the
 * lifetime of a warm container. Caching the connection at module level prevents
 * opening a new TCP connection on every request while the container is alive.
 */
import mongoose from 'mongoose';

// Module-level cache: survives across requests within the same warm container.
let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  cachedConnection = await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  });

  return cachedConnection;
}
