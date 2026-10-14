// Whether the visitor has moved between pages of this site since it loaded.
//
// A "back" button is only safe to wire to history.back() when there is a page
// of ours behind it. Someone who arrived straight from a shared link has
// nothing of ours to go back to — back() would take them off the site, or do
// nothing at all in a fresh tab — so those buttons fall back to a sensible
// parent page instead (see hooks/useBack.ts).
//
// Set by NavigationTracker (components/NavigationTracker.tsx) on the first
// client-side route change; never unset, since history only grows.

let navigated = false;

export function markInAppNavigation(): void {
  navigated = true;
}

export function hasInAppHistory(): boolean {
  return navigated;
}
