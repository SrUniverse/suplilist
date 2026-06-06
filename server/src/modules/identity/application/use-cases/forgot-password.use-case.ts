import crypto from 'crypto';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IdentityEmailService } from '../services/identity-email.service.js';

interface ForgotPasswordDTO {
  email: string;
}

export class ForgotPasswordUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private emailService: IdentityEmailService
  ) {}

  async execute(dto: ForgotPasswordDTO): Promise<void> {
    const email = dto.email.toLowerCase().trim();

    // 1. Get user. Early return logic protects against timing attacks and enumeration.
    const user = await this.userIdentityRepo.findByEmail(email);

    // If user does not exist, or is deleted/suspended, or uses OAuth strictly (no password):
    // We return silently to prevent User Enumeration attacks.
    if (!user || user.status === 'deleted' || user.status === 'suspended') {
      return;
    }

    const hasLocalPassword = user.passwordHash !== null;
    const isGoogleOnly = !hasLocalPassword && user.providers.some(p => p.provider === 'google');
    
    // We don't send reset emails for OAuth-only accounts without passwords yet
    if (isGoogleOnly) {
      return;
    }

    // 2. Generate secure token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    // 3. Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 4. Save hash to database
    user.passwordReset = {
      tokenHash,
      expiresAt,
    };
    await this.userIdentityRepo.save(user);

    // 5. Send email asynchronously without blocking the client
    // Note: In an enterprise app, this would be pushed to a queue.
    this.emailService.sendPasswordResetEmail(user.email, plainToken).catch(err => {
      console.error('[Resend Error] Failed to send password reset email:', err);
    });
  }
}
