import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : Buffer.from('d3f7b2e9c20a158b4b74a1e9df64a32b0f452d3a9efb925cc78a10b48cde7a19', 'hex');

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
