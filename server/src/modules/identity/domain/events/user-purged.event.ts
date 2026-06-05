import { IDomainEvent } from '../../../../shared/application/event-bus/domain-event.interface.js';

export class UserPurgedEvent implements IDomainEvent {
  public readonly eventName = 'UserPurged';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly anonymousId: string
  ) {}

  getAggregateId(): string {
    return this.userId;
  }
}
export default UserPurgedEvent;
