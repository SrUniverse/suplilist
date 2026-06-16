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
import { validateImageMagicBytes } from '../utils/file-validator.js';

const router = express.Router();

/**
 * Standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
function formatErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Standardized success response
 * @param {any} data - Response data
 */
function formatSuccessResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

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
 * Format profile response data
 * @param {Object} profile - Profile document
 * @returns {Object} Formatted profile
 */
function formatProfileData(profile) {
  return {
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
  };
}

/**
 * GET /api/profile
 * Get user's profile
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json(formatErrorResponse('Profile not found', 404));
    }

    return res.json(formatSuccessResponse({ profile: formatProfileData(profile) }));
  } catch (error) {
    logger.error('Failed to get profile', error);
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
});

/**
 * Validate profile update data
 * @param {Object} data - Update data
 * @returns {string|null} - Validation error or null if valid
 */
function validateProfileUpdate({ name, bio, phone, preferences }) {
  if (name && (name.length < 2 || name.length > 100)) {
    return 'Name must be 2-100 characters';
  }

  if (bio && bio.length > 500) {
    return 'Bio must be less than 500 characters';
  }

  return null;
}

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

      // Validate
      const validationError = validateProfileUpdate({ name, bio, phone, preferences });
      if (validationError) {
        return res.status(400).json(formatErrorResponse(validationError, 400));
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
        return res.status(404).json(formatErrorResponse('Profile not found', 404));
      }

      logger.info(`Profile updated for user ${userId}`);

      return res.json(formatSuccessResponse({
        profile: {
          name: profile.name,
          bio: profile.bio,
          phone: profile.phone,
          photo: profile.photo?.url || null,
          preferences: profile.preferences
        }
      }));
    } catch (error) {
      logger.error('Failed to update profile', error);
      return res.status(500).json(formatErrorResponse(error.message, 500));
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
        return res.status(400).json(formatErrorResponse('No photo file provided', 400));
      }

      logger.info(`Photo upload started for user ${userId}`);

      // Validate file magic bytes to prevent spoofed file types
      try {
        const isValidImage = validateImageMagicBytes(req.file.buffer, req.file.mimetype);
        if (!isValidImage) {
          return res.status(400).json(
            formatErrorResponse('Invalid file - magic bytes do not match claimed file type', 400)
          );
        }
      } catch (validationError) {
        logger.error(`File validation error for user ${userId}`, validationError);
        return res.status(400).json(formatErrorResponse('File validation failed', 400));
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

      return res.json(formatSuccessResponse({
        photo: {
          url: photoData.url,
          uploadedAt: photoData.uploadedAt,
          size: photoStorage.formatFileSize(photoData.size),
          mimetype: photoData.mimetype
        }
      }));
    } catch (error) {
      logger.error(`Photo upload failed for user ${req.user?.id}`, error);
      return res.status(500).json(formatErrorResponse(error.message || 'Failed to upload photo', 500));
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
        return res.status(404).json(formatErrorResponse('No photo to delete', 404));
      }

      // Delete from storage
      await photoStorage.deletePhoto(profile.photo.publicId, profile.photo.url);

      // Remove from database
      await UserProfile.findOneAndUpdate(
        { userId },
        { photo: {}, updatedAt: new Date() },
        { new: true }
      );

      logger.info(`Photo deleted for user ${userId}`);
      return res.json(formatSuccessResponse({ message: 'Photo deleted successfully' }));
    } catch (error) {
      logger.error(`Photo deletion failed for user ${req.user?.id}`, error);
      return res.status(500).json(formatErrorResponse(error.message, 500));
    }
  }
);

// Isolated rate limiter for the public photo endpoint.
// 200/min per IP: enough to handle a page with dozens of avatars,
// but low enough to deter bulk ID scanning.
const photoRateLimit = rateLimit({ windowMs: 60 * 1000, max: 200 });

// Minimal SVG silhouette served as the default avatar.
// Same binary for "user not found", "no photo", and "invalid ID" — prevents
// enumeration through content or status-code variation.
const DEFAULT_AVATAR_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">' +
  '<rect width="100" height="100" fill="#e5e7eb"/>' +
  '<circle cx="50" cy="38" r="20" fill="#9ca3af"/>' +
  '<ellipse cx="50" cy="90" rx="32" ry="22" fill="#9ca3af"/>' +
  '</svg>'
);

/**
 * GET /api/profile/:userId/photo
 * Public endpoint — intentional: avatars are shown on shared content without requiring login.
 *
 * Enumeration protection: ALWAYS responds HTTP 200 with image bytes, never a redirect.
 * A 302 vs 200 split would let an attacker distinguish "user exists" from "user not found"
 * by inspecting status codes alone — no image download needed. Proxy-and-serve is the
 * only response shape that makes all three cases (invalid ID, no photo, has photo)
 * indistinguishable at the protocol level.
 *
 * Cache-Control: public, max-age=86400, immutable — browsers and CDN edges cache the
 * response for 24 h. The rate limiter is the last line of defence, not the first.
 */
router.get('/:userId/photo', photoRateLimit, async (req, res) => {
  const CACHE = 'public, max-age=86400, immutable';

  const sendDefaultAvatar = () =>
    res
      .status(200)
      .set('Content-Type', 'image/svg+xml')
      .set('Cache-Control', CACHE)
      .send(DEFAULT_AVATAR_SVG);

  try {
    const { userId } = req.params;

    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) {
      return sendDefaultAvatar();
    }

    const profile = await UserProfile.findOne({ userId }, { 'photo.url': 1 });

    if (!profile?.photo?.url) {
      return sendDefaultAvatar();
    }

    // Proxy: fetch the CDN image in the backend and forward the buffer.
    // This keeps the response shape identical (always 200 + image bytes) whether
    // the user has a photo or not, so status codes reveal nothing to an attacker.
    const cdnRes = await fetch(profile.photo.url);
    if (!cdnRes.ok) {
      return sendDefaultAvatar();
    }

    const buffer = Buffer.from(await cdnRes.arrayBuffer());
    const contentType = cdnRes.headers.get('content-type') || 'image/jpeg';

    return res
      .status(200)
      .set('Content-Type', contentType)
      .set('Cache-Control', CACHE)
      .send(buffer);
  } catch (error) {
    logger.error('Failed to get profile photo', error);
    return sendDefaultAvatar();
  }
});

export default router;
