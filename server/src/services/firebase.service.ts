import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: string;
  sound?: string;
  priority?: 'high' | 'normal';
  ttl?: number;
}

interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TopicOperationResult {
  success: boolean;
  error?: string;
}

class FirebaseService {
  private initialized = false;
  private app: admin.app.App | null = null;
  private messaging: admin.messaging.Messaging | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
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

      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });

      this.messaging = admin.messaging(this.app);
      this.initialized = true;

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', { error });
      throw error;
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    deviceToken: string,
    payload: NotificationPayload
  ): Promise<SendNotificationResult> {
    if (!this.initialized || !this.messaging) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority || 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'price_alerts',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: payload.sound || 'default',
              'content-available': 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.badge,
          },
        },
      };

      const messageId = await this.messaging.send(message, deviceToken);

      logger.info('Notification sent successfully', {
        deviceToken: deviceToken.substring(0, 10) + '...',
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      logger.error('Failed to send notification to device', {
        error,
        deviceToken: deviceToken.substring(0, 10) + '...',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(
    deviceTokens: string[],
    payload: NotificationPayload
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ token: string; error: string }>;
  }> {
    if (!this.initialized || !this.messaging) {
      throw new AppError('Firebase not initialized', 500);
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ token: string; error: string }>,
    };

    // Send in batches of 500 (Firebase limit)
    for (let i = 0; i < deviceTokens.length; i += 500) {
      const batch = deviceTokens.slice(i, i + 500);
      const messages = batch.map((token) => ({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority || 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'price_alerts',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: payload.sound || 'default' } },
        },
      }));

      try {
        const response = await this.messaging.sendAll(messages);

        response.responses.forEach((result, idx) => {
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              token: batch[idx],
              error: result.error?.message || 'Unknown error',
            });
          }
        });
      } catch (error) {
        logger.error('Batch send failed', { error, batchSize: batch.length });
        batch.forEach((token) => {
          results.failed++;
          results.errors.push({
            token,
            error: 'Batch send failed',
          });
        });
      }
    }

    logger.info('Batch notification sent', results);
    return results;
  }

  /**
   * Subscribe user to a topic
   */
  async subscribeUserToTopic(
    deviceToken: string,
    topic: string
  ): Promise<TopicOperationResult> {
    if (!this.initialized || !this.messaging) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      await this.messaging.subscribeToTopic([deviceToken], topic);

      logger.info('Device subscribed to topic', {
        deviceToken: deviceToken.substring(0, 10) + '...',
        topic,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to subscribe to topic', {
        error,
        topic,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe multiple devices to a topic
   */
  async subscribeDevicesToTopic(
    deviceTokens: string[],
    topic: string
  ): Promise<TopicOperationResult> {
    if (!this.initialized || !this.messaging) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      await this.messaging.subscribeToTopic(deviceTokens, topic);

      logger.info('Devices subscribed to topic', {
        count: deviceTokens.length,
        topic,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to subscribe devices to topic', {
        error,
        topic,
        count: deviceTokens.length,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeUserFromTopic(
    deviceToken: string,
    topic: string
  ): Promise<TopicOperationResult> {
    if (!this.initialized || !this.messaging) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      await this.messaging.unsubscribeFromTopic([deviceToken], topic);

      logger.info('Device unsubscribed from topic', {
        deviceToken: deviceToken.substring(0, 10) + '...',
        topic,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', {
        error,
        topic,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload
  ): Promise<SendNotificationResult> {
    if (!this.initialized || !this.messaging) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority || 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'price_alerts',
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: payload.sound || 'default' } },
        },
      };

      const messageId = await this.messaging.send(message);

      logger.info('Topic notification sent', { topic, messageId });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      logger.error('Failed to send topic notification', {
        error,
        topic,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register device token for user
   */
  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    deviceName?: string,
    deviceType?: 'ios' | 'android' | 'web'
  ): Promise<boolean> {
    try {
      // This should be called from the database layer
      // Here we just validate the token
      if (!deviceToken || deviceToken.length < 10) {
        throw new AppError('Invalid device token', 400);
      }

      logger.info('Device token registered', {
        userId,
        deviceToken: deviceToken.substring(0, 10) + '...',
        deviceType,
      });

      return true;
    } catch (error) {
      logger.error('Failed to register device token', { error, userId });
      return false;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(
    userId: string,
    deviceToken: string
  ): Promise<boolean> {
    try {
      logger.info('Device token unregistered', {
        userId,
        deviceToken: deviceToken.substring(0, 10) + '...',
      });

      return true;
    } catch (error) {
      logger.error('Failed to unregister device token', { error, userId });
      return false;
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const firebaseService = new FirebaseService();
