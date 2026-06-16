import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Encryption key MUST come from environment — no hardcoded fallback for security
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX) {
  throw new Error(
    'CRITICAL: ENCRYPTION_KEY environment variable is not set. ' +
    'Generate with: openssl rand -hex 32'
  );
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

// Validate key length (AES-256 requires 32 bytes)
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    `CRITICAL: ENCRYPTION_KEY must be exactly 32 bytes (256 bits). ` +
    `Got ${ENCRYPTION_KEY.length} bytes. Generate with: openssl rand -hex 32`
  );
}

/**
 * Encrypts clear text using AES-256-GCM.
 * Returns a string formatted as "iv_hex:auth_tag_hex:encrypted_hex"
 * 
 * @param {string} text - The clear text to encrypt
 * @returns {string | null} The formatted encrypted string
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string formatted as "iv_hex:auth_tag_hex:encrypted_hex" using AES-256-GCM.
 * 
 * @param {string | null | undefined} encryptedString - The formatted encrypted string
 * @returns {string | null} The decrypted clear text
 */
export function decrypt(encryptedString: string | null | undefined): string | null {
  if (!encryptedString) return null;

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}
