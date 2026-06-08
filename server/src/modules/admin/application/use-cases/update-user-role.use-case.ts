import { IUserIdentityRepository } from '../../../identity/repositories/user-identity.repository.js';
import { UserRole } from '../../../identity/domain/user-identity.entity.js';

const VALID_ROLES: UserRole[] = ['user', 'moderator', 'admin'];

export class UpdateUserRoleUseCase {
  constructor(private userRepo: IUserIdentityRepository) {}

  async execute(targetId: string, actorId: string, newRole: UserRole): Promise<void> {
    if (!VALID_ROLES.includes(newRole)) {
      throw new Error(`ValidationError: Invalid role '${newRole}'`);
    }

    if (targetId === actorId) {
      throw new Error('ValidationError: Admins cannot change their own role');
    }

    const user = await this.userRepo.findById(targetId);
    if (!user) {
      throw new Error('EntityNotFoundError: User not found');
    }

    if (user.status === 'deleted') {
      throw new Error('ValidationError: Cannot change role of a deleted user');
    }

    await this.userRepo.save({ ...user, role: newRole });
  }
}
