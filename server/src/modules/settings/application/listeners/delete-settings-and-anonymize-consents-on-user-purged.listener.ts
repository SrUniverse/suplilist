import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserPurgedEvent } from '../../../identity/domain/events/user-purged.event.js';
import { IUserSettingsRepository } from '../../repositories/user-settings.repository.js';
import { IUserConsentRepository } from '../../repositories/user-consent.repository.js';

export class DeleteSettingsAndAnonymizeConsentsOnUserPurgedListener implements IEventListener<UserPurgedEvent> {
  public readonly subscribedTo = 'UserPurged';

  constructor(
    private settingsRepo: IUserSettingsRepository,
    private consentRepo: IUserConsentRepository
  ) {}

  async handle(event: UserPurgedEvent): Promise<void> {
    // 1. Hard delete the user settings document
    await this.settingsRepo.deleteByUserId(event.userId);

    // 2. Anonymize all consents for the user
    await this.consentRepo.anonymizeByUserId(event.userId, event.anonymousId);

    console.log(`[Settings Module] Purged settings and anonymized consents for user ${event.userId}`);
  }
}
export default DeleteSettingsAndAnonymizeConsentsOnUserPurgedListener;
