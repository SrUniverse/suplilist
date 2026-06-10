import { Request, Response, NextFunction } from 'express';
import { LogCheckinUseCase } from '../../application/use-cases/log-checkin.use-case.js';
import { GetCheckinHistoryUseCase } from '../../application/use-cases/get-checkin-history.use-case.js';

export class CheckinController {
  constructor(
    private logCheckinUseCase: LogCheckinUseCase,
    private getCheckinHistoryUseCase: GetCheckinHistoryUseCase
  ) {}

  async log(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }
      
      const payload = req.body; // In a full app, this would be validated by a middleware

      const result = await this.logCheckinUseCase.execute(userId, payload);
      
      // Retorna 201 Created para novas inserções ou 200 OK para operações duplicadas e mitigadas
      res.status(result.isDuplicate ? 200 : 201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }
  async bulkLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }
      
      const payloads = req.body;
      if (!Array.isArray(payloads)) {
        res.status(400).json({ success: false, error: 'body must be an array' });
        return;
      }

      const results = [];
      for (const payload of payloads) {
        try {
          const result = await this.logCheckinUseCase.execute(userId, payload);
          results.push({ success: true, payloadId: payload.id, data: result.data });
        } catch (err) {
          results.push({ success: false, payloadId: payload.id, error: (err as Error).message });
        }
      }
      
      res.status(200).json({
        success: true,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'unauthenticated' });
        return;
      }

      const query = {
        before: req.query.before as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      };

      const history = await this.getCheckinHistoryUseCase.execute(userId, query);
      
      res.status(200).json({
        success: true,
        ...history
      });
    } catch (error) {
      next(error);
    }
  }
}
