import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../../application/analytics.service.js';

export class ReportController {
  constructor(private analyticsService: AnalyticsService) {}

  async getHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string, 10) : 90;
      const data = await this.analyticsService.getAdherenceHeatmap(userId, days);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const data = await this.analyticsService.getMonthlyTrend(userId, months);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const data = await this.analyticsService.getStreakMetrics(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const data = await this.analyticsService.getAchievements(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSupplementAdherence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const supplementId = req.params.supplementId;
      const data = await this.analyticsService.getSupplementAdherence(userId, supplementId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;

      const data = await this.analyticsService.getMonthlyReport(userId, year, month);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const data = await this.analyticsService.getDashboard(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
