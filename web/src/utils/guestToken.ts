const STORAGE_KEY = 'gall_guest_token';

// crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) —
// on plain HTTP via a LAN IP (e.g. testing from a phone) it's undefined, and
// calling it throws inside the axios request interceptor, silently killing
// every guest request before it reaches the network. This token only tags an
// anonymous cart, not anything security-sensitive, so a Math.random-based
// fallback is fine when the real API isn't available.
function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function peekGuestToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function getGuestToken(): string {
  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    token = generateGuestId();
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}

export function clearGuestToken() {
  localStorage.removeItem(STORAGE_KEY);
}
