import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Download, 
  Lock, 
  Unlock,
  MessageCircle,
  Heart,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import {
  createEncryptedIdentity,
  unlockIdentity,
  getIdentityState,
  getSessionKey,
  clearSessionKey,
  getUserActivity,
  type UserActivity
} from '../storage.identity';
import { exportKeypair, type ExportedKeypair } from '../nostr';

type ViewMode = 'create' | 'unlock' | 'identity';

function IdentityPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('create');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Identity state
  const [, setPublicKey] = useState<string | null>(null);
  const [, setPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [exportedKeys, setExportedKeys] = useState<ExportedKeypair | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Activity
  const [activity] = useState<UserActivity>(getUserActivity());
  
  // Remember session
  const [rememberSession, setRememberSession] = useState(false);

  useEffect(() => {
    // Check current identity state
    const state = getIdentityState();
    
    if (state.hasIdentity && !state.isLocked) {
      // Already unlocked
      const session = getSessionKey();
      if (session) {
        setPublicKey(session.publicKey);
        setPrivateKey(session.privateKey);
        setExportedKeys(exportKeypair(session.privateKey, session.publicKey));
        setViewMode('identity');
      }
    } else if (state.hasIdentity && state.isLocked) {
      // Need to unlock
      setViewMode('unlock');
    } else {
      // No identity, need to create
      setViewMode('create');
    }
  }, []);

  const handleCreateIdentity = async () => {
    setError('');
    
    if (!password) {
      setError('Please enter a password');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await createEncryptedIdentity(password);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Auto-unlock after creation
        const unlockResult = await unlockIdentity(password, rememberSession);
        if (unlockResult.privateKey) {
          setPublicKey(unlockResult.publicKey);
          setPrivateKey(unlockResult.privateKey);
          setExportedKeys(exportKeypair(unlockResult.privateKey, unlockResult.publicKey));
          setViewMode('identity');
        }
      }
    } catch (err) {
      setError('Failed to create identity');
    }
    
    setIsLoading(false);
  };

  const handleUnlock = async () => {
    setError('');
    
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await unlockIdentity(password, rememberSession);
      
      if (result.error) {
        setError(result.error);
      } else {
        setPublicKey(result.publicKey);
        setPrivateKey(result.privateKey);
        setExportedKeys(exportKeypair(result.privateKey, result.publicKey));
        setViewMode('identity');
      }
    } catch (err) {
      setError('Failed to unlock identity');
    }
    
    setIsLoading(false);
  };

  const handleLock = () => {
    clearSessionKey();
    setPublicKey(null);
    setPrivateKey(null);
    setExportedKeys(null);
    setPassword('');
    setViewMode('unlock');
  };

  const copyToClipboard = async (text: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadKeys = (format: 'txt' | 'json') => {
    if (!exportedKeys) return;
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'txt') {
      content = `Nostr Identity Keys
====================

Public Key (npub) - Share this:
${exportedKeys.publicKey.npub}

Private Key (nsec) - KEEP SECRET:
${exportedKeys.privateKey.nsec}

Hex Keys (for advanced users):
Public:  ${exportedKeys.publicKey.hex}
Private: ${exportedKeys.privateKey.hex}

Generated: ${new Date().toISOString()}
`;
      filename = 'nostr-keys.txt';
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify({
        publicKey: exportedKeys.publicKey,
        privateKey: exportedKeys.privateKey,
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

  const renderCreateView = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-10 backdrop-blur-sm w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-nostr-purple to-nostr-orange rounded-2xl text-white">
          <Key size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Create Your Identity</h2>
        <p className="text-text-muted text-sm">Set up your Nostr identity to interact with posts</p>
      </div>
      
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-text-secondary">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password (min 8 characters)"
              className="w-full px-4 py-3.5 bg-bg-tertiary border border-border rounded-xl text-text-primary text-base outline-none transition-colors duration-200 focus:border-nostr-purple placeholder:text-text-muted"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-text-muted cursor-pointer p-1 hover:text-text-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">Confirm Password</label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className="w-full px-4 py-3.5 bg-bg-tertiary border border-border rounded-xl text-text-primary text-base outline-none transition-colors duration-200 focus:border-nostr-purple placeholder:text-text-muted"
          />
        </div>
        
        <div className="flex flex-row items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              className="w-4 h-4 accent-nostr-purple"
            />
            <span>Remember for this session</span>
          </label>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <button
          className="w-full px-6 py-3 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-lg text-white text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(168,85,247,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleCreateIdentity}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Identity'}
        </button>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border text-text-muted text-sm">
        <Shield size={16} />
        <span>Your keys are encrypted and stored locally in your browser</span>
      </div>
    </div>
  );

  const renderUnlockView = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-10 backdrop-blur-sm w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-nostr-purple to-nostr-orange rounded-2xl text-white">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Unlock Your Identity</h2>
        <p className="text-text-muted text-sm">Enter your password to access your identity</p>
      </div>
      
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="unlockPassword" className="text-sm font-medium text-text-secondary">Password</label>
          <div className="relative">
            <input
              id="unlockPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3.5 bg-bg-tertiary border border-border rounded-xl text-text-primary text-base outline-none transition-colors duration-200 focus:border-nostr-purple placeholder:text-text-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-text-muted cursor-pointer p-1 hover:text-text-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex flex-row items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              className="w-4 h-4 accent-nostr-purple"
            />
            <span>Remember for this session</span>
          </label>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <button
          className="w-full px-6 py-3 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-lg text-white text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(168,85,247,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleUnlock}
          disabled={isLoading}
        >
          {isLoading ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>
    </div>
  );

  const renderIdentityView = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-10 backdrop-blur-sm w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white">
          <Unlock size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Your Identity</h2>
        <p className="text-emerald-400 text-sm">Identity unlocked and ready to use</p>
      </div>
      
      {/* Activity Section */}
      <div className="mb-8 pb-8 border-b border-border">
        <h3 className="text-base font-semibold mb-4 text-text-primary">Your Activity</h3>
        <div className="flex gap-6 justify-center">
          <div className="flex flex-col items-center gap-1 px-6 py-4 bg-bg-tertiary rounded-xl min-w-[80px]">
            <MessageCircle size={20} className="text-text-muted" />
            <span className="text-2xl font-bold text-text-primary">{activity.replies}</span>
            <span className="text-xs text-text-muted">Replies</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-6 py-4 bg-bg-tertiary rounded-xl min-w-[80px]">
            <Heart size={20} className="text-text-muted" />
            <span className="text-2xl font-bold text-text-primary">{activity.likes}</span>
            <span className="text-xs text-text-muted">Likes</span>
          </div>
        </div>
      </div>
      
      {/* Keys Section */}
      {exportedKeys && (
        <div className="mb-8">
          <h3 className="text-base font-semibold mb-4 text-text-primary">Your Keys</h3>
          
          <div className="mb-4">
            <label className="block text-sm text-text-muted mb-2">Public Key (npub)</label>
            <div className="flex items-center gap-2 bg-bg-tertiary border border-border rounded-xl p-3">
              <code className="flex-1 font-mono text-xs break-all text-text-primary">{exportedKeys.publicKey.npub}</code>
              <button
                className="flex items-center justify-center w-8 h-8 bg-bg-card border border-border rounded-lg text-text-muted cursor-pointer transition-all duration-200 shrink-0 hover:border-nostr-purple hover:text-nostr-purple"
                onClick={() => copyToClipboard(exportedKeys.publicKey.npub, 'npub')}
              >
                {copiedKey === 'npub' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-text-muted mb-2">Private Key (nsec)</label>
            <div className="flex items-center gap-2 bg-bg-tertiary border border-border rounded-xl p-3">
              <code className={`flex-1 font-mono text-xs break-all text-text-primary ${showPrivateKey ? '' : 'blur-[4px] select-none'}`}>
                {showPrivateKey ? exportedKeys.privateKey.nsec : 'nsec1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'}
              </code>
              <button
                className="flex items-center justify-center w-8 h-8 bg-bg-card border border-border rounded-lg text-text-muted cursor-pointer transition-all duration-200 shrink-0 hover:border-nostr-purple hover:text-nostr-purple"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {showPrivateKey && (
                <button
                  className="flex items-center justify-center w-8 h-8 bg-bg-card border border-border rounded-lg text-text-muted cursor-pointer transition-all duration-200 shrink-0 hover:border-nostr-purple hover:text-nostr-purple"
                  onClick={() => copyToClipboard(exportedKeys.privateKey.nsec, 'nsec')}
                >
                  {copiedKey === 'nsec' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-3 bg-nostr-orange/10 border border-nostr-orange/30 rounded-xl mb-4">
            <AlertTriangle size={16} className="text-nostr-orange shrink-0" />
            <span className="text-text-secondary text-sm">Never share your private key (nsec) with anyone!</span>
          </div>
          
          <div className="flex gap-3 max-sm:flex-col">
            <button className="flex-1 px-4 py-2.5 bg-transparent border border-border rounded-lg text-text-secondary text-sm cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:border-nostr-purple hover:text-nostr-purple" onClick={() => downloadKeys('txt')}>
              <Download size={16} />
              Download .txt
            </button>
            <button className="flex-1 px-4 py-2.5 bg-transparent border border-border rounded-lg text-text-secondary text-sm cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:border-nostr-purple hover:text-nostr-purple" onClick={() => downloadKeys('json')}>
              <Download size={16} />
              Download .json
            </button>
          </div>
        </div>
      )}
      
      {/* Client Links */}
      <div className="mb-6 p-5 bg-bg-tertiary rounded-xl">
        <h3 className="text-sm font-semibold mb-2 text-text-primary">Use in Other Clients</h3>
        <p className="text-xs text-text-muted mb-3">Import your keys to these popular Nostr clients:</p>
        <div className="flex gap-2 flex-wrap">
          <a href="https://damus.io/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-text-secondary no-underline text-sm transition-all duration-200 hover:border-nostr-purple hover:text-nostr-purple">
            <ExternalLink size={14} />
            Damus
          </a>
          <a href="https://coracle.social/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-text-secondary no-underline text-sm transition-all duration-200 hover:border-nostr-purple hover:text-nostr-purple">
            <ExternalLink size={14} />
            Coracle
          </a>
          <a href="https://iris.to/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-text-secondary no-underline text-sm transition-all duration-200 hover:border-nostr-purple hover:text-nostr-purple">
            <ExternalLink size={14} />
            Iris
          </a>
          <a href="https://snort.social/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-text-secondary no-underline text-sm transition-all duration-200 hover:border-nostr-purple hover:text-nostr-purple">
            <ExternalLink size={14} />
            Snort
          </a>
        </div>
      </div>
      
      {/* Lock Button */}
      <button className="w-full px-6 py-3 bg-bg-tertiary border border-border rounded-xl text-text-secondary text-base font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:border-text-muted hover:text-text-primary" onClick={handleLock}>
        <Lock size={16} />
        Lock Identity
      </button>
    </div>
  );

  return (
    <div className="app-container">
      <header className="flex justify-between items-center px-8 py-6 relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 bg-transparent border-none text-text-secondary text-sm cursor-pointer transition-colors duration-200 hover:text-text-primary">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
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
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-start px-8 py-8 relative z-1 max-w-3xl mx-auto w-full pt-12">
        {viewMode === 'create' && renderCreateView()}
        {viewMode === 'unlock' && renderUnlockView()}
        {viewMode === 'identity' && renderIdentityView()}
      </main>
      
      <footer className="flex items-center justify-center gap-3 px-8 py-8 text-text-muted text-sm relative z-1">
        <span>Powered by Nostr</span>
      </footer>
    </div>
  );
}

export default IdentityPage;
