import { useState } from 'react';

function HomePage() {
  const [nostrLink, setNostrLink] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCreateLink = async () => {
    if (!nostrLink.trim()) {
      setStatusMessage('Please enter a Nostr client link');
      setStatusType('error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const linkId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const shareableLink = `${window.location.origin}/p/${linkId}`;
      
      setStatusMessage(shareableLink);
      setStatusType('success');
      setNostrLink('');
    } catch (error) {
      console.error('Error creating link:', error);
      setStatusMessage('Error creating link. Please try again.');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage('Copied to clipboard!');
      setStatusType('success');
      setTimeout(() => {
        setStatusMessage('');
        setStatusType('');
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
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
        </div>
      </header>
      
      <main className="main-content">
        <div className="hero-section">
          <h1 className="title">
            Share <span className="gradient-text">Nostr</span> Posts
          </h1>
          <p className="subtitle">
            Create instant preview links. Anyone can comment without an account—
            keys are generated in their browser, exportable anytime.
          </p>
        </div>
        
        <div className="input-section input-section-prominent">
          <div className="input-wrapper">
            <input 
              type="text" 
              placeholder="Paste a Nostr link..."
              value={nostrLink}
              onChange={(e) => setNostrLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLink()}
            />
            <button 
              onClick={handleCreateLink} 
              className="btn-create"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
          
          {statusMessage && (
            <div className={`status-message ${statusType}`}>
              {statusType === 'success' ? (
                <>
                  <span className="status-icon">✓</span>
                  <span 
                    className="status-link" 
                    onClick={() => copyToClipboard(statusMessage)}
                    title="Click to copy"
                  >
                    {statusMessage}
                  </span>
                </>
              ) : (
                <>
                  <span className="status-icon">✕</span>
                  <span>{statusMessage}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="value-props value-props-compact">
          <div className="value-prop value-prop-compact">
            <div className="value-icon">🚀</div>
            <h3>No Setup</h3>
            <p>Zero friction. No apps, no signup, just paste and go.</p>
          </div>
          <div className="value-prop value-prop-compact">
            <div className="value-icon">🔐</div>
            <h3>Own Your Keys</h3>
            <p>Keys live in your browser. Export to any client when ready.</p>
          </div>
          <div className="value-prop value-prop-compact">
            <div className="value-icon">🎯</div>
            <h3>Works Everywhere</h3>
            <p>Clean preview links that open in any browser instantly.</p>
          </div>
        </div>
        
        <div className="trust-section">
          <div className="trust-item">
            <span className="trust-icon">🛡️</span>
            <span>Private</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⚡</span>
            <span>Fast</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🔓</span>
            <span>Open Source</span>
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <span>Onboarding made simple</span>
        <span className="divider">•</span>
        <a href="" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default HomePage;
