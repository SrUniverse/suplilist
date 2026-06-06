/**
 * Reports Routes — Visual analytics and adherence reports
 * Powers heatmaps, trends, achievements, and PDF exports
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import AnalyticsService from '../services/analytics-service.js';
import logger from '../utils/logger.js';

const router = express.Router();

let analyticsService = null;

export function initReports(analyticsServiceInstance) {
  analyticsService = analyticsServiceInstance;
}

/**
 * GET /api/reports/heatmap
 * Get adherence heatmap data for visualization
 */
router.get(
  '/heatmap',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { days = 90 } = req.query;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const heatmapData = await analyticsService.getAdherenceHeatmap(
        userId,
        Math.min(parseInt(days), 365)
      );

      return res.json({
        success: true,
        data: heatmapData,
        message: `Heatmap para últimos ${heatmapData.length} dias`
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting heatmap:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/trend
 * Get monthly adherence trend
 */
router.get(
  '/trend',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { months = 6 } = req.query;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const trendData = await analyticsService.getMonthlyTrend(
        userId,
        Math.min(parseInt(months), 24)
      );

      return res.json({
        success: true,
        data: trendData,
        message: `Trend dos últimos ${trendData.length} meses`
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting trend:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/streak
 * Get current and longest streak metrics
 */
router.get(
  '/streak',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const streakMetrics = await analyticsService.getStreakMetrics(userId);

      return res.json({
        success: true,
        data: streakMetrics
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting streak:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/achievements
 * Get unlocked achievements/badges
 */
router.get(
  '/achievements',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const achievements = await analyticsService.getAchievements(userId);

      return res.json({
        success: true,
        data: achievements,
        count: achievements.length
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting achievements:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/supplements/:supplementId
 * Get adherence for specific supplement
 */
router.get(
  '/supplements/:supplementId',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { supplementId } = req.params;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const adherence = await analyticsService.getSupplementAdherence(
        userId,
        supplementId
      );

      return res.json({
        success: true,
        data: adherence
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting supplement adherence:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/monthly
 * Get comprehensive monthly report
 */
router.get(
  '/monthly',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const now = new Date();
      const { year = now.getFullYear(), month = now.getMonth() + 1 } = req.query;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const report = await analyticsService.getMonthlyReport(
        userId,
        parseInt(year),
        parseInt(month)
      );

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      return res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting monthly report:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/reports/dashboard
 * Get complete dashboard data (all metrics at once)
 */
router.get(
  '/dashboard',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 15 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!analyticsService) {
        return res.status(500).json({
          success: false,
          error: 'Analytics service not initialized'
        });
      }

      const [heatmap, trend, streak, achievements, currentMonth] = await Promise.all([
        analyticsService.getAdherenceHeatmap(userId, 30),
        analyticsService.getMonthlyTrend(userId, 6),
        analyticsService.getStreakMetrics(userId),
        analyticsService.getAchievements(userId),
        analyticsService.getMonthlyReport(
          userId,
          new Date().getFullYear(),
          new Date().getMonth() + 1
        )
      ]);

      return res.json({
        success: true,
        data: {
          heatmap,
          trend,
          streak,
          achievements,
          currentMonth
        }
      });
    } catch (error) {
      logger.error('[ReportsRoute] Error getting dashboard:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
