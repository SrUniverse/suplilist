import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('EventBus', () => {
  let eventBus;

  beforeEach(async () => {
    const { EventBus } = await import("./event-bus.js");
    eventBus = new EventBus();
  });

  it('should publish and subscribe to events', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.emit('test', { data: 'value' });
    expect(callback).toHaveBeenCalledWith({ data: 'value' });
  });

  it('should support multiple subscribers', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('event', cb1);
    eventBus.on('event', cb2);
    eventBus.emit('event', {});
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  it('should unsubscribe from events', () => {
    const callback = vi.fn();
    const unsubscribe = eventBus.on('test', callback);
    unsubscribe();
    eventBus.emit('test', {});
    expect(callback).not.toHaveBeenCalled();
  });

  it('should support one-time listeners', () => {
    const callback = vi.fn();
    eventBus.once('test', callback);
    eventBus.emit('test', {});
    eventBus.emit('test', {});
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should filter events by name', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('event1', cb1);
    eventBus.on('event2', cb2);
    eventBus.emit('event1', {});
    expect(cb1).toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('should handle wildcard listeners', () => {
    const callback = vi.fn();
    eventBus.on('*', callback);
    eventBus.emit('any-event', {});
    expect(callback).toHaveBeenCalled();
  });
});
