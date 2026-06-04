export interface IDomainEvent {
  eventName: string;
  occurredAt: Date;
  getAggregateId(): string;
}
