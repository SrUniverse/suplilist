import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

export interface RevokeSessionInput {
  userId: string;
  sessionId: string;
}

export class RevokeSessionUseCase {
  constructor(
    private refreshTokenRepo: IRefreshTokenRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: RevokeSessionInput): Promise<void> {
    await this.uow.runInTransaction(async () => {
      const session = await this.refreshTokenRepo.findById(input.sessionId);
      
      // Verification of ownership and active status
      if (!session || session.userId !== input.userId) {
        throw new Error('EntityNotFoundError: Sessão não encontrada ou acesso negado.');
      }

      if (!session.revokedAt) {
        session.revokedAt = new Date();
        await this.refreshTokenRepo.save(session);
      }
    });
  }
}
export default RevokeSessionUseCase;
