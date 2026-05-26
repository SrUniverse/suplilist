import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../../src/js/core/eventbus.js';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clearHistory();
    eventBus.subscribers.clear();
  });

  it('on() deve retornar uma função de unsubscribe', () => {
    const unsub = eventBus.on('test:event', () => {});
    expect(typeof unsub).toBe('function');
  });

  it('emit() deve notificar todos os subscribers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    eventBus.on('test:event', handler1);
    eventBus.on('test:event', handler2);
    
    eventBus.emit('test:event', { foo: 'bar' });
    
    expect(handler1).toHaveBeenCalledWith({ foo: 'bar' });
    expect(handler2).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('unsubscribe deve funcionar (não recebe mais eventos)', () => {
    const handler = vi.fn();
    const unsub = eventBus.on('test:event', handler);
    
    unsub();
    eventBus.emit('test:event', { foo: 'bar' });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() deve remover um handler específico', () => {
    const handler = vi.fn();
    eventBus.on('test:event', handler);
    
    eventBus.off('test:event', handler);
    eventBus.emit('test:event', { foo: 'bar' });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('getHistory() deve retornar o histórico correto', () => {
    eventBus.emit('event:1', { val: 1 });
    eventBus.emit('event:2', { val: 2 });
    eventBus.emit('event:1', { val: 3 });

    const fullHistory = eventBus.getHistory();
    expect(fullHistory.length).toBe(3);
    expect(fullHistory[0].eventType).toBe('event:1');

    const filteredHistory = eventBus.getHistory('event:1');
    expect(filteredHistory.length).toBe(2);
    expect(filteredHistory[0].payload).toEqual({ val: 1 });
    expect(filteredHistory[1].payload).toEqual({ val: 3 });
  });

  it('Um handler que falha não deve quebrar outros handlers', () => {
    const badHandler = () => {
      throw new Error('Falha intencional');
    };
    const goodHandler = vi.fn();

    eventBus.on('test:event', badHandler);
    eventBus.on('test:event', goodHandler);

    // Não deve lançar erro e deve disparar goodHandler
    expect(() => {
      eventBus.emit('test:event', { ok: true });
    }).not.toThrow();

    expect(goodHandler).toHaveBeenCalledWith({ ok: true });
  });

  it("emit() de 'error:system' que falha não deve causar loop infinito", () => {
    const faultyErrorHandler = () => {
      throw new Error('Falha no manipulador de erros');
    };

    eventBus.on('error:system', faultyErrorHandler);

    // Emitir um erro comum com handler que falha gera 'error:system'
    const normalFaultyHandler = () => {
      throw new Error('Falha normal');
    };
    eventBus.on('normal:event', normalFaultyHandler);

    expect(() => {
      eventBus.emit('normal:event', {});
    }).not.toThrow();

    // Deve conter no histórico o evento normal e o de erro correspondente, mas não infinitos
    const history = eventBus.getHistory();
    expect(history.length).toBeLessThan(10);
  });
});
