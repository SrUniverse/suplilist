# SupliList - Security Best Practices Guide

**Version:** 1.0.0  
**Date:** 2026-06-16  
**Audience:** All Development Team, Operations, Security Team  
**Purpose:** Reference guide for secure development and operations

---

## Table of Contents

1. [Development Security](#development-security)
2. [Code Security Patterns](#code-security-patterns)
3. [Operational Security](#operational-security)
4. [Data Handling](#data-handling)
5. [Third-Party & Integration Security](#third-party--integration-security)
6. [Compliance & Privacy](#compliance--privacy)

---

## Development Security

### Authentication & Authorization Patterns

#### Firebase + Custom JWT Pattern

```typescript
/**
 * PATTERN: Dual authentication system
 * - Firebase handles identity verification and registration
 * - Custom JWT for stateless API authentication
 * - Redis for token revocation (logout, MFA setup)
 */

// 1. User registers with Firebase (email verified)
export async function register(email: string, password: string) {
  const user = await auth.createUser({
    email,
    password,
    emailVerified: false
  });
  
  // Send verification email
  await auth.generateEmailVerificationLink(email);
  
  return user;
}

// 2. User logs in → receives Firebase ID token
export async function login(email: string, password: string) {
  // Client-side: firebase.auth().signInWithEmailAndPassword(email, password)
  // Returns: Firebase ID token (1 hour expiry)
  
  // Server validates: GET /api/auth/me
  const decoded = await auth.verifyIdToken(firebaseToken);
  
  // Server generates custom JWT (includes jti for revocation)
  const jwt = sign({
    uid: decoded.uid,
    email: decoded.email,
    role: userRole,
    jti: generateJti()  // For token revocation
  }, JWT_SECRET, { expiresIn: '1h' });
  
  return jwt;
}

// 3. Client stores JWT, sends with requests
// Authorization: Bearer [jwt]

// 4. Server validates JWT + checks revocation list
export async function verifyJWT(token: string) {
  const decoded = verify(token, JWT_SECRET);
  
  // Check if token is revoked (logout)
  const isRevoked = await redis.get(`token:blacklist:${decoded.jti}`);
  if (isRevoked) {
    throw new Error('Token revoked');
  }
  
  return decoded;
}

// 5. Refresh token pattern
export async function refreshToken(refreshToken: string) {
  const decoded = verify(refreshToken, JWT_REFRESH_SECRET);
  
  // Issue new access token
  return sign({
    uid: decoded.uid,
    role: decoded.role,
    jti: generateJti()
  }, JWT_SECRET, { expiresIn: '1h' });
}
```

#### Role-Based Access Control (RBAC)

```typescript
// Define roles
type UserRole = 'user' | 'premium' | 'admin' | 'superadmin';

// Middleware: Verify user is authenticated
export const requireAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  
  req.user = await verifyJWT(token);
  next();
};

// Middleware: Check specific role
export const requireRole = (...roles: UserRole[]) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logSecurityEvent('access_denied', { user: req.user?.id });
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
};

// Usage
app.delete('/api/admin/users/:id', 
  requireAuth,
  requireRole('admin', 'superadmin'),
  deleteUserHandler
);
```

#### Multi-Factor Authentication (MFA)

```typescript
/**
 * PATTERN: TOTP-based 2FA
 * - Server generates shared secret (TOTP seed)
 * - Client stores in authenticator app
 * - Server verifies time-based codes
 */

import speakeasy from 'speakeasy';

// 1. User initiates MFA setup
export async function setupMFA(userId: string) {
  const secret = speakeasy.generateSecret({
    name: `SupliList (${userEmail})`,
    issuer: 'SupliList',
    length: 32
  });
  
  // Store secret encrypted in database temporarily
  await user.update({
    mfa_secret: encrypt(secret.base32),
    mfa_status: 'pending_confirmation'
  });
  
  // Return QR code for scanning
  return {
    qrCode: secret.qrCode,
    secret: secret.base32  // Backup code for user
  };
}

// 2. User confirms MFA with code from authenticator app
export async function confirmMFA(userId: string, code: string) {
  const user = await getUserById(userId);
  const secret = decrypt(user.mfa_secret);
  
  // Verify code
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 2  // Allow 2 time windows (±30 sec)
  });
  
  if (!isValid) {
    throw new Error('Invalid code');
  }
  
  // Enable MFA
  await user.update({
    mfa_enabled: true,
    mfa_status: 'active'
  });
  
  // Generate recovery codes
  const recoveryCodes = generateRecoveryCodes(10);
  await user.update({
    mfa_recovery_codes: hashRecoveryCodes(recoveryCodes)
  });
  
  return { recoveryCodes };  // Show once to user
}

// 3. Login with MFA enabled
export async function loginWithMFA(email: string, password: string, mfaCode: string) {
  // Verify password (Firebase)
  const user = await auth.signInWithPassword(email, password);
  
  // Check if MFA enabled
  if (user.mfa_enabled) {
    // Verify MFA code
    const secret = decrypt(user.mfa_secret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: mfaCode,
      window: 2
    });
    
    if (!isValid) {
      // Check recovery code
      const recoveryValid = verifyRecoveryCode(user, mfaCode);
      if (!recoveryValid) {
        throw new Error('Invalid MFA code');
      }
    }
  }
  
  return generateJWT(user);
}
```

### Password Security

```typescript
import bcrypt from 'bcrypt';

// Password policy
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Minimum ${PASSWORD_POLICY.minLength} characters`);
  }
  
  if (!PASSWORD_POLICY.requireUppercase || !/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  }
  
  if (!PASSWORD_POLICY.requireLowercase || !/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter');
  }
  
  if (!PASSWORD_POLICY.requireNumbers || !/[0-9]/.test(password)) {
    errors.push('Include at least one number');
  }
  
  if (!PASSWORD_POLICY.requireSpecialChars || !PASSWORD_POLICY.specialChars.test(password)) {
    errors.push('Include at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);  // Cost factor 12
  return bcrypt.hash(password, salt);
}

// Compare password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password reset flow
export async function initiatePasswordReset(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return { success: true };
  }
  
  // Generate short-lived reset token (5 minutes)
  const resetToken = randomBytes(32).toString('hex');
  const resetTokenHash = hashPasswordReset(resetToken);
  
  await user.update({
    password_reset_token: resetTokenHash,
    password_reset_expires: new Date(Date.now() + 5 * 60 * 1000)
  });
  
  // Send reset email with token
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail(email, 'password-reset', { resetUrl });
  
  return { success: true };
}

export async function resetPassword(resetToken: string, newPassword: string) {
  const tokenHash = hashPasswordReset(resetToken);
  
  const user = await User.findOne({
    password_reset_token: tokenHash,
    password_reset_expires: { $gt: new Date() }  // Not expired
  });
  
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }
  
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
  
  // Hash and save
  const hashedPassword = await hashPassword(newPassword);
  await user.update({
    password: hashedPassword,
    password_reset_token: null,
    password_reset_expires: null
  });
  
  // Logout all sessions
  await redis.del(`sessions:${user.id}:*`);
  
  return { success: true };
}
```

---

## Code Security Patterns

### Input Validation with Zod

```typescript
import { z } from 'zod';

// Define validation schema
const userRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(12, 'Password too short')
    .max(128, 'Password too long'),
  firstName: z.string()
    .min(1, 'First name required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters'),
  dateOfBirth: z.string()
    .refine(date => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18;
    }, 'Must be 18 or older')
});

// Middleware to validate
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
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
};

// Route
app.post('/api/auth/register',
  validateRequest(userRegistrationSchema),
  registerHandler
);

// Handler uses validated data
export const registerHandler = async (req: Request, res: Response) => {
  const { email, password, firstName } = req.validated;
  // Data is guaranteed to match schema
};
```

### SQL/NoSQL Injection Prevention

```typescript
// WRONG: Vulnerable to injection
async function findUser(email: string) {
  // DON'T DO THIS
  return db.collection('users').findOne({ 
    email: email  // Direct user input
  });
}

// CORRECT: Use parameterized query with validation
import { z } from 'zod';

const emailSchema = z.string().email();

async function findUser(email: string) {
  // 1. Validate input
  const validatedEmail = emailSchema.parse(email);
  
  // 2. Use parameterized query (MongoDB handles escaping)
  return db.collection('users').findOne({
    email: validatedEmail
  });
}

// WRONG: Dynamic query construction
async function searchUsers(query: string) {
  // DON'T DO THIS
  return db.collection('users').find({
    $or: [
      { name: { $regex: query } },
      { email: query }
    ]
  });
}

// CORRECT: Build query safely
const searchSchema = z.object({
  query: z.string().min(1).max(50),
  category: z.enum(['name', 'email']).optional()
});

async function searchUsers(filters: z.infer<typeof searchSchema>) {
  const validated = searchSchema.parse(filters);
  
  const searchQuery: any = {};
  if (validated.category === 'name' || !validated.category) {
    searchQuery.name = { $regex: validated.query, $options: 'i' };
  }
  if (validated.category === 'email' || !validated.category) {
    searchQuery.email = { $regex: validated.query, $options: 'i' };
  }
  
  return db.collection('users').find(searchQuery);
}
```

### Output Encoding (XSS Prevention)

```typescript
// HTML entity encoding
export function escapeHtml(text: string): string {
  const entities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => entities[char]);
}

// Use in response
export async function getProfileHandler(req: Request, res: Response) {
  const user = req.user;
  
  res.json({
    name: escapeHtml(user.name),
    email: escapeHtml(user.email),
    bio: escapeHtml(user.bio)
  });
}

// Content Security Policy (Helmet)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.suplilist.app"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseSrc: ["'self'"]
  }
}));
```

### Error Handling

```typescript
// Custom error class
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
  }
}

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Validation/application error
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { details: err.details })
    });
  } else {
    // Unexpected error
    logSecurityEvent('unexpected_error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      user: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};

// Usage
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const result = await login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);  // Caught by error handler
  }
});
```

---

## Operational Security

### Secrets Management

```bash
# DO: Use environment variables
export JWT_SECRET="$(openssl rand -base64 32)"
export STRIPE_SECRET_KEY="sk_live_xxxx"

# DON'T: Hardcode secrets
const SECRET = "my-secret-key";

# DO: Use .env file (with .gitignore)
# .env
JWT_SECRET=value_here
STRIPE_SECRET_KEY=value_here

# .gitignore
.env
.env.local
.env.*.local

# DO: Use secrets manager for production
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name suplilist/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# Access in code
const secret = await secretsManager.getSecretValue('suplilist/jwt-secret');
```

### Logging Security Data

```typescript
// DON'T: Log sensitive data unmasked
console.log(`User login: ${email}, IP: ${ip}, Token: ${token}`);
// BAD: Exposes email, full IP, entire token

// DO: Mask sensitive data
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.substring(0, 2)}***@${domain}`;
}

function maskIP(ip: string): string {
  return ip.replace(/\.\d+$/, '.XXX');  // 192.168.1.100 → 192.168.1.XXX
}

function maskToken(token: string): string {
  return `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
}

// Log with masking
export function logSecurityEvent(event: string, context: any) {
  const maskedContext = {
    ...context,
    email: context.email ? maskEmail(context.email) : undefined,
    ip: context.ip ? maskIP(context.ip) : undefined,
    token: context.token ? maskToken(context.token) : undefined
  };
  
  logger.info(`Security: ${event}`, maskedContext);
  auditLog.insert({ event, context: maskedContext, timestamp: new Date() });
}
```

### Database Access

```typescript
// Connection security
const mongoUri = process.env.MONGO_URI;  // From secrets manager

// Options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',  // Require majority replica set
  authSource: 'admin'
};

const mongoose = require('mongoose');
await mongoose.connect(mongoUri, mongoOptions);

// Query with timeout
const user = await User.findById(userId).maxTimeMS(30000);  // 30 sec max

// Always use indexes for performance (prevents DoS via slow queries)
userSchema.index({ email: 1 });
userSchema.index({ createdAt: 1 });

// Projection: Only return necessary fields
const user = await User.findById(userId).select('name email role -password');
// Returns only name, email, role; excludes password
```

---

## Data Handling

### Encryption at Rest

```typescript
import crypto from 'crypto';

const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// Encrypt sensitive field
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv.authTag.ciphertext
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted}`;
}

// Decrypt sensitive field
export function decryptField(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split('.');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage in Mongoose schema
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    set: encryptField,
    get: decryptField,
    index: false  // Can't index encrypted fields
  },
  phone: {
    type: String,
    set: encryptField,
    get: decryptField
  }
});
```

### Data Deletion

```typescript
// Implement data lifecycle
export async function deleteUserData(userId: string) {
  // 1. Start deletion process (grace period)
  await User.updateOne({ _id: userId }, {
    deletion_requested_at: new Date(),
    deletion_scheduled_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  // 30 days
    status: 'deletion_pending'
  });
  
  // Send confirmation email with cancellation link
  const user = await User.findById(userId);
  await sendEmail(user.email, 'deletion-scheduled', {
    cancelUrl: `https://suplilist.app/cancel-deletion/${userId}/${generateToken()}`
  });
}

// Automatic deletion after grace period (scheduled job)
export async function performPermanentDeletion() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);  // 30 days ago
  
  const toDelete = await User.find({
    status: 'deletion_pending',
    deletion_scheduled_at: { $lte: cutoff }
  });
  
  for (const user of toDelete) {
    // Delete all personal data
    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Profile.deleteMany({ userId: user._id }),
      Stack.deleteMany({ userId: user._id }),
      Supplement.deleteMany({ userId: user._id }),
      Settings.deleteOne({ userId: user._id }),
      Payment.deleteMany({ userId: user._id }),
      
      // Anonymize audit logs (keep for compliance)
      AuditLog.updateMany(
        { userId: user._id },
        {
          userId: `DELETED_${Date.now()}`,
          userEmail: '[DELETED]'
        }
      )
    ]);
    
    // Delete backup files
    await deleteUserBackups(user._id);
    
    logSecurityEvent('user.permanently_deleted', { userId: user._id });
  }
}

// Cancel deletion
export async function cancelDeletion(userId: string, token: string) {
  // Verify token
  if (!verifyDeletionToken(userId, token)) {
    throw new Error('Invalid token');
  }
  
  await User.updateOne({ _id: userId }, {
    deletion_requested_at: null,
    deletion_scheduled_at: null,
    status: 'active'
  });
}
```

---

## Third-Party & Integration Security

### Stripe Webhook Handling

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Webhook handler
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event: Stripe.Event;
  
  try {
    // CRITICAL: Use raw body, not parsed JSON
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }
  
  // Process event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    default:
      // Ignore unknown events
  }
  
  res.json({ received: true });
});

// Verify payment before granting access
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // 1. Verify user ID in metadata
  const userId = paymentIntent.metadata?.user_id;
  if (!userId) {
    logSecurityEvent('stripe.invalid_payload', { paymentIntentId: paymentIntent.id });
    return;
  }
  
  // 2. Verify amount (prevent downgrade fraud)
  const expectedAmount = 9999;  // $99.99 in cents
  if (paymentIntent.amount !== expectedAmount) {
    logSecurityEvent('stripe.amount_mismatch', {
      expected: expectedAmount,
      actual: paymentIntent.amount
    });
    return;
  }
  
  // 3. Verify payment not already processed (idempotency)
  const existing = await Payment.findOne({
    stripe_payment_intent_id: paymentIntent.id
  });
  if (existing) {
    return;  // Already processed
  }
  
  // 4. Update subscription
  await User.updateOne({ _id: userId }, {
    subscription_status: 'active',
    subscription_expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  });
  
  // 5. Log for audit
  logSecurityEvent('subscription.activated', { userId });
}
```

### Firebase Authentication

```typescript
import { getAuth } from 'firebase-admin/auth';

// Verify Firebase ID token
export async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
}

// Create or get user in custom database
export async function ensureUserExists(firebaseUser: any) {
  let user = await User.findOne({
    'providers.providerId': firebaseUser.uid
  });
  
  if (!user) {
    // Create new user
    user = new User({
      email: firebaseUser.email,
      firebaseUid: firebaseUser.uid,
      emailVerified: firebaseUser.email_verified,
      displayName: firebaseUser.display_name || '',
      photoUrl: firebaseUser.picture || '',
      providers: [{
        providerId: firebaseUser.uid,
        provider: 'firebase',
        email: firebaseUser.email
      }]
    });
    await user.save();
    
    // Create default settings
    await Settings.create({ userId: user._id });
  }
  
  return user;
}

// Delete Firebase user (on account deletion)
export async function deleteFirebaseUser(firebaseUid: string) {
  try {
    await getAuth().deleteUser(firebaseUid);
  } catch (error) {
    logSecurityEvent('firebase.deletion_failed', { firebaseUid });
  }
}
```

---

## Compliance & Privacy

### GDPR Data Export

```typescript
// User can download all their data
app.get('/api/gdpr/export', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const user = await User.findById(userId);
  
  // Collect all user data
  const data = {
    exported_at: new Date().toISOString(),
    user_id: user._id,
    personal_data: {
      email: user.email,
      name: user.displayName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth
    },
    stacks: await Stack.find({ userId }),
    supplements: await Supplement.find({ userId }),
    preferences: await Settings.findOne({ userId }),
    payment_history: await Payment.find({ userId }),
    audit_log: await AuditLog.find({ userId })
  };
  
  // Return as JSON (portable format)
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=suplilist-data.json');
  res.json(data);
});
```

### Privacy Policy Compliance

```markdown
# Privacy Policy Highlights

## Data We Collect
- Email, name, phone (optional)
- Health preferences (supplement stacks)
- Payment information (tokenized via Stripe)
- Analytics (anonymous)

## How We Use Data
- Provide supplement recommendations
- Process payments
- Send transactional emails
- Improve service (analytics only with consent)

## Your Rights
- **Access**: Download all your data
- **Rectification**: Update your profile
- **Deletion**: Delete account and data
- **Portability**: Export data in standard format
- **Opt-out**: Disable analytics, unsubscribe from emails

## Data Retention
- Personal data: Deleted 30 days after account deletion
- Audit logs: Kept 2 years for compliance (anonymized)
- Payment records: Kept 7 years (legal requirement)

## Contact
DPO: dpo@suplilist.app
```

---

## References & Further Reading

### OWASP Top 10 (2021)
- A01: Broken Access Control → Use RBAC, verify ownership
- A02: Cryptographic Failures → Use TLS 1.3, AES-256
- A03: Injection → Use parameterized queries, Zod validation
- A04: Insecure Design → Threat modeling, secure defaults
- A05: Security Misconfiguration → Secrets management, hardening
- A06: Vulnerable Components → Dependency scanning, audits
- A07: Authentication Failures → MFA, strong passwords, rate limiting
- A08: Data Integrity Failures → Webhook signature verification
- A09: Logging & Monitoring → Centralized logging, alerting
- A10: SSRF → URL validation, no open redirects

### Best Practices
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-16  
**Next Review:** 2026-12-16 (6 months)
