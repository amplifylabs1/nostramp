# Nostramp

Share your Nostr posts with the world. A modern platform for creating shareable links to your Nostr content with inline media viewing, built with React, Vite, TypeScript, and nostr-tools.

![Nostramp](https://github.com/user-attachments/assets/0a658f36-37f1-4b2f-a445-6ee1f6d69f8c)

## Features

### Visual Style & Branding
- **Nostr Blue (#4567b7)**: Calming, trustworthy primary color
- **Ramp Orange (#ffc107)**: Vibrant, energetic secondary color for calls-to-action
- **Open Sans Typography**: Modern, highly legible font family
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile
- **Accessibility First**: High contrast mode, reduced motion support, and keyboard navigation

### Core Functionality
- **Shareable Post Links**: Create links to your Nostr posts for easy sharing
- **Link Gallery**: View and manage all your created links in one place
- **Frictionless Experience**: No signup required - just start creating
- **Ephemeral Key Management**: Automatically generates and stores a cryptographically secure key using CSPRNG
- **Progressive Identity Claiming**: Gentle nudges to claim your identity as you return
  - 1st visit: Pure frictionless experience
  - 2nd visit: Gentle suggestion to claim your identity
  - 3rd+ visits: Stronger but still optional reminders
- **Secure Key Export**: Download your keys as .txt or .json files
- **Popular Client Integration**: Links to Damus, Coracle, and Iris for using your identity across the Nostr ecosystem

## Technology Stack

- **React**: Modern UI library for building interactive interfaces
- **Vite**: Lightning-fast build tool and dev server
- **TypeScript**: Type-safe development for better code quality
- **nostr-tools**: Official Nostr protocol implementation
- **pnpm**: Fast, disk space efficient package manager
- **CSS Custom Properties**: Modern, themeable styling with brand colors
- **Open Sans**: Web font from Google Fonts for enhanced typography

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (automatically installed if needed)

### Installation

```bash
# Clone the repository

# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Development

The app is structured as follows:

- `src/main.tsx` - React entry point
- `src/App.tsx` - Main React application component
- `src/storage.ts` - LocalStorage utilities for key and visit tracking
- `src/nostr.ts` - Nostr protocol utilities (key generation, event signing)
- `src/style.css` - Modern, responsive styles
- `tsconfig.json` - TypeScript configuration
- `vite.config.js` - Vite build configuration

## Deployment

This app is configured for GitHub Pages deployment.

### Automatic Deployment

Pushes to the `main` branch automatically trigger a GitHub Actions workflow that builds and deploys to GitHub Pages using pnpm.

### Manual Deployment

```bash
pnpm run build
# Upload the dist/ folder to your static hosting service
```

## Usage

### Creating Shareable Links
1. Open Nostramp
2. Paste a Nostr client link (from Damus, Coracle, Iris, etc.)
3. Click "Create Link"
4. Copy your shareable link to share with others
5. View all your links in the gallery below

### Posting Replies
1. Type your message in the "Your Reply" field
2. Click "Post Reply"
3. Your ephemeral key is generated automatically on first post

### Claiming Your Identity
After creating links or posting, you'll see prompts to claim your identity:
1. Click "Claim Identity" in the navigation
2. View your public (npub) and private (nsec) keys
3. Download or copy your keys
4. Use them in any Nostr client (Damus, Coracle, Iris, etc.)

### Key Management
- **Never share your nsec (private key)** - treat it like a password
- **Backup your keys** - download them and store safely
- If you clear browser storage, you'll get a new ephemeral identity

## Design Philosophy

**Nostramp** embodies the values of the Nostr ecosystem through its visual identity:

- **Trust & Reliability**: Nostr Blue conveys confidence and dependability
- **Energy & Creativity**: Ramp Orange represents excitement and innovation  
- **Clarity & Focus**: Clean, neutral backgrounds let content shine
- **Accessibility**: Designed to be usable by everyone, regardless of ability
- **Modern & Approachable**: Open Sans typography ensures readability

## Security

- Keys are generated using cryptographically secure random number generation (CSPRNG)
- Private keys are stored only in your browser's localStorage
- The app never transmits your private key to any server
- All Nostr event signing happens client-side

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [Nostr Protocol](https://nostr.com)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [Damus](https://damus.io/) - iOS & Mac Nostr client
- [Coracle](https://coracle.social/) - Web Nostr client
- [Iris](https://iris.to/) - Web & mobile Nostr client