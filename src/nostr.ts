/**
 * Nostr utilities using nostr-tools
 */

import { generateSecretKey, getPublicKey, finalizeEvent, nip19, SimplePool, type Event as NostrEvent } from 'nostr-tools';

// Extend the Event type with additional properties
// Note: NostrEvent already has required properties: id, pubkey, created_at, kind, tags, content, sig
// We only add new optional properties here - do not re-declare inherited properties as optional
export interface Event extends NostrEvent {
  profile?: ProfileData;
  isVerified?: boolean;
  images?: string[];
  videos?: string[];
  events?: Array<{ type: string; content: string }>;
}

// UnsignedEvent type for events that haven't been signed yet
// These have required properties for creating an event but no signature
export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  profile?: ProfileData;
  isVerified?: boolean;
  images?: string[];
  videos?: string[];
  events?: Array<{ type: string; content: string }>;
}

// Type guards for optional properties
export function hasImages(event: Event): event is Event {
  return Array.isArray(event.images) && event.images.length > 0;
}

export function hasVideos(event: Event): event is Event {
  return Array.isArray(event.videos) && event.videos.length > 0;
}

export function hasEvents(event: Event): event is Event {
  return Array.isArray(event.events) && event.events.length > 0;
}

// Helper function to ensure required properties are present
export function ensureEventProperties(event: Event): Event {
  return {
    ...event,
    kind: event.kind || 0,
    created_at: event.created_at || 0,
    pubkey: event.pubkey || '',
    content: event.content || ''
  };
}

export interface Keypair {
  privateKey: string;
  publicKey: string;
}

export interface ExportedKeypair {
  privateKey: {
    hex: string;
    nsec: string;
  };
  publicKey: {
    hex: string;
    npub: string;
  };
}

/**
 * Generate a new ephemeral keypair using CSPRNG
 * @returns Hex-encoded keys
 */
export function generateEphemeralKeypair(): Keypair {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  
  // Convert Uint8Array to hex string
  const privateKeyHex = Array.from(secretKey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    privateKey: privateKeyHex,
    publicKey: publicKey
  };
}

/**
 * Get public key from private key
 * @param privateKeyHex - Hex-encoded private key
 * @returns Hex-encoded public key
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  const secretKey = hexToBytes(privateKeyHex);
  return getPublicKey(secretKey);
}

/**
 * Convert hex private key to Uint8Array
 * @param hexKey - Hex-encoded private key
 * @returns Uint8Array
 */
export function hexToBytes(hexKey: string): Uint8Array {
  const bytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < hexKey.length; i += 2) {
    bytes[i / 2] = parseInt(hexKey.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Create and sign a Nostr event
 * @param privateKeyHex - Hex-encoded private key
 * @param content - Event content
 * @param kind - Event kind (default: 1 for text note)
 * @param tags - Event tags
 * @returns Signed Nostr event
 */
export function createSignedEvent(
  privateKeyHex: string,
  content: string,
  kind: number = 1,
  tags: string[][] = []
): Event {
  const secretKey = hexToBytes(privateKeyHex);
  const publicKey = getPublicKey(secretKey);
  
  const unsignedEvent: UnsignedEvent = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey: publicKey
  };
  
  return finalizeEvent(unsignedEvent, secretKey);
}

/**
 * Get npub (bech32-encoded public key) from hex public key
 * @param publicKeyHex - Hex-encoded public key
 * @returns npub-encoded public key
 */
export function getNostrPublicKey(publicKeyHex: string): string {
  return nip19.npubEncode(publicKeyHex);
}

/**
 * Get nsec (bech32-encoded private key) from hex private key
 * @param privateKeyHex - Hex-encoded private key
 * @returns nsec-encoded private key
 */
export function getNostrPrivateKey(privateKeyHex: string): string {
  return nip19.nsecEncode(hexToBytes(privateKeyHex));
}

/**
 * Export keypair in various formats
 * @param privateKeyHex - Hex-encoded private key
 * @param publicKeyHex - Hex-encoded public key
 * @returns Keypair in various formats
 */
export function exportKeypair(privateKeyHex: string, publicKeyHex: string): ExportedKeypair {
  return {
    privateKey: {
      hex: privateKeyHex,
      nsec: getNostrPrivateKey(privateKeyHex)
    },
    publicKey: {
      hex: publicKeyHex,
      npub: getNostrPublicKey(publicKeyHex)
    }
  };
}

/**
 * Extract event identifier from various Nostr link formats
 * Supports: note1..., nevent1..., nostr: prefixes, and various client URLs
 * @param link - Nostr link to parse
 * @returns The event identifier (nevent1... or note1...) or null if not found
 */
export function extractEventId(link: string): string | null {
  // Remove whitespace
  const cleanLink = link.trim();
  
  // Match bech32 encoded identifiers (note1... or nevent1...)
  const bech32Regex = /(note1|nevent1)[a-z0-9]+/i;
  const match = cleanLink.match(bech32Regex);
  
  if (match) {
    return match[0];
  }
  
  // If it's a hex ID (64 characters), encode it as note1
  const hexRegex = /[a-f0-9]{64}/i;
  const hexMatch = cleanLink.match(hexRegex);
  
  if (hexMatch) {
    try {
      return nip19.noteEncode(hexMatch[0]);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Decode a note1 or nevent1 identifier to get the event ID
 * @param eventId - note1... or nevent1... identifier
 * @returns The decoded event data or null if invalid
 */
export function decodeEventId(eventId: string): { id: string; relays?: string[] } | null {
  try {
    if (eventId.startsWith('note1')) {
      const decoded = nip19.decode(eventId);
      if (decoded.type === 'note') {
        return { id: decoded.data as string };
      }
    } else if (eventId.startsWith('nevent1')) {
      const decoded = nip19.decode(eventId);
      if (decoded.type === 'nevent') {
        const data = decoded.data as { id: string; relays?: string[] };
        return { id: data.id, relays: data.relays };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch a Nostr event from relays
 * @param eventId - The event ID (hex string)
 * @param relays - Optional array of relay URLs to use
 * @returns The event or null if not found
 */
export async function fetchEvent(eventId: string, relays?: string[]): Promise<Event | null> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  try {
    const event = await pool.get(relayList, {
      ids: [eventId]
    });
    
    pool.close(relayList);
    return event;
  } catch (error) {
    console.error('Error fetching event:', error);
    pool.close(relayList);
    return null;
  }
}

/**
 * Format a timestamp into a relative time string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

/**
 * Parse content to extract image and video URLs
 * @param content - Event content string
 * @returns Object with text content and media URLs
 */
export function parseContent(content: string): {
  text: string;
  images: string[];
  videos: string[];
} {
  const images: string[] = [];
  const videos: string[] = [];
  
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];
  
  // Filter URLs by type
  urls.forEach(url => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      images.push(url);
    } else if (url.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
      videos.push(url);
    }
  });
  
  // Remove URLs from text
  const text = content.replace(urlRegex, '').trim();
  
  return { text, images, videos };
}

/**
 * Get author name from profile or return abbreviated npub
 * @param pubkey - Author's public key (hex)
 * @returns Display name or abbreviated npub
 */
export function getAuthorDisplayName(pubkey: string): string {
  const npub = nip19.npubEncode(pubkey);
  return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
}

/**
 * Profile data interface
 */
export interface ProfileData {
  name?: string;
  display_name?: string;
  picture?: string;
  nip05?: string;
  about?: string;
  lud16?: string;
}

/**
 * Reaction counts by type
 */
export interface ReactionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  replies: number;
}

/**
 * Fetch author profile metadata (kind 0)
 * @param pubkey - Author's public key (hex)
 * @param relays - Optional array of relay URLs
 * @returns Profile data or null if not found
 */
export async function fetchAuthorProfile(pubkey: string, relays?: string[]): Promise<ProfileData | null> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  try {
    const event = await pool.get(relayList, {
      kinds: [0],
      authors: [pubkey]
    });
    
    pool.close(relayList);
    
    if (event && event.content) {
      try {
        return JSON.parse(event.content) as ProfileData;
      } catch {
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    pool.close(relayList);
    return null;
  }
}

/**
 * Fetch reactions to an event
 * @param eventId - The event ID (hex string)
 * @param relays - Optional array of relay URLs
 * @returns Reaction counts by type
 */
export async function fetchReactions(eventId: string, relays?: string[]): Promise<ReactionCounts> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  const counts: ReactionCounts = {
    likes: 0,
    reposts: 0,
    zaps: 0,
    replies: 0
  };
  
  try {
    // Fetch reactions (kind 7) and reposts (kind 6)
    const reactionEvents = await pool.querySync(relayList, {
      kinds: [7, 6],
      '#e': [eventId]
    });
    
    // Fetch replies (kind 1 with 'e' tag referencing this event)
    const replyEvents = await pool.querySync(relayList, {
      kinds: [1],
      '#e': [eventId]
    });
    
    // Fetch zaps (kind 9735)
    const zapEvents = await pool.querySync(relayList, {
      kinds: [9735],
      '#e': [eventId]
    });
    
    pool.close(relayList);
    
    // Count reactions
    reactionEvents.forEach(event => {
      if (event.kind === 7) {
        const content = event.content.toLowerCase();
        // Count likes (including +, ❤️, 👍, etc.)
        if (content === '+' || content === '' || content.includes('❤️') || content.includes('👍')) {
          counts.likes++;
        }
      } else if (event.kind === 6) {
        counts.reposts++;
      }
    });
    
    counts.replies = replyEvents.length;
    counts.zaps = zapEvents.length;
    
    return counts;
  } catch (error) {
    console.error('Error fetching reactions:', error);
    pool.close(relayList);
    return counts;
  }
}

/**
 * Verify NIP-05 identifier
 * @param nip05 - The NIP-05 identifier (name@domain)
 * @param pubkey - The expected public key
 * @returns boolean indicating if verified
 */
export async function verifyNIP05(nip05: string, pubkey: string): Promise<boolean> {
  try {
    const [name, domain] = nip05.split('@');
    if (!name || !domain) return false;
    
    const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    const names = data.names || {};
    
    return names[name] === pubkey;
  } catch {
    return false;
  }
}

/**
 * Default relays for publishing
 */
const DEFAULT_PUBLISH_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nos.lol'
];

/**
 * Publish an event to Nostr relays
 * @param privateKeyHex - Hex-encoded private key for signing
 * @param content - Event content
 * @param kind - Event kind (default: 1 for text note)
 * @param tags - Event tags
 * @param relays - Optional custom relays to publish to
 * @returns The published event or null if failed
 */
export async function publishEvent(
  privateKeyHex: string,
  content: string,
  kind: number = 1,
  tags: string[][] = [],
  relays?: string[]
): Promise<Event | null> {
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : DEFAULT_PUBLISH_RELAYS;
  
  try {
    // Create and sign the event
    const signedEvent = createSignedEvent(privateKeyHex, content, kind, tags);
    
    // Publish to relays
    await Promise.all(pool.publish(relayList, signedEvent));
    
    pool.close(relayList);
    return signedEvent;
  } catch (error) {
    console.error('Error publishing event:', error);
    pool.close(relayList);
    return null;
  }
}

/**
 * Publish a reply to an event (kind 1 with 'e' and 'p' tags)
 * @param privateKeyHex - Hex-encoded private key
 * @param content - Reply content
 * @param targetEventId - Event ID being replied to
 * @param targetPubkey - Public key of the author being replied to
 * @param relays - Optional custom relays
 * @returns The published event or null if failed
 */
export async function publishReply(
  privateKeyHex: string,
  content: string,
  targetEventId: string,
  targetPubkey: string,
  relays?: string[]
): Promise<Event | null> {
  // Tags: ['e', event_id, recommended_relay_url, 'marker']
  // Using 'reply' marker for top-level replies
  const tags: string[][] = [
    ['e', targetEventId, '', 'reply'],
    ['p', targetPubkey]
  ];
  
  return publishEvent(privateKeyHex, content, 1, tags, relays);
}

/**
 * Publish a like reaction (kind 7)
 * @param privateKeyHex - Hex-encoded private key
 * @param targetEventId - Event ID being liked
 * @param targetPubkey - Public key of the author
 * @param relays - Optional custom relays
 * @returns The published event or null if failed
 */
export async function publishLike(
  privateKeyHex: string,
  targetEventId: string,
  targetPubkey: string,
  relays?: string[]
): Promise<Event | null> {
  // Kind 7 is for reactions, content is typically '+' or an emoji
  const tags: string[][] = [
    ['e', targetEventId],
    ['p', targetPubkey]
  ];
  
  return publishEvent(privateKeyHex, '+', 7, tags, relays);
}

/**
 * Publish a bookmark/save (kind 30001 for generic bookmark list)
 * This creates a parameterized replaceable event for the user's bookmarks
 * @param privateKeyHex - Hex-encoded private key
 * @param targetEventId - Event ID being saved
 * @param existingBookmarks - Existing bookmarked event IDs to include
 * @param relays - Optional custom relays
 * @returns The published event or null if failed
 */
export async function publishBookmark(
  privateKeyHex: string,
  targetEventId: string,
  existingBookmarks: string[] = [],
  relays?: string[]
): Promise<Event | null> {
  // Kind 30001 is for generic bookmark lists (parameterized replaceable)
  // Tags include all bookmarked event IDs
  const tags: string[][] = [
    ['d', 'bookmarks'], // identifier for the bookmark list
    ...existingBookmarks.map(id => ['e', id]),
    ['e', targetEventId]
  ];
  
  return publishEvent(privateKeyHex, '', 30001, tags, relays);
}

/**
 * Fetch replies for an event
 * @param eventId - The event ID to fetch replies for
 * @param relays - Optional custom relays
 * @returns Array of reply events
 */
export async function fetchReplies(eventId: string, relays?: string[]): Promise<Event[]> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  try {
    const replyEvents = await pool.querySync(relayList, {
      kinds: [1],
      '#e': [eventId]
    });
    
    pool.close(relayList);
    
    // Sort by created_at descending (newest first)
    return replyEvents.sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    console.error('Error fetching replies:', error);
    pool.close(relayList);
    return [];
  }
}

/**
 * Fetch user's own likes for a specific event from the network
 * @param eventId - The event ID to check likes for
 * @param userPubkey - The user's public key
 * @param relays - Optional custom relays
 * @returns True if the user has liked this event on the network
 */
export async function fetchUserLikedEvent(
  eventId: string, 
  userPubkey: string, 
  relays?: string[]
): Promise<boolean> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  try {
    // Fetch kind 7 reactions by this user for this event
    const reactionEvents = await pool.querySync(relayList, {
      kinds: [7],
      authors: [userPubkey],
      '#e': [eventId]
    });
    
    pool.close(relayList);
    
    // Check if any reaction is a like
    return reactionEvents.some(event => {
      const content = event.content.toLowerCase();
      return content === '+' || content === '' || content.includes('❤️') || content.includes('👍');
    });
  } catch (error) {
    console.error('Error fetching user likes:', error);
    pool.close(relayList);
    return false;
  }
}

/**
 * Fetch user's own replies for a specific event from the network
 * @param eventId - The event ID to check replies for
 * @param userPubkey - The user's public key
 * @param relays - Optional custom relays
 * @returns Array of user's reply events
 */
export async function fetchUserReplies(
  eventId: string, 
  userPubkey: string, 
  relays?: string[]
): Promise<Event[]> {
  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol'
  ];
  
  const pool = new SimplePool();
  const relayList = relays && relays.length > 0 ? relays : defaultRelays;
  
  try {
    const replyEvents = await pool.querySync(relayList, {
      kinds: [1],
      authors: [userPubkey],
      '#e': [eventId]
    });
    
    pool.close(relayList);
    
    // Sort by created_at descending (newest first)
    return replyEvents.sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    console.error('Error fetching user replies:', error);
    pool.close(relayList);
    return [];
  }
}
