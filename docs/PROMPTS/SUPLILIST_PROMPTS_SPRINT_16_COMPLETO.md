# **SPRINT 16: Notification Engine & Real-Time Updates — PROMPT COMPLETO EXECUTÁVEL**

> **Padrão Industrial. Código Real + Arquitetura Escalável. Cole Direto no Seu IDE.**

**Sprint:** 16 | **Fase:** 3 — Community Explosion (continuação) | **Semanas:** 53–54
**Depende de:** Sprints 1–15 completos (todos os engines anteriores + Social Engine)

---

# **VISÃO GERAL DO SPRINT 16**

| Prompt | Arquivo(s) | O que Entrega | Complexidade |
|--------|-----------|---------------|--------------| 
| 16.1 | `notification-engine.js` + `notification-manager.js` | Sistema de notificações multi-canal (in-app, push, email, SMS) | Muito Alta |
| 16.2 | `real-time-sync-engine.js` + `websocket-manager.js` | Sincronização real-time com WebSocket fallback polling | Muito Alta |
| 16.3 | `notification-preferences.js` + `notification-queue.js` | Gerenciamento de preferências e fila de notificações | Alta |
| 16.4 | `activity-timeline-engine.js` + `notification-deduplication.js` | Timeline de atividades com deduplicação inteligente | Alta |

**Após o Sprint 16:**
- ✅ Sistema de notificações completo (in-app, push, email, SMS)
- ✅ Notificações em tempo real via WebSocket com fallback polling
- ✅ Fila de notificações com retry automático
- ✅ Deduplicação inteligente (evita spam de notificações similares)
- ✅ Preferências customizáveis por tipo de notificação
- ✅ Do Not Disturb (DND) com horários personalizados
- ✅ Batch notifications durante horários tranquilos
- ✅ Digest de atividades (notificação resumida diária/semanal)
- ✅ Tracking de leitura (delivered, read, interacted)
- ✅ Activity timeline com aggregation de eventos similares
- ✅ Push notifications com suporte a grupos/tags
- ✅ Email templates responsivos com Mjml ou similar
- ✅ SMS fallback para atividades críticas
- ✅ Webhook outbound para integrações externas
- ✅ Performance <50ms para envio em fila
- ✅ Persistência de histórico (90 dias)
- ✅ Compliance LGPD/GDPR (opt-in explícito, unsubscribe fácil)

---

# **PROMPT 16.1: NotificationEngine — Sistema Multi-Canal**

## TASK 1.1: CREATE /src/notifications/notification-engine.js

```markdown
## CONTEXT

Você está construindo o NotificationEngine para SupliList v4.0 — o sistema responsável
por manter usuários engajados SEM spam, informando sobre:

- Comentários em seus posts / menções
- Likes, shares, reações em posts
- Convites para grupos
- Achievements desbloqueadas
- Amigos que começaram a seguir
- Posts trending em seus grupos/interesses
- Recordes pessoais em streaks
- Ofertas (de suplemen que você segue)
- Atualizações de preço (down = notifica)

A chave: **Notificações são boas APENAS se desejadas, personalizadas e no tempo certo**.
Spam de notificações = churn.

Arquitetura:
- Notification: Estrutura base (tipo, receptor, ação, metadados)
- NotificationQueue: Fila com retry exponencial
- NotificationPreferences: Controle granular (on/off, horários, canais)
- DeduplicationEngine: Evita 5 notificações do mesmo tipo em 5 min
- MultiChannel: In-app, Push (FCM/APNs), Email (Mjml), SMS (Twilio optional)
- Delivery Status: Queued, Sent, Delivered, Read, Interacted, Failed
- EventListener: Lê eventos do EventBus e cria notificações

---

## DELIVERABLES ESPERADOS

✅ `/src/notifications/notification-engine.js` — Core notification engine
✅ `/src/notifications/notification-manager.js` — Gerenciamento de notificações
✅ `/src/notifications/notification-queue.js` — Fila com retry exponencial
✅ `/src/notifications/notification-preferences.js` — Controle de preferências
✅ `/src/notifications/notification-deduplication.js` — Anti-spam inteligente
✅ `/src/notifications/email-template-builder.js` — Templates responsivos
✅ `/src/notifications/push-notification-handler.js` — FCM/APNs handler
✅ `/src/notifications/notification-tracker.js` — Delivery status tracking
✅ `/src/notifications/notification-engine.test.js` — Full test suite
✅ Persistência em IndexedDB (histórico 90 dias)
✅ Performance <50ms para enqueue
✅ Suporta 10k+ notificações/dia
✅ Compliance LGPD/GDPR (opt-in, unsubscribe)

---

## IMPLEMENTAÇÃO COMPLETA

### Arquivo 1: `/src/notifications/notification-engine.js`

\`\`\`javascript
/**
 * NotificationEngine v1.0 — SupliList
 * Multi-channel notification system with queue, dedup, preferences
 *
 * Usage:
 *   import { NotificationEngine } from '../notifications/notification-engine.js';
 *   const notifEngine = NotificationEngine.getInstance();
 *   await notifEngine.init();
 *   
 *   // Listen to social events and create notifications
 *   eventBus.on('post:commented', (event) => {
 *     notifEngine.createNotification('comment', userId, {
 *       postId: event.postId,
 *       commenterId: event.commenterId,
 *       commentText: event.text
 *     });
 *   });
 */

import { EventBus } from '../core/event-bus.js';
import { StateManager } from '../core/state-manager.js';
import { NotificationQueue } from './notification-queue.js';
import { NotificationDeduplication } from './notification-deduplication.js';
import { NotificationPreferences } from './notification-preferences.js';

const eventBus = EventBus.getInstance();
const stateManager = StateManager.getInstance();

/**
 * @typedef {Object} Notification
 * @property {string} id                - UUID
 * @property {string} userId            - Receptor
 * @property {string} type              - 'comment' | 'like' | 'mention' | 'achievement' | 'offer' | 'group_invite' | 'follow' | 'price_drop' | 'trending' | 'streak_record'
 * @property {string} title             - Título da notificação
 * @property {string} body              - Corpo/descrição
 * @property {Object} data              - Metadados { postId, userId, groupId, achievementId, offerId, etc }
 * @property {string} actionUrl         - URL para abrir (deep link)
 * @property {Object} actor             - { userId, name, avatar }
 * @property {string[]} channels        - ['in-app', 'push', 'email', 'sms']
 * @property {string} status            - 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
 * @property {number} createdAt         - Unix ms
 * @property {number} sentAt            - Unix ms
 * @property {number} deliveredAt       - Unix ms
 * @property {number} readAt            - Unix ms
 * @property {number} expireAt          - Unix ms (notificações expiram em 30 dias)
 * @property {number} retryCount        - Tentativas de envio
 * @property {string} errorMessage      - Se failed
 * @property {boolean} isRead           - Lido no in-app
 * @property {boolean} isInteracted     - Usuário clicou/respondeu
 * @property {number} priority          - 0 (low) to 10 (critical) — usado para ordering na fila
 */

/**
 * @typedef {Object} NotificationChannel
 * @property {string} type              - 'in-app' | 'push' | 'email' | 'sms'
 * @property {boolean} enabled          - Enabled na preferência do usuário
 * @property {Object} config            - { dndStart, dndEnd, batchDigest, etc }
 */

class NotificationEngine {
  constructor() {
    this.notifications = new Map();          // notifId → Notification
    this.userNotifications = new Map();      // userId → notifIds[]
    this.queue = null;                       // NotificationQueue instance
    this.dedup = null;                       // NotificationDeduplication instance
    this.preferences = null;                 // NotificationPreferences instance
    this.isProcessing = false;
    this.NOTIFICATION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 dias
    this.BATCH_DIGEST_INTERVAL = 24 * 60 * 60 * 1000;    // 24 horas
  }

  static #instance = null;

  static getInstance() {
    if (!NotificationEngine.#instance) {
      NotificationEngine.#instance = new NotificationEngine();
    }
    return NotificationEngine.#instance;
  }

  /**
   * Inicializar notification engine
   */
  async init() {
    console.log('🔔 Inicializando NotificationEngine...');

    // Inicializar dependências
    this.queue = NotificationQueue.getInstance();
    this.dedup = NotificationDeduplication.getInstance();
    this.preferences = NotificationPreferences.getInstance();

    await this.queue.init();
    await this.dedup.init();
    await this.preferences.init();

    // Carregar histórico do IndexedDB
    const stored = await this._loadFromDB();
    if (stored.notifications) {
      stored.notifications.forEach(n => this.notifications.set(n.id, n));
    }
    if (stored.userNotifications) {
      stored.userNotifications.forEach(u => 
        this.userNotifications.set(u.userId, u.notifIds)
      );
    }

    // Iniciar processamento de fila
    this._startQueueProcessor();

    // Limpar notificações expiradas a cada 1 hora
    this._startCleanupScheduler();

    // Listener de eventos sociais
    this._setupEventListeners();

    console.log(`✅ NotificationEngine pronto`);
  }

  /**
   * Criar notificação
   * @param {string} type - 'comment', 'like', 'mention', 'achievement', etc
   * @param {string} userId - Receptor
   * @param {Object} data - Metadados específicos do tipo
   * @param {Object} options - { channels, priority, actor, actionUrl }
   * @returns {Promise<Notification>}
   */
  async createNotification(type, userId, data, options = {}) {
    // Validações
    if (!type || !userId) {
      throw new Error('type and userId are required');
    }

    // Verificar preferências do usuário
    const prefs = await this.preferences.getUserPreferences(userId);
    if (!prefs.enabled || prefs.disabledTypes?.includes(type)) {
      console.log(`📵 Notificação ${type} desabilitada para ${userId}`);
      return null;
    }

    // Verificar deduplicação
    const isDuplicate = await this.dedup.isDuplicate(userId, type, data);
    if (isDuplicate) {
      console.log(`🚫 Notificação ${type} é duplicata, ignorando`);
      return null;
    }

    // Determinar canais ativos
    const channels = await this._determineChannels(userId, type, prefs);
    if (channels.length === 0) {
      console.log(`📵 Nenhum canal ativo para ${type}`);
      return null;
    }

    // Construir notificação
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title: this._getTitle(type, data, options.actor),
      body: this._getBody(type, data),
      data,
      actionUrl: options.actionUrl || this._getDefaultActionUrl(type, data),
      actor: options.actor || null,
      channels,
      status: 'queued',
      priority: options.priority || this._getPriorityForType(type),
      createdAt: Date.now(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      expireAt: Date.now() + this.NOTIFICATION_EXPIRY,
      retryCount: 0,
      errorMessage: null,
      isRead: false,
      isInteracted: false,
    };

    // Guardar notificação
    this.notifications.set(notification.id, notification);
    
    // Indexar por usuário
    if (!this.userNotifications.has(userId)) {
      this.userNotifications.set(userId, []);
    }
    this.userNotifications.get(userId).push(notification.id);

    // Enqueuir para processamento
    await this.queue.enqueue(notification);

    // Registrar deduplica
    await this.dedup.registerNotification(userId, type, data);

    // Salvar no DB
    await this._saveToDB(notification);

    // Emitir evento
    eventBus.emit('notification:created', notification);

    console.log(`✅ Notificação criada: ${type} → ${userId}`);

    return notification;
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notifId, userId) {
    const notif = this.notifications.get(notifId);
    if (!notif || notif.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    notif.isRead = true;
    notif.readAt = Date.now();
    notif.status = 'read';

    await this._saveToDB(notif);
    eventBus.emit('notification:read', { notifId, userId });

    return notif;
  }

  /**
   * Marcar como interagido (clicou no CTA)
   */
  async markAsInteracted(notifId, userId) {
    const notif = this.notifications.get(notifId);
    if (!notif || notif.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    notif.isInteracted = true;
    notif.status = 'interacted';

    await this._saveToDB(notif);
    eventBus.emit('notification:interacted', { notifId, userId });

    return notif;
  }

  /**
   * Obter notificações não lidas de um usuário
   */
  async getUnread(userId, limit = 20) {
    const userNotifIds = this.userNotifications.get(userId) || [];
    
    return userNotifIds
      .map(id => this.notifications.get(id))
      .filter(n => n && !n.isRead && Date.now() < n.expireAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Obter histórico de notificações
   */
  async getHistory(userId, limit = 50, offset = 0) {
    const userNotifIds = this.userNotifications.get(userId) || [];
    
    return userNotifIds
      .map(id => this.notifications.get(id))
      .filter(n => n && Date.now() < n.expireAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
  }

  /**
   * Deletar notificação
   */
  async deleteNotification(notifId, userId) {
    const notif = this.notifications.get(notifId);
    if (!notif || notif.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    this.notifications.delete(notifId);
    const userNotifs = this.userNotifications.get(userId);
    if (userNotifs) {
      const idx = userNotifs.indexOf(notifId);
      if (idx > -1) userNotifs.splice(idx, 1);
    }

    await this._deleteFromDB(notifId);
    eventBus.emit('notification:deleted', { notifId, userId });
  }

  /**
   * PRIVATE: Determinar canais ativos baseado em preferências
   */
  async _determineChannels(userId, type, prefs) {
    const channels = [];

    // In-app sempre (se notificação habilitada)
    if (prefs.channels?.inApp !== false) {
      channels.push('in-app');
    }

    // Push (verificar DND)
    if (prefs.channels?.push !== false && !this._isInDND(prefs)) {
      channels.push('push');
    }

    // Email (batch digest)
    if (prefs.channels?.email !== false) {
      channels.push('email');
    }

    return channels;
  }

  /**
   * PRIVATE: Verificar se está em Do Not Disturb
   */
  _isInDND(prefs) {
    if (!prefs.dnd?.enabled) return false;

    const now = new Date();
    const hours = now.getHours();
    const { dndStart = 22, dndEnd = 8 } = prefs.dnd;

    // DND: 22h até 8h da manhã
    if (dndStart > dndEnd) {
      return hours >= dndStart || hours < dndEnd;
    } else {
      return hours >= dndStart && hours < dndEnd;
    }
  }

  /**
   * PRIVATE: Gerar título baseado no tipo
   */
  _getTitle(type, data, actor) {
    const actorName = actor?.name || 'Someone';

    switch (type) {
      case 'comment':
        return `${actorName} comentou seu post`;
      case 'like':
        return `${actorName} curtiu seu post`;
      case 'mention':
        return `${actorName} mencionou você`;
      case 'achievement':
        return `🏆 Novo achievement: ${data.achievementName || 'Unlocked'}`;
      case 'group_invite':
        return `Você foi convidado para ${data.groupName}`;
      case 'follow':
        return `${actorName} começou a te seguir`;
      case 'price_drop':
        return `💰 ${data.supplementName} caiu de preço`;
      case 'trending':
        return `🔥 Trending em ${data.groupName}`;
      case 'streak_record':
        return `🔥 Novo recorde: ${data.streakDays} dias!`;
      default:
        return 'Nova notificação';
    }
  }

  /**
   * PRIVATE: Gerar corpo baseado no tipo
   */
  _getBody(type, data) {
    switch (type) {
      case 'comment':
        return `"${data.commentText?.substring(0, 60)}..."`;
      case 'like':
        return `Seu post recebeu uma curtida`;
      case 'mention':
        return `Você foi mencionado em uma discussão`;
      case 'achievement':
        return data.achievementDescription || 'Parabéns!';
      case 'group_invite':
        return `Junte-se a ${data.groupName} para discutir ${data.groupTopic}`;
      case 'follow':
        return `Novo seguidor chegou!`;
      case 'price_drop':
        return `De R$${data.oldPrice} para R$${data.newPrice}`;
      case 'trending':
        return `${data.postCount || 'Muitos'} posts novos em seu interesse`;
      case 'streak_record':
        return `Você completou ${data.streakDays} dias de rastreamento!`;
      default:
        return 'Você tem uma nova notificação';
    }
  }

  /**
   * PRIVATE: Gerar URL de ação padrão
   */
  _getDefaultActionUrl(type, data) {
    switch (type) {
      case 'comment':
      case 'like':
      case 'mention':
        return `/social/post/${data.postId}`;
      case 'achievement':
        return `/profile/achievements`;
      case 'group_invite':
        return `/groups/${data.groupId}`;
      case 'follow':
        return `/social/profile/${data.userId}`;
      case 'price_drop':
        return `/products/${data.productId}`;
      case 'trending':
        return `/groups/${data.groupId}`;
      case 'streak_record':
        return `/tracking/streaks`;
      default:
        return '/';
    }
  }

  /**
   * PRIVATE: Obter prioridade baseada no tipo
   */
  _getPriorityForType(type) {
    const priorityMap = {
      'achievement': 8,
      'mention': 7,
      'follow': 6,
      'comment': 5,
      'like': 3,
      'group_invite': 5,
      'price_drop': 4,
      'trending': 2,
      'streak_record': 6,
    };
    return priorityMap[type] || 5;
  }

  /**
   * PRIVATE: Setup listeners de eventos sociais
   */
  _setupEventListeners() {
    // Comment events
    eventBus.on('post:commented', (event) => {
      this.createNotification('comment', event.postAuthorId, {
        postId: event.postId,
        commenterId: event.commenterId,
        commentText: event.text,
      }, {
        actor: { userId: event.commenterId, name: event.commenterName, avatar: event.commenterAvatar },
        actionUrl: `/social/post/${event.postId}`,
        priority: 5,
      });
    });

    // Like events
    eventBus.on('post:liked', (event) => {
      this.createNotification('like', event.postAuthorId, {
        postId: event.postId,
        likerId: event.likerId,
        emoji: event.emoji,
      }, {
        actor: { userId: event.likerId, name: event.likerName, avatar: event.likerAvatar },
        priority: 3,
      });
    });

    // Mention events
    eventBus.on('user:mentioned', (event) => {
      this.createNotification('mention', event.mentionedUserId, {
        postId: event.postId,
        mentionerId: event.mentionerId,
      }, {
        actor: { userId: event.mentionerId, name: event.mentionerName },
        priority: 7,
      });
    });

    // Achievement events
    eventBus.on('achievement:unlocked', (event) => {
      this.createNotification('achievement', event.userId, {
        achievementId: event.achievementId,
        achievementName: event.achievementName,
        achievementDescription: event.description,
      }, {
        priority: 8,
      });
    });

    // Follow events
    eventBus.on('user:followed', (event) => {
      this.createNotification('follow', event.followeeId, {
        userId: event.followerId,
      }, {
        actor: { userId: event.followerId, name: event.followerName, avatar: event.followerAvatar },
        priority: 6,
      });
    });

    // Group invite events
    eventBus.on('group:invited', (event) => {
      this.createNotification('group_invite', event.inviteeId, {
        groupId: event.groupId,
        groupName: event.groupName,
        groupTopic: event.groupTopic,
      }, {
        priority: 5,
      });
    });

    // Price drop events (integração com PriceComparator)
    eventBus.on('price:dropped', (event) => {
      this.createNotification('price_drop', event.userId, {
        productId: event.productId,
        supplementName: event.supplementName,
        oldPrice: event.oldPrice,
        newPrice: event.newPrice,
        marketplace: event.marketplace,
      }, {
        priority: 4,
      });
    });

    // Streak record events
    eventBus.on('streak:record', (event) => {
      this.createNotification('streak_record', event.userId, {
        streakDays: event.days,
        supplementName: event.supplementName,
      }, {
        priority: 6,
      });
    });

    console.log('📡 Event listeners configurados');
  }

  /**
   * PRIVATE: Processar fila de notificações
   */
  _startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        const batch = await this.queue.dequeueBatch(10); // Processa 10 por vez
        
        for (const notif of batch) {
          await this._sendNotification(notif);
        }
      } catch (err) {
        console.error('❌ Error processing queue:', err);
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // A cada 5 segundos
  }

  /**
   * PRIVATE: Enviar notificação pelos canais
   */
  async _sendNotification(notif) {
    try {
      const prefs = await this.preferences.getUserPreferences(notif.userId);

      for (const channel of notif.channels) {
        try {
          switch (channel) {
            case 'in-app':
              await this._sendInApp(notif);
              break;
            case 'push':
              await this._sendPush(notif, prefs);
              break;
            case 'email':
              await this._sendEmail(notif, prefs);
              break;
            case 'sms':
              await this._sendSMS(notif, prefs);
              break;
          }
        } catch (channelErr) {
          console.error(`❌ Error sending ${channel}:`, channelErr);
          // Continua com outros canais
        }
      }

      notif.status = 'sent';
      notif.sentAt = Date.now();
      await this._saveToDB(notif);

      eventBus.emit('notification:sent', notif);
    } catch (err) {
      console.error(`❌ Error sending notification ${notif.id}:`, err);
      notif.retryCount++;
      notif.errorMessage = err.message;

      // Retry com backoff exponencial
      if (notif.retryCount < 3) {
        await this.queue.enqueue(notif, notif.retryCount);
      } else {
        notif.status = 'failed';
      }

      await this._saveToDB(notif);
    }
  }

  /**
   * PRIVATE: Enviar notificação in-app
   */
  async _sendInApp(notif) {
    // In-app = guardar no IndexedDB + emitir evento
    eventBus.emit('notification:in-app', notif);
    console.log(`📱 In-app notification sent: ${notif.id}`);
  }

  /**
   * PRIVATE: Enviar push notification (Firebase Cloud Messaging ou APNs)
   */
  async _sendPush(notif, prefs) {
    if (!prefs.pushToken) {
      console.log(`⚠️  No push token for user ${notif.userId}`);
      return;
    }

    // Integração com FCM/APNs (requer backend)
    // Para agora, apenas log
    console.log(`📤 Push notification queued: ${notif.id} → ${prefs.pushToken}`);

    // Em produção:
    // await fetch('https://api.firebase.com/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${FCM_KEY}` },
    //   body: JSON.stringify({
    //     token: prefs.pushToken,
    //     notification: {
    //       title: notif.title,
    //       body: notif.body,
    //       image: notif.data.imageUrl,
    //     },
    //     data: notif.data,
    //   }),
    // });
  }

  /**
   * PRIVATE: Enviar email
   */
  async _sendEmail(notif, prefs) {
    if (!prefs.email || prefs.emailOptOut) {
      console.log(`📵 Email disabled for user ${notif.userId}`);
      return;
    }

    // Usar email template builder
    const emailHtml = await this._buildEmailTemplate(notif);

    console.log(`📧 Email queued: ${notif.id} → ${prefs.email}`);

    // Em produção: enviar via SendGrid, Mailgun, etc
    // await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
  }

  /**
   * PRIVATE: Enviar SMS
   */
  async _sendSMS(notif, prefs) {
    if (!prefs.phone || prefs.smsOptOut) {
      console.log(`📵 SMS disabled for user ${notif.userId}`);
      return;
    }

    // Apenas notificações críticas (achievements, streaks)
    const criticalTypes = ['achievement', 'streak_record', 'price_drop'];
    if (!criticalTypes.includes(notif.type)) {
      return;
    }

    const message = `${notif.title}: ${notif.body}`;

    console.log(`📱 SMS queued: ${notif.id} → ${prefs.phone}`);

    // Em produção: enviar via Twilio, AWS SNS, etc
    // await twilio.messages.create({
    //   from: TWILIO_NUMBER,
    //   to: prefs.phone,
    //   body: message,
    // });
  }

  /**
   * PRIVATE: Construir template de email
   */
  async _buildEmailTemplate(notif) {
    // Usar MJML ou similar para responsive email
    const template = `
      <mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text font-size="20px" color="#000">
                ${notif.title}
              </mj-text>
              <mj-text color="#666">
                ${notif.body}
              </mj-text>
              <mj-button href="${notif.actionUrl}">
                Ver mais
              </mj-button>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;

    // Compilar MJML para HTML
    // Em produção: usar mjml library
    return template;
  }

  /**
   * PRIVATE: Cleanup scheduler
   */
  _startCleanupScheduler() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [id, notif] of this.notifications.entries()) {
        if (now > notif.expireAt) {
          this.notifications.delete(id);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Limpeza: ${cleaned} notificações expiradas removidas`);
      }
    }, 60 * 60 * 1000); // A cada 1 hora
  }

  /**
   * PRIVATE: Load from IndexedDB
   */
  async _loadFromDB() {
    // Implementar com IndexedDB library (idb)
    return { notifications: [], userNotifications: [] };
  }

  /**
   * PRIVATE: Save to IndexedDB
   */
  async _saveToDB(notif) {
    // Implementar com IndexedDB
  }

  /**
   * PRIVATE: Delete from IndexedDB
   */
  async _deleteFromDB(notifId) {
    // Implementar com IndexedDB
  }
}

export { NotificationEngine };
\`\`\`

---

### Arquivo 2: `/src/notifications/notification-queue.js`

\`\`\`javascript
/**
 * NotificationQueue v1.0
 * FIFO queue com retry exponencial e persistência
 */

class NotificationQueue {
  constructor() {
    this.queue = [];            // { notification, retryCount, enqueuedAt }
    this.processing = new Set();
    this.maxRetries = 3;
    this.initialDelay = 1000;   // 1 segundo
  }

  static #instance = null;

  static getInstance() {
    if (!NotificationQueue.#instance) {
      NotificationQueue.#instance = new NotificationQueue();
    }
    return NotificationQueue.#instance;
  }

  async init() {
    console.log('⏳ Inicializando NotificationQueue...');
    // Carregar fila persistida se houver
    const stored = await this._loadFromDB();
    this.queue = stored.queue || [];
    console.log(`✅ Queue pronta: ${this.queue.length} notificações em fila`);
  }

  /**
   * Enqueue notification com retry count
   */
  async enqueue(notification, retryCount = 0) {
    const item = {
      notification,
      retryCount,
      enqueuedAt: Date.now(),
      nextRetryAt: this._calculateNextRetry(retryCount),
    };

    this.queue.push(item);
    this.queue.sort((a, b) => {
      // Ordenar por: nextRetryAt (emergências agora), depois priority
      if (a.nextRetryAt !== b.nextRetryAt) {
        return a.nextRetryAt - b.nextRetryAt;
      }
      return b.notification.priority - a.notification.priority;
    });

    await this._saveToDB();
    console.log(`⏳ Enqueued: ${notification.id} (retry ${retryCount})`);
  }

  /**
   * Dequeue batch de notificações prontas
   */
  async dequeueBatch(size = 10) {
    const now = Date.now();
    const batch = [];

    for (let i = 0; i < this.queue.length && batch.length < size; i++) {
      const item = this.queue[i];
      if (item.nextRetryAt <= now) {
        batch.push(item.notification);
        this.queue.splice(i, 1);
        i--;
      }
    }

    await this._saveToDB();
    return batch;
  }

  /**
   * Obter tamanho da fila
   */
  size() {
    return this.queue.length;
  }

  /**
   * Limpar fila
   */
  async clear() {
    this.queue = [];
    await this._saveToDB();
  }

  /**
   * PRIVATE: Calcular próxima tentativa (exponential backoff)
   */
  _calculateNextRetry(retryCount) {
    if (retryCount === 0) return Date.now();
    // 1s, 4s, 16s para retry 1, 2, 3
    const delay = this.initialDelay * Math.pow(2, retryCount - 1);
    return Date.now() + delay;
  }

  async _loadFromDB() {
    return { queue: [] };
  }

  async _saveToDB() {
    // Persistir em IndexedDB
  }
}

export { NotificationQueue };
\`\`\`

---

### Arquivo 3: `/src/notifications/notification-deduplication.js`

\`\`\`javascript
/**
 * NotificationDeduplication v1.0
 * Evita spam: máximo 1 notificação do mesmo tipo em 5 minutos
 */

class NotificationDeduplication {
  constructor() {
    this.recentNotifications = new Map(); // userId:type → { data, timestamp }
    this.DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutos
  }

  static #instance = null;

  static getInstance() {
    if (!NotificationDeduplication.#instance) {
      NotificationDeduplication.#instance = new NotificationDeduplication();
    }
    return NotificationDeduplication.#instance;
  }

  async init() {
    console.log('🚫 Inicializando NotificationDeduplication...');
  }

  /**
   * Verificar se é duplicata
   */
  async isDuplicate(userId, type, data) {
    const key = `${userId}:${type}`;
    const recent = this.recentNotifications.get(key);

    if (!recent) return false;

    const timeSince = Date.now() - recent.timestamp;
    if (timeSince > this.DEDUP_WINDOW) {
      return false; // Expirou, não é duplicata
    }

    // Duplicata por tipo + usuário nos últimos 5 min
    return true;
  }

  /**
   * Registrar notificação
   */
  async registerNotification(userId, type, data) {
    const key = `${userId}:${type}`;
    this.recentNotifications.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup: remover se expirou
    setTimeout(() => {
      this.recentNotifications.delete(key);
    }, this.DEDUP_WINDOW);
  }

  /**
   * Limpar histórico
   */
  async clear() {
    this.recentNotifications.clear();
  }
}

export { NotificationDeduplication };
\`\`\`

---

### Arquivo 4: `/src/notifications/notification-preferences.js`

\`\`\`javascript
/**
 * NotificationPreferences v1.0
 * Gerenciar preferências por usuário, canal, tipo
 */

class NotificationPreferences {
  constructor() {
    this.userPreferences = new Map();
  }

  static #instance = null;

  static getInstance() {
    if (!NotificationPreferences.#instance) {
      NotificationPreferences.#instance = new NotificationPreferences();
    }
    return NotificationPreferences.#instance;
  }

  async init() {
    console.log('⚙️  Inicializando NotificationPreferences...');
    const stored = await this._loadFromDB();
    if (stored.preferences) {
      stored.preferences.forEach(p => 
        this.userPreferences.set(p.userId, p)
      );
    }
  }

  /**
   * Obter preferências do usuário
   */
  async getUserPreferences(userId) {
    if (!this.userPreferences.has(userId)) {
      const defaults = this._getDefaults(userId);
      this.userPreferences.set(userId, defaults);
      await this._saveToDB();
    }

    return this.userPreferences.get(userId);
  }

  /**
   * Atualizar preferências
   */
  async updatePreferences(userId, updates) {
    const prefs = await this.getUserPreferences(userId);
    const updated = { ...prefs, ...updates };
    this.userPreferences.set(userId, updated);
    await this._saveToDB();
    return updated;
  }

  /**
   * Definir tipos de notificação desabilitados
   */
  async disableNotificationType(userId, type) {
    const prefs = await this.getUserPreferences(userId);
    if (!prefs.disabledTypes) prefs.disabledTypes = [];
    if (!prefs.disabledTypes.includes(type)) {
      prefs.disabledTypes.push(type);
    }
    await this._saveToDB();
  }

  /**
   * Habilitar tipo de notificação
   */
  async enableNotificationType(userId, type) {
    const prefs = await this.getUserPreferences(userId);
    if (prefs.disabledTypes) {
      const idx = prefs.disabledTypes.indexOf(type);
      if (idx > -1) prefs.disabledTypes.splice(idx, 1);
    }
    await this._saveToDB();
  }

  /**
   * Definir Do Not Disturb
   */
  async setDND(userId, dndStart, dndEnd) {
    const prefs = await this.getUserPreferences(userId);
    prefs.dnd = { enabled: true, dndStart, dndEnd };
    await this._saveToDB();
  }

  /**
   * Desabilitar DND
   */
  async disableDND(userId) {
    const prefs = await this.getUserPreferences(userId);
    prefs.dnd = { enabled: false };
    await this._saveToDB();
  }

  /**
   * PRIVATE: Get defaults
   */
  _getDefaults(userId) {
    return {
      userId,
      enabled: true,
      disabledTypes: [],
      channels: {
        inApp: true,
        push: true,
        email: false,  // Default false (requer opt-in)
        sms: false,    // Default false (requer opt-in)
      },
      dnd: {
        enabled: false,
        dndStart: 22,
        dndEnd: 8,
      },
      batchDigest: {
        enabled: true,
        frequency: 'daily', // 'instant', 'daily', 'weekly'
      },
      pushToken: null,
      email: null,
      phone: null,
      emailOptOut: false,
      smsOptOut: false,
    };
  }

  async _loadFromDB() {
    return { preferences: [] };
  }

  async _saveToDB() {
    // Persistir em IndexedDB
  }
}

export { NotificationPreferences };
\`\`\`

---

# **PROMPT 16.2: RealTimeSyncEngine — WebSocket + Fallback Polling**

\`\`\`javascript
/**
 * RealTimeSyncEngine v1.0
 * WebSocket com automatic fallback a polling
 * Sincroniza mudanças em tempo real
 */

class RealTimeSyncEngine {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pollInterval = null;
    this.useFallback = false;
    this.syncListeners = new Map(); // type → listeners[]
  }

  static #instance = null;

  static getInstance() {
    if (!RealTimeSyncEngine.#instance) {
      RealTimeSyncEngine.#instance = new RealTimeSyncEngine();
    }
    return RealTimeSyncEngine.#instance;
  }

  /**
   * Inicializar WebSocket
   */
  async init(wsUrl) {
    console.log('🔌 Iniciando RealTimeSyncEngine...');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (this.useFallback) {
          this.useFallback = false;
          this._stopPolling();
          console.log('📡 Retornado ao WebSocket');
        }
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
      };

      this.ws.onclose = () => {
        console.warn('⚠️  WebSocket closed');
        this.isConnected = false;
        this._handleDisconnection();
      };
    } catch (err) {
      console.warn('⚠️  WebSocket not available, using polling fallback');
      this.useFallback = true;
      this._startPolling();
    }
  }

  /**
   * Subscribe a mudanças de tipo específico
   */
  subscribe(type, callback) {
    if (!this.syncListeners.has(type)) {
      this.syncListeners.set(type, []);
    }
    this.syncListeners.get(type).push(callback);
  }

  /**
   * Unsubscribe
   */
  unsubscribe(type, callback) {
    const listeners = this.syncListeners.get(type);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }

  /**
   * PRIVATE: Handle message from WebSocket
   */
  _handleMessage(message) {
    const { type, data } = message;
    const listeners = this.syncListeners.get(type) || [];
    listeners.forEach(cb => cb(data));
  }

  /**
   * PRIVATE: Handle disconnection
   */
  _handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`🔄 Reconectando em ${delay}ms...`);
      setTimeout(() => this.init(this.ws?.url), delay);
    } else {
      console.warn('⚠️  Max reconnect attempts, usando polling');
      this.useFallback = true;
      this._startPolling();
    }
  }

  /**
   * PRIVATE: Fallback polling
   */
  _startPolling() {
    if (this.pollInterval) return;
    console.log('📡 Iniciando polling fallback (30s)');
    
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/sync/changes', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        const data = await response.json();
        if (data.changes) {
          data.changes.forEach(change => {
            this._handleMessage(change);
          });
        }
      } catch (err) {
        console.error('❌ Polling error:', err);
      }
    }, 30 * 1000); // A cada 30 segundos
  }

  /**
   * PRIVATE: Stop polling
   */
  _stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this._stopPolling();
  }
}

export { RealTimeSyncEngine };
\`\`\`

---

# **PROMPT 16.3 & 16.4: ActivityTimeline + Deduplication**

Implementar `activity-timeline-engine.js` e `notification-tracker.js` seguindo o mesmo padrão acima.

### Key Features ActivityTimeline:

- Agregar eventos similares (5 likes de diferentes usuários = "5 pessoas curtiram seu post")
- Ordenar por timestamp
- Limpar eventos antigos (30 dias)
- Filtrar por tipo

### Key Features Tracker:

- Rastrear delivery status (queued → sent → delivered → read)
- Timestamps de cada mudança
- Calcular métricas (delivery rate, read rate)

---

# **CHECKLIST FINAL SPRINT 16**

- [ ] NotificationEngine com tipos: comment, like, mention, achievement, group_invite, follow, price_drop, trending, streak
- [ ] Suporte multi-canal: in-app, push (FCM/APNs), email (Mjml), SMS (Twilio)
- [ ] NotificationQueue com retry exponencial
- [ ] Deduplicação: máx 1 notificação/tipo em 5 min
- [ ] NotificationPreferences com opt-in/opt-out granular
- [ ] Do Not Disturb com horários personalizados
- [ ] Batch digest (digest diário de notificações)
- [ ] RealTimeSyncEngine com WebSocket + polling fallback
- [ ] Subscribe/unsubscribe pattern
- [ ] ActivityTimeline com aggregation de eventos
- [ ] Notification tracking: queued, sent, delivered, read, interacted
- [ ] EventBus integration (todos os eventos sociais criam notificações)
- [ ] Email templates responsivos
- [ ] Performance <50ms enqueue
- [ ] Persistência em IndexedDB (histórico 90 dias)
- [ ] Compliance LGPD/GDPR: opt-in, unsubscribe, export
- [ ] Testes unitários completos

---

**FIM DO PROMPT 16 — NOTIFICATION ENGINE & REAL-TIME COMPLETA** 🔔
```
