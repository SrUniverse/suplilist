/**
 * File Validator Utility
 * Validates files using magic bytes (file signatures) to prevent spoofing
 *
 * FIX C7: Magic bytes validation prevents attackers from uploading
 * executable files (.exe, .sh) disguised as images (.jpg, .png)
 */

/**
 * Magic bytes (file signatures) for common image formats
 * See: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
const MAGIC_BYTES = {
  'image/jpeg': [
    { bytes: Buffer.from([0xFF, 0xD8, 0xFF]), name: 'JPEG' }
  ],
  'image/png': [
    { bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47]), name: 'PNG' }
  ],
  'image/gif': [
    { bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]), name: 'GIF87' },
    { bytes: Buffer.from([0x47, 0x49, 0x46, 0x39]), name: 'GIF89' }
  ],
  'image/webp': [
    { bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]), name: 'WEBP (RIFF prefix)' }
  ]
};

/**
 * Validate image file by checking magic bytes
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} mimeType - Claimed MIME type
 * @returns {boolean} - True if magic bytes match MIME type
 */
export function validateImageMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    return false;
  }

  // Check if file starts with any valid signature for this MIME type
  for (const signature of signatures) {
    if (buffer.length >= signature.bytes.length) {
      const fileHeader = buffer.slice(0, signature.bytes.length);
      if (fileHeader.equals(signature.bytes)) {
        // For WebP, also check for WEBP marker after RIFF signature
        if (mimeType === 'image/webp') {
          if (buffer.length >= 12) {
            const webpMarker = buffer.slice(8, 12).toString('ascii');
            if (webpMarker === 'WEBP') {
              return true;
            }
          }
        } else {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get file type from magic bytes
 * Useful for detecting actual file type when MIME type is unreliable
 *
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} - Detected MIME type or null
 */
export function detectImageTypeFromMagicBytes(buffer) {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  // Check each MIME type
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const signature of signatures) {
      if (buffer.length >= signature.bytes.length) {
        const fileHeader = buffer.slice(0, signature.bytes.length);
        if (fileHeader.equals(signature.bytes)) {
          if (mimeType === 'image/webp') {
            if (buffer.length >= 12) {
              const webpMarker = buffer.slice(8, 12).toString('ascii');
              if (webpMarker === 'WEBP') {
                return mimeType;
              }
            }
          } else {
            return mimeType;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Validate file is safe for upload
 * Performs multiple checks:
 * - Magic bytes validation
 * - File size check
 * - Filename sanitization
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - Claimed MIME type
 * @param {string} filename - Original filename
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateFileUpload(buffer, mimeType, filename, maxSize = 5 * 1024 * 1024) {
  const errors = [];

  // Check file exists
  if (!buffer || buffer.length === 0) {
    errors.push('File is empty');
    return { valid: false, errors };
  }

  // Check file size
  if (buffer.length > maxSize) {
    errors.push(`File exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
  }

  // Check MIME type is allowed
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(mimeType)) {
    errors.push(`File type ${mimeType} is not allowed`);
  }

  // Validate magic bytes
  if (!validateImageMagicBytes(buffer, mimeType)) {
    errors.push('File magic bytes do not match claimed file type');
  }

  // Sanitize filename
  if (!sanitizeFilename(filename)) {
    errors.push('Invalid or suspicious filename');
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedType: detectImageTypeFromMagicBytes(buffer)
  };
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 * @param {string} filename - Original filename
 * @returns {boolean} - True if filename is safe
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // Prevent control characters
  if (/[\x00-\x1F\x7F]/.test(filename)) {
    return false;
  }

  return true;
}

export default {
  validateImageMagicBytes,
  detectImageTypeFromMagicBytes,
  validateFileUpload,
  sanitizeFilename
};
