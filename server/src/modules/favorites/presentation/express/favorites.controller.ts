import { Request, Response, NextFunction } from 'express';
import { BulkSetFavoritesUseCase } from '../../application/use-cases/bulk-set-favorites.use-case.js';

export class FavoritesController {
  constructor(private bulkSetFavoritesUseCase: BulkSetFavoritesUseCase) {}

  async bulkSet(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const result = await this.bulkSetFavoritesUseCase.execute(userId, req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  }
}
export default FavoritesController;
