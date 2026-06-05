import { z } from 'zod';
import { IUserProfileRepository } from '../../repositories/user-profile.repository.js';
import { PrivateProfileDTO, ProfileMapper } from '../../domain/user-profile.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

/**
 * SyncMigrationVersionUseCase
 *
 * Dedicated use case for the MigrationService to record that a data migration
 * completed successfully. Lives on its own route (`PATCH /profile/me/migration-sync`)
 * so it is fully isolated from the user-facing profile editing flow.
 *
 * Invariant enforced here:
 *   migrationVersion is monotonic — it may only advance, never regress.
 *   If a client sends version 1 after the server already recorded version 2,
 *   the request succeeds silently and the server returns the current (higher) value.
 *
 * Why a dedicated use case and not UpdateProfileUseCase?
 *   migrationVersion is a system-control field, not a user-editable field.
 *   Mixing it into the displayName / bio DTO would allow any authenticated client
 *   to send { "migrationVersion": 9999 } through the standard profile editor,
 *   permanently blocking future migration logic. The separation is a security boundary.
 *
 * Why select: false on the schema + explicit +migrationVersion here?
 *   Default queries must never expose this operational flag in public or generic
 *   profile responses. But this use case MUST read it to enforce the monotonic
 *   invariant — so we opt in explicitly below.
 */

const syncMigrationVersionInputSchema = z.object({
  /**
   * The migration schema version the client just completed.
   * Must be a positive integer ≥ 1.
   */
  migrationVersion: z.number().int().min(1, 'migrationVersion must be a positive integer'),
});

export type SyncMigrationVersionInput = z.infer<typeof syncMigrationVersionInputSchema>;

export class SyncMigrationVersionUseCase {
  constructor(
    private profileRepo: IUserProfileRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(userId: string, input: unknown): Promise<PrivateProfileDTO> {
    const { migrationVersion } = syncMigrationVersionInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // findPrivateByUserId explicitly selects +migrationVersion.
      // Without this, profile.migrationVersion would always be `undefined`
      // (select: false) and the monotonic check would always pass — defeating it.
      const profile = await this.profileRepo.findPrivateByUserId(userId);

      if (!profile) {
        throw new Error('profile_not_found');
      }

      // Monotonic invariant: only advance the version counter, never regress.
      // If the DB already has version N and the client sends version M < N
      // (stale client re-sending), we return success with the existing N.
      if (
        profile.migrationVersion === undefined ||
        migrationVersion > profile.migrationVersion
      ) {
        profile.migrationVersion = migrationVersion;
        const saved = await this.profileRepo.save(profile);
        return ProfileMapper.toPrivate(saved);
      }

      // Already at this version or higher — idempotent success.
      return ProfileMapper.toPrivate(profile);
    });
  }
}

export default SyncMigrationVersionUseCase;
