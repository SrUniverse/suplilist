/**
 * Email Routes — Send emails via Resend
 * Handles monthly reports, reminders, and transactional emails
 */

import express from 'express';
import { Resend } from 'resend';
import sanitizeHtmlLib from 'sanitize-html';  // FIX C2: Add missing import
import logger from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateEmail } from '../utils/validators.js';
import { rateLimit } from '../middleware/rate-limit.js';
import EmailLog from '../models/email-log.js';  // FIX C2: Add missing import
import UnsubscribeList from '../models/unsubscribe-list.js';  // FIX C2: Add missing import
import { getResendApiKey } from '../config/email-config.js';  // FIX C5: Use function instead of direct env

const router = express.Router();
const apiKey = getResendApiKey();  // FIX C5: Get API key safely
const resend = new Resend(apiKey);

if (!apiKey) {
  logger.error('RESEND_API_KEY not configured - email service will fail');
}

/**
 * POST /api/email
 * Send email to user
 *
 * Body:
 * {
 *   to: 'user@example.com',
 *   subject: 'Subject line',
 *   html: '<html>...</html>',
 *   text: 'plain text fallback'
 * }
 */
router.post(
  '/',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  async (req, res) => {
    try {
      const { to, subject, html, text } = req.body;
      const userId = req.user?.id;

      // Validate request
      const validationError = await validateEmailRequest(to, subject, html, userId);

      if (validationError === null && (await UnsubscribeList.findOne({ email: to }))) {
        logger.info(`Skipped email to unsubscribed address: ${to}`);
        return res.json(successResponse({ messageId: 'unsubscribed', skipped: true }));
      }

      if (validationError) {
        const statusCode = validationError.includes('Rate limit') ? 429 : 400;
        return res.status(statusCode).json(errorResponse(validationError, statusCode));
      }

      // Sanitize HTML
      const cleanHtml = sanitizeHtmlLib(html, {
        allowedTags: ['a', 'p', 'h1', 'h2', 'h3', 'br', 'strong', 'em', 'u', 'div', 'span', 'img'],
        allowedAttributes: {
          'a': ['href', 'style'],
          'img': ['src', 'alt', 'style'],
          '*': ['style']
        },
        disallowedTagsMode: 'discard'
      });

      // Send via Resend
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@suplilist.app',
        to,
        subject,
        html: cleanHtml,
        text: text || stripHtml(cleanHtml),
        reply_to: 'support@suplilist.app',
        headers: {
          'X-User-ID': userId,
          'X-App': 'SupliList'
        }
      });

      // Log and respond
      const status = result.id ? 'sent' : 'failed';
      const httpStatus = result.id ? 200 : 500;

      await EmailLog.create({
        userId,
        to,
        subject,
        messageId: result.id || null,
        sentAt: new Date(),
        status,
        error: result.error?.message,
        provider: 'resend'
      });

      if (result.id) {
        logger.info(`Email sent via Resend: ${result.id} to ${to}`);
        return res.json(successResponse({ messageId: result.id, sentAt: new Date().toISOString() }));
      } else {
        logger.error(`Failed to send email via Resend: ${result.error?.message}`);
        return res.status(httpStatus).json(errorResponse('Failed to send email', httpStatus));
      }
    } catch (error) {
      logger.error('Email route error', error);
      return res.status(500).json(errorResponse(error.message || 'Internal server error', 500));
    }
  }
);

/**
 * GET /api/email/status
 * Check email service status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const testResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@suplilist.app',
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    const isConnected = !testResult.error;

    return res.json(successResponse({
      connected: isConnected,
      provider: 'resend',
      status: isConnected ? 'operational' : 'down',
      lastCheck: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Email status check failed', error);
    return res.json(successResponse({
      connected: false,
      provider: 'resend',
      status: 'error',
      error: error.message
    }));
  }
});

/**
 * POST /api/email/unsubscribe
 * Unsubscribe from email reminders
 * Requires authentication to prevent auth bypass
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json(errorResponse('Invalid email', 400));
    }

    await UnsubscribeList.findOneAndUpdate(
      { email },
      { email, unsubscribedAt: new Date() },
      { upsert: true }
    );

    logger.info(`User unsubscribed: ${email}`);
    return res.json(successResponse({ message: 'Unsubscribed from email reminders' }));
  } catch (error) {
    logger.error('Unsubscribe failed', error);
    return res.status(500).json(errorResponse(error.message, 500));
  }
});

/**
 * POST /api/email/resubscribe
 * Resubscribe to email reminders
 * Requires authentication to prevent auth bypass
 */
router.post('/resubscribe', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json(errorResponse('Invalid email', 400));
    }

    await UnsubscribeList.deleteOne({ email });

    logger.info(`User resubscribed: ${email}`);
    return res.json(successResponse({ message: 'Resubscribed to email reminders' }));
  } catch (error) {
    logger.error('Resubscribe failed', error);
    return res.status(500).json(errorResponse(error.message, 500));
  }
});

/**
 * Helper: Calculate email statistics
 */
async function calculateEmailStats() {
  const stats = await EmailLog.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalCount = await EmailLog.countDocuments({});
  const bouncedCount = await EmailLog.countDocuments({ status: 'bounced' });
  const bounceRate = totalCount > 0 ? (bouncedCount / totalCount) * 100 : 0;

  return {
    sent: stats.find(s => s._id === 'sent')?.count || 0,
    failed: stats.find(s => s._id === 'failed')?.count || 0,
    bounced: bouncedCount,
    total: totalCount,
    bounceRate: bounceRate.toFixed(2) + '%'
  };
}

/**
 * GET /api/email/stats
 * Email statistics for admin dashboard
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json(errorResponse('Admin access required', 403));
    }

    const stats = await calculateEmailStats();
    return res.json(successResponse({
      stats,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Email stats error', error);
    return res.status(500).json(errorResponse(error.message, 500));
  }
});

/**
 * Validate email send request
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML body
 * @param {string} userId - User ID making the request
 * @returns {Promise<string|null>} - Validation error or null if valid
 */
async function validateEmailRequest(to, subject, html, userId) {
  if (!to || !subject || !html) {
    return 'Missing required fields: to, subject, html';
  }

  if (!validateEmail(to)) {
    return 'Invalid email address';
  }

  const recentEmailCount = await EmailLog.countDocuments({
    userId,
    sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  });

  if (recentEmailCount > 10) {
    return 'Rate limit exceeded - too many emails sent';
  }

  const isUnsubscribed = await UnsubscribeList.findOne({ email: to });
  if (isUnsubscribed) {
    return null; // Special case: skip sending but return success
  }

  return null; // Valid
}

/**
 * Helper: Strip HTML tags for plain text fallback
 * @param {string} html - HTML content to strip
 * @returns {string} - Plain text without HTML tags
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Calculate email statistics for admin dashboard
 * @returns {Promise<{sent: number, failed: number, bounced: number, total: number, bounceRate: string}>}
 */
async function calculateEmailStats() {
  const stats = await EmailLog.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalCount = await EmailLog.countDocuments({});
  const bouncedCount = await EmailLog.countDocuments({ status: 'bounced' });
  const bounceRate = totalCount > 0 ? (bouncedCount / totalCount) * 100 : 0;

  return {
    sent: stats.find(s => s._id === 'sent')?.count || 0,
    failed: stats.find(s => s._id === 'failed')?.count || 0,
    bounced: bouncedCount,
    total: totalCount,
    bounceRate: bounceRate.toFixed(2) + '%'
  };
}

/**
 * Format error response with standard structure
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {{success: boolean, error: string, timestamp: string}}
 */
function errorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format success response with standard structure
 * @param {any} data - Response data
 * @returns {{success: boolean, data: any, timestamp: string}}
 */
function successResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

export default router;
