import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event.js';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { UserProfile } from '../../domain/user-profile.entity.js';
import { logger } from '../../../../shared/utils/logger.js';

export class CreateProfileOnUserRegisteredListener implements IEventListener<UserRegisteredEvent> {
  public readonly subscribedTo = 'UserRegistered';

  constructor(private profileRepo: IUserProfileRepository) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    // 1. Determine a fallback display name from email if not provided (e.g. Google OAuth login might provide it)
    const fallbackDisplayName = event.displayName || event.email.split('@')[0];

    // 2. Build profile entity
    const newProfile: UserProfile = {
      userId: event.userId,
      displayName: fallbackDisplayName,
      avatarUrl: null,
      avatarStatus: 'none',
      firstName: null,
      lastName: null,
      onboardingState: 'pending',
      goals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 3. Persist to MongoDB.
    // Thanks to MongooseUnitOfWork + AsyncLocalStorage, the repository save call
    // automatically runs under the exact same ClientSession started by the Identity Module.
    await this.profileRepo.save(newProfile);
    logger.info(`[Profile Module] Initialized profile for user ${event.userId}`);
  }
}
export default CreateProfileOnUserRegisteredListener;
