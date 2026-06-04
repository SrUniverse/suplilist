import { IDomainEvent } from '../../../../shared/application/event-bus/domain-event.interface.js';

export class UserRegisteredEvent implements IDomainEvent {
  public readonly eventName = 'UserRegistered';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly displayName?: string
  ) {}

  getAggregateId(): string {
    return this.userId;
  }
}
