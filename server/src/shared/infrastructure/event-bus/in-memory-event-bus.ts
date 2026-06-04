import { IEventBus, IEventListener } from '../../application/event-bus/event-bus.interface.js';
import { IDomainEvent } from '../../application/event-bus/domain-event.interface.js';

export class InMemoryEventBus implements IEventBus {
  private listeners: Map<string, IEventListener[]> = new Map();

  register(listener: IEventListener): void {
    const eventName = listener.subscribedTo;
    const list = this.listeners.get(eventName) || [];
    list.push(listener);
    this.listeners.set(eventName, list);
  }

  async publish(event: IDomainEvent): Promise<void> {
    const list = this.listeners.get(event.eventName) || [];
    
    // Critical Fix: MongoDB ClientSession does NOT support concurrent operations.
    // If we trigger multiple listener database writes simultaneously using Promise.all,
    // the driver will throw a concurrency error and abort the transaction.
    // We execute listeners sequentially using a sequential loop with await.
    for (const listener of list) {
      await listener.handle(event);
    }
  }
}

// Singleton Instance for the Monolith
export const eventBus = new InMemoryEventBus();
export default eventBus;
