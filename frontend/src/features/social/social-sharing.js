/**
 * Social Sharing â€” Share achievement streak on social media
 * Increases viral potential through WhatsApp, Twitter, LinkedIn
 */

import { stateManager } from '../../state/state-manager.js';
import { logger } from '../../utils/logger.js';

export class SocialSharing {
  constructor() {
    this.shareBaseUrl = window.location.origin;
    this.referralCode = null;
  }

  /**
   * Share streak on WhatsApp
   */
  shareStreakWhatsApp(streak, adherence) {
    const message = this.generateStreakMessage(streak, adherence);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedMessage}`;

    window.open(url, '_blank');
    logger.info(`Shared streak on WhatsApp: ${streak} days`);
  }

  /**
   * Share streak on Twitter
   */
  shareStreakTwitter(streak, adherence) {
    const message = this.generateStreakMessage(streak, adherence);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${this.shareBaseUrl}`;

    window.open(url, '_blank');
    logger.info(`Shared streak on Twitter: ${streak} days`);
  }

  /**
   * Share streak on LinkedIn
   */
  shareStreakLinkedIn(streak, adherence) {
    const _message = this.generateStreakMessage(streak, adherence);
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.shareBaseUrl)}`;

    window.open(url, '_blank');
    logger.info(`Shared streak on LinkedIn: ${streak} days`);
  }

  /**
   * Share monthly report
   */
  shareMonthlyReport(report, platform) {
    const message = `
ðŸŽ¯ Meu RelatÃ³rio de aderência - ${report.monthName} ${report.year}

ðŸ“Š aderência: ${report.metrics.adherencePercent}%
âœ… Dias Perfeitos: ${report.metrics.perfectDays}
ðŸ“ˆ TendÃªncia: ${report.metrics.trend === 'improving' ? 'Melhorando âœ¨' : 'AtenÃ§Ã£o âš ï¸'}

Estou acompanhando minha saúde com #SupliList!
    `;

    this.shareMessage(message, platform);
    logger.info(`Shared monthly report on ${platform}`);
  }

  /**
   * Generate streak message
   */
  generateStreakMessage(streak, adherence) {
    const icons = {
      fire: '🔥',
      star: '⭐',
      calendar: '📅',
      trophy: '🏆',
      success: '✨'
    };

    const messages = [
      `${icons.fire} ${streak} dias de aderência perfeita! ${icons.fire}\n\nMantendo minha saúde em dia com #SupliList!`,
      `${icons.star} Consegui ${adherence}% de aderência este mês! ${icons.trophy}\n\nTomando meus suplementos regularmente com #SupliList!`,
      `${icons.calendar} ${streak} dias consecutivos tomando meus suplementos!\n\n${icons.success} Consistência leva a resultados! #SupliList`,
      `${icons.trophy} Desbloqueei o troféu de ${streak} dias de aderência!\n\nStaying consistent with #SupliList!`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Generate referral link
   */
  generateReferralLink(_userId) {
    this.referralCode = this.generateCode();
    return `${this.shareBaseUrl}?ref=${this.referralCode}`;
  }

  /**
   * Share referral link
   */
  shareReferralLink(platform) {
    const profile = stateManager.select(s => s.profile);
    const message = encodeURIComponent(
      `Oi! ðŸ‘‹ VocÃª toma suplementos regularmente? Veja o SupliList - um app incrÃ­vel para acompanhar sua aderência.\n\nQual Ã© seu melhor dia para tomar suplementos? ${this.generateReferralLink(profile?.id)}`
    );

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${message}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.generateReferralLink(profile?.id))}`, '_blank');
    }

    logger.info(`Shared referral link on ${platform}`);
  }

  /**
   * Share message
   */
  shareMessage(message, platform) {
    const encoded = encodeURIComponent(message);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${this.shareBaseUrl}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareBaseUrl)}`, '_blank');
    }
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLink(text) {
    try {
      await navigator.clipboard.writeText(text);
      logger.info('Share link copied to clipboard');
      return true;
    } catch (error) {
      logger.error('Failed to copy share link', error);
      return false;
    }
  }

  /**
   * Get share stats
   */
  getShareStats() {
    const stats = stateManager.select(s => s.social?.shareStats) || {
      whatsapp: 0,
      twitter: 0,
      linkedin: 0,
      facebook: 0,
      total: 0
    };

    return stats;
  }

  /**
   * Track share action
   */
  trackShare(platform) {
    const stats = this.getShareStats();
    stats[platform] = (stats[platform] || 0) + 1;
    stats.total = Object.values(stats).reduce((a, b) => a + b, 0);

    stateManager.dispatch('UPDATE_SHARE_STATS', { stats });
    logger.info(`Share tracked: ${platform}`);
  }

  /**
   * Generate unique code
   */
  generateCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get share buttons HTML
   */
  getShareButtonsHTML(streak, adherence) {
    return `
      <div class="share-buttons">
        <button class="share-btn whatsapp" onclick="socialSharing.shareStreakWhatsApp(${streak}, ${adherence})">
          <span class="icon">ðŸ’¬</span>
          <span>WhatsApp</span>
        </button>
        <button class="share-btn twitter" onclick="socialSharing.shareStreakTwitter(${streak}, ${adherence})">
          <span class="icon">ð•</span>
          <span>Twitter</span>
        </button>
        <button class="share-btn linkedin" onclick="socialSharing.shareStreakLinkedIn(${streak}, ${adherence})">
          <span class="icon">in</span>
          <span>LinkedIn</span>
        </button>
      </div>
    `;
  }

  /**
   * Check if user reached milestone for share prompt
   */
  shouldPromptShare(streak) {
    const milestones = [7, 14, 30, 60, 90, 100];
    return milestones.includes(streak);
  }

  /**
   * Get share prompt message
   */
    getSharePromptMessage(streak) {
    const messages = {
      7: '🎉 Parabéns! Você atingiu 7 dias de aderência! Compartilhe seu sucesso?',
      14: '🌟 Incrível! 2 semanas de consistência! Inspire amigos a cuidarem da saúde.',
      30: '🏆 Um mês perfeito (30 dias)! Você é consistente. Divida essa vitória!',
      60: '👏 60 dias! Você é uma máquina de dedicação. Mostre seus resultados!',
      90: '💪 3 meses (90 dias)! Você é inspirador. Compartilhe sua jornada!',
      100: '🚀 100 dias! Você é uma lenda! Influencie outros!'
    };

    return messages[streak] || 'Você está indo bem! Compartilhe seu progresso!';
  }
}

export default new SocialSharing();


