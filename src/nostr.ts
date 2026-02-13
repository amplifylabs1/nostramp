/**
 * Nostr utilities using nostr-tools
 */

import { generateSecretKey, getPublicKey, finalizeEvent, nip19, SimplePool, type UnsignedEvent, type Event } from 'nostr-tools';

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
    'wss://nos.lol',
    'wss://relay.nostr.band'
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
    'wss://nos.lol',
    'wss://relay.nostr.band'
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
    'wss://nos.lol',
    'wss://relay.nostr.band'
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
