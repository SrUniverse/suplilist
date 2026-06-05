import express, { Router } from 'express';
import { MongooseFavoritesRepository } from './infrastructure/mongoose/mongoose-favorites.repository.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { BulkSetFavoritesUseCase } from './application/use-cases/bulk-set-favorites.use-case.js';
import { FavoritesController } from './presentation/express/favorites.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export function initializeFavoritesModule(): Router {
  const router = Router();

  const favoritesRepo = new MongooseFavoritesRepository();
  const unitOfWork = new MongooseUnitOfWork();
  const bulkSetFavoritesUseCase = new BulkSetFavoritesUseCase(favoritesRepo, unitOfWork);
  const controller = new FavoritesController(bulkSetFavoritesUseCase);

  // Apply elevated body parser limit locally to bulk routes to bypass the global 10kb DDoS guard
  router.put('/bulk', express.json({ limit: '500kb' }), requireAuth, (req, res, next) => {
    controller.bulkSet(req, res, next);
  });

  return router;
}

export default initializeFavoritesModule;
