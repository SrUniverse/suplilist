import { Router } from 'express';
import express from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { MongooseStackItemRepository } from './infrastructure/mongoose/mongoose-stack-item.repository.js';
import { GetMyStackUseCase } from './application/use-cases/get-my-stack.use-case.js';
import { AddItemToStackUseCase } from './application/use-cases/add-item-to-stack.use-case.js';
import { UpdateStackItemUseCase } from './application/use-cases/update-stack-item.use-case.js';
import { RemoveStackItemUseCase } from './application/use-cases/remove-stack-item.use-case.js';
import { BulkSetStackUseCase } from './application/use-cases/bulk-set-stack.use-case.js';
import { StackController } from './presentation/express/stack.controller.js';

export function initializeStackModule(): Router {
  const router = Router();

  // 1. Adapters
  const stackRepository = new MongooseStackItemRepository();

  // 2. Use Cases
  const getMyStackUseCase = new GetMyStackUseCase(stackRepository);
  const addItemUseCase = new AddItemToStackUseCase(stackRepository);
  const updateItemUseCase = new UpdateStackItemUseCase(stackRepository);
  const removeItemUseCase = new RemoveStackItemUseCase(stackRepository);
  const bulkSetStackUseCase = new BulkSetStackUseCase(stackRepository);

  // 3. Controller
  const controller = new StackController(
    getMyStackUseCase,
    addItemUseCase,
    updateItemUseCase,
    removeItemUseCase,
    bulkSetStackUseCase
  );

  // 4. Routes
  router.use(requireAuth);

  // Apply elevated body parser limit locally to bulk routes to bypass the global 10kb DDoS guard
  router.put('/bulk', express.json({ limit: '500kb' }), (req, res, next) => controller.bulkSet(req, res, next));
  
  router.get('/', (req, res, next) => controller.getMyStack(req, res, next));
  router.post('/', (req, res, next) => controller.addItem(req, res, next));
  router.put('/:itemId', (req, res, next) => controller.updateItem(req, res, next));
  router.delete('/:itemId', (req, res, next) => controller.removeItem(req, res, next));

  return router;
}

export default initializeStackModule;
