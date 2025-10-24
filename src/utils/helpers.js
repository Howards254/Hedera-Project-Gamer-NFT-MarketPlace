// --- Helper Functions ---

export function base64ToUtf8(base64) {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Failed to decode base64:", base64, e);
    return "";
  }
}

export function normalizePairings(container) {
  if (!container) return [];
  if (Array.isArray(container)) return container;
  if (typeof container === 'object' && container !== null && typeof container.entries === 'function') {
    try {
      return Array.from(container.values());
    } catch (e) {
      // ignore
    }
  }
  if (typeof container === 'object' && container !== null) return Object.values(container);
  return [];
}

export function findNestedValue(obj, keyNames = ['topic', 'pairingTopic']) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keyNames) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 10) {
      return obj[key];
    }
  }
  return null;
}

export function findAccountId(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.accountIds && Array.isArray(obj.accountIds) && obj.accountIds.length > 0 && typeof obj.accountIds[0] === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountIds[0])) {
    return obj.accountIds[0];
  }
  if (obj.account && typeof obj.account === 'string' && /^\d+\.\d+\.\d+$/.test(obj.account)) {
    return obj.account;
  }
  if (obj.accountId && typeof obj.accountId === 'string' && /^\d+\.\d+\.\d+$/.test(obj.accountId)) {
    return obj.accountId;
  }
  if (Array.isArray(obj.accounts) && obj.accounts.length > 0 && typeof obj.accounts[0] === 'string' && obj.accounts[0].includes(':')) {
    const parts = obj.accounts[0].split(':');
    if (parts.length === 3 && parts[0] === 'hedera' && /^\d+\.\d+\.\d+$/.test(parts[2])) {
      return parts[2];
    }
  }
  return null;
}
