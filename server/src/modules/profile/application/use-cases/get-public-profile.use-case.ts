import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { PublicProfileDTO, ProfileMapper } from '../../domain/user-profile.entity.js';

export class GetPublicProfileUseCase {
  constructor(private profileRepo: IUserProfileRepository) {}

  async execute(userId: string): Promise<PublicProfileDTO> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new Error('profile_not_found');
    }

    return ProfileMapper.toPublic(profile);
  }
}
export default GetPublicProfileUseCase;
