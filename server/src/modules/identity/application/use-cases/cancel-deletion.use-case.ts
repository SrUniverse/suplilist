import { z } from 'zod';
import bcrypt from 'bcrypt';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const cancelDeletionSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type CancelDeletionInput = z.infer<typeof cancelDeletionSchema>;

export class CancelDeletionUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: CancelDeletionInput): Promise<void> {
    const validated = cancelDeletionSchema.parse(input);

    await this.uow.runInTransaction(async () => {
      // 1. Fetch user identity by email
      const identity = await this.userIdentityRepo.findByEmail(validated.email);
      if (!identity) {
        throw new Error('ValidationError: Credenciais inválidas.');
      }

      // 2. Must be in 'deleted' status to cancel deletion
      if (identity.status !== 'deleted') {
        throw new Error('ValidationError: Esta conta não está marcada para exclusão.');
      }

      // 3. Verify password
      if (!identity.passwordHash) {
        throw new Error('ValidationError: Contas de provedores externos devem ser reativadas via login social.');
      }
      const isPasswordMatch = await bcrypt.compare(validated.password, identity.passwordHash);
      if (!isPasswordMatch) {
        throw new Error('ValidationError: Credenciais inválidas.');
      }

      // 4. Verify 30-day window
      if (identity.deletedAt) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (identity.deletedAt < thirtyDaysAgo) {
          throw new Error('ValidationError: O período de 30 dias para cancelamento já expirou.');
        }
      }

      // 5. Restore user identity status to active
      identity.status = 'active';
      identity.deletedAt = null;
      
      // Reset infrastructure purge counters
      (identity as any).purgeAttempts = 0;
      (identity as any).purgeFailed = false;

      await this.userIdentityRepo.save(identity);
    });
  }
}
export default CancelDeletionUseCase;
