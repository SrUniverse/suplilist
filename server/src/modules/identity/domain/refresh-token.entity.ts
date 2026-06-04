export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  replacedBy: string | null;
  userAgent: string;
  ipAddress: string;
  deviceLabel: string | null;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
