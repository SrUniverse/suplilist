import { z } from 'zod';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { PrivateProfileDTO, ProfileMapper } from '../../domain/user-profile.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const updateProfileInputSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name cannot exceed 50 characters').trim(),
  firstName: z.string().max(50, 'First name cannot exceed 50 characters').nullable().optional(),
  lastName: z.string().max(50, 'Last name cannot exceed 50 characters').nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export class UpdateProfileUseCase {
  constructor(
    private profileRepo: IUserProfileRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<PrivateProfileDTO> {
    const validatedInput = updateProfileInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 1. Fetch current profile including private fields
      let profile = await this.profileRepo.findPrivateByUserId(userId);
      
      if (!profile) {
        // If profile doesn't exist, create it (e.g. first edit after signup)
        profile = {
          userId,
          displayName: validatedInput.displayName,
          avatarUrl: null,
          avatarStatus: 'none',
          firstName: validatedInput.firstName || null,
          lastName: validatedInput.lastName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        // Update fields
        profile.displayName = validatedInput.displayName;
        if (validatedInput.firstName !== undefined) profile.firstName = validatedInput.firstName;
        if (validatedInput.lastName !== undefined) profile.lastName = validatedInput.lastName;
      }

      // 2. Persist profile alterations
      const savedProfile = await this.profileRepo.save(profile);

      return ProfileMapper.toPrivate(savedProfile);
    });
  }
}
export default UpdateProfileUseCase;
