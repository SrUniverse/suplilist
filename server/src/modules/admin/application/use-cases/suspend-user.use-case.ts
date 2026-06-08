import { IUserIdentityRepository } from '../../../identity/repositories/user-identity.repository.js';

export class SuspendUserUseCase {
  constructor(private userRepo: IUserIdentityRepository) {}

  async execute(targetId: string, actorId: string, reason: string): Promise<void> {
    if (targetId === actorId) {
      throw new Error('ValidationError: Admins cannot suspend themselves');
    }

    const user = await this.userRepo.findById(targetId);
    if (!user) {
      throw new Error('EntityNotFoundError: User not found');
    }

    if (user.status === 'deleted') {
      throw new Error('ValidationError: Cannot suspend a deleted user');
    }

    if (user.role === 'admin') {
      throw new Error('ValidationError: Cannot suspend another admin');
    }

    await this.userRepo.save({
      ...user,
      status: 'suspended',
      suspendedAt: new Date(),
      suspendedReason: reason,
    });
  }
}

export class UnsuspendUserUseCase {
  constructor(private userRepo: IUserIdentityRepository) {}

  async execute(targetId: string): Promise<void> {
    const user = await this.userRepo.findById(targetId);
    if (!user) {
      throw new Error('EntityNotFoundError: User not found');
    }

    if (user.status !== 'suspended') {
      throw new Error('ValidationError: User is not suspended');
    }

    await this.userRepo.save({
      ...user,
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
    });
  }
}
