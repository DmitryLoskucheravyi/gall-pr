'use client';

import { openCookieSettings } from '../../lib/consent';

// Opens the cookie settings panel from server-rendered content, which cannot
// attach a click handler itself.
export default function CookieSettingsButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={openCookieSettings}>
      {children}
    </button>
  );
}
