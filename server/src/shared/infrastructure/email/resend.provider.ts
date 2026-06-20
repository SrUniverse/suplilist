import { Resend } from 'resend';
import { IEmailProvider } from './email-provider.interface.js';
import { logger } from '../../utils/logger.js';

export class ResendEmailProvider implements IEmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_dev_key');
    this.defaultFrom = process.env.EMAIL_FROM || 'SupliList <noreply@suplilist.com>';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        logger.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
        return true; // Bypass in dev if no key
      }

      const { error } = await this.resend.emails.send({
        from: this.defaultFrom,
        to: [to],
        subject,
        html,
      });

      if (error) {
        logger.error('[Resend Error]', error);
        return false;
      }
      return true;
    } catch (err) {
      logger.error('[Email Provider Exception]', err);
      return false;
    }
  }
}
