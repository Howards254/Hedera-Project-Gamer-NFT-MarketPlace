# Project Structure

This document outlines the clean, modular structure of the Hedera NFT Marketplace application.

## Directory Structure

```
src/
├── components/          # React UI components
│   ├── Header.jsx      # App header with wallet connection
│   ├── WelcomeScreen.jsx   # Landing screen for non-connected users
│   ├── NFTGallery.jsx  # Gallery container for NFT display
│   ├── NFTCard.jsx     # Individual NFT card component
│   ├── StatusMessage.jsx   # Status/error message display
│   └── index.js        # Component exports
│
├── hooks/              # Custom React hooks
│   ├── useHashConnect.js   # HashConnect wallet integration
│   └── useNFTs.js      # NFT fetching and management
│
├── services/           # Business logic and API calls
│   └── nftService.js   # NFT listing and transaction logic
│
├── utils/              # Helper functions
│   └── helpers.js      # Utility functions (base64, account parsing, etc.)
│
├── config/             # Configuration and constants
│   └── constants.js    # App configuration (API keys, metadata)
│
├── App.jsx             # Main app component (orchestration only)
├── App.css             # Global styles
└── main.jsx            # App entry point
```

## Component Responsibilities

### App.jsx
- **Purpose**: Main orchestrator component
- **Responsibilities**: 
  - Compose all components
  - Handle NFT listing logic
  - Manage listing state (loading, messages)
- **Lines of Code**: ~100 (down from 378)

### components/Header.jsx
- **Purpose**: Application header with wallet connection
- **Props**: `hederaAccountId`, `isConnecting`, `hashconnect`, `onConnect`, `onDisconnect`

### components/WelcomeScreen.jsx
- **Purpose**: Landing screen for non-authenticated users
- **Props**: None

### components/NFTGallery.jsx
- **Purpose**: Container for displaying user's NFT collection
- **Props**: `hederaAccountId`, `ownedNfts`, `isLoadingNfts`, `fetchError`, `isMinting`, `onListNft`

### components/NFTCard.jsx
- **Purpose**: Individual NFT card with listing functionality
- **Props**: `nft`, `isMinting`, `isLoadingNfts`, `onListNft`

### components/StatusMessage.jsx
- **Purpose**: Display status/error messages
- **Props**: `message`, `mintedTokenId`, `isMinting`

## Custom Hooks

### hooks/useHashConnect.js
- **Purpose**: Manage HashConnect wallet integration
- **Returns**: 
  - `hashconnect`: HashConnect instance
  - `hederaAccountId`: Connected account ID
  - `topic`: Pairing topic
  - `client`: Hedera client instance
  - `isConnecting`: Connection status
  - `connectWallet()`: Function to initiate connection
  - `disconnectWallet()`: Function to disconnect

### hooks/useNFTs.js
- **Purpose**: Fetch and manage user's NFTs
- **Parameters**: `hederaAccountId`
- **Returns**:
  - `ownedNfts`: Array of NFTs
  - `setOwnedNfts`: State setter
  - `isLoadingNfts`: Loading status
  - `fetchError`: Error message if any

## Services

### services/nftService.js
- **Functions**:
  - `listNFT()`: Handle NFT listing transaction
  - `parseListingError()`: Parse and format error messages

## Utilities

### utils/helpers.js
- **Functions**:
  - `base64ToUtf8()`: Decode base64 strings
  - `normalizePairings()`: Normalize pairing data structures
  - `findNestedValue()`: Find nested object values
  - `findAccountId()`: Extract account ID from various formats

## Configuration

### config/constants.js
- **Exports**:
  - `WALLETCONNECT_PROJECT_ID`: WalletConnect project ID
  - `PINATA_JWT_KEY`: Pinata API key
  - `TREASURY_ACCOUNT_ID`: Treasury account for listings
  - `appMetadata`: App metadata for HashConnect

## Benefits of This Structure

1. **Separation of Concerns**: Each file has a single, clear responsibility
2. **Reusability**: Components and hooks can be easily reused
3. **Testability**: Isolated functions are easier to test
4. **Maintainability**: Changes are localized to specific files
5. **Readability**: App.jsx is now ~100 lines vs 378 lines
6. **Scalability**: Easy to add new features without cluttering existing code

## Future Enhancements

- Add unit tests for hooks and services
- Implement NFT fetching logic in `useNFTs.js`
- Add more UI components (filters, search, etc.)
- Create a context provider for global state management
- Add TypeScript for better type safety
