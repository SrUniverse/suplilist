import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserPurgedEvent } from '../../../identity/domain/events/user-purged.event.js';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { logger } from '../../../../shared/utils/logger.js';

export class DeleteProfileOnUserPurgedListener implements IEventListener<UserPurgedEvent> {
  public readonly subscribedTo = 'UserPurged';

  constructor(private profileRepo: IUserProfileRepository) {}

  async handle(event: UserPurgedEvent): Promise<void> {
    await this.profileRepo.deleteByUserId(event.userId);
    logger.info(`[Profile Module] Hard deleted profile for user ${event.userId}`);
  }
}
export default DeleteProfileOnUserPurgedListener;
