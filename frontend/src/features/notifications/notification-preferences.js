/**
 * Notification Preferences Component — Configure smart notifications
 * Allows users to set optimal notification time and toggle types
 */

import { stateManager } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';

export class NotificationPreferences {
  constructor(container) {
    this.container = container;
    this.preferences = {
      enabled: true,
      dailyReminder: true,
      streakAlerts: true,
      milestones: true,
      comebackReminders: true,
      socialNotifications: false
    };
    this.optimalTime = { hour: 8, minute: 0, confidence: 0 };
    this.isLoading = false;
  }

  async mount() {
    this._injectStyles();
    await this._loadPreferences();
    this._render();
    this._attachListeners();
  }

  async _loadPreferences() {
    try {
      this.isLoading = true;
      const token = stateManager.select(s => s.auth?.token);

      const response = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        this.preferences = data.preferences;
        this.optimalTime = data.optimalTime;
      }
    } catch (error) {
      logger.error('[NotificationPreferences] Error loading:', error);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Erro ao carregar preferências',
        type: 'error'
      });
    } finally {
      this.isLoading = false;
    }
  }

  _render() {
    const html = `
      <div class="notif-prefs-root">
        <div class="notif-prefs-header">
          <h2 class="notif-prefs-title">🔔 Notificações Inteligentes</h2>
          <p class="notif-prefs-subtitle">Configure quando e como você quer ser notificado</p>
        </div>

        <!-- Optimal Time Section -->
        <div class="notif-prefs-card">
          <div class="notif-prefs-section-title">
            ⏰ Horário Ideal
            <span class="notif-prefs-badge">${this.optimalTime.confidence > 0.5 ? 'Detectado' : 'Padrão'}</span>
          </div>
          <p class="notif-prefs-description">
            Com base em seu histórico, o melhor horário é ${this.optimalTime.hour.toString().padStart(2, '0')}:${this.optimalTime.minute.toString().padStart(2, '0')}
          </p>

          <div class="notif-prefs-time-picker">
            <div class="notif-prefs-time-input">
              <label>Hora</label>
              <input type="number" id="notif-hour" min="0" max="23"
                value="${this.optimalTime.hour}" class="notif-prefs-input">
            </div>
            <span class="notif-prefs-time-sep">:</span>
            <div class="notif-prefs-time-input">
              <label>Minuto</label>
              <input type="number" id="notif-minute" min="0" max="59" step="15"
                value="${this.optimalTime.minute}" class="notif-prefs-input">
            </div>
            <button id="btn-save-time" class="notif-prefs-btn-save">Salvar</button>
          </div>

          <div class="notif-prefs-info">
            💡 Notificações serão enviadas diariamente neste horário.
          </div>
        </div>

        <!-- Toggle Sections -->
        <div class="notif-prefs-card">
          <div class="notif-prefs-toggle-group">
            ${this._renderToggle(
              'dailyReminder',
              '💊 Lembrete Diário',
              'Notificações diárias para cada suplemento'
            )}
            ${this._renderToggle(
              'streakAlerts',
              '🔥 Alertas de Streak',
              'Avisos quando seu streak está em risco (3+ dias sem registrar)'
            )}
            ${this._renderToggle(
              'milestones',
              '🎉 Celebrações de Marcos',
              'Comemorações em 7, 30, 100 dias de aderência'
            )}
            ${this._renderToggle(
              'comebackReminders',
              '👋 Lembretes de Volta',
              'Mensagens amigáveis quando você para de usar um suplemento'
            )}
            ${this._renderToggle(
              'socialNotifications',
              '👥 Notificações Sociais',
              'Desafios e comparação com amigos (coming soon)'
            )}
          </div>
        </div>

        <!-- Analytics Section -->
        <div class="notif-prefs-card">
          <div class="notif-prefs-section-title">📊 Engagement</div>
          <div id="notif-analytics-placeholder" class="notif-prefs-loading">
            Carregando estatísticas...
          </div>
        </div>

        <!-- Test Notification -->
        <div class="notif-prefs-card notif-prefs-card--highlight">
          <div class="notif-prefs-section-title">🧪 Testar Notificação</div>
          <button id="btn-test-notification" class="notif-prefs-btn-primary">
            Enviar notificação de teste
          </button>
          <p class="notif-prefs-small">Você receberá uma notificação em alguns segundos</p>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  _renderToggle(key, label, description) {
    const isEnabled = this.preferences[key] ?? true;
    return `
      <div class="notif-prefs-toggle">
        <div class="notif-prefs-toggle-content">
          <div class="notif-prefs-toggle-label">${label}</div>
          <div class="notif-prefs-toggle-desc">${description}</div>
        </div>
        <input type="checkbox" id="toggle-${key}" ${isEnabled ? 'checked' : ''}
          class="notif-prefs-checkbox" data-key="${key}">
        <label for="toggle-${key}" class="notif-prefs-toggle-switch"></label>
      </div>
    `;
  }

  _attachListeners() {
    // Time picker
    this.container.querySelector('#btn-save-time')?.addEventListener('click', async () => {
      await this._saveTime();
    });

    // Toggles
    this.container.querySelectorAll('.notif-prefs-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.preferences[e.target.dataset.key] = e.target.checked;
        this._savePreferences();
      });
    });

    // Test notification
    this.container.querySelector('#btn-test-notification')?.addEventListener('click', async () => {
      await this._sendTestNotification();
    });

    // Load analytics
    this._loadAnalytics();
  }

  async _saveTime() {
    try {
      const hour = parseInt(this.container.querySelector('#notif-hour').value);
      const minute = parseInt(this.container.querySelector('#notif-minute').value);

      if (isNaN(hour) || hour < 0 || hour > 23) {
        throw new Error('Hora inválida');
      }

      if (isNaN(minute) || minute < 0 || minute > 59) {
        throw new Error('Minuto inválido');
      }

      const token = stateManager.select(s => s.auth?.token);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preferences: this.preferences,
          preferredHour: hour
        })
      });

      const data = await response.json();
      if (data.success) {
        this.optimalTime = { hour, minute, confidence: 1 };
        eventBus.emit(EVENTS.TOAST_SHOW, {
          message: '✓ Horário atualizado',
          type: 'success'
        });
      }
    } catch (error) {
      logger.error('[NotificationPreferences] Error saving time:', error);
      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Erro ao salvar horário',
        type: 'error'
      });
    }
  }

  async _savePreferences() {
    try {
      const token = stateManager.select(s => s.auth?.token);
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences: this.preferences })
      });
    } catch (error) {
      logger.error('[NotificationPreferences] Error saving preferences:', error);
    }
  }

  async _sendTestNotification() {
    try {
      const btn = this.container.querySelector('#btn-test-notification');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const token = stateManager.select(s => s.auth?.token);
      const response = await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        eventBus.emit(EVENTS.TOAST_SHOW, {
          message: '✓ Notificação de teste enviada!',
          type: 'success'
        });
      }

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Enviar notificação de teste';
      }, 2000);
    } catch (error) {
      logger.error('[NotificationPreferences] Error sending test:', error);
    }
  }

  async _loadAnalytics() {
    try {
      const token = stateManager.select(s => s.auth?.token);
      const response = await fetch('/api/notifications/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.stats) {
        const html = `
          <div class="notif-prefs-stats">
            <div class="notif-prefs-stat">
              <span class="notif-prefs-stat-value">${data.stats.sent}</span>
              <span class="notif-prefs-stat-label">Enviadas</span>
            </div>
            <div class="notif-prefs-stat">
              <span class="notif-prefs-stat-value">${data.metrics.openRate}</span>
              <span class="notif-prefs-stat-label">Taxa de abertura</span>
            </div>
            <div class="notif-prefs-stat">
              <span class="notif-prefs-stat-value">${data.metrics.clickRate}</span>
              <span class="notif-prefs-stat-label">Taxa de click</span>
            </div>
          </div>
        `;
        const placeholder = this.container.querySelector('#notif-analytics-placeholder');
        if (placeholder) placeholder.innerHTML = html;
      }
    } catch (error) {
      logger.debug('[NotificationPreferences] Could not load analytics:', error);
    }
  }

  _injectStyles() {
    if (document.getElementById('notif-prefs-styles')) return;

    const style = document.createElement('style');
    style.id = 'notif-prefs-styles';
    style.textContent = `
      .notif-prefs-root {
        padding: 20px 16px 100px;
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
      }

      .notif-prefs-header {
        margin-bottom: 24px;
      }

      .notif-prefs-title {
        font-size: 24px;
        font-weight: 800;
        margin: 0 0 8px;
        color: var(--color-text-primary);
      }

      .notif-prefs-subtitle {
        font-size: 14px;
        color: var(--color-text-muted);
        margin: 0;
      }

      .notif-prefs-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .notif-prefs-card--highlight {
        background: linear-gradient(135deg, var(--color-brand-muted, rgba(139,92,246,0.08)) 0%, transparent 100%);
        border-color: var(--color-border-brand, rgba(139,92,246,0.20));
      }

      .notif-prefs-section-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .notif-prefs-badge {
        font-size: 11px;
        background: var(--ev-a-bg, rgba(52,211,153,0.12));
        color: var(--ev-a, #34D399);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
      }

      .notif-prefs-description {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0 0 16px;
      }

      .notif-prefs-time-picker {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        margin-bottom: 12px;
      }

      .notif-prefs-time-input {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .notif-prefs-time-input label {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
      }

      .notif-prefs-input {
        padding: 8px 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        font-size: 14px;
        font-family: 'Inter', sans-serif;
      }

      .notif-prefs-input:focus {
        border-color: var(--color-brand);
        outline: none;
      }

      .notif-prefs-time-sep {
        font-size: 18px;
        color: var(--color-text-muted);
        margin-bottom: 8px;
      }

      .notif-prefs-btn-save {
        padding: 8px 16px;
        background: var(--color-brand);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 150ms;
        font-family: 'Inter', sans-serif;
      }

      .notif-prefs-btn-save:hover {
        background: var(--color-brand-hover);
      }

      .notif-prefs-info {
        font-size: 12px;
        color: var(--color-text-muted);
        padding: 8px 12px;
        background: var(--color-bg-primary);
        border-radius: 8px;
      }

      .notif-prefs-toggle-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .notif-prefs-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }

      .notif-prefs-toggle:last-child {
        border-bottom: none;
      }

      .notif-prefs-toggle-content {
        flex: 1;
      }

      .notif-prefs-toggle-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .notif-prefs-toggle-desc {
        font-size: 12px;
        color: var(--color-text-muted);
        margin-top: 2px;
      }

      .notif-prefs-checkbox {
        display: none;
      }

      .notif-prefs-toggle-switch {
        width: 48px;
        height: 28px;
        background: var(--color-border);
        border-radius: 14px;
        display: inline-block;
        position: relative;
        cursor: pointer;
        transition: background 150ms;
        flex-shrink: 0;
      }

      .notif-prefs-toggle-switch::before {
        content: '';
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: left 150ms;
      }

      .notif-prefs-checkbox:checked + .notif-prefs-toggle-switch {
        background: var(--color-brand);
      }

      .notif-prefs-checkbox:checked + .notif-prefs-toggle-switch::before {
        left: 22px;
      }

      .notif-prefs-btn-primary {
        width: 100%;
        padding: 12px;
        background: var(--color-brand);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 150ms;
        font-family: 'Inter', sans-serif;
      }

      .notif-prefs-btn-primary:hover {
        background: var(--color-brand-hover);
      }

      .notif-prefs-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .notif-prefs-small {
        font-size: 12px;
        color: var(--color-text-muted);
        margin-top: 8px;
        text-align: center;
      }

      .notif-prefs-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .notif-prefs-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px;
        background: var(--color-bg-primary);
        border-radius: 10px;
      }

      .notif-prefs-stat-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-brand);
      }

      .notif-prefs-stat-label {
        font-size: 11px;
        color: var(--color-text-muted);
        text-align: center;
      }

      .notif-prefs-loading {
        padding: 20px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
  }
}

export default NotificationPreferences;
