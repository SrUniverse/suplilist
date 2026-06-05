import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../core/event-bus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    once: vi.fn()
  }
}));

describe('NotificationService', () => {
  let notificationService;

  beforeEach(async () => {
    const module = await import('./notification-service.js');
    notificationService = module.default;
    vi.clearAllMocks();
  });

  it('should show toast notification', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.toast({
      message: 'Success!',
      type: 'success'
    });
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:toast',
      expect.objectContaining({
        message: 'Success!',
        type: 'success'
      })
    );
  });

  it('should show error notification', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.error({
      title: 'Error',
      message: 'Something went wrong'
    });
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:error',
      expect.any(Object)
    );
  });

  it('should show success notification', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.success('Operation completed!');
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:success',
      expect.any(Object)
    );
  });

  it('should show warning notification', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.warn('Please review this');
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:warn',
      expect.any(Object)
    );
  });

  it('should show confirmation dialog', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    const promise = notificationService.confirm({
      title: 'Delete?',
      message: 'Are you sure?'
    });
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:confirm',
      expect.any(Object)
    );
  });

  it('should clear notification', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.clear('toast-1');
    
    expect(EventBus.emit).toHaveBeenCalledWith(
      'notification:clear',
      expect.any(String)
    );
  });

  it('should queue notifications', async () => {
    notificationService.toast({ message: 'First' });
    notificationService.toast({ message: 'Second' });
    notificationService.toast({ message: 'Third' });
    
    const pending = notificationService.getPending();
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it('should support notification actions', async () => {
    const onAction = vi.fn();
    
    notificationService.toast({
      message: 'Undo?',
      action: { label: 'Undo', callback: onAction }
    });
    
    expect(notificationService.notifications.length).toBeGreaterThan(0);
  });

  it('should auto-dismiss notifications', async () => {
    const EventBus = (await import('../core/event-bus.js')).default;
    
    notificationService.toast({
      message: 'Temporary',
      duration: 3000
    });
    
    expect(EventBus.emit).toHaveBeenCalled();
  });
});
