export type AvatarStatus = 'none' | 'pending_moderation' | 'approved' | 'rejected';

export interface Profile {
  id: string; // Typically maps to Mongoose _id, which will be the SAME as userId for 1-1
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  onboardingState: 'pending' | 'completed';
  goals: string[];
  migrationVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  version: number; // For OCC (__v in Mongoose)
}
