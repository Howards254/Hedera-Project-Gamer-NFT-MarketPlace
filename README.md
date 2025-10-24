# 🎮 Gamer's Mint NFT Marketplace

A decentralized NFT marketplace built on the Hedera network, designed specifically for gamers to mint, list, and trade gaming NFTs.

![Hedera](https://img.shields.io/badge/Hedera-Testnet-purple)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![Vite](https://img.shields.io/badge/Vite-6.0.5-646CFF)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🔐 **Wallet Integration** - Connect with HashPack wallet via HashConnect
- 🖼️ **NFT Display** - View your owned NFTs from Hedera Testnet
- 📝 **NFT Listing** - List NFTs for sale with custom pricing
- 💰 **Hedera Transactions** - Secure NFT transfers to treasury account
- 🎨 **Modern UI** - Clean, responsive interface with Poppins font
- ⚡ **Fast Performance** - Built with Vite for lightning-fast development

## 🏗️ Architecture

This project follows a clean, modular architecture:

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── services/       # Business logic & API calls
├── utils/          # Helper functions
└── config/         # Configuration & constants
```

For detailed architecture documentation, see:
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete structure overview
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Before/after comparison
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Developer quick guide

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- HashPack wallet extension
- Hedera Testnet account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Howards254/Hedera-Project-Gamer-NFT-MarketPlace.git
   cd Hedera-Project-Gamer-NFT-MarketPlace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Update the configuration in `src/config/constants.js`:
   ```javascript
   export const WALLETCONNECT_PROJECT_ID = "your-project-id";
   export const PINATA_JWT_KEY = "your-pinata-jwt";
   export const TREASURY_ACCOUNT_ID = "your-treasury-account";
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **Vite 6.0.5** - Build tool & dev server
- **CSS3** - Styling with Poppins font

### Blockchain
- **Hedera SDK** - Hedera network integration
- **HashConnect** - Wallet connection protocol
- **Hedera Testnet** - Development network

### Services
- **Pinata** - IPFS storage for NFT metadata

## 📦 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/        # UI Components
│   │   ├── Header.jsx
│   │   ├── NFTGallery.jsx
│   │   ├── NFTCard.jsx
│   │   ├── StatusMessage.jsx
│   │   └── WelcomeScreen.jsx
│   │
│   ├── hooks/             # Custom Hooks
│   │   ├── useHashConnect.js
│   │   └── useNFTs.js
│   │
│   ├── services/          # Business Logic
│   │   └── nftService.js
│   │
│   ├── utils/             # Utilities
│   │   └── helpers.js
│   │
│   ├── config/            # Configuration
│   │   └── constants.js
│   │
│   ├── App.jsx            # Main component
│   ├── App.css            # Global styles
│   └── main.jsx           # Entry point
│
├── PROJECT_STRUCTURE.md   # Architecture docs
├── REFACTORING_SUMMARY.md # Refactoring details
├── QUICK_REFERENCE.md     # Developer guide
└── README.md              # This file
```

## 🎯 Key Components

### `useHashConnect` Hook
Manages HashPack wallet connection and Hedera client setup.

### `useNFTs` Hook
Handles NFT fetching and state management.

### `nftService`
Contains business logic for NFT listing transactions.

### UI Components
- **Header** - Wallet connection interface
- **NFTGallery** - NFT collection display
- **NFTCard** - Individual NFT with listing controls
- **StatusMessage** - Transaction status display
- **WelcomeScreen** - Landing page for non-connected users

## 🔧 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🌐 Deployment

Build the project for production:

```bash
npm run build
```

The optimized files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 🔐 Security Notes

- Never commit API keys or private keys to version control
- Use environment variables for sensitive data in production
- The treasury account should be properly secured
- Always test on Hedera Testnet before mainnet deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Hedera](https://hedera.com/) - For the fast, fair, and secure network
- [HashPack](https://www.hashpack.app/) - For the wallet integration
- [Pinata](https://www.pinata.cloud/) - For IPFS storage
- [Vite](https://vitejs.dev/) - For the amazing build tool

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for the gaming community on Hedera**
