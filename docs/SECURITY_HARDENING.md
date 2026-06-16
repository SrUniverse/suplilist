# SupliList - Final Security Hardening Guide

**Version:** 1.0.0  
**Date:** 2026-06-16  
**Status:** Production Ready  
**Scope:** Infrastructure, Application, Data, and Compliance Security

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Infrastructure Security](#infrastructure-security)
3. [Application Security](#application-security)
4. [Data Protection & Encryption](#data-protection--encryption)
5. [Secrets Management](#secrets-management)
6. [OWASP Top 10 Mitigation](#owasp-top-10-mitigation)
7. [Compliance Framework](#compliance-framework)
8. [Security Monitoring & Logging](#security-monitoring--logging)
9. [Incident Response Procedures](#incident-response-procedures)
10. [Security Checklist](#security-checklist)

---

## Executive Summary

SupliList implements **defense-in-depth** security across all layers:

- **Infrastructure Layer:** Network isolation, DDoS protection, WAF, Cloudflare Edge
- **Application Layer:** OWASP Top 10 mitigations, input sanitization, CSRF protection
- **Data Layer:** AES-256 encryption at rest and in transit, TLS 1.3, tokenization
- **Compliance:** GDPR, CCPA, privacy-by-design, audit logging

This document outlines all hardening measures, configurations, and procedures for production deployment.

---

## Infrastructure Security

### 1. Network Isolation

**Objective:** Minimize attack surface by isolating the application from the public internet.

#### Architecture

```
Internet
   ↓
Cloudflare CDN (DDoS protection, WAF)
   ↓
AWS ALB (Load Balancer, SSL termination)
   ↓
Render.com (Private Cloud - no direct IP access)
   ↓
MongoDB Atlas (VPC peering)
   ↓
Redis (VPC peering, encryption in transit)
```

#### Implementation

1. **DNS CNAME Redirect**
   ```
   suplilist.app → suplilist.pages.cloudflare.app
   ```
   - Masks origin IP from direct access
   - Enables Cloudflare security features (WAF, bot management, rate limiting)

2. **Origin Shield (Cloudflare)**
   - Deployed in primary region (US-East)
   - Reduces origin bandwidth by 80%
   - Mitigates cache-busting attacks

3. **Render.com Configuration**
   - Private endpoints for MongoDB & Redis
   - No public IP exposure
   - VPC peering for database access

### 2. Firewall Rules

**Objective:** Enforce strict ingress/egress policies.

#### Cloudflare WAF Rules

**High Priority (Automatic Block):**
```
1. SQL Injection (OWASP CRS)
2. XSS Attacks (OWASP CRS)
3. Local File Inclusion (OWASP CRS)
4. Protocol Attacks (HTTP version mismatches)
5. Known CVEs (CVE-2024-* and later)
```

**Medium Priority (Challenge/Rate Limit):**
```
1. Suspicious user agents (scanners, bots)
2. Geographic anomalies (impossible travel)
3. Brute force patterns (>10 failed auth/5min)
4. Slow attacks (requests <1KB/s)
```

#### WAF Configuration (Terraform Example)

```hcl
resource "cloudflare_waf_rule" "sql_injection" {
  zone_id  = var.cloudflare_zone_id
  rule_id  = "100000"  # SQL Injection
  mode     = "block"
}

resource "cloudflare_rate_limit" "api_endpoints" {
  zone_id    = var.cloudflare_zone_id
  threshold  = 100
  period     = 60  # per minute
  match {
    request {
      url {
        path {
          matches = ["/api/*"]
        }
      }
    }
  }
  action {
    mode = "challenge"  # CAPTCHA
  }
}

resource "cloudflare_firewall_rule" "block_suspicious_ua" {
  zone_id    = var.cloudflare_zone_id
  description = "Block suspicious user agents"
  filter_id  = cloudflare_firewall_filter.suspicious_ua.id
  action     = "block"
}

resource "cloudflare_firewall_filter" "suspicious_ua" {
  zone_id    = var.cloudflare_zone_id
  description = "Suspicious UA pattern"
  expression = "(cf.bot_management.score < 30) or (http.user_agent contains \"sqlmap\")"
}
```

### 3. DDoS Protection

**Objective:** Mitigate volumetric and application-layer DDoS attacks.

#### Cloudflare DDoS Settings

```
Standard DDoS Protection:
✓ Sensitivity: High (Low false positive rate)
✓ Advanced DDoS: Enabled (available on Pro+)
✓ Rate Limiting: 100 req/min per IP per endpoint

TCP/UDP Flood Protection: Automatic
DNS Flood Protection: Automatic
HTTP Flood Protection: Enabled at edge
```

#### Application-Level Mitigations

**1. Rate Limiting (Express Middleware)**

```typescript
// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return (req.headers['x-real-ip'] as string) ||
           (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.ip;
  }
});

// Auth-specific rate limit: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req) => req.method === 'GET'
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
```

**2. Connection Timeouts**

```javascript
// Backend API timeout: 30 seconds max
const api = axios.create({
  timeout: 30 * 1000,
  maxRedirects: 0  // Prevent redirect loops
});

// Socket timeout: 60 seconds
server.setTimeout(60 * 1000);
```

### 4. WAF Configuration

**Objective:** Detect and block malicious HTTP requests.

#### Cloudflare WAF Features

| Feature | Status | Config |
|---------|--------|--------|
| OWASP ModSecurity Rules | Enabled | Default sensitivity |
| Managed Ruleset | Enabled | Latest version |
| Bot Management | Enabled (Pro) | Score threshold: 30 |
| Custom Rules | Enabled | 50+ custom patterns |
| IP Reputation | Enabled | Auto-block known bad IPs |

#### Custom Rules

```javascript
// Block API access without Cloudflare edge token (production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const edgeToken = req.headers['x-suplilist-edge-token'];
    if (!edgeToken || edgeToken !== process.env.CF_EDGE_TOKEN) {
      return res.status(403).json({ error: 'Direct access not allowed' });
    }
  }
  next();
});

// Block requests with suspicious headers
app.use((req, res, next) => {
  const suspiciousHeaders = [
    'x-scanner',
    'nmap-user-agent',
    'sqlmap'
  ];
  
  const hasSuspiciousHeader = suspiciousHeaders.some(h =>
    req.headers[h] !== undefined
  );
  
  if (hasSuspiciousHeader) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
});
```

### 5. VPN & Bastion Hosts

**For Development/Admin Access Only:**

#### Admin Access Policy

```markdown
1. SSH access to Render via VPN only
2. Database access via SSH tunnel through bastion host
3. All admin actions logged with MFA requirement
4. IP whitelist: Approved office IPs only
5. Session timeout: 30 minutes idle

## Setup

### SSH Tunnel (for database access)
ssh -L 27017:mongodb-cluster.mongodb.net:27017 ubuntu@bastion.internal

### VPN Setup (Wireguard)
1. Install Wireguard client
2. Import config: admin-access.conf
3. Connect: `wg-quick up suplilist-admin`
4. Verify: `ip addr | grep wg0`
```

---

## Application Security

### 1. Input Sanitization

**Objective:** Prevent injection attacks (SQL, NoSQL, XSS, Command Injection).

#### Zod Schema Validation

All user input is validated at the Express layer using Zod schemas:

```typescript
import { z } from 'zod';

// Example: Supplement search input
const supplementSearchSchema = z.object({
  q: z.string()
    .min(1, 'Search query required')
    .max(100, 'Search query too long')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-()]+$/, 'Invalid characters'),
  category: z.enum(['protein', 'vitamin', 'mineral', 'herb']).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

// Middleware
export const validateSupplementSearch = (req, res, next) => {
  const result = supplementSearchSchema.safeParse(req.query);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      details: result.error.flatten()
    });
  }
  
  req.validated = result.data;
  next();
};
```

#### NoSQL Injection Prevention

```typescript
// WRONG: Direct string interpolation
db.collection('users').findOne({ email: userInput });  // VULNERABLE

// CORRECT: Zod + parameterized
const validatedEmail = z.string().email().parse(userInput);
db.collection('users').findOne({ email: validatedEmail });
```

#### XSS Prevention

```typescript
// Content Security Policy (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Inline styles only from trusted sources
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.suplilist.app"],
      frameSrc: ["'none'"],  // No iframes allowed
      objectSrc: ["'none'"]  // No plugins
    }
  }
}));

// HTML entity encoding for dynamic content
function escapeHtml(text: string): string {
  const entities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => entities[char]);
}
```

### 2. OWASP Top 10 Checks

#### A01: Broken Access Control

**Status:** IMPLEMENTED

```typescript
// Role-based access control (RBAC)
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logSecurityEvent('access_control.unauthorized', {
        userId: req.user?.id,
        requiredRoles: roles,
        actualRole: req.user?.role
      });
      return res.status(403).json({
        success: false,
        error: 'insufficient_permissions'
      });
    }
    next();
  };
};

// Resource ownership verification
app.get('/api/profile/:id', async (req, res) => {
  const profileId = req.params.id;
  const userId = req.user!.id;
  
  // Verify user owns profile
  const profile = await profileRepository.findById(profileId);
  if (profile.userId !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(profile);
});
```

#### A02: Cryptographic Failures

**Status:** IMPLEMENTED

- JWT tokens signed with HS256 (256-bit secret)
- Passwords hashed with bcrypt (cost factor: 12)
- All data encrypted in transit (TLS 1.3)
- PII encrypted at rest (AES-256-GCM)

#### A03: Injection

**Status:** IMPLEMENTED

- Input validation via Zod schemas
- Parameterized queries (MongoDB)
- Output encoding (HTML entities)
- Command injection prevention (no shell exec of user input)

#### A04: Insecure Design

**Status:** IMPLEMENTED

- Threat modeling completed
- Security requirements defined in sprints
- Secure defaults (deny-by-default)
- Privacy-by-design (GDPR/CCPA compliant)

#### A05: Security Misconfiguration

**Status:** IMPLEMENTED

- Environment variables validated at startup
- Security headers enforced (Helmet)
- Error messages sanitized (no stack traces in production)
- Unnecessary endpoints disabled

#### A06: Vulnerable & Outdated Components

**Status:** IMPLEMENTED

```bash
# Regular dependency audits
npm audit --audit-level=moderate

# Automated updates
npm update

# Check for known CVEs
npx snyk test

# SBOM generation
npm run sbom  # Generates software bill of materials
```

#### A07: Authentication Failures

**Status:** IMPLEMENTED

- Multi-factor authentication (2FA via TOTP)
- Session management with Redis token blocklist
- Device verification for sensitive operations
- Password reset via time-limited tokens (5 min validity)
- Login attempt rate limiting (5 per 15 min)

#### A08: Software & Data Integrity Failures

**Status:** IMPLEMENTED

- Stripe webhook signature verification
- NPM package lock file (package-lock.json)
- Secure CI/CD (GitHub Actions signed)
- Code review before merge

#### A09: Logging & Monitoring Failures

**Status:** IMPLEMENTED

- Centralized logging via Sentry/ELK
- Security events logged with context
- PII masking in logs
- Real-time alerts for critical events

#### A10: SSRF, Using Components with Known Vulnerabilities

**Status:** IMPLEMENTED

- URL validation before HTTP requests
- Dependency scanning (Snyk)
- No arbitrary external redirects

### 3. API Security

#### JWT Token Management

```typescript
// Token structure
interface JWTPayload {
  uid: string;        // Firebase UID
  email: string;
  role: UserRole;
  jti: string;        // JWT ID for revocation
  iat: number;        // Issued at
  exp: number;        // Expires in 1 hour
  iss: 'suplilist';   // Issuer
}

// Signature: HS256 with 256-bit secret
const secret = process.env.JWT_SECRET;  // Min 32 chars (256 bits)

// Token blacklist (Redis)
const blocklist = new Set<string>();
async function revokeToken(jti: string) {
  await redis.setex(`token:blacklist:${jti}`, 3600, '1');
}

// Verification
async function verifyToken(token: string): Promise<JWTPayload> {
  const decoded = jwt.verify(token, secret) as JWTPayload;
  
  // Check blacklist
  const isBlacklisted = await redis.get(`token:blacklist:${decoded.jti}`);
  if (isBlacklisted) {
    throw new Error('Token revoked');
  }
  
  return decoded;
}
```

#### CORS Configuration

```typescript
const ALLOWED_ORIGINS = {
  development: ['http://localhost:5173'],
  production: ['https://suplilist.app', 'https://app.suplilist.app']
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS[process.env.NODE_ENV].includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400  // 24 hours
}));
```

#### CSRF Protection

```typescript
// Express middleware: CSRF guard with custom header strategy
app.use(csrfGuard);

// Implementation
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  // Skip for safe methods and webhooks
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }
  
  // Get token from header
  const token = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;
  const sessionToken = req.cookies[CSRF_COOKIE_NAME];
  
  if (!token || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: 'csrf_token_invalid'
    });
  }
  
  next();
};

// Generate CSRF token for client
app.get('/api/csrf-token', (req, res) => {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,  // Must be readable by JS for custom header
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000   // 1 hour
  });
  
  res.json({ token });
});
```

---

## Data Protection & Encryption

### 1. Encryption at Rest

**Objective:** Protect sensitive data in databases and backups.

#### MongoDB Encryption

```javascript
// Application-level encryption for PII
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');  // 32 bytes for AES-256

async function encryptPII(plaintext: string): Promise<string> {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    encryptionKey,
    crypto.randomBytes(16)  // IV
  );
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${authTag.toString('hex')}.${encrypted}`;
}

async function decryptPII(ciphertext: string): Promise<string> {
  const [authTag, encrypted] = ciphertext.split('.');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    crypto.randomBytes(16)
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Encrypted fields
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    encrypted: true,  // Custom encryption hook
    index: false
  },
  phone: {
    type: String,
    encrypted: true
  },
  ssn: {
    type: String,
    encrypted: true,
    sensitive: true
  }
});
```

#### Database Backups Encryption

```bash
# MongoDB Atlas: Backup Encryption
- Enable: Automated Backups > Backup Configuration > Encryption at rest
- KMS: AWS KMS (Customer Managed Key)
- Retention: 30 days minimum

# Manual Backup Encryption
mongodump --uri="mongodb+srv://..." | \
  openssl enc -aes-256-cbc -salt -out backup.enc
```

### 2. Encryption in Transit

**Objective:** Protect data during transmission.

#### TLS/SSL Configuration

```javascript
// Enforce TLS 1.3 minimum
const server = https.createServer({
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('certificate.pem'),
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256'
  ],
  ecdhCurve: 'prime256v1'
}, app);

// HSTS (Force HTTPS)
app.use(helmet.hsts({
  maxAge: 31536000,  // 1 year
  includeSubDomains: true,
  preload: true
}));

// Upgrade insecure requests
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});
```

#### Certificate Management

```bash
# Automatic renewal with Let's Encrypt
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d suplilist.app

# Auto-renewal check
sudo systemctl list-timers | grep certbot

# Monitor certificate expiration
openssl x509 -in certificate.pem -text -noout | grep "Not After"
```

### 3. Tokenization

**For Payment Card Data (PCI DSS Compliance):**

```typescript
// Stripe tokenization (never store raw card data)
async function createPaymentIntent(amount: number, customerId: string) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,  // cents
    currency: 'usd',
    customer: customerId,
    payment_method_types: ['card'],
    statement_descriptor: 'SUPLILIST',
    metadata: {
      orderId: generateOrderId(),
      userId: customerId
    }
  });
  
  return paymentIntent.client_secret;  // Send to client
}

// Verify payment (server-side)
async function confirmPayment(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Payment failed');
  }
  
  return paymentIntent;
}
```

---

## Secrets Management

### 1. Secret Rotation

**Objective:** Minimize impact of compromised secrets.

#### Rotation Schedule

| Secret | Rotation | Trigger |
|--------|----------|---------|
| JWT_SECRET | Every 90 days | Calendar or breach |
| API_KEYS | Every 60 days | Quarterly audit |
| DB_PASSWORD | Every 120 days | Compliance requirement |
| WEBHOOK_SECRET | On breaches | Immediate |
| OAUTH_CLIENT_SECRET | Immediately | Any compromise |

#### Rotation Procedure

```bash
# 1. Generate new secret
openssl rand -base64 32 > /tmp/new_secret.txt

# 2. Update in secret manager (Vault/AWS Secrets Manager)
aws secretsmanager update-secret \
  --secret-id suplilist/jwt-secret \
  --secret-string "$(cat /tmp/new_secret.txt)"

# 3. Deploy with grace period (dual-key algorithm)
# Accept both old and new keys for 24 hours
export JWT_SECRET_NEW="<new>"
export JWT_SECRET_OLD="<old>"

# 4. Verify no service disruption
# Check logs for auth failures

# 5. Remove old key after 24 hours
unset JWT_SECRET_OLD

# 6. Document rotation
echo "JWT rotated: $(date)" >> SECURITY_LOG.md
```

### 2. Access Control

**Objective:** Limit who can view/modify secrets.

#### Secret Access Matrix

| Secret | Developers | Ops | Admin | Notes |
|--------|-----------|-----|-------|-------|
| JWT_SECRET | Read | Read | Read/Write | For local dev & prod |
| API_KEYS | Read | Read | Write | Stripe, AWS, etc. |
| DB_PASSWORD | Read | Read/Write | Write | Production only |
| OAUTH_CLIENT_SECRET | Read | Read | Write | Sensitive |

#### Vault Configuration (HashiCorp Vault)

```hcl
path "secret/suplilist/production/*" {
  capabilities = ["read"]
  policy = "developers"
  metadata {
    description = "Production secrets (read-only)"
  }
}

path "secret/suplilist/production/*" {
  capabilities = ["create", "read", "update"]
  policy = "ops"
  metadata {
    description = "Production secrets (full access)"
  }
}

# Audit logging
audit {
  file {
    path = "/var/log/vault/audit.log"
  }
}

# MFA required for sensitive operations
mfa {
  type = "totp"
  force = true
  mount_accessor = "auth_approle"
}
```

### 3. Audit Logging

**Objective:** Track all secret access and modifications.

```typescript
// Every secret access logged
interface SecretAccessLog {
  timestamp: string;
  user: string;
  action: 'read' | 'update' | 'delete';
  secret: string;  // Name, not value
  status: 'success' | 'failed';
  reason?: string;
  ipAddress: string;
}

async function logSecretAccess(log: SecretAccessLog) {
  await auditDb.collection('secrets').insertOne(log);
  
  // Alert on suspicious access
  if (log.action === 'read' && isOutsideBusinessHours()) {
    sendAlert(`Unusual secret access: ${log.secret}`);
  }
}

// Query audit logs
async function getSecretAccessHistory(secretName: string, days: number = 90) {
  const cutoff = new Date(Date.now() - days * 86400000);
  return auditDb.collection('secrets').find({
    secret: secretName,
    timestamp: { $gte: cutoff.toISOString() }
  }).toArray();
}
```

---

## Compliance Framework

### 1. GDPR Compliance

**Objective:** Respect user privacy and data rights.

#### Data Processing Agreement

```markdown
# Data Processing & Privacy

## User Rights (Articles 12-22 GDPR)

1. **Right to Know**
   - GET /api/profile/data → Download all personal data
   - Format: JSON (portable)

2. **Right to Rectification**
   - PATCH /api/profile → Update information
   - Change history tracked

3. **Right to Erasure (Right to be Forgotten)**
   - DELETE /api/account → Permanent deletion
   - Grace period: 30 days (reversible)
   - After 30 days: All personal data removed
   - Backups purged after 90 days

4. **Right to Restrict Processing**
   - PATCH /api/settings/data-retention → Disable analytics
   - Flag: restrict_processing = true

5. **Right to Data Portability**
   - GET /api/profile/export → All data in standard format
   - Includes: Profile, supplements, stacks, preferences
```

#### Technical Implementation

```typescript
// Data export (GDPR Article 20)
app.get('/api/gdpr/data-export', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  
  const userData = await Promise.all([
    userModel.findById(userId),
    profileModel.findOne({ userId }),
    stackModel.find({ userId }),
    supplementModel.find({ userId }),
    auditLog.find({ userId })
  ]);
  
  res.json({
    exported_at: new Date().toISOString(),
    user_data: userData
  });
});

// Account deletion (GDPR Article 17)
app.delete('/api/gdpr/account', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const deletionScheduled = new Date();
  deletionScheduled.setDate(deletionScheduled.getDate() + 30);  // 30-day grace
  
  await userModel.updateOne(
    { _id: userId },
    {
      deletion_requested_at: new Date(),
      deletion_scheduled_at: deletionScheduled,
      status: 'deletion_pending'
    }
  );
  
  // Send confirmation email
  await sendEmail(req.user!.email, 'account-deletion-confirmation', {
    cancelUrl: `${process.env.FRONTEND_URL}/api/gdpr/cancel-deletion/${userId}`
  });
  
  res.json({ success: true, message: 'Deletion scheduled' });
});

// Permanent deletion (after grace period)
async function performPermanentDeletion(userId: string) {
  // Delete personal data
  await Promise.all([
    userModel.deleteOne({ _id: userId }),
    profileModel.deleteOne({ userId }),
    stackModel.deleteMany({ userId }),
    supplementModel.deleteMany({ userId }),
    settingsModel.deleteOne({ userId })
  ]);
  
  // Anonymize audit logs (keep for legal reasons)
  await auditLog.updateMany(
    { userId },
    { userId: `DELETED_${Date.now()}`, user_email: '[DELETED]' }
  );
  
  // Purge backups
  await deleteDatabaseBackups(userId);
  
  logSecurityEvent('user.permanently_deleted', { userId });
}
```

#### Consent Management

```typescript
// Privacy consent (GDPR Article 7)
interface UserConsent {
  userId: string;
  marketing_emails: boolean;
  analytics: boolean;
  necessary_cookies: boolean;
  timestamp: Date;
  ip_address: string;  // For audit trail
}

app.post('/api/consent', async (req, res) => {
  const { marketing_emails, analytics } = req.body;
  
  const consent: UserConsent = {
    userId: req.user!.id,
    marketing_emails,
    analytics,
    necessary_cookies: true,  // Always required
    timestamp: new Date(),
    ip_address: req.ip!
  };
  
  await consentModel.insertOne(consent);
  
  // Disable services if consent withdrawn
  if (!marketing_emails) {
    await unsubscribeEmail(req.user!.email);
  }
  
  if (!analytics) {
    await disableAnalytics(req.user!.id);
  }
  
  res.json({ success: true });
});
```

### 2. Data Retention Policy

```markdown
# Data Retention Schedule

## User Personal Data
- **Retention:** Until account deletion request or 5 years inactive
- **Deletion Trigger:** 30-day grace period after deletion request
- **Backup Purge:** 90 days after deletion

## Activity Logs
- **Retention:** 1 year (compliance)
- **Anonymization:** After 6 months
- **Deletion:** After legal hold period

## Audit Logs (Security)
- **Retention:** 2 years (regulatory)
- **Encryption:** AES-256
- **Immutable:** Write-once storage

## Analytics Data
- **Retention:** 1 year (GDPR consent)
- **Anonymization:** After 30 days
- **Deletion:** Automatically after retention period

## Payment Records
- **Retention:** 7 years (PCI DSS & tax law)
- **Tokenization:** Card data never stored
- **Deletion:** Via Stripe (PCI-compliant)
```

### 3. Privacy Policy

**Location:** `/docs/PRIVACY_POLICY.md`

Key sections:
1. Data collection practices
2. Third-party sharing
3. User rights
4. Retention policies
5. Security measures
6. Cookie policies
7. Contact for DPO

---

## Security Monitoring & Logging

### 1. Security Event Logging

**Objective:** Record all security-relevant events for forensics and compliance.

```typescript
// Security event logger
interface SecurityEvent {
  event_type: string;  // e.g., "auth.login_success"
  user_id?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    ip_address: string;
    user_agent: string;
    method: string;
    path: string;
  };
  details: unknown;
}

export async function logSecurityEvent(
  eventType: string,
  context: unknown,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const event: SecurityEvent = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    severity,
    context: {
      ip_address: maskIP(req.ip!),
      user_agent: req.headers['user-agent']!,
      method: req.method,
      path: req.path
    },
    details: context
  };
  
  // Log to centralized system
  await Promise.all([
    sentry.captureMessage(`Security: ${eventType}`, { level: severity }),
    auditDb.collection('security_events').insertOne(event),
    severity === 'critical' && sendAlert(event)
  ]);
}

// Monitored events
const SECURITY_EVENTS = {
  'auth.login_success': { severity: 'low', monitored: true },
  'auth.login_failure': { severity: 'medium', monitored: true },
  'auth.mfa_required': { severity: 'low', monitored: false },
  'access_control.unauthorized': { severity: 'high', monitored: true },
  'data_access.sensitive': { severity: 'medium', monitored: true },
  'user.deleted': { severity: 'high', monitored: true },
  'admin.action': { severity: 'high', monitored: true },
  'payment.failed': { severity: 'medium', monitored: true },
  'rate_limit.exceeded': { severity: 'low', monitored: false },
  'injection_attempt': { severity: 'critical', monitored: true }
};
```

### 2. Real-time Alerts

**Objective:** Notify security team of critical events immediately.

#### Alert Rules

```yaml
Alert Rules:

Rule: "Failed Login Attempts"
  Condition: 5+ failed logins in 15 minutes from same IP
  Severity: HIGH
  Action: Block IP for 30 minutes, send alert

Rule: "Unauthorized Data Access"
  Condition: User accesses resources != own
  Severity: CRITICAL
  Action: Block user, notify admin, log forensics

Rule: "Injection Attack Detected"
  Condition: Input contains SQL/script patterns
  Severity: CRITICAL
  Action: Block request, notify security team, analyze pattern

Rule: "DDoS Pattern"
  Condition: 1000+ requests/min from single IP
  Severity: CRITICAL
  Action: Block at Cloudflare, alert ops team

Rule: "Unusual Geographic Activity"
  Condition: Login from 2 countries in < 1 hour
  Severity: MEDIUM
  Action: Require re-authentication, send alert
```

### 3. Logging Infrastructure

```bash
# Centralized Logging (ELK Stack / Datadog)

Index Pattern: suplilist-logs-{YYYY.MM.DD}

Retention:
- Performance logs: 30 days
- Security logs: 1 year
- Audit logs: 2 years
- Error logs: 90 days

Shipper: Filebeat (secure TLS)
Parser: Logstash (PII masking)
Visualization: Kibana (role-based access)

Performance Dashboards:
- Request latency (p50, p95, p99)
- Error rate and types
- Cache hit ratio
- Database query times

Security Dashboards:
- Auth failures
- Rate limit triggers
- Injection attempts
- Privilege escalation attempts
```

---

## Incident Response Procedures

### 1. Incident Severity Levels

| Level | Example | Response Time | Impact |
|-------|---------|----------------|-----------
| Critical | Data breach, RCE | 15 min | All users affected |
| High | Auth bypass, DDoS | 1 hour | Many users affected |
| Medium | Account takeover, XXS | 4 hours | Some users affected |
| Low | Account enumeration | 1 day | Limited impact |

### 2. Incident Response Flowchart

```
1. DETECTION
   ├─ Alert triggered
   ├─ Verify incident
   └─ Assign severity

2. CONTAINMENT (0-30 min)
   ├─ Disable affected feature/API
   ├─ Block malicious IP
   ├─ Revoke compromised tokens
   └─ Notify stakeholders

3. INVESTIGATION (30 min - 24 hours)
   ├─ Gather logs and evidence
   ├─ Identify root cause
   ├─ Assess blast radius
   └─ Determine compromised data

4. ERADICATION (1-7 days)
   ├─ Patch vulnerability
   ├─ Reset compromised credentials
   ├─ Rotate secrets
   └─ Verify fix

5. RECOVERY (Immediate)
   ├─ Restore services
   ├─ Monitor for recurrence
   └─ Communicate status

6. LESSONS LEARNED (1 week)
   ├─ Postmortem meeting
   ├─ Root cause analysis
   ├─ Action items
   └─ Update procedures
```

### 3. Communication Template

```markdown
# SECURITY INCIDENT - Initial Report

**Incident ID:** INC-2024-001  
**Severity:** CRITICAL  
**Time:** 2024-01-15 14:30 UTC  

## Summary
Brief description of incident.

## Impact
- Number of users affected: X
- Data exposed: [types]
- Service availability: [status]

## Timeline
- 14:30 UTC: Issue detected
- 14:35 UTC: Incident team assembled
- 14:40 UTC: Service mitigated
- [ongoing]

## Action Items
- [ ] Contain incident
- [ ] Investigate
- [ ] Notify users
- [ ] Patch fix
- [ ] Post-mortem

---

**Next update:** [timestamp + 2 hours]
```

---

## Security Checklist

### Pre-Deployment Checklist

- [ ] **Secrets Management**
  - [ ] All secrets in environment variables (not hardcoded)
  - [ ] .env.example created (no actual values)
  - [ ] Secrets Manager accessed via IAM
  - [ ] Secret rotation scheduled

- [ ] **Authentication & Authorization**
  - [ ] MFA enabled for all admins
  - [ ] RBAC configured for all endpoints
  - [ ] JWT secret meets min length (32 chars)
  - [ ] Token expiration set (1 hour access, 7 days refresh)
  - [ ] Password policy enforced (min 12 chars, complexity)

- [ ] **Data Protection**
  - [ ] TLS 1.3 enforced
  - [ ] HSTS headers enabled
  - [ ] PII encrypted at rest (AES-256)
  - [ ] Database backups encrypted
  - [ ] Database credentials rotated

- [ ] **Network Security**
  - [ ] Cloudflare WAF configured
  - [ ] DDoS protection enabled
  - [ ] Rate limiting in place
  - [ ] CORS whitelist set (no wildcards)
  - [ ] Firewall rules configured

- [ ] **Input Validation**
  - [ ] All endpoints have Zod schemas
  - [ ] Input length limits enforced
  - [ ] File upload limits set (max 10MB)
  - [ ] NoSQL injection mitigations
  - [ ] XSS prevention (CSP headers)

- [ ] **Error Handling**
  - [ ] No stack traces in production
  - [ ] Error messages sanitized
  - [ ] Errors logged with context
  - [ ] Sentry/error tracking enabled
  - [ ] 404/500 error pages branded

- [ ] **Logging & Monitoring**
  - [ ] Security events logged
  - [ ] Centralized logging configured
  - [ ] Real-time alerts enabled
  - [ ] Audit logging active
  - [ ] PII masking in logs

- [ ] **Compliance**
  - [ ] GDPR consent mechanism
  - [ ] Privacy policy published
  - [ ] Data retention policy defined
  - [ ] Right to deletion implemented
  - [ ] Security policy documented

- [ ] **Dependencies**
  - [ ] npm audit --audit-level=moderate passed
  - [ ] No high severity vulnerabilities
  - [ ] Package lock file committed
  - [ ] Dependencies updated
  - [ ] SBOM generated

- [ ] **Infrastructure**
  - [ ] Production database isolated
  - [ ] Backups automated (daily)
  - [ ] Backup encryption enabled
  - [ ] Disaster recovery plan
  - [ ] Infrastructure as Code versioned

---

## Maintenance & Continuous Improvement

### Monthly Security Tasks

```bash
# Week 1
- npm audit
- Dependency updates
- Sentry review (top errors)

# Week 2
- Log analysis (failed logins, injection attempts)
- Cloudflare WAF rule review
- Certificate expiration check

# Week 3
- Database backup restore test
- Incident response plan review
- Team security training

# Week 4
- Full security assessment
- Vulnerability scan
- Compliance checklist
```

### Quarterly Security Review

1. **Threat Assessment**
   - New vulnerability classes
   - Updated OWASP Top 10
   - Industry breaches (lessons learned)

2. **Penetration Testing**
   - Schedule annual test with external firm
   - Document findings
   - Implement fixes with timeline

3. **Compliance Audit**
   - GDPR assessment
   - PCI DSS audit (if handling payments)
   - SOC 2 compliance check

---

## Contact & Escalation

**Security Team Lead:**  
Email: security@suplilist.app  
Phone: [On-call number]  
Slack: #security

**Incident Hotline:**  
For critical incidents: security@suplilist.app  
Response target: 15 minutes

**External Reporting (Bug Bounty):**  
https://security.suplilist.app/bounty

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-16 | Initial security hardening document |

---

**Last Updated:** 2026-06-16  
**Next Review:** 2026-09-16 (Q3 2026)
