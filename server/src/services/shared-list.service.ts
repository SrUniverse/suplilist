import { db } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import crypto from 'crypto';

class SharedListService {
  /**
   * Create a shared list
   */
  async createSharedList(
    ownerId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      const accessToken = crypto.randomBytes(32).toString('hex');

      const result = await db.query(
        `INSERT INTO shared_lists (owner_id, name, description, access_token, is_public)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, owner_id, name, description, access_token, is_public, created_at`,
        [ownerId, name, description || null, accessToken, isPublic]
      );

      logger.info('Shared list created', {
        ownerId,
        listId: result.rows[0].id,
        isPublic,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating shared list', { error });
      throw error;
    }
  }

  /**
   * Share list with a user
   */
  async shareListWithUser(
    listId: string,
    userId: string,
    permissionLevel: 'view' | 'edit' | 'admin',
    sharedByUserId: string
  ): Promise<void> {
    try {
      // Verify list exists and user owns it
      const listResult = await db.query(
        `SELECT owner_id FROM shared_lists WHERE id = $1`,
        [listId]
      );

      if (listResult.rows.length === 0) {
        throw new AppError('List not found', 404);
      }

      if (listResult.rows[0].owner_id !== sharedByUserId) {
        throw new AppError('You do not own this list', 403);
      }

      // Share list
      await db.query(
        `INSERT INTO list_shares (list_id, user_id, permission_level, shared_by_user_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (list_id, user_id) DO UPDATE SET
           permission_level = EXCLUDED.permission_level,
           shared_by_user_id = EXCLUDED.shared_by_user_id`,
        [listId, userId, permissionLevel, sharedByUserId]
      );

      logger.info('List shared with user', {
        listId,
        userId,
        permissionLevel,
      });
    } catch (error) {
      logger.error('Error sharing list', { error });
      throw error;
    }
  }

  /**
   * Get lists shared with a user
   */
  async getSharedWithMe(userId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT
          sl.id,
          sl.owner_id,
          sl.name,
          sl.description,
          sl.is_public,
          sl.created_at,
          ls.permission_level,
          u.name as owner_name,
          u.email as owner_email
         FROM shared_lists sl
         JOIN list_shares ls ON ls.list_id = sl.id
         JOIN users u ON u.id = sl.owner_id
         WHERE ls.user_id = $1
         ORDER BY sl.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching shared lists', { error });
      throw error;
    }
  }

  /**
   * Get list by access token (for public sharing)
   */
  async getListByToken(accessToken: string): Promise<any> {
    try {
      const result = await db.query(
        `SELECT
          sl.id,
          sl.owner_id,
          sl.name,
          sl.description,
          sl.view_count,
          sl.created_at,
          u.name as owner_name
         FROM shared_lists sl
         JOIN users u ON u.id = sl.owner_id
         WHERE sl.access_token = $1
         AND (sl.expires_at IS NULL OR sl.expires_at > NOW())`,
        [accessToken]
      );

      if (result.rows.length === 0) {
        throw new AppError('List not found or expired', 404);
      }

      // Increment view count
      await db.query(
        `UPDATE shared_lists SET view_count = view_count + 1 WHERE access_token = $1`,
        [accessToken]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching list by token', { error });
      throw error;
    }
  }

  /**
   * Sync shared list with user's list
   */
  async syncSharedList(
    accessToken: string,
    userId: string
  ): Promise<{ itemsAdded: number }> {
    try {
      // Get list by token
      const listResult = await db.query(
        `SELECT id FROM shared_lists WHERE access_token = $1`,
        [accessToken]
      );

      if (listResult.rows.length === 0) {
        throw new AppError('List not found', 404);
      }

      // In a real implementation, you would copy items from the shared list
      // to the user's personal list

      logger.info('List synced', { accessToken, userId });

      return { itemsAdded: 0 };
    } catch (error) {
      logger.error('Error syncing shared list', { error });
      throw error;
    }
  }

  /**
   * Remove list sharing with a user
   */
  async removeListSharing(
    listId: string,
    userId: string,
    ownerId: string
  ): Promise<void> {
    try {
      // Verify ownership
      const listResult = await db.query(
        `SELECT owner_id FROM shared_lists WHERE id = $1`,
        [listId]
      );

      if (listResult.rows.length === 0) {
        throw new AppError('List not found', 404);
      }

      if (listResult.rows[0].owner_id !== ownerId) {
        throw new AppError('You do not own this list', 403);
      }

      await db.query(
        `DELETE FROM list_shares WHERE list_id = $1 AND user_id = $2`,
        [listId, userId]
      );

      logger.info('List sharing removed', { listId, userId });
    } catch (error) {
      logger.error('Error removing list sharing', { error });
      throw error;
    }
  }
}

export const sharedListService = new SharedListService();
