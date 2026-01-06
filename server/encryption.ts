import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.NOTES_ENCRYPTION_KEY;
  if (!key) {
    console.warn('[Encryption] NOTES_ENCRYPTION_KEY not set - notes will not be encrypted');
    return Buffer.alloc(0);
  }
  
  // Derive a 32-byte key using PBKDF2 with a fixed salt (for deterministic key derivation)
  // In production, the key should already be 32 bytes or properly derived
  if (key.length === 64) {
    // Key is already hex-encoded 32-byte key
    return Buffer.from(key, 'hex');
  }
  
  // Derive key from passphrase using PBKDF2
  return crypto.pbkdf2Sync(key, 'homecare-notes-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64-encoded string in format: iv:authTag:ciphertext
 */
export function encryptNote(plaintext: string | null | undefined): string | null {
  if (!plaintext) return plaintext as null;
  
  const key = getEncryptionKey();
  if (key.length === 0) {
    // Encryption not configured - return plaintext
    return plaintext;
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext (all base64 encoded)
    return `ENC:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt note:', error);
    return plaintext; // Return plaintext on error to avoid data loss
  }
}

/**
 * Decrypt a ciphertext string that was encrypted with encryptNote
 * Expects base64-encoded string in format: ENC:iv:authTag:ciphertext
 */
export function decryptNote(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return ciphertext as null;
  
  // Check if this is an encrypted value
  if (!ciphertext.startsWith('ENC:')) {
    // Not encrypted - return as-is (backwards compatibility)
    return ciphertext;
  }
  
  const key = getEncryptionKey();
  if (key.length === 0) {
    // Encryption not configured - return as-is
    console.warn('[Encryption] Cannot decrypt - NOTES_ENCRYPTION_KEY not set');
    return ciphertext;
  }
  
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) {
      console.warn('[Encryption] Invalid encrypted format, returning as-is');
      return ciphertext;
    }
    
    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const encrypted = parts[3];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt note:', error);
    return ciphertext; // Return ciphertext on error
  }
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.NOTES_ENCRYPTION_KEY;
}

/**
 * Generate a new encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
