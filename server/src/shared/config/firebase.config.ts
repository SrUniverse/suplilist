import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { logger } from '../utils/logger.js';

let firebaseInitialized = false;

export function initializeFirebaseAdmin(): void {
  if (firebaseInitialized) return;

  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID environment variable not set');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable not set');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL environment variable not set');
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error });
    // In production, failing to initialize Firebase should arguably crash the server
    // but we'll let it proceed and fail on first use if env vars are missing.
  }
}
