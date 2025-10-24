import React from 'react';

export function StatusMessage({ message, mintedTokenId, isMinting }) {
  if (!message || isMinting) return null;

  const messageType = mintedTokenId
    ? 'success'
    : (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed'))
    ? 'error'
    : 'info';

  return (
    <div className={`mint-message ${messageType}`}>
      {message}
    </div>
  );
}
