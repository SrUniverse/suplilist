import { eventBus } from '../../core/event-bus.js';
import { logger } from '../../utils/logger.js';
import { getSupplementId } from '../../utils/stack.js';

export default class ShareService {
  /**
   * Encodes a stack list to a base64 URL query string.
   * Handles non-ASCII characters gracefully.
   * @param {Array} stack
   * @returns {string} shareable URL
   */
  generateShareUrl(stack) {
    if (!stack || !stack.length) return '';
    const cleanData = stack.map(item => ({
      name: item.name,
      supplementId: getSupplementId(item),
      quantity: item.quantity,
      dosage: item.dosage,
      frequency: item.frequency,
      timeOfDay: item.timeOfDay,
      notes: item.notes || ''
    }));
    
    const str = JSON.stringify(cleanData);
    // Safe base64 encoding supporting UTF-8 characters
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return `${window.location.origin}/my-stack?stack=${base64}`;
  }

  /**
   * Formats stack items into a beautiful markdown/text description.
   * @param {Array} stack
   * @returns {string}
   */
  formatStackText(stack) {
    if (!stack || !stack.length) return 'Meu stack de suplementação está vazio.';
    let text = '💊 Meu Stack de Suplementação no SupliList:\n\n';
    stack.forEach(item => {
      text += `• ${item.name} — Dose: ${item.dosage} (Tomar: ${item.timeOfDay || 'qualquer horário'})\n`;
    });
    text += '\nAcompanhe e calcule suas doses em suplilist.com';
    return text;
  }

  /**
   * Shares the stack using native navigator.share or copies it to clipboard.
   * @param {Array} stack
   * @returns {Promise<boolean>} True if shared or copied.
   */
  async shareStack(stack) {
    if (!stack || !stack.length) return false;
    const url = this.generateShareUrl(stack);
    const _text = this.formatStackText(stack);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu Stack | SupliList',
          text: 'Confira meu protocolo personalizado de suplementos!',
          url: url
        });
        return true;
      } catch (err) {
        // Share can be cancelled by user, which is a normal rejection
        if (err.name !== 'AbortError') {
          logger.error('[ShareService] Native share failed:', err);
        }
      }
    }

    // Fallback: Copy to clipboard
    return this.copyToClipboard(url, 'Link do stack copiado para a área de transferência!');
  }

  /**
   * Shares check-in streak status.
   * @param {number} streakDays
   * @returns {Promise<boolean>}
   */
  async shareStreak(streakDays) {
    if (!streakDays) return false;
    const text = `🔥 Minha constância está em dia! Alcancei um streak de ${streakDays} dias seguidos registrando meu consumo no SupliList. 💊`;
    const url = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Constância | SupliList',
          text: text,
          url: url
        });
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          logger.error('[ShareService] Native streak share failed:', err);
        }
      }
    }

    // Fallback
    return this.copyToClipboard(`${text} Acesse: ${url}`, 'Mensagem de streak copiada com sucesso!');
  }

  /**
   * Copy text to clipboard and dispatch a success toast
   * @param {string} text
   * @param {string} successMessage
   * @returns {Promise<boolean>}
   */
  async copyToClipboard(text, successMessage = 'Copiado para a área de transferência!') {
    try {
      await navigator.clipboard.writeText(text);
      eventBus.emit('toast:show', { message: successMessage, type: 'success' });
      return true;
    } catch (err) {
      logger.error('[ShareService] Clipboard copy failed:', err);
      // Fallback: prompt input
      window.prompt('Copie o link de compartilhamento:', text);
      return true;
    }
  }

  /**
   * Pre-filled WhatsApp link
   */
  getWhatsAppLink(text, url) {
    const fullText = `${text}\n\nLink do Stack:\n${url}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
  }

  /**
   * Pre-filled Telegram link
   */
  getTelegramLink(text, url) {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
}
