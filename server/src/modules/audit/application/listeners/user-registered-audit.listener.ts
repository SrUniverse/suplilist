import { IEventListener } from '../../../../shared/application/event-bus/event-bus.interface.js';
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event.js';
import { LogAuditEventUseCase } from '../use-cases/log-audit-event.use-case.js';

export class UserRegisteredAuditListener implements IEventListener<UserRegisteredEvent> {
  public readonly subscribedTo = 'UserRegistered';

  constructor(private logAuditEventUseCase: LogAuditEventUseCase) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.logAuditEventUseCase.execute({
      userId: event.userId,
      event: 'auth.register.success',
      outcome: 'success',
      failureReason: null,
      ipAddress: 'system', // Registration event listener runs in system context
      userAgent: 'system',
      meta: { email: event.email }
    });
  }
}
export default UserRegisteredAuditListener;
