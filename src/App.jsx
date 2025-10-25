import React, { useState, useEffect, useRef } from 'react';
import { HashConnect } from 'hashconnect/dist/hashconnect';
import {
  LedgerId,
  Client,
  AccountId,
  TokenId,
  PrivateKey,
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

import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc
} from "firebase/firestore";

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = "dfe22a1aca8d834168d51a5ac05cec7b";
const PINATA_JWT_KEY = "PeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNzBmYjgyZS1hODEwLTRmOGQtYWVmZS1iYTE4Y2E0NjQzMzciLCJlbWFpbCI6Imthcm9sb255YW5nbzE4QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxM2Y3ZmYwOGE3ZmVjYzc2ZDk2YSIsInNjb3BlZEtleVNlY3JldCI6ImU4ZTEyYWQxOGQxNjgxOTE1NmQ5ZGY0MDZhOWY4MmM1ZGFjOGYwODNmMWYxYmViM2RlNWQ0MDY5ODk0M2FkMTQiLCJleHAiOjE3OTI3ODY4NzZ9.MlhnKv0ZclqWZFqgpjYv3hGHdJzXlZ6TRM3kSyYsKEA";
const TREASURY_ACCOUNT_ID = "0.0.7118383";

const appMetadata = {
  name: "Gamer's Mint Marketplace",
  description: "A Hedera NFT marketplace for gamers.",
  icons: ["https://placehold.co/128x128/1A1A2E/E94560?text=LOGO"]
};

// --- Helpers ---
function base64ToUtf8(base64) {
  try { const binary = atob(base64); const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }
  catch (e) { console.error("Failed to decode base64:", base64, e); return ""; }
}
function normalizePairings(container) {
  if (!container) return [];
  if (Array.isArray(container)) return container;
  if (typeof container === 'object' && container !== null) {
      try { return Object.values(container); } catch (e) { /* ignore */ }
  }
  return [];
}
function findAccountId(obj) {
   if (!obj || typeof obj !== 'object') return null;
   if (obj.accountIds && Array.isArray(obj.accountIds) && obj.accountIds.length > 0 && typeof obj.accountIds[0] === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountIds[0])) { return obj.accountIds[0]; }
   if (obj.account && typeof obj.account === 'string' && /^\d+\.\d+\.\d+$/.test(obj.account)) { return obj.account; }
   if (obj.accountId && typeof obj.accountId === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountId)) { return obj.accountId; }
   if (Array.isArray(obj.accounts) && obj.accounts.length > 0 && typeof obj.accounts[0] === 'string' && obj.accounts[0].includes(':')) {
     const parts = obj.accounts[0].split(':');
     if(parts.length === 3 && parts[0] === 'hedera' && /^\d+\.\d+\.\d+$/.test(parts[2])) { return parts[2]; }
   }
   return null;
}
function isHexTopic(s) { return typeof s === 'string' && /^[0-9a-fA-F]{32,}$/.test(s); }
function isValidTopicCandidate(s) {
  if (!s || typeof s !== 'string') return false;
  if (s.length < 20) return false;
  return isHexTopic(s) || /^[A-Za-z0-9\-_:.]{20,}$/.test(s);
}

// Extract a usable topic from hcData pairings (handles object keyed-by-topic)
function extractTopicFromHcData(hcData, accountId) {
  if (!hcData) return null;
  const pairings = hcData.pairings || hcData.pairingData || hcData.savedPairings;
  if (!pairings) return null;

  // If pairings is object keyed by topic strings
  if (!Array.isArray(pairings) && typeof pairings === 'object') {
    for (const [key, val] of Object.entries(pairings)) {
      if (isValidTopicCandidate(key)) {
        const acct = findAccountId(val) || (val?.accountIds && val.accountIds[0]);
        if (!accountId || acct === accountId) return key;
      }
    }
    // fallback: inspect values for explicit topic fields
    for (const val of Object.values(pairings)) {
      const explicit = val?.topic || val?.pairingTopic || val?.topicId || val?.topicString;
      if (isValidTopicCandidate(explicit)) return explicit;
    }
  } else {
    // array form
    const list = normalizePairings(pairings);
    if (!list || list.length === 0) return null;
    if (accountId) {
      const matched = list.find(p => {
        const acct = findAccountId(p) || (p?.accountIds && p.accountIds[0]);
        return acct && acct === accountId;
      });
      if (matched) {
        const explicit = matched.topic || matched.pairingTopic || matched.topicId || matched.topicString;
        if (isValidTopicCandidate(explicit)) return explicit;
        // maybe pairing element doesn't include topic field; ignore
      }
    }
    // fallback to any explicit
    for (const p of list) {
      const explicit = p.topic || p.pairingTopic || p.topicId || p.topicString;
      if (isValidTopicCandidate(explicit)) return explicit;
    }
  }
  return null;
}

export default function App() {
  const [hashconnect, setHashconnect] = useState(null);
  const [hederaAccountId, setHederaAccountId] = useState(null);
  const [topic, setTopic] = useState(null);
  const [client, setClient] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [nftFile, setNftFile] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintMessage, setMintMessage] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState(null);

  const [ownedNfts, setOwnedNfts] = useState([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [marketListings, setMarketListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingError, setListingError] = useState(null);

  const hasInitialized = useRef(false);

  // --- Initialize HashConnect ---
  useEffect(() => {
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
          if (acct) {
            console.log('pairingEvent -> setting accountId:', acct);
            setHederaAccountId(acct);
            try { localStorage.setItem('hc_saved_account', acct); } catch (_) {}
          } else {
            console.warn("pairingEvent -> no accountId found.");
          }

          // try to derive topic right away from hcData or from pairing payload
          try {
            const explicit = data.topic || data.pairingTopic || data.topicId || data.topicString;
            let derived = null;
            if (isValidTopicCandidate(explicit)) derived = explicit;
            else derived = extractTopicFromHcData(hcInstance.hcData, acct) || localStorage.getItem('hc_saved_topic');

            if (derived) {
              console.log('pairingEvent -> derived topic:', derived);
              setTopic(derived);
              try { localStorage.setItem('hc_saved_topic', derived); } catch (_) {}
            } else {
              console.log('pairingEvent -> no valid topic found on event; will try hcData later.');
            }
          } catch (e) { console.warn('pairingEvent topic derive failed', e); }

          setIsConnecting(false);
        });

        hcInstance.disconnectionEvent.on((data) => {
          console.log('disconnectionEvent:', data);
          setHederaAccountId(null); setTopic(null); setClient(null);
          try { localStorage.removeItem('hc_saved_topic'); localStorage.removeItem('hc_saved_account'); } catch (_) {}
        });

        hcInstance.connectionStatusChangeEvent.on((status) => { console.log("HashConnect status:", status); });

        console.log("Calling hcInstance.init()...");
        await hcInstance.init();
        console.log("hcInstance.init() completed.");
        try { console.log('hcData structure after init:', hcInstance.hcData); } catch (_) {}

        // store instance
        setHashconnect(hcInstance);
        console.log("Set hashconnect state.");

        // Attempt restore: check hcData for pairings (handles object keyed-by-topic)
         try {
           const savedAccount = localStorage.getItem('hc_saved_account');
           const savedTopic = localStorage.getItem('hc_saved_topic');

           // Prefer saved account if exists
           if (savedAccount) {
             console.log('Restoring account from localStorage:', savedAccount);
             setHederaAccountId(savedAccount);
           } else {
             // try to find an account inside hcData pairings
             const pairingsContainer = hcInstance.hcData?.pairings || hcInstance.hcData?.pairingData || hcInstance.hcData?.savedPairings;
             const list = normalizePairings(pairingsContainer);
             if (list && list.length > 0) {
               for (const p of list) {
                 const acct = findAccountId(p) || (p?.accountIds && p.accountIds[0]);
                 if (acct) { setHederaAccountId(acct); try { localStorage.setItem('hc_saved_account', acct); } catch(_){} break; }
               }
             }
           }

           // restore topic: check hcData first, then localStorage
           const topicFromHc = extractTopicFromHcData(hcInstance.hcData, savedAccount || null);
           const finalTopic = topicFromHc || savedTopic || findTopicInLocalStorageFallback();
           if (finalTopic) {
             console.log('Restored topic from hcData/storage:', finalTopic);
             setTopic(finalTopic);
             try { localStorage.setItem('hc_saved_topic', finalTopic); } catch (_) {}
           } else {
             console.log('No topic restored from hcData/local storage.');
           }

         } catch (e) { console.warn("Restore pairing failed:", e); }

      } catch (err) { console.error("initHashConnect error:", err); }
    };
    initHashConnect();
  }, []);

  // helper fallback scanner for localStorage/sessionStorage (keeps previous function name used in code)
  function findTopicInLocalStorageFallback() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try {
          const v = localStorage.getItem(k);
          if (!v) continue;
          try {
            const parsed = JSON.parse(v);
            const explicit = parsed?.topic || parsed?.pairingTopic || parsed?.topicId || parsed?.topicString;
            if (isValidTopicCandidate(explicit)) return explicit;
            const nested = normalizePairings(parsed)?.find(p => isValidTopicCandidate(p?.topic))?.topic;
            if (nested) return nested;
          } catch (_) {
            // raw string scan for hex/topic-like tokens
            const m = v.match(/[0-9a-fA-F]{32,}/);
            if (m && isValidTopicCandidate(m[0])) return m[0];
            const m2 = v.match(/[A-Za-z0-9\-_:.]{20,}/);
            if (m2 && isValidTopicCandidate(m2[0])) return m2[0];
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  // --- useEffect to Find Topic ---
  useEffect(() => {
    if (!hashconnect || !hederaAccountId) {
      if (topic) { console.log("Topic useEffect: Clearing topic (no hc or accountId)."); setTopic(null); }
      return;
    }
    console.log("Topic useEffect: Running check for account", hederaAccountId);

    // 1) try hcInstance.hcData pairings (may be object keyed by topic)
    const tFromHc = extractTopicFromHcData(hashconnect?.hcData, hederaAccountId);
    if (tFromHc) {
      if (tFromHc !== topic) {
        console.log("Topic useEffect: Found topic in hcData:", tFromHc);
        setTopic(tFromHc);
        try { localStorage.setItem('hc_saved_topic', tFromHc); } catch (_) {}
      } else {
        console.log("Topic useEffect: topic already set to", topic);
      }
      return;
    }

    // 2) fallback to pairingData array if present
    const pairingsArray = hashconnect?.hcData?.pairingData;
    if (Array.isArray(pairingsArray)) {
      const currentPairing = pairingsArray.find(p => p.accountIds && p.accountIds.includes(hederaAccountId));
      if (currentPairing && currentPairing.topic && isValidTopicCandidate(currentPairing.topic)) {
         console.log("Topic useEffect: Found topic in pairingData array:", currentPairing.topic);
         setTopic(currentPairing.topic);
         try { localStorage.setItem('hc_saved_topic', currentPairing.topic); } catch (_) {}
         return;
      }
    }

    // 3) fallback localStorage
    const saved = localStorage.getItem('hc_saved_topic') || findTopicInLocalStorageFallback();
    if (saved && saved !== topic) {
      console.log("Topic useEffect: Restored topic from storage:", saved);
      setTopic(saved);
      return;
    }

    console.log("Topic useEffect: No topic found yet.");
  }, [hashconnect, hederaAccountId]); // removed topic dependency to avoid loops

  // --- Setup Hedera client ---
  useEffect(() => {
    if (hederaAccountId) {
      console.log("Setting up Hedera Client for account:", hederaAccountId);
      try {
        // do NOT set a fake operator private key; leaving client without operator used with freezeWith/execute pattern works
        const configuredClient = Client.forTestnet();
        setClient(configuredClient);
        console.log("Hedera Client configured.");
      } catch (error) { console.error("Error configuring Hedera Client:", error); setClient(null); }
    } else { console.log("Clearing Hedera Client."); setClient(null); }
  }, [hederaAccountId]);

  // --- NFT fetch + Firestore listeners keep as-is (no change) ---
  useEffect(() => {
     if (!hederaAccountId) { setOwnedNfts([]); setIsLoadingNfts(false); setFetchError(null); return; }
     setIsLoadingNfts(true); setOwnedNfts([]); setFetchError(null);
     const fetchNfts = async () => {
         console.log("NFT Fetch useEffect: Fetching NFTs for account:", hederaAccountId);
          try {
            const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${hederaAccountId}/nfts?limit=50`;
            const response = await fetch(mirrorNodeUrl);
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Mirror Node API Error ${response.status}: ${errorText}`); }
            const data = await response.json();
             console.log("NFT Fetch useEffect: Mirror Node NFT Response:", data);
            if (!data.nfts || data.nfts.length === 0) { console.log("NFT Fetch useEffect: No NFTs found."); return; }
            console.log(`NFT Fetch useEffect: Processing ${data.nfts.length} NFTs...`);
            const nftPromises = data.nfts.map(async (nft) => {
               try {
                if (!nft.metadata) return null;
                const metadataUri = base64ToUtf8(nft.metadata);
                if (!metadataUri || !metadataUri.startsWith('ipfs://')) { console.warn(`Skipping NFT ${nft.token_id}#${nft.serial_number}: Invalid URI "${metadataUri}"`); return null; }
                const cidAndPath = metadataUri.substring(7);
                const metadataUrl = `https://gateway.pinata.cloud/ipfs/${cidAndPath}`;
                const metaResponse = await fetch(metadataUrl);
                if (!metaResponse.ok) { console.warn(`Skipping NFT ${nft.token_id}#${nft.serial_number}: Failed fetch ${metadataUrl} (${metaResponse.status})`); return null; }
                let metadataJson; try { metadataJson = await metaResponse.json(); } catch (jsonError) { console.warn(`Skipping NFT ${nft.token_id}#${nft.serial_number}: Failed JSON parse ${metadataUrl}`, jsonError); return null; }
                let imageUrl = metadataJson.image || 'https://placehold.co/100x100/333/FFF?text=No+Image';
                if (metadataJson.image && metadataJson.image.startsWith('ipfs://')) { const imageCidAndPath = metadataJson.image.substring(7); imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCidAndPath}`; }
                return { tokenId: nft.token_id, serialNumber: parseInt(nft.serial_number, 10), name: metadataJson.name || 'Unnamed NFT', description: metadataJson.description || '', imageUrl };
              } catch (err) { console.error(`Error processing NFT ${nft.token_id}#${nft.serial_number}:`, err); return null; }
            });
            const processed = (await Promise.all(nftPromises)).filter(Boolean);
            console.log("NFT Fetch useEffect: Processed NFTs:", processed);
            setOwnedNfts(processed);
          } catch (err) { console.error("NFT Fetch useEffect: Error fetching NFTs:", err); setFetchError(err.message || String(err)); }
          finally { console.log("NFT Fetch useEffect: Setting isLoadingNfts to false."); setIsLoadingNfts(false); }
     };
     fetchNfts();
   }, [hederaAccountId]);

  useEffect(() => {
    console.log("Setting up Firestore listener for listings...");
    setIsLoadingListings(true);
    setListingError(null);
    const listingsCollectionPath = 'listings';
    const q = query(collection(db, listingsCollectionPath), where("status", "==", "listed"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("Firestore snapshot received.");
        const listings = [];
        querySnapshot.forEach((docSnap) => { listings.push({ id: docSnap.id, ...docSnap.data() }); });
        console.log("Fetched listings:", listings);
        setMarketListings(listings);
        setIsLoadingListings(false);
    }, (error) => {
        console.error("Error fetching listings from Firestore:", error);
        setListingError("Failed to load marketplace listings.");
        setIsLoadingListings(false);
    });
    return () => { console.log("Unsubscribing from Firestore listener."); unsubscribe(); };
  }, []);

  // --- Wallet Actions ---
   const connectWallet = () => {
     if (!hashconnect) return; setIsConnecting(true);
     setHederaAccountId(null); setTopic(null); setClient(null);
     hashconnect.openPairingModal();
   };
   const disconnectWallet = () => {
     if (!hashconnect || !topic) { console.warn("Disconnect invalid state."); setHederaAccountId(null); setTopic(null); setClient(null); return; }
     console.log("Disconnecting topic:", topic); try { hashconnect.disconnect(topic); } catch(e){ console.warn(e); }
     try { localStorage.removeItem('hc_saved_topic'); localStorage.removeItem('hc_saved_account'); } catch(_) {}
   };

  // derive effective topic (prefer real topic, then storage)
  function deriveEffectiveTopic() {
    if (isValidTopicCandidate(topic)) return topic;
    const t = extractTopicFromHcData(hashconnect?.hcData, hederaAccountId);
    if (isValidTopicCandidate(t)) return t;
    const saved = localStorage.getItem('hc_saved_topic') || findTopicInLocalStorageFallback();
    if (isValidTopicCandidate(saved)) return saved;
    return null;
  }

  // --- Mint flow ---
  const handleMint = async (e) => {
    e.preventDefault();
    setMintMessage("");
    setMintedTokenId(null);

    const effTopic = deriveEffectiveTopic();
    console.log(`handleMint: Checking conditions - client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${effTopic}`);
    if (!client || !hashconnect || !hederaAccountId || !effTopic) {
      const errorMsg = `Wallet/Client not ready: client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${effTopic}`;
      console.warn('handleMint blocked:', errorMsg);
      setMintMessage("Error: Wallet/Client not connected properly. Please reconnect (approve pairing in wallet if needed).");
      if (hashconnect) { setIsConnecting(true); hashconnect.openPairingModal(); }
      return;
    }

    if (!nftFile || !nftName || !nftDescription) {
      setMintMessage("Error: Fill all fields and select a file."); return;
    }

    setIsMinting(true);
    setMintMessage("1/4: Uploading image...");

    try {
      const imageFormData = new FormData(); imageFormData.append("file", nftFile, nftFile.name);
      const imageUploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', { method: 'POST', headers: { Authorization: `Bearer ${PINATA_JWT_KEY}` }, body: imageFormData });
      if (!imageUploadResponse.ok) throw new Error(`IPFS Image Fail: ${await imageUploadResponse.text()}`);
      const imageUploadResult = await imageUploadResponse.json(); const imageCid = imageUploadResult.IpfsHash;

      setMintMessage("2/4: Uploading metadata...");
      const metadata = { name: nftName, description: nftDescription, image: `ipfs://${imageCid}`, properties: { rarity: "Common", power: 10 } };
      const metadataUploadResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', { method: 'POST', headers: { Authorization: `Bearer ${PINATA_JWT_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pinataContent: metadata }) });
      if (!metadataUploadResponse.ok) throw new Error(`IPFS Meta Fail: ${await metadataUploadResponse.text()}`);
      const metadataUploadResult = await metadataUploadResponse.json(); const metadataCid = metadataUploadResult.IpfsHash; const metadataIpfsUrl = `ipfs://${metadataCid}`;

      setMintMessage("3/4: Creating token... (Approve in wallet)");
      let createTokenTx = new TokenCreateTransaction()
         .setTokenName(nftName).setTokenSymbol("GAME").setTokenType(TokenType.NonFungibleUnique)
         .setDecimals(0).setInitialSupply(0).setTreasuryAccountId(hederaAccountId)
         .setSupplyType(TokenSupplyType.Finite).setMaxSupply(250);

      const frozenCreateTx = await createTokenTx.freezeWith(client); const createTxBytes = frozenCreateTx.toBytes();
      const createResponse = await hashconnect.sendTransaction( effTopic, { topic: effTopic, byteArray: createTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
      if (!createResponse || !createResponse.signedTransaction) throw new Error(`Wallet sign fail (create): ${createResponse?.error?.message || 'Unknown'}`);
      const userSignedCreateBytes = typeof createResponse.signedTransaction === 'string' ? Buffer.from(createResponse.signedTransaction, 'base64') : createResponse.signedTransaction;
      const executedCreateTx = await Transaction.fromBytes(userSignedCreateBytes).execute(client);
      const createReceipt = await executedCreateTx.getReceipt(client);
      const newTokenId = createReceipt.tokenId;
      if (!newTokenId) throw new Error("Token ID not created.");

      setMintMessage("4/4: Minting metadata... (Approve in wallet)");
      const metadataBytes = Buffer.from(metadataIpfsUrl);
      let mintTx = new TokenMintTransaction().setTokenId(newTokenId).setMetadata([metadataBytes]);
      const frozenMintTx = await mintTx.freezeWith(client); const mintTxBytes = frozenMintTx.toBytes();
      const mintResponse = await hashconnect.sendTransaction( effTopic, { topic: effTopic, byteArray: mintTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
      if (!mintResponse || !mintResponse.signedTransaction) throw new Error(`Wallet sign fail (mint): ${mintResponse?.error?.message || 'Unknown'}`);
      const userSignedMintBytes = typeof mintResponse.signedTransaction === 'string' ? Buffer.from(mintResponse.signedTransaction, 'base64') : mintResponse.signedTransaction;
      const executedMintTx = await Transaction.fromBytes(userSignedMintBytes).execute(client);
      const mintReceipt = await executedMintTx.getReceipt(client);
      const serial = mintReceipt.serials?.[0]?.low ?? 'N/A';

      setMintMessage(`Success! Minted ${newTokenId.toString()} #${serial}`);
      setMintedTokenId(newTokenId.toString());
      setNftName(""); setNftDescription(""); setNftFile(null);
      setOwnedNfts([]); setIsLoadingNfts(true);
      if (e.target.reset) e.target.reset();

    } catch (err) {
       console.error("Minting error:", err);
       let displayError = err.message || 'An unknown error occurred';
       if (err.message?.includes("USER_REJECT")) displayError = 'Rejected in wallet.';
       setMintMessage(`Minting Failed: ${displayError}`);
    } finally { setIsMinting(false); }
  };


  // --- List NFT ---
  const handleListNft = async (e, tokenId, serialNumber) => {
    // ... (This function uses the same topic state and client state - should be okay) ...
    e.preventDefault();
    const priceHbarString = e.target.elements.price.value;
    if (!priceHbarString || parseFloat(priceHbarString) <= 0) { alert("Invalid price."); return; }
    const priceHbar = parseFloat(priceHbarString);

    console.log(`handleList: Checking conditions - client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`);
    if (!client || !hashconnect || !hederaAccountId || !topic) { /* ... error handling ... */
        const errorMsg = `Wallet/Client not ready: client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`; console.warn('handleList blocked:', errorMsg); alert("Wallet/Client not connected properly. Reconnect."); return;
    }

    setIsMinting(true); setMintMessage(`Listing NFT ${tokenId} #${serialNumber}...`);
    try {
        const nftTokenId = TokenId.fromString(tokenId);
        const sellerAccountId = AccountId.fromString(hederaAccountId);
        const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT_ID);
        const nftId = new NftId(nftTokenId, serialNumber);
        let transferTx = new TransferTransaction().addNftTransfer(nftId, sellerAccountId, treasuryAccountId);

      console.log("Freezing transfer tx..."); const frozenTx = await transferTx.freezeWith(client); const transferTxBytes = frozenTx.toBytes(); console.log("Freeze transfer complete.");
      console.log("Sending transfer tx to HashPack (topic:", topic, ")");
       const transferResponse = await hashconnect.sendTransaction( topic, { topic: topic, byteArray: transferTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
       console.log("handleListNft: HashPack response received:", transferResponse);
       if (!transferResponse || !transferResponse.signedTransaction) { /* ... error handling ... */ if (transferResponse?.error?.message?.includes("USER_REJECT")) throw new Error('Rejected in HashPack.'); throw new Error(`HashPack sign fail (transfer): ${transferResponse?.error?.message || 'Unknown'}`); }
       const signedTransferBytes = typeof transferResponse.signedTransaction === 'string' ? Buffer.from(transferResponse.signedTransaction, 'base64') : transferResponse.signedTransaction;
       console.log("handleListNft: Received signed bytes.");

      setMintMessage(`Processing transfer...`); console.log("Executing transfer tx...");
      const executedTransferTx = await Transaction.fromBytes(signedTransferBytes).execute(client);
       console.log("handleListNft: Getting transfer receipt..."); const transferReceipt = await executedTransferTx.getReceipt(client);
       console.log("handleListNft: Transfer Receipt:", transferReceipt); const transferStatus = transferReceipt.status.toString(); console.log("handleListNft: Transfer status:", transferStatus);
       if (transferStatus !== 'SUCCESS') { throw new Error(`Hedera tx failed: ${transferStatus}`); }

      setMintMessage(`Adding listing...`); console.log("Adding listing to Firestore...");
        const listingsCollectionPath = 'listings'; // Simple path
        const listingsCol = collection(db, listingsCollectionPath);
        const listingData = {
            nftTokenId: tokenId, serialNumber: serialNumber, sellerAccountId: hederaAccountId,
            priceHbar: priceHbar, status: 'listed', listedAt: serverTimestamp(),
            nftName: ownedNfts.find(n => n.tokenId === tokenId && n.serialNumber === serialNumber)?.name || 'Unknown',
            nftImageUrl: ownedNfts.find(n => n.tokenId === tokenId && n.serialNumber === serialNumber)?.imageUrl || ''
         };
        const docRef = await addDoc(listingsCol, listingData); console.log("Firestore Doc ID: ", docRef.id);

      setMintMessage(`NFT ${tokenId} #${serialNumber} listed for ${priceHbar} ℏ!`);
      setOwnedNfts(prev => prev.filter(n => !(n.tokenId === tokenId && n.serialNumber === serialNumber)));

    } catch (err) { /* ... Error handling ... */
       console.error("Listing error:", err); let displayError = err.message || 'An unknown error occurred';
       if (err.message?.includes("USER_REJECT")) displayError = 'Rejected in HashPack.'; else if (err.status) { displayError = `Hedera Network Error: ${err.status.toString()} - ${err.message}`; } else if (err.code && err.name === 'FirebaseError') { displayError = `Database Error: ${err.code} - ${err.message}`; } else if (err.message?.includes("topic") || err.message?.includes("session")) {displayError = `Connection Error: ${err.message}`;} else if (err.message?.includes("insufficient account balance")) {displayError = `Hedera Error: Insufficient HBAR for fee.`;} else if (err.message?.includes("INVALID_TOKEN_NFT_SERIAL_NUMBER")) {displayError = `Hedera Error: Ownership/Serial invalid.`;} else if (err.message?.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {displayError = `Hedera Error: Treasury (${TREASURY_ACCOUNT_ID}) not associated with token (${tokenId}).`;} setMintMessage(`Listing Failed: ${displayError}`);
    } finally { setIsMinting(false); }
  };


  // --- Buy NFT ---
  const handleBuyNft = async (listing) => {
    // ... (This function uses the same topic state and client state - needs testing but structure is okay) ...
      console.log(`--- Starting handleBuyNft for Listing ID: ${listing.id}, NFT: ${listing.nftTokenId} #${listing.serialNumber} ---`);
      setMintMessage("");

      console.log(`handleBuy: Checking conditions - client=${!!client}, hc=${!!hashconnect}, accId=${hederaAccountId}, topic=${topic}`);
      if (!client || !hashconnect || !hederaAccountId || !topic) { alert("Wallet/Client not connected properly. Reconnect."); return; }
      if (listing.sellerAccountId === hederaAccountId) { alert("Cannot buy your own NFT."); return; }

      setIsMinting(true); setMintMessage(`Processing purchase for ${listing.nftName}...`);
      try {
          // 1. Buyer Pays Seller
          setMintMessage(`Step 1/3: Sending ${listing.priceHbar} ℏ to seller ${listing.sellerAccountId}... (Approve)`);
          console.log(`handleBuy: Preparing HBAR transfer from ${hederaAccountId} to ${listing.sellerAccountId}`);
          let paymentTx = new TransferTransaction()
              .addHbarTransfer(hederaAccountId, Hbar.fromTinybars(listing.priceHbar * -100_000_000))
              .addHbarTransfer(listing.sellerAccountId, Hbar.fromTinybars(listing.priceHbar * 100_000_000));
          console.log("handleBuy: Freezing HBAR payment..."); const frozenPaymentTx = await paymentTx.freezeWith(client); const paymentTxBytes = frozenPaymentTx.toBytes(); console.log("handleBuy: Freeze HBAR payment complete.");
          console.log("handleBuy: Sending HBAR payment to HashPack (topic:", topic, ")");
          const paymentResponse = await hashconnect.sendTransaction( topic, { topic: topic, byteArray: paymentTxBytes, metadata: { accountToSign: hederaAccountId, returnTransaction: true } });
          console.log("handleBuy: HashPack payment response:", paymentResponse);
          if (!paymentResponse || !paymentResponse.signedTransaction) { if (paymentResponse?.error?.message?.includes("USER_REJECT")) throw new Error('HBAR Payment rejected.'); throw new Error(`HashPack sign fail (payment): ${paymentResponse?.error?.message || 'Unknown'}`); }
          const signedPaymentBytes = typeof paymentResponse.signedTransaction === 'string' ? Buffer.from(paymentResponse.signedTransaction, 'base64') : paymentResponse.signedTransaction;
          console.log("handleBuy: Received signed HBAR payment bytes.");
          setMintMessage(`Step 2/3: Processing HBAR payment...`); console.log("handleBuy: Executing HBAR payment...");
          const executedPaymentTx = await Transaction.fromBytes(signedPaymentBytes).execute(client);
          console.log("handleBuy: Getting HBAR payment receipt..."); const paymentReceipt = await executedPaymentTx.getReceipt(client);
          const paymentStatus = paymentReceipt.status.toString(); console.log("handleBuy: HBAR Payment status:", paymentStatus);
          if (paymentStatus !== 'SUCCESS') { throw new Error(`HBAR payment failed: ${paymentStatus}`); }
          console.log("handleBuy: HBAR Payment successful!"); setMintMessage(`Step 3/3: Transferring NFT...`);

          // 2. Treasury Sends NFT (INSECURE DEMO)
          console.warn("!!! SECURITY WARNING: Using hardcoded Treasury Key !!!");
          const TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY = "PASTE_YOUR_TREASURY_PRIVATE_KEY_HERE"; // <<< --- !!! PASTE KEY HERE !!!
          if (TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY.startsWith("PASTE")) { throw new Error("Treasury Key not set."); }
          const treasuryClient = Client.forTestnet().setOperator(TREASURY_ACCOUNT_ID, TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY);
          const nftTokenId = TokenId.fromString(listing.nftTokenId); const buyerAccountId = AccountId.fromString(hederaAccountId); const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT_ID); const nftId = new NftId(nftTokenId, listing.serialNumber);
          console.log(`handleBuy: Preparing NFT transfer: ${nftId} from Treasury ${treasuryAccountId} to Buyer ${buyerAccountId}`);
          let nftTransferTx = new TransferTransaction().addNftTransfer(nftId, treasuryAccountId, buyerAccountId);
          const frozenNftTransferTx = await nftTransferTx.freezeWith(treasuryClient); // Freeze with Treasury client
          const signedNftTransferTx = await frozenNftTransferTx.sign(PrivateKey.fromString(TREASURY_PRIVATE_KEY_FOR_DEMO_ONLY)); // Sign with Treasury key
          console.log("handleBuy: Executing NFT transfer from Treasury...");
          const executedNftTransferTx = await signedNftTransferTx.execute(treasuryClient);
          console.log("handleBuy: Getting NFT transfer receipt..."); const nftTransferReceipt = await executedNftTransferTx.getReceipt(treasuryClient);
          const nftTransferStatus = nftTransferReceipt.status.toString(); console.log("handleBuy: NFT Transfer status:", nftTransferStatus);
          if (nftTransferStatus !== 'SUCCESS') { throw new Error(`NFT transfer failed: ${nftTransferStatus}. Payment sent, NFT not received!`); }
          console.log("handleBuy: NFT Transfer successful!");

          // 3. Update Firestore
          setMintMessage(`Updating listing status...`); console.log("handleBuy: Updating Firestore doc:", listing.id);
          const listingDocRef = doc(db, 'listings', listing.id);
          await updateDoc(listingDocRef, { status: 'sold', buyerAccountId: hederaAccountId, soldAt: serverTimestamp() });
          console.log("handleBuy: Firestore update complete.");

          setMintMessage(`Purchase Complete! NFT ${listing.nftTokenId} #${listing.serialNumber} received.`);
          // Trigger owned NFT refresh? Or rely on user refresh for now.
          setIsLoadingNfts(true); // Trigger loading state for My NFTs

      } catch (err) { /* ... Error handling ... */
          console.error("Buying error:", err);
           let displayError = err.message || 'Unknown purchase error.';
           if (err.message?.includes("USER_REJECT")) { displayError = 'Payment rejected.'; }
           else if (err.status) { displayError = `Hedera Error: ${err.status.toString()} - ${err.message}`; }
           else if (err.code && err.name === 'FirebaseError') { displayError = `Database Error: ${err.code} - ${err.message}`; }
           else if (err.message?.includes("topic") || err.message?.includes("session")) {displayError = `Connection Error: ${err.message}`;}
           else if (err.message?.includes("insufficient account balance")) {displayError = `Hedera Error: Insufficient HBAR.`;}
           else if (err.message?.includes("CRITICAL")) {displayError = `CRITICAL: ${err.message}`;}
           setMintMessage(`Purchase Failed: ${displayError}`);
      } finally { setIsMinting(false); }
  }; // End of handleBuyNft


  // --- UI (JSX) ---
  return (
    // Your robust JSX structure looks good.
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
             {/* Minting Section (Restored UI) */}
             <div className="mint-container">
               <h2>Create a New Game NFT</h2>
               <form className="mint-form" onSubmit={handleMint}>
                 <div className="form-group"><label htmlFor="nft-name">NFT Name</label><input id="nft-name" type="text" value={nftName} onChange={(e) => setNftName(e.target.value)} placeholder="e.g. Diamond Sword" required /></div>
                 <div className="form-group"><label htmlFor="nft-description">Description</label><textarea id="nft-description" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} placeholder="e.g. A rare sword +10 attack." required /></div>
                 <div className="form-group"><label htmlFor="nft-file">Image File</label><input id="nft-file" type="file" onChange={(e) => setNftFile(e.target.files[0])} required accept="image/*" /></div>
                 <button type="submit" className="mint-button" disabled={isMinting}>{isMinting ? "Processing..." : "Mint NFT"}</button>
                 {mintMessage && (<div className={`mint-message ${mintedTokenId ? 'success' : (mintMessage.toLowerCase().includes('error') || mintMessage.toLowerCase().includes('failed')) ? 'error' : 'info'}`}>{mintMessage}</div>)}
               </form>
             </div>

             {/* Owned NFTs Section */}
             <div className="my-nfts-container">
                <h2>My NFTs</h2>
               {isLoadingNfts && <p className="loading-message">Loading NFTs...</p>}
               {fetchError && <p className="error-message">Error: {fetchError}</p>}
               {!isLoadingNfts && !fetchError && ownedNfts.length === 0 && (<p className="info-message">No NFTs found for {hederaAccountId}.</p>)}
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
               {!isLoadingListings && !listingError && marketListings.length === 0 && (<p className="info-message">No NFTs listed for sale.</p>)}
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
                         {/* Correctly call handleBuyNft */}
                         <button
                            className="buy-button"
                            onClick={() => handleBuyNft(listing)} // Call handleBuyNft here
                            disabled={isMinting || isLoadingListings || listing.sellerAccountId === hederaAccountId}
                         >
                            Buy
                         </button>
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

