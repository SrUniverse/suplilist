import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger', () => {
  let logger;

  beforeEach(async () => {
    const module = await import('./logger.js');
    logger = module.default;
    vi.clearAllMocks();
  });

  it('should log info level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation();
    logger.info('Test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation();
    logger.warn('Warning message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log error level with stack trace', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation();
    logger.error('Error message', new Error('Test error'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log debug level when enabled', () => {
    logger.setDebug(true);
    const spy = vi.spyOn(console, 'debug').mockImplementation();
    logger.debug('Debug message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should format log entries with context', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation();
    logger.info('Message', { userId: '123', action: 'login' });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('userId'),
      expect.any(Object)
    );
    spy.mockRestore();
  });

  it('should support log grouping', () => {
    const spy = vi.spyOn(console, 'group').mockImplementation();
    logger.group('Operation');
    logger.info('Step 1');
    logger.groupEnd();
    expect(spy).toHaveBeenCalledWith('Operation');
    spy.mockRestore();
  });

  it('should filter sensitive data', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation();
    logger.info('Login', {
      email: 'user@test.com',
      password: 'secret123'
    });
    const call = spy.mock.calls[0][1];
    expect(call.password).toBeUndefined();
    spy.mockRestore();
  });

  it('should batch log entries', async () => {
    logger.info('Entry 1');
    logger.info('Entry 2');
    logger.info('Entry 3');
    const pending = logger.getPending();
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it('should support custom formatters', () => {
    logger.addFormatter((entry) => ({
      ...entry,
      timestamp: new Date().toISOString()
    }));
    
    const formatted = logger.format({ level: 'info', message: 'Test' });
    expect(formatted.timestamp).toBeDefined();
  });

  it('should handle circular references', () => {
    const obj = { a: 1 };
    obj.self = obj;
    
    const spy = vi.spyOn(console, 'log').mockImplementation();
    expect(() => logger.info('Circular', obj)).not.toThrow();
    spy.mockRestore();
  });
});
