/**
 * error-tracking.test.js — Tests for Error Tracking System
 *
 * 10+ test cases for error capture and batching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  init,
  captureException,
  flushErrors,
  getBufferedErrors,
  disable,
  enable,
  configure,
} from './error-tracking.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

describe('ErrorTracking', () => {
  beforeEach(() => {
    // Reset error buffer
    getBufferedErrors().length = 0;
    init();
  });

  afterEach(() => {
    disable();
    vi.clearAllMocks();
  });

  // Test 1: Initialize error tracking
  it('should initialize error tracking', () => {
    expect(() => init()).not.toThrow();
  });

  // Test 2: Capture an exception
  it('should capture an exception', () => {
    const error = new Error('Test error');
    captureException(error);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBeGreaterThan(0);
  });

  // Test 3: Error has required fields
  it('should capture error with all required fields', () => {
    const error = new Error('Test error message');
    captureException(error, { context: { userId: '123' } });

    const buffered = getBufferedErrors();
    const captured = buffered[buffered.length - 1];

    expect(captured.message).toBe('Test error message');
    expect(captured.type).toBe('EXCEPTION');
    expect(captured.trace_id).toBeTruthy();
    expect(captured.timestamp).toBeTruthy();
    expect(captured.url).toBeTruthy();
  });

  // Test 4: Exclude patterns filter out expected errors
  it('should exclude 404 errors from tracking', () => {
    const error404 = new Error('404 - Not found');
    captureException(error404);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBe(0);
  });

  // Test 5: Exclude 403 errors
  it('should exclude 403 forbidden errors', () => {
    const error403 = new Error('403 - Forbidden');
    captureException(error403);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBe(0);
  });

  // Test 6: Exclude test errors
  it('should exclude test errors', () => {
    const testError = new Error('test error for jest');
    captureException(testError);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBe(0);
  });

  // Test 7: Flush errors to server
  it('should flush errors using sendBeacon', async () => {
    const sendBeaconMock = vi.fn();
    global.navigator.sendBeacon = sendBeaconMock;

    const error = new Error('Flush test');
    captureException(error);

    flushErrors();

    expect(sendBeaconMock).toHaveBeenCalled();
    const [endpoint, data] = sendBeaconMock.mock.calls[0];
    expect(endpoint).toContain('/api/logs/errors');
    expect(data).toContain('Flush test');
  });

  // Test 8: Batch multiple errors
  it('should batch multiple errors in single request', () => {
    const sendBeaconMock = vi.fn();
    global.navigator.sendBeacon = sendBeaconMock;

    // Capture multiple errors
    captureException(new Error('Error 1'));
    captureException(new Error('Error 2'));
    captureException(new Error('Error 3'));

    flushErrors();

    expect(sendBeaconMock).toHaveBeenCalled();
    const [_, data] = sendBeaconMock.mock.calls[0];
    const payload = JSON.parse(data);
    expect(payload.errors.length).toBe(3);
  });

  // Test 9: Disable/enable error tracking
  it('should disable error tracking', () => {
    disable();

    const error = new Error('Should not track');
    captureException(error);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBe(0);
  });

  // Test 10: Re-enable error tracking
  it('should re-enable error tracking after disable', () => {
    disable();
    enable();

    const error = new Error('Should track');
    captureException(error);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBeGreaterThan(0);
  });

  // Test 11: Handle network errors during flush
  it('should handle fetch failure gracefully', async () => {
    const sendBeaconMock = vi.fn(() => {
      throw new Error('Network error');
    });
    global.navigator.sendBeacon = sendBeaconMock;

    const error = new Error('Test error');
    captureException(error);

    expect(() => flushErrors()).not.toThrow();
  });

  // Test 12: Generate unique trace IDs
  it('should generate unique trace IDs for each error', () => {
    captureException(new Error('Error 1'));
    captureException(new Error('Error 2'));

    const buffered = getBufferedErrors();
    const traceIds = buffered.map(e => e.trace_id);

    expect(traceIds[0]).not.toBe(traceIds[1]);
    expect(traceIds[0]).toMatch(/^trace_/);
  });

  // Test 13: Capture unhandled promise rejection
  it('should listen to unhandled rejections', async () => {
    const sendBeaconMock = vi.fn();
    global.navigator.sendBeacon = sendBeaconMock;

    // Emit unhandled rejection
    const event = new Event('unhandledrejection');
    event.reason = new Error('Unhandled promise rejection');
    window.dispatchEvent(event);

    // Async to allow event handler to run
    await new Promise(resolve => setTimeout(resolve, 10));

    const buffered = getBufferedErrors();
    expect(buffered.length).toBeGreaterThan(0);
  });

  // Test 14: Listen to component errors from eventBus
  it('should listen to COMPONENT_ERROR events', () => {
    const componentError = {
      message: 'Component failed',
      errorId: 'err_123',
    };

    eventBus.emit(EVENTS.COMPONENT_ERROR, componentError);

    const buffered = getBufferedErrors();
    expect(buffered.length).toBeGreaterThan(0);
    expect(buffered[buffered.length - 1].message).toContain('Component failed');
  });

  // Test 15: Respects max error buffer limit
  it('should not exceed max error buffer size', () => {
    configure({ maxErrors: 5 });

    const sendBeaconMock = vi.fn();
    global.navigator.sendBeacon = sendBeaconMock;

    // Capture 10 errors
    for (let i = 0; i < 10; i++) {
      captureException(new Error(`Error ${i}`));
    }

    // Should have triggered flush at maxErrors threshold
    expect(sendBeaconMock).toHaveBeenCalled();
  });
});
