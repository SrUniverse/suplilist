import { Request, Response, NextFunction } from 'express';
import { RegisterUseCase } from '../../application/use-cases/register.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case.js';
import { DeleteAccountUseCase } from '../../application/use-cases/delete-account.use-case.js';
import { CancelDeletionUseCase } from '../../application/use-cases/cancel-deletion.use-case.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case.js';
import { GoogleAuthUseCase } from '../../application/use-cases/google-auth.use-case.js';
import { SetupMfaUseCase } from '../../application/use-cases/setup-mfa.use-case.js';
import { ConfirmMfaSetupUseCase } from '../../application/use-cases/confirm-mfa-setup.use-case.js';
import { VerifyMfaUseCase } from '../../application/use-cases/verify-mfa.use-case.js';
import { VerifyOtpUseCase } from '../../application/use-cases/verify-otp.use-case.js';
import { ResendOtpUseCase } from '../../application/use-cases/resend-otp.use-case.js';
import { GetSessionIdentityUseCase } from '../../application/use-cases/get-session-identity.use-case.js';
import { VerifyDeviceUseCase } from '../../application/use-cases/verify-device.use-case.js';
import { AuthMapper } from '../../application/mappers/auth.mapper.js';

export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase,
    private deleteAccountUseCase: DeleteAccountUseCase,
    private cancelDeletionUseCase: CancelDeletionUseCase,
    private forgotPasswordUseCase: ForgotPasswordUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private googleAuthUseCase: GoogleAuthUseCase,
    private setupMfaUseCase: SetupMfaUseCase,
    private confirmMfaSetupUseCase: ConfirmMfaSetupUseCase,
    private verifyMfaUseCase: VerifyMfaUseCase,
    private verifyOtpUseCase: VerifyOtpUseCase,
    private resendOtpUseCase: ResendOtpUseCase,
    private getSessionIdentityUseCase: GetSessionIdentityUseCase,
    private verifyDeviceUseCase: VerifyDeviceUseCase
  ) {}

  async getMe(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const identity = await this.getSessionIdentityUseCase.execute(userId);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).json({
        success: true,
        data: identity,
      });
    } catch (error: any) {
      if (error.message === 'user_not_found') {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      if (error.message === 'invalid_user_status') {
        return res.status(403).json({ success: false, error: 'account_suspended_or_deleted' });
      }
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, password } = req.body;
      const result = await this.registerUseCase.execute({ email, password });
      
      return res.status(202).json({
        success: true,
        data: AuthMapper.toRegisterResponse(result.userId, result.email),
      });
    } catch (error: any) {
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
        deviceLabel: null, // Parse using device detector in application layer if needed
        deviceId: req.cookies?.deviceId
      });

      if (result.status === 'mfa_required') {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          mfaToken: result.mfaToken,
        });
      }

      if (result.status === 'device_verification_required') {
        return res.status(202).json({
          success: true,
          challenge: 'device_verification',
          email: result.email,
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
        data: AuthMapper.toAuthResponse(result.accessToken),
      });
    } catch (error: any) {
      if (error.message === 'invalid_credentials' || error.message === 'oauth_account_only') {
        return res.status(401).json({
          success: false,
          error: 'invalid_credentials',
          message: 'Invalid email or password.',
        });
      }
      if (error.message === 'pending_verification') {
        return res.status(403).json({
          success: false,
          error: 'pending_verification',
          message: 'Please verify your email before logging in.',
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

  async verifyDevice(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, otpCode } = req.body;
      if (!email || !otpCode) {
        return res.status(400).json({ success: false, error: 'validation_error', message: 'Email and OTP code are required.' });
      }

      const result = await this.verifyDeviceUseCase.execute({ email, otpCode });

      // Save the deviceId in a long-lived cookie
      res.cookie('deviceId', result.deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      if (result.status === 'mfa_required') {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          mfaToken: result.mfaToken,
        });
      }

      // Secure refresh token delivery
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        data: AuthMapper.toAuthResponse(result.accessToken),
      });
    } catch (error: any) {
      if (error.message === 'invalid_otp') {
        return res.status(401).json({ success: false, error: 'invalid_otp', message: 'Invalid or expired OTP.' });
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

      const result = await this.refreshTokenUseCase.execute({
        refreshToken
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
        data: AuthMapper.toAuthResponse(result.accessToken),
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
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

      if (refreshToken) {
        await this.logoutUseCase.execute({ refreshToken, accessToken });
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

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'validation_error', message: 'Email is required.' });
      }

      await this.forgotPasswordUseCase.execute({ email });

      // Always return 202 Accepted opaquely to prevent User Enumeration
      return res.status(202).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'validation_error', message: 'Token and new password are required.' });
      }

      await this.resetPasswordUseCase.execute({ plainToken: token, newPasswordPlain: newPassword });

      // Kill the cookie just to be safe, forcing them to login again
      res.clearCookie('refreshToken');

      return res.status(200).json({
        success: true,
        message: 'Password successfully reset. You can now login with your new password.',
      });
    } catch (error: any) {
      if (error.message === 'invalid_or_expired_token' || error.message === 'user_inactive') {
        return res.status(401).json({
          success: false,
          error: 'invalid_token',
          message: 'The password reset token is invalid or has expired.',
        });
      }
      next(error);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { credential } = req.body; // Google sends credential
      if (!credential) {
        return res.status(400).json({ success: false, error: 'missing_credential' });
      }

      const result = await this.googleAuthUseCase.execute({ 
        idToken: credential,
        deviceId: req.cookies?.deviceId
      });

      if (result.status === 'mfa_required') {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          mfaToken: result.mfaToken,
        });
      }

      if (result.status === 'device_verification_required') {
        return res.status(202).json({
          success: true,
          challenge: 'device_verification',
          email: result.email,
        });
      }

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: AuthMapper.toAuthResponse(result.accessToken),
      });
    } catch (error: any) {
      if (error.message === 'unverified_google_email') {
        return res.status(403).json({ success: false, error: 'unverified_email', message: 'Google account email is not verified.' });
      }
      if (error.message === 'invalid_google_token') {
        return res.status(401).json({ success: false, error: 'invalid_token' });
      }
      next(error);
    }
  }

  async setupMfa(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });

      const result = await this.setupMfaUseCase.execute({ userId });
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'mfa_already_enabled') {
        return res.status(400).json({ success: false, error: 'mfa_already_enabled' });
      }
      next(error);
    }
  }

  async confirmMfaSetup(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const { code } = req.body;
      if (!userId) return res.status(401).json({ success: false, error: 'unauthenticated' });
      if (!code) return res.status(400).json({ success: false, error: 'missing_code' });

      const result = await this.confirmMfaSetupUseCase.execute({ userId, code });
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'invalid_mfa_code') {
        return res.status(400).json({ success: false, error: 'invalid_code' });
      }
      if (error.message === 'mfa_setup_not_initiated') {
        return res.status(400).json({ success: false, error: 'setup_not_initiated' });
      }
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, error: 'validation_error', message: 'Email and code are required.' });
      }

      const result = await this.verifyOtpUseCase.execute({ email, code });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: AuthMapper.toAuthResponse(result.accessToken),
      });
    } catch (error: any) {
      if (error.message === 'invalid_otp_code') {
        return res.status(401).json({ success: false, error: 'invalid_otp_code', message: 'Invalid OTP code.' });
      }
      if (error.message === 'otp_expired_or_not_found') {
        return res.status(400).json({ success: false, error: 'otp_expired', message: 'OTP expired. Request a new code.' });
      }
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, _next: NextFunction): Promise<Response | void> {
    try {
      const { email } = req.body;
      await this.resendOtpUseCase.execute({ email });
      return res.status(200).json({ success: true });
    } catch (err: any) {
      if (err.message === 'too_many_requests') {
        return res.status(429).json({ success: false, error: err.message });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async verifyMfa(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const jti = req.user?.jti;
      const { code } = req.body;
      if (!userId || !jti) return res.status(401).json({ success: false, error: 'unauthenticated' });
      if (!code) return res.status(400).json({ success: false, error: 'missing_code' });

      const result = await this.verifyMfaUseCase.execute({ userId, jti, code });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        data: AuthMapper.toAuthResponse(result.accessToken),
      });
    } catch (error: any) {
      if (error.message === 'invalid_mfa_code') {
        return res.status(401).json({ success: false, error: 'invalid_code' });
      }
      if (error.message === 'too_many_mfa_attempts') {
        return res.status(429).json({ success: false, error: 'too_many_attempts', message: 'Too many failed attempts. Try again later.' });
      }
      next(error);
    }
  }
}
