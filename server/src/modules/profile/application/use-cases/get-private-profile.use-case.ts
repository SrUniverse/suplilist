import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { PrivateProfileDTO, ProfileMapper } from '../../domain/user-profile.entity.js';

export class GetPrivateProfileUseCase {
  constructor(private profileRepo: IUserProfileRepository) {}

  /**
   * Fetches full profile details.
   * Assumes verification of ownership has been enforced by the caller (Controller injecting the authenticatd userId).
   */
  async execute(userId: string): Promise<PrivateProfileDTO> {
    const profile = await this.profileRepo.findPrivateByUserId(userId);
    if (!profile) {
      throw new Error('profile_not_found');
    }

    return ProfileMapper.toPrivate(profile);
  }
}
export default GetPrivateProfileUseCase;
