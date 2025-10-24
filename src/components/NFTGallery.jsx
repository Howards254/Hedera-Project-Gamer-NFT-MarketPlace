import React from 'react';
import { NFTCard } from './NFTCard';

export function NFTGallery({
  hederaAccountId,
  ownedNfts,
  isLoadingNfts,
  fetchError,
  isMinting,
  onListNft
}) {
  return (
    <div className="my-nfts-container">
      <h2>My NFTs</h2>
      {isLoadingNfts && <p className="loading-message">Loading your NFTs...</p>}
      {fetchError && <p className="error-message">Error loading NFTs: {fetchError}</p>}
      {!isLoadingNfts && !fetchError && ownedNfts.length === 0 && (
        <p className="info-message">No NFTs found for account {hederaAccountId} on Testnet.</p>
      )}
      {!isLoadingNfts && !fetchError && ownedNfts.length > 0 && (
        <div className="nft-gallery">
          {ownedNfts.map((nft) => (
            <NFTCard
              key={`${nft.tokenId}-${nft.serialNumber}`}
              nft={nft}
              isMinting={isMinting}
              isLoadingNfts={isLoadingNfts}
              onListNft={onListNft}
            />
          ))}
        </div>
      )}
    </div>
  );
}
