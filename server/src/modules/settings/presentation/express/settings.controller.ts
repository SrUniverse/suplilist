import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GetSettingsUseCase } from '../../application/use-cases/get-settings.use-case.js';
import { UpdateNotificationsUseCase } from '../../application/use-cases/update-notifications.use-case.js';
import { UpdateLocaleUseCase } from '../../application/use-cases/update-locale.use-case.js';
import { GrantConsentUseCase } from '../../application/use-cases/grant-consent.use-case.js';
import { RevokeConsentUseCase } from '../../application/use-cases/revoke-consent.use-case.js';
import { GetConsentHistoryUseCase } from '../../application/use-cases/get-consent-history.use-case.js';
import { ConsentMapper } from '../../application/mappers/consent.mapper.js';

const consentPayloadSchema = z.object({
  consentType: z.enum(['privacy_policy', 'terms_of_service', 'marketing_emails']),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Formato de versão inválido (SemVer requerido)'),
  action: z.enum(['granted', 'revoked'])
});

export class SettingsController {
  constructor(
    private getSettingsUseCase: GetSettingsUseCase,
    private updateNotificationsUseCase: UpdateNotificationsUseCase,
    private updateLocaleUseCase: UpdateLocaleUseCase,
    private grantConsentUseCase: GrantConsentUseCase,
    private revokeConsentUseCase: RevokeConsentUseCase,
    private getConsentHistoryUseCase: GetConsentHistoryUseCase
  ) {}

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const settings = await this.getSettingsUseCase.execute(userId);
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNotifications(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const settings = await this.updateNotificationsUseCase.execute(userId, req.body);
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLocale(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const settings = await this.updateLocaleUseCase.execute(userId, req.body);
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConsentHistory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const history = await this.getConsentHistoryUseCase.execute(userId);
      // ConsentMapper.toDTOList renames timestamp → consentedAt (ISO 8601 string)
      // and enforces explicit toISOString() for LGPD audit trail compliance.
      return res.status(200).json({
        success: true,
        data: ConsentMapper.toDTOList(history),
      });
    } catch (error) {
      next(error);
    }
  }

  async submitConsent(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const payload = consentPayloadSchema.parse(req.body);
      const userId = req.user!.id;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (payload.action === 'granted') {
        await this.grantConsentUseCase.execute({
          userId,
          consentType: payload.consentType,
          version: payload.version,
          ipAddress,
          userAgent,
        });
      } else {
        await this.revokeConsentUseCase.execute({
          userId,
          consentType: payload.consentType,
          version: payload.version,
          ipAddress,
          userAgent,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Consentimento ${payload.action === 'granted' ? 'concedido' : 'revogado'} com sucesso.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default SettingsController;
