export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'admin';

export interface OAuthProvider {
  provider: 'google';
  providerId: string;
  providerEmail?: string;
  linkedAt: Date;
}

export interface MfaInfo {
  enabled: boolean;
  type: 'totp' | null;
  totpSecret: string | null;
  backupCodes: string[];
  enabledAt: Date | null;
  lastUsedAt: Date | null;
}

export interface UserIdentity {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  providers: OAuthProvider[];
  mfa: MfaInfo;
  status: UserStatus;
  role: UserRole; // Static RBAC configuration inside identity collection
  deletedAt: Date | null;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  version: number; // Mapped to mongoose __v for Optimistic Concurrency Control
  createdAt: Date;
  updatedAt: Date;
}
