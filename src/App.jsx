import React, { useState, useEffect, useRef } from 'react';
import { HashConnect } from 'hashconnect/dist/hashconnect';
import {
  LedgerId,
  Client, // <<< Ensure Client is imported
  AccountId, // <<< Ensure AccountId is imported
  TokenId,
  PrivateKey, // Keep PrivateKey for client config dummy
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  Transaction,
  TransferTransaction,
  NftId,
  Hbar
} from '@hashgraph/sdk';
import './App.css';

// Import Firestore database instance and functions
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc } from "firebase/firestore"; // <<< Added query, where, onSnapshot

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = "dfe22a1aca8d834168d51a5ac05cec7b"; // Use your actual ID
const PINATA_JWT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNzBmYjgyZS1hODEwLTRmOGQtYWVmZS1iYTE4Y2E0NjQzMzciLCJlbWFpbCI6Imthcm9sb255YW5nbzE4QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxM2Y3ZmYwOGE3ZmVjYzc2ZDk2YSIsInNjb3BlZEtleVNlY3JldCI6ImU4ZTEyYWQxOGQxNjgxOTE1NmQ5ZGY0MDZhOWY4MmM1ZGFjOGYwODNmMWYxYmViM2RlNWQ0MDY5ODk0M2FkMTQiLCJleHAiOjE3OTI3ODY4NzZ9.MlhnKv0ZclqWZFqgpjYv3hGHdJzXlZ6TRM3kSyYsKEA"; // Use your actual JWT Key (eyJ...)
const TREASURY_ACCOUNT_ID = "0.0.7118383"; // Use your actual Treasury ID

const appMetadata = {
  name: "Gamer's Mint Marketplace",
  description: "A Hedera NFT marketplace for gamers.",
  icons: ["https://placehold.co/128x128/1A1A2E/E94560?text=LOGO"]
};

// --- Helpers ---
function base64ToUtf8(base64) { /* ... unchanged ... */
  try { const binary = atob(base64); const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }
  catch (e) { console.error("Failed to decode base64:", base64, e); return ""; }
}
function normalizePairings(container) { /* ... unchanged ... */
  if (!container) return [];
  if (Array.isArray(container)) return container;
  if (typeof container === 'object' && container !== null && typeof container.entries === 'function') {
      try { return Array.from(container.values()); } catch (e) { /* ignore */ }
  }
  if (typeof container === 'object' && container !== null) return Object.values(container);
  return [];
}
function findNestedValue(obj, keyNames = ['topic', 'pairingTopic']) { /* ... unchanged ... */
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keyNames) { if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 10) { return obj[key]; } }
  return null;
}
function findAccountId(obj) { /* ... unchanged ... */
   if (!obj || typeof obj !== 'object') return null;
   if (obj.accountIds && Array.isArray(obj.accountIds) && obj.accountIds.length > 0 && typeof obj.accountIds[0] === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountIds[0])) { return obj.accountIds[0]; }
   if (obj.account && typeof obj.account === 'string' && /^\d+\.\d+\.\d+$/.test(obj.account)) { return obj.account; }
   if (obj.accountId && typeof obj.accountId === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountId)) { return obj.accountId; }
   if (Array.isArray(obj.accounts) && obj.accounts.length > 0 && typeof obj.accounts[0] === 'string' && obj.accounts[0].includes(':')) { const parts = obj.accounts[0].split(':'); if(parts.length === 3 && parts[0] === 'hedera' && /^\d+\.\d+\.\d+$/.test(parts[2])) { return parts[2]; } }
   return null;
}


export default function App() {
  const [hashconnect, setHashconnect] = useState(null);
  const [hederaAccountId, setHederaAccountId] = useState(null);
  const [topic, setTopic] = useState(null);
  const [client, setClient] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // ... (NFT form state, minting status state - kept for potential re-integration) ...
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftFile, setNftFile] = useState(null);
  const [isMinting, setIsMinting] = useState(false); // Used for both minting and listing load state
  const [mintMessage, setMintMessage] = useState(""); // Used for both minting and listing status/errors
  const [mintedTokenId, setMintedTokenId] = useState(null); // Keep for potential success message context

  const [ownedNfts, setOwnedNfts] = useState([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // States for Marketplace Listings
  const [marketListings, setMarketListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingError, setListingError] = useState(null);


  const hasInitialized = useRef(false);

  // --- Initialize HashConnect ---
  useEffect(() => {
    // ... (Your robust init useEffect - unchanged) ...
     if (hasInitialized.current) return;
    hasInitialized.current = true;
    let hcInstance = null;
     const initHashConnect = async () => {
      try {
        console.log("Creating HashConnect instance...");
        hcInstance = new HashConnect(LedgerId.TESTNET, WALLETCONNECT_PROJECT_ID, appMetadata, true);

        hcInstance.pairingEvent.on((data) => {
          try { console.log('pairingEvent received:', JSON.parse(JSON.stringify(data))); } catch (_) { console.log('pairingEvent received (raw):', data); }
          const acct = findAccountId(data);
          if (acct) { console.log('pairingEvent -> setting accountId:', acct); setHederaAccountId(acct); }
          else { console.warn("pairingEvent -> no accountId found."); }
          setIsConnecting(false);
        });

        hcInstance.disconnectionEvent.on((data) => {
          console.log('disconnectionEvent:', data);
          setHederaAccountId(null); setTopic(null); setClient(null);
        });

        hcInstance.connectionStatusChangeEvent.on((status) => { console.log("HashConnect status:", status); });

        console.log("Calling hcInstance.init()...");
        await hcInstance.init();
        console.log("hcInstance.init() completed.");
        try { console.log('hcData structure after init:', hcInstance.hcData); } catch (_) {}

        setHashconnect(hcInstance);
        console.log("Set hashconnect state.");

        // Attempt restore
         try {
           const pairings = hcInstance.hcData?.pairingData || [];
           console.log('Checking restored pairings:', pairings);
           if (pairings.length > 0) {
             const restoredPairing = pairings.find(p => findAccountId(p)) || pairings[pairings.length - 1] || pairings[0];
             if (restoredPairing) {
               console.log("Attempting state restoration from:", restoredPairing);
               const restoredAcct = findAccountId(restoredPairing);
               if (restoredAcct && !hederaAccountId) {
                 console.log("Restoring hederaAccountId from hcData:", restoredAcct);
                 setHederaAccountId(restoredAcct);
               }
             }
           } else { console.log("No pairings found to restore."); }
         } catch (e) { console.warn("Restore pairing failed:", e); }

      } catch (err) { console.error("initHashConnect error:", err); }
    };
    initHashConnect();
  }, []);


  // --- useEffect to Find Topic ---
  useEffect(() => {
    // ... (Your robust topic finding useEffect - unchanged and seems okay) ...
     if (!hashconnect || !hederaAccountId) { if (topic) { setTopic(null); } return; }
    console.log("Topic useEffect: Running check for account", hederaAccountId);
    let foundTopic = null;
    try {
        const pairings = hashconnect.hcData?.pairingData || [];
        const currentPairing = pairings.find(p => p.accountIds && p.accountIds.includes(hederaAccountId));
        if (currentPairing && currentPairing.topic && typeof currentPairing.topic === 'string') {
            foundTopic = currentPairing.topic;
            console.log("Topic useEffect: Found topic in hcData.pairingData:", foundTopic);
        } else { console.log("Topic useEffect: No matching pairing/topic found in hcData for", hederaAccountId, "Pairings:", pairings); }
    } catch (e) { console.warn("Topic useEffect: Error reading hcData.pairingData:", e); }
    if (topic !== foundTopic) { console.log(`Topic useEffect: Setting topic state to: ${foundTopic}`); setTopic(foundTopic); }
    else if (foundTopic) { console.log(`Topic useEffect: Topic state (${topic}) already matches found topic (${foundTopic}).`); }
    else { console.log(`Topic useEffect: Topic not found, ensuring state is null.`); if (topic !== null) setTopic(null); }
  }, [hashconnect, hederaAccountId, topic]); // topic dependency removed, rely on hc/accId


  // --- useEffect to Setup Hedera Client ---
  useEffect(() => {
    // ... (Client setup useEffect - unchanged and correct) ...
    if (hederaAccountId) {
      console.log("Setting up Hedera Client for account:", hederaAccountId);
      try {
        const configuredClient = Client.forTestnet().setOperator(hederaAccountId, PrivateKey.generateED25519());
        setClient(configuredClient);
        console.log("Hedera Client configured.");
      } catch (error) { console.error("Error configuring Hedera Client:", error); setClient(null); }
    } else { console.log("Clearing Hedera Client."); setClient(null); }
  }, [hederaAccountId]);

  // --- useEffect to Fetch NFTs ---
   useEffect(() => {
     // ... (NFT fetching useEffect - unchanged and correct) ...
      if (!hederaAccountId) { setOwnedNfts([]); setIsLoadingNfts(false); setFetchError(null); return; }
     setIsLoadingNfts(true); setOwnedNfts([]); setFetchError(null);
     const fetchNfts = async () => { /* ... Your implementation ... */ };
     fetchNfts();
   }, [hederaAccountId]);

  // --- <<< useEffect to Listen for Marketplace Listings >>> ---
  useEffect(() => {
    console.log("Setting up Firestore listener for listings...");
    setIsLoadingListings(true);
    setListingError(null);

    // *** USE SIMPLIFIED PATH ***
    const listingsCollectionPath = 'listings';
    console.log("Listening on Firestore path:", listingsCollectionPath);
    const q = query(collection(db, listingsCollectionPath), where("status", "==", "listed"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Firestore snapshot received.");
        const listings = [];
        querySnapshot.forEach((doc) => {
            listings.push({ id: doc.id, ...doc.data() }); // Include document ID
        });
        console.log("Fetched listings:", listings);
        setMarketListings(listings);
        setIsLoadingListings(false);
    }, (error) => { // Handle errors
        console.error("Error fetching listings from Firestore:", error);
        setListingError("Failed to load marketplace listings.");
        setIsLoadingListings(false);
    });

    // Cleanup function
    return () => {
        console.log("Unsubscribing from Firestore listener.");
        unsubscribe();
    };
  }, []); // Run once on mount


  // --- Wallet Actions ---
   const connectWallet = () => { /* ... unchanged ... */
     if (!hashconnect) return; setIsConnecting(true);
     setHederaAccountId(null); setTopic(null); setClient(null);
     hashconnect.openPairingModal();
   };
   const disconnectWallet = () => { /* ... unchanged ... */
     if (!hashconnect || !topic) { console.warn("Disconnect invalid state."); setHederaAccountId(null); setTopic(null); setClient(null); return; }
     console.log("Disconnecting topic:", topic); hashconnect.disconnect(topic);
   };


  // --- handleMint (Simplified Version - Keep commented out) ---
  const handleMint = async (e) => {
    e.preventDefault();
    setMintMessage("Minting is currently disabled.");
    console.log("handleMint called but is disabled.");
  };


  // --- handleListNft (Using Simplified Path) ---
  const handleListNft = async (e, tokenId, serialNumber) => {
    e.preventDefault();
    console.log(`--- Starting handleListNft for ${tokenId} #${serialNumber} ---`);

    const priceHbarString = e.target.elements.price.value;
    // ... (price validation) ...
    if (!priceHbarString || parseFloat(priceHbarString) <= 0) { alert("Invalid price."); return; }
    const priceHbar = parseFloat(priceHbarString);
    console.log(`handleListNft: Price entered = ${priceHbar} HBAR`);

    // Check remains the same
    console.log(`handleListNft: Checking conditions - client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`);
    if (!client || !hashconnect || !hederaAccountId || !topic) { /* ... error handling ... */
        const errorMsg = `Wallet/Client not ready: client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`; console.warn('handleList blocked:', errorMsg); alert("Wallet/Client not connected properly. Reconnect."); return;
    }

    setIsMinting(true); setMintMessage(`Listing NFT ${tokenId} #${serialNumber} for ${priceHbar} ℏ...`);

    try {
        // ... (NFT Transfer logic - unchanged) ...
        const nftTokenId = TokenId.fromString(tokenId);
        const sellerAccountId = AccountId.fromString(hederaAccountId);
        const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT_ID);
        const nftId = new NftId(nftTokenId, serialNumber);
        console.log(`handleListNft: Preparing TransferTransaction: ${nftId.toString()} from ${sellerAccountId.toString()} to ${treasuryAccountId.toString()}`);
        let transferTx = new TransferTransaction().addNftTransfer(nftId, sellerAccountId, treasuryAccountId);
        console.log("handleListNft: Freezing transfer tx with client...");
        const frozenTx = await transferTx.freezeWith(client); const transferTxBytes = frozenTx.toBytes(); console.log("handleListNft: Freeze transfer complete.");
        console.log("handleListNft: Sending transfer tx to HashPack (topic:", topic, ")");
        const transferResponse = await hashconnect.sendTransaction( topic, { topic: topic, byteArray: transferTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
        console.log("handleListNft: HashPack response received:", transferResponse);
        if (!transferResponse || !transferResponse.signedTransaction) { /* ... error handling ... */ throw new Error('HashPack signing failed'); }
        const signedTransferBytes = typeof transferResponse.signedTransaction === 'string' ? Buffer.from(transferResponse.signedTransaction, 'base64') : transferResponse.signedTransaction;
        console.log("handleListNft: Received signed bytes.");
        setMintMessage(`Processing transfer...`); console.log("handleListNft: Executing transfer tx...");
        const executedTransferTx = await Transaction.fromBytes(signedTransferBytes).execute(client);
        console.log("handleListNft: Getting transfer receipt..."); const transferReceipt = await executedTransferTx.getReceipt(client);
        console.log("handleListNft: Transfer Receipt:", transferReceipt); const transferStatus = transferReceipt.status.toString(); console.log("handleListNft: Transfer status:", transferStatus);
        if (transferStatus !== 'SUCCESS') { throw new Error(`Hedera tx failed: ${transferStatus}`); }


        setMintMessage(`Transfer successful! Adding listing to database...`);
        console.log("handleListNft: Adding listing to Firestore...");
        // *** USE SIMPLIFIED PATH ***
        const listingsCollectionPath = 'listings';
        console.log("Using Firestore collection path:", listingsCollectionPath);
        const listingsCol = collection(db, listingsCollectionPath);
        const listingData = { // ... (listing data object unchanged) ...
             nftTokenId: tokenId, serialNumber: serialNumber, sellerAccountId: hederaAccountId,
            priceHbar: priceHbar, status: 'listed', listedAt: serverTimestamp(),
            nftName: ownedNfts.find(n => n.tokenId === tokenId && n.serialNumber === serialNumber)?.name || 'Unknown',
            nftImageUrl: ownedNfts.find(n => n.tokenId === tokenId && n.serialNumber === serialNumber)?.imageUrl || ''
        };
        const docRef = await addDoc(listingsCol, listingData);
        console.log("handleListNft: Firestore Doc ID: ", docRef.id);

      setMintMessage(`NFT ${tokenId} #${serialNumber} listed for ${priceHbar} ℏ!`);
      setOwnedNfts(prev => prev.filter(n => !(n.tokenId === tokenId && n.serialNumber === serialNumber)));

    } catch (err) { // ... (error handling unchanged) ...
       console.error("Listing error:", err); let displayError = err.message || 'An unknown error occurred';
       if (err.toString && err.toString().includes('USER_REJECT')) displayError = 'Rejected in HashPack.'; else if (err.status) { displayError = `Hedera Network Error: ${err.status.toString()} - ${err.message}`; } else if (err.code && err.name === 'FirebaseError') { displayError = `Database Error: ${err.code} - ${err.message}`; } else if (err.message?.includes("topic") || err.message?.includes("session")) {displayError = `Connection Error: ${err.message}`;} else if (err.message?.includes("insufficient account balance")) {displayError = `Hedera Error: Insufficient HBAR for fee.`;} else if (err.message?.includes("INVALID_TOKEN_NFT_SERIAL_NUMBER")) {displayError = `Hedera Error: Ownership/Serial invalid.`;} else if (err.message?.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {displayError = `Hedera Error: Treasury (${TREASURY_ACCOUNT_ID}) not associated with token (${tokenId}).`;} setMintMessage(`Listing Failed: ${displayError}`);
    } finally { setIsMinting(false); }
  };

  // --- <<< NEW Buy NFT Function >>> ---
  const handleBuyNft = async (listing) => {
      console.log(`--- Starting handleBuyNft for Listing ID: ${listing.id}, NFT: ${listing.nftTokenId} #${listing.serialNumber} ---`);
      setMintMessage(""); // Clear previous messages

      // --- 1. Check Connection State ---
      console.log(`handleBuy: Checking conditions - client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`);
      if (!client || !hashconnect || !hederaAccountId || !topic) {
          alert("Wallet/Client not connected properly. Please reconnect.");
          return;
      }

      // Prevent buying own NFT
      if (listing.sellerAccountId === hederaAccountId) {
          alert("You cannot buy your own listed NFT.");
          return;
      }

      setIsMinting(true); // Reuse loading state
      setMintMessage(`Processing purchase for ${listing.nftName}...`);

      try {
          // --- 2. Buyer Pays Seller (HBAR Transfer) ---
          setMintMessage(`Step 1/3: Sending ${listing.priceHbar} ℏ to seller ${listing.sellerAccountId}... (Approve in Wallet)`);
          console.log(`handleBuy: Preparing HBAR transfer from ${hederaAccountId} to ${listing.sellerAccountId} for ${listing.priceHbar} HBAR`);

          let paymentTx = new TransferTransaction()
              .addHbarTransfer(hederaAccountId, Hbar.fromTinybars(listing.priceHbar * -100_000_000)) // Buyer sends (negative)
              .addHbarTransfer(listing.sellerAccountId, Hbar.fromTinybars(listing.priceHbar * 100_000_000)); // Seller receives (positive)
              // Note: Conversion assumes priceHbar is a standard number. Tinybar conversion is price * 10^8.

          console.log("handleBuy: Freezing HBAR payment tx with client...");
          const frozenPaymentTx = await paymentTx.freezeWith(client);
          const paymentTxBytes = frozenPaymentTx.toBytes();
          console.log("handleBuy: Freeze HBAR payment complete.");

          console.log("handleBuy: Sending HBAR payment tx to HashPack (topic:", topic, ")");
          const paymentResponse = await hashconnect.sendTransaction( topic, { topic: topic, byteArray: paymentTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
          console.log("handleBuy: HashPack response for payment:", paymentResponse);
          if (!paymentResponse || !paymentResponse.signedTransaction) {
             if (paymentResponse?.error?.message?.includes("USER_REJECT")) throw new Error('HBAR Payment rejected in HashPack.');
             throw new Error(`HashPack signing failed for HBAR payment: ${paymentResponse?.error?.message || 'Unknown error'}`);
          }
          const signedPaymentBytes = typeof paymentResponse.signedTransaction === 'string' ? Buffer.from(paymentResponse.signedTransaction, 'base64') : paymentResponse.signedTransaction;
          console.log("handleBuy: Received signed HBAR payment bytes.");

          setMintMessage(`Step 2/3: Processing HBAR payment... (Waiting for Hedera confirmation)`);
          console.log("handleBuy: Executing HBAR payment tx...");
          const executedPaymentTx = await Transaction.fromBytes(signedPaymentBytes).execute(client);
          console.log("handleBuy: Getting HBAR payment receipt...");
          const paymentReceipt = await executedPaymentTx.getReceipt(client);
          const paymentStatus = paymentReceipt.status.toString();
          console.log("handleBuy: HBAR Payment Receipt:", paymentReceipt);
          console.log("handleBuy: HBAR Payment status:", paymentStatus);
          if (paymentStatus !== 'SUCCESS') {
              throw new Error(`HBAR payment transaction failed: ${paymentStatus}`);
          }
          console.log("handleBuy: HBAR Payment successful!");
          setMintMessage(`Step 3/3: Payment Confirmed! Transferring NFT...`);


          // --- 3. Treasury Sends NFT to Buyer ---
          // !!! SECURITY WARNING !!!
          // Hardcoding private keys in the frontend is EXTREMELY INSECURE.
          // This is ONLY for a quick hackathon demo.
          // In a real app, this MUST be handled by a backend server.
          console.warn("!!! SECURITY WARNING: Using hardcoded Treasury Private Key for demo !!!");
          const TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY = "PASTE_YOUR_TREASURY_PRIVATE_KEY_HERE"; // <<< --- !!! REPLACE THIS !!!

          if (TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY === "PASTE_YOUR_TREASURY_PRIVATE_KEY_HERE") {
               throw new Error("Treasury Private Key not set in code for demo transfer.");
          }

          // Create a temporary client FOR THE TREASURY to sign the NFT transfer
          const treasuryClient = Client.forTestnet().setOperator(TREASURY_ACCOUNT_ID, TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY);

          const nftTokenId = TokenId.fromString(listing.nftTokenId);
          const buyerAccountId = AccountId.fromString(hederaAccountId); // The current user is the buyer
          const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT_ID);
          const nftId = new NftId(nftTokenId, listing.serialNumber);

          console.log(`handleBuy: Preparing NFT transfer: ${nftId.toString()} from Treasury ${treasuryAccountId.toString()} to Buyer ${buyerAccountId.toString()}`);
          let nftTransferTx = new TransferTransaction()
              .addNftTransfer(nftId, treasuryAccountId, buyerAccountId) // Treasury sends, Buyer receives
              .freezeWith(treasuryClient); // Freeze using the TREASURY client

          // Sign transaction using the TREASURY key
          const signedNftTransferTx = await nftTransferTx.sign(PrivateKey.fromString(TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY));

          console.log("handleBuy: Executing NFT transfer from Treasury...");
          const executedNftTransferTx = await signedNftTransferTx.execute(treasuryClient);
          console.log("handleBuy: Getting NFT transfer receipt...");
          const nftTransferReceipt = await executedNftTransferTx.getReceipt(treasuryClient);
          const nftTransferStatus = nftTransferReceipt.status.toString();
          console.log("handleBuy: NFT Transfer Receipt:", nftTransferReceipt);
          console.log("handleBuy: NFT Transfer status:", nftTransferStatus);
          if (nftTransferStatus !== 'SUCCESS') {
              // Attempt to compensate? Difficult in frontend. Log error.
              throw new Error(`NFT transfer from Treasury failed: ${nftTransferStatus}. Payment was sent, but NFT not received!`);
          }
          console.log("handleBuy: NFT Transfer from Treasury successful!");


          // --- 4. Update Firestore Listing Status ---
          setMintMessage(`Updating listing status in database...`);
          console.log("handleBuy: Updating Firestore listing status to 'sold' for doc:", listing.id);
          const listingDocRef = doc(db, 'listings', listing.id); // Use simple path 'listings'
          await updateDoc(listingDocRef, {
              status: 'sold',
              buyerAccountId: hederaAccountId, // Record the buyer
              soldAt: serverTimestamp() // Record time of sale
          });
          console.log("handleBuy: Firestore update complete.");

          // --- Success ---
          setMintMessage(`Purchase Complete! You received NFT ${listing.nftTokenId} #${listing.serialNumber}.`);
          // The Firestore listener will automatically remove the item from the marketplace view
          // We might need to trigger a refresh of the user's owned NFTs if they stay on the page
          // For now, let's just show the success message.


      } catch (err) {
          console.error("Buying error:", err);
          // Use similar detailed error handling as handleMint/handleList
           let displayError = err.message || 'An unknown error occurred during purchase.';
           if (err.toString && err.toString().includes('USER_REJECT')) { displayError = 'Payment rejected in HashPack.'; }
           else if (err.status) { displayError = `Hedera Network Error: ${err.status.toString()} - ${err.message}`; }
           else if (err.code && err.name === 'FirebaseError') { displayError = `Database Error: ${err.code} - ${err.message}`; }
           else if (err.message?.includes("topic") || err.message?.includes("session")) {displayError = `Connection Error: ${err.message}`;}
           else if (err.message?.includes("insufficient account balance")) {displayError = `Hedera Error: Insufficient HBAR for payment or fee.`;}
           else if (err.message?.includes("NFT transfer from Treasury failed")) {displayError = `CRITICAL ERROR: ${err.message}`;} // Highlight critical failure
           setMintMessage(`Purchase Failed: ${displayError}`);
      } finally {
          setIsMinting(false); // Stop loading indicator
      }
  }; // End of handleBuyNft

  // --- UI (JSX) ---
  return (
    // ... (Your JSX structure - unchanged, Marketplace section uses marketListings state) ...
     <div className="app-container">
       {/* Header */}
       <header className="app-header">
         <div className="logo-title">Gamer's Mint</div>
         <button onClick={hederaAccountId ? disconnectWallet : connectWallet} disabled={!hashconnect || isConnecting} className={`connect-button ${hederaAccountId ? 'connected' : ''}`}>
           {hederaAccountId ? (<div className="wallet-info-connected">{hederaAccountId.substring(0, 5)}...{hederaAccountId.substring(hederaAccountId.length - 4)}<span className="disconnect-icon">Disconnect?</span></div>)
            : (!hashconnect ? "Initializing..." : (isConnecting ? "Connecting..." : "Connect Wallet"))}
         </button>
       </header>

        {/* Main Content */}
       <main className="app-main">
         {hederaAccountId ? (
           <div className="content-area">
             {/* --- MINTING SECTION COMMENTED OUT --- */}
              {/*
             <div className="mint-container">
               <h2>Create a New Game NFT</h2>
               <form className="mint-form" onSubmit={handleMint}>
                 <div className="form-group"><label htmlFor="nft-name">NFT Name</label><input id="nft-name" type="text" value={nftName} onChange={(e) => setNftName(e.target.value)} placeholder="e.g. Diamond Sword" required /></div>
                 <div className="form-group"><label htmlFor="nft-description">Description</label><textarea id="nft-description" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} placeholder="e.g. A rare sword +10 attack." required /></div>
                 <div className="form-group"><label htmlFor="nft-file">Image File</label><input id="nft-file" type="file" onChange={(e) => setNftFile(e.target.files[0])} required accept="image/*" /></div>
                 <button type="submit" className="mint-button" disabled={isMinting}>{isMinting ? "Processing..." : "Mint NFT (Disabled)"}</button>
                 {mintMessage && (<div className={`mint-message ${mintedTokenId ? 'success' : (mintMessage.toLowerCase().includes('error') || mintMessage.toLowerCase().includes('failed')) ? 'error' : 'info'}`}>{mintMessage}</div>)}
               </form>
             </div>
              */}

             {/* Status message area (moved outside form) */}
             {mintMessage && !isMinting && (
                 <div className={`mint-message ${mintedTokenId ? 'success' : (mintMessage.toLowerCase().includes('error') || mintMessage.toLowerCase().includes('failed')) ? 'error' : 'info'}`}>
                    {mintMessage}
                 </div>
             )}

             {/* Owned NFTs Section */}
             <div className="my-nfts-container">
                <h2>My NFTs</h2>
               {isLoadingNfts && <p className="loading-message">Loading your NFTs...</p>}
               {fetchError && <p className="error-message">Error loading NFTs: {fetchError}</p>}
               {!isLoadingNfts && !fetchError && ownedNfts.length === 0 && (<p className="info-message">No NFTs found for account {hederaAccountId} on Testnet.</p>)}
               {!isLoadingNfts && !fetchError && ownedNfts.length > 0 && (
                 <div className="nft-gallery">
                   {ownedNfts.map((nft) => (
                     <form key={`${nft.tokenId}-${nft.serialNumber}`} className="nft-card-form" onSubmit={(e) => handleListNft(e, nft.tokenId, nft.serialNumber)}>
                       <div className="nft-card">
                         <img src={nft.imageUrl} alt={nft.name} className="nft-image" onError={(ev) => { ev.target.onerror = null; ev.target.src='https://placehold.co/100x100/555/FFF?text=Error'; }} />
                         <div className="nft-info">
                           <h3 className="nft-name">{nft.name}</h3>
                           <p className="nft-id">ID: {nft.tokenId}</p>
                           <p className="nft-serial">Serial: #{nft.serialNumber}</p>
                           <div className="list-controls">
                             <input type="number" name="price" placeholder="Price (ℏ)" min="0.00000001" step="0.00000001" required className="price-input" onClick={(ev) => ev.stopPropagation()} onKeyDown={(ev) => ev.stopPropagation()} />
                             <button type="submit" className="list-button" disabled={isMinting || isLoadingNfts} onClick={(ev) => ev.stopPropagation()}>List</button>
                           </div>
                         </div>
                       </div>
                     </form>
                   ))}
                 </div>
               )}
             </div>

             {/* Marketplace Listings Section */}
              <div className="marketplace-container">
               <h2>Marketplace Listings</h2>
               {isLoadingListings && <p className="loading-message">Loading listings...</p>}
               {listingError && <p className="error-message">{listingError}</p>}
               {!isLoadingListings && !listingError && marketListings.length === 0 && (<p className="info-message">No NFTs currently listed for sale.</p>)}
               {!isLoadingListings && !listingError && marketListings.length > 0 && (
                 <div className="nft-gallery">
                   {marketListings.map((listing) => (
                     <div key={listing.id} className="nft-card">
                       <img src={listing.nftImageUrl || 'https://placehold.co/180x180/555/FFF?text=No+Image'} alt={listing.nftName || 'Listed NFT'} className="nft-image" onError={(ev) => { ev.target.onerror = null; ev.target.src='https://placehold.co/100x100/555/FFF?text=Error'; }}/>
                       <div className="nft-info">
                         <h3 className="nft-name">{listing.nftName || 'Unnamed NFT'}</h3>
                         <p className="nft-id">ID: {listing.nftTokenId}</p>
                         <p className="nft-serial">Serial: #{listing.serialNumber}</p>
                         <p className="nft-price">Price: {listing.priceHbar} ℏ</p>
                         <p className="nft-seller">Seller: {listing.sellerAccountId ? `${listing.sellerAccountId.substring(0, 5)}...${listing.sellerAccountId.substring(listing.sellerAccountId.length - 4)}` : 'Unknown'}</p>
                         <button className="buy-button" onClick={() => alert(`Buying ${listing.nftName} not implemented yet.`)} disabled={isMinting || isLoadingListings || listing.sellerAccountId === hederaAccountId}> Buy </button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

           </div>
         ) : (
           <div className="welcome-container"><h1>Welcome</h1><p>Connect wallet to start.</p></div>
         )}
       </main>
     </div>
  );
}

