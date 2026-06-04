import { IDomainEvent } from './domain-event.interface.js';

export interface IEventListener<T extends IDomainEvent = IDomainEvent> {
  subscribedTo: string;
  handle(event: T): Promise<void>;
}

export interface IEventBus {
  register(listener: IEventListener): void;
  publish(event: IDomainEvent): Promise<void>;
}
