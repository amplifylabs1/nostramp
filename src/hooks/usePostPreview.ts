import { useState, useEffect } from 'react';
import type { Event } from 'nostr-tools';
import {
  decodeEventId,
  fetchEvent,
  fetchAuthorProfile,
  fetchReactions,
  parseContent,
  type ProfileData,
  type ReactionCounts
} from '../nostr';

interface PostPreviewData {
  event: Event | null;
  profile: ProfileData | null;
  reactions: ReactionCounts;
  parsedContent: {
    text: string;
    images: string[];
    videos: string[];
  };
  isLoading: boolean;
  error: string | null;
  isVerified: boolean;
}

interface UsePostPreviewReturn extends PostPreviewData {
  refetch: () => void;
}

/**
 * Custom hook for fetching and managing post preview data
 * Includes event data, author profile, reactions, and verification
 * @param eventId - The note1 or nevent1 identifier
 * @returns Post preview data and refetch function
 */
export function usePostPreview(eventId: string | undefined): UsePostPreviewReturn {
  const [data, setData] = useState<PostPreviewData>({
    event: null,
    profile: null,
    reactions: { likes: 0, reposts: 0, zaps: 0, replies: 0 },
    parsedContent: { text: '', images: [], videos: [] },
    isLoading: true,
    error: null,
    isVerified: false
  });

  const fetchData = async () => {
    if (!eventId) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'No event ID provided'
      }));
      return;
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Decode event ID
      const decoded = decodeEventId(eventId);
      
      if (!decoded) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Invalid event ID'
        }));
        return;
      }

      // Fetch event
      const event = await fetchEvent(decoded.id, decoded.relays);
      
      if (!event) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Event not found. It may not exist on the relays.'
        }));
        return;
      }

      // Parse content
      const parsedContent = parseContent(event.content);

      // Fetch profile and reactions in parallel
      const [profile, reactions] = await Promise.all([
        fetchAuthorProfile(event.pubkey, decoded.relays),
        fetchReactions(decoded.id, decoded.relays)
      ]);

      // Verify NIP-05 if profile has it
      let isVerified = false;
      if (profile?.nip05) {
        try {
          const { verifyNIP05 } = await import('../nostr');
          isVerified = await verifyNIP05(profile.nip05, event.pubkey);
        } catch {
          isVerified = false;
        }
      }

      setData({
        event,
        profile,
        reactions,
        parsedContent,
        isLoading: false,
        error: null,
        isVerified
      });
    } catch (err) {
      console.error('Error loading post preview:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load event. Please try again.'
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  return {
    ...data,
    refetch: fetchData
  };
}

/**
 * Get display name for the author
 * Falls back to truncated npub if no profile name available
 */
export function getDisplayName(profile: ProfileData | null, pubkey: string): string {
  if (profile?.display_name) return profile.display_name;
  if (profile?.name) return profile.name;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}

/**
 * Format reaction counts for display
 */
export function formatReactionCount(count: number): string {
  if (count === 0) return '';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}