/**
 * Identity storage utilities for managing encrypted Nostr identity
 */

import { 
  encryptIdentity, 
  decryptIdentity, 
  validatePassword,
  type EncryptedIdentity 
} from './security/crypto';
import { generateEphemeralKeypair, getPublicKeyFromPrivate } from './nostr';

const STORAGE_KEYS = {
  ENCRYPTED_IDENTITY: 'nostramp_encrypted_identity',
  USER_ACTIVITY: 'nostramp_user_activity',
  SESSION_KEY: 'nostramp_session_key'
} as const;

/**
 * User activity tracking
 */
export interface UserActivity {
  replies: number;
  likes: number;
  saves: number;
  likedEvents: string[];    // Event IDs the user has liked
  savedEvents: string[];    // Event IDs the user has saved
  replyEvents: string[];    // Event IDs the user has replied to
}

/**
 * Identity state
 */
export interface IdentityState {
  publicKey: string | null;
  isLocked: boolean;
  hasIdentity: boolean;
}

/**
 * Get the default empty activity state
 */
export function getDefaultActivity(): UserActivity {
  return {
    replies: 0,
    likes: 0,
    saves: 0,
    likedEvents: [],
    savedEvents: [],
    replyEvents: []
  };
}

/**
 * Get user activity from storage
 */
export function getUserActivity(): UserActivity {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_ACTIVITY);
    if (stored) {
      return JSON.parse(stored) as UserActivity;
    }
  } catch (error) {
    console.error('Error reading user activity:', error);
  }
  return getDefaultActivity();
}

/**
 * Save user activity to storage
 */
export function saveUserActivity(activity: UserActivity): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_ACTIVITY, JSON.stringify(activity));
  } catch (error) {
    console.error('Error saving user activity:', error);
  }
}

/**
 * Record a like for an event
 */
export function recordLike(eventId: string): UserActivity {
  const activity = getUserActivity();
  if (!activity.likedEvents.includes(eventId)) {
    activity.likedEvents.push(eventId);
    activity.likes++;
    saveUserActivity(activity);
  }
  return activity;
}

/**
 * Remove a like for an event
 */
export function removeLike(eventId: string): UserActivity {
  const activity = getUserActivity();
  const index = activity.likedEvents.indexOf(eventId);
  if (index > -1) {
    activity.likedEvents.splice(index, 1);
    activity.likes = Math.max(0, activity.likes - 1);
    saveUserActivity(activity);
  }
  return activity;
}

/**
 * Record a save/bookmark for an event
 */
export function recordSave(eventId: string): UserActivity {
  const activity = getUserActivity();
  if (!activity.savedEvents.includes(eventId)) {
    activity.savedEvents.push(eventId);
    activity.saves++;
    saveUserActivity(activity);
  }
  return activity;
}

/**
 * Remove a save/bookmark for an event
 */
export function removeSave(eventId: string): UserActivity {
  const activity = getUserActivity();
  const index = activity.savedEvents.indexOf(eventId);
  if (index > -1) {
    activity.savedEvents.splice(index, 1);
    activity.saves = Math.max(0, activity.saves - 1);
    saveUserActivity(activity);
  }
  return activity;
}

/**
 * Record a reply to an event
 */
export function recordReply(eventId: string): UserActivity {
  const activity = getUserActivity();
  if (!activity.replyEvents.includes(eventId)) {
    activity.replyEvents.push(eventId);
    activity.replies++;
    saveUserActivity(activity);
  }
  return activity;
}

/**
 * Check if user has liked an event
 */
export function hasLikedEvent(eventId: string): boolean {
  const activity = getUserActivity();
  return activity.likedEvents.includes(eventId);
}

/**
 * Check if user has saved an event
 */
export function hasSavedEvent(eventId: string): boolean {
  const activity = getUserActivity();
  return activity.savedEvents.includes(eventId);
}

/**
 * Check if an encrypted identity exists in storage
 */
export function hasEncryptedIdentity(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_IDENTITY) !== null;
  } catch (error) {
    console.error('Error checking identity:', error);
    return false;
  }
}

/**
 * Get the encrypted identity from storage
 */
export function getEncryptedIdentity(): EncryptedIdentity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_IDENTITY);
    if (stored) {
      return JSON.parse(stored) as EncryptedIdentity;
    }
  } catch (error) {
    console.error('Error reading encrypted identity:', error);
  }
  return null;
}

/**
 * Create and store a new encrypted identity
 * @param password - User password for encryption
 * @returns The public key of the new identity
 */
export async function createEncryptedIdentity(password: string): Promise<{ 
  publicKey: string; 
  error?: string 
}> {
  // Validate password
  const validation = validatePassword(password);
  if (!validation.isValid) {
    return { publicKey: '', error: validation.error };
  }
  
  // Check if identity already exists
  if (hasEncryptedIdentity()) {
    return { publicKey: '', error: 'Identity already exists' };
  }
  
  // Generate new keypair
  const keypair = generateEphemeralKeypair();
  
  // Encrypt and store
  const encrypted = await encryptIdentity(keypair.privateKey, password);
  
  try {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_IDENTITY, JSON.stringify(encrypted));
    return { publicKey: keypair.publicKey };
  } catch (error) {
    console.error('Error storing encrypted identity:', error);
    return { publicKey: '', error: 'Failed to store identity' };
  }
}

/**
 * Unlock the identity with password
 * @param password - User password
 * @param rememberSession - Whether to remember the key for the session
 * @returns The decrypted private key and public key, or error
 */
export async function unlockIdentity(
  password: string, 
  rememberSession: boolean = false
): Promise<{ 
  privateKey: string; 
  publicKey: string; 
  error?: string 
}> {
  const encrypted = getEncryptedIdentity();
  
  if (!encrypted) {
    return { privateKey: '', publicKey: '', error: 'No identity found' };
  }
  
  const privateKey = await decryptIdentity(encrypted, password);
  
  if (!privateKey) {
    return { privateKey: '', publicKey: '', error: 'Invalid password' };
  }
  
  const publicKey = getPublicKeyFromPrivate(privateKey);
  
  // Optionally store in session memory
  if (rememberSession) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_KEY, privateKey);
    } catch (error) {
      console.error('Error storing session key:', error);
    }
  }
  
  return { privateKey, publicKey };
}

/**
 * Get the session key if available
 */
export function getSessionKey(): { privateKey: string; publicKey: string } | null {
  try {
    const privateKey = sessionStorage.getItem(STORAGE_KEYS.SESSION_KEY);
    if (privateKey) {
      const publicKey = getPublicKeyFromPrivate(privateKey);
      return { privateKey, publicKey };
    }
  } catch (error) {
    console.error('Error reading session key:', error);
  }
  return null;
}

/**
 * Clear the session key (lock the identity)
 */
export function clearSessionKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_KEY);
  } catch (error) {
    console.error('Error clearing session key:', error);
  }
}

/**
 * Get current identity state
 */
export function getIdentityState(): IdentityState {
  const sessionKey = getSessionKey();
  if (sessionKey) {
    return {
      publicKey: sessionKey.publicKey,
      isLocked: false,
      hasIdentity: true
    };
  }
  
  const hasEncrypted = hasEncryptedIdentity();
  return {
    publicKey: null,
    isLocked: hasEncrypted,
    hasIdentity: hasEncrypted
  };
}

/**
 * Clear all identity data (for testing or reset)
 */
export function clearIdentityData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_IDENTITY);
    localStorage.removeItem(STORAGE_KEYS.USER_ACTIVITY);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_KEY);
  } catch (error) {
    console.error('Error clearing identity data:', error);
  }
}
