/**
 * Crypto utilities for identity encryption using AES-GCM
 * Provides secure encryption/decryption of private keys with user passwords
 */

/**
 * Derive an encryption key from a password using PBKDF2
 * @param password - User password
 * @param salt - Salt for key derivation (will be generated if not provided)
 * @returns Derived key and salt used
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  // Generate salt if not provided (use regular ArrayBuffer)
  const saltBytes = salt || new Uint8Array(crypto.getRandomValues(new Uint8Array(16)));
  
  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  return { key: derivedKey, salt: saltBytes };
}

/**
 * Encrypted identity data structure
 */
export interface EncryptedIdentity {
  ciphertext: string;  // Base64 encoded encrypted data
  iv: string;          // Base64 encoded initialization vector
  salt: string;        // Base64 encoded salt
}

/**
 * Encrypt a private key with a password
 * @param privateKeyHex - Hex-encoded private key
 * @param password - User password
 * @returns Encrypted identity data
 */
export async function encryptIdentity(
  privateKeyHex: string,
  password: string
): Promise<EncryptedIdentity> {
  // Derive key from password
  const { key, salt } = await deriveKey(password);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the private key
  const encodedData = new TextEncoder().encode(privateKeyHex);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encodedData
  );
  
  // Convert to base64 for storage
  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt)
  };
}

/**
 * Decrypt a private key with a password
 * @param encryptedIdentity - Encrypted identity data
 * @param password - User password
 * @returns Decrypted hex-encoded private key or null if decryption fails
 */
export async function decryptIdentity(
  encryptedIdentity: EncryptedIdentity,
  password: string
): Promise<string | null> {
  try {
    // Decode base64 values
    const salt = base64ToBuffer(encryptedIdentity.salt);
    const iv = base64ToBuffer(encryptedIdentity.iv);
    const ciphertext = base64ToBuffer(encryptedIdentity.ciphertext);
    
    // Derive key from password with the stored salt
    const { key } = await deriveKey(password, salt);
    
    // Decrypt the private key
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid flag and optional error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }
  return { isValid: true };
}
