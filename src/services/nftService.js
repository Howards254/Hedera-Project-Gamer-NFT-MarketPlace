import {
  TokenId,
  AccountId,
  NftId,
  TransferTransaction,
  Transaction
} from '@hashgraph/sdk';
import { TREASURY_ACCOUNT_ID } from '../config/constants';

export async function listNFT({
  tokenId,
  serialNumber,
  priceHbar,
  client,
  hashconnect,
  hederaAccountId,
  topic
}) {
  console.log(`--- Starting listNFT for ${tokenId} #${serialNumber} ---`);
  console.log(`listNFT: Price = ${priceHbar} HBAR`);

  if (!client || !hashconnect || !hederaAccountId || !topic) {
    const errorMsg = `Wallet/Client not ready: client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`;
    console.warn('listNFT blocked:', errorMsg);
    throw new Error("Wallet/Client not connected properly. Reconnect.");
  }

  const nftTokenId = TokenId.fromString(tokenId);
  const sellerAccountId = AccountId.fromString(hederaAccountId);
  const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT_ID);
  const nftId = new NftId(nftTokenId, serialNumber);
  
  console.log(`listNFT: Preparing TransferTransaction: ${nftId.toString()} from ${sellerAccountId.toString()} to ${treasuryAccountId.toString()}`);

  let transferTx = new TransferTransaction().addNftTransfer(nftId, sellerAccountId, treasuryAccountId);
  console.log("listNFT: Freezing transfer tx with client...");
  const frozenTx = await transferTx.freezeWith(client);
  const transferTxBytes = frozenTx.toBytes();
  console.log("listNFT: Freeze transfer complete.");

  console.log("listNFT: Sending transfer tx to HashPack (topic:", topic, ")");
  const transferResponse = await hashconnect.sendTransaction(topic, {
    topic: topic,
    byteArray: transferTxBytes,
    metadata: { accountToSign: hederaAccountId, returnTransaction: true }
  });
  console.log("listNFT: HashPack response received:", transferResponse);

  if (!transferResponse || !transferResponse.signedTransaction) {
    throw new Error('HashPack signing failed');
  }

  const signedTransferBytes = typeof transferResponse.signedTransaction === 'string'
    ? Buffer.from(transferResponse.signedTransaction, 'base64')
    : transferResponse.signedTransaction;
  console.log("listNFT: Received signed bytes.");

  console.log("listNFT: Executing transfer tx...");
  const executedTransferTx = await Transaction.fromBytes(signedTransferBytes).execute(client);
  console.log("listNFT: Getting transfer receipt...");
  const transferReceipt = await executedTransferTx.getReceipt(client);
  console.log("listNFT: Transfer Receipt:", transferReceipt);
  const transferStatus = transferReceipt.status.toString();
  console.log("listNFT: Transfer status:", transferStatus);

  if (transferStatus !== 'SUCCESS') {
    throw new Error(`Hedera tx failed: ${transferStatus}`);
  }

  return { tokenId, serialNumber };
}

export function parseListingError(err, tokenId) {
  console.error("Listing error:", err);
  let displayError = err.message || 'An unknown error occurred';
  
  if (err.toString && err.toString().includes('USER_REJECT')) {
    displayError = 'Rejected in HashPack.';
  } else if (err.status) {
    displayError = `Hedera Network Error: ${err.status.toString()} - ${err.message}`;
  } else if (err.message?.includes("topic") || err.message?.includes("session")) {
    displayError = `Connection Error: ${err.message}`;
  } else if (err.message?.includes("insufficient account balance")) {
    displayError = `Hedera Error: Insufficient HBAR for fee.`;
  } else if (err.message?.includes("INVALID_TOKEN_NFT_SERIAL_NUMBER")) {
    displayError = `Hedera Error: Ownership/Serial invalid.`;
  } else if (err.message?.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    displayError = `Hedera Error: Treasury (${TREASURY_ACCOUNT_ID}) not associated with token (${tokenId}).`;
  }
  
  return displayError;
}
