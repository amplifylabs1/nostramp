/**
 * Storage utilities for managing ephemeral keys and visit tracking
 */

const STORAGE_KEYS = {
  EPHEMERAL_KEY: 'nostramp_ephemeral_key',
  VISIT_COUNT: 'nostramp_visit_count',
  LAST_VISIT: 'nostramp_last_visit',
  HAS_CLAIMED: 'nostramp_has_claimed'
} as const;

/**
 * Get ephemeral key from storage
 * @returns The private key or null if not found
 */
export function getEphemeralKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEY);
  } catch (error) {
    console.error('Error reading ephemeral key:', error);
    return null;
  }
}

/**
 * Store ephemeral key
 * @param privateKey - The private key to store
 */
export function setEphemeralKey(privateKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEY, privateKey);
  } catch (error) {
    console.error('Error storing ephemeral key:', error);
  }
}

/**
 * Get visit count
 * @returns The current visit count
 */
export function getVisitCount(): number {
  try {
    const count = localStorage.getItem(STORAGE_KEYS.VISIT_COUNT);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Error reading visit count:', error);
    return 0;
  }
}

/**
 * Increment visit count
 * @returns The new visit count
 */
export function incrementVisitCount(): number {
  try {
    const count = getVisitCount() + 1;
    localStorage.setItem(STORAGE_KEYS.VISIT_COUNT, count.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_VISIT, Date.now().toString());
    return count;
  } catch (error) {
    console.error('Error incrementing visit count:', error);
    return getVisitCount();
  }
}

/**
 * Check if user has claimed their identity
 * @returns true if claimed, false otherwise
 */
export function hasClaimed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.HAS_CLAIMED) === 'true';
  } catch (error) {
    console.error('Error checking claim status:', error);
    return false;
  }
}

/**
 * Mark identity as claimed
 */
export function markAsClaimed(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HAS_CLAIMED, 'true');
  } catch (error) {
    console.error('Error marking as claimed:', error);
  }
}

/**
 * Clear all stored data
 */
export function clearStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

/**
 * Get last visit timestamp
 * @returns Timestamp of last visit or null
 */
export function getLastVisit(): number | null {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_VISIT);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Error reading last visit:', error);
    return null;
  }
}
