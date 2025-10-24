import React from 'react';

export function NFTCard({ nft, isMinting, isLoadingNfts, onListNft }) {
  return (
    <form
      key={`${nft.tokenId}-${nft.serialNumber}`}
      className="nft-card-form"
      onSubmit={(e) => onListNft(e, nft.tokenId, nft.serialNumber)}
    >
      <div className="nft-card">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="nft-image"
          onError={(ev) => {
            ev.target.onerror = null;
            ev.target.src = 'https://placehold.co/100x100/555/FFF?text=Error';
          }}
        />
        <div className="nft-info">
          <h3 className="nft-name">{nft.name}</h3>
          <p className="nft-id">ID: {nft.tokenId}</p>
          <p className="nft-serial">Serial: #{nft.serialNumber}</p>
          <div className="list-controls">
            <input
              type="number"
              name="price"
              placeholder="Price (ℏ)"
              min="0.00000001"
              step="0.00000001"
              required
              className="price-input"
              onClick={(ev) => ev.stopPropagation()}
              onKeyDown={(ev) => ev.stopPropagation()}
            />
            <button
              type="submit"
              className="list-button"
              disabled={isMinting || isLoadingNfts}
              onClick={(ev) => ev.stopPropagation()}
            >
              List
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
