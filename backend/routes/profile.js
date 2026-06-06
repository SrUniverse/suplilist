/**
 * Profile Routes — User profile management including photo upload
 */

import express from 'express';
import multer from 'multer';
import logger from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import photoStorage from '../services/photo-storage.js';
import UserProfile from '../models/user-profile.js';
import { validateImageMagicBytes } from '../utils/file-validator.js';  // FIX C7: Add magic bytes validation

const router = express.Router();

// Configure multer for file upload
// FIX C7: Add magic bytes validation to prevent spoofed file types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: async (req, file, cb) => {
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

      // Check MIME type first (quick check)
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type: ${file.mimetype}`));
      }

      // FIX C7: Validate actual file content, not just claimed MIME type
      // This prevents attackers from renaming .exe as .jpg
      // Validation will happen in the route handler with the actual buffer

      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

/**
 * GET /api/profile
 * Get user's profile
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    return res.json({
      success: true,
      profile: {
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        photo: profile.photo?.url || null,
        bio: profile.bio,
        phone: profile.phone,
        onboardingComplete: profile.onboardingComplete,
        preferences: profile.preferences,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to get profile', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/profile
 * Update user's profile (name, bio, phone, etc)
 */
router.put(
  '/',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { name, bio, phone, preferences } = req.body;

      // Validation
      if (name && (name.length < 2 || name.length > 100)) {
        return res.status(400).json({
          success: false,
          error: 'Name must be 2-100 characters'
        });
      }

      if (bio && bio.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Bio must be less than 500 characters'
        });
      }

      // Update profile
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        {
          ...(name && { name }),
          ...(bio !== undefined && { bio }),
          ...(phone && { phone }),
          ...(preferences && { preferences }),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      logger.info(`Profile updated for user ${userId}`);

      return res.json({
        success: true,
        profile: {
          name: profile.name,
          bio: profile.bio,
          phone: profile.phone,
          photo: profile.photo?.url || null,
          preferences: profile.preferences
        }
      });
    } catch (error) {
      logger.error('Failed to update profile', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/profile/photo
 * Upload user's profile photo
 *
 * Multipart form-data with 'photo' field
 */
router.post(
  '/photo',
  authenticateToken,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 uploads per hour
  upload.single('photo'),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      // Validate file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No photo file provided'
        });
      }

      logger.info(`Photo upload started for user ${userId}`);

      // FIX C7: Validate file magic bytes to prevent spoofed file types
      try {
        const isValidImage = validateImageMagicBytes(req.file.buffer, req.file.mimetype);
        if (!isValidImage) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file - magic bytes do not match claimed file type'
          });
        }
      } catch (validationError) {
        logger.error(`File validation error for user ${userId}`, validationError);
        return res.status(400).json({
          success: false,
          error: 'File validation failed'
        });
      }

      // Delete old photo if exists
      const existingProfile = await UserProfile.findOne({ userId });
      if (existingProfile?.photo?.publicId) {
        await photoStorage.deletePhoto(
          existingProfile.photo.publicId,
          existingProfile.photo.url
        );
      }

      // Upload new photo
      const photoData = await photoStorage.uploadPhoto(req.file, userId);

      // Update profile with new photo
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        {
          photo: {
            url: photoData.url,
            publicId: photoData.publicId,
            uploadedAt: photoData.uploadedAt,
            size: photoData.size,
            mimetype: photoData.mimetype
          },
          updatedAt: new Date()
        },
        { new: true }
      );

      logger.info(`Photo uploaded for user ${userId}: ${photoData.url}`);

      return res.json({
        success: true,
        photo: {
          url: photoData.url,
          uploadedAt: photoData.uploadedAt,
          size: photoStorage.formatFileSize(photoData.size),
          mimetype: photoData.mimetype
        }
      });
    } catch (error) {
      logger.error(`Photo upload failed for user ${req.user?.id}`, error);

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload photo'
      });
    }
  }
);

/**
 * DELETE /api/profile/photo
 * Delete user's profile photo
 */
router.delete(
  '/photo',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      const profile = await UserProfile.findOne({ userId });

      if (!profile?.photo?.publicId) {
        return res.status(404).json({
          success: false,
          error: 'No photo to delete'
        });
      }

      // Delete from storage
      await photoStorage.deletePhoto(
        profile.photo.publicId,
        profile.photo.url
      );

      // Remove from database
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          photo: {},
          updatedAt: new Date()
        },
        { new: true }
      );

      logger.info(`Photo deleted for user ${userId}`);

      return res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      logger.error(`Photo deletion failed for user ${req.user?.id}`, error);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/profile/:userId/photo
 * Get user's public profile photo (no auth required)
 */
router.get('/:userId/photo', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne(
      { userId },
      { 'photo.url': 1, 'photo.uploadedAt': 1, name: 1 }
    );

    if (!profile?.photo?.url) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    return res.json({
      success: true,
      photo: {
        url: profile.photo.url,
        uploadedAt: profile.photo.uploadedAt,
        userName: profile.name
      }
    });
  } catch (error) {
    logger.error('Failed to get profile photo', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
