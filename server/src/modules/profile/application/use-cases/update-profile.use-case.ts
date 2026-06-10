import { IProfileRepository } from '../../domain/repositories/profile.repository.interface.js';
import { UpdateProfileRequestDTO, PrivateProfileDTO } from '@suplilist/shared';
import { UserIdentityModel } from '../../../identity/infrastructure/mongoose/user-identity.model.js';

export interface UpdateProfileInput {
  userId: string;
  expectedVersion: number;
  data: UpdateProfileRequestDTO;
}

export interface UpdateProfileResult {
  profile: PrivateProfileDTO;
  version: number;
}

export class UpdateProfileUseCase {
  constructor(private profileRepo: IProfileRepository) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    const { userId, expectedVersion, data } = input;

    const [updatedProfile, identity] = await Promise.all([
      this.profileRepo.updateWithConcurrency(userId, expectedVersion, data),
      UserIdentityModel
        .findById(userId)
        .select('tier subscriptionStatus currentPeriodEnd')
        .lean(),
    ]);

    if (!updatedProfile) {
      throw new Error('precondition_failed');
    }

    const dto: PrivateProfileDTO = {
      userId: updatedProfile.userId,
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      displayName: updatedProfile.displayName,
      avatarUrl: updatedProfile.avatarUrl,
      avatarStatus: updatedProfile.avatarStatus,
      onboardingState: updatedProfile.onboardingState,
      goals: updatedProfile.goals,
      biometrics: updatedProfile.biometrics,
      migrationVersion: updatedProfile.migrationVersion,
      createdAt: updatedProfile.createdAt.toISOString(),
      updatedAt: updatedProfile.updatedAt.toISOString(),
      tier: identity?.tier ?? 'free',
      subscriptionStatus: identity?.subscriptionStatus ?? 'incomplete',
      currentPeriodEnd: identity?.currentPeriodEnd
        ? identity.currentPeriodEnd.toISOString()
        : null,
    };

    return { profile: dto, version: updatedProfile.version };
  }
}
export default UpdateProfileUseCase;
