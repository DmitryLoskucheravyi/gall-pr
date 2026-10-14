import { useEffect } from 'react';

import { startBusy } from '../lib/busy';

/**
 * Marks the page busy for as long as the calling component is mounted — for
 * a route's loading.tsx, so the loading cursor shows while it is on screen.
 */
export function useBusyWhileMounted() {
  useEffect(() => startBusy(), []);
}
