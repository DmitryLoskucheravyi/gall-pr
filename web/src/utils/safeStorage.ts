// localStorage is not always there, and not always allowed.
//
// In a private window, with site data blocked, or inside some in-app browsers,
// merely *reading* `localStorage` throws a SecurityError — the property access
// itself, before any method call. That mattered more than it sounds: the axios
// request interceptor reads the guest token on every single request, so one
// throw in a blocked-storage browser took down the entire API layer and the
// site rendered nothing at all.
//
// So nothing touches window.localStorage directly any more. Everything goes
// through here, and here it is allowed to fail: a visitor with no storage gets
// a session that lasts as long as the tab, which is a far better outcome than
// a blank page.

// One in-memory fallback for the life of the page. Without it a guest token
// would be regenerated on every read, and each API call would look like a
// different guest — a cart that never holds anything.
const memory = new Map<string, string>();

let warned = false;

function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn(
    'Browser storage is unavailable; falling back to memory for this tab.',
    error,
  );
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    warnOnce(error);
    return memory.get(key) ?? null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Also the quota path, not just the blocked-storage one.
    warnOnce(error);
    memory.set(key, value);
  }
}

export function removeStored(key: string): void {
  memory.delete(key);

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    warnOnce(error);
  }
}
