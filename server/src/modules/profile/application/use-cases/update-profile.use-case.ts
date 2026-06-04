import { IProfileRepository } from '../../domain/repositories/profile.repository.interface.js';
import { UpdateProfileRequestDTO, PrivateProfileDTO } from '../../../../../shared/src/profile.js';

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

    // Use repository method that encapsulates the optimistic concurrency logic
    const updatedProfile = await this.profileRepo.updateWithConcurrency(userId, expectedVersion, data);
    
    if (!updatedProfile) {
      // If it returns null, it means either the user doesn't exist OR the version mismatched.
      // In a real scenario, we might want to disambiguate. But for OCC, it's 412.
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
      migrationVersion: updatedProfile.migrationVersion,
      createdAt: updatedProfile.createdAt.toISOString(),
      updatedAt: updatedProfile.updatedAt.toISOString(),
    };

    return { profile: dto, version: updatedProfile.version };
  }
}
export default UpdateProfileUseCase;
