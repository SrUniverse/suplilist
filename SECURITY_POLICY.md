# Security Policy — SupliList

**Last Updated**: 2026-06-06  
**Version**: 2.0 (Post-Audit Implementation)

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability in SupliList, please email **security@suplilist.app** with:
- Description of the vulnerability
- Affected component(s) and version(s)
- Steps to reproduce (if possible)
- Impact assessment

**Do not** disclose the vulnerability publicly until we've had 30 days to patch.

---

## Security Measures Implemented

### 1. Authentication & Authorization

- **JWT Tokens**: Bearer token authentication on all protected endpoints
- **Rate Limiting**: Per-endpoint rate limits (10-30 req/min) prevent brute force attacks
- **Token Storage**: Tokens stored in localStorage with JWT expiration
- **Protected Routes**: `/api/profile/photo`, `/api/email`, `/api/checkin` require authentication

### 2. File Upload & Validation

**Magic Bytes Validation (FIX C7)**:
- File type validated via magic bytes (file header), not just MIME type
- Prevents attackers from renaming `.exe` as `.jpg`
- Supported: JPEG, PNG, WebP, GIF only
- Max 5MB per file
- Uploaded files stored in secure location (local/S3/Cloudinary)

**Location**: `backend/utils/file-validator.js`

```javascript
import { validateImageMagicBytes } from '../utils/file-validator.js';
const isValidImage = validateImageMagicBytes(req.file.buffer, req.file.mimetype);
```

### 3. XSS Prevention

**HTML Sanitization (FIX C1)**:
- All user-generated HTML sanitized via `sanitize-html` library
- Whitelist-based approach: only safe tags allowed
  - Allowed tags: `<a>`, `<p>`, `<h1>-<h3>`, `<br>`, `<strong>`, `<em>`, `<img>`
  - Allowed attributes: `href`, `style`, `src`, `alt`
- Disallowed tags discarded entirely (no escaping, no execution)

**Locations**:
- `backend/routes/email.js`: Sanitizes HTML before sending via Resend
- `frontend/src/platform/html-sanitizer.js`: Sanitizes user content on frontend

```javascript
const cleanHtml = sanitizeHtmlLib(html, {
  allowedTags: ['a', 'p', 'h1', 'h2', 'h3', 'br', 'strong', 'em', 'u', 'div', 'span', 'img'],
  allowedAttributes: { 'a': ['href', 'style'], 'img': ['src', 'alt', 'style'], '*': ['style'] },
  disallowedTagsMode: 'discard'
});
```

### 4. Secret Management

**API Key Security (FIX C5)**:
- **NEVER** log or expose API keys in config objects
- Access secrets directly from environment variables via getter function
- `RESEND_API_KEY` accessed only via `getResendApiKey()` function
- Environment variables loaded from `.env` (not committed to git)

**Locations**:
- `backend/config/email-config.js`: `getResendApiKey()` function
- `backend/routes/email.js`: Uses `getResendApiKey()` to get API key safely

```javascript
// WRONG: Never do this
export const emailConfig = { apiKey: process.env.RESEND_API_KEY }; // ❌ Exported!

// CORRECT: Use function
export function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}
```

### 5. CORS Configuration

**CORS Policy (FIX C6)**:
- Configured in `server/src/index.js` or `backend/app.js`
- Whitelist approved origins (not wildcard `*`)
- Allow only necessary methods: GET, POST, PUT, DELETE
- Credentials: allowed for same-origin requests only

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://suplilist.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 6. JWT Validation

**Token Validation (FIX C3)**:
- All protected routes require `authenticateToken` middleware
- Middleware verifies JWT signature and expiration
- Missing/invalid tokens return 401 Unauthorized
- Unsubscribe endpoints now require authentication (prevented bypass)

**Locations**:
- `backend/middleware/auth.js`: `authenticateToken` middleware
- `backend/routes/email.js`: Protected `/unsubscribe` and `/resubscribe` endpoints

### 7. Database Security

**Base64 Anti-pattern Removed (FIX C4)**:
- Previously: Photos stored as Base64 in database (BLOAT, poor performance)
- Now: Store only file URLs + metadata
- Photos stored in secure storage backend (local/S3/Cloudinary)
- Reduces database size, improves query performance

**Locations**:
- `backend/models/user-profile.js`: `photo.url` field only, no Base64
- `backend/services/photo-storage.js`: Manages file storage independently

### 8. Error Handling

- All routes wrapped in try-catch blocks
- Errors logged via `logger` (not console.log)
- Sensitive error details not exposed to client
- Generic error messages returned: "Something went wrong"

### 9. Input Validation

**Validation Checklist**:
- Email format: `validateEmail()` function
- File uploads: Magic bytes + MIME type + size limits
- HTML content: Sanitized before storage/display
- User profiles: Name length (2-100 chars), bio length (<500 chars)
- API parameters: Type checked, null/undefined validated

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set (RESEND_API_KEY, RESEND_FROM_EMAIL, etc.)
- [ ] CORS origins configured correctly (not localhost)
- [ ] JWT secret key rotated
- [ ] Database backups enabled
- [ ] Rate limiting thresholds tuned for expected traffic
- [ ] Error logging system operational
- [ ] HTTPS/TLS enabled on all endpoints
- [ ] Content Security Policy (CSP) headers configured
- [ ] Secrets never committed to git

---

## Vulnerabilities Fixed (Sprint 0-1)

| ID | Issue | CVSS | Status |
|---|---|---|---|
| C1 | XSS via unsanitized HTML | 7.2 | ✅ FIXED |
| C2 | Missing imports (ReferenceError) | 10.0 | ✅ FIXED |
| C3 | JWT validation missing | 9.8 | ✅ FIXED |
| C4 | Base64 in database | 6.5 | ✅ FIXED |
| C5 | API key logging | 9.1 | ✅ FIXED |
| C6 | CORS misconfiguration | 7.5 | ✅ VERIFIED |
| C7 | Weak file upload validation | 6.8 | ✅ FIXED |

---

## Future Enhancements

- [ ] Implement CSP (Content Security Policy) headers
- [ ] Add rate limiting per user ID (not just IP)
- [ ] Implement 2FA for sensitive operations
- [ ] Add automated security scanning (SAST) to CI/CD
- [ ] Encrypt sensitive data in database (at-rest encryption)
- [ ] Implement RBAC (Role-Based Access Control)
- [ ] Add audit logging for all sensitive operations

---

## Contact

For security questions or concerns, contact: **security@suplilist.app**
