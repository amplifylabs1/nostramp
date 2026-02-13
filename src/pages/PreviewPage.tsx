import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  type ExportedKeypair
} from '../nostr';

function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [currentPrivateKey, setCurrentPrivateKey] = useState<string | null>(null);
  const [currentPublicKey, setCurrentPublicKey] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [claimed, setClaimed] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);

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
        <div className="preview-card">
          <h1>Post Preview</h1>
          <p className="preview-id">ID: {id}</p>
          
          <div className="post-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">📄</span>
              <p>Nostr post content will be displayed here</p>
              <span className="placeholder-note">
                (This is a preview page where ephemeral keys are generated)
              </span>
            </div>
          </div>
          
          <div className="post-actions">
            <button className="action-btn">
              <span>👍</span> Like
            </button>
            <button className="action-btn">
              <span>💬</span> Comment
            </button>
            <button className="action-btn">
              <span>🔖</span> Save
            </button>
            <button className="action-btn">
              <span>↗️</span> Share
            </button>
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <span>Powered by Nostr</span>
        <span className="divider">•</span>
        <a href="" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
      
      {renderClaimModal()}
    </div>
  );
}

export default PreviewPage;
