import type { AvatarStatus, PublicProfileDTO, PrivateProfileDTO, BiometricsDTO } from '@suplilist/shared';

// Os DTOs de wire vêm do pacote compartilhado (fonte única da verdade do contrato
// frontend↔backend). A entidade de domínio abaixo permanece local — usa `Date` e
// nunca cruza a fronteira HTTP.
export type { AvatarStatus, PublicProfileDTO, PrivateProfileDTO };

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  firstName: string | null;
  lastName: string | null;
  onboardingState: 'pending' | 'completed';
  goals: string[];
  biometrics?: BiometricsDTO;
  /**
   * Client-written migration version flag. See PrivateProfileDTO.migrationVersion.
   * `undefined` = migration never ran. `1` = v1 migration complete.
   */
  migrationVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileMapper {
  static toPublic(profile: UserProfile): PublicProfileDTO {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarStatus === 'approved' ? profile.avatarUrl : null,
      avatarStatus: profile.avatarStatus,
    };
  }

  static toPrivate(profile: UserProfile): PrivateProfileDTO {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      avatarStatus: profile.avatarStatus,
      firstName: profile.firstName,
      lastName: profile.lastName,
      onboardingState: profile.onboardingState,
      goals: profile.goals,
      biometrics: profile.biometrics,
      // Serializa Date → string ISO (formato de wire do contrato compartilhado)
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      // undefined é omitido pelo JSON.stringify — clientes legados não veem o campo
      migrationVersion: profile.migrationVersion,
    };
  }
}
