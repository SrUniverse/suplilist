import { IProfileRepository } from '../../domain/repositories/profile.repository.interface.js';
import { PrivateProfileDTO } from '@suplilist/shared';
import { Profile } from '../../domain/entities/profile.entity.js';
import { UserIdentityModel } from '../../../identity/infrastructure/mongoose/user-identity.model.js';

export interface GetProfileResult {
  profile: PrivateProfileDTO;
  version: number;
}

export class GetProfileUseCase {
  constructor(private profileRepo: IProfileRepository) {}

  async execute(userId: string): Promise<GetProfileResult> {
    const [profile, identity] = await Promise.all([
      this.profileRepo.findByUserId(userId),
      UserIdentityModel
        .findById(userId)
        .select('tier subscriptionStatus currentPeriodEnd role')
        .lean(),
    ]);

    if (!profile) {
      throw new Error('profile_not_found');
    }

    const dto: PrivateProfileDTO = {
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      avatarStatus: profile.avatarStatus,
      onboardingState: profile.onboardingState,
      goals: profile.goals,
      migrationVersion: profile.migrationVersion,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      tier: identity?.tier ?? 'free',
      subscriptionStatus: identity?.subscriptionStatus ?? 'incomplete',
      currentPeriodEnd: identity?.currentPeriodEnd
        ? identity.currentPeriodEnd.toISOString()
        : null,
      role: identity?.role ?? 'user',
    };

    return { profile: dto, version: profile.version };
  }
}
export default GetProfileUseCase;
