export interface UserSettingsDTO {
  userId: string;
  locale: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  updatedAt: string;
}

export interface ConsentDTO {
  userId: string;
  documentId: string;
  documentVersion: string;
  grantedAt: string;
  revokedAt: string | null;
}
