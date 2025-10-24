import React, { useState } from 'react';
import { Header, WelcomeScreen, NFTGallery, StatusMessage } from './components';
import { useHashConnect } from './hooks/useHashConnect';
import { useNFTs } from './hooks/useNFTs';
import { listNFT, parseListingError } from './services/nftService';
import './App.css';

export default function App() {
  const {
    hashconnect,
    hederaAccountId,
    topic,
    client,
    isConnecting,
    connectWallet,
    disconnectWallet
  } = useHashConnect();

  const {
    ownedNfts,
    setOwnedNfts,
    isLoadingNfts,
    fetchError
  } = useNFTs(hederaAccountId);

  const [isMinting, setIsMinting] = useState(false);
  const [mintMessage, setMintMessage] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState(null);

  const handleListNft = async (e, tokenId, serialNumber) => {
    e.preventDefault();

    const priceHbarString = e.target.elements.price.value;
    if (!priceHbarString || parseFloat(priceHbarString) <= 0) {
      alert("Invalid price.");
      return;
    }
    const priceHbar = parseFloat(priceHbarString);

    setIsMinting(true);
    setMintMessage(`Listing NFT ${tokenId} #${serialNumber} for ${priceHbar} ℏ...`);

    try {
      await listNFT({
        tokenId,
        serialNumber,
        priceHbar,
        client,
        hashconnect,
        hederaAccountId,
        topic
      });

      setMintMessage(`NFT ${tokenId} #${serialNumber} transferred to treasury successfully!`);
      setOwnedNfts(prev => prev.filter(n => !(n.tokenId === tokenId && n.serialNumber === serialNumber)));
    } catch (err) {
      const displayError = parseListingError(err, tokenId);
      setMintMessage(`Listing Failed: ${displayError}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="app-container">
      <Header
        hederaAccountId={hederaAccountId}
        isConnecting={isConnecting}
        hashconnect={hashconnect}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
      />

      <main className="app-main">
        {hederaAccountId ? (
          <div className="content-area">
            <StatusMessage
              message={mintMessage}
              mintedTokenId={mintedTokenId}
              isMinting={isMinting}
            />

            <NFTGallery
              hederaAccountId={hederaAccountId}
              ownedNfts={ownedNfts}
              isLoadingNfts={isLoadingNfts}
              fetchError={fetchError}
              isMinting={isMinting}
              onListNft={handleListNft}
            />
          </div>
        ) : (
          <WelcomeScreen />
        )}
      </main>
    </div>
  );
}

