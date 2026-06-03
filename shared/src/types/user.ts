export interface UserIdentityDTO {
  id: string;
  email: string;
  createdAt: string;
  deletionScheduledAt: string | null;
}

export interface UserProfileDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  updatedAt: string;
}
