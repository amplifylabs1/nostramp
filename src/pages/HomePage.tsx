import { useState } from 'react';
import { Rocket, Key, Globe, Shield, Zap, Code2, Check, X, Sparkles, ArrowRight, Link2 } from 'lucide-react';
import { extractEventId } from '../nostr';

function HomePage() {
  const [nostrLink, setNostrLink] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'copied' | ''>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handleCreateLink = async () => {
    if (!nostrLink.trim()) {
      setStatusMessage('Please enter a Nostr client link');
      setStatusType('error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const eventId = extractEventId(nostrLink);
      
      if (!eventId) {
        setStatusMessage('Could not find a valid Nostr event ID in the link');
        setStatusType('error');
        setIsLoading(false);
        return;
      }
      
      const shareableLink = `${window.location.origin}/${eventId}`;
      
      try {
        await navigator.clipboard.writeText(shareableLink);
        setStatusMessage(shareableLink);
        setStatusType('copied');
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
        setStatusMessage(shareableLink);
        setStatusType('success');
      }
      
      setNostrLink('');
    } catch (error) {
      console.error('Error creating link:', error);
      setStatusMessage('Error creating link. Please try again.');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-nostr-purple/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-nostr-orange/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-nostr-purple/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Header */}
      <header className="flex justify-between items-center px-6 sm:px-8 py-6 relative z-10">
        <div className="flex items-center gap-3 text-2xl font-bold text-text-primary no-underline group">
          <div className="relative">
            <svg className="w-10 h-10 block transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
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
            <div className="absolute inset-0 bg-gradient-to-br from-nostr-purple to-nostr-orange rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
          </div>
          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">nostramp</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-8 py-8 sm:py-12 relative z-10 max-w-4xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nostr-purple/10 border border-nostr-purple/20 text-nostr-purple-light text-sm font-medium mb-5">
            <Sparkles size={16} />
            <span>Instant Nostr link previews</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            Share{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-nostr-purple via-nostr-purple-light to-nostr-orange bg-clip-text text-transparent">Nostr</span>
              <span className="absolute -inset-2 bg-gradient-to-br from-nostr-purple/20 to-nostr-orange/20 blur-2xl -z-10" />
            </span>{' '}
            Posts with anyone
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
            Create instant preview links. Anyone can comment without an account.
            <span className="text-text-muted block mt-2">Keys are generated in their browser, exportable anytime.</span>
          </p>
        </div>
        
        {/* Input Section */}
        <div className="w-full max-w-xl mb-8 sm:mb-10 text-center animate-fade-in">
          <div 
            className={`relative flex gap-2 sm:gap-3 bg-bg-secondary/80 border rounded-2xl p-1.5 sm:p-2 backdrop-blur-xl transition-all duration-500 flex-col sm:flex-row ${
              isFocused 
                ? 'border-nostr-purple/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]' 
                : 'border-border hover:border-border/80'
            }`}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-nostr-purple/5 to-nostr-orange/5 pointer-events-none" />
            <div className="flex-1 relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Paste a Nostr link..."
                value={nostrLink}
                onChange={(e) => setNostrLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateLink()}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full bg-transparent border-none pl-11 pr-4 py-3.5 text-text-primary text-base outline-none placeholder:text-text-muted/70"
              />
            </div>
            <button 
              onClick={handleCreateLink} 
              disabled={isLoading}
              className="group relative px-6 py-3.5 bg-gradient-to-br from-nostr-purple to-nostr-orange border-none rounded-xl text-white text-base font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:shadow-[0_10px_40px_rgba(168,85,247,0.3)] disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Link
                    <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-br from-nostr-orange to-nostr-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
          
          {statusMessage && (
            <div className={`flex items-center gap-3 mt-3 px-4 py-3 rounded-xl text-sm animate-fade-in backdrop-blur-sm ${
              statusType === 'error' 
                ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                : statusType === 'copied'
                ? 'bg-nostr-orange/10 border border-nostr-orange/30 text-nostr-orange-light'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {statusType === 'error' ? (
                <>
                  <X className="shrink-0" size={18} />
                  <span>{statusMessage}</span>
                </>
              ) : (
                <>
                  <Check className="shrink-0" size={18} />
                  <a 
                    href={statusMessage}
                    className="cursor-pointer underline underline-dotted break-all text-inherit hover:opacity-80" 
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click to open link"
                  >
                    {statusMessage}
                  </a>
                  {statusType === 'copied' && (
                    <span className="ml-auto px-2.5 py-0.5 bg-nostr-orange/20 rounded-full text-xs font-semibold border border-nostr-orange/30">Copied!</span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 w-full max-w-3xl animate-fade-in">
          {/* Feature 1 - No Setup */}
          <div className="group relative text-center p-5 bg-bg-secondary/50 border border-border rounded-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-nostr-purple/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-nostr-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-nostr-purple/10 text-nostr-purple mb-3 transition-transform duration-300 group-hover:scale-110">
                <Rocket size={24} />
              </div>
              <h3 className="text-base font-bold mb-1.5 text-text-primary">No Setup</h3>
              <p className="text-sm text-text-muted leading-relaxed">Zero friction. No apps, no signup, just paste and go.</p>
            </div>
          </div>
          
          {/* Feature 2 - Own Your Keys */}
          <div className="group relative text-center p-5 bg-bg-secondary/50 border border-border rounded-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-nostr-orange/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-nostr-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-nostr-orange/10 text-nostr-orange mb-3 transition-transform duration-300 group-hover:scale-110">
                <Key size={24} />
              </div>
              <h3 className="text-base font-bold mb-1.5 text-text-primary">Own Your Keys</h3>
              <p className="text-sm text-text-muted leading-relaxed">Keys live in your browser. Export to any client when ready.</p>
            </div>
          </div>
          
          {/* Feature 3 - Works Everywhere */}
          <div className="group relative text-center p-5 bg-bg-secondary/50 border border-border rounded-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-nostr-purple/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-nostr-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-nostr-purple/10 text-nostr-purple mb-3 transition-transform duration-300 group-hover:scale-110">
                <Globe size={24} />
              </div>
              <h3 className="text-base font-bold mb-1.5 text-text-primary">Works Everywhere</h3>
              <p className="text-sm text-text-muted leading-relaxed">Clean preview links that open in any browser instantly.</p>
            </div>
          </div>
        </div>
        
        {/* Trust Badges */}
        <div className="flex flex-wrap gap-6 sm:gap-8 justify-center animate-fade-in">
          <div className="flex items-center gap-2 text-text-muted text-sm font-medium transition-colors duration-200 hover:text-text-secondary">
            <Shield size={16} />
            <span>Private</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted text-sm font-medium transition-colors duration-200 hover:text-text-secondary">
            <Zap size={16} />
            <span>Fast</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted text-sm font-medium transition-colors duration-200 hover:text-text-secondary">
            <Code2 size={16} />
            <span>Open Source</span>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="flex items-center justify-center px-8 py-5 text-text-muted text-sm relative z-10">
        <span className="text-text-muted/60">Onboarding made simple</span>
      </footer>
    </div>
  );
}

export default HomePage;
