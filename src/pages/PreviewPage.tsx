import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Heart, 
  Repeat2, 
  MessageCircle, 
  Zap, 
  Bookmark, 
  Share2,
  BadgeCheck 
} from 'lucide-react';
import { 
  getEphemeralKey, 
  setEphemeralKey, 
  incrementVisitCount,
  hasClaimed,
  markAsClaimed
} from '../storage';
import { 
  generateEphemeralKeypair, 
  exportKeypair,
  getPublicKeyFromPrivate,
  formatRelativeTime,
  type ExportedKeypair
} from '../nostr';
import { usePostPreview, getDisplayName, formatReactionCount } from '../hooks/usePostPreview';

function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [currentPrivateKey, setCurrentPrivateKey] = useState<string | null>(null);
  const [currentPublicKey, setCurrentPublicKey] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  
  // Interactive states
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
   
  // Use the custom hook for post preview
  const { 
    event, 
    profile, 
    reactions, 
    parsedContent, 
    isLoading, 
    error, 
    isVerified 
  } = usePostPreview(id);

  useEffect(() => {
    // Only generate key on preview page visits
    const existingKey = getEphemeralKey();
    
    if (existingKey) {
      setCurrentPrivateKey(existingKey);
      setCurrentPublicKey(getPublicKeyFromPrivate(existingKey));
    } else {
      // Generate new keypair on first visit to preview page
      const keypair = generateEphemeralKeypair();
      setCurrentPrivateKey(keypair.privateKey);
      setCurrentPublicKey(keypair.publicKey);
      setEphemeralKey(keypair.privateKey);
    }
    
    // Track visits for identity claim prompt
    const count = incrementVisitCount();
    setVisitCount(count);
    setClaimed(hasClaimed());
  }, []);

  const handleClaimIdentity = () => {
    setShowClaimModal(true);
  };

  const handleMarkAsClaimed = () => {
    markAsClaimed();
    setClaimed(true);
    setShowClaimModal(false);
  };

  const downloadKeys = (format: 'txt' | 'json', exported: ExportedKeypair) => {
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'txt') {
      content = `Nostr Identity Keys
====================

Public Key (npub) - Share this:
${exported.publicKey.npub}

Private Key (nsec) - KEEP SECRET:
${exported.privateKey.nsec}

Hex Keys (for advanced users):
Public:  ${exported.publicKey.hex}
Private: ${exported.privateKey.hex}

Generated: ${new Date().toISOString()}
`;
      filename = 'nostr-keys.txt';
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify({
        publicKey: exported.publicKey,
        privateKey: exported.privateKey,
        generated: new Date().toISOString(),
        warning: 'Keep your private key (nsec) secret! Never share it.'
      }, null, 2);
      filename = 'nostr-keys.json';
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderClaimModal = () => {
    if (!showClaimModal || !currentPrivateKey || !currentPublicKey) {
      return null;
    }
    
    const exported = exportKeypair(currentPrivateKey, currentPublicKey);
    
    return (
      <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Claim Your Identity</h2>
          
          <div className="warning-box">
            <strong>Keep your private key safe!</strong>
            <p>Never share your private key (nsec) with anyone.</p>
          </div>
          
          <div className="key-section">
            <label>Public Key (npub)</label>
            <div className="key-value">{exported.publicKey.npub}</div>
          </div>
          
          <div className="key-section">
            <label>Private Key (nsec)</label>
            <div className="key-value private">{exported.privateKey.nsec}</div>
          </div>
          
          <div className="button-group">
            <button onClick={() => downloadKeys('txt', exported)} className="btn-outline">
              Download .txt
            </button>
            <button onClick={() => downloadKeys('json', exported)} className="btn-outline">
              Download .json
            </button>
          </div>
          
          <div className="client-section">
            <label>Use your identity in popular clients:</label>
            <div className="client-links">
              <a href="https://damus.io/" target="_blank" rel="noopener noreferrer">
                Damus
              </a>
              <a href="https://coracle.social/" target="_blank" rel="noopener noreferrer">
                Coracle
              </a>
              <a href="https://iris.to/" target="_blank" rel="noopener noreferrer">
                Iris
              </a>
            </div>
          </div>
          
          <div className="button-group">
            <button onClick={handleMarkAsClaimed} className="btn-primary">
              I've Saved My Keys
            </button>
            <button onClick={() => setShowClaimModal(false)} className="btn-text">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="preview-card loading-card">
      <div className="loading-spinner"></div>
      <p>Loading event...</p>
    </div>
  );

  const renderError = () => (
    <div className="preview-card error-card">
      <div className="error-icon">
        <AlertTriangle size={48} />
      </div>
      <h2>Event Not Found</h2>
      <p>{error}</p>
      <a href="/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Create a Link
      </a>
    </div>
  );

  const renderEvent = () => {
    if (!event) return null;

    const displayName = getDisplayName(profile, event.pubkey);
    const timeAgo = formatRelativeTime(event.created_at);

    return (
      <div className="preview-card event-card">
        {/* Author Header with Profile */}
        <div className="event-header">
          <div className="author-avatar">
            {profile?.picture ? (
              <img src={profile.picture} alt={displayName} />
            ) : (
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill={`hsl(${parseInt(event.pubkey.slice(0, 8), 16) % 360}, 70%, 50%)`} />
                <text x="50" y="65" textAnchor="middle" fontSize="45" fill="white">
                  {displayName.charAt(0).toUpperCase()}
                </text>
              </svg>
            )}
          </div>
          <div className="author-info">
            <div className="author-name-row">
              <span className="author-name">{displayName}</span>
              {isVerified && (
                <span className="verification-badge" title={`Verified: ${profile?.nip05}`}>
                  <BadgeCheck size={14} />
                </span>
              )}
            </div>
            {profile?.nip05 && (
              <div className="author-nip05">{profile.nip05}</div>
            )}
            <div className="event-time">{timeAgo}</div>
          </div>
        </div>

        {/* Content */}
        <div className="event-content">
          {parsedContent.text && (
            <div className={`event-text ${parsedContent.text.length > 500 ? 'event-text-long' : ''}`}>
              {parsedContent.text.split('\n').map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>
          )}

          {/* Images */}
          {parsedContent.images.length > 0 && (
            <div className={`media-grid media-grid-${Math.min(parsedContent.images.length, 4)}`}>
              {parsedContent.images.map((url, index) => (
                <div key={index} className="media-item media-image">
                  <img src={url} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {parsedContent.videos.length > 0 && (
            <div className="media-videos">
              {parsedContent.videos.map((url, index) => (
                <div key={index} className="media-item media-video">
                  <video controls preload="metadata">
                    <source src={url} />
                  </video>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions Bar */}
        <div className="reactions-bar">
          <div className="reaction-item">
            <MessageCircle className="reaction-icon" size={18} />
            <span className="reaction-count">{formatReactionCount(reactions.replies)}</span>
          </div>
          {reactions.reposts > 0 && (
            <div className="reaction-item">
              <Repeat2 className="reaction-icon" size={18} />
              <span className="reaction-count">{formatReactionCount(reactions.reposts)}</span>
            </div>
          )}
          {reactions.zaps > 0 && (
            <div className="reaction-item">
              <Zap className="reaction-icon" size={18} />
              <span className="reaction-count">{formatReactionCount(reactions.zaps)}</span>
            </div>
          )}
          <button 
            className={`reaction-item clickable like-btn ${isLiked ? 'active' : ''}`}
            onClick={() => setIsLiked(!isLiked)}
            title="Click to like"
          >
            <Heart className="reaction-icon" size={18} />
            <span className="reaction-count">{formatReactionCount(reactions.likes + (isLiked ? 1 : 0))}</span>
          </button>
          <button 
            className={`reaction-item clickable save-btn ${isBookmarked ? 'active' : ''}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
            title="Click to bookmark"
          >
            <Bookmark className="reaction-icon" size={18} />
            <span className="reaction-count">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Comment Input */}
        <div className="comment-input-section">
          <div className="comment-input-wrapper">
            <input
              type="text"
              placeholder={`Reply to ${displayName}...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
            />
            <button 
              className="comment-submit"
              disabled={!commentText.trim()}
              onClick={() => {
                // Handle comment submission
                setCommentText('');
              }}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="header">
        <a href="/" className="logo">
          <svg className="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
        {currentPrivateKey && !claimed && visitCount >= 2 && (
          <button onClick={handleClaimIdentity} className="btn-claim">
            Claim Identity
          </button>
        )}
      </header>
      
      <main className="main-content preview-content">
        {isLoading && renderLoading()}
        {!isLoading && error && renderError()}
        {!isLoading && !error && renderEvent()}
      </main>
      
      <footer className="footer">
        <span>Powered by Nostr</span>
      </footer>
      
      {renderClaimModal()}
    </div>
  );
}

export default PreviewPage;
