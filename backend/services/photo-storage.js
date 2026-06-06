/**
 * Photo Storage Service — Upload and manage user photos
 * Supports: Local storage, S3, Cloudinary
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const STORAGE_TYPE = process.env.PHOTO_STORAGE_TYPE || 'local'; // 'local', 's3', 'cloudinary'
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class PhotoStorageService {
  /**
   * Upload photo and return URL
   */
  async uploadPhoto(file, userId) {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const filename = this.generateFilename(userId, file.originalname);

      let photoUrl;
      let publicId;

      // Store based on configured storage type
      if (STORAGE_TYPE === 's3') {
        ({ photoUrl, publicId } = await this.uploadToS3(file, filename));
      } else if (STORAGE_TYPE === 'cloudinary') {
        ({ photoUrl, publicId } = await this.uploadToCloudinary(file, filename));
      } else {
        // Default: local storage
        ({ photoUrl, publicId } = await this.uploadLocally(file, filename));
      }

      logger.info(`Photo uploaded for user ${userId}: ${photoUrl}`);

      return {
        url: photoUrl,
        publicId,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date()
      };
    } catch (error) {
      logger.error(`Photo upload failed for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Delete existing photo
   */
  async deletePhoto(publicId, photoUrl) {
    try {
      if (STORAGE_TYPE === 's3') {
        await this.deleteFromS3(publicId);
      } else if (STORAGE_TYPE === 'cloudinary') {
        await this.deleteFromCloudinary(publicId);
      } else {
        await this.deleteLocally(photoUrl);
      }

      logger.info(`Photo deleted: ${publicId}`);
      return true;
    } catch (error) {
      logger.error(`Photo deletion failed: ${publicId}`, error);
      // Don't throw - continue even if deletion fails
      return false;
    }
  }

  /**
   * =====================
   * Local Storage Methods
   * =====================
   */

  async uploadLocally(file, filename) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos');

    // Create directory if not exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, file.buffer);

    const photoUrl = `/uploads/photos/${filename}`;

    return {
      photoUrl,
      publicId: filename
    };
  }

  async deleteLocally(photoUrl) {
    const filepath = path.join(process.cwd(), 'public', photoUrl);

    try {
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true; // File doesn't exist, that's ok
      }
      throw error;
    }
  }

  /**
   * ================
   * S3 Methods
   * ================
   */

  async uploadToS3(file, filename) {
    // Implementation with AWS SDK
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3({...});

    const bucket = process.env.AWS_S3_BUCKET;
    const key = `photos/${filename}`;

    // TODO: Implement actual S3 upload
    logger.warn('S3 upload not yet implemented');

    return {
      photoUrl: `https://${bucket}.s3.amazonaws.com/${key}`,
      publicId: key
    };
  }

  async deleteFromS3(publicId) {
    // TODO: Implement S3 deletion
    logger.warn('S3 deletion not yet implemented');
  }

  /**
   * ====================
   * Cloudinary Methods
   * ====================
   */

  async uploadToCloudinary(file, filename) {
    // Implementation with Cloudinary SDK
    // const cloudinary = require('cloudinary').v2;

    // TODO: Implement actual Cloudinary upload
    logger.warn('Cloudinary upload not yet implemented');

    return {
      photoUrl: `https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/${filename}`,
      publicId: filename
    };
  }

  async deleteFromCloudinary(publicId) {
    // TODO: Implement Cloudinary deletion
    logger.warn('Cloudinary deletion not yet implemented');
  }

  /**
   * ====================
   * Validation Methods
   * ====================
   */

  validateFile(file) {
    // Check file exists
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${file.size} bytes. Maximum: ${MAX_FILE_SIZE} bytes`
      );
    }

    return true;
  }

  /**
   * ====================
   * Utility Methods
   * ====================
   */

  generateFilename(userId, originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(originalName);

    return `${userId}_${timestamp}_${random}${ext}`;
  }

  /**
   * FIX C4: Removed - Base64 encoding in database is an anti-pattern
   * This caused database bloat, poor performance, and high costs.
   * Always store file URLs instead of binary/base64 content.
   *
   * Legacy note: If you need base64 for any reason, encode on-the-fly,
   * never store in database.
   */
  // DEPRECATED: convertToBase64 method removed

  /**
   * Get file size in MB
   */
  formatFileSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(photoUrl, size = 'medium') {
    // TODO: Implement thumbnail generation
    // Could use sharp library for local images
    // Or Cloudinary transformations for cloud storage

    return photoUrl; // Return original for now
  }
}

export default new PhotoStorageService();
