type SecurityEventName =
  | 'auth.login_failed'
  | 'auth.token_expired'
  | 'auth.token_revoked'
  | 'auth.token_revoked_globally'
  | 'auth.insufficient_scope'
  | 'auth.ownership_denied'
  | 'auth.role_denied'
  | 'auth.logout'
  | 'auth.session_theft_detected'
  | 'auth.password_reset'
  | 'auth.account_deleted'
  | 'auth.mfa_failed'
  | 'account.deletion_failed_invalid_password'
  | 'account.deletion_successful';

interface SecurityEventPayload {
  userId?: string;
  ip?: string;
  userAgent?: string;
  resourceId?: string;
  requiredRole?: string;
  actualRole?: string;
  detail?: string;
  email?: string;
  timestamp?: string;
}

export function logSecurityEvent(event: SecurityEventName, payload: SecurityEventPayload = {}): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  // Write as structured JSON so log aggregators (Datadog, CloudWatch, etc.) can index fields
  console.log(JSON.stringify(entry));
}
