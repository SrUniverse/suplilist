/**
 * error-boundary.test.js — Tests for Error Boundary Component
 *
 * 10+ test cases for error catching, recovery, and reporting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ErrorBoundary from './error-boundary.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

describe('ErrorBoundary', () => {
  let container;
  let boundary;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    boundary = new ErrorBoundary(container);
    boundary.mount();
  });

  afterEach(() => {
    boundary.unmount();
    document.body.removeChild(container);
    eventBus.clear(EVENTS.COMPONENT_ERROR);
  });

  // Test 1: Component mounts without error
  it('should mount successfully', () => {
    expect(boundary._isMounted).toBe(true);
    expect(boundary.hasError).toBe(false);
  });

  // Test 2: Capture error sets error state
  it('should capture an error and set error state', () => {
    const error = new Error('Test error');
    boundary.captureError(error, 'TestComponent');

    expect(boundary.hasError).toBe(true);
    expect(boundary.errorInfo).not.toBeNull();
    expect(boundary.errorInfo.message).toBe('Test error');
    expect(boundary.errorInfo.context).toBe('TestComponent');
  });

  // Test 3: Error ID is generated
  it('should generate a unique error ID', () => {
    const error = new Error('Test error');
    boundary.captureError(error);

    expect(boundary.errorId).toBeTruthy();
    expect(boundary.errorId).toMatch(/^ERR_\d+_[a-z0-9]+$/);
  });

  // Test 4: Error is rendered as UI
  it('should render error UI when error is captured', () => {
    const error = new Error('Something broke');
    boundary.captureError(error, 'Widget');

    const errorUI = container.querySelector('.error-boundary-container');
    expect(errorUI).toBeTruthy();
    expect(container.textContent).toContain('Algo deu errado');
    expect(container.textContent).toContain('Something broke');
  });

  // Test 5: Error message is escaped (XSS protection)
  it('should escape error message to prevent XSS', () => {
    const maliciousError = new Error('<script>alert("xss")</script>');
    boundary.captureError(maliciousError);

    expect(container.innerHTML).not.toContain('<script>');
    expect(container.textContent).toContain('<script>alert');
  });

  // Test 6: Error ID is displayed
  it('should display error ID for tracking', () => {
    const error = new Error('Test error');
    boundary.captureError(error);

    const errorId = container.textContent;
    expect(errorId).toContain(boundary.errorId);
  });

  // Test 7: Reset button clears error
  it('should reset error when retry button is clicked', () => {
    const error = new Error('Test error');
    boundary.captureError(error);

    expect(boundary.hasError).toBe(true);

    const retryBtn = container.querySelector('#error-boundary-retry');
    retryBtn.click();

    expect(boundary.hasError).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  // Test 8: Emit error event to eventBus
  it('should emit COMPONENT_ERROR event', () => {
    const mockListener = vi.fn();
    eventBus.on(EVENTS.COMPONENT_ERROR, mockListener);

    const error = new Error('Test error');
    boundary.captureError(error, 'TestComponent');

    expect(mockListener).toHaveBeenCalled();
    const payload = mockListener.mock.calls[0][0];
    expect(payload.message).toBe('Test error');
    expect(payload.context).toBe('TestComponent');
  });

  // Test 9: onError callback is invoked
  it('should call onError callback when error is captured', () => {
    const mockCallback = vi.fn();
    const boundaryWithCallback = new ErrorBoundary(container, { onError: mockCallback });
    boundaryWithCallback.mount();

    const error = new Error('Test error');
    boundaryWithCallback.captureError(error);

    expect(mockCallback).toHaveBeenCalledWith(error, 'Unknown');
  });

  // Test 10: onReset callback is invoked
  it('should call onReset callback when retry is clicked', () => {
    const mockCallback = vi.fn();
    const boundaryWithCallback = new ErrorBoundary(container, { onReset: mockCallback });
    boundaryWithCallback.mount();

    const error = new Error('Test error');
    boundaryWithCallback.captureError(error);

    const retryBtn = container.querySelector('#error-boundary-retry');
    retryBtn.click();

    expect(mockCallback).toHaveBeenCalled();
  });

  // Test 11: Report button sends error to server
  it('should send error to server when report button is clicked', async () => {
    const mockSendBeacon = vi.fn();
    global.navigator.sendBeacon = mockSendBeacon;

    const error = new Error('Test error');
    boundary.captureError(error);

    const reportBtn = container.querySelector('#error-boundary-report');
    reportBtn.click();

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSendBeacon).toHaveBeenCalled();
    expect(reportBtn.textContent).toContain('Reportado');
  });

  // Test 12: Unmount clears all resources
  it('should cleanup resources on unmount', () => {
    const error = new Error('Test error');
    boundary.captureError(error);

    boundary.unmount();

    expect(boundary._isMounted).toBe(false);
    expect(container.innerHTML).toBe('');
    expect(boundary._listeners.size).toBe(0);
  });

  // Test 13: Does not render when not mounted
  it('should not capture error when not mounted', () => {
    boundary.unmount();

    const error = new Error('Test error');
    boundary.captureError(error);

    expect(boundary.hasError).toBe(false);
  });

  // Test 14: Error context is preserved
  it('should include error context in payload', () => {
    const mockListener = vi.fn();
    eventBus.on(EVENTS.COMPONENT_ERROR, mockListener);

    const error = new Error('Widget failed');
    boundary.captureError(error, 'DashboardWidget');

    const payload = mockListener.mock.calls[0][0];
    expect(payload.context).toBe('DashboardWidget');
  });

  // Test 15: Stack trace is captured
  it('should capture stack trace', () => {
    const error = new Error('Test error');
    boundary.captureError(error);

    expect(boundary.errorInfo.stack).toBeTruthy();
    expect(boundary.errorInfo.stack).toContain('error-boundary');
  });
});
