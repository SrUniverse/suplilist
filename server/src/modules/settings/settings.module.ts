import { Router } from 'express';
import { MongooseUserSettingsRepository } from './infrastructure/mongoose/mongoose-user-settings.repository.js';
import { MongooseUserConsentRepository } from './infrastructure/mongoose/mongoose-user-consent.repository.js';
import { DocumentCatalogService } from './domain/document-catalog.service.js';
import { MongooseUnitOfWork } from '../../shared/infrastructure/mongoose/mongoose-unit-of-work.js';
import { eventBus } from '../../shared/infrastructure/event-bus/in-memory-event-bus.js';

import { GetSettingsUseCase } from './application/use-cases/get-settings.use-case.js';
import { UpdateNotificationsUseCase } from './application/use-cases/update-notifications.use-case.js';
import { UpdateLocaleUseCase } from './application/use-cases/update-locale.use-case.js';
import { GrantConsentUseCase } from './application/use-cases/grant-consent.use-case.js';
import { RevokeConsentUseCase } from './application/use-cases/revoke-consent.use-case.js';
import { GetConsentHistoryUseCase } from './application/use-cases/get-consent-history.use-case.js';

import { CreateSettingsOnUserRegisteredListener } from './application/listeners/create-settings-on-user-registered.listener.js';
import { DeleteSettingsAndAnonymizeConsentsOnUserPurgedListener } from './application/listeners/delete-settings-and-anonymize-consents-on-user-purged.listener.js';
import { SettingsController } from './presentation/express/settings.controller.js';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';

export function initializeSettingsModule(): Router {
  const router = Router();

  // 1. Infrastructure (Repositories)
  const settingsRepo = new MongooseUserSettingsRepository();
  const consentsRepo = new MongooseUserConsentRepository();
  const documentCatalog = new DocumentCatalogService();
  const uow = new MongooseUnitOfWork();

  // 2. Event Listeners
  const createSettingsListener = new CreateSettingsOnUserRegisteredListener(settingsRepo);
  eventBus.register(createSettingsListener);

  const deleteSettingsListener = new DeleteSettingsAndAnonymizeConsentsOnUserPurgedListener(settingsRepo, consentsRepo);
  eventBus.register(deleteSettingsListener);

  // 3. Use Cases
  const getSettingsUseCase = new GetSettingsUseCase(settingsRepo);
  const updateNotificationsUseCase = new UpdateNotificationsUseCase(settingsRepo, uow);
  const updateLocaleUseCase = new UpdateLocaleUseCase(settingsRepo, uow);
  const grantConsentUseCase = new GrantConsentUseCase(uow, settingsRepo, consentsRepo, documentCatalog);
  const revokeConsentUseCase = new RevokeConsentUseCase(uow, settingsRepo, consentsRepo, documentCatalog);
  const getConsentHistoryUseCase = new GetConsentHistoryUseCase(consentsRepo);

  // 4. Controller
  const controller = new SettingsController(
    getSettingsUseCase,
    updateNotificationsUseCase,
    updateLocaleUseCase,
    grantConsentUseCase,
    revokeConsentUseCase,
    getConsentHistoryUseCase
  );

  // 5. Routes
  router.get('/', requireAuth, (req, res, next) => controller.getSettings(req, res, next));
  router.patch('/notifications', requireAuth, (req, res, next) => controller.updateNotifications(req, res, next));
  router.patch('/locale', requireAuth, (req, res, next) => controller.updateLocale(req, res, next));
  router.get('/consents', requireAuth, (req, res, next) => controller.getConsentHistory(req, res, next));
  router.post('/consents', requireAuth, (req, res, next) => controller.submitConsent(req, res, next));
  router.delete('/consents/:consentType', requireAuth, (req, res, next) => controller.revokeConsentByType(req, res, next));

  return router;
}

export default initializeSettingsModule;
