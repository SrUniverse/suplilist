import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('EventBus', () => {
  let eventBus;

  beforeEach(async () => {
    const { EventBus } = await import("./event-bus.js");
    eventBus = new EventBus();
  });

  it('should publish and subscribe to events', () => {
    const callback = vi.fn();
    eventBus.on('test:event', callback);
    eventBus.emit('test:event', { data: 'value' });
    expect(callback).toHaveBeenCalledWith({ data: 'value' }, 'test:event');
  });

  it('should support multiple subscribers', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('test:multi', cb1);
    eventBus.on('test:multi', cb2);
    eventBus.emit('test:multi', {});
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  it('should unsubscribe from events', () => {
    const callback = vi.fn();
    const unsubscribe = eventBus.on('test:unsub', callback);
    unsubscribe();
    eventBus.emit('test:unsub', {});
    expect(callback).not.toHaveBeenCalled();
  });

  it('should support one-time listeners', () => {
    const callback = vi.fn();
    eventBus.once('test:once', callback);
    eventBus.emit('test:once', {});
    eventBus.emit('test:once', {});
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should filter events by name', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('event:one', cb1);
    eventBus.on('event:two', cb2);
    eventBus.emit('event:one', {});
    expect(cb1).toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('should handle wildcard listeners', () => {
    const callback = vi.fn();
    eventBus.on('*', callback);
    eventBus.emit('test:wildcard', {});
    expect(callback).toHaveBeenCalled();
  });
});
