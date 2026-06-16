# SupliList - Security Checklist

**Version:** 1.0.0  
**Date:** 2026-06-16  
**Type:** Pre-Deployment & Maintenance Checklist  
**Frequency:** Pre-deployment (each release), Monthly (maintenance)

---

## Pre-Deployment Security Checklist

Use this checklist before deploying to production. All items must be marked complete before release.

### Infrastructure & Networking

#### Cloudflare Configuration
- [ ] **DNS CNAME Record**
  - [ ] `suplilist.app` points to Cloudflare CDN
  - [ ] Direct IP access blocked (403 on direct requests)
  - [ ] Test: `curl --resolve suplilist.app:443:1.2.3.4 https://suplilist.app` returns 403

- [ ] **Cloudflare Edge Token**
  - [ ] `CF_EDGE_TOKEN` configured in environment
  - [ ] Token value is random, 32+ characters
  - [ ] All production requests require header: `X-Suplilist-Edge-Token: [token]`
  - [ ] Test: Request without token returns 403

- [ ] **WAF Rules Active**
  - [ ] OWASP ModSecurity ruleset: ENABLED
  - [ ] Sensitivity: HIGH
  - [ ] Bot Management: ENABLED (Pro plan)
  - [ ] Rate Limiting: 100 req/min per IP
  - [ ] Custom rules: SQL injection, XSS, injection patterns

- [ ] **SSL/TLS Configuration**
  - [ ] **Minimum TLS Version:** 1.3 only
  - [ ] **Ciphers:** Only modern suites (TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256)
  - [ ] **HSTS Header:** Present, max-age ≥ 31536000 (1 year)
  - [ ] **HSTS Preload:** Enabled
  - [ ] **Certificate:** Valid for suplilist.app and *.suplilist.app
  - [ ] Test: `testssl.sh suplilist.app` returns A+ grade

- [ ] **DDoS Protection**
  - [ ] Standard DDoS protection: ENABLED
  - [ ] TCP/UDP flood protection: ON
  - [ ] HTTP flood protection: ON
  - [ ] DNS flood protection: ON
  - [ ] Test: Monitor alerts during deployment

#### Network & Firewall
- [ ] **Security Group Configuration** (AWS ALB)
  - [ ] Inbound: Only 80 (HTTP→HTTPS), 443 (HTTPS) from Cloudflare IPs
  - [ ] Outbound: Only required services (MongoDB Atlas, Redis, AWS S3, Resend, Stripe)
  - [ ] VPC: Private subnet (not directly accessible)
  - [ ] Test: `nmap suplilist.app` shows only ports 80, 443

- [ ] **MongoDB Atlas Network**
  - [ ] VPC peering configured (AWS → MongoDB Atlas)
  - [ ] VPC peering authorized
  - [ ] IP whitelist includes only load balancer IPs
  - [ ] Direct IP access blocked
  - [ ] Test: `mongo --host [connection-string]` succeeds from production only

- [ ] **Redis Network**
  - [ ] TLS encryption enabled (In-transit)
  - [ ] Authentication: Strong password (32+ chars, no common words)
  - [ ] Access: VPC peering only, no public endpoint
  - [ ] Test: `redis-cli --tls --host [endpoint] ping` returns PONG

### Application Security - Core

#### Environment Variables & Secrets
- [ ] **Secrets Validation**
  - [ ] All secrets in environment variables (zero hardcoded secrets)
  - [ ] `.env.example` created (no actual values)
  - [ ] `.env` file in .gitignore
  - [ ] `.env.production` in secure manager (not in repo)
  - [ ] Test: `grep -r "sk-\|api-key\|secret" src/ | grep -v ".example"` returns no results

- [ ] **JWT Configuration**
  - [ ] `JWT_SECRET` ≥ 32 characters (256 bits minimum)
  - [ ] `JWT_SECRET` not starting with "dev-only-" in production
  - [ ] Token expiration: 1 hour for access tokens
  - [ ] Token expiration: 7 days for refresh tokens
  - [ ] Token algorithm: HS256 (or RS256 for better security)
  - [ ] Test: `node -e "console.log(process.env.JWT_SECRET.length)"` ≥ 32

- [ ] **API Keys & Credentials**
  - [ ] Stripe secret key: Valid production key (sk_live_* format)
  - [ ] Google OAuth client secret: Configured
  - [ ] Firebase service account: Configured with proper permissions
  - [ ] AWS credentials: IAM role (not hardcoded)
  - [ ] Resend API key: Valid production key
  - [ ] All keys rotated in past 60 days
  - [ ] Test: Verify each service accepts requests with provided credentials

#### Authentication & Authorization
- [ ] **Firebase Configuration**
  - [ ] Firebase project: Production project (not dev)
  - [ ] Sign-in methods: Email/password, Google enabled
  - [ ] Email verification: Enabled
  - [ ] Password policy: Min 12 chars enforced by Firebase config
  - [ ] Test: Attempt to create account with weak password (rejected)

- [ ] **Multi-Factor Authentication**
  - [ ] TOTP (Google Authenticator): Supported
  - [ ] Recovery codes: Generated and encrypted
  - [ ] MFA enforcement: Enabled for admin accounts
  - [ ] MFA optional for regular users
  - [ ] Test: Setup TOTP, verify code validation works

- [ ] **Session Management**
  - [ ] Sessions stored in Redis (encrypted)
  - [ ] Session cookie: HttpOnly flag set
  - [ ] Session cookie: Secure flag set (HTTPS only)
  - [ ] Session cookie: SameSite=Strict
  - [ ] Session timeout: 30 minutes idle
  - [ ] Max concurrent sessions: 5 per user
  - [ ] Test: Verify cookie flags: `Set-Cookie: ... ; HttpOnly; Secure; SameSite=Strict`

- [ ] **Token Revocation**
  - [ ] Logout invalidates all tokens (Redis blacklist)
  - [ ] Token blacklist TTL matches token expiration
  - [ ] Logout works across devices
  - [ ] Test: Login → Logout → Token rejected

- [ ] **CSRF Protection**
  - [ ] CSRF guard middleware active
  - [ ] CSRF tokens generated per session
  - [ ] Token length: ≥32 bytes
  - [ ] Token validation: Strict comparison (no timing leaks)
  - [ ] Safe methods (GET, HEAD, OPTIONS) exempt from CSRF check
  - [ ] Webhook endpoints exempt from CSRF
  - [ ] Test: POST without CSRF token returns 403; with valid token succeeds

#### Input Validation & Sanitization
- [ ] **Zod Schema Validation**
  - [ ] All POST/PUT/PATCH endpoints have Zod schemas
  - [ ] GET query parameters validated
  - [ ] File upload size limits enforced (max 10MB)
  - [ ] File type whitelist enforced (image files only)
  - [ ] String length limits enforced (no >1000 char free-text fields)
  - [ ] Numeric fields have min/max bounds
  - [ ] Test: POST with invalid data returns 400 + validation error

- [ ] **NoSQL Injection Prevention**
  - [ ] Query operators whitelist (e.g., $ne, $gt only where needed)
  - [ ] No direct JSON parsing from user input
  - [ ] MongoDB uses parameterized queries (no string concatenation)
  - [ ] Test: POST `/api/supplements/search` with `{"$ne":null}` returns validation error

- [ ] **XSS Prevention**
  - [ ] HTML entity encoding on user input display
  - [ ] Content Security Policy headers present
  - [ ] CSP: script-src 'self' only (no unsafe-eval, no unsafe-inline)
  - [ ] CSP: style-src 'self' only (no inline styles)
  - [ ] CSP: img-src 'self' https: only
  - [ ] CSP: frame-src 'none' (no iframes)
  - [ ] Test: Verify CSP header present: `curl -I https://suplilist.app | grep Content-Security-Policy`

- [ ] **Command Injection Prevention**
  - [ ] No shell.exec() or similar with user input
  - [ ] All external commands use array arguments (not shell strings)
  - [ ] ImageMagick/file processing uses safe options only
  - [ ] Test: No shell redirection operators allowed in any input

#### Rate Limiting & DDoS Protection
- [ ] **Global Rate Limiting**
  - [ ] Rate limit: 100 requests per 15 minutes per IP
  - [ ] Rate limit headers present: X-RateLimit-Limit, X-RateLimit-Remaining
  - [ ] Retry-After header on 429 responses
  - [ ] Test: 101st request in 15 min window returns 429

- [ ] **Authentication Rate Limiting**
  - [ ] Rate limit: 5 attempts per 15 minutes per IP
  - [ ] Brute force protection: CAPTCHA after 3 failed attempts
  - [ ] Account lockout: After 5 failed attempts (24 hour lockout)
  - [ ] Test: 5+ failed logins trigger lockout

- [ ] **API Endpoint Rate Limiting**
  - [ ] Search endpoints: 30 req/min per user
  - [ ] Upload endpoints: 10 req/min per user
  - [ ] Write endpoints (POST/PUT/DELETE): 20 req/min per user
  - [ ] Test: Exceed limit, verify 429 response

#### Data Protection & Encryption
- [ ] **TLS/SSL**
  - [ ] Enforce HTTPS: All traffic redirects to HTTPS
  - [ ] HSTS header: Present with max-age ≥ 31536000
  - [ ] HSTS preload: Enabled
  - [ ] TLS version: 1.3 minimum
  - [ ] Test: `curl http://suplilist.app` redirects to HTTPS

- [ ] **Encryption at Rest**
  - [ ] Sensitive fields encrypted in MongoDB:
    - [ ] User email address
    - [ ] Phone number
    - [ ] Health preferences
    - [ ] Payment metadata (NOT card tokens)
  - [ ] Encryption algorithm: AES-256-GCM
  - [ ] Encryption keys stored separately (not in database)
  - [ ] Test: Query database directly, encrypted fields are unreadable

- [ ] **Database Backups**
  - [ ] Backup encryption: Enabled (AWS KMS)
  - [ ] Customer Managed Key (CMK): Yes
  - [ ] Backup retention: 30 days minimum
  - [ ] Backup restore tested: At least monthly
  - [ ] Test: Verify latest backup can be restored to test environment

#### API & Webhook Security
- [ ] **API Response Security**
  - [ ] No sensitive data in error messages (stack traces hidden)
  - [ ] No API version in response body
  - [ ] No SQL version information leaked
  - [ ] Error responses do not leak existence of resources
  - [ ] Test: Trigger error, verify no stack trace or internal details

- [ ] **Stripe Webhook Signature Verification**
  - [ ] Webhook secret configured: `STRIPE_WEBHOOK_SECRET`
  - [ ] Signature verification: `stripe.webhooks.constructEvent()`
  - [ ] Signature invalid: Return 400 error
  - [ ] Raw body used (not parsed): Signature verification requires exact bytes
  - [ ] Replay protection: Timestamp checked within 5 min tolerance
  - [ ] Test: Manually post webhook with invalid signature, verify rejection

- [ ] **Payment Processing (Stripe)**
  - [ ] No card data stored locally (tokenization only)
  - [ ] Payment intent created server-side
  - [ ] Client receives only `client_secret` (not full intent)
  - [ ] Amount verified server-side (can't be modified by client)
  - [ ] Customer verified (user can't pay for other users)
  - [ ] Test: Attempt to modify amount in request, verify server-side rejection

#### Error Handling & Logging
- [ ] **Error Responses**
  - [ ] Production: No stack traces returned to client
  - [ ] Production: Generic "Something went wrong" messages only
  - [ ] All errors logged internally with full details
  - [ ] Error IDs returned to client for support reference
  - [ ] Test: Trigger 500 error, verify generic message without details

- [ ] **Logging**
  - [ ] Security events logged: Auth attempts, failures, access denied
  - [ ] Sensitive data masked in logs:
    - [ ] IPs masked: Only last octet visible (X.X.X.XXX)
    - [ ] Email masked: user@suplilist... only
    - [ ] Tokens masked: Last 4 chars only
    - [ ] Passwords: Never logged (except bcrypt hash for auth)
  - [ ] Logs centralized: Sentry or ELK
  - [ ] Logs immutable: Cannot be modified after 48 hours
  - [ ] Log retention: 1 year for security logs
  - [ ] Test: Check logs for any unmasked sensitive data

#### CORS & Headers
- [ ] **CORS Configuration**
  - [ ] Origins whitelist: Only specific domains (no wildcards)
  - [ ] Origins for production: https://suplilist.app only
  - [ ] Origins for staging: https://staging.suplilist.app only
  - [ ] Credentials: true (for cookies)
  - [ ] Exposed headers: Only necessary (X-RateLimit-*, X-Error-Id)
  - [ ] Test: CORS preflight for unauthorized origin returns rejection

- [ ] **Security Headers**
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY (no clickjacking)
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - [ ] Content-Security-Policy: Present and strict
  - [ ] Referrer-Policy: no-referrer
  - [ ] Permissions-Policy: Disable unnecessary features
  - [ ] Test: `curl -I https://suplilist.app | grep -E "X-|Strict|Content-Security"`

### Data Privacy & Compliance

#### GDPR Compliance
- [ ] **Data Export Endpoint**
  - [ ] GET /api/gdpr/data-export available and working
  - [ ] Returns all user personal data in JSON format
  - [ ] Format: Portable (standard JSON structure)
  - [ ] Test: Export own data, verify completeness

- [ ] **Account Deletion**
  - [ ] DELETE /api/gdpr/account available
  - [ ] Deletion scheduled: 30-day grace period
  - [ ] Grace period is reversible
  - [ ] Final deletion: All personal data removed
  - [ ] Audit logs: Anonymized (not deleted for compliance)
  - [ ] Test: Delete account, verify in 30 days

- [ ] **Consent Management**
  - [ ] Consent collection: Marketing emails, analytics
  - [ ] Consent storage: With timestamp and IP address
  - [ ] Consent change: Honored immediately
  - [ ] Consent withdrawal: Services disabled
  - [ ] Test: Withdraw analytics consent, verify disabled

- [ ] **Privacy Policy**
  - [ ] Published: https://suplilist.app/privacy-policy
  - [ ] Last updated date: Current (within 6 months)
  - [ ] Covers all data collection: Profiling, tracking, affiliates
  - [ ] Covers retention policies
  - [ ] Covers user rights
  - [ ] Test: Access privacy policy, verify current

#### PCI DSS Compliance (Payments)
- [ ] **Payment Card Data**
  - [ ] No card numbers stored: NEVER
  - [ ] No CVV stored: NEVER
  - [ ] No track data stored: NEVER
  - [ ] Tokenization only: Stripe payment tokens
  - [ ] Test: Query database for card numbers (should be 0 results)

- [ ] **PCI Scope**
  - [ ] Scope: Out of scope (Stripe handles all card processing)
  - [ ] SAQ: Type A (minimal PCI requirements)
  - [ ] Test: Verify no cardholder data in system

#### Data Retention
- [ ] **Retention Policies Implemented**
  - [ ] User personal data: Until deletion + 30 days backup
  - [ ] Activity logs: 1 year
  - [ ] Audit logs: 2 years
  - [ ] Analytics data: 1 year (GDPR consent)
  - [ ] Payment records: 7 years (tax/legal requirement)
  - [ ] Automatic deletion: Implemented and tested

---

### Dependency & Code Security

#### Dependency Scanning
- [ ] **npm Dependencies**
  - [ ] `npm audit` runs without high severity vulnerabilities
  - [ ] `npm audit --audit-level=moderate` passes
  - [ ] All dependencies up-to-date (or pinned for stability)
  - [ ] Package-lock.json committed and up-to-date
  - [ ] Test: Run `npm audit` before deployment

- [ ] **Known Vulnerabilities**
  - [ ] Snyk scan: All dependencies checked
  - [ ] Snyk: No high/critical vulnerabilities
  - [ ] Test: `npx snyk test` passes

- [ ] **Deprecated Dependencies**
  - [ ] No deprecated packages in production dependencies
  - [ ] No packages with active security advisories
  - [ ] Maintenance status: Active (not archived)
  - [ ] Test: Check package.json for "deprecated" packages

#### Code Security
- [ ] **No Hardcoded Secrets**
  - [ ] grep for secret patterns: `grep -r "sk-\|api-key\|secret" src/`
  - [ ] No private keys in repo
  - [ ] No credentials in comments
  - [ ] Test: Scan codebase for secrets before deploy

- [ ] **No Console.log in Production**
  - [ ] All console.log removed from production code
  - [ ] Logging uses proper logger (Winston, Pino, etc.)
  - [ ] Debug statements removed
  - [ ] Test: Build production bundle, grep for console.log

- [ ] **Type Safety**
  - [ ] TypeScript strict mode enabled
  - [ ] No any types (or justified with comment)
  - [ ] All function signatures typed
  - [ ] Test: `tsc --noEmit` passes without errors

#### Code Review
- [ ] **Security Review Completed**
  - [ ] All commits reviewed by second person
  - [ ] Security team review (if required)
  - [ ] Approval from code owners
  - [ ] Branch protection: Requires PR review
  - [ ] Branch protection: Requires status checks to pass

---

### Infrastructure & Operations

#### Monitoring & Alerting
- [ ] **Application Monitoring**
  - [ ] Sentry/Error tracking: Enabled and configured
  - [ ] Performance monitoring: Enabled (APM)
  - [ ] Uptime monitoring: External check every 5 min
  - [ ] Test: Verify alerts trigger on errors

- [ ] **Security Monitoring**
  - [ ] Failed authentication attempts logged
  - [ ] Rate limit violations logged
  - [ ] Injection attempts logged
  - [ ] Authorization failures logged
  - [ ] Admin actions logged
  - [ ] Test: Verify security events in logs

- [ ] **Alerting Rules**
  - [ ] Alert: 5+ failed logins per user in 15 min
  - [ ] Alert: Rate limit exceeded >10 times in 5 min
  - [ ] Alert: Injection attempt detected
  - [ ] Alert: Authorization failure on sensitive endpoint
  - [ ] Alert: API error rate >5% in 5 min
  - [ ] Response time: <15 minutes for critical alerts

#### Backup & Disaster Recovery
- [ ] **Database Backups**
  - [ ] Automated daily backups: Enabled
  - [ ] Backup encryption: Enabled (AWS KMS)
  - [ ] Backup retention: 30 days minimum
  - [ ] Backup testing: Monthly restore test
  - [ ] Test: Restore backup to test database, verify data integrity

- [ ] **Code & Configuration Backups**
  - [ ] Git repository: Backed up daily
  - [ ] Backup location: Secure, geographically distributed
  - [ ] Configuration: Version controlled (not stored in database)
  - [ ] Test: Verify recovery procedure works

#### Compliance & Audit
- [ ] **Audit Logging**
  - [ ] All user actions logged: Create, Read, Update, Delete
  - [ ] Admin actions logged: User management, settings changes
  - [ ] Logs immutable: Cannot be modified after creation
  - [ ] Log retention: 2 years for compliance

- [ ] **Documentation**
  - [ ] Security policies documented
  - [ ] Incident response plan written and reviewed
  - [ ] Penetration test completed (or scheduled)
  - [ ] Security assessment documented
  - [ ] Test: Review all security documentation

---

## Monthly Security Maintenance Checklist

Complete these items monthly to maintain security posture.

### Week 1: Dependency & Vulnerability Review

- [ ] **Run Security Scans**
  - [ ] `npm audit` and address findings
  - [ ] `npx snyk test` and review results
  - [ ] `npm outdated` and evaluate updates
  - [ ] Check for CVEs in top 10 packages

- [ ] **Update Dependencies** (if available)
  - [ ] Review breaking changes
  - [ ] Test compatibility
  - [ ] Deploy to staging
  - [ ] Promote to production if tests pass

- [ ] **Certificate Expiration Check**
  - [ ] Check TLS certificate expiration date
  - [ ] Verify auto-renewal is enabled
  - [ ] Test certificate on staging domain

### Week 2: Log & Monitoring Review

- [ ] **Analyze Security Logs**
  - [ ] Failed authentication attempts: Normal?
  - [ ] Rate limit violations: Legitimate traffic?
  - [ ] Injection attempts: Any successes?
  - [ ] Authorization failures: Expected behavior?

- [ ] **Sentry/Error Tracking Review**
  - [ ] Top 10 errors: Understand and address
  - [ ] Error rate trend: Increasing or stable?
  - [ ] Performance issues: Check latency p95/p99
  - [ ] Address critical errors

- [ ] **Alerting Rules Review**
  - [ ] Any alert fatigue? Adjust thresholds
  - [ ] Missing alerts? Add new rules
  - [ ] Response times: Still meeting SLA?

### Week 3: Access Control & Secrets Review

- [ ] **IAM & Access Review**
  - [ ] Who has admin access? Expected?
  - [ ] Who has database access? Least privilege?
  - [ ] SSH keys: Rotate if needed
  - [ ] API tokens: Revoke unused tokens

- [ ] **Secrets Rotation**
  - [ ] JWT_SECRET: Due for rotation? (90 days)
  - [ ] API keys: Due for rotation? (60 days)
  - [ ] Database passwords: Due for rotation? (120 days)
  - [ ] Webhook secrets: Any compromises reported?

- [ ] **Backup & Recovery Testing**
  - [ ] Restore latest backup to test environment
  - [ ] Verify data integrity
  - [ ] Test recovery procedure
  - [ ] Document recovery time (RTO)

### Week 4: Compliance & Documentation

- [ ] **Compliance Checklist**
  - [ ] GDPR data rights: Tested and working
  - [ ] PCI compliance: No card data stored
  - [ ] Data retention policies: Being followed
  - [ ] Privacy policy: Current and accurate

- [ ] **Documentation & Policies**
  - [ ] Security policies: Up-to-date?
  - [ ] Incident response plan: Practiced recently?
  - [ ] Penetration test results: Findings addressed?
  - [ ] Risk assessment: Any new risks?

- [ ] **Team Training**
  - [ ] Any security training needed?
  - [ ] New team members briefed on practices?
  - [ ] OWASP Top 10: Reviewed with team?
  - [ ] Incident response plan: Everyone knows procedure?

---

## Post-Deployment Checklist

**Complete within 24 hours of production deployment:**

- [ ] **Health Checks**
  - [ ] All endpoints responding (200 OK)
  - [ ] Database connectivity: OK
  - [ ] Cache (Redis): OK
  - [ ] External services (Stripe, Firebase): OK
  - [ ] Email sending: Test email received

- [ ] **Security Verification**
  - [ ] HTTPS redirect working
  - [ ] Security headers present
  - [ ] CORS whitelist correct
  - [ ] Rate limiting functional
  - [ ] Authentication working

- [ ] **Performance Baseline**
  - [ ] Page load time: Acceptable
  - [ ] API response time: Acceptable
  - [ ] Error rate: <0.1%
  - [ ] Alert rules: No false positives

- [ ] **User Communication** (if applicable)
  - [ ] Status page updated
  - [ ] Email notification sent (if needed)
  - [ ] Support team briefed
  - [ ] Bug bounty notified (if new features)

---

## Quarterly Security Review

**Complete every 3 months (or before major releases):**

- [ ] **Threat Assessment**
  - [ ] Any new threat classes in OWASP Top 10?
  - [ ] Industry breaches: Lessons learned?
  - [ ] Regulatory changes: New compliance requirements?
  - [ ] Customer feedback: Security concerns?

- [ ] **Penetration Testing** (Annual)
  - [ ] Schedule annual test (if not yet done)
  - [ ] Review previous test findings
  - [ ] Verify all remediation items completed
  - [ ] Update penetration test scope

- [ ] **Architecture Review**
  - [ ] Review data flow diagram
  - [ ] Identify new attack vectors
  - [ ] Assess third-party integrations
  - [ ] Update threat model

- [ ] **Compliance Audit**
  - [ ] GDPR: Still compliant?
  - [ ] CCPA: Applicable? Compliant?
  - [ ] PCI DSS: Still out of scope?
  - [ ] SOC 2: Internal controls documented?

- [ ] **Team & Skills**
  - [ ] Team training needs: Up-to-date?
  - [ ] Incident response drills: Schedule one
  - [ ] Code review quality: Still effective?
  - [ ] Security champion: Assigned?

---

## Sign-Off

**Pre-Deployment Checklist:**

Release Manager: _________________ Date: _________
Security Lead: _________________ Date: _________

**Monthly Maintenance:**

Completed by: _________________ Date: _________
Reviewed by: _________________ Date: _________

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-16  
**Next Review:** 2026-12-16 (6 months)
