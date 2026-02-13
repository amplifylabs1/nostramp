/**
 * Nostr utilities using nostr-tools
 */

import { generateSecretKey, getPublicKey, finalizeEvent, nip19, type UnsignedEvent, type Event } from 'nostr-tools';

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
