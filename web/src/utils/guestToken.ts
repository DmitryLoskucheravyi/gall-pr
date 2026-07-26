const STORAGE_KEY = 'gall_guest_token';

export function peekGuestToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function getGuestToken(): string {
  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}

export function clearGuestToken() {
  localStorage.removeItem(STORAGE_KEY);
}
