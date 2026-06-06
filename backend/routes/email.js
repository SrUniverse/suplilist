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

      // Validate required fields
      if (!to || !subject || !html) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject, html'
        });
      }

      // Validate email format
      if (!validateEmail(to)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address'
        });
      }

      // Prevent spam-like behavior
      const recentEmailCount = await EmailLog.countDocuments({
        userId,
        sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });

      if (recentEmailCount > 10) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded - too many emails sent'
        });
      }

      // Check unsubscribe list
      const isUnsubscribed = await UnsubscribeList.findOne({ email: to });
      if (isUnsubscribed) {
        logger.info(`Skipped email to unsubscribed address: ${to}`);
        return res.status(200).json({
          success: true,
          messageId: 'unsubscribed',
          skipped: true
        });
      }

      // Sanitize HTML (prevent XSS) - FIX C2: Use imported library
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

      // Log success
      if (result.id) {
        await EmailLog.create({
          userId,
          to,
          subject,
          messageId: result.id,
          sentAt: new Date(),
          status: 'sent',
          provider: 'resend'
        });

        logger.info(`Email sent via Resend: ${result.id} to ${to}`);

        return res.json({
          success: true,
          messageId: result.id,
          sentAt: new Date().toISOString()
        });
      } else {
        // Log failure
        await EmailLog.create({
          userId,
          to,
          subject,
          sentAt: new Date(),
          status: 'failed',
          error: result.error?.message,
          provider: 'resend'
        });

        logger.error(`Failed to send email via Resend: ${result.error?.message}`);

        return res.status(500).json({
          success: false,
          error: 'Failed to send email',
          messageId: null
        });
      }
    } catch (error) {
      logger.error('Email route error', error);

      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/email/status
 * Check email service status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Test Resend API
    const testResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@suplilist.app',
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    // Resend doesn't actually send to test@example.com, but validates connection
    const isConnected = !testResult.error;

    return res.json({
      connected: isConnected,
      provider: 'resend',
      status: isConnected ? 'operational' : 'down',
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Email status check failed', error);

    return res.json({
      connected: false,
      provider: 'resend',
      status: 'error',
      error: error.message
    });
  }
});

/**
 * POST /api/email/unsubscribe
 * Unsubscribe from email reminders
 *
 * Body: { email: 'user@example.com' }
 *
 * FIX C3: Require authentication to prevent auth bypass
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email'
      });
    }

    // Add to unsubscribe list
    await UnsubscribeList.findOneAndUpdate(
      { email },
      { email, unsubscribedAt: new Date() },
      { upsert: true }
    );

    logger.info(`User unsubscribed: ${email}`);

    return res.json({
      success: true,
      message: 'Unsubscribed from email reminders'
    });
  } catch (error) {
    logger.error('Unsubscribe failed', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/resubscribe
 * Resubscribe to email reminders
 *
 * Body: { email: 'user@example.com' }
 *
 * FIX C3: Require authentication to prevent auth bypass
 */
router.post('/resubscribe', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email'
      });
    }

    // Remove from unsubscribe list
    await UnsubscribeList.deleteOne({ email });

    logger.info(`User resubscribed: ${email}`);

    return res.json({
      success: true,
      message: 'Resubscribed to email reminders'
    });
  } catch (error) {
    logger.error('Resubscribe failed', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/stats
 * Email statistics for admin dashboard
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await EmailLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const bounceRate = await EmailLog.countDocuments({ status: 'bounced' }) /
      (await EmailLog.countDocuments({}));

    return res.json({
      success: true,
      stats: {
        sent: stats.find(s => s._id === 'sent')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        bounced: stats.find(s => s._id === 'bounced')?.count || 0,
        total: (await EmailLog.countDocuments({})),
        bounceRate: (bounceRate * 100).toFixed(2) + '%'
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Email stats error', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

export default router;
