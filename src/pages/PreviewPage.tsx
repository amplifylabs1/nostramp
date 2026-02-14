import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Heart, 
  Repeat2, 
  MessageCircle, 
  Zap, 
  BadgeCheck,
  User
} from 'lucide-react';
import { 
  getIdentityState,
  getProfileKey,
  createProfile,
  type IdentityState
} from '../storage.identity';
import { formatRelativeTime, generateEphemeralKeypair } from '../nostr';
import { usePostPreview, getDisplayName, formatReactionCount } from '../hooks/usePostPreview';

/**
 * Get or create profile keys - uses the same storage as profile
 */
function getOrCreateProfileKeys(): { privateKey: string; publicKey: string } {
  // Check if user already has a profile
  const profileKey = getProfileKey();
  if (profileKey) {
    return profileKey;
  }
  
  // Create a new profile (ephemeral keypair)
  const result = createProfile();
  if (result.privateKey) {
    return { privateKey: result.privateKey, publicKey: result.publicKey };
  }
  
  // Fallback - generate without storing
  return generateEphemeralKeypair();
}

function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [identityState, setIdentityState] = useState<IdentityState>({
    publicKey: null,
    isLocked: true,
    hasIdentity: false
  });
  const [commentText, setCommentText] = useState<string>('');
  const [isPosting, setIsPosting] = useState<boolean>(false);
  
  // Use the custom hook for post preview
  const { 
    event, 
    profile, 
    reactions, 
    parsedContent, 
    isLoading, 
    error, 
    isVerified,
    userActivity,
    isLikedByUser,
    userReplies,
    postReply,
    toggleLike
  } = usePostPreview(id);

  useEffect(() => {
    // Check identity state on mount
    const state = getIdentityState();
    setIdentityState(state);
  }, []);

  // Ensure identity is available before actions - creates profile keys if needed
  const ensureIdentity = useCallback((): { privateKey: string; publicKey: string } => {
    return getOrCreateProfileKeys();
  }, []);

  const handlePostReply = async () => {
    if (!commentText.trim() || isPosting) return;
    
    const keys = ensureIdentity();
    
    setIsPosting(true);
    try {
      const result = await postReply(keys.privateKey, commentText.trim());
      if (result) {
        setCommentText('');
        // Update identity state after posting (profile may have been created)
        const state = getIdentityState();
        setIdentityState(state);
      }
    } catch (err) {
      console.error('Error posting reply:', err);
    }
    setIsPosting(false);
  };

  const handleToggleLike = async () => {
    const keys = ensureIdentity();
    await toggleLike(keys.privateKey);
    // Update identity state after liking (profile may have been created)
    const state = getIdentityState();
    setIdentityState(state);
  };

  const renderLoading = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-8 backdrop-blur-sm w-full max-w-[700px] text-center py-16 px-8">
      <div className="w-[50px] h-[50px] border-[3px] border-border border-t-nostr-purple rounded-full animate-spin mx-auto mb-6"></div>
      <p className="text-text-muted">Loading event...</p>
    </div>
  );

  const renderError = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-8 backdrop-blur-sm w-full max-w-[700px] text-center py-16 px-8">
      <div className="text-nostr-orange mb-4 flex justify-center">
        <AlertTriangle size={48} />
      </div>
      <h2 className="text-text-primary mb-2">Event Not Found</h2>
      <p className="text-text-muted mb-6">{error}</p>
      <a href="/" className="inline-block px-6 py-3 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-lg text-white text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(168,85,247,0.4)]">
        Create a Link
      </a>
    </div>
  );

  const renderEvent = () => {
    if (!event) return null;

    const displayName = getDisplayName(profile, event.pubkey);
    const timeAgo = formatRelativeTime(event.created_at);

    return (
      <div className="bg-bg-card border border-border rounded-3xl p-8 backdrop-blur-sm w-full max-w-[700px]">
        {/* Author Header with Profile */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-bg-tertiary">
            {profile?.picture ? (
              <img src={profile.picture} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="100" height="100" fill={`hsl(${parseInt(event.pubkey.slice(0, 8), 16) % 360}, 70%, 50%)`} />
                <text x="50" y="65" textAnchor="middle" fontSize="45" fill="white">
                  {displayName.charAt(0).toUpperCase()}
                </text>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary text-base">{displayName}</span>
              {isVerified && (
                <span className="inline-flex items-center justify-center text-nostr-purple cursor-help" title={`Verified: ${profile?.nip05}`}>
                  <BadgeCheck size={14} />
                </span>
              )}
            </div>
            {profile?.nip05 && (
              <div className="text-text-muted text-sm mb-1">{profile.nip05}</div>
            )}
            <div className="text-text-muted text-sm">{timeAgo}</div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          {parsedContent.text && (
            <div className={`text-lg leading-relaxed text-text-primary mb-6 whitespace-pre-wrap break-words ${parsedContent.text.length > 500 ? 'text-base leading-relaxed' : ''}`}>
              {parsedContent.text.split('\n').map((line, i) => (
                <p key={i} className="mb-3 last:mb-0">{line || <br />}</p>
              ))}
            </div>
          )}

          {/* Images */}
          {parsedContent.images.length > 0 && (
            <div className={`grid gap-2 mb-6 rounded-2xl overflow-hidden ${
              parsedContent.images.length === 1 ? 'grid-cols-1' :
              parsedContent.images.length === 2 ? 'grid-cols-2' :
              parsedContent.images.length === 3 ? 'grid-cols-2 grid-rows-2' :
              'grid-cols-2 grid-rows-2'
            }`}>
              {parsedContent.images.slice(0, 4).map((url, index) => (
                <div 
                  key={index} 
                  className={`relative overflow-hidden bg-bg-tertiary ${
                    parsedContent.images!.length === 3 && index === 0 ? 'col-span-2' : ''
                  }`}
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover block" />
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {parsedContent.videos.length > 0 && (
            <div className="flex flex-col gap-4 mb-6">
              {parsedContent.videos.map((url, index) => (
                <div key={index} className="rounded-2xl aspect-video">
                  <video controls preload="metadata" className="rounded-2xl w-full h-full">
                    <source src={url} />
                  </video>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions Bar */}
        <div className="flex gap-5 py-4 mb-4 border-b border-border">
          <div className="flex items-center gap-1.5 text-text-secondary text-sm">
            <MessageCircle className="text-text-secondary" size={18} />
            <span className="font-medium">{formatReactionCount(reactions.replies)}</span>
          </div>
          {reactions.reposts > 0 && (
            <div className="flex items-center gap-1.5 text-text-secondary text-sm">
              <Repeat2 className="text-text-secondary" size={18} />
              <span className="font-medium">{formatReactionCount(reactions.reposts)}</span>
            </div>
          )}
          {reactions.zaps > 0 && (
            <div className="flex items-center gap-1.5 text-text-secondary text-sm">
              <Zap className="text-text-secondary" size={18} />
              <span className="font-medium">{formatReactionCount(reactions.zaps)}</span>
            </div>
          )}
          <button 
            className={`flex items-center gap-1.5 text-sm bg-none border-none cursor-pointer px-2 py-1 rounded-lg transition-all duration-200 hover:bg-bg-tertiary ${
              isLikedByUser ? 'text-pink-500' : 'text-text-secondary hover:text-pink-500'
            }`}
            onClick={handleToggleLike}
            title={isLikedByUser ? 'Unlike' : 'Like'}
          >
            <Heart className={`text-text-secondary ${isLikedByUser ? 'text-pink-500 fill-pink-500' : ''}`} size={18} />
            <span className="font-medium">{formatReactionCount(reactions.likes + (isLikedByUser ? 1 : 0))}</span>
          </button>
        </div>

        {/* Comment Input - Always Visible */}
        <div className="my-4 p-4 bg-bg-tertiary rounded-2xl">
          <div className="flex gap-3 items-center max-sm:flex-col">
            <input
              type="text"
              placeholder={`Reply to ${displayName}...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostReply()}
              className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-base outline-none transition-colors duration-200 focus:border-nostr-purple placeholder:text-text-muted max-sm:w-full"
              disabled={isPosting}
            />
            <button 
              className="px-5 py-3 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-xl text-white text-sm font-semibold cursor-pointer transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed max-sm:w-full"
              disabled={!commentText.trim() || isPosting}
              onClick={handlePostReply}
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        {/* User's Own Replies */}
        {userReplies.length > 0 && (
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="text-text-secondary text-sm font-medium mb-4">Your Replies</h3>
            <div className="space-y-3">
              {userReplies.map((reply) => (
                <div key={reply.id} className="p-4 bg-bg-tertiary rounded-xl border border-border">
                  <p className="text-text-primary text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                  <p className="text-text-muted text-xs mt-2">{formatRelativeTime(reply.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="flex justify-between items-center px-8 py-6 relative z-10">
        <a href="/" className="flex items-center gap-2 text-2xl font-bold text-text-primary no-underline">
          <svg className="w-9 h-9 block" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#A855F7'}} />
                <stop offset="100%" style={{stopColor: '#F97316'}} />
              </linearGradient>
            </defs>
            <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#logoGradient)" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="white" strokeWidth="6" />
            <circle cx="50" cy="50" r="10" fill="white" />
          </svg>
          <span>nostramp</span>
        </a>
        
        {/* Identity Status & Link */}
        <div className="flex items-center gap-4">
          {/* Activity Summary */}
          {identityState.hasIdentity && (
            <div className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary rounded-full text-sm">
              <span className="flex items-center gap-1 text-text-muted" title="Replies">
                <MessageCircle size={14} /> {userActivity.replies}
              </span>
              <span className="flex items-center gap-1 text-text-muted" title="Likes">
                <Heart size={14} /> {userActivity.likes}
              </span>
            </div>
          )}
          
          {/* Profile Link */}
          <Link to="/identity" className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-border rounded-xl text-text-secondary text-sm font-medium no-underline cursor-pointer transition-all duration-200 hover:border-nostr-purple hover:text-nostr-purple">
            {identityState.hasIdentity ? (
              <>
                <User size={16} />
                <span>Claim your profile</span>
              </>
            ) : (
              <>
                <User size={16} />
                <span>Set Up Profile</span>
              </>
            )}
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-start px-8 py-8 relative z-1 max-w-3xl mx-auto w-full pt-16">
        {isLoading && renderLoading()}
        {!isLoading && error && renderError()}
        {!isLoading && !error && renderEvent()}
      </main>
      
      <footer className="flex items-center justify-center gap-3 px-8 py-8 text-text-muted text-sm relative z-1">
        <span>Powered by Nostr</span>
      </footer>
    </div>
  );
}

export default PreviewPage;

