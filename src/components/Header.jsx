import React from 'react';

export function Header({ hederaAccountId, isConnecting, hashconnect, onConnect, onDisconnect }) {
  return (
    <header className="app-header">
      <div className="logo-title">Gamer's Mint</div>
      <button
        onClick={hederaAccountId ? onDisconnect : onConnect}
        disabled={!hashconnect || isConnecting}
        className={`connect-button ${hederaAccountId ? 'connected' : ''}`}
      >
        {hederaAccountId ? (
          <div className="wallet-info-connected">
            {hederaAccountId.substring(0, 5)}...{hederaAccountId.substring(hederaAccountId.length - 4)}
            <span className="disconnect-icon">Disconnect?</span>
          </div>
        ) : (
          !hashconnect ? "Initializing..." : (isConnecting ? "Connecting..." : "Connect Wallet")
        )}
      </button>
    </header>
  );
}
