import { Request, Response, NextFunction } from 'express';
import { GetMyStackUseCase } from '../../application/use-cases/get-my-stack.use-case.js';
import { AddItemToStackUseCase } from '../../application/use-cases/add-item-to-stack.use-case.js';
import { UpdateStackItemUseCase } from '../../application/use-cases/update-stack-item.use-case.js';
import { RemoveStackItemUseCase } from '../../application/use-cases/remove-stack-item.use-case.js';
import { BulkSetStackUseCase } from '../../application/use-cases/bulk-set-stack.use-case.js';

export class StackController {
  constructor(
    private getMyStackUseCase: GetMyStackUseCase,
    private addItemToStackUseCase: AddItemToStackUseCase,
    private updateStackItemUseCase: UpdateStackItemUseCase,
    private removeStackItemUseCase: RemoveStackItemUseCase,
    private bulkSetStackUseCase: BulkSetStackUseCase
  ) {}

  async bulkSet(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      // req.body should be an array of items for stack migration
      const items = Array.isArray(req.body) ? req.body : [];
      const result = await this.bulkSetStackUseCase.execute(userId, items);
      
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyStack(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      const items = await this.getMyStackUseCase.execute(userId);
      return res.status(200).json({ success: true, items });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      const item = await this.addItemToStackUseCase.execute({
        userId,
        data: req.body
      });

      return res.status(201).json({ success: true, item });
    } catch (error: any) {
      if (error.message === 'duplicate_stack_item') {
        return res.status(409).json({ 
          success: false, 
          error: 'duplicate_stack_item', 
          message: 'You already have this supplement scheduled for this time of day.' 
        });
      }
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const itemId = req.params.itemId;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        return res.status(428).json({
          success: false,
          error: 'precondition_required',
          message: 'If-Match header is required for updates.'
        });
      }

      const expectedVersionStr = ifMatch.replace(/"/g, '');
      const expectedVersion = parseInt(expectedVersionStr, 10);
      
      if (isNaN(expectedVersion)) {
        return res.status(400).json({ success: false, error: 'invalid_if_match_header' });
      }

      const item = await this.updateStackItemUseCase.execute({
        userId,
        itemId,
        expectedVersion,
        data: req.body
      });

      return res.status(200).json({ success: true, item });
    } catch (error: any) {
      if (error.message === 'precondition_failed') {
        return res.status(412).json({
          success: false,
          error: 'precondition_failed',
          message: 'The item was modified by another request. Please reload and try again.',
          data: error.currentItem
        });
      }
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const itemId = req.params.itemId;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      await this.removeStackItemUseCase.execute({
        userId,
        itemId
      });

      return res.status(200).json({ success: true, message: 'Item removed.' });
    } catch (error: any) {
      if (error.message === 'item_not_found') {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      next(error);
    }
  }
}
