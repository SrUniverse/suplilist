import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../application/notification.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  async getPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const prefs = await this.notificationService.getOrCreatePreferences(userId);
      res.json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const { optimalTime, notificationTypes } = req.body;
      const prefs = await this.notificationService.updatePreferences(userId, {
        optimalTime,
        notificationTypes,
      });

      res.json({ success: true, data: prefs });
    } catch (error) {
      next(error);
    }
  }

  async scheduleNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      await this.notificationService.scheduleUserNotifications(userId);
      res.json({ success: true, message: 'Notifications scheduled' });
    } catch (error) {
      next(error);
    }
  }

  async trackEngagement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const { notificationScheduleId, action } = req.body;
      await this.notificationService.trackEngagement(userId, notificationScheduleId, action);

      res.json({ success: true, message: 'Engagement tracked' });
    } catch (error) {
      next(error);
    }
  }

  async getPendingNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const pending = await this.notificationService.getPendingNotifications(userId);
      res.json({ success: true, data: pending });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthorized' });
        return;
      }

      const analytics = await this.notificationService.getAnalytics(userId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }
}
