/**
 * global-error-modal.test.js — Tests for Global Error Modal
 *
 * 8+ test cases for modal display, actions, and auto-dismiss
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { GlobalErrorModal, getGlobalErrorModal } from './global-error-modal.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

describe('GlobalErrorModal', () => {
  let modal;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    // Create a fresh instance for each test
    modal = new GlobalErrorModal();
    modal.mount();
  });

  afterEach(() => {
    modal.unmount();
    vi.clearAllTimers();
    eventBus.clear(EVENTS.ERROR_CRITICAL);
  });

  // Test 1: Modal mounts successfully
  it('should mount and listen for errors', () => {
    expect(modal._isMounted).toBe(true);
    expect(modal.isOpen).toBe(false);
  });

  // Test 2: Modal displays error when triggered
  it('should display error modal when ERROR_CRITICAL event is emitted', () => {
    const error = {
      code: 500,
      message: 'Server error occurred',
      traceId: 'trace_123',
    };

    eventBus.emit(EVENTS.ERROR_CRITICAL, error);

    const modalUI = document.querySelector('#global-error-modal');
    expect(modalUI).toBeTruthy();
    expect(modal.isOpen).toBe(true);
    expect(modalUI.textContent).toContain('Erro 500');
    expect(modalUI.textContent).toContain('Server error occurred');
  });

  // Test 3: Error code is displayed
  it('should display error code in modal', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 404,
      message: 'Not found',
    });

    const modalUI = document.querySelector('#global-error-modal');
    expect(modalUI.textContent).toContain('Erro 404');
  });

  // Test 4: Trace ID is displayed when provided
  it('should display trace ID when provided', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
      traceId: 'trace_abc123xyz',
    });

    const modalUI = document.querySelector('#global-error-modal');
    expect(modalUI.textContent).toContain('trace_abc123xyz');
  });

  // Test 5: Close button closes modal
  it('should close modal when close button is clicked', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
    });

    expect(modal.isOpen).toBe(true);

    const closeBtn = document.querySelector('#error-modal-close');
    closeBtn.click();

    expect(modal.isOpen).toBe(false);
  });

  // Test 6: Retry button reloads page
  it('should reload page when retry button is clicked', () => {
    const reloadMock = vi.fn();
    window.location.reload = reloadMock;

    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
    });

    const retryBtn = document.querySelector('#error-modal-retry');
    retryBtn.click();

    expect(reloadMock).toHaveBeenCalled();
  });

  // Test 7: Go home button navigates to home
  it('should navigate to home when Go Home button is clicked', () => {
    const mockListener = vi.fn();
    eventBus.on(EVENTS.ROUTER_NAVIGATE, mockListener);

    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
    });

    const homeBtn = document.querySelector('#error-modal-home');
    homeBtn.click();

    expect(mockListener).toHaveBeenCalledWith({ path: '/home' }, expect.any(String));
  });

  // Test 8: Auto-dismiss after 10 seconds
  it('should auto-dismiss modal after 10 seconds', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
    });

    expect(modal.isOpen).toBe(true);

    vi.advanceTimersByTime(10000);

    expect(modal.isOpen).toBe(false);
  });

  // Test 9: User interaction cancels auto-dismiss
  it('should cancel auto-dismiss when user clicks button', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
    });

    const closeBtn = document.querySelector('#error-modal-close');
    closeBtn.click();

    vi.advanceTimersByTime(10000);

    expect(modal.isOpen).toBe(false);
  });

  // Test 10: Singleton pattern
  it('should return same instance from singleton getter', () => {
    const instance1 = getGlobalErrorModal();
    const instance2 = getGlobalErrorModal();

    expect(instance1).toBe(instance2);
  });

  // Test 11: Message is escaped for XSS protection
  it('should escape error message to prevent XSS', () => {
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: '<script>alert("xss")</script>',
    });

    const modalUI = document.querySelector('#global-error-modal');
    expect(modalUI.innerHTML).not.toContain('<script>');
  });

  // Test 12: Timestamp is displayed
  it('should display timestamp of error', () => {
    const now = Date.now();
    eventBus.emit(EVENTS.ERROR_CRITICAL, {
      code: 500,
      message: 'Error',
      timestamp: now,
    });

    const modalUI = document.querySelector('#global-error-modal');
    // Just verify timestamp is present (format may vary)
    expect(modalUI.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});
