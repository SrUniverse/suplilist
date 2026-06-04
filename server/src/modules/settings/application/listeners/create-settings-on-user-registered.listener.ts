import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event.js';
import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { UserSettings } from '../../domain/user-settings.entity.js';

export class CreateSettingsOnUserRegisteredListener implements IEventListener<UserRegisteredEvent> {
  public readonly subscribedTo = 'UserRegistered';

  constructor(private settingsRepo: IUserSettingsRepository) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const defaultSettings: UserSettings = {
      userId: event.userId,
      notifications: {
        email: {
          transactional: true,
          security: true,
          marketing: false, // Default opt-in marketing is false
          productUpdates: true,
        },
        push: {
          enabled: true,
          marketing: false,
          reminders: true,
        },
      },
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      consents: {
        privacyPolicy: false,
        termsOfService: false,
        marketingEmails: false,
      },
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Safely runs inside the active Mongoose transaction propagates via AsyncLocalStorage
    await this.settingsRepo.save(defaultSettings);
    console.log(`[Settings Module] Initialized default settings for user ${event.userId}`);
  }
}
export default CreateSettingsOnUserRegisteredListener;
