// Schemes that are safe to put behind a link the user might click. Anything
// else — `javascript:`, `data:`, `vbscript:` — turns an href into script
// execution in the page's own origin.
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

// The support links (Telegram, email, phone) come out of app_settings, which is
// admin-editable. That makes them a stored value rendered into an href on every
// page for every visitor — exactly the shape that turns one compromised or
// careless admin session into site-wide script execution. Cheap to close, so
// there's no reason to trust the field.
export function safeExternalUrl(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();

  if (!value) return undefined;

  // Protocol-relative and root-relative URLs are ours and carry no scheme.
  if (value.startsWith('/')) return value;

  try {
    const parsed = new URL(value);

    return SAFE_PROTOCOLS.has(parsed.protocol) ? value : undefined;
  } catch {
    // Not an absolute URL at all — don't guess at what was meant.
    return undefined;
  }
}

// JSON embedded in a <script> block is parsed as HTML first, so the string
// "</script>" inside any value ends the block early and everything after it
// becomes markup. JSON.stringify escapes quotes and backslashes but leaves `<`
// and `/` alone, so it is not sufficient on its own.
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
