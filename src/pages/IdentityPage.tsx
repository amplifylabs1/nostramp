import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Download, 
  Flame,
  MessageCircle,
  Heart,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import {
  createProfile,
  getIdentityState,
  clearIdentityData,
  getUserActivity,
  getProfileKey,
  type UserActivity
} from '../storage.identity';
import { exportKeypair, type ExportedKeypair } from '../nostr';

type ViewMode = 'create' | 'profile';

function IdentityPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('create');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [exportedKeys, setExportedKeys] = useState<ExportedKeypair | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  
  // Create form state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Activity
  const [activity, setActivity] = useState<UserActivity>(getUserActivity());

  useEffect(() => {
    // Check current identity state
    const state = getIdentityState();
    
    if (state.hasIdentity) {
      // Get the profile key
      const profileKey = getProfileKey();
      if (profileKey) {
        setExportedKeys(exportKeypair(profileKey.privateKey, profileKey.publicKey));
        setViewMode('profile');
      }
    } else {
      setViewMode('create');
    }
  }, []);

  const handleCreateProfile = () => {
    setError('');
    setIsLoading(true);
    
    const result = createProfile();
    
    if (result.error) {
      setError(result.error);
    } else {
      setExportedKeys(exportKeypair(result.privateKey, result.publicKey));
      setViewMode('profile');
    }
    
    setIsLoading(false);
  };

  const handleBurnProfile = () => {
    clearIdentityData();
    setExportedKeys(null);
    setViewMode('create');
    setShowBurnConfirm(false);
    setActivity(getUserActivity());
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
      content = `Nostr Profile Keys
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
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Create Your Profile</h2>
        <p className="text-text-muted text-sm">Set up your Nostr profile to interact with posts</p>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-5">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <button
        className="w-full px-6 py-3 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-lg text-white text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(168,85,247,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={handleCreateProfile}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Profile'}
      </button>
      
      <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border text-text-muted text-sm">
        <Shield size={16} />
        <span>Your keys are stored locally in your browser</span>
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="bg-bg-card border border-border rounded-3xl p-10 backdrop-blur-sm w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white">
          <Key size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">Your Profile</h2>
        <p className="text-emerald-400 text-sm">Profile ready to use</p>
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
      
      {/* Burn Profile Section */}
      {showBurnConfirm ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-red-400 font-medium text-sm">Are you sure?</span>
          </div>
          <p className="text-text-secondary text-sm mb-4">This will permanently delete your local profile. Make sure you've backed up your keys!</p>
          <div className="flex gap-3">
            <button 
              className="flex-1 px-4 py-2 bg-red-500 border-none rounded-lg text-white text-sm font-medium cursor-pointer transition-opacity duration-200 hover:opacity-90"
              onClick={handleBurnProfile}
            >
              Yes, Burn Profile
            </button>
            <button 
              className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:border-text-muted hover:text-text-primary"
              onClick={() => setShowBurnConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button 
          className="w-full px-6 py-3 bg-bg-tertiary border border-red-500/30 rounded-xl text-red-400 text-base font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/50" 
          onClick={() => setShowBurnConfirm(true)}
        >
          <Flame size={16} />
          Burn Profile
        </button>
      )}
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
        {viewMode === 'profile' && renderProfileView()}
      </main>
      
      <footer className="flex items-center justify-center gap-3 px-8 py-8 text-text-muted text-sm relative z-1">
        <span>Powered by Nostr</span>
      </footer>
    </div>
  );
}

export default IdentityPage;
