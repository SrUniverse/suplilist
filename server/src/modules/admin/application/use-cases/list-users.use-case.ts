import { IUserIdentityRepository, FindAllOptions } from '../../../identity/repositories/user-identity.repository.js';
import { UserRole, UserStatus } from '../../../identity/domain/user-identity.entity.js';

export interface ListUsersDTO {
  id: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export interface ListUsersResult {
  users: ListUsersDTO[];
  total: number;
  page: number;
  limit: number;
}

export class ListUsersUseCase {
  constructor(private userRepo: IUserIdentityRepository) {}

  async execute(options: FindAllOptions): Promise<ListUsersResult> {
    const { users, total } = await this.userRepo.findAll(options);

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        emailVerified: u.emailVerified,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
      total,
      page: options.page,
      limit: options.limit,
    };
  }
}
