import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { ITokenBlocklist } from '../../../../shared/application/security/token-blocklist.interface.js';

interface ResetPasswordDTO {
  plainToken: string;
  newPasswordPlain: string;
}

export class ResetPasswordUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private tokenBlocklistRepo: ITokenBlocklist
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<void> {
    // 1. Hash the incoming token
    const tokenHash = crypto.createHash('sha256').update(dto.plainToken).digest('hex');

    // 2. Find the user with this specific token hash.
    // We do not have a repo method specifically for this, so we must add it or use an existing one.
    // Wait, MongooseUserIdentityRepository only has findById, findByEmail, findByProvider.
    // I need to add `findByPasswordResetToken(tokenHash: string): Promise<UserIdentity | null>`
    const user = await this.userIdentityRepo.findByPasswordResetToken(tokenHash);

    if (!user) {
      throw new Error('invalid_or_expired_token');
    }

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw new Error('user_inactive');
    }

    // 3. Verify temporal validity
    if (!user.passwordReset || !user.passwordReset.expiresAt) {
      throw new Error('invalid_or_expired_token');
    }

    if (new Date() > user.passwordReset.expiresAt) {
      // Clear expired token
      user.passwordReset = undefined;
      await this.userIdentityRepo.save(user);
      throw new Error('invalid_or_expired_token');
    }

    // 4. Invalidate all current sessions (Global Revocation) BEFORE changing the password
    user.sessionsValidAfter = new Date();
    await this.tokenBlocklistRepo.deleteSessionsValidAfterCache(user.id);

    // 5. Update password and clear token
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    user.passwordHash = await bcrypt.hash(dto.newPasswordPlain, saltRounds);
    user.passwordReset = undefined;

    // 6. Save modifications (this performs Optimistic Concurrency Control)
    await this.userIdentityRepo.save(user);
  }
}
