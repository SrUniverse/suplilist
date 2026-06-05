export type ConsentType = 'privacy_policy' | 'terms_of_service' | 'marketing_emails';
export type ConsentAction = 'granted' | 'revoked';

export interface UserConsent {
  id: string;
  userId: string;
  type: ConsentType;
  version: string;
  documentHash: string;
  action: ConsentAction;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface UserSettings {
  userId: string;
  notifications: {
    email: {
      transactional: boolean; // Immutable (always true)
      security: boolean;      // Immutable (always true)
      marketing: boolean;
      productUpdates: boolean;
    };
    push: {
      enabled: boolean;
      marketing: boolean;
      reminders: boolean;
    };
  };
  locale: string;
  timezone: string;
  
  // CQRS Read Model / Active Consents Snapshot
  // Allows fast O(1) queries of settings without aggregating the append-only consents log
  consents: {
    privacyPolicy: boolean;
    termsOfService: boolean;
    marketingEmails: boolean;
  };
  version: number; // Mapped to __v for OCC
  createdAt: Date;
  updatedAt: Date;
}
