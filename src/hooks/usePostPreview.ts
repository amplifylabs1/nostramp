import { useState, useEffect, useCallback } from 'react';
import type { Event } from 'nostr-tools';
import {
  decodeEventId,
  fetchEvent,
  fetchAuthorProfile,
  fetchReactions,
  fetchReplies as fetchRepliesFromNostr,
  fetchUserLikedEvent,
  fetchUserReplies,
  parseContent,
  publishReply,
  publishLike,
  type ProfileData,
  type ReactionCounts
} from '../nostr';
import {
  getUserActivity,
  recordLike,
  removeLike,
  recordSave,
  removeSave,
  recordReply,
  hasLikedEvent,
  hasSavedEvent,
  getDefaultActivity,
  getIdentityState,
  type UserActivity
} from '../storage.identity';

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
  replies: Event[];
  userActivity: UserActivity;
  isLikedByUser: boolean;
  userReplies: Event[];  // User's own replies from the network
}

interface UsePostPreviewReturn extends PostPreviewData {
  refetch: () => void;
  refreshReplies: () => Promise<void>;
  refreshUserActivity: () => void;
  postReply: (privateKey: string, content: string) => Promise<Event | null>;
  toggleLike: (privateKey: string) => Promise<Event | null>;
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
    isVerified: false,
    replies: [],
    userActivity: getDefaultActivity(),
    isLikedByUser: false,
    userReplies: []
  });

  const refreshUserActivity = useCallback(() => {
    const activity = getUserActivity();
    const eventHexId = data.event?.id;
    setData(prev => ({
      ...prev,
      userActivity: activity,
      isLikedByUser: eventHexId ? hasLikedEvent(eventHexId) : false,
      isSavedByUser: eventHexId ? hasSavedEvent(eventHexId) : false
    }));
  }, [data.event?.id]);

  const refreshReplies = useCallback(async () => {
    if (!data.event) return;
    
    try {
      const replies = await fetchRepliesFromNostr(data.event.id);
      setData(prev => ({ ...prev, replies }));
    } catch (error) {
      console.error('Error refreshing replies:', error);
    }
  }, [data.event]);

  const postReply = useCallback(async (privateKey: string, content: string): Promise<Event | null> => {
    if (!data.event) return null;
    
    try {
      const replyEvent = await publishReply(
        privateKey,
        content,
        data.event.id,
        data.event.pubkey
      );
      
      if (replyEvent) {
        // Record the reply in user activity
        recordReply(data.event.id);
        
        // Add the new reply to both the general replies and user's replies
        setData(prev => ({
          ...prev,
          replies: [replyEvent, ...prev.replies],
          userReplies: [replyEvent, ...prev.userReplies],
          userActivity: getUserActivity()
        }));
      }
      
      return replyEvent;
    } catch (error) {
      console.error('Error posting reply:', error);
      return null;
    }
  }, [data.event]);

  const toggleLike = useCallback(async (privateKey: string): Promise<Event | null> => {
    if (!data.event) return null;
    
    try {
      const wasLiked = hasLikedEvent(data.event.id);
      
      if (wasLiked) {
        // Remove like locally (we don't delete from network, just local state)
        removeLike(data.event.id);
        setData(prev => ({
          ...prev,
          isLikedByUser: false,
          reactions: {
            ...prev.reactions,
            likes: Math.max(0, prev.reactions.likes - 1)
          },
          userActivity: getUserActivity()
        }));
        return null;
      } else {
        // Publish like to network
        const likeEvent = await publishLike(privateKey, data.event.id, data.event.pubkey);
        
        if (likeEvent) {
          recordLike(data.event.id);
          setData(prev => ({
            ...prev,
            isLikedByUser: true,
            reactions: {
              ...prev.reactions,
              likes: prev.reactions.likes + 1
            },
            userActivity: getUserActivity()
          }));
        }
        
        return likeEvent;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return null;
    }
  }, [data.event]);

  const toggleSave = useCallback(() => {
    if (!data.event) return;
    
    const wasSaved = hasSavedEvent(data.event.id);
    
    if (wasSaved) {
      removeSave(data.event.id);
      setData(prev => ({
        ...prev,
        isSavedByUser: false,
        userActivity: getUserActivity()
      }));
    } else {
      recordSave(data.event.id);
      setData(prev => ({
        ...prev,
        isSavedByUser: true,
        userActivity: getUserActivity()
      }));
    }
  }, [data.event]);

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

      // Fetch profile, reactions, and replies in parallel
      const [profile, reactions, replies] = await Promise.all([
        fetchAuthorProfile(event.pubkey, decoded.relays),
        fetchReactions(decoded.id, decoded.relays),
        fetchRepliesFromNostr(decoded.id, decoded.relays)
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

      // Get user activity status
      const isSavedByUser = hasSavedEvent(event.id);
      
      // Check for user's identity to fetch network interactions
      const identityState = getIdentityState();
      let isLikedByUser = hasLikedEvent(event.id); // Start with local state
      let userReplies: Event[] = [];
      
      // If user has an unlocked identity, check network for their likes and replies
      if (identityState.publicKey && !identityState.isLocked) {
        try {
          // Check if user has liked this event on the network
          const networkLiked = await fetchUserLikedEvent(decoded.id, identityState.publicKey, decoded.relays);
          if (networkLiked && !isLikedByUser) {
            // Sync local state with network
            recordLike(event.id);
            isLikedByUser = true;
          }
          
          // Fetch user's own replies from the network
          userReplies = await fetchUserReplies(decoded.id, identityState.publicKey, decoded.relays);
        } catch (error) {
          console.error('Error fetching user interactions:', error);
        }
      }

      setData({
        event,
        profile,
        reactions,
        parsedContent,
        isLoading: false,
        error: null,
        isVerified,
        replies,
        userActivity: getUserActivity(), // Refresh after potential sync
        isLikedByUser,
        userReplies
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
    refetch: fetchData,
    refreshReplies,
    refreshUserActivity,
    postReply,
    toggleLike
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
