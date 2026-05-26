/**
 * @fileoverview Agendador de Notificações Locais PWA para Lembretes de Reposição Urgente.
 * Gerencia a requisição de permissões, throttling via localStorage e exibição de alertas.
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import { stateManager } from '../../core/state-manager.js';
import { logger } from '../../utils/logger.js';
import { INVENTORY_URGENT_DAYS } from '../../utils/constants.js';

function getDaysRemaining(item) {
  return item ? (item.estimatedDaysRemaining !== undefined ? item.estimatedDaysRemaining : 30) : 30;
}

class NotificationScheduler {
  constructor() {
    this._intervalId = null;
    this._throttleMs = 24 * 60 * 60 * 1000; // 24 horas
    this._lastCheckKey = 'suplilist:last_notification_time';
  }

  /**
   * Inicializa o scheduler de notificações.
   */
  init() {
    if (typeof window === 'undefined') return;

    logger.info('NotificationScheduler: Inicializando agendador.');
    
    // Inicia verificação periódica a cada 1 hora
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = setInterval(() => this.checkAndNotify(), 60 * 60 * 1000);

    // Faz um check inicial rápido com timeout para não travar o carregamento principal
    setTimeout(() => this.checkAndNotify(), 5000);
  }

  /**
   * Solicita permissão para notificações do sistema.
   * @returns {Promise<boolean>} Retorna true se a permissão foi concedida.
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      logger.warn('NotificationScheduler: Notificações não são suportadas neste navegador.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Executa a auditoria de estoque da stack e exibe notificação se houver itens críticos.
   * @param {boolean} force Bypass do throttle (usado para testes manuais).
   */
  async checkAndNotify(force = false) {
    if (typeof window === 'undefined') return;

    const enabled = stateManager.getState('settings.notificationsEnabled');
    if (!enabled && !force) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    // Aplica o throttle se não for forçado
    if (!force) {
      const lastCheck = localStorage.getItem(this._lastCheckKey);
      if (lastCheck) {
        const diff = Date.now() - parseInt(lastCheck, 10);
        if (diff < this._throttleMs) {
          logger.info('NotificationScheduler: Verificação ignorada (throttled).');
          return;
        }
      }
    }

    // Busca itens na stack
    const stackData = stateManager.getState('stack') || stateManager.getState('stack.items') || [];
    const items = Array.isArray(stackData) ? stackData : (stackData.items || []);

    const urgentItems = items.filter(item => {
      const daysLeft = getDaysRemaining(item);
      return daysLeft <= INVENTORY_URGENT_DAYS;
    });

    if (urgentItems.length === 0) {
      if (force) {
        this.triggerNotification(
          'SupliList — Tudo Pronto! 🎉',
          'Sua stack está 100% abastecida e em dia. Continue com sua rotina de saúde!',
          '#/my-stack'
        );
      }
      return;
    }

    // Constrói texto da notificação
    let title = '⚠️ SupliList — Lembrete de Reposição';
    let body = '';

    if (urgentItems.length === 1) {
      const item = urgentItems[0];
      const daysLeft = getDaysRemaining(item);
      body = `O estoque de seu ${item.name} está acabando! Faltam apenas ${daysLeft} dia(s).`;
    } else {
      body = `Você possui ${urgentItems.length} suplementos em nível crítico de estoque!`;
    }

    // Registra timestamp do check
    if (!force) {
      localStorage.setItem(this._lastCheckKey, Date.now().toString());
    }

    await this.triggerNotification(title, body, '#/my-stack');
  }

  /**
   * Envia uma notificação física utilizando o Service Worker ou API direta.
   */
  async triggerNotification(title, body, url = '#/my-stack') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: 'recompra-alert',
          vibrate: [200, 100, 200],
          data: { url }
        });
        logger.info(`NotificationScheduler: Notificação via SW enviada.`);
      } else {
        new Notification(title, { body, icon: './icon-192.png' });
        logger.info(`NotificationScheduler: Notificação direta enviada.`);
      }
    } catch (err) {
      logger.error('NotificationScheduler: Erro ao enviar notificação', err);
    }
  }

  /**
   * Para o temporizador do scheduler.
   */
  destroy() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

export const notificationScheduler = new NotificationScheduler();
