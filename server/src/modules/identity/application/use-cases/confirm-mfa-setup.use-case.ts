import { z } from 'zod';
import crypto from 'crypto';
import * as otplibPkg from 'otplib';
const authenticator = (otplibPkg as any).authenticator || (otplibPkg as any).default?.authenticator;
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const confirmMfaSetupInputSchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6, 'Invalid TOTP code format'),
});

export type ConfirmMfaSetupInput = z.infer<typeof confirmMfaSetupInputSchema>;

export interface ConfirmMfaSetupResult {
  backupCodes: string[]; // Return plain text ONCE to the user
}

export class ConfirmMfaSetupUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: ConfirmMfaSetupInput): Promise<ConfirmMfaSetupResult> {
    const validatedInput = confirmMfaSetupInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      const user = await this.userIdentityRepo.findById(validatedInput.userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

      if (user.mfa.enabled) {
        throw new Error('mfa_already_enabled');
      }

      if (!user.mfa.tempSecret) {
        throw new Error('mfa_setup_not_initiated');
      }

      // 1. Verify TOTP Code
      const isValid = authenticator.check(validatedInput.code, user.mfa.tempSecret);
      if (!isValid) {
        throw new Error('invalid_mfa_code');
      }

      // 2. Generate 10 cryptographically secure Backup Codes
      const plainBackupCodes: string[] = [];
      const hashedBackupCodes: string[] = [];

      for (let i = 0; i < 10; i++) {
        // 12 chars of high entropy
        const plainCode = crypto.randomBytes(6).toString('hex');
        plainBackupCodes.push(plainCode);

        // Store as SHA-256
        const hashedCode = crypto.createHash('sha256').update(plainCode).digest('hex');
        hashedBackupCodes.push(hashedCode);
      }

      // 3. Complete Handshake
      user.mfa.totpSecret = user.mfa.tempSecret;
      user.mfa.tempSecret = null; // Clean up memory
      user.mfa.enabled = true;
      user.mfa.type = 'totp';
      user.mfa.enabledAt = new Date();
      user.mfa.backupCodes = hashedBackupCodes;

      await this.userIdentityRepo.save(user);

      return {
        backupCodes: plainBackupCodes,
      };
    });
  }
}
export default ConfirmMfaSetupUseCase;
