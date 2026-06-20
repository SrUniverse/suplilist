import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserPurgedEvent } from '../../../identity/domain/events/user-purged.event.js';
import { IAuditLogRepository } from '../../repositories/audit-log.repository.js';
import { logger } from '../../../../shared/utils/logger.js';

export class AnonymizeAuditLogsOnUserPurgedListener implements IEventListener<UserPurgedEvent> {
  public readonly subscribedTo = 'UserPurged';

  constructor(private auditLogRepo: IAuditLogRepository) {}

  async handle(event: UserPurgedEvent): Promise<void> {
    await this.auditLogRepo.anonymizeByUserId(event.userId, event.anonymousId);
    logger.info(`[Audit Module] Anonymized audit logs for user ${event.userId}`);
  }
}
export default AnonymizeAuditLogsOnUserPurgedListener;
