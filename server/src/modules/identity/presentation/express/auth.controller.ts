import { Request, Response, NextFunction } from 'express';
import { RegisterUseCase } from '../../application/use-cases/register.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { DeleteAccountUseCase } from '../../application/use-cases/delete-account.use-case.js';
import { CancelDeletionUseCase } from '../../application/use-cases/cancel-deletion.use-case.js';

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase,
    private deleteAccountUseCase: DeleteAccountUseCase,
    private cancelDeletionUseCase: CancelDeletionUseCase
  ) {}

  async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, password } = req.body;
      const result = await this.registerUseCase.execute({ email, password });
      
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message === 'user_already_exists') {
        return res.status(499).json({ // 499 or 409 Conflict
          success: false,
          error: 'user_already_exists',
          message: 'An account with this email address already exists.',
        });
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'] || 'unknown';
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

      const result = await this.loginUseCase.execute({
        email,
        password,
        userAgent,
        ipAddress,
        deviceLabel: null // Parse using device detector in application layer if needed
      });

      if (result.status === 'mfa_required') {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          mfaTicket: result.mfaTicket,
        });
      }

      // Secure refresh token delivery using httpOnly Cookie (OWASP A07 compliant)
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      if (error.message === 'invalid_credentials' || error.message === 'oauth_account_only') {
        return res.status(401).json({
          success: false,
          error: 'invalid_credentials',
          message: 'Invalid email or password.',
        });
      }
      if (error.message === 'account_deleted') {
        return res.status(403).json({
          success: false,
          error: 'account_deleted',
          message: 'This account has been deleted.',
        });
      }
      if (error.message === 'account_suspended') {
        return res.status(403).json({
          success: false,
          error: 'account_suspended',
          message: 'This account has been suspended.',
        });
      }
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      // Pull refresh token from cookies
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'missing_refresh_token',
          message: 'Refresh token is required.',
        });
      }

      const userAgent = req.headers['user-agent'] || 'unknown';
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

      const result = await this.refreshTokenUseCase.execute({
        refreshToken,
        userAgent,
        ipAddress,
        deviceLabel: null
      });

      // Update cookie with rotated token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      if (error.message === 'invalid_refresh_token' || error.message === 'refresh_token_expired' || error.message === 'user_inactive') {
        return res.status(401).json({
          success: false,
          error: 'invalid_session',
          message: 'Your session has expired. Please log in again.',
        });
      }
      if (error.message === 'token_theft_detected') {
        // Clear cookies immediately on token theft detection
        res.clearCookie('refreshToken');
        return res.status(401).json({
          success: false,
          error: 'session_revoked',
          message: 'Security breach detected. All sessions have been invalidated.',
        });
      }
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const jti = req.user?.jti;
      const exp = (req.user as any)?.exp; // Extracted in JWT validation
      
      // Calculate token expiration date
      const jwtExpiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);

      if (jti) {
        await this.logoutUseCase.execute({
          refreshToken,
          jti,
          jwtExpiresAt
        });
      }

      // Clear cookie
      res.clearCookie('refreshToken');

      return res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { password } = req.body;
      const userId = req.user?.id;
      const jti = req.user?.jti;
      const exp = (req.user as any)?.exp;
      const jwtExpiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);

      if (!userId || !jti) {
        return res.status(401).json({
          success: false,
          error: 'unauthenticated',
          message: 'Authentication required.'
        });
      }

      await this.deleteAccountUseCase.execute({
        userId,
        password,
        jti,
        jwtExpiresAt
      });

      // Clear cookie
      res.clearCookie('refreshToken');

      return res.status(200).json({
        success: true,
        message: 'Conta marcada para exclusão física em 30 dias. Sessão encerrada.'
      });
    } catch (error: any) {
      if (error.message && error.message.includes('ValidationError')) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: error.message.replace('ValidationError: ', '')
        });
      }
      if (error.message && error.message.includes('EntityNotFoundError')) {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: error.message.replace('EntityNotFoundError: ', '')
        });
      }
      next(error);
    }
  }

  async cancelDeletion(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, password } = req.body;
      await this.cancelDeletionUseCase.execute({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Exclusão de conta cancelada com sucesso. Você já pode fazer login normalmente.'
      });
    } catch (error: any) {
      if (error.message && error.message.includes('ValidationError')) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: error.message.replace('ValidationError: ', '')
        });
      }
      next(error);
    }
  }
}
