/**
 * Wire contracts for the Settings and LGPD Consent modules.
 *
 * Rules enforced here:
 *  - All dates are `string` (ISO 8601) — `Date` objects do not survive JSON.stringify.
 *  - `consentedAt` is the wire field name for the consent timestamp.
 *    The domain entity calls this `timestamp: Date`; the ConsentMapper in the
 *    backend renames it and forces `.toISOString()` before it crosses the HTTP
 *    boundary. Never access the raw `timestamp` in frontend code.
 *  - `documentHash` is the server-authoritative SHA-256 of the legal document.
 *    It is stored in `users_consents` as cryptographic proof and reflected here
 *    for audit trail display. The frontend MUST NOT send or override this value.
 */

/** Consent types supported by the platform. */
export type ConsentType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'marketing_emails';

/** Whether the consent was granted or revoked on this record. */
export type ConsentAction = 'granted' | 'revoked';

/**
 * A single entry in the immutable consent audit log.
 *
 * The log is append-only: both `granted` and `revoked` entries are preserved.
 * The current effective state is reflected in `SettingsResponseDTO.consents`.
 */
export interface ConsentHistoryItemDTO {
  id: string;
  type: ConsentType;
  action: ConsentAction;
  version: string;
  /**
   * SHA-256 hash of the legal document at the specified version.
   * Injected by the backend (DocumentCatalogService) — never client-supplied.
   */
  documentHash: string;
  ipAddress: string;
  userAgent: string;
  /**
   * ISO 8601 string — renamed from the domain entity's `timestamp: Date`.
   * The ConsentMapper enforces `.toISOString()` before serialisation.
   */
  consentedAt: string;
}

/** O(1) read-model snapshot of the current effective consent state. */
export interface ConsentSnapshotDTO {
  privacyPolicy: boolean;
  termsOfService: boolean;
  marketingEmails: boolean;
}

/** Email notification preferences (transactional + security are immutable server-side). */
export interface EmailNotificationDTO {
  /** Always true — cannot be disabled by the user. */
  transactional: boolean;
  /** Always true — cannot be disabled by the user. */
  security: boolean;
  marketing: boolean;
  productUpdates: boolean;
}

/** Push notification preferences. */
export interface PushNotificationDTO {
  enabled: boolean;
  marketing: boolean;
  reminders: boolean;
}

/** Notification preferences envelope. */
export interface NotificationSettingsDTO {
  email: EmailNotificationDTO;
  push: PushNotificationDTO;
}

/**
 * Full settings snapshot returned by GET /api/settings/.
 * Reflects the O(1) read model — no aggregation of the consent log needed.
 */
export interface SettingsResponseDTO {
  userId: string;
  notifications: NotificationSettingsDTO;
  locale: string;
  timezone: string;
  /** Current effective consent state — updated atomically with the audit log. */
  consents: ConsentSnapshotDTO;
  /** OCC version counter — increments on every transactional write. */
  version: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Payload for POST /api/settings/consents. */
export interface SubmitConsentDTO {
  consentType: ConsentType;
  /** SemVer string — must match an entry in the backend's DocumentCatalogService. */
  version: string;
  action: ConsentAction;
}

/** Payload for PATCH /api/settings/notifications. */
export interface UpdateNotificationsDTO {
  email: Pick<EmailNotificationDTO, 'marketing' | 'productUpdates'>;
  push: PushNotificationDTO;
}

/** Payload for PATCH /api/settings/locale. */
export interface UpdateLocaleDTO {
  locale: string;
  timezone: string;
}
