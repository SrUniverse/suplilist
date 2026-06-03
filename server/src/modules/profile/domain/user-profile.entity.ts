export type AvatarStatus = 'none' | 'pending_moderation' | 'approved' | 'rejected';

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicProfileDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
}

export interface PrivateProfileDTO extends PublicProfileDTO {
  firstName: string | null;
  lastName: string | null;
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
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
