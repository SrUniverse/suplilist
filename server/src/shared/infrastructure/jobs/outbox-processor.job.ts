import { OutboxEventModel } from '../mongoose/outbox-event.model.js';
import { eventBus } from '../event-bus/in-memory-event-bus.js';

export class OutboxProcessorJob {
  static async execute(): Promise<void> {
    const batchSize = 50;

    // Fetch pending or failed events with less than 5 attempts
    const pendingEvents = await OutboxEventModel.find({
      status: { $in: ['pending', 'failed'] },
      attempts: { $lt: 5 }
    })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    if (pendingEvents.length === 0) return;

    for (const event of pendingEvents) {
      event.attempts += 1;

      try {
        // Construct a generic domain event representation for the InMemoryEventBus
        const domainEvent = {
          eventName: event.eventType,
          occurredAt: event.createdAt,
          getAggregateId: () => event.aggregateId,
          ...Object.fromEntries(event.payload.entries())
        };

        // Publish to downstream module listeners
        await eventBus.publish(domainEvent as any);

        // Update outbox event status to processed
        event.status = 'processed';
        event.processedAt = new Date();
        event.errorReason = null;
      } catch (error: any) {
        console.error(`[Outbox Processor] Error processing event ${event._id}:`, error);
        event.status = 'failed';
        event.errorReason = error.message || 'Unknown processing error';
      }

      await event.save();
    }
  }
}
export default OutboxProcessorJob;
