import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { syncQueue } from '../../platform/sync-queue.js';
import { eventBus } from '../../core/event-bus.js';
import { apiFetch } from '../../platform/api-client.js';
import { todayISO } from '../../utils/date.js';

class CheckinService {
  /**
   * Registra o check-in de um suplemento.
   * Isolamento: Tenta a rede. Se falhar, intercepta, insere silenciosamente
   * na fila de Sync e finge sucesso para a interface.
   * Nenhuma mutação de UI global é feita aqui (o estado visual é derivado).
   * 
   * @param {string} supplementId
   * @param {string} name (Usado para o Toast apenas)
   */
  async logCheckin(supplementId, name) {
    const today = todayISO();
    const payload = {
      id: crypto.randomUUID(), // Geração do UUID no Front-end para idempotência (SyncQueue)
      supplementId,
      dose: 1, // Default, the full implementation would pass the actual taken dose
      checkedAt: new Date().toISOString(), // Device time ISO
      date: today,
      timestamp: Date.now()
    };

    try {
      // Tenta a API direta primeiro usando a identificação sintética
      await apiFetch('/api/checkins', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Despacha o check-in no store local do PWA como dado final "limpo" (já consolidado)
      stateManager.dispatch(ACTIONS.ADD_CHECKIN, payload);
      eventBus.emit('toast:show', { message: `✅ ${name} marcado!`, type: 'success' });

    } catch (err) {
      // Interceptação isolada: Se for erro físico de rede ou servidor down,
      // engole a falha e joga no IndexedDB (Sync Queue)
      if (err.status === 0 || err.status >= 500) {
        await syncQueue.enqueue(payload);
        eventBus.emit('toast:show', {
          message: `✅ ${name} marcado (sincronizará quando voltar online)`,
          type: 'info'
        });
        // Importante: NÃO despachamos ADD_CHECKIN aqui.
        // O progresso da UI somará os itens pendentes da syncQueue.
      } else {
        // Erros reais de negócio/auth (ex: 400, 401) devem ser propagados ou notificados
        eventBus.emit('toast:show', {
          message: `Erro ao marcar ${name}: ${err.message}`,
          type: 'error'
        });
      }
    }
  }

  /**
   * Atalho para marcar múltiplos (Ex: "Marcar Todos")
   * @param {Array<{supplementId, name}>} supplements 
   */
  async logMultiple(supplements) {
    const today = todayISO();
    
    // Criar os payloads mantendo o ID UUID para idempotência
    const payloads = supplements.map(sup => ({
      id: crypto.randomUUID(),
      supplementId: sup.supplementId,
      date: today,
      timestamp: Date.now()
    }));

    // Otimização: se sabemos que estamos offline, joga direto na fila
    if (stateManager.get('ui.isOffline') || !navigator.onLine) {
      for (const payload of payloads) {
        await syncQueue.enqueue(payload);
      }
      eventBus.emit('toast:show', { message: `🎉 Protocolo salvo offline!`, type: 'info' });
      return;
    }

    // Se online, tenta em lote (se o backend tivesse batch endpoint, usaríamos aqui.
    // Como é chamadas individuais, vamos paralelizar via Promise.allSettled)
    try {
      const results = await Promise.allSettled(
        payloads.map(payload => 
          apiFetch('/api/checkins', { method: 'POST', body: JSON.stringify(payload) })
        )
      );

      let hasOfflineFallback = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          // Deu certo online, reflete na UI final
          stateManager.dispatch(ACTIONS.ADD_CHECKIN, { supplementId: payloads[index].supplementId, date: today });
        } else {
          // Caiu no catch por item, manda pra syncQueue local
          hasOfflineFallback = true;
          syncQueue.enqueue(payloads[index]).catch(console.error);
        }
      });

      if (hasOfflineFallback) {
        eventBus.emit('toast:show', { message: `🎉 Check-in parcial online, restantes salvos offline!`, type: 'info' });
      } else {
        eventBus.emit('toast:show', { message: '🎉 Check-in completo!', type: 'success' });
      }

    } catch (_err) {
      // Fallback global de precaução
      for (const payload of payloads) {
        await syncQueue.enqueue(payload);
      }
      eventBus.emit('toast:show', { message: `🎉 Protocolo salvo offline!`, type: 'info' });
    }
  }
}

export const checkinService = new CheckinService();
