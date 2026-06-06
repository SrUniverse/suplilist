# Security Utilities Guide
**Purpose**: Reference for using the new security utilities added during the vulnerability fixes

---

## HTML Sanitization

### Location
`frontend/src/platform/html-sanitizer.js`

### Available Functions

#### `sanitizeHtml(text)`
Escapes dangerous HTML characters to prevent XSS attacks.

```javascript
import { sanitizeHtml } from './html-sanitizer.js';

// User input with HTML/script tags
const userInput = "<script>alert('xss')</script>";

// Sanitized output
const safe = sanitizeHtml(userInput);
// Result: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
```

#### `stripHtmlTags(html)`
Removes all HTML tags from text.

```javascript
const html = "<p>Hello <strong>World</strong></p>";
const plain = stripHtmlTags(html);
// Result: "Hello World"
```

#### `sanitizeUrl(url)`
Prevents javascript: and data: protocol attacks.

```javascript
const maliciousUrl = "javascript:alert('xss')";
const safe = sanitizeUrl(maliciousUrl);
// Result: "" (empty string - dangerous protocol detected)

const goodUrl = "https://example.com";
const safe = sanitizeUrl(goodUrl);
// Result: "https://example.com"
```

#### `sanitizeAttributes(attributes)`
Safely handles HTML attributes.

```javascript
const attrs = { href: "https://example.com", onclick: "alert('xss')" };
const safe = sanitizeAttributes(attrs);
// Result: 'href="https://example.com"' (onclick removed)
```

---

## File Validation

### Location
`backend/utils/file-validator.js`

### Available Functions

#### `validateImageMagicBytes(buffer, mimeType)`
Validates that file content matches claimed MIME type using magic bytes.

```javascript
import { validateImageMagicBytes } from '../utils/file-validator.js';

// In your upload handler
const isValid = validateImageMagicBytes(req.file.buffer, req.file.mimetype);

if (!isValid) {
  return res.status(400).json({
    error: 'File magic bytes do not match claimed type'
  });
}
```

#### `detectImageTypeFromMagicBytes(buffer)`
Detects actual file type by reading magic bytes.

```javascript
import { detectImageTypeFromMagicBytes } from '../utils/file-validator.js';

const actualType = detectImageTypeFromMagicBytes(file.buffer);
console.log(actualType);  // 'image/jpeg', 'image/png', etc.
```

#### `validateFileUpload(buffer, mimeType, filename, maxSize)`
Comprehensive validation - checks magic bytes, size, filename, and MIME type.

```javascript
import { validateFileUpload } from '../utils/file-validator.js';

const validation = validateFileUpload(
  req.file.buffer,
  req.file.mimetype,
  req.file.originalname,
  5 * 1024 * 1024  // 5MB max
);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Detected type:', validation.detectedType);
  
  return res.status(400).json({
    error: 'File validation failed',
    details: validation.errors
  });
}

// Continue with upload
```

#### `sanitizeFilename(filename)`
Prevents directory traversal and control character attacks in filenames.

```javascript
import { sanitizeFilename } from '../utils/file-validator.js';

const isOk = sanitizeFilename(req.file.originalname);

if (!isOk) {
  return res.status(400).json({ error: 'Invalid filename' });
}
```

---

## Email Configuration

### Location
`backend/config/email-config.js`

### Safe API Key Access

**WRONG** ❌ (Leaks secrets):
```javascript
import { emailConfig } from '../config/email-config.js';

const apiKey = emailConfig.apiKey;  // NEVER DO THIS
console.log(apiKey);  // Could leak in error messages
```

**RIGHT** ✅ (Secure):
```javascript
import { getResendApiKey } from '../config/email-config.js';

const apiKey = getResendApiKey();  // Secure getter
const resend = new Resend(apiKey);
// Never log or expose the key
```

### Configuration
```javascript
import { emailConfig } from '../config/email-config.js';

// Safe to use - no secrets
const fromEmail = emailConfig.fromEmail;
const replyTo = emailConfig.replyToEmail;
const rateLimits = emailConfig.rateLimits;
```

---

## Security Best Practices

### Input Validation

1. **Always sanitize user input**:
```javascript
const userComment = req.body.comment;
const safe = sanitizeHtml(userComment);  // Before storing/using
```

2. **Validate file uploads**:
```javascript
const validation = validateFileUpload(
  file.buffer,
  file.mimetype,
  file.originalname
);

if (!validation.valid) {
  throw new Error(`File validation: ${validation.errors.join(', ')}`);
}
```

3. **Clean URLs**:
```javascript
const userUrl = req.body.redirect;
const safe = sanitizeUrl(userUrl);

if (!safe) {
  return res.redirect('/default');  // Invalid URL
}
return res.redirect(safe);  // Safe URL
```

### Secrets Management

1. **Never export secrets in config**:
```javascript
// ❌ WRONG
export const config = {
  apiKey: process.env.SOME_API_KEY
};
```

2. **Use getter functions instead**:
```javascript
// ✅ RIGHT
export function getApiKey() {
  return process.env.SOME_API_KEY;
}
```

3. **Secrets only server-side**:
```javascript
// ❌ WRONG - sending secrets to client
res.json({ apiKey: process.env.API_KEY });

// ✅ RIGHT - use secrets only on server
const data = await fetchExternalApi(process.env.API_KEY);
res.json({ data });  // Send result only
```

### File Upload Safety

1. **Always validate magic bytes** (not just MIME type):
```javascript
// MIME type can be spoofed
if (req.file.mimetype === 'image/jpeg') {  // Not enough!

// Must check actual file content
const isValid = validateImageMagicBytes(
  req.file.buffer,
  req.file.mimetype
);
if (!isValid) {
  throw new Error('Invalid file');
}
```

2. **Limit file sizes**:
```javascript
const MAX_SIZE = 5 * 1024 * 1024;  // 5MB
if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}
```

3. **Sanitize filenames**:
```javascript
// Prevent directory traversal
if (filename.includes('..') || filename.includes('/')) {
  throw new Error('Invalid filename');
}
```

---

## Common Scenarios

### Scenario 1: User Submitting HTML Bio

```javascript
// Before security fix:
const bio = "<script>alert('xss')</script>";
await updateProfile({ bio });  // VULNERABLE

// After security fix:
import { sanitizeHtml } from './html-sanitizer.js';

const bio = req.body.bio;
const safeBio = sanitizeHtml(bio);  // Escapes HTML
await updateProfile({ bio: safeBio });  // SAFE
```

### Scenario 2: User Uploading Profile Photo

```javascript
// Before security fix:
if (req.file.mimetype === 'image/jpeg') {  // SPOOFABLE
  await saveFile(req.file);
}

// After security fix:
import { validateImageMagicBytes } from './file-validator.js';

const isValidImage = validateImageMagicBytes(
  req.file.buffer,
  req.file.mimetype
);

if (!isValidImage) {
  return res.status(400).json({ error: 'Invalid image' });
}

await saveFile(req.file);  // SAFE
```

### Scenario 3: Sending External API Request

```javascript
// Before security fix:
const apiKey = emailConfig.apiKey;  // LEAKED in memory dumps
const resend = new Resend(apiKey);

// After security fix:
import { getResendApiKey } from './email-config.js';

const apiKey = getResendApiKey();  // Only accessed when needed
const resend = new Resend(apiKey);
// Key is immediately used, not stored in config object
```

---

## Testing the Utilities

### Test HTML Sanitization

```javascript
import { sanitizeHtml, stripHtmlTags } from './html-sanitizer.js';

// Test XSS payload
const xss = "<img src=x onerror=alert('xss')>";
const safe = sanitizeHtml(xss);

// Should be escaped
assert(!safe.includes('onerror'));
assert(safe.includes('&lt;'));
```

### Test File Validation

```javascript
import { validateImageMagicBytes } from './file-validator.js';

// Create fake JPG file (just magic bytes, no real image)
const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
const isValid = validateImageMagicBytes(jpegHeader, 'image/jpeg');

assert(isValid === true);

// Test spoofed file
const notImage = Buffer.from('fake image data');
const isValid = validateImageMagicBytes(notImage, 'image/jpeg');

assert(isValid === false);
```

---

## Troubleshooting

### Issue: Sanitization removes too much content

**Problem**: `sanitizeHtml()` escapes all HTML, including legitimate tags.

**Solution**: If you need to preserve some HTML tags, use the sanitize-html library directly with allowedTags option:

```javascript
import sanitizeHtmlLib from 'sanitize-html';

const html = req.body.content;
const clean = sanitizeHtmlLib(html, {
  allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
  allowedAttributes: {}
});
```

### Issue: Valid images rejected

**Problem**: `validateImageMagicBytes()` rejects valid image files.

**Solution**: Check the detected type:

```javascript
const { detectImageTypeFromMagicBytes } = require('./file-validator.js');

const detected = detectImageTypeFromMagicBytes(file.buffer);
console.log('Claimed:', file.mimetype, 'Detected:', detected);

// If detected is null, file might be corrupted
```

### Issue: Filename sanitization rejects special characters

**Problem**: `sanitizeFilename()` is very strict.

**Solution**: Generate safe filenames instead:

```javascript
const crypto = require('crypto');

// Generate safe filename
const timestamp = Date.now();
const random = crypto.randomBytes(4).toString('hex');
const ext = path.extname(userFilename);
const safeFilename = `${userId}_${timestamp}_${random}${ext}`;
```

---

## Performance Considerations

### HTML Sanitization
- Lightweight, suitable for real-time sanitization
- No external API calls required
- Safe to use in request handlers

### File Validation
- Magic bytes check is O(1) - just compares first few bytes
- Suitable for upload handlers
- No significant performance impact

### Recommendation
These utilities are optimized for production use with minimal performance overhead.

---

## Support

For questions or issues with these utilities:

1. Check the function JSDoc comments
2. Review test files in `__tests__/` directories
3. Open an issue in the security team Slack channel
4. Contact the security team lead

---

**Last Updated**: 2026-06-06  
**Security Review**: PASSED ✅
