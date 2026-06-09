# Security Hardening Checklist

**Table of Contents**
1. [HTTPS & TLS](#https--tls)
2. [CSRF Protection](#csrf-protection)
3. [Rate Limiting](#rate-limiting)
4. [Input Validation](#input-validation)
5. [Authentication & MFA](#authentication--mfa)
6. [Authorization](#authorization)
7. [Secrets Management](#secrets-management)
8. [PII Protection](#pii-protection)
9. [Dependency Security](#dependency-security)
10. [Security Headers](#security-headers)
11. [API Security](#api-security)

---

## HTTPS & TLS

### Enforce HTTPS

**Status**: ✓ REQUIRED

All traffic must use HTTPS (TLS 1.2+).

```bash
# 1. Obtain certificate (AWS ACM recommended)
aws acm request-certificate \
  --domain-name api.suplilist.com \
  --validation-method DNS

# 2. Configure server
# In app.ts
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.header('x-forwarded-proto') !== 'https' && 
      process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`)
  }
  next()
})

# 3. Verify certificate
openssl s_client -connect api.suplilist.com:443 -tls1_2
```

### HSTS Headers

**Status**: ✓ REQUIRED

Force browser to always use HTTPS for future connections.

```javascript
// In app.ts (Helmet already configured)
app.use(helmet.hsts({
  maxAge: 31536000,        // 1 year in seconds
  includeSubDomains: true,
  preload: true
}))

// Results in header:
// Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Verification**:
```bash
curl -i https://api.suplilist.com/health/live | grep Strict-Transport-Security
# Should show HSTS header
```

### Certificate Pinning (Optional)

For enhanced security against CA compromise:

```javascript
// client-side (JavaScript)
// Verify API certificate fingerprint
async function fetchWithCertPinning(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    // Note: Browser doesn't expose cert pinning in fetch
    // Use HPKP headers instead
  })
  return response
}
```

---

## CSRF Protection

### Token Generation & Validation

**Status**: ✓ IMPLEMENTED

```javascript
// Automatically handled by middleware in app.ts
// 1. User logs in
// 2. Server creates CSRF token
// 3. Token stored in Redis with 1-hour TTL
// 4. Client receives token in response
// 5. Client includes token in X-CSRF-Token header
// 6. Server validates token on state-changing requests

// client-side
async function loginUser(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const { csrfToken } = await response.json()
  
  // Store token
  localStorage.setItem('csrfToken', csrfToken)
  
  // Use in future requests
  fetch('/api/supplements/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': localStorage.getItem('csrfToken')
    },
    body: JSON.stringify({ supplementId: 'creatina' })
  })
}
```

### Token Rotation

**Status**: ✓ REQUIRED

Tokens rotate every hour to prevent token theft.

```env
CSRF_TOKEN_ROTATION_INTERVAL=3600000  # 1 hour in milliseconds
```

**Automatic refresh on error**:
```javascript
async function safeRequest(url: string, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': localStorage.getItem('csrfToken')
    }
  })

  // If CSRF token expired
  if (response.status === 403) {
    const newToken = await refreshCSRFToken()
    localStorage.setItem('csrfToken', newToken)
    
    // Retry with new token
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'X-CSRF-Token': newToken
      }
    })
  }

  return response
}
```

---

## Rate Limiting

### Per-IP Rate Limiting

**Status**: ✓ REQUIRED

Global: 100 requests per 15 minutes per IP

```env
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # Per IP
RATE_LIMIT_SKIP_HEALTH_CHECKS=true
```

### Per-Endpoint Stricter Limits

**Status**: ✓ RECOMMENDED

Different endpoints require different limits:

```javascript
// In authentication controller
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 5,                        // 5 attempts
  message: 'Too many login attempts'
})

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,                        // 3 MFA attempts
  message: 'Too many MFA attempts'
})

router.post('/login', loginLimiter, loginHandler)
router.post('/mfa/verify', mfaLimiter, mfaHandler)
```

### Testing Rate Limits

```bash
# Simulate rate limit hit
for i in {1..101}; do
  curl -X POST https://api.suplilist.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done

# Should get 429 (Too Many Requests) after limit exceeded
```

---

## Input Validation

### Schema-Based Validation (Zod)

**Status**: ✓ REQUIRED

All user inputs validated with Zod schemas before processing:

```typescript
import { z } from 'zod'

// Define schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be 8+ characters')
})

// Validate input
async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = LoginSchema.parse(req.body)
    // Proceed with safe data
  } catch (error: ZodError) {
    // Invalid input - return 400
    return res.status(400).json({ 
      error: error.errors[0].message 
    })
  }
}

// Supplement creation schema
const SupplementSchema = z.object({
  id: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  category: z.enum(['Performance', 'Recovery', 'Health', 'Cognition']),
  defaultDose: z.number().positive(),
  unit: z.enum(['g', 'mg', 'ml', 'caps']),
  costPerDose: z.number().nonnegative(),
  evidenceLevel: z.enum(['A', 'B', 'C']),
  mechanism: z.string().max(500),
  goals: z.array(z.string()).min(1),
  prices: z.record(z.number().nonnegative()),
  interactions: z.array(z.string()).optional()
})
```

### SQL Injection Prevention

**Status**: ✓ PROTECTED (Using Mongoose)

Using Mongoose prevents SQL injection via parameterized queries:

```javascript
// ✓ SAFE - Parameterized query
const supplement = await Supplement.findById(supplementId)

// ✗ UNSAFE - Raw query (NEVER DO THIS)
// const supplement = await db.query(
//   `SELECT * FROM supplements WHERE id = '${supplementId}'`
// )
```

### XSS Prevention (Output Encoding)

**Status**: ✓ REQUIRED

```javascript
// 1. Sanitize HTML content
import sanitizeHtml from 'sanitize-html'

const cleanMechanism = sanitizeHtml(userInput.mechanism, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {}
})

// 2. Always encode output for HTML context
// (React/Vue frameworks do this automatically)

// 3. Content Security Policy headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'https:', 'data:']
  }
}))
```

---

## Authentication & MFA

### Secure Password Storage

**Status**: ✓ REQUIRED

```typescript
import bcrypt from 'bcrypt'

// Hash password on registration
async function registerUser(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 12)
  // Store hashedPassword in database
}

// Verify password on login
async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email })
  const isValid = await bcrypt.compare(password, user.passwordHash)
  
  if (!isValid) {
    throw new Error('Invalid credentials')
  }
}

// Password requirements
const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true
}
// Example: MyPassword123!
```

### JWT Token Security

**Status**: ✓ REQUIRED

```env
# Secrets must be strong random strings (32+ characters)
JWT_SECRET=your-random-32-char-hex-string
JWT_REFRESH_SECRET=your-different-32-char-hex-string

# Token expiration
JWT_EXPIRATION=15m              # Short-lived access token
JWT_REFRESH_EXPIRATION=7d       # Longer-lived refresh token
```

**Token Validation**:
```typescript
import jwt from 'jsonwebtoken'

// Generate token (on login)
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRATION }
)

// Verify token (on each request)
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.sendStatus(401)

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}
```

### Multi-Factor Authentication (MFA)

**Status**: ✓ IMPLEMENTED

Supported MFA methods:
1. **TOTP** (Time-based One-Time Password) - Google Authenticator, Authy
2. **Email** - 6-digit code sent to email
3. **SMS** - 6-digit code via SMS

```typescript
import { authenticator } from 'otplib'

// Enable TOTP for user
function generateTOTPSecret(email: string) {
  const secret = authenticator.generateSecret({
    name: `SupliList (${email})`
  })
  // User scans QR code and saves secret
  return secret
}

// Verify TOTP code
function verifyTOTPCode(secret: string, code: string) {
  return authenticator.check(code, secret)
}

// MFA flow
async function loginWithMFA(email: string, password: string) {
  const user = await User.findOne({ email })
  
  // 1. Verify password
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error('Invalid credentials')
  }

  // 2. If MFA enabled, request code
  if (user.mfaEnabled) {
    return {
      mfaRequired: true,
      sessionId: generateTempSessionId(user.id),
      methods: user.mfaMethods // ['totp', 'email']
    }
  }

  // 3. Return tokens if no MFA
  return {
    accessToken: generateToken(user),
    refreshToken: generateRefreshToken(user)
  }
}
```

---

## Authorization

### Permission Validation

**Status**: ✓ REQUIRED

Every endpoint validates user has permission for action:

```typescript
// Middleware for ownership check
async function requireOwnership(req: Request, res: Response, next: NextFunction) {
  const resourceId = req.params.id
  const userId = req.user.id

  // Check user owns resource
  const resource = await Stack.findById(resourceId)
  
  if (resource.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}

// Usage
router.delete('/api/stack/:id', 
  authenticateToken,
  requireOwnership,
  deleteStackItemHandler
)

// Even authenticated users cannot access other users' data
// DELETE /api/stack/other-user-stack-id returns 403 Forbidden
```

### Role-Based Access Control (RBAC)

**Status**: ✓ IMPLEMENTED

Users have roles: `user`, `admin`

```typescript
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// Admin-only endpoints
router.post('/api/admin/supplements/crawl-on-demand',
  authenticateToken,
  requireRole('admin'),
  triggerCrawlHandler
)

// User endpoints (all authenticated users)
router.get('/api/supplements/:id',
  authenticateToken,
  getSupplementHandler
)
```

---

## Secrets Management

### Environment Variables

**Status**: ✓ REQUIRED

Never commit secrets to git.

```bash
# ✓ CORRECT - Use .env file (gitignored)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=sk-123456789...

# ✗ WRONG - Hardcoded in code
const API_KEY = "sk-123456789..."  // EXPOSED!

# ✗ WRONG - In git history
git log | grep PASSWORD
```

### .env File Management

```bash
# 1. Create .env in root (NOT in git)
echo ".env" >> .gitignore

# 2. Define all secrets in .env
MONGO_URI=...
JWT_SECRET=...
AWS_SECRET_ACCESS_KEY=...

# 3. On deployment, inject env vars
# Via platform (Heroku, AWS, Render):
# Set config variables in dashboard

# 4. Never print secrets in logs
// ✓ SAFE
console.log(`Database: ${MONGO_URI.substring(0, 30)}...`)

// ✗ UNSAFE
console.log(`Database: ${MONGO_URI}`)

# 5. Rotate secrets regularly (every 90 days)
```

### AWS Secrets Manager (Optional)

For additional security:

```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION })
  
  const command = new GetSecretValueCommand({
    SecretId: secretName
  })

  const response = await client.send(command)
  return JSON.parse(response.SecretString)
}

// Usage
const { MONGO_URI, JWT_SECRET } = await getSecret('suplilist-prod-secrets')
```

---

## PII Protection

### Data Masking in Logs

**Status**: ✓ REQUIRED

Never log personally identifiable information.

```javascript
// ✓ SAFE - Masked email
console.log(`User login: u***@example.com`)

// ✗ UNSAFE - Full email exposed
console.log(`User login: user@example.com`)

// Helper function
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local.substring(0, 1)}${'*'.repeat(local.length - 1)}@${domain}`
}

// Mask all sensitive fields
function maskSensitiveData(obj: any): any {
  return {
    ...obj,
    email: maskEmail(obj.email),
    password: '***',
    cpf: '***-***-***',
    phone: '***-****'
  }
}
```

### GDPR Compliance

**Status**: ✓ REQUIRED

Users have the right to request data deletion.

```typescript
// Implement data deletion endpoints
// DELETE /api/user/account (requires password confirmation)

async function deleteUserAccount(userId: string) {
  const user = await User.findById(userId)
  
  // 1. Delete all user data
  await Promise.all([
    User.deleteOne({ _id: userId }),
    Profile.deleteOne({ userId }),
    Settings.deleteOne({ userId }),
    AuditLog.updateMany(
      { userId },
      { $set: { userId: 'DELETED' } }  // Keep audit trail
    ),
    Stack.deleteMany({ userId }),
    Favorites.deleteMany({ userId })
  ])

  // 2. Revoke all sessions
  await RefreshToken.deleteMany({ userId })

  // 3. Anonymize audit logs
  // "User DELETED performed action X"
}
```

### Data Retention

```env
# How long to keep data
AUDIT_LOG_RETENTION_DAYS=90      # Delete after 90 days
USER_ACTIVITY_RETENTION_DAYS=30  # Delete inactivity logs after 30 days
BACKUP_RETENTION_DAYS=90         # Keep backups for 90 days
```

---

## Dependency Security

### Regular Security Audits

**Status**: ✓ REQUIRED

```bash
# 1. Check for known vulnerabilities
npm audit

# 2. Fix automatically if possible
npm audit fix

# 3. Review manually
npm audit --json | grep -i critical

# 4. Whitelist false positives if needed
# (some vulnerabilities don't apply to your use case)
```

### Dependency Pinning

**Status**: ✓ REQUIRED

In `package.json`, pin exact versions:

```json
{
  "dependencies": {
    "express": "4.19.2",           // Exact version
    "mongoose": "8.3.1",
    "bcrypt": "5.1.1"
  },
  "devDependencies": {
    "@types/node": "20.12.7"
  }
}
```

Use `npm ci` in CI/CD (not `npm install`):

```bash
# npm install - can upgrade packages
npm install

# npm ci - uses exact versions from package-lock.json
npm ci
```

### Keeping Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update safely (patch versions only)
npm update

# Update to latest major versions (cautiously)
npm upgrade

# Test after update
npm test
npm run build
```

---

## Security Headers

**Status**: ✓ CONFIGURED via Helmet

```javascript
// In app.ts - Helmet configures these automatically
app.use(helmet())

// Results in headers:
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Content Security Policy (CSP)

Prevents inline script injection:

```javascript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'https:', 'data:'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"]
  }
}))

// Results in header:
// Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

---

## API Security

### Endpoint Authentication

**Status**: ✓ REQUIRED

All endpoints require authentication except:
- `GET /health/live`
- `GET /health/ready`
- `POST /api/auth/login`
- `POST /api/auth/register` (if enabled)

```typescript
// Middleware applied to all routes except listed above
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' })
  }
}
```

### Error Message Disclosure

**Status**: ✓ REQUIRED

Never expose system details in error messages.

```typescript
// ✓ SAFE - Generic error
if (!user) {
  return res.status(401).json({ error: 'Invalid email or password' })
}

// ✗ UNSAFE - Reveals if email exists
if (!user) {
  return res.status(401).json({ 
    error: 'Email not found in system'  // Leaks info!
  })
}

// ✓ SAFE - Stack traces hidden in production
try {
  await someOperation()
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' })
  } else {
    res.status(500).json({ error: error.message, stack: error.stack })
  }
}
```

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables use secrets (not hardcoded)
- [ ] HTTPS enforced with HSTS headers
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] All inputs validated with Zod schemas
- [ ] Authentication required on protected endpoints
- [ ] MFA enabled for admin accounts
- [ ] Authorization checks (ownership, permissions)
- [ ] Secrets rotated (last 90 days)
- [ ] npm audit shows no critical vulnerabilities
- [ ] Sensitive data masked in logs
- [ ] Error messages don't leak information
- [ ] Security headers configured (Helmet)
- [ ] CORS properly configured (not wildcard)
- [ ] SQL/NoSQL injection prevented
- [ ] XSS protection enabled

### Regular Audits

- [ ] Weekly: Run `npm audit`
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security review of code
- [ ] Annually: Penetration test
- [ ] Whenever: After security advisory release

---

**Last Updated**: June 2024  
**Maintainer**: Security Team  
**Related Docs**: [DEPLOYMENT_BACKEND.md](./DEPLOYMENT_BACKEND.md), [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
