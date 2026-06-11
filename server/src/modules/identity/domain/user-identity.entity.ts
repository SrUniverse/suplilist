export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'moderator' | 'admin';

export interface OAuthProvider {
  provider: 'google' | 'phone' | 'password';
  providerId: string;
  providerEmail?: string;
  linkedAt: Date;
}

export interface MfaInfo {
  enabled: boolean;
  type: 'totp' | null;
  totpSecret: string | null;
  tempSecret: string | null;
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
  trustedDevices: string[]; // Stores SHA-256 hashes of valid device UUIDs
  sessionsValidAfter: Date | null;
  passwordReset?: {
    tokenHash: string | null;
    expiresAt: Date | null;
  };
  version: number; // Mapped to mongoose __v for Optimistic Concurrency Control
  createdAt: Date;
  updatedAt: Date;
}
