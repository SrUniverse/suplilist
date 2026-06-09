import bcrypt from 'bcrypt';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { ITokenBlocklist } from '../../../../shared/application/security/token-blocklist.interface.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const deleteAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string().optional(),
  jti: z.string().min(1, 'JWT ID is required'),
  jwtExpiresAt: z.date(),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export class DeleteAccountUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private tokenBlocklist: ITokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  async execute(input: DeleteAccountInput): Promise<void> {
    const validated = deleteAccountSchema.parse(input);

    await this.uow.runInTransaction(async () => {
      // 1. Fetch user identity
      const identity = await this.userIdentityRepo.findById(validated.userId);
      if (!identity || identity.status === 'deleted') {
        throw new Error('EntityNotFoundError: Conta não encontrada.');
      }

      // 2. Security validation: if local password exists, require password verification
      if (identity.passwordHash) {
        if (!validated.password) {
          throw new Error('ValidationError: Senha obrigatória para excluir a conta.');
        }
        const isPasswordMatch = await bcrypt.compare(validated.password, identity.passwordHash);
        if (!isPasswordMatch) {
          throw new Error('ValidationError: Senha incorreta.');
        }
      }

      // 3. Mark user identity as soft-deleted
      identity.status = 'deleted';
      identity.deletedAt = new Date();
      await this.userIdentityRepo.save(identity);

      // 4. Revoke all active refresh tokens for the user
      await this.refreshTokenRepo.revokeAllForUser(validated.userId);

      // 5. Block the current JWT immediately (prevent concurrent HTTP calls using same JWT)
      const ttlSeconds = Math.max(0, Math.floor((validated.jwtExpiresAt.getTime() - Date.now()) / 1000));
      await this.tokenBlocklist.block(validated.jti, ttlSeconds);
    });
  }
}
export default DeleteAccountUseCase;
