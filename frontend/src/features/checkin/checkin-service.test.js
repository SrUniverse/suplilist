import { describe, it, expect, vi, beforeEach } from 'vitest';

const dispatchMock = vi.fn();
const enqueueMock = vi.fn(() => Promise.resolve());
const emitMock = vi.fn();
const apiFetchMock = vi.fn();
let uiOffline = false;

vi.mock('../../state/state-manager.js', () => ({
  ACTIONS: { ADD_CHECKIN: 'ADD_CHECKIN' },
  stateManager: {
    dispatch: (...a) => dispatchMock(...a),
    get: (k) => (k === 'ui.isOffline' ? uiOffline : undefined),
  },
}));
vi.mock('../../platform/sync-queue.js', () => ({
  syncQueue: { enqueue: (...a) => enqueueMock(...a) },
}));
vi.mock('../../core/event-bus.js', () => ({
  eventBus: { emit: (...a) => emitMock(...a) },
}));
vi.mock('../../platform/api-client.js', () => ({
  apiFetch: (...a) => apiFetchMock(...a),
}));
vi.mock('../../utils/date.js', () => ({ todayISO: () => '2026-06-15' }));
vi.mock('../../utils/logger.js', () => ({ logger: { error: vi.fn() } }));

import { checkinService } from './checkin-service.js';

beforeEach(() => {
  dispatchMock.mockClear();
  enqueueMock.mockClear();
  emitMock.mockClear();
  apiFetchMock.mockReset();
  uiOffline = false;
  if (!global.crypto) global.crypto = {};
  global.crypto.randomUUID = () => 'uuid-test';
  // jsdom já reporta navigator.onLine = true por padrão (non-configurable);
  // o caminho offline é exercido via uiOffline = true no estado.
});

describe('checkin-service', () => {
  describe('logCheckin', () => {
    it('sucesso online despacha ADD_CHECKIN e toast de sucesso', async () => {
      apiFetchMock.mockResolvedValue({});
      await checkinService.logCheckin('creatina', 'Creatina');
      expect(dispatchMock).toHaveBeenCalledWith('ADD_CHECKIN', expect.objectContaining({ supplementId: 'creatina' }));
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'success' }));
    });

    it('erro de rede (status 0) enfileira e NÃO despacha', async () => {
      apiFetchMock.mockRejectedValue({ status: 0 });
      await checkinService.logCheckin('creatina', 'Creatina');
      expect(enqueueMock).toHaveBeenCalledTimes(1);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'info' }));
    });

    it('erro 500 enfileira (fallback offline)', async () => {
      apiFetchMock.mockRejectedValue({ status: 503 });
      await checkinService.logCheckin('x', 'X');
      expect(enqueueMock).toHaveBeenCalledTimes(1);
    });

    it('erro de negócio (400) emite toast de erro e não enfileira', async () => {
      apiFetchMock.mockRejectedValue({ status: 400, message: 'inválido' });
      await checkinService.logCheckin('x', 'X');
      expect(enqueueMock).not.toHaveBeenCalled();
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'error' }));
    });
  });

  describe('logMultiple', () => {
    it('offline conhecido enfileira todos sem chamar a API', async () => {
      uiOffline = true;
      await checkinService.logMultiple([{ supplementId: 'a' }, { supplementId: 'b' }]);
      expect(apiFetchMock).not.toHaveBeenCalled();
      expect(enqueueMock).toHaveBeenCalledTimes(2);
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'info' }));
    });

    it('online com todos os itens ok despacha cada ADD_CHECKIN', async () => {
      apiFetchMock.mockResolvedValue({ results: [{ success: true }, { success: true }] });
      await checkinService.logMultiple([{ supplementId: 'a' }, { supplementId: 'b' }]);
      expect(dispatchMock).toHaveBeenCalledTimes(2);
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'success' }));
    });

    it('online com item falho cai para syncQueue (parcial)', async () => {
      apiFetchMock.mockResolvedValue({ results: [{ success: true }, { success: false }] });
      await checkinService.logMultiple([{ supplementId: 'a' }, { supplementId: 'b' }]);
      expect(dispatchMock).toHaveBeenCalledTimes(1);
      expect(enqueueMock).toHaveBeenCalledTimes(1);
      expect(emitMock).toHaveBeenCalledWith('toast:show', expect.objectContaining({ type: 'info' }));
    });

    it('exceção global enfileira todos como precaução', async () => {
      apiFetchMock.mockRejectedValue(new Error('500'));
      await checkinService.logMultiple([{ supplementId: 'a' }]);
      expect(enqueueMock).toHaveBeenCalledTimes(1);
    });
  });
});
