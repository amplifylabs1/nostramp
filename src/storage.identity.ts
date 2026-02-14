/**
 * Identity storage utilities for managing Nostr profile with ephemeral keys
 */

import { generateEphemeralKeypair, getPublicKeyFromPrivate } from './nostr';

const STORAGE_KEYS = {
  PROFILE_KEY: 'nostramp_profile_key',  // This is the user's profile/ephemeral key
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
 * Check if a profile key exists in storage
 */
export function hasProfileKey(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.PROFILE_KEY) !== null;
  } catch (error) {
    console.error('Error checking profile:', error);
    return false;
  }
}

/**
 * Get the profile key from storage
 */
export function getProfileKey(): { privateKey: string; publicKey: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE_KEY);
    if (stored) {
      const keys = JSON.parse(stored);
      return {
        privateKey: keys.privateKey,
        publicKey: keys.publicKey
      };
    }
  } catch (error) {
    console.error('Error reading profile key:', error);
  }
  return null;
}

/**
 * Create and store a new profile with ephemeral keys
 * @returns The public key of the new profile
 */
export function createProfile(): { 
  publicKey: string; 
  privateKey: string;
  error?: string 
} {
  // Check if profile already exists
  if (hasProfileKey()) {
    return { publicKey: '', privateKey: '', error: 'Profile already exists' };
  }
  
  // Generate new ephemeral keypair
  const keypair = generateEphemeralKeypair();
  
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE_KEY, JSON.stringify(keypair));
    sessionStorage.setItem(STORAGE_KEYS.SESSION_KEY, keypair.privateKey);
    return { publicKey: keypair.publicKey, privateKey: keypair.privateKey };
  } catch (error) {
    console.error('Error storing profile:', error);
    return { publicKey: '', privateKey: '', error: 'Failed to store profile' };
  }
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
 * Clear the session key
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
  const profileKey = getProfileKey();
  
  if (profileKey) {
    // Ensure session key is set
    sessionStorage.setItem(STORAGE_KEYS.SESSION_KEY, profileKey.privateKey);
    return {
      publicKey: profileKey.publicKey,
      isLocked: false,
      hasIdentity: true
    };
  }
  
  return {
    publicKey: null,
    isLocked: false,
    hasIdentity: false
  };
}

/**
 * Restore session and return keys - for use in components
 */
export async function restoreAndGetSession(): Promise<{ privateKey: string; publicKey: string } | null> {
  // First check if we already have a session key
  const existingSession = getSessionKey();
  if (existingSession) {
    return existingSession;
  }
  
  // Try to get from profile key
  const profileKey = getProfileKey();
  if (profileKey) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_KEY, profileKey.privateKey);
    return profileKey;
  }
  
  return null;
}

/**
 * Clear all profile data (burn profile)
 */
export function clearIdentityData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE_KEY);
    localStorage.removeItem(STORAGE_KEYS.USER_ACTIVITY);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_KEY);
  } catch (error) {
    console.error('Error clearing profile data:', error);
  }
}

// Keep these for backwards compatibility with existing code
export const hasEncryptedIdentity = hasProfileKey;
export const createEncryptedIdentity = async () => {
  const result = createProfile();
  return { publicKey: result.publicKey, error: result.error };
};
