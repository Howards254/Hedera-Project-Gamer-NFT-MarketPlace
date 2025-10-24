# Quick Reference Guide

## 📁 File Structure at a Glance

```
src/
├── 📱 App.jsx                    # Main app (100 lines - orchestration only)
├── 🎨 App.css                    # Global styles
│
├── 🧩 components/                # UI Components
│   ├── Header.jsx               # Wallet connection header
│   ├── WelcomeScreen.jsx        # Landing page
│   ├── NFTGallery.jsx           # NFT collection display
│   ├── NFTCard.jsx              # Individual NFT card
│   ├── StatusMessage.jsx        # Status/error messages
│   └── index.js                 # Component exports
│
├── 🪝 hooks/                     # Custom React Hooks
│   ├── useHashConnect.js        # Wallet integration
│   └── useNFTs.js               # NFT state management
│
├── ⚙️ services/                  # Business Logic
│   └── nftService.js            # NFT listing transactions
│
├── 🛠️ utils/                     # Helper Functions
│   └── helpers.js               # Data parsing utilities
│
└── 📋 config/                    # Configuration
    └── constants.js             # API keys & settings
```

## 🚀 Quick Start

### Adding a New Component
```javascript
// 1. Create file: src/components/MyComponent.jsx
import React from 'react';

export function MyComponent({ prop1, prop2 }) {
  return <div>{prop1}</div>;
}

// 2. Export in src/components/index.js
export { MyComponent } from './MyComponent';

// 3. Use in App.jsx
import { MyComponent } from './components';
```

### Adding a New Hook
```javascript
// 1. Create file: src/hooks/useMyHook.js
import { useState, useEffect } from 'react';

export function useMyHook(param) {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Your logic here
  }, [param]);
  
  return { state, setState };
}

// 2. Use in App.jsx
import { useMyHook } from './hooks/useMyHook';

function App() {
  const { state, setState } = useMyHook(param);
  // ...
}
```

### Adding a New Service Function
```javascript
// 1. Add to src/services/nftService.js
export async function myNewService(params) {
  // Your logic here
  return result;
}

// 2. Use in App.jsx
import { myNewService } from './services/nftService';
```

## 📦 Import Patterns

### ✅ Good (Clean Imports)
```javascript
import { Header, NFTGallery } from './components';
import { useHashConnect } from './hooks/useHashConnect';
import { listNFT } from './services/nftService';
```

### ❌ Avoid (Messy Imports)
```javascript
import { Header } from './components/Header';
import { NFTGallery } from './components/NFTGallery';
```

## 🔑 Key Files Explained

### App.jsx
**Purpose**: Orchestrate the app  
**Does**: 
- Uses hooks for state
- Handles NFT listing
- Renders components
- Passes props down

**Doesn't**:
- Contain business logic
- Make API calls directly
- Define helper functions
- Store configuration

### useHashConnect.js
**Purpose**: Manage wallet connection  
**Returns**:
```javascript
{
  hashconnect,      // HashConnect instance
  hederaAccountId,  // Connected account
  topic,            // Pairing topic
  client,           // Hedera client
  isConnecting,     // Connection status
  connectWallet,    // Connect function
  disconnectWallet  // Disconnect function
}
```

### useNFTs.js
**Purpose**: Manage NFT data  
**Returns**:
```javascript
{
  ownedNfts,       // Array of NFTs
  setOwnedNfts,    // Update NFTs
  isLoadingNfts,   // Loading state
  fetchError       // Error message
}
```

### nftService.js
**Purpose**: Handle NFT transactions  
**Functions**:
- `listNFT()` - List NFT for sale
- `parseListingError()` - Format errors

## 🎯 Component Props Quick Reference

### Header
```javascript
<Header
  hederaAccountId={string}
  isConnecting={boolean}
  hashconnect={object}
  onConnect={function}
  onDisconnect={function}
/>
```

### NFTGallery
```javascript
<NFTGallery
  hederaAccountId={string}
  ownedNfts={array}
  isLoadingNfts={boolean}
  fetchError={string}
  isMinting={boolean}
  onListNft={function}
/>
```

### NFTCard
```javascript
<NFTCard
  nft={object}
  isMinting={boolean}
  isLoadingNfts={boolean}
  onListNft={function}
/>
```

### StatusMessage
```javascript
<StatusMessage
  message={string}
  mintedTokenId={string}
  isMinting={boolean}
/>
```

## 🔧 Configuration

All configuration is in `src/config/constants.js`:
```javascript
export const WALLETCONNECT_PROJECT_ID = "...";
export const PINATA_JWT_KEY = "...";
export const TREASURY_ACCOUNT_ID = "0.0.7118383";
export const appMetadata = { ... };
```

## 🧪 Testing Strategy

### Unit Tests
- Test hooks independently
- Test service functions
- Test utility functions
- Test components with mocked props

### Integration Tests
- Test component interactions
- Test hook + service combinations
- Test full user flows

## 📝 Code Style Guidelines

1. **One component per file**
2. **Named exports for components** (not default)
3. **Use index.js for clean imports**
4. **Keep App.jsx under 150 lines**
5. **Extract logic to hooks/services**
6. **Use descriptive prop names**
7. **Add JSDoc comments for complex functions**

## 🐛 Common Issues

### Import Errors
```javascript
// ❌ Wrong
import Header from './components/Header';

// ✅ Correct
import { Header } from './components';
```

### Hook Dependencies
```javascript
// ❌ Missing dependency
useEffect(() => {
  doSomething(value);
}, []); // Should include 'value'

// ✅ Correct
useEffect(() => {
  doSomething(value);
}, [value]);
```

## 📚 Further Reading

- [React Hooks Documentation](https://react.dev/reference/react)
- [Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Project Structure Best Practices](https://react.dev/learn/thinking-in-react)

## 🎉 Summary

- **Before**: 1 file, 378 lines
- **After**: 14 files, ~100 lines in App.jsx
- **Improvement**: 73% reduction in main file size
- **Benefits**: Maintainable, testable, scalable, reusable
