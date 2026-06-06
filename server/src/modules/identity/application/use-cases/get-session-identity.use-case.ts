import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';

export interface SessionIdentityDTO {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  isMfaEnabled: boolean;
}

export class GetSessionIdentityUseCase {
  constructor(private userIdentityRepo: IUserIdentityRepository) {}

  async execute(userId: string): Promise<SessionIdentityDTO> {
    const user = await this.userIdentityRepo.findById(userId);
    
    if (!user) {
      throw new Error('user_not_found');
    }

    if (user.status === 'deleted' || user.status === 'suspended') {
      throw new Error('invalid_user_status');
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      isMfaEnabled: user.mfa?.enabled ?? false,
    };
  }
}
