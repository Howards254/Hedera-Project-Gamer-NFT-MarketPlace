import { useState, useEffect, useRef } from 'react';
import { HashConnect } from 'hashconnect/dist/hashconnect';
import { LedgerId, Client, PrivateKey } from '@hashgraph/sdk';
import { WALLETCONNECT_PROJECT_ID, appMetadata } from '../config/constants';
import { findAccountId } from '../utils/helpers';

export function useHashConnect() {
  const [hashconnect, setHashconnect] = useState(null);
  const [hederaAccountId, setHederaAccountId] = useState(null);
  const [topic, setTopic] = useState(null);
  const [client, setClient] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize HashConnect
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    let hcInstance = null;

    const initHashConnect = async () => {
      try {
        console.log("Creating HashConnect instance...");
        hcInstance = new HashConnect(LedgerId.TESTNET, WALLETCONNECT_PROJECT_ID, appMetadata, true);

        hcInstance.pairingEvent.on((data) => {
          try {
            console.log('pairingEvent received:', JSON.parse(JSON.stringify(data)));
          } catch (_) {
            console.log('pairingEvent received (raw):', data);
          }
          const acct = findAccountId(data);
          if (acct) {
            console.log('pairingEvent -> setting accountId:', acct);
            setHederaAccountId(acct);
          } else {
            console.warn("pairingEvent -> no accountId found.");
          }
          setIsConnecting(false);
        });

        hcInstance.disconnectionEvent.on((data) => {
          console.log('disconnectionEvent:', data);
          setHederaAccountId(null);
          setTopic(null);
          setClient(null);
        });

        hcInstance.connectionStatusChangeEvent.on((status) => {
          console.log("HashConnect status:", status);
        });

        console.log("Calling hcInstance.init()...");
        await hcInstance.init();
        console.log("hcInstance.init() completed.");
        try {
          console.log('hcData structure after init:', hcInstance.hcData);
        } catch (_) {}

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
          } else {
            console.log("No pairings found to restore.");
          }
        } catch (e) {
          console.warn("Restore pairing failed:", e);
        }
      } catch (err) {
        console.error("initHashConnect error:", err);
      }
    };
    initHashConnect();
  }, []);

  // Find Topic
  useEffect(() => {
    if (!hashconnect || !hederaAccountId) {
      if (topic) {
        setTopic(null);
      }
      return;
    }
    console.log("Topic useEffect: Running check for account", hederaAccountId);
    let foundTopic = null;
    try {
      const pairings = hashconnect.hcData?.pairingData || [];
      const currentPairing = pairings.find(p => p.accountIds && p.accountIds.includes(hederaAccountId));
      if (currentPairing && currentPairing.topic && typeof currentPairing.topic === 'string') {
        foundTopic = currentPairing.topic;
        console.log("Topic useEffect: Found topic in hcData.pairingData:", foundTopic);
      } else {
        console.log("Topic useEffect: No matching pairing/topic found in hcData for", hederaAccountId, "Pairings:", pairings);
      }
    } catch (e) {
      console.warn("Topic useEffect: Error reading hcData.pairingData:", e);
    }
    if (topic !== foundTopic) {
      console.log(`Topic useEffect: Setting topic state to: ${foundTopic}`);
      setTopic(foundTopic);
    } else if (foundTopic) {
      console.log(`Topic useEffect: Topic state (${topic}) already matches found topic (${foundTopic}).`);
    } else {
      console.log(`Topic useEffect: Topic not found, ensuring state is null.`);
      if (topic !== null) setTopic(null);
    }
  }, [hashconnect, hederaAccountId, topic]);

  // Setup Hedera Client
  useEffect(() => {
    if (hederaAccountId) {
      console.log("Setting up Hedera Client for account:", hederaAccountId);
      try {
        const configuredClient = Client.forTestnet().setOperator(hederaAccountId, PrivateKey.generateED25519());
        setClient(configuredClient);
        console.log("Hedera Client configured.");
      } catch (error) {
        console.error("Error configuring Hedera Client:", error);
        setClient(null);
      }
    } else {
      console.log("Clearing Hedera Client.");
      setClient(null);
    }
  }, [hederaAccountId]);

  const connectWallet = () => {
    if (!hashconnect) return;
    setIsConnecting(true);
    setHederaAccountId(null);
    setTopic(null);
    setClient(null);
    hashconnect.openPairingModal();
  };

  const disconnectWallet = () => {
    if (!hashconnect || !topic) {
      console.warn("Disconnect invalid state.");
      setHederaAccountId(null);
      setTopic(null);
      setClient(null);
      return;
    }
    console.log("Disconnecting topic:", topic);
    hashconnect.disconnect(topic);
  };

  return {
    hashconnect,
    hederaAccountId,
    topic,
    client,
    isConnecting,
    connectWallet,
    disconnectWallet
  };
}
